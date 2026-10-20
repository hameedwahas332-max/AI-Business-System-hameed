import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { S3Client, HeadBucketCommand, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

const { Pool } = pg;
const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.disable('x-powered-by');

// Trust first proxy in production / Cloud Run
if (process.env.K_SERVICE || process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Basic Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Database Pool Setup (Neon PostgreSQL)
let dbPool: pg.Pool | null = null;
const rawDbUrl = (process.env.DATABASE_URL || '').trim();

if (rawDbUrl.startsWith('postgres://') || rawDbUrl.startsWith('postgresql://')) {
  try {
    const sanitizedUrl = rawDbUrl.replace(/[?&]channel_binding=[^&]*/g, '').replace(/\?&/, '?').replace(/\?$/, '');
    dbPool = new Pool({
      connectionString: sanitizedUrl,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
    });
    dbPool.on('error', (err) => {
      console.warn('[DB_POOL_WARN]', err?.message || err);
    });
  } catch (err: any) {
    console.warn('[DB_INIT_WARN] Database pool initialization failed:', err?.message || err);
  }
}

// Backblaze B2 S3 Client Setup
const b2Endpoint = (process.env.B2_ENDPOINT || 'https://s3.us-east-005.backblazeb2.com').trim();
const b2Region = (process.env.B2_REGION || 'us-east-005').replace(/ai-business-system-backups?/, 'us-east-005').trim();
const b2Bucket = (process.env.B2_BUCKET || 'ai-business-system-backups').replace(/^ai-business-system-backup$/, 'ai-business-system-backups').trim();
const b2KeyId = (process.env.B2_KEY_ID || '').trim();
const b2AppKey = (process.env.B2_APPLICATION_KEY || '').trim();

let s3Client: S3Client | null = null;
if (b2KeyId && b2AppKey) {
  s3Client = new S3Client({
    region: b2Region,
    endpoint: b2Endpoint.startsWith('http') ? b2Endpoint : `https://${b2Endpoint}`,
    credentials: {
      accessKeyId: b2KeyId,
      secretAccessKey: b2AppKey,
    },
    forcePathStyle: false,
  });
}

// 0. Top-Level Health Probes
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', async (_req: Request, res: Response) => {
  let dbStatus = 'disconnected';
  if (dbPool) {
    try {
      await dbPool.query('SELECT 1');
      dbStatus = 'connected';
    } catch {
      dbStatus = 'error';
    }
  }

  let b2Status = 'unconfigured';
  if (s3Client) {
    try {
      await s3Client.send(new HeadBucketCommand({ Bucket: b2Bucket }));
      b2Status = 'pass';
    } catch {
      b2Status = 'degraded';
    }
  }

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: { connected: dbStatus === 'connected', provider: 'postgres' },
    storageHealth: { provider: 'B2', connectivity: b2Status },
  });
});

