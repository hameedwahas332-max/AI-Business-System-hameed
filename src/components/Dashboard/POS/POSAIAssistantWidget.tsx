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
    <div className="fixed inset-0 z-50 flex justify-start bg-slate-950/80 backdrop-blur-sm" dir="rtl">
      <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-800/70 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">المساعد الذكي لنقطة البيع (POS AI)</h3>
              <p className="text-xs text-slate-400">تحليلات لحظية للمبيعات، المخزون، والديون</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={fetchInsights}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
          {/* Top Selling Products Today */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
              <Flame className="w-4 h-4" />
              <span>الأصناف الأكثر طلباً اليوم:</span>
            </div>
            <div className="space-y-1.5">
              {insights?.topSellingToday && insights.topSellingToday.length > 0 ? (
                insights.topSellingToday.map((p: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-800/40 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                  >
                    <span className="font-semibold text-white">{p.item_name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-400 font-bold">{p.total_qty} قطعة</span>
                      <span className="text-slate-400">{Number(p.total_rev).toLocaleString()} {currency}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 italic p-2">لا توجد مبيعات مسجلة اليوم بعد</p>
              )}
            </div>
          </div>

          {/* Low Stock Alerts */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              <span>تنبيهات انخفاض المخزون أثناء البيع:</span>
            </div>
            <div className="space-y-1.5">
              {insights?.lowStockAlerts && insights.lowStockAlerts.length > 0 ? (
                insights.lowStockAlerts.map((p: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-center justify-between text-xs"
                  >
                    <span className="font-semibold text-slate-200">{p.name}</span>
                    <div className="text-left">
                      <span className="text-rose-400 font-bold block">المتبقي: {p.current_stock}</span>
                      <span className="text-[10px] text-slate-400">الحد الأدنى: {p.min_stock_level}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 italic p-2">المخزون مستقر ولا توجد نواقص حرجة</p>
              )}
            </div>
          </div>

          {/* Top Debtors */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-400">
              <Users className="w-4 h-4" />
              <span>أعلى العملاء مديونية (انتبه عند البيع الآجل):</span>
            </div>
            <div className="space-y-1.5">
              {insights?.topDebtors && insights.topDebtors.length > 0 ? (
                insights.topDebtors.map((c: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-800/40 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                  >
                    <span className="font-semibold text-white">{c.name}</span>
                    <span className="text-amber-400 font-bold">
                      {Number(c.current_balance).toLocaleString()} {currency}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 italic p-2">لا توجد ديون معلقة على العملاء</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
