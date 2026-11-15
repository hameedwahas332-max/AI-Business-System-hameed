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
    badgeClass: 'bg-emerald-950 text-emerald-300 border-emerald-800',
    borderClass: 'border-emerald-900/50',
  },
  {
    key: 'LIABILITY',
    codePrefix: '2000',
    title: '2000 — الالتزامات والخصوم (Liabilities)',
    subtitle: 'ذمم الموردين، ضريبة المخرجات، الرواتب والمستحقات',
    badgeClass: 'bg-amber-950 text-amber-300 border-amber-800',
    borderClass: 'border-amber-900/50',
  },
  {
    key: 'EQUITY',
    codePrefix: '3000',
    title: '3000 — حقوق الملكية ورأس المال (Equity)',
    subtitle: 'رأس المال والأرصدة الافتتاحية والأرباح المحتجزة',
    badgeClass: 'bg-sky-950 text-sky-300 border-sky-800',
    borderClass: 'border-sky-900/50',
  },
  {
    key: 'REVENUE',
    codePrefix: '4000',
    title: '4000 — الإيرادات (Revenue)',
    subtitle: 'إيرادات المبيعات ومردودات ومسموحات المبيعات',
    badgeClass: 'bg-teal-950 text-teal-300 border-teal-800',
    borderClass: 'border-teal-900/50',
  },
  {
    key: 'EXPENSE',
    codePrefix: '5000',
    title: '5000 — التكاليف والمصروفات (Expenses & COGS)',
    subtitle: 'تكلفة البضاعة المباعة، الرواتب، العمومية، الإيجارات والمنافع، التسويات',
    badgeClass: 'bg-rose-950 text-rose-300 border-rose-800',
    borderClass: 'border-rose-900/50',
  },
];

