import test from 'node:test';
import assert from 'node:assert/strict';
import {
  postSalesTransactionAtomic,
  postSalesReturnAtomic,
  postPurchaseTransactionAtomic,
  postVoucherAtomic,
  postExpenseAtomic,
  reverseSalesInvoiceAtomic,
  getTenantAccounts,
  getTenantJournalEntries,
  wipeAllJournalEntriesAndResetAccounts,
  roundMoney,
  resolveProductMinStock,
  syncProductAvailabilityStatus,
  buildLowStockAlerts,
  computeUnifiedFinancialMetrics,
} from '../server/accountingEngine.js';
import {
  getTenantCollections,
  setTenantCleanProductionMode,
} from '../server/dataStore.js';

function resetTestTenant(companyId: string): void {
  setTenantCleanProductionMode(companyId, true);
  const store = getTenantCollections(companyId);
  store.products.length = 0;
  store.movements.length = 0;
  store.customers.length = 0;
  store.suppliers.length = 0;
  store.accountTransactions.length = 0;
  store.invoices.length = 0;
  store.purchaseInvoices.length = 0;
  store.payments.length = 0;
  store.auditLogs.length = 0;
  store.employees.length = 0;
  store.employeeMovements.length = 0;
  store.payrollRecords.length = 0;
  store.expenses.length = 0;
  wipeAllJournalEntriesAndResetAccounts(companyId);
}

test('1. Double-Entry Balance: Cash/Credit Sales, Purchase, Receipt Voucher, and Expense maintain totalDebit === totalCredit', () => {
  const cid = 'test_comp_double_entry';
  resetTestTenant(cid);
  const store = getTenantCollections(cid);

  store.products.push({
    id: 'prod_test_1',
    company_id: cid,
    name: 'بطارية 70 أمبير',
    sku: 'BAT-70A',
    current_stock: 0,
    min_stock_level: 5,
    cost_price: 0,
    selling_price: 1500,
    status: 'نفد',
  } as any);

  // 1) Purchase invoice to stock an item
  postPurchaseTransactionAtomic({
    companyId: cid,
    purchaseInvoice: {
      invoice_number: 'PUR-TEST-001',
      date: '2026-01-10',
      payment_method: 'CREDIT',
    },
    supplierId: 'sup_test_1',
    supplierName: 'مورد الاختبار الأول',
    paymentMethod: 'CREDIT',
    paidAmount: 0,
    items: [
      {
        product_id: 'prod_test_1',
        name: 'بطارية 70 أمبير',
        sku: 'BAT-70A',
        quantity: 10,
        unit_cost: 1000,
        selling_price: 1500,
      },
    ],
  });

  // 2) Cash sales invoice
  postSalesTransactionAtomic({
    companyId: cid,
    invoice: {
      invoice_number: 'INV-CASH-001',
      date: '2026-01-11',
      payment_method: 'CASH',
      total: 3000,
      subtotal: 3000,
      tax: 0,
    },
    customerName: 'عميل نقدي',
    paymentMethod: 'CASH',
    paidAmount: 3000,
    items: [
      {
        product_id: 'prod_test_1',
        name: 'بطارية 70 أمبير',
        quantity: 2,
        unit_price: 1500,
      },
    ],
  });

  // 3) Credit sales invoice
  postSalesTransactionAtomic({
    companyId: cid,
    invoice: {
      invoice_number: 'INV-CRD-001',
      date: '2026-01-12',
      payment_method: 'CREDIT',
      total: 4500,
      subtotal: 4500,
      tax: 0,
    },
    customerId: 'cust_test_1',
    customerName: 'عميل آجل تجريبي',
    paymentMethod: 'CREDIT',
    paidAmount: 0,
    items: [
      {
        product_id: 'prod_test_1',
        name: 'بطارية 70 أمبير',
        quantity: 3,
        unit_price: 1500,
      },
    ],
  });

  // 4) Customer Receipt Voucher
  postVoucherAtomic({
    companyId: cid,
    type: 'RECEIPT',
    amount: 2000,
    paymentMethod: 'CASH',
    partyType: 'CUSTOMER',
    partyId: 'cust_test_1',
    partyName: 'عميل آجل تجريبي',
    voucherNumber: 'REC-TEST-001',
    description: 'دفعة من الحساب',
  });

  // 5) Operating Expense
  postExpenseAtomic({
    companyId: cid,
    category: 'إيجار ومنافع',
    description: 'فاتورة كهرباء المعرض',
    amount: 500,
    paymentMethod: 'CASH',
    voucherNumber: 'EXP-TEST-001',
  });

  const entries = getTenantJournalEntries(cid);
  assert.ok(entries.length >= 5, 'Should generate journal entries for all atomic operations');

  let trialDebit = 0;
  let trialCredit = 0;

  for (const je of entries) {
    const lineDebit = roundMoney(je.lines.reduce((s, l) => s + Number(l.debit || 0), 0));
    const lineCredit = roundMoney(je.lines.reduce((s, l) => s + Number(l.credit || 0), 0));
    assert.equal(lineDebit, lineCredit, `Journal entry ${je.entry_number} must be balanced`);
    assert.equal(roundMoney(je.total_debit), roundMoney(je.total_credit));
    assert.ok(lineDebit > 0, `Journal entry ${je.entry_number} must have positive amount`);
    trialDebit = roundMoney(trialDebit + lineDebit);
    trialCredit = roundMoney(trialCredit + lineCredit);
  }

  assert.equal(trialDebit, trialCredit, 'Global trial balance totalDebit must equal totalCredit');
});

