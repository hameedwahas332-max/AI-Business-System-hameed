import React, { useState, useEffect } from 'react';
import {
  Clock,
  Calendar,
  Send,
  RefreshCw,
  AlertCircle,
  X,
  User,
  Phone,
} from 'lucide-react';

interface ScheduleMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPhone?: string;
  initialText?: string;
  customers?: any[];
  suppliers?: any[];
  onScheduleMessage?: (data: any) => Promise<boolean | void> | boolean | void;
  onSchedule?: (data: any) => Promise<boolean | void> | boolean | void;
}

export const ScheduleMessageModal: React.FC<ScheduleMessageModalProps> = ({
  isOpen,
  onClose,
  initialPhone = '',
  initialText = '',
  customers = [],
  suppliers = [],
  onScheduleMessage,
  onSchedule,
}) => {
  const [phone, setPhone] = useState(initialPhone);
  const [recipientName, setRecipientName] = useState('');
  const [messageBody, setMessageBody] = useState(initialText);
  const [scheduledAt, setScheduledAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync initial props when opened
  useEffect(() => {
    if (initialPhone) setPhone(initialPhone);
    if (initialText) setMessageBody(initialText);
    // Default scheduled time to tomorrow at 10:00 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    setScheduledAt(tomorrow.toISOString().slice(0, 16));
  }, [initialPhone, initialText, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !messageBody.trim() || !scheduledAt) {
      setError('يرجى تعبئة كافة الحقول المطلوبة');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const payload = {
        recipient_phone: phone.trim(),
        recipient_name: recipientName.trim() || 'جهة اتصال',
        message_body: messageBody.trim(),
        scheduled_at: new Date(scheduledAt).toISOString(),
      };

      let isSuccess = false;
      if (typeof onScheduleMessage === 'function') {
        const result = await onScheduleMessage(payload);
        isSuccess = result !== false;
      } else if (typeof onSchedule === 'function') {
        const result = await onSchedule(payload);
        isSuccess = result !== false;
      } else {
        // Direct API fallback
        const res = await fetch('/api/v1/whatsapp/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        isSuccess = res.ok;
      }

      if (isSuccess) {
        if (typeof onClose === 'function') {
          onClose();
        }
      } else {
        setError('فشل في جدولة الرسالة. تأكد من إدخال تاريخ مستقبلي صحيح.');
      }
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ غير متوقع');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div dir="rtl" className="fixed inset-0 z-50 m3-backdrop flex items-center justify-center p-3 sm:p-4 animate-fade-in text-right">
      <div className="m3-modal-surface max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-[var(--md-surface-container-high)] border-b border-[var(--md-outline-variant)] flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--md-on-surface)] flex items-center gap-2">
            <Clock className="w-4 h-4 text-[var(--md-primary-text)]" />
            <span>جدولة رسالة WhatsApp لوقت محدد</span>
          </h3>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="m3-btn-text !min-h-[30px] !p-1.5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mx-4 mt-3 p-3 bg-[var(--md-error-container)] border border-[var(--md-error)]/30 text-[var(--md-on-error-container)] rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-[var(--md-error)]" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto text-xs flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--md-on-surface)] mb-1">
                رقم الهاتف المستلم (WhatsApp) <span className="text-[var(--md-primary-text)]">*</span>
              </label>
              <input
                type="text"
                dir="ltr"
                required
                placeholder="+967 770 000 000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="m3-input !h-10 text-xs font-mono tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--md-on-surface)] mb-1">
                اسم المستلم
              </label>
              <input
                type="text"
                placeholder="اسم العميل / المورد"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="m3-input !h-10 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--md-on-surface)] mb-1">
              موعد وتاريخ الإرسال المجدول <span className="text-[var(--md-primary-text)]">*</span>
            </label>
            <input
              type="datetime-local"
              required
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="m3-input !h-10 text-xs font-mono tabular-nums"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--md-on-surface)] mb-1">
              نص الرسالة المجدولة <span className="text-[var(--md-primary-text)]">*</span>
            </label>
            <textarea
              rows={4}
              required
              placeholder="اكتب نص الرسالة هنا..."
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              className="m3-input !h-auto py-2.5 text-xs leading-relaxed font-sans"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--md-outline-variant)]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="m3-btn-outlined text-xs cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !phone.trim() || !messageBody.trim() || !scheduledAt}
              className="m3-btn-primary text-xs cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
              <span>تأكيد جدولة الرسالة</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
