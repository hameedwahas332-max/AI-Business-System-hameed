import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { AuditLog } from '../../types';
import { ScrollText, ShieldCheck, Clock, User, Globe } from 'lucide-react';

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
    <div className="space-y-6 text-right text-slate-100 font-sans" dir="rtl">
      
      {/* Header Bar */}
      <div className="bg-slate-900 border border-emerald-900/40 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-lg shadow-emerald-950/50 shrink-0">
                <ScrollText className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>سجل تدقيق الأمان والعمليات</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                    Audit Trail
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 font-medium">
                  سجل مفصل لكل عملية أمان أو تعديل أو دخول تم إجراؤها داخل نطاق هذه المؤسسة
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="p-4 bg-amber-950/80 border border-amber-800 rounded-xl text-amber-300 text-xs text-center">
          {error}
        </div>
      ) : isLoading ? (
        <div className="p-8 text-center text-slate-400 text-xs">جاري تحميل سجل التدقيق...</div>
      ) : logs.length === 0 ? (
        <div className="p-8 bg-slate-900 border border-emerald-900/50 rounded-2xl text-center text-slate-400 text-xs shadow-xl">
          لا توجد سجلات تدقيق حتى الآن.
        </div>
      ) : (
        <div className="bg-slate-900 border border-emerald-900/50 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-slate-200">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">الوقت والتاريخ</th>
                  <th className="p-3.5">المستخدم</th>
                  <th className="p-3.5">الحدث / الحركة</th>
                  <th className="p-3.5">الكيان (Entity)</th>
                  <th className="p-3.5">عنوان IP</th>
                  <th className="p-3.5">التفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-mono text-slate-400 text-[11px]">
                      {new Date(log.created_at).toLocaleString('ar-YE')}
                    </td>
                    <td className="p-3.5 font-bold text-white">
                      {log.user_name || log.user_email || 'نظام أوتوماتيكي'}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold font-mono text-[11px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-slate-300">{log.entity}</td>
                    <td className="p-3.5 font-mono text-slate-400">{log.ip_address || '127.0.0.1'}</td>
                    <td className="p-3.5 text-slate-400 font-mono text-[11px]">
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
