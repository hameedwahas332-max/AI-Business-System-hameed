import React, { useState } from 'react';
import {
  Zap,
  CheckCircle2,
  Clock,
  AlertCircle,
  Play,
  Pause,
  Plus,
  ArrowRight,
  ShieldCheck,
  Tag,
  Settings,
} from 'lucide-react';
import { WhatsAppAutomation } from './types';

interface WhatsAppAutomationsTabProps {
  automations?: WhatsAppAutomation[];
  onToggleAutomation?: (id: string, active: boolean) => Promise<void>;
  onSaveAutomation?: (data: any) => Promise<boolean>;
}

export const WhatsAppAutomationsTab: React.FC<WhatsAppAutomationsTabProps> = ({
  automations = [],
  onToggleAutomation = async () => {},
  onSaveAutomation = async () => true,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [triggerEvent, setTriggerEvent] = useState('INVOICE_CREATED');
  const [customMessage, setCustomMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !customMessage.trim()) return;

    setIsSaving(true);
    try {
      const ok = await onSaveAutomation({
        name: name.trim(),
        trigger_event: triggerEvent,
        custom_message: customMessage.trim(),
        is_active: true,
      });
      if (ok) {
        setName('');
        setCustomMessage('');
        setShowAddModal(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const getTriggerName = (trigger: string) => {
    switch (trigger) {
      case 'INVOICE_CREATED':
        return 'عند إنشاء فاتورة مبيعات جديدة';
      case 'PAYMENT_RECEIVED':
        return 'عند استلام وقيد سند قبض';
      case 'CUSTOMER_OVERDUE_7D':
        return 'عند تأخر السداد لأكثر من 7 أيام';
      case 'CUSTOMER_OVERDUE_15D':
        return 'عند تأخر السداد لأكثر من 15 يوم';
      case 'CUSTOMER_OVERDUE_30D':
        return 'إشعار تصعيد بعد 30 يوم تأخير';
      case 'CREDIT_LIMIT_EXCEEDED':
        return 'عند تجاوز الحد الائتماني المعتمد';
      case 'STATEMENT_MONTH_END':
        return 'إرسال كشف الحساب بنهاية الشهر';
      default:
        return trigger;
    }
  };

  return (
    <div id="whatsapp-automations-section" className="space-y-6">
      
      {/* Header Info Banner */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <span>قواعد وأتمتة التنبيهات والتحصيل الذكي</span>
          </h2>
          <p className="text-xs text-slate-400">
            تفعيل الإرسال التلقائي للرسائل الموثقة عند حدوث العمليات المحاسبية في النظام بدون تدخل يدوي.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition-all shadow-md shadow-emerald-950/40 active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ إضافة قاعدة أتمتة</span>
        </button>
      </div>

      {/* Multi-stage Collection Pipeline visual */}
      <div className="bg-slate-950/80 border border-slate-800 text-white rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>مسار التحصيل المتعدد المراحل (Multi-Stage Collection Workflow)</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">حماية كاملة من التكرار العشوائي</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-200">
              <span>المرحلة 1: إصدار الفاتورة</span>
              <span className="text-emerald-400">فوري</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">إرسال رابط الفاتورة وتفاصيل المبلغ المستحق للعميل.</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-200">
              <span>المرحلة 2: تذكير ودي</span>
              <span className="text-amber-400">+7 أيام</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">تذكير لطيف بموعد الاستحقاق وبيانات الحساب البنكي.</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-200">
              <span>المرحلة 3: إشعار استحقاق</span>
              <span className="text-orange-400">+15 يوم</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">إشعار رسمي بضرورة سداد المبلغ لتفادي تعليق الحساب.</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-200">
              <span>المرحلة 4: إشعار السداد</span>
              <span className="text-emerald-400">عند القبض</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">تأكيد استلام الدفعة النقدية وإرسال سند القبض.</p>
          </div>
        </div>
      </div>

      {/* Rules List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {automations.map((auto) => {
          return (
            <div
              key={auto.id}
              className={`bg-slate-900 rounded-2xl border p-5 shadow-xl space-y-4 transition-all ${
                auto.is_active ? 'border-slate-800' : 'border-slate-800/60 opacity-60 bg-slate-900/50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-100">{auto.name}</h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        auto.is_active
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {auto.is_active ? 'نشط ويعمل' : 'متوقف مؤقتاً'}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" />
                    <span>الحدث المحفّز: {getTriggerName(auto.trigger_event)}</span>
                  </p>
                </div>

                <button
                  onClick={() => onToggleAutomation(auto.id, !auto.is_active)}
                  className={`p-2 rounded-xl border text-xs font-bold transition-colors ${
                    auto.is_active
                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/20 hover:bg-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20'
                  }`}
                  title={auto.is_active ? 'إيقاف مؤقت' : 'تفعيل'}
                >
                  {auto.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
              </div>

              {/* Message Payload */}
              <div className="p-3 bg-slate-950/60 rounded-xl text-xs text-slate-300 font-sans border border-slate-800 leading-relaxed">
                {auto.custom_message || 'استخدام قالب الرسالة التلقائي'}
              </div>

              {/* Stats Footer */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800 font-mono">
                <div className="flex items-center gap-3">
                  <span className="text-emerald-400 font-bold">✓ نُفّذت بنجاح: {(auto.success_count || 0).toLocaleString('en-US')}</span>
                  {auto.fail_count > 0 && <span className="text-rose-400 font-bold">✕ فشل: {auto.fail_count.toLocaleString('en-US')}</span>}
                </div>
                <span>آخر تشغيل: {auto.last_run_at ? new Date(auto.last_run_at).toLocaleDateString('en-US') : 'لم يتم بعد'}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Automation Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <span>إضافة قاعدة أتمتة جديدة</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">اسم القاعدة *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: إشعار فوري عند اعتماد سند القبض"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 text-slate-100 placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">الحدث المحفّز (Trigger Event)</label>
                <select
                  value={triggerEvent}
                  onChange={(e) => setTriggerEvent(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
                >
                  <option value="INVOICE_CREATED">عند إنشاء فاتورة مبيعات جديدة</option>
                  <option value="PAYMENT_RECEIVED">عند استلام وقيد سند قبض</option>
                  <option value="CUSTOMER_OVERDUE_7D">عند تأخر السداد لأكثر من 7 أيام</option>
                  <option value="CUSTOMER_OVERDUE_15D">عند تأخر السداد لأكثر من 15 يوم</option>
                  <option value="CUSTOMER_OVERDUE_30D">إشعار تصعيد بعد 30 يوم تأخير</option>
                  <option value="CREDIT_LIMIT_EXCEEDED">عند تجاوز الحد الائتماني المعتمد</option>
                  <option value="STATEMENT_MONTH_END">إرسال كشف الحساب بنهاية الشهر</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">نص الرسالة التلقائية *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="مرحباً {{customer_name}}، نود إعلامكم بـ..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 text-slate-100 placeholder:text-slate-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !name.trim() || !customMessage.trim()}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition-all shadow-md shadow-emerald-950/40 disabled:opacity-50"
                >
                  {isSaving ? 'جاري الحفظ...' : 'حفظ وتفعيل القاعدة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
