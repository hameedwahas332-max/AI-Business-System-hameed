import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { formatAmount, getActiveCurrencySymbol, roundMoney } from '../../lib/formatters';
import { ExportActions } from '../Common/ExportActions';
import { TableExportConfig } from '../../lib/exportUtils';
import {
  BookOpen,
  Search,
  Loader2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Scale,
  Plus,
  Trash2,
  GitBranch,
  Layers,
  ListTree,
  FileSpreadsheet,
  ChevronDown,
  ChevronLeft,
  X,
  CheckCircle2,
  Calendar,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  Eye,
  RotateCcw,
} from 'lucide-react';

// ==================== TYPES ====================
export interface JournalLineItem {
  id?: string;
  account_id?: string;
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface NormalizedJournalEntry {
  id: string;
  entry_number: string;
  date: string;
  transaction_date: string;
  reference_type: string;
  reference_id?: string | null;
  description: string;
  total_debit: number;
  total_credit: number;
  debit: number;
  credit: number;
  status: string;
  created_by: string;
  created_by_name?: string;
  lines: JournalLineItem[];
  source?: string;
}

export interface ChartAccountItem {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  nature: 'DEBIT' | 'CREDIT';
  debit_total: number;
  credit_total: number;
  balance: number;
  is_active?: boolean;
}

interface TAccountMovement {
  id: string;
  date: string;
  entry_number: string;
  reference_type: string;
  reference_id?: string | null;
  description: string;
  debit: number;
  credit: number;
  running_balance: number;
}

type LedgerMainTab = 'journal' | 'coa' | 'trial_balance';
type JournalViewMode = 'detailed' | 'summary';

// ==================== STANDARD CHART OF ACCOUNTS ====================
const STANDARD_COA_BLUEPRINT: Array<{
  code: string;
  name: string;
  name_ar: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  nature: 'DEBIT' | 'CREDIT';
}> = [
  // 1000 — الأصول (Assets)
  { code: '1101', name: 'Cash on Hand', name_ar: 'الصندوق النقدي', type: 'ASSET', nature: 'DEBIT' },
  { code: '1102', name: 'Bank Accounts', name_ar: 'البنك / الحسابات المصرفية', type: 'ASSET', nature: 'DEBIT' },
  { code: '1107', name: 'Electronic Wallets & Networks', name_ar: 'المحافظ الإلكترونية والشبكات', type: 'ASSET', nature: 'DEBIT' },
  { code: '1103', name: 'Accounts Receivable', name_ar: 'ذمم العملاء', type: 'ASSET', nature: 'DEBIT' },
  { code: '1104', name: 'Merchandise Inventory', name_ar: 'المخزون السلعي', type: 'ASSET', nature: 'DEBIT' },
  { code: '1105', name: 'VAT Input (Recoverable)', name_ar: 'ضريبة المدخلات', type: 'ASSET', nature: 'DEBIT' },
  { code: '1201', name: 'Fixed Assets & Equipment', name_ar: 'الأصول الثابتة والمعدات', type: 'ASSET', nature: 'DEBIT' },

  // 2000 — الالتزامات والخصوم (Liabilities)
  { code: '2101', name: 'Accounts Payable', name_ar: 'ذمم الموردين', type: 'LIABILITY', nature: 'CREDIT' },
  { code: '2102', name: 'VAT Output (Payable)', name_ar: 'ضريبة المخرجات', type: 'LIABILITY', nature: 'CREDIT' },
  { code: '2103', name: 'Accrued Salaries & Expenses', name_ar: 'الرواتب والمصروفات المستحقة', type: 'LIABILITY', nature: 'CREDIT' },

  // 3000 — حقوق الملكية ورأس المال (Equity)
  { code: '3101', name: 'Owner Capital & Opening Balances', name_ar: 'رأس المال والأرصدة الافتتاحية', type: 'EQUITY', nature: 'CREDIT' },
  { code: '3201', name: 'Retained Earnings', name_ar: 'الأرباح المحتجزة / المرحلة', type: 'EQUITY', nature: 'CREDIT' },

  // 4000 — الإيرادات (Revenue)
  { code: '4101', name: 'Sales Revenue', name_ar: 'إيرادات المبيعات', type: 'REVENUE', nature: 'CREDIT' },
  { code: '4102', name: 'Sales Returns & Allowances', name_ar: 'مردودات ومسموحات المبيعات', type: 'REVENUE', nature: 'DEBIT' },

  // 5000 — التكاليف والمصروفات (Expenses & COGS)
  { code: '5101', name: 'Cost of Goods Sold (COGS)', name_ar: 'تكلفة البضاعة المباعة', type: 'EXPENSE', nature: 'DEBIT' },
  { code: '5201', name: 'Salaries & Wages Expense', name_ar: 'مصروفات الرواتب والأجور', type: 'EXPENSE', nature: 'DEBIT' },
  { code: '5202', name: 'General & Admin Expenses', name_ar: 'المصروفات العمومية والإدارية', type: 'EXPENSE', nature: 'DEBIT' },
  { code: '5203', name: 'Rent & Utilities Expense', name_ar: 'مصروفات الإيجارات والمنافع', type: 'EXPENSE', nature: 'DEBIT' },
  { code: '5209', name: 'Inventory Adjustments & Shortage', name_ar: 'فروق وعجز التسويات الجردية', type: 'EXPENSE', nature: 'DEBIT' },
];

const COA_GROUPS: Array<{
  key: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  codePrefix: string;
  title: string;
  subtitle: string;
  badgeClass: string;
  borderClass: string;
}> = [
  {
    key: 'ASSET',
    codePrefix: '1000',
    title: '1000 — الأصول (Assets)',
    subtitle: 'النقدية، البنوك، المحافظ الإلكترونية، العملاء، المخزون، الأصول الثابتة',
    badgeClass: 'm3-badge-success',
    borderClass: 'border-[var(--md-outline-variant)]',
  },
  {
    key: 'LIABILITY',
    codePrefix: '2000',
    title: '2000 — الالتزامات والخصوم (Liabilities)',
    subtitle: 'ذمم الموردين، ضريبة المخرجات، الرواتب والمستحقات',
    badgeClass: 'm3-badge-warning',
    borderClass: 'border-[var(--md-outline-variant)]',
  },
  {
    key: 'EQUITY',
    codePrefix: '3000',
    title: '3000 — حقوق الملكية ورأس المال (Equity)',
    subtitle: 'رأس المال والأرصدة الافتتاحية والأرباح المحتجزة',
    badgeClass: 'm3-badge-info',
    borderClass: 'border-[var(--md-outline-variant)]',
  },
  {
    key: 'REVENUE',
    codePrefix: '4000',
    title: '4000 — الإيرادات (Revenue)',
    subtitle: 'إيرادات المبيعات ومردودات ومسموحات المبيعات',
    badgeClass: 'm3-badge-primary',
    borderClass: 'border-[var(--md-outline-variant)]',
  },
  {
    key: 'EXPENSE',
    codePrefix: '5000',
    title: '5000 — التكاليف والمصروفات (Expenses & COGS)',
    subtitle: 'تكلفة البضاعة المباعة، الرواتب، العمومية، الإيجارات والمنافع، التسويات',
    badgeClass: 'm3-badge-error',
    borderClass: 'border-[var(--md-outline-variant)]',
  },
];

const REFERENCE_TYPE_LABELS: Record<string, { label: string; colorClass: string }> = {
  SALES_INVOICE: { label: 'فاتورة مبيعات', colorClass: 'm3-badge-primary' },
  POS_SALE: { label: 'مبيعات نقطة بيع', colorClass: 'm3-badge-success' },
  PURCHASE_INVOICE: { label: 'فاتورة مشتريات', colorClass: 'm3-badge-info' },
  OPENING_BALANCE: { label: 'رصيد افتتاحي', colorClass: 'm3-badge-info' },
  RECEIPT_VOUCHER: { label: 'سند قبض', colorClass: 'm3-badge-success' },
  PAYMENT_VOUCHER: { label: 'سند صرف', colorClass: 'm3-badge-warning' },
  EXPENSE_VOUCHER: { label: 'سند مصروف', colorClass: 'm3-badge-error' },
  EXPENSE: { label: 'مصروف تشغيلي', colorClass: 'm3-badge-error' },
  PAYROLL: { label: 'مسير رواتب', colorClass: 'm3-badge-secondary' },
  SALES_RETURN: { label: 'مرتجع مبيعات', colorClass: 'm3-badge-warning' },
  INVENTORY_COGS: { label: 'تكلفة بضاعة مباعة', colorClass: 'm3-badge-warning' },
  INVENTORY_ADJUSTMENT: { label: 'تسوية مخزون', colorClass: 'm3-badge-info' },
  FUEL_PUMP_SHIFT: { label: 'وردية محطة وقود', colorClass: 'm3-badge-warning' },
  FUEL_TANK_REFILL: { label: 'تفريغ وقود خزانات', colorClass: 'm3-badge-info' },
  MANUAL: { label: 'قيد يومية يدوي', colorClass: 'm3-badge-secondary' },
  MANUAL_JOURNAL: { label: 'قيد يومية يدوي', colorClass: 'm3-badge-secondary' },
  ADJUSTMENT: { label: 'قيد تسوية', colorClass: 'm3-badge-info' },
};

const MANUAL_REF_TYPES = new Set(['MANUAL', 'MANUAL_JOURNAL', 'ADJUSTMENT', 'OPENING_BALANCE']);

// ==================== HELPERS ====================
function inferAccountCodeFromLegacyType(accType?: string, accName?: string): string {
  const t = String(accType || '').toUpperCase();
  const n = String(accName || '');
  const codeMatch = n.match(/\b(\d{4})\b/);
  if (codeMatch) return codeMatch[1];
  if (t === 'CASH' || t === 'CASH_BANK') return '1101';
  if (t === 'BANK') return '1102';
  if (t === 'WALLET') return '1107';
  if (t === 'ACCOUNTS_RECEIVABLE') return '1103';
  if (t === 'INVENTORY' || t === 'INVENTORY_ADJUSTMENT') return '1104';
  if (t === 'ACCOUNTS_PAYABLE') return '2101';
  if (t === 'SALES_REVENUE' || t === 'FUEL_PUMP_SHIFT') return '4101';
  if (t === 'OPERATING_EXPENSES' || t === 'PURCHASE_EXPENSE') return '5202';
  return '1101';
}

function inferAccountMetaByCode(code: string, fallbackName?: string): {
  name_ar: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  nature: 'DEBIT' | 'CREDIT';
} {
  const cleanCode = String(code || '').trim();
  const std = STANDARD_COA_BLUEPRINT.find((s) => s.code === cleanCode);
  if (std) {
    return { name_ar: std.name_ar, type: std.type, nature: std.nature };
  }
  const type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE' = cleanCode.startsWith('1')
    ? 'ASSET'
    : cleanCode.startsWith('2')
    ? 'LIABILITY'
    : cleanCode.startsWith('3')
    ? 'EQUITY'
    : cleanCode.startsWith('4')
    ? 'REVENUE'
    : 'EXPENSE';
  const nature: 'DEBIT' | 'CREDIT' =
    cleanCode === '4102' ? 'DEBIT' : type === 'ASSET' || type === 'EXPENSE' ? 'DEBIT' : 'CREDIT';
  return {
    name_ar: fallbackName || `حساب ${cleanCode}`,
    type,
    nature,
  };
}

function readLocalTenantArray(baseKey: string, companyId?: string): any[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  const results: any[] = [];
  const tryParse = (raw: string | null) => {
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (!item || typeof item !== 'object') continue;
          const itemComp = item.company_id || item.companyId;
          if (!companyId || !itemComp || String(itemComp) === String(companyId)) {
            results.push(item);
          }
        }
      }
    } catch {}
  };
  if (companyId) {
    tryParse(localStorage.getItem(`${baseKey}_${companyId}`));
  }
  if (results.length === 0) {
    tryParse(localStorage.getItem(baseKey));
  }
  return results;
}

