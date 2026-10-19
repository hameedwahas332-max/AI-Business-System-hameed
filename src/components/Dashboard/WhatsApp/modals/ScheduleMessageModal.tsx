import React, { useState } from 'react';
import {
  Clock,
  Calendar,
  Send,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

interface ScheduleMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPhone?: string;
  initialText?: string;
  onScheduleMessage: (data: any) => Promise<boolean>;
}

export const ScheduleMessageModal: React.FC<ScheduleMessageModalProps> = ({
  isOpen,
  onClose,
  initialPhone = '',
  initialText = '',
  onScheduleMessage,
}) => {
  const [phone, setPhone] = useState(initialPhone);
  const [recipientName, setRecipientName] = useState('');
  const [messageBody, setMessageBody] = useState(initialText);
  const [scheduledAt, setScheduledAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync initial props when opened
  React.useEffect(() => {
    if (initialPhone) setPhone(initialPhone);
    if (initialText) setMessageBody(initialText);
  }, [initialPhone, initialText, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !messageBody.trim() || !scheduledAt) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const ok = await onScheduleMessage({
        recipient_phone: phone.trim(),
        recipient_name: recipientName.trim() || 'جهة اتصال',
        message_body: messageBody.trim(),
        scheduled_at: new Date(scheduledAt).toISOString(),
      });
      if (ok) {
        onClose();
      } else {
        setError('فشل في جدولة الرسالة. تأكد من إدخال تاريخ مستقبلي صحيح.');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ غير متوقع');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-scale-in text-right">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <span>جدولة رسالة WhatsApp لوقت محدد</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg font-bold">
            ✕
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف المستلم *</label>
              <input
                type="text"
                dir="ltr"
                required
                placeholder="+967 770 000 000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">اسم المستلم</label>
              <input
                type="text"
                placeholder="اسم العميل / المورد"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              موعد وتاريخ الإرسال المجدول *
            </label>
            <input
              type="datetime-local"
              required
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">نص الرسالة المجدولة *</label>
            <textarea
              rows={4}
              required
              placeholder="اكتب نص الرسالة..."
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 leading-relaxed"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !phone.trim() || !messageBody.trim() || !scheduledAt}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-md shadow-blue-600/20 disabled:opacity-50"
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
