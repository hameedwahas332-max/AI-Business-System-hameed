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
  ShieldCheck,
  Package,
  Layers,
  ArrowRight,
  FileText,
} from 'lucide-react';
import { api } from '../../../api';
import { getActiveCurrencySymbol, applyStockMovementSync, formatNumber } from '../../../lib/formatters';
import { normalizeScannedBarcode } from '../../../utils/barcodeUtils';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [matchingInvoices, setMatchingInvoices] = useState<any[]>([]);
  const [invoice, setInvoice] = useState<any | null>(null);
  const [directReturnProduct, setDirectReturnProduct] = useState<any | null>(null);
  const [directQty, setDirectQty] = useState<number>(1);
  const [directPrice, setDirectPrice] = useState<number>(0);
  const [returnItems, setReturnItems] = useState<
    Array<{
      productId?: string | null;
      name: string;
      itemCode?: string;
      partNumber?: string;
      serialNumber?: string;
      tireSize?: string;
      tireProductionDot?: string;
      unit: string;
      originalQty: number;
      returnQty: number;
      unitPrice: number;
      tax?: number;
      refundAmount: number;
      warrantyMonths?: number;
      warrantyStatus?: {
        isUnderWarranty: boolean;
        expiresAtStr: string;
      } | null;
    }>
  >([]);
  const [refundMethod, setRefundMethod] = useState<'CASH' | 'BANK' | 'CARD' | 'CUSTOMER_CREDIT'>('CASH');
  const [reason, setReason] = useState('إرجاع صنف / رغبة العميل');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const currSym = getActiveCurrencySymbol(invoice?.currency || currency);

  if (!isOpen) return null;

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

  const selectInvoiceToReturn = (inv: any) => {
    setInvoice(inv);
    setDirectReturnProduct(null);
    setMatchingInvoices([]);
    const rawItems = Array.isArray(inv.items) ? inv.items : [];
    const mapped = rawItems.map((it: any) => {
      const wMonths = Number(it.warranty_months || it.warrantyMonths || 0);
      const wStatus = calculateWarrantyStatus(inv.invoice_date || inv.created_at, wMonths);

      return {
        productId: it.product_id || it.productId || null,
        name: it.item_name || it.product_name || it.name || 'صنف مباشر',
        itemCode: it.item_code || it.code || it.sku || '',
        partNumber: it.part_number || it.partNumber || '',
        serialNumber: it.battery_serial_number || it.serial_number || it.serialNumber || '',
        tireSize: it.tire_size || it.tireSize || '',
        tireProductionDot: it.tire_production_dot || it.tireProductionDot || '',
        unit: it.unit || 'حبة',
        originalQty: Number(it.quantity) || 1,
        returnQty: 0,
        unitPrice: Number(it.unit_price || it.price) || 0,
        tax: Number(it.tax) || 0,
        refundAmount: 0,
        warrantyMonths: wMonths,
        warrantyStatus: wStatus,
      };
    });
    setReturnItems(mapped);
  };

  const handleSearchInvoice = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const rawQuery = searchQuery.trim();
    if (!rawQuery) return;
    const query = normalizeScannedBarcode(rawQuery).toLowerCase();

    try {
      setSearching(true);
      setError(null);
      setSuccess(null);
      setInvoice(null);
      setDirectReturnProduct(null);
      setMatchingInvoices([]);

      // 1. Gather invoices from local storage & API
      let localInvoices: any[] = [];
      try {
        const storedInv = localStorage.getItem('erp_invoices_v1');
        if (storedInv) localInvoices.push(...JSON.parse(storedInv));
      } catch {}
      try {
        const storedPosLog = localStorage.getItem('erp_pos_sales_log_v1');
        if (storedPosLog) localInvoices.push(...JSON.parse(storedPosLog));
      } catch {}

      let apiInvoices: any[] = [];
      try {
        const res = await api.getInvoices({ search: query, limit: 100 });
        apiInvoices = res.data || res.invoices || [];
      } catch {}

      // Deduplicate invoices
      const invoiceMap = new Map<string, any>();
      [...localInvoices, ...apiInvoices].forEach((inv) => {
        const key = String(inv.id || inv.invoice_number || '').trim();
        if (key && !invoiceMap.has(key)) {
          invoiceMap.set(key, inv);
        }
      });
      const allInvoices = Array.from(invoiceMap.values());

      // 2. Gather products catalog for cross-referencing
      let catalogProducts: any[] = [];
      try {
        const storedProds = localStorage.getItem('erp_products_v1');
        if (storedProds) catalogProducts = JSON.parse(storedProds);
      } catch {}
      if (catalogProducts.length === 0) {
        try {
          const pRes = await api.getProducts();
          catalogProducts = pRes.data || [];
        } catch {}
      }

      // Find if query matches a product directly in catalog
      const matchedCatalogProduct = catalogProducts.find((p: any) => {
        const pBarcode = normalizeScannedBarcode(String(p.barcode || '')).toLowerCase();
        const pSku = normalizeScannedBarcode(String(p.sku || '')).toLowerCase();
        const pCode = normalizeScannedBarcode(String(p.code || p.item_code || p.itemCode || '')).toLowerCase();
        const pPart = normalizeScannedBarcode(String(p.partNumber || p.part_number || '')).toLowerCase();
        const pSerial = normalizeScannedBarcode(String(p.serialNumber || p.serial_number || p.battery_serial_number || '')).toLowerCase();
        const pTire = normalizeScannedBarcode(String(p.tireSize || p.tire_size || '')).toLowerCase();
        const pName = String(p.name || '').toLowerCase();
        const pId = String(p.id || '').toLowerCase();

        return (
          pBarcode === query ||
          pSku === query ||
          pCode === query ||
          pPart === query ||
          pSerial === query ||
          pTire === query ||
          pId === query ||
          (query.length >= 3 && pName.includes(query))
        );
      });

      // 3. Match against invoices
      const foundInvoices = allInvoices.filter((inv: any) => {
        const invNum = normalizeScannedBarcode(String(inv.invoice_number || inv.invoiceNumber || '')).toLowerCase();
        const invId = String(inv.id || '').toLowerCase();
        const cust = String(inv.customer_name || inv.customerName || inv.customer || '').toLowerCase();

        if (invNum.includes(query) || invId.includes(query) || cust.includes(query)) {
          return true;
        }

        const items = Array.isArray(inv.items) ? inv.items : [];
        return items.some((it: any) => {
          const itCode = normalizeScannedBarcode(String(it.item_code || it.code || it.itemCode || it.sku || '')).toLowerCase();
          const itBarcode = normalizeScannedBarcode(String(it.barcode || '')).toLowerCase();
          const itPart = normalizeScannedBarcode(String(it.part_number || it.partNumber || '')).toLowerCase();
          const itSerial = normalizeScannedBarcode(String(it.battery_serial_number || it.serial_number || it.serialNumber || '')).toLowerCase();
          const itTire = normalizeScannedBarcode(String(it.tire_size || it.tireSize || it.tire_production_dot || '')).toLowerCase();
          const itName = String(it.item_name || it.product_name || it.name || '').toLowerCase();
          const itProdId = String(it.product_id || it.productId || '').toLowerCase();

          if (
            itCode.includes(query) ||
            itBarcode.includes(query) ||
            itPart.includes(query) ||
            itSerial.includes(query) ||
            itTire.includes(query) ||
            itName.includes(query) ||
            itProdId === query
          ) {
            return true;
          }

          if (matchedCatalogProduct) {
            const mpId = String(matchedCatalogProduct.id || '').toLowerCase();
            const mpBarcode = normalizeScannedBarcode(String(matchedCatalogProduct.barcode || '')).toLowerCase();
            const mpSku = normalizeScannedBarcode(String(matchedCatalogProduct.sku || '')).toLowerCase();

            if (itProdId && itProdId === mpId) return true;
            if (mpBarcode && (itBarcode === mpBarcode || itCode === mpBarcode)) return true;
            if (mpSku && (itCode === mpSku || itBarcode === mpSku)) return true;
          }
          return false;
        });
      });

      // Sort newest to oldest
      foundInvoices.sort((a, b) => {
        const dateA = new Date(a.invoice_date || a.created_at || 0).getTime();
        const dateB = new Date(b.invoice_date || b.created_at || 0).getTime();
        return dateB - dateA;
      });

      if (foundInvoices.length === 1) {
        selectInvoiceToReturn(foundInvoices[0]);
      } else if (foundInvoices.length > 1) {
        setMatchingInvoices(foundInvoices);
      } else if (matchedCatalogProduct) {
        // Fallback: Product identified in catalog but no historical invoice found
        setDirectReturnProduct(matchedCatalogProduct);
        setDirectQty(1);
        setDirectPrice(
          Number(
            matchedCatalogProduct.price ||
            matchedCatalogProduct.retailPrice ||
            matchedCatalogProduct.selling_price ||
            0
          )
        );
      } else {
        setError(
          `لم يتم العثور على فاتورة أو صنف يطابق "${rawQuery}". يرجى التأكد من الرقم أو مسح باركود الصنف مجدداً.`
        );
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
        itemCode: it.itemCode,
        partNumber: it.partNumber,
        serialNumber: it.serialNumber,
        unit: it.unit,
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
        // Sync stock restoration and sales decrement
        try {
          applyStockMovementSync(
            selectedToReturn.map((it) => ({
              productId: it.productId || '',
              quantity: it.quantity,
              unitName: it.unit,
              price: it.unitPrice,
              total: it.refundAmount,
            })),
            {
              type: 'return',
              referenceNumber: `RET-${invoice.invoice_number || invoice.id}`,
              referenceId: invoice.id,
              customerOrSupplierName: invoice.customer_name || 'العميل',
              date: new Date().toISOString().split('T')[0],
              notes: `مرتجع مبيعات نقطة البيع: ${reason}`,
            }
          );
        } catch (stockErr) {
          console.error('Failed to sync stock on return:', stockErr);
        }

        setSuccess('تمت معالجة مرتجع المبيعات وإعادة الأصناف للمخزون بالوحدات المحددة وتسوية القيود بنجاح');
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

  const handleConfirmDirectReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directReturnProduct) return;
    if (directQty <= 0) {
      setError('يرجى إدخال كمية صحيحة للإرجاع المباشر');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const refundTotal = directQty * directPrice;

      const returnRecord = {
        productId: directReturnProduct.id,
        name: directReturnProduct.name,
        itemCode: directReturnProduct.sku || directReturnProduct.barcode || '',
        quantity: directQty,
        unit: directReturnProduct.unit || 'حبة',
        unitPrice: directPrice,
        refundAmount: refundTotal,
      };

      const res = await api.posProcessReturn({
        originalInvoiceId: `DIR-${Date.now()}`,
        items: [returnRecord],
        totalRefund: refundTotal,
        refundMethod,
        reason: `${reason} (مرتجع مباشر للمخزون)`,
        shiftId,
      });

      if (res.success) {
        try {
          applyStockMovementSync(
            [
              {
                productId: directReturnProduct.id || '',
                quantity: directQty,
                unitName: directReturnProduct.unit || 'حبة',
                price: directPrice,
                total: refundTotal,
              },
            ],
            {
              type: 'return',
              referenceNumber: `DIR-RET-${Date.now().toString().slice(-4)}`,
              customerOrSupplierName: 'مرتجع مباشر',
              date: new Date().toISOString().split('T')[0],
              notes: `مرتجع مباشر للمخزون: ${reason}`,
            }
          );
        } catch (stockErr) {
          console.error('Failed to sync direct return stock:', stockErr);
        }

        setSuccess('تم تسجيل المرتجع المباشر وإعادة الكمية للمخزون بنجاح');
        setTimeout(() => {
          onReturnCompleted();
          onClose();
        }, 1200);
      } else {
        setError(res.error?.message || 'فشل إتمام المرتجع المباشر');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تسجيل المرتجع المباشر');
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
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
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

          {/* Step 1: Search Invoice or Barcode */}
          <form onSubmit={handleSearchInvoice} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث برقم الفاتورة، أو باركود الصنف، أو السيريال، أو مقاس الإطار..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pr-10 pl-4 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={searching || !searchQuery.trim()}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer"
            >
              {searching ? 'جاري البحث...' : 'بحث سريع'}
            </button>
          </form>

          {/* Step 1.5: Multiple Matching Invoices List */}
          {matchingInvoices.length > 0 && !invoice && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-amber-400" />
                  عثرنا على ({matchingInvoices.length}) فواتير تطابق بحثك، اختر الفاتورة المطلوبة:
                </span>
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {matchingInvoices.map((inv) => (
                  <div
                    key={inv.id || inv.invoice_number}
                    className="p-3 bg-slate-950/60 border border-slate-800 hover:border-rose-500/50 rounded-xl flex items-center justify-between gap-3 text-xs transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white text-sm">#{inv.invoice_number}</span>
                        <span className="text-slate-400 text-[11px] font-mono">
                          {inv.invoice_date || inv.created_at?.split('T')[0]}
                        </span>
                        <span className="text-emerald-400 font-bold">{inv.customer_name || 'عميل نقدي'}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        الأصناف ({Array.isArray(inv.items) ? inv.items.length : 0}):{' '}
                        {Array.isArray(inv.items)
                          ? inv.items.map((it: any) => it.item_name || it.name).filter(Boolean).slice(0, 3).join('، ')
                          : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-black text-rose-400 text-sm">
                        {formatNumber(Number(inv.total || inv.grandTotal || 0))} {currSym}
                      </span>
                      <button
                        type="button"
                        onClick={() => selectInvoiceToReturn(inv)}
                        className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                      >
                        <span>اختيار</span>
                        <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 1.6: Fallback Direct Return When Product Recognized But No Historical Invoice */}
          {directReturnProduct && !invoice && (
            <form onSubmit={handleConfirmDirectReturn} className="p-4 bg-orange-950/20 border border-orange-500/30 rounded-2xl space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-orange-500/20 text-orange-400 rounded-xl shrink-0">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">مرتجع مباشر للصنف (بدون فاتورة سابقة)</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    تم التعرف على الصنف في الدليل ولكن لا توجد فاتورة سابقة مسجلة له. يمكنك إعادته للمخزن مباشرة وقيد قيمته:
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">{directReturnProduct.name}</span>
                  <span className="font-mono text-cyan-400 text-[11px]">
                    باركود: {directReturnProduct.barcode || directReturnProduct.sku || 'N/A'}
                  </span>
                </div>
                <div className="text-slate-400 text-[11px]">
                  الوحدة: {directReturnProduct.unit || 'حبة'} | المخزون الحالي: {directReturnProduct.stock || directReturnProduct.quantity || 0}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">الكمية المرجعة:</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={directQty}
                    onChange={(e) => setDirectQty(Math.max(1, parseFloat(e.target.value) || 1))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-center font-mono font-bold text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">سعر الاسترداد ({currSym}):</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={directPrice}
                    onChange={(e) => setDirectPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-center font-mono font-bold text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">طريقة الرد:</label>
                  <select
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-1.5 text-white text-xs focus:outline-none"
                  >
                    <option value="CASH">نقداً من الدرج</option>
                    <option value="BANK">تحويل بنكي</option>
                    <option value="CUSTOMER_CREDIT">إشعار دائن للعميل</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <div>
                  <span className="text-[11px] text-slate-400 block">إجمالي المسترد:</span>
                  <span className="font-mono font-black text-orange-400 text-base">
                    {formatNumber(directQty * directPrice)} {currSym}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDirectReturnProduct(null)}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-black shadow-lg shadow-orange-950/40 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>تأكيد الإرجاع المباشر للمخزن</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Step 2: Invoice Details & Items to Return */}
          {invoice && (
            <form onSubmit={handleSubmitReturn} className="space-y-4">
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block">الفاتورة الأصلية:</span>
                  <span className="text-sm font-bold text-white font-mono">#{invoice.invoice_number}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">تاريخ الشراء:</span>
                  <span className="font-medium text-slate-300 font-mono">{invoice.invoice_date || invoice.created_at?.split('T')[0]}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">العميل:</span>
                  <span className="font-bold text-emerald-400">{invoice.customer_name || 'عميل نقدي'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">إجمالي الفاتورة:</span>
                  <span className="font-bold text-white font-mono" dir="ltr">{formatNumber(Number(invoice.total || 0))} {currSym}</span>
                </div>
              </div>

              {/* Items Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  حدد الأصناف والكميات المراد استرجاعها للمخزن:
                </label>
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {returnItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-800/60 border border-slate-800 hover:border-slate-700 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs transition-colors"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white">{item.name}</span>
                          {(item.itemCode || item.partNumber) && (
                            <span className="px-2 py-0.5 bg-slate-700/60 text-slate-300 rounded text-[10px] font-mono">
                              #{item.itemCode || item.partNumber}
                            </span>
                          )}
                          <span className="px-2 py-0.5 bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded text-[10px] font-medium">
                            الوحدة: {item.unit}
                          </span>
                        </div>

                        {/* Specs & Serial / DOT info */}
                        <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-400">
                          {item.serialNumber && (
                            <span className="text-amber-400 font-mono">
                              سيريال: {item.serialNumber}
                            </span>
                          )}
                          {item.tireSize && (
                            <span className="text-cyan-400 font-mono">
                              مقاس: {item.tireSize} {item.tireProductionDot ? `(DOT: ${item.tireProductionDot})` : ''}
                            </span>
                          )}
                          <span>الكمية المشتراة: <strong className="text-white font-mono">{item.originalQty}</strong> {item.unit}</span>
                          <span>السعر: <strong className="text-white font-mono" dir="ltr">{formatNumber(item.unitPrice)}</strong> {currSym}</span>
                        </div>

                        {/* Warranty Badge */}
                        {item.warrantyStatus && (
                          <div className="pt-0.5">
                            {item.warrantyStatus.isUnderWarranty ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md text-[10px] font-bold">
                                <ShieldCheck className="w-3 h-3" />
                                تحت الضمان - ساري حتى {item.warrantyStatus.expiresAtStr}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-md text-[10px] font-bold">
                                <AlertTriangle className="w-3 h-3" />
                                منتهي الضمان (انتهى في {item.warrantyStatus.expiresAtStr})
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-700/60">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 text-[11px]">الكمية المرجعة:</span>
                          <input
                            type="number"
                            min="0"
                            max={item.originalQty}
                            step="any"
                            value={item.returnQty}
                            onChange={(e) => handleQtyChange(idx, parseFloat(e.target.value) || 0)}
                            className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-white focus:outline-none focus:border-rose-500"
                          />
                          <span className="text-slate-400 text-[10px]">{item.unit}</span>
                        </div>

                        <div className="text-left min-w-[90px]">
                          <span className="text-[10px] text-slate-400 block">المبلغ المسترد:</span>
                          <span className="font-bold text-rose-400 font-mono text-xs" dir="ltr">
                            {formatNumber(item.refundAmount)} {currSym}
                          </span>
                        </div>
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
                  <span className="text-2xl font-black text-rose-400 font-mono">
                    {formatNumber(totalRefund)} {currSym}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setInvoice(null);
                      setReturnItems([]);
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    تغيير الفاتورة
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || totalRefund <= 0}
                    className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-950/40 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40"
                  >
                    {submitting ? 'جاري المعالجة...' : 'تأكيد تسجيل المرتجع'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