function writeLocalJournalEntriesStorage(entries: any[], companyId?: string) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    if (companyId) {
      localStorage.setItem(`erp_journal_entries_v1_${companyId}`, JSON.stringify(entries));
    }
    const rawBase = localStorage.getItem('erp_journal_entries_v1');
    let otherTenants: any[] = [];
    if (rawBase && companyId) {
      try {
        const parsed = JSON.parse(rawBase);
        if (Array.isArray(parsed)) {
          otherTenants = parsed.filter((i: any) => {
            const c = i?.company_id || i?.companyId;
            return c && String(c) !== String(companyId);
          });
        }
      } catch {}
    }
    localStorage.setItem('erp_journal_entries_v1', JSON.stringify([...entries, ...otherTenants]));
  } catch {}
}

function normalizeJournalEntryRecord(raw: any): NormalizedJournalEntry | null {
  if (!raw || typeof raw !== 'object') return null;

  const entryId = String(raw.id || raw.entry_number || raw.entryNumber || `je_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
  const entryNumber = String(raw.entry_number || raw.entryNumber || raw.reference_id || entryId);
  const rawDate = raw.date || raw.transaction_date || raw.created_at || new Date().toISOString();
  const dateOnly = String(rawDate).split('T')[0];

  let lines: JournalLineItem[] = [];
  if (Array.isArray(raw.lines) && raw.lines.length > 0) {
    lines = raw.lines.map((l: any, idx: number) => {
      const code = String(l.account_code || inferAccountCodeFromLegacyType(l.account_type, l.account_name)).trim();
      const meta = inferAccountMetaByCode(code, l.account_name);
      return {
        id: l.id || `${entryId}_l_${idx + 1}`,
        account_id: l.account_id,
        account_code: code,
        account_name: l.account_name || meta.name_ar,
        debit: roundMoney(l.debit || 0),
        credit: roundMoney(l.credit || 0),
        description: l.description || raw.description || '',
      };
    });
  } else if (raw.debitAccount || raw.creditAccount) {
    const amt = roundMoney(raw.amount || raw.debit || raw.credit || 0);
    const drCode = inferAccountCodeFromLegacyType(undefined, raw.debitAccount);
    const crCode = inferAccountCodeFromLegacyType(undefined, raw.creditAccount);
    lines = [
      {
        id: `${entryId}_l_1`,
        account_code: drCode,
        account_name: String(raw.debitAccount || inferAccountMetaByCode(drCode).name_ar),
        debit: amt,
        credit: 0,
        description: raw.description || '',
      },
      {
        id: `${entryId}_l_2`,
        account_code: crCode,
        account_name: String(raw.creditAccount || inferAccountMetaByCode(crCode).name_ar),
        debit: 0,
        credit: amt,
        description: raw.description || '',
      },
    ];
  } else {
    const d = roundMoney(raw.debit ?? raw.total_debit ?? 0);
    const c = roundMoney(raw.credit ?? raw.total_credit ?? 0);
    const code = String(raw.account_code || inferAccountCodeFromLegacyType(raw.account_type, raw.account_name)).trim();
    const meta = inferAccountMetaByCode(code, raw.account_name);
    if (d > 0 || c > 0) {
      lines = [
        {
          id: `${entryId}_l_1`,
          account_code: code,
          account_name: raw.account_name || meta.name_ar,
          debit: d,
          credit: c,
          description: raw.description || '',
        },
      ];
    }
  }

  const linesDebit = roundMoney(lines.reduce((s, l) => s + roundMoney(l.debit), 0));
  const linesCredit = roundMoney(lines.reduce((s, l) => s + roundMoney(l.credit), 0));

  const totalDebit = lines.length > 0 ? linesDebit : roundMoney(raw.total_debit ?? raw.debit ?? 0);
  const totalCredit = lines.length > 0 ? linesCredit : roundMoney(raw.total_credit ?? raw.credit ?? 0);

  return {
    id: entryId,
    entry_number: entryNumber,
    date: dateOnly,
    transaction_date: String(raw.transaction_date || raw.date || rawDate),
    reference_type: String(raw.reference_type || 'MANUAL').toUpperCase(),
    reference_id: raw.reference_id || null,
    description: String(raw.description || '-'),
    total_debit: totalDebit,
    total_credit: totalCredit,
    debit: totalDebit,
    credit: totalCredit,
    status: String(raw.status || 'POSTED').toUpperCase(),
    created_by: String(raw.created_by || raw.created_by_name || 'النظام'),
    created_by_name: String(raw.created_by_name || raw.created_by || 'النظام'),
    lines,
  };
}

// ==================== COMPONENT ====================
export const LedgerTab: React.FC = () => {
  const { company, user } = useAuth();
  const companyId = company?.id || (typeof window !== 'undefined' ? localStorage.getItem('erp_company_id') || 'comp_001' : 'comp_001');
  const currency = getActiveCurrencySymbol(company?.currency);

  // Main state
  const [activeTab, setActiveTab] = useState<LedgerMainTab>('journal');
  const [journalViewMode, setJournalViewMode] = useState<JournalViewMode>('detailed');
  const [journalEntries, setJournalEntries] = useState<NormalizedJournalEntry[]>([]);
  const [rawAccounts, setRawAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filters for Journal Entries tab
  const [searchQuery, setSearchQuery] = useState('');
  const [accountCodeFilter, setAccountCodeFilter] = useState('');
  const [referenceTypeFilter, setReferenceTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedEntryIds, setExpandedEntryIds] = useState<Record<string, boolean>>({});

  // COA state
  const [coaSearch, setCoaSearch] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [hideZeroTrialRows, setHideZeroTrialRows] = useState(false);

  // Modals state
  const [selectedTAccount, setSelectedTAccount] = useState<ChartAccountItem | null>(null);
  const [showNewJournalModal, setShowNewJournalModal] = useState(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [entryPendingDelete, setEntryPendingDelete] = useState<NormalizedJournalEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState(false);

  // New Manual Journal Entry Form state
  const [newJournalDate, setNewJournalDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newJournalDesc, setNewJournalDesc] = useState('');
  const [newJournalRef, setNewJournalRef] = useState('');
  const [newJournalLines, setNewJournalLines] = useState<
    Array<{ key: string; account_code: string; debit: string; credit: string; description: string }>
  >([
    { key: 'line_1', account_code: '1101', debit: '', credit: '', description: '' },
    { key: 'line_2', account_code: '3101', debit: '', credit: '', description: '' },
  ]);
  const [submittingJournal, setSubmittingJournal] = useState(false);
  const [journalFormError, setJournalFormError] = useState<string | null>(null);

  // New Sub-Account Form state
  const [newAccCode, setNewAccCode] = useState('');
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState<'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'>('ASSET');
  const [newAccNature, setNewAccNature] = useState<'DEBIT' | 'CREDIT'>('DEBIT');
  const [submittingAccount, setSubmittingAccount] = useState(false);
  const [accountFormError, setAccountFormError] = useState<string | null>(null);

  const showToast = useCallback((type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => {
      setToastMsg((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  }, []);

  // ==================== DATA FETCHING & DEDUPLICATION ====================
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch from /ledger, /journal-entries, and /accounts concurrently
      const [ledgerRes, journalsRes, accountsRes] = await Promise.all([
        api.getLedger().catch(() => null),
        api.request<any>('/journal-entries').catch(() => null),
        api.request<any>('/accounts').catch(() => null),
      ]);

      const extractList = (res: any): any[] => {
        if (!res) return [];
        if (Array.isArray(res.data)) return res.data;
        if (Array.isArray(res.entries)) return res.entries;
        if (Array.isArray(res.items)) return res.items;
        if (Array.isArray(res.accounts)) return res.accounts;
        if (res.data && Array.isArray(res.data.data)) return res.data.data;
        if (Array.isArray(res)) return res;
        return [];
      };

      const ledgerList = extractList(ledgerRes);
      const journalList = extractList(journalsRes);
      const localJournals = readLocalTenantArray('erp_journal_entries_v1', companyId);

      // Deduplicate strictly by id or entry_number (preferring entries with full lines)
      const mergedMap = new Map<string, NormalizedJournalEntry>();
      const entryNumberToKey = new Map<string, string>();

      const ingestRawEntry = (raw: any) => {
        const normalized = normalizeJournalEntryRecord(raw);
        if (!normalized) return;
        const idKey = normalized.id.toLowerCase();
        const numKey = normalized.entry_number.toLowerCase();

        const existingKey = mergedMap.has(idKey)
          ? idKey
          : entryNumberToKey.has(numKey)
          ? entryNumberToKey.get(numKey)!
          : null;

        if (existingKey) {
          const existing = mergedMap.get(existingKey)!;
          // Prefer entry with more detailed lines or non-CANCELLED/more recent info
          if (normalized.lines.length > existing.lines.length) {
            mergedMap.set(existingKey, normalized);
          }
          return;
        }

        mergedMap.set(idKey, normalized);
        if (numKey) entryNumberToKey.set(numKey, idKey);
      };

      // Priority order: /journal-entries -> /ledger -> localStorage erp_journal_entries_v1
      journalList.forEach(ingestRawEntry);
      ledgerList.forEach(ingestRawEntry);
      localJournals.forEach(ingestRawEntry);

      const mergedEntries = Array.from(mergedMap.values()).sort((a, b) => {
        const tA = new Date(a.transaction_date || a.date || 0).getTime();
        const tB = new Date(b.transaction_date || b.date || 0).getTime();
        return tB - tA;
      });

      setJournalEntries(mergedEntries);

      // Accounts: merge API /accounts + localStorage erp_accounts_v1
      const apiAccounts = extractList(accountsRes);
      const localAccounts = readLocalTenantArray('erp_accounts_v1', companyId);
      const accMap = new Map<string, any>();

      for (const acc of [...apiAccounts, ...localAccounts]) {
        if (!acc || !acc.code) continue;
        const code = String(acc.code).trim();
        if (!accMap.has(code)) {
          accMap.set(code, acc);
        }
      }
      setRawAccounts(Array.from(accMap.values()));
    } catch (err: any) {
      setError(err?.message || 'فشل تحميل بيانات المركز المحاسبي');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchData();

    const handleWiped = () => {
      setJournalEntries([]);
      setRawAccounts([]);
      fetchData();
    };
    const handleRefresh = () => {
      fetchData();
    };

    window.addEventListener('erp-demo-data-wiped', handleWiped);
    window.addEventListener('erp-ledger-updated', handleRefresh);
    window.addEventListener('erp-accounts-updated', handleRefresh);
    window.addEventListener('erp-data-updated', handleRefresh);
    window.addEventListener('storage', handleRefresh);

    return () => {
      window.removeEventListener('erp-demo-data-wiped', handleWiped);
      window.removeEventListener('erp-ledger-updated', handleRefresh);
      window.removeEventListener('erp-accounts-updated', handleRefresh);
      window.removeEventListener('erp-data-updated', handleRefresh);
      window.removeEventListener('storage', handleRefresh);
    };
  }, [fetchData]);

  // ==================== RECOMPUTED CHART OF ACCOUNTS FROM POSTED LINES ====================
  const chartOfAccounts = useMemo<ChartAccountItem[]>(() => {
    const map = new Map<string, ChartAccountItem>();

    // 1. Seed with standard blueprint
    for (const std of STANDARD_COA_BLUEPRINT) {
      map.set(std.code, {
        id: `acc_${companyId}_${std.code}`,
        code: std.code,
        name: std.name,
        name_ar: std.name_ar,
        type: std.type,
        nature: std.nature,
        debit_total: 0,
        credit_total: 0,
        balance: 0,
        is_active: true,
      });
    }

    // 2. Merge API & Local accounts (including custom sub-accounts)
    for (const acc of rawAccounts) {
      const code = String(acc.code || '').trim();
      if (!code) continue;
      const meta = inferAccountMetaByCode(code, acc.name_ar || acc.name);
      const existing = map.get(code);
      if (!existing) {
        map.set(code, {
          id: acc.id || `acc_${companyId}_${code}`,
          code,
          name: acc.name || meta.name_ar,
          name_ar: acc.name_ar || acc.name || meta.name_ar,
          type: (['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'].includes(String(acc.type || '').toUpperCase())
            ? String(acc.type).toUpperCase()
            : meta.type) as ChartAccountItem['type'],
          nature: (String(acc.nature || acc.normal_balance || meta.nature).toUpperCase() === 'CREDIT'
            ? 'CREDIT'
            : 'DEBIT') as 'DEBIT' | 'CREDIT',
          debit_total: 0,
          credit_total: 0,
          balance: 0,
          is_active: acc.is_active !== false,
        });
      } else {
        existing.id = acc.id || existing.id;
      }
    }

    // 3. Recompute debit_total, credit_total, and balance directly from active journal lines
    for (const je of journalEntries) {
      if (je.status === 'CANCELLED') continue;
      for (const line of je.lines) {
        const code = String(line.account_code || '').trim();
        if (!code) continue;
        let acc = map.get(code);
        if (!acc) {
          const meta = inferAccountMetaByCode(code, line.account_name);
          acc = {
            id: line.account_id || `acc_${companyId}_${code}`,
            code,
            name: line.account_name || meta.name_ar,
            name_ar: line.account_name || meta.name_ar,
            type: meta.type,
            nature: meta.nature,
            debit_total: 0,
            credit_total: 0,
            balance: 0,
            is_active: true,
          };
          map.set(code, acc);
        }
        acc.debit_total = roundMoney(acc.debit_total + roundMoney(line.debit));
        acc.credit_total = roundMoney(acc.credit_total + roundMoney(line.credit));
        if (acc.nature === 'DEBIT') {
          acc.balance = roundMoney(acc.debit_total - acc.credit_total);
        } else {
          acc.balance = roundMoney(acc.credit_total - acc.debit_total);
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [rawAccounts, journalEntries, companyId]);

  // ==================== FILTERED JOURNAL ENTRIES & ACCURATE SUMMARY ====================
  const filteredJournalEntries = useMemo(() => {
    return journalEntries.filter((entry) => {
      if (accountCodeFilter) {
        const hasCode = entry.lines.some((l) => String(l.account_code).trim() === accountCodeFilter);
        if (!hasCode) return false;
      }
      if (referenceTypeFilter) {
        if (entry.reference_type !== referenceTypeFilter) return false;
      }
      if (dateFrom && entry.date < dateFrom) return false;
      if (dateTo && entry.date > dateTo) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchHeader =
          entry.description.toLowerCase().includes(q) ||
          entry.entry_number.toLowerCase().includes(q) ||
          entry.reference_type.toLowerCase().includes(q) ||
          String(entry.reference_id || '').toLowerCase().includes(q) ||
          entry.created_by.toLowerCase().includes(q);
        const matchLine = entry.lines.some(
          (l) =>
            l.account_code.toLowerCase().includes(q) ||
            l.account_name.toLowerCase().includes(q) ||
            String(l.description || '').toLowerCase().includes(q)
        );
        if (!matchHeader && !matchLine) return false;
      }
      return true;
    });
  }, [journalEntries, accountCodeFilter, referenceTypeFilter, dateFrom, dateTo, searchQuery]);

  // Accurate totalDebit & totalCredit from filtered active entries' actual lines (or total_debit/total_credit)
  const summary = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;
    let activeCount = 0;

    for (const entry of filteredJournalEntries) {
      if (entry.status === 'CANCELLED') continue;
      activeCount++;
      if (entry.lines.length > 0) {
        const lineD = entry.lines.reduce((s, l) => s + roundMoney(l.debit), 0);
        const lineC = entry.lines.reduce((s, l) => s + roundMoney(l.credit), 0);
        totalDebit = roundMoney(totalDebit + lineD);
        totalCredit = roundMoney(totalCredit + lineC);
      } else {
        totalDebit = roundMoney(totalDebit + roundMoney(entry.total_debit));
        totalCredit = roundMoney(totalCredit + roundMoney(entry.total_credit));
      }
    }

    const difference = roundMoney(Math.abs(totalDebit - totalCredit));
    return {
      totalDebit,
      totalCredit,
      difference,
      isBalanced: difference < 0.01,
      activeCount,
    };
  }, [filteredJournalEntries]);

  // ==================== TRIAL BALANCE DATA ====================
  const trialBalanceData = useMemo(() => {
    const rows = chartOfAccounts.map((acc) => {
      const netSigned = roundMoney(acc.debit_total - acc.credit_total);
      const debitBalance = netSigned > 0 ? netSigned : 0;
      const creditBalance = netSigned < 0 ? Math.abs(netSigned) : 0;
      return {
        ...acc,
        debitBalance,
        creditBalance,
      };
    });

    const visibleRows = hideZeroTrialRows
      ? rows.filter((r) => r.debit_total > 0 || r.credit_total > 0)
      : rows;

    const sumDebitMovements = roundMoney(rows.reduce((s, r) => s + r.debit_total, 0));
    const sumCreditMovements = roundMoney(rows.reduce((s, r) => s + r.credit_total, 0));
    const sumDebitBalances = roundMoney(rows.reduce((s, r) => s + r.debitBalance, 0));
    const sumCreditBalances = roundMoney(rows.reduce((s, r) => s + r.creditBalance, 0));
    const movementsBalanced = Math.abs(sumDebitMovements - sumCreditMovements) < 0.01;
    const balancesBalanced = Math.abs(sumDebitBalances - sumCreditBalances) < 0.01;

    return {
      rows: visibleRows,
      sumDebitMovements,
      sumCreditMovements,
      sumDebitBalances,
      sumCreditBalances,
      isFullyBalanced: movementsBalanced && balancesBalanced,
    };
  }, [chartOfAccounts, hideZeroTrialRows]);

  // ==================== T-ACCOUNT MOVEMENTS FOR SELECTED ACCOUNT ====================
  const tAccountDetails = useMemo(() => {
    if (!selectedTAccount) return null;
    const code = selectedTAccount.code;
    const chronological = [...journalEntries]
      .filter((e) => e.status !== 'CANCELLED')
      .sort((a, b) => new Date(a.transaction_date || a.date).getTime() - new Date(b.transaction_date || b.date).getTime());

    const movements: TAccountMovement[] = [];
    let runningBalance = 0;
    let totalDebit = 0;
    let totalCredit = 0;

    for (const je of chronological) {
      for (const line of je.lines) {
        if (String(line.account_code).trim() !== code) continue;
        const d = roundMoney(line.debit);
        const c = roundMoney(line.credit);
        totalDebit = roundMoney(totalDebit + d);
        totalCredit = roundMoney(totalCredit + c);
        if (selectedTAccount.nature === 'DEBIT') {
          runningBalance = roundMoney(runningBalance + d - c);
        } else {
          runningBalance = roundMoney(runningBalance + c - d);
        }
        movements.push({
          id: `${je.id}_${line.id || movements.length}`,
          date: je.date,
          entry_number: je.entry_number,
          reference_type: je.reference_type,
          reference_id: je.reference_id,
          description: line.description || je.description,
          debit: d,
          credit: c,
          running_balance: runningBalance,
        });
      }
    }

    return {
      account: selectedTAccount,
      movements,
      totalDebit,
      totalCredit,
      closingBalance: runningBalance,
    };
  }, [selectedTAccount, journalEntries]);

  // ==================== MANUAL JOURNAL FORM CALCULATIONS ====================
  const newJournalTotals = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;
    for (const l of newJournalLines) {
      totalDebit = roundMoney(totalDebit + (parseFloat(l.debit) || 0));
      totalCredit = roundMoney(totalCredit + (parseFloat(l.credit) || 0));
    }
    const difference = roundMoney(Math.abs(totalDebit - totalCredit));
    const isBalanced = difference < 0.005 && totalDebit > 0;
    const allLinesValid = newJournalLines.every((l) => {
      const d = parseFloat(l.debit) || 0;
      const c = parseFloat(l.credit) || 0;
      if (d === 0 && c === 0) return true;
      return Boolean(l.account_code) && !(d > 0 && c > 0);
    });
    const activeLinesCount = newJournalLines.filter((l) => (parseFloat(l.debit) || 0) > 0 || (parseFloat(l.credit) || 0) > 0).length;

    return {
      totalDebit,
      totalCredit,
      difference,
      isBalanced,
      canSave: isBalanced && allLinesValid && activeLinesCount >= 2 && newJournalDesc.trim().length > 0,
    };
  }, [newJournalLines, newJournalDesc]);

  // ==================== HANDLERS ====================
  const handleAddJournalRow = () => {
    setNewJournalLines((prev) => [
      ...prev,
      { key: `line_${Date.now()}_${prev.length + 1}`, account_code: '', debit: '', credit: '', description: '' },
    ]);
  };

  const handleRemoveJournalRow = (key: string) => {
    setNewJournalLines((prev) => (prev.length <= 2 ? prev : prev.filter((l) => l.key !== key)));
  };

  const handleUpdateJournalRow = (
    key: string,
    field: 'account_code' | 'debit' | 'credit' | 'description',
    value: string
  ) => {
    setNewJournalLines((prev) =>
      prev.map((row) => {
        if (row.key !== key) return row;
        if (field === 'debit') {
          const num = parseFloat(value);
          return { ...row, debit: value, credit: !isNaN(num) && num > 0 ? '' : row.credit };
        }
        if (field === 'credit') {
          const num = parseFloat(value);
          return { ...row, credit: value, debit: !isNaN(num) && num > 0 ? '' : row.debit };
        }
        return { ...row, [field]: value };
      })
    );
  };

  const handleSaveManualJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    setJournalFormError(null);

    if (!newJournalTotals.canSave) {
      setJournalFormError('تأكد من إدخال البيان العام، واختيار الحسابات، وأن إجمالي المدين يساوي إجمالي الدائن وأكبر من صفر.');
      return;
    }

    const preparedLines = newJournalLines
      .filter((l) => (parseFloat(l.debit) || 0) > 0 || (parseFloat(l.credit) || 0) > 0)
      .map((l) => {
        const acc = chartOfAccounts.find((a) => a.code === l.account_code);
        return {
          account_id: acc?.id,
          account_code: l.account_code,
          account_name: acc?.name_ar || acc?.name || l.account_code,
          debit: roundMoney(parseFloat(l.debit) || 0),
          credit: roundMoney(parseFloat(l.credit) || 0),
          description: l.description.trim() || newJournalDesc.trim(),
        };
      });

    try {
      setSubmittingJournal(true);
      const payload = {
        date: newJournalDate,
        description: newJournalDesc.trim(),
        reference_type: 'MANUAL',
        reference_id: newJournalRef.trim() || `MAN-${Date.now().toString().slice(-6)}`,
        created_by: user?.full_name || user?.username || 'المحاسب المالي',
        lines: preparedLines,
      };

      const res: any = await api.request('/journal-entries', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!res || res.success === false) {
        throw new Error(res?.message || res?.error || 'فشل حفظ القيد المحاسبي');
      }

      const savedEntry = res?.data || res?.journal_entry || res?.entry;
      // Ensure localStorage erp_journal_entries_v1 stays synchronized without duplication
      if (savedEntry) {
        const existingLocal = readLocalTenantArray('erp_journal_entries_v1', companyId);
        const alreadyExists = existingLocal.some(
          (item: any) =>
            String(item.id) === String(savedEntry.id) ||
            String(item.entry_number) === String(savedEntry.entry_number)
        );
        if (!alreadyExists) {
          writeLocalJournalEntriesStorage([savedEntry, ...existingLocal], companyId);
        }
      }

      window.dispatchEvent(new Event('erp-ledger-updated'));
      window.dispatchEvent(new Event('erp-accounts-updated'));
      window.dispatchEvent(new Event('erp-data-updated'));

      setShowNewJournalModal(false);
      setNewJournalDesc('');
      setNewJournalRef('');
      setNewJournalDate(new Date().toISOString().split('T')[0]);
      setNewJournalLines([
        { key: `line_${Date.now()}_1`, account_code: '1101', debit: '', credit: '', description: '' },
        { key: `line_${Date.now()}_2`, account_code: '3101', debit: '', credit: '', description: '' },
      ]);
      showToast('success', 'تم ترحيل القيد المحاسبي المزدوج وتحديث أرصدة الحسابات بنجاح');
      await fetchData();
    } catch (err: any) {
      setJournalFormError(err?.message || 'حدث خطأ أثناء ترحيل القيد المحاسبي');
    } finally {
      setSubmittingJournal(false);
    }
  };

  const handleConfirmDeleteEntry = async () => {
    if (!entryPendingDelete) return;
    try {
      setDeletingEntry(true);
      const targetId = entryPendingDelete.id || entryPendingDelete.entry_number;
      await api.request(`/journal-entries/${encodeURIComponent(targetId)}`, {
        method: 'DELETE',
      }).catch(() => null);

      // Remove from localStorage erp_journal_entries_v1 as well
      const existingLocal = readLocalTenantArray('erp_journal_entries_v1', companyId);
      const filteredLocal = existingLocal.filter(
        (item: any) =>
          String(item.id) !== String(entryPendingDelete.id) &&
          String(item.entry_number) !== String(entryPendingDelete.entry_number)
      );
      if (filteredLocal.length !== existingLocal.length) {
        writeLocalJournalEntriesStorage(filteredLocal, companyId);
      }

      window.dispatchEvent(new Event('erp-ledger-updated'));
      window.dispatchEvent(new Event('erp-accounts-updated'));
      window.dispatchEvent(new Event('erp-data-updated'));

      setEntryPendingDelete(null);
      showToast('success', 'تم حذف/عكس القيد اليدوي وإعادة احتساب أرصدة الحسابات');
      await fetchData();
    } catch (err: any) {
      showToast('error', err?.message || 'تعذر حذف القيد المحاسبي');
    } finally {
      setDeletingEntry(false);
    }
  };

  const handleSaveNewAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountFormError(null);
    const cleanCode = newAccCode.trim();
    const cleanName = newAccName.trim();

    if (!cleanCode || !cleanName) {
      setAccountFormError('يرجى إدخال رقم الحساب واسم الحساب');
      return;
    }
    if (chartOfAccounts.some((a) => a.code === cleanCode)) {
      setAccountFormError(`رقم الحساب (${cleanCode}) موجود مسبقاً في دليل الحسابات`);
      return;
    }

    try {
      setSubmittingAccount(true);
      const res: any = await api.request('/accounts', {
        method: 'POST',
        body: JSON.stringify({
          code: cleanCode,
          name: cleanName,
          name_ar: cleanName,
          type: newAccType,
          nature: newAccNature,
        }),
      });

      if (res && res.success === false) {
        throw new Error(res.message || res.error || 'فشل إضافة الحساب');
      }

      const createdAcc = res?.data || res?.account || {
        id: `acc_${companyId}_${cleanCode}`,
        company_id: companyId,
        code: cleanCode,
        name: cleanName,
        name_ar: cleanName,
        type: newAccType,
        nature: newAccNature,
        balance: 0,
        is_active: true,
      };

      const localAccounts = readLocalTenantArray('erp_accounts_v1', companyId);
      if (!localAccounts.some((a: any) => String(a.code) === cleanCode)) {
        const nextAccounts = [...localAccounts, createdAcc];
        try {
          if (companyId) localStorage.setItem(`erp_accounts_v1_${companyId}`, JSON.stringify(nextAccounts));
          localStorage.setItem('erp_accounts_v1', JSON.stringify(nextAccounts));
        } catch {}
      }

      window.dispatchEvent(new Event('erp-accounts-updated'));
      window.dispatchEvent(new Event('erp-data-updated'));

      setShowAddAccountModal(false);
      setNewAccCode('');
      setNewAccName('');
      setNewAccType('ASSET');
      setNewAccNature('DEBIT');
      showToast('success', `تمت إضافة الحساب (${cleanCode} - ${cleanName}) إلى شجرة الحسابات بنجاح`);
      await fetchData();
    } catch (err: any) {
      setAccountFormError(err?.message || 'حدث خطأ أثناء إضافة الحساب الجديد');
    } finally {
      setSubmittingAccount(false);
    }
  };

  // ==================== EXPORT CONFIGS ====================
  const getJournalExportConfig = (): TableExportConfig => {
    const rows: (string | number)[][] = [];
    for (const je of filteredJournalEntries) {
      if (je.lines.length > 0) {
        for (const l of je.lines) {
          rows.push([
            je.date,
            je.entry_number,
            REFERENCE_TYPE_LABELS[je.reference_type]?.label || je.reference_type,
            `${l.account_code} - ${l.account_name}`,
            l.debit || 0,
            l.credit || 0,
            l.description || je.description,
            je.created_by,
          ]);
        }
      } else {
        rows.push([
          je.date,
          je.entry_number,
          REFERENCE_TYPE_LABELS[je.reference_type]?.label || je.reference_type,
          '-',
          je.total_debit,
          je.total_credit,
          je.description,
          je.created_by,
        ]);
      }
    }
    return {
      filename: `accounting_ledger_${new Date().toISOString().split('T')[0]}`,
      title: 'دفتر الأستاذ العام وسجل القيود المحاسبية المزدوجة',
      subtitle: accountCodeFilter ? `حساب: ${accountCodeFilter}` : 'كافة الحسابات والقيود المرحلة',
      filterBadges: [
        ...(searchQuery ? [{ label: 'بحث', value: searchQuery }] : []),
        ...(accountCodeFilter ? [{ label: 'الحساب', value: accountCodeFilter }] : []),
        ...(referenceTypeFilter ? [{ label: 'المرجع', value: referenceTypeFilter }] : []),
      ],
      summaryCards: [
        { label: 'إجمالي الحركات المدينة', value: `${formatAmount(summary.totalDebit)} ${currency}` },
        { label: 'إجمالي الحركات الدائنة', value: `${formatAmount(summary.totalCredit)} ${currency}` },
        { label: 'حالة التوازن', value: summary.isBalanced ? 'متوازن 100%' : `فارق ${formatAmount(summary.difference)}` },
        { label: 'عدد القيود', value: filteredJournalEntries.length },
      ],
      headers: ['التاريخ', 'رقم القيد', 'المرجع', 'الحساب المحاسبي', `مدين (${currency})`, `دائن (${currency})`, 'البيان', 'المستخدم'],
      rows,
      alignments: ['center', 'center', 'center', 'right', 'right', 'right', 'right', 'center'],
    };
  };

  const getTrialBalanceExportConfig = (): TableExportConfig => ({
    filename: `trial_balance_${new Date().toISOString().split('T')[0]}`,
    title: 'ميزان المراجعة بالأرصدة والمجاميع (Trial Balance)',
    subtitle: 'المطابقة المحاسبية لكافة حسابات دليل الحسابات الشجري',
    summaryCards: [
      { label: 'مجموع الحركات المدينة', value: `${formatAmount(trialBalanceData.sumDebitMovements)} ${currency}` },
      { label: 'مجموع الحركات الدائنة', value: `${formatAmount(trialBalanceData.sumCreditMovements)} ${currency}` },
      { label: 'إجمالي الأرصدة المدينة', value: `${formatAmount(trialBalanceData.sumDebitBalances)} ${currency}` },
      { label: 'إجمالي الأرصدة الدائنة', value: `${formatAmount(trialBalanceData.sumCreditBalances)} ${currency}` },
    ],
    headers: [
      'رقم الحساب',
      'اسم الحساب',
      'الطبيعة',
      `الحركة المدينة (${currency})`,
      `الحركة الدائنة (${currency})`,
      `الرصيد المدين (${currency})`,
      `الرصيد الدائن (${currency})`,
    ],
    rows: trialBalanceData.rows.map((r) => [
      r.code,
      r.name_ar,
      r.nature === 'DEBIT' ? 'مدين' : 'دائن',
      r.debit_total,
      r.credit_total,
      r.debitBalance,
      r.creditBalance,
    ]),
    alignments: ['center', 'right', 'center', 'right', 'right', 'right', 'right'],
  });

  const getTAccountExportConfig = (): TableExportConfig => ({
    filename: `t_account_${selectedTAccount?.code || 'account'}_${new Date().toISOString().split('T')[0]}`,
    title: `كشف حركة حساب: ${selectedTAccount?.code || ''} - ${selectedTAccount?.name_ar || ''}`,
    subtitle: `دفتر الأستاذ المساعد (T-Account) | طبيعة الحساب: ${selectedTAccount?.nature === 'DEBIT' ? 'مدين' : 'دائن'}`,
    summaryCards: [
      { label: 'إجمالي المدين', value: `${formatAmount(tAccountDetails?.totalDebit || 0)} ${currency}` },
      { label: 'إجمالي الدائن', value: `${formatAmount(tAccountDetails?.totalCredit || 0)} ${currency}` },
      { label: 'الرصيد الختامي', value: `${formatAmount(tAccountDetails?.closingBalance || 0)} ${currency}` },
    ],
    headers: ['التاريخ', 'رقم القيد', 'المرجع', 'البيان', `مدين (${currency})`, `دائن (${currency})`, `الرصيد التراكمي (${currency})`],
    rows: (tAccountDetails?.movements || []).map((m) => [
      m.date,
      m.entry_number,
      REFERENCE_TYPE_LABELS[m.reference_type]?.label || m.reference_type,
      m.description,
      m.debit,
      m.credit,
      m.running_balance,
    ]),
    alignments: ['center', 'center', 'center', 'right', 'right', 'right', 'right'],
  });

  const getRefBadge = (refType: string) => {
    const info = REFERENCE_TYPE_LABELS[refType] || {
      label: refType || 'قيد محاسبي',
      colorClass: 'm3-badge-secondary',
    };
    return <span className={`m3-badge ${info.colorClass}`}>{info.label}</span>;
  };

  const resetJournalFilters = () => {
    setSearchQuery('');
    setAccountCodeFilter('');
    setReferenceTypeFilter('');
    setDateFrom('');
    setDateTo('');
  };

  // ==================== RENDER ====================
  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-between shadow-sm ${
            toastMsg.type === 'success'
              ? 'bg-[var(--md-success-container)] border-[var(--md-success)]/40 text-[var(--md-on-success-container)]'
              : 'bg-[var(--md-error-container)] border-[var(--md-error)]/40 text-[var(--md-on-error-container)]'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[var(--md-success)] shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-[var(--md-error)] shrink-0" />
            )}
            <span>{toastMsg.text}</span>
          </div>
          <button
            onClick={() => setToastMsg(null)}
            className="p-1 rounded-lg hover:bg-[var(--md-surface-container-high)]/40 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="m3-card p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 text-[var(--md-on-surface)] font-bold text-lg mb-1">
            <div className="p-2 rounded-xl bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border border-[var(--md-primary)]/25">
              <BookOpen className="w-5 h-5" />
            </div>
            <span>المركز المحاسبي ودفتر الأستاذ العام (Accounting Ledger Hub)</span>
          </div>
          <p className="text-xs text-[var(--md-on-surface-variant)]">
            منظومة القيد المزدوج المتكاملة: دليل الحسابات الشجري، سجل القيود التفصيلية، كشف الأستاذ المساعد (T-Account)، وميزان المراجعة.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => fetchData()}
            disabled={loading}
            className="m3-btn-outlined !min-h-[40px] text-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[var(--md-primary-text)] ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>

          <button
            onClick={() => {
              setJournalFormError(null);
              setShowNewJournalModal(true);
            }}
            className="m3-btn-primary !min-h-[40px] text-xs"
          >
            <Plus className="w-4 h-4" />
            <span>+ قيد يومية مزدوج جديد</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="m3-card p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-[var(--md-on-surface-variant)] font-semibold block mb-1">
              إجمالي الحركات المدينة (Total Debit)
            </span>
            <span className="font-mono font-bold text-lg text-[var(--md-success)] tabular-nums">
              {formatAmount(summary.totalDebit)} {currency}
            </span>
          </div>
          <div className="p-3 bg-[var(--md-success-container)] text-[var(--md-on-success-container)] border border-[var(--md-success)]/25 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="m3-card p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-[var(--md-on-surface-variant)] font-semibold block mb-1">
              إجمالي الحركات الدائنة (Total Credit)
            </span>
            <span className="font-mono font-bold text-lg text-[var(--md-warning)] tabular-nums">
              {formatAmount(summary.totalCredit)} {currency}
            </span>
          </div>
          <div className="p-3 bg-[var(--md-warning-container)] text-[var(--md-on-warning-container)] border border-[var(--md-warning)]/25 rounded-xl">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        <div className="m3-card p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-[var(--md-on-surface-variant)] font-semibold block mb-1">
              توازن الدفتر المحاسبي
            </span>
            <span
              className={`font-mono font-bold text-base tabular-nums ${
                summary.isBalanced ? 'text-[var(--md-success)]' : 'text-[var(--md-error)]'
              }`}
            >
              {summary.isBalanced ? 'متوازن 100% (Balanced)' : `غير متوازن (فارق ${formatAmount(summary.difference)})`}
            </span>
          </div>
          <div
            className={`p-3 rounded-xl border ${
              summary.isBalanced
                ? 'bg-[var(--md-success-container)] border-[var(--md-success)]/25 text-[var(--md-on-success-container)]'
                : 'bg-[var(--md-error-container)] border-[var(--md-error)]/25 text-[var(--md-on-error-container)]'
            }`}
          >
            <Scale className="w-5 h-5" />
          </div>
        </div>

        <div className="m3-card p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-[var(--md-on-surface-variant)] font-semibold block mb-1">
              القيود الفعالة / الحسابات
            </span>
            <span className="font-mono font-bold text-lg text-[var(--md-primary-text)] tabular-nums">
              {summary.activeCount} قيد{' '}
              <span className="text-xs text-[var(--md-on-surface-variant)]">/ {chartOfAccounts.length} حساب</span>
            </span>
          </div>
          <div className="p-3 bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border border-[var(--md-primary)]/25 rounded-xl">
            <GitBranch className="w-5 h-5" />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-[var(--md-error-container)] border border-[var(--md-error)]/40 text-[var(--md-on-error-container)] text-xs font-medium rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-[var(--md-error)]" />
          <span>{error}</span>
        </div>
      )}

      {/* 3 Main Tabs Bar */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-[var(--md-surface-container-low)] rounded-2xl border border-[var(--md-outline-variant)]">
        <button
          onClick={() => setActiveTab('journal')}
          className={`flex-1 min-w-[200px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'journal'
              ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border border-[var(--md-primary)]/35 shadow-sm'
              : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-high)] border border-transparent'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>دفتر اليومية والقيود المحاسبية (Journal Entries)</span>
        </button>

        <button
          onClick={() => setActiveTab('coa')}
          className={`flex-1 min-w-[200px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'coa'
              ? 'bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)] border border-[var(--md-secondary)]/35 shadow-sm'
              : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-high)] border border-transparent'
          }`}
        >
          <ListTree className="w-4 h-4" />
          <span>دليل الحسابات الشجري (Chart of Accounts)</span>
        </button>

        <button
          onClick={() => setActiveTab('trial_balance')}
          className={`flex-1 min-w-[200px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'trial_balance'
              ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border border-[var(--md-primary)]/35 shadow-sm'
              : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-high)] border border-transparent'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>ميزان المراجعة بالأرصدة والمجاميع (Trial Balance)</span>
        </button>
      </div>

      {/* ==================== TAB 1: JOURNAL ENTRIES ==================== */}
      {activeTab === 'journal' && (
        <div className="m3-card overflow-hidden">
          {/* Toolbar & Filters */}
          <div className="p-4 border-b border-[var(--md-outline-variant)] bg-[var(--md-surface-container-low)] space-y-3">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-[var(--md-on-surface-variant)] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="بحث في رقم القيد، البيان، المرجع، أو الحساب..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="m3-input !h-10 !pr-9 text-xs"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Detailed vs Summary Toggle */}
                <div className="inline-flex rounded-xl bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] p-0.5">
                  <button
                    onClick={() => setJournalViewMode('detailed')}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                      journalViewMode === 'detailed'
                        ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border border-[var(--md-primary)]/35'
                        : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] border border-transparent'
                    }`}
                  >
                    القيود التفصيلية بالأسطر
                  </button>
                  <button
                    onClick={() => setJournalViewMode('summary')}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                      journalViewMode === 'summary'
                        ? 'bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)] border border-[var(--md-secondary)]/35'
                        : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] border border-transparent'
                    }`}
                  >
                    ملخص القيود
                  </button>
                </div>

                <ExportActions getConfig={getJournalExportConfig} />
              </div>
            </div>

            {/* Filter Row: Account Code, Reference Type, Date Range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              <select
                value={accountCodeFilter}
                onChange={(e) => setAccountCodeFilter(e.target.value)}
                className="m3-select !h-10 text-xs"
              >
                <option value="">كل الحسابات المحاسبية</option>
                {chartOfAccounts.map((acc) => (
                  <option key={acc.code} value={acc.code}>
                    {acc.code} — {acc.name_ar}
                  </option>
                ))}
              </select>

              <select
                value={referenceTypeFilter}
                onChange={(e) => setReferenceTypeFilter(e.target.value)}
                className="m3-select !h-10 text-xs"
              >
                <option value="">كل أنواع المراجع</option>
                <option value="SALES_INVOICE">فاتورة مبيعات (SALES_INVOICE)</option>
                <option value="PURCHASE_INVOICE">فاتورة مشتريات (PURCHASE_INVOICE)</option>
                <option value="OPENING_BALANCE">رصيد افتتاحي (OPENING_BALANCE)</option>
                <option value="RECEIPT_VOUCHER">سند قبض (RECEIPT_VOUCHER)</option>
                <option value="PAYMENT_VOUCHER">سند صرف (PAYMENT_VOUCHER)</option>
                <option value="EXPENSE_VOUCHER">سند مصروف (EXPENSE_VOUCHER)</option>
                <option value="PAYROLL">مسير رواتب (PAYROLL)</option>
                <option value="INVENTORY_COGS">تكلفة بضاعة مباعة (INVENTORY_COGS)</option>
                <option value="SALES_RETURN">مرتجع مبيعات (SALES_RETURN)</option>
                <option value="MANUAL">قيد يدوي (MANUAL)</option>
                <option value="MANUAL_JOURNAL">قيد يومية يدوي (MANUAL_JOURNAL)</option>
              </select>

              <div className="relative flex items-center">
                <Calendar className="w-3.5 h-3.5 text-[var(--md-on-surface-variant)] absolute right-3 pointer-events-none" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  title="من تاريخ"
                  className="m3-input !h-10 !pr-8 !pl-2 text-xs tabular-nums"
                />
              </div>

              <div className="relative flex items-center">
                <Calendar className="w-3.5 h-3.5 text-[var(--md-on-surface-variant)] absolute right-3 pointer-events-none" />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  title="إلى تاريخ"
                  className="m3-input !h-10 !pr-8 !pl-2 text-xs tabular-nums"
                />
              </div>

              <button
                onClick={resetJournalFilters}
                className="m3-btn-outlined !min-h-[40px] text-xs w-full"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[var(--md-secondary)]" />
                <span>إعادة ضبط الفلاتر</span>
              </button>
            </div>
          </div>

          {/* Journal Entries Content */}
          {loading ? (
            <div className="p-12 text-center text-[var(--md-on-surface-variant)]">
              <Loader2 className="w-7 h-7 animate-spin text-[var(--md-primary-text)] mx-auto mb-2" />
              <span className="text-xs">جاري تحميل القيود اليومية المزدوجة...</span>
            </div>
          ) : filteredJournalEntries.length === 0 ? (
            <div className="p-12 text-center text-[var(--md-on-surface-variant)] text-xs">
              لا توجد قيود محاسبية مطابقة لمعايير البحث الحالية.
            </div>
          ) : journalViewMode === 'detailed' ? (
            /* DETAILED DOUBLE-ENTRY LINES VIEW */
            <div className="divide-y divide-[var(--md-outline-variant)]">
              {filteredJournalEntries.map((entry) => {
                const isCancelled = entry.status === 'CANCELLED';
                const isManual = MANUAL_REF_TYPES.has(entry.reference_type);
                return (
                  <div
                    key={entry.id}
                    className={`p-4 transition-colors ${
                      isCancelled
                        ? 'bg-[var(--md-error-container)]/25 opacity-75'
                        : 'hover:bg-[var(--md-surface-container-low)]/60'
                    }`}
                  >
                    {/* Entry Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-3 mb-3 border-b border-[var(--md-outline-variant)]">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="m3-badge m3-badge-primary font-mono text-xs tabular-nums">
                          {entry.entry_number}
                        </span>
                        <span className="font-mono text-xs text-[var(--md-on-surface-variant)] tabular-nums">
                          {entry.date}
                        </span>
                        {getRefBadge(entry.reference_type)}
                        {entry.reference_id && (
                          <span className="m3-badge m3-badge-warning font-mono text-[11px] tabular-nums">
                            #{entry.reference_id}
                          </span>
                        )}
                        {isCancelled && <span className="m3-badge m3-badge-error">ملغى / معكوس</span>}
                      </div>

                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-[11px] text-[var(--md-on-surface-variant)]">
                          بواسطة: <strong className="text-[var(--md-on-surface)]">{entry.created_by}</strong>
                        </span>
                        <span className="font-mono text-xs font-bold text-[var(--md-secondary)] tabular-nums">
                          إجمالي القيد: {formatAmount(entry.total_debit)} {currency}
                        </span>
                        {isManual && !isCancelled && (
                          <button
                            onClick={() => setEntryPendingDelete(entry)}
                            title="حذف / عكس القيد اليدوي"
                            className="m3-btn-danger !min-h-[32px] !px-2 !py-1.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-xs font-semibold text-[var(--md-on-surface)] mb-3">{entry.description}</p>

                    {/* Double-Entry Lines Sub-Table */}
                    <div className="overflow-x-auto rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container-low)]">
                      <table className="m3-table text-right text-xs">
                        <thead className="m3-thead">
                          <tr>
                            <th className="m3-th !py-2.5 w-24">رقم الحساب</th>
                            <th className="m3-th !py-2.5">البيان التفصيلي للطرف (من ح/ — إلى ح/)</th>
                            <th className="m3-th !py-2.5 w-36">مدين (Debit)</th>
                            <th className="m3-th !py-2.5 w-36">دائن (Credit)</th>
                            <th className="m3-th !py-2.5">ملاحظة السطر</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--md-outline-variant)]">
                          {entry.lines.map((line, idx) => {
                            const isDebitLine = line.debit > 0;
                            return (
                              <tr key={line.id || idx} className="hover:bg-[var(--md-surface-container-high)]/60">
                                <td className="p-2.5 font-mono font-bold text-[var(--md-secondary)] tabular-nums">
                                  <button
                                    onClick={() => {
                                      const acc = chartOfAccounts.find((a) => a.code === line.account_code);
                                      if (acc) setSelectedTAccount(acc);
                                    }}
                                    className="hover:underline"
                                    title="عرض كشف حساب الأستاذ المساعد (T-Account)"
                                  >
                                    {line.account_code}
                                  </button>
                                </td>
                                <td className="p-2.5">
                                  <button
                                    onClick={() => {
                                      const acc = chartOfAccounts.find((a) => a.code === line.account_code);
                                      if (acc) setSelectedTAccount(acc);
                                    }}
                                    className={`inline-flex items-center gap-1.5 font-bold hover:underline ${
                                      isDebitLine
                                        ? 'text-[var(--md-success)]'
                                        : 'text-[var(--md-primary-text)] pr-5'
                                    }`}
                                  >
                                    {isDebitLine ? (
                                      <ArrowUpRight className="w-3.5 h-3.5 text-[var(--md-success)] shrink-0" />
                                    ) : (
                                      <ArrowDownLeft className="w-3.5 h-3.5 text-[var(--md-warning)] shrink-0" />
                                    )}
                                    <span>
                                      {isDebitLine ? 'من ح/ ' : 'إلى ح/ '}
                                      {line.account_name}
                                    </span>
                                  </button>
                                </td>
                                <td className="p-2.5 font-mono font-bold text-[var(--md-success)] tabular-nums">
                                  {line.debit > 0 ? `${formatAmount(line.debit)} ${currency}` : '-'}
                                </td>
                                <td className="p-2.5 font-mono font-bold text-[var(--md-warning)] tabular-nums">
                                  {line.credit > 0 ? `${formatAmount(line.credit)} ${currency}` : '-'}
                                </td>
                                <td className="p-2.5 text-[var(--md-on-surface-variant)]">{line.description || '-'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* SUMMARY VIEW */
            <div className="overflow-x-auto">
              <table className="m3-table text-right text-xs">
                <thead className="m3-thead">
                  <tr>
                    <th className="m3-th">التاريخ</th>
                    <th className="m3-th">رقم القيد</th>
                    <th className="m3-th">المرجع</th>
                    <th className="m3-th">الأطراف المحاسبية</th>
                    <th className="m3-th">مدين (Debit)</th>
                    <th className="m3-th">دائن (Credit)</th>
                    <th className="m3-th">البيان العام</th>
                    <th className="m3-th">المستخدم</th>
                    <th className="m3-th text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--md-outline-variant)]">
                  {filteredJournalEntries.map((entry) => {
                    const isExpanded = Boolean(expandedEntryIds[entry.id]);
                    const isManual = MANUAL_REF_TYPES.has(entry.reference_type);
                    const isCancelled = entry.status === 'CANCELLED';
                    return (
                      <React.Fragment key={entry.id}>
                        <tr
                          className={`hover:bg-[var(--md-surface-container-high)]/60 transition-colors ${
                            isCancelled ? 'opacity-60' : ''
                          }`}
                        >
                          <td className="p-3.5 font-mono text-[var(--md-on-surface-variant)] tabular-nums">
                            {entry.date}
                          </td>
                          <td className="p-3.5 font-mono font-bold text-[var(--md-primary-text)] tabular-nums">
                            {entry.entry_number}
                          </td>
                          <td className="p-3.5">{getRefBadge(entry.reference_type)}</td>
                          <td className="p-3.5 font-mono text-[var(--md-on-surface-variant)] tabular-nums">
                            {entry.lines.map((l) => l.account_code).join(' ⇄ ') || '-'}
                          </td>
                          <td className="p-3.5 font-mono font-bold text-[var(--md-success)] tabular-nums">
                            {formatAmount(entry.total_debit)} {currency}
                          </td>
                          <td className="p-3.5 font-mono font-bold text-[var(--md-warning)] tabular-nums">
                            {formatAmount(entry.total_credit)} {currency}
                          </td>
                          <td className="p-3.5 text-[var(--md-on-surface)] max-w-xs truncate">{entry.description}</td>
                          <td className="p-3.5 text-[var(--md-on-surface-variant)]">{entry.created_by}</td>
                          <td className="p-3.5">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() =>
                                  setExpandedEntryIds((prev) => ({ ...prev, [entry.id]: !prev[entry.id] }))
                                }
                                title="تفاصيل الأسطر"
                                className="m3-btn-outlined !min-h-[32px] !px-2 !py-1.5 text-[var(--md-primary-text)]"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              {isManual && !isCancelled && (
                                <button
                                  onClick={() => setEntryPendingDelete(entry)}
                                  title="حذف / عكس القيد اليدوي"
                                  className="m3-btn-danger !min-h-[32px] !px-2 !py-1.5"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-[var(--md-surface-container-low)]">
                            <td colSpan={9} className="p-3">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {entry.lines.map((l, idx) => (
                                  <div
                                    key={l.id || idx}
                                    className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)]"
                                  >
                                    <span className="text-xs font-bold text-[var(--md-on-surface)]">
                                      <span className="font-mono text-[var(--md-secondary)] ml-1.5 tabular-nums">
                                        {l.account_code}
                                      </span>
                                      {l.debit > 0 ? 'من ح/ ' : 'إلى ح/ '}
                                      {l.account_name}
                                    </span>
                                    <span
                                      className={`font-mono font-bold text-xs tabular-nums ${
                                        l.debit > 0 ? 'text-[var(--md-success)]' : 'text-[var(--md-warning)]'
                                      }`}
                                    >
                                      {l.debit > 0
                                        ? `مدين ${formatAmount(l.debit)} ${currency}`
                                        : `دائن ${formatAmount(l.credit)} ${currency}`}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 2: CHART OF ACCOUNTS ==================== */}
      {activeTab === 'coa' && (
        <div className="space-y-4">
          {/* COA Toolbar */}
          <div className="m3-card p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[var(--md-on-surface-variant)] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="بحث برقم الحساب أو اسم الحساب..."
                value={coaSearch}
                onChange={(e) => setCoaSearch(e.target.value)}
                className="m3-input !h-10 !pr-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2.5">
              <span className="text-[11px] text-[var(--md-on-surface-variant)] hidden md:inline">
                اضغط على أي حساب لفتح كشف الأستاذ المساعد (T-Account)
              </span>
              <button
                onClick={() => {
                  setAccountFormError(null);
                  setShowAddAccountModal(true);
                }}
                className="m3-btn-primary !min-h-[40px] text-xs"
              >
                <Plus className="w-4 h-4" />
                <span>+ إضافة حساب جديد</span>
              </button>
            </div>
          </div>

          {/* 5 Standard Account Groups */}
          <div className="space-y-4">
            {COA_GROUPS.map((group) => {
              const groupAccounts = chartOfAccounts.filter((acc) => {
                if (acc.type !== group.key) return false;
                if (coaSearch.trim()) {
                  const q = coaSearch.trim().toLowerCase();
                  return (
                    acc.code.toLowerCase().includes(q) ||
                    acc.name_ar.toLowerCase().includes(q) ||
                    acc.name.toLowerCase().includes(q)
                  );
                }
                return true;
              });

              if (coaSearch.trim() && groupAccounts.length === 0) return null;

              const isCollapsed = Boolean(collapsedGroups[group.key]);
              const groupTotalBalance = roundMoney(groupAccounts.reduce((s, a) => s + a.balance, 0));

              return (
                <div
                  key={group.key}
                  className={`m3-card ${group.borderClass} overflow-hidden`}
                >
                  <button
                    onClick={() => setCollapsedGroups((prev) => ({ ...prev, [group.key]: !prev[group.key] }))}
                    className="w-full p-4 bg-[var(--md-surface-container-low)] flex items-center justify-between gap-3 hover:bg-[var(--md-surface-container-high)] transition-colors text-right"
                  >
                    <div className="flex items-center gap-3">
                      {isCollapsed ? (
                        <ChevronLeft className="w-4 h-4 text-[var(--md-on-surface-variant)]" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[var(--md-primary-text)]" />
                      )}
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-[var(--md-on-surface)]">{group.title}</span>
                          <span className={`m3-badge ${group.badgeClass} tabular-nums`}>
                            {groupAccounts.length} حساب
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--md-on-surface-variant)] mt-0.5">{group.subtitle}</p>
                      </div>
                    </div>

                    <div className="text-left shrink-0">
                      <span className="text-[10px] text-[var(--md-on-surface-variant)] block">إجمالي رصيد المجموعة</span>
                      <span className="font-mono font-bold text-sm text-[var(--md-secondary)] tabular-nums">
                        {formatAmount(groupTotalBalance)} {currency}
                      </span>
                    </div>
                  </button>

                  {!isCollapsed && (
                    <div className="overflow-x-auto border-t border-[var(--md-outline-variant)]">
                      <table className="m3-table text-right text-xs">
                        <thead className="m3-thead">
                          <tr>
                            <th className="m3-th w-28">رقم الحساب</th>
                            <th className="m3-th">اسم الحساب</th>
                            <th className="m3-th w-28">الطبيعة</th>
                            <th className="m3-th w-40">إجمالي المدين</th>
                            <th className="m3-th w-40">إجمالي الدائن</th>
                            <th className="m3-th w-44">الرصيد الحالي</th>
                            <th className="m3-th w-32 text-center">دفتر الأستاذ المساعد</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--md-outline-variant)]">
                          {groupAccounts.map((acc) => (
                            <tr
                              key={acc.code}
                              onClick={() => setSelectedTAccount(acc)}
                              className="hover:bg-[var(--md-surface-container-high)]/60 cursor-pointer transition-colors"
                            >
                              <td className="p-3 font-mono font-bold text-[var(--md-secondary)] tabular-nums">
                                {acc.code}
                              </td>
                              <td className="p-3">
                                <div className="font-bold text-[var(--md-on-surface)]">{acc.name_ar}</div>
                                {acc.name && acc.name !== acc.name_ar && (
                                  <div className="text-[10px] text-[var(--md-on-surface-variant)] font-mono">
                                    {acc.name}
                                  </div>
                                )}
                              </td>
                              <td className="p-3">
                                <span
                                  className={`m3-badge ${
                                    acc.nature === 'DEBIT' ? 'm3-badge-success' : 'm3-badge-warning'
                                  }`}
                                >
                                  {acc.nature === 'DEBIT' ? 'مدين (DEBIT)' : 'دائن (CREDIT)'}
                                </span>
                              </td>
                              <td className="p-3 font-mono text-[var(--md-success)] font-semibold tabular-nums">
                                {formatAmount(acc.debit_total)} {currency}
                              </td>
                              <td className="p-3 font-mono text-[var(--md-warning)] font-semibold tabular-nums">
                                {formatAmount(acc.credit_total)} {currency}
                              </td>
                              <td
                                className={`p-3 font-mono font-bold tabular-nums ${
                                  acc.balance >= 0 ? 'text-[var(--md-on-surface)]' : 'text-[var(--md-error)]'
                                }`}
                              >
                                {formatAmount(acc.balance)} {currency}
                              </td>
                              <td className="p-3 text-center">
                                <span className="m3-badge m3-badge-primary inline-flex items-center gap-1">
                                  <Eye className="w-3 h-3" />
                                  <span>T-Account</span>
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================== TAB 3: TRIAL BALANCE ==================== */}
      {activeTab === 'trial_balance' && (
        <div className="m3-card overflow-hidden">
          <div className="p-4 border-b border-[var(--md-outline-variant)] bg-[var(--md-surface-container-low)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[var(--md-on-surface)]">
                ميزان المراجعة بالأرصدة والمجاميع (Trial Balance)
              </h3>
              <p className="text-[11px] text-[var(--md-on-surface-variant)]">
                مطابقة تلقائية لمجاميع الحركات والأرصدة المدينة والدائنة لجميع الحسابات
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <label className="inline-flex items-center gap-2 text-xs font-medium text-[var(--md-on-surface)] cursor-pointer bg-[var(--md-surface-container)] px-3 py-2 rounded-xl border border-[var(--md-outline-variant)]">
                <input
                  type="checkbox"
                  checked={hideZeroTrialRows}
                  onChange={(e) => setHideZeroTrialRows(e.target.checked)}
                  className="accent-[var(--md-primary)] rounded"
                />
                <span>إخفاء الحسابات الصفرية</span>
              </label>

              <ExportActions getConfig={getTrialBalanceExportConfig} />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="m3-table text-right text-xs">
              <thead className="m3-thead">
                <tr>
                  <th className="m3-th">رقم الحساب</th>
                  <th className="m3-th">اسم الحساب</th>
                  <th className="m3-th">طبيعة الحساب</th>
                  <th className="m3-th">إجمالي الحركة المدينة</th>
                  <th className="m3-th">إجمالي الحركة الدائنة</th>
                  <th className="m3-th">الرصيد المدين</th>
                  <th className="m3-th">الرصيد الدائن</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--md-outline-variant)]">
                {trialBalanceData.rows.map((row) => (
                  <tr
                    key={row.code}
                    onClick={() => setSelectedTAccount(row)}
                    className="hover:bg-[var(--md-surface-container-high)]/60 cursor-pointer transition-colors"
                  >
                    <td className="p-3.5 font-mono font-bold text-[var(--md-secondary)] tabular-nums">{row.code}</td>
                    <td className="p-3.5 font-bold text-[var(--md-on-surface)]">{row.name_ar}</td>
                    <td className="p-3.5">
                      <span
                        className={`m3-badge ${
                          row.nature === 'DEBIT' ? 'm3-badge-success' : 'm3-badge-warning'
                        }`}
                      >
                        {row.nature === 'DEBIT' ? 'مدين' : 'دائن'}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-[var(--md-success)] tabular-nums">
                      {row.debit_total > 0 ? `${formatAmount(row.debit_total)} ${currency}` : '-'}
                    </td>
                    <td className="p-3.5 font-mono text-[var(--md-primary-text)] tabular-nums">
                      {row.credit_total > 0 ? `${formatAmount(row.credit_total)} ${currency}` : '-'}
                    </td>
                    <td className="p-3.5 font-mono font-bold text-[var(--md-success)] tabular-nums">
                      {row.debitBalance > 0 ? `${formatAmount(row.debitBalance)} ${currency}` : '-'}
                    </td>
                    <td className="p-3.5 font-mono font-bold text-[var(--md-warning)] tabular-nums">
                      {row.creditBalance > 0 ? `${formatAmount(row.creditBalance)} ${currency}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-[var(--md-surface-container-high)] font-bold border-t-2 border-[var(--md-secondary)]/50 text-xs">
                <tr>
                  <td colSpan={3} className="p-4 text-[var(--md-on-surface)]">
                    الإجماليات الكلية لميزان المراجعة
                  </td>
                  <td className="p-4 font-mono text-[var(--md-success)] tabular-nums">
                    {formatAmount(trialBalanceData.sumDebitMovements)} {currency}
                  </td>
                  <td className="p-4 font-mono text-[var(--md-primary-text)] tabular-nums">
                    {formatAmount(trialBalanceData.sumCreditMovements)} {currency}
                  </td>
                  <td className="p-4 font-mono text-[var(--md-success)] tabular-nums">
                    {formatAmount(trialBalanceData.sumDebitBalances)} {currency}
                  </td>
                  <td className="p-4 font-mono text-[var(--md-warning)] tabular-nums">
                    {formatAmount(trialBalanceData.sumCreditBalances)} {currency}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Golden Matching Bar */}
          <div
            className={`p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 ${
              trialBalanceData.isFullyBalanced
                ? 'bg-[var(--md-secondary-container)] border-[var(--md-secondary)]/40 text-[var(--md-on-secondary-container)]'
                : 'bg-[var(--md-error-container)] border-[var(--md-error)]/40 text-[var(--md-on-error-container)]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Scale
                className={`w-5 h-5 shrink-0 ${
                  trialBalanceData.isFullyBalanced ? 'text-[var(--md-secondary)]' : 'text-[var(--md-error)]'
                }`}
              />
              <div>
                <div className="text-xs font-extrabold tabular-nums">
                  إجمالي المدين = إجمالي الدائن ({formatAmount(trialBalanceData.sumDebitBalances)} {currency} ={' '}
                  {formatAmount(trialBalanceData.sumCreditBalances)} {currency})
                </div>
                <div className="text-[11px] opacity-85 tabular-nums">
                  مجموع الحركات: مدين {formatAmount(trialBalanceData.sumDebitMovements)} {currency} | دائن{' '}
                  {formatAmount(trialBalanceData.sumCreditMovements)} {currency}
                </div>
              </div>
            </div>

            <span
              className={`m3-badge !px-3.5 !py-1.5 !text-xs font-extrabold ${
                trialBalanceData.isFullyBalanced ? 'm3-badge-success' : 'm3-badge-error'
              }`}
            >
              {trialBalanceData.isFullyBalanced ? 'متوازن 100% ✓' : 'يوجد فارق في التوازن !'}
            </span>
          </div>
        </div>
      )}

      {/* ==================== MODAL 1: T-ACCOUNT STATEMENT ==================== */}
      {selectedTAccount && tAccountDetails && (
        <div className="m3-backdrop p-4" dir="rtl">
          <div className="m3-modal-surface w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 bg-[var(--md-surface-container-low)] border-b border-[var(--md-outline-variant)] flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="m3-badge m3-badge-secondary font-mono text-sm font-extrabold tabular-nums">
                    {selectedTAccount.code}
                  </span>
                  <h3 className="text-base font-bold text-[var(--md-on-surface)]">
                    كشف حركة الحساب (دفتر الأستاذ المساعد - T-Account): {selectedTAccount.name_ar}
                  </h3>
                </div>
                <p className="text-[11px] text-[var(--md-on-surface-variant)] mt-1 tabular-nums">
                  طبيعة الحساب: {selectedTAccount.nature === 'DEBIT' ? 'مدين (Debit)' : 'دائن (Credit)'} | عدد الحركات:{' '}
                  {tAccountDetails.movements.length}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <ExportActions getConfig={getTAccountExportConfig} />
                <button
                  onClick={() => setSelectedTAccount(null)}
                  className="m3-btn-outlined !min-h-[36px] !px-2.5 !py-2"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5">
              {/* Visual T-Account Header */}
              <div className="rounded-2xl border border-[var(--md-secondary)]/45 bg-[var(--md-surface-container-low)] overflow-hidden">
                <div className="p-2.5 text-center border-b-2 border-[var(--md-secondary)]/50 bg-[var(--md-secondary-container)] font-bold text-xs text-[var(--md-on-secondary-container)] tabular-nums">
                  ح/ {selectedTAccount.name_ar} ({selectedTAccount.code})
                </div>
                <div className="grid grid-cols-2 divide-x divide-x-reverse divide-[var(--md-secondary)]/35">
                  <div className="p-4 text-center">
                    <span className="text-[11px] text-[var(--md-on-surface-variant)] block mb-1">
                      الجانب المدين (منه / Debit)
                    </span>
                    <span className="font-mono text-base font-extrabold text-[var(--md-success)] tabular-nums">
                      {formatAmount(tAccountDetails.totalDebit)} {currency}
                    </span>
                  </div>
                  <div className="p-4 text-center">
                    <span className="text-[11px] text-[var(--md-on-surface-variant)] block mb-1">
                      الجانب الدائن (له / Credit)
                    </span>
                    <span className="font-mono text-base font-extrabold text-[var(--md-warning)] tabular-nums">
                      {formatAmount(tAccountDetails.totalCredit)} {currency}
                    </span>
                  </div>
                </div>
                <div className="p-2.5 text-center bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border-t border-[var(--md-outline-variant)] text-xs font-bold tabular-nums">
                  الرصيد التراكمي الختامي:{' '}
                  <span className="font-mono font-extrabold">
                    {formatAmount(tAccountDetails.closingBalance)} {currency}
                  </span>
                </div>
              </div>

              {/* Movements Table */}
              <div className="overflow-x-auto rounded-xl border border-[var(--md-outline-variant)]">
                <table className="m3-table text-right text-xs">
                  <thead className="m3-thead">
                    <tr>
                      <th className="m3-th">التاريخ</th>
                      <th className="m3-th">رقم القيد</th>
                      <th className="m3-th">المرجع</th>
                      <th className="m3-th">البيان</th>
                      <th className="m3-th">مدين</th>
                      <th className="m3-th">دائن</th>
                      <th className="m3-th">الرصيد التراكمي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--md-outline-variant)]">
                    {tAccountDetails.movements.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-[var(--md-on-surface-variant)]">
                          لا توجد حركات مرحلة على هذا الحساب حتى الآن.
                        </td>
                      </tr>
                    ) : (
                      tAccountDetails.movements.map((m) => (
                        <tr key={m.id} className="hover:bg-[var(--md-surface-container-high)]/60">
                          <td className="p-3 font-mono text-[var(--md-on-surface-variant)] tabular-nums">{m.date}</td>
                          <td className="p-3 font-mono font-bold text-[var(--md-primary-text)] tabular-nums">
                            {m.entry_number}
                          </td>
                          <td className="p-3">{getRefBadge(m.reference_type)}</td>
                          <td className="p-3 text-[var(--md-on-surface)]">{m.description}</td>
                          <td className="p-3 font-mono font-bold text-[var(--md-success)] tabular-nums">
                            {m.debit > 0 ? `${formatAmount(m.debit)} ${currency}` : '-'}
                          </td>
                          <td className="p-3 font-mono font-bold text-[var(--md-warning)] tabular-nums">
                            {m.credit > 0 ? `${formatAmount(m.credit)} ${currency}` : '-'}
                          </td>
                          <td className="p-3 font-mono font-bold text-[var(--md-on-surface)] tabular-nums">
                            {formatAmount(m.running_balance)} {currency}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL 2: NEW MANUAL DOUBLE-ENTRY JOURNAL ==================== */}
      {showNewJournalModal && (
        <div className="m3-backdrop p-4" dir="rtl">
          <form
            onSubmit={handleSaveManualJournal}
            className="m3-modal-surface w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
          >
            {/* Modal Header */}
            <div className="p-5 bg-[var(--md-surface-container-low)] border-b border-[var(--md-outline-variant)] flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-[var(--md-on-surface)] flex items-center gap-2">
                  <Plus className="w-5 h-5 text-[var(--md-primary-text)]" />
                  <span>إضافة قيد يومية مزدوج جديد (New Manual Journal Entry)</span>
                </h3>
                <p className="text-[11px] text-[var(--md-on-surface-variant)] mt-0.5">
                  لا يمكن ترحيل القيد إلا عند تطابق إجمالي المدين مع إجمالي الدائن (الفارق = 0)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewJournalModal(false)}
                className="m3-btn-outlined !min-h-[36px] !px-2.5 !py-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              {journalFormError && (
                <div className="p-3 rounded-xl bg-[var(--md-error-container)] border border-[var(--md-error)]/40 text-[var(--md-on-error-container)] text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[var(--md-error)]" />
                  <span>{journalFormError}</span>
                </div>
              )}

              {/* Header Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--md-on-surface-variant)] mb-1">
                    التاريخ *
                  </label>
                  <input
                    type="date"
                    required
                    value={newJournalDate}
                    onChange={(e) => setNewJournalDate(e.target.value)}
                    className="m3-input !h-10 text-xs tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--md-on-surface-variant)] mb-1">
                    رقم المرجع (اختياري)
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: MAN-001"
                    value={newJournalRef}
                    onChange={(e) => setNewJournalRef(e.target.value)}
                    className="m3-input !h-10 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--md-on-surface-variant)] mb-1">
                    البيان العام للقيد *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: إثبات رأس مال / تسوية محاسبية..."
                    value={newJournalDesc}
                    onChange={(e) => setNewJournalDesc(e.target.value)}
                    className="m3-input !h-10 text-xs"
                  />
                </div>
              </div>

              {/* Lines Table */}
              <div className="overflow-x-auto rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container-low)]">
                <table className="m3-table text-right text-xs">
                  <thead className="m3-thead">
                    <tr>
                      <th className="m3-th !py-2.5 min-w-[220px]">الحساب المحاسبي *</th>
                      <th className="m3-th !py-2.5 w-32">مدين (Debit)</th>
                      <th className="m3-th !py-2.5 w-32">دائن (Credit)</th>
                      <th className="m3-th !py-2.5">بيان السطر</th>
                      <th className="m3-th !py-2.5 w-12 text-center">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--md-outline-variant)]">
                    {newJournalLines.map((row) => (
                      <tr key={row.key}>
                        <td className="p-2">
                          <select
                            value={row.account_code}
                            onChange={(e) => handleUpdateJournalRow(row.key, 'account_code', e.target.value)}
                            className="m3-select !h-9 text-xs"
                          >
                            <option value="">-- اختر الحساب --</option>
                            {chartOfAccounts.map((acc) => (
                              <option key={acc.code} value={acc.code}>
                                {acc.code} — {acc.name_ar}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={row.debit}
                            onChange={(e) => handleUpdateJournalRow(row.key, 'debit', e.target.value)}
                            className="m3-input !h-9 text-xs font-mono font-bold text-[var(--md-success)] tabular-nums"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={row.credit}
                            onChange={(e) => handleUpdateJournalRow(row.key, 'credit', e.target.value)}
                            className="m3-input !h-9 text-xs font-mono font-bold text-[var(--md-warning)] tabular-nums"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            placeholder="بيان تفصيلي للسطر..."
                            value={row.description}
                            onChange={(e) => handleUpdateJournalRow(row.key, 'description', e.target.value)}
                            className="m3-input !h-9 text-xs"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            disabled={newJournalLines.length <= 2}
                            onClick={() => handleRemoveJournalRow(row.key)}
                            className="m3-btn-danger !min-h-[32px] !px-2 !py-1.5 disabled:opacity-30"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                onClick={handleAddJournalRow}
                className="m3-btn-tonal !min-h-[36px] text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ إضافة طرف جديد</span>
              </button>
            </div>

            {/* Live Balance Footer Bar */}
            <div className="p-4 bg-[var(--md-surface-container-low)] border-t border-[var(--md-outline-variant)] flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-4 flex-wrap text-xs">
                <div>
                  <span className="text-[var(--md-on-surface-variant)] ml-1">إجمالي المدين:</span>
                  <span className="font-mono font-bold text-[var(--md-success)] tabular-nums">
                    {formatAmount(newJournalTotals.totalDebit)} {currency}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--md-on-surface-variant)] ml-1">إجمالي الدائن:</span>
                  <span className="font-mono font-bold text-[var(--md-warning)] tabular-nums">
                    {formatAmount(newJournalTotals.totalCredit)} {currency}
                  </span>
                </div>
                <div
                  className={`m3-badge font-mono font-bold tabular-nums ${
                    newJournalTotals.isBalanced ? 'm3-badge-success' : 'm3-badge-error'
                  }`}
                >
                  الفارق: {formatAmount(newJournalTotals.difference)} {currency}
                </div>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setShowNewJournalModal(false)}
                  className="m3-btn-outlined !min-h-[40px] text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={!newJournalTotals.canSave || submittingJournal}
                  className="m3-btn-primary !min-h-[40px] text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submittingJournal && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>حفظ وترحيل القيد المزدوج</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ==================== MODAL 3: ADD SUB-ACCOUNT ==================== */}
      {showAddAccountModal && (
        <div className="m3-backdrop p-4" dir="rtl">
          <form
            onSubmit={handleSaveNewAccount}
            className="m3-modal-surface w-full max-w-md overflow-hidden"
          >
            <div className="p-4 bg-[var(--md-surface-container-low)] border-b border-[var(--md-outline-variant)] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--md-on-surface)] flex items-center gap-2">
                <Plus className="w-4 h-4 text-[var(--md-secondary)]" />
                <span>إضافة حساب فرعي جديد لشجرة الحسابات</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddAccountModal(false)}
                className="m3-btn-outlined !min-h-[32px] !px-2 !py-1.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5">
              {accountFormError && (
                <div className="p-3 rounded-xl bg-[var(--md-error-container)] border border-[var(--md-error)]/40 text-[var(--md-on-error-container)] text-xs font-medium">
                  {accountFormError}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-[var(--md-on-surface-variant)] mb-1">
                  رقم الحساب (Code) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: 1108 أو 5204"
                  value={newAccCode}
                  onChange={(e) => setNewAccCode(e.target.value)}
                  className="m3-input !h-10 text-xs font-mono tabular-nums"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--md-on-surface-variant)] mb-1">
                  اسم الحساب *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: مصروفات التسويق والإعلان"
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  className="m3-input !h-10 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--md-on-surface-variant)] mb-1">
                    تصنيف الحساب *
                  </label>
                  <select
                    value={newAccType}
                    onChange={(e) => {
                      const val = e.target.value as ChartAccountItem['type'];
                      setNewAccType(val);
                      setNewAccNature(val === 'ASSET' || val === 'EXPENSE' ? 'DEBIT' : 'CREDIT');
                    }}
                    className="m3-select !h-10 text-xs"
                  >
                    <option value="ASSET">1000 — الأصول (ASSET)</option>
                    <option value="LIABILITY">2000 — الالتزامات (LIABILITY)</option>
                    <option value="EQUITY">3000 — حقوق الملكية (EQUITY)</option>
                    <option value="REVENUE">4000 — الإيرادات (REVENUE)</option>
                    <option value="EXPENSE">5000 — المصروفات (EXPENSE)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--md-on-surface-variant)] mb-1">
                    طبيعة الحساب *
                  </label>
                  <select
                    value={newAccNature}
                    onChange={(e) => setNewAccNature(e.target.value as 'DEBIT' | 'CREDIT')}
                    className="m3-select !h-10 text-xs"
                  >
                    <option value="DEBIT">مدين (DEBIT)</option>
                    <option value="CREDIT">دائن (CREDIT)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-4 bg-[var(--md-surface-container-low)] border-t border-[var(--md-outline-variant)] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowAddAccountModal(false)}
                className="m3-btn-outlined !min-h-[38px] text-xs"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={submittingAccount}
                className="m3-btn-primary !min-h-[38px] text-xs disabled:opacity-50"
              >
                {submittingAccount && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>حفظ الحساب الجديد</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==================== MODAL 4: CONFIRM DELETE MANUAL ENTRY ==================== */}
      {entryPendingDelete && (
        <div className="m3-backdrop p-4" dir="rtl">
          <div className="m3-modal-surface w-full max-w-md overflow-hidden">
            <div className="p-4 bg-[var(--md-error-container)] border-b border-[var(--md-error)]/30 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--md-on-error-container)] flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-[var(--md-error)]" />
                <span>تأكيد حذف / عكس القيد اليدوي</span>
              </h3>
              <button
                onClick={() => setEntryPendingDelete(null)}
                className="p-1.5 rounded-lg text-[var(--md-on-error-container)] hover:bg-[var(--md-error)]/15 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-2 text-xs text-[var(--md-on-surface)]">
              <p>
                هل أنت متأكد من حذف القيد المحاسبي رقم{' '}
                <strong className="font-mono text-[var(--md-secondary)] tabular-nums">
                  {entryPendingDelete.entry_number}
                </strong>
                ؟
              </p>
              <p className="text-[var(--md-on-surface-variant)]">{entryPendingDelete.description}</p>
              <p className="text-[11px] text-[var(--md-warning)] font-semibold pt-1">
                سيتم إعادة احتساب أرصدة جميع الحسابات وميزان المراجعة تلقائياً فور الحذف.
              </p>
            </div>
            <div className="p-4 bg-[var(--md-surface-container-low)] border-t border-[var(--md-outline-variant)] flex items-center justify-end gap-2.5">
              <button
                onClick={() => setEntryPendingDelete(null)}
                className="m3-btn-outlined !min-h-[38px] text-xs"
              >
                تراجع
              </button>
              <button
                onClick={handleConfirmDeleteEntry}
                disabled={deletingEntry}
                className="m3-btn-danger !min-h-[38px] text-xs disabled:opacity-50"
              >
                {deletingEntry && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>تأكيد الحذف وإعادة الاحتساب</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
