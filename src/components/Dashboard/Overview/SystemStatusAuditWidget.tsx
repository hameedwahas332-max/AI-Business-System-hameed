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

  const activeLogs = safeLogs.slice(0, 3).map((l, i) => ({
    action: l.action || 'عملية مالية',
    entity: l.entity_id || l.entity || `OP-${i + 1}`,
    time: l.created_at ? l.created_at.substring(11, 16) : 'اليوم',
    user: l.user_email?.split('@')[0] || l.user_id || 'system',
  }));

  return (
    <div className="m3-card p-5 sm:p-6 space-y-4 text-right flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--md-outline-variant)] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--md-on-surface)]">حوكمة النظام والنسخ الاحتياطي</h3>
            <p className="text-[11px] text-[var(--md-on-surface-variant)]">حالة الخوادم والأمان واستمرارية الأعمال</p>
          </div>
        </div>

        <button
          onClick={() => onNavigate && onNavigate('observability')}
          className="text-xs font-bold text-[var(--md-primary-text)] hover:underline flex items-center gap-1 cursor-pointer"
        >
          <span>المراقبة</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 3 Status indicators */}
      <div className="space-y-2.5">
        <div className="p-3 rounded-xl bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[var(--md-success-container)] text-[var(--md-on-success-container)] flex items-center justify-center shrink-0">
              <Database className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-[var(--md-on-surface)] block truncate">قاعدة البيانات السحابية</span>
              <span className="text-[10px] text-[var(--md-on-surface-variant)]">Neon PostgreSQL • نشطة</span>
            </div>
          </div>
          <span className="m3-badge m3-badge-success shrink-0">
            متصل 100%
          </span>
        </div>

        <div className="p-3 rounded-xl bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[var(--md-info-container)] text-[var(--md-on-info-container)] flex items-center justify-center shrink-0">
              <Server className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-[var(--md-on-surface)] block truncate">النسخ الاحتياطي السحابي</span>
              <span className="text-[10px] text-[var(--md-on-surface-variant)]">Backblaze B2 S3 • مشفر</span>
            </div>
          </div>
          <button
            onClick={() => onNavigate && onNavigate('backups')}
            className="m3-badge m3-badge-info hover:opacity-85 transition-opacity cursor-pointer shrink-0"
          >
            جاهز DR
          </button>
        </div>

        <div className="p-3 rounded-xl bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] flex items-center justify-center shrink-0">
              <Lock className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-[var(--md-on-surface)] block truncate">بروتوكول أمان البيانات</span>
              <span className="text-[10px] text-[var(--md-on-surface-variant)]">TLS 1.3 + تشفير AES-256</span>
            </div>
          </div>
          <span className="m3-badge m3-badge-primary shrink-0">
            مفعل
          </span>
        </div>
      </div>

      {/* Mini Audit Stream */}
      <div className="space-y-2 pt-2 border-t border-[var(--md-outline-variant)]">
        <div className="flex items-center justify-between text-xs text-[var(--md-on-surface-variant)]">
          <span className="font-bold text-[var(--md-on-surface)]">سجل العمليات والتدقيق الأخير:</span>
          <button
            onClick={() => onNavigate && onNavigate('audit')}
            className="text-[11px] text-[var(--md-primary-text)] hover:underline font-bold cursor-pointer"
          >
            عرض الكل
          </button>
        </div>

        <div className="space-y-1.5">
          {activeLogs.length > 0 ? (
            activeLogs.map((log, idx) => (
              <div
                key={idx}
                className="p-2 rounded-xl bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] flex items-center justify-between text-[11px] gap-2"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--md-primary)] shrink-0" />
                  <span className="font-bold text-[var(--md-on-surface)] truncate">{log.action}</span>
                  <span className="font-mono text-[10px] text-[var(--md-on-surface-variant)]">({log.entity})</span>
                </div>
                <span className="font-mono text-[10px] text-[var(--md-on-surface-variant)] shrink-0 tabular-nums">{log.time}</span>
              </div>
            ))
          ) : (
            <div className="p-3 rounded-xl bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] text-center text-[11px] text-[var(--md-on-surface-variant)]">
              لا توجد حركات تدقيق مسجلة حتى الآن
            </div>
          )}
        </div>
      </div>

      {/* Footer link to Backups */}
      <div className="pt-2 border-t border-[var(--md-outline-variant)] flex items-center justify-between">
        <button
          onClick={() => onNavigate && onNavigate('backups')}
          className="m3-btn-outlined w-full text-xs"
        >
          <span>إدارة واستعادة النسخ الاحتياطية (Disaster Recovery)</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-[var(--md-primary-text)]" />
        </button>
      </div>
    </div>
  );
};
