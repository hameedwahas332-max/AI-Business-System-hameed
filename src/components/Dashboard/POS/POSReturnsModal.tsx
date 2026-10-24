import React, { useState } from 'react';
import {
  X,
  RotateCcw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Banknote,
  Landmark,
  CreditCard,
  ArrowRight,
  ShieldCheck,
  Package,
} from 'lucide-react';
import { api } from '../../../api';

interface POSReturnsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftId?: string;
  currency: string;
  onReturnCompleted: () => void;
}

export const POSReturnsModal: React.FC<POSReturnsModalProps> = ({
  isOpen,
  onClose,
  shiftId,
  currency,
  onReturnCompleted,
}) => {
  const [searchInvoiceNo, setSearchInvoiceNo] = useState('');
  const [searching, setSearching] = useState(false);
  const [invoice, setInvoice] = useState<any | null>(null);
  const [returnItems, setReturnItems] = useState<
    Array<{
      productId?: string | null;
      name: string;
      originalQty: number;
      returnQty: number;
      unitPrice: number;
      tax?: number;
      refundAmount: number;
    }>
  >([]);
  const [refundMethod, setRefundMethod] = useState<'CASH' | 'BANK' | 'CARD' | 'CUSTOMER_CREDIT'>('CASH');
  const [reason, setReason] = useState('إرجاع صنف / رغبة العميل');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearchInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInvoiceNo.trim()) return;

    try {
      setSearching(true);
      setError(null);
      setInvoice(null);
      const res = await api.getInvoices({ search: searchInvoiceNo.trim() });
      const found = (res.data || []).find(
        (inv: any) =>
          inv.invoice_number?.toLowerCase() === searchInvoiceNo.trim().toLowerCase() ||
          inv.id === searchInvoiceNo.trim()
      );

      if (found) {
        setInvoice(found);
        // Map items
        const mapped = (found.items || []).map((it: any) => ({
          productId: it.product_id || null,
          name: it.item_name || it.product_name || 'صنف مباشر',
          originalQty: Number(it.quantity) || 1,
          returnQty: 0,
          unitPrice: Number(it.unit_price) || 0,
          tax: Number(it.tax) || 0,
          refundAmount: 0,
        }));
        setReturnItems(mapped);
      } else {
        setError('لم يتم العثور على فاتورة بهذا الرقم');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء البحث عن الفاتورة');
    } finally {
      setSearching(false);
    }
  };

  const handleQtyChange = (idx: number, qty: number) => {
    const updated = [...returnItems];
    const max = updated[idx].originalQty;
    const safeQty = Math.max(0, Math.min(max, qty));
    updated[idx].returnQty = safeQty;
    updated[idx].refundAmount = safeQty * updated[idx].unitPrice;
    setReturnItems(updated);
  };

  const totalRefund = returnItems.reduce((s, it) => s + it.refundAmount, 0);

  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;

    const selectedToReturn = returnItems
      .filter((it) => it.returnQty > 0)
      .map((it) => ({
        productId: it.productId,
        name: it.name,
        quantity: it.returnQty,
        unitPrice: it.unitPrice,
        tax: it.tax,
        refundAmount: it.refundAmount,
      }));

    if (selectedToReturn.length === 0) {
      setError('يرجى تحديد كمية صنف واحد على الأقل للإرجاع');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await api.posProcessReturn({
        originalInvoiceId: invoice.id,
        items: selectedToReturn,
        totalRefund,
        refundMethod,
        reason,
        shiftId,
      });

      if (res.success) {
        setSuccess('تمت معالجة مرتجع المبيعات وإعادة الأصناف للمخزون وتسوية القيود بنجاح');
        setTimeout(() => {
          onReturnCompleted();
          onClose();
        }, 1200);
      } else {
        setError(res.error?.message || 'فشلت معالجة المرتجع');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تسجيل المرتجع');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto" dir="rtl">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-2xl border border-rose-500/20">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">مرتجع مبيعات واسترداد</h3>
              <p className="text-xs text-slate-400">إرجاع أصناف الفاتورة واسترداد القيمة محاسبياً ومخزنياً</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Step 1: Search Invoice */}
          <form onSubmit={handleSearchInvoice} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
              <input
                type="text"
                value={searchInvoiceNo}
                onChange={(e) => setSearchInvoiceNo(e.target.value)}
                placeholder="أدخل رقم الفاتورة الأصلية (مثال: POS-2026-00001 أو INV-...)"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pr-10 pl-4 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold shrink-0 transition-colors"
            >
              {searching ? 'جاري البحث...' : 'بحث عن الفاتورة'}
            </button>
          </form>

          {/* Step 2: Invoice Details & Items to Return */}
          {invoice && (
            <form onSubmit={handleSubmitReturn} className="space-y-4">
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block">الفاتورة الأصلية:</span>
                  <span className="text-sm font-bold text-white">#{invoice.invoice_number}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">التاريخ:</span>
                  <span className="font-medium text-slate-300">{invoice.invoice_date}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">العميل:</span>
                  <span className="font-bold text-emerald-400">{invoice.customer_name || 'عميل نقدي'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">إجمالي الفاتورة:</span>
                  <span className="font-bold text-white">{Number(invoice.total).toLocaleString()} {invoice.currency || currency}</span>
                </div>
              </div>

              {/* Items Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  حدد الكميات المراد إرجاعها:
                </label>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {returnItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-800/50 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-white block truncate">{item.name}</span>
                        <span className="text-slate-400 text-[11px]">
                          الكمية المشتراة: {item.originalQty} | السعر: {item.unitPrice.toLocaleString()} {invoice.currency || currency}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-slate-400 text-[11px]">الكمية المرجعة:</span>
                        <input
                          type="number"
                          min="0"
                          max={item.originalQty}
                          step="any"
                          value={item.returnQty}
                          onChange={(e) => handleQtyChange(idx, parseFloat(e.target.value) || 0)}
                          className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-bold text-white focus:outline-none focus:border-rose-500"
                        />
                      </div>

                      <div className="text-left w-24 shrink-0">
                        <span className="text-[11px] text-slate-400 block">المبلغ المسترد:</span>
                        <span className="font-bold text-rose-400">
                          {item.refundAmount.toLocaleString()} {invoice.currency || currency}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Refund Method & Reason */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">طريقة رد المبلغ:</label>
                  <select
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="CASH">نقداً من الدرج (Cash Refund)</option>
                    <option value="BANK">تحويل بنكي</option>
                    <option value="CARD">إرجاع على البطاقة</option>
                    <option value="CUSTOMER_CREDIT">إشعار دائن على حساب العميل</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">سبب الإرجاع:</label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="سبب الإرجاع..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Refund Total & Confirmation */}
              <div className="p-4 bg-rose-950/20 border border-rose-800/30 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-rose-300 font-semibold block">إجمالي مبلغ الاسترداد المستحق:</span>
                  <span className="text-2xl font-black text-rose-400">
                    {totalRefund.toLocaleString()} {invoice.currency || currency}
                  </span>
                </div>
                <button
                  type="submit"
                  disabled={submitting || totalRefund <= 0}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-950/40 transition-all flex items-center gap-2"
                >
                  {submitting ? 'جاري المعالجة...' : 'تأكيد تسجيل المرتجع'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
