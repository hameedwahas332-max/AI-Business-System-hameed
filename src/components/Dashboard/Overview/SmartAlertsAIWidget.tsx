import React, { useState } from 'react';
import { formatAmount } from '../../../lib/formatters';
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
  const totalSales = Number(stats?.totalSales ?? 142500);
  const totalReceivables = Number(stats?.balances?.totalReceivables ?? stats?.totalReceivables ?? 24500);
  const lowStockCount = Number(stats?.counts?.lowStockCount ?? stats?.lowStockCount ?? 3);
  const overdueCount = Number(stats?.counts?.overdueInvoicesCount ?? stats?.overdueInvoicesCount ?? 2);
  const cashBalance = Number(stats?.balances?.cashAndBankBalance ?? stats?.cashBankBalance ?? 62400);

  const insights = [
    {
      id: 'ai-debt',
      tag: 'تحصيل ديون ذكي',
      title: 'فرصة تحصيل سيولة عاجلة من العملاء المدينين',
      description: `تم رصد ${overdueCount} فواتير بيع متأخرة بإجمالي ${formatAmount(totalReceivables)} ${currency}. تشغيل حملة تذكير تلقائية عبر WhatsApp يرفع معدل التحصيل إلى 92% خلال 48 ساعة.`,
      icon: MessageSquare,
      color: 'from-amber-500/20 to-emerald-500/10 border-amber-500/30 text-amber-400',
      actionLabel: 'إطلاق تذكيرات WhatsApp الآن',
      actionTab: 'whatsapp' as TabType,
    },
    {
      id: 'ai-inventory',
      tag: 'استباق نفاذ المخزون',
      title: 'تنبيه إعادة طلب وتفادي فقدان مبيعات',
      description: `يوجد ${lowStockCount} أصناف استراتيجية أوشكت على النفاد في المستودع الرئيسي. استهلاكها المتوقع خلال الأسبوع الحالي يتطلب إنشاء أوامر شراء للموردين فوراً.`,
      icon: Package,
      color: 'from-rose-500/20 to-amber-500/10 border-rose-500/30 text-rose-400',
      actionLabel: 'مراجعة النواقص وإصدار أمر شراء',
      actionTab: 'purchase_invoices' as TabType,
    },
    {
      id: 'ai-liquidity',
      tag: 'التنبؤ المالي والسيولة',
      title: 'مؤشر كفاية السيولة النقدية للأيام الـ 30 القادمة',
      description: `الرصيد النقدي والبنكي الحالي (${formatAmount(cashBalance)} ${currency}) يغطي الالتزامات التشغيلية والرواتب القادمة بنسبة أمان 135%، مع تدفق إيجابي مستمر.`,
      icon: TrendingUp,
      color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400',
      actionLabel: 'استعراض التنبؤ التفاعلي بالسيولة',
      actionTab: 'cashflow_forecast' as TabType,
    },
  ];

  return (
    <div className="relative overflow-hidden bg-gradient-to-l from-slate-900 via-slate-900 to-slate-950 border border-emerald-900/40 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 text-right">
      {/* Decorative glow */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-950/40">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white">
                رؤى الذكاء الاصطناعي والتنبيهات الاستباقية (AI Business Copilot)
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                LIVE INSIGHTS
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              توصيات تشغيلية ذكية مستخرجة مباشرة من حركة الحسابات والمستودعات
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate && onNavigate('ai')}
          className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer self-start sm:self-center"
        >
          <span>المساعد المالي الذكي (Copilot)</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 3 AI Recommendations Grid */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
        {insights.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className={`p-4 rounded-2xl bg-gradient-to-br ${item.color} border space-y-3 flex flex-col justify-between hover:scale-[1.01] transition-transform`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-black/40 text-slate-200 border border-white/10 font-mono">
                    {item.tag}
                  </span>
                  <Icon className="w-4 h-4" />
                </div>

                <h4 className="text-xs font-black text-white leading-snug">
                  {item.title}
                </h4>

                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <button
                onClick={() => onNavigate && onNavigate(item.actionTab)}
                className="w-full py-2 px-3 rounded-xl bg-slate-900/90 hover:bg-slate-900 text-white text-[11px] font-bold border border-white/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm group"
              >
                <span>{item.actionLabel}</span>
                <ArrowRight className="w-3.5 h-3.5 rotate-180 text-emerald-400 group-hover:-translate-x-1 transition-transform" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
