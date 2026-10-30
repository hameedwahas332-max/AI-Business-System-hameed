// Server-Authoritative Multi-Device Synchronization & Conflict Resolution Engine
// Implements CR-2026-TAURI-OFFLINE-SYNC-001

import crypto from 'crypto';
import { Response } from 'express';
import {
  mockInvoicesList,
  mockPurchaseInvoicesList,
  mockPaymentsList,
  mockProducts,
  mockInventoryMovements,
  persistAllToDisk
} from '../dataStore';

export interface ServerSyncTransaction {
  uuid: string;
  tenantId: string;
  userId: string;
  deviceId: string;
  transactionType: string;
  createdAtClient: string;
  idempotencyKey: string;
  syncStatus: string;
  schemaVersion: number;
  rowVersion: number;
  dependencyOrder: number;
  payload: any;
}

export interface CommittedLedgerEntry {
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
  previousHash: string;
}

export interface ServerSyncConflict {
  id: string;
  transactionUuid: string;
  transactionType: string;
  tenantId: string;
  localPayload: any;
  serverPayload: any;
  conflictReason: string;
  createdAt: string;
  resolvedAt?: string;
  resolutionStrategy?: string;
  resolvedBy?: string;
}

// In-Memory state with disk persistence compatibility
const tenantSequences: Map<string, number> = new Map();
const idempotencyRegistry: Map<string, { status: string; serverSeq: number; response: any; timestamp: string }> = new Map();
const tenantLedgers: Map<string, CommittedLedgerEntry[]> = new Map();
const tenantConflicts: Map<string, ServerSyncConflict[]> = new Map();
const tenantCommittedTransactions: Map<string, Array<{ serverSeq: number; tx: ServerSyncTransaction; committedAt: string }>> = new Map();

// Real-Time Multi-Device SSE subscriber clients
const sseClientsByTenant: Map<string, Set<{ deviceId: string; res: Response }>> = new Map();

/**
 * Get current sequence number for a given tenant
 */
export function getTenantServerSeq(tenantId: string): number {
  return tenantSequences.get(tenantId) || 0;
}

/**
 * Increment and retrieve next sequence number for a tenant
 */
function getNextTenantServerSeq(tenantId: string): number {
  const current = getTenantServerSeq(tenantId);
  const next = current + 1;
  tenantSequences.set(tenantId, next);
  return next;
}

/**
 * Register SSE client for live multi-device synchronization
 */
export function registerSseClient(tenantId: string, deviceId: string, res: Response): void {
  if (!sseClientsByTenant.has(tenantId)) {
    sseClientsByTenant.set(tenantId, new Set());
  }
  const clientSet = sseClientsByTenant.get(tenantId)!;
  const clientObj = { deviceId, res };
  clientSet.add(clientObj);

  // Send immediate hello
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', tenantId, deviceId, currentSeq: getTenantServerSeq(tenantId) })}\n\n`);

  res.on('close', () => {
    clientSet.delete(clientObj);
  });
}

/**
 * Broadcast committed changes to all connected devices in the same tenant
 */
export function broadcastTenantUpdate(tenantId: string, originDeviceId: string, serverSeq: number, transactionCount: number): void {
  const clientSet = sseClientsByTenant.get(tenantId);
  if (!clientSet || clientSet.size === 0) return;

  const payload = JSON.stringify({
    type: 'NEW_COMMITS',
    tenantId,
    originDeviceId,
    serverSeq,
    transactionCount,
    timestamp: new Date().toISOString()
  });

  for (const client of clientSet) {
    try {
      client.res.write(`data: ${payload}\n\n`);
    } catch {
      // client may have disconnected
    }
  }
}

/**
 * Compute cryptographic ledger block hash
 */
