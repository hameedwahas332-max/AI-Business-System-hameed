import React, { useState } from 'react';
import { formatAmount } from '../../../lib/formatters';
import { TabType } from '../../Sidebar';
import {
  FileText,
  ShoppingBag,
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Filter,
  Eye,
} from 'lucide-react';

interface RecentOperationsFeedProps {
  invoices?: any[];
  purchaseInvoices?: any[];
  payments?: any[];
  currency?: string;
  onNavigate?: (tab: TabType, extra?: any) => void;
}

export const RecentOperationsFeed: React.FC<RecentOperationsFeedProps> = ({
  invoices = [],
  purchaseInvoices = [],
  payments = [],
  currency = 'SAR',
  onNavigate,
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'SALES' | 'PURCHASES' | 'PAYMENTS'>('ALL');

  const safeInvoices = Array.isArray(invoices) ? invoices : [];
  const safePurchases = Array.isArray(purchaseInvoices) ? purchaseInvoices : [];
  const safePayments = Array.isArray(payments) ? payments : [];

  const fallbackOperations = [
    {
      id: 'INV-2026-0042',
      type: 'SALES',
      title: 'فاتورة مبيعات ضريبية',
      entity: 'مؤسسة الأفق للتجارة',
      amount: 1667.5,
      date: '2026-10-18',
      status: 'مدفوعة',
      targetTab: 'invoices' as TabType,
    },
    {
      id: 'INV-2026-0041',
      type: 'SALES',
      title: 'فاتورة مبيعات ضريبية',
      entity: 'شركة الوفاق المحدودة',
      amount: 943.0,
      date: '2026-10-18',
      status: 'مدفوعة',
      targetTab: 'invoices' as TabType,
    },
    {
      id: 'PO-2026-0019',
      type: 'PURCHASE',
      title: 'فاتورة توريد بضاعة',
      entity: 'شركة التوريدات الكبرى',
      amount: 4200.0,
      date: '2026-10-17',
      status: 'آجلة',
      targetTab: 'purchase_invoices' as TabType,
    },
    {
      id: 'PAY-2026-0088',
      type: 'PAYMENT',
      title: 'سند تحصيل وقبض',
      entity: 'مجمع الرياض الطبي',
      amount: 2500.0,
      date: '2026-10-17',
      status: 'مسدد',
      targetTab: 'payments' as TabType,
    },
    {
      id: 'INV-2026-0040',
      type: 'SALES',
      title: 'فاتورة كاشير نقدي',
      entity: 'عميل نقدي (POS)',
      amount: 207.0,
      date: '2026-10-18',
      status: 'مدفوعة',
      targetTab: 'invoices' as TabType,
    },
    {
      id: 'WRN-2026-0012',
      type: 'SALES',
      title: 'فحص ضمان بطارية هانكوك 70A',
      entity: 'مؤسسة الأفق للتجارة (سيريال: SN-HK-70A-9921)',
      amount: 320.0,
      date: '2026-10-18',
      status: 'ساري ومطابق',
      targetTab: 'real_business' as TabType,
    },
    {
      id: 'VAN-2026-0033',
      type: 'SALES',
      title: 'صرف بضاعة مندوب فان التوزيع',
      entity: 'المندوب: طارق الصبري (خط الشمال)',
      amount: 4850.0,
      date: '2026-10-17',
      status: 'قيد التوزيع',
      targetTab: 'real_business' as TabType,
    },
  ];

  // Merge real data if available
  const salesItems = safeInvoices.map((i) => ({
    id: i.id || i.invoice_number || 'INV',
    type: 'SALES',
    title: 'فاتورة مبيعات',
    entity: i.customer_name || 'عميل تجاري',
    amount: Number(i.total || i.total_amount || 0),
    date: (i.invoice_date || i.created_at || '').substring(0, 10) || '2026-10-18',
    status: i.status === 'PAID' ? 'مدفوعة' : 'آجلة',
    targetTab: 'invoices' as TabType,
  }));

  const purchaseItems = safePurchases.map((p) => ({
    id: p.id || p.invoice_number || 'PO',
    type: 'PURCHASE',
    title: 'فاتورة مشتريات',
    entity: p.supplier_name || 'مورد عام',
    amount: Number(p.total || p.total_amount || 0),
    date: (p.invoice_date || p.created_at || '').substring(0, 10) || '2026-10-18',
    status: p.status === 'PAID' ? 'مدفوعة' : 'آجلة',
    targetTab: 'purchase_invoices' as TabType,
  }));

  const paymentItems = safePayments.map((pmt) => ({
    id: pmt.id || pmt.payment_number || 'PAY',
    type: 'PAYMENT',
    title: 'سند مالي',
    entity: pmt.customer_name || pmt.supplier_name || 'طرف مالي',
    amount: Number(pmt.amount || 0),
    date: (pmt.payment_date || pmt.created_at || '').substring(0, 10) || '2026-10-18',
    status: 'مسدد',
    targetTab: 'payments' as TabType,
  }));

  const isClean =
    typeof window !== 'undefined' &&
    (localStorage.getItem('erp_clean_production_mode_v1') === 'true' ||
      localStorage.getItem('erp_sample_data_cleaned') === 'true');

  const combined = [...salesItems, ...purchaseItems, ...paymentItems];
  const allOperations = combined.length > 0 ? combined : (isClean ? [] : fallbackOperations);

  const filteredOps = allOperations.filter((item) => {
    if (filterType === 'ALL') return true;
    if (filterType === 'SALES') return item.type === 'SALES';
    if (filterType === 'PURCHASES') return item.type === 'PURCHASE';
    if (filterType === 'PAYMENTS') return item.type === 'PAYMENT';
    return true;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 text-right flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">آخر العمليات والحركات المالية الحية</h3>
            <p className="text-[11px] text-slate-400">التدفق اللحظي للفواتير والسندات وأوامر الشراء</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
          {[
            { id: 'ALL', label: 'الكل' },
            { id: 'SALES', label: 'مبيعات' },
            { id: 'PURCHASES', label: 'مشتريات' },
            { id: 'PAYMENTS', label: 'سندات' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id as any)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                filterType === f.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto custom-scrollbar flex-1">
        <table className="w-full text-right text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 font-semibold">
              <th className="pb-2.5 pr-2">رقم المرجع</th>
              <th className="pb-2.5 px-3">البيان / الطرف</th>
              <th className="pb-2.5 px-3">النوع</th>
              <th className="pb-2.5 px-3">المبلغ</th>
              <th className="pb-2.5 px-3">التاريخ</th>
              <th className="pb-2.5 px-3">الحالة</th>
              <th className="pb-2.5 pl-2 text-center">إجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredOps.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Clock className="w-7 h-7 text-slate-600" />
                    <p className="text-xs font-semibold text-slate-300">
                      {isClean ? 'لا توجد حركات أو فواتير مسجلة حتى الآن' : 'لا توجد حركات مطابقة للفلتر المحدد'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      ابدأ بإصدار أول فاتورة مبيعات، مشتريات أو سند مالي لتظهر هنا لحظياً
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredOps.slice(0, 6).map((op, idx) => (
                <tr key={op.id || idx} className="hover:bg-slate-800/40 transition-colors group">
                  {/* Ref */}
                  <td className="py-2.5 pr-2 font-mono font-bold text-slate-200 whitespace-nowrap">
                    {op.id}
                  </td>

                  {/* Entity */}
                  <td className="py-2.5 px-3 font-semibold text-slate-200 whitespace-nowrap">
                    {op.entity}
                  </td>

                  {/* Type */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      op.type === 'SALES'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : op.type === 'PURCHASE'
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                    }`}>
                      {op.type === 'SALES' ? 'مبيعات' : op.type === 'PURCHASE' ? 'مشتريات' : 'سند'}
                    </span>
                  </td>

                  {/* Amount */}
                  <td className="py-2.5 px-3 font-mono font-black tabular-nums text-white whitespace-nowrap">
                    {formatAmount(op.amount)} {currency}
                  </td>

                  {/* Date */}
                  <td className="py-2.5 px-3 font-mono text-slate-400 whitespace-nowrap">
                    {op.date}
                  </td>

                  {/* Status */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      op.status === 'مدفوعة' || op.status === 'مسدد'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {op.status}
                    </span>
                  </td>

                  {/* Action */}
                  <td className="py-2.5 pl-2 text-center whitespace-nowrap">
                    <button
                      onClick={() => onNavigate && onNavigate(op.targetTab)}
                      className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1"
                      title="معاينة السجل"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
        <span className="text-[11px] text-slate-500 font-mono">
          إجمالي الحركات المعروضة: {filteredOps.length}
        </span>
        <button
          onClick={() => onNavigate && onNavigate('invoices')}
          className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
        >
          <span>سجل كافة القيود والعمليات المالية</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
