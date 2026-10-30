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
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-300 border border-slate-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
          مسودة
        </span>
      );
    }
    if (status === 'CANCELLED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
          ملغاة
        </span>
      );
    }
    if (status === 'PAID' || remaining <= 0.01) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          مسددة بالكامل
        </span>
      );
    }
    if (status === 'PARTIALLY_PAID' || status === 'PARTIAL' || (paid > 0 && remaining > 0.01)) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
          مسددة جزئياً
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
        آجلة / ذمم (غير مسددة)
      </span>
    );
  };

  const isAllSelected = invoices.length > 0 && selectedIds.length === invoices.length;

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 shadow-sm">
        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">جاري تحميل سجل فواتير المبيعات...</p>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 shadow-sm">
        <p className="text-base font-semibold text-slate-300 mb-1">لا توجد فواتير مبيعات مطابقة</p>
        <p className="text-xs text-slate-500">جرب تغيير معايير البحث أو الفلاتر أو إنشاء فاتورة جديدة.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="bg-slate-950/70 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <tr>
              <th className="py-3.5 px-4 w-10 text-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={onSelectAll}
                  className="w-4 h-4 rounded text-blue-600 bg-slate-800 border-slate-700 focus:ring-blue-500 cursor-pointer"
                />
              </th>
              <th className="py-3.5 px-4">رقم الفاتورة والضمان</th>
              <th className="py-3.5 px-4">العميل وفئة السعر</th>
              <th className="py-3.5 px-4">المندوب / البائع</th>
              <th className="py-3.5 px-4">تاريخ الإصدار</th>
              <th className="py-3.5 px-4">الاستحقاق</th>
              <th className="py-3.5 px-4 text-left">العملة والإجمالي</th>
              <th className="py-3.5 px-4 text-left">المدفوع</th>
              <th className="py-3.5 px-4 text-left">المتبقي</th>
              <th className="py-3.5 px-4 text-center">الحالة</th>
              <th className="py-3.5 px-4 text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
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
                retail: { label: 'تجزئة', color: 'bg-slate-800 text-slate-300 border-slate-700' },
                half_wholesale: { label: 'نصف جملة', color: 'bg-sky-950 text-sky-300 border-sky-800' },
                wholesale: { label: 'جملة', color: 'bg-emerald-950 text-emerald-300 border-emerald-800' },
                vip: { label: 'VIP خاص', color: 'bg-amber-950 text-amber-300 border-amber-800' },
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
                  className={`hover:bg-slate-800/40 transition-colors ${
                    isSelected ? 'bg-blue-500/5' : ''
                  }`}
                >
                  <td className="py-3.5 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onSelectToggle(inv.id)}
                      className="w-4 h-4 rounded text-blue-600 bg-slate-800 border-slate-700 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>

                  {/* Invoice Number & Battery/Tire Warranty Badge */}
                  <td className="py-3.5 px-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => onViewDetails(inv)}
                          className="font-mono font-bold text-blue-400 hover:text-blue-300 hover:underline text-xs"
                        >
                          #{inv.invoice_number}
                        </button>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(inv.invoice_number, inv.id)}
                          className="text-slate-500 hover:text-slate-300 p-0.5 rounded transition-colors"
                          title="نسخ رقم الفاتورة"
                        >
                          {copiedId === inv.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>

                        {/* Cloud Synchronization Status Indicator */}
                        {inv.syncStatus === 'CONFLICT' ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.2 rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/30 font-bold" title="يوجد تعارض في السيرفر">
                            <span>⚠️</span>
                            <span>تعارض</span>
                          </span>
                        ) : inv.serverSeq || inv.syncStatus === 'SYNCED' || inv.is_synced ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold" title={`تم التأكيد بالسيرفر #${inv.serverSeq || ''}`}>
                            <span>☁️</span>
                            <span>متزامن</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.2 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30 font-bold" title="محفوظ محلياً بانتظار الإرسال">
                            <span>⏳</span>
                            <span>معلق محلياً</span>
                          </span>
                        )}
                      </div>

                      {hasWarranty && (
                        <div className="flex items-center gap-1">
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                            <ShieldCheck className="w-3 h-3 text-amber-400" />
                            <span>ضمان إطار/بطارية</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Customer & Price Tier */}
                  <td className="py-3.5 px-4">
                    <div className="space-y-1">
                      <p className="font-medium text-slate-100 truncate max-w-[180px]">
                        {customerDisplayName}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {inv.customer_phone && (
                          <span className="text-[11px] text-slate-500 font-mono" dir="ltr">
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
                    <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                      <User className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="truncate max-w-[130px]">{salesRep}</span>
                    </div>
                  </td>

                  {/* Issue Date */}
                  <td className="py-3.5 px-4 text-xs text-slate-300 font-mono">
                    {inv.invoice_date || inv.created_at?.split('T')[0]}
                  </td>

                  {/* Due Date */}
                  <td className="py-3.5 px-4 text-xs font-mono">
                    {inv.due_date ? (
                      <span className={isOverdue ? 'text-rose-400 font-bold flex items-center gap-1' : 'text-slate-300'}>
                        {isOverdue && <AlertTriangle className="w-3 h-3 text-rose-400" />}
                        {inv.due_date}
                      </span>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>

                  {/* Total with Currency & Base Currency Equivalent */}
                  <td className="py-3.5 px-4 text-left font-mono">
                    <div className="space-y-0.5">
                      <div className="font-bold text-white text-sm flex items-center justify-end gap-1.5" dir="ltr">
                        <span>{formatAmount(total, currency)}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold border ${
                          currency === 'YER'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : currency === 'SAR'
                            ? 'bg-amber-950 text-amber-300 border-amber-800'
                            : 'bg-blue-950 text-blue-300 border-blue-800'
                        }`}>
                          {getActiveCurrencySymbol(currency)}
                        </span>
                      </div>
                      {currency !== 'YER' && (
                        <div className="text-[10px] text-amber-300/90 font-mono text-left" dir="ltr">
                          ≈ {baseEquivalent.toLocaleString('en-US', { maximumFractionDigits: 0 })} {getActiveCurrencySymbol('YER')}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Paid */}
                  <td className="py-3.5 px-4 text-left font-mono font-semibold text-emerald-400" dir="ltr">
                    {formatAmount(paid, currency)}
                  </td>

                  {/* Remaining */}
                  <td className="py-3.5 px-4 text-left font-mono font-bold" dir="ltr">
                    <span className={remaining > 0.01 ? 'text-amber-400' : 'text-slate-500'}>
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
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
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
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg transition-colors"
                        title="طباعة"
                      >
                        <Printer className="w-4 h-4" />
                      </button>

                      {/* Quick Payment */}
                      {remaining > 0.01 && inv.status !== 'CANCELLED' && (
                        <button
                          type="button"
                          onClick={() => onRecordPayment(inv)}
                          className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg transition-colors"
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
                          className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg transition-colors"
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
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
                        title="إرسال عبر البريد"
                      >
                        <Mail className="w-4 h-4" />
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
      <div className="px-4 py-3 border-t border-slate-800 bg-slate-950/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <div>
          إجمالي النتائج: <span className="font-bold text-slate-200">{totalCount}</span> فاتورة
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg text-slate-300 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="font-mono">
              صفحة {currentPage} من {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg text-slate-300 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
