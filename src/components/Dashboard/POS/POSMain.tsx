import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Barcode,
  Plus,
  Trash2,
  Pause,
  Play,
  RotateCcw,
  CreditCard,
  Banknote,
  DollarSign,
  Sparkles,
  ShoppingBag,
  Percent,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Lock,
  Unlock,
  Layers,
  ChevronDown,
  RefreshCw,
  Tag,
  Package,
  Zap,
  Keyboard,
  Coins,
  Printer,
  X,
  Calendar,
  Clock,
} from 'lucide-react';
import { api } from '../../../api';
import { useAuth } from '../../../context/AuthContext';
import { POSCartItem, POSShift, POSHeldSale, PriceTier } from '../../../types';
import {
  getStoredExchangeRates,
  saveStoredExchangeRates,
  EVENT_EXCHANGE_RATES_CHANGED,
  toBaseCurrencyAmount,
  getAccountingRate,
  ExchangeRateConfig,
} from '../../../lib/exchangeRates';
import {
  formatNumber,
  parseEnglishNumber,
  toEnglishDigits,
  formatAmount,
  getActiveCurrencyCode,
  getActiveCurrencySymbol,
  applyStockMovementSync,
} from '../../../lib/formatters';
import { printInvoiceDocument } from '../../../lib/exportUtils';
import { recordAutomaticTreasuryVoucher } from '../../../utils/treasuryVoucherHelper';
import { normalizeScannedBarcode, playBarcodeBeep, findProductByBarcode, attachGlobalBarcodeScannerListener, shouldProcessBarcodeScan } from '../../../utils/barcodeUtils';
import { enqueueOutboxTransaction } from '../../../services/transactionalOutbox';
import { ModuleSettingsModal } from '../../Common/ModuleSettingsModal';
import { POSQuickItemModal } from './POSQuickItemModal';
import { POSCustomerSelector } from './POSCustomerSelector';
import { POSPaymentModal } from './POSPaymentModal';
import { POSReceiptModal } from './POSReceiptModal';
import { POSShiftModal } from './POSShiftModal';
import { POSReturnsModal } from './POSReturnsModal';
import { POSHeldDrawer } from './POSHeldDrawer';
import { POSAIAssistantWidget } from './POSAIAssistantWidget';

interface POSMainProps {
  onNavigateToInvoices?: () => void;
}

