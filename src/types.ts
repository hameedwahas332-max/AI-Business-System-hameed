export interface Company {
  id: string;
  name: string;
  commercialRegister?: string;
  taxNumber?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  currency?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: string;
  username: string;
  full_name?: string;
  email: string;
  role: string;
  company_id: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Role {
  id: string;
  name: string;
  name_ar?: string;
  description?: string;
  permissions?: (string | any)[];
  created_at?: string;
}

export interface Permission {
  id?: string;
  code?: string;
  name?: string;
  name_ar?: string;
  category?: string;
  description?: string;
}

export interface Customer {
  id: string;
  company_id?: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  balance?: number;
  credit_limit?: number;
  creditLimit?: number;
  priceTier?: PriceTier;
  tax_number?: string;
  created_at?: string;
}

export interface Supplier {
  id: string;
  company_id?: string;
  name: string;
  phone?: string;
  email?: string;
  category?: string;
  balance?: number;
  tax_number?: string;
  created_at?: string;
}

export type ProductActivityType = 'food' | 'battery' | 'tire' | 'oil' | 'fuel' | 'general';
export type PriceTier = 'retail' | 'half_wholesale' | 'wholesale' | 'vip';

export interface Product {
  id: string;
  sku: string;
  barcode?: string;
  name: string;
  category?: string;
  activityType?: ProductActivityType;
  price: number; // Base retail price
  cost_price?: number;
  qty: number;
  min_qty?: number;
  status?: string;

  // Dynamic Item Code & Spare Part Number
  itemCode?: string; // رقم الصنف / المنتج
  partNumber?: string; // رقم القطعة (OEM)

  // Multi-UOM & Tiered Pricing
  baseUnitName?: string; // e.g. حبة
  retailPrice?: number;
  halfWholesalePrice?: number;
  wholesalePrice?: number;
  vipPrice?: number;

  subUnitName?: string; // e.g. باكت / درزن
  subUnitFactor?: number; // e.g. 12
  subUnitPrice?: number;
  subUnitBarcode?: string;

  majorUnitName?: string; // e.g. كرتون / برميل
  majorUnitFactor?: number; // e.g. 24
  majorUnitPrice?: number;
  majorUnitBarcode?: string;

  // Food / Expiry Tracking
  batchNumber?: string;
  productionDate?: string;
  expiryDate?: string;

  // Battery / Electronics Spec
  batterySpec?: string; // e.g. 70Ah - 12V
  warrantyMonths?: number; // e.g. 12
  scrapDiscountValue?: number; // e.g. 5000 YER / 50 SAR
  requiresSerial?: boolean;

  // Tires Spec (قسم الإطارات والكفرات)
  tireSize?: string; // مقاس الإطار e.g. 205/55 R16, 265/65 R17
  tireProductionDot?: string; // أسبوع وسنة صنع الإطار DOT e.g. الأسبوع 40 - 2025
  tirePlyOrigin?: string; // بلد المنشأ والغاط والنقشة e.g. ياباني - 8 غاط

  // Oil / Auto Parts Spec
  viscosityGrade?: string; // e.g. 20W-50, 10W-40, 5W-30
  oemCode?: string;
  litersPerUnit?: number;

  // Fuel & Gas Station Spec (محطة الوقود والغاز)
  fuelType?: 'petrol_91' | 'petrol_95' | 'diesel' | 'gas';
  tankId?: string;
  meterId?: string;
  density?: number;

  created_at?: string;
}

export interface FuelTank {
  id: string;
  tankNumber: string;
  name: string;
  fuelType: 'petrol_91' | 'petrol_95' | 'diesel' | 'gas';
  capacityLiters: number;
  currentStockLiters: number;
  safeThresholdLiters: number;
  density?: number;
  lastDipReadingLiters?: number;
  lastDipDate?: string;
}

export interface FuelPumpMeter {
  id: string;
  tankId: string;
  pumpNumber: string;
  pumpName: string;
  meterCode: string;
  fuelType: 'petrol_91' | 'petrol_95' | 'diesel' | 'gas';
  pricePerLiter: number;
  previousReading: number;
  currentReading: number;
  calibrationLiters: number;
  notes?: string;
}

export interface FuelShiftRecord {
  id: string;
  shiftNumber: string;
  shiftDate: string;
  shiftType: 'MORNING' | 'EVENING' | 'NIGHT';
  attendantName: string;
  meterReadings: Array<{
    pumpId: string;
    pumpName: string;
    meterCode: string;
    fuelType: string;
    previousReading: number;
    currentReading: number;
    calibrationLiters: number;
    dispensedLiters: number;
    pricePerLiter: number;
    totalAmount: number;
  }>;
  totalLitersDispensed: number;
  totalExpectedSales: number;
  actualCashReceived: number;
  varianceAmount: number; // positive = surplus, negative = shortage
  tankDipReadings?: Array<{
    tankId: string;
    tankName: string;
    openingLiters: number;
    deliveredLiters: number;
    dispensedLiters: number;
    theoreticalRemaining: number;
    actualDipLiters: number;
    tankVarianceLiters: number;
  }>;
  notes?: string;
  status: 'DRAFT' | 'CONFIRMED' | 'POSTED_TO_LEDGER';
  created_at?: string;
}

export interface Invoice {
  id: string;
  company_id?: string;
  customer_id?: string;
  customer?: string;
  customer_name?: string;
  date: string;
  subtotal?: number;
  tax_amount?: number;
  total_amount?: number;
  amount?: number;
  status: string;
  payment_method?: string;
  items?: any[];
  created_at?: string;
}

export interface Payment {
  id: string;
  company_id?: string;
  type: 'RECEIPT' | 'PAYMENT';
  reference_number?: string;
  party_type?: 'CUSTOMER' | 'SUPPLIER';
  party_id?: string;
  party_name?: string;
  amount: number;
  payment_method: string;
  date: string;
  notes?: string;
  created_at?: string;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string | any;
  message?: string;
  status?: number;
  pagination?: any;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  company?: Company;
  error?: string;
}

export interface AuditLog {
  id: string;
  company_id?: string;
  user_id?: string;
  username?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface SystemBackup {
  id: string;
  company_id?: string;
  filename?: string;
  file_name?: string;
  file_size?: number;
  records_count?: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'VERIFIED' | 'FAILED';
  storage_provider?: string;
  backup_type?: string;
  metadata?: any;
  created_at: string;
  created_by?: string;
}

export interface BackupStats {
  totalBackups: number;
  successfulBackups: number;
  totalSizeBytes: number;
  lastBackupDate?: string;
  isB2Connected?: boolean;
}

export interface POSCartItem {
  id: string;
  product_id?: string;
  name: string;
  sku?: string;
  barcode?: string;
  price: number;
  retailPrice?: number;
  quantity: number;
  cost?: number;
  tax?: number;
  discount?: number;
  total: number;
  selectedUnit?: 'base' | 'sub' | 'major';
  unitName?: string;
  unitFactor?: number;
  serialNumber?: string;
  warrantyMonths?: number;
  warrantyEndDate?: string;
  scrapDiscount?: number;
  isScrapItem?: boolean;
  activityType?: ProductActivityType;
  [key: string]: any;
}

export interface POSShift {
  id: string;
  shift_number?: string;
  user_id?: string;
  user_name?: string;
  started_at: string;
  ended_at?: string | null;
  opening_cash: number;
  closing_cash?: number | null;
  expected_cash?: number;
  cash_difference?: number;
  status: 'OPEN' | 'CLOSED';
  notes?: string;
}

export interface POSHeldSale {
  id: string;
  reference_no?: string;
  customer?: any;
  customer_id?: string | null;
  customer_name?: string | null;
  items?: POSCartItem[];
  cart_data?: POSCartItem[];
  held_at: string;
  total: number;
  note?: string;
  [key: string]: any;
}

export interface POSPaymentSplit {
  method: 'CASH' | 'CARD' | 'TRANSFER' | 'CREDIT' | 'WALLET' | 'CHECK';
  amount: number;
  reference?: string;
  wallet_provider?: string;
}

