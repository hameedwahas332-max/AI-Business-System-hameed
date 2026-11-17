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
