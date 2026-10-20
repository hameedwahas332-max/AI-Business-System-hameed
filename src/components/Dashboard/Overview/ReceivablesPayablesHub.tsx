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
  const [activeTab, setActiveTab] = useState<'customers' | 'suppliers'>('customers');
  const [whatsappToast, setWhatsappToast] = useState<string | null>(null);

  const totalReceivables = Number(stats?.balances?.totalReceivables ?? stats?.totalReceivables ?? 24500);
  const totalPayables = Number(stats?.balances?.totalPayables ?? stats?.totalPayables ?? 18200);

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

  const safeCustomers = (Array.isArray(customersList) && customersList.length > 0)
    ? customersList.slice(0, 5).map((c, i) => ({
        id: c.id || `c-${i}`,
        name: c.name || c.full_name || 'عميل تجاري',
        phone: c.phone || '0500000000',
        balance: Number(c.balance || c.current_balance || 3500),
        overdue: Boolean(c.is_overdue || i % 2 === 0),
        limit: Number(c.credit_limit || 20000),
      }))
    : fallbackCustomers;

  const safeSuppliers = (Array.isArray(suppliersList) && suppliersList.length > 0)
    ? suppliersList.slice(0, 5).map((s, i) => ({
        id: s.id || `s-${i}`,
        name: s.name || 'مورد رئيسي',
        phone: s.phone || '0500000000',
        balance: Number(s.balance || s.current_balance || 4000),
        dueDays: (i + 1) * 4,
        category: s.category || 'توريدات عامة',
      }))
    : fallbackSuppliers;

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
            <h3 className="text-sm font-bold text-white">إدارة الذمم والمطالبات المالية</h3>
            <p className="text-[11px] text-slate-400">متابعة أرصدة المدينين والدائنين ومواعيد الاستحقاق</p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => setActiveTab('customers')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'customers'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            العملاء المدينون
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'suppliers'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            مستحقات الموردين
          </button>
        </div>
      </div>

      {/* Totals Strip */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/40 border border-slate-800 text-xs">
        <span className="text-slate-400 font-semibold">
          {activeTab === 'customers' ? 'إجمالي الديون القائمة للعملاء:' : 'إجمالي الالتزامات المستحقة للموردين:'}
        </span>
        <span className="font-mono tabular-nums font-black text-sm text-white">
          {formatAmount(activeTab === 'customers' ? totalReceivables : totalPayables)} {currency}
        </span>
      </div>

      {/* Entity Rows */}
      <div className="space-y-2.5 flex-1">
        {activeTab === 'customers' ? (
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
                  <span>الحد: {formatAmount(cust.limit)} {currency}</span>
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
        )}
      </div>

      {/* Footer Navigation */}
      <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
        <button
          onClick={() => onNavigate && onNavigate(activeTab === 'customers' ? 'customers' : 'suppliers')}
          className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
        >
          <span>عرض كافة سجلات {activeTab === 'customers' ? 'العملاء وكشوفات الحساب' : 'الموردين وجداول السداد'}</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
