import React, { useState, useEffect } from 'react';
import { safeFetchJson } from '../../lib/safeFetch';
import {
  ShieldCheck,
  Server,
  Database,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCheck,
  RefreshCw,
  Lock,
  ArrowRight,
  Upload,
  Layers,
  Scale,
  Activity,
  Users,
  Building2,
  FileText,
  DollarSign,
  Package,
  Play,
  RotateCcw,
  Zap,
  Info,
  Trash2,
} from 'lucide-react';

interface ReadinessData {
  overallReadiness: 'READY' | 'NOT_READY' | 'BLOCKED';
  databaseVerified: boolean;
  migrationsVerified: boolean;
  backupVerified: boolean;
  tenantCreated: boolean;
  adminCreated: boolean;
  securityVerified: boolean;
  reconciliationVerified: boolean;
  doubleEntryBalanced: boolean;
  readinessScorePercent: number;
  summary: {
    environment: string;
    schemaVersion: string;
    appliedMigrationsCount: number;
    companyId?: string;
    onboardingState?: string;
    ledgerBalanceDifference: number;
  };
  reconciliation: {
    customersCount: number;
    customerOpeningBalanceTotal: number;
    suppliersCount: number;
    supplierOpeningBalanceTotal: number;
    productsCount: number;
    stockUnitsTotal: number;
    invoicesCount: number;
    invoicesAmountTotal: number;
    paymentsCount: number;
    paymentsAmountTotal: number;
    ledgerDebitTotal: number;
    ledgerCreditTotal: number;
    ledgerDifference: number;
    isBalanced: boolean;
  };
  blockers: string[];
}

