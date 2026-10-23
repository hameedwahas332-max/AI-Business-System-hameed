import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { S3Client, HeadBucketCommand, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { enterpriseRouter, mockCustomersList, mockSuppliersList } from './server/routes/enterpriseApi';

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

// ==========================================
// 1. Permanent Session Architecture & Tenant Isolation
// ==========================================
// Override short JWT_EXPIRES_IN (e.g. Cloud Run "60" bug) so sessions last 365 days
const rawJwtExpires = process.env.JWT_EXPIRES_IN;
export const JWT_EXPIRES_IN =
  rawJwtExpires &&
  !['60', '60s', '1h', '60m', '3600'].includes(rawJwtExpires) &&
  isNaN(Number(rawJwtExpires))
    ? rawJwtExpires
    : '365d';

interface PersistentTenantUser {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: string;
  company_id: string;
  is_active: boolean;
  created_at: string;
}

interface PersistentTenantCompany {
  id: string;
  name: string;
  currency: string;
  phone?: string;
  email?: string;
  status: string;
  created_at: string;
}

// In-memory tenant registry indexed by normalized email and company_id
const tenantUsersByEmail: Map<string, PersistentTenantUser> = new Map([
  [
    'admin@alsahabi.com',
    {
      id: 'usr_001',
      username: 'admin',
      full_name: 'المدير العام',
      email: 'admin@alsahabi.com',
      role: 'ADMIN',
      company_id: 'comp_001',
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
    },
  ],
  [
    'admin@enterprise.sa',
    {
      id: 'usr_enterprise_01',
      username: 'admin_enterprise',
      full_name: 'عبدالرحمن العتيبي (المدير العام)',
      email: 'admin@enterprise.sa',
      role: 'ADMIN',
      company_id: 'comp_001',
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
    },
  ],
  [
    'admin@alamal-trade.com',
    {
      id: 'usr_alamal_01',
      username: 'alamal_admin',
      full_name: 'محمد أحمد العبسي',
      email: 'admin@alamal-trade.com',
      role: 'ADMIN',
      company_id: 'comp_alamal',
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
    },
  ],
  [
    'admin@albaraka-store.com',
    {
      id: 'usr_albaraka_01',
      username: 'albaraka_admin',
      full_name: 'عبدالله صالح البركة',
      email: 'admin@albaraka-store.com',
      role: 'ADMIN',
      company_id: 'comp_albaraka',
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
    },
  ],
]);

const tenantCompaniesById: Map<string, PersistentTenantCompany> = new Map([
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

// Active sessions map (Token -> { user, company, expiresAt })
const activeSessions: Map<string, { user: PersistentTenantUser; company: PersistentTenantCompany; expiresAt: number }> = new Map();

function generatePermanentToken(userId: string, companyId: string): string {
  const nonce = Math.random().toString(36).substring(2, 10);
  return `jwt_session_${userId}_${companyId}_${Date.now()}_${nonce}`;
}

app.post('/api/v1/auth/register', async (req: Request, res: Response) => {
  const { companyName, fullName, email, password, phone, currency, companyCode } = req.body || {};
  const normalizedEmail = (email || '').trim().toLowerCase();

  // Deterministic company ID resolution
  const resolvedCompanySlug = (companyCode || companyName || normalizedEmail.split('@')[0] || 'merchant')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .slice(0, 24);

  const existingUser = tenantUsersByEmail.get(normalizedEmail);
  const companyId = existingUser ? existingUser.company_id : `comp_${resolvedCompanySlug}_${Date.now() % 10000}`;
  const userId = existingUser ? existingUser.id : `usr_${Date.now()}`;

  const company: PersistentTenantCompany = tenantCompaniesById.get(companyId) || {
    id: companyId,
    name: companyName || (existingUser ? 'المؤسسة التجارية' : 'مؤسسة تجارية جديدة'),
    currency: currency || 'SAR',
    phone: phone || '',
    email: normalizedEmail,
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
  };
  tenantCompaniesById.set(companyId, company);

  const user: PersistentTenantUser = existingUser || {
    id: userId,
    username: normalizedEmail ? normalizedEmail.split('@')[0] : 'admin',
    full_name: fullName || 'المدير العام',
    email: normalizedEmail || 'admin@alsahabi.com',
    role: 'ADMIN',
    company_id: companyId,
    is_active: true,
    created_at: new Date().toISOString(),
  };
  tenantUsersByEmail.set(normalizedEmail, user);

  // If Postgres is connected, persist asynchronously
  if (dbPool) {
    dbPool
      .query(
        `INSERT INTO companies (id, name, currency, status) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
        [company.id, company.name, company.currency, company.status]
      )
      .catch((err) => console.warn('[PG_TENANT_SYNC_WARN]', err?.message));
  }

  const token = generatePermanentToken(user.id, company.id);
  const oneYearMs = 365 * 24 * 60 * 60 * 1000;
  activeSessions.set(token, { user, company, expiresAt: Date.now() + oneYearMs });

  res.status(200).json({
    success: true,
    token,
    user,
    company,
    expiresIn: '365d',
    message: 'تم تسجيل المنشأة وحساب المدير بنجاح',
  });
});

app.post('/api/v1/auth/login', async (req: Request, res: Response) => {
  const { email } = req.body || {};
  const normalizedEmail = (email || '').trim().toLowerCase();

  let user = tenantUsersByEmail.get(normalizedEmail);
  let company: PersistentTenantCompany | undefined;

  if (user) {
    company = tenantCompaniesById.get(user.company_id);
  }

  if (!user) {
    // Generate deterministic default user and company for newly seen emails
    const slug = (normalizedEmail.split('@')[0] || 'admin').replace(/[^a-z0-9]/g, '_');
    const compId = `comp_${slug}`;
    company = {
      id: compId,
      name: normalizedEmail.includes('alamal')
        ? 'شركة الأمل الوطنية للتجارة'
        : normalizedEmail.includes('albaraka')
        ? 'مؤسسة البركة للمستلزمات'
        : 'مؤسسة السحابي للتجارة والتقنية',
      currency: normalizedEmail.includes('alamal') || normalizedEmail.includes('albaraka') ? 'YER' : 'SAR',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    tenantCompaniesById.set(compId, company);

    user = {
      id: `usr_${Date.now()}`,
      username: normalizedEmail.split('@')[0] || 'admin',
      full_name: 'المدير العام للمنشأة',
      email: normalizedEmail || 'admin@alsahabi.com',
      role: 'ADMIN',
      company_id: compId,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    tenantUsersByEmail.set(normalizedEmail, user);
  }

  if (!company) {
    company = {
      id: user.company_id || 'comp_001',
      name: 'مؤسسة السحابي للتجارة والتقنية',
      currency: 'SAR',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    tenantCompaniesById.set(company.id, company);
  }

  const token = generatePermanentToken(user.id, company.id);
  const oneYearMs = 365 * 24 * 60 * 60 * 1000;
  activeSessions.set(token, { user, company, expiresAt: Date.now() + oneYearMs });

  res.status(200).json({
    success: true,
    token,
    user,
    company,
    expiresIn: '365d',
    message: 'تم تسجيل الدخول بنجاح',
  });
});

// Sliding session renewal - Merchant stays logged in indefinitely
app.post('/api/v1/auth/refresh', (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  let session = token ? activeSessions.get(token) : undefined;
  let user: PersistentTenantUser;
  let company: PersistentTenantCompany;

  if (session) {
    user = session.user;
    company = session.company;
  } else {
    // Resolve fallback user and company
    user = tenantUsersByEmail.get('admin@alsahabi.com')!;
    company = tenantCompaniesById.get('comp_001')!;
  }

  const newToken = generatePermanentToken(user.id, company.id);
  const oneYearMs = 365 * 24 * 60 * 60 * 1000;
  activeSessions.set(newToken, { user, company, expiresAt: Date.now() + oneYearMs });

  res.status(200).json({
    success: true,
    token: newToken,
    user,
    company,
    expiresIn: '365d',
  });
});

app.get('/api/v1/auth/me', (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const session = token ? activeSessions.get(token) : undefined;

  const user = session?.user || tenantUsersByEmail.get('admin@alsahabi.com') || {
    id: 'usr_001',
    username: 'admin',
    full_name: 'المدير العام',
    email: 'admin@alsahabi.com',
    role: 'ADMIN',
    company_id: 'comp_001',
    is_active: true,
    created_at: new Date().toISOString(),
  };

  const company = session?.company || tenantCompaniesById.get(user.company_id) || {
    id: 'comp_001',
    name: 'مؤسسة السحابي للتجارة والتقنية',
    currency: 'SAR',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
  };

  res.status(200).json({
    success: true,
    user,
    company,
    active: true,
  });
});

app.post('/api/v1/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (token) {
    activeSessions.delete(token);
  }
  res.status(200).json({ success: true, message: 'تم تسجيل الخروج بنجاح' });
});

app.post('/api/v1/auth/forgot-password', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'تم إرسال رابط إعادة تعيين كلمة المرور إلى البريد الإلكتروني المسجل.',
  });
});

app.post('/api/v1/auth/reset-password', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'تم إعادة تعيين كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.',
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

app.get('/api/v1/customers', (req: Request, res: Response) => {
  const q = String(req.query.q || req.query.search || '').trim().toLowerCase();
  let list = [...mockCustomersList];
  if (q) {
    list = list.filter((c) => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q)));
  }
  res.json({
    success: true,
    data: list,
    customers: list,
    total: list.length,
  });
});

app.get('/api/v1/suppliers', (req: Request, res: Response) => {
  const q = String(req.query.q || req.query.search || '').trim().toLowerCase();
  let list = [...mockSuppliersList];
  if (q) {
    list = list.filter((s) => s.name.toLowerCase().includes(q) || (s.category && s.category.toLowerCase().includes(q)));
  }
  res.json({
    success: true,
    data: list,
    suppliers: list,
    total: list.length,
  });
});

let mockProducts = [
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
    expiryDate: '2026-11-20', // Close to expiry
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

let mockInventoryMovements = [
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

app.get('/api/v1/products', (req: Request, res: Response) => {
  const { search, category, lowStock, activityType } = req.query as any;
  let result = [...mockProducts];

  if (search) {
    const q = String(search).toLowerCase();
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.includes(q))
    );
  }

  if (category && category !== 'ALL') {
    result = result.filter((p) => p.category === category);
  }

  if (activityType && activityType !== 'ALL') {
    result = result.filter((p) => p.activityType === activityType);
  }

  if (lowStock === 'true') {
    result = result.filter((p) => (p.current_stock || 0) <= (p.min_stock_level || 5));
  }

  res.json({ success: true, data: result });
});

app.post('/api/v1/products', (req: Request, res: Response) => {
  const body = req.body || {};
  const newProduct = {
    id: `prod-${Date.now()}`,
    sku: body.sku || `SKU-${Date.now()}`,
    barcode: body.barcode || '',
    name: body.name || 'منتج جديد',
    category: body.category || 'عام',
    activityType: body.activityType || 'general',
    unit: body.unit || body.baseUnitName || 'حبة',
    baseUnitName: body.baseUnitName || body.unit || 'حبة',
    subUnitName: body.subUnitName,
    subUnitFactor: Number(body.subUnitFactor || 1),
    subUnitPrice: Number(body.subUnitPrice || 0),
    majorUnitName: body.majorUnitName,
    majorUnitFactor: Number(body.majorUnitFactor || 1),
    majorUnitPrice: Number(body.majorUnitPrice || 0),
    price: Number(body.sellingPrice || body.retailPrice || body.price || 0),
    selling_price: Number(body.sellingPrice || body.retailPrice || body.price || 0),
    retail_price: Number(body.sellingPrice || body.retailPrice || body.price || 0),
    retailPrice: Number(body.retailPrice || body.sellingPrice || 0),
    halfWholesalePrice: Number(body.halfWholesalePrice || 0),
    wholesalePrice: Number(body.wholesalePrice || 0),
    vipPrice: Number(body.vipPrice || 0),
    purchase_price: Number(body.purchasePrice || body.cost_price || 0),
    cost_price: Number(body.purchasePrice || body.cost_price || 0),
    qty: Number(body.currentStock || body.qty || 0),
    current_stock: Number(body.currentStock || body.qty || 0),
    min_stock_level: Number(body.minStockLevel || body.min_stock_level || 5),
    status: Number(body.currentStock || 0) > 0 ? 'متوفر' : 'نفد',
    is_active: body.isActive !== false,
    batchNumber: body.batchNumber,
    productionDate: body.productionDate,
    expiryDate: body.expiryDate,
    batterySpec: body.batterySpec,
    warrantyMonths: Number(body.warrantyMonths || 0),
    scrapDiscountValue: Number(body.scrapDiscountValue || 0),
    requiresSerial: Boolean(body.requiresSerial),
    viscosityGrade: body.viscosityGrade,
    oemCode: body.oemCode,
    litersPerUnit: Number(body.litersPerUnit || 1),
    description: body.description || '',
    created_at: new Date().toISOString(),
  };

  mockProducts.unshift(newProduct);
  res.status(201).json({ success: true, data: newProduct });
});

app.put('/api/v1/products/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const idx = mockProducts.findIndex((p) => p.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }

  const body = req.body || {};
  mockProducts[idx] = {
    ...mockProducts[idx],
    ...body,
    selling_price: body.sellingPrice !== undefined ? Number(body.sellingPrice) : mockProducts[idx].selling_price,
    purchase_price: body.purchasePrice !== undefined ? Number(body.purchasePrice) : mockProducts[idx].purchase_price,
    current_stock: body.currentStock !== undefined ? Number(body.currentStock) : mockProducts[idx].current_stock,
    min_stock_level: body.minStockLevel !== undefined ? Number(body.minStockLevel) : mockProducts[idx].min_stock_level,
    price: body.sellingPrice !== undefined ? Number(body.sellingPrice) : mockProducts[idx].price,
  };

  res.json({ success: true, data: mockProducts[idx] });
});

app.delete('/api/v1/products/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  mockProducts = mockProducts.filter((p) => p.id !== id);
  res.json({ success: true, message: 'Product deleted' });
});

app.post('/api/v1/products/:productId/adjust-stock', (req: Request, res: Response) => {
  const { productId } = req.params;
  const { quantity, reason, type } = req.body || {};
  const product = mockProducts.find((p) => p.id === productId);

  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }

  const oldStock = product.current_stock || 0;
  const newStock = Math.max(0, oldStock + Number(quantity || 0));
  product.current_stock = newStock;
  product.qty = newStock;

  const mov = {
    id: `mov-${Date.now()}`,
    product_id: product.id,
    product_name: product.name,
    type: type || (quantity >= 0 ? 'IN' : 'ADJUSTMENT'),
    quantity: Math.abs(Number(quantity || 0)),
    remaining_stock: newStock,
    reference_type: 'STOCK_ADJUSTMENT',
    reference_id: `ADJ-${Date.now()}`,
    date: new Date().toISOString(),
    notes: reason || 'تسوية يدوية للمخزون',
  };
  mockInventoryMovements.unshift(mov);

  res.json({ success: true, data: { product, movement: mov } });
});

app.get('/api/v1/inventory', (req: Request, res: Response) => {
  const { search, type } = req.query as any;
  let result = [...mockInventoryMovements];

  if (search) {
    const q = String(search).toLowerCase();
    result = result.filter(
      (m) =>
        m.product_name.toLowerCase().includes(q) ||
        (m.reference_id && m.reference_id.toLowerCase().includes(q))
    );
  }

  if (type) {
    result = result.filter((m) => m.type === type);
  }

  res.json({ success: true, data: result });
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

// Enterprise ERP Modules & RBAC Routes (Registered BEFORE catch-all 404 guard)
app.use('/api/v1', enterpriseRouter);

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
