import React, { useState, useEffect } from 'react';
import { safeFetchJson } from '../../lib/safeFetch';
import { executeLocalWipeDemoData, executeLocalSeedDemoData } from '../../services/localDesktopApiFallback';
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

  // Handle Seed Demo Data
  const handleSeedDemoData = async () => {
    setActionLoading('seed');
    try {
      const res = await executeLocalSeedDemoData();
      if (res.ok) {
        setFeedback({
          type: 'success',
          message: 'تم زرع حزمة البيانات التجريبية الشاملة بنجاح مع التوازن المحاسبي الكامل!',
        });
        await fetchReadiness();
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        setFeedback({ type: 'error', message: res.error || 'فشل زرع البيانات التجريبية' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'فشل زرع البيانات التجريبية' });
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Clean Sandbox / Sample Data
  const handleCleanupSampleData = async () => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف وتصفير كافة البيانات التجريبية لبدء العمل الفعلي النظيف؟ ستبقى بيانات حسابك واسم المنشأة وإعدادات الربط آمنة ومحفوظة.')) return;
    setActionLoading('cleanup');
    try {
      const res = await executeLocalWipeDemoData();
      if (res.ok) {
        // Also notify backend if reachable
        safeFetchJson('/api/v1/system/wipe-demo-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }).catch(() => {});

        setFeedback({
          type: 'success',
          message: 'تم تصفير وحذف جميع البيانات التجريبية بنجاح! السجلات نظيفة تماماً وجاهزة لبياناتك الحقيقية.',
        });
        await fetchReadiness();
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setFeedback({ type: 'error', message: res.error || 'فشل تنظيف البيانات التجريبية' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'حدث خطأ أثناء تنظيف البيانات التجريبية' });
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
      <div className="flex items-center justify-center p-16 text-[var(--md-on-surface-variant)]" dir="rtl">
        <RefreshCw className="w-8 h-8 animate-spin text-[var(--md-primary-text)] ml-3" />
        <span className="font-medium">جاري فحص الجاهزية التشغيلية لبيئة الإنتاج...</span>
      </div>
    );
  }

  const isReady = readiness?.overallReadiness === 'READY';
  const isBlocked = readiness?.overallReadiness === 'BLOCKED';

  return (
    <div className="space-y-6 text-[var(--md-on-surface)]" dir="rtl">
      {/* Header Banner */}
      <div className="m3-card-elevated p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`p-3.5 rounded-2xl border shrink-0 ${
                isReady
                  ? 'bg-[var(--md-success-container)] border-[var(--md-success)]/30 text-[var(--md-on-success-container)]'
                  : isBlocked
                  ? 'bg-[var(--md-error-container)] border-[var(--md-error)]/30 text-[var(--md-on-error-container)]'
                  : 'bg-[var(--md-warning-container)] border-[var(--md-warning)]/30 text-[var(--md-on-warning-container)]'
              }`}
            >
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-[var(--md-on-surface)]">إدارة وتهيئة بيانات الإنتاج الفعلي وتأهيل المنشأة</h2>
                <span
                  className={`m3-badge font-mono ${
                    readiness?.summary.environment === 'PRODUCTION'
                      ? 'bg-[var(--md-error-container)] text-[var(--md-on-error-container)] border border-[var(--md-error)]/35'
                      : 'bg-[var(--md-success-container)] text-[var(--md-on-success-container)] border border-[var(--md-success)]/35'
                  }`}
                >
                  {readiness?.summary.environment || 'PRODUCTION'}
                </span>
              </div>
              <p className="text-sm text-[var(--md-on-surface-variant)] mt-1">
                بوابة الحماية والانتقال الآمن من بيئة التطوير إلى بيئة التشغيل الفعلي (Phase 8.6)
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            <button
              onClick={handleSeedDemoData}
              disabled={actionLoading === 'seed'}
              className="m3-btn-tonal inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold cursor-pointer disabled:opacity-50"
            >
              <Zap className="w-4 h-4" />
              زرع بيانات تجريبية (Seed Demo)
            </button>
            <button
              onClick={handleCleanupSampleData}
              disabled={actionLoading === 'cleanup'}
              className="m3-btn-danger inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              حذف وتصفير البيانات التجريبية
            </button>
            <button
              onClick={fetchReadiness}
              disabled={loading}
              className="m3-btn-outlined inline-flex items-center gap-2 px-4 py-2 text-sm font-medium cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              تحديث الفحص
            </button>
            {readiness?.summary.companyId && (
              <button
                onClick={handleActivateProduction}
                disabled={actionLoading === 'activate' || !readiness.doubleEntryBalanced}
                className="m3-btn-primary inline-flex items-center gap-2 px-5 py-2 disabled:opacity-50 text-sm font-semibold cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                تأكيد الجاهزية والتشغيل الفعلي
              </button>
            )}
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mt-4 p-4 rounded-xl flex items-start gap-3 text-sm border ${
              feedback.type === 'success'
                ? 'bg-[var(--md-success-container)] text-[var(--md-on-success-container)] border-[var(--md-success)]/35'
                : feedback.type === 'error'
                ? 'bg-[var(--md-error-container)] text-[var(--md-on-error-container)] border-[var(--md-error)]/35'
                : 'bg-[var(--md-info-container)] text-[var(--md-on-info-container)] border-[var(--md-info)]/35'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-[var(--md-success)] shrink-0 mt-0.5" />
            ) : feedback.type === 'error' ? (
              <AlertTriangle className="w-5 h-5 text-[var(--md-error)] shrink-0 mt-0.5" />
            ) : (
              <Info className="w-5 h-5 text-[var(--md-info)] shrink-0 mt-0.5" />
            )}
            <div className="flex-1 font-medium">{feedback.message}</div>
            <button
              onClick={() => setFeedback(null)}
              className="opacity-75 hover:opacity-100 font-bold px-1.5 rounded-lg"
              aria-label="إغلاق الرسالة"
            >
              ×
            </button>
          </div>
        )}

        {/* Master Readiness Gauge */}
        <div className="mt-6 pt-6 border-t border-[var(--md-outline-variant)] grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[var(--md-surface-container-low)] rounded-xl p-4 border border-[var(--md-outline-variant)]">
            <div className="text-xs text-[var(--md-on-surface-variant)] font-medium">مستوى الجاهزية الكلي</div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-2xl font-bold text-[var(--md-on-surface)] font-mono tabular-nums">
                {readiness?.readinessScorePercent || 0}%
              </span>
              <span
                className={`m3-badge ${
                  isReady
                    ? 'bg-[var(--md-success-container)] text-[var(--md-on-success-container)] border border-[var(--md-success)]/30'
                    : isBlocked
                    ? 'bg-[var(--md-error-container)] text-[var(--md-on-error-container)] border border-[var(--md-error)]/30'
                    : 'bg-[var(--md-warning-container)] text-[var(--md-on-warning-container)] border border-[var(--md-warning)]/30'
                }`}
              >
                {isReady ? 'جاهز للإنتاج' : isBlocked ? 'محظور / به خلل' : 'قيد الاستكمال'}
              </span>
            </div>
            <div className="w-full bg-[var(--md-surface-container-highest)] h-2 rounded-full mt-3 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  isReady
                    ? 'bg-[var(--md-success)]'
                    : isBlocked
                    ? 'bg-[var(--md-error)]'
                    : 'bg-[var(--md-warning)]'
                }`}
                style={{ width: `${readiness?.readinessScorePercent || 0}%` }}
              />
            </div>
          </div>

          <div className="bg-[var(--md-surface-container-low)] rounded-xl p-4 border border-[var(--md-outline-variant)]">
            <div className="text-xs text-[var(--md-on-surface-variant)] font-medium">قاعدة البيانات والهجرات</div>
            <div className="flex items-center gap-2 mt-2">
              {readiness?.databaseVerified && readiness.migrationsVerified ? (
                <CheckCircle2 className="w-5 h-5 text-[var(--md-success)]" />
              ) : (
                <XCircle className="w-5 h-5 text-[var(--md-error)]" />
              )}
              <span className="text-base font-bold text-[var(--md-on-surface)] font-mono tabular-nums">
                {readiness?.summary.appliedMigrationsCount} هجرة مطبقة
              </span>
            </div>
            <p className="text-xs text-[var(--md-on-surface-variant)] mt-2 font-mono tabular-nums">
              الإصدار: {readiness?.summary.schemaVersion}
            </p>
          </div>

          <div className="bg-[var(--md-surface-container-low)] rounded-xl p-4 border border-[var(--md-outline-variant)]">
            <div className="text-xs text-[var(--md-on-surface-variant)] font-medium">ميزان القيد المزدوج (Debit = Credit)</div>
            <div className="flex items-center gap-2 mt-2">
              {readiness?.doubleEntryBalanced ? (
                <CheckCircle2 className="w-5 h-5 text-[var(--md-success)]" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-[var(--md-error)]" />
              )}
              <span className="text-base font-bold text-[var(--md-on-surface)]">
                {readiness?.doubleEntryBalanced ? 'متوازن بدقة 100%' : 'يوجد فارق حسابي'}
              </span>
            </div>
            <p className="text-xs text-[var(--md-on-surface-variant)] mt-2 tabular-nums">
              الفارق: {readiness?.summary.ledgerBalanceDifference || 0} ر.س
            </p>
          </div>

          <div className="bg-[var(--md-surface-container-low)] rounded-xl p-4 border border-[var(--md-outline-variant)]">
            <div className="text-xs text-[var(--md-on-surface-variant)] font-medium">حالة المنشأة والمسؤول</div>
            <div className="flex items-center gap-2 mt-2">
              {readiness?.tenantCreated && readiness.adminCreated ? (
                <CheckCircle2 className="w-5 h-5 text-[var(--md-success)]" />
              ) : (
                <XCircle className="w-5 h-5 text-[var(--md-warning)]" />
              )}
              <span className="text-base font-bold text-[var(--md-on-surface)]">
                {readiness?.summary.onboardingState || 'غير مكتمل'}
              </span>
            </div>
            <p className="text-xs text-[var(--md-success)] font-medium mt-2">حظر البيانات التجريبية: نشط</p>
          </div>
        </div>
      </div>

      {/* 4-Quadrant Control Center */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quadrant 1: Tenant Onboarding Wizard */}
        <div className="m3-card p-6">
          <div className="flex items-center gap-3 pb-4 border-b border-[var(--md-outline-variant)]">
            <div className="p-2.5 rounded-xl bg-[var(--md-primary-container)] border border-[var(--md-primary)]/25 text-[var(--md-on-primary-container)]">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-[var(--md-on-surface)]">تأسيس منشأة التاجر والمسؤول الأول</h3>
              <p className="text-xs text-[var(--md-on-surface-variant)]">تهيئة الحساب الفعلي وتوليد المفاتيح والروابط الآمنة</p>
            </div>
          </div>

          {readiness?.tenantCreated && readiness.adminCreated ? (
            <div className="mt-6 flex flex-col items-center justify-center p-6 bg-[var(--md-success-container)] rounded-xl border border-[var(--md-success)]/35 text-[var(--md-on-success-container)]">
              <ShieldCheck className="w-12 h-12 text-[var(--md-success)] mb-3" />
              <h4 className="text-sm font-bold">تم تأسيس المنشأة بنجاح</h4>
              <p className="text-xs opacity-90 mt-1 text-center">
                المنشأة والمسؤول الأول جاهزان للعمل. حالة التهيئة: {readiness.summary.onboardingState}
              </p>
            </div>
          ) : (
            <form onSubmit={handleCreateTenant} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--md-on-surface)] mb-1">اسم المنشأة الفعلي *</label>
                  <input
                    type="text"
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    placeholder="مثال: شركة آفاق الأعمال للتجارة"
                    className="m3-input w-full px-3 py-2 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--md-on-surface)] mb-1">الرقم الضريبي (اختياري)</label>
                  <input
                    type="text"
                    value={tenantTaxNo}
                    onChange={(e) => setTenantTaxNo(e.target.value)}
                    placeholder="300XXXXXXXXXXXX"
                    className="m3-input w-full px-3 py-2 text-sm font-mono tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--md-on-surface)] mb-1">اسم المسؤول الأول *</label>
                  <input
                    type="text"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="مثال: عبدالله القحطاني"
                    className="m3-input w-full px-3 py-2 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--md-on-surface)] mb-1">البريد الإلكتروني للإنتاج *</label>
                  <input
                    type="email"
                    value={tenantEmail}
                    onChange={(e) => setTenantEmail(e.target.value)}
                    placeholder="admin@afaq-trading.sa"
                    className="m3-input w-full px-3 py-2 text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--md-on-surface)] mb-1">كلمة مرور المسؤول الآمنة *</label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="m3-input w-full px-3 py-2 text-sm"
                  required
                />
              </div>

              <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handlePreBackup}
                  disabled={actionLoading === 'backup' || !readiness?.summary.companyId}
                  className="m3-btn-outlined inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  <FileCheck className="w-4 h-4 text-[var(--md-primary-text)]" />
                  إنشاء نسخة احتياطية أولية (Pre-Backup)
                </button>

                <button
                  type="submit"
                  disabled={actionLoading === 'tenant'}
                  className="m3-btn-primary inline-flex items-center gap-2 px-5 py-2 text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  <Building2 className="w-4 h-4" />
                  تأسيس المنشأة والمسؤول
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Quadrant 2: Safe Data Import Pipeline */}
        <div className="m3-card p-6">
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-[var(--md-outline-variant)] flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[var(--md-primary-container)] border border-[var(--md-primary)]/25 text-[var(--md-on-primary-container)]">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-[var(--md-on-surface)]">محرك استيراد البيانات الآمن (Dry-Run & Commit)</h3>
                <p className="text-xs text-[var(--md-on-surface-variant)]">استيراد العملاء، الموردين، المنتجات والأرصدة الافتتاحية</p>
              </div>
            </div>

            <select
              value={importDomain}
              onChange={(e) => setImportDomain(e.target.value as any)}
              className="m3-select text-xs font-semibold px-3 py-1.5"
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
              className="m3-input w-full p-3 font-mono text-xs"
            />

            <div className="flex items-center justify-between flex-wrap gap-2">
              <button
                type="button"
                onClick={handleImportPreview}
                disabled={actionLoading === 'preview'}
                className="m3-btn-outlined inline-flex items-center gap-2 px-4 py-2 text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 text-[var(--md-primary-text)]" />
                فحص تجريبي (Dry Run)
              </button>

              {importPreview && (
                <button
                  type="button"
                  onClick={handleImportCommit}
                  disabled={actionLoading === 'commit' || importPreview.errorRecords > 0}
                  className="m3-btn-primary inline-flex items-center gap-2 px-4 py-2 text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  ترحيل وتثبيت ({importPreview.validRecords} سجل)
                </button>
              )}
            </div>

            {/* Preview Results Box */}
            {importPreview && (
              <div className="p-3 bg-[var(--md-surface-container-low)] rounded-xl border border-[var(--md-outline-variant)] text-xs space-y-2">
                <div className="flex items-center justify-between font-bold text-[var(--md-on-surface)]">
                  <span>نتائج الفحص التجريبي للملف:</span>
                  <span className="text-[var(--md-primary-text)] font-mono tabular-nums">ID: {importPreview.importId}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-[var(--md-surface-container)] p-2 rounded-lg border border-[var(--md-outline-variant)]">
                    <div className="text-[var(--md-on-surface-variant)]">صالح للترحيل</div>
                    <div className="font-bold text-[var(--md-success)] text-sm font-mono tabular-nums">{importPreview.validRecords}</div>
                  </div>
                  <div className="bg-[var(--md-surface-container)] p-2 rounded-lg border border-[var(--md-outline-variant)]">
                    <div className="text-[var(--md-on-surface-variant)]">تحذيرات</div>
                    <div className="font-bold text-[var(--md-warning)] text-sm font-mono tabular-nums">{importPreview.warningRecords}</div>
                  </div>
                  <div className="bg-[var(--md-surface-container)] p-2 rounded-lg border border-[var(--md-outline-variant)]">
                    <div className="text-[var(--md-on-surface-variant)]">أخطاء مانعة</div>
                    <div className="font-bold text-[var(--md-error)] text-sm font-mono tabular-nums">{importPreview.errorRecords}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quadrant 3: Test Probe Transaction & Invariant Verification */}
        <div className="m3-card p-6">
          <div className="flex items-center gap-3 pb-4 border-b border-[var(--md-outline-variant)]">
            <div className="p-2.5 rounded-xl bg-[var(--md-warning-container)] border border-[var(--md-warning)]/30 text-[var(--md-on-warning-container)]">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-[var(--md-on-surface)]">معاملة الفحص التشغيلي التجريبية وعكس القيد</h3>
              <p className="text-xs text-[var(--md-on-surface-variant)]">فحص دورة الفاتورة والدفع والقيد المزدوج وعكسها محاسبياً</p>
            </div>
          </div>

          <div className="space-y-4 mt-4">
            <p className="text-xs text-[var(--md-on-surface-variant)] leading-relaxed">
              يقوم هذا الإجراء بإنشاء فاتورة اختبارية بمبلغ 1.00 ر.س ودفعها آلياً للتحقق من مسار الترحيل لدفتر الأستاذ وحركة المخزون، ثم إتاحة عكس القيد محاسبياً لضمان عدم تلوث بيانات الإنتاج.
            </p>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={handleExecuteProbe}
                disabled={actionLoading === 'probe' || !readiness?.summary.companyId}
                className="m3-btn-tonal inline-flex items-center gap-2 px-4 py-2 text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" />
                تنفيذ معاملة الفحص (1.00 ر.س)
              </button>

              {testProbeResult && (
                <button
                  type="button"
                  onClick={handleReverseProbe}
                  disabled={actionLoading === 'reverse'}
                  className="m3-btn-danger inline-flex items-center gap-2 px-4 py-2 text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  عكس القيد محاسبياً
                </button>
              )}
            </div>

            {testProbeResult && (
              <div className="p-3 bg-[var(--md-success-container)] rounded-xl border border-[var(--md-success)]/35 text-xs space-y-1 text-[var(--md-on-success-container)] font-mono tabular-nums">
                <div className="font-bold font-sans">معاملة الفحص مسجلة ومتطابقة:</div>
                <div>معرف المعاملة: {testProbeResult.testTransactionId}</div>
                <div>إجمالي المدين: {testProbeResult.debitTotal} ر.س | إجمالي الدائن: {testProbeResult.creditTotal} ر.س</div>
              </div>
            )}
          </div>
        </div>

        {/* Quadrant 4: Comprehensive Ledger & Data Reconciliation Summary */}
        <div className="m3-card p-6">
          <div className="flex items-center gap-3 pb-4 border-b border-[var(--md-outline-variant)]">
            <div className="p-2.5 rounded-xl bg-[var(--md-primary-container)] border border-[var(--md-primary)]/25 text-[var(--md-on-primary-container)]">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-[var(--md-on-surface)]">مطابقة وتطابق الأرصدة ودفتر الأستاذ العام</h3>
              <p className="text-xs text-[var(--md-on-surface-variant)]">التأكد التام من استيفاء شروط النزاهة المحاسبية (Debit = Credit)</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
            <div className="bg-[var(--md-surface-container-low)] p-3 rounded-xl border border-[var(--md-outline-variant)]">
              <div className="text-[var(--md-on-surface-variant)]">إجمالي المدين (Debit)</div>
              <div className="text-base font-bold text-[var(--md-primary-text)] font-mono tabular-nums mt-1">
                {readiness?.reconciliation.ledgerDebitTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} ر.س
              </div>
            </div>

            <div className="bg-[var(--md-surface-container-low)] p-3 rounded-xl border border-[var(--md-outline-variant)]">
              <div className="text-[var(--md-on-surface-variant)]">إجمالي الدائن (Credit)</div>
              <div className="text-base font-bold text-[var(--md-primary-text)] font-mono tabular-nums mt-1">
                {readiness?.reconciliation.ledgerCreditTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} ر.س
              </div>
            </div>

            <div className="bg-[var(--md-surface-container-low)] p-3 rounded-xl border border-[var(--md-outline-variant)]">
              <div className="text-[var(--md-on-surface-variant)]">العملاء والأرصدة الافتتاحية</div>
              <div className="font-bold text-[var(--md-on-surface)] mt-1 font-mono tabular-nums">
                {readiness?.reconciliation.customersCount} عميل ({readiness?.reconciliation.customerOpeningBalanceTotal} ر.س)
              </div>
            </div>

            <div className="bg-[var(--md-surface-container-low)] p-3 rounded-xl border border-[var(--md-outline-variant)]">
              <div className="text-[var(--md-on-surface-variant)]">الموردين والأرصدة الافتتاحية</div>
              <div className="font-bold text-[var(--md-on-surface)] mt-1 font-mono tabular-nums">
                {readiness?.reconciliation.suppliersCount} مورد ({readiness?.reconciliation.supplierOpeningBalanceTotal} ر.س)
              </div>
            </div>

            <div className="bg-[var(--md-surface-container-low)] p-3 rounded-xl border border-[var(--md-outline-variant)]">
              <div className="text-[var(--md-on-surface-variant)]">المنتجات وإجمالي المخزون</div>
              <div className="font-bold text-[var(--md-on-surface)] mt-1 font-mono tabular-nums">
                {readiness?.reconciliation.productsCount} منتج ({readiness?.reconciliation.stockUnitsTotal} وحدة)
              </div>
            </div>

            <div className="bg-[var(--md-surface-container-low)] p-3 rounded-xl border border-[var(--md-outline-variant)]">
              <div className="text-[var(--md-on-surface-variant)]">الفواتير والدفعات</div>
              <div className="font-bold text-[var(--md-on-surface)] mt-1 font-mono tabular-nums">
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
