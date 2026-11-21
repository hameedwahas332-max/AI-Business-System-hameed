import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { AuditLog } from '../../types';
import { ScrollText } from 'lucide-react';

export const AuditTab: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getAuditLogs()
      .then((res) => setLogs(res?.data || []))
      .catch((err) => setError(err?.message || 'يتطلب عرض سجل التدقيق تسجيل الدخول بحساب له صلاحيات (audit:read)'))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6 text-right text-[var(--md-on-surface)] font-sans" dir="rtl">
      {/* Header Bar */}
      <div className="m3-card p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
              style={{
                backgroundColor: 'var(--md-primary-container)',
                color: 'var(--md-on-primary-container)',
              }}
            >
              <ScrollText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center flex-wrap gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-[var(--md-on-surface)] tracking-tight">
                  سجل تدقيق الأمان والعمليات
                </h1>
                <span
                  className="m3-badge font-mono"
                  style={{
                    backgroundColor: 'var(--md-primary-container)',
                    color: 'var(--md-on-primary-container)',
                    borderColor: 'transparent',
                  }}
                >
                  Audit Trail
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--md-on-surface-variant)] mt-0.5">
                سجل مفصل لكل عملية أمان أو تعديل أو دخول تم إجراؤها داخل نطاق هذه المؤسسة
              </p>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div
          className="p-4 rounded-2xl border text-xs text-center font-semibold"
          style={{
            backgroundColor: 'var(--md-warning-container)',
            borderColor: 'var(--md-warning)',
            color: 'var(--md-on-warning-container)',
          }}
        >
          {error}
        </div>
      ) : isLoading ? (
        <div className="m3-card p-8 text-center text-[var(--md-on-surface-variant)] text-xs">
          جاري تحميل سجل التدقيق...
        </div>
      ) : logs.length === 0 ? (
        <div className="m3-card p-8 text-center text-[var(--md-on-surface-variant)] text-xs">
          لا توجد سجلات تدقيق حتى الآن.
        </div>
      ) : (
        <div className="m3-card overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="m3-table text-xs">
              <thead className="m3-thead">
                <tr>
                  <th className="m3-th">الوقت والتاريخ</th>
                  <th className="m3-th">المستخدم</th>
                  <th className="m3-th">الحدث / الحركة</th>
                  <th className="m3-th">الكيان (Entity)</th>
                  <th className="m3-th">عنوان IP</th>
                  <th className="m3-th">التفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--md-outline-variant)]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[var(--md-surface-container-high)]/60 transition-colors">
                    <td className="p-3.5 font-mono tabular-nums text-[var(--md-on-surface-variant)] text-[11px] whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('ar-YE')}
                    </td>
                    <td className="p-3.5 font-bold text-[var(--md-on-surface)]">
                      {log.user_name || log.user_email || 'نظام أوتوماتيكي'}
                    </td>
                    <td className="p-3.5">
                      <span
                        className="m3-badge font-mono"
                        style={{
                          backgroundColor: 'var(--md-primary-container)',
                          color: 'var(--md-on-primary-container)',
                          borderColor: 'transparent',
                        }}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-[var(--md-on-surface)]">{log.entity}</td>
                    <td className="p-3.5 font-mono tabular-nums text-[var(--md-on-surface-variant)]">
                      {log.ip_address || '127.0.0.1'}
                    </td>
                    <td className="p-3.5 text-[var(--md-on-surface-variant)] font-mono text-[11px]">
                      {log.details ? JSON.stringify(log.details) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
