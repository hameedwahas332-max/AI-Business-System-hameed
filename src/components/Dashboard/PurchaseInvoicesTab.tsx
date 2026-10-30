import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { formatAmount, formatSupplierAmount, parseEnglishNumber, toEnglishDigits, applyStockMovementSync } from '../../lib/formatters';
import { getAccountingRate } from '../../lib/exchangeRates';
import { ExportActions } from '../Common/ExportActions';
import { TableExportConfig, printInvoiceDocument } from '../../lib/exportUtils';
import { recordAutomaticTreasuryVoucher } from '../../utils/treasuryVoucherHelper';
import { enqueueOutboxTransaction } from '../../services/transactionalOutbox';
import { useAuth } from '../../context/AuthContext';
import {
  ShoppingBag,
  Plus,
  Search,
  Eye,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Trash2,
  Printer,
  Gift,
  Percent,
  Tag,
  Boxes,
} from 'lucide-react';

export const PurchaseInvoicesTab: React.FC = () => {
  const { company } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modals state
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  // Purchase Builder State
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [currency, setCurrency] = useState('YER');
  const [exchangeRate, setExchangeRate] = useState('1.0');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState('PENDING'); // DRAFT, PENDING
  const [notes, setNotes] = useState('');
  const [paidAmount, setPaidAmount] = useState<any>(0);
  const [invoiceDiscountAmount, setInvoiceDiscountAmount] = useState<any>(0);
  const [invoiceDiscountPercent, setInvoiceDiscountPercent] = useState<any>(0);
  const [builderItems, setBuilderItems] = useState<
    Array<{
      product_id: string;
      quantity: any;
      bonusQuantity: any;
      freeQuantity: any;
      costPrice: any;
      unit_cost: any;
      unitFactor: any;
      unitName?: string;
      itemDiscountPercent: any;
      itemDiscountAmount: any;
      discount: any;
      discountType: 'amount' | 'percent';
      tax: any;
    }>
  >([
    {
      product_id: '',
      quantity: 1,
      bonusQuantity: 0,
      freeQuantity: 0,
      costPrice: 0,
      unit_cost: 0,
      unitFactor: 1,
      unitName: 'حبة',
      itemDiscountPercent: 0,
      itemDiscountAmount: 0,
      discount: 0,
      discountType: 'amount',
      tax: 0,
    },
  ]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [invRes, suppRes, prodRes] = await Promise.all([
        api.getPurchaseInvoices({ search: searchQuery, status: statusFilter }),
        api.getSuppliers(),
        api.getProducts(),
      ]);
      setInvoices(invRes?.data || []);
      setSuppliers(suppRes?.data || []);
      setProducts(prodRes?.data || []);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل بيانات المشتريات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const handleWiped = () => {
      setInvoices([]);
      setSuppliers([]);
      setProducts([]);
      fetchData();
    };
    window.addEventListener('erp-demo-data-wiped', handleWiped);
    return () => window.removeEventListener('erp-demo-data-wiped', handleWiped);
  }, [searchQuery, statusFilter]);

  const handleOpenBuilder = () => {
    const defaultSupplier = suppliers[0];
    setSelectedSupplierId(defaultSupplier?.id || '');
    setCurrency(defaultSupplier?.currency || 'YER');
    setExchangeRate('1.0');
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setDueDate('');
    setStatus('PENDING');
    setNotes('');
    setPaidAmount(0);
    setInvoiceDiscountAmount(0);
    setInvoiceDiscountPercent(0);
    const firstProd = products[0];
    const initialCost = Number(firstProd?.costPrice || firstProd?.purchasePrice || firstProd?.cost_price || firstProd?.purchase_price || 0);
    setBuilderItems([
      {
        product_id: firstProd?.id || '',
        quantity: 1,
        bonusQuantity: 0,
        freeQuantity: 0,
        costPrice: initialCost,
        unit_cost: initialCost,
        unitFactor: 1,
        unitName: firstProd?.unit || 'حبة',
        itemDiscountPercent: 0,
        itemDiscountAmount: 0,
        discount: 0,
        discountType: 'amount',
        tax: 0,
      },
    ]);
    setIsBuilderOpen(true);
  };

  const handleProductChange = (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    const prodCost = Number(prod?.costPrice || prod?.purchasePrice || prod?.cost_price || prod?.purchase_price || 0);
    const updated = [...builderItems];
    updated[index] = {
      ...updated[index],
      product_id: productId,
      costPrice: prodCost,
      unit_cost: prodCost,
      unitName: prod?.unit || 'حبة',
      unitFactor: 1,
    };
    setBuilderItems(updated);
  };

  const handleAddItem = () => {
    const firstProd = products[0];
    const prodCost = Number(firstProd?.costPrice || firstProd?.purchasePrice || firstProd?.cost_price || firstProd?.purchase_price || 0);
    setBuilderItems([
      ...builderItems,
      {
        product_id: firstProd?.id || '',
        quantity: 1,
        bonusQuantity: 0,
        freeQuantity: 0,
        costPrice: prodCost,
        unit_cost: prodCost,
        unitFactor: 1,
        unitName: firstProd?.unit || 'حبة',
        itemDiscountPercent: 0,
        itemDiscountAmount: 0,
        discount: 0,
        discountType: 'amount',
        tax: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (builderItems.length === 1) return;
    setBuilderItems(builderItems.filter((_, i) => i !== index));
  };

  // Helper to compute individual line calculations with exact ERP logic
  const getItemCalculations = (item: any) => {
    const qty = Math.max(0, parseFloat(item.quantity) || 0);
    const bonusQuantity = Math.max(0, parseFloat(item.bonusQuantity !== undefined ? item.bonusQuantity : item.freeQuantity) || 0);
    const unitFactor = Math.max(1, parseFloat(item.unitFactor) || 1);
    const totalReceivedBaseUnits = (qty + bonusQuantity) * unitFactor;

    const costPrice = Math.max(0, parseFloat(item.costPrice !== undefined ? item.costPrice : item.unit_cost) || 0);
    const grossRowCost = qty * costPrice;

    const itemDiscountAmount = Math.max(0, parseFloat(item.itemDiscountAmount !== undefined ? item.itemDiscountAmount : item.discount) || 0);
    const itemDiscountPercent = grossRowCost > 0 ? (itemDiscountAmount / grossRowCost) * 100 : (parseFloat(item.itemDiscountPercent) || 0);
    const netRowCost = Math.max(0, grossRowCost - itemDiscountAmount);

    const effectiveUnitCost = totalReceivedBaseUnits > 0 ? (netRowCost / totalReceivedBaseUnits) : costPrice;

    return {
      qty,
      bonusQuantity,
      freeQuantity: bonusQuantity,
      unitFactor,
      totalReceivedBaseUnits,
      costPrice,
      grossRowCost,
      itemDiscountAmount,
      itemDiscountPercent,
      netRowCost,
      effectiveUnitCost,
    };
  };

  // Live Aggregate Calculations
  const calculatedSubtotal = builderItems.reduce(
    (sum, item) => sum + getItemCalculations(item).grossRowCost,
    0
  );
  const calculatedItemsDiscount = builderItems.reduce(
    (sum, item) => sum + getItemCalculations(item).itemDiscountAmount,
    0
  );
  const subtotalAfterItemsDisc = Math.max(0, calculatedSubtotal - calculatedItemsDiscount);
  const numInvoiceDisc = Math.max(0, parseFloat(invoiceDiscountAmount) || 0);
  const calculatedTotalDiscount = calculatedItemsDiscount + numInvoiceDisc;
  const calculatedTax = builderItems.reduce(
    (sum, item) => sum + (parseFloat(item.tax) || 0),
    0
  );
  const calculatedTotal = Math.max(0, calculatedSubtotal - calculatedTotalDiscount + calculatedTax);
  const calculatedTotalReceivedUnits = builderItems.reduce(
    (sum, item) => sum + getItemCalculations(item).totalReceivedBaseUnits,
    0
  );

  const totalPurchaseAmount = invoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);
  const totalPaidToSuppliers = invoices.reduce((sum, inv) => sum + Number(inv.paid_amount || 0), 0);
  const totalRemainingToSuppliers = invoices.reduce((sum, inv) => sum + Number(inv.remaining_amount || 0), 0);

  const getPurchaseExportConfig = (): TableExportConfig => ({
    filename: `purchase_invoices_${new Date().toISOString().split('T')[0]}`,
    title: 'سجل فواتير المشتريات والموردين',
    subtitle: statusFilter ? `حالة الفواتير: ${statusFilter}` : 'كافة فواتير المشتريات',
    filterBadges: [
      ...(searchQuery ? [{ label: 'بحث', value: searchQuery }] : []),
      ...(statusFilter ? [{ label: 'الحالة', value: statusFilter }] : []),
    ],
    summaryCards: [
      { label: 'إجمالي المشتريات', value: `${formatAmount(totalPurchaseAmount)} YER` },
      { label: 'المسدد للموردين', value: `${formatAmount(totalPaidToSuppliers)} YER` },
      { label: 'المتبقي للموردين', value: `${formatAmount(totalRemainingToSuppliers)} YER` },
      { label: 'عدد الفواتير المعروضة', value: invoices.length },
    ],
    headers: ['رقم الفاتورة', 'المورد', 'تاريخ الفاتورة', 'تاريخ الاستحقاق', 'المجموع الفرعي (YER)', 'الخصم (YER)', 'الضريبة (YER)', 'الإجمالي النهائي (YER)', 'المسدد (YER)', 'المتبقي (YER)', 'الحالة'],
    rows: invoices.map((inv) => [
      inv.invoice_number,
      inv.supplier_name || '-',
      inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString('ar-YE') : '-',
      inv.due_date ? new Date(inv.due_date).toLocaleDateString('ar-YE') : '-',
      inv.subtotal || 0,
      inv.discount || 0,
      inv.tax || 0,
      inv.total || 0,
      inv.paid_amount || 0,
      inv.remaining_amount || 0,
      inv.status === 'PAID'
        ? 'مسددة بالكامل'
        : inv.status === 'PARTIALLY_PAID'
        ? 'مسددة جزئياً'
        : inv.status === 'PENDING'
        ? 'مستحقة'
        : inv.status === 'DRAFT'
        ? 'مسودة'
        : inv.status,
    ]),
    alignments: ['center', 'right', 'center', 'center', 'right', 'right', 'right', 'right', 'right', 'right', 'center'],
  });

  const handlePrintSinglePurchase = (inv: any) => {
    printInvoiceDocument({
      companyName: company?.name || 'المؤسسة التجارية',
      companyCode: company?.code || '',
      invoiceType: 'PURCHASE',
      invoiceNumber: inv.invoice_number,
      date: inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString('ar-YE') : new Date().toLocaleDateString('ar-YE'),
      dueDate: inv.due_date ? new Date(inv.due_date).toLocaleDateString('ar-YE') : undefined,
      status: inv.status,
      partyName: inv.supplier_name || 'المورد',
      items: (inv.items || []).map((it: any) => {
        const q = Number(it.quantity || 1);
        const freeQ = Number(it.freeQuantity || it.free_quantity || 0);
        const totalQ = Number(it.totalReceivedQuantity || (q + freeQ));
        const disc = Number(it.discount || 0);
        const cost = Number(it.unit_cost !== undefined ? it.unit_cost : (it.unitPrice || 0));
        const net = Number(it.total !== undefined ? it.total : ((q * cost) - disc));
        const eff = Number(it.effectiveUnitCost || it.effective_unit_cost || (totalQ > 0 ? net / totalQ : cost));
        return {
          name: it.product_name || 'صنف مشتريات',
          quantity: q,
          freeQuantity: freeQ,
          totalReceivedQuantity: totalQ,
          unitPrice: cost,
          discount: disc,
          effectiveUnitCost: eff,
          tax: Number(it.tax || 0),
          total: net,
          itemCode: it.itemCode || it.sku || '',
        };
      }),
      subtotal: Number(inv.subtotal || inv.total || 0),
      itemsDiscount: Number(inv.items_discount || 0),
      invoiceDiscount: Number(inv.invoice_discount || 0),
      discount: Number(inv.discount || 0),
      tax: Number(inv.tax || 0),
      total: Number(inv.total || 0),
      totalReceivedQuantity: Number(inv.total_received_quantity || 0),
      paidAmount: Number(inv.paid_amount || 0),
      remainingAmount: Number(inv.remaining_amount || 0),
      notes: inv.notes,
    });
  };

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      if (!selectedSupplierId) {
        throw new Error('يرجى اختيار المورد');
      }

      const supp = suppliers.find((s) => s.id === selectedSupplierId);
      const remainingToSupplier = Math.max(0, calculatedTotal - Number(paidAmount || 0));

      const processedItems = builderItems.map((item) => {
        const calcs = getItemCalculations(item);
        const prod = products.find((p) => p.id === item.product_id);
        return {
          product_id: item.product_id,
          product_name: prod?.name || 'صنف مشتريات',
          itemCode: prod?.itemCode || prod?.sku || '',
          sku: prod?.sku || '',
          quantity: calcs.qty,
          bonusQuantity: calcs.bonusQuantity,
          freeQuantity: calcs.bonusQuantity,
          unitFactor: calcs.unitFactor,
          totalReceivedBaseUnits: calcs.totalReceivedBaseUnits,
          totalReceivedQuantity: calcs.totalReceivedBaseUnits,
          costPrice: calcs.costPrice,
          unit_cost: calcs.costPrice,
          itemDiscountPercent: calcs.itemDiscountPercent,
          itemDiscountAmount: calcs.itemDiscountAmount,
          discount: calcs.itemDiscountAmount,
          grossTotal: calcs.grossRowCost,
          tax: Number(item.tax || 0),
          netRowCost: calcs.netRowCost,
          total: calcs.netRowCost,
          effectiveUnitCost: calcs.effectiveUnitCost,
          unitName: item.unitName || prod?.unit || 'حبة',
        };
      });

      const res = await api.createPurchaseInvoice({
        supplier_id: selectedSupplierId,
        supplier_name: supp?.name || '',
        currency: currency || 'YER',
        exchange_rate: parseFloat(exchangeRate || '1.0'),
        invoice_date: invoiceDate,
        due_date: dueDate || undefined,
        status: status === 'PENDING' && Number(paidAmount) >= calculatedTotal ? 'PAID' : status === 'PENDING' && Number(paidAmount) > 0 ? 'PARTIALLY_PAID' : status,
        subtotal: calculatedSubtotal,
        items_discount: calculatedItemsDiscount,
        invoice_discount: numInvoiceDisc,
        invoice_discount_amount: numInvoiceDisc,
        discount: calculatedTotalDiscount,
        tax: calculatedTax,
        total: calculatedTotal,
        total_received_quantity: calculatedTotalReceivedUnits,
        total_received_base_units: calculatedTotalReceivedUnits,
        paid_amount: Number(paidAmount || 0),
        remaining_amount: remainingToSupplier,
        notes,
        items: processedItems,
      });

      // 1. Sync inventory stock movement (including bonus quantities)
      try {
        applyStockMovementSync(
          processedItems.map((it) => ({
            productId: it.product_id,
            quantity: it.totalReceivedBaseUnits,
            unitFactor: 1,
            unitName: it.unitName || 'حبة',
            price: it.effectiveUnitCost,
            total: it.netRowCost,
          })),
          {
            type: 'purchase',
            referenceNumber: res.data?.invoice_number || `PUR-${Date.now().toString().slice(-6)}`,
            referenceId: res.data?.id,
            customerOrSupplierName: supp?.name || 'المورد',
            notes: `توريد فاتورة مشتريات وبونص #${res.data?.invoice_number || ''}`,
          }
        );
      } catch (syncErr) {
        console.warn('Failed to sync stock movement for purchase:', syncErr);
      }

      // 2. Update product costPrice with effectiveUnitCost in erp_products_v1
      try {
        const rawProducts = localStorage.getItem('erp_products_v1');
        if (rawProducts) {
          const prods = JSON.parse(rawProducts);
          processedItems.forEach((it) => {
            const pIdx = prods.findIndex((p: any) => p.id === it.product_id);
            if (pIdx !== -1) {
              prods[pIdx].costPrice = it.effectiveUnitCost;
              prods[pIdx].cost_price = it.effectiveUnitCost;
              prods[pIdx].purchasePrice = it.effectiveUnitCost;
              prods[pIdx].purchase_price = it.effectiveUnitCost;
            }
          });
          localStorage.setItem('erp_products_v1', JSON.stringify(prods));
          window.dispatchEvent(new CustomEvent('erp-inventory-updated'));
        }
      } catch (prodErr) {
        console.warn('Failed to update product cost price in storage:', prodErr);
      }

      // 3. Record automatic payment voucher (سند صرف) if paid amount > 0
      if (Number(paidAmount) > 0) {
        try {
          recordAutomaticTreasuryVoucher({
            type: 'SUPPLIER_PAYMENT',
            amount: Number(paidAmount),
            currency: currency || 'YER',
            paymentMethod: 'CASH',
            paymentDate: invoiceDate,
            partyId: selectedSupplierId,
            partyName: supp?.name || 'مورد تجاري',
            partyPhone: supp?.phone,
            referenceId: res.data?.id,
            referenceNo: res.data?.invoice_number || `PUR-${Date.now().toString().slice(-6)}`,
            referenceType: 'PURCHASE_INVOICE',
            notes: `سند صرف آلي عن فاتورة مشتريات وتوريد رقم #${res.data?.invoice_number || ''} (المورد: ${supp?.name || 'مورد تجاري'})`,
          });
        } catch (pmtErr) {
          console.warn('Voucher sync warn for purchase:', pmtErr);
        }
      }

      // 4. If credit remaining, update supplier payable balance in erp_suppliers_v1
      if (remainingToSupplier > 0 && (selectedSupplierId || supp?.name)) {
        try {
          const rawSuppliers = localStorage.getItem('erp_suppliers_v1');
          if (rawSuppliers) {
            const suppList: any[] = JSON.parse(rawSuppliers);
            const updatedSuppList = suppList.map((s) => {
              if (s.id === selectedSupplierId || (supp?.name && s.name?.trim() === supp.name.trim())) {
                return {
                  ...s,
                  current_balance: Number(s.current_balance || 0) + Number(remainingToSupplier),
                  total_purchases: Number(s.total_purchases || 0) + calculatedTotal,
                };
              }
              return s;
            });
            localStorage.setItem('erp_suppliers_v1', JSON.stringify(updatedSuppList));
            window.dispatchEvent(new CustomEvent('erp-suppliers-updated'));
          }
        } catch (suppErr) {
          console.warn('Failed to update supplier balance:', suppErr);
        }
      }

      // 5. Sync to erp_purchase_invoices_v1 in localStorage
      try {
        const purStored = localStorage.getItem('erp_purchase_invoices_v1');
        const existingPur: any[] = purStored ? JSON.parse(purStored) : [];
        const purInvoiceObj = res.data || {
          id: `pur-${Date.now()}`,
          invoice_number: `PUR-${Date.now().toString().slice(-6)}`,
          supplier_id: selectedSupplierId,
          supplier_name: supp?.name || 'مورد تجاري',
          total: calculatedTotal,
          paid_amount: Number(paidAmount || 0),
          remaining_amount: remainingToSupplier,
          status: remainingToSupplier <= 0.01 ? 'PAID' : Number(paidAmount) > 0 ? 'PARTIALLY_PAID' : 'PENDING',
          created_at: new Date().toISOString(),
          invoice_date: invoiceDate,
          items: processedItems,
        };
        localStorage.setItem(
          'erp_purchase_invoices_v1',
          JSON.stringify([purInvoiceObj, ...existingPur.filter((p) => p.id !== purInvoiceObj.id)])
        );
        window.dispatchEvent(new CustomEvent('erp-purchase-invoices-updated'));

        // Enqueue into persistent Transactional Outbox (CR-2026-TAURI-OFFLINE-SYNC-001)
        enqueueOutboxTransaction('PURCHASE_INVOICE_CREATE', purInvoiceObj, {
          dependencyOrder: 20,
          idempotencyKey: `pur_${purInvoiceObj.id}`,
        }).catch((e) => console.warn('[OUTBOX_PURCHASE_WARN]', e));
      } catch (e) {}

      setSuccess('تم تسجيل فاتورة المشتريات وتوريد الكميات الفعلية شاملة البونص وتحديث تكلفة الصنف بنجاح');
      setIsBuilderOpen(false);
      fetchData();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || 'فشل حفظ فاتورة المشتريات');
    }
  };

  const handleViewInvoiceDetails = async (invId: string) => {
    try {
      setError(null);
      const res = await api.getPurchaseInvoiceById(invId);
      setSelectedInvoice(res.data);
    } catch (err: any) {
      setError(err.message || 'فشل عرض تفاصيل فاتورة المشتريات');
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'PAID':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/60">مسددة للمورد</span>;
      case 'PARTIALLY_PAID':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-950 text-teal-300 border border-teal-800/60">مسددة جزئياً</span>;
      case 'PENDING':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800/60">مستحقة للمورد</span>;
      case 'DRAFT':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700/60">مسودة</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400">{st}</span>;
    }
  };

  return (
    <div className="space-y-6 text-right text-slate-100 font-sans" dir="rtl">
      {/* Header */}
      <div className="bg-slate-900 border border-emerald-900/40 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-lg shadow-emerald-950/50 shrink-0">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>إدارة فواتير المشتريات</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                    Purchase Invoices
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 font-medium">
                  تسجيل فواتير المشتريات من الموردين، زيادة المخزون تلقائياً، وإضافة الالتزامات المالية في الشجرة المحاسبية
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleOpenBuilder}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold text-xs sm:text-sm shadow-lg shadow-emerald-950/60 border border-emerald-500/40 flex items-center gap-2 transition-all active:scale-95 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل فاتورة مشتريات جديدة</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-xs sm:text-sm flex items-center gap-2.5 shadow-lg">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs sm:text-sm flex items-center gap-2.5 shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Invoices List */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="البحث برقم المشتريات، اسم المورد..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-9 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-2 px-3 text-xs bg-slate-950 border border-slate-700/80 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="">جميع الحالات</option>
              <option value="PENDING">مستحقة (PENDING)</option>
              <option value="PARTIALLY_PAID">مسددة جزئياً (PARTIALLY_PAID)</option>
              <option value="PAID">مسددة بالكامل (PAID)</option>
              <option value="DRAFT">مسودة (DRAFT)</option>
            </select>
            <ExportActions getConfig={getPurchaseExportConfig} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="p-3.5">رقم الفاتورة</th>
                <th className="p-3.5">المورد</th>
                <th className="p-3.5">التاريخ</th>
                <th className="p-3.5">الإجمالي</th>
                <th className="p-3.5">المسدد للمورد</th>
                <th className="p-3.5">المتبقي للمورد</th>
                <th className="p-3.5">الحالة</th>
                <th className="p-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                      <span>جاري تحميل فواتير المشتريات...</span>
                    </div>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    لا توجد فواتير مشتريات مسجلة.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-bold font-mono text-emerald-400 dir-ltr text-right">
                      {inv.invoice_number}
                    </td>
                    <td className="p-3.5 font-bold text-white">{inv.supplier_name || '-'}</td>
                    <td className="p-3.5 text-slate-400 font-mono text-[11px]">
                      {inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString('ar-YE') : '-'}
                    </td>
                    <td className="p-3.5 font-mono font-bold text-white">
                      <div className="flex items-center gap-1">
                        <span>{formatAmount(inv.total)}</span>
                        <span className="text-xs font-semibold text-slate-400">{inv.currency || 'YER'}</span>
                      </div>
                      {Number(inv.discount) > 0 && (
                        <div className="text-[10px] text-amber-400 font-normal">
                          خصم: -{formatAmount(inv.discount)} {inv.currency || 'YER'}
                        </div>
                      )}
                      {Number(inv.total_received_quantity) > 0 && (
                        <div className="text-[10px] text-emerald-400 font-normal flex items-center gap-1">
                          <Gift className="w-2.5 h-2.5" />
                          <span>المخزن: {inv.total_received_quantity} قطعة</span>
                        </div>
                      )}
                      {inv.currency && inv.currency !== 'YER' && inv.exchange_rate && inv.exchange_rate !== 1 && (
                        <div className="text-[10px] text-teal-400 font-normal">
                          ≈ {formatAmount(Number(inv.total) * Number(inv.exchange_rate))} YER
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 font-mono text-emerald-400 font-bold">
                      {formatAmount(inv.paid_amount)} {inv.currency || 'YER'}
                    </td>
                    <td className="p-3.5 font-mono text-amber-400 font-bold">
                      {formatAmount(inv.remaining_amount)} {inv.currency || 'YER'}
                    </td>
                    <td className="p-3.5">{getStatusBadge(inv.status)}</td>
                    <td className="p-3.5 text-center flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleViewInvoiceDetails(inv.id)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="عرض تفاصيل الفاتورة"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handlePrintSinglePurchase(inv)}
                        className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/60 rounded-lg transition-colors cursor-pointer"
                        title="طباعة الفاتورة / PDF"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE PURCHASE INVOICE MODAL */}
      {isBuilderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150" dir="rtl">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden text-right text-slate-100">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-emerald-400" />
                <span>تسجيل فاتورة مشتريات وتوريد للمخزن</span>
              </h3>
              <button
                onClick={() => setIsBuilderOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInvoice} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">المورد <span className="text-red-400">*</span></label>
                  <select
                    required
                    value={selectedSupplierId}
                    onChange={(e) => {
                      const suppId = e.target.value;
                      setSelectedSupplierId(suppId);
                      const supp = suppliers.find((s) => s.id === suppId);
                      if (supp && supp.currency) {
                        setCurrency(supp.currency);
                        if (supp.currency === 'YER') setExchangeRate('1.0');
                      }
                    }}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- اختر المورد --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.currency || 'YER'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">العملة</label>
                  <select
                    value={currency}
                    onChange={(e) => {
                      const cur = e.target.value;
                      setCurrency(cur);
                      setExchangeRate(String(getAccountingRate(cur)));
                    }}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="YER">YER (ريال يمني)</option>
                    <option value="SAR">SAR (ريال سعودي)</option>
                    <option value="USD">USD (دولار أمريكي)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1 flex items-center justify-between">
                    <span>
                      سعر الصرف {currency !== 'YER' && <span className="text-[10px] text-amber-400 font-normal">(مقابل YER)</span>}
                    </span>
                    <span className="text-[10px] text-amber-400 font-mono">0-9 EN</span>
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    dir="ltr"
                    lang="en"
                    disabled={currency === 'YER'}
                    value={currency === 'YER' ? '1.0' : exchangeRate}
                    onChange={(e) => setExchangeRate(toEnglishDigits(e.target.value).replace(/[^0-9.]/g, ''))}
                    className={`w-full p-2 border rounded-xl font-mono text-left ${
                      currency === 'YER' ? 'bg-slate-800 text-slate-500 border-slate-700' : 'bg-slate-900 border-slate-700 text-slate-100 focus:border-emerald-500'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">تاريخ الفاتورة</label>
                  <input
                    type="date"
                    required
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              {calculatedTotal > 0 && currency !== 'YER' && (
                <div className="bg-slate-950 border border-emerald-900/60 rounded-xl p-2.5 text-xs text-emerald-300 flex items-center justify-between">
                  <span className="font-semibold text-[11px]">المعادل بالعملة الأساسية (YER):</span>
                  <span className="font-mono font-bold text-sm">
                    {formatAmount(calculatedTotal * (parseFloat(exchangeRate) || 1))} YER
                  </span>
                </div>
              )}

              {/* Items Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-emerald-400" />
                    <span>أصناف المشتريات الموردة للمستودع</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-3 py-1.5 bg-emerald-950 text-emerald-300 border border-emerald-800/60 hover:bg-emerald-900/60 rounded-xl font-semibold flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة صنف</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {builderItems.map((item, index) => {
                    const calcs = getItemCalculations(item);
                    return (
                      <div
                        key={index}
                        className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2 hover:border-slate-700/80 transition-colors"
                      >
                        <div className="grid grid-cols-12 gap-2 items-center">
                          {/* Product Selection */}
                          <div className="col-span-12 sm:col-span-3">
                            <label className="block text-[10px] text-slate-400 mb-0.5">الصنف / رقم القطعة</label>
                            <select
                              value={item.product_id}
                              onChange={(e) => handleProductChange(index, e.target.value)}
                              className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:border-emerald-500 text-xs"
                            >
                              <option value="">-- اختر صنف --</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} {p.itemCode ? `[${p.itemCode}]` : p.partNumber ? `[${p.partNumber}]` : p.sku ? `[${p.sku}]` : ''} (المخزون: {p.current_stock})
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Paid Quantity */}
                          <div className="col-span-6 sm:col-span-2">
                            <label className="block text-[10px] text-slate-400 mb-0.5 flex items-center justify-between">
                              <span>الكمية المشتراة</span>
                              <span className="text-[9px] text-amber-400 font-mono">0-9 EN</span>
                            </label>
                            <input
                              type="text"
                              inputMode="decimal"
                              dir="ltr"
                              lang="en"
                              value={item.quantity}
                              onChange={(e) => {
                                const updated = [...builderItems];
                                updated[index].quantity = toEnglishDigits(e.target.value).replace(/[^0-9.]/g, '');
                                setBuilderItems(updated);
                              }}
                              placeholder="1"
                              className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg font-mono text-xs text-slate-100 focus:border-emerald-500 text-center font-bold"
                            />
                          </div>

                          {/* Free / Bonus Quantity */}
                          <div className="col-span-6 sm:col-span-2">
                            <label className="block text-[10px] text-emerald-400 font-semibold mb-0.5 flex items-center justify-between">
                              <span className="flex items-center gap-1">
                                <Gift className="w-3 h-3 text-emerald-400" />
                                <span>بونص مجاني 🎁</span>
                              </span>
                              <span className="text-[9px] text-emerald-400 font-mono">0-9 EN</span>
                            </label>
                            <input
                              type="text"
                              inputMode="decimal"
                              dir="ltr"
                              lang="en"
                              value={item.bonusQuantity !== undefined ? item.bonusQuantity : item.freeQuantity}
                              onChange={(e) => {
                                const updated = [...builderItems];
                                const val = toEnglishDigits(e.target.value).replace(/[^0-9.]/g, '');
                                updated[index].bonusQuantity = val;
                                updated[index].freeQuantity = val;
                                setBuilderItems(updated);
                              }}
                              placeholder="0"
                              className="w-full p-2 bg-emerald-950/40 border border-emerald-800/60 rounded-lg font-mono text-xs text-emerald-300 focus:border-emerald-500 text-center font-bold"
                            />
                          </div>

                          {/* Unit Cost */}
                          <div className="col-span-6 sm:col-span-2">
                            <label className="block text-[10px] text-slate-400 mb-0.5 flex items-center justify-between">
                              <span>سعر الوحدة ({currency})</span>
                              <span className="text-[9px] text-amber-400 font-mono">0-9 EN</span>
                            </label>
                            <input
                              type="text"
                              inputMode="decimal"
                              dir="ltr"
                              lang="en"
                              value={item.costPrice !== undefined ? item.costPrice : item.unit_cost}
                              onChange={(e) => {
                                const updated = [...builderItems];
                                const val = toEnglishDigits(e.target.value).replace(/[^0-9.]/g, '');
                                updated[index].costPrice = val;
                                updated[index].unit_cost = val;
                                setBuilderItems(updated);
                              }}
                              placeholder="0"
                              className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg font-mono text-xs text-slate-100 focus:border-emerald-500 text-center font-bold"
                            />
                          </div>

                          {/* Item Discount Percent & Amount */}
                          <div className="col-span-6 sm:col-span-3">
                            <label className="block text-[10px] text-slate-400 mb-0.5 flex items-center justify-between">
                              <span>خصم الصنف (% ومبلغ)</span>
                              <span className="text-[9px] text-amber-400 font-mono">0-9 EN</span>
                            </label>
                            <div className="grid grid-cols-2 gap-1">
                              <div className="relative">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  dir="ltr"
                                  lang="en"
                                  value={item.itemDiscountPercent || ''}
                                  onChange={(e) => {
                                    const updated = [...builderItems];
                                    const pct = parseEnglishNumber(e.target.value, 0);
                                    const q = parseFloat(item.quantity) || 0;
                                    const c = parseFloat(item.costPrice || item.unit_cost) || 0;
                                    const amt = Math.round(((q * c * pct) / 100) * 100) / 100;
                                    updated[index].itemDiscountPercent = e.target.value;
                                    updated[index].itemDiscountAmount = amt;
                                    updated[index].discount = amt;
                                    setBuilderItems(updated);
                                  }}
                                  placeholder="0%"
                                  className="w-full p-1.5 bg-slate-900 border border-slate-700 rounded-lg font-mono text-xs text-amber-300 focus:border-amber-500 text-center"
                                />
                                <span className="absolute left-1.5 top-1.5 text-[9px] text-slate-500">%</span>
                              </div>

                              <div className="relative">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  dir="ltr"
                                  lang="en"
                                  value={item.itemDiscountAmount !== undefined ? item.itemDiscountAmount : item.discount}
                                  onChange={(e) => {
                                    const updated = [...builderItems];
                                    const amt = parseEnglishNumber(e.target.value, 0);
                                    const q = parseFloat(item.quantity) || 0;
                                    const c = parseFloat(item.costPrice || item.unit_cost) || 0;
                                    const pct = q * c > 0 ? Math.round(((amt / (q * c)) * 100) * 10) / 10 : 0;
                                    updated[index].itemDiscountAmount = e.target.value;
                                    updated[index].discount = e.target.value;
                                    updated[index].itemDiscountPercent = pct;
                                    setBuilderItems(updated);
                                  }}
                                  placeholder="0 مبلغ"
                                  className="w-full p-1.5 bg-slate-900 border border-slate-700 rounded-lg font-mono text-xs text-amber-300 focus:border-amber-500 text-center font-bold"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Row Calculations Bar */}
                        <div className="flex flex-wrap items-center justify-between pt-1.5 border-t border-slate-800/80 text-[11px] gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            {(calcs.bonusQuantity > 0 || calcs.itemDiscountAmount > 0) ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 font-medium">
                                <Gift className="w-3.5 h-3.5 text-emerald-400" />
                                <span>إجمالي الداخل للمخزن: <strong className="font-mono font-bold text-white">{calcs.totalReceivedBaseUnits}</strong></span>
                                <span className="text-emerald-600">|</span>
                                <span>التكلفة الفعلية للوحدة: <strong className="font-mono font-bold text-emerald-200">{Math.round(calcs.effectiveUnitCost * 100) / 100}</strong> {currency}</span>
                              </span>
                            ) : (
                              <span className="text-slate-400">
                                الكمية الداخلة للمستودع: <strong className="font-mono text-slate-200">{calcs.totalReceivedBaseUnits}</strong>
                              </span>
                            )}

                            {calcs.itemDiscountAmount > 0 && (
                              <span className="text-amber-400 font-mono text-[10px]">
                                (وفر الخصم: -{formatAmount(calcs.itemDiscountAmount)} {currency})
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-left font-mono">
                              <span className="text-[10px] text-slate-400 ml-1">صافي الصنف:</span>
                              <strong className="text-sm font-bold text-emerald-400">{formatAmount(calcs.netRowCost)} {currency}</strong>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              disabled={builderItems.length === 1}
                              className={`p-1.5 rounded-lg transition-colors ${
                                builderItems.length === 1 ? 'text-slate-600 cursor-not-allowed' : 'text-red-400 hover:bg-red-950/60 cursor-pointer'
                              }`}
                              title="حذف الصنف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Invoice-Level Supplier Discount Card */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-amber-950/50 border border-amber-800/40 rounded-xl text-amber-400">
                      <Tag className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs">خصم الفاتورة الإجمالي (Invoice Discount)</div>
                      <div className="text-[10px] text-slate-400">خصم تجاري خاص يمنحه المورد على إجمالي الفاتورة</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-400">مبلغ الخصم:</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        dir="ltr"
                        lang="en"
                        value={invoiceDiscountAmount}
                        onChange={(e) => {
                          const val = toEnglishDigits(e.target.value).replace(/[^0-9.]/g, '');
                          setInvoiceDiscountAmount(val);
                          const amt = parseFloat(val) || 0;
                          if (subtotalAfterItemsDisc > 0) {
                            setInvoiceDiscountPercent(Math.round(((amt / subtotalAfterItemsDisc) * 100) * 10) / 10);
                          }
                        }}
                        placeholder="0"
                        className="w-28 p-2 bg-slate-900 border border-slate-700 rounded-lg font-mono text-xs text-amber-300 font-bold focus:border-amber-500 text-center"
                      />
                      <span className="text-xs text-slate-400">{currency}</span>
                    </div>

                    {numInvoiceDisc > 0 && (
                      <span className="text-xs font-mono font-bold text-amber-400 whitespace-nowrap bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                        -{formatAmount(numInvoiceDisc)} {currency} ({invoiceDiscountPercent}%)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment to Supplier & Balances */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 text-xs flex items-center justify-between">
                    <span>المبلغ المسدد للمورد فوراً ({currency})</span>
                    <span className="text-[10px] text-amber-400 font-mono">0-9 EN</span>
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    dir="ltr"
                    lang="en"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(toEnglishDigits(e.target.value).replace(/[^0-9.]/g, ''))}
                    placeholder="0.00"
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-xl text-emerald-400 font-bold font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 text-xs">
                    المتبقي للمورد (دين آجل على المنشأة)
                  </label>
                  <div className="w-full p-2 bg-slate-900 border border-slate-700 rounded-xl font-bold font-mono text-amber-400 text-sm">
                    {formatAmount(Math.max(0, calculatedTotal - (parseFloat(paidAmount) || 0)))} {currency}
                  </div>
                </div>
              </div>

              {/* Live Totals & Summary Metrics */}
              <div className="p-4 bg-slate-950 border border-slate-800 text-white rounded-xl space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">المجموع قبل الخصم</span>
                    <span className="font-mono font-bold text-sm text-slate-200">
                      {formatAmount(calculatedSubtotal)} {currency}
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800">
                    <span className="text-amber-400/90 block text-[10px]">إجمالي الخصم التجاري</span>
                    <span className="font-mono font-bold text-sm text-amber-300">
                      -{formatAmount(calculatedTotalDiscount)} {currency}
                    </span>
                  </div>

                  <div className="p-2.5 bg-emerald-950/40 rounded-lg border border-emerald-900/60">
                    <span className="text-emerald-400 block text-[10px] flex items-center gap-1">
                      <Gift className="w-3 h-3 text-emerald-400" />
                      <span>إجمالي القطع للمخزن</span>
                    </span>
                    <span className="font-mono font-bold text-sm text-emerald-300">
                      {calculatedTotalReceivedUnits} قطعة
                    </span>
                  </div>

                  <div className="p-2.5 bg-emerald-950/60 rounded-lg border border-emerald-700/60">
                    <span className="text-emerald-300 block text-[10px] font-bold">الصافي المستحق للمورد</span>
                    <span className="font-mono font-extrabold text-base text-emerald-400">
                      {formatAmount(calculatedTotal)} {currency}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
                  <div className="w-full sm:w-auto flex items-center gap-2">
                    <span className="text-slate-400 text-xs">حالة الفاتورة:</span>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="p-1.5 bg-slate-900 border border-slate-700 text-white rounded-lg text-xs focus:border-emerald-500"
                    >
                      <option value="PENDING">اعتماد ورفع للرصيد والمخزن (تأكيد الشراء)</option>
                      <option value="DRAFT">حفظ كمسودة مشتريات</option>
                    </select>
                  </div>

                  {calculatedTotal > 0 && currency !== 'YER' && (
                    <div className="text-xs text-emerald-300 font-mono">
                      المعادل بالعملة الأساسية (YER): <strong className="font-bold">{formatAmount(calculatedTotal * (parseFloat(exchangeRate) || 1))} YER</strong>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">ملاحظات الفاتورة</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ملاحظات العقد أو الفاتورة الأصلية للمورد..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBuilderOpen(false)}
                  className="px-4 py-2 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-800 font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-950/60 border border-emerald-500/40 transition-all active:scale-95"
                >
                  حفظ وتأكيد المشتريات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150" dir="rtl">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden text-right text-slate-100">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60">
              <span className="font-bold text-white text-sm flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-emerald-400" />
                <span>تفاصيل فاتورة مشتريات #{selectedInvoice.invoice_number}</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintSinglePurchase(selectedInvoice)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60 rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
                  title="طباعة الفاتورة أو حفظها PDF"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-400" />
                  <span>طباعة / PDF</span>
                </button>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-950 p-3.5 rounded-xl border border-slate-800 gap-2">
                <div>
                  <div className="text-slate-400 font-semibold text-[11px]">المورد التجاري</div>
                  <div className="font-bold text-white text-sm">{selectedInvoice.supplier_name}</div>
                </div>
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-slate-400 font-semibold text-[11px]">التاريخ</div>
                    <div className="font-mono font-bold text-slate-200">
                      {new Date(selectedInvoice.invoice_date).toLocaleDateString('ar-YE')}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 font-semibold text-[11px]">الحالة</div>
                    <div>{getStatusBadge(selectedInvoice.status)}</div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950 font-bold text-slate-400 border-b border-slate-800 text-[11px]">
                    <tr>
                      <th className="p-2.5">الصنف</th>
                      <th className="p-2.5 text-center">الكمية المشترات</th>
                      <th className="p-2.5 text-center text-emerald-400">بونص مجاني 🎁</th>
                      <th className="p-2.5 text-center">إجمالي المخزن</th>
                      <th className="p-2.5 text-left">سعر الوحدة</th>
                      <th className="p-2.5 text-left text-amber-400">خصم الصنف</th>
                      <th className="p-2.5 text-left text-teal-400">التكلفة الفعلية</th>
                      <th className="p-2.5 text-left">الصافي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {selectedInvoice.items?.map((it: any, i: number) => {
                      const q = Number(it.quantity || 1);
                      const freeQ = Number(it.freeQuantity || it.free_quantity || 0);
                      const totalQ = Number(it.totalReceivedQuantity || (q + freeQ));
                      const cost = Number(it.unit_cost !== undefined ? it.unit_cost : (it.unitPrice || 0));
                      const disc = Number(it.discount || 0);
                      const net = Number(it.total !== undefined ? it.total : ((q * cost) - disc));
                      const eff = Number(it.effectiveUnitCost || it.effective_unit_cost || (totalQ > 0 ? net / totalQ : cost));

                      return (
                        <tr key={it.id || i} className="hover:bg-slate-800/30">
                          <td className="p-2.5 font-semibold text-white">
                            <div>{it.product_name}</div>
                            {(it.itemCode || it.sku) && (
                              <div className="text-[10px] text-slate-500 font-mono">[{it.itemCode || it.sku}]</div>
                            )}
                          </td>
                          <td className="p-2.5 font-mono text-center font-bold text-slate-200">{q}</td>
                          <td className="p-2.5 font-mono text-center font-bold text-emerald-400">
                            {freeQ > 0 ? `+${freeQ}` : '-'}
                          </td>
                          <td className="p-2.5 font-mono text-center font-bold text-teal-300 bg-teal-950/20">{totalQ}</td>
                          <td className="p-2.5 font-mono text-left">{formatAmount(cost)} {selectedInvoice.currency || 'YER'}</td>
                          <td className="p-2.5 font-mono text-left text-amber-300">
                            {disc > 0 ? `-${formatAmount(disc)}` : '-'}
                          </td>
                          <td className="p-2.5 font-mono text-left font-bold text-teal-400">
                            {Math.round(eff * 100) / 100} {selectedInvoice.currency || 'YER'}
                          </td>
                          <td className="p-2.5 font-mono font-bold text-emerald-400 text-left">
                            {formatAmount(net)} {selectedInvoice.currency || 'YER'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Financial Breakdown */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2.5 text-slate-300">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">المجموع الفرعي (قبل الخصم):</span>
                  <span className="font-mono font-bold text-slate-200">
                    {formatAmount(selectedInvoice.subtotal || selectedInvoice.total)} {selectedInvoice.currency || 'YER'}
                  </span>
                </div>

                {Number(selectedInvoice.items_discount) > 0 && (
                  <div className="flex justify-between text-xs text-amber-400">
                    <span>خصومات الأصناف:</span>
                    <span className="font-mono font-bold">
                      -{formatAmount(selectedInvoice.items_discount)} {selectedInvoice.currency || 'YER'}
                    </span>
                  </div>
                )}

                {Number(selectedInvoice.invoice_discount) > 0 && (
                  <div className="flex justify-between text-xs text-amber-400">
                    <span>خصم الفاتورة الإضافي:</span>
                    <span className="font-mono font-bold">
                      -{formatAmount(selectedInvoice.invoice_discount)} {selectedInvoice.currency || 'YER'}
                    </span>
                  </div>
                )}

                {Number(selectedInvoice.discount) > 0 && !(Number(selectedInvoice.items_discount) > 0 && Number(selectedInvoice.invoice_discount) > 0) && (
                  <div className="flex justify-between text-xs text-amber-400">
                    <span>إجمالي الخصم التجاري:</span>
                    <span className="font-mono font-bold">
                      -{formatAmount(selectedInvoice.discount)} {selectedInvoice.currency || 'YER'}
                    </span>
                  </div>
                )}

                {Number(selectedInvoice.total_received_quantity) > 0 && (
                  <div className="flex justify-between text-xs text-emerald-400 font-bold border-t border-slate-800/80 pt-2">
                    <span className="flex items-center gap-1">
                      <Gift className="w-3.5 h-3.5" />
                      <span>إجمالي الكميات الداخلة للمستودع:</span>
                    </span>
                    <span className="font-mono">{selectedInvoice.total_received_quantity} قطعة</span>
                  </div>
                )}

                <div className="flex justify-between font-bold border-t border-slate-800/80 pt-2">
                  <span className="text-white text-sm">الصافي النهائي المستحق للمورد:</span>
                  <span className="font-mono text-emerald-400 text-base">{formatAmount(selectedInvoice.total)} {selectedInvoice.currency || 'YER'}</span>
                </div>

                {selectedInvoice.currency && selectedInvoice.currency !== 'YER' && selectedInvoice.exchange_rate && (
                  <div className="flex justify-between text-slate-400 font-semibold text-[11px]">
                    <span>المعادل بالعملة الأساسية (YER):</span>
                    <span className="font-mono">{formatAmount(Number(selectedInvoice.total) * Number(selectedInvoice.exchange_rate))} YER (سعر الصرف: {selectedInvoice.exchange_rate})</span>
                  </div>
                )}

                <div className="flex justify-between text-emerald-400 text-xs font-semibold">
                  <span>المبلغ المسدد للمورد:</span>
                  <span className="font-mono font-bold">{formatAmount(selectedInvoice.paid_amount || 0)} {selectedInvoice.currency || 'YER'}</span>
                </div>

                <div className="flex justify-between text-amber-400 font-bold text-xs border-t border-slate-800/80 pt-2">
                  <span>المبلغ المتبقي دين على المنشأة:</span>
                  <span className="font-mono text-sm">{formatAmount(selectedInvoice.remaining_amount)} {selectedInvoice.currency || 'YER'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