test('2. Weighted Average Cost (WAC) & Perpetual Inventory: Accurate cost_price recalculation and COGS (5101) posting', () => {
  const cid = 'test_comp_wac';
  resetTestTenant(cid);
  const store = getTenantCollections(cid);

  store.products.push({
    id: 'prod_wac_1',
    company_id: cid,
    name: 'إطار ميشلان 16',
    sku: 'TIRE-M16',
    current_stock: 0,
    min_stock_level: 5,
    cost_price: 0,
    selling_price: 180,
    status: 'نفد',
  } as any);

  // First purchase: 10 units @ 100 = 1,000
  postPurchaseTransactionAtomic({
    companyId: cid,
    purchaseInvoice: { invoice_number: 'PUR-WAC-1', payment_method: 'CASH' },
    supplierName: 'مورد أ',
    paymentMethod: 'CASH',
    paidAmount: 1000,
    items: [
      {
        product_id: 'prod_wac_1',
        name: 'إطار ميشلان 16',
        sku: 'TIRE-M16',
        quantity: 10,
        unit_cost: 100,
        selling_price: 180,
      },
    ],
  });

  let prod = store.products.find((p) => p.id === 'prod_wac_1');
  assert.ok(prod, 'Product should be present in tenant store');
  assert.equal(Number(prod.current_stock), 10);
  assert.equal(Number(prod.cost_price), 100);

  // Second purchase: 10 units @ 200 = 2,000 -> Total 20 units, total cost 3,000 -> WAC = 150
  postPurchaseTransactionAtomic({
    companyId: cid,
    purchaseInvoice: { invoice_number: 'PUR-WAC-2', payment_method: 'CASH' },
    supplierName: 'مورد ب',
    paymentMethod: 'CASH',
    paidAmount: 2000,
    items: [
      {
        product_id: 'prod_wac_1',
        name: 'إطار ميشلان 16',
        sku: 'TIRE-M16',
        quantity: 10,
        unit_cost: 200,
        selling_price: 250,
      },
    ],
  });

  prod = store.products.find((p) => p.id === 'prod_wac_1');
  assert.ok(prod);
  assert.equal(Number(prod.current_stock), 20);
  assert.equal(roundMoney(prod.cost_price), 150, 'WAC cost_price must be 150');

  // Sell 4 units -> COGS should be 4 * 150 = 600, remaining stock = 16
  const saleRes = postSalesTransactionAtomic({
    companyId: cid,
    invoice: {
      invoice_number: 'INV-WAC-SALE-1',
      payment_method: 'CASH',
      total: 1000,
      subtotal: 1000,
      tax: 0,
    },
    customerName: 'عميل نقدي',
    paymentMethod: 'CASH',
    paidAmount: 1000,
    items: [
      {
        product_id: 'prod_wac_1',
        name: 'إطار ميشلان 16',
        quantity: 4,
        unit_price: 250,
      },
    ],
  });

  assert.equal(roundMoney(saleRes.totalCogs), 600, 'COGS for 4 units at WAC 150 must equal 600');
  prod = store.products.find((p) => p.id === 'prod_wac_1');
  assert.equal(Number(prod?.current_stock), 16, 'Remaining stock must be 16');

  const accounts = getTenantAccounts(cid);
  const cogsAcc = accounts.find((a) => a.code === '5101');
  const invAcc = accounts.find((a) => a.code === '1104');
  assert.equal(roundMoney(cogsAcc?.balance), 600, 'Account 5101 (COGS) balance must be 600');
  assert.equal(roundMoney(invAcc?.balance), 2400, 'Account 1104 (Inventory) balance must be 2400 (16 * 150)');
});

