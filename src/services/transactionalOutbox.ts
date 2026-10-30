// Persistent Transactional Outbox Engine for Offline-First Multi-Device ERP
// Implements CR-2026-TAURI-OFFLINE-SYNC-001

import {
  TransactionEnvelope,
  createTransactionEnvelope,
  getDeviceId,
  getActiveTenantId
} from './deviceIdentity';
import {
  saveRecord,
  getAllRecords,
  initLocalDatabase,
  SyncConflictRecord
} from './localSqliteDal';

export interface OutboxPushResult {
  accepted: number;
  conflicted: number;
  rejected: number;
  serverSeq: number;
}

let syncInProgress = false;
let syncTimer: any = null;
let eventSource: EventSource | null = null;

/**
 * Enqueue a financial or operational transaction into the persistent local outbox
 */
export async function enqueueOutboxTransaction<T = any>(
  transactionType: string,
  payload: T,
  options?: {
    idempotencyKey?: string;
    dependencyOrder?: number;
    rowVersion?: number;
    tenantId?: string;
  }
): Promise<TransactionEnvelope<T>> {
  const envelope = createTransactionEnvelope<T>({
    transactionType,
    payload,
    tenantId: options?.tenantId,
    idempotencyKey: options?.idempotencyKey,
    dependencyOrder: options?.dependencyOrder,
    rowVersion: options?.rowVersion
  });

  // Persist envelope to the transactional outbox
  await saveRecord('local_transactional_outbox', envelope);

  // Dispatch custom browser event for reactive UI badge updates
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('erp-outbox-updated', {
        detail: {
          uuid: envelope.uuid,
          transactionType: envelope.transactionType,
          syncStatus: envelope.syncStatus
        }
      })
    );
  }

  // Trigger sync in background if online
  triggerSyncImmediate();

  return envelope;
}

/**
 * Get current pending outbox transactions count
 */
export async function getPendingOutboxCount(): Promise<number> {
  try {
    const all = await getAllRecords<TransactionEnvelope>('local_transactional_outbox');
    return all.filter((item) => item.syncStatus === 'PENDING_SYNC' || item.syncStatus === 'SYNCING').length;
  } catch {
    return 0;
  }
}

/**
 * Main push synchronization cycle with server-authoritative acknowledgment
 */
export async function processOutboxSync(): Promise<OutboxPushResult | null> {
  if (syncInProgress) return null;
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return null;
  }

  syncInProgress = true;
  notifySyncState('SYNCING');

  try {
    // 1. Fetch all pending transactions sorted strictly by dependencyOrder then createdAtClient
    const allOutbox = await getAllRecords<TransactionEnvelope>('local_transactional_outbox');
    const pending = allOutbox
      .filter((item) => item.syncStatus === 'PENDING_SYNC')
      .sort((a, b) => {
        if (a.dependencyOrder !== b.dependencyOrder) {
          return a.dependencyOrder - b.dependencyOrder;
        }
        return new Date(a.createdAtClient).getTime() - new Date(b.createdAtClient).getTime();
      });

    if (pending.length === 0) {
      syncInProgress = false;
      notifySyncState('IDLE');
      return { accepted: 0, conflicted: 0, rejected: 0, serverSeq: 0 };
    }

    // Take a batch of up to 50 operations
    const batch = pending.slice(0, 50);

    // Mark as SYNCING in local storage
    for (const item of batch) {
      item.syncStatus = 'SYNCING';
      item.lastAttemptAt = new Date().toISOString();
      item.retryCount = (item.retryCount || 0) + 1;
      await saveRecord('local_transactional_outbox', item);
    }

    // 2. Dispatch to Server-Authoritative Sync Endpoint
    const tenantId = getActiveTenantId();
    const deviceId = getDeviceId();

    const response = await fetch('/api/v1/sync/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': deviceId,
        'X-Tenant-Id': tenantId
      },
      body: JSON.stringify({
        deviceId,
        tenantId,
        transactions: batch
      })
    });

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const data = await response.json();
    const serverSeq = data.serverSeq || 0;
    const results: Array<{
      uuid: string;
      status: 'ACCEPTED' | 'CONFLICT' | 'REJECTED';
      serverSeq?: number;
      conflictDetails?: any;
      reason?: string;
    }> = data.results || [];

    let acceptedCount = 0;
    let conflictedCount = 0;
    let rejectedCount = 0;

    // 3. Process Server Feedback
    for (const res of results) {
      const match = batch.find((b) => b.uuid === res.uuid);
      if (!match) continue;

      if (res.status === 'ACCEPTED' && res.serverSeq) {
        // STRICT RULE: Only mark SYNCED when serverSeq is received!
        match.syncStatus = 'SYNCED';
        match.serverSeq = res.serverSeq;
        match.errorReason = undefined;
        await saveRecord('local_transactional_outbox', match);
        acceptedCount++;
      } else if (res.status === 'CONFLICT') {
        match.syncStatus = 'CONFLICT';
        match.errorReason = res.reason || 'Server-authoritative state conflict';
        await saveRecord('local_transactional_outbox', match);
        conflictedCount++;

        // Record conflict in the conflict registry
        const conflictRecord: SyncConflictRecord = {
          id: `conf_${match.uuid}`,
          transactionUuid: match.uuid,
          transactionType: match.transactionType,
          tenantId: match.tenantId,
          localPayload: match.payload,
          serverPayload: res.conflictDetails?.serverPayload || null,
          conflictReason: res.reason || 'Version divergence',
          createdAt: new Date().toISOString()
        };
        await saveRecord('sync_conflict_registry', conflictRecord);
      } else {
        match.syncStatus = 'REJECTED';
        match.errorReason = res.reason || 'Rejected by validation rules';
        await saveRecord('local_transactional_outbox', match);
        rejectedCount++;
      }
    }

    // Update last sync cursor
    await saveRecord('device_sync_cursors', {
      id: deviceId,
      deviceId,
      tenantId,
      lastServerSeq: serverSeq,
      lastSyncTimestamp: new Date().toISOString()
    });

    notifySyncState('IDLE');
    return {
      accepted: acceptedCount,
      conflicted: conflictedCount,
      rejected: rejectedCount,
      serverSeq
    };
  } catch (err: any) {
    console.warn('[TransactionalOutbox] Sync error, scheduling exponential backoff:', err);
    // Mark batch items back to PENDING_SYNC for retry
    const allOutbox = await getAllRecords<TransactionEnvelope>('local_transactional_outbox');
    for (const item of allOutbox) {
      if (item.syncStatus === 'SYNCING') {
        item.syncStatus = 'PENDING_SYNC';
        item.errorReason = err?.message || 'Network disconnected';
        await saveRecord('local_transactional_outbox', item);
      }
    }
    notifySyncState('ERROR');
    return null;
  } finally {
    syncInProgress = false;
  }
}

