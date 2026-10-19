import React, { useState, useEffect } from 'react';
import { safeFetchJson } from '../../lib/safeFetch';
import { formatAmount, formatNumber } from '../../lib/formatters';
import {
  Briefcase,
  UploadCloud,
  Scale,
  DollarSign,
  RotateCcw,
  Calendar,
  Search,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  FileSpreadsheet,
  Building2,
  Wallet,
  Landmark,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  TrendingUp,
  Boxes,
  Lock,
  Unlock,
  Layers,
  ArrowLeftRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

type SubTab =
  | 'dashboard'
  | 'import'
  | 'opening_balances'
  | 'reconciliation'
  | 'expenses'
  | 'returns'
  | 'period_close'
  | 'documents'
  | 'search_mode';

export const RealBusinessOperationsTab: React.FC = () => {
  const { token } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('dashboard');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 1. Operating Dashboard State
  const [operatingData, setOperatingData] = useState<any>(null);

  // 2. Import Engine State
  const [importEntityType, setImportEntityType] = useState<string>('CUSTOMERS');
  const [importCsvText, setImportCsvText] = useState<string>('');
  const [importFileName, setImportFileName] = useState<string>('customers.csv');
  const [importPreview, setImportPreview] = useState<any>(null);
  const [importCommitting, setImportCommitting] = useState(false);

  // 3. Opening Balances State
  const [openingBalances, setOpeningBalances] = useState<any[]>([]);
  const [newOpBal, setNewOpBal] = useState({
    balanceType: 'CUSTOMER',
    entityId: '',
    amount: '',
    entrySide: 'DEBIT',
    accountingDate: new Date().toISOString().split('T')[0],
    referenceNo: '',
    notes: ''
  });

  // 4. Reconciliation State
  const [reconciliations, setReconciliations] = useState<any[]>([]);
  const [reconRunning, setReconRunning] = useState(false);
  const [bankReconData, setBankReconData] = useState({
    accountType: 'BANK',
    accountId: '',
    statementStartDate: new Date().toISOString().split('T')[0],
    statementEndDate: new Date().toISOString().split('T')[0],
    statementOpeningBalance: '',
    statementClosingBalance: '',
    unpresentedChecks: '0',
    depositsInTransit: '0',
    bankCharges: '0',
    interestEarned: '0',
    notes: ''
  });
  const [bankReconResult, setBankReconResult] = useState<any>(null);

  // 5. Operational Expenses State
  const [expenses, setExpenses] = useState<any[]>([]);
  const [newExpense, setNewExpense] = useState({
    category: 'إيجار ومرافق',
    description: '',
    amount: '',
    taxAmount: '0',
    paymentMethod: 'CASH',
    paymentAccountId: '',
    expenseDate: new Date().toISOString().split('T')[0],
    reference: '',
    notes: ''
  });

  // 6. Returns State
  const [salesReturns, setSalesReturns] = useState<any[]>([]);
  const [purchaseReturns, setPurchaseReturns] = useState<any[]>([]);
  const [newReturn, setNewReturn] = useState({
    type: 'SALES',
    customerId: '',
    supplierId: '',
    refundMethod: 'CREDIT_NOTE',
    reason: '',
    items: [{ productId: '', quantity: '1', priceOrCost: '0' }]
  });

  // 7. Period Close & Month-End Checklist State
  const [periods, setPeriods] = useState<any[]>([]);
  const [activePeriodId, setActivePeriodId] = useState<string>('');
  const [checklist, setChecklist] = useState<any>(null);

  // 8. Cash & Bank Accounts State
  const [cashAccounts, setCashAccounts] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [suppliersList, setSuppliersList] = useState<any[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);

  // 9. Global Search & Data Mode State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [dataMode, setDataMode] = useState<string>('PRODUCTION');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  // Initial Load
  useEffect(() => {
    fetchMasterData();
    fetchDashboard();
    fetchPeriods();
  }, [token]);

  const fetchMasterData = async () => {
    try {
      const [cashRes, bankRes, custRes, suppRes, prodRes, modeRes] = await Promise.all([
        safeFetchJson('/api/v1/business/cash-accounts', { headers }),
        safeFetchJson('/api/v1/business/bank-accounts', { headers }),
        safeFetchJson('/api/v1/customers?limit=100', { headers }),
        safeFetchJson('/api/v1/suppliers?limit=100', { headers }),
        safeFetchJson('/api/v1/products?limit=100', { headers }),
        safeFetchJson('/api/v1/business/data-mode', { headers })
      ]);

      const extract = (res: any): any[] => {
        if (!res || !res.ok) return [];
        const d = res.data;
        if (Array.isArray(d)) return d;
        if (Array.isArray(d?.data)) return d.data;
        if (Array.isArray(d?.rows)) return d.rows;
        if (d && typeof d === 'object') {
          for (const key of ['customers', 'suppliers', 'products', 'accounts', 'items']) {
            if (Array.isArray(d[key])) return d[key];
            if (Array.isArray(d.data?.[key])) return d.data[key];
          }
        }
        return [];
      };

      setCashAccounts(extract(cashRes));
      setBankAccounts(extract(bankRes));
      setCustomersList(extract(custRes));
      setSuppliersList(extract(suppRes));
      setProductsList(extract(prodRes));
      if (modeRes.ok && modeRes.data) {
        setDataMode(modeRes.data.data?.dataMode || modeRes.data.dataMode || 'PRODUCTION');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await safeFetchJson('/api/v1/business/dashboard', { headers });
      if (res.ok && res.data?.success) {
        setOperatingData(res.data.data);
      } else if (res.error) {
        showFeedback('error', res.error);
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPeriods = async () => {
    try {
      const res = await safeFetchJson('/api/v1/business/periods', { headers });
      if (res.ok && res.data?.success) {
        setPeriods(res.data.data || []);
        if (res.data.data?.length > 0 && !activePeriodId) {
          setActivePeriodId(res.data.data[0].id);
          fetchChecklist(res.data.data[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchChecklist = async (periodId: string) => {
    try {
      const res = await safeFetchJson(`/api/v1/business/month-end-checklist/${periodId}`, { headers });
      if (res.ok && res.data?.success) setChecklist(res.data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReconciliations = async () => {
    try {
      setLoading(true);
      const res = await safeFetchJson('/api/v1/business/reconciliations', { headers });
      if (res.ok && res.data?.success) setReconciliations(res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const runFullReconciliation = async () => {
    try {
      setReconRunning(true);
      const res = await safeFetchJson('/api/v1/business/reconciliations/run', { method: 'POST', headers });
      if (res.ok && res.data?.success) {
        showFeedback('success', `تم الفحص بنجاح: تم تدقيق ${res.data.data?.totalChecks} حركة واكتشاف ${res.data.data?.discrepanciesCount} فارق`);
        fetchReconciliations();
      } else {
        showFeedback('error', res.error || res.data?.message || 'فشل تشغيل المطابقة');
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    } finally {
      setReconRunning(false);
    }
  };

  // Preview Import CSV
  const handlePreviewImport = async () => {
    if (!importCsvText.trim()) {
      showFeedback('error', 'يرجى إدخال أو لصق محتوى ملف البيانات بتنسيق CSV');
      return;
    }

    try {
      setLoading(true);
      const res = await safeFetchJson('/api/v1/business/import/preview', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          entityType: importEntityType,
          fileName: importFileName,
          content: importCsvText,
          idempotencyKey: `IMP-${Date.now()}`
        })
      });

      if (res.ok && res.data?.success) {
        setImportPreview(res.data.data);
        showFeedback('success', `تم تحليل الملف: ${res.data.data.validRows} صف صالح، ${res.data.data.invalidRows} خطأ`);
      } else {
        showFeedback('error', res.error || res.data?.message || 'فشل استعراض الاستيراد');
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    } finally {
      setLoading(false);
    }
  };

  // Commit Import
  const handleCommitImport = async () => {
    if (!importPreview?.jobId) return;

    try {
      setImportCommitting(true);
      const res = await safeFetchJson('/api/v1/business/import/commit', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          jobId: importPreview.jobId
        })
      });

      if (res.ok && res.data?.success) {
        showFeedback('success', `تم اعتماد وترحيل ${res.data.data.importedCount} سجل بنجاح في النظام مع التوازن المحاسبي!`);
        setImportPreview(null);
        setImportCsvText('');
        fetchMasterData();
        fetchDashboard();
      } else {
        showFeedback('error', res.error || res.data?.message || 'فشل ترحيل الاستيراد');
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    } finally {
      setImportCommitting(false);
    }
  };

  // Post Opening Balance
  const handlePostOpeningBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOpBal.amount || parseFloat(newOpBal.amount) <= 0) {
      showFeedback('error', 'المبلغ يجب أن يكون أكبر من الصفر');
      return;
    }

    try {
      setLoading(true);
      const res = await safeFetchJson('/api/v1/business/opening-balances', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          balanceType: newOpBal.balanceType,
          entityType: newOpBal.balanceType === 'CUSTOMER' ? 'CUSTOMERS' : newOpBal.balanceType === 'SUPPLIER' ? 'SUPPLIERS' : 'ACCOUNTS',
          entityId: newOpBal.entityId || undefined,
          amount: parseFloat(newOpBal.amount),
          entrySide: newOpBal.entrySide,
          accountingDate: newOpBal.accountingDate,
          referenceNo: newOpBal.referenceNo,
          notes: newOpBal.notes
        })
      });

      if (res.ok && res.data?.success) {
        showFeedback('success', 'تم ترحيل القيد الافتتاحي وتحديث رصيد الحساب ودفتر الأستاذ العام بنجاح');
        setNewOpBal({
          balanceType: 'CUSTOMER',
          entityId: '',
          amount: '',
          entrySide: 'DEBIT',
          accountingDate: new Date().toISOString().split('T')[0],
          referenceNo: '',
          notes: ''
        });
        fetchMasterData();
        fetchDashboard();
      } else {
        showFeedback('error', res.error || res.data?.message || 'فشل ترحيل الرصيد الافتتاحي');
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    } finally {
      setLoading(false);
    }
  };

  // Record Expense
  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.amount || parseFloat(newExpense.amount) <= 0) {
      showFeedback('error', 'المبلغ يجب أن يكون أكبر من الصفر');
      return;
    }

    try {
      setLoading(true);
      const res = await safeFetchJson('/api/v1/business/expenses', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          category: newExpense.category,
          description: newExpense.description,
          amount: parseFloat(newExpense.amount),
          taxAmount: parseFloat(newExpense.taxAmount || '0'),
          paymentMethod: newExpense.paymentMethod,
          paymentAccountId: newExpense.paymentAccountId || undefined,
          expenseDate: newExpense.expenseDate,
          reference: newExpense.reference,
          notes: newExpense.notes
        })
      });

      if (res.ok && res.data?.success) {
        showFeedback('success', `تم تسجيل المصروف (${res.data.data?.expenseNumber}) وترحيل القيد المحاسبي بنجاح`);
        setNewExpense({
          category: 'إيجار ومرافق',
          description: '',
          amount: '',
          taxAmount: '0',
          paymentMethod: 'CASH',
          paymentAccountId: '',
          expenseDate: new Date().toISOString().split('T')[0],
          reference: '',
          notes: ''
        });
        fetchDashboard();
      } else {
        showFeedback('error', res.error || res.data?.message || 'فشل تسجيل المصروف');
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    } finally {
      setLoading(false);
    }
  };

  // Perform Bank Reconciliation
  const handleBankReconcile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await safeFetchJson('/api/v1/business/reconciliations/bank', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          accountType: bankReconData.accountType,
          accountId: bankReconData.accountId,
          statementStartDate: bankReconData.statementStartDate,
          statementEndDate: bankReconData.statementEndDate,
          statementOpeningBalance: parseFloat(bankReconData.statementOpeningBalance || '0'),
          statementClosingBalance: parseFloat(bankReconData.statementClosingBalance || '0'),
          unpresentedChecks: parseFloat(bankReconData.unpresentedChecks || '0'),
          depositsInTransit: parseFloat(bankReconData.depositsInTransit || '0'),
          bankCharges: parseFloat(bankReconData.bankCharges || '0'),
          interestEarned: parseFloat(bankReconData.interestEarned || '0'),
          notes: bankReconData.notes
        })
      });

      if (res.ok && res.data?.success) {
        setBankReconResult(res.data.data);
        showFeedback('success', 'تمت مطابقة كشف الحساب البنكي وتسجيل التسويات اللازمة بنجاح');
      } else {
        showFeedback('error', res.error || res.data?.message || 'فشل إجراء مطابقة البنك');
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    } finally {
      setLoading(false);
    }
  };

  // Checklist Item Toggle
  const handleToggleChecklist = async (itemId: string, currentVal: boolean) => {
    if (!activePeriodId) return;
    try {
      const res = await safeFetchJson(`/api/v1/business/month-end-checklist/${activePeriodId}/item`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ itemId, completed: !currentVal })
      });

      if (res.ok && res.data?.success) {
        fetchChecklist(activePeriodId);
      } else {
        showFeedback('error', res.error || res.data?.message || 'فشل تحديث القائمة');
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    }
  };

  // Global Search Handler
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    try {
      setLoading(true);
      const res = await safeFetchJson(`/api/v1/business/search?q=${encodeURIComponent(searchQuery)}`, { headers });
      if (res.ok && res.data?.success) setSearchResults(res.data.data);
    } catch (e: any) {
      showFeedback('error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-right text-slate-100 font-sans" dir="rtl">
      {/* Top Banner & Title */}
      <div className="bg-slate-900 border border-emerald-900/40 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-lg shadow-emerald-950/50 shrink-0">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>مركز عمليات الأعمال الحقيقية والبيانات التشغيلية</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                    Operations
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 font-medium">
                  Real Business Operations, Data Migration, Financial Reconciliation & Periods
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-mono">
              <span className={`w-2 h-2 rounded-full ${dataMode === 'PRODUCTION' ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-amber-400'}`} />
              <span className="text-slate-400">وضع البيانات:</span>
              <span className="font-bold text-white">{dataMode === 'PRODUCTION' ? 'إنتاجي حقيقي (PRODUCTION)' : 'تجريبي (DEMO)'}</span>
            </div>

            <button
              onClick={() => {
                fetchDashboard();
                fetchMasterData();
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs transition-all border border-slate-700/80 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
              <span>تحديث</span>
            </button>
          </div>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between transition-all shadow-lg ${
            feedback.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
              : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs opacity-70 hover:opacity-100 cursor-pointer">
            إغلاق
          </button>
        </div>
      )}

      {/* Navigation Subtabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-800">
        {[
          { id: 'dashboard', label: 'لوحة العمليات اليومية', icon: TrendingUp },
          { id: 'import', label: 'محرك الاستيراد الآمن (CSV/Excel)', icon: UploadCloud },
          { id: 'opening_balances', label: 'الأرصدة الافتتاحية', icon: Scale },
          { id: 'reconciliation', label: 'المطابقات والتسويات المالية', icon: ShieldCheck },
          { id: 'expenses', label: 'المصروفات التشغيلية', icon: DollarSign },
          { id: 'returns', label: 'المردودات (مبيعات ومشتريات)', icon: RotateCcw },
          { id: 'period_close', label: 'إغلاق الفترات والشهر', icon: Calendar },
          { id: 'documents', label: 'خزينة المستندات', icon: FileCheck },
          { id: 'search_mode', label: 'البحث الشامل ووضع البيانات', icon: Search }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveSubTab(tab.id as SubTab);
                if (tab.id === 'reconciliation') fetchReconciliations();
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-950/60 border border-emerald-500/40'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 1. SUBTAB: REAL OPERATING DASHBOARD */}
      {/* ========================================================================= */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Today Sales */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>مبيعات اليوم</span>
                <ArrowUpRight className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-xl font-bold text-slate-900 font-mono">
                {formatAmount(operatingData?.todaySales)}{' '}
                <span className="text-xs font-normal text-slate-500">ر.س</span>
              </div>
            </div>

            {/* Today Collections */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>تحصيلات وسندات قبض اليوم</span>
                <Wallet className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-xl font-bold text-slate-900 font-mono">
                {formatAmount(operatingData?.todayCollections)}{' '}
                <span className="text-xs font-normal text-slate-500">ر.س</span>
              </div>
            </div>

            {/* Today Purchases */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>مشتريات اليوم</span>
                <ArrowDownLeft className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-xl font-bold text-slate-900 font-mono">
                {formatAmount(operatingData?.todayPurchases)}{' '}
                <span className="text-xs font-normal text-slate-500">ر.س</span>
              </div>
            </div>

            {/* Today Payments & Expenses */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>مدفوعات ومصروفات اليوم</span>
                <DollarSign className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-xl font-bold text-slate-900 font-mono">
                {formatAmount((operatingData?.todayPayments || 0) + (operatingData?.todayExpenses || 0))}{' '}
                <span className="text-xs font-normal text-slate-500">ر.س</span>
              </div>
            </div>

            {/* Cash Balance */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>رصيد الصندوق النقدي</span>
                <Wallet className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xl font-bold text-emerald-700 font-mono">
                {formatAmount(operatingData?.cashBalance)}{' '}
                <span className="text-xs font-normal text-slate-500">ر.س</span>
              </div>
            </div>

            {/* Bank Balance */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>أرصدة الحسابات البنكية</span>
                <Landmark className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-xl font-bold text-blue-700 font-mono">
                {formatAmount(operatingData?.bankBalance)}{' '}
                <span className="text-xs font-normal text-slate-500">ر.س</span>
              </div>
            </div>

            {/* Receivables (Customer Balances) */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>ذمم العملاء المدينة (Receivables)</span>
                <Building2 className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="text-xl font-bold text-slate-900 font-mono">
                {formatAmount(operatingData?.receivables)}{' '}
                <span className="text-xs font-normal text-slate-500">ر.س</span>
              </div>
            </div>

            {/* Payables (Supplier Balances) */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>مستحقات الموردين الدائنة (Payables)</span>
                <Building2 className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-xl font-bold text-slate-900 font-mono">
                {formatAmount(operatingData?.payables)}{' '}
                <span className="text-xs font-normal text-slate-500">ر.س</span>
              </div>
            </div>

            {/* Inventory Valuation */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>تقييم المخزون الحالي</span>
                <Boxes className="w-4 h-4 text-slate-600" />
              </div>
              <div className="text-xl font-bold text-slate-900 font-mono">
                {formatAmount(operatingData?.inventoryValuation)}{' '}
                <span className="text-xs font-normal text-slate-500">ر.س</span>
              </div>
            </div>

            {/* Net Cashflow Today */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>صافي التدفق النقدي اليوم</span>
                <TrendingUp className="w-4 h-4 text-purple-500" />
              </div>
              <div className={`text-xl font-bold font-mono ${operatingData?.netCashFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatAmount(operatingData?.netCashFlow)}{' '}
                <span className="text-xs font-normal text-slate-500">ر.س</span>
              </div>
            </div>

            {/* Low Stock Items */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>أصناف وصلت للحد الأدنى</span>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-xl font-bold text-amber-600 font-mono">
                {formatNumber(operatingData?.lowStockCount || 0)} <span className="text-xs font-normal text-slate-500">أصناف</span>
              </div>
            </div>

            {/* Reconciliation Issues */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>فروقات التسويات العالقة</span>
                <Scale className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-xl font-bold text-rose-600 font-mono">
                {operatingData?.openReconciliationIssues || 0} <span className="text-xs font-normal text-slate-500">فروقات</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SUBTAB: SAFE IMPORT ENGINE */}
      {/* ========================================================================= */}
      {activeSubTab === 'import' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">محرك استيراد ونقل البيانات المؤسسي الآمن</h2>
              <p className="text-xs text-slate-500">استيراد جماعي مع التدقيق الصارم والتراجع التلقائي عند أي خطأ مالي</p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">نوع الكيان:</span>
              <select
                value={importEntityType}
                onChange={(e) => {
                  setImportEntityType(e.target.value);
                  setImportPreview(null);
                }}
                className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-slate-50 font-medium"
              >
                <option value="CUSTOMERS">العملاء (Customers)</option>
                <option value="SUPPLIERS">الموردين (Suppliers)</option>
                <option value="PRODUCTS">المنتجات وبضاعة أول المدة (Products)</option>
                <option value="CUSTOMER_BALANCES">الأرصدة الافتتاحية للعملاء</option>
                <option value="SUPPLIER_BALANCES">الأرصدة الافتتاحية للموردين</option>
              </select>
            </div>
          </div>

          {/* Sample CSV Template Hints */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
            <div className="flex items-center justify-between font-semibold text-slate-700">
              <span className="flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                <span>نموذج الترويسة المطلوب لـ ({importEntityType}):</span>
              </span>
              <button
                onClick={() => {
                  if (importEntityType === 'CUSTOMERS') {
                    setImportCsvText(`name,phone,email,address,opening_balance\nشركة الأمل للتجارة,0501234567,info@alamal.com,الرياض,5000\nمؤسسة النور,0559876543,sales@alnoor.com,جدة,12500`);
                  } else if (importEntityType === 'SUPPLIERS') {
                    setImportCsvText(`name,phone,email,address,opening_balance\nمورد الأجهزة الحديثة,0112345678,supp@tech.com,الدمام,8000\nمصنع البلاستيك الوطني,0123456789,order@factory.com,الرياض,25000`);
                  } else if (importEntityType === 'PRODUCTS') {
                    setImportCsvText(`name,sku,barcode,category,unit,purchase_price,selling_price,current_stock\nلابتوب ديل للأعمال,SKU-DELL-01,62810001,أجهزة,حبة,3200,4100,10\nطابعة ليزرية كانون,SKU-CAN-02,62810002,طابعات,حبة,850,1150,5`);
                  }
                }}
                className="text-blue-600 hover:text-blue-700 font-bold"
              >
                تحميل نموذج تجريبي
              </button>
            </div>
            <p className="text-[11px] text-slate-500 font-mono dir-ltr text-left">
              {importEntityType === 'CUSTOMERS' && 'name, phone, email, address, opening_balance'}
              {importEntityType === 'SUPPLIERS' && 'name, phone, email, address, opening_balance'}
              {importEntityType === 'PRODUCTS' && 'name, sku, barcode, category, unit, purchase_price, selling_price, current_stock'}
            </p>
          </div>

          {/* Textarea for CSV */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">محتوى ملف CSV (الصق البيانات هنا أو ارفع الملف):</label>
            <textarea
              rows={6}
              value={importCsvText}
              onChange={(e) => setImportCsvText(e.target.value)}
              placeholder="name,phone,opening_balance..."
              className="w-full text-xs font-mono p-3 border border-slate-300 rounded-xl bg-slate-900 text-slate-100 dir-ltr"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePreviewImport}
              disabled={loading || !importCsvText.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl disabled:opacity-50 transition-all shadow-sm"
            >
              <Search className="w-4 h-4" />
              <span>فحص وتدقيق البيانات (Validation & Preview)</span>
            </button>

            {importPreview && (
              <button
                onClick={handleCommitImport}
                disabled={importCommitting || importPreview.validRows === 0}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl disabled:opacity-50 transition-all shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{importCommitting ? 'جاري الاعتماد والترحيل...' : `اعتماد وترحيل (${importPreview.validRows}) سجل في النظام`}</span>
              </button>
            )}
          </div>

          {/* Preview Results Panel */}
          {importPreview && (
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block">إجمالي الصفوف:</span>
                  <span className="text-base font-bold font-mono text-slate-900">{importPreview.totalRows}</span>
                </div>
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                  <span className="text-emerald-700 block">الصفوف الصالحة:</span>
                  <span className="text-base font-bold font-mono text-emerald-800">{importPreview.validRows}</span>
                </div>
                <div className="bg-rose-50 p-3 rounded-lg border border-rose-200">
                  <span className="text-rose-700 block">صفوف بها أخطاء:</span>
                  <span className="text-base font-bold font-mono text-rose-800">{importPreview.invalidRows}</span>
                </div>
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                  <span className="text-amber-700 block">المبالغ المالية المستوردة:</span>
                  <span className="text-base font-bold font-mono text-amber-800">{importPreview.financialTotal} ر.س</span>
                </div>
              </div>

              {/* Errors List if any */}
              {importPreview.errors?.length > 0 && (
                <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 space-y-2">
                  <h4 className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>سجل أخطاء التدقيق الصارم:</span>
                  </h4>
                  <ul className="text-xs text-rose-700 space-y-1">
                    {importPreview.errors.map((err: any, idx: number) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="font-mono bg-rose-200 px-1.5 py-0.5 rounded text-[10px]">سطر {err.row}</span>
                        <span className="font-semibold">[{err.field}]:</span>
                        <span>{err.message}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SUBTAB: OPENING BALANCES */}
      {/* ========================================================================= */}
      {activeSubTab === 'opening_balances' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Post Opening Balance Form */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Scale className="w-4 h-4 text-blue-600" />
              <span>تسجيل رصيد افتتاحي معتمد</span>
            </h2>
            <p className="text-xs text-slate-500">يتم إنشاء قيد مزدوج متوازن تلقائياً وإقفال الفارق بحساب الأرصدة الافتتاحية</p>

            <form onSubmit={handlePostOpeningBalance} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">نوع الحساب:</label>
                <select
                  value={newOpBal.balanceType}
                  onChange={(e) => setNewOpBal({ ...newOpBal, balanceType: e.target.value, entityId: '' })}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50"
                >
                  <option value="CUSTOMER">عميل (Accounts Receivable)</option>
                  <option value="SUPPLIER">مورد (Accounts Payable)</option>
                  <option value="CASH">صندوق نقدي (Cash Account)</option>
                  <option value="BANK">حساب بنكي (Bank Account)</option>
                  <option value="INVENTORY">بضاعة أول المدة (Inventory)</option>
                </select>
              </div>

              {/* Target Entity Selector */}
              {newOpBal.balanceType === 'CUSTOMER' && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">العميل المستهدف:</label>
                  <select
                    value={newOpBal.entityId}
                    onChange={(e) => setNewOpBal({ ...newOpBal, entityId: e.target.value })}
                    required
                    className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50"
                  >
                    <option value="">-- اختر العميل --</option>
                    {(customersList || []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (الرصيد: {c.current_balance} ر.س)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {newOpBal.balanceType === 'SUPPLIER' && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">المورد المستهدف:</label>
                  <select
                    value={newOpBal.entityId}
                    onChange={(e) => setNewOpBal({ ...newOpBal, entityId: e.target.value })}
                    required
                    className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50"
                  >
                    <option value="">-- اختر المورد --</option>
                    {(suppliersList || []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (الرصيد: {s.current_balance} ر.س)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {newOpBal.balanceType === 'CASH' && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">الصندوق المستهدف:</label>
                  <select
                    value={newOpBal.entityId}
                    onChange={(e) => setNewOpBal({ ...newOpBal, entityId: e.target.value })}
                    required
                    className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50"
                  >
                    <option value="">-- اختر الصندوق النقدي --</option>
                    {cashAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} (الرصيد: {a.current_balance} ر.س)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {newOpBal.balanceType === 'BANK' && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">الحساب البنكي:</label>
                  <select
                    value={newOpBal.entityId}
                    onChange={(e) => setNewOpBal({ ...newOpBal, entityId: e.target.value })}
                    required
                    className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50"
                  >
                    <option value="">-- اختر الحساب البنكي --</option>
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.account_name} - {b.bank_name} ({b.current_balance} ر.س)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {newOpBal.balanceType === 'INVENTORY' && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">المنتج / الصنف:</label>
                  <select
                    value={newOpBal.entityId}
                    onChange={(e) => setNewOpBal({ ...newOpBal, entityId: e.target.value })}
                    required
                    className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50"
                  >
                    <option value="">-- اختر المنتج --</option>
                    {(productsList || []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (المخزون: {p.current_stock})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">المبلغ (SAR):</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newOpBal.amount}
                    onChange={(e) => setNewOpBal({ ...newOpBal, amount: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">طبيعة القيد:</label>
                  <select
                    value={newOpBal.entrySide}
                    onChange={(e) => setNewOpBal({ ...newOpBal, entrySide: e.target.value as any })}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50"
                  >
                    <option value="DEBIT">مدين (Debit)</option>
                    <option value="CREDIT">دائن (Credit)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">تاريخ القيد الافتتاحي:</label>
                <input
                  type="date"
                  required
                  value={newOpBal.accountingDate}
                  onChange={(e) => setNewOpBal({ ...newOpBal, accountingDate: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">البيان والملاحظات:</label>
                <input
                  type="text"
                  value={newOpBal.notes}
                  onChange={(e) => setNewOpBal({ ...newOpBal, notes: e.target.value })}
                  placeholder="رصيد افتتاحي معتمد..."
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl disabled:opacity-50 transition-all shadow-sm"
              >
                ترحيل القيد الافتتاحي
              </button>
            </form>
          </div>

          {/* Opening Balances List & Status */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900">سجل الأرصدة الافتتاحية المرحلة</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">النوع</th>
                    <th className="p-2.5">المبلغ</th>
                    <th className="p-2.5">الجانب</th>
                    <th className="p-2.5">التاريخ</th>
                    <th className="p-2.5">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {openingBalances.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-slate-400">
                        لا توجد أرصدة افتتاحية مسجلة حتى الآن
                      </td>
                    </tr>
                  ) : (
                    openingBalances.map((ob) => (
                      <tr key={ob.id}>
                        <td className="p-2.5 font-medium">{ob.balance_type}</td>
                        <td className="p-2.5 font-mono font-bold">{ob.amount} ر.س</td>
                        <td className="p-2.5 font-mono">{ob.entry_side}</td>
                        <td className="p-2.5 font-mono">{ob.accounting_date}</td>
                        <td className="p-2.5">
                          <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">
                            {ob.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SUBTAB: RECONCILIATION & AUDIT CHECKS */}
      {/* ========================================================================= */}
      {activeSubTab === 'reconciliation' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  <span>محرك المطابقات والتسويات المالية الشاملة</span>
                </h2>
                <p className="text-xs text-slate-500">
                  تدقيق آلي للأرصدة (العملاء vs الأستاذ، الموردين vs الأستاذ، المخزون، الفواتير vs التحصيلات، توازن الأستاذ العام)
                </p>
              </div>

              <button
                onClick={runFullReconciliation}
                disabled={reconRunning}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
              >
                <RefreshCw className={`w-4 h-4 ${reconRunning ? 'animate-spin' : ''}`} />
                <span>{reconRunning ? 'جاري فحص وتدقيق القيود...' : 'تشغيل فحص المطابقة والتدقيق الآن'}</span>
              </button>
            </div>

            {/* Discrepancies Table */}
            <div className="overflow-x-auto pt-2">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">الكيان / الحساب</th>
                    <th className="p-2.5">القيمة المتوقعة</th>
                    <th className="p-2.5">القيمة الفعلية</th>
                    <th className="p-2.5">الفارق</th>
                    <th className="p-2.5">الخطورة</th>
                    <th className="p-2.5">التفاصيل</th>
                    <th className="p-2.5">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reconciliations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-emerald-600 font-semibold">
                        ✓ جميع الحركات والأرصدة المحاسبية متطابقة تماماً بنسبة 100% ولا توجد أي فروقات عالقة
                      </td>
                    </tr>
                  ) : (
                    reconciliations.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold">{rec.entity_type}</td>
                        <td className="p-2.5 font-mono">{rec.expected_value}</td>
                        <td className="p-2.5 font-mono">{rec.actual_value}</td>
                        <td className="p-2.5 font-mono font-bold text-rose-600">{rec.difference}</td>
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              rec.severity === 'CRITICAL'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {rec.severity}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-600 max-w-xs truncate">
                          {typeof rec.details === 'object' && rec.details !== null
                            ? rec.details.message || rec.details.description || JSON.stringify(rec.details)
                            : String(rec.details || '—')}
                        </td>
                        <td className="p-2.5">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px]">
                            {rec.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cash & Bank Statement Reconciliation Module */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Landmark className="w-4 h-4 text-indigo-600" />
              <span>مطابقة كشف الحساب البنكي / الصندوق (Bank & Cash Statement Reconciliation)</span>
            </h3>

            <form onSubmit={handleBankReconcile} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">الحساب البنكي:</label>
                <select
                  value={bankReconData.accountId}
                  onChange={(e) => setBankReconData({ ...bankReconData, accountId: e.target.value })}
                  required
                  className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50"
                >
                  <option value="">-- اختر الحساب البنكي --</option>
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.account_name} - {b.bank_name} (الرصيد الدفتري: {b.current_balance} ر.س)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">رصيد كشف الحساب الفعلي بالبنك (Closing Balance):</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={bankReconData.statementClosingBalance}
                  onChange={(e) => setBankReconData({ ...bankReconData, statementClosingBalance: e.target.value })}
                  placeholder="0.00"
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">شيكات صادرة لم تصرف بعد (Unpresented):</label>
                <input
                  type="number"
                  step="0.01"
                  value={bankReconData.unpresentedChecks}
                  onChange={(e) => setBankReconData({ ...bankReconData, unpresentedChecks: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">إيداعات قيد التحصيل (Deposits in Transit):</label>
                <input
                  type="number"
                  step="0.01"
                  value={bankReconData.depositsInTransit}
                  onChange={(e) => setBankReconData({ ...bankReconData, depositsInTransit: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">رسوم ومصاريف بنكية مقتطعة:</label>
                <input
                  type="number"
                  step="0.01"
                  value={bankReconData.bankCharges}
                  onChange={(e) => setBankReconData({ ...bankReconData, bankCharges: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">أرباح / فوائد دائنة مستحقة:</label>
                <input
                  type="number"
                  step="0.01"
                  value={bankReconData.interestEarned}
                  onChange={(e) => setBankReconData({ ...bankReconData, interestEarned: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div className="md:col-span-3">
                <button
                  type="submit"
                  disabled={loading || !bankReconData.accountId}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-sm"
                >
                  تنفيذ مطابقة كشف الحساب
                </button>
              </div>
            </form>

            {bankReconResult && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mt-4 text-xs space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                  <div>
                    <span className="text-slate-500 block">الرصيد الدفتري:</span>
                    <span className="font-bold text-slate-900">{bankReconResult.bookBalance} ر.س</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">رصيد كشف الحساب:</span>
                    <span className="font-bold text-slate-900">{bankReconResult.statementClosingBalance} ر.س</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">الفارق بعد التسوية:</span>
                    <span className={`font-bold ${bankReconResult.status === 'MATCHED' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {bankReconResult.difference} ر.س
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">نتيجة المطابقة:</span>
                    <span className={`font-bold ${bankReconResult.status === 'MATCHED' ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {bankReconResult.status === 'MATCHED' ? '✓ متطابق تماماً' : '⚠ يوجد فارق معلق'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. SUBTAB: OPERATIONAL EXPENSES */}
      {/* ========================================================================= */}
      {activeSubTab === 'expenses' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-blue-600" />
              <span>تسجيل مصروف تشغيلي</span>
            </h2>
            <p className="text-xs text-slate-500">تسجيل المصروف وترحيل القيد المزدوج وخصم المبلغ من الصندوق أو البنك</p>

            <form onSubmit={handleRecordExpense} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">تصنيف المصروف:</label>
                <select
                  value={newExpense.category}
                  onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50"
                >
                  <option value="إيجار ومرافق">إيجار ومرافق</option>
                  <option value="رواتب وأجور">رواتب وأجور</option>
                  <option value="صيانة وتشغيل">صيانة وتشغيل</option>
                  <option value="دعاية وتسويق">دعاية وتسويق</option>
                  <option value="نقل وضيافة">نقل وضيافة</option>
                  <option value="رسوم حكومية ورخص">رسوم حكومية ورخص</option>
                  <option value="مصاريف أخرى">مصاريف أخرى</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">وصف المصروف:</label>
                <input
                  type="text"
                  required
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  placeholder="وصف تفصيلي للمصروف..."
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">المبلغ الأساسي:</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">ضريبة القيمة المضافة:</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newExpense.taxAmount}
                    onChange={(e) => setNewExpense({ ...newExpense, taxAmount: e.target.value })}
                    placeholder="0.00"
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">طريقة السداد:</label>
                  <select
                    value={newExpense.paymentMethod}
                    onChange={(e) => setNewExpense({ ...newExpense, paymentMethod: e.target.value as any })}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50"
                  >
                    <option value="CASH">نقداً من الصندوق</option>
                    <option value="BANK">تحويل بنكي</option>
                    <option value="CARD">بطاقة مدى / ائتمان</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">تاريخ الصرف:</label>
                  <input
                    type="date"
                    required
                    value={newExpense.expenseDate}
                    onChange={(e) => setNewExpense({ ...newExpense, expenseDate: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {newExpense.paymentMethod === 'BANK' && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">خصم من الحساب البنكي:</label>
                  <select
                    value={newExpense.paymentAccountId}
                    onChange={(e) => setNewExpense({ ...newExpense, paymentAccountId: e.target.value })}
                    required
                    className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50"
                  >
                    <option value="">-- اختر الحساب البنكي --</option>
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.account_name} ({b.current_balance} ر.س)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {newExpense.paymentMethod === 'CASH' && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">خصم من الصندوق النقدي:</label>
                  <select
                    value={newExpense.paymentAccountId}
                    onChange={(e) => setNewExpense({ ...newExpense, paymentAccountId: e.target.value })}
                    required
                    className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50"
                  >
                    <option value="">-- اختر الصندوق --</option>
                    {cashAccounts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.current_balance} ر.س)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-sm"
              >
                تسجيل وصرف المصروف
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900">سجل المصروفات التشغيلية</h3>
            <p className="text-xs text-slate-500">سجل المصروفات المعتمدة وقيود الصرف المرتبطة</p>
            <div className="p-8 text-center text-slate-400 text-xs">
              جميع المصروفات يتم ترحيلها فورياً إلى دفتر الأستاذ العام وتنعكس في تقرير الأرباح والخسائر والتدفق النقدي.
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. SUBTAB: RETURNS & REVERSALS */}
      {/* ========================================================================= */}
      {activeSubTab === 'returns' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-blue-600" />
              <span>إدارة مردودات المبيعات والمشتريات (إشعارات دائنة ومدين)</span>
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            تسجيل مردودات المبيعات والمشتريات مع إعادة البضاعة للمخزون آلياً وعكس القيود المالية
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            {/* Sales Return Card */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <ArrowUpRight className="w-4 h-4 text-blue-600" />
                <span>تسجيل مردودات مبيعات (إشعار دائن للعميل)</span>
              </h3>
              <p className="text-[11px] text-slate-500">إرجاع البضاعة لمخزون المستودع وتخفيض مديونية العميل</p>
            </div>

            {/* Purchase Return Card */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <ArrowDownLeft className="w-4 h-4 text-amber-600" />
                <span>تسجيل مردودات مشتريات (إشعار مدين للمورد)</span>
              </h3>
              <p className="text-[11px] text-slate-500">خصم البضاعة من المستودع وتخفيض مستحقات المورد</p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. SUBTAB: ACCOUNTING PERIOD & MONTH-END CLOSE */}
      {/* ========================================================================= */}
      {activeSubTab === 'period_close' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Periods List */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>الفترات المحاسبية (Accounting Periods)</span>
            </h2>

            <div className="space-y-2">
              {periods.map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    setActivePeriodId(p.id);
                    fetchChecklist(p.id);
                  }}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    activePeriodId === p.id
                      ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{p.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        p.status === 'CLOSED' ? 'bg-slate-200 text-slate-800' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {p.status === 'CLOSED' ? 'مغلقة' : 'مفتوحة'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 font-mono">
                    {p.start_date} إلى {p.end_date}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Month-End Close 12-Step Checklist */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">قائمة فحص واعتماد الإقفال الشهري (12 خطوة)</h3>
                <p className="text-xs text-slate-500">إجراءات المراجعة الدقيقة لضمان صحة القوائم المالية قبل إغلاق الفترة</p>
              </div>

              {checklist && (
                <div className="text-left font-mono">
                  <span className="text-xs text-slate-500 block">نسبة الإنجاز:</span>
                  <span className="text-base font-bold text-blue-600">{checklist.completion_percentage}%</span>
                </div>
              )}
            </div>

            {/* Checklist Items */}
            <div className="space-y-2">
              {checklist?.checklist_items &&
                (typeof checklist.checklist_items === 'string'
                  ? JSON.parse(checklist.checklist_items)
                  : checklist.checklist_items
                ).map((it: any) => (
                  <div
                    key={it.id}
                    onClick={() => handleToggleChecklist(it.id, it.completed)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all text-xs ${
                      it.completed
                        ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900 line-through opacity-80'
                        : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={it.completed}
                        onChange={() => {}}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="font-medium">{it.title}</span>
                    </div>

                    <span className="text-[10px] text-slate-400 font-mono">خطوة #{it.id}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. SUBTAB: DOCUMENT VAULT */}
      {/* ========================================================================= */}
      {activeSubTab === 'documents' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-blue-600" />
            <span>خزينة المستندات والمرفقات الرسمية (Business Documents Vault)</span>
          </h2>
          <p className="text-xs text-slate-500">
            حفظ وأرشفة العقود، السجلات التجارية، الشهادات الضريبية، وسندات التسليم بحد أقصى 10 ميجابايت مع العزل التام
          </p>

          <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-300 rounded-xl">
            ارفع المستندات أو اربطها بالفواتير وسندات القبض والمصروفات للتوثيق المحاسبي والتدقيق الضريبي.
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. SUBTAB: GLOBAL SEARCH & DATA MODE */}
      {/* ========================================================================= */}
      {activeSubTab === 'search_mode' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-600" />
              <span>البحث الشامل في سجلات الشركة (Global Multi-Entity Search)</span>
            </h2>

            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالاسم، رقم الفاتورة، الباركود، رقم الهاتف، السند..."
                className="flex-1 text-xs p-2.5 border border-slate-300 rounded-xl"
              />
              <button
                type="submit"
                disabled={loading || !searchQuery.trim()}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm"
              >
                بحث
              </button>
            </form>

            {searchResults && (
              <div className="space-y-4 pt-4 text-xs">
                {/* Customers */}
                {searchResults.customers?.length > 0 && (
                  <div>
                    <h4 className="font-bold text-slate-800 mb-1">العملاء المطابقون ({searchResults.customers.length}):</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {searchResults.customers.map((c: any) => (
                        <div key={c.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="font-bold">{c.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">الرصيد: {c.current_balance} ر.س</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Products */}
                {searchResults.products?.length > 0 && (
                  <div>
                    <h4 className="font-bold text-slate-800 mb-1">المنتجات المطابقة ({searchResults.products.length}):</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {searchResults.products.map((p: any) => (
                        <div key={p.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="font-bold">{p.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">المخزون: {p.current_stock} | السعر: {p.selling_price} ر.س</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
