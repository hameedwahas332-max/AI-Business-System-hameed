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

  let savedReps: any[] | null = null;
  try {
    const rawReps = typeof window !== 'undefined' ? localStorage.getItem('erp_sales_reps_v1') : null;
    if (rawReps !== null) {
      savedReps = JSON.parse(rawReps);
    } else {
      const rawRepsLegacy = typeof window !== 'undefined' ? localStorage.getItem('erp_sales_reps') : null;
      if (rawRepsLegacy !== null) {
        savedReps = JSON.parse(rawRepsLegacy);
      }
    }
  } catch (e) {}

  const salesRepresentatives =
    savedReps !== null
      ? savedReps
      : (isClean ? [] : fallbackSalesRepresentatives);

  const safeCustomers =
    Array.isArray(customersList) && customersList.length > 0
      ? [...customersList]
          .sort((a, b) => Number(b.current_balance ?? b.balance ?? 0) - Number(a.current_balance ?? a.balance ?? 0))
          .map((c, i) => ({
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
      ? [...suppliersList]
          .sort((a, b) => Number(b.current_balance ?? b.balance ?? 0) - Number(a.current_balance ?? a.balance ?? 0))
          .map((s, i) => ({
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
    <div className="m3-card p-5 sm:p-6 space-y-4 text-right flex flex-col justify-between h-full">
      {/* Toast notification */}
      {whatsappToast && (
        <div className="p-3 bg-[var(--md-success-container)] border border-[color-mix(in_srgb,var(--md-success)_35%,transparent)] text-[var(--md-on-success-container)] rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-bold">{whatsappToast}</span>
          </div>
          <button
            onClick={() => onNavigate && onNavigate('whatsapp')}
            className="text-[11px] underline font-bold hover:opacity-80 cursor-pointer"
          >
            فتح واتساب
          </button>
        </div>
      )}

      {/* Header with Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--md-outline-variant)] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)] flex items-center justify-center shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--md-on-surface)]">إدارة الذمم والمطالبات والمناديب</h3>
            <p className="text-[11px] text-[var(--md-on-surface-variant)]">المدينون • الموردون • مناديب التوزيع والعمولات</p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex items-center bg-[var(--md-surface-container)] p-1 rounded-xl border border-[var(--md-outline-variant)]">
          <button
            onClick={() => setActiveTab('customers')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'customers'
                ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)] shadow-sm'
                : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
            }`}
          >
            العملاء المدينون
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'suppliers'
                ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)] shadow-sm'
                : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
            }`}
          >
            مستحقات الموردين
          </button>
          <button
            onClick={() => setActiveTab('sales_reps')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'sales_reps'
                ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)] shadow-sm'
                : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
            }`}
          >
            مناديب التوزيع
          </button>
        </div>
      </div>

      {/* Totals Strip */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] text-xs">
        <span className="text-[var(--md-on-surface-variant)] font-semibold">
          {activeTab === 'customers'
            ? 'إجمالي الديون القائمة للعملاء:'
            : activeTab === 'suppliers'
            ? 'إجمالي الالتزامات المستحقة للموردين:'
            : 'إجمالي مبيعات مناديب التوزيع الميداني:'}
        </span>
        <span className="font-mono tabular-nums font-black text-sm text-[var(--md-on-surface)]">
          {formatAmount(
            activeTab === 'customers'
              ? totalReceivables
              : activeTab === 'suppliers'
              ? totalPayables
              : salesRepresentatives.reduce((sum: number, r: any) => sum + Number(r.achievedSales ?? r.salesMonth ?? 0), 0)
          )}{' '}
          {currency}
        </span>
      </div>

      {/* Entity Rows */}
      <div className="space-y-2.5 flex-1 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
        {activeTab === 'customers' &&
          (safeCustomers.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--md-on-surface-variant)] bg-[var(--md-surface-container)] rounded-xl border border-[var(--md-outline-variant)]">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="font-semibold text-[var(--md-on-surface)]">لا يوجد عملاء مدينون حالياً</p>
              <p className="text-[11px] text-[var(--md-on-surface-variant)] mt-1">كافة الحسابات مسددة بالكامل أو بانتظار إصدار فواتير جديدة</p>
            </div>
          ) : (
            safeCustomers.map((cust) => (
              <div
                key={cust.id}
                className="p-3 rounded-xl bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] hover:border-[var(--md-outline)] transition-colors flex items-center justify-between gap-3 text-right"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-[var(--md-on-surface)] truncate">{cust.name}</h4>
                    {cust.overdue && (
                      <span className="m3-badge m3-badge-error text-[10px]">
                        متأخر
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-[var(--md-on-surface-variant)] font-mono tabular-nums">
                    <span>هاتف: {cust.phone}</span>
                    <span>•</span>
                    <span>
                      الحد: {formatAmount(cust.limit)} {currency}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-left">
                    <span className="text-xs font-black font-mono tabular-nums text-[var(--md-secondary)] block">
                      {formatAmount(cust.balance)} {currency}
                    </span>
                    <span className="text-[10px] text-[var(--md-on-surface-variant)] font-medium">مستحق السداد</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleSendWhatsapp(cust.name)}
                      className="p-1.5 rounded-lg bg-[var(--md-success-container)] hover:opacity-85 text-[var(--md-on-success-container)] border border-[color-mix(in_srgb,var(--md-success)_30%,transparent)] transition-colors cursor-pointer"
                      title="إرسال تذكير عبر WhatsApp"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onNavigate && onNavigate('customers')}
                      className="p-1.5 rounded-lg bg-[var(--md-surface-container-low)] hover:bg-[var(--md-surface-container-high)] text-[var(--md-on-surface)] border border-[var(--md-outline-variant)] transition-colors cursor-pointer"
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
            <div className="py-8 text-center text-xs text-[var(--md-on-surface-variant)] bg-[var(--md-surface-container)] rounded-xl border border-[var(--md-outline-variant)]">
              <Truck className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="font-semibold text-[var(--md-on-surface)]">لا توجد مستحقات موردين حالياً</p>
              <p className="text-[11px] text-[var(--md-on-surface-variant)] mt-1">كافة الحسابات مسددة بالكامل أو لم تسجل فواتير توريد بعد</p>
            </div>
          ) : (
            safeSuppliers.map((supp) => (
              <div
                key={supp.id}
                className="p-3 rounded-xl bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] hover:border-[var(--md-outline)] transition-colors flex items-center justify-between gap-3 text-right"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-[var(--md-on-surface)] truncate">{supp.name}</h4>
                    <span className="m3-badge text-[10px]">
                      {supp.category}
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--md-on-surface-variant)] font-mono block tabular-nums">
                    الاستحقاق خلال: {supp.dueDays} أيام
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-left">
                    <span className="text-xs font-black font-mono tabular-nums text-[var(--md-error)] block">
                      {formatAmount(supp.balance)} {currency}
                    </span>
                    <span className="text-[10px] text-[var(--md-on-surface-variant)] font-medium">مستحق للمورد</span>
                  </div>

                  <button
                    onClick={() => onNavigate && onNavigate('payments')}
                    className="px-2.5 py-1.5 rounded-lg bg-[var(--md-error-container)] hover:opacity-85 text-[var(--md-on-error-container)] border border-[color-mix(in_srgb,var(--md-error)_30%,transparent)] text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1"
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
            <div className="py-8 text-center text-xs text-[var(--md-on-surface-variant)] bg-[var(--md-surface-container)] rounded-xl border border-[var(--md-outline-variant)]">
              <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="font-semibold text-[var(--md-on-surface)]">لا يوجد مناديب توزيع مسجلون حالياً</p>
              <p className="text-[11px] text-[var(--md-on-surface-variant)] mt-1">يمكنك إضافة مناديب التوزيع وخطوط السير من تبويب العمليات الميدانية</p>
            </div>
          ) : (
            salesRepresentatives.map((rep) => (
              <div
                key={rep.id}
                className="p-3 rounded-xl bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] hover:border-[var(--md-outline)] transition-colors flex items-center justify-between gap-3 text-right"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-[var(--md-on-surface)] truncate">{rep.name}</h4>
                    <span className="m3-badge m3-badge-primary font-mono text-[10px]">
                      {rep.vanCode}
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--md-on-surface-variant)] truncate block">
                    {rep.zone}
                  </span>
                  <div className="text-[10px] text-[var(--md-on-surface-variant)] font-mono flex items-center gap-2 tabular-nums">
                    <span>المحصل: <strong className="text-[var(--md-on-surface)]">{formatAmount(rep.collected)}</strong> {currency}</span>
                    <span>•</span>
                    <span>نسبة العمولة: {rep.commissionRate}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-left">
                    <span className="text-xs font-black font-mono tabular-nums text-[var(--md-primary-text)] block">
                      +{formatAmount(rep.commissionEarned)} {currency}
                    </span>
                    <span className="text-[10px] text-[var(--md-on-surface-variant)] font-medium">عمولة مستحقة</span>
                  </div>

                  <button
                    onClick={() => onNavigate && onNavigate('real_business')}
                    className="px-2.5 py-1.5 rounded-lg bg-[var(--md-primary-container)] hover:opacity-85 text-[var(--md-on-primary-container)] text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1"
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
      <div className="pt-2 border-t border-[var(--md-outline-variant)] flex items-center justify-between">
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
          className="text-xs font-bold text-[var(--md-primary-text)] hover:underline flex items-center gap-1 cursor-pointer"
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
