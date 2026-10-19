import React, { useState } from 'react';
import {
  FileText,
  Search,
  Check,
  CheckCheck,
  AlertTriangle,
  RotateCcw,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
} from 'lucide-react';
import { WhatsAppMessage } from './types';

interface WhatsAppLogsTabProps {
  logs?: WhatsAppMessage[];
  onRetryMessage?: (messageId: string, phone: string, text: string) => Promise<boolean>;
}

export const WhatsAppLogsTab: React.FC<WhatsAppLogsTabProps> = ({
  logs = [],
  onRetryMessage = async () => true,
}) => {
  const [search, setSearch] = useState('');
  const [filterDirection, setFilterDirection] = useState<'ALL' | 'INBOUND' | 'OUTBOUND'>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const safeLogs = Array.isArray(logs) ? logs : [];
  const filteredLogs = safeLogs.filter((log) => {
    const q = search.toLowerCase().trim();
    const phone = (log.phone_number || '').toLowerCase();
    const body = (log.message_body || '').toLowerCase();
    const name = (log.customer_name || log.supplier_name || '').toLowerCase();

    const matchesSearch = !q || phone.includes(q) || body.includes(q) || name.includes(q);
    if (!matchesSearch) return false;

    if (filterDirection !== 'ALL' && log.direction !== filterDirection) return false;
    if (filterStatus !== 'ALL' && log.status !== filterStatus) return false;

    return true;
  });

  const handleRetry = async (log: WhatsAppMessage) => {
    setRetryingId(log.id);
    try {
      await onRetryMessage(log.id, log.phone_number, log.message_body);
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div id="whatsapp-logs-section" className="space-y-4">
      
      {/* Search & Filters */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="بحث في سجل الرسائل (الرقم، الاسم، النص)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-3 pr-9 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 text-slate-100 placeholder:text-slate-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={filterDirection}
            onChange={(e: any) => setFilterDirection(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 font-bold"
          >
            <option value="ALL">جميع الاتجاهات</option>
            <option value="OUTBOUND">صادرة (Outbound)</option>
            <option value="INBOUND">واردة (Inbound)</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 font-bold"
          >
            <option value="ALL">جميع الحالات</option>
            <option value="SENT">مرسلة (Sent)</option>
            <option value="DELIVERED">تم التسليم (Delivered)</option>
            <option value="READ">تمت القراءة (Read)</option>
            <option value="FAILED">فشل الإرسال (Failed)</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <FileText className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-sm font-semibold text-slate-300">لا توجد رسائل مطابقة للبحث</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950/60 text-slate-300 font-bold border-b border-slate-800">
                <tr>
                  <th className="p-3.5">الاتجاه</th>
                  <th className="p-3.5">الطرف / الرقم</th>
                  <th className="p-3.5">النوع</th>
                  <th className="p-3.5">نص الرسالة</th>
                  <th className="p-3.5">وقت الإرسال</th>
                  <th className="p-3.5">الحالة</th>
                  <th className="p-3.5 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredLogs.map((log) => {
                  const isOut = log.direction === 'OUTBOUND';
                  return (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            isOut
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-blue-500/10 text-blue-300 border-blue-500/20'
                          }`}
                        >
                          {isOut ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                          <span>{isOut ? 'صادرة' : 'واردة'}</span>
                        </span>
                      </td>

                      <td className="p-3.5 space-y-0.5">
                        <p className="font-bold text-slate-100">{log.customer_name || log.supplier_name || 'جهة اتصال'}</p>
                        <p className="text-[10px] text-slate-400 font-mono" dir="ltr">
                          {log.phone_number}
                        </p>
                      </td>

                      <td className="p-3.5 font-bold text-[11px] text-slate-400">
                        {log.message_type || 'نص'}
                      </td>

                      <td className="p-3.5 max-w-sm truncate font-sans text-slate-200">
                        {log.message_body}
                      </td>

                      <td className="p-3.5 font-mono text-slate-400 text-[11px]">
                        {new Date(log.created_at).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            log.status === 'READ'
                              ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20'
                              : log.status === 'DELIVERED'
                              ? 'bg-teal-500/10 text-teal-300 border-teal-500/20'
                              : log.status === 'FAILED'
                              ? 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {log.status === 'READ' && <CheckCheck className="w-3 h-3 text-cyan-400" />}
                          {log.status === 'DELIVERED' && <CheckCheck className="w-3 h-3 text-teal-400" />}
                          {log.status === 'FAILED' && <AlertTriangle className="w-3 h-3 text-rose-400" />}
                          {log.status === 'SENT' && <Check className="w-3 h-3 text-slate-400" />}
                          <span>{log.status}</span>
                        </span>
                      </td>

                      <td className="p-3.5 text-center">
                        {log.status === 'FAILED' && (
                          <button
                            onClick={() => handleRetry(log)}
                            disabled={retryingId === log.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/20 text-xs font-bold transition-all disabled:opacity-40"
                          >
                            <RotateCcw className={`w-3 h-3 ${retryingId === log.id ? 'animate-spin' : ''}`} />
                            <span>إعادة المحاولة</span>
                          </button>
                        )}
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
