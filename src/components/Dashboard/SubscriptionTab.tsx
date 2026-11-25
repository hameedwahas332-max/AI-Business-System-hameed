import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { safeFetchJson } from '../../lib/safeFetch';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, HardDrive, FileText, Users, ScrollText, AlertTriangle, RefreshCw, CheckCircle2, Sparkles } from 'lucide-react';

export interface UsageMetric {
  used: number;
  limit: number;
  percentage: number;
  usedBytes?: number;
  limitBytes?: number;
}

export interface SubscriptionUsageData {
  success: boolean;
  plan: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  invoices: UsageMetric;
  users: UsageMetric;
  ocr: UsageMetric;
  storage: UsageMetric;
  aiRequests?: UsageMetric;
}

const DEFAULT_USAGE_METRIC: UsageMetric = {
  used: 0,
  limit: 0,
  percentage: 0,
};

const createSafeUsageMetric = (
  raw: any,
  fallbackUsed = 0,
  fallbackLimit = 0,
  byteValues?: { usedBytes?: number; limitBytes?: number }
): UsageMetric => {
  const used = Number.isFinite(Number(raw?.used)) ? Number(raw.used) : Number(fallbackUsed) || 0;
  const limit = Number.isFinite(Number(raw?.limit)) ? Number(raw.limit) : Number(fallbackLimit) || 0;

  const usedBytes =
    raw?.usedBytes !== undefined && Number.isFinite(Number(raw.usedBytes))
      ? Number(raw.usedBytes)
      : byteValues?.usedBytes;
  const limitBytes =
    raw?.limitBytes !== undefined && Number.isFinite(Number(raw.limitBytes))
      ? Number(raw.limitBytes)
      : byteValues?.limitBytes;

  let percentage: number;
  if (raw?.percentage !== undefined && raw?.percentage !== null && Number.isFinite(Number(raw.percentage))) {
    percentage = Math.max(0, Math.round(Number(raw.percentage)));
  } else if (limitBytes !== undefined) {
    percentage =
      limitBytes > 0 && usedBytes !== undefined
        ? Math.min(100, Math.max(0, Math.round((usedBytes / limitBytes) * 100)))
        : 0;
  } else if (limit > 0) {
    percentage = Math.min(100, Math.max(0, Math.round((used / limit) * 100)));
  } else {
    percentage = 0;
  }

  return {
    used,
    limit,
    percentage,
    ...(usedBytes !== undefined ? { usedBytes } : {}),
    ...(limitBytes !== undefined ? { limitBytes } : {}),
  };
};

const normalizeSubscriptionUsage = (rawPayload: any): SubscriptionUsageData => {
  const payload =
    rawPayload && typeof rawPayload === 'object' && rawPayload.data && typeof rawPayload.data === 'object'
      ? rawPayload.data
      : rawPayload && typeof rawPayload === 'object'
      ? rawPayload
      : {};

  const gbToBytes = (gb: any): number | undefined => {
    const n = Number(gb);
    return Number.isFinite(n) && n >= 0 ? Math.round(n * 1024 * 1024 * 1024) : undefined;
  };

  const storageUsedBytes =
    payload?.storage?.usedBytes !== undefined
      ? Number(payload.storage.usedBytes)
      : gbToBytes(payload?.storageUsedGb) ?? 0;
  const storageLimitBytes =
    payload?.storage?.limitBytes !== undefined
      ? Number(payload.storage.limitBytes)
      : payload?.storageLimitGb === -1
      ? -1
      : gbToBytes(payload?.storageLimitGb) ?? 0;

  const hasAiMetric =
    Boolean(payload?.aiRequests) ||
    payload?.aiRequestsUsed !== undefined ||
    payload?.aiRequestsLimit !== undefined;

  return {
    success: Boolean(rawPayload?.success ?? payload?.success ?? true),
    plan: String(payload?.plan || 'FREE'),
    billingPeriodStart: String(payload?.billingPeriodStart || ''),
    billingPeriodEnd: String(payload?.billingPeriodEnd || ''),
    invoices: createSafeUsageMetric(
      payload?.invoices,
      payload?.invoicesUsed ?? 0,
      payload?.invoicesLimit ?? 0
    ),
    users: createSafeUsageMetric(
      payload?.users,
      payload?.usersUsed ?? 0,
      payload?.usersLimit ?? 0
    ),
    ocr: createSafeUsageMetric(
      payload?.ocr,
      payload?.ocrUsed ?? 0,
      payload?.ocrLimit ?? 0
    ),
    storage: createSafeUsageMetric(
      payload?.storage,
      payload?.storageUsedGb ?? 0,
      payload?.storageLimitGb ?? 0,
      { usedBytes: storageUsedBytes, limitBytes: storageLimitBytes }
    ),
    ...(hasAiMetric
      ? {
          aiRequests: createSafeUsageMetric(
            payload?.aiRequests,
            payload?.aiRequestsUsed ?? 0,
            payload?.aiRequestsLimit ?? 0
          ),
        }
      : {}),
  };
};

