import React from 'react';
import { TabType } from '../../Sidebar';
import { Company, User } from '../../../types';
import {
  Sparkles,
  RefreshCw,
  ShoppingCart,
  FileText,
  CreditCard,
  ShoppingBag,
  Users,
  MessageSquare,
  ShieldCheck,
  Database,
  CloudCheck,
  Calendar,
  Building2,
  ChevronDown,
} from 'lucide-react';

interface DashboardHeaderProps {
  user: User | null;
  company: Company | null;
  selectedPeriod?: string;
  setSelectedPeriod?: (p: string) => void;
  isLoading?: boolean;
  loading?: boolean;
  currency?: string;
  onRefresh: () => void;
  onNavigate?: (tab: TabType, extra?: any) => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  user,
  company,
  selectedPeriod = 'month',
  setSelectedPeriod = (_p: string) => {},
  isLoading = false,
  loading,
  currency = 'SAR',
  onRefresh,
  onNavigate,
}) => {
  const isActionLoading = isLoading || Boolean(loading);

  const periods = [
    { id: 'today', label: 'اليوم' },
    { id: 'week', label: 'هذا الأسبوع' },
    { id: 'month', label: 'هذا الشهر' },
    { id: 'year', label: 'السنة المالية' },
  ];

  const quickActions = [
    {
      id: 'pos',
      label: 'نقطة البيع (POS)',
      sublabel: 'الكاشير السريع',
      icon: ShoppingCart,
      color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25',
      badge: 'سريع',
      tab: 'pos' as TabType,
    },
    {
      id: 'invoices',
      label: 'فاتورة مبيعات',
      sublabel: 'إصدار ضريبي',
      icon: FileText,
      color: 'bg-teal-500/15 text-teal-400 border-teal-500/30 hover:bg-teal-500/25',
      tab: 'invoices' as TabType,
    },
    {
      id: 'payments',
      label: 'سند قبض / تحصيل',
      sublabel: 'توريد خزينة',
      icon: CreditCard,
      color: 'bg-blue-500/15 text-blue-400 border-blue-500/30 hover:bg-blue-500/25',
      tab: 'payments' as TabType,
    },
    {
      id: 'purchases',
      label: 'فاتورة مشتريات',
      sublabel: 'تسجيل التوريدات',
      icon: ShoppingBag,
      color: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/25',
      tab: 'purchase_invoices' as TabType,
    },
    {
      id: 'customers',
      label: 'كشف حساب',
      sublabel: 'عميل أو مورد',
      icon: Users,
      color: 'bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25',
      tab: 'customers' as TabType,
    },
    {
      id: 'whatsapp',
      label: 'تذكير واتساب',
      sublabel: 'مطالبات مالية',
      icon: MessageSquare,
      color: 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-600/30',
      badge: 'آلي',
      tab: 'whatsapp' as TabType,
    },
  ];

  return (
    <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-5 sm:p-6 transition-all duration-300">
      {/* Subtle Background Glows */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none translate-y-1/2 -translate-x-1/4" />

      {/* Top Meta Bar */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-800/80 pb-5">
        {/* Left / Title section */}
        <div className="space-y-1.5 text-right">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>مركز القيادة والذكاء المالي التنفيذي</span>
            </span>

            {/* Live Infrastructure Badges */}
            <div className="hidden sm:flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700/80 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>PostgreSQL سحابية</span>
              </span>
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700/80 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>عزل المنشأة نشط</span>
              </span>
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700/80 flex items-center gap-1.5 font-mono">
                <Database className="w-3.5 h-3.5 text-indigo-400" />
                <span>B2 DR محمي</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {company?.name || 'مؤسسة السحابي للتجارة والتقنية'}
            </h1>
            <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
              {currency}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-400">
            مرحباً بك، <span className="font-bold text-slate-200">{user?.fullName || 'المدير العام'}</span> • المراقبة اللحظية للسيولة والمبيعات والذمم والمخزون
          </p>
        </div>

        {/* Right / Controls: Period Filters + Refresh */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
          <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700/80">
            {periods.map((p) => {
              const active = selectedPeriod === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPeriod(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    active
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          <button
            onClick={onRefresh}
            disabled={isActionLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
            title="تحديث البيانات الفوري"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isActionLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">تحديث</span>
          </button>
        </div>
      </div>

      {/* 1-Click Executive Action Bar */}
      <div className="relative z-10 pt-4">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            شريط الإجراءات والعمليات السريعة (1-Click Actions)
          </span>
          <span className="text-[10px] text-slate-500 font-medium">الوصول المباشر لكافة الوحدات التشغيلية</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => onNavigate && onNavigate(action.tab)}
                className={`flex items-center gap-2.5 p-2.5 rounded-2xl border transition-all text-right group cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98] ${action.color}`}
              >
                <div className="w-8 h-8 rounded-xl bg-slate-900/80 flex items-center justify-center flex-shrink-0 shadow-inner">
                  <Icon className="w-4 h-4 transition-transform group-hover:scale-110" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white truncate">{action.label}</span>
                    {action.badge && (
                      <span className="text-[9px] font-extrabold px-1 rounded bg-black/40 text-emerald-300 font-mono">
                        {action.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 block truncate">{action.sublabel}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