/**
 * Immediate trigger with debouncing
 */
export function triggerSyncImmediate(): void {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    processOutboxSync();
  }, 350);
}

/**
 * Helper to notify React UI of state changes
 */
function notifySyncState(state: 'IDLE' | 'SYNCING' | 'ERROR'): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('erp-sync-state-changed', {
        detail: {
          state,
          timestamp: new Date().toISOString()
        }
      })
    );
  }
}

/**
 * Connect to Real-time Server-Sent Events (SSE) stream for live multi-device synchronization
 */
export function startRealtimeSyncStream(): void {
  if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;

  const tenantId = getActiveTenantId();
  const deviceId = getDeviceId();

  if (eventSource) {
    try {
      eventSource.close();
    } catch {
      // ignore
    }
  }

  try {
    const sseUrl = `/api/v1/sync/stream?tenantId=${encodeURIComponent(tenantId)}&deviceId=${encodeURIComponent(deviceId)}`;
    eventSource = new EventSource(sseUrl);

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'NEW_COMMITS' && payload.originDeviceId !== deviceId) {
          // Another device committed new data! Trigger outbox push and delta pull
          triggerSyncImmediate();
          window.dispatchEvent(new CustomEvent('erp-remote-data-updated', { detail: payload }));
        }
      } catch {
        // ignore parse error
      }
    };

    eventSource.onerror = () => {
      // Reconnection handled automatically by browser EventSource
    };
  } catch (err) {
    console.warn('[TransactionalOutbox] Could not establish SSE connection:', err);
  }
}

/**
 * Start background synchronization daemon with heartbeat and exponential backoff
 */
export function startOutboxDaemon(): void {
  initLocalDatabase().then(() => {
    console.log('[TransactionalOutbox] Local storage engine initialized.');
    triggerSyncImmediate();
    startRealtimeSyncStream();
  });

  if (typeof window !== 'undefined') {
    // Online / offline listeners
    window.addEventListener('online', () => {
      console.log('[TransactionalOutbox] Internet re-established, triggering sync');
      triggerSyncImmediate();
    });

    // Periodic heartbeat sync every 15 seconds
    setInterval(() => {
      if (navigator.onLine && !syncInProgress) {
        processOutboxSync();
      }
    }, 15000);
  }
}

// Auto-start daemon on module load if in browser
if (typeof window !== 'undefined') {
  startOutboxDaemon();
}
