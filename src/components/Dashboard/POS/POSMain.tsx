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
} from 'lucide-react';
import { api } from '../../../api';
import { useAuth } from '../../../context/AuthContext';
import { POSCartItem, POSShift, POSHeldSale } from '../../../types';
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
  const [currency, setCurrency] = useState<string>(company?.currency || 'YER');
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({ YER: 1, SAR: 0.27, USD: 0.004 });

  // Shift & Cash Drawer State
  const [currentShift, setCurrentShift] = useState<POSShift | null>(null);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);

  // Daily Summary Stats
  const [dailySummary, setDailySummary] = useState<any | null>(null);

  // Held Sales State
  const [heldSales, setHeldSales] = useState<POSHeldSale[]>([]);
  const [isHeldDrawerOpen, setIsHeldDrawerOpen] = useState(false);

  // Active Sale State (Cart)
  const [cart, setCart] = useState<POSCartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [cartDiscount, setCartDiscount] = useState<number>(0);
  const [cartTaxRate, setCartTaxRate] = useState<number>(0); // e.g. 0% or 15%

  // Modals
  const [isQuickItemOpen, setIsQuickItemOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isReturnsModalOpen, setIsReturnsModalOpen] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [completedReceiptData, setCompletedReceiptData] = useState<any | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

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

      const prods = prodRes?.data || [];
      setProducts(prods);
      setCustomers(custRes?.data || []);
      setCurrentShift(shiftRes?.data || null);
      setHeldSales(heldRes?.data || []);
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
  }, []);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F2: New Sale / Clear
      if (e.key === 'F2') {
        e.preventDefault();
        handleClearCart();
      }
      // F3: Quick Manual Item
      else if (e.key === 'F3') {
        e.preventDefault();
        setIsQuickItemOpen(true);
      }
      // F4 or Ctrl+Enter: Pay & Checkout
      else if (e.key === 'F4' || (e.ctrlKey && e.key === 'Enter')) {
        e.preventDefault();
        if (cart.length > 0) {
          setIsPaymentModalOpen(true);
        }
      }
      // F6: Hold Sale
      else if (e.key === 'F6') {
        e.preventDefault();
        if (cart.length > 0) handleHoldSale();
      }
      // F7: Open Held Drawer
      else if (e.key === 'F7') {
        e.preventDefault();
        setIsHeldDrawerOpen((prev) => !prev);
      }
      // F8: Returns Modal
      else if (e.key === 'F8') {
        e.preventDefault();
        setIsReturnsModalOpen(true);
      }
      // F9: Shift Modal
      else if (e.key === 'F9') {
        e.preventDefault();
        setIsShiftModalOpen(true);
      }
      // '/' or F1 to focus search bar
      else if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, selectedCustomer]);

  // Cart Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice - (item.discount || 0), 0);
  const taxAmount = (subtotal - cartDiscount) * (cartTaxRate / 100);
  const grandTotal = Math.max(0, subtotal - cartDiscount + taxAmount);

  // Add Product to Cart
  const handleAddToCart = (product: any) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.productId === product.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        const newQty = updated[existingIndex].quantity + 1;
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          total: newQty * updated[existingIndex].unitPrice - (updated[existingIndex].discount || 0),
        };
        return updated;
      } else {
        const price = Number(product.selling_price || 0);
        return [
          ...prev,
          {
            id: 'cart_' + Date.now() + '_' + Math.random(),
            productId: product.id,
            name: product.name,
            sku: product.sku,
            barcode: product.barcode,
            category: product.category,
            unit: product.unit || 'حبة',
            quantity: 1,
            unitPrice: price,
            discount: 0,
            tax: 0,
            total: price,
            currentStock: Number(product.current_stock || 0),
          },
        ];
      }
    });
  };

  // Add Quick Item to Cart
  const handleAddQuickItem = (quickItem: POSCartItem) => {
    setCart((prev) => [...prev, quickItem]);
  };

  // Barcode / Fast Search handler
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const term = searchQuery.trim().toLowerCase();
    // Search exact barcode first
    const exactBarcodeMatch = products.find(
      (p) => (p.barcode && p.barcode.toLowerCase() === term) || (p.sku && p.sku.toLowerCase() === term)
    );

    if (exactBarcodeMatch) {
      handleAddToCart(exactBarcodeMatch);
      setSearchQuery('');
      return;
    }

    // Search by name match
    const nameMatches = products.filter((p) => p.name.toLowerCase().includes(term));
    if (nameMatches.length === 1) {
      handleAddToCart(nameMatches[0]);
      setSearchQuery('');
    }
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
      updated[index] = {
        ...updated[index],
        unitPrice: Math.max(0, newPrice),
        total: updated[index].quantity * Math.max(0, newPrice) - (updated[index].discount || 0),
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

  // Hold Current Sale
  const handleHoldSale = async () => {
    if (cart.length === 0) return;
    try {
      const res = await api.posHoldSale({
        customerId: selectedCustomer?.id || null,
        customerName: selectedCustomer?.name || 'عميل نقدي',
        cartData: cart,
        totalAmount: grandTotal,
        currency,
        referenceLabel: `طلب ${selectedCustomer?.name || 'نقدي'} - ${new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`,
      });

      if (res.success) {
        setSuccess('تم تعليق الفاتورة بنجاح في قائمة الطلبات المعلقة (F7)');
        handleClearCart();
        // Refresh held sales
        const heldRes = await api.posGetHeldSales();
        setHeldSales(heldRes.data || []);
      }
    } catch (err: any) {
      setError(err.message || 'فشل تعليق الفاتورة');
    }
  };

  // Resume Held Sale into Active Cart
  const handleResumeHeldSale = async (held: POSHeldSale) => {
    try {
      setCart(held.cart_data || []);
      if (held.customer_id) {
        const cust = customers.find((c) => c.id === held.customer_id);
        setSelectedCustomer(cust || { id: held.customer_id, name: held.customer_name });
      } else {
        setSelectedCustomer(null);
      }
      // Delete held sale from backend
      await api.posDeleteHeldSale(held.id);
      const heldRes = await api.posGetHeldSales();
      setHeldSales(heldRes.data || []);
      setSuccess('تم استرجاع الفاتورة المعلقة إلى السلة بنجاح');
    } catch (err: any) {
      setError(err.message || 'فشل استرجاع الفاتورة');
    }
  };

  // Delete Held Sale
  const handleDeleteHeldSale = async (heldId: string) => {
    try {
      await api.posDeleteHeldSale(heldId);
      const heldRes = await api.posGetHeldSales();
      setHeldSales(heldRes.data || []);
    } catch (err: any) {
      setError(err.message || 'فشل حذف الفاتورة المعلقة');
    }
  };

  // Execute Checkout Transaction
  const handleConfirmPayment = async (paymentData: any) => {
    try {
      setCheckoutLoading(true);
      setError(null);

      const exchangeRate = exchangeRates[currency] || 1.0;

      const payload = {
        customerId: selectedCustomer?.id || undefined,
        customerName: selectedCustomer?.name || undefined,
        items: cart,
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
      };

      const res = await api.posCheckout(payload);

      if (res.success && res.data) {
        setCompletedReceiptData(res.data);
        setIsPaymentModalOpen(false);
        setIsReceiptModalOpen(true);
        handleClearCart();

        // Refresh Shift & Daily Summary
        const [shiftRes, summaryRes] = await Promise.all([
          api.posGetCurrentShift().catch(() => ({ success: false, data: null })),
          api.posGetDailySummary().catch(() => ({ success: false, data: null })),
        ]);
        setCurrentShift(shiftRes.data || null);
        setDailySummary(summaryRes.data || null);
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
                {Number(dailySummary.netSales || 0).toLocaleString()} {currency}
              </span>
              <span className="text-slate-500">({dailySummary.totalInvoices || 0} فاتورة)</span>
            </div>
          )}
        </div>

        {/* Action Buttons: Hold, Return, AI, Quick Item, Invoices */}
        <div className="flex items-center gap-2">
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
          {/* Universal Fast Search & Barcode Bar */}
          <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Barcode className="w-5 h-5 text-emerald-400 absolute right-3.5 top-2.5" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
                          {price.toLocaleString()} <span className="text-[11px] font-bold">{currency}</span>
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
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white truncate">{item.name}</h4>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span>{item.unitPrice.toLocaleString()} {currency}</span>
                        {item.productId && (
                          <span className="text-[10px] text-slate-500">({item.unit})</span>
                        )}
                        {!item.productId && (
                          <span className="text-[10px] text-blue-400 font-medium">صنف يدوي</span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoveCartItem(idx)}
                      className="p-1 text-slate-500 hover:text-rose-400 rounded-lg transition-colors"
                      title="حذف الصنف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Qty & Item Total Controls */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/50">
                    <div className="flex items-center gap-1 bg-slate-900 rounded-xl p-1 border border-slate-800">
                      <button
                        onClick={() => handleUpdateQty(idx, item.quantity - 1)}
                        className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        value={item.quantity}
                        onChange={(e) => handleUpdateQty(idx, parseFloat(e.target.value) || 0)}
                        className="w-12 bg-transparent text-center font-black text-xs text-white focus:outline-none"
                      />
                      <button
                        onClick={() => handleUpdateQty(idx, item.quantity + 1)}
                        className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>

                    {/* Total for this line */}
                    <div className="text-sm font-black text-emerald-400">
                      {(item.quantity * item.unitPrice - (item.discount || 0)).toLocaleString()}{' '}
                      <span className="text-[10px] font-bold">{currency}</span>
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

            {/* Totals Breakdown */}
            <div className="space-y-1 text-xs text-slate-400 pt-1">
              <div className="flex justify-between">
                <span>المجموع الفرعي:</span>
                <span className="text-slate-200">{subtotal.toLocaleString()} {currency}</span>
              </div>
              {cartDiscount > 0 && (
                <div className="flex justify-between text-rose-400">
                  <span>إجمالي الخصم:</span>
                  <span>-{cartDiscount.toLocaleString()} {currency}</span>
                </div>
              )}
              {taxAmount > 0 && (
                <div className="flex justify-between text-slate-300">
                  <span>مبلغ الضريبة ({cartTaxRate}%):</span>
                  <span>+{taxAmount.toLocaleString()} {currency}</span>
                </div>
              )}
            </div>

            {/* Grand Total Highlight */}
            <div className="p-3.5 bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700/80 rounded-2xl flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">المجموع الصافي:</span>
              <div className="text-2xl font-black text-emerald-400">
                {grandTotal.toLocaleString()} <span className="text-xs font-bold text-slate-300">{currency}</span>
              </div>
            </div>

            {/* Action Buttons: Hold, Clear, and Checkout */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              <button
                onClick={handleHoldSale}
                disabled={cart.length === 0}
                className="py-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-2xl text-xs font-bold disabled:opacity-40 transition-all flex flex-col items-center justify-center gap-0.5"
                title="تعليق الفاتورة الحالية (F6)"
              >
                <Pause className="w-4 h-4" />
                <span>تعليق (F6)</span>
              </button>

              <button
                onClick={handleClearCart}
                disabled={cart.length === 0}
                className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 rounded-2xl text-xs font-bold disabled:opacity-40 transition-all flex flex-col items-center justify-center gap-0.5"
                title="إلغاء وتفريغ السلة (F2)"
              >
                <Trash2 className="w-4 h-4" />
                <span>إلغاء (F2)</span>
              </button>

              <button
                onClick={() => setIsPaymentModalOpen(true)}
                disabled={cart.length === 0}
                className="col-span-2 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-sm font-black shadow-lg shadow-emerald-950/40 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                title="سداد ودفع الفاتورة (F4 أو Ctrl+Enter)"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>دفع الفاتورة (F4)</span>
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Quick Item Modal */}
      <POSQuickItemModal
        isOpen={isQuickItemOpen}
        onClose={() => setIsQuickItemOpen(false)}
        onAddItem={handleAddQuickItem}
        currency={currency}
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

      {/* Held Orders Drawer */}
      <POSHeldDrawer
        isOpen={isHeldDrawerOpen}
        onClose={() => setIsHeldDrawerOpen(false)}
        heldSales={heldSales}
        onResumeSale={handleResumeHeldSale}
        onDeleteHeldSale={handleDeleteHeldSale}
        currency={currency}
      />

      {/* AI Assistant Drawer */}
      <POSAIAssistantWidget
        isOpen={isAIAssistantOpen}
        onClose={() => setIsAIAssistantOpen(false)}
        currency={currency}
      />
    </div>
  );
};
