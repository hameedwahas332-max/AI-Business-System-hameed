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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in text-right">
      <div className="bg-[#091511] rounded-2xl border border-emerald-500/30 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-[#061a14] to-[#0c2e1f] border-b border-emerald-500/20 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>جدولة رسالة WhatsApp لوقت محدد</span>
          </h3>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-white p-1 rounded-lg bg-[#06120d] border border-emerald-500/20 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mx-4 mt-3 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto text-xs flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1">
                رقم الهاتف المستلم (WhatsApp) <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                dir="ltr"
                required
                placeholder="+967 770 000 000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#06120d] border border-emerald-500/20 rounded-xl text-xs font-mono text-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-400 placeholder:text-slate-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1">
                اسم المستلم
              </label>
              <input
                type="text"
                placeholder="اسم العميل / المورد"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#06120d] border border-emerald-500/20 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-400 placeholder:text-slate-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1">
              موعد وتاريخ الإرسال المجدول <span className="text-emerald-400">*</span>
            </label>
            <input
              type="datetime-local"
              required
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#06120d] border border-emerald-500/20 rounded-xl text-xs font-mono text-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1">
              نص الرسالة المجدولة <span className="text-emerald-400">*</span>
            </label>
            <textarea
              rows={4}
              required
              placeholder="اكتب نص الرسالة هنا..."
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              className="w-full p-3 bg-[#06120d] border border-emerald-500/20 rounded-xl text-xs text-slate-200 leading-relaxed focus:outline-none focus:ring-1 focus:ring-emerald-400 font-sans"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-emerald-500/20">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800 cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !phone.trim() || !messageBody.trim() || !scheduledAt}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-950 cursor-pointer disabled:opacity-50"
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