export const ProductionDataInitializationTab: React.FC<{ companyId?: string }> = ({ companyId }) => {
  const [readiness, setReadiness] = useState<ReadinessData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Tenant Onboarding Form
  const [tenantName, setTenantName] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');
  const [tenantTaxNo, setTenantTaxNo] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Import State
  const [importDomain, setImportDomain] = useState<'CUSTOMERS' | 'SUPPLIERS' | 'PRODUCTS'>('CUSTOMERS');
  const [importRawJson, setImportRawJson] = useState(`[
  {"name": "شركة الروابي للتجارة", "phone": "+966501112233", "email": "info@rawabi.sa", "opening_balance": 1500.00},
  {"name": "مؤسسة الأفق التقني", "phone": "+966504445566", "email": "contact@ofok.sa", "opening_balance": 0.00}
]`);
  const [importPreview, setImportPreview] = useState<any | null>(null);

  // Test Transaction State
  const [testProbeResult, setTestProbeResult] = useState<any | null>(null);

  const fetchReadiness = async () => {
    setLoading(true);
    try {
      const url = companyId
        ? `/api/v1/system/production-data-readiness?companyId=${companyId}`
        : `/api/v1/system/production-data-readiness`;
      const res = await safeFetchJson(url);
      if (res.ok && res.data?.success) {
        setReadiness(res.data.data);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'فشل تحميل بيانات جاهزية بيئة الإنتاج' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReadiness();
  }, [companyId]);

  // Handle Pre-Production Backup
  const handlePreBackup = async () => {
    if (!readiness?.summary.companyId) {
      setFeedback({ type: 'error', message: 'لا توجد منشأة محددة لإنشاء النسخة الاحتياطية' });
      return;
    }
    setActionLoading('backup');
    try {
      const res = await safeFetchJson('/api/v1/production-onboarding/pre-backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: readiness.summary.companyId }),
      });
      if (res.ok && res.data?.success) {
        setFeedback({
          type: 'success',
          message: `تم إنشاء النسخة الاحتياطية بنجاح وتوثيق البصمة المشفرة SHA-256 (${res.data.data.checksum.substring(0, 16)}...)`,
        });
        await fetchReadiness();
      } else {
        setFeedback({ type: 'error', message: res.error || res.data?.error || 'فشل إنشاء النسخة الاحتياطية' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'حدث خطأ أثناء إنشاء النسخة الاحتياطية' });
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Tenant Creation
  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantName || !tenantEmail || !adminName || !adminPassword) {
      setFeedback({ type: 'error', message: 'يرجى إكمال جميع الحقول الإلزامية للمنشأة والمسؤول' });
      return;
    }
    setActionLoading('tenant');
    try {
      // 1. Create Tenant
      const tRes = await safeFetchJson('/api/v1/production-onboarding/tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tenantName,
          email: tenantEmail,
          taxNumber: tenantTaxNo,
          country: 'SA',
          currency: 'SAR',
        }),
      });
      if (!tRes.ok || !tRes.data?.success) throw new Error(tRes.error || tRes.data?.error || 'فشل إنشاء المنشأة');

      const newCompId = tRes.data.data.companyId;

      // 2. Create Admin
      const aRes = await safeFetchJson('/api/v1/production-onboarding/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: newCompId,
          fullName: adminName,
          email: tenantEmail,
          password: adminPassword,
        }),
      });
      if (!aRes.ok || !aRes.data?.success) throw new Error(aRes.error || aRes.data?.error || 'فشل تعيين المسؤول');

      // 3. Verify Security
      await safeFetchJson('/api/v1/production-onboarding/verify-security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: newCompId }),
      });

      setFeedback({
        type: 'success',
        message: `تم تأسيس منشأة الإنتاج (${tenantName}) وتعيين المسؤول الأول وتفعيل الجاهزية بنجاح!`,
      });
      await fetchReadiness();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'فشل تأسيس منشأة الإنتاج' });
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Import Preview
  const handleImportPreview = async () => {
    const targetComp = readiness?.summary.companyId || companyId;
    if (!targetComp) {
      setFeedback({ type: 'error', message: 'يرجى اختيار المنشأة أولاً' });
      return;
    }
    let parsed: any[];
    try {
      parsed = JSON.parse(importRawJson);
      if (!Array.isArray(parsed)) throw new Error('يجب أن تكون البيانات مصفوفة كائنات JSON');
    } catch (e: any) {
      setFeedback({ type: 'error', message: `خطأ في صياغة JSON: ${e.message}` });
      return;
    }

    setActionLoading('preview');
    try {
      const res = await safeFetchJson('/api/v1/production-onboarding/import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: targetComp,
          domain: importDomain,
          fileName: `import_${importDomain.toLowerCase()}.json`,
          rawRecords: parsed,
        }),
      });
      if (res.ok && res.data?.success) {
        setImportPreview(res.data.data);
        setFeedback({
          type: 'info',
          message: `تم التحقق التجريبي (Dry Run): ${res.data.data.validRecords} سجل صالح، ${res.data.data.warningRecords} تحذيرات، ${res.data.data.errorRecords} أخطاء.`,
        });
      } else {
        setFeedback({ type: 'error', message: res.error || res.data?.error || 'فشل فحص بيانات الاستيراد' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'فشل فحص بيانات الاستيراد' });
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Import Commit
  const handleImportCommit = async () => {
    if (!importPreview) return;
    const targetComp = readiness?.summary.companyId || companyId;
    setActionLoading('commit');
    try {
      const res = await safeFetchJson('/api/v1/production-onboarding/import/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: targetComp,
          importId: importPreview.importId,
          domain: importPreview.domain,
          records: importPreview.records,
        }),
      });
      if (res.ok && res.data?.success) {
        setFeedback({
          type: 'success',
          message: `تم ترحيل البيانات بنجاح: تم إنشاء ${res.data.data.totalImported} سجل، وإجمالي القيد المزدوج متطابق: ${res.data.data.isBalanced ? 'نعم (Debit = Credit)' : 'لا'}`,
        });
        setImportPreview(null);
        await fetchReadiness();
      } else {
        setFeedback({ type: 'error', message: res.error || res.data?.error || 'فشل تثبيت بيانات الاستيراد' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'فشل تثبيت بيانات الاستيراد' });
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Test Probe Transaction
  const handleExecuteProbe = async () => {
    const targetComp = readiness?.summary.companyId || companyId;
    if (!targetComp) return;
    setActionLoading('probe');
    try {
      const res = await safeFetchJson('/api/v1/production-onboarding/test-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: targetComp }),
      });
      if (res.ok && res.data?.success) {
        setTestProbeResult(res.data.data);
        setFeedback({
          type: 'success',
          message: `تم تنفيذ معاملة الفحص التشغيلي التجريبية بنجاح. ميزان القيد المزدوج متوازن (${res.data.data.debitTotal} = ${res.data.data.creditTotal})`,
        });
        await fetchReadiness();
      } else {
        setFeedback({ type: 'error', message: res.error || res.data?.error || 'فشل تنفيذ معاملة الفحص التجريبية' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'فشل تنفيذ معاملة الفحص التجريبية' });
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Reverse Probe
  const handleReverseProbe = async () => {
    if (!testProbeResult?.invoiceId) return;
    const targetComp = readiness?.summary.companyId || companyId;
    setActionLoading('reverse');
    try {
      const res = await safeFetchJson('/api/v1/production-onboarding/test-transaction/reverse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: targetComp, invoiceId: testProbeResult.invoiceId }),
      });
      if (res.ok && res.data?.success) {
        setFeedback({
          type: 'success',
          message: 'تم عكس قيد المعاملة التجريبية محاسبياً بنجاح دون المساس بسلامة السجل التاريخي.',
        });
        setTestProbeResult(null);
        await fetchReadiness();
      } else {
        setFeedback({ type: 'error', message: res.error || res.data?.error || 'فشل عكس قيد المعاملة التجريبية' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'فشل عكس قيد المعاملة التجريبية' });
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Clean Sandbox / Sample Data
  const handleCleanupSampleData = async () => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف وتصفير كافة البيانات التجريبية (المنتجات، الحركات، الفواتير، الدفعات النموذجية) لبدء إدخال بياناتك الواقعية؟')) return;
    setActionLoading('cleanup');
    try {
      const res = await safeFetchJson('/api/v1/saas/sample-data/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok && res.data?.success) {
        const sampleStorageKeys = [
          'erp_pos_held_sales',
          'erp_custom_ledger_entries',
          'erp_fuel_tanks_state',
          'erp_fuel_daily_records',
          'erp_sales_reps_v1',
          'erp_battery_warranty_records',
          'erp_tire_dot_records',
          'erp_pos_shift_history',
        ];
        sampleStorageKeys.forEach((key) => {
          try { localStorage.removeItem(key); } catch {}
        });
        localStorage.setItem('erp_sample_data_cleaned', 'true');
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('erp:data-cleared'));

        setFeedback({
          type: 'success',
          message: 'تم تصفير وحذف جميع البيانات التجريبية بنجاح! السجلات نظيفة تماماً وجاهزة لبياناتك الحقيقية.',
        });
        await fetchReadiness();
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setFeedback({ type: 'error', message: res.error || res.data?.error || 'فشل تنظيف البيانات التجريبية' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'حدث خطأ أثناء تنظيف البيانات التجريبية' });
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Final Activation
  const handleActivateProduction = async () => {
    const targetComp = readiness?.summary.companyId || companyId;
    if (!targetComp) return;
    setActionLoading('activate');
    try {
      const res = await safeFetchJson('/api/v1/production-onboarding/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: targetComp }),
      });
      if (res.ok && res.data?.success) {
        setFeedback({
          type: 'success',
          message: 'تهانينا! تم تفعيل المنشأة للإنتاج الفعلي بنجاح، وتفعيل قفل حظر البيانات التجريبية بشكل دائم.',
        });
        await fetchReadiness();
      } else {
        setFeedback({ type: 'error', message: res.error || res.data?.error || 'فشل تفعيل المنشأة للإنتاج' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'فشل تفعيل المنشأة للإنتاج' });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && !readiness) {
    return (
      <div className="flex items-center justify-center p-16 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 ml-3" />
        <span>جاري فحص الجاهزية التشغيلية لبيئة الإنتاج...</span>
      </div>
    );
  }

  const isReady = readiness?.overallReadiness === 'READY';
  const isBlocked = readiness?.overallReadiness === 'BLOCKED';

  return (
    <div className="space-y-6 text-slate-100" dir="rtl">
      {/* Header Banner */}
      <div className="bg-slate-900 rounded-2xl p-6 shadow-xl border border-emerald-900/50">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`p-3.5 rounded-xl border ${isReady ? 'bg-emerald-950 border-emerald-800 text-emerald-400' : isBlocked ? 'bg-rose-950 border-rose-800 text-rose-400' : 'bg-amber-950 border-amber-800 text-amber-400'}`}>
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">إدارة وتهيئة بيانات الإنتاج الفعلي وتأهيل المنشأة</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  readiness?.summary.environment === 'PRODUCTION' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                }`}>
                  {readiness?.summary.environment || 'PRODUCTION'}
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                بوابة الحماية والانتقال الآمن من بيئة التطوير إلى بيئة التشغيل الفعلي (Phase 8.6)
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-3">
            <button
              onClick={handleCleanupSampleData}
              disabled={actionLoading === 'cleanup'}
              className="inline-flex items-center gap-2 px-4 py-2 bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800 text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              حذف وتصفير البيانات التجريبية
            </button>
            <button
              onClick={fetchReadiness}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-xl border border-slate-700 transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              تحديث الفحص
            </button>
            {readiness?.summary.companyId && (
              <button
                onClick={handleActivateProduction}
                disabled={actionLoading === 'activate' || !readiness.doubleEntryBalanced}
                className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-950 transition cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                تأكيد الجاهزية والتشغيل الفعلي
              </button>
            )}
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className={`mt-4 p-4 rounded-xl flex items-start gap-3 text-sm border ${
            feedback.type === 'success' ? 'bg-emerald-950/80 text-emerald-200 border-emerald-800' :
            feedback.type === 'error' ? 'bg-rose-950/80 text-rose-200 border-rose-800' :
            'bg-slate-850 text-cyan-200 border-cyan-800'
          }`}>
            {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" /> :
             feedback.type === 'error' ? <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" /> :
             <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />}
            <div className="flex-1">{feedback.message}</div>
            <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white font-bold">×</button>
          </div>
        )}

        {/* Master Readiness Gauge */}
        <div className="mt-6 pt-6 border-t border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-950 rounded-xl p-4 border border-emerald-900/30">
            <div className="text-xs text-slate-400 font-medium">مستوى الجاهزية الكلي</div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-2xl font-bold text-white font-mono">{readiness?.readinessScorePercent || 0}%</span>
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                isReady ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : isBlocked ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
              }`}>
                {isReady ? 'جاهز للإنتاج' : isBlocked ? 'محظور / به خلل' : 'قيد الاستكمال'}
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${isReady ? 'bg-emerald-500' : isBlocked ? 'bg-rose-500' : 'bg-amber-500'}`}
                style={{ width: `${readiness?.readinessScorePercent || 0}%` }}
              />
            </div>
          </div>

          <div className="bg-slate-950 rounded-xl p-4 border border-emerald-900/30">
            <div className="text-xs text-slate-400 font-medium">قاعدة البيانات والهجرات</div>
            <div className="flex items-center gap-2 mt-2">
              {readiness?.databaseVerified && readiness.migrationsVerified ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-400" />
              )}
              <span className="text-base font-bold text-white font-mono">
                {readiness?.summary.appliedMigrationsCount} هجرة مطبقة
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2">الإصدار: {readiness?.summary.schemaVersion}</p>
          </div>

          <div className="bg-slate-950 rounded-xl p-4 border border-emerald-900/30">
            <div className="text-xs text-slate-400 font-medium">ميزان القيد المزدوج (Debit = Credit)</div>
            <div className="flex items-center gap-2 mt-2">
              {readiness?.doubleEntryBalanced ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              )}
              <span className="text-base font-bold text-white">
                {readiness?.doubleEntryBalanced ? 'متوازن بدقة 100%' : 'يوجد فارق حسابي'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2">الفارق: {readiness?.summary.ledgerBalanceDifference || 0} ر.س</p>
          </div>

          <div className="bg-slate-950 rounded-xl p-4 border border-emerald-900/30">
            <div className="text-xs text-slate-400 font-medium">حالة المنشأة والمسؤول</div>
            <div className="flex items-center gap-2 mt-2">
              {readiness?.tenantCreated && readiness.adminCreated ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <XCircle className="w-5 h-5 text-amber-400" />
              )}
              <span className="text-base font-bold text-white">
                {readiness?.summary.onboardingState || 'غير مكتمل'}
              </span>
            </div>
            <p className="text-xs text-emerald-400 mt-2">حظر البيانات التجريبية: نشط</p>
          </div>
        </div>
      </div>

      {/* 4-Quadrant Control Center */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quadrant 1: Tenant Onboarding Wizard */}
        <div className="bg-slate-900 rounded-2xl p-6 shadow-xl border border-emerald-900/40">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            <div className="p-2.5 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white">تأسيس منشأة التاجر والمسؤول الأول</h3>
              <p className="text-xs text-slate-400">تهيئة الحساب الفعلي وتوليد المفاتيح والروابط الآمنة</p>
            </div>
          </div>

          {readiness?.tenantCreated && readiness.adminCreated ? (
            <div className="mt-6 flex flex-col items-center justify-center p-6 bg-emerald-950/60 rounded-xl border border-emerald-800/60">
              <ShieldCheck className="w-12 h-12 text-emerald-400 mb-3" />
              <h4 className="text-sm font-bold text-emerald-200">تم تأسيس المنشأة بنجاح</h4>
              <p className="text-xs text-emerald-300 mt-1 text-center">المنشأة والمسؤول الأول جاهزان للعمل. حالة التهيئة: {readiness.summary.onboardingState}</p>
            </div>
          ) : (
            <form onSubmit={handleCreateTenant} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">اسم المنشأة الفعلي *</label>
                <input
                  type="text"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  placeholder="مثال: شركة آفاق الأعمال للتجارة"
                  className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:border-emerald-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">الرقم الضريبي (اختياري)</label>
                <input
                  type="text"
                  value={tenantTaxNo}
                  onChange={(e) => setTenantTaxNo(e.target.value)}
                  placeholder="300XXXXXXXXXXXX"
                  className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">اسم المسؤول الأول *</label>
                <input
                  type="text"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="مثال: عبدالله القحطاني"
                  className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:border-emerald-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">البريد الإلكتروني للإنتاج *</label>
                <input
                  type="email"
                  value={tenantEmail}
                  onChange={(e) => setTenantEmail(e.target.value)}
                  placeholder="admin@afaq-trading.sa"
                  className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:border-emerald-500 outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">كلمة مرور المسؤول الآمنة *</label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:border-emerald-500 outline-none"
                required
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handlePreBackup}
                disabled={actionLoading === 'backup' || !readiness?.summary.companyId}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition cursor-pointer"
              >
                <FileCheck className="w-4 h-4 text-emerald-400" />
                إنشاء نسخة احتياطية أولية (Pre-Backup)
              </button>

              <button
                type="submit"
                disabled={actionLoading === 'tenant'}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg shadow-emerald-950 transition cursor-pointer"
              >
                <Building2 className="w-4 h-4" />
                تأسيس المنشأة والمسؤول
              </button>
            </div>
          </form>
          )}
        </div>

        {/* Quadrant 2: Safe Data Import Pipeline */}
        <div className="bg-slate-900 rounded-2xl p-6 shadow-xl border border-emerald-900/40">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-400">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white">محرك استيراد البيانات الآمن (Dry-Run & Commit)</h3>
                <p className="text-xs text-slate-400">استيراد العملاء، الموردين، المنتجات والأرصدة الافتتاحية</p>
              </div>
            </div>

            <select
              value={importDomain}
              onChange={(e) => setImportDomain(e.target.value as any)}
              className="text-xs font-semibold bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3 py-1.5 outline-none"
            >
              <option value="CUSTOMERS">العملاء (Customers)</option>
              <option value="SUPPLIERS">الموردين (Suppliers)</option>
              <option value="PRODUCTS">المنتجات والمخزون (Products)</option>
            </select>
          </div>

          <div className="space-y-3 mt-4">
            <textarea
              value={importRawJson}
              onChange={(e) => setImportRawJson(e.target.value)}
              rows={4}
              placeholder="ضع مصفوفة البيانات بتنسيق JSON هنا..."
              className="w-full p-3 font-mono text-xs border border-slate-700 rounded-xl bg-slate-950 text-slate-200 focus:border-emerald-500 outline-none"
            />

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleImportPreview}
                disabled={actionLoading === 'preview'}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 text-emerald-400" />
                فحص تجريبي (Dry Run)
              </button>

              {importPreview && (
                <button
                  type="button"
                  onClick={handleImportCommit}
                  disabled={actionLoading === 'commit' || importPreview.errorRecords > 0}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg shadow-emerald-950 transition cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  ترحيل وتثبيت ({importPreview.validRecords} سجل)
                </button>
              )}
            </div>

            {/* Preview Results Box */}
            {importPreview && (
              <div className="p-3 bg-slate-950 rounded-xl border border-emerald-900/40 text-xs space-y-2">
                <div className="flex items-center justify-between font-bold text-slate-200">
                  <span>نتائج الفحص التجريبي للملف:</span>
                  <span className="text-emerald-400 font-mono">ID: {importPreview.importId}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <div className="text-slate-400">صالح للترحيل</div>
                    <div className="font-bold text-emerald-400 text-sm font-mono">{importPreview.validRecords}</div>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <div className="text-slate-400">تحذيرات</div>
                    <div className="font-bold text-amber-400 text-sm font-mono">{importPreview.warningRecords}</div>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <div className="text-slate-400">أخطاء مانعة</div>
                    <div className="font-bold text-rose-400 text-sm font-mono">{importPreview.errorRecords}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quadrant 3: Test Probe Transaction & Invariant Verification */}
        <div className="bg-slate-900 rounded-2xl p-6 shadow-xl border border-emerald-900/40">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            <div className="p-2.5 rounded-xl bg-amber-950 border border-amber-800 text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white">معاملة الفحص التشغيلي التجريبية وعكس القيد</h3>
              <p className="text-xs text-slate-400">فحص دورة الفاتورة والدفع والقيد المزدوج وعكسها محاسبياً</p>
            </div>
          </div>

          <div className="space-y-4 mt-4">
            <p className="text-xs text-slate-300 leading-relaxed">
              يقوم هذا الإجراء بإنشاء فاتورة اختبارية بمبلغ 1.00 ر.س ودفعها آلياً للتحقق من مسار الترحيل لدفتر الأستاذ وحركة المخزون، ثم إتاحة عكس القيد محاسبياً لضمان عدم تلوث بيانات الإنتاج.
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleExecuteProbe}
                disabled={actionLoading === 'probe' || !readiness?.summary.companyId}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-amber-200 bg-amber-950/80 border border-amber-800 hover:bg-amber-900 rounded-xl transition cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 text-amber-400" />
                تنفيذ معاملة الفحص (1.00 ر.س)
              </button>

              {testProbeResult && (
                <button
                  type="button"
                  onClick={handleReverseProbe}
                  disabled={actionLoading === 'reverse'}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  عكس القيد محاسبياً
                </button>
              )}
            </div>

            {testProbeResult && (
              <div className="p-3 bg-emerald-950/80 rounded-xl border border-emerald-800 text-xs space-y-1 text-emerald-200 font-mono">
                <div className="font-bold text-white">معاملة الفحص مسجلة ومتطابقة:</div>
                <div>معرف المعاملة: {testProbeResult.testTransactionId}</div>
                <div>إجمالي المدين: {testProbeResult.debitTotal} ر.س | إجمالي الدائن: {testProbeResult.creditTotal} ر.س</div>
              </div>
            )}
          </div>
        </div>

        {/* Quadrant 4: Comprehensive Ledger & Data Reconciliation Summary */}
        <div className="bg-slate-900 rounded-2xl p-6 shadow-xl border border-emerald-900/40">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            <div className="p-2.5 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white">مطابقة وتطابق الأرصدة ودفتر الأستاذ العام</h3>
              <p className="text-xs text-slate-400">التأكد التام من استيفاء شروط النزاهة المحاسبية (Debit = Credit)</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
            <div className="bg-slate-950 p-3 rounded-xl border border-emerald-900/30">
              <div className="text-slate-400">إجمالي المدين (Debit)</div>
              <div className="text-base font-bold text-emerald-400 font-mono mt-1">
                {readiness?.reconciliation.ledgerDebitTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} ر.س
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-emerald-900/30">
              <div className="text-slate-400">إجمالي الدائن (Credit)</div>
              <div className="text-base font-bold text-emerald-400 font-mono mt-1">
                {readiness?.reconciliation.ledgerCreditTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} ر.س
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-emerald-900/30">
              <div className="text-slate-400">العملاء والأرصدة الافتتاحية</div>
              <div className="font-bold text-slate-200 mt-1 font-mono">
                {readiness?.reconciliation.customersCount} عميل ({readiness?.reconciliation.customerOpeningBalanceTotal} ر.س)
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-emerald-900/30">
              <div className="text-slate-400">الموردين والأرصدة الافتتاحية</div>
              <div className="font-bold text-slate-200 mt-1 font-mono">
                {readiness?.reconciliation.suppliersCount} مورد ({readiness?.reconciliation.supplierOpeningBalanceTotal} ر.س)
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-emerald-900/30">
              <div className="text-slate-400">المنتجات وإجمالي المخزون</div>
              <div className="font-bold text-slate-200 mt-1 font-mono">
                {readiness?.reconciliation.productsCount} منتج ({readiness?.reconciliation.stockUnitsTotal} وحدة)
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-emerald-900/30">
              <div className="text-slate-400">الفواتير والدفعات</div>
              <div className="font-bold text-slate-200 mt-1 font-mono">
                {readiness?.reconciliation.invoicesCount} فاتورة / {readiness?.reconciliation.paymentsCount} دفعة
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductionDataInitializationTab;