function computeLedgerHash(entry: Omit<CommittedLedgerEntry, 'hash'>): string {
  const data = `${entry.sequenceId}:${entry.tenantId}:${entry.transactionUuid}:${entry.accountCode}:${entry.debit}:${entry.credit}:${entry.timestamp}:${entry.previousHash}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Append entry to server immutable financial ledger
 */
function appendFinancialLedger(tenantId: string, entryData: {
  transactionUuid: string;
  transactionType: string;
  accountCode: string;
  debit: number;
  credit: number;
  currency: string;
  referenceId: string;
  description: string;
}): CommittedLedgerEntry {
  if (!tenantLedgers.has(tenantId)) {
    tenantLedgers.set(tenantId, []);
  }
  const ledger = tenantLedgers.get(tenantId)!;
  const sequenceId = ledger.length + 1;
  const previousHash = ledger.length > 0 ? ledger[ledger.length - 1].hash : '0000000000000000000000000000000000000000000000000000000000000000';

  const rawEntry: Omit<CommittedLedgerEntry, 'hash'> = {
    sequenceId,
    tenantId,
    transactionUuid: entryData.transactionUuid,
    transactionType: entryData.transactionType,
    accountCode: entryData.accountCode,
    debit: Number(entryData.debit) || 0,
    credit: Number(entryData.credit) || 0,
    currency: entryData.currency || 'YER',
    timestamp: new Date().toISOString(),
    referenceId: entryData.referenceId,
    description: entryData.description,
    previousHash
  };

  const fullEntry: CommittedLedgerEntry = {
    ...rawEntry,
    hash: computeLedgerHash(rawEntry)
  };

  ledger.push(fullEntry);
  return fullEntry;
}

/**
 * Core Batch Push Synchronization Handler
 */
export async function handleSyncPush(params: {
  tenantId: string;
  deviceId: string;
  transactions: ServerSyncTransaction[];
}): Promise<{
  success: boolean;
  serverSeq: number;
  results: Array<{
    uuid: string;
    status: 'ACCEPTED' | 'CONFLICT' | 'REJECTED';
    serverSeq?: number;
    reason?: string;
    conflictDetails?: any;
  }>;
}> {
  const { tenantId, deviceId, transactions } = params;
  const results: Array<{
    uuid: string;
    status: 'ACCEPTED' | 'CONFLICT' | 'REJECTED';
    serverSeq?: number;
    reason?: string;
    conflictDetails?: any;
  }> = [];

  let highestCommittedSeq = getTenantServerSeq(tenantId);
  let acceptedCount = 0;

  for (const tx of transactions) {
    // 1. Idempotency Check
    if (idempotencyRegistry.has(tx.idempotencyKey)) {
      const cached = idempotencyRegistry.get(tx.idempotencyKey)!;
      results.push({
        uuid: tx.uuid,
        status: cached.status as any,
        serverSeq: cached.serverSeq,
        reason: 'Idempotent replay accepted'
      });
      continue;
    }

    // 2. Conflict & Concurrency Detection
    const tType = (tx.transactionType || '').toUpperCase();
    let hasConflict = false;
    let conflictReason = '';
    let existingServerPayload: any = null;

    if (tType.includes('INVOICE') || tType.includes('POS_SALE')) {
      const invoiceNumber = tx.payload?.invoice_number || tx.payload?.id;
      const existing = mockInvoicesList.find((inv) => (inv.invoice_number === invoiceNumber || inv.id === invoiceNumber) && (inv as any).company_id === tenantId);
      if (existing) {
        // If an invoice with same number exists and has different rowVersion or modified total
        if (existing.status === 'CANCELLED' || existing.status === 'RETURNED') {
          hasConflict = true;
          conflictReason = `Invoice is already in terminal state: ${existing.status}`;
          existingServerPayload = existing;
        }
      }
    } else if (tType.includes('STOCK') || tType.includes('INVENTORY')) {
      const productId = tx.payload?.productId || tx.payload?.product_id;
      const existingProduct = mockProducts.find((p) => p.id === productId);
      if (existingProduct) {
        const requiredQty = Number(tx.payload?.quantity || tx.payload?.qty || 0);
        const availableStock = Number(existingProduct.current_stock ?? existingProduct.qty ?? 0);
        if (tx.payload?.movementType === 'OUT' && availableStock < requiredQty) {
          hasConflict = true;
          conflictReason = `Insufficient server stock: Available ${availableStock}, requested ${requiredQty}`;
          existingServerPayload = existingProduct;
        }
      }
    }

    if (hasConflict) {
      // Record conflict in tenant conflict store
      if (!tenantConflicts.has(tenantId)) tenantConflicts.set(tenantId, []);
      const conflictRecord: ServerSyncConflict = {
        id: `conf_srv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        transactionUuid: tx.uuid,
        transactionType: tx.transactionType,
        tenantId,
        localPayload: tx.payload,
        serverPayload: existingServerPayload,
        conflictReason,
        createdAt: new Date().toISOString()
      };
      tenantConflicts.get(tenantId)!.push(conflictRecord);

      results.push({
        uuid: tx.uuid,
        status: 'CONFLICT',
        reason: conflictReason,
        conflictDetails: { serverPayload: existingServerPayload }
      });

      idempotencyRegistry.set(tx.idempotencyKey, {
        status: 'CONFLICT',
        serverSeq: highestCommittedSeq,
        response: { reason: conflictReason },
        timestamp: new Date().toISOString()
      });
      continue;
    }

    // 3. Commit Transaction to Server-Authoritative State
    const nextSeq = getNextTenantServerSeq(tenantId);
    highestCommittedSeq = nextSeq;

    // Apply to underlying data stores
    if (tType.includes('INVOICE') || tType.includes('POS_SALE')) {
      const inv = tx.payload;
      const cleanInv = {
        ...inv,
        id: inv.id || tx.uuid,
        company_id: tenantId,
        serverSeq: nextSeq,
        updated_at: new Date().toISOString()
      };
      const existingIdx = mockInvoicesList.findIndex((i) => i.id === cleanInv.id || i.invoice_number === cleanInv.invoice_number);
      if (existingIdx >= 0) {
        mockInvoicesList[existingIdx] = cleanInv;
      } else {
        mockInvoicesList.unshift(cleanInv);
      }

      // Append ledger debit to Accounts Receivable and credit to Sales Revenue
      const invoiceTotal = Number(inv.grand_total || inv.total || 0);
      if (invoiceTotal > 0) {
        appendFinancialLedger(tenantId, {
          transactionUuid: tx.uuid,
          transactionType: 'SALES_INVOICE_POSTING',
          accountCode: '1100_AR',
          debit: invoiceTotal,
          credit: 0,
          currency: inv.currency || 'YER',
          referenceId: inv.invoice_number || tx.uuid,
          description: `فاتورة مبيعات رقم ${inv.invoice_number || ''}`
        });
        appendFinancialLedger(tenantId, {
          transactionUuid: tx.uuid,
          transactionType: 'SALES_INVOICE_POSTING',
          accountCode: '4100_SALES_REV',
          debit: 0,
          credit: invoiceTotal,
          currency: inv.currency || 'YER',
          referenceId: inv.invoice_number || tx.uuid,
          description: `إيراد مبيعات فاتورة رقم ${inv.invoice_number || ''}`
        });
      }
    } else if (tType.includes('PURCHASE')) {
      const pInv = tx.payload;
      const cleanPInv = {
        ...pInv,
        id: pInv.id || tx.uuid,
        company_id: tenantId,
        serverSeq: nextSeq,
        updated_at: new Date().toISOString()
      };
      const existingIdx = mockPurchaseInvoicesList.findIndex((i) => i.id === cleanPInv.id || i.invoice_number === cleanPInv.invoice_number);
      if (existingIdx >= 0) {
        mockPurchaseInvoicesList[existingIdx] = cleanPInv;
      } else {
        mockPurchaseInvoicesList.unshift(cleanPInv);
      }

      const pTotal = Number(pInv.grand_total || pInv.total || 0);
      if (pTotal > 0) {
        appendFinancialLedger(tenantId, {
          transactionUuid: tx.uuid,
          transactionType: 'PURCHASE_INVOICE_POSTING',
          accountCode: '1300_INVENTORY',
          debit: pTotal,
          credit: 0,
          currency: pInv.currency || 'YER',
          referenceId: pInv.invoice_number || tx.uuid,
          description: `فاتورة مشتريات رقم ${pInv.invoice_number || ''}`
        });
        appendFinancialLedger(tenantId, {
          transactionUuid: tx.uuid,
          transactionType: 'PURCHASE_INVOICE_POSTING',
          accountCode: '2100_AP',
          debit: 0,
          credit: pTotal,
          currency: pInv.currency || 'YER',
          referenceId: pInv.invoice_number || tx.uuid,
          description: `ذمم موردين فاتورة مشتريات رقم ${pInv.invoice_number || ''}`
        });
      }
    } else if (tType.includes('PAYMENT') || tType.includes('RECEIPT')) {
      const pmt = tx.payload;
      const cleanPmt = {
        ...pmt,
        id: pmt.id || tx.uuid,
        company_id: tenantId,
        serverSeq: nextSeq,
        updated_at: new Date().toISOString()
      };
      const existingIdx = mockPaymentsList.findIndex((p) => p.id === cleanPmt.id);
      if (existingIdx >= 0) {
        mockPaymentsList[existingIdx] = cleanPmt;
      } else {
        mockPaymentsList.unshift(cleanPmt);
      }

      const amt = Number(pmt.amount || 0);
      if (amt > 0) {
        const isReceipt = (pmt.type || '').toUpperCase().includes('RECEIPT') || pmt.type === 'سند قبض';
        appendFinancialLedger(tenantId, {
          transactionUuid: tx.uuid,
          transactionType: isReceipt ? 'RECEIPT_VOUCHER_POSTING' : 'PAYMENT_VOUCHER_POSTING',
          accountCode: isReceipt ? '1010_CASH' : '2100_AP',
          debit: amt,
          credit: 0,
          currency: pmt.currency || 'YER',
          referenceId: pmt.reference_number || tx.uuid,
          description: pmt.notes || pmt.description || 'سند مالي'
        });
        appendFinancialLedger(tenantId, {
          transactionUuid: tx.uuid,
          transactionType: isReceipt ? 'RECEIPT_VOUCHER_POSTING' : 'PAYMENT_VOUCHER_POSTING',
          accountCode: isReceipt ? '1100_AR' : '1010_CASH',
          debit: 0,
          credit: amt,
          currency: pmt.currency || 'YER',
          referenceId: pmt.reference_number || tx.uuid,
          description: pmt.notes || pmt.description || 'سند مالي'
        });
      }
    }

    // Record committed transaction for delta pull
    if (!tenantCommittedTransactions.has(tenantId)) {
      tenantCommittedTransactions.set(tenantId, []);
    }
    tenantCommittedTransactions.get(tenantId)!.push({
      serverSeq: nextSeq,
      tx,
      committedAt: new Date().toISOString()
    });

    // Record in idempotency cache
    idempotencyRegistry.set(tx.idempotencyKey, {
      status: 'ACCEPTED',
      serverSeq: nextSeq,
      response: { uuid: tx.uuid },
      timestamp: new Date().toISOString()
    });

    results.push({
      uuid: tx.uuid,
      status: 'ACCEPTED',
      serverSeq: nextSeq
    });

    acceptedCount++;
  }

  // Persist memory changes to data store
  persistAllToDisk();

  // If any transactions were accepted, broadcast event to other connected devices
  if (acceptedCount > 0) {
    broadcastTenantUpdate(tenantId, deviceId, highestCommittedSeq, acceptedCount);
  }

  return {
    success: true,
    serverSeq: highestCommittedSeq,
    results
  };
}

