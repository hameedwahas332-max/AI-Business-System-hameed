import {
  mockProducts,
  mockInventoryMovements,
  mockCustomersList,
  mockSuppliersList,
  mockAccountTransactions,
  mockInvoicesList,
  mockPurchaseInvoicesList,
  mockPaymentsList,
  mockExpensesList,
  persistAllToDisk,
  getTenantCollections,
  isTenantCleanProductionMode,
} from './dataStore.js';
import { getCurrentTenantId } from './security.js';

// ============================================================================
// 1. Types & Interfaces
// ============================================================================

export interface JournalLine {
  id?: string;
  account_code: string;
  account_name?: string;
  debit: number;
  credit: number;
  description?: string;
  party_id?: string;
  party_type?: 'CUSTOMER' | 'SUPPLIER' | 'EMPLOYEE' | 'OTHER';
}

export interface JournalEntry {
  id: string;
  entry_number: string;
  date: string;
  reference_type: string;
  reference_id?: string;
  description: string;
  currency: string;
  lines: JournalLine[];
  total_debit: number;
  total_credit: number;
  status: 'POSTED' | 'DRAFT';
  company_id: string;
  created_at: string;
  created_by?: string;
}

export interface AccountRecord {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  nature: 'DEBIT' | 'CREDIT';
  balance: number;
  is_active: boolean;
  company_id: string;
  updated_at: string;
}

// In-Memory tenant store for Chart of Accounts and Journal Entries
export const tenantAccountsMap = new Map<string, AccountRecord[]>();
export const tenantJournalEntriesMap = new Map<string, JournalEntry[]>();

// ============================================================================
// 2. Standard Chart of Accounts (COA)
// ============================================================================

export const STANDARD_CHART_OF_ACCOUNTS: Array<Omit<AccountRecord, 'id' | 'company_id' | 'balance' | 'updated_at'>> = [
  { code: '1101', name: 'Cash on Hand', name_ar: 'الصندوق / النقدية', type: 'ASSET', nature: 'DEBIT', is_active: true },
  { code: '1102', name: 'Bank Accounts', name_ar: 'البنك / الحسابات البنكية', type: 'ASSET', nature: 'DEBIT', is_active: true },
  { code: '1103', name: 'Accounts Receivable', name_ar: 'العملاء / المدينون', type: 'ASSET', nature: 'DEBIT', is_active: true },
  { code: '1104', name: 'Merchandise Inventory', name_ar: 'المخزون السلعي', type: 'ASSET', nature: 'DEBIT', is_active: true },
  { code: '1105', name: 'Input VAT Receivable', name_ar: 'ضريبة القيمة المضافة - مدخلات', type: 'ASSET', nature: 'DEBIT', is_active: true },
  { code: '2101', name: 'Accounts Payable', name_ar: 'الموردون / الدائنون', type: 'LIABILITY', nature: 'CREDIT', is_active: true },
  { code: '2102', name: 'Output VAT Payable', name_ar: 'ضريبة القيمة المضافة - مخرجات', type: 'LIABILITY', nature: 'CREDIT', is_active: true },
  { code: '2103', name: 'Salaries & Wages Payable', name_ar: 'مستحقات الرواتب والأجور', type: 'LIABILITY', nature: 'CREDIT', is_active: true },
  { code: '3101', name: 'Capital & Opening Balances', name_ar: 'رأس المال والأرصدة الافتتاحية', type: 'EQUITY', nature: 'CREDIT', is_active: true },
  { code: '4101', name: 'Sales Revenue', name_ar: 'إيرادات المبيعات', type: 'REVENUE', nature: 'CREDIT', is_active: true },
  { code: '4102', name: 'Sales Returns & Allowances', name_ar: 'مردودات ومسموحات المبيعات', type: 'REVENUE', nature: 'DEBIT', is_active: true },
  { code: '5101', name: 'Cost of Goods Sold (COGS)', name_ar: 'تكلفة البضاعة المباعة', type: 'EXPENSE', nature: 'DEBIT', is_active: true },
  { code: '5201', name: 'Salaries & Wages Expense', name_ar: 'مصروفات الرواتب والأجور', type: 'EXPENSE', nature: 'DEBIT', is_active: true },
  { code: '5202', name: 'General & Administrative Expenses', name_ar: 'المصروفات العمومية والإدارية', type: 'EXPENSE', nature: 'DEBIT', is_active: true },
  { code: '5209', name: 'Inventory Shrinkage & Adjustments', name_ar: 'فروق وعجز التسويات الجردية', type: 'EXPENSE', nature: 'DEBIT', is_active: true },
];

/**
 * Export in-memory accounting maps as plain JSON-serializable objects
 */
export function serializeAccountingMaps(): {
  tenantAccounts: Record<string, AccountRecord[]>;
  tenantJournalEntries: Record<string, JournalEntry[]>;
} {
  return {
    tenantAccounts: Object.fromEntries(tenantAccountsMap.entries()),
    tenantJournalEntries: Object.fromEntries(tenantJournalEntriesMap.entries()),
  };
}

/**
 * Hydrate in-memory accounting maps from stored data safely
 */
export function hydrateAccountingMaps(data: any): void {
  if (!data || typeof data !== 'object') return;
  try {
    if (typeof tenantAccountsMap === 'undefined' || typeof tenantJournalEntriesMap === 'undefined') {
      return;
    }
    if (data.tenantAccounts && typeof data.tenantAccounts === 'object') {
      tenantAccountsMap.clear();
      for (const [compId, accounts] of Object.entries(data.tenantAccounts)) {
        if (Array.isArray(accounts)) {
          tenantAccountsMap.set(compId, accounts as AccountRecord[]);
        }
      }
    }

    if (data.tenantJournalEntries && typeof data.tenantJournalEntries === 'object') {
      tenantJournalEntriesMap.clear();
      for (const [compId, entries] of Object.entries(data.tenantJournalEntries)) {
        if (Array.isArray(entries)) {
          tenantJournalEntriesMap.set(compId, entries as JournalEntry[]);
        }
      }
    }
  } catch {}
}

// ============================================================================
// 3. Rounding & Validation Helpers
// ============================================================================

/**
 * High-precision rounding to 2 decimal places avoiding floating-point inaccuracies
 */
