import React, { useState } from 'react';
import {
  Clock,
  Plus,
  Trash2,
  Calendar,
  Phone,
  User,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Send,
  RefreshCw,
} from 'lucide-react';
import { WhatsAppScheduledMessage } from './types';
import { toEnglishDigits } from '../../../lib/formatters';

interface WhatsAppScheduledTabProps {
  scheduledMessages?: WhatsAppScheduledMessage[];
  onCancelScheduled?: (id: string) => Promise<boolean>;
  onSendNowScheduled?: (msg: WhatsAppScheduledMessage) => Promise<boolean>;
  onOpenScheduleModal?: () => void;
}

export const WhatsAppScheduledTab: React.FC<WhatsAppScheduledTabProps> = ({
  scheduledMessages = [],
  onCancelScheduled = async (_id?: string) => true,
  onSendNowScheduled,
  onOpenScheduleModal = () => {},
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const safeList = Array.isArray(scheduledMessages) ? scheduledMessages : [];
  const filtered = safeList.filter((s) => {
    if (filterStatus === 'ALL') return true;
    return s.status === filterStatus;
  });

  const handleSendNow = async (msg: WhatsAppScheduledMessage) => {
    setProcessingId(msg.id);
    setFeedback(null);
    try {
      if (onSendNowScheduled) {
        const ok = await onSendNowScheduled(msg);
        if (ok) {
          setFeedback({
            type: 'success',
            msg: `✅ تم إرسال الرسالة المجدولة إلى ${msg.recipient_name || msg.recipient_phone} فورياً بنجاح!`,
          });
          return;
        }
      }

      // Direct fallback
      const token = localStorage.getItem('erp_auth_token') || '';
      const res = await fetch('/api/v1/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          recipientPhone: msg.recipient_phone,
          recipientName: msg.recipient_name,
          messageText: msg.message_body,
          messageType: 'SCHEDULED_DISPATCH',
        }),
      });

      if (res.ok) {
        await onCancelScheduled(msg.id);
        setFeedback({
          type: 'success',
          msg: `✅ تم إرسال الرسالة المجدولة إلى ${msg.recipient_name || msg.recipient_phone} وتسجيلها في النظام!`,
        });
      } else {
        throw new Error('فشل إرسال الرسالة');
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err?.message || 'تعذر إرسال الرسالة المجدولة' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancel = async (id: string) => {
    setProcessingId(id);
    setFeedback(null);
    try {
      const ok = await onCancelScheduled(id);
      if (ok) {
        setFeedback({ type: 'success', msg: 'تم إلغاء جدولة الرسالة بنجاح' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err?.message || 'تعذر إلغاء الجدولة' });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div id="whatsapp-scheduled-section" dir="rtl" className="space-y-6 text-right">
      
      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between gap-3 border animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-[var(--md-success-container)] text-[var(--md-on-success-container)] border-[var(--md-success)]/30'
              : 'bg-[var(--md-error-container)] text-[var(--md-on-error-container)] border-[var(--md-error)]/30'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[var(--md-success)]" />
            ) : (
              <AlertCircle className="w-4 h-4 text-[var(--md-error)]" />
            )}
            <span>{feedback.msg}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="m3-btn-text !min-h-[28px] !px-2 !py-1 text-[11px] font-bold underline">
            إغلاق
          </button>
        </div>
      )}

      {/* Header */}
      <div className="m3-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-[var(--md-on-surface)] flex items-center gap-2">
            <Clock className="w-5 h-5 text-[var(--md-primary-text)]" />
            <span>الرسائل المجدولة والتذكيرات الآجلة</span>
          </h2>
          <p className="text-xs text-[var(--md-on-surface-variant)]">
            إدارة الرسائل المجدولة للإرسال في تواريخ ومواعيد مستقبلية محددة مع إمكانية التعديل والإرسال الفوري.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenScheduleModal}
            className="m3-btn-primary text-xs shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ جدولة رسالة جديدة</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 text-xs flex-wrap">
        <button
          onClick={() => setFilterStatus('ALL')}
          className={`!min-h-[34px] !px-3.5 !py-1.5 text-xs font-bold tabular-nums cursor-pointer ${
            filterStatus === 'ALL' ? 'm3-btn-primary' : 'm3-btn-outlined'
          }`}
        >
          الكل ({safeList.length})
        </button>
        <button
          onClick={() => setFilterStatus('SCHEDULED')}
          className={`!min-h-[34px] !px-3.5 !py-1.5 text-xs font-bold tabular-nums cursor-pointer ${
            filterStatus === 'SCHEDULED' ? 'm3-btn-primary' : 'm3-btn-outlined'
          }`}
        >
          مجدولة ({safeList.filter((s) => s.status === 'SCHEDULED').length})
        </button>
        <button
          onClick={() => setFilterStatus('SENT')}
          className={`!min-h-[34px] !px-3.5 !py-1.5 text-xs font-bold tabular-nums cursor-pointer ${
            filterStatus === 'SENT' ? 'm3-btn-primary' : 'm3-btn-outlined'
          }`}
        >
          مرسلة ({safeList.filter((s) => s.status === 'SENT').length})
        </button>
      </div>

      {/* Table of Scheduled Messages */}
      <div className="m3-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-[var(--md-on-surface-variant)] space-y-2">
            <Clock className="w-8 h-8 mx-auto text-[var(--md-primary-text)] opacity-50" />
            <p className="text-sm font-semibold text-[var(--md-on-surface)]">لا توجد رسائل مجدولة حالياً</p>
            <p className="text-xs text-[var(--md-on-surface-variant)]">اضغط على زر "+ جدولة رسالة جديدة" لبرمجة إرسال رسالة في موعد محدد.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="m3-table w-full text-right text-xs">
              <thead className="m3-thead">
                <tr>
                  <th className="m3-th">المستلم</th>
                  <th className="m3-th">رقم الهاتف</th>
                  <th className="m3-th">نص الرسالة</th>
                  <th className="m3-th">موعد الإرسال المجدول</th>
                  <th className="m3-th">الحالة</th>
                  <th className="m3-th text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--md-outline-variant)] text-[var(--md-on-surface)]">
                {filtered.map((msg) => {
                  const isBusy = processingId === msg.id;
                  return (
                    <tr key={msg.id} className="hover:bg-[var(--md-surface-container-high)]/60 transition-colors">
                      <td className="p-3.5 font-bold text-[var(--md-on-surface)] flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-[var(--md-primary-text)] shrink-0" />
                        <span>{msg.recipient_name || 'جهة اتصال'}</span>
                      </td>
                      <td className="p-3.5 font-mono tabular-nums text-[var(--md-on-surface-variant)]" dir="ltr">
                        {msg.recipient_phone}
                      </td>
                      <td className="p-3.5 max-w-xs truncate font-sans text-[var(--md-on-surface)]">
                        {msg.message_body}
                      </td>
                      <td className="p-3.5 font-mono tabular-nums text-[var(--md-primary-text)] font-semibold">
                        {new Date(msg.scheduled_at).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`m3-badge text-[10px] font-bold ${
                            msg.status === 'SENT'
                              ? 'm3-badge-success'
                              : msg.status === 'FAILED'
                              ? 'm3-badge-error'
                              : 'm3-badge-warning'
                          }`}
                        >
                          {msg.status === 'SENT' ? 'تم الإرسال' : msg.status === 'FAILED' ? 'فشل' : 'مجدولة'}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {msg.status !== 'SENT' && (
                            <button
                              onClick={() => handleSendNow(msg)}
                              disabled={isBusy}
                              className="m3-btn-tonal !min-h-[30px] !px-2.5 !py-1 text-xs cursor-pointer disabled:opacity-50"
                              title="إرسال فوري الآن"
                            >
                              <Send className="w-3 h-3" />
                              <span>إرسال الآن</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleCancel(msg.id)}
                            disabled={isBusy}
                            className="p-1.5 bg-[var(--md-error-container)] hover:opacity-85 text-[var(--md-on-error-container)] rounded-lg border border-[var(--md-error)]/25 transition-all cursor-pointer disabled:opacity-50"
                            title="إلغاء الجدولة وحذف الرسالة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