export const POSMain: React.FC<POSMainProps> = ({ onNavigateToInvoices }) => {
  const { user, company } = useAuth();

  // Primary Data State
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Currency & Rates
  const [currency, setCurrency] = useState<string>(() => company?.currency || getActiveCurrencyCode());
  const currSym = getActiveCurrencySymbol(currency);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({ YER: 1, SAR: 0.27, USD: 0.004 });

  // Shift & Cash Drawer State
  const [currentShift, setCurrentShift] = useState<POSShift | null>(null);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);

  // Daily Summary Stats
  const [dailySummary, setDailySummary] = useState<any | null>(null);

  // POS Sales Log State
  const [isPosDailySalesOpen, setIsPosDailySalesOpen] = useState(false);
  const [posSalesLog, setPosSalesLog] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('erp_pos_sales_log_v1') || '[]');
    } catch {
      return [];
    }
  });
  const [salesLogSearch, setSalesLogSearch] = useState('');

  // Held Sales State
  const [heldSales, setHeldSales] = useState<POSHeldSale[]>([]);
  const [isHeldDrawerOpen, setIsHeldDrawerOpen] = useState(false);
  const [isCreditHoldPickerOpen, setIsCreditHoldPickerOpen] = useState(false);
  const [creditHoldCustomerName, setCreditHoldCustomerName] = useState('');
  const [creditHoldCustomerPhone, setCreditHoldCustomerPhone] = useState('');
  const [creditHoldNote, setCreditHoldNote] = useState('');
  const [creditHoldReceivedBy, setCreditHoldReceivedBy] = useState('');
  const [creditHoldSelectedId, setCreditHoldSelectedId] = useState('');
  const [creditCustomerSearch, setCreditCustomerSearch] = useState('');

  // Active Sale State (Cart)
  const [cart, setCart] = useState<POSCartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [cartDiscount, setCartDiscount] = useState<number>(0);
  const [cartTaxRate, setCartTaxRate] = useState<number>(0); // e.g. 0% or 15%
  const [selectedPriceTier, setSelectedPriceTier] = useState<PriceTier>('retail');

  // Modals
  const [isQuickItemOpen, setIsQuickItemOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isReturnsModalOpen, setIsReturnsModalOpen] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [completedReceiptData, setCompletedReceiptData] = useState<any | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Barcode Scanner & Rapid Hardware Input State
  const [scannedUnmatchedBarcode, setScannedUnmatchedBarcode] = useState<string | null>(null);
  const [barcodeToast, setBarcodeToast] = useState<{ message: string; type: 'success' | 'warning' | 'error'; barcode?: string } | null>(null);
  const barcodeBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Helper for Tiered Pricing
  const getProductPriceForTier = (product: any, tier: PriceTier = selectedPriceTier) => {
    if (tier === 'vip' && Number(product.vipPrice) > 0) return Number(product.vipPrice);
    if (tier === 'wholesale' && Number(product.wholesalePrice) > 0) return Number(product.wholesalePrice);
    if (tier === 'half_wholesale' && Number(product.halfWholesalePrice) > 0) return Number(product.halfWholesalePrice);
    return Number(product.retailPrice ?? product.retail_price ?? product.selling_price ?? product.price ?? 0);
  };

  // Helper for Auto-Calculating Warranty End Date (Months from now)
  const calculateWarrantyEndDate = (months: number = 12) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return d.toISOString().split('T')[0];
  };

  // Initial Data Fetch
  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [prodRes, custRes, shiftRes, heldRes, summaryRes, ratesRes] = await Promise.all([
        api.getProducts(),
        api.getCustomers(),
        api.posGetCurrentShift().catch(() => ({ success: false, data: null })),
        api.posGetHeldSales().catch(() => ({ success: false, data: [] })),
        api.posGetDailySummary().catch(() => ({ success: false, data: null })),
        api.getExchangeRates().catch(() => ({ success: false, data: null })),
      ]);

      const prods = Array.isArray(prodRes) ? prodRes : (prodRes?.data || prodRes?.items || []);
      const custs = Array.isArray(custRes) ? custRes : (custRes?.data || custRes?.items || []);
      // Load held sales from unified key erp_pos_held_orders_v1 first, then api
      const localHeld = (() => {
        try {
          const raw = localStorage.getItem('erp_pos_held_orders_v1') || localStorage.getItem('erp_pos_held_sales_v1');
          return raw ? JSON.parse(raw) : [];
        } catch {
          return [];
        }
      })();
      const remoteHeld = Array.isArray(heldRes?.data) ? heldRes.data : Array.isArray(heldRes) ? heldRes : [];
      const mergedHeld = remoteHeld.length > 0 ? remoteHeld : localHeld;

      setProducts(prods);
      setCustomers(custs);
      setCurrentShift(shiftRes?.data || null);
      setHeldSales(mergedHeld);
      setDailySummary(summaryRes?.data || null);

      if (ratesRes?.data && typeof ratesRes.data === 'object') {
        const mappedRates: Record<string, number> = { YER: 1 };
        if (Array.isArray(ratesRes.data)) {
          ratesRes.data.forEach((r: any) => {
            if (r.target_currency && r.rate) mappedRates[r.target_currency] = Number(r.rate);
          });
        }
        setExchangeRates((prev) => ({ ...prev, ...mappedRates }));
      }

      // Extract unique categories
      const cats = Array.from(new Set(prods.map((p: any) => p.category).filter(Boolean))) as string[];
      setCategories(cats);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل بيانات نقطة البيع');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
    const handleUpdated = () => {
      loadInitialData();
    };
    window.addEventListener('erp-data-updated', handleUpdated);
    window.addEventListener('erp-inventory-updated', handleUpdated);
    window.addEventListener('erp-customers-updated', handleUpdated);
    window.addEventListener('erp-pos-held-updated', handleUpdated);
    window.addEventListener('storage', handleUpdated);
    return () => {
      window.removeEventListener('erp-data-updated', handleUpdated);
      window.removeEventListener('erp-inventory-updated', handleUpdated);
      window.removeEventListener('erp-customers-updated', handleUpdated);
      window.removeEventListener('erp-pos-held-updated', handleUpdated);
      window.removeEventListener('storage', handleUpdated);
    };
  }, []);

  // Sync with live exchange rates
  useEffect(() => {
    const handleExchangeRatesUpdate = () => {
      const stored = getStoredExchangeRates();
      setExchangeRates({
        YER: 1,
        SAR: stored.rates.SAR.accountingRate,
        USD: stored.rates.USD.accountingRate,
      });
    };
    handleExchangeRatesUpdate();
    window.addEventListener(EVENT_EXCHANGE_RATES_CHANGED, handleExchangeRatesUpdate);
    return () => window.removeEventListener(EVENT_EXCHANGE_RATES_CHANGED, handleExchangeRatesUpdate);
  }, []);

  // Shortcut Actions
  const handleCycleTier = () => {
    const tiers: PriceTier[] = ['retail', 'half_wholesale', 'wholesale', 'vip'];
    const currentIndex = tiers.indexOf(selectedPriceTier);
    const nextTier = tiers[(currentIndex + 1) % tiers.length];
    setSelectedPriceTier(nextTier);

    // Update prices in cart based on next tier
    setCart((prev) =>
      prev.map((item) => {
        const prod = products.find((p) => p.id === item.productId);
        if (!prod) return item;
        const baseTierPrice = getProductPriceForTier(prod, nextTier);
        let newUnitPrice = baseTierPrice;
        if (item.selectedUnit === 'major' && item.majorUnitFactor) {
          newUnitPrice = prod.majorUnitPrice || baseTierPrice * item.majorUnitFactor;
        } else if (item.selectedUnit === 'sub' && item.subUnitFactor) {
          newUnitPrice = prod.subUnitPrice || baseTierPrice / item.subUnitFactor;
        }
        return {
          ...item,
          unitPrice: newUnitPrice,
        };
      })
    );
  };

  const handleF4Action = () => {
    if (cart.length === 0) return;
    const lastIndex = cart.length - 1;
    const item = cart[lastIndex];
    if (item.majorUnitName || item.subUnitName) {
      if (item.selectedUnit === 'base' && item.subUnitName) {
        handleUpdateItemUnit(lastIndex, 'sub');
      } else if ((item.selectedUnit === 'base' || item.selectedUnit === 'sub') && item.majorUnitName) {
        handleUpdateItemUnit(lastIndex, 'major');
      } else {
        handleUpdateItemUnit(lastIndex, 'base');
      }
    } else {
      handleUpdateQty(lastIndex, item.quantity + 1);
    }
  };

  // Cart Calculations (Accounting for item discounts and battery scrap deductions)
  const subtotal = cart.reduce(
    (sum, item) =>
      sum +
      item.quantity * item.unitPrice -
      (Number(item.discount) || 0) -
      (Number(item.scrapDiscount) || 0),
    0
  );
  const taxAmount = (subtotal - cartDiscount) * (cartTaxRate / 100);
  const grandTotal = Math.max(0, subtotal - cartDiscount + taxAmount);

  // Check for items in cart priced below purchase cost or zero/empty price
  const belowCostCartItems = React.useMemo(() => {
    return cart.filter((it) => {
      const prod = products.find((p) => p.id === it.productId || p.id === it.product_id);
      const unitCostPrice = Math.round(
        Number(prod?.costPrice || prod?.purchasePrice || prod?.cost_price || (prod as any)?.purchase_price || it.costPrice || it.cost || 0) *
          Number(it.unitFactor || 1)
      );
      const qty = it.quantity || 1;
      const netUnit = qty > 0 ? (qty * it.unitPrice - (Number(it.discount) || 0) - (Number(it.scrapDiscount) || 0)) / qty : it.unitPrice;
      if (unitCostPrice > 0) {
        return Number(it.unitPrice || 0) < unitCostPrice || netUnit < unitCostPrice || Number(it.unitPrice) <= 0;
      }
      return Number(it.unitPrice || 0) <= 0;
    });
  }, [cart, products]);

  const hasBelowCostInCart = belowCostCartItems.length > 0;

  const handleOpenPaymentModal = () => {
    if (cart.length === 0) return;
    if (hasBelowCostInCart) {
      const names = belowCostCartItems.map((it) => it.name).join('، ');
      setError(`⛔ تنبيه رقابي: لا يمكن إتمام البيع بسعر أقل من سعر الشراء لمنع الخسائر! الأصناف: (${names}). يرجى رفع سعر البيع ليغطي التكلفة.`);
      return;
    }
    setIsPaymentModalOpen(true);
  };

  // Helper to embed full rich product identifiers in line items
  const enrichCartItemsWithIdentifiers = (cartItems: POSCartItem[]) => {
    return cartItems.map((it) => {
      const prod = products.find((p) => p.id === it.productId || p.id === it.product_id);
      const barcode = it.barcode || (it.selectedUnit === 'sub' ? prod?.subUnitBarcode : it.selectedUnit === 'major' ? prod?.majorUnitBarcode : prod?.barcode) || prod?.barcode || '';
      const sku = it.sku || prod?.sku || '';
      const itemCode = it.itemCode || it.code || prod?.itemCode || sku;
      const partNumber = it.partNumber || prod?.partNumber || '';
      const serialNumber = it.serialNumber || it.battery_serial_number || '';
      const tireSize = it.tireSize || it.tire_size || prod?.tireSize || '';
      const warranty = it.warrantyMonths || prod?.warrantyMonths || 12;

      return {
        ...it,
        productId: it.productId || it.product_id || prod?.id || null,
        product_id: it.productId || it.product_id || prod?.id || null,
        name: it.name || prod?.name || 'صنف مبيعات',
        item_name: it.name || prod?.name || 'صنف مبيعات',
        product_name: it.name || prod?.name || 'صنف مبيعات',
        barcode,
        sku,
        code: itemCode,
        itemCode,
        item_code: itemCode,
        itemNumber: itemCode,
        partNumber,
        part_number: partNumber,
        serialNumber,
        serial_number: serialNumber,
        battery_serial_number: serialNumber,
        tireSize,
        tire_size: tireSize,
        tireProductionDot: it.tireProductionDot || it.tire_production_dot || prod?.tireProductionDot || '',
        tire_production_dot: it.tireProductionDot || it.tire_production_dot || prod?.tireProductionDot || '',
        warranty,
        warranty_months: warranty,
        warrantyMonths: warranty,
        price: it.unitPrice || it.price,
        unit_price: it.unitPrice || it.price,
        quantity: it.quantity,
        total: it.total || (it.quantity * (it.unitPrice || it.price)),
      };
    });
  };

  const handleQuickCashCheckout = async () => {
    if (cart.length === 0 || checkoutLoading) return;
    if (hasBelowCostInCart) {
      const names = belowCostCartItems.map((it) => it.name).join('، ');
      setError(`⛔ تنبيه رقابي: لا يمكن إتمام البيع بسعر أقل من سعر الشراء لمنع الخسائر! الأصناف: (${names}). يرجى رفع سعر البيع ليغطي التكلفة.`);
      return;
    }
    try {
      setCheckoutLoading(true);
      const accountingRate = getAccountingRate(currency);
      const enrichedCartItems = enrichCartItemsWithIdentifiers(cart);

      const payload = {
        customerId: selectedCustomer?.id || null,
        customerName: selectedCustomer?.name || 'عميل نقدي سريع',
        paymentMethod: 'CASH',
        currency,
        exchangeRate: accountingRate,
        items: enrichedCartItems,
        subtotal,
        discount: cartDiscount,
        tax: taxAmount,
        total: grandTotal,
        paidAmount: grandTotal,
        changeAmount: 0,
      };

      const res = await api.posCheckout(payload);
      const invoiceNum = res.data?.invoice_number || `POS-${Date.now().toString().slice(-6)}`;
      const receiptDataObj = {
        ...payload,
        id: res.data?.id || `sale-${Date.now()}`,
        invoiceNumber: invoiceNum,
        invoice_number: invoiceNum,
        invoiceDate: new Date().toLocaleDateString('ar-YE'),
        receipt: {
          date: new Date().toLocaleDateString('ar-YE'),
          time: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
        },
        customer: selectedCustomer || { name: 'عميل نقدي سريع' },
      };

      // 1. Sync Central Stock Deduction and Movements
      applyStockMovementSync(enrichedCartItems, {
        type: 'pos_sale',
        referenceNumber: invoiceNum,
        customerName: payload.customerName,
        paymentMethod: 'CASH',
        total: grandTotal,
      });

      // 1.1 Record Automatic Treasury Receipt Voucher (سند قبض)
      try {
        recordAutomaticTreasuryVoucher({
          type: 'CUSTOMER_PAYMENT',
          amount: grandTotal,
          currency: currency || 'YER',
          paymentMethod: 'CASH',
          paymentDate: new Date().toISOString().split('T')[0],
          partyId: selectedCustomer?.id || 'cust-direct',
          partyName: payload.customerName,
          partyPhone: selectedCustomer?.phone,
          referenceId: receiptDataObj.id,
          referenceNo: invoiceNum,
          referenceType: 'SALES_INVOICE',
          notes: `سند قبض نقدي سريع نقطة البيع (POS) رقم #${invoiceNum} (العميل: ${payload.customerName})`,
          cashierName: (user?.full_name || (user as any)?.name || 'حميد وهاس').trim(),
        });
      } catch (err) {
        console.warn('Treasury sync warn:', err);
      }

      // 2. Record to Central POS Sales Log
      const posLogRecord = {
        id: res.data?.id || `pos-${Date.now()}`,
        invoiceNumber: invoiceNum,
        invoice_number: invoiceNum,
        date: new Date().toISOString(),
        dateFormatted: new Date().toLocaleDateString('ar-YE'),
        timeFormatted: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
        customerName: payload.customerName,
        customer_name: payload.customerName,
        total: grandTotal,
        paidAmount: grandTotal,
        currency,
        currencySymbol: getActiveCurrencySymbol(currency),
        paymentMethod: 'CASH',
        payment_method: 'CASH',
        itemsCount: enrichedCartItems.reduce((acc, it) => acc + Number(it.quantity || 1), 0),
        items: enrichedCartItems,
        rawPayload: receiptDataObj,
      };

      const existingLogs = (() => {
        try {
          return JSON.parse(localStorage.getItem('erp_pos_sales_log_v1') || '[]');
        } catch {
          return [];
        }
      })();
      const updatedLogs = [posLogRecord, ...existingLogs];
      try {
        localStorage.setItem('erp_pos_sales_log_v1', JSON.stringify(updatedLogs));
      } catch {}
      setPosSalesLog(updatedLogs);

      // 2.1 Also mirror into erp_invoices_v1 for universal returns & accounting
      try {
        const storedInvs = localStorage.getItem('erp_invoices_v1');
        const invList: any[] = storedInvs ? JSON.parse(storedInvs) : [];
        const fullPosInv = {
          ...posLogRecord,
          id: posLogRecord.id,
          invoice_number: invoiceNum,
          customer_id: selectedCustomer?.id || 'cust-direct',
          customer_name: payload.customerName,
          status: 'PAID',
          invoice_date: new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString(),
          items: enrichedCartItems,
        };
        localStorage.setItem('erp_invoices_v1', JSON.stringify([fullPosInv, ...invList.filter((i: any) => i.id !== fullPosInv.id && i.invoice_number !== invoiceNum)]));
        window.dispatchEvent(new Event('erp-invoices-updated'));
      } catch (invErr) {
        console.warn('Sync to erp_invoices_v1 warn:', invErr);
      }

      // 3. Immediately refresh local products to reflect deducted stock
      api.getProducts().then((pRes) => setProducts(pRes.data || [])).catch(() => {});

      setCompletedReceiptData(receiptDataObj);
      setIsReceiptModalOpen(true);
      setCart([]);
      setSelectedCustomer(null);
      setCartDiscount(0);
    } catch (err: any) {
      setError(err.message || 'فشل إتمام الدفع النقدي السريع');
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Keyboard Shortcuts Listener (F2, F4, F6, F8, F9, F10)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F2: Fast focus on barcode & product search
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
      // F3: Quick manual item
      else if (e.key === 'F3') {
        e.preventDefault();
        setIsQuickItemOpen(true);
      }
      // F4: Adjust quantity or toggle unit (piece/carton)
      else if (e.key === 'F4') {
        e.preventDefault();
        handleF4Action();
      }
      // F6: Cycle Price Tier (Retail / Semi-Wholesale / Wholesale / VIP)
      else if (e.key === 'F6') {
        e.preventDefault();
        handleCycleTier();
      }
      // F7: Open held sales drawer
      else if (e.key === 'F7') {
        e.preventDefault();
        setIsHeldDrawerOpen((prev) => !prev);
      }
      // F8: Hold current sale or call held orders
      else if (e.key === 'F8') {
        e.preventDefault();
        if (cart.length > 0) {
          handleHoldSale();
        } else {
          setIsHeldDrawerOpen((prev) => !prev);
        }
      }
      // F9: Quick Cash Checkout & Print
      else if (e.key === 'F9') {
        e.preventDefault();
        if (cart.length > 0) {
          handleQuickCashCheckout();
        }
      }
      // F10: Open Multi-Payment / Credit Modal
      else if (e.key === 'F10' || (e.ctrlKey && e.key === 'Enter')) {
        e.preventDefault();
        if (cart.length > 0) {
          handleOpenPaymentModal();
        }
      }
      // '/' or F1 to focus search bar
      else if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, selectedCustomer, selectedPriceTier, currency, subtotal, grandTotal, cartDiscount, taxAmount, checkoutLoading, hasBelowCostInCart, belowCostCartItems]);

  // Add Product to Cart with Multi-UOM, Tiered Price, & Battery Spec
  const handleAddToCart = (product: any, targetUnit: 'base' | 'sub' | 'major' = 'base') => {
    const basePrice = getProductPriceForTier(product, selectedPriceTier);
    let price = basePrice;
    let unitName = product.baseUnitName || product.unit || 'حبة';
    let unitFactor = 1;

    if (targetUnit === 'sub' && product.subUnitName) {
      unitName = product.subUnitName;
      unitFactor = Number(product.subUnitFactor || 1);
      price = Number(product.subUnitPrice) > 0 ? Number(product.subUnitPrice) : basePrice * unitFactor;
    } else if (targetUnit === 'major' && product.majorUnitName) {
      unitName = product.majorUnitName;
      unitFactor = Number(product.majorUnitFactor || 1);
      price = Number(product.majorUnitPrice) > 0 ? Number(product.majorUnitPrice) : basePrice * unitFactor;
    }

    const isBattery = product.activityType === 'battery';
    const isTire = product.activityType === 'tire';
    const warrantyMonths = Number(product.warrantyMonths || 12);

    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.productId === product.id && item.selectedUnit === targetUnit);
      if (existingIndex > -1) {
        const updated = [...prev];
        const newQty = updated[existingIndex].quantity + 1;
        const lineScrap = Number(updated[existingIndex].scrapDiscount || 0);
        const lineDisc = Number(updated[existingIndex].discount || 0);
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          total: Math.max(0, newQty * updated[existingIndex].unitPrice - lineDisc - lineScrap),
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            id: 'cart_' + Date.now() + '_' + Math.random(),
            productId: product.id,
            name: product.name,
            sku: product.sku,
            itemCode: product.itemCode || product.sku,
            partNumber: product.partNumber,
            barcode: targetUnit === 'sub' ? product.subUnitBarcode : targetUnit === 'major' ? product.majorUnitBarcode : product.barcode,
            category: product.category,
            activityType: product.activityType,
            unit: unitName,
            unitName: unitName,
            selectedUnit: targetUnit,
            unitFactor: unitFactor,
            baseUnitName: product.baseUnitName || product.unit || 'حبة',
            subUnitName: product.subUnitName,
            subUnitFactor: Number(product.subUnitFactor || 1),
            subUnitPrice: Number(product.subUnitPrice || 0),
            majorUnitName: product.majorUnitName,
            majorUnitFactor: Number(product.majorUnitFactor || 1),
            majorUnitPrice: Number(product.majorUnitPrice || 0),
            quantity: 1,
            unitPrice: price,
            price: price,
            retailPrice: price,
            discount: 0,
            tax: 0,
            total: price,
            currentStock: Number(product.current_stock ?? product.qty ?? 0),
            serialNumber: isBattery ? '' : undefined,
            warrantyMonths: isBattery || isTire ? warrantyMonths : undefined,
            warrantyEndDate: isBattery || isTire ? calculateWarrantyEndDate(warrantyMonths) : undefined,
            scrapDiscount: 0,
            tireSize: product.tireSize,
            tireProductionDot: product.tireProductionDot,
            tirePlyOrigin: product.tirePlyOrigin,
          },
        ];
      }
    });
  };

  // Update Cart Item Unit ('base' | 'sub' | 'major')
  const handleUpdateItemUnit = (index: number, newUnit: 'base' | 'sub' | 'major') => {
    setCart((prev) => {
      const updated = [...prev];
      const item = updated[index];
      let unitName = item.baseUnitName || item.unit || 'حبة';
      let unitFactor = 1;
      let unitPrice = item.retailPrice || item.unitPrice;

      if (newUnit === 'sub' && item.subUnitName) {
        unitName = item.subUnitName;
        unitFactor = item.subUnitFactor || 1;
        unitPrice = item.subUnitPrice > 0 ? item.subUnitPrice : (item.retailPrice * unitFactor);
      } else if (newUnit === 'major' && item.majorUnitName) {
        unitName = item.majorUnitName;
        unitFactor = item.majorUnitFactor || 1;
        unitPrice = item.majorUnitPrice > 0 ? item.majorUnitPrice : (item.retailPrice * unitFactor);
      }

      const scrap = Number(item.scrapDiscount || 0);
      const disc = Number(item.discount || 0);
      const lineTotal = Math.max(0, item.quantity * unitPrice - disc - scrap);

      updated[index] = {
        ...item,
        selectedUnit: newUnit,
        unit: unitName,
        unitName,
        unitFactor,
        unitPrice,
        price: unitPrice,
        total: lineTotal,
      };
      return updated;
    });
  };

  // Update Battery Serial Number in Cart
  const handleUpdateSerial = (index: number, serial: string) => {
    setCart((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], serialNumber: serial };
      return updated;
    });
  };

  // Update Battery Scrap Trade-In Discount
  const handleUpdateScrapDiscount = (index: number, scrap: number) => {
    setCart((prev) => {
      const updated = [...prev];
      const item = updated[index];
      const scrapVal = Math.max(0, scrap);
      const lineTotal = Math.max(0, item.quantity * item.unitPrice - (Number(item.discount) || 0) - scrapVal);
      updated[index] = { ...item, scrapDiscount: scrapVal, total: lineTotal };
      return updated;
    });
  };

  // Add Quick Item to Cart
  const handleAddQuickItem = (quickItem: POSCartItem) => {
    setCart((prev) => [...prev, quickItem]);
    setScannedUnmatchedBarcode(null);
  };

  // Universal Barcode Lookup & Auto-Add Handler (Hardware & Soft Search)
  const lookupAndAddProductByBarcode = (scannedRaw: string): boolean => {
    const normalized = normalizeScannedBarcode(scannedRaw);
    if (!normalized) return false;

    // Global scan deduplication lock (prevents duplicate add when scanner fires enter or both input+burst trigger)
    if (!shouldProcessBarcodeScan(normalized, 450)) {
      setSearchQuery('');
      if (searchInputRef.current) searchInputRef.current.value = '';
      return false;
    }

    const match = findProductByBarcode(products, normalized);

    if (match) {
      playBarcodeBeep('success');
      handleAddToCart(match.product, match.unit);
      setSearchQuery('');
      if (searchInputRef.current) searchInputRef.current.value = '';
      setScannedUnmatchedBarcode(null);
      setBarcodeToast({
        message: `تم مسح وإضافة: ${match.product.name} (${
          match.unit === 'sub'
            ? match.product.subUnitName || 'وحدة فرعية'
            : match.unit === 'major'
            ? match.product.majorUnitName || 'وحدة كبرى'
            : match.product.unit || 'حبة'
        })`,
        type: 'success',
        barcode: normalized,
      });
      setTimeout(() => setBarcodeToast(null), 3500);
      return true;
    } else {
      playBarcodeBeep('warning');
      setScannedUnmatchedBarcode(normalized);
      setBarcodeToast({
        message: `⚠️ الباركود غير مسجل في المخزون: ${normalized}`,
        type: 'warning',
        barcode: normalized,
      });
      return false;
    }
  };

  // 70ms Instant exact-match auto-add when typing or scanning into the search input
  // Automatically adds item to cart without requiring Enter when exact barcode/code match is found
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 4) return;
    const timer = setTimeout(() => {
      const match = findProductByBarcode(products, searchQuery);
      if (match) {
        const norm = normalizeScannedBarcode(searchQuery);
        if (!shouldProcessBarcodeScan(norm, 450)) {
          setSearchQuery('');
          if (searchInputRef.current) searchInputRef.current.value = '';
          return;
        }
        playBarcodeBeep('success');
        handleAddToCart(match.product, match.unit);
        setSearchQuery('');
        if (searchInputRef.current) searchInputRef.current.value = '';
        setScannedUnmatchedBarcode(null);
        setBarcodeToast({
          message: `تم مسح وإضافة: ${match.product.name} (${
            match.unit === 'sub'
              ? match.product.subUnitName || 'وحدة فرعية'
              : match.unit === 'major'
              ? match.product.majorUnitName || 'وحدة كبرى'
              : match.product.unit || 'حبة'
          })`,
          type: 'success',
          barcode: norm,
        });
        setTimeout(() => setBarcodeToast(null), 3500);
        searchInputRef.current?.focus();
      }
    }, 70);
    return () => clearTimeout(timer);
  }, [searchQuery, products, selectedPriceTier]);

  // Global Hardware Barcode Scanner Listener
  // Intercepts rapid USB HID / Bluetooth scanner bursts and auto-submits on burst completion (<65ms + 80ms debounce) without requiring Enter!
  useEffect(() => {
    const cleanup = attachGlobalBarcodeScannerListener({
      minBarcodeLength: 2,
      burstMaxIntervalMs: 65,
      endDebounceMs: 80,
      onScan: (scanned) => {
        lookupAndAddProductByBarcode(scanned);
      },
      shouldIgnore: () => {
        // Do not intercept if any modal is open
        if (
          isQuickItemOpen ||
          isPaymentModalOpen ||
          isReceiptModalOpen ||
          isReturnsModalOpen ||
          isShiftModalOpen ||
          isPosDailySalesOpen ||
          isHeldDrawerOpen ||
          isAIAssistantOpen
        ) {
          return true;
        }

        // Check active input
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
  }, [
    products,
    isQuickItemOpen,
    isPaymentModalOpen,
    isReceiptModalOpen,
    isReturnsModalOpen,
    isShiftModalOpen,
    isPosDailySalesOpen,
    isHeldDrawerOpen,
    isAIAssistantOpen,
    selectedPriceTier,
  ]);

  // Barcode / Fast Search handler
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const normalized = normalizeScannedBarcode(searchQuery);
    lookupAndAddProductByBarcode(normalized);
  };

  // Update Cart Item Quantity
  const handleUpdateQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveCartItem(index);
      return;
    }
    setCart((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        quantity: newQty,
        total: newQty * updated[index].unitPrice - (updated[index].discount || 0),
      };
      return updated;
    });
  };

  // Update Cart Item Price (with permission check)
  const handleUpdatePrice = (index: number, newPrice: number) => {
    setCart((prev) => {
      const updated = [...prev];
      const p = Math.max(0, newPrice);
      const scrap = Number(updated[index].scrapDiscount || 0);
      const disc = Number(updated[index].discount || 0);
      updated[index] = {
        ...updated[index],
        unitPrice: p,
        price: p,
        retailPrice: p,
        total: Math.max(0, updated[index].quantity * p - disc - scrap),
      };
      return updated;
    });
  };

  // Remove Cart Item
  const handleRemoveCartItem = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  // Clear Cart
  const handleClearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setCartDiscount(0);
    setError(null);
  };

  // Hold Current Sale (Normal Cash Hold)
  const handleHoldSale = async () => {
    if (cart.length === 0) return;
    try {
      const effectiveCustName = selectedCustomer?.name || 'عميل نقدي';
      const effectiveCustId = selectedCustomer?.id || null;
      const refLabel = `طلب ${effectiveCustName} - ${new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}`;
      const heldId = `held_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const enrichedCart = enrichCartItemsWithIdentifiers(cart);

      const newHeldRecord: POSHeldSale = {
        id: heldId,
        reference_no: `HLD-${Date.now().toString().slice(-5)}`,
        holdType: 'NORMAL',
        customer: selectedCustomer || null,
        customer_id: effectiveCustId,
        customer_name: effectiveCustName,
        customerPhone: selectedCustomer?.phone || '',
        items: enrichedCart,
        cart_data: enrichedCart,
        cartData: enrichedCart,
        held_at: new Date().toISOString(),
        heldAt: new Date().toISOString(),
        total: grandTotal,
        totalAmount: grandTotal,
        currency,
        note: refLabel,
      };

      // 1. Immediately store in unified localStorage key
      const stored = localStorage.getItem('erp_pos_held_orders_v1') || localStorage.getItem('erp_pos_held_sales_v1');
      const list: any[] = stored ? JSON.parse(stored) : [];
      const updated = [newHeldRecord, ...list.filter((h: any) => h.id !== heldId)];
      localStorage.setItem('erp_pos_held_orders_v1', JSON.stringify(updated));
      localStorage.setItem('erp_pos_held_sales_v1', JSON.stringify(updated));
      setHeldSales(updated);
      window.dispatchEvent(new Event('erp-pos-held-updated'));

      // 2. Mirror to API / localDesktopApiFallback
      api.posHoldSale({
        ...newHeldRecord,
        customerId: effectiveCustId,
        customerName: effectiveCustName,
        cartData: enrichedCart,
        totalAmount: grandTotal,
        currency,
        referenceLabel: refLabel,
      }).catch(console.warn);

      setSuccess('تم تعليق الفاتورة بنجاح في قائمة الطلبات المعلقة (F7)');
      handleClearCart();
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      setError(err.message || 'فشل تعليق الفاتورة');
    }
  };

  // Hold Credit Sale (تعليق آجل لحساب العميل)
  const handleHoldCreditSale = async (overrideCustomer?: { id?: string; name: string; phone?: string; note?: string; receivedBy?: string }) => {
    if (cart.length === 0) return;

    const targetCustomer = overrideCustomer || selectedCustomer;
    if (!targetCustomer || !targetCustomer.name?.trim()) {
      // Open quick customer picker
      setIsCreditHoldPickerOpen(true);
      return;
    }

    const effectiveCustName = targetCustomer.name.trim();
    const effectiveCustId = targetCustomer.id || null;
    const effectivePhone = targetCustomer.phone || '';
    const effectiveNote = overrideCustomer?.note || `تعليق آجل - لحساب العميل: ${effectiveCustName}`;
    const effectiveReceivedBy = overrideCustomer?.receivedBy || creditHoldReceivedBy.trim() || undefined;
    const heldId = `held_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const enrichedCart = enrichCartItemsWithIdentifiers(cart);

    const newCreditHeld: POSHeldSale = {
      id: heldId,
      reference_no: `CR-HLD-${Date.now().toString().slice(-5)}`,
      holdType: 'CREDIT',
      paymentMethod: 'CREDIT',
      customer: { id: effectiveCustId, name: effectiveCustName, phone: effectivePhone },
      customer_id: effectiveCustId,
      customer_name: effectiveCustName,
      customerPhone: effectivePhone,
      receivedBy: effectiveReceivedBy,
      items: enrichedCart,
      cart_data: enrichedCart,
      cartData: enrichedCart,
      held_at: new Date().toISOString(),
      heldAt: new Date().toISOString(),
      total: grandTotal,
      totalAmount: grandTotal,
      currency,
      note: effectiveNote,
    };

    // 1. Save locally
    try {
      const stored = localStorage.getItem('erp_pos_held_orders_v1') || localStorage.getItem('erp_pos_held_sales_v1');
      const list: any[] = stored ? JSON.parse(stored) : [];
      const updated = [newCreditHeld, ...list.filter((h: any) => h.id !== heldId)];
      localStorage.setItem('erp_pos_held_orders_v1', JSON.stringify(updated));
      localStorage.setItem('erp_pos_held_sales_v1', JSON.stringify(updated));
      setHeldSales(updated);
      window.dispatchEvent(new Event('erp-pos-held-updated'));
    } catch (e) {
      console.warn('Failed to save credit held order locally:', e);
    }

    // 2. Mirror to API / localDesktopApiFallback
    try {
      await api.posHoldSale({
        ...newCreditHeld,
        customerId: effectiveCustId,
        customerName: effectiveCustName,
        customerPhone: effectivePhone,
        cartData: enrichedCart,
        totalAmount: grandTotal,
        currency,
        referenceLabel: effectiveNote,
      });
    } catch (apiErr) {
      console.warn('api.posHoldSale warning:', apiErr);
    }

    setIsCreditHoldPickerOpen(false);
    handleClearCart();
    setSuccess(`تم تعليق الفاتورة الآجلة باسم العميل: ${effectiveCustName}`);
    setTimeout(() => setSuccess(null), 4000);
  };

  // Resume Held Sale into Active Cart
  const handleResumeHeldSale = async (held: POSHeldSale) => {
    try {
      const itemsList = held.items || held.cart_data || held.cartData || [];
      setCart(itemsList);
      const custName = held.customer_name || held.customer?.name;
      const custId = held.customer_id || held.customer?.id;
      if (custId || custName) {
        const cust = customers.find((c) => c.id === custId || c.name === custName);
        setSelectedCustomer(cust || { id: custId || `cust-${Date.now()}`, name: custName, phone: held.customerPhone });
      } else {
        setSelectedCustomer(null);
      }
      await handleDeleteHeldSale(held.id);
      setSuccess(`تم استرجاع الفاتورة المعلقة (${custName || 'نقدي'}) إلى السلة بنجاح`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'فشل استرجاع الفاتورة');
    }
  };

  // Delete Held Sale
  const handleDeleteHeldSale = async (heldId: string) => {
    try {
      const stored = localStorage.getItem('erp_pos_held_orders_v1') || localStorage.getItem('erp_pos_held_sales_v1');
      if (stored) {
        try {
          const list: any[] = stored ? JSON.parse(stored) : [];
          const filtered = list.filter((h: any) => h.id !== heldId && h.reference_no !== heldId);
          localStorage.setItem('erp_pos_held_orders_v1', JSON.stringify(filtered));
          localStorage.setItem('erp_pos_held_sales_v1', JSON.stringify(filtered));
          setHeldSales(filtered);
        } catch {}
      }
      await api.posDeleteHeldSale(heldId).catch(console.warn);
      window.dispatchEvent(new Event('erp-pos-held-updated'));
    } catch (err: any) {
      setError(err.message || 'فشل حذف الفاتورة المعلقة');
    }
  };

  // Direct Credit Posting for Held Sale (اعتماد آجل لحساب العميل)
  const handlePostCreditHeldSale = async (heldSale: POSHeldSale) => {
    try {
      const invNum = `INV-CR-${Date.now().toString().slice(-6)}`;
      const effectiveSalesperson = (user?.full_name || (user as any)?.name || 'حميد وهاس').trim();
      const rawCustomer = heldSale.customer || (heldSale.customer_id ? customers.find((c) => c.id === heldSale.customer_id) : null);
      const effectiveCustName = heldSale.customer_name || rawCustomer?.name || 'عميل آجل';
      const effectiveCustId = heldSale.customer_id || rawCustomer?.id || `cust-${Date.now()}`;
      const itemsList = heldSale.items || heldSale.cart_data || heldSale.cartData || [];
      const saleTotal = Number(heldSale.total || heldSale.totalAmount || 0);

      const enrichedItems = enrichCartItemsWithIdentifiers(itemsList);

      // 1. Deduct stock via applyStockMovementSync
      applyStockMovementSync(enrichedItems, {
        type: 'sale',
        referenceNumber: invNum,
        customerName: effectiveCustName,
        paymentMethod: 'CREDIT',
        total: saleTotal,
        currency,
        notes: `فاتورة مبيعات آجلة مرحلة من الفواتير المعلقة #${heldSale.reference_no || heldSale.id}`,
      });

      // 2. Build Credit Invoice object
      const effectiveRecBy = heldSale.receivedBy || (heldSale as any).received_by || undefined;
      const creditInvoice = {
        id: `inv-${Date.now()}`,
        invoice_number: invNum,
        customer_id: effectiveCustId,
        customer: effectiveCustName,
        customer_name: effectiveCustName,
        customerName: effectiveCustName,
        salesperson: effectiveSalesperson,
        salesperson_name: effectiveSalesperson,
        receivedBy: effectiveRecBy,
        received_by: effectiveRecBy,
        total: saleTotal,
        totalAmount: saleTotal,
        grandTotal: saleTotal,
        paid_amount: 0,
        paidAmount: 0,
        remaining_amount: saleTotal,
        remainingAmount: saleTotal,
        currency,
        payment_method: 'CREDIT',
        status: 'UNPAID',
        items: enrichedItems,
        created_at: new Date().toISOString(),
        invoice_date: new Date().toISOString().split('T')[0],
        notes: `فاتورة مبيعات آجلة مرحلة لحساب العميل: ${effectiveCustName}${effectiveRecBy ? ` - المستلم: ${effectiveRecBy}` : ''}`,
      };

      if (effectiveCustId) {
        api.addCustomerTransaction(effectiveCustId, {
          type: 'DEBIT',
          amount: saleTotal,
          currency,
          description: `فاتورة مبيعات آجلة رقم ${invNum}${effectiveRecBy ? ` - المستلم: ${effectiveRecBy}` : ''}`,
          referenceNo: invNum,
          receivedBy: effectiveRecBy,
          received_by: effectiveRecBy,
        }).catch(console.warn);
      }

      // 3. Save to erp_invoices_v1
      try {
        const storedInvs = localStorage.getItem('erp_invoices_v1');
        const list: any[] = storedInvs ? JSON.parse(storedInvs) : [];
        localStorage.setItem('erp_invoices_v1', JSON.stringify([creditInvoice, ...list.filter((i) => i.id !== creditInvoice.id)]));
      } catch (e) {
        console.warn('Failed to save credit invoice to storage:', e);
      }

      // 4. Update customer balance in erp_customers_v1
      try {
        const storedCusts = localStorage.getItem('erp_customers_v1');
        const custList: any[] = storedCusts ? JSON.parse(storedCusts) : [];
        let found = false;
        const updatedCustList = custList.map((c) => {
          if (c.id === effectiveCustId || c.name?.trim() === effectiveCustName.trim()) {
            found = true;
            const newBal = Number(c.balance || c.current_balance || 0) + saleTotal;
            return {
              ...c,
              balance: newBal,
              current_balance: newBal,
              total_sales: Number(c.total_sales || 0) + saleTotal,
            };
          }
          return c;
        });
        if (!found) {
          updatedCustList.push({
            id: effectiveCustId,
            name: effectiveCustName,
            phone: heldSale.customerPhone || '',
            balance: saleTotal,
            current_balance: saleTotal,
            total_sales: saleTotal,
            currency,
            status: 'active',
          });
        }
        localStorage.setItem('erp_customers_v1', JSON.stringify(updatedCustList));
        setCustomers(updatedCustList);
        window.dispatchEvent(new Event('erp-customers-updated'));
      } catch (e) {
        console.warn('Failed to update customer balance:', e);
      }

      // 5. Delete from held orders
      await handleDeleteHeldSale(heldSale.id);

      // 6. Broadcast updates
      window.dispatchEvent(new Event('erp-invoices-updated'));
      window.dispatchEvent(new Event('erp-inventory-updated'));
      window.dispatchEvent(new Event('erp-data-updated'));

      setSuccess(`تم اعتماد وترحيل الفاتورة الآجلة بقيمة ${formatAmount(saleTotal, currency)} لحساب العميل "${effectiveCustName}" بنجاح!`);
      setTimeout(() => setSuccess(null), 4500);
    } catch (err: any) {
      setError(err.message || 'فشل ترحيل الفاتورة الآجلة لحساب العميل');
    }
  };

  // Execute Checkout Transaction
  const handleConfirmPayment = async (paymentData: any) => {
    try {
      setCheckoutLoading(true);
      setError(null);

      const exchangeRate = exchangeRates[currency] || 1.0;
      const effectiveSalesperson = (user?.full_name || (user as any)?.name || 'حميد وهاس').trim();
      const effectiveCustomer = (selectedCustomer?.name || 'عميل نقدي').trim();
      const enrichedCartItems = enrichCartItemsWithIdentifiers(cart);

      const payload = {
        customerId: selectedCustomer?.id || undefined,
        customerName: effectiveCustomer,
        customer: effectiveCustomer,
        salesperson: effectiveSalesperson,
        salespersonName: effectiveSalesperson,
        cashierName: effectiveSalesperson,
        createdBy: effectiveSalesperson,
        items: enrichedCartItems,
        subtotal,
        discount: cartDiscount,
        tax: taxAmount,
        total: grandTotal,
        paidAmount: paymentData.paidAmount,
        remainingAmount: paymentData.remainingAmount,
        changeAmount: paymentData.changeAmount,
        paymentMethod: paymentData.paymentMethod,
        payments: paymentData.payments,
        currency,
        exchangeRate,
        shiftId: currentShift?.id || undefined,
        notes: paymentData.notes,
        overrideCreditLimit: paymentData.overrideCreditLimit,
        receivedBy: (paymentData as any).receivedBy,
        received_by: (paymentData as any).receivedBy,
      };

      const res = await api.posCheckout(payload);

      if (res.success && res.data) {
        const invNum = res.data?.invoice_number || res.data?.invoiceNumber || `POS-${Date.now().toString().slice(-6)}`;
        const prevBal = selectedCustomer ? Number(selectedCustomer.current_balance || selectedCustomer.balance || 0) : undefined;
        const newBal = prevBal !== undefined ? (prevBal + (paymentData.remainingAmount || 0)) : undefined;

        // 1. Sync Central Stock Deduction and Movements
        applyStockMovementSync(enrichedCartItems, {
          type: 'pos_sale',
          referenceNumber: invNum,
          customerName: effectiveCustomer,
          paymentMethod: paymentData.paymentMethod || 'MULTI',
          total: grandTotal,
          currency,
        });

        // 2. Record to Central Invoices and POS Sales Log
        const finalPosInvoice = {
          ...res.data,
          id: res.data?.id || `pos-${Date.now()}`,
          invoice_number: invNum,
          customer_name: effectiveCustomer,
          customer: effectiveCustomer,
          customerName: effectiveCustomer,
          clientName: effectiveCustomer,
          salesperson_name: effectiveSalesperson,
          salesperson: effectiveSalesperson,
          cashier_name: effectiveSalesperson,
          cashierName: effectiveSalesperson,
          createdBy: effectiveSalesperson,
          receivedBy: (paymentData as any).receivedBy,
          received_by: (paymentData as any).receivedBy,
          previousBalance: prevBal,
          previous_balance: prevBal,
          newBalance: newBal,
          new_balance: newBal,
          total: grandTotal,
          totalAmount: grandTotal,
          grandTotal: grandTotal,
          netTotal: grandTotal,
          paid_amount: paymentData.paidAmount,
          paidAmount: paymentData.paidAmount,
          remaining_amount: paymentData.remainingAmount || 0,
          remainingAmount: paymentData.remainingAmount || 0,
          currency,
          payment_method: paymentData.paymentMethod || 'MULTI',
          status: (paymentData.remainingAmount || 0) <= 0.01 ? 'PAID' : paymentData.paidAmount > 0 ? 'PARTIAL' : 'PENDING',
          items: enrichedCartItems,
          created_at: new Date().toISOString(),
          invoice_date: new Date().toISOString().split('T')[0],
        };

        try {
          const stored = localStorage.getItem('erp_invoices_v1');
          const existingList: any[] = stored ? JSON.parse(stored) : [];
          localStorage.setItem(
            'erp_invoices_v1',
            JSON.stringify([finalPosInvoice, ...existingList.filter((i) => i.id !== finalPosInvoice.id && i.invoice_number !== invNum)])
          );
          window.dispatchEvent(new CustomEvent('erp-invoices-updated'));

          // Enqueue into persistent Transactional Outbox (CR-2026-TAURI-OFFLINE-SYNC-001)
          enqueueOutboxTransaction('POS_SALE_CREATE', finalPosInvoice, {
            dependencyOrder: 20,
            idempotencyKey: `pos_${finalPosInvoice.id}`,
          }).catch((e) => console.warn('[OUTBOX_POS_WARN]', e));
        } catch (e) {
          console.error('Failed to sync POS invoice to erp_invoices_v1:', e);
        }

        // Record automatic treasury receipt voucher (سند قبض) if paid amount > 0
        if (Number(paymentData.paidAmount) > 0) {
          try {
            recordAutomaticTreasuryVoucher({
              type: 'CUSTOMER_PAYMENT',
              amount: Number(paymentData.paidAmount),
              currency: currency || 'YER',
              paymentMethod: paymentData.paymentMethod || 'CASH',
              paymentDate: new Date().toISOString().split('T')[0],
              partyId: selectedCustomer?.id || 'cust-direct',
              partyName: effectiveCustomer,
              partyPhone: selectedCustomer?.phone,
              referenceId: finalPosInvoice.id,
              referenceNo: invNum,
              referenceType: 'SALES_INVOICE',
              notes: `سند قبض آلي عن مبيعات نقطة البيع (POS) رقم #${invNum} (العميل: ${effectiveCustomer})`,
              cashierName: effectiveSalesperson,
            });
          } catch (pmtErr) {
            console.error('Failed to record automatic treasury voucher from POS:', pmtErr);
          }
        }

        // If credit balance remaining, sync customer balance and ledger movement
        if (paymentData.remainingAmount > 0 && selectedCustomer?.name) {
          if (selectedCustomer.id) {
            api.addCustomerTransaction(selectedCustomer.id, {
              type: 'DEBIT',
              amount: paymentData.remainingAmount,
              currency,
              description: `فاتورة مبيعات نقطة البيع رقم ${invNum}${(paymentData as any).receivedBy ? ` - المستلم: ${(paymentData as any).receivedBy}` : ''}`,
              referenceNo: invNum,
              receivedBy: (paymentData as any).receivedBy,
              received_by: (paymentData as any).receivedBy,
            }).catch(console.warn);
          }

          try {
            const custStored = localStorage.getItem('erp_customers_v1');
            const custList: any[] = custStored ? JSON.parse(custStored) : [];
            const updatedCustList = custList.map((c) => {
              if (c.id === selectedCustomer.id || c.name?.trim() === selectedCustomer.name.trim()) {
                return {
                  ...c,
                  current_balance: Number(c.current_balance || 0) + Number(paymentData.remainingAmount),
                  total_sales: Number(c.total_sales || 0) + grandTotal,
                };
              }
              return c;
            });
            localStorage.setItem('erp_customers_v1', JSON.stringify(updatedCustList));
            window.dispatchEvent(new CustomEvent('erp-customers-updated'));
          } catch (e) {
            console.error('Failed to update customer balance from POS:', e);
          }
        }

        const posLogRecord = {
          id: res.data?.id || `pos-${Date.now()}`,
          invoiceNumber: invNum,
          date: new Date().toISOString(),
          dateFormatted: new Date().toLocaleDateString('ar-YE'),
          timeFormatted: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
          customerName: effectiveCustomer,
          salespersonName: effectiveSalesperson,
          total: grandTotal,
          paidAmount: paymentData.paidAmount,
          currency,
          currencySymbol: getActiveCurrencySymbol(currency),
          paymentMethod: paymentData.paymentMethod || 'MULTI',
          itemsCount: cart.reduce((acc, it) => acc + Number(it.quantity || 1), 0),
          items: cart.map((it) => ({
            name: it.name,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            total: it.quantity * it.unitPrice - (it.discount || 0),
          })),
          rawPayload: res.data,
        };

        const existingLogs = (() => {
          try {
            return JSON.parse(localStorage.getItem('erp_pos_sales_log_v1') || '[]');
          } catch {
            return [];
          }
        })();
        const updatedLogs = [posLogRecord, ...existingLogs];
        try {
          localStorage.setItem('erp_pos_sales_log_v1', JSON.stringify(updatedLogs));
        } catch {}
        setPosSalesLog(updatedLogs);

        setCompletedReceiptData(finalPosInvoice);
        setIsPaymentModalOpen(false);
        setIsReceiptModalOpen(true);
        handleClearCart();

        // Refresh Shift, Daily Summary & Products Stock
        const [shiftRes, summaryRes, prodRes] = await Promise.all([
          api.posGetCurrentShift().catch(() => ({ success: false, data: null })),
          api.posGetDailySummary().catch(() => ({ success: false, data: null })),
          api.getProducts().catch(() => ({ success: false, data: [] })),
        ]);
        setCurrentShift(shiftRes.data || null);
        setDailySummary(summaryRes.data || null);
        if (prodRes.data) setProducts(prodRes.data);
      } else {
        setError(res.error?.message || 'فشلت عملية إتمام البيع');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء معالجة الفاتورة');
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.barcode && p.barcode.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayPosSales = posSalesLog.filter((log) => {
    if (!log.date) return false;
    return log.date.startsWith(todayDateStr);
  });

  return (
    <div className="flex flex-col h-[calc(100vh-4.5rem)] bg-slate-950 text-slate-100 overflow-hidden font-sans" dir="rtl">
      {/* Top POS Action & Status Bar */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-2.5 flex items-center justify-between gap-3 shrink-0">
        {/* Left Status: Shift & Cashier */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsShiftModalOpen(true)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
              currentShift
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
            }`}
            title="إدارة وردية الكاشير وحركات الدرج (F9)"
          >
            {currentShift ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            <span>{currentShift ? `الوردية #${currentShift.shift_number}` : 'الوردية مغلقة (اضغط لفتح وردية)'}</span>
          </button>

          {/* Daily Sales Quick Stat */}
          {dailySummary && (
            <div className="hidden lg:flex items-center gap-3 px-3 py-1 bg-slate-800/60 rounded-xl text-xs border border-slate-800">
              <span className="text-slate-400">مبيعات اليوم:</span>
              <span className="font-black text-emerald-400">
                {Number(dailySummary.netSales || 0).toLocaleString()} {currSym}
              </span>
              <span className="text-slate-500">({dailySummary.totalInvoices || 0} فاتورة)</span>
            </div>
          )}
        </div>

        {/* Action Buttons: Hold, Return, AI, Quick Item, Invoices */}
        <div className="flex items-center gap-2">
          {/* Daily Sales Log Button */}
          <button
            type="button"
            onClick={() => setIsPosDailySalesOpen(true)}
            className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            title="عرض سجل مبيعات الكاشير اليومية وإعادة الطباعة والمرتجع"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            <span>📜 سجل مبيعات النقطة ({todayPosSales.length})</span>
          </button>

          {/* Quick Item Manual Sale (F3) */}
          <button
            onClick={() => setIsQuickItemOpen(true)}
            className="px-3 py-1.5 bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            title="إضافة صنف يدوي غير مسجل (F3)"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>صنف سريع (F3)</span>
          </button>

          {/* Held Sales Drawer Button (F7) */}
          <button
            onClick={() => setIsHeldDrawerOpen(true)}
            className="relative px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            title="عرض الفواتير المعلقة (F7)"
          >
            <Pause className="w-3.5 h-3.5" />
            <span>المعلق (F7)</span>
            {heldSales.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black flex items-center justify-center -mr-1">
                {heldSales.length}
              </span>
            )}
          </button>

          {/* Sales Returns Modal (F8) */}
          <button
            onClick={() => setIsReturnsModalOpen(true)}
            className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            title="مرتجع مبيعات واسترداد (F8)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>مرتجع (F8)</span>
          </button>

          {/* POS AI Assistant */}
          <button
            onClick={() => setIsAIAssistantOpen(true)}
            className="px-3 py-1.5 bg-purple-600/15 hover:bg-purple-600/25 text-purple-400 border border-purple-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">مساعد POS</span>
          </button>

          {/* POS Module Settings Button */}
          <ModuleSettingsModal module="pos" buttonLabel="⚙️ إعدادات القسم" />

          {/* Currency Switcher */}
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="YER">ريال يمني (YER)</option>
            <option value="SAR">ريال سعودي (SAR)</option>
            <option value="USD">دولار أمريكي (USD)</option>
          </select>

          {/* Switch to Detailed Invoices Manager */}
          {onNavigateToInvoices && (
            <button
              onClick={onNavigateToInvoices}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all"
              title="الانتقال إلى سجل الفواتير الشامل"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden md:inline">سجل الفواتير</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Workspace: Left Catalog + Right Cart */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Product Search, Category Pills, & Catalog Grid */}
        <section className="flex-1 flex flex-col min-w-0 border-l border-slate-800/80 bg-slate-950/60 p-4 space-y-3">
          {/* Price Tier Selector Bar */}
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 p-2 rounded-2xl shrink-0 overflow-x-auto">
            <span className="text-xs font-bold text-slate-400 px-1 shrink-0 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-emerald-400" />
              مستوى التسعير:
            </span>
            {[
              { id: 'retail', label: 'تجزئة (Retail)', icon: '🛍️' },
              { id: 'half_wholesale', label: 'نصف جملة', icon: '📦' },
              { id: 'wholesale', label: 'جملة (Wholesale)', icon: '🏬' },
              { id: 'vip', label: 'VIP كبار العملاء', icon: '⭐' },
            ].map((tier) => (
              <button
                key={tier.id}
                type="button"
                onClick={() => setSelectedPriceTier(tier.id as PriceTier)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  selectedPriceTier === tier.id
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-950/40 border border-emerald-400/40'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span>{tier.icon}</span>
                <span>{tier.label}</span>
              </button>
            ))}
          </div>

          {/* Universal Fast Search & Barcode Bar */}
          <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Barcode className="w-5 h-5 text-emerald-400 absolute right-3.5 top-2.5" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (searchQuery.trim()) {
                      handleBarcodeSubmit(e);
                    }
                  }
                }}
                placeholder="امسح الباركود بجهاز المسح، أو ابحث بالاسم والرمز (SKU)... [ / للتركيز ]"
                className="w-full bg-slate-900 border border-slate-700/80 rounded-2xl pr-11 pl-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-inner"
              />
            </div>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="px-3 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl text-xs"
              >
                مسح
              </button>
            )}
          </form>

          {/* Barcode Scanner Unmatched Alert & 1-Click Quick Register */}
          {scannedUnmatchedBarcode && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 flex items-center justify-between gap-3 text-xs animate-in fade-in">
              <div className="flex items-center gap-2 text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  الباركود <strong className="font-mono text-amber-200">{scannedUnmatchedBarcode}</strong> غير مسجل في المخزون.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsQuickItemOpen(true)}
                  className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl text-xs hover:from-emerald-500 hover:to-teal-500 shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>تسجيل وبيع الصنف سريعاً (F3)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScannedUnmatchedBarcode(null)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Barcode Scan Success Toast */}
          {barcodeToast && barcodeToast.type === 'success' && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-2.5 flex items-center justify-between text-xs text-emerald-300 animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-medium">{barcodeToast.message}</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/20 px-2 py-0.5 rounded-full">
                ⚡ HID Scanner Beep
              </span>
            </div>
          )}

          {/* Category Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar shrink-0">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === 'ALL'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              جميع الأصناف ({products.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center h-64 text-slate-400 gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
                <span>جاري تحميل دليل المنتجات والأسعار...</span>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-20 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 flex items-center justify-center mx-auto">
                  <Package className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-slate-400">لا توجد منتجات مطابقة لـ "{searchQuery}"</p>
                <button
                  onClick={() => setIsQuickItemOpen(true)}
                  className="px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-bold hover:bg-blue-600/30"
                >
                  إضافة كصنف سريع / بيع مباشر
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredProducts.map((p) => {
                  const stock = Number(p.current_stock || 0);
                  const isLowStock = stock <= Number(p.min_stock_level || 5);
                  const price = Number(p.selling_price || 0);

                  return (
                    <button
                      key={p.id}
                      onClick={() => handleAddToCart(p)}
                      className="group p-3.5 bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800/90 hover:border-emerald-500/50 rounded-2xl text-right transition-all flex flex-col justify-between shadow-sm hover:shadow-lg active:scale-98"
                    >
                      <div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                          <span className="truncate">{p.category || 'عام'}</span>
                          {p.barcode && (
                            <span className="text-[10px] text-slate-500 font-mono">{p.barcode}</span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-2 leading-snug">
                          {p.name}
                        </h4>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                        <div className="text-base font-black text-emerald-400">
                          {price.toLocaleString()} <span className="text-[11px] font-bold">{currSym}</span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            stock <= 0
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : isLowStock
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {stock <= 0 ? 'نفد المخزون' : `${stock} ${p.unit || 'حبة'}`}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Right Side: Smart Cart & Checkout Counter Panel */}
        <aside className="w-full max-w-md bg-slate-900 flex flex-col shrink-0 shadow-2xl border-r border-slate-800/80">
          {/* Customer Selection Block */}
          <div className="p-3.5 border-b border-slate-800 bg-slate-900/60">
            <POSCustomerSelector
              customers={customers}
              selectedCustomer={selectedCustomer}
              onSelectCustomer={setSelectedCustomer}
              currency={currency}
              cartTotal={grandTotal}
              onCustomerCreated={(newCust) => setCustomers((prev) => [newCust, ...prev])}
            />
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 custom-scrollbar">
            {cart.length === 0 ? (
              <div className="text-center py-24 space-y-3">
                <div className="w-14 h-14 rounded-3xl bg-slate-800/60 text-slate-600 flex items-center justify-center mx-auto">
                  <ShoppingBag className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-slate-400">سلة المبيعات فارغة</h4>
                <p className="text-xs text-slate-500 max-w-[200px] mx-auto">
                  اختر من دليل المنتجات أو امسح الباركود للبدء
                </p>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-3 bg-slate-800/40 border border-slate-800/80 rounded-2xl space-y-2 hover:border-slate-700 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-xs font-bold text-white truncate">{item.name}</h4>
                        {(item.itemCode || item.partNumber || item.sku) && (
                          <span className="font-mono text-[10px] font-bold text-blue-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                            {item.itemCode || item.partNumber || item.sku}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 flex-wrap">
                        {(() => {
                          const prod = products.find((p) => p.id === item.productId || p.id === item.product_id);
                          const unitCostPrice = Math.round(
                            Number(prod?.costPrice || prod?.purchasePrice || prod?.cost_price || (prod as any)?.purchase_price || item.costPrice || item.cost || 0) *
                              Number(item.unitFactor || 1)
                          );
                          const qty = item.quantity || 1;
                          const netUnit = qty > 0 ? (qty * item.unitPrice - (Number(item.discount) || 0) - (Number(item.scrapDiscount) || 0)) / qty : item.unitPrice;
                          const isBelowCost = (unitCostPrice > 0 && (Number(item.unitPrice || 0) < unitCostPrice || netUnit < unitCostPrice)) || Number(item.unitPrice || 0) <= 0;

                          return (
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] text-slate-500">السعر:</span>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  dir="ltr"
                                  lang="en"
                                  value={item.unitPrice === 0 || (item.unitPrice as any) === '' ? '' : item.unitPrice}
                                  onChange={(e) => handleUpdatePrice(idx, parseEnglishNumber(e.target.value, 0))}
                                  placeholder={unitCostPrice > 0 ? String(unitCostPrice) : '0'}
                                  className={`w-20 bg-slate-900 border rounded-lg px-2 py-0.5 text-xs text-left font-mono font-bold focus:outline-none placeholder:text-slate-400/35 select-none font-mono ${
                                    isBelowCost
                                      ? 'border-rose-500 bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/40'
                                      : 'border-slate-700 text-emerald-400 focus:border-blue-500'
                                  }`}
                                />
                                <span className="text-[10px] text-slate-400">{currency}</span>

                                {/* Discrete Pro Cost Peek */}
                                {unitCostPrice > 0 && (
                                  <span
                                    className="text-[10px] text-slate-400/25 hover:text-slate-300 transition-opacity cursor-help select-none group/cost inline-flex items-center"
                                    title={`سعر التكلفة: ${unitCostPrice}`}
                                  >
                                    <span className="group-hover/cost:hidden">ك: ••••</span>
                                    <span className="hidden group-hover/cost:inline font-mono">ك: {unitCostPrice}</span>
                                  </span>
                                )}
                              </div>

                              {/* Real-Time Row Warning Badge */}
                              {isBelowCost && (
                                <div className="text-[10px] text-rose-400 font-bold flex items-center gap-1 bg-rose-500/10 border border-rose-500/30 rounded-md px-1.5 py-0.5 leading-tight">
                                  <span>⚠️ أقل من التكلفة ({unitCostPrice})</span>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Unit Selector Dropdown */}
                        {item.productId && (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-500">الوحدة:</span>
                            <select
                              value={item.selectedUnit || 'base'}
                              onChange={(e) => handleUpdateItemUnit(idx, e.target.value as any)}
                              className="bg-slate-900 border border-slate-700 text-slate-200 text-[10px] font-bold rounded-md px-1.5 py-0.5 focus:outline-none"
                            >
                              <option value="base">{item.baseUnitName || item.unit || 'حبة'}</option>
                              {item.subUnitName && (
                                <option value="sub">{item.subUnitName} ({item.subUnitFactor || 1}x)</option>
                              )}
                              {item.majorUnitName && (
                                <option value="major">{item.majorUnitName} ({item.majorUnitFactor || 1}x)</option>
                              )}
                            </select>
                          </div>
                        )}

                        {!item.productId && (
                          <span className="text-[10px] text-blue-400 font-medium">صنف يدوي</span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoveCartItem(idx)}
                      className="p-1 text-slate-500 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                      title="حذف الصنف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Battery Spec & Inline Warranty & Scrap Discount Controls */}
                  {item.activityType === 'battery' && (
                    <div className="bg-amber-950/20 border border-amber-800/40 rounded-xl p-2 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-[10px] text-amber-300 font-bold">
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-400" />
                          بيانات الضمان واستبدال الرجيع
                        </span>
                        {item.warrantyEndDate && (
                          <span className="text-[9px] text-slate-400 font-mono">
                            ضمان {item.warrantyMonths || 12} شهر (حتى {item.warrantyEndDate})
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] text-slate-400 mb-0.5">الرقم التسلسلي (Serial No)</label>
                          <input
                            type="text"
                            placeholder="SN-BAT..."
                            value={item.serialNumber || ''}
                            onChange={(e) => handleUpdateSerial(idx, e.target.value)}
                            className="w-full bg-slate-900 border border-amber-500/40 rounded px-1.5 py-1 text-[10px] text-white font-mono focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-slate-400 mb-0.5">خصم رجيع بطارية قديمة</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            dir="ltr"
                            lang="en"
                            placeholder="0.00"
                            value={item.scrapDiscount || ''}
                            onChange={(e) => handleUpdateScrapDiscount(idx, parseEnglishNumber(e.target.value, 0))}
                            className="w-full bg-slate-900 border border-emerald-500/40 rounded px-1.5 py-1 text-[10px] text-emerald-400 font-mono font-bold focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tires Spec (قسم الإطارات في الكاشير) */}
                  {item.activityType === 'tire' && (
                    <div className="bg-sky-950/20 border border-sky-800/40 rounded-xl p-2 space-y-1 text-xs">
                      <div className="flex items-center justify-between text-[10px] text-sky-300 font-bold">
                        <span className="flex items-center gap-1">
                          <span>🛞</span>
                          بيانات وضمان الإطار
                        </span>
                        {item.warrantyMonths && (
                          <span className="text-[9px] text-sky-300 font-mono font-bold">
                            ضمان {item.warrantyMonths} شهر
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-300 font-mono flex-wrap">
                        {item.tireSize && <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">مقاس: {item.tireSize}</span>}
                        {item.tireProductionDot && <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">DOT: {item.tireProductionDot}</span>}
                        {item.tirePlyOrigin && <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">{item.tirePlyOrigin}</span>}
                      </div>
                    </div>
                  )}

                  {/* Qty & Item Total Controls */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/50">
                    <div className="flex items-center gap-1 bg-slate-900 rounded-xl p-1 border border-slate-800">
                      <button
                        onClick={() => handleUpdateQty(idx, item.quantity - 1)}
                        className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center cursor-pointer"
                      >
                        -
                      </button>
                      <input
                        type="text"
                        inputMode="decimal"
                        dir="ltr"
                        lang="en"
                        value={item.quantity}
                        onChange={(e) => handleUpdateQty(idx, parseEnglishNumber(e.target.value, 1))}
                        className="w-12 bg-transparent text-center font-black text-xs text-white focus:outline-none font-mono"
                      />
                      <button
                        onClick={() => handleUpdateQty(idx, item.quantity + 1)}
                        className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    {/* Total for this line */}
                    <div className="text-sm font-black text-emerald-400">
                      {Math.max(
                        0,
                        item.quantity * item.unitPrice - (Number(item.discount) || 0) - (Number(item.scrapDiscount) || 0)
                      ).toLocaleString()}{' '}
                      <span className="text-[10px] font-bold">{currSym}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Financial Summary & Checkout Footer */}
          <div className="p-4 bg-slate-950/80 border-t border-slate-800/80 space-y-3">
            {/* Global Discount & Tax Row */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center justify-between bg-slate-900 p-2 rounded-xl border border-slate-800">
                <span className="text-slate-400">خصم الفاتورة:</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={cartDiscount || ''}
                  onChange={(e) => setCartDiscount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-16 bg-slate-800 text-left px-2 py-0.5 rounded text-xs text-rose-400 font-bold focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between bg-slate-900 p-2 rounded-xl border border-slate-800">
                <span className="text-slate-400">الضريبة (%):</span>
                <select
                  value={cartTaxRate}
                  onChange={(e) => setCartTaxRate(parseFloat(e.target.value) || 0)}
                  className="bg-slate-800 text-white rounded px-2 py-0.5 text-xs focus:outline-none"
                >
                  <option value={0}>0% (معفى)</option>
                  <option value={5}>5%</option>
                  <option value={15}>15% (VAT)</option>
                </select>
              </div>
            </div>

            {/* Warning Banner when item is below cost in POS */}
            {hasBelowCostInCart && (
              <div className="p-2.5 bg-rose-500/15 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-bold flex items-center gap-2 animate-pulse shadow-md shadow-rose-950/20">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>⛔ تنبيه رقابي: لا يمكن إتمام البيع بسعر أقل من سعر الشراء لمنع الخسائر!</span>
              </div>
            )}

            {/* Totals Breakdown */}
            <div className="space-y-1 text-xs text-slate-400 pt-1">
              <div className="flex justify-between">
                <span>المجموع الفرعي:</span>
                <span className="text-slate-200">{subtotal.toLocaleString()} {currSym}</span>
              </div>
              {cartDiscount > 0 && (
                <div className="flex justify-between text-rose-400">
                  <span>إجمالي الخصم:</span>
                  <span>-{cartDiscount.toLocaleString()} {currSym}</span>
                </div>
              )}
              {taxAmount > 0 && (
                <div className="flex justify-between text-slate-300">
                  <span>مبلغ الضريبة ({cartTaxRate}%):</span>
                  <span>+{taxAmount.toLocaleString()} {currSym}</span>
                </div>
              )}
            </div>

            {/* Grand Total Highlight */}
            <div className="p-3.5 bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700/80 rounded-2xl flex flex-col gap-1.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">المجموع الصافي:</span>
                <div className="text-2xl font-black text-emerald-400 font-mono">
                  {grandTotal.toLocaleString()} <span className="text-xs font-bold text-slate-300">{currSym}</span>
                </div>
              </div>
              {currency !== 'YER' && (
                <div className="flex items-center justify-between text-[11px] text-amber-300/90 pt-1 border-t border-slate-800/80 font-mono">
                  <span>المعادل بالريال اليمني:</span>
                  <span className="font-bold">
                    ≈ {formatNumber(toBaseCurrencyAmount(grandTotal, currency))} YER
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons: Clear, Hold, Credit Hold, Quick Cash, and Multi-Pay */}
            <div className="grid grid-cols-5 gap-1.5 pt-1">
              <button
                onClick={handleClearCart}
                disabled={cart.length === 0}
                className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 rounded-xl text-xs font-bold disabled:opacity-40 transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer"
                title="إلغاء وتفريغ السلة (F2)"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="text-[10px]">إلغاء (F2)</span>
              </button>

              <button
                onClick={handleHoldSale}
                disabled={cart.length === 0}
                className="py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold disabled:opacity-40 transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer"
                title="تعليق الفاتورة الحالية (F8)"
              >
                <Pause className="w-3.5 h-3.5" />
                <span className="text-[10px]">تعليق (F8)</span>
              </button>

              <button
                onClick={handleHoldCreditSale}
                disabled={cart.length === 0}
                className="py-2.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/40 rounded-xl text-xs font-bold disabled:opacity-40 transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer shadow-sm hover:border-orange-500"
                title="تعليق فاتورة آجل باسم العميل لمتابعتها أو ترحيلها لحسابه لاحقاً"
              >
                <Clock className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
                <span className="text-[10px] font-black">تعليق آجل</span>
              </button>

              <button
                onClick={handleQuickCashCheckout}
                disabled={cart.length === 0 || checkoutLoading || hasBelowCostInCart}
                className="py-2.5 bg-emerald-700/30 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold disabled:opacity-40 transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer shadow-sm disabled:cursor-not-allowed"
                title={hasBelowCostInCart ? 'لا يمكن البيع بسعر أقل من سعر الشراء' : 'دفع نقدي فوري وإصدار الفاتورة فوراً (F9)'}
              >
                <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[10px] font-black">نقدي (F9)</span>
              </button>

              <button
                onClick={handleOpenPaymentModal}
                disabled={cart.length === 0 || hasBelowCostInCart}
                className="py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-950/40 disabled:opacity-40 transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer disabled:cursor-not-allowed"
                title={hasBelowCostInCart ? 'لا يمكن البيع بسعر أقل من سعر الشراء' : 'سداد ودفع متعدد / آجل / محافظ (F10)'}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="text-[10px]">دفع (F10)</span>
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Hardware Keyboard Shortcuts Legend Bar */}
      <footer className="bg-slate-900/95 border-t border-slate-800 px-4 py-2 flex items-center justify-between text-[11px] text-slate-400 overflow-x-auto shrink-0 select-none z-10">
        <div className="flex items-center gap-1.5 text-slate-300 font-bold shrink-0">
          <Keyboard className="w-3.5 h-3.5 text-emerald-400" />
          <span>اختصارات الكاشير (بدون ماوس):</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => searchInputRef.current?.focus()}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="التركيز الفوري على حقل البحث والباركود (F2)"
          >
            <kbd className="px-1.5 py-0.5 bg-slate-700/80 border border-slate-600 rounded text-[10px] font-mono text-emerald-400 font-bold">F2</kbd>
            <span>بحث وباركود</span>
          </button>

          <button
            type="button"
            onClick={handleF4Action}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="تعديل كمية الصنف المحدد أو تبديل الوحدة (F4)"
          >
            <kbd className="px-1.5 py-0.5 bg-slate-700/80 border border-slate-600 rounded text-[10px] font-mono text-cyan-400 font-bold">F4</kbd>
            <span>تبديل الوحدة / الكمية</span>
          </button>

          <button
            type="button"
            onClick={handleCycleTier}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="تبديل مستوى السعر: تجزئة / نصف جملة / جملة / VIP (F6)"
          >
            <kbd className="px-1.5 py-0.5 bg-slate-700/80 border border-slate-600 rounded text-[10px] font-mono text-purple-400 font-bold">F6</kbd>
            <span>تبديل السعر ({selectedPriceTier})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (cart.length > 0) handleHoldSale();
              else setIsHeldDrawerOpen((prev) => !prev);
            }}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="تعليق الفاتورة أو استدعاء المعلق (F8)"
          >
            <kbd className="px-1.5 py-0.5 bg-slate-700/80 border border-slate-600 rounded text-[10px] font-mono text-amber-400 font-bold">F8</kbd>
            <span>تعليق / استدعاء</span>
          </button>

          <button
            type="button"
            onClick={handleQuickCashCheckout}
            disabled={cart.length === 0 || checkoutLoading}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition-colors disabled:opacity-40 cursor-pointer"
            title="دفع نقدي سريع وإصدار الفاتورة فوراً (F9)"
          >
            <kbd className="px-1.5 py-0.5 bg-slate-700/80 border border-slate-600 rounded text-[10px] font-mono text-emerald-400 font-bold">F9</kbd>
            <span>نقدي سريع</span>
          </button>

          <button
            type="button"
            onClick={handleOpenPaymentModal}
            disabled={cart.length === 0}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 transition-colors disabled:opacity-40 cursor-pointer"
            title="دفع متعدد وسداد آجل (F10)"
          >
            <kbd className="px-1.5 py-0.5 bg-slate-700/80 border border-slate-600 rounded text-[10px] font-mono text-blue-400 font-bold">F10</kbd>
            <span>دفع متعدد</span>
          </button>
        </div>
      </footer>

      {/* Held Orders Drawer */}
      <POSHeldDrawer
        isOpen={isHeldDrawerOpen}
        onClose={() => setIsHeldDrawerOpen(false)}
        heldSales={heldSales}
        onResumeSale={handleResumeHeldSale}
        onDeleteHeldSale={handleDeleteHeldSale}
        onPostCreditHeldSale={handlePostCreditHeldSale}
        currency={currency}
      />

      {/* Credit Hold Quick Customer Picker Modal */}
      {isCreditHoldPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" dir="rtl">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg flex flex-col shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-orange-950/30 to-slate-900">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-orange-500/20 border border-orange-500/30 rounded-2xl text-orange-400">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">تعليق فاتورة آجل باسم العميل</h3>
                  <p className="text-xs text-slate-400">حدد العميل لتعليق الفاتورة باسمه تمهيداً لترحيلها لحسابه لاحقاً</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreditHoldPickerOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  اسم العميل <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={creditHoldCustomerName}
                  onChange={(e) => setCreditHoldCustomerName(e.target.value)}
                  placeholder="ابحث أو أدخل اسم العميل..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                  autoFocus
                />
                {/* Quick select matching customers */}
                {creditHoldCustomerName.trim().length > 0 && (
                  <div className="mt-2 max-h-36 overflow-y-auto space-y-1 bg-slate-950/80 border border-slate-800 rounded-xl p-1.5">
                    {customers
                      .filter((c) =>
                        (c.name || '').toLowerCase().includes(creditHoldCustomerName.toLowerCase()) ||
                        (c.phone || '').includes(creditHoldCustomerName)
                      )
                      .slice(0, 5)
                      .map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setCreditHoldCustomerName(c.name);
                            if (c.phone) setCreditHoldCustomerPhone(c.phone);
                          }}
                          className="w-full text-right px-3 py-1.5 rounded-lg text-xs hover:bg-orange-500/20 hover:text-orange-300 text-slate-300 flex items-center justify-between transition-colors"
                        >
                          <span className="font-bold">{c.name}</span>
                          <span className="text-[11px] text-slate-400 font-mono">{c.phone || 'بدون هاتف'}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  رقم الهاتف (اختياري)
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={creditHoldCustomerPhone}
                  onChange={(e) => setCreditHoldCustomerPhone(e.target.value)}
                  placeholder="مثال: 777000111"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white text-right font-mono focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>المستلم / الساحب</span>
                  <span className="text-[10px] text-sky-400 font-normal">اختياري</span>
                </label>
                <input
                  type="text"
                  value={creditHoldReceivedBy}
                  onChange={(e) => setCreditHoldReceivedBy(e.target.value)}
                  placeholder="مثال: الأخ محمد السائق / سيارة رقم..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  ملاحظة على التعليق الآجل (اختياري)
                </label>
                <input
                  type="text"
                  value={creditHoldNote}
                  onChange={(e) => setCreditHoldNote(e.target.value)}
                  placeholder="مثال: بانتظار استلام السائق / طلب هاتفي"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl text-xs text-orange-300 flex items-center justify-between">
                <span>إجمالي الفاتورة المعلقة:</span>
                <span className="font-mono font-black text-sm text-white">
                  {formatNumber(grandTotal)} {currency}
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreditHoldPickerOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  const custName = creditHoldCustomerName.trim() || 'عميل آجل';
                  const matched = customers.find(
                    (c) => (c.name || '').toLowerCase() === custName.toLowerCase()
                  );
                  const custToUse = matched || {
                    id: `cust-temp-${Date.now()}`,
                    name: custName,
                    phone: creditHoldCustomerPhone.trim(),
                  };
                  handleHoldCreditSale({
                    id: custToUse.id,
                    name: custToUse.name,
                    phone: custToUse.phone,
                    note: creditHoldNote.trim() || undefined,
                    receivedBy: creditHoldReceivedBy.trim() || undefined,
                  });
                }}
                className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-black shadow-lg shadow-orange-950/50 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Clock className="w-4 h-4" />
                <span>تأكيد التعليق الآجل</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Item Modal */}
      <POSQuickItemModal
        isOpen={isQuickItemOpen}
        onClose={() => {
          setIsQuickItemOpen(false);
          setScannedUnmatchedBarcode(null);
        }}
        onAddItem={handleAddQuickItem}
        currency={currency}
        initialBarcode={scannedUnmatchedBarcode || undefined}
      />

      {/* Payment & Checkout Modal */}
      <POSPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        cartTotal={grandTotal}
        customer={selectedCustomer}
        currency={currency}
        exchangeRate={exchangeRates[currency] || 1.0}
        onConfirmPayment={handleConfirmPayment}
        loading={checkoutLoading}
      />

      {/* Receipt & Thermal Print Modal */}
      <POSReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        onNewSale={handleClearCart}
        receiptData={completedReceiptData}
      />

      {/* Cashier Shift Management Modal */}
      <POSShiftModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        currentShift={currentShift}
        currency={currency}
        onShiftUpdated={async () => {
          const shiftRes = await api.posGetCurrentShift().catch(() => ({ success: false, data: null }));
          setCurrentShift(shiftRes.data || null);
        }}
      />

      {/* Sales Return & Refund Modal */}
      <POSReturnsModal
        isOpen={isReturnsModalOpen}
        onClose={() => setIsReturnsModalOpen(false)}
        shiftId={currentShift?.id}
        currency={currency}
        onReturnCompleted={async () => {
          const [summaryRes, prodRes] = await Promise.all([
            api.posGetDailySummary().catch(() => ({ success: false, data: null })),
            api.getProducts().catch(() => ({ success: false, data: [] })),
          ]);
          setDailySummary(summaryRes.data || null);
          setProducts(prodRes.data || []);
        }}
      />

      {/* AI Assistant Drawer */}
      <POSAIAssistantWidget
        isOpen={isAIAssistantOpen}
        onClose={() => setIsAIAssistantOpen(false)}
        currency={currency}
      />

      {/* POS Daily Sales Log Modal */}
      {isPosDailySalesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" dir="rtl">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800/80 bg-slate-950/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">سجل مبيعات النقطة اليومية (POS Sales Log)</h3>
                  <p className="text-xs text-slate-400">
                    استعراض فواتير وإيصالات الكاشير لليوم الحالي ({todayDateStr}) مع إمكانية إعادة الطباعة والمرتجع
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPosDailySalesOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick KPI Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-900/40 border-b border-slate-800/80">
              <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-2xl flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 block">إجمالي مبيعات اليوم</span>
                  <span className="text-base font-black text-emerald-400">
                    {todayPosSales.reduce((acc, it) => acc + Number(it.total || 0), 0).toLocaleString()} {currSym}
                  </span>
                </div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-2xl flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 block">عدد فواتير الكاشير اليوم</span>
                  <span className="text-base font-black text-blue-400">
                    {todayPosSales.length} فاتورة
                  </span>
                </div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-2xl flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 block">إجمالي القطع المباعة</span>
                  <span className="text-base font-black text-purple-400">
                    {todayPosSales.reduce((acc, it) => acc + Number(it.itemsCount || 0), 0)} قطعة
                  </span>
                </div>
              </div>
            </div>

            {/* Search Filter Bar */}
            <div className="p-3 border-b border-slate-800 flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={salesLogSearch}
                  onChange={(e) => setSalesLogSearch(e.target.value)}
                  placeholder="ابحث برقم الفاتورة أو اسم العميل..."
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <span className="text-xs text-slate-400 shrink-0">
                المعروض: {todayPosSales.filter(s => !salesLogSearch.trim() || s.invoiceNumber?.toLowerCase().includes(salesLogSearch.toLowerCase()) || s.customerName?.toLowerCase().includes(salesLogSearch.toLowerCase())).length}
              </span>
            </div>

            {/* Sales Table */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {todayPosSales.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <FileText className="w-10 h-10 mx-auto text-slate-600 opacity-50" />
                  <p className="text-sm font-bold">لا توجد عمليات بيع مسجلة لنقطة البيع اليوم حتى الآن.</p>
                  <p className="text-xs text-slate-500">أي فاتورة أو عملية بيع كاشير جديدة ستظهر هنا فوراً وتخصم من المخزون المركزي.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="py-2.5 px-3">رقم الفاتورة</th>
                        <th className="py-2.5 px-3">الوقت</th>
                        <th className="py-2.5 px-3">العميل</th>
                        <th className="py-2.5 px-3">طريقة الدفع</th>
                        <th className="py-2.5 px-3">عدد الأصناف</th>
                        <th className="py-2.5 px-3">الإجمالي الصافي</th>
                        <th className="py-2.5 px-3 text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {todayPosSales
                        .filter(s =>
                          !salesLogSearch.trim() ||
                          s.invoiceNumber?.toLowerCase().includes(salesLogSearch.toLowerCase()) ||
                          s.customerName?.toLowerCase().includes(salesLogSearch.toLowerCase())
                        )
                        .map((s, idx) => (
                          <tr key={s.id || idx} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-3 font-bold text-emerald-400">{s.invoiceNumber}</td>
                            <td className="py-3 px-3 text-slate-300 font-sans">{s.timeFormatted || 'الآن'}</td>
                            <td className="py-3 px-3 text-slate-200 font-sans font-medium">{s.customerName || 'عميل نقدي'}</td>
                            <td className="py-3 px-3 font-sans">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                                {s.paymentMethod === 'CASH' ? 'نقداً' : s.paymentMethod}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-300">{s.itemsCount || s.items?.length || 1} قطع</td>
                            <td className="py-3 px-3 font-black text-emerald-400">
                              {Number(s.total || 0).toLocaleString()} {s.currencySymbol || currSym}
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center justify-center gap-1.5 font-sans">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (s.rawPayload) {
                                      printInvoiceDocument(s.rawPayload, {
                                        title: 'إيصال مبيعات نقطة البيع POS',
                                        currency: s.currencySymbol || currSym,
                                      });
                                    } else {
                                      printInvoiceDocument(
                                        {
                                          id: s.id,
                                          invoice_number: s.invoiceNumber,
                                          invoice_date: s.dateFormatted || todayDateStr,
                                          customer_name: s.customerName,
                                          total: s.total,
                                          items: s.items || [],
                                        },
                                        {
                                          title: 'إيصال مبيعات نقطة البيع POS',
                                          currency: s.currencySymbol || currSym,
                                        }
                                      );
                                    }
                                  }}
                                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                  title="طباعة إيصال الفاتورة"
                                >
                                  <Printer className="w-3.5 h-3.5 text-blue-400" />
                                  <span>طباعة</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsPosDailySalesOpen(false);
                                    setIsReturnsModalOpen(true);
                                  }}
                                  className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                  title="بدء استرجاع أو استبدال أصناف هذه الفاتورة"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>مرتجع</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsPosDailySalesOpen(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
