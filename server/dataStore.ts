import fs from 'fs';
import path from 'path';

/**
 * Centralized Enterprise In-Memory & Persistent Data Store
 * Provides live transactional state, disk/database persistence, and account rehydration
 */

export interface PermanentUserRecord {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: string;
  company_id: string;
  company_name: string;
  phone?: string;
  business_mode?: string;
  created_at: string;
  metadata?: any;
}

export interface ProductItem {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  category: string;
  activityType?: string;
  unit?: string;
  baseUnitName?: string;
  subUnitName?: string;
  subUnitFactor?: number;
  subUnitPrice?: number;
  subUnitBarcode?: string;
  majorUnitName?: string;
  majorUnitFactor?: number;
  majorUnitPrice?: number;
  majorUnitBarcode?: string;
  price: number;
  selling_price: number;
  retail_price: number;
  retailPrice?: number;
  halfWholesalePrice?: number;
  wholesalePrice?: number;
  vipPrice?: number;
  purchase_price: number;
  cost_price: number;
  qty: number;
  current_stock: number;
  min_stock_level: number;
  status: string;
  is_active: boolean;
  batchNumber?: string;
  productionDate?: string;
  expiryDate?: string;
  batterySpec?: string;
  warrantyMonths?: number;
  scrapDiscountValue?: number;
  requiresSerial?: boolean;
  viscosityGrade?: string;
  oemCode?: string;
  litersPerUnit?: number;
  description?: string;
  created_at?: string;
}

export interface InventoryMovementItem {
  id: string;
  product_id: string;
  product_name: string;
  type: string;
  quantity: number;
  remaining_stock: number;
  reference_type: string;
  reference_id: string;
  date: string;
  notes?: string;
}

