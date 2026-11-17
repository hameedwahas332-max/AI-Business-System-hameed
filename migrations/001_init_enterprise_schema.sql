-- ============================================================================
-- Migration: 001_init_enterprise_schema.sql
-- Document ID: AUD-2026-002
-- Description: Initial Enterprise ERP PostgreSQL Schema with Multi-Tenant Isolation (company_id)
-- ============================================================================

CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(64) PRIMARY KEY,
  filename VARCHAR(255) UNIQUE NOT NULL,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS companies (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  tax_number VARCHAR(64),
  commercial_register VARCHAR(64),
  phone VARCHAR(64),
  email VARCHAR(255),
  address TEXT,
  currency VARCHAR(16) DEFAULT 'YER',
  business_mode VARCHAR(64) DEFAULT 'GENERAL_TRADING',
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS erp_permanent_users (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(64) DEFAULT 'ADMIN',
  company_id VARCHAR(64) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  phone VARCHAR(64),
  business_mode VARCHAR(64),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_erp_permanent_users_company_id ON erp_permanent_users (company_id);

CREATE TABLE IF NOT EXISTS erp_permanent_tenant_data (
  company_id VARCHAR(64) NOT NULL,
  data_type VARCHAR(64) NOT NULL,
  payload JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (company_id, data_type)
);
CREATE INDEX IF NOT EXISTS idx_erp_permanent_tenant_data_company_id ON erp_permanent_tenant_data (company_id);

CREATE TABLE IF NOT EXISTS enterprise_module_states (
  company_id VARCHAR(64) NOT NULL,
  state_key VARCHAR(64) NOT NULL,
  data JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (company_id, state_key)
);
CREATE INDEX IF NOT EXISTS idx_enterprise_module_states_company_id ON enterprise_module_states (company_id);

CREATE TABLE IF NOT EXISTS accounts (
  id VARCHAR(64) PRIMARY KEY,
  company_id VARCHAR(64) NOT NULL,
  code VARCHAR(32) NOT NULL,
  name VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255) NOT NULL,
  type VARCHAR(32) NOT NULL,
  nature VARCHAR(16) NOT NULL,
  balance NUMERIC(18, 2) DEFAULT 0,
  currency VARCHAR(16) DEFAULT 'YER',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (company_id, code)
);
CREATE INDEX IF NOT EXISTS idx_accounts_company_id ON accounts (company_id);

CREATE TABLE IF NOT EXISTS journal_entries (
  id VARCHAR(64) PRIMARY KEY,
  company_id VARCHAR(64) NOT NULL,
  entry_number VARCHAR(64) NOT NULL,
  date VARCHAR(32) NOT NULL,
  description TEXT NOT NULL,
  reference_type VARCHAR(64),
  reference_id VARCHAR(64),
  total_debit NUMERIC(18, 2) NOT NULL DEFAULT 0,
  total_credit NUMERIC(18, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(16) DEFAULT 'YER',
  status VARCHAR(32) DEFAULT 'POSTED',
  created_by VARCHAR(64),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_journal_entries_company_id ON journal_entries (company_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_ref ON journal_entries (company_id, reference_type, reference_id);

CREATE TABLE IF NOT EXISTS journal_lines (
  id VARCHAR(64) PRIMARY KEY,
  entry_id VARCHAR(64) NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  company_id VARCHAR(64) NOT NULL,
  account_id VARCHAR(64),
  account_code VARCHAR(32) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  debit NUMERIC(18, 2) NOT NULL DEFAULT 0,
  credit NUMERIC(18, 2) NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_journal_lines_company_id ON journal_lines (company_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_entry_id ON journal_lines (entry_id);

CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(64) PRIMARY KEY,
  company_id VARCHAR(64) NOT NULL,
  sku VARCHAR(64),
  barcode VARCHAR(64),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(128),
  unit VARCHAR(64) DEFAULT 'حبة',
  cost_price NUMERIC(18, 2) DEFAULT 0,
  selling_price NUMERIC(18, 2) DEFAULT 0,
  current_stock NUMERIC(18, 3) DEFAULT 0,
  min_stock_level NUMERIC(18, 3) DEFAULT 5,
  status VARCHAR(64) DEFAULT 'متوفر',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_products_company_id ON products (company_id);

CREATE TABLE IF NOT EXISTS stock_movements (
  id VARCHAR(64) PRIMARY KEY,
  company_id VARCHAR(64) NOT NULL,
  product_id VARCHAR(64) NOT NULL,
  product_name VARCHAR(255),
  type VARCHAR(32) NOT NULL,
  quantity NUMERIC(18, 3) NOT NULL DEFAULT 0,
  unit_cost NUMERIC(18, 2) DEFAULT 0,
  remaining_stock NUMERIC(18, 3) DEFAULT 0,
  reference_type VARCHAR(64),
  reference_id VARCHAR(64),
  notes TEXT,
  date VARCHAR(32),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_stock_movements_company_id ON stock_movements (company_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements (company_id, product_id);

CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(64) PRIMARY KEY,
  company_id VARCHAR(64) NOT NULL,
  code VARCHAR(64),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(64),
  email VARCHAR(255),
  address TEXT,
  tax_number VARCHAR(64),
  credit_limit NUMERIC(18, 2) DEFAULT 0,
  current_balance NUMERIC(18, 2) DEFAULT 0,
  currency VARCHAR(16) DEFAULT 'YER',
  status VARCHAR(32) DEFAULT 'ACTIVE',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_customers_company_id ON customers (company_id);

CREATE TABLE IF NOT EXISTS suppliers (
  id VARCHAR(64) PRIMARY KEY,
  company_id VARCHAR(64) NOT NULL,
  code VARCHAR(64),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(64),
  email VARCHAR(255),
  address TEXT,
  tax_number VARCHAR(64),
  current_balance NUMERIC(18, 2) DEFAULT 0,
  currency VARCHAR(16) DEFAULT 'YER',
  status VARCHAR(32) DEFAULT 'ACTIVE',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_suppliers_company_id ON suppliers (company_id);

CREATE TABLE IF NOT EXISTS invoices (
  id VARCHAR(64) PRIMARY KEY,
  company_id VARCHAR(64) NOT NULL,
  invoice_number VARCHAR(64) NOT NULL,
  customer_id VARCHAR(64),
  customer_name VARCHAR(255),
  issue_date VARCHAR(32) NOT NULL,
  due_date VARCHAR(32),
  subtotal NUMERIC(18, 2) DEFAULT 0,
  discount NUMERIC(18, 2) DEFAULT 0,
  tax NUMERIC(18, 2) DEFAULT 0,
  total NUMERIC(18, 2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(18, 2) DEFAULT 0,
  remaining_amount NUMERIC(18, 2) DEFAULT 0,
  payment_method VARCHAR(32) DEFAULT 'CASH',
  currency VARCHAR(16) DEFAULT 'YER',
  status VARCHAR(32) DEFAULT 'PAID',
  items JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON invoices (company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices (company_id, customer_id);

CREATE TABLE IF NOT EXISTS purchase_invoices (
  id VARCHAR(64) PRIMARY KEY,
  company_id VARCHAR(64) NOT NULL,
  invoice_number VARCHAR(64) NOT NULL,
  supplier_id VARCHAR(64),
  supplier_name VARCHAR(255),
  issue_date VARCHAR(32) NOT NULL,
  due_date VARCHAR(32),
  subtotal NUMERIC(18, 2) DEFAULT 0,
  discount NUMERIC(18, 2) DEFAULT 0,
  tax NUMERIC(18, 2) DEFAULT 0,
  total NUMERIC(18, 2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(18, 2) DEFAULT 0,
  remaining_amount NUMERIC(18, 2) DEFAULT 0,
  payment_method VARCHAR(32) DEFAULT 'CASH',
  currency VARCHAR(16) DEFAULT 'YER',
  status VARCHAR(32) DEFAULT 'COMPLETED',
  items JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_company_id ON purchase_invoices (company_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_supplier_id ON purchase_invoices (company_id, supplier_id);

CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(64) PRIMARY KEY,
  company_id VARCHAR(64) NOT NULL,
  voucher_number VARCHAR(64) NOT NULL,
  type VARCHAR(32) NOT NULL,
  amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(16) DEFAULT 'YER',
  payment_method VARCHAR(32) DEFAULT 'CASH',
  party_type VARCHAR(32),
  party_id VARCHAR(64),
  party_name VARCHAR(255),
  reference_id VARCHAR(64),
  notes TEXT,
  date VARCHAR(32),
  status VARCHAR(32) DEFAULT 'COMPLETED',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_payments_company_id ON payments (company_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  company_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64),
  user_email VARCHAR(255),
  action VARCHAR(128) NOT NULL,
  entity VARCHAR(64),
  entity_id VARCHAR(64),
  details JSONB DEFAULT '{}'::jsonb,
  ip_address VARCHAR(64),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id ON audit_logs (company_id);
