import crypto from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';

// ============================================================================
// 1. Password Hashing & Constant-Time Verification (scrypt)
// ============================================================================

const SCRYPT_KEY_LENGTH = 64; // 64 bytes = 128 hex chars
const SCRYPT_SALT_LENGTH = 16; // 16 bytes = 32 hex chars

/**
 * Returns true if the password string has already been hashed using scrypt.
 */
export function isPasswordHashed(val: unknown): boolean {
  return typeof val === 'string' && val.startsWith('scrypt$');
}

/**
 * Hashes a plaintext password using Node.js built-in scrypt with a unique 16-byte random salt.
 * Output format: scrypt$<saltHex>$<derivedKeyHex>
 */
export function hashPassword(plainPassword: string): string {
  if (typeof plainPassword !== 'string' || !plainPassword.trim()) {
    throw new Error('hashPassword requires a non-empty string');
  }

  // Idempotent: return if already hashed
  if (isPasswordHashed(plainPassword)) {
    return plainPassword;
  }

  const salt = crypto.randomBytes(SCRYPT_SALT_LENGTH).toString('hex');
  const derivedKey = crypto.scryptSync(plainPassword, salt, SCRYPT_KEY_LENGTH).toString('hex');
  return `scrypt$${salt}$${derivedKey}`;
}

/**
 * Verifies a candidate password against an scrypt stored hash using timing-safe comparison.
 * Strictly avoids any backdoor passwords or bypasses.
 */
export function verifyPassword(candidate: string, storedHash: string): boolean {
  if (typeof candidate !== 'string' || !candidate || typeof storedHash !== 'string' || !storedHash) {
    return false;
  }

  if (!isPasswordHashed(storedHash)) {
    // If legacy plaintext or corrupted format, reject securely
    return false;
  }

  const parts = storedHash.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    return false;
  }

  const salt = parts[1];
  const expectedKeyHex = parts[2];

  try {
    const derivedKey = crypto.scryptSync(candidate, salt, SCRYPT_KEY_LENGTH).toString('hex');
    const derivedBuf = Buffer.from(derivedKey, 'hex');
    const expectedBuf = Buffer.from(expectedKeyHex, 'hex');

    if (derivedBuf.length !== expectedBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(derivedBuf, expectedBuf);
  } catch {
    return false;
  }
}

// ============================================================================
// 2. RFC-7519 HMAC-SHA256 JWT Implementation (Zero external dependencies)
// ============================================================================

const JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.ERP_JWT_SECRET ||
  'ai-biz-enterprise-production-sec-key-2025-x99-enterprise-grade';

const revokedTokens = new Set<string>();

export interface TokenPayload {
  sub: string; // userId
  cid: string; // companyId
  email: string;
  role: string;
  iat: number;
  exp: number;
  jti: string;
}

function base64UrlEncode(strOrBuffer: string | Buffer): string {
  const buf = typeof strOrBuffer === 'string' ? Buffer.from(strOrBuffer, 'utf8') : strOrBuffer;
  return buf.toString('base64url');
}

function base64UrlDecode(str: string): string {
  return Buffer.from(str, 'base64url').toString('utf8');
}

/**
 * Generates an RFC-7519 HMAC-SHA256 JWT token with encoded sub (userId) and cid (companyId).
 * Prevents delimiter corruption (e.g., usr_enterprise_01) by packing clean JSON in base64url.
 */
