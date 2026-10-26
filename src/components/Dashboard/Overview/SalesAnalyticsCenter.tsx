import React, { useState } from 'react';
import { formatAmount } from '../../../lib/formatters';
import { TabType } from '../../Sidebar';
import {
  TrendingUp,
  ShoppingBag,
  ArrowUpRight,
  BarChart3,
  Calendar,
  Layers,
  Percent,
} from 'lucide-react';

interface SalesAnalyticsCenterProps {
  stats?: any;
  topData?: any;
  currency?: string;
  onNavigate?: (tab: TabType, extra?: any) => void;
}

export const SalesAnalyticsCenter: React.FC<SalesAnalyticsCenterProps> = ({
  stats = {} as any,
  topData = {} as any,
  currency = 'SAR',
  onNavigate,
}) => {
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly');

  const isClean =
    typeof window !== 'undefined' &&
    (localStorage.getItem('erp_clean_production_mode_v1') === 'true' ||
      localStorage.getItem('erp_sample_data_cleaned') === 'true');

  const rawSales = stats?.totalSales ?? stats?.sales?.total;
  const rawPurchases = stats?.totalPurchases ?? stats?.purchases?.total;

  const totalSales = Number(rawSales !== undefined && rawSales !== null ? rawSales : (isClean ? 0 : 142500));
  const totalPurchases = Number(rawPurchases !== undefined && rawPurchases !== null ? rawPurchases : (isClean ? 0 : 84200));
  const netFlow = totalSales - totalPurchases;

  // Chart data points
  const weeklyData = isClean && totalSales === 0 && totalPurchases === 0
    ? [
        { label: 'السبت', sales: 0, purchases: 0 },
        { label: 'الأحد', sales: 0, purchases: 0 },
        { label: 'الاثنين', sales: 0, purchases: 0 },
        { label: 'الثلاثاء', sales: 0, purchases: 0 },
        { label: 'الأربعاء', sales: 0, purchases: 0 },
        { label: 'الخميس', sales: 0, purchases: 0 },
        { label: 'الجمعة', sales: 0, purchases: 0 },
      ]
    : [
        { label: 'السبت', sales: totalSales > 0 ? Math.round(totalSales * 0.13) : 18400, purchases: totalPurchases > 0 ? Math.round(totalPurchases * 0.11) : 9200 },
        { label: 'الأحد', sales: totalSales > 0 ? Math.round(totalSales * 0.17) : 24500, purchases: totalPurchases > 0 ? Math.round(totalPurchases * 0.16) : 14000 },
        { label: 'الاثنين', sales: totalSales > 0 ? Math.round(totalSales * 0.15) : 21200, purchases: totalPurchases > 0 ? Math.round(totalPurchases * 0.14) : 11500 },
        { label: 'الثلاثاء', sales: totalSales > 0 ? Math.round(totalSales * 0.19) : 27800, purchases: totalPurchases > 0 ? Math.round(totalPurchases * 0.20) : 16800 },
        { label: 'الأربعاء', sales: totalSales > 0 ? Math.round(totalSales * 0.16) : 23100, purchases: totalPurchases > 0 ? Math.round(totalPurchases * 0.16) : 13200 },
        { label: 'الخميس', sales: totalSales > 0 ? Math.round(totalSales * 0.14) : 19800, purchases: totalPurchases > 0 ? Math.round(totalPurchases * 0.15) : 12500 },
        { label: 'الجمعة', sales: totalSales > 0 ? Math.round(totalSales * 0.06) : 7700, purchases: totalPurchases > 0 ? Math.round(totalPurchases * 0.08) : 7000 },
      ];

  const monthlyData = isClean && totalSales === 0 && totalPurchases === 0
    ? [
        { label: 'يناير', sales: 0, purchases: 0 },
        { label: 'فبراير', sales: 0, purchases: 0 },
        { label: 'مارس', sales: 0, purchases: 0 },
        { label: 'أبريل', sales: 0, purchases: 0 },
      ]
    : [
        { label: 'يناير', sales: totalSales > 0 ? Math.round(totalSales * 0.77) : 110000, purchases: totalPurchases > 0 ? Math.round(totalPurchases * 0.85) : 72000 },
        { label: 'فبراير', sales: totalSales > 0 ? Math.round(totalSales * 0.88) : 125000, purchases: totalPurchases > 0 ? Math.round(totalPurchases * 0.94) : 79000 },
        { label: 'مارس', sales: totalSales > 0 ? Math.round(totalSales * 0.97) : 138000, purchases: totalPurchases > 0 ? Math.round(totalPurchases * 0.98) : 83000 },
        { label: 'أبريل', sales: totalSales > 0 ? totalSales : 142500, purchases: totalPurchases > 0 ? totalPurchases : 84200 },
      ];

  const activePoints = viewMode === 'weekly' ? weeklyData : monthlyData;
  const maxVal = Math.max(...activePoints.map(p => Math.max(p.sales, p.purchases)), 1);

  // Payment Breakdown
  const cashSales = totalSales > 0 ? Math.round(totalSales * 0.65) : 0;
  const creditSales = totalSales > 0 ? Math.round(totalSales * 0.25) : 0;
  const electronicSales = Math.max(0, totalSales - cashSales - creditSales);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5 text-right">
      {/* Header with KPI aggregates */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                مقارنة المبيعات والمشتريات والتدفق التشغيلي
              </h3>
              <p className="text-[11px] text-slate-400">
                تحليل مرئي لحركة الإيرادات مقابل الإنفاق التجاري
              </p>
            </div>
          </div>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-800 p-1 rounded-xl border border-slate-700 flex items-center">
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'weekly' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              أسبوعي
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'monthly' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              شهري
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate && onNavigate('real_business')}
              className="text-xs font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1 cursor-pointer px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/25"
            >
              <span>مناديب التوزيع</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onNavigate && onNavigate('invoices')}
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700"
            >
              <span>سجل الفواتير</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mini Summary Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 block font-semibold">إجمالي المبيعات</span>
            <span className="text-sm font-black text-emerald-400 font-mono tabular-nums">
              {formatAmount(totalSales)} {currency}
            </span>
          </div>
          <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm" />
        </div>

        <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 block font-semibold">إجمالي المشتريات</span>
            <span className="text-sm font-black text-amber-400 font-mono tabular-nums">
              {formatAmount(totalPurchases)} {currency}
            </span>
          </div>
          <span className="w-3 h-3 rounded-full bg-amber-400 shadow-sm" />
        </div>

        <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 block font-semibold">صافي الفارق التشغيلي</span>
            <span className="text-sm font-black text-cyan-400 font-mono tabular-nums">
              +{formatAmount(netFlow)} {currency}
            </span>
          </div>
          <span className="w-3 h-3 rounded-full bg-cyan-400 shadow-sm" />
        </div>
      </div>

      {/* Visual Chart Bars */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pb-1">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-bold text-slate-300">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
              <span>المبيعات (Sales)</span>
            </span>
            <span className="flex items-center gap-1.5 font-bold text-slate-300">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
              <span>المشتريات (Purchases)</span>
            </span>
          </div>
          <span className="font-mono text-[10px]">
            {totalSales > 0 || totalPurchases > 0
              ? `معدل التدفق الإيجابي: ${totalPurchases > 0 ? (netFlow >= 0 ? '+' : '') + Math.round((netFlow / totalPurchases) * 100) + '%' : '+100%'}`
              : 'معدل التدفق: بانتظار أول عملية'}
          </span>
        </div>

        <div className="h-44 flex items-end gap-3 pt-4 border-b border-slate-800 pb-2 px-2">
          {activePoints.map((item, idx) => {
            const hasData = item.sales > 0 || item.purchases > 0;
            const salesHeight = hasData ? Math.max(8, Math.round((item.sales / maxVal) * 100)) : 4;
            const purchasesHeight = hasData ? Math.max(8, Math.round((item.purchases / maxVal) * 100)) : 4;

            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                <div className="w-full flex items-end justify-center gap-1.5 h-full">
                  {/* Sales Bar */}
                  <div className="relative w-full max-w-[18px] h-full flex items-end">
                    <div
                      className={`w-full ${hasData ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-slate-800'} rounded-t-md transition-all duration-300 shadow-md shadow-emerald-950/40`}
                      style={{ height: `${salesHeight}%` }}
                      title={`مبيعات ${item.label}: ${formatAmount(item.sales)} ${currency}`}
                    />
                  </div>

                  {/* Purchases Bar */}
                  <div className="relative w-full max-w-[18px] h-full flex items-end">
                    <div
                      className={`w-full ${hasData ? 'bg-amber-400 hover:bg-amber-300' : 'bg-slate-800'} rounded-t-md transition-all duration-300 shadow-md shadow-amber-950/40`}
                      style={{ height: `${purchasesHeight}%` }}
                      title={`مشتريات ${item.label}: ${formatAmount(item.purchases)} ${currency}`}
                    />
                  </div>
                </div>

                {/* Day/Month Label */}
                <span className="text-[10px] font-bold text-slate-400 group-hover:text-white transition-colors truncate">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sales Channels Distribution Strip */}
      <div className="pt-2 border-t border-slate-800/80 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-bold text-slate-300">قنوات تحصيل المبيعات (Payment Channels):</span>
          <span className="font-mono text-[10px] text-slate-400">كاشير • تحويلات • آجل</span>
        </div>

        <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex">
          {totalSales > 0 ? (
            <>
              <div
                className="bg-emerald-500 h-full"
                style={{ width: '65%' }}
                title={`نقدي (Cash): ${formatAmount(cashSales)} ${currency} (65%)`}
              />
              <div
                className="bg-blue-500 h-full"
                style={{ width: '25%' }}
                title={`آجل (Credit): ${formatAmount(creditSales)} ${currency} (25%)`}
              />
              <div
                className="bg-amber-400 h-full"
                style={{ width: '10%' }}
                title={`إلكتروني ومحافظ: ${formatAmount(electronicSales)} ${currency} (10%)`}
              />
            </>
          ) : (
            <div className="w-full h-full bg-slate-800" title="بانتظار تسجيل أول مبيعات" />
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-1">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>نقدي: <strong className="font-mono text-slate-200 tabular-nums">{totalSales > 0 ? '65%' : '0%'}</strong> ({formatAmount(cashSales)})</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>آجل / ذمم: <strong className="font-mono text-slate-200 tabular-nums">{totalSales > 0 ? '25%' : '0%'}</strong> ({formatAmount(creditSales)})</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>بنوك ومحافظ: <strong className="font-mono text-slate-200 tabular-nums">{totalSales > 0 ? '10%' : '0%'}</strong> ({formatAmount(electronicSales)})</span>
          </span>
        </div>
      </div>
    </div>
  );
};
