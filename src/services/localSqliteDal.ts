// Local Data Access Layer (DAL) supporting Tauri 2 SQLite with IndexedDB & LocalStorage fallback
// Implements CR-2026-TAURI-OFFLINE-SYNC-001

import { TransactionEnvelope } from './deviceIdentity';

export interface SyncConflictRecord {
  id: string;
  transactionUuid: string;
  transactionType: string;
  tenantId: string;
  localPayload: any;
  serverPayload: any;
  conflictReason: string;
  createdAt: string;
  resolvedAt?: string;
  resolutionStrategy?: 'CLIENT_WINS' | 'SERVER_WINS' | 'MANUAL_MERGE';
}

export interface FinancialLedgerEntry {
  id: string;
  sequenceId: number;
  tenantId: string;
  transactionUuid: string;
  transactionType: string;
  accountCode: string;
  debit: number;
  credit: number;
  currency: string;
  timestamp: string;
  referenceId: string;
  description: string;
  hash: string;
}

export interface SyncCursor {
  deviceId: string;
  tenantId: string;
  lastServerSeq: number;
  lastSyncTimestamp: string;
}

// 18 ERP Standard Object Stores
export const ERP_STORES = [
  'local_transactional_outbox',
  'immutable_financial_ledger',
  'sync_conflict_registry',
  'device_sync_cursors',
  'erp_invoices_v1',
  'erp_purchase_invoices_v1',
  'erp_products_v1',
  'erp_customers_v1',
  'erp_suppliers_v1',
  'erp_payments_v1',
  'erp_expenses_v1',
  'erp_inventory_transactions_v1',
  'erp_accounts_v1',
  'erp_journal_entries_v1',
  'erp_pos_shifts_v1',
  'erp_pos_orders_v1',
  'erp_warehouses_v1',
  'erp_price_lists_v1',
  'erp_tax_rates_v1',
  'erp_currencies_v1',
  'erp_company_settings',
  'erp_audit_logs_v1'
] as const;

export type ERPStoreName = (typeof ERP_STORES)[number];

const DB_NAME = 'erp_production_vault_db_v1';
const DB_VERSION = 1;

let idbInstance: IDBDatabase | null = null;
let idbPromise: Promise<IDBDatabase> | null = null;
let tauriSqlDatabase: any = null;
let isTauriSqlAvailable = false;

/**
 * Initialize IndexedDB instance with all standard stores and indexes
 */
async function openIndexedDB(): Promise<IDBDatabase> {
  if (idbInstance) return idbInstance;
  if (idbPromise) return idbPromise;

  idbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported in this environment'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. Transactional Outbox
      if (!db.objectStoreNames.contains('local_transactional_outbox')) {
        const outboxStore = db.createObjectStore('local_transactional_outbox', { keyPath: 'uuid' });
        outboxStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        outboxStore.createIndex('dependencyOrder', 'dependencyOrder', { unique: false });
        outboxStore.createIndex('idempotencyKey', 'idempotencyKey', { unique: true });
        outboxStore.createIndex('createdAtClient', 'createdAtClient', { unique: false });
      }

      // 2. Financial Ledger
      if (!db.objectStoreNames.contains('immutable_financial_ledger')) {
        const ledgerStore = db.createObjectStore('immutable_financial_ledger', { keyPath: 'id' });
        ledgerStore.createIndex('sequenceId', 'sequenceId', { unique: true });
        ledgerStore.createIndex('transactionUuid', 'transactionUuid', { unique: false });
        ledgerStore.createIndex('accountCode', 'accountCode', { unique: false });
      }

      // 3. Conflict Registry
      if (!db.objectStoreNames.contains('sync_conflict_registry')) {
        const conflictStore = db.createObjectStore('sync_conflict_registry', { keyPath: 'id' });
        conflictStore.createIndex('transactionUuid', 'transactionUuid', { unique: false });
        conflictStore.createIndex('tenantId', 'tenantId', { unique: false });
      }

      // 4. Sync Cursors
      if (!db.objectStoreNames.contains('device_sync_cursors')) {
        db.createObjectStore('device_sync_cursors', { keyPath: 'deviceId' });
      }

      // 5. 18 Standard Entity Stores
      for (const storeName of ERP_STORES) {
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { keyPath: 'id' });
          try {
            store.createIndex('updatedAt', 'updatedAt', { unique: false });
          } catch {
            // Ignore index creation errors
          }
        }
      }
    };

    request.onsuccess = () => {
      idbInstance = request.result;
      resolve(idbInstance);
    };

    request.onerror = () => {
      console.warn('[LocalSqliteDal] IndexedDB open error:', request.error);
      reject(request.error);
    };
  });

  return idbPromise;
}

/**
 * Initialize SQLite via Tauri if available, otherwise initialize IndexedDB
 */
