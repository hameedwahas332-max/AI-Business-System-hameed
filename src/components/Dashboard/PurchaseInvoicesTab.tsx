import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { formatAmount, formatSupplierAmount, parseEnglishNumber, toEnglishDigits, applyStockMovementSync } from '../../lib/formatters';
import { getAccountingRate } from '../../lib/exchangeRates';
import { ExportActions } from '../Common/ExportActions';
import { TableExportConfig, printInvoiceDocument } from '../../lib/exportUtils';
import { recordAutomaticTreasuryVoucher } from '../../utils/treasuryVoucherHelper';
import { normalizeScannedBarcode, playBarcodeBeep, findProductByBarcode, attachGlobalBarcodeScannerListener, shouldProcessBarcodeScan } from '../../utils/barcodeUtils';
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
  Barcode,
  Wallet,
  Landmark,
  Banknote,
  Clock,
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
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK' | 'WALLET' | 'CREDIT'>('CASH');
  const [paymentChannelName, setPaymentChannelName] = useState(''); // اسم البنك أو المحفظة (مثل: جوالي، ون كاش، الكريمي...)
  const [paymentReferenceNo, setPaymentReferenceNo] = useState(''); // رقم الحوالة أو الإشعار
  const [hasManualPaidEdit, setHasManualPaidEdit] = useState(false);
  const [paidAmount, setPaidAmount] = useState<any>(0);
  const [invoiceDiscountAmount, setInvoiceDiscountAmount] = useState<any>(0);
  const [invoiceDiscountPercent, setInvoiceDiscountPercent] = useState<any>(0);
  const [scannerQuery, setScannerQuery] = useState('');
  const [scannerNotice, setScannerNotice] = useState<string | null>(null);
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
      const invs = Array.isArray(invRes) ? invRes : (invRes?.data || invRes?.items || []);
      const supps = Array.isArray(suppRes) ? suppRes : (suppRes?.data || suppRes?.items || []);
      const prods = Array.isArray(prodRes) ? prodRes : (prodRes?.data || prodRes?.items || []);
      setInvoices(invs);
      setSuppliers(supps);
      setProducts(prods);
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
    const handleUpdated = () => {
      fetchData();
    };
    window.addEventListener('erp-demo-data-wiped', handleWiped);
    window.addEventListener('erp-purchases-updated', handleUpdated);
    window.addEventListener('erp-data-updated', handleUpdated);
    window.addEventListener('storage', handleUpdated);
    return () => {
      window.removeEventListener('erp-demo-data-wiped', handleWiped);
      window.removeEventListener('erp-purchases-updated', handleUpdated);
      window.removeEventListener('erp-data-updated', handleUpdated);
      window.removeEventListener('storage', handleUpdated);
    };
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
    setPaymentMethod('CASH');
    setPaymentChannelName('');
    setPaymentReferenceNo('');
    setHasManualPaidEdit(false);
    const firstProd = products[0];
    const initialCost = Number(firstProd?.costPrice || firstProd?.purchasePrice || firstProd?.cost_price || firstProd?.purchase_price || 0);
    setPaidAmount(initialCost);
    setInvoiceDiscountAmount(0);
    setInvoiceDiscountPercent(0);
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

  const handleScanPurchaseItem = (rawBarcode: string, targetUnit?: 'base' | 'sub' | 'major') => {
    const norm = normalizeScannedBarcode(rawBarcode).trim();
    if (!norm) return;

    // Deduplication lock: prevent duplicate scan within 450ms
    if (!shouldProcessBarcodeScan(norm, 450)) {
      setScannerQuery('');
      return;
    }

    const match = findProductByBarcode(products, norm);

    if (match) {
      playBarcodeBeep('success');
      const matched = match.product;
      const unitType = targetUnit || match.unit || 'base';

      let prodCost = Number(matched?.costPrice || matched?.purchasePrice || matched?.cost_price || (matched as any)?.purchase_price || 0);
      let unitName = matched.baseUnitName || matched.unit || 'حبة';
      let unitFactor = 1;

      if (unitType === 'sub' && matched.subUnitName) {
        unitName = matched.subUnitName;
        unitFactor = Number(matched.subUnitFactor || 1);
        if (Number(matched.subUnitPrice) > 0) {
          prodCost = Number(matched.subUnitPrice);
        } else {
          prodCost = prodCost * unitFactor;
        }
      } else if (unitType === 'major' && matched.majorUnitName) {
        unitName = matched.majorUnitName;
        unitFactor = Number(matched.majorUnitFactor || 1);
        if (Number(matched.majorUnitPrice) > 0) {
          prodCost = Number(matched.majorUnitPrice);
        } else {
          prodCost = prodCost * unitFactor;
        }
      }

      // Check if item is already in builder items
      const existingIdx = builderItems.findIndex((it) => it.product_id === matched.id && (it.unitName === unitName || it.unitFactor === unitFactor));
      if (existingIdx >= 0) {
        const updated = [...builderItems];
        const currentQty = parseFloat(updated[existingIdx].quantity) || 1;
        updated[existingIdx].quantity = currentQty + 1;
        setBuilderItems(updated);
        setScannerNotice(`تمت زيادة كمية "${matched.name}" إلى ${currentQty + 1}`);
      } else {
        const isFirstEmpty = builderItems.length === 1 && (!builderItems[0].product_id || builderItems[0].product_id === '');
        const newRow = {
          product_id: matched.id,
          quantity: 1,
          bonusQuantity: 0,
          freeQuantity: 0,
          costPrice: prodCost,
          unit_cost: prodCost,
          unitFactor: unitFactor,
          unitName: unitName,
          itemDiscountPercent: 0,
          itemDiscountAmount: 0,
          discount: 0,
          discountType: 'amount' as const,
          tax: 0,
        };
        if (isFirstEmpty) {
          setBuilderItems([newRow]);
        } else {
          setBuilderItems([...builderItems, newRow]);
        }
        setScannerNotice(`تمت إضافة "${matched.name}" بنجاح عبر الباركود (${unitName})`);
      }
      setScannerQuery('');
      setTimeout(() => setScannerNotice(null), 3000);
    } else {
      playBarcodeBeep('warning');
      setScannerNotice(`⚠️ لم يتم العثور على صنف بالباركود الممسوح: ${norm}`);
      setTimeout(() => setScannerNotice(null), 4000);
    }
  };

  // 70ms Instant exact-match auto-add when typing or scanning into the scanner input
  // Automatically adds item to purchase invoice without requiring Enter
  useEffect(() => {
    if (!scannerQuery || scannerQuery.trim().length < 4) return;
    const timer = setTimeout(() => {
      const match = findProductByBarcode(products, scannerQuery);
      if (match) {
        handleScanPurchaseItem(scannerQuery, match.unit);
      }
    }, 70);
    return () => clearTimeout(timer);
  }, [scannerQuery, products, builderItems]);

  // Global Hardware Barcode Scanner Listener for Purchase Builder
  // Intercepts rapid USB HID / Bluetooth scanner bursts and auto-submits on completion (<65ms + 80ms debounce) without requiring Enter!
  useEffect(() => {
    if (!isBuilderOpen) return;
    const cleanup = attachGlobalBarcodeScannerListener({
      minBarcodeLength: 2,
      burstMaxIntervalMs: 65,
      endDebounceMs: 80,
      onScan: (scanned) => {
        handleScanPurchaseItem(scanned);
      },
      shouldIgnore: () => {
        const activeEl = document.activeElement as HTMLElement | null;
        const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT');
        if (isInput) {
          const inputType = (activeEl as HTMLInputElement).type;
          const inputName = ((activeEl as HTMLInputElement).name || (activeEl as HTMLInputElement).id || '').toLowerCase();
          if (
            inputType === 'number' ||
            inputName.includes('qty') ||
            inputName.includes('quantity') ||
            inputName.includes('price') ||
            inputName.includes('disc') ||
            inputName.includes('tax') ||
            inputName.includes('note')
          ) {
            return true;
          }
        }
        return false;
      },
    });

    return () => {
      cleanup();
    };
  }, [isBuilderOpen, products, builderItems]);

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

  useEffect(() => {
    if (!isBuilderOpen || hasManualPaidEdit) return;
    if (paymentMethod === 'CREDIT') {
      setPaidAmount(0);
    } else {
      setPaidAmount(calculatedTotal);
    }
  }, [calculatedTotal, paymentMethod, isBuilderOpen, hasManualPaidEdit]);

  const handlePaymentMethodChange = (method: 'CASH' | 'BANK' | 'WALLET' | 'CREDIT') => {
    setPaymentMethod(method);
    setHasManualPaidEdit(false);
    if (method === 'CREDIT') {
      setPaidAmount(0);
      if (!dueDate) {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        setDueDate(d.toISOString().split('T')[0]);
      }
    } else {
      setPaidAmount(calculatedTotal);
    }
  };

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
      const rawPaidInput = Number(paidAmount || 0);
      const effectivePaid = Math.max(0, Math.min(rawPaidInput, calculatedTotal));
      const remainingToSupplier = Math.max(0, Number((calculatedTotal - effectivePaid).toFixed(2)));

      let paymentNotes = '';
      if (paymentMethod === 'BANK') {
        paymentNotes = [
          paymentChannelName.trim() ? `بنك: ${paymentChannelName.trim()}` : 'تحويل بنكي',
          paymentReferenceNo.trim() ? `مرجع: ${paymentReferenceNo.trim()}` : '',
        ]
          .filter(Boolean)
          .join(' - ');
      } else if (paymentMethod === 'WALLET') {
        paymentNotes = [
          paymentChannelName.trim() ? `محفظة: ${paymentChannelName.trim()}` : 'محفظة إلكترونية',
          paymentReferenceNo.trim() ? `حوالة: ${paymentReferenceNo.trim()}` : '',
        ]
          .filter(Boolean)
          .join(' - ');
      } else if (paymentMethod === 'CREDIT') {
        paymentNotes = `شراء بالآجل - قيدت كذمة للمورد (${supp?.name || ''})`;
      }
      const combinedNotes = [notes, paymentNotes].filter(Boolean).join(' | ');

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

      const resolvedStatus =
        status === 'PENDING' && remainingToSupplier <= 0.01 && calculatedTotal > 0
          ? 'PAID'
          : status === 'PENDING' && effectivePaid > 0
          ? 'PARTIALLY_PAID'
          : status;

      const res = await api.createPurchaseInvoice({
        supplier_id: selectedSupplierId,
        supplier_name: supp?.name || '',
        currency: currency || 'YER',
        exchange_rate: parseFloat(exchangeRate || '1.0'),
        invoice_date: invoiceDate,
        due_date: dueDate || undefined,
        status: resolvedStatus,
        payment_method: paymentMethod,
        paymentMethod: paymentMethod,
        payment_channel: paymentChannelName.trim() || undefined,
        payment_reference_no: paymentReferenceNo.trim() || undefined,
        bank_name: paymentMethod === 'BANK' ? paymentChannelName.trim() || undefined : undefined,
        bank_ref_no: paymentMethod === 'BANK' ? paymentReferenceNo.trim() || undefined : undefined,
        wallet_provider: paymentMethod === 'WALLET' ? paymentChannelName.trim() || undefined : undefined,
        wallet_tx_no: paymentMethod === 'WALLET' ? paymentReferenceNo.trim() || undefined : undefined,
        subtotal: calculatedSubtotal,
        items_discount: calculatedItemsDiscount,
        invoice_discount: numInvoiceDisc,
        invoice_discount_amount: numInvoiceDisc,
        discount: calculatedTotalDiscount,
        tax: calculatedTax,
        total: calculatedTotal,
        total_received_quantity: calculatedTotalReceivedUnits,
        total_received_base_units: calculatedTotalReceivedUnits,
        paid_amount: effectivePaid,
        remaining_amount: remainingToSupplier,
        notes: combinedNotes,
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

      // 2. Sync products from backend to preserve real Weighted Average Cost (WAC)
      try {
        const prodRes = await fetch('/api/v1/products', {
          headers: {
            'Content-Type': 'application/json',
            'x-company-id': localStorage.getItem('erp_company_id') || 'comp_001',
          },
        });
        if (prodRes.ok) {
          const prodData = await prodRes.json();
          const itemsList = Array.isArray(prodData) ? prodData : (prodData?.data || prodData?.products || []);
          if (itemsList.length > 0) {
            localStorage.setItem('erp_products_v1', JSON.stringify(itemsList));
            window.dispatchEvent(new CustomEvent('erp-inventory-updated'));
          }
        }
      } catch (prodErr) {
        console.warn('Backend product WAC sync note:', prodErr);
      }

      // 3. Record automatic payment voucher (سند صرف) if paid amount > 0
      if (effectivePaid > 0) {
        try {
          recordAutomaticTreasuryVoucher({
            type: 'SUPPLIER_PAYMENT',
            amount: effectivePaid,
            currency: currency || 'YER',
            paymentMethod: paymentMethod,
            paymentDate: invoiceDate,
            partyId: selectedSupplierId,
            partyName: supp?.name || 'مورد تجاري',
            partyPhone: supp?.phone,
            referenceId: res.data?.id,
            referenceNo: res.data?.invoice_number || `PUR-${Date.now().toString().slice(-6)}`,
            referenceType: 'PURCHASE_INVOICE',
            notes: `سند صرف آلي عن فاتورة مشتريات وتوريد رقم #${res.data?.invoice_number || ''} (المورد: ${supp?.name || 'مورد تجاري'})`,
            bankName: paymentMethod === 'BANK' ? paymentChannelName.trim() || undefined : undefined,
            bankRefNo: paymentMethod === 'BANK' ? paymentReferenceNo.trim() || undefined : undefined,
            walletProvider: paymentMethod === 'WALLET' ? paymentChannelName.trim() || undefined : undefined,
            walletTxNo: paymentMethod === 'WALLET' ? paymentReferenceNo.trim() || undefined : undefined,
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
          paid_amount: effectivePaid,
          remaining_amount: remainingToSupplier,
          payment_method: paymentMethod,
          payment_channel: paymentChannelName.trim() || undefined,
          payment_reference_no: paymentReferenceNo.trim() || undefined,
          status: remainingToSupplier <= 0.01 ? 'PAID' : effectivePaid > 0 ? 'PARTIALLY_PAID' : 'PENDING',
          created_at: new Date().toISOString(),
          invoice_date: invoiceDate,
          notes: combinedNotes,
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
        return <span className="m3-badge m3-badge-success text-[10px] font-bold">مسددة للمورد</span>;
      case 'PARTIALLY_PAID':
        return <span className="m3-badge m3-badge-info text-[10px] font-bold">مسددة جزئياً</span>;
      case 'PENDING':
        return <span className="m3-badge m3-badge-warning text-[10px] font-bold">مستحقة للمورد</span>;
      case 'DRAFT':
        return <span className="m3-badge bg-[var(--md-surface-container-high)] text-[var(--md-on-surface-variant)] border border-[var(--md-outline-variant)] text-[10px] font-bold">مسودة</span>;
      default:
        return <span className="m3-badge bg-[var(--md-surface-container-high)] text-[var(--md-on-surface-variant)] text-[10px] font-bold">{st}</span>;
    }
  };

  return (
    <div className="space-y-6 text-right text-[var(--md-on-surface)] font-sans" dir="rtl">
      {/* Header */}
      <div className="m3-card p-5 sm:p-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border border-[var(--md-outline-variant)] flex items-center justify-center shrink-0">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-[var(--md-on-surface)] tracking-tight flex items-center gap-2 flex-wrap">
                  <span>إدارة فواتير المشتريات</span>
                  <span className="m3-badge m3-badge-primary text-[10px] font-bold font-mono">
                    Purchase Invoices
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-[var(--md-on-surface-variant)] font-medium">
                  تسجيل فواتير المشتريات من الموردين، زيادة المخزون تلقائياً، وإضافة الالتزامات المالية في الشجرة المحاسبية
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleOpenBuilder}
            className="m3-btn-primary px-4 py-2.5 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all active:scale-95 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل فاتورة مشتريات جديدة</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-[var(--md-error-container)] border border-[var(--md-error)]/30 rounded-xl text-[var(--md-on-error-container)] text-xs sm:text-sm flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-[var(--md-success-container)] border border-[var(--md-success)]/30 rounded-xl text-[var(--md-on-success-container)] text-xs sm:text-sm flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Invoices List */}
      <div className="m3-card overflow-hidden">
        <div className="p-4 border-b border-[var(--md-outline-variant)] bg-[var(--md-surface-container-low)] flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="w-4 h-4 text-[var(--md-on-surface-variant)] absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="البحث برقم المشتريات، اسم المورد..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(normalizeScannedBarcode(e.target.value))}
              className="m3-input w-full pl-3 pr-9 py-2 text-xs"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="m3-select py-2 px-3 text-xs"
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
          <table className="m3-table w-full text-right text-xs">
            <thead className="m3-thead font-semibold text-[11px] uppercase tracking-wider">
              <tr>
                <th className="m3-th p-3.5">رقم الفاتورة</th>
                <th className="m3-th p-3.5">المورد</th>
                <th className="m3-th p-3.5">التاريخ</th>
                <th className="m3-th p-3.5">الإجمالي</th>
                <th className="m3-th p-3.5">المسدد للمورد</th>
                <th className="m3-th p-3.5">المتبقي للمورد</th>
                <th className="m3-th p-3.5">الحالة</th>
                <th className="m3-th p-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--md-outline-variant)] font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-[var(--md-on-surface-variant)]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-[var(--md-primary)]" />
                      <span>جاري تحميل فواتير المشتريات...</span>
                    </div>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-[var(--md-on-surface-variant)]">
                    لا توجد فواتير مشتريات مسجلة.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[var(--md-surface-container-low)] transition-colors">
                    <td className="p-3.5 font-bold font-mono text-[var(--md-primary-text)] dir-ltr text-right tabular-nums">
                      {inv.invoice_number}
                    </td>
                    <td className="p-3.5 font-bold text-[var(--md-on-surface)]">{inv.supplier_name || '-'}</td>
                    <td className="p-3.5 text-[var(--md-on-surface-variant)] font-mono text-[11px] tabular-nums">
                      {inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString('ar-YE') : '-'}
                    </td>
                    <td className="p-3.5 font-mono font-bold text-[var(--md-on-surface)] tabular-nums">
                      <div className="flex items-center gap-1">
                        <span>{formatAmount(inv.total)}</span>
                        <span className="text-xs font-semibold text-[var(--md-on-surface-variant)]">{inv.currency || 'YER'}</span>
                      </div>
                      {Number(inv.discount) > 0 && (
                        <div className="text-[10px] text-[var(--md-warning)] font-normal tabular-nums">
                          خصم: -{formatAmount(inv.discount)} {inv.currency || 'YER'}
                        </div>
                      )}
                      {Number(inv.total_received_quantity) > 0 && (
                        <div className="text-[10px] text-[var(--md-success)] font-normal flex items-center gap-1 tabular-nums">
                          <Gift className="w-2.5 h-2.5" />
                          <span>المخزن: {inv.total_received_quantity} قطعة</span>
                        </div>
                      )}
                      {inv.currency && inv.currency !== 'YER' && inv.exchange_rate && inv.exchange_rate !== 1 && (
                        <div className="text-[10px] text-[var(--md-primary-text)] font-normal tabular-nums">
                          ≈ {formatAmount(Number(inv.total) * Number(inv.exchange_rate))} YER
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 font-mono text-[var(--md-success)] font-bold tabular-nums">
                      {formatAmount(inv.paid_amount)} {inv.currency || 'YER'}
                    </td>
                    <td className="p-3.5 font-mono text-[var(--md-warning)] font-bold tabular-nums">
                      {formatAmount(inv.remaining_amount)} {inv.currency || 'YER'}
                    </td>
                    <td className="p-3.5">{getStatusBadge(inv.status)}</td>
                    <td className="p-3.5 text-center flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleViewInvoiceDetails(inv.id)}
                        className="p-1.5 text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-high)] rounded-lg transition-colors cursor-pointer"
                        title="عرض تفاصيل الفاتورة"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handlePrintSinglePurchase(inv)}
                        className="p-1.5 text-[var(--md-primary-text)] hover:bg-[var(--md-primary-container)] rounded-lg transition-colors cursor-pointer"
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
        <div className="m3-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150" dir="rtl">
          <div className="m3-modal-surface rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden text-right text-[var(--md-on-surface)]">
            <div className="flex items-center justify-between p-4 border-b border-[var(--md-outline-variant)] bg-[var(--md-surface-container-low)]">
              <h3 className="font-bold text-[var(--md-on-surface)] text-sm flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-[var(--md-primary-text)]" />
                <span>تسجيل فاتورة مشتريات وتوريد للمخزن</span>
              </h3>
              <button
                onClick={() => setIsBuilderOpen(false)}
                className="text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] p-1 rounded-lg hover:bg-[var(--md-surface-container-high)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInvoice} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-[var(--md-surface-container-low)] p-3.5 rounded-xl border border-[var(--md-outline-variant)]">
                <div>
                  <label className="block text-[var(--md-on-surface-variant)] font-semibold mb-1">المورد <span className="text-[var(--md-error)]">*</span></label>
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
                    className="m3-select w-full p-2"
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
                  <label className="block text-[var(--md-on-surface-variant)] font-semibold mb-1">العملة</label>
                  <select
                    value={currency}
                    onChange={(e) => {
                      const cur = e.target.value;
                      setCurrency(cur);
                      setExchangeRate(String(getAccountingRate(cur)));
                    }}
                    className="m3-select w-full p-2"
                  >
                    <option value="YER">YER (ريال يمني)</option>
                    <option value="SAR">SAR (ريال سعودي)</option>
                    <option value="USD">USD (دولار أمريكي)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[var(--md-on-surface-variant)] font-semibold mb-1 flex items-center justify-between">
                    <span>
                      سعر الصرف {currency !== 'YER' && <span className="text-[10px] text-[var(--md-warning)] font-normal">(مقابل YER)</span>}
                    </span>
                    <span className="text-[10px] text-[var(--md-warning)] font-mono">0-9 EN</span>
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    dir="ltr"
                    lang="en"
                    disabled={currency === 'YER'}
                    value={currency === 'YER' ? '1.0' : exchangeRate}
                    onChange={(e) => setExchangeRate(toEnglishDigits(e.target.value).replace(/[^0-9.]/g, ''))}
                    className={`m3-input w-full p-2 font-mono text-left tabular-nums ${
                      currency === 'YER' ? 'opacity-50' : ''
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[var(--md-on-surface-variant)] font-semibold mb-1">تاريخ الفاتورة</label>
                  <input
                    type="date"
                    required
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="m3-input w-full p-2 font-mono tabular-nums"
                  />
                </div>
              </div>

              {calculatedTotal > 0 && currency !== 'YER' && (
                <div className="bg-[var(--md-primary-container)]/40 border border-[var(--md-primary)]/30 rounded-xl p-2.5 text-xs text-[var(--md-on-primary-container)] flex items-center justify-between">
                  <span className="font-semibold text-[11px]">المعادل بالعملة الأساسية (YER):</span>
                  <span className="font-mono font-bold text-sm tabular-nums">
                    {formatAmount(calculatedTotal * (parseFloat(exchangeRate) || 1))} YER
                  </span>
                </div>
              )}

              {/* Items Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-[var(--md-on-surface)] flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-[var(--md-primary-text)]" />
                    <span>أصناف المشتريات الموردة للمستودع</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="m3-btn-tonal px-3 py-1.5 font-semibold flex items-center gap-1.5 cursor-pointer text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة صنف</span>
                  </button>
                </div>

                {/* Barcode Quick Scan Bar for Purchasing */}
                <div className="mb-3 p-3 bg-[var(--md-surface-container-low)] border border-[var(--md-primary)]/30 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[var(--md-primary-text)] flex items-center gap-1.5">
                      <Barcode className="w-4 h-4" />
                      <span>مسح الباركود السريع لإضافة صنف تلقائياً لفاتورة المشتريات:</span>
                    </span>
                    <span className="text-[10px] text-[var(--md-on-surface-variant)] font-mono">USB / HID Normalizer</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={scannerQuery}
                      onChange={(e) => setScannerQuery(normalizeScannedBarcode(e.target.value))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleScanPurchaseItem(scannerQuery);
                        }
                      }}
                      placeholder="امسح الباركود بجهاز المسح أو اكتب كود الصنف واضغط Enter..."
                      className="m3-input flex-1 p-2 text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => handleScanPurchaseItem(scannerQuery)}
                      className="m3-btn-primary px-3 py-1.5 text-xs font-bold cursor-pointer"
                    >
                      إضافة
                    </button>
                  </div>
                  {scannerNotice && (
                    <div className="text-[11px] font-bold text-[var(--md-warning)] animate-in fade-in">
                      {scannerNotice}
                    </div>
                  )}
                </div>

                <div className="space-y-2.5">
                  {builderItems.map((item, index) => {
                    const calcs = getItemCalculations(item);
                    return (
                      <div
                        key={index}
                        className="p-3 bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] rounded-xl space-y-2 transition-colors"
                      >
                        <div className="grid grid-cols-12 gap-2 items-center">
                          {/* Product Selection */}
                          <div className="col-span-12 sm:col-span-3">
                            <label className="block text-[10px] text-[var(--md-on-surface-variant)] mb-0.5">الصنف / رقم القطعة</label>
                            <select
                              value={item.product_id}
                              onChange={(e) => handleProductChange(index, e.target.value)}
                              className="m3-select w-full p-2 text-xs"
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
                            <label className="block text-[10px] text-[var(--md-on-surface-variant)] mb-0.5 flex items-center justify-between">
                              <span>الكمية المشتراة</span>
                              <span className="text-[9px] text-[var(--md-warning)] font-mono">0-9 EN</span>
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
                              className="m3-input w-full p-2 font-mono text-xs text-center font-bold tabular-nums"
                            />
                          </div>

                          {/* Free / Bonus Quantity */}
                          <div className="col-span-6 sm:col-span-2">
                            <label className="block text-[10px] text-[var(--md-success)] font-semibold mb-0.5 flex items-center justify-between">
                              <span className="flex items-center gap-1">
                                <Gift className="w-3 h-3 text-[var(--md-success)]" />
                                <span>بونص مجاني 🎁</span>
                              </span>
                              <span className="text-[9px] text-[var(--md-success)] font-mono">0-9 EN</span>
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
                              className="m3-input w-full p-2 bg-[var(--md-success-container)]/35 border-[var(--md-success)]/40 font-mono text-xs text-[var(--md-success)] text-center font-bold tabular-nums"
                            />
                          </div>

                          {/* Unit Cost */}
                          <div className="col-span-6 sm:col-span-2">
                            <label className="block text-[10px] text-[var(--md-on-surface-variant)] mb-0.5 flex items-center justify-between">
                              <span>سعر الوحدة ({currency})</span>
                              <span className="text-[9px] text-[var(--md-warning)] font-mono">0-9 EN</span>
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
                              className="m3-input w-full p-2 font-mono text-xs text-center font-bold tabular-nums"
                            />
                          </div>

                          {/* Item Discount Percent & Amount */}
                          <div className="col-span-6 sm:col-span-3">
                            <label className="block text-[10px] text-[var(--md-on-surface-variant)] mb-0.5 flex items-center justify-between">
                              <span>خصم الصنف (% ومبلغ)</span>
                              <span className="text-[9px] text-[var(--md-warning)] font-mono">0-9 EN</span>
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
                                  className="m3-input w-full p-1.5 font-mono text-xs text-[var(--md-warning)] text-center tabular-nums"
                                />
                                <span className="absolute left-1.5 top-1.5 text-[9px] text-[var(--md-on-surface-variant)]">%</span>
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
                                  className="m3-input w-full p-1.5 font-mono text-xs text-[var(--md-warning)] text-center font-bold tabular-nums"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Row Calculations Bar */}
                        <div className="flex flex-wrap items-center justify-between pt-1.5 border-t border-[var(--md-outline-variant)] text-[11px] gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            {(calcs.bonusQuantity > 0 || calcs.itemDiscountAmount > 0) ? (
                              <span className="m3-badge m3-badge-success inline-flex items-center gap-1.5 font-medium">
                                <Gift className="w-3.5 h-3.5" />
                                <span>إجمالي الداخل للمخزن: <strong className="font-mono font-bold tabular-nums">{calcs.totalReceivedBaseUnits}</strong></span>
                                <span className="opacity-50">|</span>
                                <span>التكلفة الفعلية للوحدة: <strong className="font-mono font-bold tabular-nums">{Math.round(calcs.effectiveUnitCost * 100) / 100}</strong> {currency}</span>
                              </span>
                            ) : (
                              <span className="text-[var(--md-on-surface-variant)]">
                                الكمية الداخلة للمستودع: <strong className="font-mono text-[var(--md-on-surface)] tabular-nums">{calcs.totalReceivedBaseUnits}</strong>
                              </span>
                            )}

                            {calcs.itemDiscountAmount > 0 && (
                              <span className="text-[var(--md-warning)] font-mono text-[10px] tabular-nums">
                                (وفر الخصم: -{formatAmount(calcs.itemDiscountAmount)} {currency})
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-left font-mono tabular-nums">
                              <span className="text-[10px] text-[var(--md-on-surface-variant)] ml-1">صافي الصنف:</span>
                              <strong className="text-sm font-bold text-[var(--md-primary-text)]">{formatAmount(calcs.netRowCost)} {currency}</strong>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              disabled={builderItems.length === 1}
                              className={`p-1.5 rounded-lg transition-colors ${
                                builderItems.length === 1
                                  ? 'text-[var(--md-on-surface-variant)]/40 cursor-not-allowed'
                                  : 'text-[var(--md-error)] hover:bg-[var(--md-error-container)] cursor-pointer'
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
              <div className="bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] rounded-xl p-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-[var(--md-warning-container)] border border-[var(--md-outline-variant)] rounded-xl text-[var(--md-on-warning-container)]">
                      <Tag className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-[var(--md-on-surface)] text-xs">خصم الفاتورة الإجمالي (Invoice Discount)</div>
                      <div className="text-[10px] text-[var(--md-on-surface-variant)]">خصم تجاري خاص يمنحه المورد على إجمالي الفاتورة</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-[var(--md-on-surface-variant)]">مبلغ الخصم:</span>
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
                        className="m3-input w-28 p-2 font-mono text-xs text-[var(--md-warning)] font-bold text-center tabular-nums"
                      />
                      <span className="text-xs text-[var(--md-on-surface-variant)]">{currency}</span>
                    </div>

                    {numInvoiceDisc > 0 && (
                      <span className="m3-badge m3-badge-warning text-xs font-mono font-bold whitespace-nowrap tabular-nums">
                        -{formatAmount(numInvoiceDisc)} {currency} ({invoiceDiscountPercent}%)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Full Payment Methods Selector (نقدي / بنكي / محفظة إلكترونية / آجل) */}
              <div className="bg-[var(--md-surface-container-low)] p-4 rounded-xl border border-[var(--md-outline-variant)] space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--md-outline-variant)] pb-2 flex-wrap gap-1">
                  <span className="font-bold text-[var(--md-primary-text)] text-xs flex items-center gap-1.5">
                    <Banknote className="w-4 h-4" />
                    <span>طريقة الدفع والسداد للمورد</span>
                  </span>
                  <span className="text-[10px] text-[var(--md-on-surface-variant)]">ترحيل آلي لحساب الصندوق (1101) والبنك (1102) والمحافظ (1107) والموردين (2101)</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handlePaymentMethodChange('CASH')}
                    className={`p-3 rounded-xl border text-right transition-all flex flex-col gap-1.5 cursor-pointer ${
                      paymentMethod === 'CASH'
                        ? 'bg-[var(--md-success-container)] border-[var(--md-success)] text-[var(--md-on-success-container)]'
                        : 'bg-[var(--md-surface-container)] border-[var(--md-outline-variant)] hover:bg-[var(--md-surface-container-high)] text-[var(--md-on-surface)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Banknote className="w-4 h-4 text-[var(--md-success)]" />
                      {paymentMethod === 'CASH' && <CheckCircle2 className="w-3.5 h-3.5 text-[var(--md-success)]" />}
                    </div>
                    <div className="font-bold text-xs">نقدي (الصندوق)</div>
                    <div className="text-[10px] text-[var(--md-on-surface-variant)]">صرف من حساب 1101</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePaymentMethodChange('BANK')}
                    className={`p-3 rounded-xl border text-right transition-all flex flex-col gap-1.5 cursor-pointer ${
                      paymentMethod === 'BANK'
                        ? 'bg-[var(--md-info-container)] border-[var(--md-info)] text-[var(--md-on-info-container)]'
                        : 'bg-[var(--md-surface-container)] border-[var(--md-outline-variant)] hover:bg-[var(--md-surface-container-high)] text-[var(--md-on-surface)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Landmark className="w-4 h-4 text-[var(--md-info)]" />
                      {paymentMethod === 'BANK' && <CheckCircle2 className="w-3.5 h-3.5 text-[var(--md-info)]" />}
                    </div>
                    <div className="font-bold text-xs">تحويل بنكي</div>
                    <div className="text-[10px] text-[var(--md-on-surface-variant)]">صرف من حساب 1102</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePaymentMethodChange('WALLET')}
                    className={`p-3 rounded-xl border text-right transition-all flex flex-col gap-1.5 cursor-pointer ${
                      paymentMethod === 'WALLET'
                        ? 'bg-[var(--md-secondary-container)] border-[var(--md-secondary)] text-[var(--md-on-secondary-container)]'
                        : 'bg-[var(--md-surface-container)] border-[var(--md-outline-variant)] hover:bg-[var(--md-surface-container-high)] text-[var(--md-on-surface)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Wallet className="w-4 h-4 text-[var(--md-secondary)]" />
                      {paymentMethod === 'WALLET' && <CheckCircle2 className="w-3.5 h-3.5 text-[var(--md-secondary)]" />}
                    </div>
                    <div className="font-bold text-xs">محفظة إلكترونية</div>
                    <div className="text-[10px] text-[var(--md-on-surface-variant)]">صرف من حساب 1107</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePaymentMethodChange('CREDIT')}
                    className={`p-3 rounded-xl border text-right transition-all flex flex-col gap-1.5 cursor-pointer ${
                      paymentMethod === 'CREDIT'
                        ? 'bg-[var(--md-warning-container)] border-[var(--md-warning)] text-[var(--md-on-warning-container)]'
                        : 'bg-[var(--md-surface-container)] border-[var(--md-outline-variant)] hover:bg-[var(--md-surface-container-high)] text-[var(--md-on-surface)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Clock className="w-4 h-4 text-[var(--md-warning)]" />
                      {paymentMethod === 'CREDIT' && <CheckCircle2 className="w-3.5 h-3.5 text-[var(--md-warning)]" />}
                    </div>
                    <div className="font-bold text-xs">شراء آجل / جزئي</div>
                    <div className="text-[10px] text-[var(--md-on-surface-variant)]">ذمة موردين حساب 2101</div>
                  </button>
                </div>

                {(paymentMethod === 'BANK' || paymentMethod === 'WALLET') && (
                  <div className="p-3 bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] rounded-xl space-y-2.5">
                    {paymentMethod === 'WALLET' && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {['الكريمي', 'ون كاش', 'جوالي', 'فلوسك', 'جايبي', 'كاش'].map((w) => (
                          <button
                            key={w}
                            type="button"
                            onClick={() => setPaymentChannelName(w)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                              paymentChannelName === w
                                ? 'bg-[var(--md-secondary-container)] border-[var(--md-secondary)] text-[var(--md-on-secondary-container)]'
                                : 'bg-[var(--md-surface-container-low)] border-[var(--md-outline-variant)] text-[var(--md-on-surface-variant)] hover:bg-[var(--md-surface-container-high)]'
                            }`}
                          >
                            {w}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-[var(--md-on-surface-variant)] mb-1">
                          {paymentMethod === 'BANK' ? 'اسم البنك / الحساب المحول منه' : 'اسم المحفظة / المزود'}
                        </label>
                        <input
                          type="text"
                          value={paymentChannelName}
                          onChange={(e) => setPaymentChannelName(e.target.value)}
                          placeholder={paymentMethod === 'BANK' ? 'مثال: بنك الكريمي / التضامن' : 'مثال: جوالي، ون كاش، الكريمي'}
                          className="m3-input w-full p-2 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-[var(--md-on-surface-variant)] mb-1">
                          رقم الحوالة / الإشعار المرجعي
                        </label>
                        <input
                          type="text"
                          value={paymentReferenceNo}
                          onChange={(e) => setPaymentReferenceNo(toEnglishDigits(e.target.value))}
                          placeholder="رقم العملية أو الإشعار"
                          className="m3-input w-full p-2 text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {paymentMethod === 'CREDIT' && (
                  <div className="p-2.5 bg-[var(--md-warning-container)] border border-[var(--md-warning)]/30 rounded-lg text-[var(--md-on-warning-container)] text-[11px] flex items-center gap-2">
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>
                      شراء آجل: سيتم قيد المبلغ المتبقي على حساب المورد في ذمم الموردين (2101)، مع إمكانية إدخال دفعة مقدمة أدناه.
                    </span>
                  </div>
                )}

                {/* Payment to Supplier & Balances */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[var(--md-on-surface-variant)] font-semibold mb-1 text-xs flex items-center justify-between">
                      <span>المبلغ المسدد للمورد فوراً ({currency})</span>
                      <span className="text-[10px] text-[var(--md-warning)] font-mono">0-9 EN</span>
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      dir="ltr"
                      lang="en"
                      value={paidAmount}
                      onChange={(e) => {
                        setHasManualPaidEdit(true);
                        setPaidAmount(toEnglishDigits(e.target.value).replace(/[^0-9.]/g, ''));
                      }}
                      placeholder="0.00"
                      className="m3-input w-full p-2 text-[var(--md-success)] font-bold font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[var(--md-on-surface-variant)] font-semibold mb-1 text-xs">
                      المتبقي للمورد (دين آجل على المنشأة - 2101)
                    </label>
                    <div className="w-full p-2 bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] rounded-xl font-bold font-mono text-[var(--md-warning)] text-sm tabular-nums">
                      {formatAmount(Math.max(0, calculatedTotal - (parseFloat(paidAmount) || 0)))} {currency}
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Totals & Summary Metrics */}
              <div className="p-4 bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] rounded-xl space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 bg-[var(--md-surface-container)] rounded-lg border border-[var(--md-outline-variant)]">
                    <span className="text-[var(--md-on-surface-variant)] block text-[10px]">المجموع قبل الخصم</span>
                    <span className="font-mono font-bold text-sm text-[var(--md-on-surface)] tabular-nums">
                      {formatAmount(calculatedSubtotal)} {currency}
                    </span>
                  </div>

                  <div className="p-2.5 bg-[var(--md-surface-container)] rounded-lg border border-[var(--md-outline-variant)]">
                    <span className="text-[var(--md-warning)] block text-[10px]">إجمالي الخصم التجاري</span>
                    <span className="font-mono font-bold text-sm text-[var(--md-warning)] tabular-nums">
                      -{formatAmount(calculatedTotalDiscount)} {currency}
                    </span>
                  </div>

                  <div className="p-2.5 bg-[var(--md-success-container)]/50 rounded-lg border border-[var(--md-success)]/30">
                    <span className="text-[var(--md-success)] block text-[10px] flex items-center gap-1">
                      <Gift className="w-3 h-3" />
                      <span>إجمالي القطع للمخزن</span>
                    </span>
                    <span className="font-mono font-bold text-sm text-[var(--md-on-success-container)] tabular-nums">
                      {calculatedTotalReceivedUnits} قطعة
                    </span>
                  </div>

                  <div className="p-2.5 bg-[var(--md-primary-container)] rounded-lg border border-[var(--md-primary)]/40">
                    <span className="text-[var(--md-on-primary-container)] block text-[10px] font-bold">الصافي المستحق للمورد</span>
                    <span className="font-mono font-extrabold text-base text-[var(--md-on-primary-container)] tabular-nums">
                      {formatAmount(calculatedTotal)} {currency}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-[var(--md-outline-variant)]">
                  <div className="w-full sm:w-auto flex items-center gap-2">
                    <span className="text-[var(--md-on-surface-variant)] text-xs">حالة الفاتورة:</span>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="m3-select p-1.5 text-xs"
                    >
                      <option value="PENDING">اعتماد ورفع للرصيد والمخزن (تأكيد الشراء)</option>
                      <option value="DRAFT">حفظ كمسودة مشتريات</option>
                    </select>
                  </div>

                  {calculatedTotal > 0 && currency !== 'YER' && (
                    <div className="text-xs text-[var(--md-primary-text)] font-mono tabular-nums">
                      المعادل بالعملة الأساسية (YER): <strong className="font-bold">{formatAmount(calculatedTotal * (parseFloat(exchangeRate) || 1))} YER</strong>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[var(--md-on-surface-variant)] font-semibold mb-1">ملاحظات الفاتورة</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ملاحظات العقد أو الفاتورة الأصلية للمورد..."
                  className="m3-input w-full p-2.5"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--md-outline-variant)]">
                <button
                  type="button"
                  onClick={() => setIsBuilderOpen(false)}
                  className="m3-btn-outlined px-4 py-2 font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="m3-btn-primary px-5 py-2 font-bold transition-all active:scale-95 cursor-pointer"
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
        <div className="m3-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150" dir="rtl">
          <div className="m3-modal-surface rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden text-right text-[var(--md-on-surface)]">
            <div className="flex items-center justify-between p-4 border-b border-[var(--md-outline-variant)] bg-[var(--md-surface-container-low)]">
              <span className="font-bold text-[var(--md-on-surface)] text-sm flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-[var(--md-primary-text)]" />
                <span>تفاصيل فاتورة مشتريات <span className="font-mono tabular-nums">#{selectedInvoice.invoice_number}</span></span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintSinglePurchase(selectedInvoice)}
                  className="m3-btn-tonal inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold cursor-pointer"
                  title="طباعة الفاتورة أو حفظها PDF"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة / PDF</span>
                </button>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] p-1 rounded-lg hover:bg-[var(--md-surface-container-high)] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-[var(--md-surface-container-low)] p-3.5 rounded-xl border border-[var(--md-outline-variant)] gap-2">
                <div>
                  <div className="text-[var(--md-on-surface-variant)] font-semibold text-[11px]">المورد التجاري</div>
                  <div className="font-bold text-[var(--md-on-surface)] text-sm">{selectedInvoice.supplier_name}</div>
                </div>
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-[var(--md-on-surface-variant)] font-semibold text-[11px]">التاريخ</div>
                    <div className="font-mono font-bold text-[var(--md-on-surface)] tabular-nums">
                      {new Date(selectedInvoice.invoice_date).toLocaleDateString('ar-YE')}
                    </div>
                  </div>
                  <div>
                    <div className="text-[var(--md-on-surface-variant)] font-semibold text-[11px]">الحالة</div>
                    <div>{getStatusBadge(selectedInvoice.status)}</div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto border border-[var(--md-outline-variant)] rounded-xl">
                <table className="m3-table w-full text-right text-xs">
                  <thead className="m3-thead font-bold text-[11px]">
                    <tr>
                      <th className="m3-th p-2.5">الصنف</th>
                      <th className="m3-th p-2.5 text-center">الكمية المشترات</th>
                      <th className="m3-th p-2.5 text-center text-[var(--md-success)]">بونص مجاني 🎁</th>
                      <th className="m3-th p-2.5 text-center">إجمالي المخزن</th>
                      <th className="m3-th p-2.5 text-left">سعر الوحدة</th>
                      <th className="m3-th p-2.5 text-left text-[var(--md-warning)]">خصم الصنف</th>
                      <th className="m3-th p-2.5 text-left text-[var(--md-primary-text)]">التكلفة الفعلية</th>
                      <th className="m3-th p-2.5 text-left">الصافي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--md-outline-variant)]">
                    {selectedInvoice.items?.map((it: any, i: number) => {
                      const q = Number(it.quantity || 1);
                      const freeQ = Number(it.freeQuantity || it.free_quantity || 0);
                      const totalQ = Number(it.totalReceivedQuantity || (q + freeQ));
                      const cost = Number(it.unit_cost !== undefined ? it.unit_cost : (it.unitPrice || 0));
                      const disc = Number(it.discount || 0);
                      const net = Number(it.total !== undefined ? it.total : ((q * cost) - disc));
                      const eff = Number(it.effectiveUnitCost || it.effective_unit_cost || (totalQ > 0 ? net / totalQ : cost));

                      return (
                        <tr key={it.id || i} className="hover:bg-[var(--md-surface-container-low)]">
                          <td className="p-2.5 font-semibold text-[var(--md-on-surface)]">
                            <div>{it.product_name}</div>
                            {(it.itemCode || it.sku) && (
                              <div className="text-[10px] text-[var(--md-on-surface-variant)] font-mono">[{it.itemCode || it.sku}]</div>
                            )}
                          </td>
                          <td className="p-2.5 font-mono text-center font-bold text-[var(--md-on-surface)] tabular-nums">{q}</td>
                          <td className="p-2.5 font-mono text-center font-bold text-[var(--md-success)] tabular-nums">
                            {freeQ > 0 ? `+${freeQ}` : '-'}
                          </td>
                          <td className="p-2.5 font-mono text-center font-bold text-[var(--md-primary-text)] bg-[var(--md-primary-container)]/30 tabular-nums">{totalQ}</td>
                          <td className="p-2.5 font-mono text-left text-[var(--md-on-surface-variant)] tabular-nums">{formatAmount(cost)} {selectedInvoice.currency || 'YER'}</td>
                          <td className="p-2.5 font-mono text-left text-[var(--md-warning)] tabular-nums">
                            {disc > 0 ? `-${formatAmount(disc)}` : '-'}
                          </td>
                          <td className="p-2.5 font-mono text-left font-bold text-[var(--md-primary-text)] tabular-nums">
                            {Math.round(eff * 100) / 100} {selectedInvoice.currency || 'YER'}
                          </td>
                          <td className="p-2.5 font-mono font-bold text-[var(--md-success)] text-left tabular-nums">
                            {formatAmount(net)} {selectedInvoice.currency || 'YER'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Financial Breakdown */}
              <div className="p-4 bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] rounded-xl space-y-2.5 text-[var(--md-on-surface)]">
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--md-on-surface-variant)]">المجموع الفرعي (قبل الخصم):</span>
                  <span className="font-mono font-bold text-[var(--md-on-surface)] tabular-nums">
                    {formatAmount(selectedInvoice.subtotal || selectedInvoice.total)} {selectedInvoice.currency || 'YER'}
                  </span>
                </div>

                {Number(selectedInvoice.items_discount) > 0 && (
                  <div className="flex justify-between text-xs text-[var(--md-warning)]">
                    <span>خصومات الأصناف:</span>
                    <span className="font-mono font-bold tabular-nums">
                      -{formatAmount(selectedInvoice.items_discount)} {selectedInvoice.currency || 'YER'}
                    </span>
                  </div>
                )}

                {Number(selectedInvoice.invoice_discount) > 0 && (
                  <div className="flex justify-between text-xs text-[var(--md-warning)]">
                    <span>خصم الفاتورة الإضافي:</span>
                    <span className="font-mono font-bold tabular-nums">
                      -{formatAmount(selectedInvoice.invoice_discount)} {selectedInvoice.currency || 'YER'}
                    </span>
                  </div>
                )}

                {Number(selectedInvoice.discount) > 0 && !(Number(selectedInvoice.items_discount) > 0 && Number(selectedInvoice.invoice_discount) > 0) && (
                  <div className="flex justify-between text-xs text-[var(--md-warning)]">
                    <span>إجمالي الخصم التجاري:</span>
                    <span className="font-mono font-bold tabular-nums">
                      -{formatAmount(selectedInvoice.discount)} {selectedInvoice.currency || 'YER'}
                    </span>
                  </div>
                )}

                {Number(selectedInvoice.total_received_quantity) > 0 && (
                  <div className="flex justify-between text-xs text-[var(--md-success)] font-bold border-t border-[var(--md-outline-variant)] pt-2">
                    <span className="flex items-center gap-1">
                      <Gift className="w-3.5 h-3.5" />
                      <span>إجمالي الكميات الداخلة للمستودع:</span>
                    </span>
                    <span className="font-mono tabular-nums">{selectedInvoice.total_received_quantity} قطعة</span>
                  </div>
                )}

                <div className="flex justify-between font-bold border-t border-[var(--md-outline-variant)] pt-2">
                  <span className="text-[var(--md-on-surface)] text-sm">الصافي النهائي المستحق للمورد:</span>
                  <span className="font-mono text-[var(--md-primary-text)] text-base tabular-nums">{formatAmount(selectedInvoice.total)} {selectedInvoice.currency || 'YER'}</span>
                </div>

                {selectedInvoice.currency && selectedInvoice.currency !== 'YER' && selectedInvoice.exchange_rate && (
                  <div className="flex justify-between text-[var(--md-on-surface-variant)] font-semibold text-[11px]">
                    <span>المعادل بالعملة الأساسية (YER):</span>
                    <span className="font-mono tabular-nums">{formatAmount(Number(selectedInvoice.total) * Number(selectedInvoice.exchange_rate))} YER (سعر الصرف: {selectedInvoice.exchange_rate})</span>
                  </div>
                )}

                <div className="flex justify-between text-[var(--md-success)] text-xs font-semibold">
                  <span>المبلغ المسدد للمورد:</span>
                  <span className="font-mono font-bold tabular-nums">{formatAmount(selectedInvoice.paid_amount || 0)} {selectedInvoice.currency || 'YER'}</span>
                </div>

                <div className="flex justify-between text-[var(--md-warning)] font-bold text-xs border-t border-[var(--md-outline-variant)] pt-2">
                  <span>المبلغ المتبقي دين على المنشأة:</span>
                  <span className="font-mono text-sm tabular-nums">{formatAmount(selectedInvoice.remaining_amount)} {selectedInvoice.currency || 'YER'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