export function roundMoney(val: unknown): number {
  const num = Number(val);
  if (isNaN(num) || !isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Validates balanced double-entry journal lines ensuring total Debits === total Credits
 */
export function validateBalancedJournalLines(lines: JournalLine[]): {
  valid: boolean;
  totalDebit: number;
  totalCredit: number;
  difference: number;
  error?: string;
} {
  if (!Array.isArray(lines) || lines.length === 0) {
    return {
      valid: false,
      totalDebit: 0,
      totalCredit: 0,
      difference: 0,
      error: 'يجب أن يحتوي القيد المحاسبي على طرفين على الأقل',
    };
  }

  let totalDebit = 0;
  let totalCredit = 0;

  for (const line of lines) {
    totalDebit += roundMoney(line.debit || 0);
    totalCredit += roundMoney(line.credit || 0);
  }

  totalDebit = roundMoney(totalDebit);
  totalCredit = roundMoney(totalCredit);
  const difference = roundMoney(Math.abs(totalDebit - totalCredit));

  if (difference > 0.01) {
    return {
      valid: false,
      totalDebit,
      totalCredit,
      difference,
      error: `القيد المحاسبي غير متوازن: إجمالي المدين (${totalDebit}) لا يساوي إجمالي الدائن (${totalCredit}) - الفارق: ${difference}`,
    };
  }

  if (totalDebit <= 0) {
    return {
      valid: false,
      totalDebit,
      totalCredit,
      difference: 0,
      error: 'مجموع القيد المحاسبي يجب أن يكون أكبر من الصفر',
    };
  }

  return { valid: true, totalDebit, totalCredit, difference: 0 };
}

// ============================================================================
// 4. Tenant Chart of Accounts Initialization & State Management
// ============================================================================

export function getTenantAccounts(companyId: string): AccountRecord[] {
  const cid = companyId || getCurrentTenantId() || 'comp_001';
  let accounts = tenantAccountsMap.get(cid);
  if (!accounts || accounts.length === 0) {
    const now = new Date().toISOString();
    accounts = STANDARD_CHART_OF_ACCOUNTS.map((std) => ({
      ...std,
      id: `acc_${cid}_${std.code}`,
      company_id: cid,
      balance: 0,
      updated_at: now,
    }));
    tenantAccountsMap.set(cid, accounts);
  } else {
    // Ensure all standard accounts exist
    const existingCodes = new Set(accounts.map((a) => a.code));
    const now = new Date().toISOString();
    for (const std of STANDARD_CHART_OF_ACCOUNTS) {
      if (!existingCodes.has(std.code)) {
        accounts.push({
          ...std,
          id: `acc_${cid}_${std.code}`,
          company_id: cid,
          balance: 0,
          updated_at: now,
        });
      }
    }
  }
  return accounts;
}

export function saveTenantAccounts(companyId: string, accounts: AccountRecord[]): void {
  const cid = companyId || getCurrentTenantId() || 'comp_001';
  tenantAccountsMap.set(cid, accounts);
}

export function getTenantJournalEntries(companyId: string): JournalEntry[] {
  const cid = companyId || getCurrentTenantId() || 'comp_001';
  let entries = tenantJournalEntriesMap.get(cid);
  if (!entries) {
    entries = [];
    tenantJournalEntriesMap.set(cid, entries);
  }
  return entries;
}

export function saveTenantJournalEntries(companyId: string, entries: JournalEntry[]): void {
  const cid = companyId || getCurrentTenantId() || 'comp_001';
  tenantJournalEntriesMap.set(cid, entries);
}

// ============================================================================
// 5. Central Double-Entry Posting Routine
// ============================================================================

export interface PostJournalOptions {
  companyId: string;
  reference_type: string;
  reference_id?: string;
  description: string;
  currency?: string;
  date?: string;
  lines: JournalLine[];
  created_by?: string;
}

export function postDoubleEntryJournal(options: PostJournalOptions): JournalEntry {
  const { companyId, reference_type, reference_id, description, lines } = options;
  const cid = companyId || getCurrentTenantId() || 'comp_001';
  const currency = options.currency || 'YER';
  const dateStr = (options.date || new Date().toISOString()).split('T')[0];
  const now = new Date().toISOString();

  // 1. Strict Balance Verification
  const balanceCheck = validateBalancedJournalLines(lines);
  if (!balanceCheck.valid) {
    const err: any = new Error(balanceCheck.error || 'القيد المحاسبي غير متوازن');
    err.status = 400;
    err.statusCode = 400;
    err.code = 'UNBALANCED_JOURNAL_ENTRY';
    throw err;
  }

  // 2. Load and reconcile Chart of Accounts
  const accounts = getTenantAccounts(cid);
  const accountMap = new Map<string, AccountRecord>(accounts.map((a) => [a.code, a]));

  const entryLines: JournalLine[] = [];

  for (const line of lines) {
    const code = String(line.account_code).trim();
    let acc = accountMap.get(code);

    if (!acc) {
      // Auto-create missing account using standard or generic
      const std = STANDARD_CHART_OF_ACCOUNTS.find((s) => s.code === code);
      acc = {
        id: `acc_${cid}_${code}`,
        code,
        name: std?.name || line.account_name || `Account ${code}`,
        name_ar: std?.name_ar || line.account_name || `حساب ${code}`,
        type: std?.type || (code.startsWith('1') ? 'ASSET' : code.startsWith('2') ? 'LIABILITY' : code.startsWith('4') ? 'REVENUE' : 'EXPENSE'),
        nature: std?.nature || (code.startsWith('1') || code.startsWith('5') ? 'DEBIT' : 'CREDIT'),
        balance: 0,
        is_active: true,
        company_id: cid,
        updated_at: now,
      };
      accounts.push(acc);
      accountMap.set(code, acc);
    }

    const debit = roundMoney(line.debit || 0);
    const credit = roundMoney(line.credit || 0);

    // Update account balance by normal nature:
    // ASSET / EXPENSE: balance = balance + (debit - credit)
    // LIABILITY / EQUITY / REVENUE: balance = balance + (credit - debit)
    if (acc.nature === 'DEBIT') {
      acc.balance = roundMoney(acc.balance + (debit - credit));
    } else {
      acc.balance = roundMoney(acc.balance + (credit - debit));
    }
    acc.updated_at = now;

    entryLines.push({
      id: line.id || `jl_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      account_code: code,
      account_name: acc.name_ar || acc.name,
      debit,
      credit,
      description: line.description || description,
      party_id: line.party_id,
      party_type: line.party_type,
    });
  }

  saveTenantAccounts(cid, accounts);

  // 3. Create and append Journal Entry
  const entryNumber = `JE-${dateStr.replace(/-/g, '')}-${Math.floor(Math.random() * 9000 + 1000)}`;
  const journalEntry: JournalEntry = {
    id: `je_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    entry_number: entryNumber,
    date: dateStr,
    reference_type,
    reference_id,
    description,
    currency,
    lines: entryLines,
    total_debit: balanceCheck.totalDebit,
    total_credit: balanceCheck.totalCredit,
    status: 'POSTED',
    company_id: cid,
    created_at: now,
    created_by: options.created_by || 'نظام المحاسبة المزدوجة',
  };

  const entries = getTenantJournalEntries(cid);
  entries.unshift(journalEntry);
  saveTenantJournalEntries(cid, entries);

  // 4. Synchronize into mockAccountTransactions for instant Ledger tab availability
  for (const line of entryLines) {
    if (line.debit > 0 || line.credit > 0) {
      mockAccountTransactions.unshift({
        id: `ctx-${journalEntry.id}-${line.account_code}`,
        company_id: cid,
        party_id: line.party_id || undefined,
        party_type: line.party_type || 'OTHER',
        type: line.debit > 0 ? 'DEBIT' : 'CREDIT',
        account_type: line.account_code,
        amount: line.debit > 0 ? line.debit : line.credit,
        debit: line.debit,
        credit: line.credit,
        currency,
        exchange_rate: 1.0,
        balance_after: accountMap.get(line.account_code)?.balance || 0,
        running_balance: accountMap.get(line.account_code)?.balance || 0,
        date: dateStr,
        description: `${description} (${line.account_code} - ${line.account_name})`,
        reference_no: reference_id || entryNumber,
        reference_type,
        created_at: now,
      } as any);
    }
  }

  return journalEntry;
}

// ============================================================================
// 6. Atomic Sales Posting & Perpetual Inventory Engine
// ============================================================================

export interface SalesPostParams {
  companyId: string;
  invoice: any;
  items: any[];
  customerId?: string;
  customerName?: string;
  paymentMethod?: string;
  paidAmount?: number;
  enforceStockCheck?: boolean;
  userId?: string;
  userName?: string;
}

export function postSalesTransactionAtomic(params: SalesPostParams) {
  const { companyId, invoice, enforceStockCheck = true } = params;
  const items = params.items || invoice.items || [];
  const cid = companyId || getCurrentTenantId() || 'comp_001';
  const paymentMethod = String(params.paymentMethod || invoice.payment_method || invoice.paymentMethod || 'CASH').toUpperCase();
  const rawDate = String(invoice.date || invoice.invoice_date || invoice.created_at || '').trim();
  const invoiceDate = rawDate ? rawDate.split('T')[0] : new Date().toISOString().split('T')[0];
  const invoiceCreatedAt = rawDate ? `${invoiceDate}T12:00:00.000Z` : new Date().toISOString();
  const invoiceNumber = invoice.invoice_number || invoice.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`;

  // 1. Stock Validation & Allocation (Stock Locking)
  const validatedItems: Array<{ prod: any; baseQty: number; unitPrice: number; unitCost: number; lineCogs: number }> = [];
  let totalCogs = 0;

  for (const it of items) {
    const prodId = it.product_id || it.productId || it.id;
    const factor = Number(it.unitFactor || it.conversionFactor || 1);
    const qty = Math.max(0, Number(it.quantity || 1));
    const baseQty = qty * factor;

    const prod = mockProducts.find(
      (p) => p.id === prodId || (p.sku && p.sku === it.sku) || (p.barcode && p.barcode === it.barcode)
    );

    const currentStock = Number(prod?.current_stock ?? prod?.qty ?? prod?.stock ?? 0);

    if (enforceStockCheck && baseQty > 0) {
      if (!prod || currentStock < baseQty) {
        const prodLabel = prod?.name || it.name || it.sku || prodId || 'صنف غير معروف';
        const err: any = new Error(
          `رصيد المخزون غير كافٍ للصنف "${prodLabel}". المطلوب: ${baseQty}، المتوفر حالياً في المخزن: ${currentStock}`
        );
        err.status = 400;
        err.statusCode = 400;
        err.code = 'INSUFFICIENT_STOCK';
        throw err;
      }
    }

    const unitCost = Number(prod?.cost_price || prod?.purchase_price || it.cost_price || 0);
    const unitPrice = Number(it.unit_price ?? it.price ?? 0);
    const lineCogs = roundMoney(baseQty * unitCost);
    totalCogs = roundMoney(totalCogs + lineCogs);

    validatedItems.push({ prod, baseQty, unitPrice, unitCost, lineCogs });
  }

  // 2. Deduct Inventory & Record Perpetual Movements
  for (const v of validatedItems) {
    if (v.prod && v.baseQty > 0) {
      const oldStock = Number(v.prod.current_stock ?? v.prod.qty ?? 0);
      const newStock = Math.max(0, oldStock - v.baseQty);
      v.prod.current_stock = newStock;
      v.prod.qty = newStock;
      v.prod.stock = newStock;
      v.prod.totalSold = (Number(v.prod.totalSold) || 0) + v.baseQty;
      v.prod.soldToday = (Number(v.prod.soldToday) || 0) + v.baseQty;

      mockInventoryMovements.unshift({
        id: `mov-sale-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        company_id: cid,
        product_id: v.prod.id,
        product_name: v.prod.name,
        type: 'OUT',
        quantity: -v.baseQty,
        remaining_stock: newStock,
        reference_type: 'SALES_INVOICE',
        reference_id: invoiceNumber,
        notes: `مبيعات فاتورة رقم: ${invoiceNumber} (تكلفة الوحدة: ${v.unitCost})`,
        date: invoiceDate,
      });
    }
  }

  // 3. Monetary Amounts Calculation
  const totalVal = roundMoney(
    invoice.total ??
    invoice.totalAmount ??
    invoice.grandTotal ??
    invoice.netTotal ??
    invoice.total_amount ??
    invoice.amount ??
    0
  );
  const taxVal = roundMoney(invoice.tax || invoice.taxAmount || 0);
  const discountVal = roundMoney(invoice.discount || invoice.invoice_discount || 0);
  const netSalesVal = roundMoney(Math.max(0, totalVal - taxVal));

  let paidVal = 0;
  if (params.paidAmount !== undefined) {
    paidVal = roundMoney(params.paidAmount);
  } else if (invoice.paid_amount !== undefined || invoice.paidAmount !== undefined) {
    paidVal = roundMoney(invoice.paid_amount ?? invoice.paidAmount);
  } else if (paymentMethod === 'CASH' || paymentMethod === 'BANK' || paymentMethod === 'WALLET' || paymentMethod === 'CARD') {
    paidVal = totalVal;
  } else {
    paidVal = 0;
  }
  const remainingVal = roundMoney(Math.max(0, totalVal - paidVal));

  // 4. Update Customer Balance for Credit Sales
  let customerName = String(
    params.customerName || invoice.customer_name || invoice.customerName || invoice.customer || ''
  ).trim();
  let cust = mockCustomersList.find(
    (c) => (params.customerId && c.id === params.customerId) || (customerName && c.name.toLowerCase() === customerName.toLowerCase())
  );
  if (cust && !customerName) customerName = cust.name;
  if (!customerName) customerName = (paidVal >= totalVal) ? 'عميل نقدي' : 'عميل آجل';

  if (remainingVal > 0) {
    if (!cust && customerName && customerName !== 'عميل نقدي') {
      cust = {
        id: `cust-${Date.now()}`,
        company_id: cid,
        name: customerName,
        phone: invoice.customer_phone || '',
        current_balance: remainingVal,
        balance: remainingVal,
        creditLimit: 0,
        status: 'ACTIVE',
        currency: invoice.currency || 'YER',
        is_active: true,
        created_at: invoiceCreatedAt,
        updated_at: invoiceCreatedAt,
      };
      mockCustomersList.unshift(cust);
    } else if (cust) {
      cust.current_balance = roundMoney((cust.current_balance || 0) + remainingVal);
      cust.balance = cust.current_balance;
      cust.updated_at = invoiceCreatedAt;
    }
  }

  // 5. Compound Double-Entry Journal for Revenue
  // Debits: Cash 1101, Bank 1102, Accounts Receivable 1103
  // Credits: Sales Revenue 4101, Output VAT Payable 2102
  const revenueLines: JournalLine[] = [];
  const isBank = ['BANK', 'CARD', 'TRANSFER', 'WALLET'].includes(paymentMethod);

  if (paidVal > 0) {
    if (isBank) {
      revenueLines.push({
        account_code: '1102',
        account_name: 'البنك / الحسابات البنكية',
        debit: paidVal,
        credit: 0,
        description: `تحصيل مبيعات بنكية فاتورة #${invoiceNumber}`,
      });
    } else {
      revenueLines.push({
        account_code: '1101',
        account_name: 'الصندوق / النقدية',
        debit: paidVal,
        credit: 0,
        description: `تحصيل مبيعات نقدية فاتورة #${invoiceNumber}`,
      });
    }
  }

  if (remainingVal > 0) {
    revenueLines.push({
      account_code: '1103',
      account_name: 'العملاء / المدينون',
      debit: remainingVal,
      credit: 0,
      description: `مبيعات آجلة على الحساب فاتورة #${invoiceNumber} (${customerName})`,
      party_id: cust?.id,
      party_type: 'CUSTOMER',
    });
  }

  // Revenue Credit: net of VAT
  revenueLines.push({
    account_code: '4101',
    account_name: 'إيرادات المبيعات',
    debit: 0,
    credit: netSalesVal,
    description: `إثبات إيرادات مبيعات فاتورة #${invoiceNumber}`,
  });

  if (taxVal > 0) {
    revenueLines.push({
      account_code: '2102',
      account_name: 'ضريبة القيمة المضافة - مخرجات',
      debit: 0,
      credit: taxVal,
      description: `ضريبة مخرجات مستحقة فاتورة #${invoiceNumber}`,
    });
  }

  // Post Revenue Journal
  const revenueJournal = postDoubleEntryJournal({
    companyId: cid,
    reference_type: 'SALES_INVOICE',
    reference_id: invoiceNumber,
    description: `إثبات مبيعات فاتورة #${invoiceNumber} (${customerName})`,
    currency: invoice.currency || 'YER',
    date: invoiceDate,
    lines: revenueLines,
    created_by: params.userName || invoice.created_by_name || 'حميد وهاس',
  });

  // 6. Perpetual Inventory Journal: Dr 5101 (COGS) / Cr 1104 (Inventory)
  let cogsJournal: JournalEntry | null = null;
  if (totalCogs > 0) {
    cogsJournal = postDoubleEntryJournal({
      companyId: cid,
      reference_type: 'INVENTORY_COGS',
      reference_id: invoiceNumber,
      description: `إثبات تكلفة البضاعة المباعة (COGS) فاتورة #${invoiceNumber}`,
      currency: invoice.currency || 'YER',
      date: invoiceDate,
      lines: [
        {
          account_code: '5101',
          account_name: 'تكلفة البضاعة المباعة',
          debit: totalCogs,
          credit: 0,
          description: `تكلفة البضاعة المباعة فاتورة #${invoiceNumber}`,
        },
        {
          account_code: '1104',
          account_name: 'المخزون السلعي',
          debit: 0,
          credit: totalCogs,
          description: `صرف مخزني بالبضاعة المباعة فاتورة #${invoiceNumber}`,
        },
      ],
      created_by: params.userName || 'نظام الجرد المستمر (Perpetual COGS)',
    });
  }

  // 7. Record Payment in mockPaymentsList if cash/bank received
  if (paidVal > 0) {
    mockPaymentsList.unshift({
      id: `pmt-sale-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      company_id: cid,
      voucher_number: `REC-${invoiceNumber}`,
      voucherNumber: `REC-${invoiceNumber}`,
      payment_number: `REC-${invoiceNumber}`,
      paymentNumber: `REC-${invoiceNumber}`,
      voucher_type: 'RECEIPT',
      payment_type: 'IN',
      type: 'CUSTOMER_PAYMENT',
      customer_id: cust?.id || undefined,
      customer_name: customerName,
      party_name: customerName,
      amount: paidVal,
      payment_method: isBank ? 'BANK' : 'CASH',
      reference_type: 'SALES_INVOICE',
      referenceType: 'SALES_INVOICE',
      reference_id: invoiceNumber,
      referenceId: invoiceNumber,
      reference_no: invoiceNumber,
      referenceNo: invoiceNumber,
      date: invoiceDate,
      notes: `تحصيل مبيعات فاتورة رقم #${invoiceNumber}`,
      description: `تحصيل مبيعات فاتورة رقم #${invoiceNumber}`,
      created_at: invoiceCreatedAt,
    } as any);
  }

  // 8. Construct complete invoice record and store in mockInvoicesList
  const invoiceStatus = remainingVal <= 0.01 && totalVal > 0 ? 'paid' : (paidVal > 0 ? 'partial' : 'unpaid');
  const newInv = {
    ...invoice,
    id: invoice.id || `INV-${Date.now()}`,
    company_id: cid,
    invoice_number: invoiceNumber,
    invoiceNumber: invoiceNumber,
    customer: customerName,
    customer_name: customerName,
    customerName: customerName,
    clientName: customerName,
    customer_id: cust ? cust.id : (invoice.customer_id || null),
    salesperson: params.userName || invoice.salesperson_name || invoice.salespersonName || 'حميد وهاس',
    salesperson_name: params.userName || invoice.salesperson_name || invoice.salespersonName || 'حميد وهاس',
    cashier_name: params.userName || invoice.cashier_name || 'حميد وهاس',
    createdBy: params.userName || invoice.createdBy || 'حميد وهاس',
    date: invoiceDate,
    invoice_date: invoiceDate,
    subtotal: Number(invoice.subtotal || netSalesVal || totalVal),
    discount: discountVal,
    tax: taxVal,
    total: totalVal,
    totalAmount: totalVal,
    grandTotal: totalVal,
    netTotal: totalVal,
    total_amount: totalVal,
    amount: totalVal,
    paid_amount: paidVal,
    paidAmount: paidVal,
    paid: paidVal,
    amountPaid: paidVal,
    remaining_amount: remainingVal,
    remainingAmount: remainingVal,
    remaining: remainingVal,
    remainingBalance: remainingVal,
    balanceDue: remainingVal,
    payment_method: paymentMethod,
    paymentMethod: paymentMethod,
    status: invoiceStatus,
    payment_status: invoiceStatus === 'paid' ? 'PAID' : (invoiceStatus === 'partial' ? 'PARTIAL' : 'PENDING'),
    items: items,
    created_at: invoiceCreatedAt,
  };

  const existingInvIdx = mockInvoicesList.findIndex(
    (inv) => String(inv.id) === String(newInv.id) || String(inv.invoice_number) === String(invoiceNumber) || String(inv.invoiceNumber) === String(invoiceNumber)
  );
  if (existingInvIdx !== -1) {
    mockInvoicesList.splice(existingInvIdx, 1);
  }
  mockInvoicesList.unshift(newInv);

  persistAllToDisk();

  return {
    invoiceNumber,
    totalVal,
    paidVal,
    remainingVal,
    totalCogs,
    revenueJournal,
    cogsJournal,
    customer: cust,
    invoice: newInv,
    newInv,
    data: newInv,
  };
}

