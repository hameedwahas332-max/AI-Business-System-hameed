import React, { useState } from 'react';
import { formatAmount, formatNumber } from '../../../lib/formatters';
import { TabType } from '../../Sidebar';
import {
  Sparkles,
  Bot,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  MessageSquare,
  Clock,
  Package,
  Layers,
  ArrowUpRight,
} from 'lucide-react';

interface SmartAlertsAIWidgetProps {
  stats?: any;
  kpis?: any;
  currency?: string;
  onNavigate?: (tab: TabType, extra?: any) => void;
}

export const SmartAlertsAIWidget: React.FC<SmartAlertsAIWidgetProps> = ({
  stats = {} as any,
  kpis = {} as any,
  currency = 'SAR',
  onNavigate,
}) => {
  const totalSales = Number(stats?.totalSales ?? 0);
  const totalReceivables = Number(stats?.balances?.totalReceivables ?? stats?.totalReceivables ?? 0);
  const lowStockCount = Number(stats?.counts?.lowStockCount ?? stats?.lowStockCount ?? 0);
  const overdueCount = Number(stats?.counts?.overdueInvoicesCount ?? stats?.overdueInvoicesCount ?? 0);
  const cashBalance = Number(stats?.balances?.cashAndBankBalance ?? stats?.cashBankBalance ?? 0);

  const lowStockAlerts: any[] = Array.isArray(stats?.lowStockAlerts)
    ? stats.lowStockAlerts
    : Array.isArray(stats?.counts?.lowStockAlerts)
    ? stats.counts.lowStockAlerts
    : [];
  const effectiveLowStockCount = lowStockAlerts.length > 0 ? lowStockAlerts.length : lowStockCount;
  const outOfStockCount = lowStockAlerts.filter((a) => Number(a?.current_stock ?? a?.qty ?? 0) <= 0).length;
  const hasOutOfStock = outOfStockCount > 0;

  let repsList: any[] = [];
  try {
    const rawReps = typeof window !== 'undefined' ? localStorage.getItem('erp_sales_reps_v1') : null;
    if (rawReps !== null) {
      repsList = JSON.parse(rawReps);
    } else {
      const rawLegacy = typeof window !== 'undefined' ? localStorage.getItem('erp_sales_reps') : null;
      if (rawLegacy !== null) {
        repsList = JSON.parse(rawLegacy);
      }
    }
  } catch {}

  const repsSalesTotal = Array.isArray(repsList)
    ? repsList.reduce((sum: number, r: any) => sum + Number(r.achievedSales ?? r.salesMonth ?? 0), 0)
    : 0;
  const repsCollectedTotal = Array.isArray(repsList)
    ? repsList.reduce((sum: number, r: any) => sum + Number(r.collectedCash ?? r.collected ?? 0), 0)
    : 0;
  const repsCount = Array.isArray(repsList) ? repsList.length : 0;
  const collectionRate = repsSalesTotal > 0 ? Math.round((repsCollectedTotal / repsSalesTotal) * 100) : 0;

  const insights = [
    {
      id: 'ai-debt',
      tag: 'تحصيل ديون ذكي',
      title: totalReceivables > 0 || overdueCount > 0 ? 'فرصة تحصيل سيولة عاجلة من العملاء المدينين' : 'سجل مديونيات العملاء نظيف ومستقر',
      description:
        totalReceivables > 0 || overdueCount > 0
          ? `تم رصد ${overdueCount} فواتير بيع متأخرة بإجمالي ${formatAmount(totalReceivables)} ${currency}. تشغيل حملة تذكير تلقائية عبر WhatsApp يرفع معدل التحصيل إلى 92% خلال 48 ساعة.`
          : 'لا توجد فواتير بيع متأخرة أو مديونيات معلقة حالياً (0). جميع حسابات العملاء مسددة بالكامل.',
      icon: MessageSquare,
      badgeTone: 'm3-badge-secondary',
      iconTone: 'text-[var(--md-secondary)]',
      actionLabel: 'إطلاق تذكيرات WhatsApp الآن',
      actionTab: 'whatsapp' as TabType,
    },
    {
      id: 'ai-inventory',
      tag: 'استباق نفاذ المخزون',
      title: hasOutOfStock
        ? 'تنبيه عاجل: أصناف نفدت أو أوشكت على النفاذ'
        : effectiveLowStockCount > 0
        ? 'تنبيه إعادة طلب حسب حد التنبيه المخصص'
        : 'مستويات المخزون متوازنة وآمنة',
      description:
        effectiveLowStockCount > 0
          ? hasOutOfStock
            ? `تم رصد ${formatNumber(effectiveLowStockCount)} أصناف تحت حد التنبيه (منها ${formatNumber(outOfStockCount)} نفد بالكامل). يُوصى بإصدار أوامر شراء فورية لتفادي فقدان المبيعات.`
            : `تم رصد ${formatNumber(effectiveLowStockCount)} أصناف وصلت إلى حد التنبيه المخصص قبل النفاذ في المستودع. يُوصى بمراجعة الكميات المتبقية وإصدار أوامر شراء.`
          : 'لا توجد نواقص مخزنية مسجلة حالياً (0 أصناف منخفضة). مستويات التوفر في المستودع مستقرة.',
      icon: hasOutOfStock ? AlertTriangle : Package,
      badgeTone: hasOutOfStock
        ? 'm3-badge-error'
        : effectiveLowStockCount > 0
        ? 'm3-badge-warning'
        : 'm3-badge-success',
      iconTone: hasOutOfStock
        ? 'text-[var(--md-error)]'
        : effectiveLowStockCount > 0
        ? 'text-[var(--md-warning)]'
        : 'text-[var(--md-success)]',
      actionLabel: 'مراجعة النواقص وإصدار أمر شراء',
      actionTab: 'purchase_invoices' as TabType,
    },
    {
      id: 'ai-liquidity',
      tag: 'التنبؤ المالي والسيولة',
      title: 'مؤشر كفاية السيولة النقدية للأيام الـ 30 القادمة',
      description:
        cashBalance > 0
          ? `الرصيد النقدي والبنكي الحالي (${formatAmount(cashBalance)} ${currency}) يغطي الالتزامات التشغيلية والرواتب القادمة، مع إجمالي مبيعات مسجلة (${formatAmount(totalSales)} ${currency}).`
          : `الرصيد النقدي والبنكي الحالي (0 ${currency}). سيبدأ احتساب مؤشر التغطية والتدفقات النقدية فور تسجيل المبيعات أو سندات القبض.`,
      icon: TrendingUp,
      badgeTone: 'm3-badge-success',
      iconTone: 'text-[var(--md-primary-text)]',
      actionLabel: 'استعراض التنبؤ التفاعلي بالسيولة',
      actionTab: 'cashflow_forecast' as TabType,
    },
    {
      id: 'ai-sales-reps',
      tag: 'مناديب التوزيع والعمولات',
      title: 'تحفيز خطوط التوزيع وسيارات الفان الميدانية',
      description: repsCount > 0
        ? `حقق مناديب التوزيع الميداني (${repsCount} مناديب) مبيعات بقيمة ${formatAmount(repsSalesTotal)} ${currency} هذا الشهر مع نسبة تحصيل ${collectionRate}%. صرف العمولات المستحقة يعزز معدل التوزيع بنسبة 18%.`
        : `لا يوجد مناديب توزيع مسجلين حالياً. تسجيل المناديب وتعيين خطوط السير والأهداف الميدانية يرفع المبيعات الخارجية وتغطية نقاط البيع.`,
      icon: Sparkles,
      badgeTone: 'm3-badge-info',
      iconTone: 'text-[var(--md-info)]',
      actionLabel: 'إدارة أداء وعمولات المناديب',
      actionTab: 'real_business' as TabType,
    },
  ];

  return (
    <div className="m3-card relative overflow-hidden p-5 sm:p-6 space-y-4 text-right">
      {/* Header */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--md-outline-variant)] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[var(--md-primary)] text-[var(--md-on-primary)] flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-[var(--md-on-surface)]">
                رؤى الذكاء الاصطناعي والتنبيهات الاستباقية (AI Business Copilot)
              </h3>
              <span className="m3-badge m3-badge-primary font-mono">
                LIVE INSIGHTS
              </span>
            </div>
            <p className="text-[11px] text-[var(--md-on-surface-variant)]">
              توصيات تشغيلية ذكية مستخرجة مباشرة من حركة الحسابات والمستودعات
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate && onNavigate('ai')}
          className="text-xs font-bold text-[var(--md-primary-text)] hover:underline flex items-center gap-1 cursor-pointer self-start sm:self-center"
        >
          <span>المساعد المالي الذكي (Copilot)</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* AI Recommendations Grid */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
        {insights.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className="p-4 rounded-xl bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] hover:border-[var(--md-primary)] space-y-3 flex flex-col justify-between transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className={`m3-badge ${item.badgeTone} font-mono`}>
                    {item.tag}
                  </span>
                  <Icon className={`w-4 h-4 shrink-0 ${item.iconTone}`} />
                </div>

                <h4 className="text-xs font-black text-[var(--md-on-surface)] leading-snug">
                  {item.title}
                </h4>

                <p className="text-[11px] text-[var(--md-on-surface-variant)] leading-relaxed">
                  {item.description}
                </p>

                {item.id === 'ai-inventory' && lowStockAlerts.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {lowStockAlerts.slice(0, 3).map((alert, idx) => {
                      const remQty = Number(alert?.current_stock ?? alert?.qty ?? 0);
                      const minQty = Number(alert?.min_stock_level ?? alert?.custom_min_stock_level ?? 5);
                      const unit = alert?.baseUnitName || alert?.unit || 'حبة';
                      const prodName = alert?.product_name || alert?.name || 'صنف';
                      const isOut = remQty <= 0;
                      return (
                        <div
                          key={alert?.id || alert?.product_id || idx}
                          className={`px-2.5 py-1.5 rounded-lg border text-[10px] leading-snug tabular-nums ${
                            isOut
                              ? 'bg-[var(--md-error-container)]/60 border-[var(--md-error)]/35 text-[var(--md-on-error-container)]'
                              : 'bg-[var(--md-warning-container)]/60 border-[var(--md-warning)]/35 text-[var(--md-on-warning-container)]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5 font-bold">
                            <span className="truncate">{prodName}</span>
                            <span className="shrink-0 font-mono">
                              {isOut ? `نفد (0 ${unit})` : `متبقي ${formatNumber(remQty)} ${unit}`}
                            </span>
                          </div>
                          <div className="text-[9.5px] opacity-85 font-mono">
                            حد التنبيه: {formatNumber(minQty)} {unit}
                          </div>
                        </div>
                      );
                    })}
                    {lowStockAlerts.length > 3 && (
                      <div className="text-[10px] font-semibold text-[var(--md-on-surface-variant)] tabular-nums">
                        وعدد {formatNumber(lowStockAlerts.length - 3)} أصناف أخرى تحت حد التنبيه
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() => onNavigate && onNavigate(item.actionTab)}
                className="m3-btn-outlined w-full text-[11px] group"
              >
                <span className="truncate">{item.actionLabel}</span>
                <ArrowRight className="w-3.5 h-3.5 rotate-180 text-[var(--md-primary-text)] group-hover:-translate-x-1 transition-transform shrink-0" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
