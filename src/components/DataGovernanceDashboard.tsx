import React from 'react';
import {
  ShieldCheck,
  Database,
  CheckCircle2,
  Lock,
  Award,
  Key,
} from 'lucide-react';

export const DataGovernanceDashboard: React.FC = () => {
  return (
    <div className="space-y-6 text-right text-[var(--md-on-surface)] font-sans" dir="rtl">
      {/* Header */}
      <div className="m3-card p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
            style={{
              backgroundColor: 'var(--md-success-container)',
              color: 'var(--md-on-success-container)',
            }}
          >
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center flex-wrap gap-2">
              <h2 className="text-base sm:text-lg font-bold text-[var(--md-on-surface)]">
                حوكمة البيانات والخصوصية والامتثال (Data Governance & Compliance)
              </h2>
              <span
                className="m3-badge font-mono"
                style={{
                  backgroundColor: 'var(--md-primary-container)',
                  color: 'var(--md-on-primary-container)',
                  borderColor: 'transparent',
                }}
              >
                ZATCA & GDPR READY
              </span>
            </div>
            <p className="text-xs text-[var(--md-on-surface-variant)] mt-0.5">
              إدارة سياسات تشفير البيانات، العزل متعدد المستأجرين، وسجلات الحماية والامتثال الرقابي
            </p>
          </div>
        </div>

        <span
          className="m3-badge px-3 py-1.5 font-mono tabular-nums shrink-0"
          style={{
            backgroundColor: 'var(--md-success-container)',
            color: 'var(--md-on-success-container)',
            borderColor: 'transparent',
          }}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>امتثال بنسبة 100%</span>
        </span>
      </div>

      {/* 3 Core Security Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="m3-card p-5 space-y-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              backgroundColor: 'var(--md-success-container)',
              color: 'var(--md-on-success-container)',
            }}
          >
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--md-on-surface)]">تشفير البيانات أثناء النقل (In-Transit)</h3>
            <p className="text-xs text-[var(--md-on-surface-variant)] mt-1 leading-relaxed">
              حماية كامل حركة المرور عبر بروتوكول TLS 1.3 مع شهادات SSL صادرة وموثقة دولياً.
            </p>
          </div>
          <div className="pt-2.5 border-t border-[var(--md-outline-variant)] flex items-center justify-between text-xs">
            <span className="text-[var(--md-on-surface-variant)]">البروتوكول:</span>
            <span className="font-mono font-bold tabular-nums" style={{ color: 'var(--md-success)' }}>
              TLS 1.3 / HTTPS
            </span>
          </div>
        </div>

        <div className="m3-card p-5 space-y-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              backgroundColor: 'var(--md-info-container)',
              color: 'var(--md-on-info-container)',
            }}
          >
            <Key className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--md-on-surface)]">تشفير البيانات أثناء التخزين (At-Rest)</h3>
            <p className="text-xs text-[var(--md-on-surface-variant)] mt-1 leading-relaxed">
              تشفير قواعد بيانات PostgreSQL والملفات الاحتياطية باستخدام خوارزمية AES-256 العسكرية.
            </p>
          </div>
          <div className="pt-2.5 border-t border-[var(--md-outline-variant)] flex items-center justify-between text-xs">
            <span className="text-[var(--md-on-surface-variant)]">معيار التشفير:</span>
            <span className="font-mono font-bold tabular-nums" style={{ color: 'var(--md-info)' }}>
              AES-256 GCM
            </span>
          </div>
        </div>

        <div className="m3-card p-5 space-y-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              backgroundColor: 'var(--md-primary-container)',
              color: 'var(--md-on-primary-container)',
            }}
          >
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--md-on-surface)]">العزل التام للمنشآت (Tenant Isolation)</h3>
            <p className="text-xs text-[var(--md-on-surface-variant)] mt-1 leading-relaxed">
              سياسات أمان مشددة على مستوى الصفوف (Row-Level Security) تضمن استحالة تداخل البيانات بين الشركات.
            </p>
          </div>
          <div className="pt-2.5 border-t border-[var(--md-outline-variant)] flex items-center justify-between text-xs">
            <span className="text-[var(--md-on-surface-variant)]">مستوى العزل:</span>
            <span className="font-mono font-bold" style={{ color: 'var(--md-primary-text)' }}>
              Strict RLS Active
            </span>
          </div>
        </div>
      </div>

      {/* Compliance Standards & Immutability */}
      <div className="m3-card p-5 space-y-4">
        <h3 className="text-sm font-bold text-[var(--md-on-surface)] flex items-center gap-2 border-b border-[var(--md-outline-variant)] pb-3">
          <Award className="w-4 h-4" style={{ color: 'var(--md-secondary)' }} />
          <span>المعايير المعتمدة ومطابقة اللوائح الضريبية والرقابية</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] rounded-xl space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-[var(--md-on-surface)]">الفوترة الإلكترونية (ZATCA)</span>
              <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: 'var(--md-success)' }} />
            </div>
            <p className="text-[11px] text-[var(--md-on-surface-variant)] leading-relaxed">
              متوافق مع المرحلة الثانية ومتطلبات QR المشفر
            </p>
          </div>

          <div className="p-3.5 bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] rounded-xl space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-[var(--md-on-surface)]">عدم قابلية التعديل (Immutability)</span>
              <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: 'var(--md-success)' }} />
            </div>
            <p className="text-[11px] text-[var(--md-on-surface-variant)] leading-relaxed">
              سلسلة كتل التدقيق الرقمي تمنع حذف الفواتير المعتمدة
            </p>
          </div>

          <div className="p-3.5 bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] rounded-xl space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-[var(--md-on-surface)]">صلاحيات الوصول (RBAC)</span>
              <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: 'var(--md-success)' }} />
            </div>
            <p className="text-[11px] text-[var(--md-on-surface-variant)] leading-relaxed">
              حصر كامل للصلاحيات بحسب الأدوار الوظيفية
            </p>
          </div>

          <div className="p-3.5 bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] rounded-xl space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-[var(--md-on-surface)]">استعادة الكوارث (B2 DR)</span>
              <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: 'var(--md-success)' }} />
            </div>
            <p className="text-[11px] text-[var(--md-on-surface-variant)] leading-relaxed">
              نسخ احتياطية مشفرة موزعة جغرافياً في مراكز بيانات خارجية
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataGovernanceDashboard;