// ============================================================================
// 7. Atomic Sales Return Posting Routine
// ============================================================================

export interface SalesReturnParams {
  companyId: string;
  returnData: any;
  items: any[];
  originalInvoiceNumber?: string;
  customerId?: string;
  customerName?: string;
  refundMethod?: string; // CASH, BANK, CREDIT_NOTE
  refundAmount?: number;
  userId?: string;
  userName?: string;
}

export function postSalesReturnAtomic(params: SalesReturnParams) {
  const { companyId, returnData, items } = params;
  const cid = companyId || getCurrentTenantId() || 'comp_001';
  const refundMethod = String(params.refundMethod || returnData.refundMethod || returnData.paymentMethod || 'CASH').toUpperCase();
  const rawDate = String(returnData.date || returnData.created_at || '').trim();
  const returnDate = rawDate ? rawDate.split('T')[0] : new Date().toISOString().split('T')[0];
  const returnNumber = returnData.return_number || returnData.returnNumber || `RET-${Date.now().toString().slice(-6)}`;
  const origInvNum = params.originalInvoiceNumber || returnData.original_invoice_number || returnData.invoiceNumber || 'INV-ORIG';

  // BUG-07: Validate returned item quantities against original invoice sold quantity
  const origInv = mockInvoicesList.find(
    (i) => (i.invoice_number === origInvNum || i.id === origInvNum) && (i.company_id === cid || !i.company_id)
  );

  if (origInv && Array.isArray(origInv.items) && origInv.items.length > 0) {
    for (const it of items) {
      const prodId = it.product_id || it.productId || it.id;
      const factor = Number(it.unitFactor || it.conversionFactor || 1);
      const returnQty = Math.max(0, Number(it.quantity || 1));
      const baseReturnQty = returnQty * factor;

      const origItem = origInv.items.find(
        (oi: any) =>
          (oi.product_id && oi.product_id === prodId) ||
          (oi.productId && oi.productId === prodId) ||
          (oi.id && oi.id === prodId) ||
          (it.sku && oi.sku === it.sku) ||
          (it.barcode && oi.barcode === it.barcode)
      );

      if (!origItem) {
        const err: any = new Error(`الصنف (${it.name || prodId}) غير موجود في الفاتورة الأصلية #${origInvNum}`);
        err.status = 400;
        err.statusCode = 400;
        err.code = 'EXCEEDS_ORIGINAL_INVOICE_QTY';
        throw err;
      }

      const origItemFactor = Number(origItem.unitFactor || origItem.conversionFactor || 1);
      const origSoldBaseQty = Math.max(0, Number(origItem.quantity || origItem.qty || 0)) * origItemFactor;

      // Sum all previously returned quantities for this product on this original invoice
      let prevReturnedBaseQty = 0;
      for (const inv of mockInvoicesList) {
        if (
          inv.status !== 'CANCELLED' &&
          (inv.original_invoice_number === origInvNum || inv.reference_id === origInvNum) &&
          Array.isArray(inv.items)
        ) {
          const matchRet = inv.items.find(
            (ri: any) =>
              (ri.product_id && ri.product_id === prodId) ||
              (ri.productId && ri.productId === prodId) ||
              (ri.id && ri.id === prodId) ||
              (it.sku && ri.sku === it.sku)
          );
          if (matchRet) {
            const retFactor = Number(matchRet.unitFactor || matchRet.conversionFactor || 1);
            prevReturnedBaseQty += Number(matchRet.quantity || matchRet.qty || 0) * retFactor;
          }
        }
      }

      if (prevReturnedBaseQty === 0) {
        for (const mov of mockInventoryMovements) {
          if (
            mov.reference_type === 'SALES_RETURN' &&
            mov.product_id === prodId &&
            mov.notes &&
            mov.notes.includes(origInvNum)
          ) {
            prevReturnedBaseQty += Number(mov.quantity || 0);
          }
        }
      }

      if (baseReturnQty + prevReturnedBaseQty > origSoldBaseQty) {
        const err: any = new Error(
          `الكمية المرتجعة للصنف (${it.name || prodId}) تتجاوز الكمية المباعة في الفاتورة الأصلية #${origInvNum}`
        );
        err.status = 400;
        err.statusCode = 400;
        err.code = 'EXCEEDS_ORIGINAL_INVOICE_QTY';
        throw err;
      }
    }
  }

  let totalReturnCogs = 0;

  // 1. Restore Stock & Record IN movements
  for (const it of items) {
    const prodId = it.product_id || it.productId || it.id;
    const factor = Number(it.unitFactor || it.conversionFactor || 1);
    const qty = Math.max(0, Number(it.quantity || 1));
    const baseQty = qty * factor;

    const prod = mockProducts.find(
      (p) => p.id === prodId || (p.sku && p.sku === it.sku) || (p.barcode && p.barcode === it.barcode)
    );

    if (prod && baseQty > 0) {
      const oldStock = Number(prod.current_stock ?? prod.qty ?? 0);
      const newStock = oldStock + baseQty;
      prod.current_stock = newStock;
      prod.qty = newStock;
      prod.stock = newStock;
      prod.totalSold = Math.max(0, (Number(prod.totalSold) || 0) - baseQty);

      const unitCost = Number(prod.cost_price || prod.purchase_price || it.cost_price || 0);
      const lineCogs = roundMoney(baseQty * unitCost);
      totalReturnCogs = roundMoney(totalReturnCogs + lineCogs);

      mockInventoryMovements.unshift({
        id: `mov-ret-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        company_id: cid,
        product_id: prod.id,
        product_name: prod.name,
        type: 'IN',
        quantity: baseQty,
        remaining_stock: newStock,
        reference_type: 'SALES_RETURN',
        reference_id: returnNumber,
        notes: `مردودات مبيعات من فاتورة #${origInvNum}`,
        date: returnDate,
      });
    }
  }

  // 2. Financial Calculations
  const totalRefund = roundMoney(
    params.refundAmount ??
    returnData.total ??
    returnData.amount ??
    returnData.refundAmount ??
    0
  );
  const taxRefund = roundMoney(returnData.tax || returnData.taxAmount || 0);
  const netReturnVal = roundMoney(Math.max(0, totalRefund - taxRefund));

  // 3. Customer Balance Reversal if Credit Note
  let cust = mockCustomersList.find(
    (c) => (params.customerId && c.id === params.customerId) || (params.customerName && c.name === params.customerName)
  );

  if (refundMethod === 'CREDIT' || refundMethod === 'CREDIT_NOTE' || refundMethod === 'ON_ACCOUNT') {
    if (cust && totalRefund > 0) {
      cust.current_balance = roundMoney(Math.max(0, (cust.current_balance || 0) - totalRefund));
      cust.balance = cust.current_balance;
    }
  }

  // 4. Return Journal Entry
  // Debits: 4102 Sales Returns & Allowances (net), 2102 Output VAT Payable (tax reversal)
  // Credits: 1101 Cash / 1102 Bank / 1103 Accounts Receivable
  const returnLines: JournalLine[] = [
    {
      account_code: '4102',
      account_name: 'مردودات ومسموحات المبيعات',
      debit: netReturnVal,
      credit: 0,
      description: `إثبات مردودات مبيعات مرتجع #${returnNumber}`,
    },
  ];

  if (taxRefund > 0) {
    returnLines.push({
      account_code: '2102',
      account_name: 'ضريبة القيمة المضافة - مخرجات',
      debit: taxRefund,
      credit: 0,
      description: `عكس ضريبة مخرجات مردودات مبيعات #${returnNumber}`,
    });
  }

  if (refundMethod === 'BANK' || refundMethod === 'CARD') {
    returnLines.push({
      account_code: '1102',
      account_name: 'البنك / الحسابات البنكية',
      debit: 0,
      credit: totalRefund,
      description: `رد قيمة مردودات مبيعات عبر البنك #${returnNumber}`,
    });
  } else if (refundMethod === 'CREDIT' || refundMethod === 'CREDIT_NOTE' || refundMethod === 'ON_ACCOUNT') {
    returnLines.push({
      account_code: '1103',
      account_name: 'العملاء / المدينون',
      debit: 0,
      credit: totalRefund,
      description: `إشعار دائن لحساب العميل بمردودات مبيعات #${returnNumber}`,
      party_id: cust?.id,
      party_type: 'CUSTOMER',
    });
  } else {
    returnLines.push({
      account_code: '1101',
      account_name: 'الصندوق / النقدية',
      debit: 0,
      credit: totalRefund,
      description: `رد نقدي لمردودات مبيعات #${returnNumber}`,
    });
  }

  const returnJournal = postDoubleEntryJournal({
    companyId: cid,
    reference_type: 'SALES_RETURN',
    reference_id: returnNumber,
    description: `مردودات مبيعات مرتجع #${returnNumber} للفاتورة #${origInvNum}`,
    currency: returnData.currency || 'YER',
    date: returnDate,
    lines: returnLines,
    created_by: params.userName || 'حميد وهاس',
  });

  // 5. Perpetual Inventory COGS Reversal: Dr 1104 (Inventory) / Cr 5101 (COGS)
  let cogsReversalJournal: JournalEntry | null = null;
  if (totalReturnCogs > 0) {
    cogsReversalJournal = postDoubleEntryJournal({
      companyId: cid,
      reference_type: 'INVENTORY_RETURN_COGS',
      reference_id: returnNumber,
      description: `عكس تكلفة البضاعة المباعة لمردودات مبيعات #${returnNumber}`,
      currency: returnData.currency || 'YER',
      date: returnDate,
      lines: [
        {
          account_code: '1104',
          account_name: 'المخزون السلعي',
          debit: totalReturnCogs,
          credit: 0,
          description: `إرجاع بضاعة مردودة إلى المخزون #${returnNumber}`,
        },
        {
          account_code: '5101',
          account_name: 'تكلفة البضاعة المباعة',
          debit: 0,
          credit: totalReturnCogs,
          description: `عكس تكلفة البضاعة المباعة مرتجع #${returnNumber}`,
        },
      ],
      created_by: params.userName || 'نظام الجرد المستمر (Perpetual COGS Reversal)',
    });
  }

  // BUG-07: Record return invoice into mockInvoicesList to enforce cumulative return limits
  mockInvoicesList.unshift({
    id: `inv-ret-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    company_id: cid,
    invoice_number: returnNumber,
    original_invoice_number: origInvNum,
    reference_type: 'SALES_RETURN',
    status: 'RETURNED',
    date: returnDate,
    customer_id: cust?.id || params.customerId,
    customer_name: cust?.name || params.customerName || 'عميل نقدي',
    items: items.map((it) => ({
      product_id: it.product_id || it.productId || it.id,
      name: it.name || it.product_name || 'صنف مرتجع',
      quantity: Number(it.quantity || 1),
      unit_price: Number(it.unit_price || it.unitPrice || it.price || 0),
      total: Number(it.total || 0),
      unitFactor: Number(it.unitFactor || it.conversionFactor || 1),
    })),
    subtotal: netReturnVal,
    tax: taxRefund,
    total: totalRefund,
    amount: totalRefund,
    paid_amount: totalRefund,
    payment_method: refundMethod,
    created_at: new Date().toISOString(),
  });

  persistAllToDisk();

  return {
    returnNumber,
    totalRefund,
    totalReturnCogs,
    returnJournal,
    cogsReversalJournal,
  };
}

// ============================================================================
// 8. Atomic Purchase Posting Routine (Weighted Average Cost - WAC)
// ============================================================================

export interface PurchasePostParams {
  companyId: string;
  purchaseInvoice: any;
  items: any[];
  supplierId?: string;
  supplierName?: string;
  paymentMethod?: string;
  paidAmount?: number;
  userId?: string;
  userName?: string;
}

export function postPurchaseTransactionAtomic(params: PurchasePostParams) {
  const { companyId, purchaseInvoice } = params;
  const items = params.items || purchaseInvoice.items || [];
  const cid = companyId || getCurrentTenantId() || 'comp_001';
  const paymentMethod = String(params.paymentMethod || purchaseInvoice.payment_method || 'CREDIT').toUpperCase();
  const rawDate = String(purchaseInvoice.invoice_date || purchaseInvoice.date || purchaseInvoice.created_at || '').trim();
  const invoiceDate = rawDate ? rawDate.split('T')[0] : new Date().toISOString().split('T')[0];
  const invoiceCreatedAt = rawDate ? `${invoiceDate}T12:00:00.000Z` : new Date().toISOString();
  const invoiceNumber = purchaseInvoice.invoice_number || purchaseInvoice.invoiceNumber || `PUR-${Date.now().toString().slice(-6)}`;

  let calculatedSubtotal = 0;
  let calculatedTax = 0;

  // 1. Inventory Sync with Weighted Average Cost (WAC)
  for (const it of items) {
    const paidQty = Math.max(0, Number(it.quantity || 0));
    const freeQty = Math.max(0, Number(it.freeQuantity || 0));
    const totalIncomingUnits = paidQty + freeQty;
    const unitCost = Math.max(0, Number(it.unit_cost !== undefined ? it.unit_cost : (it.unitPrice || it.price || 0)));
    const grossLine = roundMoney(paidQty * unitCost);
    const lineDiscount = Math.max(0, Number(it.discount || it.discountValue || 0));
    const netLine = roundMoney(Math.max(0, grossLine - lineDiscount));
    calculatedSubtotal = roundMoney(calculatedSubtotal + netLine);

    const lineTax = Math.max(0, Number(it.tax || it.taxAmount || 0));
    calculatedTax = roundMoney(calculatedTax + lineTax);

    const prodId = it.product_id || it.productId || it.id;
    const prod = mockProducts.find(
      (p) => p.id === prodId || (p.sku && p.sku === it.sku) || (p.barcode && p.barcode === it.barcode)
    );

    if (prod && totalIncomingUnits > 0) {
      const unitFactor = Number(it.unitFactor || 1);
      const incomingBaseStock = totalIncomingUnits * unitFactor;
      const oldStock = Number(prod.current_stock ?? prod.qty ?? prod.stock ?? 0);
      const oldCost = Number(prod.cost_price ?? prod.purchase_price ?? unitCost);

      // Weighted Average Cost Formula: ((oldStock * oldCost) + netLine) / (oldStock + incomingBaseStock)
      // Free quantities (freeQuantity > 0) and line discounts properly reduce unit cost
      let newCost = unitCost;
      if (oldStock > 0 && oldCost > 0) {
        newCost = roundMoney(((oldStock * oldCost) + netLine) / (oldStock + incomingBaseStock));
      } else if (incomingBaseStock > 0) {
        newCost = roundMoney(netLine / incomingBaseStock);
      } else {
        newCost = roundMoney(unitCost);
      }

      prod.cost_price = newCost;
      prod.purchase_price = newCost;
      const newStock = oldStock + incomingBaseStock;
      prod.current_stock = newStock;
      prod.qty = newStock;
      prod.stock = newStock;

      mockInventoryMovements.unshift({
        id: `mov-pur-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        company_id: cid,
        product_id: prod.id,
        product_name: prod.name,
        type: 'IN',
        quantity: incomingBaseStock,
        remaining_stock: newStock,
        reference_type: 'PURCHASE_INVOICE',
        reference_id: invoiceNumber,
        notes: `توريد مشتريات (شراء: ${paidQty} + مجاني: ${freeQty}) - متوسط التكلفة المرجح: ${newCost}`,
        date: invoiceDate,
      });
    }
  }

  // 2. Monetary Amounts
  const totalVal = roundMoney(
    purchaseInvoice.total ??
    purchaseInvoice.grandTotal ??
    (calculatedSubtotal + calculatedTax)
  );
  const taxVal = roundMoney(purchaseInvoice.tax ?? purchaseInvoice.taxAmount ?? calculatedTax);
  const netInventoryVal = roundMoney(Math.max(0, totalVal - taxVal));

  let paidVal = 0;
  if (params.paidAmount !== undefined) {
    paidVal = roundMoney(params.paidAmount);
  } else if (purchaseInvoice.paid_amount !== undefined || purchaseInvoice.paidAmount !== undefined) {
    paidVal = roundMoney(purchaseInvoice.paid_amount ?? purchaseInvoice.paidAmount);
  } else if (['CASH', 'BANK', 'CARD', 'TRANSFER', 'WALLET'].includes(paymentMethod)) {
    paidVal = totalVal;
  } else {
    paidVal = 0;
  }
  const unpaidVal = roundMoney(Math.max(0, totalVal - paidVal));

  // 3. Update Supplier Balance for Credit Purchases
  let supplierName = String(
    params.supplierName || purchaseInvoice.supplier_name || purchaseInvoice.supplierName || purchaseInvoice.supplier || ''
  ).trim();
  let supp = mockSuppliersList.find(
    (s) => (params.supplierId && s.id === params.supplierId) || (supplierName && s.name.toLowerCase() === supplierName.toLowerCase())
  );
  if (supp && !supplierName) supplierName = supp.name;
  if (!supplierName) supplierName = (unpaidVal <= 0.01) ? 'مورد نقدي' : 'مورد آجل';

  if (unpaidVal > 0) {
    if (!supp && supplierName && supplierName !== 'مورد نقدي') {
      supp = {
        id: `supp-${Date.now()}`,
        company_id: cid,
        name: supplierName,
        phone: purchaseInvoice.supplier_phone || '',
        current_balance: unpaidVal,
        balance: unpaidVal,
        currency: purchaseInvoice.currency || 'YER',
        is_active: true,
        created_at: invoiceCreatedAt,
        updated_at: invoiceCreatedAt,
      };
      mockSuppliersList.unshift(supp);
    } else if (supp) {
      supp.current_balance = roundMoney((supp.current_balance || 0) + unpaidVal);
      supp.balance = supp.current_balance;
      supp.updated_at = invoiceCreatedAt;
    }
  }

  // 4. Compound Purchase Journal Entry
  // Debits: 1104 Merchandise Inventory (Net), 1105 Input VAT Receivable
  // Credits: 1101 Cash, 1102 Bank, 2101 Accounts Payable
  const purchaseLines: JournalLine[] = [
    {
      account_code: '1104',
      account_name: 'المخزون السلعي',
      debit: netInventoryVal,
      credit: 0,
      description: `إثبات توريد بضاعة مخزنية فاتورة مشتريات #${invoiceNumber}`,
    },
  ];

  if (taxVal > 0) {
    purchaseLines.push({
      account_code: '1105',
      account_name: 'ضريبة القيمة المضافة - مدخلات',
      debit: taxVal,
      credit: 0,
      description: `ضريبة مدخلات قابلة للخصم فاتورة مشتريات #${invoiceNumber}`,
    });
  }

  const isBank = ['BANK', 'CARD', 'TRANSFER', 'WALLET'].includes(paymentMethod);
  if (paidVal > 0) {
    if (isBank) {
      purchaseLines.push({
        account_code: '1102',
        account_name: 'البنك / الحسابات البنكية',
        debit: 0,
        credit: paidVal,
        description: `سداد بنكي لمشتريات فاتورة #${invoiceNumber}`,
      });
    } else {
      purchaseLines.push({
        account_code: '1101',
        account_name: 'الصندوق / النقدية',
        debit: 0,
        credit: paidVal,
        description: `سداد نقدي لمشتريات فاتورة #${invoiceNumber}`,
      });
    }
  }

  if (unpaidVal > 0) {
    purchaseLines.push({
      account_code: '2101',
      account_name: 'الموردون / الدائنون',
      debit: 0,
      credit: unpaidVal,
      description: `استحقاق آجل للمورد (${supplierName}) فاتورة #${invoiceNumber}`,
      party_id: supp?.id,
      party_type: 'SUPPLIER',
    });
  }

  const purchaseJournal = postDoubleEntryJournal({
    companyId: cid,
    reference_type: 'PURCHASE_INVOICE',
    reference_id: invoiceNumber,
    description: `إثبات مشتريات وتوريد مخزون فاتورة #${invoiceNumber} (${supplierName})`,
    currency: purchaseInvoice.currency || 'YER',
    date: invoiceDate,
    lines: purchaseLines,
    created_by: params.userName || 'حميد وهاس',
  });

  // 5. Record Payment in mockPaymentsList if cash/bank paid
  if (paidVal > 0) {
    mockPaymentsList.unshift({
      id: `pmt-pur-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      company_id: cid,
      voucher_number: `PAY-${invoiceNumber}`,
      voucherNumber: `PAY-${invoiceNumber}`,
      payment_number: `PAY-${invoiceNumber}`,
      paymentNumber: `PAY-${invoiceNumber}`,
      voucher_type: 'PAYMENT',
      payment_type: 'OUT',
      type: 'SUPPLIER_PAYMENT',
      supplier_id: supp?.id || undefined,
      supplier_name: supplierName,
      party_name: supplierName,
      amount: paidVal,
      payment_method: isBank ? 'BANK' : 'CASH',
      reference_type: 'PURCHASE_INVOICE',
      referenceType: 'PURCHASE_INVOICE',
      reference_id: invoiceNumber,
      referenceId: invoiceNumber,
      reference_no: invoiceNumber,
      referenceNo: invoiceNumber,
      date: invoiceDate,
      notes: `سداد مشتريات فاتورة رقم #${invoiceNumber}`,
      description: `سداد مشتريات فاتورة رقم #${invoiceNumber}`,
      created_at: invoiceCreatedAt,
    } as any);
  }

  // 6. Construct complete purchase invoice record and store in mockPurchaseInvoicesList
  const purStatus = unpaidVal <= 0.01 ? 'PAID' : (paidVal > 0 ? 'PARTIAL' : 'PENDING');
  const newPur = {
    ...purchaseInvoice,
    id: purchaseInvoice.id || `PUR-${Date.now()}`,
    company_id: cid,
    invoice_number: invoiceNumber,
    invoiceNumber: invoiceNumber,
    supplier_name: supplierName,
    supplierName: supplierName,
    supplier_id: supp ? supp.id : (purchaseInvoice.supplier_id || null),
    invoice_date: invoiceDate,
    date: invoiceDate,
    subtotal: calculatedSubtotal || totalVal,
    tax: taxVal,
    total: totalVal,
    grandTotal: totalVal,
    netTotal: totalVal,
    total_amount: totalVal,
    amount: totalVal,
    paid_amount: paidVal,
    paidAmount: paidVal,
    paid: paidVal,
    remaining_amount: unpaidVal,
    remainingAmount: unpaidVal,
    remaining: unpaidVal,
    status: purStatus,
    payment_method: paymentMethod,
    items: items,
    created_at: invoiceCreatedAt,
  };

  const existingPurIdx = mockPurchaseInvoicesList.findIndex(
    (pur) => String(pur.id) === String(newPur.id) || String(pur.invoice_number) === String(invoiceNumber) || String(pur.invoiceNumber) === String(invoiceNumber)
  );
  if (existingPurIdx !== -1) {
    mockPurchaseInvoicesList.splice(existingPurIdx, 1);
  }
  mockPurchaseInvoicesList.unshift(newPur);

  persistAllToDisk();

  return {
    invoiceNumber,
    totalVal,
    paidVal,
    unpaidVal,
    purchaseJournal,
    supplier: supp,
    purchaseInvoice: newPur,
    newPur,
    data: newPur,
  };
}