export function generateSignedToken(options: {
  userId: string;
  companyId: string;
  email: string;
  role: string;
  expiresInMs?: number;
}): string {
  const { userId, companyId, email, role, expiresInMs = 7 * 24 * 60 * 60 * 1000 } = options; // Default 7 days
  const now = Math.floor(Date.now() / 1000);
  const exp = Math.floor((Date.now() + expiresInMs) / 1000);

  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const payload: TokenPayload = {
    sub: userId,
    cid: companyId,
    email: email.trim().toLowerCase(),
    role: role.toUpperCase(),
    iat: now,
    exp,
    jti: crypto.randomBytes(16).toString('hex'),
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(dataToSign)
    .digest('base64url');

  return `${dataToSign}.${signature}`;
}

/**
 * Verifies an RFC-7519 HMAC-SHA256 JWT token with constant-time signature comparison and revocation check.
 */
export function verifySignedToken(token: string): {
  valid: boolean;
  payload?: TokenPayload;
  reason?: string;
} {
  if (!token || typeof token !== 'string') {
    return { valid: false, reason: 'Token is missing or invalid type' };
  }

  const cleanToken = token.trim();

  if (revokedTokens.has(cleanToken)) {
    return { valid: false, reason: 'Token has been revoked' };
  }

  const parts = cleanToken.split('.');
  if (parts.length !== 3) {
    return { valid: false, reason: 'Malformed JWT structure' };
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  try {
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(dataToSign)
      .digest('base64url');

    const sigBuf = Buffer.from(signature, 'utf8');
    const expSigBuf = Buffer.from(expectedSignature, 'utf8');

    if (sigBuf.length !== expSigBuf.length || !crypto.timingSafeEqual(sigBuf, expSigBuf)) {
      return { valid: false, reason: 'Invalid signature' };
    }

    const payloadJson = base64UrlDecode(encodedPayload);
    const payload = JSON.parse(payloadJson) as TokenPayload;

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return { valid: false, reason: 'Token has expired' };
    }

    if (!payload.sub || !payload.cid) {
      return { valid: false, reason: 'Invalid token claims' };
    }

    return { valid: true, payload };
  } catch (err: any) {
    return { valid: false, reason: err?.message || 'Token verification failed' };
  }
}

/**
 * Adds a token to the blacklist/revoked tokens registry.
 */
export function revokeToken(token: string): void {
  if (typeof token === 'string' && token.trim()) {
    revokedTokens.add(token.trim());
  }
}

/**
 * Helper to extract Bearer token from authorization header.
 */
export function extractBearerToken(authHeader?: string): string | null {
  if (!authHeader || typeof authHeader !== 'string') return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

// ============================================================================
// 3. Multi-Tenancy AsyncLocalStorage Context
// ============================================================================

export interface TenantRequestContext {
  companyId: string;
  userId: string;
  email: string;
  role: string;
  isAuthenticated: boolean;
  token?: string;
}

const tenantContextStorage = new AsyncLocalStorage<TenantRequestContext>();

export function runWithTenantContext<T>(context: TenantRequestContext, fn: () => T): T {
  return tenantContextStorage.run(context, fn);
}

export function getCurrentTenantContext(): TenantRequestContext | undefined {
  return tenantContextStorage.getStore();
}

/**
 * Returns the currently active tenant ID from request context, defaulting to 'comp_001' only if unauthenticated.
 */
export function getCurrentTenantId(): string {
  const ctx = getCurrentTenantContext();
  return ctx?.companyId || 'comp_001';
}

// ============================================================================
// 4. Role-Based Access Control (RBAC) Matrix & Route Guard
// ============================================================================

export type UserRole = 'ADMIN' | 'ACCOUNTANT' | 'CASHIER' | 'SALES' | 'INVENTORY_MANAGER' | 'VIEWER';

export const ROLE_PERMISSIONS: Record<UserRole, Set<string>> = {
  ADMIN: new Set(['*']), // Full access to all operations
  ACCOUNTANT: new Set([
    'financial:read',
    'financial:write',
    'invoices:read',
    'invoices:write',
    'customers:read',
    'customers:write',
    'suppliers:read',
    'suppliers:write',
    'reports:read',
    'inventory:read',
    'banking:read',
    'banking:write',
    'taxes:read',
    'taxes:write',
    'ledger:read',
    'ledger:write',
  ]),
  CASHIER: new Set([
    'pos:read',
    'pos:write',
    'invoices:read',
    'invoices:write',
    'customers:read',
    'customers:write',
    'products:read',
    'inventory:read',
    'held:read',
    'held:write',
  ]),
  SALES: new Set([
    'pos:read',
    'pos:write',
    'invoices:read',
    'invoices:write',
    'customers:read',
    'customers:write',
    'products:read',
    'inventory:read',
    'orders:read',
    'orders:write',
  ]),
  INVENTORY_MANAGER: new Set([
    'products:read',
    'products:write',
    'inventory:read',
    'inventory:write',
    'suppliers:read',
    'suppliers:write',
    'purchase_invoices:read',
    'purchase_invoices:write',
    'transfers:read',
    'transfers:write',
  ]),
  VIEWER: new Set([
    'financial:read',
    'invoices:read',
    'customers:read',
    'suppliers:read',
    'products:read',
    'inventory:read',
    'reports:read',
  ]),
};

/**
 * Normalizes role string to canonical UserRole uppercase.
 */
export function normalizeRole(roleStr?: string): UserRole {
  if (!roleStr) return 'VIEWER';
  const clean = roleStr.trim().toUpperCase();
  if (clean === 'ADMIN' || clean === 'OWNER' || clean === 'SUPER_ADMIN') return 'ADMIN';
  if (clean === 'ACCOUNTANT' || clean === 'ACCOUNT') return 'ACCOUNTANT';
  if (clean === 'CASHIER') return 'CASHIER';
  if (clean === 'SALES' || clean === 'SALES_REP') return 'SALES';
  if (clean === 'INVENTORY_MANAGER' || clean === 'STOREKEEPER' || clean === 'WAREHOUSE') return 'INVENTORY_MANAGER';
  return 'VIEWER';
}

/**
 * Check if a role possesses the specified permission.
 */
export function hasPermission(roleStr: string, requiredPermission: string): boolean {
  const role = normalizeRole(roleStr);
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  if (permissions.has('*')) return true;
  return permissions.has(requiredPermission);
}

/**
 * Returns required permission string or null if route is public or universally permitted.
 */
export function resolveRequiredPermissionForRoute(urlPath: string, method: string): string | null {
  const cleanPath = urlPath.split('?')[0].toLowerCase();
  const upperMethod = method.toUpperCase();

  // Publicly allowed paths (no permission check needed)
  if (
    cleanPath === '/health' ||
    cleanPath === '/api/health' ||
    cleanPath.startsWith('/auth/login') ||
    cleanPath.startsWith('/api/auth/login') ||
    cleanPath.startsWith('/auth/register') ||
    cleanPath.startsWith('/api/auth/register') ||
    cleanPath.startsWith('/auth/forgot-password') ||
    cleanPath.startsWith('/api/auth/forgot-password') ||
    cleanPath.startsWith('/auth/reset-password') ||
    cleanPath.startsWith('/api/auth/reset-password') ||
    cleanPath.startsWith('/whatsapp/webhook') ||
    cleanPath.startsWith('/api/whatsapp/webhook')
  ) {
    return null;
  }

  // System Administration & Sensitive Operations (ADMIN ONLY)
  if (
    cleanPath.includes('/backup') ||
    cleanPath.includes('/export/database') ||
    cleanPath.includes('/import/database') ||
    cleanPath.includes('/users') ||
    cleanPath.includes('/companies') ||
    cleanPath.includes('/admin') ||
    cleanPath.includes('/audit') ||
    cleanPath.includes('/system') ||
    cleanPath.includes('/settings')
  ) {
    if (upperMethod === 'GET') return 'system:read';
    return 'system:write';
  }

  // Financial & Accounting
  if (
    cleanPath.includes('/journal') ||
    cleanPath.includes('/ledger') ||
    cleanPath.includes('/financial') ||
    cleanPath.includes('/banking') ||
    cleanPath.includes('/taxes') ||
    cleanPath.includes('/accounts')
  ) {
    return upperMethod === 'GET' ? 'financial:read' : 'financial:write';
  }

  // Invoices & POS
  if (cleanPath.includes('/invoices') || cleanPath.includes('/sales')) {
    return upperMethod === 'GET' ? 'invoices:read' : 'invoices:write';
  }
  if (cleanPath.includes('/pos') || cleanPath.includes('/held')) {
    return upperMethod === 'GET' ? 'pos:read' : 'pos:write';
  }

  // Products & Inventory
  if (cleanPath.includes('/products') || cleanPath.includes('/inventory') || cleanPath.includes('/stock')) {
    return upperMethod === 'GET' ? 'products:read' : 'products:write';
  }

  // Purchase invoices & suppliers
  if (cleanPath.includes('/purchase') || cleanPath.includes('/suppliers')) {
    return upperMethod === 'GET' ? 'suppliers:read' : 'suppliers:write';
  }

  // Customers
  if (cleanPath.includes('/customers')) {
    return upperMethod === 'GET' ? 'customers:read' : 'customers:write';
  }

  // Reports
  if (cleanPath.includes('/reports')) {
    return 'reports:read';
  }

  return null;
}
