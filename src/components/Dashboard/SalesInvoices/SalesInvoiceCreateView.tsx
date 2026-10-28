import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../../api';
import {
  formatAmount,
  formatNumber,
  toEnglishDigits,
  parseEnglishNumber,
  getActiveCurrencyCode,
  getActiveCurrencySymbol,
  applyStockMovementSync,
} from '../../../lib/formatters';
import { printInvoiceDocument } from '../../../lib/exportUtils';
import {
  ArrowRight,
  Plus,
  Trash2,
  Copy,
  Save,
  Printer,
  FileText,
  User,
  Calendar,
  DollarSign,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Building,
  CheckCircle2,
  Search,
  Barcode,
  CreditCard,
  Wallet,
  Landmark,
  Banknote,
  Clock,
  Sparkles,
  Zap,
  Tag,
  Layers,
} from 'lucide-react';
import { ModuleSettingsModal } from '../../Common/ModuleSettingsModal';
import { PriceTier, ProductActivityType } from '../../../types';
import { getAccountingRate, getStoredExchangeRates } from '../../../lib/exchangeRates';

export type PaymentMethodType = 'CASH' | 'BANK' | 'CREDIT' | 'WALLET';

interface InvoiceLineItem {
  id: string;
  product_id?: string;
  name?: string;
  sku?: string;
  unit: string;
  customUnit?: string;
  quantity: number;
  unit_price: number;
  discount: number;
  tax_percent: number;
  tax: number;
  total: number;
  current_stock?: number;
  is_manual?: boolean;

  // Multi-UOM
  selectedUnit?: 'base' | 'sub' | 'major';
  unitFactor?: number;
  baseUnitName?: string;
  subUnitName?: string;
  subUnitFactor?: number;
  subUnitPrice?: number;
  majorUnitName?: string;
  majorUnitFactor?: number;
  majorUnitPrice?: number;

  // Dynamic Code & OEM
  itemCode?: string;
  partNumber?: string;

  // Battery Spec & Warranty & Scrap
  activityType?: ProductActivityType;
  serialNumber?: string;
  warrantyMonths?: number;
  warrantyEndDate?: string;
  scrapDiscount?: number;

  // Tires Spec (قسم الإطارات)
  tireSize?: string;
  tireProductionDot?: string;
  tirePlyOrigin?: string;
}

interface SalesInvoiceCreateViewProps {
  onBack: () => void;
  onSuccess: (newInvoice?: any) => void;
  customers: any[];
  products: any[];
}

export const COMMON_UNITS = [
  'حبة',
  'باكت',
  'كرتون',
  'كيلو',
  'جرام',
  'لتر',
  'متر',
  'طرد',
  'درزن',
  'كيس',
  'شدة',
  'علبة',
  'خدمة',
  'أخرى',
];

export const WALLET_PRESETS = [
  'الكريمي جوال',
  'ون كاش (One Cash)',
  'فلوسك (Floosak)',
  'جايبي (Jaib)',
  'جوالي (Jawwali)',
  'كاش (Cash)',
  'محفظة أخرى',
];