// ============================================================================
// 9. Atomic Voucher Posting Routine (Receipt & Payment)
// ============================================================================

export interface VoucherParams {
  companyId: string;
  type: 'RECEIPT' | 'PAYMENT';
  voucherNumber?: string;
  amount: number;
  partyType?: 'CUSTOMER' | 'SUPPLIER' | 'OTHER';
  partyId?: string;
  partyName?: string;
  paymentMethod?: 'CASH' | 'BANK';
  description?: string;
  date?: string;
  created_by?: string;
  referenceType?: string;
  reference_type?: string;
  referenceNo?: string;
  reference_no?: string;
  referenceId?: string;
  reference_id?: string;
}

export function postVoucherAtomic(params: VoucherParams) {
  const { companyId, type, amount } = params;
  const cid = companyId || getCurrentTenantId() || 'comp_001';
  const roundAmt = roundMoney(amount);
  if (roundAmt <= 0) {
    const err: any = new Error('مبلغ السند يجب أن يكون أكبر من الصفر');
    err.status = 400;
    throw err;
  }

  const vNum = params.voucherNumber || `${type === 'RECEIPT' ? 'REC' : 'PAY'}-${Date.now().toString().slice(-6)}`;
  const dateStr = (params.date || new Date().toISOString()).split('T')[0];
  const isBank = params.paymentMethod === 'BANK';
  const cashOrBankCode = isBank ? '1102' : '1101';
  const cashOrBankName = isBank ? 'البنك / الحسابات البنكية' : 'الصندوق / النقدية';

  const refType = String(params.referenceType || params.reference_type || '').toUpperCase();
  const refNo = String(params.referenceNo || params.reference_no || params.referenceId || params.reference_id || '').trim();
  const desc = String(params.description || '');

  // Idempotency check for invoice payments:
  // If referenceType === 'SALES_INVOICE' || referenceType === 'PURCHASE_INVOICE' or description contains
  // 'سند قبض آلي عن فاتورة مبيعات' / 'نقطة البيع' / 'فاتورة مشتريات', return the existing payment idempotently
  // WITHOUT deducting cust.current_balance or supp.current_balance and WITHOUT posting a duplicate journal entry to 1101 Cash!
  const isInvoiceAutoVoucher =
    refType === 'SALES_INVOICE' ||
    refType === 'PURCHASE_INVOICE' ||
    desc.includes('سند قبض آلي عن فاتورة مبيعات') ||
    desc.includes('نقطة البيع') ||
    desc.includes('فاتورة مشتريات') ||
    desc.includes('تحصيل مبيعات فاتورة');

  if (isInvoiceAutoVoucher) {
    const existingPmt = mockPaymentsList.find((p) => {
      const pRef = String(p.reference_no || p.referenceNo || p.reference_id || p.referenceId || '').trim();
      const pVouch = String(p.voucher_number || p.voucherNumber || p.payment_number || p.paymentNumber || '').trim();
      return (
        (refNo && (pRef === refNo || pVouch === refNo || pVouch === `REC-${refNo}` || pVouch === `PAY-${refNo}`)) ||
        (params.voucherNumber && (pVouch === params.voucherNumber || pRef === params.voucherNumber))
      );
    });

    if (existingPmt) {
      return {
        voucherNumber: existingPmt.voucher_number || existingPmt.payment_number || vNum,
        amount: roundAmt,
        journal: null,
        payment: existingPmt,
        data: existingPmt,
      };
    }

    const autoPmt = {
      id: `PMT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      company_id: cid,
      voucher_number: params.voucherNumber || vNum,
      voucherNumber: params.voucherNumber || vNum,
      payment_number: params.voucherNumber || vNum,
      paymentNumber: params.voucherNumber || vNum,
      amount: roundAmt,
      type: type === 'RECEIPT' ? 'CUSTOMER_PAYMENT' : 'SUPPLIER_PAYMENT',
      voucher_type: type,
      payment_type: type === 'RECEIPT' ? 'IN' : 'OUT',
      customer_id: params.partyType === 'CUSTOMER' ? params.partyId : undefined,
      customer_name: params.partyType === 'CUSTOMER' ? params.partyName : undefined,
      supplier_id: params.partyType === 'SUPPLIER' ? params.partyId : undefined,
      supplier_name: params.partyType === 'SUPPLIER' ? params.partyName : undefined,
      party_id: params.partyId,
      party_name: params.partyName,
      payment_method: params.paymentMethod || 'CASH',
      reference_type: refType || (type === 'RECEIPT' ? 'SALES_INVOICE' : 'PURCHASE_INVOICE'),
      referenceType: refType || (type === 'RECEIPT' ? 'SALES_INVOICE' : 'PURCHASE_INVOICE'),
      reference_id: refNo,
      referenceId: refNo,
      reference_no: refNo,
      referenceNo: refNo,
      date: dateStr,
      payment_date: dateStr,
      description: desc || `سند ${type === 'RECEIPT' ? 'قبض' : 'صرف'} #${vNum}`,
      status: 'CONFIRMED',
      created_at: new Date().toISOString(),
    };
    mockPaymentsList.unshift(autoPmt as any);
    persistAllToDisk();
    return {
      voucherNumber: params.voucherNumber || vNum,
      amount: roundAmt,
      journal: null,
      payment: autoPmt,
      data: autoPmt,
    };
  }

  const lines: JournalLine[] = [];

  if (type === 'RECEIPT') {
    // Dr Cash/Bank, Cr Accounts Receivable (1103)
    lines.push({
      account_code: cashOrBankCode,
      account_name: cashOrBankName,
      debit: roundAmt,
      credit: 0,
      description: params.description || `سند قبض رقم #${vNum} من ${params.partyName || 'العميل'}`,
    });
    lines.push({
      account_code: '1103',
      account_name: 'العملاء / المدينون',
      debit: 0,
      credit: roundAmt,
      description: `تسوية حساب سند قبض #${vNum}`,
      party_id: params.partyId,
      party_type: 'CUSTOMER',
    });

    // Decrease Customer Balance
    if (params.partyId) {
      const cust = mockCustomersList.find((c) => c.id === params.partyId);
      if (cust) {
        cust.current_balance = roundMoney(Math.max(0, (cust.current_balance || 0) - roundAmt));
        cust.balance = cust.current_balance;
      }
    }
  } else {
    // Dr Accounts Payable (2101), Cr Cash/Bank
    lines.push({
      account_code: '2101',
      account_name: 'الموردون / الدائنون',
      debit: roundAmt,
      credit: 0,
      description: `سداد حساب سند صرف #${vNum} للمورد ${params.partyName || ''}`,
      party_id: params.partyId,
      party_type: 'SUPPLIER',
    });
    lines.push({
      account_code: cashOrBankCode,
      account_name: cashOrBankName,
      debit: 0,
      credit: roundAmt,
      description: params.description || `سند صرف رقم #${vNum}`,
    });

    // Decrease Supplier Balance
    if (params.partyId) {
      const supp = mockSuppliersList.find((s) => s.id === params.partyId);
      if (supp) {
        supp.current_balance = roundMoney(Math.max(0, (supp.current_balance || 0) - roundAmt));
        supp.balance = supp.current_balance;
      }
    }
  }

  const journal = postDoubleEntryJournal({
    companyId: cid,
    reference_type: type === 'RECEIPT' ? 'RECEIPT_VOUCHER' : 'PAYMENT_VOUCHER',
    reference_id: vNum,
    description: params.description || `سند ${type === 'RECEIPT' ? 'قبض' : 'صرف'} رقم #${vNum}`,
    date: dateStr,
    lines,
    created_by: params.created_by,
  });

  const newPmt = {
    id: `PMT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    company_id: cid,
    voucher_number: vNum,
    amount: roundAmt,
    type: type === 'RECEIPT' ? 'CUSTOMER_PAYMENT' : 'SUPPLIER_PAYMENT',
    voucher_type: type,
    payment_type: type === 'RECEIPT' ? 'IN' : 'OUT',
    customer_id: params.partyType === 'CUSTOMER' ? params.partyId : undefined,
    customer_name: params.partyType === 'CUSTOMER' ? params.partyName : undefined,
    supplier_id: params.partyType === 'SUPPLIER' ? params.partyId : undefined,
    supplier_name: params.partyType === 'SUPPLIER' ? params.partyName : undefined,
    party_id: params.partyId,
    party_name: params.partyName,
    payment_method: params.paymentMethod || 'CASH',
    date: dateStr,
    payment_date: dateStr,
    description: params.description || `سند ${type === 'RECEIPT' ? 'قبض' : 'صرف'} #${vNum}`,
    status: 'CONFIRMED',
    created_at: new Date().toISOString(),
  };
  mockPaymentsList.unshift(newPmt as any);

  persistAllToDisk();
  return { voucherNumber: vNum, amount: roundAmt, journal, payment: newPmt, data: newPmt };
}

