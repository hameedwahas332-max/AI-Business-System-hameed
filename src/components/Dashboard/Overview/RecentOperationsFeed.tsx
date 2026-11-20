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
    <div className="m3-card p-5 sm:p-6 space-y-4 text-right flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--md-outline-variant)] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--md-on-surface)]">آخر العمليات والحركات المالية الحية</h3>
            <p className="text-[11px] text-[var(--md-on-surface-variant)]">التدفق اللحظي للفواتير والسندات وأوامر الشراء</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center bg-[var(--md-surface-container)] p-1 rounded-xl border border-[var(--md-outline-variant)]">
          {[
            { id: 'ALL', label: 'الكل' },
            { id: 'SALES', label: 'مبيعات' },
            { id: 'PURCHASES', label: 'مشتريات' },
            { id: 'PAYMENTS', label: 'سندات' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id as any)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterType === f.id
                  ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)] shadow-sm'
                  : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto custom-scrollbar flex-1 rounded-xl border border-[var(--md-outline-variant)]">
        <table className="m3-table text-right text-xs">
          <thead className="m3-thead">
            <tr>
              <th className="m3-th">رقم المرجع</th>
              <th className="m3-th">البيان / الطرف</th>
              <th className="m3-th">النوع</th>
              <th className="m3-th">المبلغ</th>
              <th className="m3-th">التاريخ</th>
              <th className="m3-th">الحالة</th>
              <th className="m3-th text-center">إجراء</th>
            </tr>
          </thead>
          <tbody>
            {filteredOps.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[var(--md-on-surface-variant)]">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Clock className="w-7 h-7 opacity-45" />
                    <p className="text-xs font-semibold text-[var(--md-on-surface)]">
                      {isClean ? 'لا توجد حركات أو فواتير مسجلة حتى الآن' : 'لا توجد حركات مطابقة للفلتر المحدد'}
                    </p>
                    <p className="text-[11px] text-[var(--md-on-surface-variant)]">
                      ابدأ بإصدار أول فاتورة مبيعات، مشتريات أو سند مالي لتظهر هنا لحظياً
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredOps.slice(0, 6).map((op, idx) => (
                <tr key={op.id || idx} className="group">
                  {/* Ref */}
                  <td className="font-mono font-bold text-[var(--md-on-surface)] whitespace-nowrap">
                    {op.id}
                  </td>

                  {/* Entity */}
                  <td className="font-semibold text-[var(--md-on-surface)] whitespace-nowrap">
                    {op.entity}
                  </td>

                  {/* Type */}
                  <td className="whitespace-nowrap">
                    <span className={`m3-badge ${
                      op.type === 'SALES'
                        ? 'm3-badge-success'
                        : op.type === 'PURCHASE'
                        ? 'm3-badge-warning'
                        : 'm3-badge-info'
                    }`}>
                      {op.type === 'SALES' ? 'مبيعات' : op.type === 'PURCHASE' ? 'مشتريات' : 'سند'}
                    </span>
                  </td>

                  {/* Amount */}
                  <td className="font-mono font-black tabular-nums text-[var(--md-on-surface)] whitespace-nowrap">
                    {formatAmount(op.amount)} {currency}
                  </td>

                  {/* Date */}
                  <td className="font-mono text-[var(--md-on-surface-variant)] whitespace-nowrap tabular-nums">
                    {op.date}
                  </td>

                  {/* Status */}
                  <td className="whitespace-nowrap">
                    <span className={`m3-badge ${
                      op.status === 'مدفوعة' || op.status === 'مسدد'
                        ? 'm3-badge-success'
                        : 'm3-badge-warning'
                    }`}>
                      {op.status}
                    </span>
                  </td>

                  {/* Action */}
                  <td className="text-center whitespace-nowrap">
                    <button
                      onClick={() => onNavigate && onNavigate(op.targetTab)}
                      className="p-1.5 rounded-lg bg-[var(--md-surface-container)] hover:bg-[var(--md-surface-container-high)] text-[var(--md-on-surface)] border border-[var(--md-outline-variant)] transition-colors cursor-pointer inline-flex items-center gap-1"
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
      <div className="pt-2 border-t border-[var(--md-outline-variant)] flex items-center justify-between">
        <span className="text-[11px] text-[var(--md-on-surface-variant)] font-mono tabular-nums">
          إجمالي الحركات المعروضة: {filteredOps.length}
        </span>
        <button
          onClick={() => onNavigate && onNavigate('invoices')}
          className="text-xs font-bold text-[var(--md-primary-text)] hover:underline flex items-center gap-1 cursor-pointer"
        >
          <span>سجل كافة القيود والعمليات المالية</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