test('3. Atomic Reversal & Returns: Sales return and invoice cancellation restore stock, update status, and neutralize ledger', () => {
  const cid = 'test_comp_reversal';
  resetTestTenant(cid);
  const store = getTenantCollections(cid);

  store.products.push({
    id: 'prod_rev_1',
    company_id: cid,
    name: 'زيت محرك تخليقي',
    sku: 'OIL-SYN-1',
    current_stock: 0,
    min_stock_level: 5,
    cost_price: 0,
    selling_price: 160,
    status: 'نفد',
  } as any);

  // Purchase 5 units @ 100 (min_stock_level = 5)
  postPurchaseTransactionAtomic({
    companyId: cid,
    purchaseInvoice: { invoice_number: 'PUR-REV-1', payment_method: 'CREDIT' },
    supplierId: 'sup_rev_1',
    supplierName: 'مورد العكس',
    paymentMethod: 'CREDIT',
    paidAmount: 0,
    items: [
      {
        product_id: 'prod_rev_1',
        name: 'زيت محرك تخليقي',
        quantity: 5,
        unit_cost: 100,
        selling_price: 160,
      },
    ],
  });

  // Sell all 5 units on credit -> stock becomes 0 ('نفد')
  postSalesTransactionAtomic({
    companyId: cid,
    invoice: {
      id: 'inv_rev_id_1',
      invoice_number: 'INV-REV-001',
      payment_method: 'CREDIT',
      total: 800,
      subtotal: 800,
      tax: 0,
    },
    customerId: 'cust_rev_1',
    customerName: 'عميل العكس',
    paymentMethod: 'CREDIT',
    paidAmount: 0,
    items: [
      {
        product_id: 'prod_rev_1',
        name: 'زيت محرك تخليقي',
        quantity: 5,
        unit_price: 160,
      },
    ],
  });

  let prod = store.products.find((p) => p.id === 'prod_rev_1');
  assert.equal(Number(prod?.current_stock), 0);
  assert.equal(prod?.status, 'نفد', 'Product status must be نفد when stock reaches 0');

  // Return 2 units against the credit invoice
  postSalesReturnAtomic({
    companyId: cid,
    returnData: {
      return_number: 'RET-REV-001',
      original_invoice_number: 'INV-REV-001',
      refundMethod: 'CREDIT',
    },
    originalInvoiceNumber: 'INV-REV-001',
    customerId: 'cust_rev_1',
    customerName: 'عميل العكس',
    refundMethod: 'CREDIT',
    items: [
      {
        product_id: 'prod_rev_1',
        name: 'زيت محرك تخليقي',
        quantity: 2,
        unit_price: 160,
      },
    ],
  });

  prod = store.products.find((p) => p.id === 'prod_rev_1');
  assert.equal(Number(prod?.current_stock), 2, 'Stock must increase to 2 after returning 2 units');
  assert.equal(prod?.status, 'قريب من النفاذ', 'Product status must update after return');

  // Now test full atomic cancellation of a separate invoice
  postSalesTransactionAtomic({
    companyId: cid,
    invoice: {
      id: 'inv_rev_id_2',
      invoice_number: 'INV-REV-002',
      payment_method: 'CASH',
      total: 160,
      subtotal: 160,
      tax: 0,
    },
    customerName: 'عميل نقدي',
    paymentMethod: 'CASH',
    paidAmount: 160,
    items: [
      {
        product_id: 'prod_rev_1',
        name: 'زيت محرك تخليقي',
        quantity: 1,
        unit_price: 160,
      },
    ],
  });

  assert.equal(Number(store.products.find((p) => p.id === 'prod_rev_1')?.current_stock), 1);

  reverseSalesInvoiceAtomic(cid, 'INV-REV-002', false);

  prod = store.products.find((p) => p.id === 'prod_rev_1');
  assert.equal(Number(prod?.current_stock), 2, 'Stock must be restored back to 2 after cancelling INV-REV-002');
  const cancelledInv = store.invoices.find((i) => i.invoice_number === 'INV-REV-002');
  assert.equal(cancelledInv?.status, 'CANCELLED');
});