export interface CustomerItem {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  balance: number;
  creditLimit: number;
  current_balance: number;
  opening_balance?: number;
  openingBalance?: number;
  currency?: string;
  notes?: string;
  status: string;
  taxNumber?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SupplierItem {
  id: string;
  name: string;
  category: string;
  balance: number;
  current_balance: number;
  opening_balance?: number;
  openingBalance?: number;
  currency?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AccountTransactionItem {
  id: string;
  party_id: string;
  party_type: 'CUSTOMER' | 'SUPPLIER';
  type: string;
  amount: number;
  currency: string;
  exchange_rate?: number;
  balance_after?: number;
  running_balance?: number;
  date: string;
  description?: string;
  reference_no?: string;
  notes?: string;
  created_at?: string;
}

export interface InvoiceItem {
  id: string;
  invoice_number: string;
  customer?: string;
  customer_name?: string;
  customer_id?: string;
  date: string;
  total: number;
  amount: number;
  paid_amount: number;
  remaining_amount?: number;
  status: string;
  payment_method?: string;
  currency?: string;
  items?: any[];
  notes?: string;
  created_at?: string;
}

export interface PurchaseInvoiceItem {
  id: string;
  invoice_number: string;
  supplier_name: string;
  supplier_id?: string;
  invoice_date: string;
  total: number;
  paid_amount: number;
  remaining_amount: number;
  status: string;
  payment_method?: string;
  currency?: string;
  items?: any[];
  notes?: string;
  created_at?: string;
}

export interface PaymentItem {
  id: string;
  type: 'CUSTOMER_PAYMENT' | 'SUPPLIER_PAYMENT' | 'EXPENSE';
  voucher_number: string;
  customer_name?: string;
  customer_id?: string;
  supplier_name?: string;
  supplier_id?: string;
  amount: number;
  currency: string;
  payment_method: string;
  payment_date: string;
  status: string;
  notes?: string;
  created_at?: string;
}

export interface AuditLogItem {
  id: string;
  username: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details: string;
  ip_address: string;
  created_at: string;
}

export interface EmployeeItem {
  id: string;
  code: string;
  name: string;
  roleTitle: string;
  phone: string;
  branch: string;
  hireDate: string;
  baseSalary: number;
  currency: 'YER' | 'SAR' | 'USD';
  status: 'active' | 'on_leave' | 'suspended' | 'نشط' | 'في إجازة' | 'موقوف';
  advancesBalance?: number;
  notes?: string;
  created_at?: string;
}

export interface EmployeeMovementItem {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'advance' | 'bonus' | 'deduction' | 'salary_payment' | 'attendance';
  amount: number;
  currency: 'YER' | 'SAR' | 'USD';
  date: string;
  treasury: string;
  description: string;
  attendanceStatus?: 'present' | 'absent' | 'leave' | 'overtime';
  notes?: string;
  created_at?: string;
}

export interface PayrollRecordItem {
  id: string;
  employeeId: string;
  employeeName: string;
  month: string;
  baseSalary: number;
  bonuses: number;
  advancesDeducted: number;
  otherDeductions: number;
  netSalary: number;
  currency: 'YER' | 'SAR' | 'USD';
  paymentDate: string;
  treasury: string;
  status: 'draft' | 'paid';
  referenceVoucher?: string;
  notes?: string;
  created_at?: string;
}

export interface ExpenseItem {
  id: string;
  voucherNumber: string;
  date: string;
  category: string;
  costCenter: string;
  beneficiary: string;
  amount: number;
  currency: 'YER' | 'SAR' | 'USD';
  exchangeRate?: number;
  baseCurrencyAmount?: number;
  paymentMethod: string;
  treasury: string;
  referenceNumber?: string;
  description: string;
  notes?: string;
  created_at?: string;
}

// -------------------------------------------------------------
// Initial Sample Data Templates (used for Sandbox Seeding)
// -------------------------------------------------------------
export const INITIAL_SAMPLE_PRODUCTS: ProductItem[] = [
  {
    id: 'prod-1',
    sku: 'TEA-01',
    barcode: '629100100112',
    name: 'شاي سيلاني فاخر 100 كيس',
    category: 'مواد غذائية',
    activityType: 'food',
    unit: 'حبة',
    baseUnitName: 'حبة',
    subUnitName: 'باكت',
    subUnitFactor: 12,
    subUnitPrice: 210,
    subUnitBarcode: '629100100113',
    majorUnitName: 'كرتون',
    majorUnitFactor: 24,
    majorUnitPrice: 400,
    majorUnitBarcode: '629100100114',
    price: 18.5,
    selling_price: 18.5,
    retail_price: 18.5,
    retailPrice: 18.5,
    halfWholesalePrice: 17.5,
    wholesalePrice: 16.5,
    vipPrice: 16.0,
    purchase_price: 13.0,
    cost_price: 13.0,
    qty: 240,
    current_stock: 240,
    min_stock_level: 20,
    status: 'متوفر',
    is_active: true,
    batchNumber: 'B-2026-OCT',
    productionDate: '2026-09-01',
    expiryDate: '2027-09-01',
  },
  {
    id: 'prod-2',
    sku: 'COF-02',
    barcode: '629100200223',
    name: 'قهوة عربية بالهيل 500جم',
    category: 'مواد غذائية',
    activityType: 'food',
    unit: 'حبة',
    baseUnitName: 'حبة',
    subUnitName: 'درزن',
    subUnitFactor: 12,
    subUnitPrice: 480,
    majorUnitName: 'كرتون',
    majorUnitFactor: 24,
    majorUnitPrice: 920,
    price: 42.0,
    selling_price: 42.0,
    retail_price: 42.0,
    retailPrice: 42.0,
    halfWholesalePrice: 40.0,
    wholesalePrice: 38.0,
    vipPrice: 37.0,
    purchase_price: 31.0,
    cost_price: 31.0,
    qty: 85,
    current_stock: 85,
    min_stock_level: 15,
    status: 'متوفر',
    is_active: true,
    batchNumber: 'COF-2026-A',
    productionDate: '2026-08-15',
    expiryDate: '2027-08-15',
  },
  {
    id: 'prod-3',
    sku: 'RIC-03',
    barcode: '629100300334',
    name: 'أرز بسمتي هندي ممتاز 5 كجم',
    category: 'مواد غذائية',
    activityType: 'food',
    unit: 'كيس',
    baseUnitName: 'كيس',
    majorUnitName: 'شوال (4 أكياس)',
    majorUnitFactor: 4,
    majorUnitPrice: 210,
    price: 55.0,
    selling_price: 55.0,
    retail_price: 55.0,
    retailPrice: 55.0,
    halfWholesalePrice: 53.0,
    wholesalePrice: 51.0,
    vipPrice: 50.0,
    purchase_price: 43.0,
    cost_price: 43.0,
    qty: 14,
    current_stock: 14,
    min_stock_level: 15,
    status: 'قريب من النفاذ',
    is_active: true,
    batchNumber: 'RICE-2026-X',
    productionDate: '2026-07-01',
    expiryDate: '2026-11-20',
  },
  {
    id: 'prod-4',
    sku: 'BAT-70',
    barcode: '880123456789',
    name: 'بطارية هانكوك 70 أمبير جافة',
    category: 'بطاريات وأجهزة',
    activityType: 'battery',
    unit: 'حبة',
    baseUnitName: 'حبة',
    majorUnitName: 'طبلية (10 حبات)',
    majorUnitFactor: 10,
    majorUnitPrice: 2800,
    price: 290.0,
    selling_price: 290.0,
    retail_price: 290.0,
    retailPrice: 290.0,
    halfWholesalePrice: 280.0,
    wholesalePrice: 270.0,
    vipPrice: 265.0,
    purchase_price: 220.0,
    cost_price: 220.0,
    qty: 28,
    current_stock: 28,
    min_stock_level: 8,
    status: 'متوفر',
    is_active: true,
    batterySpec: '70Ah - 12V SMF',
    warrantyMonths: 12,
    scrapDiscountValue: 50.0,
    requiresSerial: true,
  },
  {
    id: 'prod-4b',
    sku: 'BAT-100',
    barcode: '880123456790',
    name: 'بطارية إيه سي ديلكو 100 أمبير ياباني',
    category: 'بطاريات وأجهزة',
    activityType: 'battery',
    unit: 'حبة',
    baseUnitName: 'حبة',
    majorUnitName: 'طبلية (8 حبات)',
    majorUnitFactor: 8,
    majorUnitPrice: 3100,
    price: 410.0,
    selling_price: 410.0,
    retail_price: 410.0,
    retailPrice: 410.0,
    halfWholesalePrice: 395.0,
    wholesalePrice: 380.0,
    vipPrice: 375.0,
    purchase_price: 320.0,
    cost_price: 320.0,
    qty: 18,
    current_stock: 18,
    min_stock_level: 6,
    status: 'متوفر',
    is_active: true,
    batterySpec: '100Ah - 12V Heavy Duty',
    warrantyMonths: 18,
    scrapDiscountValue: 70.0,
    requiresSerial: true,
  },
  {
    id: 'prod-5',
    sku: 'OIL-20W50',
    barcode: '628100500556',
    name: 'زيت محرك بترومين سوبر 20W-50 (4 لتر)',
    category: 'زيوت وقطع غيار',
    activityType: 'oil',
    unit: 'جالون',
    baseUnitName: 'جالون',
    majorUnitName: 'كرتون (6 جوالين)',
    majorUnitFactor: 6,
    majorUnitPrice: 430,
    price: 75.0,
    selling_price: 75.0,
    retail_price: 75.0,
    retailPrice: 75.0,
    halfWholesalePrice: 72.0,
    wholesalePrice: 69.0,
    vipPrice: 68.0,
    purchase_price: 54.0,
    cost_price: 54.0,
    qty: 65,
    current_stock: 65,
    min_stock_level: 12,
    status: 'متوفر',
    is_active: true,
    viscosityGrade: '20W-50',
    oemCode: 'PET-20W50-SL',
    litersPerUnit: 4,
  },
  {
    id: 'prod-5b',
    sku: 'OIL-5W30',
    barcode: '628100500557',
    name: 'زيت كاسترول ماجناتيك تخليقي 5W-30 (1 لتر)',
    category: 'زيوت وقطع غيار',
    activityType: 'oil',
    unit: 'لتر',
    baseUnitName: 'لتر',
    majorUnitName: 'كرتون (12 لتر)',
    majorUnitFactor: 12,
    majorUnitPrice: 410,
    price: 36.0,
    selling_price: 36.0,
    retail_price: 36.0,
    retailPrice: 36.0,
    halfWholesalePrice: 34.5,
    wholesalePrice: 33.0,
    vipPrice: 32.5,
    purchase_price: 26.0,
    cost_price: 26.0,
    qty: 48,
    current_stock: 48,
    min_stock_level: 10,
    status: 'متوفر',
    is_active: true,
    viscosityGrade: '5W-30 Fully Synthetic',
    oemCode: 'CAS-5W30-SN',
    litersPerUnit: 1,
  },
  {
    id: 'prod-6',
    sku: 'GEN-01',
    barcode: '629100600667',
    name: 'مناديل ورقية فاخرة عبوة عائلية',
    category: 'عام',
    activityType: 'general',
    unit: 'باكت',
    baseUnitName: 'باكت',
    majorUnitName: 'كرتون (10 باكت)',
    majorUnitFactor: 10,
    majorUnitPrice: 75,
    price: 8.5,
    selling_price: 8.5,
    retail_price: 8.5,
    retailPrice: 8.5,
    halfWholesalePrice: 8.0,
    wholesalePrice: 7.5,
    vipPrice: 7.2,
    purchase_price: 5.5,
    cost_price: 5.5,
    qty: 92,
    current_stock: 92,
    min_stock_level: 20,
    status: 'متوفر',
    is_active: true,
  },
];

export const INITIAL_SAMPLE_MOVEMENTS: InventoryMovementItem[] = [
  {
    id: 'mov-1',
    product_id: 'prod-4',
    product_name: 'بطارية هانكوك 70 أمبير جافة',
    type: 'IN',
    quantity: 15,
    remaining_stock: 28,
    reference_type: 'PURCHASE_INVOICE',
    reference_id: 'PUR-2026-0012',
    date: '2026-10-18T10:30:00Z',
    notes: 'توريد دفعة بطاريات جديدة من الوكيل',
  },
  {
    id: 'mov-2',
    product_id: 'prod-1',
    product_name: 'شاي سيلاني فاخر 100 كيس',
    type: 'OUT',
    quantity: 12,
    remaining_stock: 240,
    reference_type: 'SALES_INVOICE',
    reference_id: 'INV-2026-0042',
    date: '2026-10-18T14:15:00Z',
    notes: 'صرف مبيعات بالكرتون لعميل جملة',
  },
  {
    id: 'mov-3',
    product_id: 'prod-5',
    product_name: 'زيت محرك بترومين سوبر 20W-50 (4 لتر)',
    type: 'OUT',
    quantity: 4,
    remaining_stock: 65,
    reference_type: 'POS_RECEIPT',
    reference_id: 'POS-REC-1092',
    date: '2026-10-18T16:45:00Z',
    notes: 'بيع كاشير سريع فوري',
  },
  {
    id: 'mov-4',
    product_id: 'prod-3',
    product_name: 'أرز بسمتي هندي ممتاز 5 كجم',
    type: 'ADJUSTMENT',
    quantity: -2,
    remaining_stock: 14,
    reference_type: 'PHYSICAL_INVENTORY',
    reference_id: 'AUDIT-2026-10',
    date: '2026-10-17T09:00:00Z',
    notes: 'تسوية فارق جرد دوري فعلي (تلف كيس أثناء النقل)',
  },
];

export const INITIAL_SAMPLE_CUSTOMERS: CustomerItem[] = [
  { id: '1', name: 'مؤسسة الأفق للتجارة', phone: '0501234567', email: 'alofooq@trade.sa', address: 'الرياض - الملز', balance: 8200, creditLimit: 20000, current_balance: 8200, opening_balance: 8200, openingBalance: 8200, currency: 'SAR', status: 'ACTIVE', taxNumber: '310123456700003', created_at: '2026-10-01T08:00:00Z' },
  { id: '2', name: 'شركة الوفاق المحدودة', phone: '0559876543', email: 'info@alwefaq.com', address: 'جدة - التحلية', balance: 5400, creditLimit: 50000, current_balance: 5400, opening_balance: 5400, openingBalance: 5400, currency: 'SAR', status: 'ACTIVE', taxNumber: '310987654300003', created_at: '2026-10-02T09:00:00Z' },
  { id: '3', name: 'مجمع الرياض الطبي', phone: '0543322110', email: 'finance@riyadh-med.sa', address: 'الرياض - طريق الملك فهد', balance: 4600, creditLimit: 30000, current_balance: 4600, opening_balance: 4600, openingBalance: 4600, currency: 'SAR', status: 'ACTIVE', taxNumber: '310433221100003', created_at: '2026-10-03T10:00:00Z' },
];

export const INITIAL_SAMPLE_SUPPLIERS: SupplierItem[] = [
  { id: '1', name: 'شركة التوريدات الوطنية الكبرى', category: 'أغذية ومواد استهلاكية', balance: 14200, current_balance: 14200, opening_balance: 14200, openingBalance: 14200, currency: 'SAR', phone: '0112345678', email: 'supply@national.sa', address: 'الرياض - المدينة الصناعية', created_at: '2026-10-01T07:30:00Z' },
  { id: '2', name: 'مؤسسة الاستيراد المباشر', category: 'معدات ومستلزمات تشغيل', balance: 4000, current_balance: 4000, opening_balance: 4000, openingBalance: 4000, currency: 'SAR', phone: '0118765432', email: 'import@direct.sa', address: 'الدمام - الميناء', created_at: '2026-10-02T08:30:00Z' },
];

export const INITIAL_SAMPLE_ACCOUNT_TRANSACTIONS: AccountTransactionItem[] = [
  {
    id: 'tx-sample-1',
    party_id: '1',
    party_type: 'CUSTOMER',
    type: 'INVOICE',
    amount: 1667.5,
    currency: 'SAR',
    exchange_rate: 1.0,
    balance_after: 8200,
    running_balance: 8200,
    date: '2026-10-18',
    description: 'فاتورة مبيعات ضريبية INV-2026-0042',
    reference_no: 'INV-2026-0042',
    created_at: '2026-10-18T10:00:00Z',
  },
  {
    id: 'stx-sample-1',
    party_id: '1',
    party_type: 'SUPPLIER',
    type: 'PURCHASE_INVOICE',
    amount: 14200,
    currency: 'SAR',
    exchange_rate: 1.0,
    balance_after: 14200,
    running_balance: 14200,
    date: '2026-10-17',
    description: 'توريد بضاعة للمستودع PUR-2026-0012',
    reference_no: 'PUR-2026-0012',
    created_at: '2026-10-17T11:00:00Z',
  },
];

export const INITIAL_SAMPLE_INVOICES: InvoiceItem[] = [
  { id: 'INV-2026-0042', invoice_number: 'INV-2026-0042', customer: 'مؤسسة الأفق للتجارة', customer_name: 'مؤسسة الأفق للتجارة', customer_id: '1', date: '2026-10-18', total: 1667.5, amount: 1667.5, paid_amount: 1667.5, status: 'مدفوعة' },
  { id: 'INV-2026-0041', invoice_number: 'INV-2026-0041', customer: 'شركة الوفاق المحدودة', customer_name: 'شركة الوفاق المحدودة', customer_id: '2', date: '2026-10-18', total: 943.0, amount: 943.0, paid_amount: 943.0, status: 'مدفوعة' },
  { id: 'INV-2026-0040', invoice_number: 'INV-2026-0040', customer: 'عميل كاشير نقدي', customer_name: 'عميل كاشير نقدي', date: '2026-10-18', total: 207.0, amount: 207.0, paid_amount: 207.0, status: 'مدفوعة' },
];

export const INITIAL_SAMPLE_PURCHASE_INVOICES: PurchaseInvoiceItem[] = [
  { id: 'PUR-2026-0012', invoice_number: 'PUR-2026-0012', supplier_name: 'شركة التوريدات الوطنية الكبرى', supplier_id: '1', invoice_date: '2026-10-17', total: 14200, paid_amount: 10000, remaining_amount: 4200, status: 'PARTIAL' },
  { id: 'PUR-2026-0011', invoice_number: 'PUR-2026-0011', supplier_name: 'مؤسسة الاستيراد المباشر', supplier_id: '2', invoice_date: '2026-10-15', total: 5800, paid_amount: 5800, remaining_amount: 0, status: 'PAID' },
];

export const INITIAL_SAMPLE_PAYMENTS: PaymentItem[] = [
  { id: 'PMT-001', type: 'CUSTOMER_PAYMENT', voucher_number: 'VOUCH-1001', customer_name: 'مؤسسة الأفق للتجارة', customer_id: '1', amount: 5000, currency: 'SAR', payment_method: 'CASH', payment_date: '2026-10-18', status: 'CONFIRMED' },
  { id: 'PMT-002', type: 'SUPPLIER_PAYMENT', voucher_number: 'VOUCH-1002', supplier_name: 'شركة التوريدات الوطنية الكبرى', supplier_id: '1', amount: 10000, currency: 'SAR', payment_method: 'BANK_TRANSFER', payment_date: '2026-10-18', status: 'CONFIRMED' },
];

export const INITIAL_SAMPLE_AUDIT_LOGS: AuditLogItem[] = [
  { id: 'log-1', username: 'admin', action: 'CREATE_INVOICE', resource_type: 'INVOICE', resource_id: 'INV-2026-0042', details: 'إصدار فاتورة ضريبية', ip_address: '127.0.0.1', created_at: new Date().toISOString() },
  { id: 'log-2', username: 'admin', action: 'RECORD_PAYMENT', resource_type: 'PAYMENT', resource_id: 'PMT-001', details: 'تحصيل سند قبض 5000 ر.س', ip_address: '127.0.0.1', created_at: new Date(Date.now() - 3600000).toISOString() },
];

export const INITIAL_SAMPLE_EMPLOYEES: EmployeeItem[] = [
  {
    id: 'emp-101',
    code: 'EMP-101',
    name: 'أحمد ياسين الحميري',
    roleTitle: 'محاسب مالي رئيسي',
    phone: '0551234567',
    branch: 'المركز الرئيسي',
    hireDate: '2025-01-10',
    baseSalary: 4500,
    currency: 'SAR',
    status: 'active',
    advancesBalance: 0,
    notes: 'المسؤول المالي عن تدقيق القيود والمصروفات',
    created_at: '2026-01-10T00:00:00Z',
  },
  {
    id: 'emp-102',
    code: 'EMP-102',
    name: 'خالد ناصر الريمي',
    roleTitle: 'كاشير نقطة بيع (POS)',
    phone: '0557654321',
    branch: 'المعرض الرئيسي',
    hireDate: '2025-03-15',
    baseSalary: 3200,
    currency: 'SAR',
    status: 'active',
    advancesBalance: 500,
    notes: 'كاشير الوردية الصباحية',
    created_at: '2026-03-15T00:00:00Z',
  },
  {
    id: 'emp-103',
    code: 'EMP-103',
    name: 'جمال سعيد العولقي',
    roleTitle: 'أمين مستودع مركزي',
    phone: '0559871234',
    branch: 'المستودع المركزي',
    hireDate: '2025-02-01',
    baseSalary: 3500,
    currency: 'SAR',
    status: 'active',
    advancesBalance: 0,
    notes: 'مسؤول استلام وجرد البضاعة',
    created_at: '2026-02-01T00:00:00Z',
  },
  {
    id: 'emp-104',
    code: 'EMP-104',
    name: 'فؤاد صالح الحبيشي',
    roleTitle: 'فني إطارات وبطاريات',
    phone: '0553332211',
    branch: 'فرع الإطارات والبطاريات',
    hireDate: '2025-04-01',
    baseSalary: 3000,
    currency: 'SAR',
    status: 'active',
    advancesBalance: 200,
    notes: 'فني فحص وتركيب البطاريات وضمان الإطارات',
    created_at: '2026-04-01T00:00:00Z',
  },
  {
    id: 'emp-105',
    code: 'EMP-105',
    name: 'سالم مبارك النهدي',
    roleTitle: 'عامل طرمبة محطة وقود',
    phone: '0554445566',
    branch: 'محطة الوقود والغاز',
    hireDate: '2025-05-10',
    baseSalary: 2800,
    currency: 'SAR',
    status: 'active',
    advancesBalance: 0,
    notes: 'مشرف وردية تعبئة البنزين والديزل',
    created_at: '2026-05-10T00:00:00Z',
  },
];

export const INITIAL_SAMPLE_EMPLOYEE_MOVEMENTS: EmployeeMovementItem[] = [
  {
    id: 'mov-001',
    employeeId: 'emp-102',
    employeeName: 'خالد ناصر الريمي',
    type: 'advance',
    amount: 500,
    currency: 'SAR',
    date: '2026-10-15',
    treasury: 'الصندوق النقدي',
    description: 'سلفة على حساب راتب شهر أكتوبر',
    created_at: '2026-10-15T09:30:00Z',
  },
  {
    id: 'mov-002',
    employeeId: 'emp-104',
    employeeName: 'فؤاد صالح الحبيشي',
    type: 'advance',
    amount: 200,
    currency: 'SAR',
    date: '2026-10-16',
    treasury: 'الصندوق النقدي',
    description: 'سلفة مصاريف علاجية طارئة',
    created_at: '2026-10-16T14:15:00Z',
  },
  {
    id: 'mov-003',
    employeeId: 'emp-101',
    employeeName: 'أحمد ياسين الحميري',
    type: 'bonus',
    amount: 300,
    currency: 'SAR',
    date: '2026-10-17',
    treasury: 'الحساب البنكي',
    description: 'حافز إنجاز إقفال الحسابات الضريبية الربعية',
    created_at: '2026-10-17T11:00:00Z',
  },
];

export const INITIAL_SAMPLE_PAYROLL_RECORDS: PayrollRecordItem[] = [
  {
    id: 'pay-2026-09-101',
    employeeId: 'emp-101',
    employeeName: 'أحمد ياسين الحميري',
    month: '2026-09',
    baseSalary: 4500,
    bonuses: 0,
    advancesDeducted: 0,
    otherDeductions: 0,
    netSalary: 4500,
    currency: 'SAR',
    paymentDate: '2026-09-30',
    treasury: 'الحساب البنكي',
    status: 'paid',
    referenceVoucher: 'EXP-901',
    notes: 'تحويل بنكي مباشر للراتب',
    created_at: '2026-09-30T10:00:00Z',
  },
];

export const INITIAL_SAMPLE_EXPENSES: ExpenseItem[] = [
  {
    id: 'exp-1001',
    voucherNumber: 'EXP-1001',
    date: '2026-10-18',
    category: 'إيجارات المحلات والمستودعات',
    costCenter: 'المحل / المعرض الرئيسي',
    beneficiary: 'شركة العقارات والتطوير المتحدة',
    amount: 12000,
    currency: 'SAR',
    paymentMethod: 'بنك',
    treasury: 'الحساب البنكي',
    referenceNumber: 'RENT-2026-10',
    description: 'سداد إيجار المعرض التجاري الرئيسي لشهر أكتوبر 2026',
    created_at: '2026-10-18T10:00:00Z',
  },
  {
    id: 'exp-1002',
    voucherNumber: 'EXP-1002',
    date: '2026-10-19',
    category: 'كهرباء ومياه وطاقة ومولدات',
    costCenter: 'محطة الوقود والغاز',
    beneficiary: 'الشركة السعودية للكهرباء',
    amount: 2450,
    currency: 'SAR',
    paymentMethod: 'نقداً',
    treasury: 'الصندوق النقدي',
    referenceNumber: 'ELEC-2026-10',
    description: 'فاتورة استهلاك كهرباء وتشغيل طرمبات المحطة والمولد الاحتياطي',
    created_at: '2026-10-19T11:30:00Z',
  },
  {
    id: 'exp-1003',
    voucherNumber: 'EXP-1003',
    date: '2026-10-20',
    category: 'نقل وشحن وتنزيل وحمالة',
    costCenter: 'المستودع المركزي',
    beneficiary: 'مؤسسة الشاحنات السريعة للنقل',
    amount: 1800,
    currency: 'SAR',
    paymentMethod: 'نقداً',
    treasury: 'الصندوق النقدي',
    referenceNumber: 'TRUCK-99',
    description: 'أجور شحن وتفريغ بضاعة موردة للمستودع المركزي',
    created_at: '2026-10-20T13:00:00Z',
  },
  {
    id: 'exp-1004',
    voucherNumber: 'EXP-1004',
    date: '2026-10-21',
    category: 'ضيافة وبوفيه ونثريات يومية',
    costCenter: 'المحل / المعرض الرئيسي',
    beneficiary: 'بوفيه الضيافة',
    amount: 350,
    currency: 'SAR',
    paymentMethod: 'نقداً',
    treasury: 'الصندوق النقدي',
    referenceNumber: 'HOSP-12',
    description: 'مستلزمات ضيافة العملاء وشاي وقهوة ونظافة المعرض',
    created_at: '2026-10-21T09:00:00Z',
  },
  {
    id: 'exp-1005',
    voucherNumber: 'EXP-1005',
    date: '2026-10-22',
    category: 'صيانة وتشغيل سيارات وطرمبات ومعدات',
    costCenter: 'محطة الوقود والغاز',
    beneficiary: 'ورشة الهيدروليك الفنية',
    amount: 950,
    currency: 'SAR',
    paymentMethod: 'بنك',
    treasury: 'الحساب البنكي',
    referenceNumber: 'MAINT-44',
    description: 'صيانة دورية لطرمبة ديزل وتغيير ليات وفلاتر العدادات',
    created_at: '2026-10-22T15:20:00Z',
  },
];

// -------------------------------------------------------------
// Live In-Memory Collections (Mutable & Cleansable)
// -------------------------------------------------------------
export let mockProducts: ProductItem[] = [...INITIAL_SAMPLE_PRODUCTS];
export let mockInventoryMovements: InventoryMovementItem[] = [...INITIAL_SAMPLE_MOVEMENTS];
export let mockCustomersList: CustomerItem[] = [...INITIAL_SAMPLE_CUSTOMERS];
export let mockSuppliersList: SupplierItem[] = [...INITIAL_SAMPLE_SUPPLIERS];
export let mockAccountTransactions: AccountTransactionItem[] = [...INITIAL_SAMPLE_ACCOUNT_TRANSACTIONS];
export let mockInvoicesList: InvoiceItem[] = [...INITIAL_SAMPLE_INVOICES];
export let mockPurchaseInvoicesList: PurchaseInvoiceItem[] = [...INITIAL_SAMPLE_PURCHASE_INVOICES];
export let mockPaymentsList: PaymentItem[] = [...INITIAL_SAMPLE_PAYMENTS];
export let mockAuditLogsList: AuditLogItem[] = [...INITIAL_SAMPLE_AUDIT_LOGS];
export let mockEmployeesList: EmployeeItem[] = [...INITIAL_SAMPLE_EMPLOYEES];
export let mockEmployeeMovementsList: EmployeeMovementItem[] = [...INITIAL_SAMPLE_EMPLOYEE_MOVEMENTS];
export let mockPayrollRecordsList: PayrollRecordItem[] = [...INITIAL_SAMPLE_PAYROLL_RECORDS];
export let mockExpensesList: ExpenseItem[] = [...INITIAL_SAMPLE_EXPENSES];

export let isSampleDataSeeded: boolean = true;

/**
 * Clean all sample data to prepare the system for 100% clean, real production operations.
 * Clears all transaction history, demo products, demo customers/suppliers, and demo vouchers.
 */
export async function cleanupAllSampleData(companyId?: string, pool?: any): Promise<{
  success: boolean;
  message: string;
  clearedCounts: Record<string, number>;
}> {
  const previousCounts = {
    products: mockProducts.length,
    movements: mockInventoryMovements.length,
    customers: mockCustomersList.length,
    suppliers: mockSuppliersList.length,
    transactions: mockAccountTransactions.length,
    invoices: mockInvoicesList.length,
    purchaseInvoices: mockPurchaseInvoicesList.length,
    payments: mockPaymentsList.length,
    employees: mockEmployeesList.length,
    employeeMovements: mockEmployeeMovementsList.length,
    payrollRecords: mockPayrollRecordsList.length,
    expenses: mockExpensesList.length,
  };

  // Mutate live arrays in place so references remain intact
  mockProducts.length = 0;
  mockInventoryMovements.length = 0;
  mockCustomersList.length = 0;
  mockSuppliersList.length = 0;
  mockAccountTransactions.length = 0;
  mockInvoicesList.length = 0;
  mockPurchaseInvoicesList.length = 0;
  mockPaymentsList.length = 0;
  mockAuditLogsList.length = 0;
  mockEmployeesList.length = 0;
  mockEmployeeMovementsList.length = 0;
  mockPayrollRecordsList.length = 0;
  mockExpensesList.length = 0;

  isSampleDataSeeded = false;

  // If a PostgreSQL database pool is active, clean tenant records safely
  if (pool && companyId) {
    try {
      await pool.query(
        `DELETE FROM enterprise_module_states 
         WHERE company_id = $1 
         AND state_key IN ('fuel_tanks', 'sales_reps', 'custom_ledger', 'battery_warranties', 'employees', 'expenses')`,
        [companyId]
      );
    } catch (err: any) {
      console.warn('[DATASTORE_PG_CLEANUP_WARN]', err?.message);
    }
  }

  return {
    success: true,
    message: 'تم تنظيف وحذف كافة البيانات التجريبية بنجاح، والنظام الآن مهيأ ومصفر بالكامل لبدء إدخال بياناتك الحقيقية.',
    clearedCounts: previousCounts,
  };
}

/**
 * Re-seed sample data on demand (Sandbox Mode).
 */
export function seedAllSampleData(): { success: boolean; message: string } {
  mockProducts.length = 0;
  mockProducts.push(...INITIAL_SAMPLE_PRODUCTS);

  mockInventoryMovements.length = 0;
  mockInventoryMovements.push(...INITIAL_SAMPLE_MOVEMENTS);

  mockCustomersList.length = 0;
  mockCustomersList.push(...INITIAL_SAMPLE_CUSTOMERS);

  mockSuppliersList.length = 0;
  mockSuppliersList.push(...INITIAL_SAMPLE_SUPPLIERS);

  mockAccountTransactions.length = 0;
  mockAccountTransactions.push(...INITIAL_SAMPLE_ACCOUNT_TRANSACTIONS);

  mockInvoicesList.length = 0;
  mockInvoicesList.push(...INITIAL_SAMPLE_INVOICES);

  mockPurchaseInvoicesList.length = 0;
  mockPurchaseInvoicesList.push(...INITIAL_SAMPLE_PURCHASE_INVOICES);

  mockPaymentsList.length = 0;
  mockPaymentsList.push(...INITIAL_SAMPLE_PAYMENTS);

  mockAuditLogsList.length = 0;
  mockAuditLogsList.push(...INITIAL_SAMPLE_AUDIT_LOGS);

  mockEmployeesList.length = 0;
  mockEmployeesList.push(...INITIAL_SAMPLE_EMPLOYEES);

  mockEmployeeMovementsList.length = 0;
  mockEmployeeMovementsList.push(...INITIAL_SAMPLE_EMPLOYEE_MOVEMENTS);

  mockPayrollRecordsList.length = 0;
  mockPayrollRecordsList.push(...INITIAL_SAMPLE_PAYROLL_RECORDS);

  mockExpensesList.length = 0;
  mockExpensesList.push(...INITIAL_SAMPLE_EXPENSES);

  isSampleDataSeeded = true;
  persistAllToDisk();

  return {
    success: true,
    message: 'تم غرس البيانات التجريبية النموذجية بنجاح لاستعراض النظام.',
  };
}

// =============================================================
// ETERNAL ACCOUNT & STORE DATA PERSISTENCE LAYER (Disk + PostgreSQL)
// =============================================================

const STORE_DIR = path.join(process.cwd(), 'data');
const STORE_FILE = path.join(STORE_DIR, 'permanent_erp_store.json');

export const permanentUsersMap = new Map<string, PermanentUserRecord>([
  [
    'admin@alsahabi.com',
    {
      id: 'usr_001',
      email: 'admin@alsahabi.com',
      password_hash: 'admin123',
      name: 'المدير العام',
      role: 'ADMIN',
      company_id: 'comp_001',
      company_name: 'مؤسسة السحابي للتجارة والتقنية',
      phone: '0501234567',
      business_mode: 'multi_activity',
      created_at: '2026-01-01T00:00:00Z',
    },
  ],
  [
    'admin@enterprise.sa',
    {
      id: 'usr_enterprise_01',
      email: 'admin@enterprise.sa',
      password_hash: 'admin123',
      name: 'عبدالرحمن العتيبي (المدير العام)',
      role: 'ADMIN',
      company_id: 'comp_001',
      company_name: 'مؤسسة السحابي للتجارة والتقنية',
      phone: '0501234567',
      business_mode: 'multi_activity',
      created_at: '2026-01-01T00:00:00Z',
    },
  ],
  [
    'admin@alamal-trade.com',
    {
      id: 'usr_alamal_01',
      email: 'admin@alamal-trade.com',
      password_hash: 'AdminPass123!',
      name: 'محمد أحمد العبسي',
      role: 'ADMIN',
      company_id: 'comp_alamal',
      company_name: 'شركة الأمل الوطنية للتجارة',
      phone: '777123456',
      business_mode: 'wholesale_retail_general',
      created_at: '2026-01-01T00:00:00Z',
    },
  ],
  [
    'admin@albaraka-store.com',
    {
      id: 'usr_albaraka_01',
      email: 'admin@albaraka-store.com',
      password_hash: 'AdminPass123!',
      name: 'عبدالله صالح البركة',
      role: 'ADMIN',
      company_id: 'comp_albaraka',
      company_name: 'مؤسسة البركة للمستلزمات',
      phone: '733987654',
      business_mode: 'wholesale_retail_general',
      created_at: '2026-01-01T00:00:00Z',
    },
  ],
]);

export const permanentCompaniesMap = new Map<string, any>([
  [
    'comp_001',
    {
      id: 'comp_001',
      name: 'مؤسسة السحابي للتجارة والتقنية',
      currency: 'SAR',
      phone: '0501234567',
      email: 'admin@alsahabi.com',
      status: 'ACTIVE',
      created_at: '2026-01-01T00:00:00Z',
    },
  ],
  [
    'comp_alamal',
    {
      id: 'comp_alamal',
      name: 'شركة الأمل الوطنية للتجارة',
      currency: 'YER',
      phone: '777123456',
      email: 'admin@alamal-trade.com',
      status: 'ACTIVE',
      created_at: '2026-01-01T00:00:00Z',
    },
  ],
  [
    'comp_albaraka',
    {
      id: 'comp_albaraka',
      name: 'مؤسسة البركة للمستلزمات',
      currency: 'YER',
      phone: '733987654',
      email: 'admin@albaraka-store.com',
      status: 'ACTIVE',
      created_at: '2026-01-01T00:00:00Z',
    },
  ],
]);

export const mockWhatsAppConfigsMap = new Map<string, any>();
export const mockWhatsAppStateMap = new Map<string, any>();

export function getDefaultWhatsAppConfig(companyId: string) {
  return {
    id: `wcfg_${companyId}`,
    company_id: companyId,
    connectionMode: 'internal_engine',
    senderPhoneNumber: '+967 770 000 000',
    phoneNumberId: '',
    businessAccountId: '',
    accessToken: '',
    gatewayUrl: '',
    instanceId: '',
    apiToken: '',
    openExternalWhatsAppApp: false,
    isConnected: true,
    status: 'CONNECTED',
    lastTestedAt: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function getTenantWhatsAppConfig(companyId: string): any {
  if (!mockWhatsAppConfigsMap.has(companyId)) {
    mockWhatsAppConfigsMap.set(companyId, getDefaultWhatsAppConfig(companyId));
  }
  return mockWhatsAppConfigsMap.get(companyId);
}

export async function saveTenantWhatsAppConfig(companyId: string, config: any, pool?: any): Promise<any> {
  const existing = getTenantWhatsAppConfig(companyId);
  const updated = {
    ...existing,
    ...config,
    company_id: companyId,
    updated_at: new Date().toISOString(),
  };
  mockWhatsAppConfigsMap.set(companyId, updated);
  persistAllToDisk();

  if (pool) {
    try {
      await pool.query(
        `INSERT INTO erp_permanent_tenant_data (company_id, data_type, payload, updated_at)
         VALUES ($1, 'whatsapp_config', $2, CURRENT_TIMESTAMP)
         ON CONFLICT (company_id, data_type)
         DO UPDATE SET payload = EXCLUDED.payload, updated_at = CURRENT_TIMESTAMP`,
        [companyId, JSON.stringify(updated)]
      );
    } catch (err: any) {
      console.warn('[PG_WHATSAPP_CONFIG_PERSIST_WARN]', err?.message);
    }
  }
  return updated;
}

export function getTenantWhatsAppState(companyId: string): any {
  if (!mockWhatsAppStateMap.has(companyId)) {
    mockWhatsAppStateMap.set(companyId, {
      conversations: [],
      messages: [],
      templates: [
        {
          id: 'tmpl-1',
          name: 'إشعار كشف حساب عميل',
          purpose: 'كشف حساب',
          category: 'INVOICE',
          audience: 'CUSTOMERS',
          language: 'ar',
          body: 'مرحباً {{customer_name}}، نود إحاطتكم بأن رصيد حسابكم الحالي هو {{balance}} {{currency}}. شاكرين ومقدرين حسن تعاملكم معنا.',
          variables: ['customer_name', 'balance', 'currency'],
          status: 'ACTIVE',
        },
        {
          id: 'tmpl-2',
          name: 'تذكير بموعد سداد فاتورة',
          purpose: 'تحصيل ديون',
          category: 'COLLECTION',
          audience: 'OVERDUE',
          language: 'ar',
          body: 'عزيزي العميل {{customer_name}}، نذكركم بقرب موعد استحقاق الفاتورة بمبلغ {{amount}} {{currency}}.',
          variables: ['customer_name', 'amount', 'currency'],
          status: 'ACTIVE',
        },
      ],
      automations: [],
      scheduled: [],
      campaigns: [],
      logs: [],
      kpi: {
        totalConversations: 0,
        unreadCount: 0,
        sentToday: 0,
        deliveredCount: 0,
        readCount: 0,
        failedCount: 0,
        scheduledCount: 0,
        deliveryRate: 100,
        responseRatePercent: 95,
      },
    });
  }
  return mockWhatsAppStateMap.get(companyId);
}

export async function saveTenantWhatsAppState(companyId: string, state: any, pool?: any): Promise<any> {
  const existing = getTenantWhatsAppState(companyId);
  const updated = {
    ...existing,
    ...state,
    updated_at: new Date().toISOString(),
  };
  mockWhatsAppStateMap.set(companyId, updated);
  persistAllToDisk();

  if (pool) {
    try {
      await pool.query(
        `INSERT INTO erp_permanent_tenant_data (company_id, data_type, payload, updated_at)
         VALUES ($1, 'whatsapp_state', $2, CURRENT_TIMESTAMP)
         ON CONFLICT (company_id, data_type)
         DO UPDATE SET payload = EXCLUDED.payload, updated_at = CURRENT_TIMESTAMP`,
        [companyId, JSON.stringify(updated)]
      );
    } catch (err: any) {
      console.warn('[PG_WHATSAPP_STATE_PERSIST_WARN]', err?.message);
    }
  }
  return updated;
}

export function recordSentWhatsAppMessage(companyId: string, payload: {
  recipientPhone: string;
  recipientName?: string;
  customerId?: string;
  supplierId?: string;
  messageText: string;
  messageType?: string;
  attachmentSummary?: string;
  status?: string;
  metaMessageId?: string;
  errorDetails?: string;
}): any {
  const state = getTenantWhatsAppState(companyId);
  const cleanPhone = (payload.recipientPhone || '').replace(/[^0-9+]/g, '');
  const nowIso = new Date().toISOString();
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const newMsg = {
    id: messageId,
    company_id: companyId,
    direction: 'OUTBOUND',
    phone_number: cleanPhone,
    message_body: payload.messageText,
    status: payload.status || 'SENT',
    meta_message_id: payload.metaMessageId || null,
    customer_id: payload.customerId || null,
    supplier_id: payload.supplierId || null,
    customer_name: payload.recipientName || null,
    message_type: payload.messageType || 'ACCOUNT_STATEMENT',
    error_details: payload.errorDetails || null,
    metadata: {
      attachmentSummary: payload.attachmentSummary,
    },
    created_at: nowIso,
  };

  if (!Array.isArray(state.messages)) state.messages = [];
  state.messages.unshift(newMsg);

  // Update or create conversation
  if (!Array.isArray(state.conversations)) state.conversations = [];
  const convIndex = state.conversations.findIndex((c: any) => c.phone_number === cleanPhone);
  if (convIndex >= 0) {
    state.conversations[convIndex].last_message = payload.messageText;
    state.conversations[convIndex].last_direction = 'OUTBOUND';
    state.conversations[convIndex].last_status = newMsg.status;
    state.conversations[convIndex].last_message_time = nowIso;
    state.conversations[convIndex].last_message_id = messageId;
    if (payload.recipientName) state.conversations[convIndex].customer_name = payload.recipientName;
  } else {
    state.conversations.unshift({
      phone_number: cleanPhone,
      last_message_id: messageId,
      last_message: payload.messageText,
      last_direction: 'OUTBOUND',
      last_status: newMsg.status,
      last_message_time: nowIso,
      customer_id: payload.customerId || null,
      supplier_id: payload.supplierId || null,
      customer_name: payload.recipientName || 'عميل / مورد',
      unread_count: 0,
    });
  }

  // Update KPI counters
  if (!state.kpi) {
    state.kpi = { totalConversations: 0, unreadCount: 0, sentToday: 0, deliveredCount: 0, readCount: 0, failedCount: 0, scheduledCount: 0, deliveryRate: 100 };
  }
  state.kpi.sentToday = (state.kpi.sentToday || 0) + 1;
  state.kpi.totalConversations = state.conversations.length;
  if (newMsg.status === 'SENT') {
    state.kpi.deliveredCount = (state.kpi.deliveredCount || 0) + 1;
  } else if (newMsg.status === 'FAILED') {
    state.kpi.failedCount = (state.kpi.failedCount || 0) + 1;
  }

  // Add to logs
  if (!Array.isArray(state.logs)) state.logs = [];
  state.logs.unshift({
    id: `log_${Date.now()}`,
    type: 'OUTBOUND_MESSAGE',
    phone: cleanPhone,
    recipient: payload.recipientName || cleanPhone,
    status: newMsg.status,
    timestamp: nowIso,
    details: `إرسال رسالة: ${payload.messageType || 'رسالة نظام'}`,
  });

  persistAllToDisk();
  return newMsg;
}

export function persistAllToDisk(): void {
  try {
    if (!fs.existsSync(STORE_DIR)) {
      fs.mkdirSync(STORE_DIR, { recursive: true });
    }
    const payload = {
      version: 2,
      saved_at: new Date().toISOString(),
      isSampleDataSeeded,
      users: Array.from(permanentUsersMap.values()),
      companies: Array.from(permanentCompaniesMap.values()),
      products: mockProducts,
      inventoryMovements: mockInventoryMovements,
      customers: mockCustomersList,
      suppliers: mockSuppliersList,
      accountTransactions: mockAccountTransactions,
      invoices: mockInvoicesList,
      purchaseInvoices: mockPurchaseInvoicesList,
      payments: mockPaymentsList,
      auditLogs: mockAuditLogsList,
      employees: mockEmployeesList,
      employeeMovements: mockEmployeeMovementsList,
      payrollRecords: mockPayrollRecordsList,
      expenses: mockExpensesList,
      whatsappConfigs: Object.fromEntries(mockWhatsAppConfigsMap),
      whatsappStates: Object.fromEntries(mockWhatsAppStateMap),
    };
    fs.writeFileSync(STORE_FILE, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (err: any) {
    console.warn('[DISK_PERSIST_WARN]', err?.message);
  }
}

export function initPermanentDiskStore(): void {
  try {
    if (!fs.existsSync(STORE_DIR)) {
      fs.mkdirSync(STORE_DIR, { recursive: true });
    }
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8');
      if (raw && raw.trim()) {
        const data = JSON.parse(raw);
        if (Array.isArray(data.users)) {
          data.users.forEach((u: PermanentUserRecord) => {
            if (u && u.email) {
              permanentUsersMap.set(u.email.trim().toLowerCase(), u);
            }
          });
        }
        if (Array.isArray(data.companies)) {
          data.companies.forEach((c: any) => {
            if (c && c.id) {
              permanentCompaniesMap.set(c.id, c);
            }
          });
        }
        if (Array.isArray(data.customers) && data.customers.length > 0) {
          mockCustomersList.length = 0;
          mockCustomersList.push(...data.customers);
        }
        if (Array.isArray(data.suppliers) && data.suppliers.length > 0) {
          mockSuppliersList.length = 0;
          mockSuppliersList.push(...data.suppliers);
        }
        if (Array.isArray(data.products) && data.products.length > 0) {
          mockProducts.length = 0;
          mockProducts.push(...data.products);
        }
        if (Array.isArray(data.inventoryMovements)) {
          mockInventoryMovements.length = 0;
          mockInventoryMovements.push(...data.inventoryMovements);
        }
        if (Array.isArray(data.accountTransactions)) {
          mockAccountTransactions.length = 0;
          mockAccountTransactions.push(...data.accountTransactions);
        }
        if (Array.isArray(data.invoices)) {
          mockInvoicesList.length = 0;
          mockInvoicesList.push(...data.invoices);
        }
        if (Array.isArray(data.purchaseInvoices)) {
          mockPurchaseInvoicesList.length = 0;
          mockPurchaseInvoicesList.push(...data.purchaseInvoices);
        }
        if (Array.isArray(data.payments)) {
          mockPaymentsList.length = 0;
          mockPaymentsList.push(...data.payments);
        }
        if (Array.isArray(data.auditLogs)) {
          mockAuditLogsList.length = 0;
          mockAuditLogsList.push(...data.auditLogs);
        }
        if (Array.isArray(data.employees) && data.employees.length > 0) {
          mockEmployeesList.length = 0;
          mockEmployeesList.push(...data.employees);
        }
        if (Array.isArray(data.employeeMovements)) {
          mockEmployeeMovementsList.length = 0;
          mockEmployeeMovementsList.push(...data.employeeMovements);
        }
        if (Array.isArray(data.payrollRecords)) {
          mockPayrollRecordsList.length = 0;
          mockPayrollRecordsList.push(...data.payrollRecords);
        }
        if (Array.isArray(data.expenses) && data.expenses.length > 0) {
          mockExpensesList.length = 0;
          mockExpensesList.push(...data.expenses);
        }
        if (data.whatsappConfigs && typeof data.whatsappConfigs === 'object') {
          Object.entries(data.whatsappConfigs).forEach(([k, v]) => {
            mockWhatsAppConfigsMap.set(k, v);
          });
        }
        if (data.whatsappStates && typeof data.whatsappStates === 'object') {
          Object.entries(data.whatsappStates).forEach(([k, v]) => {
            mockWhatsAppStateMap.set(k, v);
          });
        }
        if (typeof data.isSampleDataSeeded === 'boolean') {
          isSampleDataSeeded = data.isSampleDataSeeded;
        }
        console.log('[PERMANENT_STORE_RESTORED] Loaded from disk successfully.');
      }
    }
  } catch (err: any) {
    console.warn('[DISK_STORE_INIT_WARN]', err?.message);
  }
}

// PostgreSQL Persistent Schema Initializer
export async function initPermanentPostgresTables(pool: any): Promise<void> {
  if (!pool) return;
  try {
    await pool.query(`
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

      CREATE TABLE IF NOT EXISTS erp_permanent_tenant_data (
        company_id VARCHAR(64) NOT NULL,
        data_type VARCHAR(64) NOT NULL,
        payload JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (company_id, data_type)
      );
    `);

    // Load registered users from database if present
    const res = await pool.query('SELECT * FROM erp_permanent_users');
    if (res && res.rows && res.rows.length > 0) {
      for (const row of res.rows) {
        const normalized = (row.email || '').trim().toLowerCase();
        if (normalized) {
          permanentUsersMap.set(normalized, {
            id: row.id,
            email: normalized,
            password_hash: row.password_hash,
            name: row.name,
            role: row.role || 'ADMIN',
            company_id: row.company_id,
            company_name: row.company_name,
            phone: row.phone || undefined,
            business_mode: row.business_mode || undefined,
            created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
            metadata: row.metadata,
          });
        }
      }
      console.log(`[PG_USERS_LOADED] Loaded ${res.rows.length} permanent accounts from PostgreSQL.`);
    }

    // Load WhatsApp configurations and states from database if present
    const tenantDataRes = await pool.query("SELECT * FROM erp_permanent_tenant_data WHERE data_type IN ('whatsapp_config', 'whatsapp_state')");
    if (tenantDataRes && tenantDataRes.rows && tenantDataRes.rows.length > 0) {
      for (const row of tenantDataRes.rows) {
        if (row.data_type === 'whatsapp_config' && row.company_id && row.payload) {
          mockWhatsAppConfigsMap.set(row.company_id, row.payload);
        } else if (row.data_type === 'whatsapp_state' && row.company_id && row.payload) {
          mockWhatsAppStateMap.set(row.company_id, row.payload);
        }
      }
      console.log(`[PG_WHATSAPP_DATA_LOADED] Loaded ${tenantDataRes.rows.length} WhatsApp tenant records.`);
    }
  } catch (err: any) {
    console.warn('[PG_PERMANENT_TABLES_INIT_WARN]', err?.message);
  }
}

export async function saveUserToPermanentStore(user: PermanentUserRecord, pool?: any): Promise<void> {
  const normalized = user.email.trim().toLowerCase();
  permanentUsersMap.set(normalized, user);
  persistAllToDisk();

  if (pool) {
    try {
      await pool.query(
        `INSERT INTO erp_permanent_users (id, email, password_hash, name, role, company_id, company_name, phone, business_mode, created_at, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (email)
         DO UPDATE SET 
           password_hash = EXCLUDED.password_hash,
           name = EXCLUDED.name,
           company_name = EXCLUDED.company_name,
           phone = EXCLUDED.phone,
           business_mode = EXCLUDED.business_mode,
           metadata = EXCLUDED.metadata`,
        [
          user.id,
          normalized,
          user.password_hash,
          user.name,
          user.role,
          user.company_id,
          user.company_name,
          user.phone || null,
          user.business_mode || null,
          user.created_at || new Date().toISOString(),
          JSON.stringify(user.metadata || {}),
        ]
      );
    } catch (err: any) {
      console.warn('[PG_USER_PERSIST_WARN]', err?.message);
    }
  }
}

export async function saveCompanyToPermanentStore(company: any, pool?: any): Promise<void> {
  if (!company || !company.id) return;
  permanentCompaniesMap.set(company.id, company);
  persistAllToDisk();

  if (pool) {
    try {
      await pool.query(
        `INSERT INTO companies (id, name, currency, status)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, currency = EXCLUDED.currency`,
        [company.id, company.name, company.currency || 'SAR', company.status || 'ACTIVE']
      );
    } catch (err: any) {
      console.warn('[PG_COMPANY_PERSIST_WARN]', err?.message);
    }
  }
}

export async function rehydrateTenantData(payload: any, pool?: any): Promise<{ success: boolean; message: string }> {
  if (!payload || typeof payload !== 'object') {
    return { success: false, message: 'بيانات غير صالحة' };
  }

  // 1. Rehydrate user
  if (payload.user && payload.user.email) {
    const userRec: PermanentUserRecord = {
      id: payload.user.id || `usr_${Date.now()}`,
      email: payload.user.email.trim().toLowerCase(),
      password_hash: payload.password || payload.user.password_hash || payload.password_hash || 'admin123',
      name: payload.user.full_name || payload.user.name || 'المدير العام',
      role: payload.user.role || 'ADMIN',
      company_id: payload.company?.id || payload.user.company_id || 'comp_001',
      company_name: payload.company?.name || payload.companyName || payload.user.company_name || 'المؤسسة التجارية',
      phone: payload.user.phone || payload.phone,
      business_mode: payload.business_mode || payload.user.business_mode,
      created_at: payload.user.created_at || new Date().toISOString(),
    };
    await saveUserToPermanentStore(userRec, pool);
  }

  // 2. Rehydrate company
  if (payload.company && payload.company.id) {
    await saveCompanyToPermanentStore(payload.company, pool);
  }

  // 3. Rehydrate collections if provided
  if (Array.isArray(payload.customers) && payload.customers.length > 0) {
    mockCustomersList.length = 0;
    mockCustomersList.push(...payload.customers);
  }
  if (Array.isArray(payload.suppliers) && payload.suppliers.length > 0) {
    mockSuppliersList.length = 0;
    mockSuppliersList.push(...payload.suppliers);
  }
  if (Array.isArray(payload.products) && payload.products.length > 0) {
    mockProducts.length = 0;
    mockProducts.push(...payload.products);
  }
  if (Array.isArray(payload.invoices) && payload.invoices.length > 0) {
    mockInvoicesList.length = 0;
    mockInvoicesList.push(...payload.invoices);
  }
  if (Array.isArray(payload.purchaseInvoices) && payload.purchaseInvoices.length > 0) {
    mockPurchaseInvoicesList.length = 0;
    mockPurchaseInvoicesList.push(...payload.purchaseInvoices);
  }
  if (Array.isArray(payload.payments) && payload.payments.length > 0) {
    mockPaymentsList.length = 0;
    mockPaymentsList.push(...payload.payments);
  }
  if (Array.isArray(payload.accountTransactions) && payload.accountTransactions.length > 0) {
    mockAccountTransactions.length = 0;
    mockAccountTransactions.push(...payload.accountTransactions);
  }
  if (Array.isArray(payload.employees) && payload.employees.length > 0) {
    mockEmployeesList.length = 0;
    mockEmployeesList.push(...payload.employees);
  }
  if (Array.isArray(payload.employeeMovements) && payload.employeeMovements.length > 0) {
    mockEmployeeMovementsList.length = 0;
    mockEmployeeMovementsList.push(...payload.employeeMovements);
  }
  if (Array.isArray(payload.payrollRecords) && payload.payrollRecords.length > 0) {
    mockPayrollRecordsList.length = 0;
    mockPayrollRecordsList.push(...payload.payrollRecords);
  }
  if (Array.isArray(payload.expenses) && payload.expenses.length > 0) {
    mockExpensesList.length = 0;
    mockExpensesList.push(...payload.expenses);
  }

  const companyId = payload.company?.id || payload.user?.company_id || 'comp_001';
  if (payload.whatsappConfig || payload.whatsapp_config) {
    await saveTenantWhatsAppConfig(companyId, payload.whatsappConfig || payload.whatsapp_config, pool);
  }
  if (payload.whatsappState || payload.whatsapp_state) {
    await saveTenantWhatsAppState(companyId, payload.whatsappState || payload.whatsapp_state, pool);
  }

  persistAllToDisk();

  return {
    success: true,
    message: 'تمت استعادة ومزامنة بيانات الحساب والمتجر الدائمة بنجاح.',
  };
}

export async function deletePermanentAccount(email: string, password: string, pool?: any): Promise<{ success: boolean; message: string }> {
  const normalized = (email || '').trim().toLowerCase();
  const user = permanentUsersMap.get(normalized);
  if (!user) {
    return { success: false, message: 'الحساب غير موجود' };
  }
  if (user.password_hash && user.password_hash !== password) {
    return { success: false, message: 'كلمة المرور غير صحيحة، تعذر حذف الحساب' };
  }

  permanentUsersMap.delete(normalized);
  persistAllToDisk();

  if (pool) {
    try {
      await pool.query('DELETE FROM erp_permanent_users WHERE email = $1', [normalized]);
    } catch (err: any) {
      console.warn('[PG_DELETE_USER_WARN]', err?.message);
    }
  }

  return { success: true, message: 'تم حذف الحساب نهائياً بنجاح.' };
}

// Automatically initialize from disk on module import
initPermanentDiskStore();