export const SubscriptionTab: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [usageData, setUsageData] = useState<SubscriptionUsageData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingPlan, setUpdatingPlan] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchUsage = async () => {
    const token = api.getToken();
    if (!token) {
      setLoading(false);
      setError('يلزم تسجيل الدخول لعرض بيانات الاستهلاك والاشتراك');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await safeFetchJson('/api/v1/subscription/usage', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok || !res.data) {
        throw new Error(res.error || 'فشل تحميل بيانات الاستهلاك والاشتراك');
      }

      setUsageData(normalizeSubscriptionUsage(res.data));
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحميل بيانات الاستهلاك');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchUsage();
    }
  }, [authLoading, isAuthenticated]);

  const handlePlanChange = async (newPlan: 'FREE' | 'PRO' | 'ENTERPRISE') => {
    setUpdatingPlan(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const token = api.getToken();
      const res = await safeFetchJson('/api/v1/subscription/change-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ plan: newPlan }),
      });

      if (!res.ok || !res.data) {
        throw new Error(res.error || res.data?.error?.message || res.data?.message || 'فشل تغيير خطة الاشتراك');
      }

      setSuccessMessage(`تمت ترقية / تغيير الخطة بنجاح إلى ${newPlan}`);
      await fetchUsage();
    } catch (err: any) {
      setError(err.message || 'فشل تغيير خطة الاشتراك');
    } finally {
      setUpdatingPlan(false);
    }
  };

  const formatBytes = (bytes?: number) => {
    if (bytes === undefined || bytes === null || bytes === -1 || !Number.isFinite(Number(bytes))) return 'غير محدود';
    const safeBytes = Math.max(0, Number(bytes));
    if (safeBytes < 1024 * 1024) return `${(safeBytes / 1024).toFixed(1)} KB`;
    if (safeBytes < 1024 * 1024 * 1024) return `${(safeBytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(safeBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const getStatusColor = (rawPercentage?: number) => {
    const percentage = Number.isFinite(Number(rawPercentage)) ? Number(rawPercentage) : 0;
    if (percentage >= 100) return 'bg-red-500 text-red-100';
    if (percentage >= 90) return 'bg-orange-500 text-white';
    if (percentage >= 80) return 'bg-amber-500 text-white';
    return 'bg-blue-600 text-white';
  };

  const getProgressColor = (rawPercentage?: number) => {
    const percentage = Number.isFinite(Number(rawPercentage)) ? Number(rawPercentage) : 0;
    if (percentage >= 100) return 'bg-red-600';
    if (percentage >= 90) return 'bg-orange-500';
    if (percentage >= 80) return 'bg-amber-500';
    return 'bg-blue-500';
  };

  const getStatusBadge = (rawPercentage?: number) => {
    const percentage = Number.isFinite(Number(rawPercentage)) ? Number(rawPercentage) : 0;
    if (percentage >= 100) return <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-800 font-bold dark:bg-red-900/40 dark:text-red-300">تم تجاوز الحد (100%)</span>;
    if (percentage >= 90) return <span className="text-xs px-2 py-0.5 rounded bg-orange-100 text-orange-800 font-bold dark:bg-orange-900/40 dark:text-orange-300">تحذير حرج (&gt;=90%)</span>;
    if (percentage >= 80) return <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold dark:bg-amber-900/40 dark:text-amber-300">اقتراب من الحد (&gt;=80%)</span>;
    return <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium dark:bg-emerald-900/40 dark:text-emerald-300">طبيعي</span>;
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center text-slate-500 gap-3">
        <RefreshCw className="w-5 h-5 animate-spin" />
        <span>جاري تحميل استهلاك الخطة والحدود...</span>
      </div>
    );
  }

  const plan = usageData?.plan || 'FREE';
  const safeInvoices = usageData?.invoices ?? DEFAULT_USAGE_METRIC;
  const safeUsers = usageData?.users ?? DEFAULT_USAGE_METRIC;
  const safeOcr = usageData?.ocr ?? DEFAULT_USAGE_METRIC;
  const safeStorage = usageData?.storage ?? DEFAULT_USAGE_METRIC;
  const safeAiRequests = usageData?.aiRequests ?? null;

  const invoicesPct = Number.isFinite(Number(safeInvoices?.percentage)) ? Number(safeInvoices.percentage) : 0;
  const usersPct = Number.isFinite(Number(safeUsers?.percentage)) ? Number(safeUsers.percentage) : 0;
  const ocrPct = Number.isFinite(Number(safeOcr?.percentage)) ? Number(safeOcr.percentage) : 0;
  const storagePct = Number.isFinite(Number(safeStorage?.percentage)) ? Number(safeStorage.percentage) : 0;
  const aiRequestsPct = Number.isFinite(Number(safeAiRequests?.percentage)) ? Number(safeAiRequests?.percentage ?? 0) : 0;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 text-right" dir="rtl">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            استهلاك الخطة والاشتراك (SaaS Usage & Metering)
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            متابعة دقيقة وحية لحدود الخطة المتاحة لشركتك مع حماية مفاصل العمليات من تجاوز الحصة.
          </p>
        </div>
        <button
          onClick={fetchUsage}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-700 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors self-start md:self-auto cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
          تحديث البيانات
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Plan Banner Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-[#061a14] border border-emerald-900/50 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="text-xs font-bold text-emerald-400 tracking-wider uppercase">الخطة الحالية المفعّلة</div>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-extrabold tracking-tight">{plan} PLAN</span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              نشط
            </span>
          </div>
          {usageData?.billingPeriodStart && usageData?.billingPeriodEnd && (
            <p className="text-xs text-slate-400 font-mono">
              دورة الفوترة: {new Date(usageData.billingPeriodStart).toLocaleDateString('ar-SA')} - {new Date(usageData.billingPeriodEnd).toLocaleDateString('ar-SA')}
            </p>
          )}
        </div>

        {/* Change Plan Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            disabled={updatingPlan || plan === 'FREE'}
            onClick={() => handlePlanChange('FREE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              plan === 'FREE'
                ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-900/40'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            مجانية (FREE)
          </button>
          <button
            disabled={updatingPlan || plan === 'PRO'}
            onClick={() => handlePlanChange('PRO')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              plan === 'PRO'
                ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-900/40'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            احترافية (PRO)
          </button>
          <button
            disabled={updatingPlan || plan === 'ENTERPRISE'}
            onClick={() => handlePlanChange('ENTERPRISE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              plan === 'ENTERPRISE'
                ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-900/40'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            شركات (ENTERPRISE)
          </button>
        </div>
      </div>

      {/* Metering Usage Grid */}
      {usageData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* 1. Invoices Metric */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-emerald-900/40 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">فواتير المبيعات الشهرية</h3>
                  <p className="text-xs text-slate-400">Invoices Per Month</p>
                </div>
              </div>
              {getStatusBadge(invoicesPct)}
            </div>

            <div className="flex items-baseline justify-between text-xs font-semibold">
              <span className="text-slate-300">
                المستغرق: <strong className="text-white text-base font-mono tabular-nums">{safeInvoices?.used ?? 0}</strong> / {safeInvoices?.limit === -1 ? 'غير محدود' : (safeInvoices?.limit ?? 0)}
              </span>
              <span className="text-emerald-400 font-mono tabular-nums">{safeInvoices?.limit === -1 ? '0%' : `${invoicesPct}%`}</span>
            </div>

            <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-500 ${getProgressColor(invoicesPct)}`}
                style={{ width: `${safeInvoices?.limit === -1 ? 0 : Math.min(100, Math.max(0, invoicesPct))}%` }}
              />
            </div>
          </div>

          {/* 2. Active Users Metric */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-emerald-900/40 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal-950 border border-teal-800 text-teal-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">المستخدمين النشطين</h3>
                  <p className="text-xs text-slate-400">Active Users Count</p>
                </div>
              </div>
              {getStatusBadge(usersPct)}
            </div>

            <div className="flex items-baseline justify-between text-xs font-semibold">
              <span className="text-slate-300">
                المستخدمين الحاليين: <strong className="text-white text-base font-mono tabular-nums">{safeUsers?.used ?? 0}</strong> / {safeUsers?.limit === -1 ? 'غير محدود' : (safeUsers?.limit ?? 0)}
              </span>
              <span className="text-teal-400 font-mono tabular-nums">{safeUsers?.limit === -1 ? '0%' : `${usersPct}%`}</span>
            </div>

            <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-500 ${getProgressColor(usersPct)}`}
                style={{ width: `${safeUsers?.limit === -1 ? 0 : Math.min(100, Math.max(0, usersPct))}%` }}
              />
            </div>
          </div>

          {/* 3. OCR Documents Metric */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-emerald-900/40 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-950 border border-amber-800 text-amber-400">
                  <ScrollText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">الفحص الضوئي (OCR)</h3>
                  <p className="text-xs text-slate-400">OCR Scans Per Month</p>
                </div>
              </div>
              {getStatusBadge(ocrPct)}
            </div>

            <div className="flex items-baseline justify-between text-xs font-semibold">
              <span className="text-slate-300">
                المستخدم: <strong className="text-white text-base font-mono tabular-nums">{safeOcr?.used ?? 0}</strong> / {safeOcr?.limit === -1 ? 'غير محدود' : (safeOcr?.limit ?? 0)}
              </span>
              <span className="text-amber-400 font-mono tabular-nums">{safeOcr?.limit === -1 ? '0%' : `${ocrPct}%`}</span>
            </div>

            <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-500 ${getProgressColor(ocrPct)}`}
                style={{ width: `${safeOcr?.limit === -1 ? 0 : Math.min(100, Math.max(0, ocrPct))}%` }}
              />
            </div>
          </div>

          {/* 4. Storage Bytes Metric */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-emerald-900/40 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-400">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">السعة التخزينية للمرفقات</h3>
                  <p className="text-xs text-slate-400">Storage Usage</p>
                </div>
              </div>
              {getStatusBadge(storagePct)}
            </div>

            <div className="flex items-baseline justify-between text-xs font-semibold">
              <span className="text-slate-300">
                المستخدم: <strong className="text-white text-base font-mono tabular-nums">{formatBytes(safeStorage?.usedBytes)}</strong> / {formatBytes(safeStorage?.limitBytes)}
              </span>
              <span className="text-emerald-400 font-mono tabular-nums">{safeStorage?.limitBytes === -1 ? '0%' : `${storagePct}%`}</span>
            </div>

            <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-500 ${getProgressColor(storagePct)}`}
                style={{ width: `${safeStorage?.limitBytes === -1 ? 0 : Math.min(100, Math.max(0, storagePct))}%` }}
              />
            </div>
          </div>

          {/* 5. AI Requests Metric */}
          {safeAiRequests && (
            <div className="p-5 rounded-2xl bg-slate-900 border border-emerald-900/40 shadow-xl space-y-3 md:col-span-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-400">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">استعلامات الذكاء الاصطناعي الشهرية</h3>
                    <p className="text-xs text-slate-400">AI Requests Per Month</p>
                  </div>
                </div>
                {getStatusBadge(aiRequestsPct)}
              </div>

              <div className="flex items-baseline justify-between text-xs font-semibold">
                <span className="text-slate-300">
                  المستغرق: <strong className="text-white text-base font-mono tabular-nums">{safeAiRequests?.used ?? 0}</strong> / {safeAiRequests?.limit === -1 ? 'غير محدود' : (safeAiRequests?.limit ?? 0)}
                </span>
                <span className="text-emerald-400 font-mono tabular-nums">{safeAiRequests?.limit === -1 ? '0%' : `${aiRequestsPct}%`}</span>
              </div>

              <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className={`h-full transition-all duration-500 ${getProgressColor(aiRequestsPct)}`}
                  style={{ width: `${safeAiRequests?.limit === -1 ? 0 : Math.min(100, Math.max(0, aiRequestsPct))}%` }}
                />
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