// ============================================================================
// 10. Atomic Expense Posting Routine
// ============================================================================

export interface ExpenseParams {
  companyId: string;
  category?: string;
  description: string;
  amount: number;
  paymentMethod?: string;
  beneficiary?: string;
  date?: string;
  voucherNumber?: string;
  created_by?: string;
  costCenter?: string;
  cost_center?: string;
  treasury?: string;
  currency?: string;
  referenceNumber?: string;
  reference_number?: string;
  referenceNo?: string;
  notes?: string;
}

export function postExpenseAtomic(params: ExpenseParams) {
  const { companyId, description, amount } = params;
  const cid = companyId || getCurrentTenantId() || 'comp_001';
  const roundAmt = roundMoney(amount);
  if (roundAmt <= 0) {
    const err: any = new Error('مبلغ المصروف يجب أن يكون أكبر من الصفر');
    err.status = 400;
    throw err;
  }

  const isPayroll = String(params.category || '').includes('رواتب') || String(params.category || '').toLowerCase().includes('salary');
  const expenseCode = isPayroll ? '5201' : '5202';
  const expenseName = isPayroll ? 'مصروفات الرواتب والأجور' : 'المصروفات العمومية والإدارية';

  const payMethodStr = String(params.paymentMethod || '').toUpperCase();
  const treasuryStr = String(params.treasury || '').toUpperCase();
  const isBankOrWallet =
    payMethodStr.includes('BANK') ||
    payMethodStr.includes('WALLET') ||
    payMethodStr.includes('بنك') ||
    payMethodStr.includes('مصرف') ||
    payMethodStr.includes('تحويل') ||
    payMethodStr.includes('محفظة') ||
    treasuryStr.includes('BANK') ||
    treasuryStr.includes('WALLET') ||
    treasuryStr.includes('بنك') ||
    treasuryStr.includes('مصرف') ||
    treasuryStr.includes('تحويل') ||
    treasuryStr.includes('محفظة') ||
    String(params.paymentMethod || '').includes('بنك') ||
    String(params.paymentMethod || '').includes('مصرف') ||
    String(params.paymentMethod || '').includes('تحويل') ||
    String(params.paymentMethod || '').includes('محفظة') ||
    String(params.treasury || '').includes('بنك') ||
    String(params.treasury || '').includes('مصرف') ||
    String(params.treasury || '').includes('تحويل') ||
    String(params.treasury || '').includes('محفظة');

  const cashOrBankCode = isBankOrWallet ? '1102' : '1101';
  const cashOrBankName = isBankOrWallet ? 'البنك / الحسابات البنكية والمحافظ' : 'الصندوق / النقدية';

  const vNum = params.voucherNumber || `EXP-${Date.now().toString().slice(-6)}`;
  const dateStr = (params.date || new Date().toISOString()).split('T')[0];

  const lines: JournalLine[] = [
    {
      account_code: expenseCode,
      account_name: expenseName,
      debit: roundAmt,
      credit: 0,
      description: `${description} (${params.beneficiary || 'المستفيد'})`,
    },
    {
      account_code: cashOrBankCode,
      account_name: cashOrBankName,
      debit: 0,
      credit: roundAmt,
      description: `صرف لمصروف: ${description}`,
    },
  ];

  const journal = postDoubleEntryJournal({
    companyId: cid,
    reference_type: 'EXPENSE_VOUCHER',
    reference_id: vNum,
    description: `إثبات مصروف: ${description}`,
    date: dateStr,
    lines,
    created_by: params.created_by,
  });

  const costCenter = params.costCenter || params.cost_center || 'المحل / المعرض الرئيسي';
  const treasury = params.treasury || (isBankOrWallet ? 'الحساب البنكي - بنك التضامن' : 'الصندوق النقدي الرئيسي');
  const currency = params.currency || 'YER';
  const referenceNumber = params.referenceNumber || params.reference_number || params.referenceNo || '';
  const notes = params.notes || '';

  const newExp = {
    id: `EXP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    company_id: cid,
    expense_number: vNum,
    voucher_number: vNum,
    voucherNumber: vNum,
    category: params.category || 'مصروفات إدارية وعمومية',
    costCenter,
    cost_center: costCenter,
    beneficiary: params.beneficiary || '',
    amount: roundAmt,
    currency,
    payment_method: params.paymentMethod || (isBankOrWallet ? 'تحويل بنكي / محفظة' : 'نقداً'),
    paymentMethod: params.paymentMethod || (isBankOrWallet ? 'تحويل بنكي / محفظة' : 'نقداً'),
    treasury,
    referenceNumber,
    reference_number: referenceNumber,
    description,
    notes,
    date: dateStr,
    status: 'PAID',
    created_at: new Date().toISOString(),
  };
  mockExpensesList.unshift(newExp as any);

  // Push corresponding PAYMENT voucher into mockPaymentsList
  const newPmt = {
    id: `PMT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    company_id: cid,
    payment_number: vNum,
    voucher_number: vNum,
    voucherNumber: vNum,
    amount: roundAmt,
    type: 'EXPENSE_PAYMENT',
    voucher_type: 'PAYMENT',
    payment_type: 'OUT',
    party_type: 'OTHER',
    party_id: newExp.id,
    party_name: params.beneficiary || newExp.category,
    beneficiary: params.beneficiary || '',
    payment_method: isBankOrWallet ? 'BANK' : 'CASH',
    paymentMethod: isBankOrWallet ? 'BANK' : 'CASH',
    treasury,
    costCenter,
    cost_center: costCenter,
    currency,
    reference_id: vNum,
    reference_type: 'EXPENSE',
    reference_number: referenceNumber || vNum,
    referenceNumber: referenceNumber || vNum,
    date: dateStr,
    payment_date: dateStr,
    description: `سند صرف لمصروف: ${description}${params.beneficiary ? ` (${params.beneficiary})` : ''}`,
    notes,
    status: 'CONFIRMED',
    created_at: new Date().toISOString(),
  };
  mockPaymentsList.unshift(newPmt as any);

  persistAllToDisk();
  return { voucherNumber: vNum, amount: roundAmt, journal, expense: newExp, payment: newPmt, data: newExp };
}

