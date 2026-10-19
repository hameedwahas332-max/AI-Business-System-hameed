import React, { useState, useEffect } from 'react';
import { api } from '../../../api';
import { formatAmount } from '../../../lib/formatters';
import { X, RotateCcw, AlertCircle, CheckCircle2, Loader2, DollarSign } from 'lucide-react';

interface SalesInvoiceReturnModalProps {
  invoice: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SalesInvoiceReturnModal: React.FC<SalesInvoiceReturnModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [returnItems, setReturnItems] = useState<
    Array<{
      product_id?: string;
      product_name: string;
      max_qty: number;
      quantity: number;
      unit_price: number;
      selected: boolean;
    }>
  >([]);

  const [refundMethod, setRefundMethod] = useState<'CREDIT_NOTE' | 'CASH_REFUND' | 'BANK_REFUND'>('CREDIT_NOTE');
  const [reason, setReason] = useState('');
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [fetchingItems, setFetchingItems] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !invoice) {
      setReturnItems([]);
      return;
    }

    const rawItems = Array.isArray(invoice.items) ? invoice.items : [];
    if (rawItems.length > 0) {
      setReturnItems(
        rawItems.map((it: any) => ({
          product_id: it.product_id,
          product_name: it.product_name || it.item_name || it.description || 'صنف مبيعات',
          max_qty: parseFloat(it.quantity || '1'),
          quantity: parseFloat(it.quantity || '1'),
          unit_price: parseFloat(it.unit_price || '0'),
          selected: false,
        }))
      );
    } else if (invoice.id) {
      setFetchingItems(true);
      api
        .getInvoiceById(invoice.id)
        .then((res) => {
          if (res.success && res.data && Array.isArray(res.data.items)) {
            setReturnItems(
              res.data.items.map((it: any) => ({
                product_id: it.product_id,
                product_name: it.product_name || it.item_name || it.description || 'صنف مبيعات',
                max_qty: parseFloat(it.quantity || '1'),
                quantity: parseFloat(it.quantity || '1'),
                unit_price: parseFloat(it.unit_price || '0'),
                selected: false,
              }))
            );
          }
        })
        .catch((err) => {
          console.warn('Failed to load items for return:', err);
        })
        .finally(() => {
          setFetchingItems(false);
        });
    }
  }, [invoice?.id, isOpen]);

  if (!isOpen || !invoice) return null;

  const toggleItem = (idx: number) => {
    const updated = [...returnItems];
    updated[idx].selected = !updated[idx].selected;
    setReturnItems(updated);
  };

  const updateQty = (idx: number, qty: number) => {
    const updated = [...returnItems];
    const max = updated[idx].max_qty;
    updated[idx].quantity = Math.max(0.01, Math.min(max, qty));
    setReturnItems(updated);
  };

  const selectedTotal = returnItems
    .filter((it) => it.selected)
    .reduce((acc, it) => acc + it.quantity * it.unit_price, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const toReturn = returnItems
      .filter((it) => it.selected && it.quantity > 0)
      .map((it) => ({
        product_id: it.product_id,
        quantity: it.quantity,
        unit_price: it.unit_price,
      }));

    if (toReturn.length === 0) {
      setError('يرجى اختيار صنف واحد على الأقل للمرتجع وتحديد الكمية');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.createInvoiceReturn(invoice.id, {
        items: toReturn,
        refund_method: refundMethod,
        reason: reason || `مرتجع عن الفاتورة #${invoice.invoice_number}`,
        return_date: returnDate,
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error?.message || 'فشل تسجيل مرتجع المبيعات');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء معالجة المرتجع');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">تسجيل مرتجع مبيعات / إشعار دائن</h2>
              <p className="text-xs text-slate-400">
                للفاتورة رقم: <span className="text-blue-400 font-mono font-bold">#{invoice.invoice_number}</span> | العميل: {invoice.customer_name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Items selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">
              حدد الأصناف والكميات المراد إرجاعها للمخزن:
            </label>
            <div className="border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800 bg-slate-950/30">
              {returnItems.map((it, idx) => (
                <div
                  key={idx}
                  className={`p-3 flex items-center justify-between gap-4 transition-colors ${
                    it.selected ? 'bg-blue-500/5' : 'hover:bg-slate-800/30'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={it.selected}
                      onChange={() => toggleItem(idx)}
                      className="w-4 h-4 rounded text-blue-600 bg-slate-800 border-slate-700 focus:ring-blue-500 cursor-pointer"
                    />
                    <div className="truncate">
                      <p className="text-sm font-medium text-slate-100 truncate">{it.product_name}</p>
                      <p className="text-xs text-slate-400">
                        الكمية الأصلية: {it.max_qty} | السعر: {formatAmount(it.unit_price, invoice.currency || 'YER')}
                      </p>
                    </div>
                  </div>

                  {it.selected && (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-400">كمية الإرجاع:</span>
                        <input
                          type="number"
                          step="any"
                          min="0.01"
                          max={it.max_qty}
                          value={it.quantity}
                          onChange={(e) => updateQty(idx, parseFloat(e.target.value) || 0)}
                          className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-sm text-center text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="text-right min-w-[80px]">
                        <span className="text-xs font-bold text-amber-400">
                          {formatAmount(it.quantity * it.unit_price, invoice.currency || 'YER')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Refund Method & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">طريقة التسوية / الاسترجاع</label>
              <select
                value={refundMethod}
                onChange={(e) => setRefundMethod(e.target.value as any)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="CREDIT_NOTE">إشعار دائن (تخفيض مديونية العميل)</option>
                <option value="CASH_REFUND">استرجاع نقدي فوري من الخزينة</option>
                <option value="BANK_REFUND">تحويل بنكي مسترجع</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">تاريخ المرتجع</label>
              <input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">سبب الإرجاع / ملاحظات</label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثال: تلف في المنتج، خطأ في الطلب، رغبة العميل..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {/* Return Total Summary */}
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-300">إجمالي قيمة المرتجع المستحقة:</span>
            <span className="text-xl font-bold text-amber-400 font-mono">
              {formatAmount(selectedTotal, invoice.currency || 'YER')}
            </span>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading || selectedTotal <= 0}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-amber-600/20 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري تسجيل المرتجع...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  تأكيد وقيد المرتجع
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