test('4. Multi-Tenant Isolation: Operations and wipe on comp_alpha never affect comp_beta', () => {
  const alpha = 'comp_alpha';
  const beta = 'comp_beta';
  resetTestTenant(alpha);
  resetTestTenant(beta);

  postExpenseAtomic({
    companyId: alpha,
    category: 'مصاريف إدارية',
    description: 'مصروف خاص بشركة ألفا',
    amount: 1200,
    paymentMethod: 'CASH',
  });

  postExpenseAtomic({
    companyId: beta,
    category: 'مصاريف إدارية',
    description: 'مصروف خاص بشركة بيتا',
    amount: 3400,
    paymentMethod: 'CASH',
  });

  const alphaStore = getTenantCollections(alpha);
  const betaStore = getTenantCollections(beta);

  assert.equal(alphaStore.expenses.length, 1);
  assert.equal(betaStore.expenses.length, 1);
  assert.equal(alphaStore.expenses[0].amount, 1200);
  assert.equal(betaStore.expenses[0].amount, 3400);

  // Wipe comp_alpha journals and reset its accounts
  wipeAllJournalEntriesAndResetAccounts(alpha);

  const alphaJournalsAfter = getTenantJournalEntries(alpha);
  const betaJournalsAfter = getTenantJournalEntries(beta);

  assert.equal(alphaJournalsAfter.length, 0, 'comp_alpha journals must be wiped');
  assert.equal(betaJournalsAfter.length, 1, 'comp_beta journals must remain intact');

  const betaAccountsAfter = getTenantAccounts(beta);
  const betaExpenseAcc = betaAccountsAfter.find((a) => a.code === '5202');
  assert.equal(roundMoney(betaExpenseAcc?.balance), 3400, 'comp_beta account balances must remain untouched');
});