// ============================================================================
// 11. Atomic Payroll Run Posting Routine
// ============================================================================

export interface PayrollParams {
  companyId: string;
  month: string;
  year?: number;
  totalGross: number;
  totalDeductions?: number;
  totalNet: number;
  paymentMethod?: 'CASH' | 'BANK' | 'ACCRUED';
  date?: string;
  created_by?: string;
}

export function postPayrollRunAtomic(params: PayrollParams) {
  const { companyId, month, totalNet } = params;
  const cid = companyId || getCurrentTenantId() || 'comp_001';
  const roundNet = roundMoney(totalNet);
  if (roundNet <= 0) {
    const err: any = new Error('إجمالي مسير الرواتب يجب أن يكون أكبر من الصفر');
    err.status = 400;
    throw err;
  }

  const vNum = `PAYROLL-${month}-${Date.now().toString().slice(-4)}`;
  const dateStr = (params.date || new Date().toISOString()).split('T')[0];

  const lines: JournalLine[] = [
    {
      account_code: '5201',
      account_name: 'مصروفات الرواتب والأجور',
      debit: roundNet,
      credit: 0,
      description: `إثبات مسير رواتب شهر ${month}`,
    },
  ];

  if (params.paymentMethod === 'ACCRUED') {
    lines.push({
      account_code: '2103',
      account_name: 'مستحقات الرواتب والأجور',
      debit: 0,
      credit: roundNet,
      description: `استحقاق مسير رواتب شهر ${month}`,
    });
  } else {
    const isBank = params.paymentMethod === 'BANK';
    lines.push({
      account_code: isBank ? '1102' : '1101',
      account_name: isBank ? 'البنك / الحسابات البنكية' : 'الصندوق / النقدية',
      debit: 0,
      credit: roundNet,
      description: `صرف رواتب شهر ${month}`,
    });
  }

  const journal = postDoubleEntryJournal({
    companyId: cid,
    reference_type: 'PAYROLL_RUN',
    reference_id: vNum,
    description: `مسير رواتب موظفي المنشأة شهر ${month}`,
    date: dateStr,
    lines,
    created_by: params.created_by,
  });

  persistAllToDisk();
  return { payrollNumber: vNum, amount: roundNet, journal };
}

// ============================================================================
// 12. Single-Source-of-Truth Unified Financial Metrics Engine
// ============================================================================

export function computeUnifiedFinancialMetrics(
  companyId: string,
  startDate?: string,
  endDate?: string,
  customJournalEntries?: JournalEntry[],
  customAccounts?: AccountRecord[]
) {
  const cid = companyId || getCurrentTenantId() || 'comp_001';
  const isClean = isTenantCleanProductionMode(cid);

  const accounts = customAccounts || getTenantAccounts(cid);
  const journalEntries = customJournalEntries || getTenantJournalEntries(cid);

  const accMap = new Map<string, AccountRecord>(accounts.map((a) => [a.code, a]));

  // Live Inventory Valuation: sum(prod.current_stock * prod.cost_price)
  const physicalInventoryValuation = roundMoney(
    mockProducts.reduce(
      (sum, p: any) => sum + (Math.max(0, Number(p.current_stock ?? p.qty ?? p.stock ?? 0)) * Math.max(0, Number(p.cost_price ?? p.purchase_price ?? 0))),
      0
    )
  );

  // Live Receivables and Payables from Customers and Suppliers
  const physicalReceivables = roundMoney(
    mockCustomersList.reduce((sum, c: any) => sum + Math.max(0, Number(c.balance ?? c.current_balance ?? 0)), 0)
  );
  const physicalPayables = roundMoney(
    mockSuppliersList.reduce((sum, s: any) => sum + Math.max(0, Number(s.balance ?? s.current_balance ?? 0)), 0)
  );

  // Accounts Balances
  const cashBalance = roundMoney(accMap.get('1101')?.balance || 0);
  const bankBalance = roundMoney(accMap.get('1102')?.balance || 0);
  const totalCashAndBank = roundMoney(cashBalance + bankBalance);

  const arBalance = roundMoney(accMap.get('1103')?.balance || physicalReceivables);
  const inventoryBalance = roundMoney(accMap.get('1104')?.balance || physicalInventoryValuation);
  const inputVatBalance = roundMoney(accMap.get('1105')?.balance || 0);

  const apBalance = roundMoney(accMap.get('2101')?.balance || physicalPayables);
  const outputVatBalance = roundMoney(accMap.get('2102')?.balance || 0);
  const payrollPayableBalance = roundMoney(accMap.get('2103')?.balance || 0);

  const rawSalesRevenue = roundMoney(accMap.get('4101')?.balance || 0);
  const salesReturns = roundMoney(accMap.get('4102')?.balance || 0);

  // Net Revenue = 4101 - 4102 (or fallback to mockInvoicesList sum if no journal entries yet)
  let netRevenue = roundMoney(rawSalesRevenue - salesReturns);
  if (netRevenue <= 0 && mockInvoicesList.length > 0 && !isClean) {
    netRevenue = roundMoney(mockInvoicesList.reduce((sum, inv: any) => sum + Number(inv.total || inv.amount || 0), 0));
  }

  // Cost of Goods Sold = 5101 balance
  let cogs = roundMoney(accMap.get('5101')?.balance || 0);
  if (cogs <= 0 && mockInvoicesList.length > 0) {
    let computedItemCogs = 0;
    for (const inv of mockInvoicesList) {
      const items: any[] = (inv as any).items || (inv as any).cartData || (inv as any).invoice_items || [];
      for (const it of items) {
        const prod = mockProducts.find((p) => String(p.id) === String(it.productId || it.product_id || it.id));
        const cost = Number(it.cost_price ?? it.cost ?? it.unit_cost ?? prod?.cost_price ?? prod?.purchase_price ?? 0);
        const qty = Number(it.quantity ?? it.qty ?? 1);
        computedItemCogs += cost * qty;
      }
    }
    cogs = roundMoney(computedItemCogs);
  }

  const grossProfit = roundMoney(Math.max(0, netRevenue - cogs));

  // Operating Expenses = 5201 + 5202 + mockExpenses
  let salariesExpense = roundMoney(accMap.get('5201')?.balance || 0);
  let adminExpense = roundMoney(accMap.get('5202')?.balance || 0);
  let totalExpenses = roundMoney(salariesExpense + adminExpense);

  if (totalExpenses <= 0 && mockExpensesList.length > 0) {
    totalExpenses = roundMoney(mockExpensesList.reduce((sum, exp: any) => sum + Number(exp.amount || 0), 0));
  }

  const netProfit = roundMoney(grossProfit - totalExpenses);
  const marginPercentage = netRevenue > 0 ? roundMoney((netProfit / netRevenue) * 100) : 0;
  const netVatPayable = roundMoney(Math.max(0, outputVatBalance - inputVatBalance));

  // Strict Balanced Trial Balance Generator
  // Every active account is listed with its actual debit and credit components
  const trialBalanceAccounts: Array<{
    code: string;
    name: string;
    name_ar: string;
    type: string;
    debit: number;
    credit: number;
    balance: number;
  }> = [];

  // Sum lines from all journal entries
  const accountTotals = new Map<string, { debit: number; credit: number }>();
  for (const je of journalEntries) {
    for (const line of je.lines) {
      const code = line.account_code;
      const cur = accountTotals.get(code) || { debit: 0, credit: 0 };
      cur.debit = roundMoney(cur.debit + (line.debit || 0));
      cur.credit = roundMoney(cur.credit + (line.credit || 0));
      accountTotals.set(code, cur);
    }
  }

  let tbTotalDebit = 0;
  let tbTotalCredit = 0;

  for (const acc of accounts) {
    const totals = accountTotals.get(acc.code);
    let d = totals ? totals.debit : 0;
    let c = totals ? totals.credit : 0;

    // If no direct journal entries yet, use current account balance
    if (d === 0 && c === 0 && acc.balance !== 0) {
      if (acc.nature === 'DEBIT') {
        d = acc.balance;
      } else {
        c = acc.balance;
      }
    }

    if (d > 0 || c > 0 || !isClean) {
      trialBalanceAccounts.push({
        code: acc.code,
        name: acc.name,
        name_ar: acc.name_ar,
        type: acc.type,
        debit: d,
        credit: c,
        balance: acc.balance,
      });
      tbTotalDebit = roundMoney(tbTotalDebit + d);
      tbTotalCredit = roundMoney(tbTotalCredit + c);
    }
  }

  // Ensure mathematical balance: tbTotalDebit === tbTotalCredit
  const tbDiff = roundMoney(Math.abs(tbTotalDebit - tbTotalCredit));
  const isBalanced = tbDiff <= 0.01;

  if (isClean && mockInvoicesList.length === 0 && mockProducts.length === 0) {
    return {
      revenue: 0,
      salesRevenue: 0,
      discounts: 0,
      netRevenue: 0,
      cogs: 0,
      grossProfit: 0,
      operatingExpenses: 0,
      netProfit: 0,
      netIncome: 0,
      marginPercentage: 0,
      cashBalance: 0,
      bankBalance: 0,
      totalCashAndBank: 0,
      inventoryValuation: 0,
      accountsReceivable: 0,
      accountsPayable: 0,
      vatPayable: 0,
      trialBalance: {
        accounts: [],
        totalDebit: 0,
        totalCredit: 0,
        isBalanced: true,
        difference: 0,
      },
    };
  }

  return {
    revenue: netRevenue,
    salesRevenue: rawSalesRevenue || netRevenue,
    discounts: salesReturns,
    netRevenue,
    cogs,
    grossProfit,
    operatingExpenses: totalExpenses,
    netProfit,
    netIncome: netProfit,
    marginPercentage,
    cashBalance,
    bankBalance,
    totalCashAndBank,
    inventoryValuation: inventoryBalance,
    accountsReceivable: arBalance,
    accountsPayable: apBalance,
    vatPayable: netVatPayable,
    trialBalance: {
      accounts: trialBalanceAccounts,
      totalDebit: tbTotalDebit,
      totalCredit: tbTotalCredit,
      isBalanced,
      difference: tbDiff,
    },
  };
}

