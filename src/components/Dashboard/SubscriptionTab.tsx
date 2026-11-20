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
  plan: 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE';
  billingPeriodStart: string;
  billingPeriodEnd: string;
  invoices: UsageMetric;
  users: UsageMetric;
  ocr: UsageMetric;
  storage: UsageMetric;
  aiRequests?: UsageMetric;
}

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

      setUsageData(res.data);
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
    if (bytes === undefined || bytes === null || bytes === -1) return 'غير محدود';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const getStatusColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-[var(--md-error)] text-[var(--md-on-primary)]';
    if (percentage >= 90) return 'bg-[var(--md-warning)] text-[var(--md-on-primary)]';
    if (percentage >= 80) return 'bg-[var(--md-secondary)] text-[var(--md-on-primary)]';
    return 'bg-[var(--md-primary)] text-[var(--md-on-primary)]';
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-[var(--md-error)]';
    if (percentage >= 90) return 'bg-[var(--md-warning)]';
    if (percentage >= 80) return 'bg-[var(--md-secondary)]';
    return 'bg-[var(--md-primary)]';
  };

  const getStatusBadge = (percentage: number) => {
    if (percentage >= 100) return <span className="m3-badge m3-badge-error tabular-nums">تم تجاوز الحد (100%)</span>;
    if (percentage >= 90) return <span className="m3-badge m3-badge-warning tabular-nums">تحذير حرج (&gt;=90%)</span>;
    if (percentage >= 80) return <span className="m3-badge m3-badge-secondary tabular-nums">اقتراب من الحد (&gt;=80%)</span>;
    return <span className="m3-badge m3-badge-success">طبيعي</span>;
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center text-[var(--md-on-surface-variant)] gap-3">
        <RefreshCw className="w-5 h-5 animate-spin text-[var(--md-primary-text)]" />
        <span>جاري تحميل استهلاك الخطة والحدود...</span>
      </div>
    );
  }

  const plan = usageData?.plan || 'FREE';

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 text-right text-[var(--md-on-surface)]" dir="rtl">
      
      {/* Header Section */}
      <div className="m3-card-elevated p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[var(--md-on-surface)] flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[var(--md-primary-text)] shrink-0" />
            <span>استهلاك الخطة والاشتراك (SaaS Usage & Metering)</span>
          </h1>
          <p className="text-xs sm:text-sm text-[var(--md-on-surface-variant)] mt-1">
            متابعة دقيقة وحية لحدود الخطة المتاحة لشركتك مع حماية مفاصل العمليات من تجاوز الحصة.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchUsage}
          className="m3-btn-outlined !min-h-[36px] text-xs self-start md:self-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--md-primary)]"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[var(--md-primary-text)]" />
          <span>تحديث البيانات</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[var(--md-error-container)] border border-[var(--md-error)]/40 text-[var(--md-on-error-container)] text-sm flex items-center gap-2 font-semibold">
          <AlertTriangle className="w-5 h-5 shrink-0 text-[var(--md-error)]" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-[var(--md-success-container)] border border-[var(--md-success)]/40 text-[var(--md-on-success-container)] text-sm flex items-center gap-2 font-semibold">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-[var(--md-success)]" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Plan Banner Card */}
      <div className="m3-card-elevated p-6 border-[var(--md-primary)]/35 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="text-xs font-bold text-[var(--md-primary-text)] tracking-wider uppercase">الخطة الحالية المفعّلة</div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-3xl font-extrabold tracking-tight text-[var(--md-on-surface)]">{plan} PLAN</span>
            <span className="m3-badge m3-badge-success">
              نشط
            </span>
          </div>
          {usageData?.billingPeriodStart && usageData?.billingPeriodEnd && (
            <p className="text-xs text-[var(--md-on-surface-variant)] font-mono tabular-nums">
              دورة الفوترة: {new Date(usageData.billingPeriodStart).toLocaleDateString('ar-SA')} - {new Date(usageData.billingPeriodEnd).toLocaleDateString('ar-SA')}
            </p>
          )}
        </div>

        {/* Change Plan Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={updatingPlan || plan === 'FREE'}
            onClick={() => handlePlanChange('FREE')}
            className={`!min-h-[36px] !px-3.5 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--md-primary)] ${
              plan === 'FREE' ? 'm3-btn-primary' : 'm3-btn-outlined'
            }`}
          >
            مجانية (FREE)
          </button>
          <button
            type="button"
            disabled={updatingPlan || plan === 'PRO'}
            onClick={() => handlePlanChange('PRO')}
            className={`!min-h-[36px] !px-3.5 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--md-primary)] ${
              plan === 'PRO' ? 'm3-btn-primary' : 'm3-btn-outlined'
            }`}
          >
            احترافية (PRO)
          </button>
          <button
            type="button"
            disabled={updatingPlan || plan === 'ENTERPRISE'}
            onClick={() => handlePlanChange('ENTERPRISE')}
            className={`!min-h-[36px] !px-3.5 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--md-primary)] ${
              plan === 'ENTERPRISE' ? 'm3-btn-primary' : 'm3-btn-outlined'
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
          <div className="m3-card p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[var(--md-primary-container)] border border-[var(--md-primary)]/30 text-[var(--md-on-primary-container)]">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[var(--md-on-surface)] text-sm">فواتير المبيعات الشهرية</h3>
                  <p className="text-xs text-[var(--md-on-surface-variant)]">Invoices Per Month</p>
                </div>
              </div>
              {getStatusBadge(usageData.invoices.percentage)}
            </div>

            <div className="flex items-baseline justify-between text-xs font-semibold">
              <span className="text-[var(--md-on-surface-variant)]">
                المستغرق: <strong className="text-[var(--md-on-surface)] text-base font-mono tabular-nums">{usageData.invoices.used}</strong> / <span className="font-mono tabular-nums">{usageData.invoices.limit === -1 ? 'غير محدود' : usageData.invoices.limit}</span>
              </span>
              <span className="text-[var(--md-primary-text)] font-mono tabular-nums font-bold">{usageData.invoices.limit === -1 ? '0%' : `${usageData.invoices.percentage}%`}</span>
            </div>

            <div className="w-full h-2.5 bg-[var(--md-surface-container-high)] rounded-full overflow-hidden border border-[var(--md-outline-variant)]">
              <div
                className={`h-full transition-all duration-500 ${getProgressColor(usageData.invoices.percentage)}`}
                style={{ width: `${usageData.invoices.limit === -1 ? 0 : Math.min(100, usageData.invoices.percentage)}%` }}
              />
            </div>
          </div>

          {/* 2. Active Users Metric */}
          <div className="m3-card p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[var(--md-info-container)] border border-[var(--md-info)]/30 text-[var(--md-on-info-container)]">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[var(--md-on-surface)] text-sm">المستخدمين النشطين</h3>
                  <p className="text-xs text-[var(--md-on-surface-variant)]">Active Users Count</p>
                </div>
              </div>
              {getStatusBadge(usageData.users.percentage)}
            </div>

            <div className="flex items-baseline justify-between text-xs font-semibold">
              <span className="text-[var(--md-on-surface-variant)]">
                المستخدمين الحاليين: <strong className="text-[var(--md-on-surface)] text-base font-mono tabular-nums">{usageData.users.used}</strong> / <span className="font-mono tabular-nums">{usageData.users.limit === -1 ? 'غير محدود' : usageData.users.limit}</span>
              </span>
              <span className="text-[var(--md-info)] font-mono tabular-nums font-bold">{usageData.users.limit === -1 ? '0%' : `${usageData.users.percentage}%`}</span>
            </div>

            <div className="w-full h-2.5 bg-[var(--md-surface-container-high)] rounded-full overflow-hidden border border-[var(--md-outline-variant)]">
              <div
                className={`h-full transition-all duration-500 ${getProgressColor(usageData.users.percentage)}`}
                style={{ width: `${usageData.users.limit === -1 ? 0 : Math.min(100, usageData.users.percentage)}%` }}
              />
            </div>
          </div>

          {/* 3. OCR Documents Metric */}
          <div className="m3-card p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[var(--md-secondary-container)] border border-[var(--md-secondary)]/30 text-[var(--md-on-secondary-container)]">
                  <ScrollText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[var(--md-on-surface)] text-sm">الفحص الضوئي (OCR)</h3>
                  <p className="text-xs text-[var(--md-on-surface-variant)]">OCR Scans Per Month</p>
                </div>
              </div>
              {getStatusBadge(usageData.ocr.percentage)}
            </div>

            <div className="flex items-baseline justify-between text-xs font-semibold">
              <span className="text-[var(--md-on-surface-variant)]">
                المستخدم: <strong className="text-[var(--md-on-surface)] text-base font-mono tabular-nums">{usageData.ocr.used}</strong> / <span className="font-mono tabular-nums">{usageData.ocr.limit === -1 ? 'غير محدود' : usageData.ocr.limit}</span>
              </span>
              <span className="text-[var(--md-secondary)] font-mono tabular-nums font-bold">{usageData.ocr.limit === -1 ? '0%' : `${usageData.ocr.percentage}%`}</span>
            </div>

            <div className="w-full h-2.5 bg-[var(--md-surface-container-high)] rounded-full overflow-hidden border border-[var(--md-outline-variant)]">
              <div
                className={`h-full transition-all duration-500 ${getProgressColor(usageData.ocr.percentage)}`}
                style={{ width: `${usageData.ocr.limit === -1 ? 0 : Math.min(100, usageData.ocr.percentage)}%` }}
              />
            </div>
          </div>

          {/* 4. Storage Bytes Metric */}
          <div className="m3-card p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[var(--md-success-container)] border border-[var(--md-success)]/30 text-[var(--md-on-success-container)]">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[var(--md-on-surface)] text-sm">السعة التخزينية للمرفقات</h3>
                  <p className="text-xs text-[var(--md-on-surface-variant)]">Storage Usage</p>
                </div>
              </div>
              {getStatusBadge(usageData.storage.percentage)}
            </div>

            <div className="flex items-baseline justify-between text-xs font-semibold">
              <span className="text-[var(--md-on-surface-variant)]">
                المستخدم: <strong className="text-[var(--md-on-surface)] text-base font-mono tabular-nums">{formatBytes(usageData.storage.usedBytes)}</strong> / <span className="font-mono tabular-nums">{formatBytes(usageData.storage.limitBytes)}</span>
              </span>
              <span className="text-[var(--md-success)] font-mono tabular-nums font-bold">{usageData.storage.limitBytes === -1 ? '0%' : `${usageData.storage.percentage}%`}</span>
            </div>

            <div className="w-full h-2.5 bg-[var(--md-surface-container-high)] rounded-full overflow-hidden border border-[var(--md-outline-variant)]">
              <div
                className={`h-full transition-all duration-500 ${getProgressColor(usageData.storage.percentage)}`}
                style={{ width: `${usageData.storage.limitBytes === -1 ? 0 : Math.min(100, usageData.storage.percentage)}%` }}
              />
            </div>
          </div>

          {/* 5. AI Requests Metric */}
          {usageData.aiRequests && (
            <div className="m3-card p-5 space-y-3 md:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[var(--md-primary-container)] border border-[var(--md-primary)]/30 text-[var(--md-on-primary-container)]">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[var(--md-on-surface)] text-sm">استعلامات الذكاء الاصطناعي الشهرية</h3>
                    <p className="text-xs text-[var(--md-on-surface-variant)]">AI Requests Per Month</p>
                  </div>
                </div>
                {getStatusBadge(usageData.aiRequests.percentage)}
              </div>

              <div className="flex items-baseline justify-between text-xs font-semibold">
                <span className="text-[var(--md-on-surface-variant)]">
                  المستغرق: <strong className="text-[var(--md-on-surface)] text-base font-mono tabular-nums">{usageData.aiRequests.used}</strong> / <span className="font-mono tabular-nums">{usageData.aiRequests.limit === -1 ? 'غير محدود' : usageData.aiRequests.limit}</span>
                </span>
                <span className="text-[var(--md-primary-text)] font-mono tabular-nums font-bold">{usageData.aiRequests.limit === -1 ? '0%' : `${usageData.aiRequests.percentage}%`}</span>
              </div>

              <div className="w-full h-2.5 bg-[var(--md-surface-container-high)] rounded-full overflow-hidden border border-[var(--md-outline-variant)]">
                <div
                  className={`h-full transition-all duration-500 ${getProgressColor(usageData.aiRequests.percentage)}`}
                  style={{ width: `${usageData.aiRequests.limit === -1 ? 0 : Math.min(100, usageData.aiRequests.percentage)}%` }}
                />
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
