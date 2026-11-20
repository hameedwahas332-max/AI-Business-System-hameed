import React, { useState } from 'react';
import { formatAmount, getActiveCurrencySymbol } from '../../../lib/formatters';
import { printInvoiceDocument } from '../../../lib/exportUtils';
import {
  Eye,
  Printer,
  Mail,
  DollarSign,
  RotateCcw,
  Trash2,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldCheck,
  User,
  Tag,
  Coins,
} from 'lucide-react';
import { getStoredExchangeRates } from '../../../lib/exchangeRates';

interface SalesInvoicesTableProps {
  invoices: any[];
  loading: boolean;
  selectedIds: string[];
  onSelectToggle: (id: string) => void;
  onSelectAll: () => void;
  onViewDetails: (invoice: any) => void;
  onRecordPayment: (invoice: any) => void;
  onRecordReturn: (invoice: any) => void;
  onSendEmail: (invoiceId: string) => void;
  onDeleteInvoice: (invoiceId: string) => void;
  sendingEmailId: string | null;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalCount: number;
}

export const SalesInvoicesTable: React.FC<SalesInvoicesTableProps> = ({
  invoices = [],
  loading = false,
  selectedIds = [],
  onSelectToggle,
  onSelectAll,
  onViewDetails,
  onRecordPayment,
  onRecordReturn,
  onSendEmail,
  onDeleteInvoice,
  sendingEmailId,
  currentPage,
  totalPages,
  onPageChange,
  totalCount,
}) => {
  const invoiceList = Array.isArray(invoices) ? invoices : [];
  const selectedList = Array.isArray(selectedIds) ? selectedIds : [];
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusBadge = (invoice: any) => {
    const rawTotal = Number(invoice.total ?? invoice.totalAmount ?? invoice.grandTotal ?? invoice.netTotal ?? invoice.total_amount ?? invoice.amount ?? 0);
    const itemsSum = Array.isArray(invoice.items) && invoice.items.length > 0
      ? invoice.items.reduce((acc: number, it: any) => acc + Number(it.total || (Number(it.quantity || 1) * Number(it.unit_price || it.price || 0) - Number(it.discount || 0))), 0)
      : 0;
    const total = rawTotal > 0 ? rawTotal : itemsSum;
    const paid = Number(invoice.paid_amount ?? invoice.paidAmount ?? invoice.amountPaid ?? invoice.paid ?? 0);
    const remaining = Math.max(0, Number(invoice.remaining_amount ?? invoice.remainingAmount ?? invoice.remainingBalance ?? invoice.remaining ?? invoice.balanceDue ?? (total - paid)));

    const status = String(invoice.status || '').toUpperCase();

    if (status === 'DRAFT') {
      return (
        <span className="m3-badge bg-[var(--md-surface-container-high)] text-[var(--md-on-surface-variant)] border border-[var(--md-outline-variant)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--md-on-surface-variant)]"></span>
          مسودة
        </span>
      );
    }
    if (status === 'CANCELLED') {
      return (
        <span className="m3-badge-error">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--md-error)]"></span>
          ملغاة
        </span>
      );
    }
    if (status === 'PAID' || remaining <= 0.01) {
      return (
        <span className="m3-badge-success">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--md-success)]"></span>
          مسددة بالكامل
        </span>
      );
    }
    if (status === 'PARTIALLY_PAID' || status === 'PARTIAL' || (paid > 0 && remaining > 0.01)) {
      return (
        <span className="m3-badge-info">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--md-info)]"></span>
          مسددة جزئياً
        </span>
      );
    }
    return (
      <span className="m3-badge-warning">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--md-warning)]"></span>
        آجلة / ذمم (غير مسددة)
      </span>
    );
  };

  const isAllSelected = invoices.length > 0 && selectedIds.length === invoices.length;

  if (loading) {
    return (
      <div className="m3-card p-12 text-center text-[var(--md-on-surface-variant)]">
        <div className="w-8 h-8 border-3 border-[var(--md-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">جاري تحميل سجل فواتير المبيعات...</p>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="m3-card p-12 text-center text-[var(--md-on-surface-variant)]">
        <p className="text-base font-semibold text-[var(--md-on-surface)] mb-1">لا توجد فواتير مبيعات مطابقة</p>
        <p className="text-xs text-[var(--md-on-surface-variant)]">جرب تغيير معايير البحث أو الفلاتر أو إنشاء فاتورة جديدة.</p>
      </div>
    );
  }

  return (
    <div className="m3-card overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="m3-table w-full text-right text-sm">
          <thead className="m3-thead">
            <tr>
              <th className="m3-th py-3.5 px-4 w-10 text-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={onSelectAll}
                  className="w-4 h-4 rounded accent-[var(--md-primary)] cursor-pointer"
                />
              </th>
              <th className="m3-th py-3.5 px-4">رقم الفاتورة والضمان</th>
              <th className="m3-th py-3.5 px-4">العميل وفئة السعر</th>
              <th className="m3-th py-3.5 px-4">المندوب / البائع</th>
              <th className="m3-th py-3.5 px-4">تاريخ الإصدار</th>
              <th className="m3-th py-3.5 px-4">الاستحقاق</th>
              <th className="m3-th py-3.5 px-4 text-left">العملة والإجمالي</th>
              <th className="m3-th py-3.5 px-4 text-left">المدفوع</th>
              <th className="m3-th py-3.5 px-4 text-left">المتبقي</th>
              <th className="m3-th py-3.5 px-4 text-center">الحالة</th>
              <th className="m3-th py-3.5 px-4 text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--md-outline-variant)]">
            {invoiceList.map((inv) => {
              const isSelected = selectedList.includes(inv.id);
              const rawTotal = Number(inv.total ?? inv.totalAmount ?? inv.grandTotal ?? inv.netTotal ?? inv.total_amount ?? inv.amount ?? 0);
              const itemsSum = Array.isArray(inv.items) && inv.items.length > 0
                ? inv.items.reduce((acc: number, it: any) => acc + Number(it.total || (Number(it.quantity || 1) * Number(it.unit_price || it.price || 0) - Number(it.discount || 0))), 0)
                : 0;
              const total = rawTotal > 0 ? rawTotal : itemsSum;

              const paid = Number(
                inv.paid_amount ?? inv.paidAmount ?? inv.amountPaid ?? inv.paid ?? (inv.status === 'PAID' || inv.status === 'paid' ? total : 0)
              );

              const remaining = Math.max(
                0,
                Number(
                  inv.remaining_amount ?? inv.remainingAmount ?? inv.remainingBalance ?? inv.remaining ?? inv.balanceDue ?? (total - paid)
                )
              );

              const customerDisplayName = (inv.customer_name || inv.customerName || inv.clientName || inv.customer || 'عميل نقدي').trim();

              const salesRep = (
                inv.salesperson_name ||
                inv.salesperson ||
                inv.salespersonName ||
                inv.sales_rep_name ||
                inv.sales_rep ||
                inv.cashier_name ||
                inv.cashierName ||
                inv.created_by_name ||
                inv.createdBy ||
                'حميد وهاس'
              ).trim();

              const todayStr = new Date().toISOString().split('T')[0];
              const isOverdue = remaining > 0.01 && inv.due_date && inv.due_date < todayStr && inv.status !== 'DRAFT';
              const currency = inv.currency || 'YER';
              
              const rates = getStoredExchangeRates();
              const rateMultiplier = currency === 'SAR' ? (rates.rates.SAR.accountingRate || 140) : currency === 'USD' ? (rates.rates.USD.accountingRate || 530) : 1;
              const baseEquivalent = currency === 'YER' ? total : total * (parseFloat(inv.exchange_rate) || rateMultiplier);

              const priceTier = inv.price_tier || inv.tier || 'retail';
              const tierNameMap: Record<string, { label: string; color: string }> = {
                retail: { label: 'تجزئة', color: 'bg-[var(--md-surface-container-high)] text-[var(--md-on-surface-variant)] border-[var(--md-outline-variant)]' },
                half_wholesale: { label: 'نصف جملة', color: 'bg-[var(--md-info-container)] text-[var(--md-on-info-container)] border-[var(--md-info)]/30' },
                wholesale: { label: 'جملة', color: 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border-[var(--md-primary)]/30' },
                vip: { label: 'VIP خاص', color: 'bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)] border-[var(--md-secondary)]/30' },
              };
              const tierInfo = tierNameMap[priceTier] || tierNameMap.retail;

              const hasWarranty = Boolean(
                inv.has_warranty ||
                (inv.warranty_months && inv.warranty_months > 0) ||
                (Array.isArray(inv.items) && inv.items.some((i: any) => 
                  (i.warranty_months && Number(i.warranty_months) > 0) || 
                  i.serial_number || 
                  i.dot_code || 
                  i.battery_spec || 
                  i.tire_size
                ))
              );

              return (
                <tr
                  key={inv.id}
                  className={`transition-colors ${
                    isSelected ? 'bg-[var(--md-primary-container)]/35' : ''
                  }`}
                >
                  <td className="py-3.5 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onSelectToggle(inv.id)}
                      className="w-4 h-4 rounded accent-[var(--md-primary)] cursor-pointer"
                    />
                  </td>

                  {/* Invoice Number & Battery/Tire Warranty Badge */}
                  <td className="py-3.5 px-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => onViewDetails(inv)}
                          className="font-mono font-bold text-[var(--md-primary-text)] hover:underline text-xs cursor-pointer tabular-nums"
                        >
                          #{inv.invoice_number}
                        </button>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(inv.invoice_number, inv.id)}
                          className="text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] p-0.5 rounded transition-colors cursor-pointer"
                          title="نسخ رقم الفاتورة"
                        >
                          {copiedId === inv.id ? (
                            <Check className="w-3 h-3 text-[var(--md-success)]" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>

                        {/* Cloud Synchronization Status Indicator */}
                        {inv.syncStatus === 'CONFLICT' ? (
                          <span className="m3-badge-error text-[10px]" title="يوجد تعارض في السيرفر">
                            <span>⚠️</span>
                            <span>تعارض</span>
                          </span>
                        ) : inv.serverSeq || inv.syncStatus === 'SYNCED' || inv.is_synced ? (
                          <span className="m3-badge-success text-[10px]" title={`تم التأكيد بالسيرفر #${inv.serverSeq || ''}`}>
                            <span>☁️</span>
                            <span>متزامن</span>
                          </span>
                        ) : (
                          <span className="m3-badge-warning text-[10px]" title="محفوظ محلياً بانتظار الإرسال">
                            <span>⏳</span>
                            <span>معلق محلياً</span>
                          </span>
                        )}
                      </div>

                      {hasWarranty && (
                        <div className="flex items-center gap-1">
                          <span className="m3-badge-secondary text-[10px]">
                            <ShieldCheck className="w-3 h-3" />
                            <span>ضمان إطار/بطارية</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Customer & Price Tier */}
                  <td className="py-3.5 px-4">
                    <div className="space-y-1">
                      <p className="font-medium text-[var(--md-on-surface)] truncate max-w-[180px]">
                        {customerDisplayName}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {inv.customer_phone && (
                          <span className="text-[11px] text-[var(--md-on-surface-variant)] font-mono" dir="ltr">
                            {inv.customer_phone}
                          </span>
                        )}
                        <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${tierInfo.color}`}>
                          {tierInfo.label}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Sales Rep / Cashier */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 text-xs text-[var(--md-on-surface)] font-medium">
                      <User className="w-3.5 h-3.5 text-[var(--md-info)] shrink-0" />
                      <span className="truncate max-w-[130px]">{salesRep}</span>
                    </div>
                  </td>

                  {/* Issue Date */}
                  <td className="py-3.5 px-4 text-xs text-[var(--md-on-surface-variant)] font-mono tabular-nums">
                    {inv.invoice_date || inv.created_at?.split('T')[0]}
                  </td>

                  {/* Due Date */}
                  <td className="py-3.5 px-4 text-xs font-mono tabular-nums">
                    {inv.due_date ? (
                      <span className={isOverdue ? 'text-[var(--md-error)] font-bold flex items-center gap-1' : 'text-[var(--md-on-surface-variant)]'}>
                        {isOverdue && <AlertTriangle className="w-3 h-3 text-[var(--md-error)]" />}
                        {inv.due_date}
                      </span>
                    ) : (
                      <span className="text-[var(--md-on-surface-variant)]">-</span>
                    )}
                  </td>

                  {/* Total with Currency & Base Currency Equivalent */}
                  <td className="py-3.5 px-4 text-left font-mono tabular-nums">
                    <div className="space-y-0.5">
                      <div className="font-bold text-[var(--md-on-surface)] text-sm flex items-center justify-end gap-1.5" dir="ltr">
                        <span>{formatAmount(total, currency)}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold border ${
                          currency === 'YER'
                            ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border-[var(--md-primary)]/30'
                            : currency === 'SAR'
                            ? 'bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)] border-[var(--md-secondary)]/30'
                            : 'bg-[var(--md-info-container)] text-[var(--md-on-info-container)] border-[var(--md-info)]/30'
                        }`}>
                          {getActiveCurrencySymbol(currency)}
                        </span>
                      </div>
                      {currency !== 'YER' && (
                        <div className="text-[10px] text-[var(--md-warning)] font-mono text-left" dir="ltr">
                          ≈ {baseEquivalent.toLocaleString('en-US', { maximumFractionDigits: 0 })} {getActiveCurrencySymbol('YER')}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Paid */}
                  <td className="py-3.5 px-4 text-left font-mono font-semibold text-[var(--md-success)] tabular-nums" dir="ltr">
                    {formatAmount(paid, currency)}
                  </td>

                  {/* Remaining */}
                  <td className="py-3.5 px-4 text-left font-mono font-bold tabular-nums" dir="ltr">
                    <span className={remaining > 0.01 ? 'text-[var(--md-warning)]' : 'text-[var(--md-on-surface-variant)]'}>
                      {formatAmount(remaining, currency)}
                    </span>
                  </td>

                  {/* Status Badge */}
                  <td className="py-3.5 px-4 text-center">
                    {getStatusBadge(inv)}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {/* View Details */}
                      <button
                        type="button"
                        onClick={() => onViewDetails(inv)}
                        className="p-1.5 bg-[var(--md-surface-container-high)] hover:bg-[var(--md-surface-container-highest)] text-[var(--md-on-surface)] rounded-lg transition-colors cursor-pointer"
                        title="عرض تفاصيل الفاتورة"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Print */}
                      <button
                        type="button"
                        onClick={() =>
                          printInvoiceDocument({
                            ...inv,
                            invoiceNumber: inv.invoice_number,
                            total,
                            paidAmount: paid,
                            paid_amount: paid,
                            remainingAmount: remaining,
                            remaining_amount: remaining,
                            partyName: customerDisplayName,
                            customer_name: customerDisplayName,
                            salesperson: salesRep,
                            salesperson_name: salesRep,
                            currency: getActiveCurrencySymbol(inv.currency),
                          })
                        }
                        className="p-1.5 bg-[var(--md-info-container)]/60 hover:bg-[var(--md-info-container)] text-[var(--md-info)] rounded-lg transition-colors cursor-pointer"
                        title="طباعة"
                      >
                        <Printer className="w-4 h-4" />
                      </button>

                      {/* Quick Payment */}
                      {remaining > 0.01 && inv.status !== 'CANCELLED' && (
                        <button
                          type="button"
                          onClick={() => onRecordPayment(inv)}
                          className="p-1.5 bg-[var(--md-success-container)] hover:opacity-90 text-[var(--md-success)] border border-[var(--md-success)]/25 rounded-lg transition-colors cursor-pointer"
                          title="تسجيل دفعة"
                        >
                          <DollarSign className="w-4 h-4" />
                        </button>
                      )}

                      {/* Quick Return */}
                      {inv.status !== 'DRAFT' && inv.status !== 'CANCELLED' && (
                        <button
                          type="button"
                          onClick={() => onRecordReturn(inv)}
                          className="p-1.5 bg-[var(--md-warning-container)] hover:opacity-90 text-[var(--md-warning)] border border-[var(--md-warning)]/25 rounded-lg transition-colors cursor-pointer"
                          title="مرتجع مبيعات"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}

                      {/* Send Email */}
                      <button
                        type="button"
                        onClick={() => onSendEmail(inv.id)}
                        disabled={sendingEmailId === inv.id}
                        className="p-1.5 bg-[var(--md-surface-container-high)] hover:bg-[var(--md-surface-container-highest)] text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] rounded-lg transition-colors cursor-pointer"
                        title="إرسال عبر البريد"
                      >
                        <Mail className="w-4 h-4" />
                      </button>

                      {/* Delete / Reverse Invoice */}
                      <button
                        type="button"
                        onClick={() => onDeleteInvoice(inv.id || inv.invoice_number)}
                        className="p-1.5 bg-[var(--md-error-container)] hover:opacity-90 text-[var(--md-error)] border border-[var(--md-error)]/25 rounded-lg transition-colors cursor-pointer"
                        title="حذف الفاتورة من السجل وإعادة البضاعة للمخزن وعكس الحسابات"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div className="px-4 py-3 border-t border-[var(--md-outline-variant)] bg-[var(--md-surface-container-low)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--md-on-surface-variant)]">
        <div>
          إجمالي النتائج: <span className="font-bold text-[var(--md-on-surface)] tabular-nums">{totalCount}</span> فاتورة
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
              className="m3-btn-outlined p-1.5"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="font-mono tabular-nums">
              صفحة {currentPage} من {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              className="m3-btn-outlined p-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
