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
  Download,
  Send,
  RefreshCw,
} from 'lucide-react';
import { WhatsAppMessage } from './types';

interface WhatsAppLogsTabProps {
  logs?: WhatsAppMessage[];
  onRetryMessage?: (messageId: string, phone: string, text: string) => Promise<boolean>;
  onRefresh?: () => void;
}

export const WhatsAppLogsTab: React.FC<WhatsAppLogsTabProps> = ({
  logs = [],
  onRetryMessage = async (_messageId?: string, _phone?: string, _text?: string) => true,
  onRefresh,
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
    const name = (log.customer_name || log.supplier_name || log.display_name || '').toLowerCase();

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

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['المعرف', 'الاتجاه', 'الطرف', 'رقم الهاتف', 'نوع الرسالة', 'الحالة', 'الوقت', 'نص الرسالة'];
    const rows = filteredLogs.map((l) => [
      `"${l.id}"`,
      `"${l.direction === 'OUTBOUND' ? 'صادرة' : 'واردة'}"`,
      `"${(l.customer_name || l.supplier_name || l.display_name || 'جهة اتصال').replace(/"/g, '""')}"`,
      `"${l.phone_number}"`,
      `"${l.message_type || 'نص'}"`,
      `"${l.status || 'SENT'}"`,
      `"${new Date(l.created_at).toLocaleString('en-US')}"`,
      `"${(l.message_body || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `whatsapp_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition-colors disabled:opacity-40"
            title="تصدير السجل إلى ملف CSV"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>تصدير السجل</span>
          </button>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="تحديث السجل"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
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
                        <p className="font-bold text-slate-100">{log.customer_name || log.supplier_name || log.display_name || 'جهة اتصال'}</p>
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
                              : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                          }`}
                        >
                          {log.status === 'READ' && <CheckCheck className="w-3 h-3 text-cyan-400" />}
                          {log.status === 'DELIVERED' && <CheckCheck className="w-3 h-3 text-teal-400" />}
                          {log.status === 'FAILED' && <AlertTriangle className="w-3 h-3 text-rose-400" />}
                          {(!log.status || log.status === 'SENT') && <Check className="w-3 h-3 text-emerald-400" />}
                          <span>{log.status || 'SENT'}</span>
                        </span>
                      </td>

                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRetry(log)}
                          disabled={retryingId === log.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/20 text-xs font-bold transition-all disabled:opacity-40"
                          title="إعادة إرسال الرسالة من داخل النظام"
                        >
                          {retryingId === log.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3 h-3" />
                          )}
                          <span>إعادة الإرسال</span>
                        </button>
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