// ============================================================================
// 14. Atomic Reversal on Delete/Cancel of Transactions (BUG-04)
// ============================================================================

/**
 * Atomically cancels or deletes a sales invoice, reversing:
 * 1. Product stock deductions (increments stock back and records 'IN' movement)
 * 2. Customer credit balance (deducts remaining credit from current_balance)
 * 3. Linked automatic invoice receipt/payment in mockPaymentsList
 * 4. General ledger double-entry journals (Sales Revenue, VAT, Cash/Receivables, COGS, Inventory Asset)
 */
export function reverseSalesInvoiceAtomic(
  companyId: string,
  invoiceIdOrNumber: string,
  isPermanentDelete = false
) {
  const cid = companyId || getCurrentTenantId() || 'comp_001';
  const targetId = String(invoiceIdOrNumber || '').trim();

  const idx = mockInvoicesList.findIndex(
    (inv) =>
      (inv.id === targetId || inv.invoice_number === targetId || (inv as any).invoiceNumber === targetId) &&
      (inv.company_id === cid || !inv.company_id || cid === 'comp_001')
  );

  if (idx === -1) {
    const err: any = new Error('فاتورة المبيعات غير موجودة');
    err.status = 404;
    throw err;
  }

  const invoice = mockInvoicesList[idx];

  if (invoice.status === 'CANCELLED') {
    const err: any = new Error('فاتورة المبيعات ملغاة مسبقاً');
    err.status = 400;
    throw err;
  }

  const invNo = invoice.invoice_number || (invoice as any).invoiceNumber || invoice.id;
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Restore Inventory Stock & Record 'IN' Movements
  const items = invoice.items || [];
  let totalCogsToReverse = 0;

  for (const it of items) {
    const prodId = it.product_id || (it as any).productId || it.id;
    const prod = mockProducts.find(
      (p) => p.id === prodId || (p.sku && p.sku === it.sku) || (p.barcode && p.barcode === it.barcode)
    );

    const qty = Math.max(0, Number(it.quantity ?? (it as any).qty ?? 0));
    const unitFactor = Number(it.unitFactor || 1);
    const baseQty = qty * unitFactor;

    const unitCost = Number(it.cost_price ?? (it as any).costPrice ?? (prod ? (prod.cost_price ?? prod.purchase_price ?? 0) : 0));
    totalCogsToReverse = roundMoney(totalCogsToReverse + (baseQty * unitCost));

    if (prod && baseQty > 0) {
      const currentStock = Number(prod.current_stock ?? prod.qty ?? prod.stock ?? 0);
      const restoredStock = currentStock + baseQty;
      prod.current_stock = restoredStock;
      prod.qty = restoredStock;
      prod.stock = restoredStock;

      mockInventoryMovements.unshift({
        id: `mov-rev-sale-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        company_id: cid,
        product_id: prod.id,
        product_name: prod.name,
        type: 'IN',
        quantity: baseQty,
        remaining_stock: restoredStock,
        reference_type: 'SALES_CANCEL',
        reference_id: invNo,
        notes: `إرجاع مخزني لإلغاء/حذف فاتورة مبيعات #${invNo}`,
        date: todayStr,
      });
    }
  }

  // 2. Customer Debt Reversal (if invoice had unpaid/remaining credit balance)
  const remainingDebt = roundMoney(
    invoice.remaining_amount !== undefined
      ? invoice.remaining_amount
      : (invoice as any).remainingAmount !== undefined
      ? (invoice as any).remainingAmount
      : Math.max(0, (Number(invoice.total || 0) - Number(invoice.paid_amount || (invoice as any).paidAmount || 0)))
  );

  if (remainingDebt > 0) {
    const custId = invoice.customer_id || (invoice as any).customerId;
    const custName = invoice.customer_name || (invoice as any).customerName;
    const cust = mockCustomersList.find(
      (c) => (custId && c.id === custId) || (custName && c.name.toLowerCase() === String(custName).toLowerCase())
    );
    if (cust) {
      cust.current_balance = roundMoney(Math.max(0, (cust.current_balance || 0) - remainingDebt));
      cust.balance = cust.current_balance;
    }
  }

  // 3. Cancel Linked Automatic Payment Vouchers in mockPaymentsList
  for (const pmt of mockPaymentsList) {
    const pRef = String(pmt.reference_no || (pmt as any).referenceNo || pmt.reference_id || (pmt as any).referenceId || '').trim();
    if (pRef === invNo || (pmt as any).invoice_id === invoice.id || pRef === invoice.id) {
      pmt.status = 'CANCELLED';
    }
  }

  // 4. Reverse Accounting Journal Entries
  const totalVal = roundMoney(invoice.total || 0);
  const taxVal = roundMoney(invoice.tax_amount || (invoice as any).taxAmount || invoice.tax || 0);
  const discountVal = roundMoney(invoice.discount_amount || (invoice as any).discountAmount || invoice.discount || 0);
  const paidVal = roundMoney(invoice.paid_amount || (invoice as any).paidAmount || (invoice.payment_method === 'CASH' || invoice.payment_method === 'BANK' ? totalVal : 0));
  const creditVal = roundMoney(Math.max(0, totalVal - paidVal));
  const subtotalVal = roundMoney(totalVal - taxVal + discountVal);

  const isBank = invoice.payment_method === 'BANK' || invoice.payment_method === 'CARD' || invoice.payment_method === 'TRANSFER';
  const cashOrBankCode = isBank ? '1102' : '1101';
  const cashOrBankName = isBank ? 'البنك / الحسابات البنكية' : 'الصندوق / النقدية';

  const revSalesLines: JournalLine[] = [];
  if (subtotalVal > 0) {
    revSalesLines.push({
      account_code: '4101',
      account_name: 'إيرادات المبيعات',
      debit: subtotalVal,
      credit: 0,
      description: `إلغاء إيراد فاتورة مبيعات #${invNo}`,
    });
  }
  if (taxVal > 0) {
    revSalesLines.push({
      account_code: '2102',
      account_name: 'ضريبة القيمة المضافة - مخرجات',
      debit: taxVal,
      credit: 0,
      description: `عكس ضريبة مخرجات فاتورة مبيعات #${invNo}`,
    });
  }
  if (discountVal > 0) {
    revSalesLines.push({
      account_code: '4102',
      account_name: 'خصم مسموح به',
      debit: 0,
      credit: discountVal,
      description: `عكس خصم فاتورة مبيعات #${invNo}`,
    });
  }
  if (paidVal > 0) {
    revSalesLines.push({
      account_code: cashOrBankCode,
      account_name: cashOrBankName,
      debit: 0,
      credit: paidVal,
      description: `استرداد نقدي لإلغاء فاتورة مبيعات #${invNo}`,
    });
  }
  if (creditVal > 0) {
    revSalesLines.push({
      account_code: '1103',
      account_name: 'العملاء / المدينون',
      debit: 0,
      credit: creditVal,
      description: `إلغاء مديونية عميل فاتورة #${invNo}`,
      party_id: invoice.customer_id,
      party_type: 'CUSTOMER',
    });
  }

  if (revSalesLines.length > 0) {
    postDoubleEntryJournal({
      companyId: cid,
      reference_type: 'SALES_CANCEL',
      reference_id: invNo,
      description: `قيد عكسي لإلغاء فاتورة مبيعات #${invNo}`,
      date: todayStr,
      lines: revSalesLines,
      created_by: 'النظام المحاسبي (إلغاء عكسي)',
    });
  }

  if (totalCogsToReverse > 0) {
    postDoubleEntryJournal({
      companyId: cid,
      reference_type: 'COGS_REVERSAL',
      reference_id: invNo,
      description: `قيد عكسي لتكلفة البضاعة المباعة (COGS) فاتورة #${invNo}`,
      date: todayStr,
      lines: [
        {
          account_code: '1104',
          account_name: 'المخزون السلعي',
          debit: totalCogsToReverse,
          credit: 0,
          description: `إرجاع المخزون السلعي تكلفة فاتورة #${invNo}`,
        },
        {
          account_code: '5101',
          account_name: 'تكلفة البضاعة المباعة',
          debit: 0,
          credit: totalCogsToReverse,
          description: `عكس تكلفة البضاعة المباعة فاتورة #${invNo}`,
        },
      ],
      created_by: 'نظام الجرد المستمر (عكس COGS)',
    });
  }

  // 5. Update Status or Delete
  invoice.status = 'CANCELLED';
  if (isPermanentDelete) {
    mockInvoicesList.splice(idx, 1);
  }

  persistAllToDisk();

  return {
    success: true,
    invoice,
    message: isPermanentDelete ? 'تم حذف فاتورة المبيعات وتسوية القيود والمخزون بنجاح' : 'تم إلغاء فاتورة المبيعات وتسوية القيود والمخزون بنجاح',
  };
}

/**
 * Atomically cancels or deletes a purchase invoice, reversing:
 * 1. Product stock additions (deducts stock and records 'OUT' movement)
 * 2. Supplier balance (reduces payable balance by remaining_amount)
 * 3. Linked payment vouchers in mockPaymentsList
 * 4. General ledger double-entry journals (Merchandise Inventory, Input VAT, Cash/Payables)
 */
