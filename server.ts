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
app.get('/api/v1/customers', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: [
      { id: '1', name: 'مؤسسة الأفق للتجارة', phone: '0501234567', balance: 0, creditLimit: 20000 },
      { id: '2', name: 'شركة الوفاق المحدودة', phone: '0559876543', balance: 1450, creditLimit: 50000 },
      { id: '3', name: 'مجمع الرياض الطبي', phone: '0543322110', balance: 8200, creditLimit: 30000 },
    ],
  });
});

app.get('/api/v1/suppliers', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: [
      { id: '1', name: 'شركة التوريدات الوطنية الكبرى', category: 'أغذية ومواد استهلاكية', balance: 14200 },
      { id: '2', name: 'مؤسسة الاستيراد المباشر', category: 'معدات ومستلزمات تشغيل', balance: 5800 },
    ],
  });
});

app.get('/api/v1/products', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: [
      { sku: 'TEA-01', name: 'شاي سيلاني فاخر 100 كيس', qty: 240, price: 18.5, status: 'متوفر' },
      { sku: 'COF-02', name: 'قهوة عربية بالهيل 500جم', qty: 85, price: 42.0, status: 'متوفر' },
      { sku: 'RIC-03', name: 'أرز بسمتي هندي 5 كجم', qty: 14, price: 55.0, status: 'منخفض' },
      { sku: 'OIL-04', name: 'زيت زيتون بكر ممتاز 1 لتر', qty: 110, price: 38.0, status: 'متوفر' },
    ],
  });
});

app.get('/api/v1/invoices', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: [
      { id: 'INV-2026-0042', customer: 'مؤسسة الأفق للتجارة', date: '2026-10-18', amount: 1667.5, status: 'مدفوعة' },
      { id: 'INV-2026-0041', customer: 'شركة الوفاق المحدودة', date: '2026-10-18', amount: 943.0, status: 'مدفوعة' },
      { id: 'INV-2026-0040', customer: 'عميل كاشير نقدي', date: '2026-10-18', amount: 207.0, status: 'مدفوعة' },
    ],
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
