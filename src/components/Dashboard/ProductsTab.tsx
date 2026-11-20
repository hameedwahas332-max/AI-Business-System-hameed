import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import {
  formatAmount,
  formatNumber,
  getActiveCurrencySymbol,
  toEnglishDigits,
  parseEnglishNumber,
} from '../../lib/formatters';
import { normalizeScannedBarcode, playBarcodeBeep, findProductByBarcode, attachGlobalBarcodeScannerListener, shouldProcessBarcodeScan } from '../../utils/barcodeUtils';
import { formatProductStock, computeLiveProductStockMetrics, getProductMajorFactor, toBaseQuantity } from '../../utils/inventoryMath';
import { ExportActions } from '../Common/ExportActions';
import { ModuleSettingsModal } from '../Common/ModuleSettingsModal';
import { TableExportConfig } from '../../lib/exportUtils';
import { ProductActivityType, Product } from '../../types';
import {
  Package,
  Plus,
  Search,
  Barcode,
  Tag,
  AlertTriangle,
  Edit2,
  Trash2,
  X,
  Layers,
  DollarSign,
  Boxes,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Filter,
  Calendar,
  ShieldCheck,
  Zap,
  Droplet,
  Apple,
  Sliders,
  Scale,
  RefreshCw,
  Calculator,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

export const EXPANDED_PACKAGING_UNITS: string[] = [
  'قطعة / حبة',
  'باكت / شدة',
  'كرتون',
  'قطمة',
  'كيس / شوال',
  'دبة / جالون',
  'برميل',
  'درزن',
  'طقم',
  'طبق / طبقة',
  'كيلوجرام',
  'جرام',
  'أوقية',
  'لتر',
  'متر',
];

export const ACTIVITY_OPTIONS: { id: ProductActivityType | 'ALL'; label: string; icon: string }[] = [
  { id: 'ALL', label: 'كافة الأنشطة', icon: '🌐' },
  { id: 'food', label: 'مواد غذائية', icon: '🍏' },
  { id: 'battery', label: 'بطاريات وأجهزة', icon: '⚡' },
  { id: 'tire', label: 'إطارات السيارات', icon: '🛞' },
  { id: 'oil', label: 'زيوت وقطع غيار', icon: '🛢️' },
  { id: 'fuel', label: 'محطة وقود وغاز', icon: '⛽' },
  { id: 'general', label: 'عام', icon: '📦' },
];

export const ProductsTab: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedActivity, setSelectedActivity] = useState<ProductActivityType | 'ALL'>('ALL');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  // Auto Sub-Unit Pricing Calculator State
  const [showAutoPricingCalc, setShowAutoPricingCalc] = useState(false);
  const [calcBulkUnit, setCalcBulkUnit] = useState('كرتون');
  const [calcBulkCost, setCalcBulkCost] = useState('');
  const [calcConversionFactor, setCalcConversionFactor] = useState('');
  const [calcProfitMarginPercent, setCalcProfitMarginPercent] = useState('20');
  const [calcBulkSellingPrice, setCalcBulkSellingPrice] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    itemCode: '',
    partNumber: '',
    barcode: '',
    category: 'عام',
    activityType: 'general' as ProductActivityType,
    unit: 'حبة',
    purchasePrice: '0',
    sellingPrice: '0',
    currentStock: '0',
    minStockLevel: '5',
    isActive: true,
    description: '',

    // Tiered Pricing
    retailPrice: '0',
    halfWholesalePrice: '0',
    wholesalePrice: '0',
    vipPrice: '0',

    // Multi-UOM
    baseUnitName: 'حبة',
    subUnitName: '',
    subUnitFactor: '1',
    subUnitPrice: '0',
    subUnitBarcode: '',
    majorUnitName: '',
    majorUnitFactor: '1',
    majorUnitPrice: '0',
    majorUnitBarcode: '',

    // Food / Expiry
    batchNumber: '',
    productionDate: '',
    expiryDate: '',

    // Battery / Electronics
    batterySpec: '',
    warrantyMonths: '12',
    scrapDiscountValue: '0',
    requiresSerial: false,

    // Tires Spec (قسم الإطارات)
    tireSize: '',
    tireProductionDot: '',
    tirePlyOrigin: '',

    // Oil / Auto Parts
    viscosityGrade: '',
    oemCode: '',
    litersPerUnit: '1',

    // Fuel Station
    fuelType: 'petrol_91' as any,
    tankId: '',
    meterId: '',
  });

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = {};
      if (searchQuery) params.search = searchQuery;
      if (selectedCategory) params.category = selectedCategory;
      if (selectedActivity !== 'ALL') params.activityType = selectedActivity;
      if (lowStockOnly) params.lowStock = 'true';

      const res = await api.getProducts(params);
      const items = Array.isArray(res)
        ? res
        : (res?.data || res?.items || res?.products || []);

      setProducts(items);
    } catch (err: any) {
      setError(err.message || 'فشل جلب دليل المنتجات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    const handleWiped = () => {
      setProducts([]);
      fetchProducts();
    };
    const handleUpdated = () => {
      fetchProducts();
    };
    window.addEventListener('erp-demo-data-wiped', handleWiped);
    window.addEventListener('erp-inventory-updated', handleUpdated);
    window.addEventListener('erp-data-updated', handleUpdated);
    window.addEventListener('storage', handleUpdated);
    return () => {
      window.removeEventListener('erp-demo-data-wiped', handleWiped);
      window.removeEventListener('erp-inventory-updated', handleUpdated);
      window.removeEventListener('erp-data-updated', handleUpdated);
      window.removeEventListener('storage', handleUpdated);
    };
  }, [searchQuery, selectedCategory, selectedActivity, lowStockOnly]);

  // 70ms Instant exact-match sound & notification when typing or scanning into the search input
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 4) return;
    const timer = setTimeout(() => {
      const match = findProductByBarcode(products, searchQuery);
      if (match) {
        if (!shouldProcessBarcodeScan(match.product.barcode || searchQuery, 450)) return;
        playBarcodeBeep('success');
      }
    }, 70);
    return () => clearTimeout(timer);
  }, [searchQuery, products]);

  // Global Hardware Barcode Scanner Listener for Products Catalog
  // Automatically detects scanner burst (<65ms + 80ms debounce) without Enter, highlights/searches the product, and plays success beep!
  useEffect(() => {
    if (isModalOpen) return;
    const cleanup = attachGlobalBarcodeScannerListener({
      minBarcodeLength: 2,
      burstMaxIntervalMs: 65,
      endDebounceMs: 80,
      onScan: (scanned) => {
        const match = findProductByBarcode(products, scanned);
        if (match) {
          playBarcodeBeep('success');
          setSearchQuery(match.product.barcode || match.product.sku || match.product.name);
          setSuccess(`تم العثور على الصنف الممسوح: ${match.product.name}`);
          setTimeout(() => setSuccess(null), 3500);
        } else {
          playBarcodeBeep('warning');
          setError(`⚠️ لم يتم العثور على صنف بالباركود الممسوح: ${scanned}`);
          setTimeout(() => setError(null), 3500);
        }
      },
      shouldIgnore: () => {
        if (isModalOpen) return true;
        const activeEl = document.activeElement as HTMLElement | null;
        const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT');
        if (isInput) {
          const inputType = (activeEl as HTMLInputElement).type;
          const inputName = ((activeEl as HTMLInputElement).name || (activeEl as HTMLInputElement).id || '').toLowerCase();
          if (inputType === 'number' || inputName.includes('price') || inputName.includes('qty')) {
            return true;
          }
        }
        return false;
      },
    });

    return () => {
      cleanup();
    };
  }, [isModalOpen, products]);

  const handleOpenCreate = () => {
    setEditingProduct(null);
    const act = selectedActivity !== 'ALL' ? selectedActivity : 'general';
    const autoCode = act === 'oil' ? `PRT-${Math.floor(1000 + Math.random() * 9000)}` : `ITM-${Math.floor(1000 + Math.random() * 9000)}`;

    setFormData({
      name: '',
      sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      itemCode: autoCode,
      partNumber: act === 'oil' ? autoCode : '',
      barcode: '',
      category: 'عام',
      activityType: act,
      unit: 'حبة',
      purchasePrice: '0',
      sellingPrice: '0',
      currentStock: '0',
      minStockLevel: '5',
      isActive: true,
      description: '',

      retailPrice: '0',
      halfWholesalePrice: '0',
      wholesalePrice: '0',
      vipPrice: '0',

      baseUnitName: 'حبة',
      subUnitName: '',
      subUnitFactor: '1',
      subUnitPrice: '0',
      subUnitBarcode: '',
      majorUnitName: '',
      majorUnitFactor: '1',
      majorUnitPrice: '0',
      majorUnitBarcode: '',

      batchNumber: '',
      productionDate: '',
      expiryDate: '',

      batterySpec: '',
      warrantyMonths: '12',
      scrapDiscountValue: '0',
      requiresSerial: false,

      tireSize: '',
      tireProductionDot: '',
      tirePlyOrigin: '',

      viscosityGrade: '',
      oemCode: '',
      litersPerUnit: '1',

      fuelType: 'petrol_91' as any,
      tankId: '',
      meterId: '',
    });
    setShowAutoPricingCalc(false);
    setCalcBulkUnit('كرتون');
    setCalcBulkCost('');
    setCalcConversionFactor('');
    setCalcProfitMarginPercent('20');
    setCalcBulkSellingPrice('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (prod: any) => {
    setEditingProduct(prod);
    setFormData({
      name: prod.name || '',
      sku: prod.sku || '',
      itemCode: prod.itemCode || prod.sku || '',
      partNumber: prod.partNumber || '',
      barcode: prod.barcode || '',
      category: prod.category || 'عام',
      activityType: (prod.activityType || 'general') as ProductActivityType,
      unit: prod.unit || prod.baseUnitName || 'حبة',
      purchasePrice: String(prod.purchase_price ?? prod.cost_price ?? 0),
      sellingPrice: String(prod.selling_price ?? prod.price ?? 0),
      currentStock: String(prod.current_stock ?? prod.qty ?? 0),
      minStockLevel: String(prod.min_stock_level ?? 5),
      isActive: prod.is_active !== false,
      description: prod.description || '',

      retailPrice: String(prod.retailPrice ?? prod.retail_price ?? prod.selling_price ?? 0),
      halfWholesalePrice: String(prod.halfWholesalePrice ?? 0),
      wholesalePrice: String(prod.wholesalePrice ?? 0),
      vipPrice: String(prod.vipPrice ?? 0),

      baseUnitName: prod.baseUnitName || prod.unit || 'حبة',
      subUnitName: prod.subUnitName || '',
      subUnitFactor: String(prod.subUnitFactor ?? 1),
      subUnitPrice: String(prod.subUnitPrice ?? 0),
      subUnitBarcode: prod.subUnitBarcode || '',
      majorUnitName: prod.majorUnitName || '',
      majorUnitFactor: String(prod.majorUnitFactor ?? 1),
      majorUnitPrice: String(prod.majorUnitPrice ?? 0),
      majorUnitBarcode: prod.majorUnitBarcode || '',

      batchNumber: prod.batchNumber || '',
      productionDate: prod.productionDate || '',
      expiryDate: prod.expiryDate || '',

      batterySpec: prod.batterySpec || '',
      warrantyMonths: String(prod.warrantyMonths ?? 12),
      scrapDiscountValue: String(prod.scrapDiscountValue ?? 0),
      requiresSerial: Boolean(prod.requiresSerial),

      tireSize: prod.tireSize || '',
      tireProductionDot: prod.tireProductionDot || '',
      tirePlyOrigin: prod.tirePlyOrigin || '',

      viscosityGrade: prod.viscosityGrade || '',
      oemCode: prod.oemCode || '',
      litersPerUnit: String(prod.litersPerUnit ?? 1),

      fuelType: prod.fuelType || 'petrol_91',
      tankId: prod.tankId || '',
      meterId: prod.meterId || '',
    });
    setShowAutoPricingCalc(false);
    setCalcBulkUnit(prod.majorUnitName || 'كرتون');
    setCalcBulkCost(prod.purchasePrice && prod.majorUnitFactor ? String(Math.round(Number(prod.purchasePrice) * Number(prod.majorUnitFactor))) : (prod.majorUnitPrice ? String(prod.majorUnitPrice) : ''));
    setCalcConversionFactor(prod.majorUnitFactor ? String(prod.majorUnitFactor) : '');
    setCalcProfitMarginPercent('20');
    setCalcBulkSellingPrice(prod.majorUnitPrice ? String(prod.majorUnitPrice) : '');
    setIsModalOpen(true);
  };

  // Live calculation for Auto Sub-Unit Pricing Calculator
  const cBulkCost = parseEnglishNumber(calcBulkCost, 0);
  const cFactor = parseEnglishNumber(calcConversionFactor, 0);
  const cMargin = parseEnglishNumber(calcProfitMarginPercent, 20);
  const cBulkSelling = parseEnglishNumber(calcBulkSellingPrice, 0);

  const calcSingleUnitCost = cBulkCost > 0 && cFactor > 0 ? Math.round((cBulkCost / cFactor) * 100) / 100 : 0;
  const calcSuggestedRetailPrice = calcSingleUnitCost > 0 ? Math.round((calcSingleUnitCost * (1 + cMargin / 100)) * 100) / 100 : 0;
  const calcSuggestedHalfWholesalePrice = calcSingleUnitCost > 0 ? Math.round((calcSingleUnitCost * (1 + (cMargin * 0.6) / 100)) * 100) / 100 : 0;
  const calcSuggestedWholesalePrice = calcSingleUnitCost > 0 ? Math.round((calcSingleUnitCost * (1 + (cMargin * 0.35) / 100)) * 100) / 100 : 0;
  const calcBulkPriceToApply = cBulkSelling > 0 ? cBulkSelling : (calcSuggestedRetailPrice > 0 && cFactor > 0 ? Math.round(calcSuggestedRetailPrice * cFactor * 0.92 * 100) / 100 : 0);

  const handleApplyCalculatedPricing = () => {
    if (calcSingleUnitCost <= 0) {
      alert('يرجى إدخال تكلفة الكرتون/الشوال ومعامل التحويل أولاً للحساب');
      return;
    }

    setFormData((prev) => ({
      ...prev,
      purchasePrice: toEnglishDigits(calcSingleUnitCost),
      sellingPrice: toEnglishDigits(calcSuggestedRetailPrice),
      retailPrice: toEnglishDigits(calcSuggestedRetailPrice),
      halfWholesalePrice: toEnglishDigits(calcSuggestedHalfWholesalePrice),
      wholesalePrice: toEnglishDigits(calcSuggestedWholesalePrice),
      baseUnitName: prev.baseUnitName || 'قطعة / حبة',
      unit: prev.baseUnitName || 'قطعة / حبة',
      majorUnitName: calcBulkUnit || 'كرتون',
      majorUnitFactor: toEnglishDigits(cFactor > 0 ? cFactor : 1),
      majorUnitPrice: toEnglishDigits(calcBulkPriceToApply),
    }));

    setSuccess(`✅ تم احتساب وتطبيق تكلفة القطعة (${calcSingleUnitCost}) وسعر التجزئة (${calcSuggestedRetailPrice}) وتفاصيل ${calcBulkUnit} بنجاح!`);
    setTimeout(() => setSuccess(null), 3500);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const retail = parseFloat(formData.retailPrice || formData.sellingPrice || '0');
      const majorFactor = parseFloat(formData.majorUnitFactor || '1');
      const baseStockInput = parseFloat(formData.currentStock || '0');
      
      // Normalized canonical base quantity (الوحدة الصغرى/الأساسية)
      // e.g. 3 bags * 50 = 150 kg, or entered directly as 150 kg
      const canonicalBaseStock = Math.max(0, baseStockInput);
      const initialStockVal = canonicalBaseStock;

      const payload: any = {
        name: formData.name,
        sku: formData.sku,
        itemCode: formData.itemCode || formData.sku,
        partNumber: formData.partNumber,
        barcode: formData.barcode,
        category: formData.category,
        activityType: formData.activityType,
        unit: formData.unit || formData.baseUnitName || 'حبة',
        baseUnitName: formData.baseUnitName || formData.unit || 'حبة',
        purchasePrice: parseFloat(formData.purchasePrice || '0'),
        sellingPrice: retail,
        currentStock: canonicalBaseStock,
        current_stock: canonicalBaseStock,
        stock: canonicalBaseStock,
        quantity: canonicalBaseStock,
        qty: canonicalBaseStock,
        initialStock: initialStockVal,
        initial_stock: initialStockVal,
        openingStock: initialStockVal,
        incomingStock: canonicalBaseStock,
        incoming_stock: canonicalBaseStock,
        minStockLevel: parseFloat(formData.minStockLevel || '0'),
        isActive: formData.isActive,
        description: formData.description,

        retailPrice: retail,
        halfWholesalePrice: parseFloat(formData.halfWholesalePrice || '0'),
        wholesalePrice: parseFloat(formData.wholesalePrice || '0'),
        vipPrice: parseFloat(formData.vipPrice || '0'),

        subUnitName: formData.subUnitName,
        subUnitFactor: parseFloat(formData.subUnitFactor || '1'),
        subUnitPrice: parseFloat(formData.subUnitPrice || '0'),
        subUnitBarcode: formData.subUnitBarcode,
        majorUnitName: formData.majorUnitName,
        majorUnitFactor: majorFactor,
        majorUnitPrice: parseFloat(formData.majorUnitPrice || '0'),
        majorUnitBarcode: formData.majorUnitBarcode,

        batchNumber: formData.batchNumber,
        productionDate: formData.productionDate,
        expiryDate: formData.expiryDate,

        batterySpec: formData.batterySpec,
        warrantyMonths: parseInt(formData.warrantyMonths || '0', 10),
        scrapDiscountValue: parseFloat(formData.scrapDiscountValue || '0'),
        requiresSerial: formData.requiresSerial,

        tireSize: formData.tireSize,
        tireProductionDot: formData.tireProductionDot,
        tirePlyOrigin: formData.tirePlyOrigin,

        viscosityGrade: formData.viscosityGrade,
        oemCode: formData.oemCode,
        litersPerUnit: parseFloat(formData.litersPerUnit || '1'),

        fuelType: formData.fuelType,
        tankId: formData.tankId,
        meterId: formData.meterId,
      };

      let productRecord: any = null;
      if (editingProduct) {
        const updateRes: any = await api.updateProduct(editingProduct.id, payload);
        productRecord = updateRes?.data || updateRes;
        if (productRecord?.id) {
          setProducts((prev) =>
            prev.map((p) => (p.id === productRecord.id ? { ...p, ...productRecord } : p))
          );
        }
        setSuccess('تم تحديث بيانات المنتج بنجاح');
      } else {
        const createRes: any = await api.createProduct(payload);
        productRecord = createRes?.data || createRes;
        if (productRecord && (productRecord.id || productRecord.name)) {
          setProducts((prev) => [
            productRecord,
            ...prev.filter((p) => p.id !== productRecord.id),
          ]);

          // Record opening stock movement so it appears immediately in inventory movements audit
          if (canonicalBaseStock > 0) {
            try {
              const rawMovs = localStorage.getItem('erp_inventory_movements_v1');
              const movList: any[] = rawMovs ? JSON.parse(rawMovs) : [];
              movList.unshift({
                id: `mov-init-${Date.now()}`,
                date: new Date().toISOString().split('T')[0],
                timestamp: new Date().toISOString(),
                productId: productRecord.id || payload.sku,
                productCode: payload.itemCode || payload.sku,
                productName: payload.name,
                type: 'OPENING_STOCK',
                unitName: payload.baseUnitName || 'حبة',
                quantity: canonicalBaseStock,
                baseQuantity: canonicalBaseStock,
                stockBefore: 0,
                stockAfter: canonicalBaseStock,
                referenceNumber: 'OPENING-STOCK',
                customerOrSupplierName: 'رصيد افتتاحي تأسيسي',
                notes: `رصيد أول المدة عند إنشاء الصنف (${formatProductStock(canonicalBaseStock, payload)})`,
              });
              localStorage.setItem('erp_inventory_movements_v1', JSON.stringify(movList.slice(0, 500)));
              window.dispatchEvent(new Event('erp-inventory-updated'));
            } catch {}
          }
        }
        setSuccess('تمت إضافة المنتج الجديد إلى الدليل بنجاح');
      }

      try {
        localStorage.removeItem('erp_clean_production_mode_v1');
        localStorage.removeItem('erp_sample_data_cleaned');
      } catch {}

      setIsModalOpen(false);
      fetchProducts();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || 'فشل حفظ المنتج');
    }
  };

  const handleDeleteProduct = async (prod: any) => {
    if (!window.confirm(`هل أنت متأكد من حذف المنتج "${prod.name}" من الدليل؟`)) return;
    try {
      setError(null);
      await api.deleteProduct(prod.id);
      setSuccess('تم حذف المنتج بنجاح');
      fetchProducts();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || 'فشل حذف المنتج');
    }
  };

  // Stock Breakdown helper (Cartons + Pieces + Remainder)
  const renderStockBreakdown = (prod: any) => {
    const metrics = computeLiveProductStockMetrics(prod);
    const { majorCount, remainderSub, majorFactor, majorUnitName, baseUnitName } = metrics;
    const stock = metrics.currentStock;

    if (majorFactor > 1 && majorUnitName) {
      return (
        <div className="flex flex-col items-start gap-1">
          <span className="font-mono font-bold text-[var(--md-on-surface)] text-xs tabular-nums">
            {formatNumber(stock)} {baseUnitName}
          </span>
          <span className="m3-badge m3-badge-primary font-mono text-[11px] tabular-nums">
            📦 {majorCount} {majorUnitName} {remainderSub > 0 ? `+ ${remainderSub} ${baseUnitName}` : ''}
          </span>
        </div>
      );
    }

    return (
      <span className="font-mono font-bold text-[var(--md-on-surface)] tabular-nums">
        {formatNumber(stock)} {baseUnitName}
      </span>
    );
  };

  // Expiry badge helper
  const renderExpiryBadge = (expiryDate?: string) => {
    if (!expiryDate) return null;
    const now = new Date();
    const exp = new Date(expiryDate);
    const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return (
        <span className="m3-badge m3-badge-error text-[10px] tabular-nums">
          <AlertCircle className="w-3 h-3 shrink-0" />
          منتهي ({expiryDate})
        </span>
      );
    }
    if (diffDays <= 60) {
      return (
        <span className="m3-badge m3-badge-warning text-[10px] tabular-nums">
          <AlertTriangle className="w-3 h-3 shrink-0" />
          متبقي {diffDays} يوم
        </span>
      );
    }
    return (
      <span className="m3-badge m3-badge-success text-[10px] tabular-nums">
        <CheckCircle2 className="w-3 h-3 shrink-0" />
        ساري حتى {expiryDate}
      </span>
    );
  };

  // Metrics calculations
  const totalStockValuation = products.reduce(
    (sum, p) => sum + (Number(p.current_stock ?? p.qty ?? 0) * Number(p.purchase_price ?? p.cost_price ?? 0)),
    0
  );

  const totalUnitsInStock = products.reduce(
    (sum, p) => sum + Number(p.current_stock ?? p.qty ?? 0),
    0
  );

  const lowStockCount = products.filter(
    (p) => Number(p.current_stock ?? p.qty ?? 0) <= Number(p.min_stock_level ?? 5)
  ).length;

  // Extract categories for filter
  const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));

  const getProductExportConfig = (): TableExportConfig => ({
    filename: `inventory_products_${new Date().toISOString().split('T')[0]}`,
    title: 'سجل المنتجات ومخزون المستودعات المتعدد الأنشطة',
    subtitle: selectedActivity !== 'ALL' ? `النشاط: ${selectedActivity}` : 'كافة الأصناف والمنتجات',
    filterBadges: [
      ...(searchQuery ? [{ label: 'بحث', value: searchQuery }] : []),
      ...(selectedCategory ? [{ label: 'الفئة', value: selectedCategory }] : []),
      ...(selectedActivity !== 'ALL' ? [{ label: 'النشاط', value: selectedActivity }] : []),
      ...(lowStockOnly ? [{ label: 'الحالة', value: 'نقص مخزون' }] : []),
    ],
    summaryCards: [
      { label: 'إجمالي عدد الأصناف', value: products.length },
      { label: 'إجمالي القطع في المستودع', value: formatNumber(totalUnitsInStock) },
      { label: 'القيمة التقديرية للمخزون', value: `${formatAmount(totalStockValuation)} YER` },
      { label: 'أصناف قريبة من النفاذ', value: lowStockCount },
    ],
    headers: [
      'اسم الصنف',
      'النشاط',
      'الفئة',
      'الرمز SKU / الباركود',
      'سعر التجزئة (YER)',
      'سعر الجملة (YER)',
      'المخزون الحالي',
      'تفصيل الكراتين والقطع',
      'ملاحظات النشاط / الصلاحية',
      'الحالة',
    ],
    rows: products.map((prod) => {
      const stock = Number(prod.current_stock ?? prod.qty ?? 0);
      const factor = Number(prod.majorUnitFactor ?? prod.major_unit_factor ?? 1);
      const cartons = factor > 1 ? Math.floor(stock / factor) : '-';
      const pieces = factor > 1 ? stock % factor : stock;

      let activityNote = '-';
      if (prod.activityType === 'food' && prod.expiryDate) {
        activityNote = `صلاحية: ${prod.expiryDate} (دفعة ${prod.batchNumber || '-'})`;
      } else if (prod.activityType === 'battery') {
        activityNote = `ضمان: ${prod.warrantyMonths || 12} شهر | رجيع: ${prod.scrapDiscountValue || 0}`;
      } else if (prod.activityType === 'oil') {
        activityNote = `لزوجة: ${prod.viscosityGrade || '-'} | كود: ${prod.oemCode || '-'}`;
      }

      return [
        prod.name,
        prod.activityType || 'عام',
        prod.category || 'عام',
        prod.sku || prod.barcode || '-',
        prod.selling_price ?? prod.retailPrice ?? 0,
        prod.wholesalePrice ?? '-',
        stock,
        factor > 1 ? `${cartons} كرتون + ${pieces} حبة` : `${stock} حبة`,
        activityNote,
        stock <= 0 ? 'نفذ' : stock <= (prod.min_stock_level ?? 5) ? 'قريب من النفاذ' : 'متوفر',
      ];
    }),
    alignments: ['right', 'center', 'center', 'center', 'right', 'right', 'center', 'center', 'right', 'center'],
  });

  return (
    <div className="space-y-6 text-right text-[var(--md-on-surface)] font-sans" dir="rtl">

      {/* Header with Module Settings Button */}
      <div className="m3-card p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-[var(--md-radius-md)] bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border border-[var(--md-outline-variant)] flex items-center justify-center shrink-0">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-[var(--md-on-surface)] tracking-tight flex items-center gap-2 flex-wrap">
                  <span>دليل المنتجات والأصناف والأسعار</span>
                  <span className="m3-badge m3-badge-primary text-[10px] font-mono">
                    Multi-Activity Catalog
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-[var(--md-on-surface-variant)] font-medium mt-0.5">
                  دعم متكامل للمواد الغذائية (صلاحية FEFO)، البطاريات (سيريال وضمان ورجيع)، الزيوت (لزوجة وسعة)، والتسعير المتعدد والوحدات
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Module Settings Modal Button */}
            <ModuleSettingsModal module="products" buttonLabel="⚙️ إعدادات القسم" />

            <button
              onClick={handleOpenCreate}
              className="m3-btn-primary text-xs sm:text-sm shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة صنف جديد</span>
            </button>
          </div>
        </div>
      </div>

      {/* Activity Type Selector Bar */}
      <div className="m3-card p-2.5 flex items-center gap-2 overflow-x-auto">
        <span className="text-xs font-bold text-[var(--md-on-surface-variant)] px-2 shrink-0 flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-[var(--md-primary-text)]" />
          نوع النشاط:
        </span>
        {ACTIVITY_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setSelectedActivity(opt.id as any)}
            className={`px-3.5 py-2 rounded-[var(--md-radius-md)] text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer border ${
              selectedActivity === opt.id
                ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)] border-[var(--md-primary)] shadow-sm'
                : 'bg-[var(--md-surface-container-low)] hover:bg-[var(--md-surface-container-high)] text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] border-[var(--md-outline-variant)]'
            }`}
          >
            <span>{opt.icon}</span>
            <span>{opt.label}</span>
          </button>
        ))}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="m3-card p-4 flex items-center justify-between transition-colors hover:border-[var(--md-outline)]">
          <div>
            <div className="text-[11px] font-semibold text-[var(--md-on-surface-variant)] mb-1">إجمالي عدد الأصناف والمنتجات</div>
            <div className="text-2xl font-bold font-mono text-[var(--md-on-surface)] tabular-nums">{products.length} صنف</div>
          </div>
          <div className="w-11 h-11 rounded-[var(--md-radius-md)] bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] flex items-center justify-center shrink-0">
            <Boxes className="w-6 h-6" />
          </div>
        </div>

        <div className="m3-card p-4 flex items-center justify-between transition-colors hover:border-[var(--md-outline)]">
          <div>
            <div className="text-[11px] font-semibold text-[var(--md-on-surface-variant)] mb-1">القيمة التقديرية للمخزون (تكلفة الشراء)</div>
            <div className="text-2xl font-bold font-mono text-[var(--md-success)] tabular-nums">
              {formatAmount(totalStockValuation)} <span className="text-xs text-[var(--md-on-surface-variant)] font-sans">YER</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-[var(--md-radius-md)] bg-[var(--md-success-container)] text-[var(--md-on-success-container)] flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="m3-card p-4 flex items-center justify-between transition-colors hover:border-[var(--md-outline)]">
          <div>
            <div className="text-[11px] font-semibold text-[var(--md-on-surface-variant)] mb-1">الأصناف القريبة من النفاذ</div>
            <div className={`text-2xl font-bold font-mono tabular-nums ${lowStockCount > 0 ? 'text-[var(--md-warning)]' : 'text-[var(--md-on-surface)]'}`}>
              {lowStockCount} صنف
            </div>
          </div>
          <div className={`w-11 h-11 rounded-[var(--md-radius-md)] flex items-center justify-center shrink-0 ${
            lowStockCount > 0
              ? 'bg-[var(--md-warning-container)] text-[var(--md-on-warning-container)]'
              : 'bg-[var(--md-surface-container-high)] text-[var(--md-on-surface-variant)]'
          }`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-[var(--md-error-container)] border border-[var(--md-error)]/30 rounded-[var(--md-radius-md)] text-[var(--md-on-error-container)] text-xs sm:text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="opacity-80 hover:opacity-100 p-1 rounded-lg cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-[var(--md-success-container)] border border-[var(--md-success)]/30 rounded-[var(--md-radius-md)] text-[var(--md-on-success-container)] text-xs sm:text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="opacity-80 hover:opacity-100 p-1 rounded-lg cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Table & Filters Card */}
      <div className="m3-card overflow-hidden">
        {/* Filters Header */}
        <div className="p-4 border-b border-[var(--md-outline-variant)] bg-[var(--md-surface-container-low)] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="w-4 h-4 text-[var(--md-on-surface-variant)] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="البحث باسم المنتج، SKU، أو الباركود..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(normalizeScannedBarcode(e.target.value))}
              className="m3-input !h-10 !pr-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto flex-wrap justify-between sm:justify-end">
            {categories.length > 0 && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="m3-select !h-10 !w-auto min-w-[140px] text-xs"
              >
                <option value="">جميع الفئات</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => setLowStockOnly(!lowStockOnly)}
              className={`px-3 py-2 rounded-[var(--md-radius-md)] text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer min-h-[40px] ${
                lowStockOnly
                  ? 'bg-[var(--md-warning-container)] text-[var(--md-on-warning-container)] border-[var(--md-warning)]/40'
                  : 'bg-[var(--md-surface-container)] hover:bg-[var(--md-surface-container-high)] text-[var(--md-on-surface-variant)] border-[var(--md-outline-variant)]'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>الأصناف القريبة من النفاذ</span>
            </button>

            <ExportActions getConfig={getProductExportConfig} />
          </div>
        </div>

        {/* Products Table */}
        <div className="overflow-x-auto">
          <table className="m3-table text-right text-xs">
            <thead className="m3-thead">
              <tr>
                <th className="m3-th">اسم المنتج / النشاط</th>
                <th className="m3-th">رقم الصنف / القطعة / SKU</th>
                <th className="m3-th">مستويات التسعير</th>
                <th className="m3-th">حركة ورصيد المخزون (الوارد / المباع / المتبقي)</th>
                <th className="m3-th">مواصفات النشاط والصلاحية والضمان</th>
                <th className="m3-th">الحالة</th>
                <th className="m3-th text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--md-outline-variant)] font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[var(--md-on-surface-variant)]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-[var(--md-primary-text)]" />
                      <span>جاري تحميل الأصناف والأسعار...</span>
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[var(--md-on-surface-variant)]">
                    لا توجد منتجات مطابقة لخيارات البحث أو الفلتر المحددة.
                  </td>
                </tr>
              ) : (
                products.map((prod) => {
                  const stock = Number(prod.current_stock ?? prod.qty ?? 0);
                  const isLow = stock <= Number(prod.min_stock_level ?? 5);

                  // Activity badge
                  const activityLabel =
                    prod.activityType === 'food'
                      ? '🍏 مواد غذائية'
                      : prod.activityType === 'battery'
                      ? '⚡ بطاريات وأجهزة'
                      : prod.activityType === 'tire'
                      ? '🛞 إطارات وكفرات'
                      : prod.activityType === 'oil'
                      ? '🛢️ زيوت وقطع غيار'
                      : prod.activityType === 'fuel'
                      ? '⛽ محروقات وغاز'
                      : '📦 عام';

                  const displayCode = prod.itemCode || prod.partNumber || prod.sku;

                  return (
                    <tr key={prod.id} className="hover:bg-[var(--md-surface-container-low)] transition-colors">
                      {/* Product Name & Activity */}
                      <td className="p-3.5 font-bold text-[var(--md-on-surface)] max-w-[240px]">
                        <div className="truncate">{prod.name}</div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="m3-badge m3-badge-primary text-[10px]">
                            {activityLabel}
                          </span>
                          {prod.category && (
                            <span className="text-[10px] font-semibold text-[var(--md-on-surface-variant)] bg-[var(--md-surface-container-high)] px-1.5 py-0.5 rounded-[var(--md-radius-sm)]">
                              {prod.category}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Item Code / Part Number & SKU & Barcode */}
                      <td className="p-3.5 font-mono text-[var(--md-on-surface-variant)] dir-ltr text-right tabular-nums">
                        <div className="text-[var(--md-primary-text)] font-bold text-xs">
                          {displayCode ? (
                            <span className="m3-badge m3-badge-primary font-mono text-[11px]">
                              {prod.itemCode ? `ITM: ${prod.itemCode}` : prod.partNumber ? `OEM: ${prod.partNumber}` : prod.sku}
                            </span>
                          ) : (
                            '-'
                          )}
                        </div>
                        {prod.barcode && <div className="text-[10px] text-[var(--md-on-surface-variant)] font-mono mt-1">📊 {prod.barcode}</div>}
                      </td>

                      {/* Tiered Pricing */}
                      <td className="p-3.5 text-xs">
                        <div className="space-y-0.5 font-mono tabular-nums">
                          <div className="text-[var(--md-success)] font-bold">
                            تجزئة: {formatAmount(prod.selling_price ?? prod.retailPrice ?? 0)}
                          </div>
                          {(prod.halfWholesalePrice > 0 || prod.wholesalePrice > 0) && (
                            <div className="text-[11px] text-[var(--md-on-surface-variant)]">
                              جملة: {formatAmount(prod.wholesalePrice || prod.halfWholesalePrice || 0)}
                            </div>
                          )}
                          {prod.majorUnitPrice > 0 && prod.majorUnitName && (
                            <div className="text-[10px] text-[var(--md-primary-text)] font-semibold">
                              {prod.majorUnitName}: {formatAmount(prod.majorUnitPrice)}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Stock with Cartons Breakdown & Movements */}
                      <td className="p-3.5">
                        <div className="space-y-1.5 min-w-[175px]">
                          <div className="flex items-center gap-1.5">
                            {renderStockBreakdown(prod)}
                            {isLow && (
                              <span title={`تنبيه مخزون: الحد الأدنى ${prod.min_stock_level ?? 5}`}>
                                <AlertTriangle className="w-4 h-4 text-[var(--md-warning)] shrink-0" />
                              </span>
                            )}
                          </div>
                          {/* 4 Inventory Indicators: السابق/الوارد، المباع اليوم، إجمالي المباع، المتبقي */}
                          {(() => {
                            const m = computeLiveProductStockMetrics(prod);
                            return (
                              <div className="grid grid-cols-2 gap-1 text-[10px] font-mono tabular-nums bg-[var(--md-surface-container-low)] p-1.5 rounded-[var(--md-radius-sm)] border border-[var(--md-outline-variant)]">
                                <div className="text-[var(--md-on-surface-variant)]">
                                  <span>الوارد: </span>
                                  <span className="font-bold text-[var(--md-on-surface)]" title={m.formattedIncoming}>
                                    {formatNumber(m.totalIncoming)}
                                  </span>
                                </div>
                                <div className="text-[var(--md-info)]">
                                  <span>مباع اليوم: </span>
                                  <span className="font-bold">{formatNumber(m.soldToday)}</span>
                                </div>
                                <div className="text-[var(--md-secondary)]">
                                  <span>إجمالي المباع: </span>
                                  <span className="font-bold">{formatNumber(m.totalSold)}</span>
                                </div>
                                <div className="text-[var(--md-success)]">
                                  <span>المتبقي: </span>
                                  <span className="font-bold" title={m.formattedRemaining}>{formatNumber(m.remainingStock)}</span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </td>

                      {/* Conditional Activity Fields */}
                      <td className="p-3.5 text-xs">
                        {prod.activityType === 'food' && (
                          <div className="space-y-1">
                            {renderExpiryBadge(prod.expiryDate)}
                            {prod.batchNumber && (
                              <div className="text-[10px] text-[var(--md-on-surface-variant)] font-mono">
                                دفعة: {prod.batchNumber}
                              </div>
                            )}
                          </div>
                        )}

                        {prod.activityType === 'battery' && (
                          <div className="space-y-1">
                            {prod.batterySpec && (
                              <div className="text-xs font-semibold text-[var(--md-warning)] flex items-center gap-1">
                                <Zap className="w-3.5 h-3.5 shrink-0" />
                                {prod.batterySpec}
                              </div>
                            )}
                            <div className="text-[10px] text-[var(--md-on-surface-variant)] flex items-center gap-2 tabular-nums">
                              <span>ضمان: {prod.warrantyMonths || 12} شهر</span>
                              {prod.scrapDiscountValue > 0 && (
                                <span className="text-[var(--md-success)] font-semibold">رجيع: {prod.scrapDiscountValue} YER</span>
                              )}
                            </div>
                          </div>
                        )}

                        {prod.activityType === 'tire' && (
                          <div className="space-y-1">
                            {prod.tireSize && (
                              <div className="text-xs font-bold text-[var(--md-info)] font-mono flex items-center gap-1">
                                <span>🛞 مقاس: {prod.tireSize}</span>
                              </div>
                            )}
                            <div className="text-[10px] text-[var(--md-on-surface-variant)] flex items-center gap-1.5 flex-wrap">
                              {prod.tireProductionDot && (
                                <span className="bg-[var(--md-surface-container-high)] text-[var(--md-on-surface)] px-1.5 py-0.5 rounded font-mono">
                                  DOT: {prod.tireProductionDot}
                                </span>
                              )}
                              {prod.tirePlyOrigin && <span>{prod.tirePlyOrigin}</span>}
                              {prod.warrantyMonths && <span className="text-[var(--md-primary-text)] font-semibold">ضمان: {prod.warrantyMonths} شهر</span>}
                            </div>
                          </div>
                        )}

                        {prod.activityType === 'oil' && (
                          <div className="space-y-1">
                            {prod.viscosityGrade && (
                              <div className="text-xs font-semibold text-[var(--md-info)] flex items-center gap-1">
                                <Droplet className="w-3.5 h-3.5 shrink-0" />
                                لزوجة: {prod.viscosityGrade}
                              </div>
                            )}
                            <div className="text-[10px] text-[var(--md-on-surface-variant)] tabular-nums">
                              {prod.oemCode && <span>OEM: {prod.oemCode} | </span>}
                              <span>سعة: {prod.litersPerUnit || 1} لتر</span>
                            </div>
                          </div>
                        )}

                        {prod.activityType === 'fuel' && (
                          <div className="space-y-1">
                            <div className="text-xs font-bold text-[var(--md-warning)] flex items-center gap-1">
                              ⛽ وقود / غاز مسال
                            </div>
                            <div className="text-[10px] text-[var(--md-on-surface-variant)]">
                              مضخات وعدادات وخزانات
                            </div>
                          </div>
                        )}

                        {(!prod.activityType || prod.activityType === 'general') && (
                          <span className="text-[var(--md-on-surface-variant)] text-[11px]">-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        <span
                          className={`m3-badge text-[10px] ${
                            prod.is_active !== false
                              ? 'm3-badge-success'
                              : 'bg-[var(--md-surface-container-high)] text-[var(--md-on-surface-variant)] border border-[var(--md-outline-variant)]'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${prod.is_active !== false ? 'bg-[var(--md-success)]' : 'bg-[var(--md-on-surface-variant)]'}`} />
                          {prod.is_active !== false ? 'نشط' : 'معطل'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(prod)}
                            title="تعديل المنتج"
                            className="m3-btn-tonal !min-h-[32px] !px-2 !py-1.5"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(prod)}
                            title="حذف المنتج"
                            className="m3-btn-danger !min-h-[32px] !px-2 !py-1.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT PRODUCT MODAL */}
      {isModalOpen && (
        <div className="m3-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150" dir="rtl">
          <div className="m3-modal-surface w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-right text-[var(--md-on-surface)]">
            <div className="flex items-center justify-between p-4 border-b border-[var(--md-outline-variant)] bg-[var(--md-surface-container-low)]">
              <h3 className="font-bold text-[var(--md-on-surface)] text-sm flex items-center gap-2">
                <div className="w-8 h-8 rounded-[var(--md-radius-sm)] bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
                <span>{editingProduct ? 'تعديل بيانات الصنف' : 'إضافة صنف جديد متعدد الأنشطة'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] p-1.5 rounded-[var(--md-radius-sm)] hover:bg-[var(--md-surface-container-high)] cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 space-y-4 text-xs overflow-y-auto flex-1 custom-scrollbar">

              {/* Activity Type Selection */}
              <div className="bg-[var(--md-surface-container-low)] p-3.5 rounded-[var(--md-radius-md)] border border-[var(--md-outline-variant)] space-y-2">
                <label className="block text-[var(--md-on-surface)] font-bold">نوع النشاط التجاري للصنف:</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {[
                    { id: 'food', label: '🍏 مواد غذائية', sub: 'صلاحية وتتبع' },
                    { id: 'battery', label: '⚡ بطاريات', sub: 'ضمان ورجيع' },
                    { id: 'tire', label: '🛞 إطارات وكفرات', sub: 'مقاس وسنة DOT' },
                    { id: 'oil', label: '🛢️ زيوت وقطع', sub: 'لزوجة وOEM' },
                    { id: 'fuel', label: '⛽ محطة وقود', sub: 'خزان وعداد' },
                    { id: 'general', label: '📦 عام', sub: 'تجارة ومخزون' },
                  ].map((act) => (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => {
                        const newAct = act.id as any;
                        const autoCode = newAct === 'oil' ? `PRT-${Math.floor(1000 + Math.random() * 9000)}` : `ITM-${Math.floor(1000 + Math.random() * 9000)}`;
                        setFormData({
                          ...formData,
                          activityType: newAct,
                          itemCode: formData.itemCode || autoCode,
                          partNumber: newAct === 'oil' ? (formData.partNumber || autoCode) : formData.partNumber,
                        });
                      }}
                      className={`p-2 rounded-[var(--md-radius-md)] text-right border transition-all cursor-pointer ${
                        formData.activityType === act.id
                          ? 'bg-[var(--md-primary-container)] border-[var(--md-primary)] text-[var(--md-on-primary-container)] shadow-sm'
                          : 'bg-[var(--md-surface-container)] border-[var(--md-outline-variant)] text-[var(--md-on-surface-variant)] hover:bg-[var(--md-surface-container-high)] hover:text-[var(--md-on-surface)]'
                      }`}
                    >
                      <div className="font-bold text-xs">{act.label}</div>
                      <div className="text-[10px] opacity-80 truncate">{act.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[var(--md-on-surface-variant)] font-semibold mb-1">اسم الصنف / المنتج <span className="text-[var(--md-error)]">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: شاي سيلاني فاخر 100 كيس / بطارية هانكوك 70A / إطار يوكوهاما 205/55R16"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="m3-input text-xs"
                  />
                </div>

                {/* Dynamic Item Code / Part Number Field */}
                <div>
                  <label className="block text-[var(--md-on-surface-variant)] font-semibold mb-1 flex items-center justify-between">
                    <span>
                      {formData.activityType === 'oil' ? 'رقم القطعة (Part Number / OEM)' : 'رقم الصنف / المنتج (Item Code)'}
                    </span>
                    <span className="text-[10px] text-[var(--md-info)] font-normal">تسلسلي تلقائي</span>
                  </label>
                  <input
                    type="text"
                    placeholder={formData.activityType === 'oil' ? 'PRT-1001 / OEM Code' : 'ITM-1001'}
                    value={formData.activityType === 'oil' ? (formData.partNumber || formData.itemCode) : formData.itemCode}
                    onChange={(e) => {
                      const val = normalizeScannedBarcode(toEnglishDigits(e.target.value));
                      if (formData.activityType === 'oil') {
                        setFormData({ ...formData, partNumber: val, itemCode: val });
                      } else {
                        setFormData({ ...formData, itemCode: val });
                      }
                    }}
                    className="m3-input text-xs font-bold font-mono dir-ltr text-right text-[var(--md-info)]"
                  />
                </div>

                <div>
                  <label className="block text-[var(--md-on-surface-variant)] font-semibold mb-1">رمز المنتج (SKU)</label>
                  <input
                    type="text"
                    placeholder="SKU-1001"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: normalizeScannedBarcode(toEnglishDigits(e.target.value)) })}
                    className="m3-input text-xs font-mono dir-ltr text-right"
                  />
                </div>

                <div>
                  <label className="block text-[var(--md-on-surface-variant)] font-semibold mb-1 flex items-center justify-between">
                    <span>الباركود الأساسي (Barcode)</span>
                    <span className="text-[10px] text-[var(--md-primary-text)] font-mono">USB / HID Normalizer</span>
                  </label>
                  <input
                    type="text"
                    placeholder="629100022112"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: normalizeScannedBarcode(e.target.value) })}
                    className="m3-input text-xs font-mono dir-ltr text-right"
                  />
                </div>

                <div>
                  <label className="block text-[var(--md-on-surface-variant)] font-semibold mb-1">الفئة / التصنيف</label>
                  <input
                    type="text"
                    placeholder="مواد غذائية، بطاريات، زيوت..."
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="m3-input text-xs"
                  />
                </div>

                <div>
                  <datalist id="packaging-units-list">
                    {EXPANDED_PACKAGING_UNITS.map((u) => (
                      <option key={u} value={u} />
                    ))}
                  </datalist>

                  <label className="block text-[var(--md-on-surface-variant)] font-semibold mb-1">الوحدة الأساسية (Base Unit)</label>
                  <input
                    type="text"
                    list="packaging-units-list"
                    placeholder="حبة، علبة، لتر، كيلو..."
                    value={formData.baseUnitName}
                    onChange={(e) => setFormData({ ...formData, baseUnitName: e.target.value, unit: e.target.value })}
                    className="m3-input text-xs"
                  />
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    {['قطعة / حبة', 'باكت / شدة', 'كرتون', 'قطمة', 'كيس / شوال', 'دبة / جالون', 'درزن', 'كيلوجرام', 'لتر'].map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setFormData({ ...formData, baseUnitName: u, unit: u })}
                        className={`text-[10px] px-2 py-0.5 rounded-[var(--md-radius-sm)] border transition-all cursor-pointer ${
                          formData.baseUnitName === u
                            ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border-[var(--md-primary)]/40 font-bold'
                            : 'bg-[var(--md-surface-container-low)] text-[var(--md-on-surface-variant)] border-[var(--md-outline-variant)] hover:text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-high)]'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Auto Sub-Unit Pricing Calculator Panel */}
              <div className="bg-[var(--md-primary-container)]/35 p-3.5 rounded-[var(--md-radius-md)] border border-[var(--md-primary)]/30 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-[var(--md-radius-sm)] bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] flex items-center justify-center shrink-0">
                      <Calculator className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[var(--md-on-surface)] text-xs flex items-center gap-1.5 flex-wrap">
                        <span>حاسبة تسعير التجزئة التلقائية</span>
                        <span className="m3-badge m3-badge-primary text-[10px] font-mono">
                          Auto Sub-Unit Pricing
                        </span>
                      </h4>
                      <p className="text-[10px] text-[var(--md-on-surface-variant)]">
                        احسب تكلفة وسعر بيع القطعة/الحبة آلياً من تكلفة الكرتون/الشوال وهامش الربح
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAutoPricingCalc(!showAutoPricingCalc)}
                    className="m3-btn-tonal !min-h-[34px] !px-3 text-[11px]"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>{showAutoPricingCalc ? 'إخفاء الحاسبة' : 'فتح الحاسبة التلقائية ⚡'}</span>
                  </button>
                </div>

                {showAutoPricingCalc && (
                  <div className="space-y-3 pt-2.5 border-t border-[var(--md-outline-variant)] animate-in fade-in duration-200">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div>
                        <label className="block text-[var(--md-on-surface-variant)] text-[11px] font-semibold mb-1">
                          نوع الوحدة الكبرى
                        </label>
                        <input
                          type="text"
                          list="packaging-units-list"
                          placeholder="كرتون / شوال"
                          value={calcBulkUnit}
                          onChange={(e) => setCalcBulkUnit(e.target.value)}
                          className="m3-input !h-9 text-xs font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[var(--md-on-surface-variant)] text-[11px] font-semibold mb-1">
                          تكلفة شراء {calcBulkUnit || 'الكرتون'} ({getActiveCurrencySymbol()})
                        </label>
                        <input
                          type="text"
                          placeholder="مثال: 24000"
                          value={calcBulkCost}
                          onChange={(e) => setCalcBulkCost(toEnglishDigits(e.target.value))}
                          className="m3-input !h-9 text-xs font-mono font-bold text-[var(--md-success)] tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="block text-[var(--md-on-surface-variant)] text-[11px] font-semibold mb-1">
                          معامل التحويل (كم حبة بالكرتون؟)
                        </label>
                        <input
                          type="text"
                          placeholder="مثال: 24"
                          value={calcConversionFactor}
                          onChange={(e) => setCalcConversionFactor(toEnglishDigits(e.target.value))}
                          className="m3-input !h-9 text-xs font-mono font-bold tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="block text-[var(--md-on-surface-variant)] text-[11px] font-semibold mb-1">
                          هامش ربح التجزئة %
                        </label>
                        <input
                          type="text"
                          placeholder="20"
                          value={calcProfitMarginPercent}
                          onChange={(e) => setCalcProfitMarginPercent(toEnglishDigits(e.target.value))}
                          className="m3-input !h-9 text-xs font-mono font-bold text-[var(--md-info)] tabular-nums"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[var(--md-surface-container-low)] p-2.5 rounded-[var(--md-radius-md)] border border-[var(--md-outline-variant)] text-center">
                      <div className="p-2 bg-[var(--md-surface-container)] rounded-[var(--md-radius-sm)] border border-[var(--md-outline-variant)]">
                        <div className="text-[10px] text-[var(--md-on-surface-variant)]">تكلفة القطعة الفردية</div>
                        <div className="text-xs font-mono font-bold text-[var(--md-on-surface)] tabular-nums mt-0.5">
                          {formatNumber(calcSingleUnitCost)} <span className="text-[9px] font-sans">{getActiveCurrencySymbol()}</span>
                        </div>
                      </div>
                      <div className="p-2 bg-[var(--md-success-container)]/60 rounded-[var(--md-radius-sm)] border border-[var(--md-success)]/30">
                        <div className="text-[10px] text-[var(--md-on-success-container)] font-bold">سعر التجزئة المقترح</div>
                        <div className="text-xs font-mono font-bold text-[var(--md-on-success-container)] tabular-nums mt-0.5">
                          {formatNumber(calcSuggestedRetailPrice)} <span className="text-[9px] font-sans">{getActiveCurrencySymbol()}</span>
                        </div>
                      </div>
                      <div className="p-2 bg-[var(--md-surface-container)] rounded-[var(--md-radius-sm)] border border-[var(--md-outline-variant)]">
                        <div className="text-[10px] text-[var(--md-on-surface-variant)]">سعر الجملة المقترح</div>
                        <div className="text-xs font-mono font-bold text-[var(--md-on-surface)] tabular-nums mt-0.5">
                          {formatNumber(calcSuggestedWholesalePrice)} <span className="text-[9px] font-sans">{getActiveCurrencySymbol()}</span>
                        </div>
                      </div>
                      <div className="p-2 bg-[var(--md-warning-container)]/50 rounded-[var(--md-radius-sm)] border border-[var(--md-warning)]/30">
                        <div className="text-[10px] text-[var(--md-on-warning-container)] font-semibold">سعر بيع {calcBulkUnit || 'الكرتون'}</div>
                        <div className="text-xs font-mono font-bold text-[var(--md-on-warning-container)] tabular-nums mt-0.5">
                          {formatNumber(calcBulkPriceToApply)} <span className="text-[9px] font-sans">{getActiveCurrencySymbol()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="text-[10px] text-[var(--md-on-surface-variant)]">
                        💡 بالضغط على الزر أدناه، سيتم تحديث أسعار التجزئة والجملة وسعر وتكلفة {calcBulkUnit || 'الكرتون'} فوراً
                      </div>
                      <button
                        type="button"
                        onClick={handleApplyCalculatedPricing}
                        disabled={calcSingleUnitCost <= 0}
                        className={calcSingleUnitCost > 0 ? 'm3-btn-primary !min-h-[36px] text-xs' : 'm3-btn-outlined !min-h-[36px] text-xs opacity-50 cursor-not-allowed'}
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>تطبيق الأسعار والتكلفة تلقائياً على الصنف</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Multi-UOM Section */}
              <div className="bg-[var(--md-surface-container-low)] p-3.5 rounded-[var(--md-radius-md)] border border-[var(--md-outline-variant)] space-y-3">
                <div className="flex items-center gap-2 font-bold text-[var(--md-on-surface)] text-xs border-b border-[var(--md-outline-variant)] pb-2">
                  <Layers className="w-4 h-4 text-[var(--md-primary-text)]" />
                  <span>تعدد وحدات القياس والتحويل (Multi-UOM)</span>
                </div>

                {/* Sub Unit */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[var(--md-on-surface-variant)] text-[11px] font-semibold mb-1">الوحدة الفرعية (Sub Unit)</label>
                    <input
                      type="text"
                      list="packaging-units-list"
                      placeholder="باكت، درزن..."
                      value={formData.subUnitName}
                      onChange={(e) => setFormData({ ...formData, subUnitName: e.target.value })}
                      className="m3-input !h-9 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[var(--md-on-surface-variant)] text-[11px] font-semibold mb-1">معامل التحويل (كم حبة في الباكت؟)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="12"
                      value={formData.subUnitFactor}
                      onChange={(e) => setFormData({ ...formData, subUnitFactor: e.target.value })}
                      className="m3-input !h-9 text-xs font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[var(--md-on-surface-variant)] text-[11px] font-semibold mb-1">سعر بيع الباكت / الدرزن</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={formData.subUnitPrice}
                      onChange={(e) => setFormData({ ...formData, subUnitPrice: e.target.value })}
                      className="m3-input !h-9 text-xs font-mono font-bold text-[var(--md-success)] tabular-nums"
                    />
                  </div>
                </div>

                {/* Major Unit */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[var(--md-on-surface-variant)] text-[11px] font-semibold mb-1">الوحدة الكبرى (Major Unit)</label>
                    <input
                      type="text"
                      list="packaging-units-list"
                      placeholder="كرتون، شوال، طبلية..."
                      value={formData.majorUnitName}
                      onChange={(e) => setFormData({ ...formData, majorUnitName: e.target.value })}
                      className="m3-input !h-9 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[var(--md-on-surface-variant)] text-[11px] font-semibold mb-1">معامل الكرتون (كم حبة بالكرتون؟)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="24"
                      value={formData.majorUnitFactor}
                      onChange={(e) => setFormData({ ...formData, majorUnitFactor: e.target.value })}
                      className="m3-input !h-9 text-xs font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[var(--md-on-surface-variant)] text-[11px] font-semibold mb-1">سعر بيع الكرتون / الشوال</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={formData.majorUnitPrice}
                      onChange={(e) => setFormData({ ...formData, majorUnitPrice: e.target.value })}
                      className="m3-input !h-9 text-xs font-mono font-bold text-[var(--md-success)] tabular-nums"
                    />
                  </div>
                </div>
              </div>

              {/* Tiered Pricing Section */}
              <div className="bg-[var(--md-surface-container-low)] p-3.5 rounded-[var(--md-radius-md)] border border-[var(--md-outline-variant)] space-y-3">
                <div className="flex items-center gap-2 font-bold text-[var(--md-on-surface)] text-xs border-b border-[var(--md-outline-variant)] pb-2">
                  <DollarSign className="w-4 h-4 text-[var(--md-primary-text)]" />
                  <span>مستويات التسعير المتعددة (Tiered Pricing)</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[var(--md-on-surface-variant)] text-[11px] font-semibold mb-1">سعر التجزئة (Retail)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={formData.sellingPrice}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sellingPrice: e.target.value,
                          retailPrice: e.target.value,
                        })
                      }
                      className="m3-input !h-9 text-xs text-[var(--md-success)] font-mono font-bold tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[var(--md-on-surface-variant)] text-[11px] font-semibold mb-1">سعر نصف الجملة</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={formData.halfWholesalePrice}
                      onChange={(e) => setFormData({ ...formData, halfWholesalePrice: e.target.value })}
                      className="m3-input !h-9 text-xs font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[var(--md-on-surface-variant)] text-[11px] font-semibold mb-1">سعر الجملة (Wholesale)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={formData.wholesalePrice}
                      onChange={(e) => setFormData({ ...formData, wholesalePrice: e.target.value })}
                      className="m3-input !h-9 text-xs font-mono font-bold tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[var(--md-on-surface-variant)] text-[11px] font-semibold mb-1">سعر عملاء كبار (VIP)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={formData.vipPrice}
                      onChange={(e) => setFormData({ ...formData, vipPrice: e.target.value })}
                      className="m3-input !h-9 text-xs text-[var(--md-primary-text)] font-mono font-bold tabular-nums"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label className="block text-[var(--md-on-surface-variant)] text-[11px] font-semibold mb-1">سعر الشراء (التكلفة الأساسية للوحدة الصغرى)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={formData.purchasePrice}
                      onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                      className="m3-input !h-9 text-xs font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[var(--md-on-surface-variant)] text-[11px] font-semibold mb-1">الرصيد الافتتاحي بالوحدة الصغرى ({formData.baseUnitName || 'حبة/كيلو'})</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0"
                      value={formData.currentStock}
                      onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                      className="m3-input !h-9 text-xs font-mono font-bold text-[var(--md-primary-text)] tabular-nums"
                    />
                  </div>
                </div>

                {/* Dual Synchronization Panel if Major Unit Factor > 1 */}
                {(() => {
                  const mFactor = parseFloat(formData.majorUnitFactor || '1');
                  const mUnit = formData.majorUnitName || 'كرتون/كيس';
                  const bUnit = formData.baseUnitName || 'كيلو/حبة';
                  const baseQty = parseFloat(formData.currentStock || '0');
                  const majorCountVal = mFactor > 1 ? Number((baseQty / mFactor).toFixed(2)) : 0;

                  if (mFactor > 1) {
                    return (
                      <div className="p-3 bg-[var(--md-surface-container)] rounded-[var(--md-radius-md)] border border-[var(--md-primary)]/30 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[var(--md-primary-text)] font-bold flex items-center gap-1.5">
                            <Boxes className="w-4 h-4" />
                            <span>تحديد الرصيد بعدد ({mUnit}):</span>
                          </span>
                          <span className="text-[10px] text-[var(--md-on-surface-variant)] font-mono tabular-nums">
                            1 {mUnit} = {mFactor} {bUnit}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[var(--md-on-surface-variant)] text-[10px] font-semibold mb-1">
                              العدد بالوحدة الكبرى ({mUnit})
                            </label>
                            <input
                              type="number"
                              step="any"
                              placeholder="مثال: 3"
                              value={majorCountVal > 0 ? majorCountVal : ''}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value || '0');
                                const convertedBase = Math.round(val * mFactor * 100) / 100;
                                setFormData({ ...formData, currentStock: String(convertedBase) });
                              }}
                              className="m3-input !h-9 text-xs font-mono font-bold tabular-nums"
                            />
                          </div>
                          <div className="flex flex-col justify-center text-xs bg-[var(--md-surface-container-low)] p-2 rounded-[var(--md-radius-sm)] border border-[var(--md-outline-variant)]">
                            <span className="text-[10px] text-[var(--md-on-surface-variant)] font-semibold">إجمالي الرصيد المحسوب:</span>
                            <span className="text-[var(--md-primary-text)] font-bold font-mono text-xs tabular-nums">
                              {baseQty} {bUnit} {mFactor > 1 && baseQty > 0 ? `(يعادل ${Number((baseQty / mFactor).toFixed(2))} ${mUnit})` : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Conditional Activity Specific Fields */}
              {formData.activityType === 'food' && (
                <div className="bg-[var(--md-success-container)]/30 p-3.5 rounded-[var(--md-radius-md)] border border-[var(--md-success)]/30 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-[var(--md-success)] text-xs border-b border-[var(--md-outline-variant)] pb-2">
                    <Apple className="w-4 h-4" />
                    <span>بيانات المواد الغذائية والصلاحية (FEFO Tracking)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[var(--md-on-surface-variant)] text-[11px] font-semibold mb-1">رقم التشغيلة (Batch Number)</label>
                      <input
                        type="text"
                        placeholder="BATCH-2026-01"
                        value={formData.batchNumber}
                        onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                        className="m3-input !h-9 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[var(--md-on-surface-variant)] text-[11px] font-semibold mb-1">تاريخ الإنتاج</label>
                      <input
                        type="date"
                        value={formData.productionDate}
                        onChange={(e) => setFormData({ ...formData, productionDate: e.target.value })}
                        className="m3-input !h-9 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[var(--md-on-surface-variant)] text-[11px] font-semibold mb-1">تاريخ انتهاء الصلاحية <span className="text-[var(--md-warning)]">*</span></label>
                      <input
                        type="date"
                        value={formData.expiryDate}
                        onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                        className="m3-input !h-9 text-xs font-bold text-[var(--md-warning)]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {formData.activityType === 'battery' && (
                <div className="bg-[var(--md-warning-container)]/30 p-3.5 rounded-[var(--md-radius-md)] border border-[var(--md-warning)]/30 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-[var(--md-warning)] text-xs border-b border-[var(--md-outline-variant)] pb-2">
                    <Zap className="w-4 h-4" />
                    <span>مواصفات البطاريات والضمان والرجيع (Warranty & Scrap)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[var(--md-on-surface-variant)] text-[11px] font-semibold mb-1">سعة ومواصفات البطارية</label>
                      <input
                        type="text"
                        placeholder="مثال: 70Ah - 12V SMF"
                        value={formData.batterySpec}
                        onChange={(e) => setFormData({ ...formData, batterySpec: e.target.value })}
                        className="m3-input !h-9 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[var(--md-on-surface-variant)] text-[11px] font-semibold mb-1">مدة الضمان بالشهور</label>
                      <input
                        type="number"
                        placeholder="12"
                        value={formData.warrantyMonths}
                        onChange={(e) => setFormData({ ...formData, warrantyMonths: e.target.value })}
                        className="m3-input !h-9 text-xs font-mono tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-[var(--md-on-surface-variant)] text-[11px] font-semibold mb-1">قيمة خصم الرجيع (البطارية التالفة)</label>
                      <input
                        type="number"
                        placeholder="50"
                        value={formData.scrapDiscountValue}
                        onChange={(e) => setFormData({ ...formData, scrapDiscountValue: e.target.value })}
                        className="m3-input !h-9 text-xs text-[var(--md-success)] font-mono font-bold tabular-nums"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="requiresSerial"
                      checked={formData.requiresSerial}
                      onChange={(e) => setFormData({ ...formData, requiresSerial: e.target.checked })}
                      className="w-4 h-4 rounded accent-[var(--md-primary)] cursor-pointer"
                    />
                    <label htmlFor="requiresSerial" className="text-[var(--md-on-surface)] font-semibold cursor-pointer">
                      يلزم تسجيل الرقم التسلسلي (Serial No.) عند البيع لشهادة الضمان
                    </label>
                  </div>
                </div>
              )}

              {formData.activityType === 'oil' && (
                <div className="bg-[var(--md-info-container)]/30 p-3.5 rounded-[var(--md-radius-md)] border border-[var(--md-info)]/30 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-[var(--md-info)] text-xs border-b border-[var(--md-outline-variant)] pb-2">
                    <Droplet className="w-4 h-4" />
                    <span>مواصفات الزيوت والشحوم وقطع الغيار (Viscosity & OEM)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[var(--md-on-surface-variant)] text-[11px] font-semibold mb-1">درجة اللزوجة (Viscosity Grade)</label>
                      <input
                        type="text"
                        placeholder="مثال: 20W-50 أو 5W-30 أو 10W-40"
                        value={formData.viscosityGrade}
                        onChange={(e) => setFormData({ ...formData, viscosityGrade: e.target.value })}
                        className="m3-input !h-9 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[var(--md-on-surface-variant)] text-[11px] font-semibold mb-1">كود المطابقة (OEM Part Code)</label>
                      <input
                        type="text"
                        placeholder="PET-20W50-SL"
                        value={formData.oemCode}
                        onChange={(e) => setFormData({ ...formData, oemCode: e.target.value })}
                        className="m3-input !h-9 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[var(--md-on-surface-variant)] text-[11px] font-semibold mb-1">سعة العبوة باللتر</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="4"
                        value={formData.litersPerUnit}
                        onChange={(e) => setFormData({ ...formData, litersPerUnit: e.target.value })}
                        className="m3-input !h-9 text-xs font-mono tabular-nums"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tires Section (قسم الإطارات والكفرات) */}
              {formData.activityType === 'tire' && (
                <div className="bg-[var(--md-info-container)]/30 p-3.5 rounded-[var(--md-radius-md)] border border-[var(--md-info)]/30 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-[var(--md-info)] text-xs border-b border-[var(--md-outline-variant)] pb-2">
                    <span className="text-base">🛞</span>
                    <span>مواصفات إطارات السيارات والكفرات والضمان (Tires Spec & Warranty)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[var(--md-on-surface-variant)] text-[11px] font-semibold mb-1">مقاس الإطار (Tire Size) <span className="text-[var(--md-info)]">*</span></label>
                      <input
                        type="text"
                        placeholder="مثال: 205/55 R16 أو 265/65 R17"
                        value={formData.tireSize}
                        onChange={(e) => setFormData({ ...formData, tireSize: e.target.value })}
                        className="m3-input !h-9 text-xs font-bold font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[var(--md-on-surface-variant)] text-[11px] font-semibold mb-1">تاريخ الصنع DOT (الأسبوع والسنة)</label>
                      <input
                        type="text"
                        placeholder="مثال: الأسبوع 40 - 2025"
                        value={formData.tireProductionDot}
                        onChange={(e) => setFormData({ ...formData, tireProductionDot: e.target.value })}
                        className="m3-input !h-9 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[var(--md-on-surface-variant)] text-[11px] font-semibold mb-1">بلد المنشأ ونقشة الغاط (Ply / Origin)</label>
                      <input
                        type="text"
                        placeholder="مثال: ياباني - 8 غاط"
                        value={formData.tirePlyOrigin}
                        onChange={(e) => setFormData({ ...formData, tirePlyOrigin: e.target.value })}
                        className="m3-input !h-9 text-xs"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <div>
                      <label className="block text-[var(--md-on-surface-variant)] text-[11px] font-semibold mb-1">مدة الضمان بالأشهر (ضد عيوب التصنيع)</label>
                      <input
                        type="number"
                        placeholder="12"
                        value={formData.warrantyMonths}
                        onChange={(e) => setFormData({ ...formData, warrantyMonths: e.target.value })}
                        className="m3-input !h-9 text-xs font-mono tabular-nums"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Fuel Station Section */}
              {formData.activityType === 'fuel' && (
                <div className="bg-[var(--md-warning-container)]/30 p-3.5 rounded-[var(--md-radius-md)] border border-[var(--md-warning)]/30 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-[var(--md-warning)] text-xs border-b border-[var(--md-outline-variant)] pb-2">
                    <span className="text-base">⛽</span>
                    <span>بيانات محطة الوقود والغاز وربط الخزان (Fuel Station Spec)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[var(--md-on-surface-variant)] text-[11px] font-semibold mb-1">نوع الوقود / المشتق</label>
                      <select
                        value={formData.fuelType}
                        onChange={(e) => setFormData({ ...formData, fuelType: e.target.value as any })}
                        className="m3-select !h-9 text-xs font-bold"
                      >
                        <option value="petrol_91">بترول عادي 91</option>
                        <option value="petrol_95">بترول ممتاز 95</option>
                        <option value="diesel">ديزل شاحنات ومعدات</option>
                        <option value="gas">غاز منزلي وتجاري</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[var(--md-on-surface-variant)] text-[11px] font-semibold mb-1">معرف الخزان الأرضي (Tank ID)</label>
                      <input
                        type="text"
                        placeholder="TANK-01"
                        value={formData.tankId}
                        onChange={(e) => setFormData({ ...formData, tankId: e.target.value })}
                        className="m3-input !h-9 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[var(--md-on-surface-variant)] text-[11px] font-semibold mb-1">معرف طرمبة التعبئة (Meter ID)</label>
                      <input
                        type="text"
                        placeholder="PUMP-01-MTR"
                        value={formData.meterId}
                        onChange={(e) => setFormData({ ...formData, meterId: e.target.value })}
                        className="m3-input !h-9 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded accent-[var(--md-primary)] cursor-pointer"
                />
                <label htmlFor="isActive" className="text-[var(--md-on-surface)] font-semibold cursor-pointer">
                  صنف نشط ومتاح في البيع والشراء والتحويل
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--md-outline-variant)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="m3-btn-outlined text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="m3-btn-primary text-xs"
                >
                  حفظ الصنف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
