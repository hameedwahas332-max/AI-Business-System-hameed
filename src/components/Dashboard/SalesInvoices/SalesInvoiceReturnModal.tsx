import React, { useState, useEffect } from 'react';
import { api } from '../../../api';
import { formatAmount, applyStockMovementSync, getActiveCurrencySymbol } from '../../../lib/formatters';
import { normalizeScannedBarcode } from '../../../utils/barcodeUtils';
import {
  X,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Loader2,
  DollarSign,
  ShieldCheck,
  AlertTriangle,
  Search,
  Package,
} from 'lucide-react';

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
  const [itemSearch, setItemSearch] = useState('');
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
  const [removeInvoiceAfterReturn, setRemoveInvoiceAfterReturn] = useState(true);
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
        product_id: it.product_id || it.productId || it.id,
        product_name: it.product_name || it.item_name || it.name || it.description || 'صنف مبيعات',
        item_code: it.item_code || it.sku,
        part_number: it.part_number,
        serial_number: it.battery_serial_number || it.serial_number,
        tire_size: it.tire_size,
        tire_production_dot: it.tire_production_dot,
        unit: it.unit || 'حبة',
        max_qty: parseFloat(it.quantity || it.qty || '1'),
        quantity: parseFloat(it.quantity || it.qty || '1'),
        unit_price: parseFloat(it.unit_price || it.unitPrice || it.price || '0'),
        selected: true,
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
      const isFullReturn = returnItems.every((it) => it.selected && it.quantity >= it.max_qty);
      const res = await api.createInvoiceReturn(invoice.id || invoice.invoice_number, {
        original_invoice_number: invoice.invoice_number || invoice.id,
        originalInvoiceNumber: invoice.invoice_number || invoice.id,
        customer_id: invoice.customer_id || invoice.customerId,
        customerId: invoice.customer_id || invoice.customerId,
        customer_name: invoice.customer_name || invoice.customerName,
        items: toReturn,
        total: selectedTotal,
        totalRefund: selectedTotal,
        refund_amount: selectedTotal,
        refund_method: refundMethod,
        refundMethod: refundMethod,
        remove_invoice: removeInvoiceAfterReturn,
        is_full_return: isFullReturn,
        reason: reason || `مرتجع عن الفاتورة #${invoice.invoice_number}`,
        return_date: returnDate,
      });

      if (res.success) {
        // Restore returned items back into inventory
        try {
          applyStockMovementSync(
            toReturn.map((it) => ({
              productId: it.product_id || it.item_code || '',
              quantity: it.quantity,
              unitName: it.unit,
              price: it.unit_price,
              total: it.quantity * it.unit_price,
            })),
            {
              type: 'return',
              referenceNumber: `RET-${invoice.invoice_number}`,
              referenceId: invoice.id,
              customerOrSupplierName: invoice.customer_name,
              notes: reason || `مرتجع مبيعات للفاتورة #${invoice.invoice_number}`,
            }
          );
        } catch (syncErr) {
          console.error('Failed to sync return to inventory:', syncErr);
        }

        // Update customer balance in localStorage if CREDIT_NOTE or if invoice had remaining unpaid balance
        try {
          const custId = invoice.customer_id || invoice.customerId;
          const custName = String(invoice.customer_name || invoice.customerName || '').trim().toLowerCase();
          if ((refundMethod === 'CREDIT_NOTE' || removeInvoiceAfterReturn) && (custId || custName)) {
            const rawCusts = JSON.parse(localStorage.getItem('erp_customers_v1') || '[]');
            if (Array.isArray(rawCusts) && rawCusts.length > 0) {
              const debtReduction =
                refundMethod === 'CREDIT_NOTE'
                  ? selectedTotal
                  : Math.min(selectedTotal, Number(invoice.remaining_amount ?? invoice.remainingAmount ?? 0));
              if (debtReduction > 0) {
                const updatedCusts = rawCusts.map((c: any) => {
                  const isMatch =
                    (custId && String(c.id) === String(custId)) ||
                    (custName && String(c.name || '').trim().toLowerCase() === custName);
                  if (!isMatch) return c;
                  const curBal = Number(c.current_balance ?? c.balance ?? c.total_debt ?? 0);
                  const nextBal = Math.max(0, Number((curBal - debtReduction).toFixed(2)));
                  return {
                    ...c,
                    current_balance: nextBal,
                    balance: nextBal,
                    total_debt: nextBal,
                  };
                });
                localStorage.setItem('erp_customers_v1', JSON.stringify(updatedCusts));
              }
            }
          }
        } catch (custErr) {
          console.error('Failed to update customer balance on return:', custErr);
        }

        // Remove or update the invoice in erp_invoices_v1 and erp_pos_sales_log_v1
        try {
          const invIdLower = String(invoice.id || '').toLowerCase();
          const invNoLower = String(invoice.invoice_number || invoice.invoiceNumber || '').toLowerCase();
          for (const sKey of ['erp_invoices_v1', 'erp_pos_sales_log_v1']) {
            const rawList = JSON.parse(localStorage.getItem(sKey) || '[]');
            if (Array.isArray(rawList)) {
              if (removeInvoiceAfterReturn || isFullReturn) {
                const filtered = rawList.filter(
                  (inv: any) =>
                    String(inv.id || '').toLowerCase() !== invIdLower &&
                    String(inv.invoice_number || inv.invoiceNumber || '').toLowerCase() !== invNoLower
                );
                localStorage.setItem(sKey, JSON.stringify(filtered));
              } else {
                const updated = rawList.map((inv: any) => {
                  const matches =
                    String(inv.id || '').toLowerCase() === invIdLower ||
                    String(inv.invoice_number || inv.invoiceNumber || '').toLowerCase() === invNoLower;
                  if (!matches) return inv;
                  const newTotal = Math.max(0, Number(inv.total || 0) - selectedTotal);
                  const newRem = Math.max(0, Number(inv.remaining_amount ?? inv.remainingAmount ?? 0) - selectedTotal);
                  return {
                    ...inv,
                    total: newTotal,
                    totalAmount: newTotal,
                    grandTotal: newTotal,
                    remaining_amount: newRem,
                    remainingAmount: newRem,
                  };
                });
                localStorage.setItem(sKey, JSON.stringify(updated));
              }
            }
          }
        } catch (cleanErr) {
          console.error('Failed to update local invoices after return:', cleanErr);
        }

        window.dispatchEvent(new Event('erp-invoices-updated'));
        window.dispatchEvent(new Event('erp-inventory-updated'));
        window.dispatchEvent(new Event('erp-customers-updated'));
        window.dispatchEvent(new Event('erp-data-updated'));

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
    <div className="m3-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn" dir="rtl">
      <div className="m3-modal-surface rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--md-outline-variant)] flex items-center justify-between bg-[var(--md-surface-container-low)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--md-warning-container)] border border-[var(--md-outline-variant)] flex items-center justify-center text-[var(--md-on-warning-container)]">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--md-on-surface)]">تسجيل مرتجع مبيعات / إشعار دائن</h2>
              <p className="text-xs text-[var(--md-on-surface-variant)]">
                للفاتورة رقم: <span className="text-[var(--md-primary-text)] font-mono font-bold tabular-nums">#{invoice.invoice_number}</span> | العميل: {invoice.customer_name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] p-2 rounded-lg hover:bg-[var(--md-surface-container-high)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3 bg-[var(--md-error-container)] border border-[var(--md-error)]/30 rounded-xl text-[var(--md-on-error-container)] text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Items selection & search */}
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="block text-sm font-semibold text-[var(--md-on-surface)]">
                حدد الأصناف والكميات المراد إرجاعها للمخزن:
              </label>

              {returnItems.length > 2 && (
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-[var(--md-on-surface-variant)]" />
                  <input
                    type="text"
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    placeholder="بحث بكود الصنف، السيريال، أو المقاس..."
                    className="m3-input w-full pr-8 pl-2.5 py-1.5 text-xs"
                  />
                </div>
              )}
            </div>

            <div className="border border-[var(--md-outline-variant)] rounded-xl overflow-hidden divide-y divide-[var(--md-outline-variant)] bg-[var(--md-surface-container-low)]">
              {returnItems
                .filter((it) => {
                  if (!itemSearch.trim()) return true;
                  const q = normalizeScannedBarcode(itemSearch.trim()).toLowerCase();
                  return (
                    it.product_name.toLowerCase().includes(q) ||
                    (it.item_code || '').toLowerCase().includes(q) ||
                    (it.part_number || '').toLowerCase().includes(q) ||
                    (it.serial_number || '').toLowerCase().includes(q) ||
                    (it.tire_size || '').toLowerCase().includes(q)
                  );
                })
                .map((it, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors ${
                      it.selected
                        ? 'bg-[var(--md-primary-container)]/35'
                        : 'hover:bg-[var(--md-surface-container)]'
                    }`}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={it.selected}
                        onChange={() => toggleItem(idx)}
                        className="w-4 h-4 mt-1 rounded accent-[var(--md-primary)] cursor-pointer"
                      />
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-[var(--md-on-surface)]">{it.product_name}</p>
                          {(it.item_code || it.part_number) && (
                            <span className="m3-badge bg-[var(--md-surface-container-high)] text-[var(--md-on-surface-variant)] text-[10px] font-mono">
                              #{it.item_code || it.part_number}
                            </span>
                          )}
                          <span className="m3-badge m3-badge-info text-[10px] font-medium flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            الوحدة المباعة: {it.unit}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap text-xs text-[var(--md-on-surface-variant)]">
                          {it.serial_number && (
                            <span className="text-[var(--md-warning)] font-mono">سيريال: {it.serial_number}</span>
                          )}
                          {it.tire_size && (
                            <span className="text-[var(--md-info)] font-mono">
                              مقاس: {it.tire_size} {it.tire_production_dot ? `(${it.tire_production_dot})` : ''}
                            </span>
                          )}
                          <span>
                            الكمية المباعة: <strong className="text-[var(--md-on-surface)] font-mono tabular-nums">{it.max_qty}</strong> {it.unit}
                          </span>
                          <span>
                            السعر: <strong className="text-[var(--md-on-surface)] font-mono tabular-nums" dir="ltr">{formatAmount(it.unit_price, invoice.currency || 'YER')}</strong>
                          </span>
                        </div>

                        {it.warranty_status && (
                          <div className="pt-0.5">
                            {it.warranty_status.isUnderWarranty ? (
                              <span className="m3-badge m3-badge-success inline-flex items-center gap-1 text-[10px] font-bold">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>تحت الضمان - ساري حتى {it.warranty_status.expiresAtStr}</span>
                              </span>
                            ) : (
                              <span className="m3-badge m3-badge-error inline-flex items-center gap-1 text-[10px] font-bold">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>منتهي الضمان (انتهى في {it.warranty_status.expiresAtStr})</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                  {it.selected && (
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-[var(--md-outline-variant)]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-[var(--md-on-surface-variant)]">كمية الإرجاع:</span>
                        <input
                          type="number"
                          step="any"
                          min="0.01"
                          max={it.max_qty}
                          value={it.quantity}
                          onChange={(e) => updateQty(idx, parseFloat(e.target.value) || 0)}
                          className="m3-input w-20 px-2 py-1 text-sm text-center font-mono font-bold tabular-nums"
                        />
                        <span className="text-xs text-[var(--md-on-surface-variant)]">{it.unit}</span>
                      </div>
                      <div className="text-right min-w-[90px]">
                        <span className="text-xs font-bold text-[var(--md-warning)] font-mono tabular-nums" dir="ltr">
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
              <label className="block text-xs font-medium text-[var(--md-on-surface-variant)] mb-1">طريقة التسوية / الاسترجاع</label>
              <select
                value={refundMethod}
                onChange={(e) => setRefundMethod(e.target.value as any)}
                className="m3-select w-full px-3 py-2 text-sm"
              >
                <option value="CREDIT_NOTE">إشعار دائن (تخفيض مديونية العميل)</option>
                <option value="CASH_REFUND">استرجاع نقدي فوري من الخزينة</option>
                <option value="BANK_REFUND">تحويل بنكي مسترجع</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--md-on-surface-variant)] mb-1">تاريخ المرتجع</label>
              <input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="m3-input w-full px-3 py-2 text-sm font-mono tabular-nums"
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-medium text-[var(--md-on-surface-variant)] mb-1">سبب الإرجاع / ملاحظات</label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثال: تلف في المنتج، خطأ في الطلب، رغبة العميل..."
              className="m3-input w-full p-3 text-sm resize-none"
            />
          </div>

          {/* Option to remove/hide invoice from active sales register after return */}
          <label className="flex items-center gap-3 p-3 bg-[var(--md-error-container)]/35 border border-[var(--md-error)]/25 rounded-xl cursor-pointer hover:bg-[var(--md-error-container)]/55 transition-colors">
            <input
              type="checkbox"
              checked={removeInvoiceAfterReturn}
              onChange={(e) => setRemoveInvoiceAfterReturn(e.target.checked)}
              className="w-4 h-4 rounded accent-[var(--md-error)] cursor-pointer"
            />
            <div className="text-xs">
              <span className="font-bold text-[var(--md-on-surface)] block">
                حذف / إخفاء الفاتورة من سجل فواتير المبيعات بعد اعتماد المرتجع
              </span>
              <span className="text-[var(--md-on-surface-variant)]">
                سيتم إعادة البضاعة للمخزن وتسوية حساب العميل وإزالة الفاتورة من قائمة المبيعات النشطة
              </span>
            </div>
          </label>

          {/* Return Total Summary */}
          <div className="p-4 bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] rounded-xl flex items-center justify-between">
            <span className="text-sm font-semibold text-[var(--md-on-surface)]">إجمالي قيمة المرتجع المستحقة:</span>
            <span className="text-xl font-bold text-[var(--md-warning)] font-mono tabular-nums">
              {formatAmount(selectedTotal, invoice.currency || 'YER')}
            </span>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--md-outline-variant)]">
            <button
              type="button"
              onClick={onClose}
              className="m3-btn-outlined px-4 py-2 text-sm font-medium cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading || selectedTotal <= 0}
              className="m3-btn-primary px-5 py-2 disabled:opacity-50 text-sm font-semibold flex items-center gap-2 cursor-pointer"
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
