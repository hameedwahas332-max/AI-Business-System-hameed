// Persistent Transactional Outbox Engine for Offline-First Multi-Device ERP
// Implements CR-2026-TAURI-OFFLINE-SYNC-001 with 8s Timeout & Lock Recovery

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
  SyncConflictRecord,
  purgeSyncedOutboxRecords,
  resetStuckOutboxTransactions
} from './localSqliteDal';

export interface OutboxPushResult {
  accepted: number;
  conflicted: number;
  rejected: number;
  serverSeq: number;
}

let syncInProgress = false;
let syncLockTimestamp = 0;
let syncTimer: any = null;
let eventSource: EventSource | null = null;
let onlineDebounceTimer: any = null;

/**
 * Check if instant automatic synchronization is enabled by user preference
 */
export function isAutoSyncEnabled(): boolean {
  if (typeof localStorage === 'undefined') return true;
  return localStorage.getItem('erp_auto_sync_enabled') !== 'false';
}

/**
 * Enable or disable instant automatic synchronization
 */
export function setAutoSyncEnabled(enabled: boolean): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('erp_auto_sync_enabled', enabled ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent('erp-auto-sync-toggled', { detail: { enabled } }));
    window.dispatchEvent(new CustomEvent('erp-sync-status-changed'));
  }
}

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
    window.dispatchEvent(new CustomEvent('erp-sync-status-changed'));
  }

  // Trigger sync in background if online & auto-sync is active
  if (isAutoSyncEnabled()) {
    triggerSyncImmediate();
  }

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
 * Reset any hung or failed outbox transactions back to PENDING_SYNC, clear sync lock, and immediately resend
 */
export async function forceResetAndResendOutbox(): Promise<OutboxPushResult | null> {
  syncInProgress = false;
  syncLockTimestamp = 0;
  await resetStuckOutboxTransactions(true);
  notifySyncState('SYNCING');
  return await processOutboxSync();
}

/**
 * Main push synchronization cycle with strict 8s timeout, 12s lock recovery, and fault-tolerant batching
 */