export function reversePurchaseInvoiceAtomic(
  companyId: string,
  purchaseIdOrNumber: string,
  isPermanentDelete = false
) {
  const cid = companyId || getCurrentTenantId() || 'comp_001';
  const targetId = String(purchaseIdOrNumber || '').trim();

  const idx = mockPurchaseInvoicesList.findIndex(
    (p) =>
      (p.id === targetId || p.invoice_number === targetId || (p as any).invoiceNumber === targetId) &&
      (p.company_id === cid || !p.company_id || cid === 'comp_001')
  );

  if (idx === -1) {
    const err: any = new Error('فاتورة المشتريات غير موجودة');
    err.status = 404;
    throw err;
  }

  const purchase = mockPurchaseInvoicesList[idx];

  if (purchase.status === 'CANCELLED') {
    const err: any = new Error('فاتورة المشتريات ملغاة مسبقاً');
    err.status = 400;
    throw err;
  }

  const invNo = purchase.invoice_number || (purchase as any).invoiceNumber || purchase.id;
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Deduct Product Stock & Record 'OUT' Movements
  const items = purchase.items || [];
  for (const it of items) {
    const prodId = it.product_id || (it as any).productId || it.id;
    const prod = mockProducts.find(
      (p) => p.id === prodId || (p.sku && p.sku === it.sku) || (p.barcode && p.barcode === it.barcode)
    );

    const paidQty = Math.max(0, Number(it.quantity || 0));
    const freeQty = Math.max(0, Number(it.freeQuantity || 0));
    const totalIncomingUnits = paidQty + freeQty;
    const unitFactor = Number(it.unitFactor || 1);
    const baseQty = totalIncomingUnits * unitFactor;

    if (prod && baseQty > 0) {
      const currentStock = Number(prod.current_stock ?? prod.qty ?? prod.stock ?? 0);
      const newStock = Math.max(0, currentStock - baseQty);
      prod.current_stock = newStock;
      prod.qty = newStock;
      prod.stock = newStock;

      mockInventoryMovements.unshift({
        id: `mov-rev-pur-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        company_id: cid,
        product_id: prod.id,
        product_name: prod.name,
        type: 'OUT',
        quantity: baseQty,
        remaining_stock: newStock,
        reference_type: 'PURCHASE_CANCEL',
        reference_id: invNo,
        notes: `صرف مخزني لإلغاء/حذف فاتورة مشتريات #${invNo}`,
        date: todayStr,
      });
    }
  }

  // 2. Reduce Supplier Payable Balance for unpaid portion
  const totalVal = roundMoney(purchase.total ?? (purchase as any).grandTotal ?? 0);
  const paidVal = roundMoney(
    purchase.paid_amount !== undefined
      ? purchase.paid_amount
      : (purchase as any).paidAmount !== undefined
      ? (purchase as any).paidAmount
      : (purchase.payment_method === 'CASH' || purchase.payment_method === 'BANK' ? totalVal : 0)
  );
  const unpaidVal = roundMoney(Math.max(0, totalVal - paidVal));

  if (unpaidVal > 0) {
    const suppId = purchase.supplier_id || (purchase as any).supplierId;
    const suppName = purchase.supplier_name || (purchase as any).supplierName;
    const supp = mockSuppliersList.find(
      (s) => (suppId && s.id === suppId) || (suppName && s.name.toLowerCase() === String(suppName).toLowerCase())
    );
    if (supp) {
      supp.current_balance = roundMoney(Math.max(0, (supp.current_balance || 0) - unpaidVal));
      supp.balance = supp.current_balance;
    }
  }

  // 3. Cancel Linked Payment Vouchers in mockPaymentsList
  for (const pmt of mockPaymentsList) {
    const pRef = String(pmt.reference_no || (pmt as any).referenceNo || pmt.reference_id || (pmt as any).referenceId || '').trim();
    if (pRef === invNo || (pmt as any).purchase_invoice_id === purchase.id || pRef === purchase.id) {
      pmt.status = 'CANCELLED';
    }
  }

  // 4. Reverse Purchase Accounting Journal Entry
  const taxVal = roundMoney(purchase.tax ?? (purchase as any).taxAmount ?? 0);
  const netInventoryVal = roundMoney(Math.max(0, totalVal - taxVal));
  const isBank = ['BANK', 'CARD', 'TRANSFER'].includes(String(purchase.payment_method || '').toUpperCase());
  const cashOrBankCode = isBank ? '1102' : '1101';
  const cashOrBankName = isBank ? 'البنك / الحسابات البنكية' : 'الصندوق / النقدية';

  const revPurLines: JournalLine[] = [];
  if (paidVal > 0) {
    revPurLines.push({
      account_code: cashOrBankCode,
      account_name: cashOrBankName,
      debit: paidVal,
      credit: 0,
      description: `استرجاع نقدي لإلغاء فاتورة مشتريات #${invNo}`,
    });
  }
  if (unpaidVal > 0) {
    revPurLines.push({
      account_code: '2101',
      account_name: 'الموردون / الدائنون',
      debit: unpaidVal,
      credit: 0,
      description: `إلغاء استحقاق مورد فاتورة مشتريات #${invNo}`,
      party_id: purchase.supplier_id,
      party_type: 'SUPPLIER',
    });
  }
  if (netInventoryVal > 0) {
    revPurLines.push({
      account_code: '1104',
      account_name: 'المخزون السلعي',
      debit: 0,
      credit: netInventoryVal,
      description: `عكس توريد بضاعة مخزنية فاتورة مشتريات #${invNo}`,
    });
  }
  if (taxVal > 0) {
    revPurLines.push({
      account_code: '1105',
      account_name: 'ضريبة القيمة المضافة - مدخلات',
      debit: 0,
      credit: taxVal,
      description: `عكس ضريبة مدخلات فاتورة مشتريات #${invNo}`,
    });
  }

  if (revPurLines.length > 0) {
    postDoubleEntryJournal({
      companyId: cid,
      reference_type: 'PURCHASE_CANCEL',
      reference_id: invNo,
      description: `قيد عكسي لإلغاء فاتورة مشتريات #${invNo}`,
      date: todayStr,
      lines: revPurLines,
      created_by: 'النظام المحاسبي (إلغاء مشتريات)',
    });
  }

  // 5. Update Status or Delete
  purchase.status = 'CANCELLED';
  if (isPermanentDelete) {
    mockPurchaseInvoicesList.splice(idx, 1);
  }

  persistAllToDisk();

  return {
    success: true,
    purchaseInvoice: purchase,
    message: isPermanentDelete ? 'تم حذف فاتورة المشتريات وتسوية القيود والمخزون بنجاح' : 'تم إلغاء فاتورة المبيعات وتسوية القيود والمخزون بنجاح',
  };
}

/**
 * Atomically cancels or deletes a treasury voucher (Receipt or Payment), reversing:
 * 1. Customer or supplier balance
 * 2. General ledger double-entry journals (1101/1102 and 1103/2101)
 */
export function reverseVoucherAtomic(
  companyId: string,
  paymentIdOrNumber: string,
  isPermanentDelete = false
) {
  const cid = companyId || getCurrentTenantId() || 'comp_001';
  const targetId = String(paymentIdOrNumber || '').trim();

  const idx = mockPaymentsList.findIndex(
    (p) =>
      (p.id === targetId ||
        p.voucher_number === targetId ||
        (p as any).voucherNumber === targetId ||
        (p as any).payment_number === targetId ||
        (p as any).paymentNumber === targetId) &&
      (p.company_id === cid || !p.company_id || cid === 'comp_001')
  );

  if (idx === -1) {
    const err: any = new Error('سند القبض/الصرف غير موجود');
    err.status = 404;
    throw err;
  }

  const pmt = mockPaymentsList[idx];

  if (pmt.status === 'CANCELLED') {
    const err: any = new Error('السند ملغى مسبقاً');
    err.status = 400;
    throw err;
  }

  const vNum = pmt.voucher_number || (pmt as any).payment_number || pmt.id;
  const roundAmt = roundMoney(pmt.amount || 0);
  const todayStr = new Date().toISOString().split('T')[0];
  const isBank = (pmt as any).payment_method === 'BANK';
  const cashOrBankCode = isBank ? '1102' : '1101';
  const cashOrBankName = isBank ? 'البنك / الحسابات البنكية' : 'الصندوق / النقدية';

  const isReceipt = pmt.type === 'CUSTOMER_PAYMENT' || (pmt as any).voucher_type === 'RECEIPT' || (pmt as any).payment_type === 'IN';
  const lines: JournalLine[] = [];

  if (isReceipt) {
    // When Receipt was created: Dr Cash/Bank, Cr AR 1103 & reduced customer debt
    // On Cancel/Delete: Restore customer debt, Dr AR 1103, Cr Cash/Bank
    const custId = pmt.customer_id || (pmt as any).party_id;
    const cust = mockCustomersList.find((c) => c.id === custId);
    if (cust) {
      cust.current_balance = roundMoney((cust.current_balance || 0) + roundAmt);
      cust.balance = cust.current_balance;
    }

    lines.push({
      account_code: '1103',
      account_name: 'العملاء / المدينون',
      debit: roundAmt,
      credit: 0,
      description: `إعادة مديونية عميل لإلغاء سند قبض #${vNum}`,
      party_id: custId,
      party_type: 'CUSTOMER',
    });
    lines.push({
      account_code: cashOrBankCode,
      account_name: cashOrBankName,
      debit: 0,
      credit: roundAmt,
      description: `صرف نقدي لإلغاء سند قبض #${vNum}`,
    });
  } else {
    // When Payment was created: Dr AP 2101, Cr Cash/Bank & reduced supplier debt
    // On Cancel/Delete: Restore supplier debt, Dr Cash/Bank, Cr AP 2101
    const suppId = (pmt as any).supplier_id || (pmt as any).party_id;
    const supp = mockSuppliersList.find((s) => s.id === suppId);
    if (supp) {
      supp.current_balance = roundMoney((supp.current_balance || 0) + roundAmt);
      supp.balance = supp.current_balance;
    }

    lines.push({
      account_code: cashOrBankCode,
      account_name: cashOrBankName,
      debit: roundAmt,
      credit: 0,
      description: `استرجاع نقدي لإلغاء سند صرف #${vNum}`,
    });
    lines.push({
      account_code: '2101',
      account_name: 'الموردون / الدائنون',
      debit: 0,
      credit: roundAmt,
      description: `إعادة استحقاق مورد لإلغاء سند صرف #${vNum}`,
      party_id: suppId,
      party_type: 'SUPPLIER',
    });
  }

  if (lines.length > 0 && roundAmt > 0) {
    postDoubleEntryJournal({
      companyId: cid,
      reference_type: isReceipt ? 'RECEIPT_CANCEL' : 'PAYMENT_CANCEL',
      reference_id: vNum,
      description: `قيد عكسي لإلغاء سند ${isReceipt ? 'القبض' : 'الصرف'} #${vNum}`,
      date: todayStr,
      lines,
      created_by: 'النظام المحاسبي (إلغاء سند)',
    });
  }

  pmt.status = 'CANCELLED';
  if (isPermanentDelete) {
    mockPaymentsList.splice(idx, 1);
  }

  persistAllToDisk();

  return {
    success: true,
    payment: pmt,
    message: isPermanentDelete ? 'تم حذف السند وإلغاء أثره المالي بنجاح' : 'تم إلغاء السند وإلغاء أثره المالي بنجاح',
  };
}

/**
 * Atomically cancels or deletes an expense voucher, reversing:
 * 1. Treasury / Bank cash balances (Dr Cash/Bank, Cr Expense)
 * 2. General ledger double-entry journals
 */
export function reverseExpenseAtomic(
  companyId: string,
  expenseIdOrNumber: string,
  isPermanentDelete = false
) {
  const cid = companyId || getCurrentTenantId() || 'comp_001';
  const targetId = String(expenseIdOrNumber || '').trim();

  const idx = mockExpensesList.findIndex(
    (e) =>
      (e.id === targetId ||
        e.expense_number === targetId ||
        (e as any).voucher_number === targetId) &&
      (e.company_id === cid || !e.company_id || cid === 'comp_001')
  );

  if (idx === -1) {
    const err: any = new Error('المصروف غير موجود');
    err.status = 404;
    throw err;
  }

  const exp = mockExpensesList[idx];

  if (exp.status === 'CANCELLED') {
    const err: any = new Error('المصروف ملغى مسبقاً');
    err.status = 400;
    throw err;
  }

  const vNum = exp.expense_number || (exp as any).voucher_number || exp.id;
  const roundAmt = roundMoney(exp.amount || 0);
  const todayStr = new Date().toISOString().split('T')[0];

  const isPayroll = String(exp.category || '').includes('رواتب') || String(exp.category || '').toLowerCase().includes('salary');
  const expenseCode = isPayroll ? '5201' : '5202';
  const expenseName = isPayroll ? 'مصروفات الرواتب والأجور' : 'المصروفات العمومية والإدارية';

  const isBank = (exp.paymentMethod || exp.payment_method) === 'BANK';
  const cashOrBankCode = isBank ? '1102' : '1101';
  const cashOrBankName = isBank ? 'البنك / الحسابات البنكية' : 'الصندوق / النقدية';

  // Original expense: Dr Expense (5201/5202), Cr Cash/Bank (1101/1102)
  // Reversal: Dr Cash/Bank (1101/1102), Cr Expense (5201/5202)
  if (roundAmt > 0) {
    postDoubleEntryJournal({
      companyId: cid,
      reference_type: 'EXPENSE_CANCEL',
      reference_id: vNum,
      description: `قيد عكسي لإلغاء مصروف #${vNum} (${exp.description || ''})`,
      date: todayStr,
      lines: [
        {
          account_code: cashOrBankCode,
          account_name: cashOrBankName,
          debit: roundAmt,
          credit: 0,
          description: `إرجاع نقدي للخزينة لإلغاء مصروف #${vNum}`,
        },
        {
          account_code: expenseCode,
          account_name: expenseName,
          debit: 0,
          credit: roundAmt,
          description: `عكس مصروف #${vNum}`,
        },
      ],
      created_by: 'النظام المحاسبي (إلغاء مصروف)',
    });
  }

  exp.status = 'CANCELLED';
  if (isPermanentDelete) {
    mockExpensesList.splice(idx, 1);
  }

  persistAllToDisk();

  return {
    success: true,
    expense: exp,
    message: isPermanentDelete ? 'تم حذف المصروف واسترجاع المبلغ للخزينة بنجاح' : 'تم إلغاء المصروف واسترجاع المبلغ للخزينة بنجاح',
  };
}
