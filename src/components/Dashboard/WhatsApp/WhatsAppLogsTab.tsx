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
    <div id="whatsapp-logs-section" className="space-y-4 text-[var(--md-on-surface)]" dir="rtl">
      {/* Search & Filters */}
      <div className="m3-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[var(--md-on-surface-variant)] absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="بحث في سجل الرسائل (الرقم، الاسم، النص)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="m3-input !h-10 !pr-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={filterDirection}
            onChange={(e: any) => setFilterDirection(e.target.value)}
            className="m3-select !h-10 !w-auto text-xs font-bold"
          >
            <option value="ALL">جميع الاتجاهات</option>
            <option value="OUTBOUND">صادرة (Outbound)</option>
            <option value="INBOUND">واردة (Inbound)</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="m3-select !h-10 !w-auto text-xs font-bold"
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
            className="m3-btn-outlined !min-h-[40px] text-xs disabled:opacity-40 cursor-pointer"
            title="تصدير السجل إلى ملف CSV"
          >
            <Download className="w-3.5 h-3.5 text-[var(--md-primary-text)]" />
            <span>تصدير السجل</span>
          </button>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="m3-btn-outlined !min-h-[40px] !px-2.5 cursor-pointer"
              title="تحديث السجل"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Logs Table */}
      <div className="m3-card overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-[var(--md-on-surface-variant)] space-y-2">
            <FileText className="w-8 h-8 mx-auto opacity-50" />
            <p className="text-sm font-semibold text-[var(--md-on-surface)]">لا توجد رسائل مطابقة للبحث</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="m3-table text-right text-xs" dir="rtl">
              <thead className="m3-thead">
                <tr>
                  <th className="m3-th">الاتجاه</th>
                  <th className="m3-th">الطرف / الرقم</th>
                  <th className="m3-th">النوع</th>
                  <th className="m3-th">نص الرسالة</th>
                  <th className="m3-th">وقت الإرسال</th>
                  <th className="m3-th">الحالة</th>
                  <th className="m3-th text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--md-outline-variant)]">
                {filteredLogs.map((log) => {
                  const isOut = log.direction === 'OUTBOUND';
                  return (
                    <tr key={log.id} className="hover:bg-[var(--md-surface-container-low)] transition-colors">
                      <td className="p-3.5">
                        <span
                          className={`m3-badge text-[10px] inline-flex items-center gap-1 ${
                            isOut ? 'm3-badge-success' : 'm3-badge-info'
                          }`}
                        >
                          {isOut ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                          <span>{isOut ? 'صادرة' : 'واردة'}</span>
                        </span>
                      </td>

                      <td className="p-3.5 space-y-0.5">
                        <p className="font-bold text-[var(--md-on-surface)]">{log.customer_name || log.supplier_name || log.display_name || 'جهة اتصال'}</p>
                        <p className="text-[10px] text-[var(--md-on-surface-variant)] font-mono tabular-nums" dir="ltr">
                          {log.phone_number}
                        </p>
                      </td>

                      <td className="p-3.5 font-bold text-[11px] text-[var(--md-on-surface-variant)]">
                        {log.message_type || 'نص'}
                      </td>

                      <td className="p-3.5 max-w-sm truncate font-sans text-[var(--md-on-surface)]">
                        {log.message_body}
                      </td>

                      <td className="p-3.5 font-mono tabular-nums text-[var(--md-on-surface-variant)] text-[11px]">
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
                          className={`m3-badge text-[10px] inline-flex items-center gap-1 ${
                            log.status === 'READ'
                              ? 'm3-badge-info'
                              : log.status === 'DELIVERED'
                              ? 'm3-badge-primary'
                              : log.status === 'FAILED'
                              ? 'm3-badge-error'
                              : 'm3-badge-success'
                          }`}
                        >
                          {log.status === 'READ' && <CheckCheck className="w-3 h-3" />}
                          {log.status === 'DELIVERED' && <CheckCheck className="w-3 h-3" />}
                          {log.status === 'FAILED' && <AlertTriangle className="w-3 h-3" />}
                          {(!log.status || log.status === 'SENT') && <Check className="w-3 h-3" />}
                          <span>{log.status || 'SENT'}</span>
                        </span>
                      </td>

                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRetry(log)}
                          disabled={retryingId === log.id}
                          className="m3-btn-tonal !min-h-[30px] !px-2.5 !py-1 text-xs disabled:opacity-40 cursor-pointer"
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