export async function processOutboxSync(): Promise<OutboxPushResult | null> {
  const now = Date.now();

  // 1. Lock Recovery: If sync has been running for > 12 seconds, break the lock
  if (syncInProgress) {
    if (now - syncLockTimestamp > 12000) {
      console.warn('[TransactionalOutbox] Stale sync lock (>12s) detected, releasing lock automatically.');
      syncInProgress = false;
      syncLockTimestamp = 0;
    } else {
      return null;
    }
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    notifySyncState('IDLE');
    return null;
  }

  syncInProgress = true;
  syncLockTimestamp = Date.now();
  notifySyncState('SYNCING');

  let abortTimer: any = null;
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;

  try {
    // 2. Fetch all pending transactions sorted strictly by dependencyOrder then createdAtClient
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
      syncLockTimestamp = 0;
      notifySyncState('IDLE');
      return { accepted: 0, conflicted: 0, rejected: 0, serverSeq: 0 };
    }

    // 3. Batch push: Take a batch of up to 50 operations
    const batch = pending.slice(0, 50);

    // Mark as SYNCING in local storage
    for (const item of batch) {
      item.syncStatus = 'SYNCING';
      item.lastAttemptAt = new Date().toISOString();
      item.retryCount = (item.retryCount || 0) + 1;
      await saveRecord('local_transactional_outbox', item);
    }

    // 4. Strict 8-second Timeout AbortController
    if (controller) {
      abortTimer = setTimeout(() => {
        console.warn('[TransactionalOutbox] Request exceeded 8000ms timeout, aborting to prevent hanging.');
        controller.abort();
      }, 8000);
    }

    // 5. Dispatch to Server-Authoritative Sync Endpoint
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
      }),
      signal: controller?.signal
    });

    if (abortTimer) {
      clearTimeout(abortTimer);
      abortTimer = null;
    }

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const data = await response.json();
    const serverSeq = data.serverSeq || data?.data?.serverSeq || 0;
    const results: Array<{
      uuid: string;
      status: 'ACCEPTED' | 'CONFLICT' | 'REJECTED';
      serverSeq?: number;
      conflictDetails?: any;
      reason?: string;
    }> = data.results || data?.data?.results || [];

    let acceptedCount = 0;
    let conflictedCount = 0;
    let rejectedCount = 0;

    // 6. Process Server Feedback per Transaction (Fault-Tolerant: one rejection doesn't halt the rest!)
    for (const res of results) {
      const match = batch.find((b) => b.uuid === res.uuid);
      if (!match) continue;

      if (res.status === 'ACCEPTED') {
        const confirmedSeq = res.serverSeq || serverSeq;
        match.syncStatus = 'SYNCED';
        match.serverSeq = confirmedSeq;
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
        // Rejection / validation error: mark FAILED and bypass without halting queue
        match.syncStatus = 'REJECTED';
        match.errorReason = res.reason || 'Rejected by validation rules';
        await saveRecord('local_transactional_outbox', match);
        rejectedCount++;
      }
    }

    // Check if any transactions in the batch were unacknowledged by the server
    for (const item of batch) {
      const isAcked = results.some((r) => r.uuid === item.uuid);
      if (!isAcked) {
        if (item.retryCount && item.retryCount > 5) {
          item.syncStatus = 'REJECTED';
          item.errorReason = 'Exceeded maximum retry attempts without acknowledgment';
        } else {
          item.syncStatus = 'PENDING_SYNC';
        }
        await saveRecord('local_transactional_outbox', item);
      }
    }

    // 7. Auto-Purge Old Synced Records to prevent storage bloat
    await purgeSyncedOutboxRecords(50);

    // Update last sync cursor
    if (serverSeq > 0) {
      await saveRecord('device_sync_cursors', {
        id: deviceId,
        deviceId,
        tenantId,
        lastServerSeq: serverSeq,
        lastSyncTimestamp: new Date().toISOString()
      });
    }

    notifySyncState('IDLE');
    return {
      accepted: acceptedCount,
      conflicted: conflictedCount,
      rejected: rejectedCount,
      serverSeq
    };
  } catch (err: any) {
    console.warn('[TransactionalOutbox] Sync request aborted or failed:', err);

    // Mark current batch items back to PENDING_SYNC for automatic retry
    try {
      const allOutbox = await getAllRecords<TransactionEnvelope>('local_transactional_outbox');
      for (const item of allOutbox) {
        if (item.syncStatus === 'SYNCING') {
          item.syncStatus = 'PENDING_SYNC';
          item.errorReason = err?.name === 'AbortError' ? 'انتهت مهلة المزامنة (8 ثوانٍ)' : (err?.message || 'Network disconnected');
          await saveRecord('local_transactional_outbox', item);
        }
      }
    } catch {}

    notifySyncState('ERROR');
    return null;
  } finally {
    if (abortTimer) clearTimeout(abortTimer);
    syncInProgress = false;
    syncLockTimestamp = 0;
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
    window.dispatchEvent(new CustomEvent('erp-sync-status-changed'));
    window.dispatchEvent(new CustomEvent('erp-outbox-updated'));
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
          if (isAutoSyncEnabled()) {
            triggerSyncImmediate();
          }
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
 * Start background synchronization daemon with online auto-sync and 15s heartbeat
 */
export function startOutboxDaemon(): void {
  initLocalDatabase().then(() => {
    console.log('[TransactionalOutbox] Local storage engine initialized.');
    if (isAutoSyncEnabled()) {
      triggerSyncImmediate();
    }
    startRealtimeSyncStream();
  });

  if (typeof window !== 'undefined') {
    // 1. Instant Auto-Sync on Network Connection (with 500ms stabilization)
    window.addEventListener('online', () => {
      if (!isAutoSyncEnabled()) return;
      if (onlineDebounceTimer) clearTimeout(onlineDebounceTimer);
      onlineDebounceTimer = setTimeout(() => {
        console.log('[TransactionalOutbox] Internet established, executing instant auto-sync');
        processOutboxSync();
      }, 500);
    });

    // 2. Tab / Window Visibility Change listener: Sync immediately when user returns to app
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && navigator.onLine && isAutoSyncEnabled()) {
        triggerSyncImmediate();
      }
    });

    // 3. Periodic heartbeat sync every 15 seconds when online and pending items exist
    setInterval(() => {
      if (navigator.onLine && !syncInProgress && isAutoSyncEnabled()) {
        getPendingOutboxCount().then((count) => {
          if (count > 0) {
            processOutboxSync();
          }
        }).catch(() => {});
      }
    }, 15000);
  }
}

// Auto-start daemon on module load if in browser
if (typeof window !== 'undefined') {
  startOutboxDaemon();
}
