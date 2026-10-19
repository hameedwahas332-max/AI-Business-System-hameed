import React from 'react';
import {
  ShieldCheck,
  Database,
  FileText,
  CheckCircle2,
  Lock,
  Layers,
  Award,
  HardDrive,
  Users,
  Key,
} from 'lucide-react';

export const DataGovernanceDashboard: React.FC = () => {
  return (
    <div className="space-y-6 text-slate-100">
      {/* Header */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white">
                حوكمة البيانات والخصوصية والامتثال (Data Governance & Compliance)
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono">
                ZATCA & GDPR READY
              </span>
            </div>
            <p className="text-xs text-slate-400">
              إدارة سياسات تشفير البيانات، العزل متعدد المستأجرين، وسجلات الحماية والامتثال الرقابي
            </p>
          </div>
        </div>

        <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center gap-1.5 font-mono">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>امتثال بنسبة 100%</span>
        </span>
      </div>

      {/* 3 Core Security Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">تشفير البيانات أثناء النقل (In-Transit)</h3>
            <p className="text-xs text-slate-400 mt-1">
              حماية كامل حركة المرور عبر بروتوكول TLS 1.3 مع شهادات SSL صادرة وموثقة دولياً.
            </p>
          </div>
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">البروتوكول:</span>
            <span className="font-mono font-bold text-emerald-400">TLS 1.3 / HTTPS</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg">
          <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
            <Key className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">تشفير البيانات أثناء التخزين (At-Rest)</h3>
            <p className="text-xs text-slate-400 mt-1">
              تشفير قواعد بيانات PostgreSQL والملفات الاحتياطية باستخدام خوارزمية AES-256 العسكرية.
            </p>
          </div>
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">معيار التشفير:</span>
            <span className="font-mono font-bold text-blue-400">AES-256 GCM</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg">
          <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">العزل التام للمنشآت (Tenant Isolation)</h3>
            <p className="text-xs text-slate-400 mt-1">
              سياسات أمان مشددة على مستوى الصفوف (Row-Level Security) تضمن استحالة تداخل البيانات بين الشركات.
            </p>
          </div>
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">مستوى العزل:</span>
            <span className="font-mono font-bold text-purple-400">Strict RLS Active</span>
          </div>
        </div>
      </div>

      {/* Compliance Standards & Immutability */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <Award className="w-4 h-4 text-amber-400" />
          <span>المعايير المعتمدة ومطابقة اللوائح الضريبية والرقابية</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 bg-slate-800/40 border border-slate-800 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">الفوترة الإلكترونية (ZATCA)</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-[11px] text-slate-400">متوافق مع المرحلة الثانية ومتطلبات QR المشفر</p>
          </div>

          <div className="p-3.5 bg-slate-800/40 border border-slate-800 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">عدم قابلية التعديل (Immutability)</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-[11px] text-slate-400">سلسلة كتل التدقيق الرقمي تمنع حذف الفواتير المعتمدة</p>
          </div>

          <div className="p-3.5 bg-slate-800/40 border border-slate-800 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">صلاحيات الوصول (RBAC)</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-[11px] text-slate-400">حصر كامل للصلاحيات بحسب الأدوار الوظيفية</p>
          </div>

          <div className="p-3.5 bg-slate-800/40 border border-slate-800 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">استعادة الكوارث (B2 DR)</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-[11px] text-slate-400">نسخ احتياطية مشفرة موزعة جغرافياً في مراكز بيانات خارجية</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataGovernanceDashboard;
