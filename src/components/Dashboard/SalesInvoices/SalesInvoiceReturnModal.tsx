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
      item_code?: string;
      part_number?: string;
      serial_number?: string;
      tire_size?: string;
      tire_production_dot?: string;
      unit: string;
      max_qty: number;
      quantity: number;
      unit_price: number;
      selected: boolean;
      warranty_status?: {
        isUnderWarranty: boolean;
        expiresAtStr: string;
      } | null;
    }>
  >([]);

  const [refundMethod, setRefundMethod] = useState<'CREDIT_NOTE' | 'CASH_REFUND' | 'BANK_REFUND'>('CREDIT_NOTE');
  const [reason, setReason] = useState('');
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [fetchingItems, setFetchingItems] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateWarrantyStatus = (invoiceDateStr: string | undefined, months: number | undefined) => {
    if (!months || months <= 0) return null;
    const invDate = invoiceDateStr ? new Date(invoiceDateStr) : new Date();
    if (isNaN(invDate.getTime())) return null;

    const expiryDate = new Date(invDate);
    expiryDate.setMonth(expiryDate.getMonth() + months);
    const today = new Date();
    const isUnderWarranty = today.getTime() <= expiryDate.getTime();
    return {
      isUnderWarranty,
      expiresAtStr: expiryDate.toISOString().split('T')[0],
    };
  };

  const mapRawItems = (items: any[]) => {
    return items.map((it: any) => {
      const wMonths = Number(it.warranty_months || it.warrantyMonths || 0);
      const wStatus = calculateWarrantyStatus(invoice.invoice_date || invoice.created_at, wMonths);
      return {
        product_id: it.product_id,
        product_name: it.product_name || it.item_name || it.description || 'صنف مبيعات',
        item_code: it.item_code || it.sku,
        part_number: it.part_number,
        serial_number: it.battery_serial_number || it.serial_number,
        tire_size: it.tire_size,
        tire_production_dot: it.tire_production_dot,
        unit: it.unit || 'حبة',
        max_qty: parseFloat(it.quantity || '1'),
        quantity: parseFloat(it.quantity || '1'),
        unit_price: parseFloat(it.unit_price || '0'),
        selected: false,
        warranty_status: wStatus,
      };
    });
  };

  useEffect(() => {
    if (!isOpen || !invoice) {
      setReturnItems([]);
      return;
    }

    const rawItems = Array.isArray(invoice.items) ? invoice.items : [];
    if (rawItems.length > 0) {
      setReturnItems(mapRawItems(rawItems));
    } else if (invoice.id) {
      setFetchingItems(true);
      api
        .getInvoiceById(invoice.id)
        .then((res) => {
          if (res.success && res.data && Array.isArray(res.data.items)) {
            setReturnItems(mapRawItems(res.data.items));
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
        item_code: it.item_code,
        serial_number: it.serial_number,
        unit: it.unit,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn" dir="rtl">
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
                  className={`p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors ${
                    it.selected ? 'bg-blue-500/5' : 'hover:bg-slate-800/30'
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={it.selected}
                      onChange={() => toggleItem(idx)}
                      className="w-4 h-4 mt-1 rounded text-blue-600 bg-slate-800 border-slate-700 focus:ring-blue-500 cursor-pointer"
                    />
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-slate-100">{it.product_name}</p>
                        {(it.item_code || it.part_number) && (
                          <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-mono">
                            #{it.item_code || it.part_number}
                          </span>
                        )}
                        <span className="px-2 py-0.5 bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded text-[10px] font-medium">
                          الوحدة: {it.unit}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400">
                        {it.serial_number && (
                          <span className="text-amber-400 font-mono">سيريال: {it.serial_number}</span>
                        )}
                        {it.tire_size && (
                          <span className="text-cyan-400 font-mono">مقاس: {it.tire_size} {it.tire_production_dot ? `(${it.tire_production_dot})` : ''}</span>
                        )}
                        <span>الكمية: <strong className="text-white font-mono">{it.max_qty}</strong> {it.unit}</span>
                        <span>السعر: <strong className="text-white font-mono" dir="ltr">{formatAmount(it.unit_price, invoice.currency || 'YER')}</strong></span>
                      </div>

                      {it.warranty_status && (
                        <div>
                          {it.warranty_status.isUnderWarranty ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[10px] font-bold">
                              تحت الضمان - ساري حتى {it.warranty_status.expiresAtStr}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded text-[10px] font-bold">
                              منتهي الضمان ({it.warranty_status.expiresAtStr})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {it.selected && (
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-400">كمية الإرجاع:</span>
                        <input
                          type="number"
                          step="any"
                          min="0.01"
                          max={it.max_qty}
                          value={it.quantity}
                          onChange={(e) => updateQty(idx, parseFloat(e.target.value) || 0)}
                          className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-sm text-center font-mono font-bold text-white focus:outline-none focus:border-blue-500"
                        />
                        <span className="text-xs text-slate-400">{it.unit}</span>
                      </div>
                      <div className="text-right min-w-[90px]">
                        <span className="text-xs font-bold text-amber-400 font-mono" dir="ltr">
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
