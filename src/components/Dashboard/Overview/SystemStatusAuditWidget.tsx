import React from 'react';
import { TabType } from '../../Sidebar';
import {
  ShieldCheck,
  Activity,
  Database,
  CloudCheck,
  Lock,
  ArrowUpRight,
  ScrollText,
  Server,
  CheckCircle2,
} from 'lucide-react';

interface SystemStatusAuditWidgetProps {
  auditLogs?: any[];
  onNavigate?: (tab: TabType, extra?: any) => void;
}

export const SystemStatusAuditWidget: React.FC<SystemStatusAuditWidgetProps> = ({
  auditLogs = [],
  onNavigate,
}) => {
  const safeLogs = Array.isArray(auditLogs) ? auditLogs : [];

  const defaultLogs = [
    { action: 'إصدار فاتورة ضريبية', entity: 'INV-2026-0042', time: 'منذ 10 دقائق', user: 'admin' },
    { action: 'تحصيل دفعة عميل', entity: 'PAY-2026-0088', time: 'منذ 25 دقيقة', user: 'cashier1' },
    { action: 'تعديل سعر بيع صنف', entity: 'COF-02', time: 'منذ ساعة', user: 'admin' },
  ];

  const activeLogs = safeLogs.length > 0
    ? safeLogs.slice(0, 3).map((l, i) => ({
        action: l.action || 'عملية مالية',
        entity: l.entity_id || l.entity || `OP-${i + 1}`,
        time: l.created_at ? l.created_at.substring(11, 16) : 'اليوم',
        user: l.user_email?.split('@')[0] || l.user_id || 'system',
      }))
    : defaultLogs;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 text-right flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">حوكمة النظام والنسخ الاحتياطي</h3>
            <p className="text-[11px] text-slate-400">حالة الخوادم والأمان واستمرارية الأعمال</p>
          </div>
        </div>

        <button
          onClick={() => onNavigate && onNavigate('observability')}
          className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
        >
          <span>المراقبة</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 3 Status indicators */}
      <div className="space-y-2.5">
        <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <Database className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-200 block">قاعدة البيانات السحابية</span>
              <span className="text-[10px] text-slate-400">Neon PostgreSQL • نشطة</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            متصل 100%
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center">
              <Server className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-200 block">النسخ الاحتياطي السحابي</span>
              <span className="text-[10px] text-slate-400">Backblaze B2 S3 • مشفر</span>
            </div>
          </div>
          <button
            onClick={() => onNavigate && onNavigate('backups')}
            className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition-colors cursor-pointer"
          >
            جاهز DR
          </button>
        </div>

        <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
              <Lock className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-200 block">بروتوكول أمان البيانات</span>
              <span className="text-[10px] text-slate-400">TLS 1.3 + تشفير AES-256</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
            مفعل
          </span>
        </div>
      </div>

      {/* Mini Audit Stream */}
      <div className="space-y-2 pt-2 border-t border-slate-800">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-bold text-slate-300">سجل العمليات والتدقيق الأخير:</span>
          <button
            onClick={() => onNavigate && onNavigate('audit')}
            className="text-[11px] text-emerald-400 hover:underline font-bold"
          >
            عرض الكل
          </button>
        </div>

        <div className="space-y-1.5">
          {activeLogs.map((log, idx) => (
            <div
              key={idx}
              className="p-2 rounded-xl bg-slate-800/30 border border-slate-800/60 flex items-center justify-between text-[11px]"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span className="font-bold text-slate-200 truncate">{log.action}</span>
                <span className="font-mono text-[10px] text-slate-400">({log.entity})</span>
              </div>
              <span className="font-mono text-[10px] text-slate-500 shrink-0">{log.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer link to Backups */}
      <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
        <button
          onClick={() => onNavigate && onNavigate('backups')}
          className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-slate-200 text-xs font-bold border border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>إدارة واستعادة النسخ الاحتياطية (Disaster Recovery)</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-indigo-400" />
        </button>
      </div>
    </div>
  );
};
