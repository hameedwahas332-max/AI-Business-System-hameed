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
} from 'lucide-react';
import { WhatsAppScheduledMessage } from './types';

interface WhatsAppScheduledTabProps {
  scheduledMessages?: WhatsAppScheduledMessage[];
  onCancelScheduled?: (id: string) => Promise<boolean>;
  onOpenScheduleModal?: () => void;
}

export const WhatsAppScheduledTab: React.FC<WhatsAppScheduledTabProps> = ({
  scheduledMessages = [],
  onCancelScheduled = async () => true,
  onOpenScheduleModal = () => {},
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const safeList = Array.isArray(scheduledMessages) ? scheduledMessages : [];
  const filtered = safeList.filter((s) => {
    if (filterStatus === 'ALL') return true;
    return s.status === filterStatus;
  });

  return (
    <div id="whatsapp-scheduled-section" className="space-y-6">
      
      {/* Header */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Clock className="w-5 h-5 text-teal-400" />
            <span>الرسائل المجدولة والتذكيرات الآجلة</span>
          </h2>
          <p className="text-xs text-slate-400">
            إدارة الرسائل المجدولة للإرسال في تواريخ ومواعيد مستقبلية محددة.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenScheduleModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition-all shadow-md shadow-emerald-950/40 active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ جدولة رسالة جديدة</span>
          </button>
        </div>
      </div>

      {/* Table of Scheduled Messages */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Clock className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-sm font-semibold text-slate-300">لا توجد رسائل مجدولة حالياً</p>
            <p className="text-xs text-slate-500">اضغط على زر "+ جدولة رسالة جديدة" لبرمجة إرسال رسالة في موعد محدد.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950/60 text-slate-300 font-bold border-b border-slate-800">
                <tr>
                  <th className="p-3.5">المستلم</th>
                  <th className="p-3.5">رقم الهاتف</th>
                  <th className="p-3.5">نص الرسالة</th>
                  <th className="p-3.5">موعد الإرسال المجدول</th>
                  <th className="p-3.5">الحالة</th>
                  <th className="p-3.5 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filtered.map((msg) => (
                  <tr key={msg.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-bold text-slate-100 flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{msg.recipient_name || 'جهة اتصال'}</span>
                    </td>
                    <td className="p-3.5 font-mono text-slate-400" dir="ltr">
                      {msg.recipient_phone}
                    </td>
                    <td className="p-3.5 max-w-xs truncate font-sans text-slate-300">
                      {msg.message_body}
                    </td>
                    <td className="p-3.5 font-mono text-slate-400">
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
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          msg.status === 'SCHEDULED'
                            ? 'bg-teal-500/10 text-teal-400 border-teal-500/20'
                            : msg.status === 'SENT'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : msg.status === 'FAILED'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {msg.status === 'SCHEDULED' && <Clock className="w-3 h-3 text-teal-400" />}
                        {msg.status === 'SENT' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                        {msg.status === 'FAILED' && <AlertCircle className="w-3 h-3 text-rose-400" />}
                        {msg.status === 'CANCELLED' && <XCircle className="w-3 h-3 text-slate-400" />}
                        <span>
                          {msg.status === 'SCHEDULED'
                            ? 'مجدولة بانتظار الموعد'
                            : msg.status === 'SENT'
                            ? 'تم الإرسال بنجاح'
                            : msg.status === 'FAILED'
                            ? 'فشل الإرسال'
                            : 'تم الإلغاء'}
                        </span>
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      {msg.status === 'SCHEDULED' && (
                        <button
                          onClick={() => {
                            if (confirm('هل أنت متأكد من إلغاء جدولة هذه الرسالة؟')) {
                              onCancelScheduled(msg.id);
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs font-bold transition-colors"
                        >
                          إلغاء
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
