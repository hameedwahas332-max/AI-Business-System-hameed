// Device Identity Service for CR-2026-TAURI-OFFLINE-SYNC-001
// Manages permanent device identity, platform detection, and transactional envelopes

export type PlatformType = 'Windows Tauri Desktop' | 'Web Browser' | 'Android' | 'Unknown';

export interface DeviceInfo {
  deviceId: string;
  platform: PlatformType;
  userAgent: string;
  createdAt: string;
}

export interface TransactionEnvelope<T = any> {
  uuid: string;
  tenantId: string;
  userId: string;
  deviceId: string;
  transactionType: string;
  createdAtClient: string;
  idempotencyKey: string;
  syncStatus: 'PENDING_SYNC' | 'SYNCING' | 'SYNCED' | 'CONFLICT' | 'REJECTED';
  schemaVersion: number;
  rowVersion: number;
  dependencyOrder: number; // 10: Master data, 20: Invoices, 30: Inventory adjustments, 40: Cash/Receipts, 50: General Ledger/Audit
  payload: T;
  retryCount?: number;
  lastAttemptAt?: string;
  errorReason?: string;
  serverSeq?: number;
}

const DEVICE_ID_KEY = 'erp_device_id_v1';
const DEVICE_INFO_KEY = 'erp_device_info_v1';

/**
 * Detect current execution platform (Tauri desktop, Android WebView/Tauri mobile, or Web browser)
 */
export function getDevicePlatform(): PlatformType {
  if (typeof window === 'undefined') {
    return 'Unknown';
  }

  const isTauri = '__TAURI_INTERNALS__' in window || '__TAURI__' in window;
  const ua = navigator.userAgent.toLowerCase();

  if (isTauri) {
    if (ua.includes('android')) {
      return 'Android';
    }
    return 'Windows Tauri Desktop';
  }

  if (/android/i.test(ua)) {
    return 'Android';
  }

  return 'Web Browser';
}

/**
 * Generate a random UUID v4 string fallback
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Retrieve or generate permanent unique device ID
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined') {
    return 'dev_srv_' + Math.random().toString(36).substring(2, 9);
  }

  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing && existing.trim().length > 0) {
      return existing;
    }

    const platform = getDevicePlatform();
    let prefix = 'dev_web_';
    if (platform === 'Windows Tauri Desktop') prefix = 'dev_win_';
    else if (platform === 'Android') prefix = 'dev_and_';

    const newId = `${prefix}${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    localStorage.setItem(DEVICE_ID_KEY, newId);

    const deviceInfo: DeviceInfo = {
      deviceId: newId,
      platform,
      userAgent: navigator.userAgent,
      createdAt: new Date().toISOString()
    };
    localStorage.setItem(DEVICE_INFO_KEY, JSON.stringify(deviceInfo));

    return newId;
  } catch {
    return 'dev_web_' + Math.random().toString(36).substring(2, 9);
  }
}

/**
 * Retrieve current active tenantId with sensible fallback
 */
export function getActiveTenantId(): string {
  if (typeof window === 'undefined') return 'tenant_default';
  try {
    const savedUser = localStorage.getItem('erp_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      if (parsed.tenantId) return parsed.tenantId;
      if (parsed.companyId) return parsed.companyId;
      if (parsed.company) return `comp_${parsed.company.replace(/\s+/g, '_')}`;
    }
    const savedCompany = localStorage.getItem('erp_company_settings');
    if (savedCompany) {
      const parsed = JSON.parse(savedCompany);
      if (parsed.id) return parsed.id;
    }
  } catch {
    // fallback
  }
  return 'tenant_main';
}

/**
 * Retrieve current active userId with sensible fallback
 */
export function getActiveUserId(): string {
  if (typeof window === 'undefined') return 'user_sys';
  try {
    const savedUser = localStorage.getItem('erp_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      if (parsed.id) return String(parsed.id);
      if (parsed.email) return String(parsed.email);
      if (parsed.username) return String(parsed.username);
    }
  } catch {
    // fallback
  }
  return 'user_anonymous';
}

/**
 * Factory for creating standard compliant transaction envelopes
 */
export function createTransactionEnvelope<T = any>(params: {
  transactionType: string;
  payload: T;
  tenantId?: string;
  userId?: string;
  deviceId?: string;
  idempotencyKey?: string;
  dependencyOrder?: number;
  rowVersion?: number;
}): TransactionEnvelope<T> {
  const uuid = generateUUID();
  const tenantId = params.tenantId || getActiveTenantId();
  const userId = params.userId || getActiveUserId();
  const deviceId = params.deviceId || getDeviceId();
  const idempotencyKey = params.idempotencyKey || `${tenantId}_${params.transactionType}_${uuid}`;

  // Default dependency orders
  let defaultDep = 20; // default invoice level
  const tType = params.transactionType.toUpperCase();
  if (tType.includes('CUSTOMER') || tType.includes('SUPPLIER') || tType.includes('PRODUCT') || tType.includes('SETTING')) {
    defaultDep = 10; // Master data
  } else if (tType.includes('INVOICE') || tType.includes('POS_SALE') || tType.includes('ORDER')) {
    defaultDep = 20; // Sales/Purchase Invoices
  } else if (tType.includes('STOCK') || tType.includes('INVENTORY') || tType.includes('TRANSFER')) {
    defaultDep = 30; // Inventory adjustments
  } else if (tType.includes('PAYMENT') || tType.includes('RECEIPT') || tType.includes('EXPENSE') || tType.includes('CASH')) {
    defaultDep = 40; // Treasury & cash
  } else if (tType.includes('LEDGER') || tType.includes('JOURNAL') || tType.includes('AUDIT')) {
    defaultDep = 50; // Ledger / Audit
  }

  return {
    uuid,
    tenantId,
    userId,
    deviceId,
    transactionType: params.transactionType,
    createdAtClient: new Date().toISOString(),
    idempotencyKey,
    syncStatus: 'PENDING_SYNC',
    schemaVersion: 1,
    rowVersion: params.rowVersion !== undefined ? params.rowVersion : 1,
    dependencyOrder: params.dependencyOrder || defaultDep,
    payload: params.payload,
    retryCount: 0
  };
}