// 1. Classic ERP API Routes
app.post('/api/v1/auth/register', (req: Request, res: Response) => {
  const { companyName, fullName, email, password, phone, currency } = req.body || {};
  const companyId = `comp_${Date.now()}`;
  const userId = `usr_${Date.now()}`;
  const token = `jwt_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const company = {
    id: companyId,
    name: companyName || 'مؤسسة تجارية جديدة',
    currency: currency || 'SAR',
    phone: phone || '',
    email: email || '',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
  };

  const user = {
    id: userId,
    username: email || 'admin',
    full_name: fullName || 'المدير العام',
    email: email || 'admin@example.com',
    role: 'ADMIN',
    company_id: companyId,
    is_active: true,
    created_at: new Date().toISOString(),
  };

  res.status(200).json({
    success: true,
    token,
    user,
    company,
  });
});

app.post('/api/v1/auth/login', (req: Request, res: Response) => {
  const { email } = req.body || {};
  const token = `jwt_${Date.now()}`;
  res.status(200).json({
    success: true,
    token,
    user: {
      id: 'usr_admin',
      username: email || 'admin',
      full_name: 'المدير العام',
      email: email || 'admin@erp.local',
      role: 'ADMIN',
      company_id: 'comp_default',
      is_active: true,
    },
    company: {
      id: 'comp_default',
      name: 'مؤسسة السحابي للتجارة والتقنية',
      currency: 'SAR',
      status: 'ACTIVE',
    },
  });
});

app.get('/api/v1/auth/me', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    user: {
      id: 'usr_admin',
      username: 'admin',
      full_name: 'المدير العام',
      email: 'admin@erp.local',
      role: 'ADMIN',
      company_id: 'comp_default',
      is_active: true,
    },
    company: {
      id: 'comp_default',
      name: 'مؤسسة السحابي للتجارة والتقنية',
      currency: 'SAR',
      status: 'ACTIVE',
    },
  });
});

app.get('/api/v1/ai/insights', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: [
      {
        id: 'ins-1',
        category: 'FACT',
        impact: 'HIGH',
        title: 'نمو المبيعات وصافي التدفق النقدي',
        description: 'إجمالي مبيعات الشهر الحالي وصل إلى 142,500 ر.س بنمو إيجابي قدره 14.2% مع ثبات في التدفقات النقدية المحصلة.',
        actionableStep: 'تعزيز توريد الأصناف الخمسة الأكثر طلباً لتجنب نفاد المخزون.',
      },
      {
        id: 'ins-2',
        category: 'CALCULATION',
        impact: 'HIGH',
        title: 'ملاءة السيولة ومعدل تغطية الديون',
        description: 'السيولة الحالية في الصندوق والبنوك والمحافظ تغطي 2.4 أضعاف التزامات الموردين المستحقة خلال 30 يوماً.',
        actionableStep: 'استغلال وفرة السيولة للاستفادة من خصومات السداد النقدي المعجل لدى الموردين.',
      },
      {
        id: 'ins-3',
        category: 'INTERPRETATION',
        impact: 'MEDIUM',
        title: 'فرص تحصيل الذمم المتأخرة',
        description: 'توجد ذمم متأخرة تجاوزت 30 يوماً بقيمة 4,200 ر.س يمكن استردادها عبر إشعارات واتساب الآلية.',
        actionableStep: 'إرسال تذكيرات سداد ذكية عبر WhatsApp للعملاء المستهدفين.',
      },
    ],
  });
});

app.get('/api/v1/pos/ai-insights', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      topSellingToday: [
        { name: 'شاي سيلاني فاخر 100 كيس', qty: 32, total: 592 },
        { name: 'قهوة عربية بالهيل 500جم', qty: 18, total: 756 },
        { name: 'أرز بسمتي هندي 5 كجم', qty: 14, total: 770 },
      ],
      lowStockAlerts: [
        { name: 'أرز بسمتي هندي 5 كجم', current_stock: 14, min_stock: 20 },
      ],
      topDebtors: [
        { name: 'مؤسسة الأفق للتجارة', balance: 8200 },
        { name: 'شركة الوفاق المحدودة', balance: 5400 },
      ],
    },
  });
});

app.get('/api/v1/customers', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: [
      { id: '1', name: 'مؤسسة الأفق للتجارة', phone: '0501234567', balance: 8200, creditLimit: 20000, current_balance: 8200 },
      { id: '2', name: 'شركة الوفاق المحدودة', phone: '0559876543', balance: 5400, creditLimit: 50000, current_balance: 5400 },
      { id: '3', name: 'مجمع الرياض الطبي', phone: '0543322110', balance: 4600, creditLimit: 30000, current_balance: 4600 },
    ],
  });
});

app.get('/api/v1/suppliers', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: [
      { id: '1', name: 'شركة التوريدات الوطنية الكبرى', category: 'أغذية ومواد استهلاكية', balance: 14200, current_balance: 14200 },
      { id: '2', name: 'مؤسسة الاستيراد المباشر', category: 'معدات ومستلزمات تشغيل', balance: 4000, current_balance: 4000 },
    ],
  });
});

app.get('/api/v1/products', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: [
      { id: 'prod-1', sku: 'TEA-01', name: 'شاي سيلاني فاخر 100 كيس', qty: 240, current_stock: 240, price: 18.5, retail_price: 18.5, cost_price: 13.0, status: 'متوفر', activityType: 'food' },
      { id: 'prod-2', sku: 'COF-02', name: 'قهوة عربية بالهيل 500جم', qty: 85, current_stock: 85, price: 42.0, retail_price: 42.0, cost_price: 31.0, status: 'متوفر', activityType: 'food' },
      { id: 'prod-3', sku: 'RIC-03', name: 'أرز بسمتي هندي 5 كجم', qty: 14, current_stock: 14, price: 55.0, retail_price: 55.0, cost_price: 43.0, status: 'منخفض', activityType: 'food' },
      { id: 'prod-4', sku: 'BAT-70', name: 'بطارية هانكوك 70 أمبير جافة', qty: 28, current_stock: 28, price: 290.0, retail_price: 290.0, cost_price: 220.0, status: 'متوفر', activityType: 'battery', batterySpec: '70Ah - 12V', warrantyMonths: 12 },
      { id: 'prod-5', sku: 'OIL-20W50', name: 'زيت محرك بترومين سوبر 20W-50 (4 لتر)', qty: 65, current_stock: 65, price: 75.0, retail_price: 75.0, cost_price: 54.0, status: 'متوفر', activityType: 'oil', viscosityGrade: '20W-50' },
    ],
  });
});

app.get('/api/v1/invoices', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: [
      { id: 'INV-2026-0042', invoice_number: 'INV-2026-0042', customer: 'مؤسسة الأفق للتجارة', customer_name: 'مؤسسة الأفق للتجارة', date: '2026-10-18', total: 1667.5, amount: 1667.5, paid_amount: 1667.5, status: 'مدفوعة' },
      { id: 'INV-2026-0041', invoice_number: 'INV-2026-0041', customer: 'شركة الوفاق المحدودة', customer_name: 'شركة الوفاق المحدودة', date: '2026-10-18', total: 943.0, amount: 943.0, paid_amount: 943.0, status: 'مدفوعة' },
      { id: 'INV-2026-0040', invoice_number: 'INV-2026-0040', customer: 'عميل كاشير نقدي', customer_name: 'عميل كاشير نقدي', date: '2026-10-18', total: 207.0, amount: 207.0, paid_amount: 207.0, status: 'مدفوعة' },
    ],
  });
});

app.post('/api/v1/invoices', (req: Request, res: Response) => {
  const inv = req.body || {};
  res.status(201).json({
    success: true,
    data: {
      ...inv,
      id: inv.id || `INV-${Date.now()}`,
      created_at: new Date().toISOString(),
    },
  });
});

app.get('/api/v1/purchase-invoices', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: [
      { id: 'PUR-2026-0012', invoice_number: 'PUR-2026-0012', supplier_name: 'شركة التوريدات الوطنية الكبرى', invoice_date: '2026-10-17', total: 14200, paid_amount: 10000, remaining_amount: 4200, status: 'PARTIAL' },
      { id: 'PUR-2026-0011', invoice_number: 'PUR-2026-0011', supplier_name: 'مؤسسة الاستيراد المباشر', invoice_date: '2026-10-15', total: 5800, paid_amount: 5800, remaining_amount: 0, status: 'PAID' },
    ],
  });
});

app.post('/api/v1/purchase-invoices', (req: Request, res: Response) => {
  const pur = req.body || {};
  res.status(201).json({
    success: true,
    data: {
      ...pur,
      id: pur.id || `PUR-${Date.now()}`,
      created_at: new Date().toISOString(),
    },
  });
});

app.get('/api/v1/payments', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: [
      { id: 'PMT-001', type: 'CUSTOMER_PAYMENT', voucher_number: 'VOUCH-1001', customer_name: 'مؤسسة الأفق للتجارة', amount: 5000, currency: 'SAR', payment_method: 'CASH', payment_date: '2026-10-18', status: 'CONFIRMED' },
      { id: 'PMT-002', type: 'SUPPLIER_PAYMENT', voucher_number: 'VOUCH-1002', supplier_name: 'شركة التوريدات الوطنية الكبرى', amount: 10000, currency: 'SAR', payment_method: 'BANK_TRANSFER', payment_date: '2026-10-18', status: 'CONFIRMED' },
    ],
  });
});

app.post('/api/v1/payments', (req: Request, res: Response) => {
  const pmt = req.body || {};
  res.status(201).json({
    success: true,
    data: {
      ...pmt,
      id: pmt.id || `PMT-${Date.now()}`,
      voucher_number: pmt.voucher_number || `VOUCH-${Math.floor(1000 + Math.random() * 9000)}`,
      created_at: new Date().toISOString(),
    },
  });
});

app.get('/api/v1/financial-health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      totalSales: 142500,
      totalPurchases: 84200,
      totalReceivables: 24500,
      totalPayables: 18200,
      cashAndBankBalance: 62400,
      inventoryValue: 78500,
      netProfit: 40300,
    },
  });
});

app.get('/api/v1/payment-stats', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      todayReceipts: 14500,
      todayDisbursements: 8200,
      todayExpenses: 1200,
      cashOnHand: 28400,
      bankBalance: 34000,
    },
  });
});

app.get('/api/v1/reports', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      salesTotal: 142500,
      purchasesTotal: 84200,
      netProfit: 58300,
      vatPayable: 8745,
    },
  });
});

app.get('/api/v1/reports/sales', (req: Request, res: Response) => {
  const groupBy = req.query.group_by || 'by_month';
  let rows = [];
  if (groupBy === 'by_month') {
    rows = [
      { groupName: 'أكتوبر 2026', subtotal: 135000, discount: 5000, tax: 19500, total: 149500, paid: 130000, outstanding: 19500 },
      { groupName: 'سبتمبر 2026', subtotal: 122000, discount: 4200, tax: 17670, total: 135470, paid: 128000, outstanding: 7470 },
      { groupName: 'أغسطس 2026', subtotal: 110000, discount: 3500, tax: 15975, total: 122475, paid: 122475, outstanding: 0 },
    ];
  } else if (groupBy === 'by_product') {
    rows = [
      { groupName: 'شاي سيلاني فاخر 100 كيس', subtotal: 45000, discount: 1500, tax: 6525, total: 50025, paid: 48000, outstanding: 2025 },
      { groupName: 'بطارية هانكوك 70 أمبير', subtotal: 38000, discount: 1200, tax: 5520, total: 42320, paid: 35000, outstanding: 7320 },
      { groupName: 'زيت محرك بترومين 20W-50', subtotal: 29000, discount: 900, tax: 4215, total: 32315, paid: 30000, outstanding: 2315 },
    ];
  } else {
    rows = [
      { groupName: 'مؤسسة الأفق للتجارة', subtotal: 58000, discount: 2000, tax: 8400, total: 64400, paid: 56200, outstanding: 8200 },
      { groupName: 'شركة الوفاق المحدودة', subtotal: 42000, discount: 1500, tax: 6075, total: 46575, paid: 41175, outstanding: 5400 },
      { groupName: 'عملاء الكاشير والنقدي', subtotal: 35000, discount: 1000, tax: 5100, total: 39100, paid: 39100, outstanding: 0 },
    ];
  }

  res.json({
    success: true,
    data: rows,
  });
});

app.get('/api/v1/reports/purchases', (req: Request, res: Response) => {
  const groupBy = req.query.group_by || 'by_month';
  let rows = [];
  if (groupBy === 'by_month') {
    rows = [
      { groupName: 'أكتوبر 2026', subtotal: 78000, discount: 2500, tax: 11325, total: 86825, paid: 72000, outstanding: 14825 },
      { groupName: 'سبتمبر 2026', subtotal: 65000, discount: 1800, tax: 9480, total: 72680, paid: 70000, outstanding: 2680 },
    ];
  } else {
    rows = [
      { groupName: 'شركة التوريدات الوطنية الكبرى', subtotal: 54000, discount: 1800, tax: 7830, total: 60030, paid: 45830, outstanding: 14200 },
      { groupName: 'مؤسسة الاستيراد المباشر', subtotal: 24000, discount: 700, tax: 3495, total: 26795, paid: 22795, outstanding: 4000 },
    ];
  }

  res.json({
    success: true,
    data: rows,
  });
});

app.get('/api/v1/reports/profit-loss', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      revenue: 142500,
      cogs: 72200,
      grossProfit: 70300,
      operatingExpenses: 18500,
      netProfit: 51800,
    },
  });
});

app.get('/api/v1/reports/receivables', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      totalReceivables: 18200,
      customerAging: [
        { name: 'مؤسسة الأفق للتجارة', phone: '0501234567', currentBalance: 8200, b0_30: 5200, b31_60: 2000, b61_90: 1000, b90_plus: 0 },
        { name: 'شركة الوفاق المحدودة', phone: '0559876543', currentBalance: 5400, b0_30: 3400, b31_60: 2000, b61_90: 0, b90_plus: 0 },
        { name: 'مجمع الرياض الطبي', phone: '0543322110', currentBalance: 4600, b0_30: 2600, b31_60: 1500, b61_90: 500, b90_plus: 0 },
      ],
    },
  });
});

app.get('/api/v1/reports/payables', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      totalPayables: 18200,
      supplierAging: [
        { name: 'شركة التوريدات الوطنية الكبرى', phone: '0511122334', currentBalance: 14200, b0_30: 8200, b31_60: 4000, b61_90: 2000, b90_plus: 0 },
        { name: 'مؤسسة الاستيراد المباشر', phone: '0522233445', currentBalance: 4000, b0_30: 2500, b31_60: 1500, b61_90: 0, b90_plus: 0 },
      ],
    },
  });
});

app.get('/api/v1/reports/cash-flow', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      inflows: 142500,
      outflows: 90700,
      netCashFlow: 51800,
    },
  });
});

app.get('/api/v1/reports/inventory', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      totalProductsCount: 148,
      totalValuation: 78500,
      lowStockCount: 3,
    },
  });
});

app.get('/api/v1/reports/trial-balance', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      totalDebit: 320000,
      totalCredit: 320000,
      balanced: true,
      accounts: [
        { code: '101', name: 'الصندوق الرئيسي', debit: 28400, credit: 0 },
        { code: '102', name: 'الحسابات البنكية', debit: 34000, credit: 0 },
        { code: '105', name: 'المدينون والعملاء', debit: 18200, credit: 0 },
        { code: '107', name: 'مخزون البضائع', debit: 78500, credit: 0 },
        { code: '201', name: 'الدائنون والموردون', debit: 0, credit: 18200 },
        { code: '301', name: 'رأس المال', debit: 0, credit: 100000 },
        { code: '401', name: 'إيرادات المبيعات', debit: 0, credit: 142500 },
        { code: '501', name: 'تكلفة المبيعات والمشتريات', debit: 84200, credit: 0 },
        { code: '502', name: 'المصروفات التشغيلية', debit: 17400, credit: 0 },
      ],
    },
  });
});

app.get('/api/v1/reports/balance-sheet', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      assets: {
        currentAssets: 159100,
        fixedAssets: 85000,
        totalAssets: 244100,
      },
      liabilities: {
        currentLiabilities: 18200,
        longTermLiabilities: 0,
        totalLiabilities: 18200,
      },
      equity: {
        capital: 100000,
        retainedEarnings: 125900,
        totalEquity: 225900,
      },
      balanced: true,
    },
  });
});

app.get('/api/v1/reports/income-statement', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      revenue: 142500,
      cogs: 72200,
      grossProfit: 70300,
      expenses: 18500,
      netIncome: 51800,
    },
  });
});

app.get('/api/v1/reports/tax', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      taxableSales: 142500,
      outputVat: 21375,
      taxablePurchases: 84200,
      inputVat: 12630,
      netVatPayable: 8745,
    },
  });
});

app.get('/api/v1/reports/executive-summary', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      revenue: 142500,
      netProfit: 51800,
      grossMargin: '49.3%',
      activeCustomers: 48,
      inventoryTurnover: 4.2,
      liquidityRatio: 3.4,
    },
  });
});

app.get('/api/v1/reports/dashboard', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      salesTotal: 142500,
      purchasesTotal: 84200,
      netProfit: 58300,
      vatPayable: 8745,
      receivables: 18200,
      payables: 18200,
    },
  });
});

app.get('/api/v1/reports/top-performance', (req: Request, res: Response) => {
  const limit = parseInt((req.query.limit as string) || '5', 10);
  res.json({
    success: true,
    data: {
      topSellingProducts: [
        { name: 'شاي سيلاني فاخر 100 كيس', salesAmount: 45000, units: 2432 },
        { name: 'بطارية هانكوك 70 أمبير', salesAmount: 38000, units: 131 },
        { name: 'زيت محرك بترومين 20W-50', salesAmount: 29000, units: 386 },
      ].slice(0, limit),
      topCustomers: [
        { name: 'مؤسسة الأفق للتجارة', totalPurchases: 58000 },
        { name: 'شركة الوفاق المحدودة', totalPurchases: 42000 },
      ].slice(0, limit),
    },
  });
});

app.get('/api/v1/roles', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: [
      { id: 'role-1', name: 'admin', name_ar: 'المدير العام', description: 'صلاحيات كاملة على كافة وحدات النظام', permissions: ['*'] },
      { id: 'role-2', name: 'accountant', name_ar: 'المحاسب المالي', description: 'إدارة القيود والفواتير والحسابات', permissions: ['invoices:*', 'payments:*', 'reports:*'] },
      { id: 'role-3', name: 'cashier', name_ar: 'كاشير نقاط البيع', description: 'إصدار فواتير نقاط البيع وسندات القبض', permissions: ['pos:*', 'invoices:create'] },
    ],
  });
});

app.get('/api/v1/permissions', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: [
      { id: 'p-1', code: 'invoices:read', name_ar: 'استعراض فواتير المبيعات' },
      { id: 'p-2', code: 'invoices:create', name_ar: 'إصدار فواتير المبيعات' },
      { id: 'p-3', code: 'payments:create', name_ar: 'تسجيل سندات القبض والصرف' },
      { id: 'p-4', code: 'inventory:adjust', name_ar: 'تسوية الجرد المخزني' },
    ],
  });
});

app.get('/api/v1/audit-logs', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: [
      { id: 'log-1', username: 'admin', action: 'CREATE_INVOICE', resource_type: 'INVOICE', resource_id: 'INV-2026-0042', details: 'إصدار فاتورة ضريبية', ip_address: '127.0.0.1', created_at: new Date().toISOString() },
      { id: 'log-2', username: 'admin', action: 'RECORD_PAYMENT', resource_type: 'PAYMENT', resource_id: 'PMT-001', details: 'تحصيل سند قبض 5000 ر.س', ip_address: '127.0.0.1', created_at: new Date(Date.now() - 3600000).toISOString() },
    ],
  });
});

app.get('/api/v1/backups', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    provider: 'b2',
    bucket: b2Bucket,
    region: b2Region,
    configured: Boolean(s3Client),
    lastBackup: new Date().toISOString(),
  });
});

// Guard: ANY unmatched /api/* route MUST respond with JSON 404, NEVER HTML
app.all('/api/*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `API route ${req.method} ${req.path} not found`,
    status: 404,
  });
});

// 2. Resilient Static Serving & SPA Fallback
const distPath = path.join(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

app.get('*', (_req: Request, res: Response) => {
  const distIndex = path.join(distPath, 'index.html');
  const rootIndex = path.join(process.cwd(), 'index.html');

  if (fs.existsSync(distIndex)) {
    return res.sendFile(distIndex, (err) => {
      if (err && !res.headersSent) {
        if (fs.existsSync(rootIndex)) {
          res.sendFile(rootIndex);
        } else {
          res.status(200).send('<!doctype html><html lang="ar" dir="rtl"><body><div id="root"></div></body></html>');
        }
      }
    });
  }

  if (fs.existsSync(rootIndex)) {
    return res.sendFile(rootIndex, (err) => {
      if (err && !res.headersSent) {
        res.status(200).send('<!doctype html><html lang="ar" dir="rtl"><body><div id="root"></div></body></html>');
      }
    });
  }

  return res.status(200).send('<!doctype html><html lang="ar" dir="rtl"><body><div id="root"></div></body></html>');
});

// Immediate Port Binding
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[ERP_SERVER] Running on 0.0.0.0:${PORT} [ENV: ${process.env.NODE_ENV || 'production'}]`);
});

export default app;