const REFERENCE_TYPE_LABELS: Record<string, { label: string; colorClass: string }> = {
  SALES_INVOICE: { label: 'فاتورة مبيعات', colorClass: 'bg-teal-950 text-teal-300 border-teal-800' },
  POS_SALE: { label: 'مبيعات نقطة بيع', colorClass: 'bg-emerald-950 text-emerald-300 border-emerald-800' },
  PURCHASE_INVOICE: { label: 'فاتورة مشتريات', colorClass: 'bg-purple-950 text-purple-300 border-purple-800' },
  OPENING_BALANCE: { label: 'رصيد افتتاحي', colorClass: 'bg-sky-950 text-sky-300 border-sky-800' },
  RECEIPT_VOUCHER: { label: 'سند قبض', colorClass: 'bg-emerald-900/60 text-emerald-200 border-emerald-700' },
  PAYMENT_VOUCHER: { label: 'سند صرف', colorClass: 'bg-amber-950 text-amber-300 border-amber-800' },
  EXPENSE_VOUCHER: { label: 'سند مصروف', colorClass: 'bg-rose-950 text-rose-300 border-rose-800' },
  EXPENSE: { label: 'مصروف تشغيلي', colorClass: 'bg-rose-950 text-rose-300 border-rose-800' },
  PAYROLL: { label: 'مسير رواتب', colorClass: 'bg-indigo-950 text-indigo-300 border-indigo-800' },
  SALES_RETURN: { label: 'مرتجع مبيعات', colorClass: 'bg-orange-950 text-orange-300 border-orange-800' },
  INVENTORY_COGS: { label: 'تكلفة بضاعة مباعة', colorClass: 'bg-amber-950/80 text-amber-200 border-amber-800' },
  INVENTORY_ADJUSTMENT: { label: 'تسوية مخزون', colorClass: 'bg-indigo-950 text-indigo-300 border-indigo-800' },
  FUEL_PUMP_SHIFT: { label: 'وردية محطة وقود', colorClass: 'bg-amber-950 text-amber-300 border-amber-800' },
  FUEL_TANK_REFILL: { label: 'تفريغ وقود خزانات', colorClass: 'bg-cyan-950 text-cyan-300 border-cyan-800' },
  MANUAL: { label: 'قيد يومية يدوي', colorClass: 'bg-amber-500/15 text-amber-300 border-amber-500/40' },
  MANUAL_JOURNAL: { label: 'قيد يومية يدوي', colorClass: 'bg-amber-500/15 text-amber-300 border-amber-500/40' },
  ADJUSTMENT: { label: 'قيد تسوية', colorClass: 'bg-sky-950 text-sky-300 border-sky-800' },
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
      colorClass: 'bg-slate-800 text-slate-300 border-slate-700',
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${info.colorClass}`}>
        {info.label}
      </span>
    );
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
    <div className="space-y-6 text-right">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-between shadow-lg ${
            toastMsg.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-700 text-emerald-200'
              : 'bg-rose-950/90 border-rose-700 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{toastMsg.text}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 bg-slate-900 rounded-2xl border border-emerald-900/50 shadow-xl">
        <div>
          <div className="flex items-center gap-2.5 text-white font-bold text-lg mb-1">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-amber-500/20 border border-emerald-500/30">
              <BookOpen className="w-5 h-5 text-emerald-400" />
            </div>
            <span>المركز المحاسبي ودفتر الأستاذ العام (Accounting Ledger Hub)</span>
          </div>
          <p className="text-xs text-slate-400">
            منظومة القيد المزدوج المتكاملة: دليل الحسابات الشجري، سجل القيود التفصيلية، كشف الأستاذ المساعد (T-Account)، وميزان المراجعة.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => fetchData()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 hover:border-emerald-500/50 text-slate-200 text-xs font-bold transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>

          <button
            onClick={() => {
              setJournalFormError(null);
              setShowNewJournalModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-l from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/60 border border-emerald-400/30 transition-all"
          >
            <Plus className="w-4 h-4 text-amber-300" />
            <span>+ قيد يومية مزدوج جديد</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900 rounded-2xl border border-emerald-900/40 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-semibold block mb-1">إجمالي الحركات المدينة (Total Debit)</span>
            <span className="font-mono font-bold text-lg text-emerald-400">
              {formatAmount(summary.totalDebit)} {currency}
            </span>
          </div>
          <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-400 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-slate-900 rounded-2xl border border-emerald-900/40 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-semibold block mb-1">إجمالي الحركات الدائنة (Total Credit)</span>
            <span className="font-mono font-bold text-lg text-amber-400">
              {formatAmount(summary.totalCredit)} {currency}
            </span>
          </div>
          <div className="p-3 bg-amber-950/60 border border-amber-800/70 text-amber-400 rounded-xl">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-slate-900 text-white rounded-2xl border border-emerald-900/40 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-semibold block mb-1">توازن الدفتر المحاسبي</span>
            <span className={`font-mono font-bold text-base ${summary.isBalanced ? 'text-emerald-400' : 'text-rose-400'}`}>
              {summary.isBalanced ? 'متوازن 100% (Balanced)' : `غير متوازن (فارق ${formatAmount(summary.difference)})`}
            </span>
          </div>
          <div
            className={`p-3 rounded-xl border ${
              summary.isBalanced
                ? 'bg-emerald-950/80 border-emerald-800 text-emerald-400'
                : 'bg-rose-950/80 border-rose-800 text-rose-400'
            }`}
          >
            <Scale className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-slate-900 text-white rounded-2xl border border-emerald-900/40 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-semibold block mb-1">القيود الفعالة / الحسابات</span>
            <span className="font-mono font-bold text-lg text-teal-300">
              {summary.activeCount} قيد <span className="text-xs text-slate-500">/ {chartOfAccounts.length} حساب</span>
            </span>
          </div>
          <div className="p-3 bg-slate-950 border border-teal-800/70 text-teal-400 rounded-xl">
            <GitBranch className="w-5 h-5" />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 3 Main Tabs Bar */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-950 rounded-2xl border border-emerald-900/40">
        <button
          onClick={() => setActiveTab('journal')}
          className={`flex-1 min-w-[200px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'journal'
              ? 'bg-gradient-to-l from-emerald-600/30 to-teal-600/20 text-emerald-300 border border-emerald-500/40 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>دفتر اليومية والقيود المحاسبية (Journal Entries)</span>
        </button>

        <button
          onClick={() => setActiveTab('coa')}
          className={`flex-1 min-w-[200px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'coa'
              ? 'bg-gradient-to-l from-emerald-600/30 to-amber-600/20 text-amber-300 border border-amber-500/40 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <ListTree className="w-4 h-4" />
          <span>دليل الحسابات الشجري (Chart of Accounts)</span>
        </button>

        <button
          onClick={() => setActiveTab('trial_balance')}
          className={`flex-1 min-w-[200px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'trial_balance'
              ? 'bg-gradient-to-l from-amber-600/25 to-emerald-600/25 text-amber-300 border border-amber-500/40 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>ميزان المراجعة بالأرصدة والمجاميع (Trial Balance)</span>
        </button>
      </div>

      {/* ==================== TAB 1: JOURNAL ENTRIES ==================== */}
      {activeTab === 'journal' && (
        <div className="bg-slate-900 rounded-2xl border border-emerald-900/50 shadow-xl overflow-hidden">
          {/* Toolbar & Filters */}
          <div className="p-4 border-b border-slate-800 bg-slate-950/70 space-y-3">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="بحث في رقم القيد، البيان، المرجع، أو الحساب..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-3 pr-9 py-2 text-xs bg-slate-900 border border-slate-700 text-white rounded-xl focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Detailed vs Summary Toggle */}
                <div className="inline-flex rounded-xl bg-slate-900 border border-slate-700 p-0.5">
                  <button
                    onClick={() => setJournalViewMode('detailed')}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                      journalViewMode === 'detailed'
                        ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    القيود التفصيلية بالأسطر
                  </button>
                  <button
                    onClick={() => setJournalViewMode('summary')}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                      journalViewMode === 'summary'
                        ? 'bg-amber-600/25 text-amber-300 border border-amber-500/40'
                        : 'text-slate-400 hover:text-white'
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
                className="py-2 px-3 text-xs bg-slate-900 border border-slate-700 text-white rounded-xl focus:outline-none focus:border-emerald-500"
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
                className="py-2 px-3 text-xs bg-slate-900 border border-slate-700 text-white rounded-xl focus:outline-none focus:border-emerald-500"
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
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute right-3 pointer-events-none" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  title="من تاريخ"
                  className="w-full pr-8 pl-2 py-2 text-xs bg-slate-900 border border-slate-700 text-white rounded-xl focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="relative flex items-center">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute right-3 pointer-events-none" />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  title="إلى تاريخ"
                  className="w-full pr-8 pl-2 py-2 text-xs bg-slate-900 border border-slate-700 text-white rounded-xl focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                onClick={resetJournalFilters}
                className="inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-xl transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>إعادة ضبط الفلاتر</span>
              </button>
            </div>
          </div>

          {/* Journal Entries Content */}
          {loading ? (
            <div className="p-12 text-center text-slate-400">
              <Loader2 className="w-7 h-7 animate-spin text-emerald-400 mx-auto mb-2" />
              <span className="text-xs">جاري تحميل القيود اليومية المزدوجة...</span>
            </div>
          ) : filteredJournalEntries.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              لا توجد قيود محاسبية مطابقة لمعايير البحث الحالية.
            </div>
          ) : journalViewMode === 'detailed' ? (
            /* DETAILED DOUBLE-ENTRY LINES VIEW */
            <div className="divide-y divide-slate-800">
              {filteredJournalEntries.map((entry) => {
                const isCancelled = entry.status === 'CANCELLED';
                const isManual = MANUAL_REF_TYPES.has(entry.reference_type);
                return (
                  <div
                    key={entry.id}
                    className={`p-4 transition-colors ${
                      isCancelled ? 'bg-rose-950/15 opacity-70' : 'hover:bg-slate-800/30'
                    }`}
                  >
                    {/* Entry Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800/80">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-950 border border-emerald-800/60 text-emerald-300">
                          {entry.entry_number}
                        </span>
                        <span className="font-mono text-xs text-slate-400">{entry.date}</span>
                        {getRefBadge(entry.reference_type)}
                        {entry.reference_id && (
                          <span className="font-mono text-[11px] text-amber-300/90 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/50">
                            #{entry.reference_id}
                          </span>
                        )}
                        {isCancelled && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-700">
                            ملغى / معكوس
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-slate-400">
                          بواسطة: <strong className="text-slate-200">{entry.created_by}</strong>
                        </span>
                        <span className="font-mono text-xs font-bold text-amber-300">
                          إجمالي القيد: {formatAmount(entry.total_debit)} {currency}
                        </span>
                        {isManual && !isCancelled && (
                          <button
                            onClick={() => setEntryPendingDelete(entry)}
                            title="حذف / عكس القيد اليدوي"
                            className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-400 border border-rose-800/60 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-xs font-semibold text-slate-200 mb-3">{entry.description}</p>

                    {/* Double-Entry Lines Sub-Table */}
                    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/70">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="p-2.5 w-24">رقم الحساب</th>
                            <th className="p-2.5">البيان التفصيلي للطرف (من ح/ — إلى ح/)</th>
                            <th className="p-2.5 w-36">مدين (Debit)</th>
                            <th className="p-2.5 w-36">دائن (Credit)</th>
                            <th className="p-2.5">ملاحظة السطر</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/70">
                          {entry.lines.map((line, idx) => {
                            const isDebitLine = line.debit > 0;
                            return (
                              <tr key={line.id || idx} className="hover:bg-slate-900/60">
                                <td className="p-2.5 font-mono font-bold text-amber-400">
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
                                      isDebitLine ? 'text-emerald-300' : 'text-teal-300 pr-5'
                                    }`}
                                  >
                                    {isDebitLine ? (
                                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                    ) : (
                                      <ArrowDownLeft className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                    )}
                                    <span>
                                      {isDebitLine ? 'من ح/ ' : 'إلى ح/ '}
                                      {line.account_name}
                                    </span>
                                  </button>
                                </td>
                                <td className="p-2.5 font-mono font-bold text-emerald-400">
                                  {line.debit > 0 ? `${formatAmount(line.debit)} ${currency}` : '-'}
                                </td>
                                <td className="p-2.5 font-mono font-bold text-amber-300">
                                  {line.credit > 0 ? `${formatAmount(line.credit)} ${currency}` : '-'}
                                </td>
                                <td className="p-2.5 text-slate-400">{line.description || '-'}</td>
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
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">التاريخ</th>
                    <th className="p-3.5">رقم القيد</th>
                    <th className="p-3.5">المرجع</th>
                    <th className="p-3.5">الأطراف المحاسبية</th>
                    <th className="p-3.5">مدين (Debit)</th>
                    <th className="p-3.5">دائن (Credit)</th>
                    <th className="p-3.5">البيان العام</th>
                    <th className="p-3.5">المستخدم</th>
                    <th className="p-3.5 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredJournalEntries.map((entry) => {
                    const isExpanded = Boolean(expandedEntryIds[entry.id]);
                    const isManual = MANUAL_REF_TYPES.has(entry.reference_type);
                    const isCancelled = entry.status === 'CANCELLED';
                    return (
                      <React.Fragment key={entry.id}>
                        <tr className={`hover:bg-slate-800/40 transition-colors ${isCancelled ? 'opacity-60' : ''}`}>
                          <td className="p-3.5 font-mono text-slate-400">{entry.date}</td>
                          <td className="p-3.5 font-mono font-bold text-emerald-300">{entry.entry_number}</td>
                          <td className="p-3.5">{getRefBadge(entry.reference_type)}</td>
                          <td className="p-3.5 text-slate-300">
                            {entry.lines.map((l) => l.account_code).join(' ⇄ ') || '-'}
                          </td>
                          <td className="p-3.5 font-mono font-bold text-emerald-400">
                            {formatAmount(entry.total_debit)} {currency}
                          </td>
                          <td className="p-3.5 font-mono font-bold text-amber-300">
                            {formatAmount(entry.total_credit)} {currency}
                          </td>
                          <td className="p-3.5 text-slate-200 max-w-xs truncate">{entry.description}</td>
                          <td className="p-3.5 text-slate-400">{entry.created_by}</td>
                          <td className="p-3.5">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() =>
                                  setExpandedEntryIds((prev) => ({ ...prev, [entry.id]: !prev[entry.id] }))
                                }
                                title="تفاصيل الأسطر"
                                className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-emerald-400 border border-slate-700"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              {isManual && !isCancelled && (
                                <button
                                  onClick={() => setEntryPendingDelete(entry)}
                                  title="حذف / عكس القيد اليدوي"
                                  className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-400 border border-rose-800/60"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-slate-950/80">
                            <td colSpan={9} className="p-3">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {entry.lines.map((l, idx) => (
                                  <div
                                    key={l.id || idx}
                                    className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800"
                                  >
                                    <span className="text-xs font-bold text-slate-200">
                                      <span className="font-mono text-amber-400 ml-1.5">{l.account_code}</span>
                                      {l.debit > 0 ? 'من ح/ ' : 'إلى ح/ '}
                                      {l.account_name}
                                    </span>
                                    <span
                                      className={`font-mono font-bold text-xs ${
                                        l.debit > 0 ? 'text-emerald-400' : 'text-amber-300'
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
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-slate-900 rounded-2xl border border-emerald-900/50 shadow-xl">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="بحث برقم الحساب أو اسم الحساب..."
                value={coaSearch}
                onChange={(e) => setCoaSearch(e.target.value)}
                className="w-full pl-3 pr-9 py-2 text-xs bg-slate-950 border border-slate-700 text-white rounded-xl focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2.5">
              <span className="text-[11px] text-slate-400 hidden md:inline">
                اضغط على أي حساب لفتح كشف الأستاذ المساعد (T-Account)
              </span>
              <button
                onClick={() => {
                  setAccountFormError(null);
                  setShowAddAccountModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-l from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 text-xs font-extrabold shadow-lg transition-all"
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
                  className={`bg-slate-900 rounded-2xl border ${group.borderClass} shadow-xl overflow-hidden`}
                >
                  <button
                    onClick={() => setCollapsedGroups((prev) => ({ ...prev, [group.key]: !prev[group.key] }))}
                    className="w-full p-4 bg-slate-950/80 flex items-center justify-between gap-3 hover:bg-slate-950 transition-colors text-right"
                  >
                    <div className="flex items-center gap-3">
                      {isCollapsed ? (
                        <ChevronLeft className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-emerald-400" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{group.title}</span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${group.badgeClass}`}>
                            {groupAccounts.length} حساب
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{group.subtitle}</p>
                      </div>
                    </div>

                    <div className="text-left">
                      <span className="text-[10px] text-slate-400 block">إجمالي رصيد المجموعة</span>
                      <span className="font-mono font-bold text-sm text-amber-300">
                        {formatAmount(groupTotalBalance)} {currency}
                      </span>
                    </div>
                  </button>

                  {!isCollapsed && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-950/40 text-slate-400 border-y border-slate-800">
                          <tr>
                            <th className="p-3 w-28">رقم الحساب</th>
                            <th className="p-3">اسم الحساب</th>
                            <th className="p-3 w-28">الطبيعة</th>
                            <th className="p-3 w-40">إجمالي المدين</th>
                            <th className="p-3 w-40">إجمالي الدائن</th>
                            <th className="p-3 w-44">الرصيد الحالي</th>
                            <th className="p-3 w-32 text-center">دفتر الأستاذ المساعد</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/70">
                          {groupAccounts.map((acc) => (
                            <tr
                              key={acc.code}
                              onClick={() => setSelectedTAccount(acc)}
                              className="hover:bg-emerald-950/25 cursor-pointer transition-colors"
                            >
                              <td className="p-3 font-mono font-bold text-amber-400">{acc.code}</td>
                              <td className="p-3">
                                <div className="font-bold text-slate-100">{acc.name_ar}</div>
                                {acc.name && acc.name !== acc.name_ar && (
                                  <div className="text-[10px] text-slate-500 font-mono">{acc.name}</div>
                                )}
                              </td>
                              <td className="p-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                    acc.nature === 'DEBIT'
                                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                      : 'bg-amber-950 text-amber-300 border-amber-800'
                                  }`}
                                >
                                  {acc.nature === 'DEBIT' ? 'مدين (DEBIT)' : 'دائن (CREDIT)'}
                                </span>
                              </td>
                              <td className="p-3 font-mono text-emerald-400 font-semibold">
                                {formatAmount(acc.debit_total)} {currency}
                              </td>
                              <td className="p-3 font-mono text-teal-300 font-semibold">
                                {formatAmount(acc.credit_total)} {currency}
                              </td>
                              <td
                                className={`p-3 font-mono font-bold ${
                                  acc.balance >= 0 ? 'text-white' : 'text-rose-400'
                                }`}
                              >
                                {formatAmount(acc.balance)} {currency}
                              </td>
                              <td className="p-3 text-center">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950 border border-emerald-800/60 text-emerald-300 text-[11px] font-bold">
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
        <div className="bg-slate-900 rounded-2xl border border-emerald-900/50 shadow-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-slate-950/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white">ميزان المراجعة بالأرصدة والمجاميع (Trial Balance)</h3>
              <p className="text-[11px] text-slate-400">
                مطابقة تلقائية لمجاميع الحركات والأرصدة المدينة والدائنة لجميع الحسابات
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-slate-900 px-3 py-2 rounded-xl border border-slate-700">
                <input
                  type="checkbox"
                  checked={hideZeroTrialRows}
                  onChange={(e) => setHideZeroTrialRows(e.target.checked)}
                  className="accent-emerald-500 rounded"
                />
                <span>إخفاء الحسابات الصفرية</span>
              </label>

              <ExportActions getConfig={getTrialBalanceExportConfig} />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="p-3.5">رقم الحساب</th>
                  <th className="p-3.5">اسم الحساب</th>
                  <th className="p-3.5">طبيعة الحساب</th>
                  <th className="p-3.5">إجمالي الحركة المدينة</th>
                  <th className="p-3.5">إجمالي الحركة الدائنة</th>
                  <th className="p-3.5">الرصيد المدين</th>
                  <th className="p-3.5">الرصيد الدائن</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {trialBalanceData.rows.map((row) => (
                  <tr
                    key={row.code}
                    onClick={() => setSelectedTAccount(row)}
                    className="hover:bg-emerald-950/20 cursor-pointer transition-colors"
                  >
                    <td className="p-3.5 font-mono font-bold text-amber-400">{row.code}</td>
                    <td className="p-3.5 font-bold text-slate-100">{row.name_ar}</td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          row.nature === 'DEBIT'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : 'bg-amber-950 text-amber-300 border-amber-800'
                        }`}
                      >
                        {row.nature === 'DEBIT' ? 'مدين' : 'دائن'}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-emerald-400">
                      {row.debit_total > 0 ? `${formatAmount(row.debit_total)} ${currency}` : '-'}
                    </td>
                    <td className="p-3.5 font-mono text-teal-300">
                      {row.credit_total > 0 ? `${formatAmount(row.credit_total)} ${currency}` : '-'}
                    </td>
                    <td className="p-3.5 font-mono font-bold text-emerald-300">
                      {row.debitBalance > 0 ? `${formatAmount(row.debitBalance)} ${currency}` : '-'}
                    </td>
                    <td className="p-3.5 font-mono font-bold text-amber-300">
                      {row.creditBalance > 0 ? `${formatAmount(row.creditBalance)} ${currency}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-950 font-bold border-t-2 border-amber-500/40 text-xs">
                <tr>
                  <td colSpan={3} className="p-4 text-amber-300">
                    الإجماليات الكلية لميزان المراجعة
                  </td>
                  <td className="p-4 font-mono text-emerald-400">
                    {formatAmount(trialBalanceData.sumDebitMovements)} {currency}
                  </td>
                  <td className="p-4 font-mono text-teal-300">
                    {formatAmount(trialBalanceData.sumCreditMovements)} {currency}
                  </td>
                  <td className="p-4 font-mono text-emerald-300">
                    {formatAmount(trialBalanceData.sumDebitBalances)} {currency}
                  </td>
                  <td className="p-4 font-mono text-amber-300">
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
                ? 'bg-gradient-to-l from-amber-500/15 via-emerald-500/10 to-slate-950 border-amber-500/40'
                : 'bg-rose-950/50 border-rose-700'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Scale className={`w-5 h-5 ${trialBalanceData.isFullyBalanced ? 'text-amber-400' : 'text-rose-400'}`} />
              <div>
                <div className="text-xs font-extrabold text-amber-300">
                  إجمالي المدين = إجمالي الدائن ({formatAmount(trialBalanceData.sumDebitBalances)} {currency} ={' '}
                  {formatAmount(trialBalanceData.sumCreditBalances)} {currency})
                </div>
                <div className="text-[11px] text-slate-400">
                  مجموع الحركات: مدين {formatAmount(trialBalanceData.sumDebitMovements)} {currency} | دائن{' '}
                  {formatAmount(trialBalanceData.sumCreditMovements)} {currency}
                </div>
              </div>
            </div>

            <span
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold border ${
                trialBalanceData.isFullyBalanced
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                  : 'bg-rose-950 text-rose-300 border-rose-600'
              }`}
            >
              {trialBalanceData.isFullyBalanced ? 'متوازن 100% ✓' : 'يوجد فارق في التوازن !'}
            </span>
          </div>
        </div>
      )}

      {/* ==================== MODAL 1: T-ACCOUNT STATEMENT ==================== */}
      {selectedTAccount && tAccountDetails && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-800/70 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-extrabold px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/40">
                    {selectedTAccount.code}
                  </span>
                  <h3 className="text-base font-bold text-white">
                    كشف حركة الحساب (دفتر الأستاذ المساعد - T-Account): {selectedTAccount.name_ar}
                  </h3>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  طبيعة الحساب: {selectedTAccount.nature === 'DEBIT' ? 'مدين (Debit)' : 'دائن (Credit)'} | عدد الحركات:{' '}
                  {tAccountDetails.movements.length}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <ExportActions getConfig={getTAccountExportConfig} />
                <button
                  onClick={() => setSelectedTAccount(null)}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5">
              {/* Visual T-Account Header */}
              <div className="rounded-2xl border border-amber-500/30 bg-slate-950/80 overflow-hidden">
                <div className="p-2.5 text-center border-b-2 border-amber-500/50 bg-slate-950 font-bold text-xs text-amber-300">
                  ح/ {selectedTAccount.name_ar} ({selectedTAccount.code})
                </div>
                <div className="grid grid-cols-2 divide-x divide-x-reverse divide-amber-500/40">
                  <div className="p-4 text-center">
                    <span className="text-[11px] text-slate-400 block mb-1">الجانب المدين (منه / Debit)</span>
                    <span className="font-mono text-base font-extrabold text-emerald-400">
                      {formatAmount(tAccountDetails.totalDebit)} {currency}
                    </span>
                  </div>
                  <div className="p-4 text-center">
                    <span className="text-[11px] text-slate-400 block mb-1">الجانب الدائن (له / Credit)</span>
                    <span className="font-mono text-base font-extrabold text-amber-300">
                      {formatAmount(tAccountDetails.totalCredit)} {currency}
                    </span>
                  </div>
                </div>
                <div className="p-2.5 text-center bg-emerald-950/40 border-t border-slate-800 text-xs font-bold text-white">
                  الرصيد التراكمي الختامي:{' '}
                  <span className="font-mono text-emerald-300">
                    {formatAmount(tAccountDetails.closingBalance)} {currency}
                  </span>
                </div>
              </div>

              {/* Movements Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                    <tr>
                      <th className="p-3">التاريخ</th>
                      <th className="p-3">رقم القيد</th>
                      <th className="p-3">المرجع</th>
                      <th className="p-3">البيان</th>
                      <th className="p-3">مدين</th>
                      <th className="p-3">دائن</th>
                      <th className="p-3">الرصيد التراكمي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {tAccountDetails.movements.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400">
                          لا توجد حركات مرحلة على هذا الحساب حتى الآن.
                        </td>
                      </tr>
                    ) : (
                      tAccountDetails.movements.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-800/40">
                          <td className="p-3 font-mono text-slate-400">{m.date}</td>
                          <td className="p-3 font-mono font-bold text-emerald-300">{m.entry_number}</td>
                          <td className="p-3">{getRefBadge(m.reference_type)}</td>
                          <td className="p-3 text-slate-200">{m.description}</td>
                          <td className="p-3 font-mono font-bold text-emerald-400">
                            {m.debit > 0 ? `${formatAmount(m.debit)} ${currency}` : '-'}
                          </td>
                          <td className="p-3 font-mono font-bold text-amber-300">
                            {m.credit > 0 ? `${formatAmount(m.credit)} ${currency}` : '-'}
                          </td>
                          <td className="p-3 font-mono font-bold text-white">
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
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveManualJournal}
            className="bg-slate-900 border border-emerald-800/70 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
          >
            {/* Modal Header */}
            <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-emerald-400" />
                  <span>إضافة قيد يومية مزدوج جديد (New Manual Journal Entry)</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  لا يمكن ترحيل القيد إلا عند تطابق إجمالي المدين مع إجمالي الدائن (الفارق = 0)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewJournalModal(false)}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              {journalFormError && (
                <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-700 text-rose-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{journalFormError}</span>
                </div>
              )}

              {/* Header Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">التاريخ *</label>
                  <input
                    type="date"
                    required
                    value={newJournalDate}
                    onChange={(e) => setNewJournalDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 text-white rounded-xl focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">رقم المرجع (اختياري)</label>
                  <input
                    type="text"
                    placeholder="مثال: MAN-001"
                    value={newJournalRef}
                    onChange={(e) => setNewJournalRef(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 text-white rounded-xl focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">البيان العام للقيد *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: إثبات رأس مال / تسوية محاسبية..."
                    value={newJournalDesc}
                    onChange={(e) => setNewJournalDesc(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 text-white rounded-xl focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Lines Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-2.5 min-w-[220px]">الحساب المحاسبي *</th>
                      <th className="p-2.5 w-32">مدين (Debit)</th>
                      <th className="p-2.5 w-32">دائن (Credit)</th>
                      <th className="p-2.5">بيان السطر</th>
                      <th className="p-2.5 w-12 text-center">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {newJournalLines.map((row) => (
                      <tr key={row.key}>
                        <td className="p-2">
                          <select
                            value={row.account_code}
                            onChange={(e) => handleUpdateJournalRow(row.key, 'account_code', e.target.value)}
                            className="w-full px-2.5 py-2 text-xs bg-slate-900 border border-slate-700 text-white rounded-lg focus:outline-none focus:border-emerald-500"
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
                            className="w-full px-2.5 py-2 text-xs font-mono bg-slate-900 border border-slate-700 text-emerald-300 rounded-lg focus:outline-none focus:border-emerald-500"
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
                            className="w-full px-2.5 py-2 text-xs font-mono bg-slate-900 border border-slate-700 text-amber-300 rounded-lg focus:outline-none focus:border-amber-500"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            placeholder="بيان تفصيلي للسطر..."
                            value={row.description}
                            onChange={(e) => handleUpdateJournalRow(row.key, 'description', e.target.value)}
                            className="w-full px-2.5 py-2 text-xs bg-slate-900 border border-slate-700 text-white rounded-lg focus:outline-none focus:border-emerald-500"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            disabled={newJournalLines.length <= 2}
                            onClick={() => handleRemoveJournalRow(row.key)}
                            className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-950/60 disabled:opacity-30"
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
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-emerald-800/60 text-emerald-300 text-xs font-bold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ إضافة طرف جديد</span>
              </button>
            </div>

            {/* Live Balance Footer Bar */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-4 flex-wrap text-xs">
                <div>
                  <span className="text-slate-400 ml-1">إجمالي المدين:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {formatAmount(newJournalTotals.totalDebit)} {currency}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 ml-1">إجمالي الدائن:</span>
                  <span className="font-mono font-bold text-amber-300">
                    {formatAmount(newJournalTotals.totalCredit)} {currency}
                  </span>
                </div>
                <div
                  className={`px-2.5 py-1 rounded-lg border font-mono font-bold ${
                    newJournalTotals.isBalanced
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                      : 'bg-rose-950 text-rose-300 border-rose-700'
                  }`}
                >
                  الفارق: {formatAmount(newJournalTotals.difference)} {currency}
                </div>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setShowNewJournalModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={!newJournalTotals.canSave || submittingJournal}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-l from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveNewAccount}
            className="bg-slate-900 border border-amber-700/60 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-400" />
                <span>إضافة حساب فرعي جديد لشجرة الحسابات</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddAccountModal(false)}
                className="p-1.5 rounded-lg bg-slate-900 text-slate-300 border border-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5">
              {accountFormError && (
                <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-700 text-rose-200 text-xs">
                  {accountFormError}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">رقم الحساب (Code) *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: 1108 أو 5204"
                  value={newAccCode}
                  onChange={(e) => setNewAccCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-700 text-white rounded-xl focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">اسم الحساب *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: مصروفات التسويق والإعلان"
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 text-white rounded-xl focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">تصنيف الحساب *</label>
                  <select
                    value={newAccType}
                    onChange={(e) => {
                      const val = e.target.value as ChartAccountItem['type'];
                      setNewAccType(val);
                      setNewAccNature(val === 'ASSET' || val === 'EXPENSE' ? 'DEBIT' : 'CREDIT');
                    }}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 text-white rounded-xl focus:outline-none focus:border-amber-500"
                  >
                    <option value="ASSET">1000 — الأصول (ASSET)</option>
                    <option value="LIABILITY">2000 — الالتزامات (LIABILITY)</option>
                    <option value="EQUITY">3000 — حقوق الملكية (EQUITY)</option>
                    <option value="REVENUE">4000 — الإيرادات (REVENUE)</option>
                    <option value="EXPENSE">5000 — المصروفات (EXPENSE)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">طبيعة الحساب *</label>
                  <select
                    value={newAccNature}
                    onChange={(e) => setNewAccNature(e.target.value as 'DEBIT' | 'CREDIT')}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 text-white rounded-xl focus:outline-none focus:border-amber-500"
                  >
                    <option value="DEBIT">مدين (DEBIT)</option>
                    <option value="CREDIT">دائن (CREDIT)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowAddAccountModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={submittingAccount}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-700/70 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 bg-rose-950/60 border-b border-rose-800/60 flex items-center justify-between">
              <h3 className="text-sm font-bold text-rose-200 flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>تأكيد حذف / عكس القيد اليدوي</span>
              </h3>
              <button
                onClick={() => setEntryPendingDelete(null)}
                className="p-1 rounded-lg text-slate-300 hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-2 text-xs text-slate-300">
              <p>
                هل أنت متأكد من حذف القيد المحاسبي رقم{' '}
                <strong className="font-mono text-amber-300">{entryPendingDelete.entry_number}</strong>؟
              </p>
              <p className="text-slate-400">{entryPendingDelete.description}</p>
              <p className="text-[11px] text-amber-300/90 pt-1">
                سيتم إعادة احتساب أرصدة جميع الحسابات وميزان المراجعة تلقائياً فور الحذف.
              </p>
            </div>
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setEntryPendingDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs font-bold"
              >
                تراجع
              </button>
              <button
                onClick={handleConfirmDeleteEntry}
                disabled={deletingEntry}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold disabled:opacity-50"
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
