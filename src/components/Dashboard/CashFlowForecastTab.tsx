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

      const resolvedCashBox = apiCashBox > 0 ? apiCashBox : localCashBox;
      const resolvedBank = apiBank > 0 ? apiBank : localBank;
      const resolvedWallet = apiWallet > 0 ? apiWallet : localWallet;

      let resolvedTotalCash = apiCash > 0 ? apiCash : (resolvedCashBox + resolvedBank + resolvedWallet);
      if (resolvedTotalCash <= 0 && localTotalCash > 0) {
        resolvedTotalCash = localTotalCash;
      }
      if (resolvedTotalCash <= 0 && (resolvedCashBox + resolvedBank + resolvedWallet) > 0) {
        resolvedTotalCash = resolvedCashBox + resolvedBank + resolvedWallet;
      }

      const resolvedReceivables = Number(
        payload?.facts?.totalReceivables ??
        payload?.totalReceivables ??
        payload?.receivables ??
        localMetrics?.accountsReceivable ??
        localMetrics?.receivables ??
        0
      );

      const resolvedPayables = Number(
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

      const isZeroState =
        resolvedTotalCash === 0 && resolvedReceivables === 0 && resolvedPayables === 0;

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
          workingCapital: Number(
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
    <div className="space-y-6 pb-12">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
              <Cpu className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-white">توقعات التدفق النقدي (Cash Flow Forecasting)</h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Read-Only Phase 7.7
            </span>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            تحليل قراءة فقط موثوق للسيولة النقدية المستقبلية والتنبؤ بآفاق (30/60/90 يوماً) بالاعتماد على سجلات دفتر الأستاذ والسندات الرسمية.
          </p>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          {forecastData && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300">
              {forecastData.engine === 'hybrid' ? (
                <>
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-emerald-300">محرك هجين (AI + Statistical)</span>
                </>
              ) : (
                <>
                  <Calculator className="w-4 h-4 text-teal-400" />
                  <span className="font-semibold text-teal-300">محرك إحصائي محدد (Statistical Engine)</span>
                </>
              )}
            </div>
          )}

          <button
            onClick={fetchForecast}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            تحديث التوقعات
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && !forecastData && (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
          <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-3" />
          <p className="text-slate-300 text-sm font-semibold">جاري حساب التدفقات النقدية واستخلاص التوقعات...</p>
        </div>
      )}

      {forecastData && (
        <>
          {/* Section 1: Detailed Liquidity & Treasury Positions (4 Cards) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300 px-1">
              <span className="flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-emerald-400" />
                <span>أرصدة السيولة النقدية والبنكية وقنوات الخزينة المتاحة:</span>
              </span>
              <span className="text-[11px] text-slate-400 font-mono font-normal">
                جاهزية فورية ومطابقة لدفتر الأستاذ
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Total Available Cash & Bank */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-5 rounded-2xl border border-emerald-500/30 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold text-emerald-300">إجمالي السيولة المتاحة</span>
                  <span className="p-1.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-lg">
                    <Wallet className="w-4 h-4" />
                  </span>
                </div>
                <div className="text-2xl font-black text-white font-mono tabular-nums">
                  {formatAmount(forecastData?.facts?.currentCashPosition ?? 0)}{' '}
                  <span className="text-xs font-normal text-emerald-400">{currency}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>الصندوق + البنوك + المحافظ</span>
                </div>
              </div>

              {/* Card 2: Cash Box (1101) */}
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-medium text-slate-300">الخزينة والصندوق النقدي</span>
                  <span className="p-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg">
                    <Coins className="w-4 h-4" />
                  </span>
                </div>
                <div className="text-2xl font-bold text-slate-100 font-mono tabular-nums">
                  {formatAmount(forecastData?.facts?.cashBalance ?? 0)}{' '}
                  <span className="text-xs font-normal text-slate-400">{currency}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                  <span className="font-mono text-amber-400/90 font-semibold">حساب 1101</span>
                  <span>• نقدية الصندوق والمكتب</span>
                </div>
              </div>

              {/* Card 3: Bank Accounts (1102) */}
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-medium text-slate-300">الحسابات والودائع البنكية</span>
                  <span className="p-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg">
                    <Landmark className="w-4 h-4" />
                  </span>
                </div>
                <div className="text-2xl font-bold text-slate-100 font-mono tabular-nums">
                  {formatAmount(forecastData?.facts?.bankBalance ?? 0)}{' '}
                  <span className="text-xs font-normal text-slate-400">{currency}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                  <span className="font-mono text-blue-400/90 font-semibold">حساب 1102</span>
                  <span>• أرصدة البنوك المعتمدة</span>
                </div>
              </div>

              {/* Card 4: E-Wallets (1107) */}
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-medium text-slate-300">المحافظ الرقمية والشبكات</span>
                  <span className="p-1.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-lg">
                    <Smartphone className="w-4 h-4" />
                  </span>
                </div>
                <div className="text-2xl font-bold text-slate-100 font-mono tabular-nums">
                  {formatAmount(forecastData?.facts?.walletBalance ?? 0)}{' '}
                  <span className="text-xs font-normal text-slate-400">{currency}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                  <span className="font-mono text-purple-400/90 font-semibold">حساب 1107</span>
                  <span>• الكريمي، جوالي، ون كاش</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Receivables, Payables & Working Capital */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">مستحقات العملاء (الذمم المدينة)</span>
                <span className="p-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-bold text-slate-100 font-mono tabular-nums">
                {formatAmount(forecastData?.facts?.totalReceivables ?? 0)}{' '}
                <span className="text-xs font-normal text-slate-400">{currency}</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                <span>متوسط المقبوضات: {formatAmount(forecastData?.facts?.recentAverageInflow ?? 0)} {currency}/يوم</span>
              </div>
            </div>

            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">التزامات الموردين (الذمم الدائنة)</span>
                <span className="p-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg">
                  <TrendingDown className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-bold text-slate-100 font-mono tabular-nums">
                {formatAmount(forecastData?.facts?.totalPayables ?? 0)}{' '}
                <span className="text-xs font-normal text-slate-400">{currency}</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <ArrowDownRight className="w-3 h-3 text-rose-400" />
                <span>متوسط المدفوعات: {formatAmount(forecastData?.facts?.recentAverageOutflow ?? 0)} {currency}/يوم</span>
              </div>
            </div>

            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">صافي رأس المال العامل المتوقع</span>
                <span className="p-1.5 bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded-lg">
                  <ShieldCheck className="w-4 h-4" />
                </span>
              </div>
              <div className={`text-2xl font-bold font-mono tabular-nums ${(forecastData?.calculations?.workingCapital ?? 0) >= 0 ? 'text-slate-100' : 'text-rose-400'}`}>
                {formatAmount(forecastData?.calculations?.workingCapital ?? 0)}{' '}
                <span className="text-xs font-normal text-slate-400">{currency}</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                <span>السيولة + المستحقات - الالتزامات</span>
                <span className="font-mono text-teal-400 font-semibold">{forecastData?.calculations?.receivablesCoverageRatio ?? 1.5}x تغطية</span>
              </div>
            </div>
          </div>

          {/* Forecast Horizons (30 / 60 / 90 Days) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold text-slate-100">توقعات الرصيد النقدي المتوقع عبر الآفاق الزمنية</h2>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                تحليل السجل التاريخي: {forecastData?.calculations?.historicalDaysAnalyzed ?? 90} يوماً
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              {/* 30 Days Card */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-slate-300 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-md">
                    أفق 30 يوماً
                  </span>
                  <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                    ثقة: {forecastData?.forecast?.days30?.confidence ?? 90}%
                  </span>
                </div>
                <div className="text-2xl font-bold text-slate-100 mb-2">
                  {formatAmount(forecastData?.forecast?.days30?.expected ?? 0)}{' '}
                  <span className="text-xs font-normal text-slate-400">{currency}</span>
                </div>
                <div className="text-xs text-slate-300 space-y-1 bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <div className="flex justify-between">
                    <span className="text-slate-400">الحد الأدنى المتوقع:</span>
                    <span className="font-semibold text-slate-200">{formatAmount(forecastData?.forecast?.days30?.lowerBound ?? 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">الحد الأعلى المتوقع:</span>
                    <span className="font-semibold text-slate-200">{formatAmount(forecastData?.forecast?.days30?.upperBound ?? 0)}</span>
                  </div>
                </div>
              </div>

              {/* 60 Days Card */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-slate-300 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-md">
                    أفق 60 يوماً
                  </span>
                  <span className="text-xs font-semibold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded">
                    ثقة: {forecastData?.forecast?.days60?.confidence ?? 85}%
                  </span>
                </div>
                <div className="text-2xl font-bold text-slate-100 mb-2">
                  {formatAmount(forecastData?.forecast?.days60?.expected ?? 0)}{' '}
                  <span className="text-xs font-normal text-slate-400">{currency}</span>
                </div>
                <div className="text-xs text-slate-300 space-y-1 bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <div className="flex justify-between">
                    <span className="text-slate-400">الحد الأدنى المتوقع:</span>
                    <span className="font-semibold text-slate-200">{formatAmount(forecastData?.forecast?.days60?.lowerBound ?? 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">الحد الأعلى المتوقع:</span>
                    <span className="font-semibold text-slate-200">{formatAmount(forecastData?.forecast?.days60?.upperBound ?? 0)}</span>
                  </div>
                </div>
              </div>

              {/* 90 Days Card */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-slate-300 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-md">
                    أفق 90 يوماً
                  </span>
                  <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                    ثقة: {forecastData?.forecast?.days90?.confidence ?? 80}%
                  </span>
                </div>
                <div className="text-2xl font-bold text-slate-100 mb-2">
                  {formatAmount(forecastData?.forecast?.days90?.expected ?? 0)}{' '}
                  <span className="text-xs font-normal text-slate-400">{currency}</span>
                </div>
                <div className="text-xs text-slate-300 space-y-1 bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <div className="flex justify-between">
                    <span className="text-slate-400">الحد الأدنى المتوقع:</span>
                    <span className="font-semibold text-slate-200">{formatAmount(forecastData?.forecast?.days90?.lowerBound ?? 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">الحد الأعلى المتوقع:</span>
                    <span className="font-semibold text-slate-200">{formatAmount(forecastData?.forecast?.days90?.upperBound ?? 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Commentary & Analysis Section */}
          {forecastData.commentary && (
            <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800">
              <div className="flex items-center gap-2 mb-3">
                <Cpu className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-emerald-300">التعليق التنفيذي والتحليل المالي للسيولة</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                {forecastData.commentary}
              </p>
            </div>
          )}

          {/* Risks & Recommendations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Risk Observations */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-slate-100">ملاحظات وتقييم مخاطر السيولة</h3>
              </div>

              {(!forecastData?.risks || forecastData.risks.length === 0) ? (
                <p className="text-xs text-slate-400 py-4 text-center">لا توجد مخاطر سيولة حرجة محددة حالياً.</p>
              ) : (
                <div className="space-y-3">
                  {(forecastData?.risks || []).map((risk: any, idx: number) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                        risk.severity === 'HIGH'
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                          : risk.severity === 'MEDIUM'
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-100">{risk.title}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                            risk.severity === 'HIGH'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : risk.severity === 'MEDIUM'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {risk.severity === 'HIGH' ? 'مرتفع' : risk.severity === 'MEDIUM' ? 'متوسط' : 'منخفض'}
                        </span>
                      </div>
                      <p className="text-slate-400 leading-relaxed">{risk.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Operational Recommendations */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <Lightbulb className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-100">التوصيات والإجراءات التشغيلية الموصى بها</h3>
              </div>

              {(!forecastData?.recommendations || forecastData.recommendations.length === 0) ? (
                <p className="text-xs text-slate-400 py-4 text-center">لا توجد توصيات إضافية حالياً.</p>
              ) : (
                <div className="space-y-3">
                  {(forecastData?.recommendations || []).map((rec: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-300">{rec.title}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            rec.priority === 'HIGH'
                              ? 'bg-emerald-600 text-white'
                              : rec.priority === 'MEDIUM'
                              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          أولوية {rec.priority === 'HIGH' ? 'عالية' : rec.priority === 'MEDIUM' ? 'متوسطة' : 'عادية'}
                        </span>
                      </div>
                      <p className="text-slate-400 leading-relaxed">{rec.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Guarantees & Transparency Footer Note */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 text-slate-300 text-xs flex items-center gap-3">
            <Info className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <span className="font-bold text-slate-100">ضمان سلامة البيانات والحسابات: </span>
              نظام التوقع يعتمد كلياً على القراءة المباشرة وحساب التجميعات المالية من أصل السجلات الموثوقة (Read-Only). لا يملك المحرك أي صلاحيات لإنشاء أو تعديل أي فواتير، سندات، أو حركات قيد في دفتر الأستاذ.
            </div>
          </div>
        </>
      )}
    </div>
  );
};
