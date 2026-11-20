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
import { recordAutomaticTreasuryVoucher } from '../../../utils/treasuryVoucherHelper';
import { normalizeScannedBarcode, playBarcodeBeep, findProductByBarcode, attachGlobalBarcodeScannerListener, shouldProcessBarcodeScan } from '../../../utils/barcodeUtils';
import { formatProductStock } from '../../../utils/inventoryMath';
import { enqueueOutboxTransaction } from '../../../services/transactionalOutbox';
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
import { useAuth } from '../../../context/AuthContext';

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

  const { user } = useAuth();
  const loggedInSalesperson = (user?.full_name || (user as any)?.name || 'حميد وهاس').trim();

  // Form Header State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [receivedBy, setReceivedBy] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [currency, setCurrency] = useState(getActiveCurrencyCode());
  const [exchangeRate, setExchangeRate] = useState<number>(1.0);
  const [salespersonName, setSalespersonName] = useState(loggedInSalesperson);
  const [branchName, setBranchName] = useState('');
  const [notes, setNotes] = useState('');
  const [paidAmount, setPaidAmount] = useState<number>(0);

  useEffect(() => {
    if (loggedInSalesperson && (!salespersonName || salespersonName === 'الكاشير العام')) {
      setSalespersonName(loggedInSalesperson);
    }
  }, [loggedInSalesperson]);

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
  const isSubmittingInvoiceRef = useRef<boolean>(false);

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
      setCustomerName(cashCust.name || 'عميل نقدي');
      showNotice(`تم اختيار "${cashCust.name}" بنجاح`);
    } else if (customerList.length > 0) {
      setSelectedCustomerId(customerList[0].id);
      setCustomerName(customerList[0].name || 'عميل نقدي');
      showNotice(`تم اختيار العميل "${customerList[0].name}"`);
    } else {
      setSelectedCustomerId('cust-cash');
      setCustomerName('عميل نقدي');
      showNotice('تم اختيار "عميل نقدي"');
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
    return Number(prod.retailPrice ?? prod.retail_price ?? prod.sellingPrice ?? prod.selling_price ?? prod.price ?? 0);
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
  const handleQuickAddProduct = (prod: any, targetUnit: 'base' | 'sub' | 'major' = 'base') => {
    if (!prod) return;

    // Deduplication lock: prevent duplicate scan within 450ms
    const scanKey = prod.barcode || prod.subUnitBarcode || prod.majorUnitBarcode || prod.sku || prod.itemCode || prod.id;
    if (scanKey && !shouldProcessBarcodeScan(scanKey, 450)) {
      setSearchQuery('');
      if (searchInputRef.current) searchInputRef.current.value = '';
      setIsSearchOpen(false);
      return;
    }

    // Check if product is already in the list with same unit
    const existingIndex = items.findIndex((it) => it.product_id === prod.id && (it.selectedUnit || 'base') === targetUnit);
    if (existingIndex >= 0) {
      const currentQty = items[existingIndex].quantity || 1;
      updateItem(existingIndex, { quantity: currentQty + 1 });
      showNotice(`تمت زيادة كمية "${prod.name}" إلى ${currentQty + 1} ${items[existingIndex].unit}`);
    } else {
      const basePrice = getProductPriceForTier(prod, selectedPriceTier);
      let price = basePrice;
      let unitName = prod.baseUnitName || prod.unit || 'حبة';
      let unitFactor = 1;

      if (targetUnit === 'sub' && prod.subUnitName) {
        unitName = prod.subUnitName;
        unitFactor = Number(prod.subUnitFactor || 1);
        price = prod.subUnitPrice && prod.subUnitPrice > 0 ? prod.subUnitPrice : basePrice * unitFactor;
      } else if (targetUnit === 'major' && prod.majorUnitName) {
        unitName = prod.majorUnitName;
        unitFactor = Number(prod.majorUnitFactor || 1);
        price = prod.majorUnitPrice && prod.majorUnitPrice > 0 ? prod.majorUnitPrice : basePrice * unitFactor;
      }

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
        unit: unitName,
        baseUnitName: prod.baseUnitName || prod.unit || 'حبة',
        subUnitName: prod.subUnitName,
        subUnitFactor: Number(prod.subUnitFactor || 1),
        subUnitPrice: Number(prod.subUnitPrice || 0),
        majorUnitName: prod.majorUnitName,
        majorUnitFactor: Number(prod.majorUnitFactor || 1),
        majorUnitPrice: Number(prod.majorUnitPrice || 0),
        selectedUnit: targetUnit,
        unitFactor: unitFactor,
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
      searchInputRef.current.value = '';
      searchInputRef.current.focus();
    }
  };

  // 70ms Instant exact-match auto-add when typing or scanning into the search input
  // Automatically adds item to invoice without requiring Enter when exact barcode/code match is found
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 4) return;
    const timer = setTimeout(() => {
      const match = findProductByBarcode(productList, searchQuery);
      if (match) {
        const norm = normalizeScannedBarcode(searchQuery);
        if (!shouldProcessBarcodeScan(norm, 450)) {
          setSearchQuery('');
          if (searchInputRef.current) searchInputRef.current.value = '';
          setIsSearchOpen(false);
          return;
        }
        playBarcodeBeep('success');
        handleQuickAddProduct(match.product, match.unit);
      }
    }, 70);
    return () => clearTimeout(timer);
  }, [searchQuery, productList, selectedPriceTier, items]);

  // Global Hardware Barcode Scanner Listener
  // Intercepts rapid USB HID / Bluetooth scanner bursts and auto-submits on burst completion (<65ms + 80ms debounce) without requiring Enter!
  useEffect(() => {
    const cleanup = attachGlobalBarcodeScannerListener({
      minBarcodeLength: 2,
      burstMaxIntervalMs: 65,
      endDebounceMs: 80,
      onScan: (scanned) => {
        const match = findProductByBarcode(productList, scanned);
        if (match) {
          playBarcodeBeep('success');
          handleQuickAddProduct(match.product, match.unit);
        } else {
          playBarcodeBeep('warning');
          showNotice(`⚠️ الباركود غير مسجل في المخزون: ${scanned}`);
        }
      },
      shouldIgnore: () => {
        const activeEl = document.activeElement as HTMLElement | null;
        const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT');
        const isSearchInput = activeEl === searchInputRef.current;

        // Ignore if user is manually editing an operational number/price/qty/note input
        if (isInput && !isSearchInput) {
          const inputType = (activeEl as HTMLInputElement).type;
          const inputName = ((activeEl as HTMLInputElement).name || (activeEl as HTMLInputElement).id || '').toLowerCase();
          if (
            inputType === 'number' ||
            inputName.includes('qty') ||
            inputName.includes('quantity') ||
            inputName.includes('price') ||
            inputName.includes('disc') ||
            inputName.includes('tax') ||
            inputName.includes('note') ||
            inputName.includes('serial')
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
  }, [productList, selectedPriceTier, items]);

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
  const normalizedQuery = normalizeScannedBarcode(searchQuery);
  const searchResults = normalizedQuery.trim()
    ? productList.filter((p) => {
        const query = normalizedQuery.toLowerCase().trim();
        return (
          p.name?.toLowerCase().includes(query) ||
          (p.barcode && normalizeScannedBarcode(p.barcode).toLowerCase().includes(query)) ||
          (p.subUnitBarcode && normalizeScannedBarcode(p.subUnitBarcode).toLowerCase().includes(query)) ||
          (p.majorUnitBarcode && normalizeScannedBarcode(p.majorUnitBarcode).toLowerCase().includes(query)) ||
          (p.sku && normalizeScannedBarcode(p.sku).toLowerCase().includes(query)) ||
          (p.itemCode && normalizeScannedBarcode(p.itemCode).toLowerCase().includes(query)) ||
          (p.partNumber && normalizeScannedBarcode(p.partNumber).toLowerCase().includes(query))
        );
      })
    : [];

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const norm = normalizeScannedBarcode(searchQuery).trim();
      if (!norm) return;

      // 1. Direct match on barcode/SKU/Code via findProductByBarcode
      const match = findProductByBarcode(productList, norm);
      if (match) {
        playBarcodeBeep('success');
        handleQuickAddProduct(match.product, match.unit);
        return;
      }

      if (searchResults.length > 0) {
        playBarcodeBeep('success');
        handleQuickAddProduct(searchResults[0]);
      } else if (norm) {
        playBarcodeBeep('warning');
        // Add as quick manual item
        setItems([
          ...items,
          {
            id: `item-${Date.now()}`,
            product_id: '',
            name: norm,
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
      const unitCostPrice = Math.round(
        Number(prod?.costPrice || prod?.purchasePrice || prod?.cost_price || (prod as any)?.purchase_price || 0) *
          Number(it.unitFactor || 1)
      );
      const qty = it.quantity || 1;
      const netUnitPrice = qty > 0 ? (qty * it.unit_price - (it.discount || 0) - (it.scrapDiscount || 0)) / qty : it.unit_price;
      if (unitCostPrice > 0) {
        return Number(it.unit_price || 0) < unitCostPrice || netUnitPrice < unitCostPrice || Number(it.unit_price) <= 0;
      }
      return it.product_id ? Number(it.unit_price || 0) <= 0 : false;
    });
  }, [items, productList]);

  const hasBelowCost = belowCostItems.length > 0;

  const handleSave = async (statusToSave: 'PENDING' | 'DRAFT', shouldPrint: boolean = false) => {
    const rawPaidInput = Number(paidAmount ?? 0);
    let effectivePaid = 0;
    let effectiveRemaining = 0;
    if (paymentMethod === 'CREDIT') {
      effectivePaid = Math.max(0, Math.min(rawPaidInput, grandTotal));
      effectiveRemaining = Math.max(0, Number((grandTotal - effectivePaid).toFixed(2)));
    } else {
      // CASH, BANK, WALLET: allow full or partial payment; if user entered partial amount < grandTotal, remaining goes to customer account
      effectivePaid = Math.max(0, Math.min(rawPaidInput, grandTotal));
      effectiveRemaining = Math.max(0, Number((grandTotal - effectivePaid).toFixed(2)));
    }

    const rawCustomerName = (customerName || selectedCustomer?.name || '').trim();
    const isRegisteredCustomer = Boolean(
      (selectedCustomerId && selectedCustomerId !== 'cust-cash' && selectedCustomerId !== 'cust-direct') ||
      (rawCustomerName && rawCustomerName !== 'عميل نقدي')
    );

    if (paymentMethod === 'CREDIT' || effectiveRemaining > 0) {
      if (!isRegisteredCustomer) {
        setError('يرجى اختيار عميل مسجل لترحيل المبلغ المتبقي على حسابه، أو تسديد كامل مبلغ الفاتورة');
        return;
      }
    }

    const effectiveCustomerName = rawCustomerName || (paymentMethod === 'CREDIT' || effectiveRemaining > 0 ? '' : 'عميل نقدي');

    if (!selectedCustomerId && !effectiveCustomerName) {
      setError('يرجى اختيار أو كتابة اسم العميل أولاً لإصدار الفاتورة');
      return;
    }

    const validItems = items.filter((it) => (it.product_id || it.name?.trim()) && it.quantity > 0);
    if (validItems.length === 0) {
      setError('يجب إدخال صنف واحد على الأقل بكمية صحيحة');
      return;
    }

    if (hasBelowCost) {
      const names = belowCostItems.map((it) => it.name || it.itemCode || 'صنف').join('، ');
      setError(`⛔ تنبيه رقابي: لا يمكن إتمام البيع بسعر أقل من سعر الشراء لمنع الخسائر! الأصناف: (${names}). يرجى رفع سعر البيع ليغطي التكلفة.`);
      return;
    }

    if (isSubmittingInvoiceRef.current) return;
    isSubmittingInvoiceRef.current = true;

    try {
      setLoading(true);
      setError(null);

      const computedStatus = effectiveRemaining <= 0 ? 'PAID' : (effectivePaid > 0 ? 'PARTIAL' : 'ISSUED');
      const effectiveSalesperson = (salespersonName || loggedInSalesperson || 'حميد وهاس').trim();

      const canonicalInvNum = invoiceNumber.trim() ? toEnglishDigits(invoiceNumber.trim()) : `INV-${Date.now().toString().slice(-6)}`;
      const targetCust = customerList.find((c: any) => c.id === selectedCustomerId || c.name?.trim() === effectiveCustomerName.trim());
      const prevBal = targetCust ? Number(targetCust.current_balance ?? targetCust.balance ?? 0) : 0;
      const newBal = prevBal + effectiveRemaining;

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
        paymentNotes = `بيع بالآجل - قيدت كذمة على حساب العميل (${effectiveCustomerName})`;
      }

      const combinedNotes = [notes, paymentNotes].filter(Boolean).join(' | ');

      const payload = {
        id: canonicalInvNum,
        invoice_number: canonicalInvNum,
        invoiceNumber: canonicalInvNum,
        customer_id: selectedCustomerId || 'cust-direct',
        customer: effectiveCustomerName,
        customer_name: effectiveCustomerName,
        customerName: effectiveCustomerName,
        clientName: effectiveCustomerName,
        receivedBy: receivedBy.trim() || undefined,
        received_by: receivedBy.trim() || undefined,
        previousBalance: prevBal,
        previous_balance: prevBal,
        currentInvoiceAmount: grandTotal,
        newTotalBalance: newBal,
        newBalance: newBal,
        customer_balance: newBal,
        invoice_date: invoiceDate,
        due_date: dueDate || undefined,
        currency,
        exchange_rate: exchangeRate,
        status: statusToSave === 'DRAFT' ? 'DRAFT' : computedStatus,
        notes: combinedNotes,
        salesperson: effectiveSalesperson,
        salesperson_name: effectiveSalesperson,
        salespersonName: effectiveSalesperson,
        cashier_name: effectiveSalesperson,
        cashierName: effectiveSalesperson,
        createdBy: effectiveSalesperson,
        branch_name: branchName || 'الفرع الرئيسي',
        total: grandTotal,
        totalAmount: grandTotal,
        grandTotal: grandTotal,
        netTotal: grandTotal,
        total_amount: grandTotal,
        amount: grandTotal,
        paid_amount: effectivePaid,
        paidAmount: effectivePaid,
        amountPaid: effectivePaid,
        paid: effectivePaid,
        remaining_amount: effectiveRemaining,
        remainingAmount: effectiveRemaining,
        remainingBalance: effectiveRemaining,
        remaining: effectiveRemaining,
        balanceDue: effectiveRemaining,
        payment_method: paymentMethod,
        items: validItems.map((it) => {
          const prod: any = productList.find((p) => p.id === (it.product_id || (it as any).productId)) || {};
          return {
            product_id: it.product_id || (it as any).productId || prod.id || null,
            productId: it.product_id || (it as any).productId || prod.id || null,
            name: it.name || prod.name || 'صنف مبيعات',
            item_name: it.name || prod.name || 'صنف مبيعات',
            product_name: it.name || prod.name || 'صنف مبيعات',
            sku: it.sku || prod.sku || '',
            barcode: (it as any).barcode || prod.barcode || it.sku || prod.sku || '',
            code: (it as any).code || (it as any).itemCode || prod.code || prod.item_code || '',
            itemCode: (it as any).itemCode || (it as any).code || prod.code || '',
            item_code: (it as any).itemCode || (it as any).code || prod.code || '',
            itemNumber: (it as any).itemNumber || prod.itemNumber || prod.item_number || '',
            partNumber: (it as any).partNumber || prod.part_number || prod.partNumber || '',
            part_number: (it as any).partNumber || prod.part_number || prod.partNumber || '',
            serialNumber: it.serialNumber || (it as any).serial_number || '',
            serial_number: it.serialNumber || (it as any).serial_number || '',
            battery_serial_number: (it as any).battery_serial_number || it.serialNumber || '',
            tireSize: (it as any).tireSize || prod.tireSize || prod.tire_size || '',
            tire_size: (it as any).tireSize || prod.tireSize || prod.tire_size || '',
            tireProductionDot: (it as any).tireProductionDot || prod.tire_production_dot || '',
            warranty: (it as any).warranty || (it as any).warrantyMonths || prod.warranty || '',
            warrantyMonths: (it as any).warrantyMonths || prod.warranty_months || 0,
            warrantyEndDate: it.warrantyEndDate,
            unit: it.unit || prod.unit || 'حبة',
            unitFactor: it.unitFactor || 1,
            conversionFactor: it.unitFactor || 1,
            totalBaseQuantityDeducted: (it.quantity || 1) * (it.unitFactor || 1),
            quantity: it.quantity,
            unit_price: it.unit_price,
            price: it.unit_price,
            discount: (it.discount || 0) + (it.scrapDiscount || 0),
            scrapDiscount: it.scrapDiscount || 0,
            tax: it.tax || 0,
            total: it.total,
          };
        }),
      };

      const res = await api.createInvoice(payload);

      if (res.success && res.data) {
        const finalInvoice = {
          ...res.data,
          id: canonicalInvNum,
          invoice_number: canonicalInvNum,
          invoiceNumber: canonicalInvNum,
          customer_id: selectedCustomerId || 'cust-direct',
          customer: effectiveCustomerName,
          customer_name: effectiveCustomerName,
          customerName: effectiveCustomerName,
          clientName: effectiveCustomerName,
          receivedBy: receivedBy.trim() || undefined,
          received_by: receivedBy.trim() || undefined,
          previousBalance: prevBal,
          previous_balance: prevBal,
          currentInvoiceAmount: grandTotal,
          newTotalBalance: newBal,
          newBalance: newBal,
          customer_balance: newBal,
          salesperson: effectiveSalesperson,
          salesperson_name: effectiveSalesperson,
          salespersonName: effectiveSalesperson,
          cashier_name: effectiveSalesperson,
          cashierName: effectiveSalesperson,
          createdBy: effectiveSalesperson,
          total: grandTotal,
          totalAmount: grandTotal,
          grandTotal: grandTotal,
          netTotal: grandTotal,
          total_amount: grandTotal,
          amount: grandTotal,
          paidAmount: effectivePaid,
          amountPaid: effectivePaid,
          paid: effectivePaid,
          paid_amount: effectivePaid,
          remainingAmount: effectiveRemaining,
          remainingBalance: effectiveRemaining,
          remaining: effectiveRemaining,
          balanceDue: effectiveRemaining,
          remaining_amount: effectiveRemaining,
          status: statusToSave === 'DRAFT' ? 'DRAFT' : computedStatus,
          payment_method: paymentMethod,
          items: validItems.map((it) => {
            const prod: any = productList.find((p) => p.id === (it.product_id || (it as any).productId)) || {};
            return {
              ...it,
              product_id: it.product_id || (it as any).productId || prod.id || null,
              productId: it.product_id || (it as any).productId || prod.id || null,
              name: it.name || prod.name || 'صنف مبيعات',
              item_name: it.name || prod.name || 'صنف مبيعات',
              product_name: it.name || prod.name || 'صنف مبيعات',
              sku: it.sku || prod.sku || '',
              barcode: (it as any).barcode || prod.barcode || it.sku || prod.sku || '',
              code: (it as any).code || (it as any).itemCode || prod.code || prod.item_code || '',
              itemCode: (it as any).itemCode || (it as any).code || prod.code || '',
              item_code: (it as any).itemCode || (it as any).code || prod.code || '',
              itemNumber: (it as any).itemNumber || prod.itemNumber || prod.item_number || '',
              partNumber: (it as any).partNumber || prod.part_number || prod.partNumber || '',
              part_number: (it as any).partNumber || prod.part_number || prod.partNumber || '',
              serialNumber: it.serialNumber || (it as any).serial_number || '',
              serial_number: it.serialNumber || (it as any).serial_number || '',
              battery_serial_number: (it as any).battery_serial_number || it.serialNumber || '',
              tireSize: (it as any).tireSize || prod.tireSize || prod.tire_size || '',
              tire_size: (it as any).tireSize || prod.tireSize || prod.tire_size || '',
              tireProductionDot: (it as any).tireProductionDot || prod.tire_production_dot || '',
              warranty: (it as any).warranty || (it as any).warrantyMonths || prod.warranty || '',
              warrantyMonths: (it as any).warrantyMonths || prod.warranty_months || 0,
              warrantyEndDate: it.warrantyEndDate,
              unit: it.unit || prod.unit || 'حبة',
              unitFactor: it.unitFactor || 1,
              conversionFactor: it.unitFactor || 1,
              totalBaseQuantityDeducted: (it.quantity || 1) * (it.unitFactor || 1),
              quantity: it.quantity,
              unit_price: it.unit_price,
              price: it.unit_price,
              total: it.total,
            };
          }),
          subtotal,
          discount: totalDiscount,
          tax: totalTax,
          invoice_date: invoiceDate,
          due_date: dueDate,
          notes: combinedNotes,
        };

        // Persist to erp_invoices_v1 in localStorage
        try {
          const stored = localStorage.getItem('erp_invoices_v1');
          const existingList: any[] = stored ? JSON.parse(stored) : [];
          const filtered = existingList.filter(
            (inv) => inv.id !== finalInvoice.id && inv.invoice_number !== finalInvoice.invoice_number
          );
          localStorage.setItem('erp_invoices_v1', JSON.stringify([finalInvoice, ...filtered]));
          window.dispatchEvent(new CustomEvent('erp-invoices-updated'));

          // Enqueue into persistent Transactional Outbox (CR-2026-TAURI-OFFLINE-SYNC-001)
          enqueueOutboxTransaction('SALES_INVOICE_CREATE', finalInvoice, {
            dependencyOrder: 20,
            idempotencyKey: `inv_${finalInvoice.id}`,
          }).catch((e) => console.warn('[OUTBOX_INVOICE_WARN]', e));
        } catch (e) {
          console.error('Failed to sync to erp_invoices_v1:', e);
        }

        // If sale has remaining balance (any payment method: WALLET, BANK, CASH, CREDIT), sync customer balance in erp_customers_v1 ONCE
        if (effectiveRemaining > 0 && effectiveCustomerName) {
          try {
            const custStored = localStorage.getItem('erp_customers_v1');
            const custList: any[] = custStored ? JSON.parse(custStored) : [];
            let matched = false;
            const updatedCustList = custList.map((c) => {
              if (String(c.id) === String(selectedCustomerId) || (c.name || '').trim() === effectiveCustomerName.trim()) {
                matched = true;
                const currentCustBal = Number(c.current_balance ?? c.balance ?? 0);
                const updatedCustBal = Number((currentCustBal + effectiveRemaining).toFixed(2));
                return {
                  ...c,
                  current_balance: updatedCustBal,
                  balance: updatedCustBal,
                  total_sales: Number(c.total_sales || 0) + grandTotal,
                };
              }
              return c;
            });
            if (!matched && effectiveCustomerName !== 'عميل نقدي') {
              updatedCustList.push({
                id: selectedCustomerId || `cust-${Date.now()}`,
                name: effectiveCustomerName,
                current_balance: effectiveRemaining,
                balance: effectiveRemaining,
                total_sales: grandTotal,
                status: 'active',
                currency: currency || 'YER',
              });
            }
            localStorage.setItem('erp_customers_v1', JSON.stringify(updatedCustList));
            window.dispatchEvent(new CustomEvent('erp-customers-updated'));
            window.dispatchEvent(new Event('erp_data_updated'));
          } catch (e) {
            console.error('Failed to sync customer balance:', e);
          }
        }

        // Record automatic treasury receipt voucher (سند قبض) if paid amount > 0
        if (effectivePaid > 0) {
          try {
            recordAutomaticTreasuryVoucher({
              type: 'CUSTOMER_PAYMENT',
              amount: effectivePaid,
              currency: currency || 'YER',
              paymentMethod,
              paymentDate: invoiceDate,
              partyId: selectedCustomerId || 'cust-direct',
              partyName: effectiveCustomerName,
              partyPhone: selectedCustomer?.phone,
              referenceId: finalInvoice.id,
              referenceNo: finalInvoice.invoice_number,
              referenceType: 'SALES_INVOICE',
              notes: `سند قبض آلي عن فاتورة مبيعات رقم #${finalInvoice.invoice_number} (العميل: ${effectiveCustomerName})`,
              bankName: paymentMethod === 'BANK' ? bankName : undefined,
              bankRefNo: paymentMethod === 'BANK' ? bankRefNo : undefined,
              walletProvider: paymentMethod === 'WALLET' ? walletProvider : undefined,
              walletTxNo: paymentMethod === 'WALLET' ? walletTxNo : undefined,
              cashierName: effectiveSalesperson,
            });
          } catch (pmtErr) {
            console.error('Failed to record automatic treasury voucher:', pmtErr);
          }
        }
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
              referenceNumber: finalInvoice.invoice_number,
              referenceId: finalInvoice.id,
              customerOrSupplierName: effectiveCustomerName,
              date: invoiceDate,
              notes: combinedNotes,
            }
          );
        } catch (stockErr) {
          console.error('Failed to sync stock deduction:', stockErr);
        }

        if (shouldPrint) {
          // Print invoice preview with unit, serial & scrap info and credit balances
          const prevBal = Number(selectedCustomer?.current_balance || selectedCustomer?.balance || 0);
          printInvoiceDocument({
            companyName: 'المؤسسة التجارية',
            invoiceType: 'SALES',
            invoiceNumber: finalInvoice.invoice_number,
            date: invoiceDate,
            currency: getActiveCurrencySymbol(currency),
            dueDate: dueDate || undefined,
            status: effectiveRemaining <= 0.01 && grandTotal > 0 ? 'PAID' : effectivePaid > 0 ? 'PARTIAL' : 'PENDING',
            partyName: effectiveCustomerName,
            customer_name: effectiveCustomerName,
            receivedBy: receivedBy.trim() || undefined,
            previousBalance: prevBal,
            currentInvoiceAmount: grandTotal,
            newTotalBalance: prevBal + effectiveRemaining,
            salesperson: effectiveSalesperson,
            salesperson_name: effectiveSalesperson,
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
            paidAmount: effectivePaid,
            remainingAmount: effectiveRemaining,
            notes: combinedNotes,
          });
        }
        onSuccess(finalInvoice);
      } else {
        setError(res.error?.message || 'فشل حفظ وإنشاء الفاتورة');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء الاتصال بالخادم');
    } finally {
      isSubmittingInvoiceRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16" id="sales-invoice-create-view">
      {/* Top Bar Header */}
      <div className="m3-card p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="m3-btn-tonal p-2.5 flex items-center justify-center cursor-pointer"
            title="الرجوع للقائمة"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--md-on-surface)] tracking-tight flex items-center gap-2">
              <FileText className="w-6 h-6 text-[var(--md-primary-text)]" />
              إنشاء فاتورة مبيعات جديدة
            </h1>
            <p className="text-xs text-[var(--md-on-surface-variant)] mt-1">
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
            disabled={loading || hasBelowCost}
            className="m3-btn-outlined px-4 py-2.5 disabled:opacity-50 text-xs sm:text-sm font-medium disabled:cursor-not-allowed cursor-pointer"
            title={hasBelowCost ? 'لا يمكن الحفظ: يوجد صنف مسعر بأقل من سعر الشراء' : undefined}
          >
            حفظ كمسودة
          </button>

          <button
            type="button"
            onClick={() => handleSave('PENDING', true)}
            disabled={loading || hasBelowCost}
            className="m3-btn-tonal px-4 py-2.5 disabled:opacity-50 text-xs sm:text-sm font-semibold flex items-center gap-2 disabled:cursor-not-allowed cursor-pointer"
            title={hasBelowCost ? 'لا يمكن الحفظ: يوجد صنف مسعر بأقل من سعر الشراء' : undefined}
          >
            <Printer className="w-4 h-4" />
            حفظ وطباعة
          </button>

          <button
            type="button"
            onClick={() => handleSave('PENDING')}
            disabled={loading || hasBelowCost}
            className="m3-btn-primary px-5 py-2.5 disabled:opacity-50 text-xs sm:text-sm font-bold flex items-center gap-2 disabled:cursor-not-allowed cursor-pointer"
            title={hasBelowCost ? 'لا يمكن الحفظ: يوجد صنف مسعر بأقل من سعر الشراء' : undefined}
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
        <div className="p-4 bg-[var(--md-error-container)] border border-[var(--md-error)]/30 rounded-2xl text-[var(--md-on-error-container)] text-sm flex items-center gap-3 animate-shake">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {quickNotice && (
        <div className="p-3 bg-[var(--md-success-container)] border border-[var(--md-success)]/30 rounded-xl text-[var(--md-on-success-container)] text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4" />
          <span>{quickNotice}</span>
        </div>
      )}

      {hasBelowCost && (
        <div className="p-4 bg-[var(--md-error-container)] border border-[var(--md-error)]/40 rounded-2xl text-[var(--md-on-error-container)] text-sm font-bold flex items-center gap-3 animate-pulse">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>⛔ تنبيه رقابي: لا يمكن إتمام البيع بسعر أقل من سعر الشراء لمنع الخسائر!</span>
        </div>
      )}

      {/* Price Tier Selector Bar */}
      <div className="m3-card p-3 flex items-center gap-2 overflow-x-auto">
        <span className="text-xs font-bold text-[var(--md-on-surface-variant)] px-2 shrink-0 flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-[var(--md-primary-text)]" />
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
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap border ${
              selectedPriceTier === tier.id
                ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)] border-[var(--md-primary)]'
                : 'bg-[var(--md-surface-container-low)] text-[var(--md-on-surface-variant)] border-[var(--md-outline-variant)] hover:bg-[var(--md-surface-container-high)] hover:text-[var(--md-on-surface)]'
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
        <div className="m3-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--md-outline-variant)] pb-2">
            <div className="flex items-center gap-2 text-[var(--md-primary-text)] font-semibold text-sm">
              <User className="w-4 h-4" />
              <span>بيانات العميل والحساب</span>
            </div>
            <button
              type="button"
              onClick={selectQuickCashCustomer}
              className="m3-btn-tonal text-[11px] px-2.5 py-1 font-medium flex items-center gap-1 cursor-pointer"
              title="اختيار عميل نقدي سريع بضغطة واحدة"
            >
              <Zap className="w-3 h-3 text-[var(--md-secondary)]" />
              عميل نقدي سريع
            </button>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-[var(--md-on-surface-variant)]">
              العميل <span className="text-[var(--md-error)]">*</span>
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedCustomerId(val);
                const cust = customerList.find((c) => c.id === val);
                if (cust) {
                  setCustomerName(cust.name);
                }
              }}
              className="m3-select w-full px-3 py-2 text-sm"
            >
              <option value="">-- اختر من قائمة العملاء المسجلين --</option>
              {customerList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ''}
                </option>
              ))}
            </select>
            <div className="relative">
              <input
                type="text"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  const matched = customerList.find((c) => c.name?.trim().toLowerCase() === e.target.value.trim().toLowerCase());
                  if (matched) {
                    setSelectedCustomerId(matched.id);
                  }
                }}
                placeholder="أو اكتب اسم العميل يدوياً (عميل نقدي / مؤسسة...)"
                className="m3-input w-full px-3 py-2 text-xs"
              />
            </div>
          </div>

          {/* Recipient / Received By */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-[var(--md-on-surface-variant)]">
              المستلم / المسحوب بواسطة (سائق / مندوب / ابن العميل)
            </label>
            <input
              type="text"
              value={receivedBy}
              onChange={(e) => setReceivedBy(e.target.value)}
              placeholder="اختياري - اسم الشخص المستلم للبضاعة أو الفاتورة..."
              className="m3-input w-full px-3 py-2 text-xs"
            />
          </div>

          {selectedCustomer && (
            <div className="p-3 bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--md-on-surface-variant)]">الرصيد الحالي:</span>
                <span className="font-mono font-bold text-[var(--md-primary-text)] tabular-nums">
                  {formatAmount(selectedCustomer.current_balance || 0, selectedCustomer.currency || currency)}
                </span>
              </div>
              {selectedCustomer.credit_limit > 0 && (
                <div className="flex justify-between">
                  <span className="text-[var(--md-on-surface-variant)]">الحد الائتماني:</span>
                  <span className="font-mono text-[var(--md-on-surface)] tabular-nums">
                    {formatAmount(selectedCustomer.credit_limit, selectedCustomer.currency || currency)}
                  </span>
                </div>
              )}
              {paymentMethod === 'CREDIT' && remainingDue > 0 && (
                <div className="flex justify-between border-t border-[var(--md-outline-variant)] pt-1 text-[var(--md-warning)] font-bold">
                  <span>الرصيد المتوقع بعد الفاتورة:</span>
                  <span className="font-mono tabular-nums">
                    {formatAmount(
                      Number(selectedCustomer.current_balance || 0) + remainingDue,
                      selectedCustomer.currency || currency
                    )}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. Dates & Numbering Card */}
        <div className="m3-card p-5 space-y-4">
          <div className="flex items-center gap-2 text-[var(--md-success)] font-semibold text-sm border-b border-[var(--md-outline-variant)] pb-2">
            <Calendar className="w-4 h-4" />
            <span>التواريخ والترقيم</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--md-on-surface-variant)] mb-1">تاريخ الفاتورة</label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="m3-input w-full px-3 py-2 text-xs font-mono tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--md-on-surface-variant)] mb-1">تاريخ الاستحقاق</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="m3-input w-full px-3 py-2 text-xs font-mono tabular-nums"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--md-on-surface-variant)] mb-1">
              رقم الفاتورة <span className="text-[var(--md-on-surface-variant)]/75 text-[11px]">(تلقائي إن ترك فارغاً)</span>
            </label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(toEnglishDigits(e.target.value))}
              placeholder="مثال: INV-2026-0001"
              className="m3-input w-full px-3 py-2 text-sm font-mono tabular-nums"
            />
          </div>
        </div>

        {/* 3. Currency & Salesperson Card */}
        <div className="m3-card p-5 space-y-4">
          <div className="flex items-center gap-2 text-[var(--md-secondary)] font-semibold text-sm border-b border-[var(--md-outline-variant)] pb-2">
            <DollarSign className="w-4 h-4" />
            <span>العملة ومندوب المبيعات</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--md-on-surface-variant)] mb-1">العملة</label>
              <select
                value={currency}
                onChange={(e) => handleCurrencyChange(e.target.value)}
                className="m3-select w-full px-3 py-2 text-sm"
              >
                <option value="YER">ريال يمني (YER)</option>
                <option value="SAR">ريال سعودي (SAR)</option>
                <option value="USD">دولار أمريكي (USD)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--md-on-surface-variant)] mb-1 flex items-center justify-between">
                <span>سعر التحويل / الصرف</span>
                <span className="text-[10px] text-[var(--md-primary-text)] font-mono">0-9 EN</span>
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
                className="m3-input w-full disabled:opacity-50 px-3 py-2 text-sm font-mono text-left tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--md-on-surface-variant)] mb-1">مندوب / بائع</label>
              <input
                type="text"
                value={salespersonName}
                onChange={(e) => setSalespersonName(e.target.value)}
                placeholder="اسم البائع"
                className="m3-input w-full px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--md-on-surface-variant)] mb-1">الفرع</label>
              <input
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="الفرع الرئيسي"
                className="m3-input w-full px-3 py-2 text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Lightning Fast Data-Entry Bar & Barcode Scanner */}
      <div className="m3-card p-4 sm:p-5 border-[var(--md-primary)]/30 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[var(--md-primary-text)] font-bold text-sm">
            <Barcode className="w-5 h-5" />
            <span>البحث السريع وإضافة الأصناف بالباركود أو الاسم</span>
          </div>
          <span className="text-xs text-[var(--md-on-surface-variant)]">
            اضغط <kbd className="px-1.5 py-0.5 bg-[var(--md-surface-container-high)] border border-[var(--md-outline-variant)] rounded text-[10px] text-[var(--md-primary-text)] font-mono">Enter</kbd> للإضافة الفورية
          </span>
        </div>

        <div className="relative">
          <div className="relative">
            <Search className="w-5 h-5 text-[var(--md-on-surface-variant)] absolute right-3.5 top-1/2 -translate-y-1/2" />
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
              className="m3-input w-full pr-11 pl-4 py-3 text-sm"
            />
          </div>

          {/* Instant Search Results Dropdown */}
          {isSearchOpen && searchResults.length > 0 && (
            <div className="m3-card-elevated absolute z-30 left-0 right-0 top-full mt-1.5 max-h-64 overflow-y-auto divide-y divide-[var(--md-outline-variant)]">
              {searchResults.slice(0, 8).map((prod) => {
                const stock = parseFloat(prod.current_stock || '0');
                const price = parseFloat(prod.selling_price || '0');
                return (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => handleQuickAddProduct(prod)}
                    className="w-full text-right p-3 hover:bg-[var(--md-primary-container)]/35 flex items-center justify-between transition-colors group cursor-pointer"
                  >
                    <div>
                      <div className="font-semibold text-sm text-[var(--md-on-surface)] group-hover:text-[var(--md-primary-text)] flex items-center gap-2">
                        {prod.name}
                        {prod.sku && (
                          <span className="text-[11px] text-[var(--md-on-surface-variant)] font-mono font-normal">
                            [{prod.sku}]
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[var(--md-on-surface-variant)] flex items-center gap-3 mt-0.5">
                        <span>الوحدة: <strong className="text-[var(--md-on-surface)]">{prod.unit || 'حبة'}</strong></span>
                        <span>المخزون: <strong className="font-mono text-[var(--md-on-surface)] tabular-nums">{formatNumber(stock)}</strong></span>
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="font-mono font-bold text-sm text-[var(--md-success)] tabular-nums">
                        {formatAmount(price, currency)}
                      </div>
                      <span className="text-[10px] text-[var(--md-primary-text)] flex items-center justify-end gap-1 mt-0.5">
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
            <span className="text-[11px] text-[var(--md-on-surface-variant)] whitespace-nowrap flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[var(--md-secondary)]" />
              أصناف سريعة:
            </span>
            {productList.slice(0, 6).map((prod) => (
              <button
                key={prod.id}
                type="button"
                onClick={() => handleQuickAddProduct(prod)}
                className="px-2.5 py-1 bg-[var(--md-surface-container-low)] hover:bg-[var(--md-primary-container)] text-[var(--md-on-surface)] hover:text-[var(--md-on-primary-container)] border border-[var(--md-outline-variant)] rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
              >
                <span>{prod.name}</span>
                <span className="font-mono text-[10px] text-[var(--md-success)] tabular-nums">
                  {formatNumber(parseFloat(prod.selling_price || '0'))}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Invoice Line Items Table */}
      <div className="m3-card overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[var(--md-outline-variant)] flex items-center justify-between bg-[var(--md-surface-container-low)]">
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5 text-[var(--md-primary-text)]" />
            <h3 className="font-bold text-[var(--md-on-surface)] text-base">جدول بنود وأصناف الفاتورة</h3>
          </div>
          <button
            type="button"
            onClick={addItemRow}
            className="m3-btn-tonal px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            إضافة بند جديد
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="m3-table w-full text-right text-sm">
            <thead className="m3-thead text-xs font-semibold uppercase">
              <tr>
                <th className="m3-th py-3 px-3 w-10 text-center">#</th>
                <th className="m3-th py-3 px-2 w-28 text-center">رقم الصنف/القطعة</th>
                <th className="m3-th py-3 px-3 min-w-[200px]">المنتج من المخزن / الصنف</th>
                <th className="m3-th py-3 px-3 min-w-[130px]">الوصف اليدوي</th>
                <th className="m3-th py-3 px-3 w-28 text-center">الوحدة</th>
                <th className="m3-th py-3 px-3 w-24 text-center">الكمية</th>
                <th className="m3-th py-3 px-3 w-32 text-left">سعر الوحدة</th>
                <th className="m3-th py-3 px-3 w-24 text-left">خصم</th>
                <th className="m3-th py-3 px-3 w-20 text-center">ضريبة %</th>
                <th className="m3-th py-3 px-3 w-32 text-left">الإجمالي</th>
                <th className="m3-th py-3 px-3 w-20 text-center">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--md-outline-variant)]">
              {items.map((it, idx) => {
                const isOverStock =
                  it.product_id &&
                  it.current_stock !== undefined &&
                  it.quantity > it.current_stock;

                return (
                  <React.Fragment key={it.id}>
                    <tr className="hover:bg-[var(--md-surface-container-low)] transition-colors">
                      <td className="py-2.5 px-3 text-center text-[var(--md-on-surface-variant)] text-xs font-mono tabular-nums">
                        {idx + 1}
                      </td>

                      {/* Item Code / Part Number */}
                      <td className="py-2.5 px-2 text-center">
                        <span className="font-mono text-xs font-bold text-[var(--md-primary-text)] bg-[var(--md-surface-container-low)] px-2 py-1 rounded-md border border-[var(--md-outline-variant)] inline-block tabular-nums">
                          {it.itemCode || it.partNumber || it.sku || '-'}
                        </span>
                      </td>

                      {/* Catalog Product Dropdown */}
                      <td className="py-2.5 px-3">
                        <select
                          value={it.product_id || ''}
                          onChange={(e) => handleProductSelect(idx, e.target.value)}
                          className="m3-select w-full px-2.5 py-1.5 text-xs"
                        >
                          <option value="">-- أو صنف يدوي غير مسجل --</option>
                          {productList.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} {p.itemCode ? `[${p.itemCode}]` : p.sku ? `[${p.sku}]` : ''} ({formatProductStock(p.current_stock ?? p.stock ?? 0, p)})
                            </option>
                          ))}
                        </select>
                        {it.product_id && (
                          <div className="flex items-center gap-2 mt-1 text-[11px]">
                            <span className="text-[var(--md-on-surface-variant)]">
                              المخزون المتاح: <span className="font-mono text-[var(--md-success)] font-bold tabular-nums">{formatProductStock(it.current_stock ?? 0, productList.find((p) => p.id === it.product_id))}</span>
                            </span>
                            {isOverStock && (
                              <span className="text-[var(--md-error)] flex items-center gap-0.5 font-bold">
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
                          className="m3-input w-full px-2.5 py-1.5 text-xs"
                        />
                      </td>

                      {/* Unit with Multi-UOM Presets */}
                      <td className="py-2.5 px-3">
                        <div className="space-y-1">
                          {it.product_id ? (
                            <select
                              value={it.selectedUnit || 'base'}
                              onChange={(e) => handleUpdateLineUnit(idx, e.target.value as any)}
                              className="m3-select w-full px-2 py-1.5 text-xs text-center font-bold"
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
                              className="m3-select w-full px-2 py-1.5 text-xs text-center font-medium"
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
                              className="m3-input w-full px-1.5 py-1 text-[11px] text-center"
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
                          className="m3-input w-20 px-2 py-1.5 text-xs text-center font-mono font-bold tabular-nums"
                        />
                      </td>

                      {/* Unit Price (Resilient English Input) */}
                      <td className="py-2.5 px-3">
                        {(() => {
                          const prod = it.product_id ? productList.find((p) => p.id === it.product_id) : null;
                          const unitCostPrice = Math.round(
                            Number(prod?.costPrice || prod?.purchasePrice || prod?.cost_price || (prod as any)?.purchase_price || 0) *
                              Number(it.unitFactor || 1)
                          );
                          const qty = it.quantity || 1;
                          const netUnitPrice = qty > 0 ? (qty * it.unit_price - (it.discount || 0) - (it.scrapDiscount || 0)) / qty : it.unit_price;
                          const isRowBelowCost = (unitCostPrice > 0 && (Number(it.unit_price || 0) < unitCostPrice || netUnitPrice < unitCostPrice)) || (it.product_id && Number(it.unit_price || 0) <= 0);

                          return (
                            <div className="space-y-1">
                              <div className="relative">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  dir="ltr"
                                  lang="en"
                                  value={it.unit_price === 0 || (it.unit_price as any) === '' ? '' : it.unit_price}
                                  onChange={(e) => updateItem(idx, { unit_price: parseEnglishNumber(e.target.value, 0) })}
                                  placeholder={unitCostPrice > 0 ? String(unitCostPrice) : '0'}
                                  className={`m3-input w-full px-2 py-1.5 text-xs text-left font-mono tabular-nums select-none ${
                                    isRowBelowCost
                                      ? 'border-[var(--md-error)] bg-[var(--md-error-container)] text-[var(--md-on-error-container)] ring-1 ring-[var(--md-error)]/40'
                                      : ''
                                  }`}
                                />
                              </div>

                              {/* Discrete Pro Cost Peek */}
                              {unitCostPrice > 0 && (
                                <div className="flex items-center justify-between text-[10px]">
                                  <span
                                    className="text-[10px] text-[var(--md-on-surface-variant)]/40 hover:text-[var(--md-on-surface)] transition-opacity cursor-help select-none group/cost inline-flex items-center"
                                    title={`سعر التكلفة: ${unitCostPrice}`}
                                  >
                                    <span className="group-hover/cost:hidden">ك: ••••</span>
                                    <span className="hidden group-hover/cost:inline font-mono tabular-nums">ك: {unitCostPrice}</span>
                                  </span>
                                </div>
                              )}

                              {/* Real-Time Row Warning Badge */}
                              {isRowBelowCost && (
                                <div className="text-[10px] text-[var(--md-on-error-container)] font-bold flex items-center gap-1 bg-[var(--md-error-container)] border border-[var(--md-error)]/30 rounded-md px-1.5 py-0.5 leading-tight">
                                  <span>⚠️ أقل من التكلفة ({unitCostPrice})</span>
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
                          className="m3-input w-full px-2 py-1.5 text-xs text-left text-[var(--md-error)] font-mono tabular-nums"
                        />
                      </td>

                      {/* Tax Percent */}
                      <td className="py-2.5 px-3 text-center">
                        <select
                          value={it.tax_percent}
                          onChange={(e) => updateItem(idx, { tax_percent: parseEnglishNumber(e.target.value, 0) })}
                          className="m3-select w-16 px-1 py-1.5 text-xs text-center font-mono tabular-nums"
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="15">15%</option>
                        </select>
                      </td>

                      {/* Total */}
                      <td className="py-2.5 px-3 text-left font-mono font-bold text-[var(--md-on-surface)] text-xs tabular-nums">
                        {formatAmount(it.total, currency)}
                      </td>

                      {/* Action buttons */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => duplicateItemRow(idx)}
                            className="p-1 text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-high)] rounded transition-colors cursor-pointer"
                            title="تكرار البند"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeItemRow(idx)}
                            className="p-1 text-[var(--md-error)] hover:bg-[var(--md-error-container)] rounded transition-colors cursor-pointer"
                            title="حذف البند"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Battery Spec & Inline Warranty & Scrap Discount Row */}
                    {it.activityType === 'battery' && (
                      <tr className="bg-[var(--md-warning-container)]/35 border-b border-[var(--md-outline-variant)]">
                        <td colSpan={11} className="px-4 py-2.5">
                          <div className="flex items-center gap-4 flex-wrap text-xs">
                            <span className="font-bold text-[var(--md-warning)] flex items-center gap-1.5 shrink-0">
                              <Zap className="w-4 h-4" />
                              بيانات ضمان وسيريال البطارية:
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-[var(--md-on-surface-variant)]">الرقم التسلسلي (Serial No):</span>
                              <input
                                type="text"
                                placeholder="SN-BAT-..."
                                value={it.serialNumber || ''}
                                onChange={(e) => updateItem(idx, { serialNumber: e.target.value })}
                                className="m3-input px-2.5 py-1 text-xs font-mono"
                              />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-[var(--md-on-surface-variant)]">نهاية الضمان:</span>
                              <input
                                type="date"
                                value={it.warrantyEndDate || ''}
                                onChange={(e) => updateItem(idx, { warrantyEndDate: e.target.value })}
                                className="m3-input px-2 py-1 text-xs font-mono tabular-nums"
                              />
                              <span className="text-[10px] text-[var(--md-on-surface-variant)] font-mono">({it.warrantyMonths || 12} شهر)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-[var(--md-on-surface-variant)]">خصم استبدال رجيع قديم:</span>
                              <input
                                type="text"
                                inputMode="decimal"
                                dir="ltr"
                                lang="en"
                                placeholder="0.00"
                                value={it.scrapDiscount || ''}
                                onChange={(e) => updateItem(idx, { scrapDiscount: parseEnglishNumber(e.target.value, 0) })}
                                className="m3-input w-24 px-2 py-1 text-xs text-[var(--md-success)] font-mono font-bold tabular-nums"
                              />
                              <span className="text-[10px] text-[var(--md-success)]">{currency}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Tires Spec (قسم الإطارات والكفرات) */}
                    {it.activityType === 'tire' && (
                      <tr className="bg-[var(--md-info-container)]/35 border-b border-[var(--md-outline-variant)]">
                        <td colSpan={11} className="px-4 py-2.5">
                          <div className="flex items-center gap-4 flex-wrap text-xs">
                            <span className="font-bold text-[var(--md-info)] flex items-center gap-1.5 shrink-0">
                              <span className="text-sm">🛞</span>
                              مواصفات وضمان الإطار:
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-[var(--md-on-surface-variant)]">المقاس:</span>
                              <input
                                type="text"
                                placeholder="مثال: 205/55 R16"
                                value={it.tireSize || ''}
                                onChange={(e) => updateItem(idx, { tireSize: e.target.value })}
                                className="m3-input px-2.5 py-1 text-xs font-mono"
                              />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-[var(--md-on-surface-variant)]">سنة والصنع (DOT):</span>
                              <input
                                type="text"
                                placeholder="مثال: 4025 (أسبوع 40 - 2025)"
                                value={it.tireProductionDot || ''}
                                onChange={(e) => updateItem(idx, { tireProductionDot: e.target.value })}
                                className="m3-input px-2 py-1 text-xs font-mono"
                              />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-[var(--md-on-surface-variant)]">المنشأ / الغاط:</span>
                              <input
                                type="text"
                                placeholder="ياباني - 8PR"
                                value={it.tirePlyOrigin || ''}
                                onChange={(e) => updateItem(idx, { tirePlyOrigin: e.target.value })}
                                className="m3-input px-2 py-1 text-xs"
                              />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-[var(--md-on-surface-variant)]">الضمان:</span>
                              <span className="text-[var(--md-info)] font-mono font-bold tabular-nums">{it.warrantyMonths || 12} شهر</span>
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
      <div className="m3-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--md-outline-variant)] pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2 text-[var(--md-primary-text)] font-bold text-sm">
            <CreditCard className="w-5 h-5" />
            <span>طريقة الدفع والسداد (Payment Method)</span>
          </div>
          <span className="text-xs text-[var(--md-on-surface-variant)]">حدد طريقة السداد المناسبة للفاتورة</span>
        </div>

        {/* 4 Rich Payment Method Selection Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Cash (نقد) */}
          <button
            type="button"
            onClick={() => handlePaymentMethodChange('CASH')}
            className={`p-3.5 rounded-xl border text-right transition-all flex flex-col justify-between gap-2 cursor-pointer ${
              paymentMethod === 'CASH'
                ? 'bg-[var(--md-success-container)] border-[var(--md-success)] text-[var(--md-on-success-container)]'
                : 'bg-[var(--md-surface-container-low)] border-[var(--md-outline-variant)] hover:bg-[var(--md-surface-container-high)] text-[var(--md-on-surface)]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-[var(--md-success-container)] border border-[var(--md-outline-variant)] flex items-center justify-center text-[var(--md-success)]">
                <Banknote className="w-4 h-4" />
              </div>
              {paymentMethod === 'CASH' && <CheckCircle2 className="w-4 h-4 text-[var(--md-success)]" />}
            </div>
            <div>
              <h4 className="font-bold text-sm text-[var(--md-on-surface)]">نقد (Cash)</h4>
              <p className="text-[11px] text-[var(--md-on-surface-variant)] mt-0.5">سداد نقدي مباشر في الصندوق والخزينة</p>
            </div>
          </button>

          {/* 2. Bank Transfer (تحويل بنكي) */}
          <button
            type="button"
            onClick={() => handlePaymentMethodChange('BANK')}
            className={`p-3.5 rounded-xl border text-right transition-all flex flex-col justify-between gap-2 cursor-pointer ${
              paymentMethod === 'BANK'
                ? 'bg-[var(--md-info-container)] border-[var(--md-info)] text-[var(--md-on-info-container)]'
                : 'bg-[var(--md-surface-container-low)] border-[var(--md-outline-variant)] hover:bg-[var(--md-surface-container-high)] text-[var(--md-on-surface)]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-[var(--md-info-container)] border border-[var(--md-outline-variant)] flex items-center justify-center text-[var(--md-info)]">
                <Landmark className="w-4 h-4" />
              </div>
              {paymentMethod === 'BANK' && <CheckCircle2 className="w-4 h-4 text-[var(--md-info)]" />}
            </div>
            <div>
              <h4 className="font-bold text-sm text-[var(--md-on-surface)]">تحويل بنكي (Bank Transfer)</h4>
              <p className="text-[11px] text-[var(--md-on-surface-variant)] mt-0.5">إيداع أو حوالة مباشرة في الحساب البنكي</p>
            </div>
          </button>

          {/* 3. Credit (آجل) */}
          <button
            type="button"
            onClick={() => handlePaymentMethodChange('CREDIT')}
            className={`p-3.5 rounded-xl border text-right transition-all flex flex-col justify-between gap-2 cursor-pointer ${
              paymentMethod === 'CREDIT'
                ? 'bg-[var(--md-warning-container)] border-[var(--md-warning)] text-[var(--md-on-warning-container)]'
                : 'bg-[var(--md-surface-container-low)] border-[var(--md-outline-variant)] hover:bg-[var(--md-surface-container-high)] text-[var(--md-on-surface)]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-[var(--md-warning-container)] border border-[var(--md-outline-variant)] flex items-center justify-center text-[var(--md-warning)]">
                <Clock className="w-4 h-4" />
              </div>
              {paymentMethod === 'CREDIT' && <CheckCircle2 className="w-4 h-4 text-[var(--md-warning)]" />}
            </div>
            <div>
              <h4 className="font-bold text-sm text-[var(--md-on-surface)]">آجل (Credit / ذمة)</h4>
              <p className="text-[11px] text-[var(--md-on-surface-variant)] mt-0.5">تسجيل الفاتورة كذمة آجلة على حساب العميل</p>
            </div>
          </button>

          {/* 4. E-Wallet (محفظة إلكترونية) */}
          <button
            type="button"
            onClick={() => handlePaymentMethodChange('WALLET')}
            className={`p-3.5 rounded-xl border text-right transition-all flex flex-col justify-between gap-2 cursor-pointer ${
              paymentMethod === 'WALLET'
                ? 'bg-[var(--md-secondary-container)] border-[var(--md-secondary)] text-[var(--md-on-secondary-container)]'
                : 'bg-[var(--md-surface-container-low)] border-[var(--md-outline-variant)] hover:bg-[var(--md-surface-container-high)] text-[var(--md-on-surface)]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-[var(--md-secondary-container)] border border-[var(--md-outline-variant)] flex items-center justify-center text-[var(--md-secondary)]">
                <Wallet className="w-4 h-4" />
              </div>
              {paymentMethod === 'WALLET' && <CheckCircle2 className="w-4 h-4 text-[var(--md-secondary)]" />}
            </div>
            <div>
              <h4 className="font-bold text-sm text-[var(--md-on-surface)]">محفظة إلكترونية (E-Wallet)</h4>
              <p className="text-[11px] text-[var(--md-on-surface-variant)] mt-0.5">الكريمي، ون كاش، فلوسك، جايبي، كاش، جوالي</p>
            </div>
          </button>
        </div>

        {/* Dynamic Context Fields based on Selected Payment Method */}
        {paymentMethod === 'BANK' && (
          <div className="p-4 bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] rounded-xl space-y-3">
            <div className="text-xs font-semibold text-[var(--md-info)]">تفاصيل التحويل البنكي:</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[var(--md-on-surface-variant)] mb-1">اسم البنك / الحساب</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="مثال: بنك التضامن / بنك الكريمي"
                  className="m3-input w-full px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--md-on-surface-variant)] mb-1">رقم الإشعار / الحوالة البنكية</label>
                <input
                  type="text"
                  value={bankRefNo}
                  onChange={(e) => setBankRefNo(toEnglishDigits(e.target.value))}
                  placeholder="رقم العملية البنكية"
                  className="m3-input w-full px-3 py-2 text-xs font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {paymentMethod === 'WALLET' && (
          <div className="p-4 bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] rounded-xl space-y-3">
            <div className="text-xs font-semibold text-[var(--md-secondary)]">مزود المحفظة الإلكترونية:</div>
            <div className="flex items-center gap-2 flex-wrap">
              {WALLET_PRESETS.map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setWalletProvider(w)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    walletProvider === w
                      ? 'bg-[var(--md-secondary-container)] border-[var(--md-secondary)] text-[var(--md-on-secondary-container)]'
                      : 'bg-[var(--md-surface-container)] border-[var(--md-outline-variant)] text-[var(--md-on-surface-variant)] hover:bg-[var(--md-surface-container-high)]'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs text-[var(--md-on-surface-variant)] mb-1">اسم المحفظة / الخدمة</label>
                <input
                  type="text"
                  value={walletProvider}
                  onChange={(e) => setWalletProvider(e.target.value)}
                  className="m3-input w-full px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--md-on-surface-variant)] mb-1">رقم الحوالة / العملية بالمحفظة</label>
                <input
                  type="text"
                  value={walletTxNo}
                  onChange={(e) => setWalletTxNo(toEnglishDigits(e.target.value))}
                  placeholder="مثال: TX-984210"
                  className="m3-input w-full px-3 py-2 text-xs font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {paymentMethod === 'CREDIT' && (
          <div className="p-3 bg-[var(--md-warning-container)] border border-[var(--md-warning)]/30 rounded-xl text-[var(--md-on-warning-container)] text-xs flex items-center gap-2.5">
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span>
              فاتورة بالآجل: سيتم قيد إجمالي الفاتورة ({formatAmount(grandTotal, currency)}) كذمة وحساب مدين على العميل.
            </span>
          </div>
        )}
      </div>

      {/* Financial Summary & Payment Options Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Notes & Immediate Payment */}
        <div className="m3-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--md-outline-variant)] pb-2 flex-wrap gap-2">
            <div className="flex items-center gap-2 text-[var(--md-primary-text)] font-semibold text-sm">
              <DollarSign className="w-4 h-4" />
              <span>المبلغ المسدد والخيارات السريعة</span>
            </div>
            {/* Quick payment amount buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPaidAmount(grandTotal)}
                className="m3-badge m3-badge-success text-[11px] font-medium cursor-pointer hover:opacity-85 transition-opacity"
              >
                100% مسدد
              </button>
              <button
                type="button"
                onClick={() => setPaidAmount(Number((grandTotal / 2).toFixed(2)))}
                className="m3-badge m3-badge-info text-[11px] font-medium cursor-pointer hover:opacity-85 transition-opacity"
              >
                50% دفعة
              </button>
              <button
                type="button"
                onClick={() => setPaidAmount(0)}
                className="m3-badge m3-badge-warning text-[11px] font-medium cursor-pointer hover:opacity-85 transition-opacity"
              >
                آجل (0)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--md-on-surface-variant)] mb-1">
                المبلغ المسلم / المسدد فورا ({getActiveCurrencySymbol(currency)})
              </label>
              <input
                type="text"
                inputMode="decimal"
                dir="ltr"
                lang="en"
                value={paidAmount}
                onChange={(e) => setPaidAmount(parseEnglishNumber(e.target.value, 0))}
                className="m3-input w-full px-3 py-2 text-sm text-[var(--md-success)] font-bold font-mono tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--md-on-surface-variant)] mb-1">نوع السداد المحدد</label>
              <div className="w-full bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] rounded-xl px-3 py-2.5 text-xs font-semibold text-[var(--md-on-surface)] flex items-center gap-2">
                {paymentMethod === 'CASH' && <><Banknote className="w-4 h-4 text-[var(--md-success)]" /> <span>نقد (الصندوق)</span></>}
                {paymentMethod === 'BANK' && <><Landmark className="w-4 h-4 text-[var(--md-info)]" /> <span>تحويل بنكي</span></>}
                {paymentMethod === 'CREDIT' && <><Clock className="w-4 h-4 text-[var(--md-warning)]" /> <span>آجل بالكامل</span></>}
                {paymentMethod === 'WALLET' && <><Wallet className="w-4 h-4 text-[var(--md-secondary)]" /> <span>محفظة إلكترونية</span></>}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--md-on-surface-variant)] mb-1">ملاحظات وشروط الفاتورة</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: البضاعة المباعة لا ترد بعد 3 أيام، الدفع خلال 14 يوما..."
              className="m3-input w-full p-3 text-xs resize-none"
            />
          </div>
        </div>

        {/* Right: Grand Totals Breakdown */}
        <div className="m3-card p-5 space-y-3.5">
          <div className="flex items-center gap-2 text-[var(--md-success)] font-semibold text-sm border-b border-[var(--md-outline-variant)] pb-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>الحسابات والإجمالي الختامي</span>
          </div>

          {hasBelowCost && (
            <div className="p-3 bg-[var(--md-error-container)] border border-[var(--md-error)]/40 rounded-xl text-[var(--md-on-error-container)] text-xs font-bold flex items-center gap-2 animate-pulse">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>⛔ تنبيه محاسبي: يوجد صنف مسعّر بأقل من سعر الشراء! لا يمكن إتمام البيع بخسارة حتى يتم تعديل السعر.</span>
            </div>
          )}

          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-[var(--md-on-surface-variant)]">
              <span>المجموع الفرعي (Subtotal):</span>
              <span className="font-mono tabular-nums text-[var(--md-on-surface)]">{formatAmount(subtotal, currency)}</span>
            </div>

            <div className="flex justify-between text-[var(--md-error)]">
              <span>إجمالي الخصم التجاري:</span>
              <span className="font-mono tabular-nums">-{formatAmount(totalDiscount, currency)}</span>
            </div>

            <div className="flex justify-between text-[var(--md-success)]">
              <span>ضريبة القيمة المضافة (VAT):</span>
              <span className="font-mono tabular-nums">+{formatAmount(totalTax, currency)}</span>
            </div>

            <div className="border-t border-[var(--md-outline-variant)] pt-2.5 flex justify-between text-base font-extrabold text-[var(--md-on-surface)]">
              <span>الإجمالي النهائي (Grand Total):</span>
              <span className="font-mono text-xl text-[var(--md-primary-text)] tabular-nums">{formatAmount(grandTotal, currency)}</span>
            </div>

            {currency !== 'YER' && (
              <div className="flex justify-between text-xs text-[var(--md-secondary)] font-mono font-bold pt-1 border-t border-[var(--md-outline-variant)] tabular-nums">
                <span>المعادل بالعملة الأساسية:</span>
                <span>≈ {formatNumber(grandTotal * (exchangeRate || 1))} {getActiveCurrencySymbol('YER')}</span>
              </div>
            )}

            <div className="flex justify-between text-xs text-[var(--md-success)] pt-1">
              <span>المسلم / المسدد ({paymentMethod === 'CASH' ? 'نقداً' : paymentMethod === 'BANK' ? 'بنكي' : paymentMethod === 'WALLET' ? 'محفظة' : 'آجل'}):</span>
              <span className="font-mono font-bold tabular-nums">{formatAmount(paidAmount, currency)}</span>
            </div>

            <div className="flex justify-between text-sm font-bold text-[var(--md-warning)] pt-1 border-t border-[var(--md-outline-variant)]">
              <span>الرصيد المتبقي على العميل (الذمة):</span>
              <span className="font-mono text-base tabular-nums">{formatAmount(remainingDue, currency)}</span>
            </div>

            {paidAmount > grandTotal && (
              <div className="flex justify-between text-sm font-bold text-[var(--md-on-info-container)] pt-1 bg-[var(--md-info-container)] p-2 rounded-xl border border-[var(--md-info)]/30">
                <span>المتبقي للعميل (الباقي / الفكة):</span>
                <span className="font-mono text-base tabular-nums">{formatAmount(paidAmount - grandTotal, currency)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
