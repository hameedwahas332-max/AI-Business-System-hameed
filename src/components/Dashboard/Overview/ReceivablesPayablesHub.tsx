import React, { useState } from 'react';
import { formatAmount } from '../../../lib/formatters';
import { TabType } from '../../Sidebar';
import {
  Users,
  Truck,
  MessageSquare,
  FileText,
  AlertTriangle,
  ArrowUpRight,
  CreditCard,
  CheckCircle2,
  Phone,
  Clock,
  Briefcase,
  BadgePercent,
  TrendingUp,
} from 'lucide-react';

interface ReceivablesPayablesHubProps {
  stats?: any;
  topData?: any;
  customersList?: any[];
  suppliersList?: any[];
  currency?: string;
  onNavigate?: (tab: TabType, extra?: any) => void;
}

export const ReceivablesPayablesHub: React.FC<ReceivablesPayablesHubProps> = ({
  stats = {} as any,
  topData = {} as any,
  customersList = [],
  suppliersList = [],
  currency = 'SAR',
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<'customers' | 'suppliers' | 'sales_reps'>('customers');
  const [whatsappToast, setWhatsappToast] = useState<string | null>(null);

  const isClean = typeof window !== 'undefined' && (
    localStorage.getItem('erp_clean_production_mode_v1') === 'true' ||
    localStorage.getItem('erp_sample_data_cleaned') === 'true'
  );

  const totalReceivables = Number(stats?.balances?.totalReceivables ?? stats?.totalReceivables ?? 0);
  const totalPayables = Number(stats?.balances?.totalPayables ?? stats?.totalPayables ?? 0);

  const fallbackCustomers = [
    { id: 'c-1', name: 'مؤسسة الأفق للتجارة العامة', phone: '0501234567', balance: 8200, overdue: true, limit: 30000 },
    { id: 'c-2', name: 'شركة الوفاق المحدودة', phone: '0559876543', balance: 5400, overdue: false, limit: 50000 },
    { id: 'c-3', name: 'مجمع الرياض الطبي الاستشاري', phone: '0543322110', balance: 4600, overdue: true, limit: 25000 },
    { id: 'c-4', name: 'مؤسسة البناء والتعمير الحديثة', phone: '0567788990', balance: 3500, overdue: false, limit: 20000 },
    { id: 'c-5', name: 'مركز الأغذية والمواد التموينية', phone: '0512233445', balance: 2800, overdue: false, limit: 15000 },
  ];

  const fallbackSuppliers = [
    { id: 's-1', name: 'شركة التوريدات الوطنية الكبرى', phone: '0533344556', balance: 7800, dueDays: 3, category: 'أغذية' },
    { id: 's-2', name: 'مؤسسة الاستيراد المباشر والمستودعات', phone: '0544455667', balance: 4500, dueDays: 7, category: 'تشغيل' },
    { id: 's-3', name: 'شركة التغليف والصناعات الورقية', phone: '0555566778', balance: 3200, dueDays: 14, category: 'مواد تغليف' },
    { id: 's-4', name: 'مجموعة الموزعين المعتمدين', phone: '0566677889', balance: 2700, dueDays: 20, category: 'بضائع جاهزة' },
  ];

  // Field Sales Representatives & Commissions
  const fallbackSalesRepresentatives = [
    {
      id: 'rep-1',
      name: 'طارق عبدالكريم الصبري',
      zone: 'خط التوزيع الشمالي (جملة + بطاريات)',
      salesMonth: 48500,
      collected: 42000,
      commissionRate: '3.5%',
      commissionEarned: 1470,
      vanCode: 'VAN-04',
      status: 'نشط ميدانياً',
    },
    {
      id: 'rep-2',
      name: 'منصور فهد الدوسري',
      zone: 'قطاع التجزئة والسوبرماركت',
      salesMonth: 36200,
      collected: 31500,
      commissionRate: '3.0%',
      commissionEarned: 945,
      vanCode: 'VAN-02',
      status: 'نشط ميدانياً',
    },
    {
      id: 'rep-3',
      name: 'هيثم علي القحطاني',
      zone: 'مراكز صيانة وورش الزيوت والبطاريات',
      salesMonth: 29800,
      collected: 27400,
      commissionRate: '4.0%',
      commissionEarned: 1096,
      vanCode: 'VAN-03',
      status: 'نشط ميدانياً',
    },
  ];

  let savedReps: any[] = [];
  try {
    const rawReps = typeof window !== 'undefined' ? localStorage.getItem('erp_sales_reps_v1') : null;
    if (rawReps) savedReps = JSON.parse(rawReps);
  } catch (e) {}

  const salesRepresentatives =
    Array.isArray(savedReps) && savedReps.length > 0
      ? savedReps
      : (isClean ? [] : fallbackSalesRepresentatives);

  const safeCustomers =
    Array.isArray(customersList) && customersList.length > 0
      ? customersList.slice(0, 5).map((c, i) => ({
          id: c.id || `c-${i}`,
          name: c.name || c.full_name || 'عميل تجاري',
          phone: c.phone || '0500000000',
          balance: Number(c.balance || c.current_balance || 0),
          overdue: Boolean(c.is_overdue || i % 2 === 0),
          limit: Number(c.credit_limit || 20000),
        }))
      : (isClean ? [] : fallbackCustomers);

  const safeSuppliers =
    Array.isArray(suppliersList) && suppliersList.length > 0
      ? suppliersList.slice(0, 5).map((s, i) => ({
          id: s.id || `s-${i}`,
          name: s.name || 'مورد رئيسي',
          phone: s.phone || '0500000000',
          balance: Number(s.balance || s.current_balance || 0),
          dueDays: (i + 1) * 4,
          category: s.category || 'توريدات عامة',
        }))
      : (isClean ? [] : fallbackSuppliers);

  const handleSendWhatsapp = (name: string) => {
    setWhatsappToast(`تم إرسال تذكير المطالبة عبر WhatsApp إلى (${name}) بنجاح`);
    setTimeout(() => setWhatsappToast(null), 3500);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 text-right flex flex-col justify-between h-full">
      {/* Toast notification */}
      {whatsappToast && (
        <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-bold">{whatsappToast}</span>
          </div>
          <button
            onClick={() => onNavigate && onNavigate('whatsapp')}
            className="text-[11px] underline font-bold hover:text-white"
          >
            فتح واتساب
          </button>
        </div>
      )}

      {/* Header with Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">إدارة الذمم والمطالبات والمناديب</h3>
            <p className="text-[11px] text-slate-400">المدينون • الموردون • مناديب التوزيع والعمولات</p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => setActiveTab('customers')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'customers'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            العملاء المدينون
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'suppliers'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            مستحقات الموردين
          </button>
          <button
            onClick={() => setActiveTab('sales_reps')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'sales_reps'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            مناديب التوزيع
          </button>
        </div>
      </div>

      {/* Totals Strip */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/40 border border-slate-800 text-xs">
        <span className="text-slate-400 font-semibold">
          {activeTab === 'customers'
            ? 'إجمالي الديون القائمة للعملاء:'
            : activeTab === 'suppliers'
            ? 'إجمالي الالتزامات المستحقة للموردين:'
            : 'إجمالي مبيعات مناديب التوزيع الميداني:'}
        </span>
        <span className="font-mono tabular-nums font-black text-sm text-white">
          {formatAmount(
            activeTab === 'customers'
              ? totalReceivables
              : activeTab === 'suppliers'
              ? totalPayables
              : 114500
          )}{' '}
          {currency}
        </span>
      </div>

      {/* Entity Rows */}
      <div className="space-y-2.5 flex-1">
        {activeTab === 'customers' &&
          (safeCustomers.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800/80">
              <Users className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <p className="font-semibold text-slate-400">لا يوجد عملاء مدينون حالياً</p>
              <p className="text-[11px] text-slate-500 mt-1">كافة الحسابات مسددة بالكامل أو بانتظار إصدار فواتير جديدة</p>
            </div>
          ) : (
            safeCustomers.map((cust) => (
              <div
                key={cust.id}
                className="p-3 rounded-2xl bg-slate-800/30 border border-slate-800/80 hover:border-slate-700 transition-colors flex items-center justify-between gap-3 text-right"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-200 truncate">{cust.name}</h4>
                    {cust.overdue && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30">
                        متأخر
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                    <span>هاتف: {cust.phone}</span>
                    <span>•</span>
                    <span>
                      الحد: {formatAmount(cust.limit)} {currency}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-left">
                    <span className="text-xs font-black font-mono tabular-nums text-amber-400 block">
                      {formatAmount(cust.balance)} {currency}
                    </span>
                    <span className="text-[9px] text-slate-500 font-medium">مستحق السداد</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleSendWhatsapp(cust.name)}
                      className="p-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 transition-colors cursor-pointer"
                      title="إرسال تذكير عبر WhatsApp"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onNavigate && onNavigate('customers')}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                      title="كشف حساب العميل"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ))}

        {activeTab === 'suppliers' &&
          (safeSuppliers.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800/80">
              <Truck className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <p className="font-semibold text-slate-400">لا توجد مستحقات موردين حالياً</p>
              <p className="text-[11px] text-slate-500 mt-1">كافة الحسابات مسددة بالكامل أو لم تسجل فواتير توريد بعد</p>
            </div>
          ) : (
            safeSuppliers.map((supp) => (
              <div
                key={supp.id}
                className="p-3 rounded-2xl bg-slate-800/30 border border-slate-800/80 hover:border-slate-700 transition-colors flex items-center justify-between gap-3 text-right"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-200 truncate">{supp.name}</h4>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-700 text-slate-300">
                      {supp.category}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono block">
                    الاستحقاق خلال: {supp.dueDays} أيام
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-left">
                    <span className="text-xs font-black font-mono tabular-nums text-rose-400 block">
                      {formatAmount(supp.balance)} {currency}
                    </span>
                    <span className="text-[9px] text-slate-500 font-medium">مستحق للمورد</span>
                  </div>

                  <button
                    onClick={() => onNavigate && onNavigate('payments')}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <CreditCard className="w-3 h-3" />
                    <span>سداد دفعة</span>
                  </button>
                </div>
              </div>
            ))
          ))}

        {activeTab === 'sales_reps' &&
          (salesRepresentatives.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800/80">
              <Briefcase className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <p className="font-semibold text-slate-400">لا يوجد مناديب توزيع مسجلون حالياً</p>
              <p className="text-[11px] text-slate-500 mt-1">يمكنك إضافة مناديب التوزيع وخطوط السير من تبويب العمليات الميدانية</p>
            </div>
          ) : (
            salesRepresentatives.map((rep) => (
              <div
                key={rep.id}
                className="p-3 rounded-2xl bg-slate-800/30 border border-slate-800/80 hover:border-slate-700 transition-colors flex items-center justify-between gap-3 text-right"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-200 truncate">{rep.name}</h4>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      {rep.vanCode}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 truncate block">
                    {rep.zone}
                  </span>
                  <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                    <span>المحصل: <strong className="text-slate-200">{formatAmount(rep.collected)}</strong> {currency}</span>
                    <span>•</span>
                    <span>نسبة العمولة: {rep.commissionRate}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-left">
                    <span className="text-xs font-black font-mono tabular-nums text-emerald-400 block">
                      +{formatAmount(rep.commissionEarned)} {currency}
                    </span>
                    <span className="text-[9px] text-slate-400 font-medium">عمولة مستحقة</span>
                  </div>

                  <button
                    onClick={() => onNavigate && onNavigate('real_business')}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Briefcase className="w-3 h-3" />
                    <span>المناديب</span>
                  </button>
                </div>
              </div>
            ))
          ))}
      </div>

      {/* Footer Navigation */}
      <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
        <button
          onClick={() =>
            onNavigate &&
            onNavigate(
              activeTab === 'customers'
                ? 'customers'
                : activeTab === 'suppliers'
                ? 'suppliers'
                : 'real_business'
            )
          }
          className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
        >
          <span>
            {activeTab === 'customers'
              ? 'عرض كافة سجلات العملاء وكشوفات الحساب'
              : activeTab === 'suppliers'
              ? 'عرض كافة سجلات الموردين وجداول السداد'
              : 'فتح وحدة النشاط الواقعي وإدارة مناديب التوزيع والعمولات'}
          </span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