export const SalesInvoiceCreateView: React.FC<SalesInvoiceCreateViewProps> = ({
  onBack,
  onSuccess,
  customers = [],
  products = [],
}) => {
  const customerList = Array.isArray(customers) ? customers : [];
  const productList = Array.isArray(products) ? products : [];

  // Form Header State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [currency, setCurrency] = useState(getActiveCurrencyCode());
  const [exchangeRate, setExchangeRate] = useState<number>(1.0);
  const [salespersonName, setSalespersonName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [notes, setNotes] = useState('');
  const [paidAmount, setPaidAmount] = useState<number>(0);

  // Payment Method State
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('CASH');
  const [bankName, setBankName] = useState('');
  const [bankRefNo, setBankRefNo] = useState('');
  const [walletProvider, setWalletProvider] = useState('الكريمي جوال');
  const [walletTxNo, setWalletTxNo] = useState('');

  // Quick Barcode / Product Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Items State
  const [items, setItems] = useState<InvoiceLineItem[]>([
    {
      id: `item-${Date.now()}-1`,
      product_id: '',
      name: '',
      unit: 'حبة',
      quantity: 1,
      unit_price: 0,
      discount: 0,
      tax_percent: 0,
      tax: 0,
      total: 0,
      is_manual: false,
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quickNotice, setQuickNotice] = useState<string | null>(null);

  const [selectedPriceTier, setSelectedPriceTier] = useState<PriceTier>('retail');

  // Selected customer details
  const selectedCustomer = customerList.find((c) => c.id === selectedCustomerId);

  // Currency change handler
  const handleCurrencyChange = (newCurr: string) => {
    setCurrency(newCurr);
    setExchangeRate(getAccountingRate(newCurr));
  };

  // Grand Totals Calculation (Accounting for scrap discounts)
  const subtotal = items.reduce((acc, it) => acc + (it.quantity || 0) * (it.unit_price || 0), 0);
  const totalDiscount = items.reduce((acc, it) => acc + (it.discount || 0) + (it.scrapDiscount || 0), 0);
  const totalTax = items.reduce((acc, it) => acc + (it.tax || 0), 0);
  const grandTotal = Number((subtotal - totalDiscount + totalTax).toFixed(2));
  const remainingDue = Math.max(0, Number((grandTotal - paidAmount).toFixed(2)));

  // Synchronize payment amounts when switching methods or totals change
  const handlePaymentMethodChange = (newMethod: PaymentMethodType) => {
    setPaymentMethod(newMethod);
    if (newMethod === 'CREDIT') {
      setPaidAmount(0);
      if (!dueDate) {
        // Set default due date +30 days for credit sales
        const d = new Date();
        d.setDate(d.getDate() + 30);
        setDueDate(d.toISOString().split('T')[0]);
      }
    } else if (newMethod === 'CASH' || newMethod === 'BANK' || newMethod === 'WALLET') {
      // Default to full payment for cash/bank/wallet
      setPaidAmount(grandTotal);
    }
  };

  // Quick Due Date Helper (+Days)
  const setQuickDueDate = (days: number) => {
    const d = new Date(invoiceDate || new Date());
    d.setDate(d.getDate() + days);
    setDueDate(d.toISOString().split('T')[0]);
  };

  // 1-Click Quick Select Cash Customer
  const selectQuickCashCustomer = () => {
    const cashCust = customerList.find(
      (c) =>
        c.name?.includes('نقدي') ||
        c.name?.includes('عام') ||
        c.name?.toLowerCase().includes('cash') ||
        c.name?.includes('نقدا')
    );
    if (cashCust) {
      setSelectedCustomerId(cashCust.id);
      showNotice(`تم اختيار "${cashCust.name}" بنجاح`);
    } else if (customerList.length > 0) {
      setSelectedCustomerId(customerList[0].id);
      showNotice(`تم اختيار العميل "${customerList[0].name}"`);
    }
  };

  const showNotice = (msg: string) => {
    setQuickNotice(msg);
    setTimeout(() => setQuickNotice(null), 3000);
  };

  // Helper for Tiered Pricing
  const getProductPriceForTier = (prod: any, tier: PriceTier = selectedPriceTier) => {
    if (tier === 'vip' && Number(prod.vipPrice) > 0) return Number(prod.vipPrice);
    if (tier === 'wholesale' && Number(prod.wholesalePrice) > 0) return Number(prod.wholesalePrice);
    if (tier === 'half_wholesale' && Number(prod.halfWholesalePrice) > 0) return Number(prod.halfWholesalePrice);
    return Number(prod.retailPrice ?? prod.retail_price ?? prod.selling_price ?? prod.price ?? 0);
  };

  // Helper for Auto-Calculating Warranty End Date (Months from now)
  const calculateWarrantyEndDate = (months: number = 12) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return d.toISOString().split('T')[0];
  };

  // Change Price Tier & update all line items
  const handlePriceTierChange = (newTier: PriceTier) => {
    setSelectedPriceTier(newTier);
    setItems((prev) =>
      prev.map((it) => {
        if (!it.product_id) return it;
        const prod = productList.find((p) => p.id === it.product_id);
        if (!prod) return it;
        let basePrice = getProductPriceForTier(prod, newTier);
        let price = basePrice;
        if (it.selectedUnit === 'sub' && it.subUnitFactor) {
          price = it.subUnitPrice && it.subUnitPrice > 0 ? it.subUnitPrice : basePrice * it.subUnitFactor;
        } else if (it.selectedUnit === 'major' && it.majorUnitFactor) {
          price = it.majorUnitPrice && it.majorUnitPrice > 0 ? it.majorUnitPrice : basePrice * it.majorUnitFactor;
        }
        const qty = it.quantity || 1;
        const disc = it.discount || 0;
        const scrap = it.scrapDiscount || 0;
        const taxPerc = it.tax_percent || 0;
        const lineSubtotal = qty * price;
        const afterDisc = Math.max(0, lineSubtotal - disc - scrap);
        const taxVal = Number(((afterDisc * taxPerc) / 100).toFixed(2));
        return {
          ...it,
          unit_price: price,
          tax: taxVal,
          total: Number((afterDisc + taxVal).toFixed(2)),
        };
      })
    );
    showNotice(`تم تطبيق مستوى السعر (${newTier === 'retail' ? 'تجزئة' : newTier === 'half_wholesale' ? 'نصف جملة' : newTier === 'wholesale' ? 'جملة' : 'VIP'})`);
  };

  // Recalculate single item line
  const updateItem = (index: number, patch: Partial<InvoiceLineItem>) => {
    const updated = [...items];
    const current = { ...updated[index], ...patch };

    const qty = Math.max(0, current.quantity || 0);
    const price = Math.max(0, current.unit_price || 0);
    const disc = Math.max(0, current.discount || 0);
    const scrap = Math.max(0, current.scrapDiscount || 0);
    const taxPerc = Math.max(0, current.tax_percent || 0);

    const lineSubtotal = qty * price;
    const baseAfterDiscount = Math.max(0, lineSubtotal - disc - scrap);
    const taxVal = Number(((baseAfterDiscount * taxPerc) / 100).toFixed(2));
    const lineTotal = Number((baseAfterDiscount + taxVal).toFixed(2));

    current.tax = taxVal;
    current.total = lineTotal;

    updated[index] = current;
    setItems(updated);

    // If Cash / Bank / Wallet and was fully paid, update paid amount to match new grand total
    if (paymentMethod !== 'CREDIT' && paidAmount === grandTotal) {
      const newSubtotal = updated.reduce((acc, it) => acc + (it.quantity || 0) * (it.unit_price || 0), 0);
      const newDiscount = updated.reduce((acc, it) => acc + (it.discount || 0) + (it.scrapDiscount || 0), 0);
      const newTax = updated.reduce((acc, it) => acc + (it.tax || 0), 0);
      const newGrand = Number((newSubtotal - newDiscount + newTax).toFixed(2));
      setPaidAmount(newGrand);
    }
  };

  // Update item unit (Base / Sub / Major)
  const handleUpdateLineUnit = (index: number, unitType: 'base' | 'sub' | 'major') => {
    const item = items[index];
    if (!item) return;
    const prod = productList.find((p) => p.id === item.product_id);
    const basePrice = prod ? getProductPriceForTier(prod, selectedPriceTier) : (item.unit_price || 0);

    let newUnit = item.baseUnitName || 'حبة';
    let newFactor = 1;
    let newPrice = basePrice;

    if (unitType === 'sub' && item.subUnitName) {
      newUnit = item.subUnitName;
      newFactor = item.subUnitFactor || 1;
      newPrice = item.subUnitPrice && item.subUnitPrice > 0 ? item.subUnitPrice : basePrice * newFactor;
    } else if (unitType === 'major' && item.majorUnitName) {
      newUnit = item.majorUnitName;
      newFactor = item.majorUnitFactor || 1;
      newPrice = item.majorUnitPrice && item.majorUnitPrice > 0 ? item.majorUnitPrice : basePrice * newFactor;
    }

    updateItem(index, {
      selectedUnit: unitType,
      unit: newUnit,
      unitFactor: newFactor,
      unit_price: newPrice,
    });
  };

  // Product selection handler
  const handleProductSelect = (index: number, prodId: string) => {
    if (!prodId) {
      updateItem(index, {
        product_id: '',
        name: '',
        sku: '',
        unit: 'حبة',
        unit_price: 0,
        current_stock: undefined,
        is_manual: true,
        selectedUnit: 'base',
        unitFactor: 1,
        activityType: undefined,
        serialNumber: undefined,
        warrantyMonths: undefined,
        warrantyEndDate: undefined,
        scrapDiscount: undefined,
      });
      return;
    }

    const prod = productList.find((p) => p.id === prodId);
    if (prod) {
      const price = getProductPriceForTier(prod, selectedPriceTier);
      const isBattery = prod.activityType === 'battery';
      const warrantyMonths = Number(prod.warrantyMonths || 12);

      updateItem(index, {
        product_id: prod.id,
        name: prod.name,
        sku: prod.sku || '',
        unit: prod.baseUnitName || prod.unit || 'حبة',
        baseUnitName: prod.baseUnitName || prod.unit || 'حبة',
        subUnitName: prod.subUnitName,
        subUnitFactor: Number(prod.subUnitFactor || 1),
        subUnitPrice: Number(prod.subUnitPrice || 0),
        majorUnitName: prod.majorUnitName,
        majorUnitFactor: Number(prod.majorUnitFactor || 1),
        majorUnitPrice: Number(prod.majorUnitPrice || 0),
        selectedUnit: 'base',
        unitFactor: 1,
        unit_price: price,
        current_stock: parseFloat(prod.current_stock || '0'),
        is_manual: false,
        activityType: prod.activityType,
        itemCode: prod.itemCode || prod.sku,
        partNumber: prod.partNumber,
        serialNumber: isBattery ? '' : undefined,
        warrantyMonths: isBattery || prod.activityType === 'tire' ? (prod.warrantyMonths || 12) : undefined,
        warrantyEndDate: isBattery || prod.activityType === 'tire' ? calculateWarrantyEndDate(Number(prod.warrantyMonths || 12)) : undefined,
        scrapDiscount: 0,
        tireSize: prod.tireSize,
        tireProductionDot: prod.tireProductionDot,
        tirePlyOrigin: prod.tirePlyOrigin,
      });
    }
  };

  // Quick Barcode / Instant Search Add Product
  const handleQuickAddProduct = (prod: any) => {
    if (!prod) return;

    // Check if product is already in the list
    const existingIndex = items.findIndex((it) => it.product_id === prod.id && it.selectedUnit === 'base');
    if (existingIndex >= 0) {
      const currentQty = items[existingIndex].quantity || 1;
      updateItem(existingIndex, { quantity: currentQty + 1 });
      showNotice(`تمت زيادة كمية "${prod.name}" إلى ${currentQty + 1} ${items[existingIndex].unit}`);
    } else {
      const price = getProductPriceForTier(prod, selectedPriceTier);
      const isBattery = prod.activityType === 'battery';
      const isTire = prod.activityType === 'tire';
      const warrantyMonths = Number(prod.warrantyMonths || 12);
      const isFirstRowEmpty = items.length === 1 && !items[0].product_id && !items[0].name && items[0].unit_price === 0;

      const newItem: InvoiceLineItem = {
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        product_id: prod.id,
        name: prod.name,
        sku: prod.sku || '',
        itemCode: prod.itemCode || prod.sku,
        partNumber: prod.partNumber,
        unit: prod.baseUnitName || prod.unit || 'حبة',
        baseUnitName: prod.baseUnitName || prod.unit || 'حبة',
        subUnitName: prod.subUnitName,
        subUnitFactor: Number(prod.subUnitFactor || 1),
        subUnitPrice: Number(prod.subUnitPrice || 0),
        majorUnitName: prod.majorUnitName,
        majorUnitFactor: Number(prod.majorUnitFactor || 1),
        majorUnitPrice: Number(prod.majorUnitPrice || 0),
        selectedUnit: 'base',
        unitFactor: 1,
        quantity: 1,
        unit_price: price,
        discount: 0,
        tax_percent: 0,
        tax: 0,
        total: price,
        current_stock: parseFloat(prod.current_stock || '0'),
        is_manual: false,
        activityType: prod.activityType,
        serialNumber: isBattery ? '' : undefined,
        warrantyMonths: isBattery || isTire ? warrantyMonths : undefined,
        warrantyEndDate: isBattery || isTire ? calculateWarrantyEndDate(warrantyMonths) : undefined,
        scrapDiscount: 0,
        tireSize: prod.tireSize,
        tireProductionDot: prod.tireProductionDot,
        tirePlyOrigin: prod.tirePlyOrigin,
      };

      if (isFirstRowEmpty) {
        setItems([newItem]);
      } else {
        setItems([...items, newItem]);
      }
      showNotice(`تمت إضافة "${prod.name}" بنجاح`);
    }

    setSearchQuery('');
    setIsSearchOpen(false);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const addItemRow = () => {
    setItems([
      ...items,
      {
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        product_id: '',
        name: '',
        unit: 'حبة',
        quantity: 1,
        unit_price: 0,
        discount: 0,
        tax_percent: 0,
        tax: 0,
        total: 0,
        is_manual: false,
      },
    ]);
  };

  const duplicateItemRow = (index: number) => {
    const original = items[index];
    setItems([
      ...items,
      {
        ...original,
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) {
      setItems([
        {
          id: `item-${Date.now()}`,
          product_id: '',
          name: '',
          unit: 'حبة',
          quantity: 1,
          unit_price: 0,
          discount: 0,
          tax_percent: 0,
          tax: 0,
          total: 0,
          is_manual: false,
        },
      ]);
      return;
    }
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
  };

  // Filtered search results for barcode / quick search
  const searchResults = searchQuery.trim()
    ? productList.filter((p) => {
        const query = searchQuery.toLowerCase().trim();
        return (
          p.name?.toLowerCase().includes(query) ||
          p.sku?.toLowerCase().includes(query) ||
          p.barcode?.toLowerCase().includes(query)
        );
      })
    : [];

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResults.length > 0) {
        handleQuickAddProduct(searchResults[0]);
      } else if (searchQuery.trim()) {
        // Add as quick manual item
        setItems([
          ...items,
          {
            id: `item-${Date.now()}`,
            product_id: '',
            name: searchQuery.trim(),
            unit: 'حبة',
            quantity: 1,
            unit_price: 0,
            discount: 0,
            tax_percent: 0,
            tax: 0,
            total: 0,
            is_manual: true,
          },
        ]);
        setSearchQuery('');
        setIsSearchOpen(false);
      }
    }
  };

  // Check for items priced below purchase cost or zero/empty price
  const belowCostItems = React.useMemo(() => {
    return items.filter((it) => {
      if (!it.product_id && !it.name?.trim()) return false;
      const prod = it.product_id ? productList.find((p) => p.id === it.product_id) : null;
      const baseCost = prod ? Number(prod.costPrice || prod.purchasePrice || prod.cost_price || (prod as any).purchase_price || 0) : 0;
      const unitCost = Number((baseCost * (it.unitFactor || 1)).toFixed(2));
      const qty = it.quantity || 1;
      const netUnitPrice = qty > 0 ? (qty * it.unit_price - (it.discount || 0) - (it.scrapDiscount || 0)) / qty : it.unit_price;
      if (unitCost > 0) {
        return Number(it.unit_price) <= 0 || Number(it.unit_price) < unitCost || netUnitPrice < unitCost;
      }
      return it.product_id ? Number(it.unit_price) <= 0 : false;
    });
  }, [items, productList]);

  const hasBelowCost = belowCostItems.length > 0;

  const handleSave = async (statusToSave: 'PENDING' | 'DRAFT', shouldPrint: boolean = false) => {
    if (!selectedCustomerId) {
      setError('يرجى اختيار العميل أولاً لإصدار الفاتورة');
      return;
    }

    const validItems = items.filter((it) => (it.product_id || it.name?.trim()) && it.quantity > 0);
    if (validItems.length === 0) {
      setError('يجب إدخال صنف واحد على الأقل بكمية صحيحة');
      return;
    }

    if (hasBelowCost) {
      const names = belowCostItems.map((it) => it.name || it.itemCode || 'صنف').join('، ');
      setError(`⛔ تنبيه محاسبي: لا يمكن إتمام البيع بأقل من سعر الشراء للأصناف التالية: (${names}). يرجى رفع سعر البيع ليغطي التكلفة.`);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Construct payment method notes / metadata
      let paymentNotes = '';
      if (paymentMethod === 'BANK') {
        paymentNotes = [bankName ? `بنك: ${bankName}` : '', bankRefNo ? `مرجع: ${bankRefNo}` : '']
          .filter(Boolean)
          .join(' - ');
      } else if (paymentMethod === 'WALLET') {
        paymentNotes = [
          walletProvider ? `محفظة: ${walletProvider}` : '',
          walletTxNo ? `رقم التحويل: ${walletTxNo}` : '',
        ]
          .filter(Boolean)
          .join(' - ');
      } else if (paymentMethod === 'CREDIT') {
        paymentNotes = 'بيع بالآجل - قيدت كذمة على حساب العميل';
      }

      const combinedNotes = [notes, paymentNotes].filter(Boolean).join(' | ');

      const payload = {
        customer_id: selectedCustomerId,
        invoice_number: invoiceNumber.trim() ? toEnglishDigits(invoiceNumber.trim()) : undefined,
        invoice_date: invoiceDate,
        due_date: dueDate || undefined,
        currency,
        exchange_rate: exchangeRate,
        status: statusToSave,
        notes: combinedNotes,
        salesperson_name: salespersonName,
        branch_name: branchName,
        paid_amount: paidAmount,
        payment_method: paymentMethod,
        items: validItems.map((it) => ({
          product_id: it.product_id || null,
          name: it.name || 'صنف مبيعات',
          unit: it.unit || 'حبة',
          unitFactor: it.unitFactor || 1,
          conversionFactor: it.unitFactor || 1,
          totalBaseQuantityDeducted: (it.quantity || 1) * (it.unitFactor || 1),
          quantity: it.quantity,
          unit_price: it.unit_price,
          discount: it.discount,
          scrapDiscount: it.scrapDiscount || 0,
          serialNumber: it.serialNumber,
          warrantyEndDate: it.warrantyEndDate,
          warrantyMonths: it.warrantyMonths,
          tax: it.tax,
        })),
      };

      const res = await api.createInvoice(payload);

      if (res.success && res.data) {
        // Apply real-time inventory deduction and sales tracking sync
        try {
          applyStockMovementSync(
            validItems.map((it) => ({
              productId: it.product_id,
              sku: it.sku,
              name: it.name,
              quantity: it.quantity,
              unit: it.unit,
              unitFactor: it.unitFactor || 1,
              unitPrice: it.unit_price,
              total: it.total,
            })),
            {
              type: 'sale',
              referenceNumber: res.data.invoice_number || invoiceNumber,
              referenceId: res.data.id,
              customerOrSupplierName: selectedCustomer?.name || 'العميل',
              date: invoiceDate,
              notes: combinedNotes,
            }
          );
        } catch (stockErr) {
          console.error('Failed to sync stock deduction:', stockErr);
        }

        if (shouldPrint) {
          // Print invoice preview with unit, serial & scrap info
          printInvoiceDocument({
            companyName: 'المؤسسة التجارية',
            invoiceType: 'SALES',
            invoiceNumber: res.data.invoice_number || invoiceNumber,
            date: invoiceDate,
            currency: getActiveCurrencySymbol(currency),
            dueDate: dueDate || undefined,
            status: paidAmount >= grandTotal ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'PENDING',
            partyName: selectedCustomer?.name || 'العميل',
            partyPhone: selectedCustomer?.phone,
            partyAddress: selectedCustomer?.address,
            items: validItems.map((it) => {
              let title = it.name || 'صنف مبيعات';
              if (it.unit && it.unit !== 'حبة') title += ` (${it.unit})`;
              if (it.serialNumber) title += ` [سيريال: ${it.serialNumber}] (ضمان حتى: ${it.warrantyEndDate || ''})`;
              if (Number(it.scrapDiscount) > 0) title += ` [خصم رجيع: -${it.scrapDiscount}]`;
              return {
                name: title,
                sku: it.sku,
                quantity: it.quantity,
                unitPrice: it.unit_price,
                discount: (it.discount || 0) + (it.scrapDiscount || 0),
                tax: it.tax,
                total: it.total,
              };
            }),
            subtotal,
            discount: totalDiscount,
            tax: totalTax,
            total: grandTotal,
            paidAmount,
            remainingAmount: remainingDue,
            notes: combinedNotes,
          });
        }
        onSuccess(res.data);
      } else {
        setError(res.error?.message || 'فشل حفظ وإنشاء الفاتورة');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16" id="sales-invoice-create-view">
      {/* Top Bar Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors flex items-center justify-center border border-slate-700/60"
            title="الرجوع للقائمة"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-500" />
              إنشاء فاتورة مبيعات جديدة
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              تسجيل سريع للمبيعات، خيارات الدفع الفوري والآجل، وخصم المخزون والقيود المحاسبية التلقائية
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <ModuleSettingsModal module="invoices" buttonLabel="⚙️ إعدادات القسم" />

          <button
            type="button"
            onClick={() => handleSave('DRAFT')}
            disabled={loading}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-xl text-xs sm:text-sm font-medium transition-colors border border-slate-700"
          >
            حفظ كمسودة
          </button>

          <button
            type="button"
            onClick={() => handleSave('PENDING', true)}
            disabled={loading}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-blue-400 border border-blue-500/30 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors"
          >
            <Printer className="w-4 h-4" />
            حفظ وطباعة
          </button>

          <button
            type="button"
            onClick={() => handleSave('PENDING')}
            disabled={loading}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري الحفظ والتأكيد...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                تأكيد واعتماد الفاتورة
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-sm flex items-center gap-3 animate-shake">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {quickNotice && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4" />
          <span>{quickNotice}</span>
        </div>
      )}

      {hasBelowCost && (
        <div className="p-4 bg-rose-500/15 border border-rose-500/40 rounded-2xl text-rose-300 text-sm font-bold flex items-center gap-3 shadow-lg shadow-rose-950/20 animate-pulse">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>⛔ تنبيه محاسبي: يوجد صنف مسعّر بأقل من سعر الشراء! لا يمكن إتمام البيع بخسارة حتى يتم تعديل السعر.</span>
        </div>
      )}

      {/* Price Tier Selector Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-sm flex items-center gap-2 overflow-x-auto">
        <span className="text-xs font-bold text-slate-400 px-2 shrink-0 flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-blue-400" />
          مستوى تسعير الفاتورة:
        </span>
        {[
          { id: 'retail', label: 'تجزئة (Retail)', icon: '🛍️' },
          { id: 'half_wholesale', label: 'نصف جملة', icon: '📦' },
          { id: 'wholesale', label: 'جملة (Wholesale)', icon: '🏬' },
          { id: 'vip', label: 'VIP عملاء كبار', icon: '⭐' },
        ].map((tier) => (
          <button
            key={tier.id}
            type="button"
            onClick={() => handlePriceTierChange(tier.id as PriceTier)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              selectedPriceTier === tier.id
                ? 'bg-blue-600 text-white shadow-md shadow-blue-950/40 border border-blue-400/40'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <span>{tier.icon}</span>
            <span>{tier.label}</span>
          </button>
        ))}
      </div>

      {/* Invoice Meta Section Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Customer & Account Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm">
              <User className="w-4 h-4" />
              <span>بيانات العميل والحساب</span>
            </div>
            <button
              type="button"
              onClick={selectQuickCashCustomer}
              className="text-[11px] px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg font-medium border border-blue-500/20 flex items-center gap-1 transition-colors"
              title="اختيار عميل نقدي سريع بضغطة واحدة"
            >
              <Zap className="w-3 h-3 text-amber-400" />
              عميل نقدي سريع
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              العميل <span className="text-rose-400">*</span>
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              required
            >
              <option value="">-- اختر العميل --</option>
              {customerList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ''}
                </option>
              ))}
            </select>
          </div>

          {selectedCustomer && (
            <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">الرصيد الحالي:</span>
                <span className="font-mono font-bold text-blue-400">
                  {formatAmount(selectedCustomer.current_balance || 0, selectedCustomer.currency || currency)}
                </span>
              </div>
              {selectedCustomer.credit_limit > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-400">الحد الائتماني:</span>
                  <span className="font-mono text-slate-300">
                    {formatAmount(selectedCustomer.credit_limit, selectedCustomer.currency || currency)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. Dates & Numbering Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm border-b border-slate-800 pb-2">
            <Calendar className="w-4 h-4" />
            <span>التواريخ والترقيم</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">تاريخ الفاتورة</label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">تاريخ الاستحقاق</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>


          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              رقم الفاتورة <span className="text-slate-500 text-[11px]">(تلقائي إن ترك فارغاً)</span>
            </label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(toEnglishDigits(e.target.value))}
              placeholder="مثال: INV-2026-0001"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>
        </div>

        {/* 3. Currency & Salesperson Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm border-b border-slate-800 pb-2">
            <DollarSign className="w-4 h-4" />
            <span>العملة ومندوب المبيعات</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">العملة</label>
              <select
                value={currency}
                onChange={(e) => handleCurrencyChange(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="YER">ريال يمني (YER)</option>
                <option value="SAR">ريال سعودي (SAR)</option>
                <option value="USD">دولار أمريكي (USD)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                <span>سعر التحويل / الصرف</span>
                <span className="text-[10px] text-blue-400 font-mono">0-9 EN</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                dir="ltr"
                lang="en"
                value={exchangeRate}
                onChange={(e) => {
                  const sanitized = toEnglishDigits(e.target.value).replace(/[^0-9.]/g, '');
                  setExchangeRate(parseEnglishNumber(sanitized, 1.0));
                }}
                disabled={currency === 'YER'}
                className="w-full bg-slate-800 disabled:opacity-50 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono text-left"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">مندوب / بائع</label>
              <input
                type="text"
                value={salespersonName}
                onChange={(e) => setSalespersonName(e.target.value)}
                placeholder="اسم البائع"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">الفرع</label>
              <input
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="الفرع الرئيسي"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Lightning Fast Data-Entry Bar & Barcode Scanner */}
      <div className="bg-gradient-to-r from-blue-950/40 via-slate-900 to-indigo-950/40 border border-blue-500/20 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
            <Barcode className="w-5 h-5 text-blue-400" />
            <span>البحث السريع وإضافة الأصناف بالباركود أو الاسم</span>
          </div>
          <span className="text-xs text-slate-400">
            اضغط <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] text-blue-300 font-mono">Enter</kbd> للإضافة الفورية
          </span>
        </div>

        <div className="relative">
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(toEnglishDigits(e.target.value));
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              onKeyDown={handleSearchKeyDown}
              placeholder="🔍 ابحث باسم الصنف أو امسح الباركود (Barcode) أو اكتب الرمز..."
              className="w-full bg-slate-950/80 border border-slate-700 hover:border-blue-500/50 focus:border-blue-500 rounded-xl pr-11 pl-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none transition-all"
            />
          </div>

          {/* Instant Search Results Dropdown */}
          {isSearchOpen && searchResults.length > 0 && (
            <div className="absolute z-30 left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-64 overflow-y-auto divide-y divide-slate-800">
              {searchResults.slice(0, 8).map((prod) => {
                const stock = parseFloat(prod.current_stock || '0');
                const price = parseFloat(prod.selling_price || '0');
                return (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => handleQuickAddProduct(prod)}
                    className="w-full text-right p-3 hover:bg-blue-600/10 flex items-center justify-between transition-colors group"
                  >
                    <div>
                      <div className="font-semibold text-sm text-slate-100 group-hover:text-blue-400 flex items-center gap-2">
                        {prod.name}
                        {prod.sku && (
                          <span className="text-[11px] text-slate-400 font-mono font-normal">
                            [{prod.sku}]
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-3 mt-0.5">
                        <span>الوحدة: <strong className="text-slate-300">{prod.unit || 'حبة'}</strong></span>
                        <span>المخزون: <strong className="font-mono text-slate-300">{formatNumber(stock)}</strong></span>
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="font-mono font-bold text-sm text-emerald-400">
                        {formatAmount(price, currency)}
                      </div>
                      <span className="text-[10px] text-blue-400 flex items-center justify-end gap-1 mt-0.5">
                        <Plus className="w-3 h-3" /> إضافة للفاتورة
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Popular / Fast Product Quick Chips */}
        {productList.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-0.5 no-scrollbar">
            <span className="text-[11px] text-slate-400 whitespace-nowrap flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              أصناف سريعة:
            </span>
            {productList.slice(0, 6).map((prod) => (
              <button
                key={prod.id}
                type="button"
                onClick={() => handleQuickAddProduct(prod)}
                className="px-2.5 py-1 bg-slate-800/80 hover:bg-blue-600/20 text-slate-300 hover:text-blue-300 border border-slate-700 hover:border-blue-500/40 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 flex-shrink-0"
              >
                <span>{prod.name}</span>
                <span className="font-mono text-[10px] text-emerald-400">
                  {formatNumber(parseFloat(prod.selling_price || '0'))}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Invoice Line Items Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-white text-base">جدول بنود وأصناف الفاتورة</h3>
          </div>
          <button
            type="button"
            onClick={addItemRow}
            className="px-3.5 py-1.5 bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600 hover:text-white text-blue-400 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            إضافة بند جديد
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase">
              <tr>
                <th className="py-3 px-3 w-10 text-center">#</th>
                <th className="py-3 px-2 w-28 text-center">رقم الصنف/القطعة</th>
                <th className="py-3 px-3 min-w-[200px]">المنتج من المخزن / الصنف</th>
                <th className="py-3 px-3 min-w-[130px]">الوصف اليدوي</th>
                <th className="py-3 px-3 w-28 text-center">الوحدة</th>
                <th className="py-3 px-3 w-24 text-center">الكمية</th>
                <th className="py-3 px-3 w-32 text-left">سعر الوحدة</th>
                <th className="py-3 px-3 w-24 text-left">خصم</th>
                <th className="py-3 px-3 w-20 text-center">ضريبة %</th>
                <th className="py-3 px-3 w-32 text-left">الإجمالي</th>
                <th className="py-3 px-3 w-20 text-center">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {items.map((it, idx) => {
                const isOverStock =
                  it.product_id &&
                  it.current_stock !== undefined &&
                  it.quantity > it.current_stock;

                return (
                  <React.Fragment key={it.id}>
                    <tr className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-3 text-center text-slate-500 text-xs font-mono">
                        {idx + 1}
                      </td>

                      {/* Item Code / Part Number */}
                      <td className="py-2.5 px-2 text-center">
                        <span className="font-mono text-xs font-bold text-blue-400 bg-slate-950/70 px-2 py-1 rounded-md border border-slate-800 inline-block">
                          {it.itemCode || it.partNumber || it.sku || '-'}
                        </span>
                      </td>

                      {/* Catalog Product Dropdown */}
                      <td className="py-2.5 px-3">
                        <select
                          value={it.product_id || ''}
                          onChange={(e) => handleProductSelect(idx, e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                        >
                          <option value="">-- أو صنف يدوي غير مسجل --</option>
                          {productList.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} {p.itemCode ? `[${p.itemCode}]` : p.sku ? `[${p.sku}]` : ''} ({formatNumber(p.current_stock ?? 0)} {p.unit || 'حبة'})
                            </option>
                          ))}
                        </select>
                        {it.product_id && (
                          <div className="flex items-center gap-2 mt-1 text-[11px]">
                            <span className="text-slate-400">
                              المخزون: <span className="font-mono text-slate-200">{formatNumber(it.current_stock ?? 0)}</span>
                            </span>
                            {isOverStock && (
                              <span className="text-rose-400 flex items-center gap-0.5">
                                <AlertTriangle className="w-3 h-3" /> الكمية تتجاوز الرصيد
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Custom Name / Description */}
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={it.name || ''}
                          onChange={(e) => updateItem(idx, { name: e.target.value })}
                          placeholder="اسم الصنف / البيان"
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                        />
                      </td>

                      {/* Unit with Multi-UOM Presets */}
                      <td className="py-2.5 px-3">
                        <div className="space-y-1">
                          {it.product_id ? (
                            <select
                              value={it.selectedUnit || 'base'}
                              onChange={(e) => handleUpdateLineUnit(idx, e.target.value as any)}
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 text-center font-bold"
                            >
                              <option value="base">{it.baseUnitName || it.unit || 'حبة'} (أساسي)</option>
                              {it.subUnitName && (
                                <option value="sub">{it.subUnitName} ({it.subUnitFactor || 1}x)</option>
                              )}
                              {it.majorUnitName && (
                                <option value="major">{it.majorUnitName} ({it.majorUnitFactor || 1}x)</option>
                              )}
                            </select>
                          ) : (
                            <select
                              value={COMMON_UNITS.includes(it.unit) ? it.unit : 'أخرى'}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'أخرى') {
                                  updateItem(idx, { unit: 'أخرى', customUnit: it.unit || '' });
                                } else {
                                  updateItem(idx, { unit: val });
                                }
                              }}
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 text-center font-medium"
                            >
                              {COMMON_UNITS.map((u) => (
                                <option key={u} value={u}>
                                  {u}
                                </option>
                              ))}
                            </select>
                          )}
                          {(it.unit === 'أخرى' || !COMMON_UNITS.includes(it.unit)) && !it.product_id && (
                            <input
                              type="text"
                              value={it.customUnit !== undefined ? it.customUnit : it.unit}
                              onChange={(e) =>
                                updateItem(idx, { customUnit: e.target.value, unit: e.target.value || 'أخرى' })
                              }
                              placeholder="حدد الوحدة..."
                              className="w-full bg-slate-950 border border-slate-700 rounded-md px-1.5 py-1 text-[11px] text-center text-blue-300 focus:outline-none focus:border-blue-500"
                            />
                          )}
                        </div>
                      </td>

                      {/* Quantity (Resilient English Input) */}
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="text"
                          inputMode="decimal"
                          dir="ltr"
                          lang="en"
                          value={it.quantity}
                          onChange={(e) => updateItem(idx, { quantity: parseEnglishNumber(e.target.value, 0) })}
                          className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-center text-white focus:outline-none focus:border-blue-500 font-mono font-bold"
                        />
                      </td>

                      {/* Unit Price (Resilient English Input) */}
                      <td className="py-2.5 px-3">
                        {(() => {
                          const prod = it.product_id ? productList.find((p) => p.id === it.product_id) : null;
                          const baseCost = prod ? Number(prod.costPrice || prod.purchasePrice || prod.cost_price || (prod as any).purchase_price || 0) : 0;
                          const unitCostPrice = Number((baseCost * (it.unitFactor || 1)).toFixed(2));
                          const qty = it.quantity || 1;
                          const netUnitPrice = qty > 0 ? (qty * it.unit_price - (it.discount || 0) - (it.scrapDiscount || 0)) / qty : it.unit_price;
                          const isRowBelowCost = (unitCostPrice > 0 && (Number(it.unit_price) < unitCostPrice || netUnitPrice < unitCostPrice)) || (it.product_id && Number(it.unit_price) <= 0);

                          return (
                            <div className="space-y-1">
                              <div className="relative">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  dir="ltr"
                                  lang="en"
                                  value={it.unit_price === 0 ? '' : it.unit_price}
                                  onChange={(e) => updateItem(idx, { unit_price: parseEnglishNumber(e.target.value, 0) })}
                                  placeholder={unitCostPrice > 0 ? String(unitCostPrice) : '0'}
                                  className={`w-full bg-slate-800 border rounded-lg px-2 py-1.5 text-xs text-left font-mono focus:outline-none placeholder:text-slate-400/30 dark:placeholder:text-slate-500/30 placeholder:font-normal select-none ${
                                    isRowBelowCost
                                      ? 'border-rose-500 bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/40'
                                      : 'border-slate-700 text-white focus:border-blue-500'
                                  }`}
                                />
                              </div>

                              {/* Discrete Pro Cost Peek */}
                              {unitCostPrice > 0 && (
                                <div className="flex items-center justify-between text-[10px]">
                                  <span
                                    className="text-[10px] text-slate-400/25 hover:text-slate-400/75 transition-opacity cursor-help select-none group/cost inline-flex items-center"
                                    title={`سعر الشراء الفعلي: ${unitCostPrice}`}
                                  >
                                    <span className="group-hover/cost:hidden">ك: ••••</span>
                                    <span className="hidden group-hover/cost:inline font-mono">ك: {unitCostPrice}</span>
                                  </span>
                                </div>
                              )}

                              {/* Real-Time Row Warning Badge */}
                              {isRowBelowCost && (
                                <div className="text-[10px] text-rose-400 font-bold flex items-center gap-1 bg-rose-500/10 border border-rose-500/30 rounded-md px-1.5 py-0.5 leading-tight">
                                  <span>⚠️ تحذير: سعر البيع أقل من سعر الشراء!</span>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* Discount (Resilient English Input) */}
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          inputMode="decimal"
                          dir="ltr"
                          lang="en"
                          value={it.discount}
                          onChange={(e) => updateItem(idx, { discount: parseEnglishNumber(e.target.value, 0) })}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-left text-rose-400 focus:outline-none focus:border-blue-500 font-mono"
                        />
                      </td>

                      {/* Tax Percent */}
                      <td className="py-2.5 px-3 text-center">
                        <select
                          value={it.tax_percent}
                          onChange={(e) => updateItem(idx, { tax_percent: parseEnglishNumber(e.target.value, 0) })}
                          className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-1 py-1.5 text-xs text-center text-slate-300 focus:outline-none focus:border-blue-500 font-mono"
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="15">15%</option>
                        </select>
                      </td>

                      {/* Total */}
                      <td className="py-2.5 px-3 text-left font-mono font-bold text-white text-xs">
                        {formatAmount(it.total, currency)}
                      </td>

                      {/* Action buttons */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => duplicateItemRow(idx)}
                            className="p-1 text-slate-400 hover:text-slate-200 rounded transition-colors"
                            title="تكرار البند"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeItemRow(idx)}
                            className="p-1 text-rose-400/80 hover:text-rose-400 rounded transition-colors"
                            title="حذف البند"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Battery Spec & Inline Warranty & Scrap Discount Row */}
                    {it.activityType === 'battery' && (
                      <tr className="bg-amber-950/20 border-b border-amber-900/40">
                        <td colSpan={11} className="px-4 py-2.5">
                          <div className="flex items-center gap-4 flex-wrap text-xs">
                            <span className="font-bold text-amber-400 flex items-center gap-1.5 shrink-0">
                              <Zap className="w-4 h-4 text-amber-400" />
                              بيانات ضمان وسيريال البطارية:
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-slate-400">الرقم التسلسلي (Serial No):</span>
                              <input
                                type="text"
                                placeholder="SN-BAT-..."
                                value={it.serialNumber || ''}
                                onChange={(e) => updateItem(idx, { serialNumber: e.target.value })}
                                className="bg-slate-900 border border-amber-500/40 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                              />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-slate-400">نهاية الضمان:</span>
                              <input
                                type="date"
                                value={it.warrantyEndDate || ''}
                                onChange={(e) => updateItem(idx, { warrantyEndDate: e.target.value })}
                                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-amber-300 font-mono focus:outline-none"
                              />
                              <span className="text-[10px] text-slate-500 font-mono">({it.warrantyMonths || 12} شهر)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-slate-400">خصم استبدال رجيع قديم:</span>
                              <input
                                type="text"
                                inputMode="decimal"
                                dir="ltr"
                                lang="en"
                                placeholder="0.00"
                                value={it.scrapDiscount || ''}
                                onChange={(e) => updateItem(idx, { scrapDiscount: parseEnglishNumber(e.target.value, 0) })}
                                className="w-24 bg-slate-900 border border-emerald-500/40 rounded-lg px-2 py-1 text-xs text-emerald-400 font-mono font-bold focus:outline-none"
                              />
                              <span className="text-[10px] text-emerald-400">{currency}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Tires Spec (قسم الإطارات والكفرات) */}
                    {it.activityType === 'tire' && (
                      <tr className="bg-sky-950/20 border-b border-sky-900/40">
                        <td colSpan={11} className="px-4 py-2.5">
                          <div className="flex items-center gap-4 flex-wrap text-xs">
                            <span className="font-bold text-sky-400 flex items-center gap-1.5 shrink-0">
                              <span className="text-sm">🛞</span>
                              مواصفات وضمان الإطار:
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-slate-400">المقاس:</span>
                              <input
                                type="text"
                                placeholder="مثال: 205/55 R16"
                                value={it.tireSize || ''}
                                onChange={(e) => updateItem(idx, { tireSize: e.target.value })}
                                className="bg-slate-900 border border-sky-500/40 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-sky-400"
                              />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-slate-400">سنة والصنع (DOT):</span>
                              <input
                                type="text"
                                placeholder="مثال: 4025 (أسبوع 40 - 2025)"
                                value={it.tireProductionDot || ''}
                                onChange={(e) => updateItem(idx, { tireProductionDot: e.target.value })}
                                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-sky-200 font-mono focus:outline-none"
                              />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-slate-400">المنشأ / الغاط:</span>
                              <input
                                type="text"
                                placeholder="ياباني - 8PR"
                                value={it.tirePlyOrigin || ''}
                                onChange={(e) => updateItem(idx, { tirePlyOrigin: e.target.value })}
                                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none"
                              />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-slate-400">الضمان:</span>
                              <span className="text-sky-300 font-mono font-bold">{it.warrantyMonths || 12} شهر</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Method Selector (طريقة الدفع: نقد - تحويل بنكي - آجل - محفظة إلكترونية) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <CreditCard className="w-5 h-5 text-emerald-400" />
            <span>طريقة الدفع والسداد (Payment Method)</span>
          </div>
          <span className="text-xs text-slate-400">حدد طريقة السداد المناسبة للفاتورة</span>
        </div>

        {/* 4 Rich Payment Method Selection Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Cash (نقد) */}
          <button
            type="button"
            onClick={() => handlePaymentMethodChange('CASH')}
            className={`p-3.5 rounded-xl border text-right transition-all flex flex-col justify-between gap-2 ${
              paymentMethod === 'CASH'
                ? 'bg-emerald-500/15 border-emerald-500/60 ring-2 ring-emerald-500/20 text-white'
                : 'bg-slate-800/60 border-slate-700 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Banknote className="w-4 h-4" />
              </div>
              {paymentMethod === 'CASH' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">نقد (Cash)</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">سداد نقدي مباشر في الصندوق والخزينة</p>
            </div>
          </button>

          {/* 2. Bank Transfer (تحويل بنكي) */}
          <button
            type="button"
            onClick={() => handlePaymentMethodChange('BANK')}
            className={`p-3.5 rounded-xl border text-right transition-all flex flex-col justify-between gap-2 ${
              paymentMethod === 'BANK'
                ? 'bg-blue-500/15 border-blue-500/60 ring-2 ring-blue-500/20 text-white'
                : 'bg-slate-800/60 border-slate-700 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                <Landmark className="w-4 h-4" />
              </div>
              {paymentMethod === 'BANK' && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">تحويل بنكي (Bank Transfer)</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">إيداع أو حوالة مباشرة في الحساب البنكي</p>
            </div>
          </button>

          {/* 3. Credit (آجل) */}
          <button
            type="button"
            onClick={() => handlePaymentMethodChange('CREDIT')}
            className={`p-3.5 rounded-xl border text-right transition-all flex flex-col justify-between gap-2 ${
              paymentMethod === 'CREDIT'
                ? 'bg-amber-500/15 border-amber-500/60 ring-2 ring-amber-500/20 text-white'
                : 'bg-slate-800/60 border-slate-700 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                <Clock className="w-4 h-4" />
              </div>
              {paymentMethod === 'CREDIT' && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">آجل (Credit / ذمة)</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">تسجيل الفاتورة كذمة آجلة على حساب العميل</p>
            </div>
          </button>

          {/* 4. E-Wallet (محفظة إلكترونية) */}
          <button
            type="button"
            onClick={() => handlePaymentMethodChange('WALLET')}
            className={`p-3.5 rounded-xl border text-right transition-all flex flex-col justify-between gap-2 ${
              paymentMethod === 'WALLET'
                ? 'bg-purple-500/15 border-purple-500/60 ring-2 ring-purple-500/20 text-white'
                : 'bg-slate-800/60 border-slate-700 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                <Wallet className="w-4 h-4" />
              </div>
              {paymentMethod === 'WALLET' && <CheckCircle2 className="w-4 h-4 text-purple-400" />}
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">محفظة إلكترونية (E-Wallet)</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">الكريمي، ون كاش، فلوسك، جايبي، كاش، جوالي</p>
            </div>
          </button>
        </div>

        {/* Dynamic Context Fields based on Selected Payment Method */}
        {paymentMethod === 'BANK' && (
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
            <div className="text-xs font-semibold text-blue-400">تفاصيل التحويل البنكي:</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">اسم البنك / الحساب</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="مثال: بنك التضامن / بنك الكريمي"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">رقم الإشعار / الحوالة البنكية</label>
                <input
                  type="text"
                  value={bankRefNo}
                  onChange={(e) => setBankRefNo(toEnglishDigits(e.target.value))}
                  placeholder="رقم العملية البنكية"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {paymentMethod === 'WALLET' && (
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
            <div className="text-xs font-semibold text-purple-400">مزود المحفظة الإلكترونية:</div>
            <div className="flex items-center gap-2 flex-wrap">
              {WALLET_PRESETS.map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setWalletProvider(w)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    walletProvider === w
                      ? 'bg-purple-600/30 border-purple-500 text-purple-300'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs text-slate-400 mb-1">اسم المحفظة / الخدمة</label>
                <input
                  type="text"
                  value={walletProvider}
                  onChange={(e) => setWalletProvider(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">رقم الحوالة / العملية بالمحفظة</label>
                <input
                  type="text"
                  value={walletTxNo}
                  onChange={(e) => setWalletTxNo(toEnglishDigits(e.target.value))}
                  placeholder="مثال: TX-984210"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {paymentMethod === 'CREDIT' && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-center gap-2.5">
            <Clock className="w-4 h-4 flex-shrink-0 text-amber-400" />
            <span>
              فاتورة بالآجل: سيتم قيد إجمالي الفاتورة ({formatAmount(grandTotal, currency)}) كذمة وحساب مدين على العميل.
            </span>
          </div>
        )}
      </div>

      {/* Financial Summary & Payment Options Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Notes & Immediate Payment */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm">
              <DollarSign className="w-4 h-4" />
              <span>المبلغ المسدد والخيارات السريعة</span>
            </div>
            {/* Quick payment amount buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPaidAmount(grandTotal)}
                className="text-[11px] px-2 py-0.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 rounded font-medium border border-emerald-500/30"
              >
                100% مسدد
              </button>
              <button
                type="button"
                onClick={() => setPaidAmount(Number((grandTotal / 2).toFixed(2)))}
                className="text-[11px] px-2 py-0.5 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 rounded font-medium border border-blue-500/30"
              >
                50% دفعة
              </button>
              <button
                type="button"
                onClick={() => setPaidAmount(0)}
                className="text-[11px] px-2 py-0.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 rounded font-medium border border-amber-500/30"
              >
                آجل (0)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                المبلغ المسلم / المسدد فورا ({getActiveCurrencySymbol(currency)})
              </label>
              <input
                type="text"
                inputMode="decimal"
                dir="ltr"
                lang="en"
                value={paidAmount}
                onChange={(e) => setPaidAmount(parseEnglishNumber(e.target.value, 0))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-emerald-400 font-bold font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">نوع السداد المحدد</label>
              <div className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-semibold text-white flex items-center gap-2">
                {paymentMethod === 'CASH' && <><Banknote className="w-4 h-4 text-emerald-400" /> <span>نقد (الصندوق)</span></>}
                {paymentMethod === 'BANK' && <><Landmark className="w-4 h-4 text-blue-400" /> <span>تحويل بنكي</span></>}
                {paymentMethod === 'CREDIT' && <><Clock className="w-4 h-4 text-amber-400" /> <span>آجل بالكامل</span></>}
                {paymentMethod === 'WALLET' && <><Wallet className="w-4 h-4 text-purple-400" /> <span>محفظة إلكترونية</span></>}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">ملاحظات وشروط الفاتورة</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: البضاعة المباعة لا ترد بعد 3 أيام، الدفع خلال 14 يوما..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>
        </div>

        {/* Right: Grand Totals Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3.5">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm border-b border-slate-800 pb-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>الحسابات والإجمالي الختامي</span>
          </div>

          {hasBelowCost && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-bold flex items-center gap-2 animate-pulse shadow-md shadow-rose-950/20">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>⛔ تنبيه محاسبي: يوجد صنف مسعّر بأقل من سعر الشراء! لا يمكن إتمام البيع بخسارة حتى يتم تعديل السعر.</span>
            </div>
          )}

          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-slate-300">
              <span>المجموع الفرعي (Subtotal):</span>
              <span className="font-mono">{formatAmount(subtotal, currency)}</span>
            </div>

            <div className="flex justify-between text-rose-400">
              <span>إجمالي الخصم التجاري:</span>
              <span className="font-mono">-{formatAmount(totalDiscount, currency)}</span>
            </div>

            <div className="flex justify-between text-emerald-400">
              <span>ضريبة القيمة المضافة (VAT):</span>
              <span className="font-mono">+{formatAmount(totalTax, currency)}</span>
            </div>

            <div className="border-t border-slate-800 pt-2.5 flex justify-between text-base font-extrabold text-white">
              <span>الإجمالي النهائي (Grand Total):</span>
              <span className="font-mono text-xl text-blue-400">{formatAmount(grandTotal, currency)}</span>
            </div>

            {currency !== 'YER' && (
              <div className="flex justify-between text-xs text-amber-300 font-mono font-bold pt-1 border-t border-slate-800/60">
                <span>المعادل بالعملة الأساسية:</span>
                <span>≈ {formatNumber(grandTotal * (exchangeRate || 1))} {getActiveCurrencySymbol('YER')}</span>
              </div>
            )}

            <div className="flex justify-between text-xs text-emerald-400 pt-1">
              <span>المسلم / المسدد ({paymentMethod === 'CASH' ? 'نقداً' : paymentMethod === 'BANK' ? 'بنكي' : paymentMethod === 'WALLET' ? 'محفظة' : 'آجل'}):</span>
              <span className="font-mono font-bold">{formatAmount(paidAmount, currency)}</span>
            </div>

            <div className="flex justify-between text-sm font-bold text-amber-400 pt-1 border-t border-slate-800/80">
              <span>الرصيد المتبقي على العميل (الذمة):</span>
              <span className="font-mono text-base">{formatAmount(remainingDue, currency)}</span>
            </div>

            {paidAmount > grandTotal && (
              <div className="flex justify-between text-sm font-bold text-cyan-400 pt-1 bg-cyan-950/40 p-2 rounded-xl border border-cyan-800/40">
                <span>المتبقي للعميل (الباقي / الفكة):</span>
                <span className="font-mono text-base">{formatAmount(paidAmount - grandTotal, currency)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