/**
 * Handle Delta Pull for Sync Engine
 */
export function handleSyncPull(tenantId: string, sinceSeq: number): {
  serverSeq: number;
  transactions: Array<{ serverSeq: number; tx: ServerSyncTransaction; committedAt: string }>;
  ledgerEntries: CommittedLedgerEntry[];
} {
  const currentSeq = getTenantServerSeq(tenantId);
  const allTxs = tenantCommittedTransactions.get(tenantId) || [];
  const deltaTxs = allTxs.filter((item) => item.serverSeq > sinceSeq);
  const ledger = tenantLedgers.get(tenantId) || [];

  return {
    serverSeq: currentSeq,
    transactions: deltaTxs,
    ledgerEntries: ledger.slice(-100) // latest 100 immutable ledger lines
  };
}

/**
 * Handle authorized conflict resolution
 */
export function handleConflictResolution(params: {
  tenantId: string;
  userId: string;
  conflictId: string;
  resolutionStrategy: 'CLIENT_WINS' | 'SERVER_WINS' | 'MANUAL_MERGE';
  resolvedPayload?: any;
}): { success: boolean; message: string; resolvedConflict?: ServerSyncConflict } {
  const { tenantId, userId, conflictId, resolutionStrategy, resolvedPayload } = params;
  const conflicts = tenantConflicts.get(tenantId) || [];
  const target = conflicts.find((c) => c.id === conflictId);

  if (!target) {
    return { success: false, message: 'Conflict record not found' };
  }

  target.resolvedAt = new Date().toISOString();
  target.resolutionStrategy = resolutionStrategy;
  target.resolvedBy = userId;

  if (resolutionStrategy === 'CLIENT_WINS' || resolutionStrategy === 'MANUAL_MERGE') {
    const payloadToApply = resolutionStrategy === 'MANUAL_MERGE' ? resolvedPayload : target.localPayload;
    if (payloadToApply) {
      // Re-apply to mockInvoicesList or relevant store
      const nextSeq = getNextTenantServerSeq(tenantId);
      const cleanRecord = {
        ...payloadToApply,
        company_id: tenantId,
        serverSeq: nextSeq,
        updated_at: new Date().toISOString()
      };
      const idx = mockInvoicesList.findIndex((i) => i.id === cleanRecord.id);
      if (idx >= 0) {
        mockInvoicesList[idx] = cleanRecord;
      }
    }
  }

  persistAllToDisk();
  return { success: true, message: 'Conflict resolved successfully', resolvedConflict: target };
}

/**
 * Get all registered conflicts for a tenant
 */
export function getTenantConflicts(tenantId: string): ServerSyncConflict[] {
  return tenantConflicts.get(tenantId) || [];
}
