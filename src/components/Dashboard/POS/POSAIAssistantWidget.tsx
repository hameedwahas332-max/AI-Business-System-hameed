import React, { useEffect, useState } from 'react';
import { Sparkles, TrendingUp, AlertTriangle, Users, Flame, RefreshCw } from 'lucide-react';
import { api } from '../../../api';

interface POSAIAssistantWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  currency: string;
  onSelectProductQuickAdd?: (productName: string) => void;
}

export const POSAIAssistantWidget: React.FC<POSAIAssistantWidgetProps> = ({
  isOpen,
  onClose,
  currency,
  onSelectProductQuickAdd,
}) => {
  const [insights, setInsights] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const res = await api.posGetAIAssistantInsights();
      if (res.success) {
        setInsights(res.data);
      }
    } catch (err) {
      console.error('Failed to load POS AI insights:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchInsights();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-start m3-backdrop" dir="rtl">
      <div className="m3-modal-surface border-l border-[var(--md-outline-variant)] w-full max-w-md h-full flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-[var(--md-surface-container-low)] border-b border-[var(--md-outline-variant)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] rounded-xl border border-[var(--md-primary)]/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--md-on-surface)]">المساعد الذكي لنقطة البيع (POS AI)</h3>
              <p className="text-xs text-[var(--md-on-surface-variant)]">تحليلات لحظية للمبيعات، المخزون، والديون</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={fetchInsights}
              className="p-1.5 text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-high)] rounded-lg transition-colors"
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="p-1.5 text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-high)] rounded-lg transition-colors">
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
          {/* Top Selling Products Today */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--md-primary-text)]">
              <Flame className="w-4 h-4" />
              <span>الأصناف الأكثر طلباً اليوم:</span>
            </div>
            <div className="space-y-1.5">
              {insights?.topSellingToday && insights.topSellingToday.length > 0 ? (
                insights.topSellingToday.map((p: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] rounded-xl flex items-center justify-between text-xs"
                  >
                    <span className="font-semibold text-[var(--md-on-surface)]">{p.item_name}</span>
                    <div className="flex items-center gap-3 tabular-nums">
                      <span className="text-[var(--md-success)] font-bold">{p.total_qty} قطعة</span>
                      <span className="text-[var(--md-on-surface-variant)]">{Number(p.total_rev).toLocaleString()} {currency}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[var(--md-on-surface-variant)] italic p-2">لا توجد مبيعات مسجلة اليوم بعد</p>
              )}
            </div>
          </div>

          {/* Low Stock Alerts */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--md-warning)]">
              <AlertTriangle className="w-4 h-4" />
              <span>تنبيهات انخفاض المخزون أثناء البيع:</span>
            </div>
            <div className="space-y-1.5">
              {insights?.lowStockAlerts && insights.lowStockAlerts.length > 0 ? (
                insights.lowStockAlerts.map((p: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 bg-[var(--md-warning-container)]/40 border border-[var(--md-warning)]/30 rounded-xl flex items-center justify-between text-xs"
                  >
                    <span className="font-semibold text-[var(--md-on-surface)]">{p.name}</span>
                    <div className="text-left tabular-nums">
                      <span className="text-[var(--md-error)] font-bold block">المتبقي: {p.current_stock}</span>
                      <span className="text-[10px] text-[var(--md-on-surface-variant)]">الحد الأدنى: {p.min_stock_level}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[var(--md-on-surface-variant)] italic p-2">المخزون مستقر ولا توجد نواقص حرجة</p>
              )}
            </div>
          </div>

          {/* Top Debtors */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--md-info)]">
              <Users className="w-4 h-4" />
              <span>أعلى العملاء مديونية (انتبه عند البيع الآجل):</span>
            </div>
            <div className="space-y-1.5">
              {insights?.topDebtors && insights.topDebtors.length > 0 ? (
                insights.topDebtors.map((c: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] rounded-xl flex items-center justify-between text-xs"
                  >
                    <span className="font-semibold text-[var(--md-on-surface)]">{c.name}</span>
                    <span className="text-[var(--md-warning)] font-bold tabular-nums">
                      {Number(c.current_balance).toLocaleString()} {currency}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[var(--md-on-surface-variant)] italic p-2">لا توجد ديون معلقة على العملاء</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
