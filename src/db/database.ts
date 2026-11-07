/**
 * Enterprise PGlite Local Database Engine
 * 
 * Provides an embedded, zero-dependency PostgreSQL database running via WASM/PGlite
 * in the browser (using IndexedDB persistence) or local desktop Tauri runtime.
 * Implements full tenant isolation with company_id on all operational tables.
 */

import { PGlite } from '@electric-sql/pglite';

let pgliteInstance: PGlite | null = null;
let initPromise: Promise<PGlite> | null = null;

export interface DatabaseInitOptions {
  dataDir?: string;
  inMemory?: boolean;
}

/**
 * Initializes PGlite database and executes all DDL CREATE TABLE statements
 */
export async function initDatabase(options: DatabaseInitOptions = {}): Promise<PGlite> {
  if (pgliteInstance) return pgliteInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      let db: PGlite;
      if (options.inMemory) {
        db = new PGlite();
      } else if (typeof window !== 'undefined' && typeof indexedDB !== 'undefined') {
        db = new PGlite('idb://erp_pglite_enterprise_v1');
      } else {
        const dir = options.dataDir || './data/pglite_db';
        db = new PGlite(dir);
      }

      await executeSchemaDDL(db);
      pgliteInstance = db;
      return db;
    } catch (err) {
      console.warn('[PGlite] Fallback to in-memory instance due to:', err);
      const memDb = new PGlite();
      await executeSchemaDDL(memDb);
      pgliteInstance = memDb;
      return memDb;
    }
  })();

  return initPromise;
}

/**
 * Retrieves the active PGlite instance or initializes it
 */
export async function getDatabase(): Promise<PGlite> {
  if (pgliteInstance) return pgliteInstance;
  return initDatabase();
}

/**
 * Executes a parameterized SQL query on the PGlite instance
 */
export async function query<T = any>(sql: string, params?: any[]): Promise<{ rows: T[]; affectedRows?: number }> {
  const db = await getDatabase();
  const res = await db.query<T>(sql, params);
  return {
    rows: res.rows || [],
    affectedRows: res.affectedRows,
  };
}

/**
 * Closes the PGlite instance
 */
export async function closeDatabase(): Promise<void> {
  if (pgliteInstance) {
    try {
      await pgliteInstance.close();
    } catch (e) {
      console.warn('[PGlite] Error closing instance:', e);
    }
    pgliteInstance = null;
    initPromise = null;
  }
}

/**
 * All ERP Operational & Financial Tables DDL
 */
