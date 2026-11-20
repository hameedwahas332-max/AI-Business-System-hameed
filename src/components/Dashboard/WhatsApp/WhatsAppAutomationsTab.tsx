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
  onToggleAutomation = async (_id?: string, _active?: boolean) => {},
  onSaveAutomation = async (_data?: any) => true,
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
    <div id="whatsapp-automations-section" dir="rtl" className="space-y-6">
      
      {/* Header Info Banner */}
      <div className="m3-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-[var(--md-on-surface)] flex items-center gap-2">
            <Zap className="w-5 h-5 text-[var(--md-warning)]" />
            <span>قواعد وأتمتة التنبيهات والتحصيل الذكي</span>
          </h2>
          <p className="text-xs text-[var(--md-on-surface-variant)]">
            تفعيل الإرسال التلقائي للرسائل الموثقة عند حدوث العمليات المحاسبية في النظام بدون تدخل يدوي.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="m3-btn-primary text-xs shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ إضافة قاعدة أتمتة</span>
        </button>
      </div>

      {/* Multi-stage Collection Pipeline visual */}
      <div className="m3-card-elevated p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--md-primary-text)]">
            <ShieldCheck className="w-4 h-4" />
            <span>مسار التحصيل المتعدد المراحل (Multi-Stage Collection Workflow)</span>
          </div>
          <span className="text-[10px] text-[var(--md-on-surface-variant)] font-mono">حماية كاملة من التكرار العشوائي</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-[var(--md-on-surface)]">
              <span>المرحلة 1: إصدار الفاتورة</span>
              <span className="text-[var(--md-success)]">فوري</span>
            </div>
            <p className="text-[10px] text-[var(--md-on-surface-variant)] leading-tight">إرسال رابط الفاتورة وتفاصيل المبلغ المستحق للعميل.</p>
          </div>

          <div className="p-3 rounded-xl bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-[var(--md-on-surface)]">
              <span>المرحلة 2: تذكير ودي</span>
              <span className="text-[var(--md-warning)] tabular-nums">+7 أيام</span>
            </div>
            <p className="text-[10px] text-[var(--md-on-surface-variant)] leading-tight">تذكير لطيف بموعد الاستحقاق وبيانات الحساب البنكي.</p>
          </div>

          <div className="p-3 rounded-xl bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-[var(--md-on-surface)]">
              <span>المرحلة 3: إشعار استحقاق</span>
              <span className="text-[var(--md-error)] tabular-nums">+15 يوم</span>
            </div>
            <p className="text-[10px] text-[var(--md-on-surface-variant)] leading-tight">إشعار رسمي بضرورة سداد المبلغ لتفادي تعليق الحساب.</p>
          </div>

          <div className="p-3 rounded-xl bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-[var(--md-on-surface)]">
              <span>المرحلة 4: إشعار السداد</span>
              <span className="text-[var(--md-success)]">عند القبض</span>
            </div>
            <p className="text-[10px] text-[var(--md-on-surface-variant)] leading-tight">تأكيد استلام الدفعة النقدية وإرسال سند القبض.</p>
          </div>
        </div>
      </div>

      {/* Rules List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {automations.map((auto) => {
          return (
            <div
              key={auto.id}
              className={`m3-card p-5 space-y-4 transition-all ${
                auto.is_active ? '' : 'opacity-65'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-[var(--md-on-surface)]">{auto.name}</h3>
                    <span
                      className={`m3-badge text-[10px] font-bold ${
                        auto.is_active ? 'm3-badge-success' : 'm3-badge-secondary'
                      }`}
                    >
                      {auto.is_active ? 'نشط ويعمل' : 'متوقف مؤقتاً'}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-[var(--md-primary-text)] flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" />
                    <span>الحدث المحفّز: {getTriggerName(auto.trigger_event)}</span>
                  </p>
                </div>

                <button
                  onClick={() => onToggleAutomation(auto.id, !auto.is_active)}
                  className={`p-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                    auto.is_active
                      ? 'bg-[var(--md-warning-container)] text-[var(--md-on-warning-container)] border-[var(--md-warning)]/30 hover:opacity-85'
                      : 'bg-[var(--md-success-container)] text-[var(--md-on-success-container)] border-[var(--md-success)]/30 hover:opacity-85'
                  }`}
                  title={auto.is_active ? 'إيقاف مؤقت' : 'تفعيل'}
                >
                  {auto.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
              </div>

              {/* Message Payload */}
              <div className="p-3 bg-[var(--md-surface-container-low)] rounded-xl text-xs text-[var(--md-on-surface)] font-sans border border-[var(--md-outline-variant)] leading-relaxed">
                {auto.custom_message || 'استخدام قالب الرسالة التلقائي'}
              </div>

              {/* Stats Footer */}
              <div className="flex items-center justify-between text-[11px] text-[var(--md-on-surface-variant)] pt-2 border-t border-[var(--md-outline-variant)] font-mono tabular-nums">
                <div className="flex items-center gap-3">
                  <span className="text-[var(--md-success)] font-bold">✓ نُفّذت بنجاح: {(auto.success_count || 0).toLocaleString('en-US')}</span>
                  {auto.fail_count > 0 && <span className="text-[var(--md-error)] font-bold">✕ فشل: {auto.fail_count.toLocaleString('en-US')}</span>}
                </div>
                <span>آخر تشغيل: {auto.last_run_at ? new Date(auto.last_run_at).toLocaleDateString('en-US') : 'لم يتم بعد'}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Automation Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 m3-backdrop flex items-center justify-center p-4 animate-fade-in">
          <div className="m3-modal-surface max-w-lg w-full p-6 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-[var(--md-outline-variant)] pb-3">
              <h3 className="text-base font-bold text-[var(--md-on-surface)] flex items-center gap-2">
                <Zap className="w-5 h-5 text-[var(--md-warning)]" />
                <span>إضافة قاعدة أتمتة جديدة</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="m3-btn-text !min-h-[32px] !px-2 !py-1 text-base font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[var(--md-on-surface)] mb-1">اسم القاعدة *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: إشعار فوري عند اعتماد سند القبض"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="m3-input !h-10 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--md-on-surface)] mb-1">الحدث المحفّز (Trigger Event)</label>
                <select
                  value={triggerEvent}
                  onChange={(e) => setTriggerEvent(e.target.value)}
                  className="m3-select !h-10 text-xs"
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
                <label className="block text-xs font-bold text-[var(--md-on-surface)] mb-1">نص الرسالة التلقائية *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="مرحباً {{customer_name}}، نود إعلامكم بـ..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="m3-input !h-auto py-2.5 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--md-outline-variant)]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="m3-btn-outlined text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !name.trim() || !customMessage.trim()}
                  className="m3-btn-primary text-xs cursor-pointer disabled:opacity-50"
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
