import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { formatAmount, formatNumber } from '../../lib/formatters';
import { ExportActions } from '../Common/ExportActions';
import { TableExportConfig } from '../../lib/exportUtils';
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
} from 'lucide-react';

export const ProductsTab: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
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
    barcode: '',
    category: 'عام',
    unit: 'حبة',
    purchasePrice: '0',
    sellingPrice: '0',
    currentStock: '0',
    minStockLevel: '5',
    isActive: true,
    description: '',
  });

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getProducts(searchQuery, selectedCategory, lowStockOnly);
      setProducts(res?.data || []);
    } catch (err: any) {
      setError(err.message || 'فشل جلب دليل المنتجات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [searchQuery, selectedCategory, lowStockOnly]);

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      barcode: '',
      category: 'عام',
      unit: 'حبة',
      purchasePrice: '0',
      sellingPrice: '0',
      currentStock: '0',
      minStockLevel: '5',
      isActive: true,
      description: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (prod: any) => {
    setEditingProduct(prod);
    setFormData({
      name: prod.name || '',
      sku: prod.sku || '',
      barcode: prod.barcode || '',
      category: prod.category || 'عام',
      unit: prod.unit || 'حبة',
      purchasePrice: String(prod.purchase_price || 0),
      sellingPrice: String(prod.selling_price || 0),
      currentStock: String(prod.current_stock || 0),
      minStockLevel: String(prod.min_stock_level || 5),
      isActive: prod.is_active !== false,
      description: prod.description || '',
    });
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const payload = {
        name: formData.name,
        sku: formData.sku,
        barcode: formData.barcode,
        category: formData.category,
        unit: formData.unit,
        purchasePrice: parseFloat(formData.purchasePrice || '0'),
        sellingPrice: parseFloat(formData.sellingPrice || '0'),
        currentStock: parseFloat(formData.currentStock || '0'),
        minStockLevel: parseFloat(formData.minStockLevel || '0'),
        isActive: formData.isActive,
        description: formData.description,
      };

      if (editingProduct) {
        await api.updateProduct(editingProduct.id, payload);
        setSuccess('تم تحديث بيانات المنتج بنجاح');
      } else {
        await api.createProduct(payload);
        setSuccess('تم إضافة المنتج الجديد إلى الدليل بنجاح');
      }

      setIsModalOpen(false);
      fetchProducts();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || 'فشل حفظ المنتج');
    }
  };

  const handleDeleteProduct = async (prod: any) => {
    if (!window.confirm(`هل أنت تأكد من حذف المنتج "${prod.name}" من الدليل؟`)) return;
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

  // Metrics calculations
  const totalStockValuation = products.reduce(
    (sum, p) => sum + (p.current_stock || 0) * (p.purchase_price || 0),
    0
  );

  const totalUnitsInStock = products.reduce(
    (sum, p) => sum + Number(p.current_stock || 0),
    0
  );

  const lowStockCount = products.filter(
    (p) => (p.current_stock || 0) <= (p.min_stock_level || 0)
  ).length;

  // Extract categories for filter
  const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));

  const getProductExportConfig = (): TableExportConfig => ({
    filename: `inventory_products_${new Date().toISOString().split('T')[0]}`,
    title: 'سجل المنتجات ومخزون المستودعات',
    subtitle: selectedCategory ? `الفئة: ${selectedCategory}` : lowStockOnly ? 'أصناف تحت حد الطلب' : 'كافة الأصناف والمنتجات',
    filterBadges: [
      ...(searchQuery ? [{ label: 'بحث', value: searchQuery }] : []),
      ...(selectedCategory ? [{ label: 'الفئة', value: selectedCategory }] : []),
      ...(lowStockOnly ? [{ label: 'الحالة', value: 'نقص مخزون' }] : []),
    ],
    summaryCards: [
      { label: 'إجمالي عدد الأصناف', value: products.length },
      { label: 'إجمالي القطع في المستودع', value: formatNumber(totalUnitsInStock) },
      { label: 'القيمة التقديرية للمخزون', value: `${formatAmount(totalStockValuation)} YER` },
      { label: 'أصناف قريبة من النفاذ', value: lowStockCount },
    ],
    headers: ['اسم الصنف', 'الفئة', 'الرمز SKU', 'الباركود', 'الوحدة', 'سعر الشراء (YER)', 'سعر البيع (YER)', 'المخزون الحالي', 'الحد الأدنى', 'حالة التوفر'],
    rows: products.map((prod) => [
      prod.name,
      prod.category || 'عام',
      prod.sku || '-',
      prod.barcode || '-',
      prod.unit || 'حبة',
      prod.purchase_price || 0,
      prod.selling_price || 0,
      prod.current_stock || 0,
      prod.min_stock_level || 5,
      prod.current_stock <= 0
        ? 'نفذ من المخزن'
        : prod.current_stock <= prod.min_stock_level
        ? 'قريب من النفاذ'
        : 'متوفر',
    ]),
    alignments: ['right', 'center', 'center', 'center', 'center', 'right', 'right', 'center', 'center', 'center'],
  });

  return (
    <div className="space-y-6 text-right text-slate-100 font-sans" dir="rtl">
      
      {/* Header */}
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
                  <span>دليل المنتجات والأصناف</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                    Products Catalog
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 font-medium">
                  متابعة كتالوج المنتجات، الأكواد التشجيرية SKU والباركود، أسعار الشراء والبيع، وتنبيهات حد الأمان
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold text-xs sm:text-sm shadow-lg shadow-emerald-950/60 border border-emerald-500/40 flex items-center gap-2 transition-all active:scale-95 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة منتج جديد</span>
          </button>
        </div>
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
                <th className="p-3.5">اسم المنتج / الفئة</th>
                <th className="p-3.5">الرمز SKU / الباركود</th>
                <th className="p-3.5">الوحدة</th>
                <th className="p-3.5">سعر الشراء</th>
                <th className="p-3.5">سعر البيع</th>
                <th className="p-3.5">المخزون الحالي</th>
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
                      <span>جاري تحميل الأصناف...</span>
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    لا توجد منتجات مطابقة لخيارات البحث.
                  </td>
                </tr>
              ) : (
                products.map((prod) => {
                  const isLow = prod.current_stock <= prod.min_stock_level;
                  return (
                    <tr key={prod.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-bold text-white">
                        <div>{prod.name}</div>
                        <div className="text-[11px] font-normal text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md inline-block mt-0.5 border border-emerald-800/50">
                          {prod.category}
                        </div>
                      </td>
                      <td className="p-3.5 font-mono text-slate-400 dir-ltr text-right">
                        <div className="text-slate-200 font-semibold">{prod.sku || '-'}</div>
                        {prod.barcode && <div className="text-[10px] text-slate-500 font-mono">📊 {prod.barcode}</div>}
                      </td>
                      <td className="p-3.5 text-slate-300">{prod.unit}</td>
                      <td className="p-3.5 font-mono text-slate-300">
                        {formatAmount(prod.purchase_price)}
                      </td>
                      <td className="p-3.5 font-mono font-bold text-emerald-400">
                        {formatAmount(prod.selling_price)}
                      </td>
                      <td className="p-3.5 font-mono font-bold">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-md text-xs ${
                              isLow
                                ? 'bg-red-950 text-red-300 border border-red-800/60'
                                : 'bg-slate-800 text-slate-200 border border-slate-700/60'
                            }`}
                          >
                            {formatNumber(prod.current_stock)}
                          </span>
                          {isLow && (
                            <span title={`تنبيه مخزون: الحد الأدنى ${prod.min_stock_level}`}>
                              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                            prod.is_active
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                              : 'bg-slate-800 text-slate-400 border border-slate-700/60'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${prod.is_active ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                          {prod.is_active ? 'نشط' : 'معطل'}
                        </span>
                      </td>
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
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden text-right text-slate-100">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800/60 flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
                <span>{editingProduct ? 'تعديل بيانات المنتج' : 'إضافة منتج جديد لكتالوج الأصناف'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">اسم المنتج / الصنف <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="مثال: أرز بسمتي فاخر 10 كجم"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <label className="block text-slate-300 font-semibold mb-1">الباركود (Barcode)</label>
                  <input
                    type="text"
                    placeholder="629100022112"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono dir-ltr text-right"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">الفئة / التصنيف</label>
                  <input
                    type="text"
                    placeholder="مواد غذائية، أثاث، إلكترونيات..."
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">وحدة القياس</label>
                  <input
                    type="text"
                    placeholder="حبة، كرتون، قطة، كيلو..."
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">سعر الشراء (التكلفة)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">سعر البيع المعتمد</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">الكمية الحالية بالمخزن</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0"
                    value={formData.currentStock}
                    onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">حد أمان المخزون (Min Level)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="5"
                    value={formData.minStockLevel}
                    onChange={(e) => setFormData({ ...formData, minStockLevel: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="isActive" className="text-slate-300 font-semibold cursor-pointer">
                  صنف نشط ومتاح في البيع والشراء
                </label>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">الوصف والمواصفات</label>
                <textarea
                  rows={2}
                  placeholder="وصف تفصيلي للمنتج ومكان التخزين..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-800 font-semibold transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-950/50 border border-emerald-500/40 transition-all active:scale-95"
                >
                  حفظ المنتج
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