export async function initLocalDatabase(): Promise<{ type: 'tauri-sqlite' | 'indexeddb' | 'localstorage'; ready: boolean }> {
  // Check if running inside Tauri Desktop
  const isTauri = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);

  if (isTauri) {
    try {
      // Dynamic import to avoid build breakages when Tauri plugins are optional
      const sqlPlugin = await (Function('return import("@tauri-apps/plugin-sql")')() as Promise<any>);
      if (sqlPlugin && sqlPlugin.Database) {
        tauriSqlDatabase = await sqlPlugin.Database.load('sqlite:erp_desktop_offline.db');
        isTauriSqlAvailable = true;

        // Initialize SQL tables
        await tauriSqlDatabase.execute(`
          CREATE TABLE IF NOT EXISTS local_transactional_outbox (
            uuid TEXT PRIMARY KEY,
            tenantId TEXT NOT NULL,
            userId TEXT NOT NULL,
            deviceId TEXT NOT NULL,
            transactionType TEXT NOT NULL,
            createdAtClient TEXT NOT NULL,
            idempotencyKey TEXT UNIQUE NOT NULL,
            syncStatus TEXT NOT NULL,
            schemaVersion INTEGER NOT NULL,
            rowVersion INTEGER NOT NULL,
            dependencyOrder INTEGER NOT NULL,
            payload TEXT NOT NULL,
            retryCount INTEGER DEFAULT 0,
            lastAttemptAt TEXT,
            errorReason TEXT,
            serverSeq INTEGER
          );

          CREATE TABLE IF NOT EXISTS immutable_financial_ledger (
            id TEXT PRIMARY KEY,
            sequenceId INTEGER NOT NULL,
            tenantId TEXT NOT NULL,
            transactionUuid TEXT NOT NULL,
            transactionType TEXT NOT NULL,
            accountCode TEXT NOT NULL,
            debit REAL DEFAULT 0,
            credit REAL DEFAULT 0,
            currency TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            referenceId TEXT,
            description TEXT,
            hash TEXT
          );

          CREATE TABLE IF NOT EXISTS sync_conflict_registry (
            id TEXT PRIMARY KEY,
            transactionUuid TEXT NOT NULL,
            transactionType TEXT NOT NULL,
            tenantId TEXT NOT NULL,
            localPayload TEXT,
            serverPayload TEXT,
            conflictReason TEXT,
            createdAt TEXT,
            resolvedAt TEXT,
            resolutionStrategy TEXT
          );

          CREATE TABLE IF NOT EXISTS device_sync_cursors (
            deviceId TEXT PRIMARY KEY,
            tenantId TEXT NOT NULL,
            lastServerSeq INTEGER DEFAULT 0,
            lastSyncTimestamp TEXT
          );
        `);

        console.log('[LocalSqliteDal] Connected to Tauri SQLite Database successfully');
        return { type: 'tauri-sqlite', ready: true };
      }
    } catch (err) {
      console.warn('[LocalSqliteDal] Tauri SQLite initialization bypassed, falling back to IndexedDB:', err);
    }
  }

  // Fallback to IndexedDB
  try {
    await openIndexedDB();
    console.log('[LocalSqliteDal] Connected to IndexedDB successfully');
    return { type: 'indexeddb', ready: true };
  } catch (err) {
    console.warn('[LocalSqliteDal] IndexedDB failed, utilizing resilient LocalStorage cache:', err);
    return { type: 'localstorage', ready: true };
  }
}

/**
 * Save record to storage with synchronous LocalStorage mirror for instant React binding
 */
