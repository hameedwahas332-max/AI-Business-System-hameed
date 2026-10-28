import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { formatAmount, formatNumber, getActiveCurrencySymbol } from '../../lib/formatters';
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
} from 'lucide-react';

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
      const isClean =
        typeof window !== 'undefined' &&
        (localStorage.getItem('erp_clean_production_mode_v1') === 'true' ||
          localStorage.getItem('erp_sample_data_cleaned') === 'true');

      const items = res?.data || [];
      setProducts(isClean && items.length === 0 ? [] : items);
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
    const handleInvUpdated = () => {
      fetchProducts();
    };
    window.addEventListener('erp-demo-data-wiped', handleWiped);
    window.addEventListener('erp-inventory-updated', handleInvUpdated);
    return () => {
      window.removeEventListener('erp-demo-data-wiped', handleWiped);
      window.removeEventListener('erp-inventory-updated', handleInvUpdated);
    };
  }, [searchQuery, selectedCategory, selectedActivity, lowStockOnly]);

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
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const retail = parseFloat(formData.retailPrice || formData.sellingPrice || '0');
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
        currentStock: parseFloat(formData.currentStock || '0'),
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
        majorUnitFactor: parseFloat(formData.majorUnitFactor || '1'),
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

      if (editingProduct) {
        await api.updateProduct(editingProduct.id, payload);
        setSuccess('تم تحديث بيانات المنتج بنجاح');
      } else {
        await api.createProduct(payload);
        setSuccess('تمت إضافة المنتج الجديد إلى الدليل بنجاح');
      }

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

  // Stock Breakdown helper (Cartons + Pieces)
  const renderStockBreakdown = (prod: any) => {
    const stock = Number(prod.current_stock ?? prod.qty ?? 0);
    const factor = Number(prod.majorUnitFactor ?? prod.major_unit_factor ?? 0);
    const majorName = prod.majorUnitName || prod.major_unit_name || 'كرتون';
    const baseName = prod.baseUnitName || prod.unit || 'حبة';

    if (factor > 1 && stock >= factor) {
      const cartons = Math.floor(stock / factor);
      const pieces = stock % factor;
      return (
        <div className="flex flex-col items-start gap-0.5">
          <span className="font-mono font-bold text-white text-xs">
            {formatNumber(stock)} {baseName}
          </span>
          <span className="text-[11px] text-emerald-400 font-semibold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/40">
            📦 {cartons} {majorName} {pieces > 0 ? `+ ${pieces} ${baseName}` : ''}
          </span>
        </div>
      );
    }

    return (
      <span className="font-mono font-bold text-slate-200">
        {formatNumber(stock)} {baseName}
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
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 text-rose-400" />
          منتهي ({expiryDate})
        </span>
      );
    }
    if (diffDays <= 60) {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-amber-400" />
          متبقي {diffDays} يوم
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
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
    <div className="space-y-6 text-right text-slate-100 font-sans" dir="rtl">
      
      {/* Header with Module Settings Button */}
      <div className="bg-slate-900 border border-emerald-900/40 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-lg shadow-emerald-950/50 shrink-0">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>دليل المنتجات والأصناف والأسعار</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                    Multi-Activity Catalog
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 font-medium">
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
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold text-xs sm:text-sm shadow-lg shadow-emerald-950/60 border border-emerald-500/40 flex items-center gap-2 transition-all active:scale-95 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة صنف جديد</span>
            </button>
          </div>
        </div>
      </div>

      {/* Activity Type Selector Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5 shadow-sm flex items-center gap-2 overflow-x-auto">
        <span className="text-xs font-bold text-slate-400 px-2 shrink-0 flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-emerald-400" />
          نوع النشاط:
        </span>
        {ACTIVITY_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setSelectedActivity(opt.id as any)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              selectedActivity === opt.id
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-950/50 border border-emerald-400/40'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60'
            }`}
          >
            <span>{opt.icon}</span>
            <span>{opt.label}</span>
          </button>
        ))}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-md flex items-center justify-between group hover:border-emerald-900/60 transition-all">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 mb-1">إجمالي عدد الأصناف والمنتجات</div>
            <div className="text-2xl font-bold font-mono text-white">{products.length} صنف</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-950/80 border border-emerald-800/40 text-emerald-400 flex items-center justify-center shrink-0">
            <Boxes className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-md flex items-center justify-between group hover:border-emerald-900/60 transition-all">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 mb-1">القيمة التقديرية للمخزون (تكلفة الشراء)</div>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              {formatAmount(totalStockValuation)} <span className="text-xs text-slate-400 font-sans">YER</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-teal-950/80 border border-teal-800/40 text-teal-400 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-md flex items-center justify-between group hover:border-emerald-900/60 transition-all">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 mb-1">الأصناف القريبة من النفاذ</div>
            <div className={`text-2xl font-bold font-mono ${lowStockCount > 0 ? 'text-amber-400' : 'text-slate-200'}`}>
              {lowStockCount} صنف
            </div>
          </div>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
            lowStockCount > 0
              ? 'bg-amber-950/80 border-amber-800/40 text-amber-400'
              : 'bg-slate-800/80 border-slate-700/50 text-slate-400'
          }`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-xs sm:text-sm flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs sm:text-sm flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-400 hover:text-emerald-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Table & Filters Card */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        {/* Filters Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="البحث باسم المنتج، SKU، أو الباركود..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-9 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto flex-wrap justify-between sm:justify-end">
            {categories.length > 0 && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="py-2 px-3 text-xs bg-slate-950 border border-slate-700/80 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500"
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
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                lowStockOnly
                  ? 'bg-amber-950/70 text-amber-300 border-amber-700/70 shadow-sm'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/80'
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
          <table className="w-full text-right text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="p-3.5">اسم المنتج / النشاط</th>
                <th className="p-3.5">رقم الصنف / القطعة / SKU</th>
                <th className="p-3.5">مستويات التسعير</th>
                <th className="p-3.5">حركة ورصيد المخزون (الوارد / المباع / المتبقي)</th>
                <th className="p-3.5">مواصفات النشاط والصلاحية والضمان</th>
                <th className="p-3.5">الحالة</th>
                <th className="p-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                      <span>جاري تحميل الأصناف والأسعار...</span>
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
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
                    <tr key={prod.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Product Name & Activity */}
                      <td className="p-3.5 font-bold text-white max-w-[240px]">
                        <div className="truncate">{prod.name}</div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/50">
                            {activityLabel}
                          </span>
                          {prod.category && (
                            <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                              {prod.category}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Item Code / Part Number & SKU & Barcode */}
                      <td className="p-3.5 font-mono text-slate-400 dir-ltr text-right">
                        <div className="text-emerald-400 font-bold text-xs">
                          {displayCode ? (
                            <span className="bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                              {prod.itemCode ? `ITM: ${prod.itemCode}` : prod.partNumber ? `OEM: ${prod.partNumber}` : prod.sku}
                            </span>
                          ) : (
                            '-'
                          )}
                        </div>
                        {prod.barcode && <div className="text-[10px] text-slate-400 font-mono mt-1">📊 {prod.barcode}</div>}
                      </td>

                      {/* Tiered Pricing */}
                      <td className="p-3.5 text-xs">
                        <div className="space-y-0.5 font-mono">
                          <div className="text-emerald-400 font-bold">
                            تجزئة: {formatAmount(prod.selling_price ?? prod.retailPrice ?? 0)}
                          </div>
                          {(prod.halfWholesalePrice > 0 || prod.wholesalePrice > 0) && (
                            <div className="text-[11px] text-slate-400">
                              جملة: {formatAmount(prod.wholesalePrice || prod.halfWholesalePrice || 0)}
                            </div>
                          )}
                          {prod.majorUnitPrice > 0 && prod.majorUnitName && (
                            <div className="text-[10px] text-teal-300">
                              {prod.majorUnitName}: {formatAmount(prod.majorUnitPrice)}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Stock with Cartons Breakdown & Movements */}
                      <td className="p-3.5">
                        <div className="space-y-1.5 min-w-[170px]">
                          <div className="flex items-center gap-1.5">
                            {renderStockBreakdown(prod)}
                            {isLow && (
                              <span title={`تنبيه مخزون: الحد الأدنى ${prod.min_stock_level ?? 5}`}>
                                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                              </span>
                            )}
                          </div>
                          {/* 4 Inventory Indicators: السابق/الوارد، المباع اليوم، إجمالي المباع، المتبقي */}
                          <div className="grid grid-cols-2 gap-1 text-[10px] font-mono bg-slate-950/70 p-1.5 rounded-lg border border-slate-800">
                            <div className="text-slate-400">
                              <span>الوارد: </span>
                              <span className="font-bold text-slate-200">
                                {formatNumber(Number(prod.current_stock ?? prod.qty ?? prod.stock ?? 0) + Number(prod.totalSold || 0))}
                              </span>
                            </div>
                            <div className="text-blue-400">
                              <span>مباع اليوم: </span>
                              <span className="font-bold">{formatNumber(Number(prod.soldToday || 0))}</span>
                            </div>
                            <div className="text-purple-400">
                              <span>إجمالي المباع: </span>
                              <span className="font-bold">{formatNumber(Number(prod.totalSold || 0))}</span>
                            </div>
                            <div className="text-emerald-400">
                              <span>المتبقي: </span>
                              <span className="font-bold">{formatNumber(stock)}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Conditional Activity Fields */}
                      <td className="p-3.5 text-xs">
                        {prod.activityType === 'food' && (
                          <div className="space-y-1">
                            {renderExpiryBadge(prod.expiryDate)}
                            {prod.batchNumber && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                دفعة: {prod.batchNumber}
                              </div>
                            )}
                          </div>
                        )}

                        {prod.activityType === 'battery' && (
                          <div className="space-y-1">
                            {prod.batterySpec && (
                              <div className="text-xs font-semibold text-amber-300 flex items-center gap-1">
                                <Zap className="w-3.5 h-3.5 text-amber-400" />
                                {prod.batterySpec}
                              </div>
                            )}
                            <div className="text-[10px] text-slate-400 flex items-center gap-2">
                              <span>ضمان: {prod.warrantyMonths || 12} شهر</span>
                              {prod.scrapDiscountValue > 0 && (
                                <span className="text-emerald-400">رجيع: {prod.scrapDiscountValue} YER</span>
                              )}
                            </div>
                          </div>
                        )}

                        {prod.activityType === 'tire' && (
                          <div className="space-y-1">
                            {prod.tireSize && (
                              <div className="text-xs font-bold text-cyan-300 font-mono flex items-center gap-1">
                                <span>🛞 مقاس: {prod.tireSize}</span>
                              </div>
                            )}
                            <div className="text-[10px] text-slate-400 flex items-center gap-1.5 flex-wrap">
                              {prod.tireProductionDot && <span className="bg-slate-800 px-1 py-0.2 rounded font-mono">DOT: {prod.tireProductionDot}</span>}
                              {prod.tirePlyOrigin && <span>{prod.tirePlyOrigin}</span>}
                              {prod.warrantyMonths && <span className="text-teal-300">ضمان: {prod.warrantyMonths} شهر</span>}
                            </div>
                          </div>
                        )}

                        {prod.activityType === 'oil' && (
                          <div className="space-y-1">
                            {prod.viscosityGrade && (
                              <div className="text-xs font-semibold text-blue-300 flex items-center gap-1">
                                <Droplet className="w-3.5 h-3.5 text-blue-400" />
                                لزوجة: {prod.viscosityGrade}
                              </div>
                            )}
                            <div className="text-[10px] text-slate-400">
                              {prod.oemCode && <span>OEM: {prod.oemCode} | </span>}
                              <span>سعة: {prod.litersPerUnit || 1} لتر</span>
                            </div>
                          </div>
                        )}

                        {prod.activityType === 'fuel' && (
                          <div className="space-y-1">
                            <div className="text-xs font-bold text-amber-300 flex items-center gap-1">
                              ⛽ وقود / غاز مسال
                            </div>
                            <div className="text-[10px] text-slate-400">
                              مضخات وعدادات وخزانات
                            </div>
                          </div>
                        )}

                        {(!prod.activityType || prod.activityType === 'general') && (
                          <span className="text-slate-500 text-[11px]">-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                            prod.is_active !== false
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                              : 'bg-slate-800 text-slate-400 border border-slate-700/60'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${prod.is_active !== false ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                          {prod.is_active !== false ? 'نشط' : 'معطل'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(prod)}
                            title="تعديل المنتج"
                            className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(prod)}
                            title="حذف المنتج"
                            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150" dir="rtl">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-right text-slate-100">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800/60 flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
                <span>{editingProduct ? 'تعديل بيانات الصنف' : 'إضافة صنف جديد متعدد الأنشطة'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 space-y-4 text-xs overflow-y-auto flex-1 custom-scrollbar">
              
              {/* Activity Type Selection */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                <label className="block text-slate-300 font-bold">نوع النشاط التجاري للصنف:</label>
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
                      className={`p-2 rounded-xl text-right border transition-all cursor-pointer ${
                        formData.activityType === act.id
                          ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-sm ring-1 ring-emerald-500/50'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      <div className="font-bold text-xs">{act.label}</div>
                      <div className="text-[10px] text-slate-400 truncate">{act.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">اسم الصنف / المنتج <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: شاي سيلاني فاخر 100 كيس / بطارية هانكوك 70A / إطار يوكوهاما 205/55R16"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Dynamic Item Code / Part Number Field */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 flex items-center justify-between">
                    <span>
                      {formData.activityType === 'oil' ? 'رقم القطعة (Part Number / OEM)' : 'رقم الصنف / المنتج (Item Code)'}
                    </span>
                    <span className="text-[10px] text-blue-400 font-normal">تسلسلي تلقائي</span>
                  </label>
                  <input
                    type="text"
                    placeholder={formData.activityType === 'oil' ? 'PRT-1001 / OEM Code' : 'ITM-1001'}
                    value={formData.activityType === 'oil' ? (formData.partNumber || formData.itemCode) : formData.itemCode}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (formData.activityType === 'oil') {
                        setFormData({ ...formData, partNumber: val, itemCode: val });
                      } else {
                        setFormData({ ...formData, itemCode: val });
                      }
                    }}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-blue-300 font-bold placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono dir-ltr text-right"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">رمز المنتج (SKU)</label>
                  <input
                    type="text"
                    placeholder="SKU-1001"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono dir-ltr text-right"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">الباركود الأساسي (Barcode)</label>
                  <input
                    type="text"
                    placeholder="629100022112"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono dir-ltr text-right"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">الفئة / التصنيف</label>
                  <input
                    type="text"
                    placeholder="مواد غذائية، بطاريات، زيوت..."
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">الوحدة الأساسية (Base Unit)</label>
                  <input
                    type="text"
                    placeholder="حبة، علبة، لتر، كيلو..."
                    value={formData.baseUnitName}
                    onChange={(e) => setFormData({ ...formData, baseUnitName: e.target.value, unit: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Multi-UOM Section */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 font-bold text-white text-xs border-b border-slate-800 pb-1.5">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>تعدد وحدات القياس والتحويل (Multi-UOM)</span>
                </div>

                {/* Sub Unit */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">الوحدة الفرعية (Sub Unit)</label>
                    <input
                      type="text"
                      placeholder="باكت، درزن..."
                      value={formData.subUnitName}
                      onChange={(e) => setFormData({ ...formData, subUnitName: e.target.value })}
                      className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">معامل التحويل (كم حبة في الباكت؟)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="12"
                      value={formData.subUnitFactor}
                      onChange={(e) => setFormData({ ...formData, subUnitFactor: e.target.value })}
                      className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">سعر بيع الباكت / الدرزن</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={formData.subUnitPrice}
                      onChange={(e) => setFormData({ ...formData, subUnitPrice: e.target.value })}
                      className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-mono text-emerald-400"
                    />
                  </div>
                </div>

                {/* Major Unit */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">الوحدة الكبرى (Major Unit)</label>
                    <input
                      type="text"
                      placeholder="كرتون، شوال، طبلية..."
                      value={formData.majorUnitName}
                      onChange={(e) => setFormData({ ...formData, majorUnitName: e.target.value })}
                      className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">معامل الكرتون (كم حبة بالكرتون؟)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="24"
                      value={formData.majorUnitFactor}
                      onChange={(e) => setFormData({ ...formData, majorUnitFactor: e.target.value })}
                      className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">سعر بيع الكرتون / الشوال</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={formData.majorUnitPrice}
                      onChange={(e) => setFormData({ ...formData, majorUnitPrice: e.target.value })}
                      className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-mono text-emerald-400"
                    />
                  </div>
                </div>
              </div>

              {/* Tiered Pricing Section */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 font-bold text-white text-xs border-b border-slate-800 pb-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span>مستويات التسعير المتعددة (Tiered Pricing)</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">سعر التجزئة (Retail)</label>
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
                      className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-emerald-400 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">سعر نصف الجملة</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={formData.halfWholesalePrice}
                      onChange={(e) => setFormData({ ...formData, halfWholesalePrice: e.target.value })}
                      className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">سعر الجملة (Wholesale)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={formData.wholesalePrice}
                      onChange={(e) => setFormData({ ...formData, wholesalePrice: e.target.value })}
                      className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">سعر عملاء كبار (VIP)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={formData.vipPrice}
                      onChange={(e) => setFormData({ ...formData, vipPrice: e.target.value })}
                      className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-teal-300 font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">سعر الشراء (التكلفة الأساسية)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={formData.purchasePrice}
                      onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                      className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">الرصيد الافتتاحي بالمخزن</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0"
                      value={formData.currentStock}
                      onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                      className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Conditional Activity Specific Fields */}
              {formData.activityType === 'food' && (
                <div className="bg-emerald-950/30 p-3.5 rounded-xl border border-emerald-800/40 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-emerald-400 text-xs border-b border-emerald-900/60 pb-1.5">
                    <Apple className="w-4 h-4" />
                    <span>بيانات المواد الغذائية والصلاحية (FEFO Tracking)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-slate-300 text-[11px] mb-1">رقم التشغيلة (Batch Number)</label>
                      <input
                        type="text"
                        placeholder="BATCH-2026-01"
                        value={formData.batchNumber}
                        onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                        className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 text-[11px] mb-1">تاريخ الإنتاج</label>
                      <input
                        type="date"
                        value={formData.productionDate}
                        onChange={(e) => setFormData({ ...formData, productionDate: e.target.value })}
                        className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 text-[11px] mb-1">تاريخ انتهاء الصلاحية <span className="text-amber-400">*</span></label>
                      <input
                        type="date"
                        value={formData.expiryDate}
                        onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                        className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-amber-300 font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {formData.activityType === 'battery' && (
                <div className="bg-amber-950/30 p-3.5 rounded-xl border border-amber-800/40 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-amber-400 text-xs border-b border-amber-900/60 pb-1.5">
                    <Zap className="w-4 h-4" />
                    <span>مواصفات البطاريات والضمان والرجيع (Warranty & Scrap)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-slate-300 text-[11px] mb-1">سعة ومواصفات البطارية</label>
                      <input
                        type="text"
                        placeholder="مثال: 70Ah - 12V SMF"
                        value={formData.batterySpec}
                        onChange={(e) => setFormData({ ...formData, batterySpec: e.target.value })}
                        className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 text-[11px] mb-1">مدة الضمان بالشهور</label>
                      <input
                        type="number"
                        placeholder="12"
                        value={formData.warrantyMonths}
                        onChange={(e) => setFormData({ ...formData, warrantyMonths: e.target.value })}
                        className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 text-[11px] mb-1">قيمة خصم الرجيع (البطارية التالفة)</label>
                      <input
                        type="number"
                        placeholder="50"
                        value={formData.scrapDiscountValue}
                        onChange={(e) => setFormData({ ...formData, scrapDiscountValue: e.target.value })}
                        className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-emerald-400 font-mono font-bold"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="requiresSerial"
                      checked={formData.requiresSerial}
                      onChange={(e) => setFormData({ ...formData, requiresSerial: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <label htmlFor="requiresSerial" className="text-slate-300 font-semibold cursor-pointer">
                      يلزم تسجيل الرقم التسلسلي (Serial No.) عند البيع لشهادة الضمان
                    </label>
                  </div>
                </div>
              )}

              {formData.activityType === 'oil' && (
                <div className="bg-blue-950/30 p-3.5 rounded-xl border border-blue-800/40 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-blue-400 text-xs border-b border-blue-900/60 pb-1.5">
                    <Droplet className="w-4 h-4" />
                    <span>مواصفات الزيوت والشحوم وقطع الغيار (Viscosity & OEM)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-slate-300 text-[11px] mb-1">درجة اللزوجة (Viscosity Grade)</label>
                      <input
                        type="text"
                        placeholder="مثال: 20W-50 أو 5W-30 أو 10W-40"
                        value={formData.viscosityGrade}
                        onChange={(e) => setFormData({ ...formData, viscosityGrade: e.target.value })}
                        className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 text-[11px] mb-1">كود المطابقة (OEM Part Code)</label>
                      <input
                        type="text"
                        placeholder="PET-20W50-SL"
                        value={formData.oemCode}
                        onChange={(e) => setFormData({ ...formData, oemCode: e.target.value })}
                        className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 text-[11px] mb-1">سعة العبوة باللتر</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="4"
                        value={formData.litersPerUnit}
                        onChange={(e) => setFormData({ ...formData, litersPerUnit: e.target.value })}
                        className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tires Section (قسم الإطارات والكفرات) */}
              {formData.activityType === 'tire' && (
                <div className="bg-sky-950/30 p-3.5 rounded-xl border border-sky-800/40 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-sky-400 text-xs border-b border-sky-900/60 pb-1.5">
                    <span className="text-base">🛞</span>
                    <span>مواصفات إطارات السيارات والكفرات والضمان (Tires Spec & Warranty)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-slate-300 text-[11px] mb-1">مقاس الإطار (Tire Size) <span className="text-sky-400">*</span></label>
                      <input
                        type="text"
                        placeholder="مثال: 205/55 R16 أو 265/65 R17"
                        value={formData.tireSize}
                        onChange={(e) => setFormData({ ...formData, tireSize: e.target.value })}
                        className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-bold font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 text-[11px] mb-1">تاريخ الصنع DOT (الأسبوع والسنة)</label>
                      <input
                        type="text"
                        placeholder="مثال: الأسبوع 40 - 2025"
                        value={formData.tireProductionDot}
                        onChange={(e) => setFormData({ ...formData, tireProductionDot: e.target.value })}
                        className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 text-[11px] mb-1">بلد المنشأ ونقشة الغاط (Ply / Origin)</label>
                      <input
                        type="text"
                        placeholder="مثال: ياباني - 8 غاط"
                        value={formData.tirePlyOrigin}
                        onChange={(e) => setFormData({ ...formData, tirePlyOrigin: e.target.value })}
                        className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <div>
                      <label className="block text-slate-300 text-[11px] mb-1">مدة الضمان بالأشهر (ضد عيوب التصنيع)</label>
                      <input
                        type="number"
                        placeholder="12"
                        value={formData.warrantyMonths}
                        onChange={(e) => setFormData({ ...formData, warrantyMonths: e.target.value })}
                        className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Fuel Station Section */}
              {formData.activityType === 'fuel' && (
                <div className="bg-amber-950/30 p-3.5 rounded-xl border border-amber-800/40 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-amber-400 text-xs border-b border-amber-900/60 pb-1.5">
                    <span className="text-base">⛽</span>
                    <span>بيانات محطة الوقود والغاز وربط الخزان (Fuel Station Spec)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-slate-300 text-[11px] mb-1">نوع الوقود / المشتق</label>
                      <select
                        value={formData.fuelType}
                        onChange={(e) => setFormData({ ...formData, fuelType: e.target.value as any })}
                        className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-bold"
                      >
                        <option value="petrol_91">بترول عادي 91</option>
                        <option value="petrol_95">بترول ممتاز 95</option>
                        <option value="diesel">ديزل شاحنات ومعدات</option>
                        <option value="gas">غاز منزلي وتجاري</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-300 text-[11px] mb-1">معرف الخزان الأرضي (Tank ID)</label>
                      <input
                        type="text"
                        placeholder="TANK-01"
                        value={formData.tankId}
                        onChange={(e) => setFormData({ ...formData, tankId: e.target.value })}
                        className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 text-[11px] mb-1">معرف طرمبة التعبئة (Meter ID)</label>
                      <input
                        type="text"
                        placeholder="PUMP-01-MTR"
                        value={formData.meterId}
                        onChange={(e) => setFormData({ ...formData, meterId: e.target.value })}
                        className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-mono"
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
                  className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="isActive" className="text-slate-300 font-semibold cursor-pointer">
                  صنف نشط ومتاح في البيع والشراء والتحويل
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-800 font-semibold transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-950/50 border border-emerald-500/40 transition-all active:scale-95 cursor-pointer"
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
