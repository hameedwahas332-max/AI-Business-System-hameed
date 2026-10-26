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
    <div id="whatsapp-scheduled-section" className="space-y-6 text-right">
      
      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between gap-3 border shadow-md animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
            <span>{feedback.msg}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-[11px] font-bold underline">
            إغلاق
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-[#091511] rounded-2xl border border-emerald-500/30 p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-400" />
            <span>الرسائل المجدولة والتذكيرات الآجلة</span>
          </h2>
          <p className="text-xs text-slate-400">
            إدارة الرسائل المجدولة للإرسال في تواريخ ومواعيد مستقبلية محددة مع إمكانية التعديل والإرسال الفوري.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenScheduleModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition-all shadow-md shadow-emerald-950 active:scale-95 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ جدولة رسالة جديدة</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 text-xs">
        <button
          onClick={() => setFilterStatus('ALL')}
          className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-all ${
            filterStatus === 'ALL'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-[#091511] text-slate-400 hover:text-white border border-emerald-500/20'
          }`}
        >
          الكل ({safeList.length})
        </button>
        <button
          onClick={() => setFilterStatus('SCHEDULED')}
          className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-all ${
            filterStatus === 'SCHEDULED'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-[#091511] text-slate-400 hover:text-white border border-emerald-500/20'
          }`}
        >
          مجدولة ({safeList.filter((s) => s.status === 'SCHEDULED').length})
        </button>
        <button
          onClick={() => setFilterStatus('SENT')}
          className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-all ${
            filterStatus === 'SENT'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-[#091511] text-slate-400 hover:text-white border border-emerald-500/20'
          }`}
        >
          مرسلة ({safeList.filter((s) => s.status === 'SENT').length})
        </button>
      </div>

      {/* Table of Scheduled Messages */}
      <div className="bg-[#091511] rounded-2xl border border-emerald-500/30 shadow-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Clock className="w-8 h-8 mx-auto text-emerald-400/40" />
            <p className="text-sm font-semibold text-white">لا توجد رسائل مجدولة حالياً</p>
            <p className="text-xs text-slate-400">اضغط على زر "+ جدولة رسالة جديدة" لبرمجة إرسال رسالة في موعد محدد.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#06120d] text-slate-300 font-bold border-b border-emerald-500/20">
                <tr>
                  <th className="p-3.5">المستلم</th>
                  <th className="p-3.5">رقم الهاتف</th>
                  <th className="p-3.5">نص الرسالة</th>
                  <th className="p-3.5">موعد الإرسال المجدول</th>
                  <th className="p-3.5">الحالة</th>
                  <th className="p-3.5 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-950/40 text-slate-300">
                {filtered.map((msg) => {
                  const isBusy = processingId === msg.id;
                  return (
                    <tr key={msg.id} className="hover:bg-[#0c2419] transition-colors">
                      <td className="p-3.5 font-bold text-white flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{msg.recipient_name || 'جهة اتصال'}</span>
                      </td>
                      <td className="p-3.5 font-mono text-slate-400" dir="ltr">
                        {msg.recipient_phone}
                      </td>
                      <td className="p-3.5 max-w-xs truncate font-sans text-slate-200">
                        {msg.message_body}
                      </td>
                      <td className="p-3.5 font-mono text-emerald-400">
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
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            msg.status === 'SENT'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : msg.status === 'FAILED'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
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
                              className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-lg font-bold border border-emerald-500/30 transition-all flex items-center gap-1 cursor-pointer"
                              title="إرسال فوري الآن"
                            >
                              <Send className="w-3 h-3" />
                              <span>إرسال الآن</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleCancel(msg.id)}
                            disabled={isBusy}
                            className="p-1.5 bg-[#06120d] hover:bg-rose-600/30 text-rose-400 rounded-lg border border-rose-500/20 transition-all cursor-pointer"
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