async function executeSchemaDDL(db: PGlite): Promise<void> {
  const schemaStatements = [
    // 1. Companies & Multi-Tenancy
    `CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'YER',
      phone TEXT,
      email TEXT,
      tax_number TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,

    // 2. Users & Roles
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL DEFAULT 'comp_001',
      username TEXT NOT NULL,
      email TEXT,
      password_hash TEXT,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'USER',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,

    // 3. Products & Multi-Unit Catalog
    `CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL DEFAULT 'comp_001',
      sku TEXT,
      barcode TEXT,
      name TEXT NOT NULL,
      category TEXT,
      activity_type TEXT DEFAULT 'general',
      unit TEXT DEFAULT 'حبة',
      base_unit_name TEXT DEFAULT 'حبة',
      sub_unit_name TEXT,
      sub_unit_factor NUMERIC(15, 4) DEFAULT 1,
      major_unit_name TEXT,
      major_unit_factor NUMERIC(15, 4) DEFAULT 1,
      price NUMERIC(15, 2) NOT NULL DEFAULT 0,
      cost_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
      purchase_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
      current_stock NUMERIC(15, 4) NOT NULL DEFAULT 0,
      min_stock_level NUMERIC(15, 4) DEFAULT 5,
      status TEXT DEFAULT 'ACTIVE',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,

    // 4. Customers
    `CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL DEFAULT 'comp_001',
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
      current_balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
      credit_limit NUMERIC(15, 2) DEFAULT 10000,
      currency TEXT DEFAULT 'YER',
      tax_number TEXT,
      status TEXT DEFAULT 'ACTIVE',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,

    // 5. Suppliers
    `CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL DEFAULT 'comp_001',
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      category TEXT,
      balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
      current_balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
      currency TEXT DEFAULT 'YER',
      status TEXT DEFAULT 'ACTIVE',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,

    // 6. Sales Invoices
    `CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL DEFAULT 'comp_001',
      invoice_number TEXT NOT NULL,
      customer_id TEXT,
      customer_name TEXT NOT NULL DEFAULT 'عميل نقدي',
      salesperson TEXT DEFAULT 'حميد وهاس',
      invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
      subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0,
      discount NUMERIC(15, 2) NOT NULL DEFAULT 0,
      tax NUMERIC(15, 2) NOT NULL DEFAULT 0,
      total NUMERIC(15, 2) NOT NULL DEFAULT 0,
      paid_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
      remaining_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL DEFAULT 'CASH',
      status TEXT NOT NULL DEFAULT 'paid',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,

    // 7. Sales Invoice Items
    `CREATE TABLE IF NOT EXISTS invoice_items (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL DEFAULT 'comp_001',
      invoice_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      quantity NUMERIC(15, 4) NOT NULL DEFAULT 1,
      unit_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
      cost_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
      discount NUMERIC(15, 2) DEFAULT 0,
      tax NUMERIC(15, 2) DEFAULT 0,
      total NUMERIC(15, 2) NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,

    // 8. Purchase Invoices & Items
    `CREATE TABLE IF NOT EXISTS purchase_invoices (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL DEFAULT 'comp_001',
      invoice_number TEXT NOT NULL,
      supplier_id TEXT,
      supplier_name TEXT NOT NULL DEFAULT 'مورد تجاري',
      invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
      subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0,
      discount NUMERIC(15, 2) NOT NULL DEFAULT 0,
      tax NUMERIC(15, 2) NOT NULL DEFAULT 0,
      total NUMERIC(15, 2) NOT NULL DEFAULT 0,
      paid_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
      remaining_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL DEFAULT 'CREDIT',
      status TEXT NOT NULL DEFAULT 'PENDING',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS purchase_invoice_items (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL DEFAULT 'comp_001',
      purchase_invoice_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      quantity NUMERIC(15, 4) NOT NULL DEFAULT 1,
      free_quantity NUMERIC(15, 4) DEFAULT 0,
      unit_cost NUMERIC(15, 2) NOT NULL DEFAULT 0,
      effective_cost NUMERIC(15, 2) NOT NULL DEFAULT 0,
      discount NUMERIC(15, 2) DEFAULT 0,
      total NUMERIC(15, 2) NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,

    // 9. Sales Returns & Items
    `CREATE TABLE IF NOT EXISTS sales_returns (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL DEFAULT 'comp_001',
      return_number TEXT NOT NULL,
      original_invoice_number TEXT,
      customer_id TEXT,
      customer_name TEXT,
      refund_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
      refund_method TEXT NOT NULL DEFAULT 'CASH',
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      reason TEXT,
      status TEXT NOT NULL DEFAULT 'COMPLETED',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS sales_return_items (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL DEFAULT 'comp_001',
      sales_return_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      quantity NUMERIC(15, 4) NOT NULL DEFAULT 1,
      unit_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
      unit_cost NUMERIC(15, 2) NOT NULL DEFAULT 0,
      total NUMERIC(15, 2) NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,

    // 10. Financial Vouchers (Receipts & Payments)
    `CREATE TABLE IF NOT EXISTS vouchers (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL DEFAULT 'comp_001',
      voucher_number TEXT NOT NULL,
      type TEXT NOT NULL, -- 'RECEIPT' or 'PAYMENT'
      party_type TEXT NOT NULL, -- 'CUSTOMER', 'SUPPLIER', 'OTHER'
      party_id TEXT,
      party_name TEXT,
      amount NUMERIC(15, 2) NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'CASH',
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      description TEXT,
      created_by TEXT DEFAULT 'حميد وهاس',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,

    // 11. Warehouses & Stock Movements
    `CREATE TABLE IF NOT EXISTS warehouses (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL DEFAULT 'comp_001',
      name TEXT NOT NULL,
      code TEXT,
      location TEXT,
      is_default BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS stock_movements (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL DEFAULT 'comp_001',
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      warehouse_id TEXT,
      type TEXT NOT NULL, -- 'IN', 'OUT', 'TRANSFER', 'ADJUSTMENT'
      quantity NUMERIC(15, 4) NOT NULL,
      remaining_stock NUMERIC(15, 4) NOT NULL,
      reference_type TEXT,
      reference_id TEXT,
      notes TEXT,
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,

    // 12. Employees, Movements & Payroll Records
    `CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL DEFAULT 'comp_001',
      name TEXT NOT NULL,
      position TEXT,
      department TEXT,
      basic_salary NUMERIC(15, 2) NOT NULL DEFAULT 0,
      allowances NUMERIC(15, 2) NOT NULL DEFAULT 0,
      phone TEXT,
      hire_date DATE,
      status TEXT DEFAULT 'ACTIVE',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS employee_movements (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL DEFAULT 'comp_001',
      employee_id TEXT NOT NULL,
      type TEXT NOT NULL, -- 'ADVANCE', 'BONUS', 'DEDUCTION'
      amount NUMERIC(15, 2) NOT NULL,
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS payroll_records (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL DEFAULT 'comp_001',
      month TEXT NOT NULL,
      year INT NOT NULL,
      total_gross NUMERIC(15, 2) NOT NULL DEFAULT 0,
      total_deductions NUMERIC(15, 2) NOT NULL DEFAULT 0,
      total_net NUMERIC(15, 2) NOT NULL DEFAULT 0,
      payment_method TEXT DEFAULT 'ACCRUED',
      status TEXT DEFAULT 'POSTED',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,

    // 13. General & Operating Expenses
    `CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL DEFAULT 'comp_001',
      expense_number TEXT,
      category TEXT NOT NULL DEFAULT 'مصروفات عمومية',
      description TEXT NOT NULL,
      amount NUMERIC(15, 2) NOT NULL,
      payment_method TEXT DEFAULT 'CASH',
      beneficiary TEXT,
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,

    // 14. Fuel Station (Tanks & Meter Logs)
    `CREATE TABLE IF NOT EXISTS fuel_tanks (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL DEFAULT 'comp_001',
      tank_number TEXT NOT NULL,
      fuel_type TEXT NOT NULL,
      capacity NUMERIC(15, 2) NOT NULL,
      current_volume NUMERIC(15, 2) NOT NULL DEFAULT 0,
      cost_per_liter NUMERIC(15, 2) DEFAULT 0,
      selling_price_per_liter NUMERIC(15, 2) DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS fuel_meter_logs (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL DEFAULT 'comp_001',
      tank_id TEXT NOT NULL,
      nozzle_number INT NOT NULL,
      opening_reading NUMERIC(15, 2) NOT NULL,
      closing_reading NUMERIC(15, 2) NOT NULL,
      liters_sold NUMERIC(15, 2) NOT NULL,
      total_amount NUMERIC(15, 2) NOT NULL,
      shift_date DATE NOT NULL DEFAULT CURRENT_DATE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,

    // 15. Audit Logs
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL DEFAULT 'comp_001',
      user_id TEXT,
      username TEXT NOT NULL DEFAULT 'admin',
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT,
      details TEXT,
      ip_address TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,

    // 16. Chart of Accounts & General Ledger
    `CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL DEFAULT 'comp_001',
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      name_ar TEXT NOT NULL,
      type TEXT NOT NULL,
      nature TEXT NOT NULL, -- 'DEBIT' or 'CREDIT'
      balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS journal_entries (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL DEFAULT 'comp_001',
      entry_number TEXT NOT NULL,
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      reference_type TEXT,
      reference_id TEXT,
      description TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'YER',
      total_debit NUMERIC(15, 2) NOT NULL,
      total_credit NUMERIC(15, 2) NOT NULL,
      status TEXT NOT NULL DEFAULT 'POSTED',
      created_by TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS journal_lines (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL DEFAULT 'comp_001',
      journal_entry_id TEXT NOT NULL,
      account_code TEXT NOT NULL,
      account_name TEXT,
      debit NUMERIC(15, 2) NOT NULL DEFAULT 0,
      credit NUMERIC(15, 2) NOT NULL DEFAULT 0,
      description TEXT,
      party_id TEXT,
      party_type TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,

    // Indexes for high performance and tenant isolation
    `CREATE INDEX IF NOT EXISTS idx_products_company ON products(company_id);`,
    `CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices(company_id);`,
    `CREATE INDEX IF NOT EXISTS idx_purchase_invoices_company ON purchase_invoices(company_id);`,
    `CREATE INDEX IF NOT EXISTS idx_stock_movements_company ON stock_movements(company_id, product_id);`,
    `CREATE INDEX IF NOT EXISTS idx_accounts_company ON accounts(company_id, code);`,
    `CREATE INDEX IF NOT EXISTS idx_journal_entries_company ON journal_entries(company_id, entry_number);`,
  ];

  for (const ddl of schemaStatements) {
    await db.query(ddl);
  }
}
