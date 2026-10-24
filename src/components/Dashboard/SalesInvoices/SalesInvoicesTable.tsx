import React, { useState } from 'react';
import { formatAmount } from '../../../lib/formatters';
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
} from 'lucide-react';

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
    const status = invoice.status;
    const total = parseFloat(invoice.total || '0');
    const paid = parseFloat(invoice.paid_amount || '0');
    const remaining = Math.max(0, parseFloat(invoice.remaining_amount || `${total - paid}`));

    if (status === 'PAID' || remaining <= 0.01) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          مسددة بالكامل
        </span>
      );
    }
    if (status === 'PARTIALLY_PAID' || (paid > 0 && remaining > 0.01)) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
          مسددة جزئياً
        </span>
      );
    }
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
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
        معلقة (PENDING)
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
              <th className="py-3.5 px-4">رقم الفاتورة</th>
              <th className="py-3.5 px-4">العميل</th>
              <th className="py-3.5 px-4">تاريخ الإصدار</th>
              <th className="py-3.5 px-4">تاريخ الاستحقاق</th>
              <th className="py-3.5 px-4 text-left">الإجمالي</th>
              <th className="py-3.5 px-4 text-left">المدفوع</th>
              <th className="py-3.5 px-4 text-left">المتبقي</th>
              <th className="py-3.5 px-4 text-center">الحالة</th>
              <th className="py-3.5 px-4 text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {invoiceList.map((inv) => {
              const isSelected = selectedList.includes(inv.id);
              const total = parseFloat(inv.total || '0');
              const paid = parseFloat(inv.paid_amount || '0');
              const remaining = Math.max(0, parseFloat(inv.remaining_amount || `${total - paid}`));
              const todayStr = new Date().toISOString().split('T')[0];
              const isOverdue = remaining > 0.01 && inv.due_date && inv.due_date < todayStr && inv.status !== 'DRAFT';

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

                  {/* Invoice Number */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5">
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
                    </div>
                  </td>

                  {/* Customer */}
                  <td className="py-3.5 px-4">
                    <div>
                      <p className="font-medium text-slate-100 truncate max-w-[180px]">
                        {inv.customer_name || 'عميل نقدي / غير محدد'}
                      </p>
                      {inv.customer_phone && (
                        <p className="text-xs text-slate-500 font-mono" dir="ltr">
                          {inv.customer_phone}
                        </p>
                      )}
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

                  {/* Total */}
                  <td className="py-3.5 px-4 text-left font-mono font-bold text-white">
                    {formatAmount(total, inv.currency || 'YER')}
                  </td>

                  {/* Paid */}
                  <td className="py-3.5 px-4 text-left font-mono font-semibold text-emerald-400">
                    {formatAmount(paid, inv.currency || 'YER')}
                  </td>

                  {/* Remaining */}
                  <td className="py-3.5 px-4 text-left font-mono font-bold">
                    <span className={remaining > 0.01 ? 'text-amber-400' : 'text-slate-500'}>
                      {formatAmount(remaining, inv.currency || 'YER')}
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
                        onClick={() => printInvoiceDocument(inv)}
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