test('5. Customer Credit Limit Enforcement: blocks excess credit/partial sales atomically, allows full cash sales, and unlocks after receipt voucher', () => {
  const cid = 'test_comp_credit_limit';
  resetTestTenant(cid);
  const store = getTenantCollections(cid);

  store.products.push({
    id: 'prod_cl_1',
    company_id: cid,
    sku: 'SKU-CL-001',
    name: 'زيت محرك 10W-40',
    category: 'زيوت',
    unit: 'جالون',
    baseUnitName: 'جالون',
    price: 200,
    selling_price: 200,
    purchase_price: 120,
    cost_price: 120,
    qty: 50,
    current_stock: 50,
    stock: 50,
    min_stock_level: 10,
    status: 'متوفر',
    is_active: true,
  });

  store.customers.push({
    id: 'cust_cl_1',
    company_id: cid,
    name: 'مؤسسة السقف المحدود',
    balance: 0,
    current_balance: 0,
    creditLimit: 500,
    credit_limit: 500,
    enforce_credit_limit: true,
    status: 'ACTIVE',
    currency: 'YER',
  });

  // 5A. Credit sale exceeding limit (600 > 500) must throw CREDIT_LIMIT_EXCEEDED with ZERO stock/journal/balance mutation
  assert.throws(
    () =>
      postSalesTransactionAtomic({
        companyId: cid,
        invoice: { invoice_number: 'INV-CL-REJECT-1', total: 600, payment_method: 'CREDIT' },
        items: [{ product_id: 'prod_cl_1', quantity: 3, unit_price: 200 }],
        customerId: 'cust_cl_1',
        customerName: 'مؤسسة السقف المحدود',
        paymentMethod: 'CREDIT',
        paidAmount: 0,
      }),
    (err: any) => {
      assert.equal(err.code, 'CREDIT_LIMIT_EXCEEDED');
      assert.equal(err.status, 400);
      assert.equal(err.details?.creditLimit, 500);
      assert.equal(err.details?.currentBalance, 0);
      assert.equal(err.details?.remainingDue, 600);
      assert.equal(err.details?.projectedBalance, 600);
      assert.equal(err.details?.requiredCashPayment, 100);
      return true;
    }
  );

  // Verify 0 stock deducted, 0 movements, 0 journals, balance untouched
  assert.equal(store.products[0].current_stock, 50, 'Stock must remain 50 after rejected credit sale');
  assert.equal(store.movements.length, 0, 'No stock movements should be recorded on rejected sale');
  assert.equal(getTenantJournalEntries(cid).length, 0, 'No journal entries should be created on rejected sale');
  assert.equal(store.customers[0].current_balance, 0, 'Customer balance must remain 0 on rejected sale');

  // 5B. Partial payment still exceeding limit (total 600, paid 50 => due 550 > 500) must also fail atomically
  assert.throws(
    () =>
      postSalesTransactionAtomic({
        companyId: cid,
        invoice: { invoice_number: 'INV-CL-REJECT-2', total: 600, payment_method: 'PARTIAL' },
        items: [{ product_id: 'prod_cl_1', quantity: 3, unit_price: 200 }],
        customerId: 'cust_cl_1',
        customerName: 'مؤسسة السقف المحدود',
        paymentMethod: 'CASH',
        paidAmount: 50,
      }),
    (err: any) => err?.code === 'CREDIT_LIMIT_EXCEEDED' && err?.details?.requiredCashPayment === 50
  );
  assert.equal(store.products[0].current_stock, 50, 'Stock must still be 50 after rejected partial sale');
  assert.equal(getTenantJournalEntries(cid).length, 0, 'Still 0 journal entries after rejected partial sale');

  // 5C. Fully cash sale (total 600, paid 600) MUST succeed for the same customer even though 600 > credit_limit (500)
  postSalesTransactionAtomic({
    companyId: cid,
    invoice: { invoice_number: 'INV-CL-CASH-1', total: 600, payment_method: 'CASH' },
    items: [{ product_id: 'prod_cl_1', quantity: 3, unit_price: 200 }],
    customerId: 'cust_cl_1',
    customerName: 'مؤسسة السقف المحدود',
    paymentMethod: 'CASH',
    paidAmount: 600,
  });
  assert.equal(store.products[0].current_stock, 47, 'Full cash sale must deduct 3 units');
  assert.equal(store.customers[0].current_balance, 0, 'Full cash sale must not increase customer debt');

  // 5D. Credit sale within limit (400 <= 500) succeeds and brings balance to 400
  postSalesTransactionAtomic({
    companyId: cid,
    invoice: { invoice_number: 'INV-CL-OK-1', total: 400, payment_method: 'CREDIT' },
    items: [{ product_id: 'prod_cl_1', quantity: 2, unit_price: 200 }],
    customerId: 'cust_cl_1',
    customerName: 'مؤسسة السقف المحدود',
    paymentMethod: 'CREDIT',
    paidAmount: 0,
  });
  assert.equal(store.products[0].current_stock, 45);
  assert.equal(store.customers[0].current_balance, 400);

  // 5E. Another credit sale of 200 would project balance to 600 > 500 -> rejected atomically
  const journalsBeforeReject = getTenantJournalEntries(cid).length;
  assert.throws(
    () =>
      postSalesTransactionAtomic({
        companyId: cid,
        invoice: { invoice_number: 'INV-CL-REJECT-3', total: 200, payment_method: 'CREDIT' },
        items: [{ product_id: 'prod_cl_1', quantity: 1, unit_price: 200 }],
        customerId: 'cust_cl_1',
        customerName: 'مؤسسة السقف المحدود',
        paymentMethod: 'CREDIT',
        paidAmount: 0,
      }),
    (err: any) => err?.code === 'CREDIT_LIMIT_EXCEEDED' && err?.details?.availableCredit === 100
  );
  assert.equal(store.products[0].current_stock, 45, 'Stock unchanged after second credit limit rejection');
  assert.equal(getTenantJournalEntries(cid).length, journalsBeforeReject, 'Journal count unchanged after rejection');

  // 5F. Post a receipt voucher of 300 -> customer balance drops from 400 to 100
  postVoucherAtomic({
    companyId: cid,
    type: 'RECEIPT',
    amount: 300,
    paymentMethod: 'CASH',
    partyType: 'CUSTOMER',
    partyId: 'cust_cl_1',
    partyName: 'مؤسسة السقف المحدود',
    voucherNumber: 'RV-CL-001',
  });
  assert.equal(store.customers[0].current_balance, 100, 'Receipt voucher must reduce balance to 100');

  // 5G. Retry credit sale of 200 (projected balance 300 <= 500) -> MUST succeed!
  postSalesTransactionAtomic({
    companyId: cid,
    invoice: { invoice_number: 'INV-CL-OK-2', total: 200, payment_method: 'CREDIT' },
    items: [{ product_id: 'prod_cl_1', quantity: 1, unit_price: 200 }],
    customerId: 'cust_cl_1',
    customerName: 'مؤسسة السقف المحدود',
    paymentMethod: 'CREDIT',
    paidAmount: 0,
  });
  assert.equal(store.products[0].current_stock, 44);
  assert.equal(store.customers[0].current_balance, 300);

  // Verify Trial Balance remains strictly balanced
  const metrics = computeUnifiedFinancialMetrics(cid);
  assert.equal(metrics.trialBalance.isBalanced, true, 'Trial balance must remain balanced');
  assert.equal(metrics.trialBalance.totalDebit, metrics.trialBalance.totalCredit);
});