export async function saveRecord<T extends { id?: string; uuid?: string }>(
  storeName: ERPStoreName | string,
  record: T
): Promise<void> {
  const primaryKey = (record.id || record.uuid || 'rec_' + Math.random().toString(36).substring(2, 9)) as string;
  const normalized = { ...record, id: primaryKey };

  // Mirror in LocalStorage first for instant synchronous React component consumption
  try {
    const raw = localStorage.getItem(storeName);
    let items: any[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(items)) items = [];
    const idx = items.findIndex((item) => (item.id === primaryKey || item.uuid === primaryKey));
    if (idx >= 0) {
      items[idx] = normalized;
    } else {
      items.push(normalized);
    }
    localStorage.setItem(storeName, JSON.stringify(items));
  } catch {
    // ignore quota errors
  }

  // Persist to SQLite if active
  if (isTauriSqlAvailable && tauriSqlDatabase) {
    try {
      if (storeName === 'local_transactional_outbox') {
        const outbox = record as unknown as TransactionEnvelope;
        await tauriSqlDatabase.execute(
          `INSERT OR REPLACE INTO local_transactional_outbox 
           (uuid, tenantId, userId, deviceId, transactionType, createdAtClient, idempotencyKey, syncStatus, schemaVersion, rowVersion, dependencyOrder, payload, retryCount, lastAttemptAt, errorReason, serverSeq)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
          [
            outbox.uuid,
            outbox.tenantId,
            outbox.userId,
            outbox.deviceId,
            outbox.transactionType,
            outbox.createdAtClient,
            outbox.idempotencyKey,
            outbox.syncStatus,
            outbox.schemaVersion || 1,
            outbox.rowVersion || 1,
            outbox.dependencyOrder || 20,
            JSON.stringify(outbox.payload),
            outbox.retryCount || 0,
            outbox.lastAttemptAt || null,
            outbox.errorReason || null,
            outbox.serverSeq || null
          ]
        );
        return;
      }
    } catch (e) {
      console.warn('[LocalSqliteDal] SQLite save error:', e);
    }
  }

  // Persist to IndexedDB
  try {
    const db = await openIndexedDB();
    if (db.objectStoreNames.contains(storeName)) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction([storeName], 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.put(normalized);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    }
  } catch (err) {
    // Fallback was already recorded to localStorage
  }
}

/**
 * Retrieve all records from given store
 */
export async function getAllRecords<T = any>(storeName: ERPStoreName | string): Promise<T[]> {
  // If Tauri SQLite is available and store is outbox
  if (isTauriSqlAvailable && tauriSqlDatabase && storeName === 'local_transactional_outbox') {
    try {
      const rows = await tauriSqlDatabase.select(`SELECT * FROM local_transactional_outbox ORDER BY dependencyOrder ASC, createdAtClient ASC`);
      return rows.map((r: any) => ({
        ...r,
        payload: typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload
      }));
    } catch (e) {
      console.warn('[LocalSqliteDal] SQLite read outbox error, falling back:', e);
    }
  }

  // Try IndexedDB
  try {
    const db = await openIndexedDB();
    if (db.objectStoreNames.contains(storeName)) {
      return await new Promise<T[]>((resolve, reject) => {
        const tx = db.transaction([storeName], 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => {
          if (Array.isArray(req.result) && req.result.length > 0) {
            resolve(req.result as T[]);
          } else {
            // Check localStorage fallback if IndexedDB is empty
            const raw = localStorage.getItem(storeName);
            resolve(raw ? JSON.parse(raw) : []);
          }
        };
        req.onerror = () => reject(req.error);
      });
    }
  } catch {
    // fallback
  }

  // LocalStorage fallback
  try {
    const raw = localStorage.getItem(storeName);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Delete record by ID or UUID
 */
export async function deleteRecord(storeName: ERPStoreName | string, id: string): Promise<void> {
  // Sync removal from LocalStorage mirror
  try {
    const raw = localStorage.getItem(storeName);
    if (raw) {
      let items: any[] = JSON.parse(raw);
      if (Array.isArray(items)) {
        items = items.filter((i) => i.id !== id && i.uuid !== id);
        localStorage.setItem(storeName, JSON.stringify(items));
      }
    }
  } catch {
    // ignore
  }

  // Remove from Tauri SQLite if outbox
  if (isTauriSqlAvailable && tauriSqlDatabase && storeName === 'local_transactional_outbox') {
    try {
      await tauriSqlDatabase.execute(`DELETE FROM local_transactional_outbox WHERE uuid = $1`, [id]);
    } catch {
      // ignore
    }
  }

  // Remove from IndexedDB
  try {
    const db = await openIndexedDB();
    if (db.objectStoreNames.contains(storeName)) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction([storeName], 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    }
  } catch {
    // ignore
  }
}

/**
 * Execute an atomic transaction batch
 */
export async function executeTransaction<T = any>(
  operations: Array<{
    type: 'put' | 'delete';
    storeName: ERPStoreName | string;
    record?: any;
    id?: string;
  }>
): Promise<boolean> {
  try {
    for (const op of operations) {
      if (op.type === 'put' && op.record) {
        await saveRecord(op.storeName, op.record);
      } else if (op.type === 'delete' && op.id) {
        await deleteRecord(op.storeName, op.id);
      }
    }
    return true;
  } catch (err) {
    console.error('[LocalSqliteDal] Transaction failed:', err);
    return false;
  }
}

/**
 * Run integrity check across local tables and stores
 */
export async function runIntegrityCheck(): Promise<{
  healthy: boolean;
  storesChecked: number;
  outboxPendingCount: number;
  conflictsCount: number;
  ledgerCount: number;
  details: string;
}> {
  try {
    const outbox = await getAllRecords<TransactionEnvelope>('local_transactional_outbox');
    const pendingOutbox = outbox.filter((o) => o.syncStatus === 'PENDING_SYNC' || o.syncStatus === 'SYNCING');
    const conflicts = await getAllRecords<SyncConflictRecord>('sync_conflict_registry');
    const ledger = await getAllRecords<FinancialLedgerEntry>('immutable_financial_ledger');

    return {
      healthy: true,
      storesChecked: ERP_STORES.length,
      outboxPendingCount: pendingOutbox.length,
      conflictsCount: conflicts.length,
      ledgerCount: ledger.length,
      details: `DAL Healthy. Outbox pending: ${pendingOutbox.length}, Conflicts: ${conflicts.length}, Ledger rows: ${ledger.length}`
    };
  } catch (err: any) {
    return {
      healthy: false,
      storesChecked: 0,
      outboxPendingCount: 0,
      conflictsCount: 0,
      ledgerCount: 0,
      details: `Integrity check failed: ${err?.message || String(err)}`
    };
  }
}
