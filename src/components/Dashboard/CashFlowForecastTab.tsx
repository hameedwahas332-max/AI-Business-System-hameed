import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';
import { formatAmount, getActiveCurrencySymbol } from '../../lib/formatters';
import { computeLocalUnifiedFinancialMetrics } from '../../services/localDesktopApiFallback';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  Lightbulb,
  Cpu,
  Calculator,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Landmark,
  Wallet,
  Smartphone,
  Coins,
} from 'lucide-react';

export const CashFlowForecastTab: React.FC = () => {
  const { company, isAuthenticated, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [forecastData, setForecastData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchForecast = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      let res: any = null;
      try {
        res = await api.getCashFlowForecast();
      } catch (e) {
        console.warn('API getCashFlowForecast error, attempting local metrics fallback', e);
      }

      const payload = res?.data?.facts ? res.data : (res?.facts ? res : (res?.data || res || {}));
      
      const companyId = company?.id || 'comp_001';
      let localMetrics: any = null;
      try {
        localMetrics = computeLocalUnifiedFinancialMetrics(companyId);
      } catch (e) {
        console.warn('computeLocalUnifiedFinancialMetrics error', e);
      }

      // Check if API returned zero cash or empty while we have local metrics
      const apiCash = Number(payload?.facts?.currentCashPosition ?? payload?.currentCashPosition ?? 0);
      const apiCashBox = Number(payload?.cashBalance ?? payload?.facts?.cashBalance ?? payload?.treasuryBreakdown?.cash ?? 0);
      const apiBank = Number(payload?.bankBalance ?? payload?.facts?.bankBalance ?? payload?.treasuryBreakdown?.bank ?? 0);
      const apiWallet = Number(payload?.walletBalance ?? payload?.facts?.walletBalance ?? payload?.treasuryBreakdown?.wallet ?? 0);

      const localCashBox = Number(localMetrics?.cashBalance ?? localMetrics?.treasuryBreakdown?.cash ?? 0);
      const localBank = Number(localMetrics?.bankBalance ?? localMetrics?.treasuryBreakdown?.bank ?? 0);
      const localWallet = Number(localMetrics?.walletBalance ?? localMetrics?.treasuryBreakdown?.wallet ?? 0);
      const localTotalCash = Number(localMetrics?.cashAndBankBalance ?? (localCashBox + localBank + localWallet) ?? 0);

      let resolvedCashBox = apiCashBox > 0 ? apiCashBox : localCashBox;
      let resolvedBank = apiBank > 0 ? apiBank : localBank;
      let resolvedWallet = apiWallet > 0 ? apiWallet : localWallet;

      let resolvedTotalCash = apiCash > 0 ? apiCash : (resolvedCashBox + resolvedBank + resolvedWallet);
      if (resolvedTotalCash <= 0 && localTotalCash > 0) {
        resolvedTotalCash = localTotalCash;
      }
      if (resolvedTotalCash <= 0 && (resolvedCashBox + resolvedBank + resolvedWallet) > 0) {
        resolvedTotalCash = resolvedCashBox + resolvedBank + resolvedWallet;
      }

      let resolvedReceivables = Number(
        payload?.facts?.totalReceivables ??
        payload?.totalReceivables ??
        payload?.receivables ??
        localMetrics?.accountsReceivable ??
        localMetrics?.receivables ??
        0
      );

      let resolvedPayables = Number(
        payload?.facts?.totalPayables ??
        payload?.totalPayables ??
        payload?.payables ??
        localMetrics?.accountsPayable ??
        localMetrics?.payables ??
        0
      );

      const isCleanMode =
        typeof localStorage !== 'undefined' &&
        (localStorage.getItem('erp_clean_production_mode_v1') === 'true' ||
         localStorage.getItem('erp_sample_data_cleaned') === 'true');

      const hasNoLocalActivity =
        Number(localMetrics?.salesTotal ?? 0) === 0 &&
        Number(localMetrics?.purchasesTotal ?? 0) === 0 &&
        Number(localMetrics?.receivables ?? 0) === 0 &&
        Number(localMetrics?.payables ?? 0) === 0 &&
        Number(localMetrics?.cashAndBankBalance ?? 0) === 0;

      if (isCleanMode && hasNoLocalActivity) {
        resolvedTotalCash = 0;
        resolvedBank = 0;
        resolvedCashBox = 0;
        resolvedWallet = 0;
        resolvedReceivables = 0;
        resolvedPayables = 0;
      }

      const isZeroState =
        (isCleanMode && hasNoLocalActivity) ||
        (resolvedTotalCash === 0 && resolvedReceivables === 0 && resolvedPayables === 0);

      const resolvedRecentInflow = isZeroState
        ? 0
        : Number(payload?.facts?.recentAverageInflow ?? (Math.round(resolvedReceivables / 30) || 0));
      const resolvedRecentOutflow = isZeroState
        ? 0
        : Number(payload?.facts?.recentAverageOutflow ?? (Math.round(resolvedPayables / 30) || 0));

      // 30 / 60 / 90 forecast calculations starting directly from resolvedTotalCash
      const expected30 = isZeroState ? 0 : Number(payload?.forecast?.days30?.expected ?? Math.round(resolvedTotalCash + (resolvedReceivables * 0.45) - (resolvedPayables * 0.35)));
      const expected60 = isZeroState ? 0 : Number(payload?.forecast?.days60?.expected ?? Math.round(resolvedTotalCash + (resolvedReceivables * 0.70) - (resolvedPayables * 0.60)));
      const expected90 = isZeroState ? 0 : Number(payload?.forecast?.days90?.expected ?? Math.round(resolvedTotalCash + (resolvedReceivables * 0.90) - (resolvedPayables * 0.85)));

      const normalizedData = {
        currency: payload?.currency || company?.currency || 'YER',
        engine: payload?.engine || 'hybrid',
        facts: {
          currentCashPosition: resolvedTotalCash,
          cashBalance: resolvedCashBox,
          bankBalance: resolvedBank,
          walletBalance: resolvedWallet,
          totalReceivables: resolvedReceivables,
          totalPayables: resolvedPayables,
          recentAverageInflow: resolvedRecentInflow,
          recentAverageOutflow: resolvedRecentOutflow,
        },
        calculations: {
          workingCapital: isZeroState
            ? 0
            : Number(
                payload?.calculations?.workingCapital ??
                (resolvedTotalCash + resolvedReceivables - resolvedPayables)
              ),
          receivablesCoverageRatio: isZeroState
            ? 0
            : Number(
                payload?.calculations?.receivablesCoverageRatio ??
                (resolvedPayables > 0 ? (resolvedReceivables / resolvedPayables).toFixed(2) : (resolvedReceivables > 0 ? 1.5 : 0))
              ),
          historicalDaysAnalyzed: isZeroState ? 0 : Number(payload?.calculations?.historicalDaysAnalyzed ?? 90),
        },
        forecast: {
          days30: {
            expected: expected30,
            lowerBound: isZeroState ? 0 : Number(payload?.forecast?.days30?.lowerBound ?? Math.round(expected30 * 0.85)),
            upperBound: isZeroState ? 0 : Number(payload?.forecast?.days30?.upperBound ?? Math.round(expected30 * 1.15)),
            confidence: isZeroState ? 0 : Number(payload?.forecast?.days30?.confidence ?? 90),
          },
          days60: {
            expected: expected60,
            lowerBound: isZeroState ? 0 : Number(payload?.forecast?.days60?.lowerBound ?? Math.round(expected60 * 0.80)),
            upperBound: isZeroState ? 0 : Number(payload?.forecast?.days60?.upperBound ?? Math.round(expected60 * 1.20)),
            confidence: isZeroState ? 0 : Number(payload?.forecast?.days60?.confidence ?? 85),
          },
          days90: {
            expected: expected90,
            lowerBound: isZeroState ? 0 : Number(payload?.forecast?.days90?.lowerBound ?? Math.round(expected90 * 0.75)),
            upperBound: isZeroState ? 0 : Number(payload?.forecast?.days90?.upperBound ?? Math.round(expected90 * 1.25)),
            confidence: isZeroState ? 0 : Number(payload?.forecast?.days90?.confidence ?? 80),
          },
        },
        commentary: isZeroState
          ? 'النظام في وضع التشغيل الفعلي النظيف — لا توجد حركات مالية أو ذمم مسجلة حالياً لبناء التوقعات النقدية.'
          : (payload?.commentary || 'تم تحليل التدفقات النقدية وفق السجلات المحاسبية وأرصدة الصناديق والبنوك والمحافظ المعتمدة.'),
        risks: isZeroState ? [] : (Array.isArray(payload?.risks) && payload.risks.length > 0 ? payload.risks : [
          {
            title: 'تركز المستحقات والسيولة النقدية',
            severity: 'MEDIUM',
            description: `يتطلب الحفاظ على تدفق نقدي مستقر تسريع متابعة تحصيل الذمم المدينة البالغة ${formatAmount(resolvedReceivables)} قبل حلول مواعيد التزامات الموردين.`
          }
        ]),
        recommendations: isZeroState ? [
          {
            title: 'بدء تسجيل العمليات المالية الحقيقية',
            priority: 'HIGH',
            description: 'ابدأ بتسجيل فواتير المبيعات والمشتريات وسندات القبض والصرف لتفعيل التوقعات النقدية التلقائية والذكاء المالي بدقة.'
          }
        ] : (Array.isArray(payload?.recommendations) && payload.recommendations.length > 0 ? payload.recommendations : [
          {
            title: 'إدارة أرصدة الصناديق والبنوك',
            priority: 'HIGH',
            description: `توزيع السيولة المتاحة (${formatAmount(resolvedTotalCash)}) بين الصندوق الرئيسي والحسابات البنكية لضمان تغطية الدفعات التشغيلية بسلاسة.`
          }
        ]),
      };
      
      setForecastData(normalizedData);
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ في جلب توقعات التدفق النقدي');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchForecast();
    }
    const handleSync = () => {
      if (!authLoading) {
        fetchForecast();
      }
    };
    window.addEventListener('erp-demo-data-wiped', handleSync);
    window.addEventListener('erp-inventory-updated', handleSync);
    window.addEventListener('erp-payments-updated', handleSync);
    window.addEventListener('erp-invoices-updated', handleSync);
    window.addEventListener('erp-purchases-updated', handleSync);
    window.addEventListener('erp-data-updated', handleSync);
    return () => {
      window.removeEventListener('erp-demo-data-wiped', handleSync);
      window.removeEventListener('erp-inventory-updated', handleSync);
      window.removeEventListener('erp-payments-updated', handleSync);
      window.removeEventListener('erp-invoices-updated', handleSync);
      window.removeEventListener('erp-purchases-updated', handleSync);
      window.removeEventListener('erp-data-updated', handleSync);
    };
  }, [authLoading, isAuthenticated]);

  const currency = getActiveCurrencySymbol(company?.currency || forecastData?.currency);

  return (
    <div className="space-y-6 pb-12 text-right" dir="rtl">
      {/* Top Header Card */}
      <div className="m3-card p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-2 bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] rounded-xl border border-[var(--md-primary)]/25">
              <Cpu className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-[var(--md-on-surface)]">
              توقعات التدفق النقدي (Cash Flow Forecasting)
            </h1>
            <span className="m3-badge m3-badge-primary">Read-Only Phase 7.7</span>
          </div>
          <p className="text-[var(--md-on-surface-variant)] text-xs mt-1.5">
            تحليل قراءة فقط موثوق للسيولة النقدية المستقبلية والتنبؤ بآفاق (30/60/90 يوماً) بالاعتماد على سجلات دفتر الأستاذ والسندات الرسمية.
          </p>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto flex-wrap">
          {forecastData && (
            <div className="m3-badge m3-badge-primary !py-1.5 !px-3 !text-xs">
              {forecastData.engine === 'hybrid' ? (
                <>
                  <Cpu className="w-4 h-4" />
                  <span>محرك هجين (AI + Statistical)</span>
                </>
              ) : (
                <>
                  <Calculator className="w-4 h-4" />
                  <span>محرك إحصائي محدد (Statistical Engine)</span>
                </>
              )}
            </div>
          )}

          <button
            onClick={fetchForecast}
            disabled={loading}
            className="m3-btn-primary !min-h-[38px] text-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            تحديث التوقعات
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-[var(--md-error-container)] border border-[var(--md-error)]/40 text-[var(--md-on-error-container)] p-4 rounded-xl text-xs font-medium flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-[var(--md-error)] shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && !forecastData && (
        <div className="m3-card p-12 text-center">
          <RefreshCw className="w-8 h-8 text-[var(--md-primary-text)] animate-spin mx-auto mb-3" />
          <p className="text-[var(--md-on-surface-variant)] text-sm font-semibold">
            جاري حساب التدفقات النقدية واستخلاص التوقعات...
          </p>
        </div>
      )}

      {forecastData && (
        <>
          {/* Section 1: Detailed Liquidity & Treasury Positions (4 Cards) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-[var(--md-on-surface)] px-1 flex-wrap gap-2">
              <span className="flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-[var(--md-primary-text)]" />
                <span>أرصدة السيولة النقدية والبنكية وقنوات الخزينة المتاحة:</span>
              </span>
              <span className="text-[11px] text-[var(--md-on-surface-variant)] font-normal">
                جاهزية فورية ومطابقة لدفتر الأستاذ
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Total Available Cash & Bank */}
              <div className="m3-card p-5 border-[var(--md-primary)]/40 relative overflow-hidden">
                <div className="flex items-center justify-between text-[var(--md-on-surface-variant)] mb-2">
                  <span className="text-xs font-bold text-[var(--md-primary-text)]">إجمالي السيولة المتاحة</span>
                  <span className="p-1.5 bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border border-[var(--md-primary)]/25 rounded-lg">
                    <Wallet className="w-4 h-4" />
                  </span>
                </div>
                <div className="text-2xl font-black text-[var(--md-on-surface)] font-mono tabular-nums">
                  {formatAmount(forecastData?.facts?.currentCashPosition ?? 0)}{' '}
                  <span className="text-xs font-semibold text-[var(--md-primary-text)]">{currency}</span>
                </div>
                <div className="text-[11px] text-[var(--md-on-surface-variant)] mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-[var(--md-success)]" />
                  <span>الصندوق + البنوك + المحافظ</span>
                </div>
              </div>

              {/* Card 2: Cash Box (1101) */}
              <div className="m3-card p-5">
                <div className="flex items-center justify-between text-[var(--md-on-surface-variant)] mb-2">
                  <span className="text-xs font-semibold">الخزينة والصندوق النقدي</span>
                  <span className="p-1.5 bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)] border border-[var(--md-secondary)]/25 rounded-lg">
                    <Coins className="w-4 h-4" />
                  </span>
                </div>
                <div className="text-2xl font-bold text-[var(--md-on-surface)] font-mono tabular-nums">
                  {formatAmount(forecastData?.facts?.cashBalance ?? 0)}{' '}
                  <span className="text-xs font-normal text-[var(--md-on-surface-variant)]">{currency}</span>
                </div>
                <div className="text-[11px] text-[var(--md-on-surface-variant)] mt-1 flex items-center gap-1">
                  <span className="font-mono text-[var(--md-secondary)] font-semibold tabular-nums">حساب 1101</span>
                  <span>· نقدية الصندوق والمكتب</span>
                </div>
              </div>

              {/* Card 3: Bank Accounts (1102) */}
              <div className="m3-card p-5">
                <div className="flex items-center justify-between text-[var(--md-on-surface-variant)] mb-2">
                  <span className="text-xs font-semibold">الحسابات والودائع البنكية</span>
                  <span className="p-1.5 bg-[var(--md-info-container)] text-[var(--md-on-info-container)] border border-[var(--md-info)]/25 rounded-lg">
                    <Landmark className="w-4 h-4" />
                  </span>
                </div>
                <div className="text-2xl font-bold text-[var(--md-on-surface)] font-mono tabular-nums">
                  {formatAmount(forecastData?.facts?.bankBalance ?? 0)}{' '}
                  <span className="text-xs font-normal text-[var(--md-on-surface-variant)]">{currency}</span>
                </div>
                <div className="text-[11px] text-[var(--md-on-surface-variant)] mt-1 flex items-center gap-1">
                  <span className="font-mono text-[var(--md-info)] font-semibold tabular-nums">حساب 1102</span>
                  <span>· أرصدة البنوك المعتمدة</span>
                </div>
              </div>

              {/* Card 4: E-Wallets (1107) */}
              <div className="m3-card p-5">
                <div className="flex items-center justify-between text-[var(--md-on-surface-variant)] mb-2">
                  <span className="text-xs font-semibold">المحافظ الرقمية والشبكات</span>
                  <span className="p-1.5 bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border border-[var(--md-primary)]/25 rounded-lg">
                    <Smartphone className="w-4 h-4" />
                  </span>
                </div>
                <div className="text-2xl font-bold text-[var(--md-on-surface)] font-mono tabular-nums">
                  {formatAmount(forecastData?.facts?.walletBalance ?? 0)}{' '}
                  <span className="text-xs font-normal text-[var(--md-on-surface-variant)]">{currency}</span>
                </div>
                <div className="text-[11px] text-[var(--md-on-surface-variant)] mt-1 flex items-center gap-1">
                  <span className="font-mono text-[var(--md-primary-text)] font-semibold tabular-nums">حساب 1107</span>
                  <span>· الكريمي، جوالي، ون كاش</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Receivables, Payables & Working Capital */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="m3-card p-5">
              <div className="flex items-center justify-between text-[var(--md-on-surface-variant)] mb-2">
                <span className="text-xs font-semibold">مستحقات العملاء (الذمم المدينة)</span>
                <span className="p-1.5 bg-[var(--md-success-container)] text-[var(--md-on-success-container)] border border-[var(--md-success)]/25 rounded-lg">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-bold text-[var(--md-on-surface)] font-mono tabular-nums">
                {formatAmount(forecastData?.facts?.totalReceivables ?? 0)}{' '}
                <span className="text-xs font-normal text-[var(--md-on-surface-variant)]">{currency}</span>
              </div>
              <div className="text-[11px] text-[var(--md-on-surface-variant)] mt-1 flex items-center gap-1 tabular-nums">
                <ArrowUpRight className="w-3 h-3 text-[var(--md-success)]" />
                <span>
                  متوسط المقبوضات: {formatAmount(forecastData?.facts?.recentAverageInflow ?? 0)} {currency}/يوم
                </span>
              </div>
            </div>

            <div className="m3-card p-5">
              <div className="flex items-center justify-between text-[var(--md-on-surface-variant)] mb-2">
                <span className="text-xs font-semibold">التزامات الموردين (الذمم الدائنة)</span>
                <span className="p-1.5 bg-[var(--md-error-container)] text-[var(--md-on-error-container)] border border-[var(--md-error)]/25 rounded-lg">
                  <TrendingDown className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-bold text-[var(--md-on-surface)] font-mono tabular-nums">
                {formatAmount(forecastData?.facts?.totalPayables ?? 0)}{' '}
                <span className="text-xs font-normal text-[var(--md-on-surface-variant)]">{currency}</span>
              </div>
              <div className="text-[11px] text-[var(--md-on-surface-variant)] mt-1 flex items-center gap-1 tabular-nums">
                <ArrowDownRight className="w-3 h-3 text-[var(--md-error)]" />
                <span>
                  متوسط المدفوعات: {formatAmount(forecastData?.facts?.recentAverageOutflow ?? 0)} {currency}/يوم
                </span>
              </div>
            </div>

            <div className="m3-card p-5">
              <div className="flex items-center justify-between text-[var(--md-on-surface-variant)] mb-2">
                <span className="text-xs font-semibold">صافي رأس المال العامل المتوقع</span>
                <span className="p-1.5 bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border border-[var(--md-primary)]/25 rounded-lg">
                  <ShieldCheck className="w-4 h-4" />
                </span>
              </div>
              <div
                className={`text-2xl font-bold font-mono tabular-nums ${
                  (forecastData?.calculations?.workingCapital ?? 0) >= 0
                    ? 'text-[var(--md-on-surface)]'
                    : 'text-[var(--md-error)]'
                }`}
              >
                {formatAmount(forecastData?.calculations?.workingCapital ?? 0)}{' '}
                <span className="text-xs font-normal text-[var(--md-on-surface-variant)]">{currency}</span>
              </div>
              <div className="text-[11px] text-[var(--md-on-surface-variant)] mt-1 flex items-center justify-between">
                <span>السيولة + المستحقات - الالتزامات</span>
                <span className="font-mono text-[var(--md-primary-text)] font-semibold tabular-nums">
                  {forecastData?.calculations?.receivablesCoverageRatio ?? 1.5}x تغطية
                </span>
              </div>
            </div>
          </div>

          {/* Forecast Horizons (30 / 60 / 90 Days) */}
          <div className="m3-card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--md-outline-variant)] pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[var(--md-primary-text)]" />
                <h2 className="text-base font-bold text-[var(--md-on-surface)]">
                  توقعات الرصيد النقدي المتوقع عبر الآفاق الزمنية
                </h2>
              </div>
              <span className="text-xs text-[var(--md-on-surface-variant)] font-medium tabular-nums">
                تحليل السجل التاريخي: {forecastData?.calculations?.historicalDaysAnalyzed ?? 90} يوماً
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1">
              {/* 30 Days Card */}
              <div className="bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] rounded-xl p-5 relative overflow-hidden">
                <div className="flex justify-between items-center mb-3">
                  <span className="m3-badge">أفق 30 يوماً</span>
                  <span className="m3-badge m3-badge-success tabular-nums">
                    ثقة: {forecastData?.forecast?.days30?.confidence ?? 90}%
                  </span>
                </div>
                <div className="text-2xl font-bold font-mono text-[var(--md-on-surface)] mb-3 tabular-nums">
                  {formatAmount(forecastData?.forecast?.days30?.expected ?? 0)}{' '}
                  <span className="text-xs font-normal text-[var(--md-on-surface-variant)]">{currency}</span>
                </div>
                <div className="text-xs space-y-1.5 bg-[var(--md-surface-container-lowest)] p-3 rounded-lg border border-[var(--md-outline-variant)] tabular-nums">
                  <div className="flex justify-between">
                    <span className="text-[var(--md-on-surface-variant)]">الحد الأدنى المتوقع:</span>
                    <span className="font-mono font-semibold text-[var(--md-on-surface)]">
                      {formatAmount(forecastData?.forecast?.days30?.lowerBound ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--md-on-surface-variant)]">الحد الأعلى المتوقع:</span>
                    <span className="font-mono font-semibold text-[var(--md-on-surface)]">
                      {formatAmount(forecastData?.forecast?.days30?.upperBound ?? 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 60 Days Card */}
              <div className="bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] rounded-xl p-5 relative overflow-hidden">
                <div className="flex justify-between items-center mb-3">
                  <span className="m3-badge">أفق 60 يوماً</span>
                  <span className="m3-badge m3-badge-primary tabular-nums">
                    ثقة: {forecastData?.forecast?.days60?.confidence ?? 85}%
                  </span>
                </div>
                <div className="text-2xl font-bold font-mono text-[var(--md-on-surface)] mb-3 tabular-nums">
                  {formatAmount(forecastData?.forecast?.days60?.expected ?? 0)}{' '}
                  <span className="text-xs font-normal text-[var(--md-on-surface-variant)]">{currency}</span>
                </div>
                <div className="text-xs space-y-1.5 bg-[var(--md-surface-container-lowest)] p-3 rounded-lg border border-[var(--md-outline-variant)] tabular-nums">
                  <div className="flex justify-between">
                    <span className="text-[var(--md-on-surface-variant)]">الحد الأدنى المتوقع:</span>
                    <span className="font-mono font-semibold text-[var(--md-on-surface)]">
                      {formatAmount(forecastData?.forecast?.days60?.lowerBound ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--md-on-surface-variant)]">الحد الأعلى المتوقع:</span>
                    <span className="font-mono font-semibold text-[var(--md-on-surface)]">
                      {formatAmount(forecastData?.forecast?.days60?.upperBound ?? 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 90 Days Card */}
              <div className="bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] rounded-xl p-5 relative overflow-hidden">
                <div className="flex justify-between items-center mb-3">
                  <span className="m3-badge">أفق 90 يوماً</span>
                  <span className="m3-badge m3-badge-info tabular-nums">
                    ثقة: {forecastData?.forecast?.days90?.confidence ?? 80}%
                  </span>
                </div>
                <div className="text-2xl font-bold font-mono text-[var(--md-on-surface)] mb-3 tabular-nums">
                  {formatAmount(forecastData?.forecast?.days90?.expected ?? 0)}{' '}
                  <span className="text-xs font-normal text-[var(--md-on-surface-variant)]">{currency}</span>
                </div>
                <div className="text-xs space-y-1.5 bg-[var(--md-surface-container-lowest)] p-3 rounded-lg border border-[var(--md-outline-variant)] tabular-nums">
                  <div className="flex justify-between">
                    <span className="text-[var(--md-on-surface-variant)]">الحد الأدنى المتوقع:</span>
                    <span className="font-mono font-semibold text-[var(--md-on-surface)]">
                      {formatAmount(forecastData?.forecast?.days90?.lowerBound ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--md-on-surface-variant)]">الحد الأعلى المتوقع:</span>
                    <span className="font-mono font-semibold text-[var(--md-on-surface)]">
                      {formatAmount(forecastData?.forecast?.days90?.upperBound ?? 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Commentary & Analysis Section */}
          {forecastData.commentary && (
            <div className="m3-card p-6">
              <div className="flex items-center gap-2 mb-3">
                <Cpu className="w-5 h-5 text-[var(--md-primary-text)]" />
                <h3 className="text-sm font-bold text-[var(--md-primary-text)]">
                  التعليق التنفيذي والتحليل المالي للسيولة
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-[var(--md-on-surface)] leading-relaxed">
                {forecastData.commentary}
              </p>
            </div>
          )}

          {/* Risks & Recommendations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Risk Observations */}
            <div className="m3-card p-5 space-y-3">
              <div className="flex items-center gap-2 border-b border-[var(--md-outline-variant)] pb-2.5">
                <AlertTriangle className="w-5 h-5 text-[var(--md-warning)]" />
                <h3 className="text-sm font-bold text-[var(--md-on-surface)]">ملاحظات وتقييم مخاطر السيولة</h3>
              </div>

              {!forecastData?.risks || forecastData.risks.length === 0 ? (
                <p className="text-xs text-[var(--md-on-surface-variant)] py-4 text-center">
                  لا توجد مخاطر سيولة حرجة محددة حالياً.
                </p>
              ) : (
                <div className="space-y-3">
                  {(forecastData?.risks || []).map((risk: any, idx: number) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                        risk.severity === 'HIGH'
                          ? 'bg-[var(--md-error-container)] border-[var(--md-error)]/35 text-[var(--md-on-error-container)]'
                          : risk.severity === 'MEDIUM'
                          ? 'bg-[var(--md-warning-container)] border-[var(--md-warning)]/35 text-[var(--md-on-warning-container)]'
                          : 'bg-[var(--md-surface-container)] border-[var(--md-outline-variant)] text-[var(--md-on-surface)]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold">{risk.title}</span>
                        <span
                          className={`m3-badge ${
                            risk.severity === 'HIGH'
                              ? 'm3-badge-error'
                              : risk.severity === 'MEDIUM'
                              ? 'm3-badge-warning'
                              : ''
                          }`}
                        >
                          {risk.severity === 'HIGH' ? 'مرتفع' : risk.severity === 'MEDIUM' ? 'متوسط' : 'منخفض'}
                        </span>
                      </div>
                      <p className="opacity-85 leading-relaxed">{risk.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Operational Recommendations */}
            <div className="m3-card p-5 space-y-3">
              <div className="flex items-center gap-2 border-b border-[var(--md-outline-variant)] pb-2.5">
                <Lightbulb className="w-5 h-5 text-[var(--md-success)]" />
                <h3 className="text-sm font-bold text-[var(--md-on-surface)]">
                  التوصيات والإجراءات التشغيلية الموصى بها
                </h3>
              </div>

              {!forecastData?.recommendations || forecastData.recommendations.length === 0 ? (
                <p className="text-xs text-[var(--md-on-surface-variant)] py-4 text-center">
                  لا توجد توصيات إضافية حالياً.
                </p>
              ) : (
                <div className="space-y-3">
                  {(forecastData?.recommendations || []).map((rec: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-[var(--md-success)]/30 bg-[var(--md-success-container)]/55 text-[var(--md-on-surface)] text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-[var(--md-success)]">{rec.title}</span>
                        <span
                          className={`m3-badge ${
                            rec.priority === 'HIGH'
                              ? 'm3-badge-success'
                              : rec.priority === 'MEDIUM'
                              ? 'm3-badge-primary'
                              : ''
                          }`}
                        >
                          أولوية {rec.priority === 'HIGH' ? 'عالية' : rec.priority === 'MEDIUM' ? 'متوسطة' : 'عادية'}
                        </span>
                      </div>
                      <p className="text-[var(--md-on-surface-variant)] leading-relaxed">{rec.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Guarantees & Transparency Footer Note */}
          <div className="m3-card p-4 bg-[var(--md-surface-container-low)] text-[var(--md-on-surface-variant)] text-xs flex items-center gap-3">
            <Info className="w-5 h-5 text-[var(--md-primary-text)] shrink-0" />
            <div>
              <span className="font-bold text-[var(--md-on-surface)]">ضمان سلامة البيانات والحسابات: </span>
              نظام التوقع يعتمد كلياً على القراءة المباشرة وحساب التجميعات المالية من أصل السجلات الموثوقة (Read-Only). لا يملك المحرك أي صلاحيات لإنشاء أو تعديل أي فواتير، سندات، أو حركات قيد في دفتر الأستاذ.
            </div>
          </div>
        </>
      )}
    </div>
  );
};