test('6. Per-Product Custom Low-Stock Threshold: independent min_stock_level classification & dynamic alerts', () => {
  const cid = 'test_comp_min_stock';
  resetTestTenant(cid);
  const store = getTenantCollections(cid);

  // Product A: custom threshold 15, stock 10 -> قريب من النفاذ
  const prodA: any = {
    id: 'prod_ms_a',
    company_id: cid,
    sku: 'SKU-MS-A',
    name: 'كراتين مياه معدنية',
    category: 'مواد غذائية',
    unit: 'كرتون',
    baseUnitName: 'كرتون',
    price: 50,
    selling_price: 50,
    purchase_price: 30,
    cost_price: 30,
    qty: 10,
    current_stock: 10,
    stock: 10,
    min_stock_level: 15,
    status: 'متوفر',
    is_active: true,
  };

  // Product B: custom threshold 3, stock 5 -> متوفر
  const prodB: any = {
    id: 'prod_ms_b',
    company_id: cid,
    sku: 'SKU-MS-B',
    name: 'بطارية سيارة 70 أمبير',
    category: 'بطاريات',
    unit: 'حبة',
    baseUnitName: 'حبة',
    price: 450,
    selling_price: 450,
    purchase_price: 320,
    cost_price: 320,
    qty: 5,
    current_stock: 5,
    stock: 5,
    min_stock_level: 3,
    status: 'متوفر',
    is_active: true,
  };

  // Product C: legacy product without custom threshold (null -> global fallback 5), stock 4 -> قريب من النفاذ
  const prodC: any = {
    id: 'prod_ms_c',
    company_id: cid,
    sku: 'SKU-MS-C',
    name: 'فلتر زيت قياسي',
    category: 'فلاتر',
    unit: 'علبة',
    baseUnitName: 'علبة',
    price: 40,
    selling_price: 40,
    purchase_price: 20,
    cost_price: 20,
    qty: 4,
    current_stock: 4,
    stock: 4,
    min_stock_level: null,
    status: 'متوفر',
    is_active: true,
  };

  // Product D: explicit zero threshold (0), stock 1 -> متوفر (must NOT fall back to 5!)
  const prodD: any = {
    id: 'prod_ms_d',
    company_id: cid,
    sku: 'SKU-MS-D',
    name: 'قطعة طلب خاص',
    category: 'قطع غيار',
    unit: 'قطعة',
    baseUnitName: 'قطعة',
    price: 1000,
    selling_price: 1000,
    purchase_price: 700,
    cost_price: 700,
    qty: 1,
    current_stock: 1,
    stock: 1,
    min_stock_level: 0,
    status: 'متوفر',
    is_active: true,
  };

  store.products.push(prodA, prodB, prodC, prodD);
  store.products.forEach((p) => syncProductAvailabilityStatus(p));

  assert.equal(resolveProductMinStock(prodA), 15);
  assert.equal(resolveProductMinStock(prodB), 3);
  assert.equal(resolveProductMinStock(prodC), 5);
  assert.equal(resolveProductMinStock(prodD), 0);

  assert.equal(prodA.status, 'قريب من النفاذ', 'Product A (stock 10 <= min 15) must be قريب من النفاذ');
  assert.equal(prodB.status, 'متوفر', 'Product B (stock 5 > min 3) must be متوفر');
  assert.equal(prodC.status, 'قريب من النفاذ', 'Legacy Product C (stock 4 <= fallback 5) must be قريب من النفاذ');
  assert.equal(prodD.status, 'متوفر', 'Product D (stock 1 > explicit min 0) must be متوفر');

  // Verify buildLowStockAlerts returns exact metadata (name, current_stock, baseUnitName, min_stock_level)
  const alertsBeforeSale = buildLowStockAlerts(store.products);
  assert.equal(alertsBeforeSale.length, 2, 'Only Product A and Product C should trigger low-stock alerts initially');
  const alertA = alertsBeforeSale.find((a) => a.product_id === 'prod_ms_a');
  assert.ok(alertA);
  assert.equal(alertA.name, 'كراتين مياه معدنية');
  assert.equal(alertA.current_stock, 10);
  assert.equal(alertA.baseUnitName, 'كرتون');
  assert.equal(alertA.min_stock_level, 15);
  assert.equal(alertA.custom_min_stock_level, 15);

  const alertC = alertsBeforeSale.find((a) => a.product_id === 'prod_ms_c');
  assert.ok(alertC);
  assert.equal(alertC.min_stock_level, 5);
  assert.equal(alertC.custom_min_stock_level, null);

  // Selling 2 units of Product B reduces stock from 5 to 3 (<= custom min 3) -> status flips to قريب من النفاذ
  postSalesTransactionAtomic({
    companyId: cid,
    invoice: { invoice_number: 'INV-MS-001', total: 900, payment_method: 'CASH' },
    items: [{ product_id: 'prod_ms_b', quantity: 2, unit_price: 450 }],
    paymentMethod: 'CASH',
    paidAmount: 900,
  });

  assert.equal(prodB.current_stock, 3);
  assert.equal(prodB.status, 'قريب من النفاذ', 'Product B must transition to قريب من النفاذ once stock reaches custom threshold 3');

  const alertsAfterSale = buildLowStockAlerts(store.products);
  assert.equal(alertsAfterSale.length, 3, 'Product B must now appear in low-stock alerts');
  const alertB = alertsAfterSale.find((a) => a.product_id === 'prod_ms_b');
  assert.ok(alertB);
  assert.equal(alertB.current_stock, 3);
  assert.equal(alertB.baseUnitName, 'حبة');
  assert.equal(alertB.min_stock_level, 3);
});

