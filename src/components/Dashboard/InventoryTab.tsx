import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { formatAmount, formatNumber } from '../../lib/formatters';
import { ModuleSettingsModal } from '../Common/ModuleSettingsModal';
import { ProductActivityType } from '../../types';
import {
  Boxes,
  Search,
  Loader2,
  AlertCircle,
  ArrowDownRight,
  ArrowUpLeft,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  Calendar,
  Layers,
  Sparkles,
  Zap,
  Filter,
  Check,
  PackageCheck,
  History,
  QrCode,
  Tag,
  Phone,
  FileText,
} from 'lucide-react';

export const InventoryTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'movements_balances' | 'physical_audit' | 'expiry_warranty_radar'>('movements_balances');

  // Products and movements data
  const [products, setProducts] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [activityFilter, setActivityFilter] = useState<ProductActivityType | 'ALL'>('ALL');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Sub-tab 2: Physical Audit state (counts keyed by productId)
  const [physicalCounts, setPhysicalCounts] = useState<Record<string, number>>({});
  const [auditNotes, setAuditNotes] = useState<Record<string, string>>({});
  const [isApplyingAudit, setIsApplyingAudit] = useState(false);

  // Sub-tab 3: Battery Warranty search query & result
  const [warrantySearch, setWarrantySearch] = useState('');
  const [warrantyResult, setWarrantyResult] = useState<any | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [movRes, prodRes] = await Promise.all([
        api.getInventoryMovements({
          search: searchQuery,
          type: typeFilter,
        }),
        api.getProducts(),
      ]);

      const prods = prodRes?.data || [];
      setMovements(movRes?.data || []);
      setProducts(prods);

      // Initialize physical counts with current book stock
      const initialCounts: Record<string, number> = {};
      prods.forEach((p: any) => {
        initialCounts[p.id] = Number(p.current_stock ?? p.qty ?? 0);
      });
      setPhysicalCounts(initialCounts);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل بيانات المخزون والجرد');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [typeFilter]);

  // Stock breakdown helper (Cartons + Pieces)
  const getStockBreakdown = (prod: any) => {
    const stock = Number(prod.current_stock ?? prod.qty ?? 0);
    const factor = Number(prod.majorUnitFactor ?? prod.major_unit_factor ?? 0);
    const majorName = prod.majorUnitName || prod.major_unit_name || 'كرتون';
    const baseName = prod.baseUnitName || prod.unit || 'حبة';

    if (factor > 1 && stock >= factor) {
      const cartons = Math.floor(stock / factor);
      const pieces = stock % factor;
      return pieces > 0
        ? `${cartons} ${majorName} + ${pieces} ${baseName}`
        : `${cartons} ${majorName}`;
    }
    return `${stock} ${baseName}`;
  };

  // Filtered products list
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      !searchQuery.trim() ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.barcode && p.barcode.includes(searchQuery));
    const matchesActivity = activityFilter === 'ALL' || p.activityType === activityFilter;
    return matchesSearch && matchesActivity;
  });

  // Handle Physical Audit Input Change
  const handlePhysicalCountChange = (productId: string, val: number) => {
    setPhysicalCounts((prev) => ({
      ...prev,
      [productId]: Math.max(0, val),
    }));
  };

  // Commit and apply physical inventory adjustments
  const handleApplyInventoryAudit = async () => {
    try {
      setIsApplyingAudit(true);
      setError(null);

      // Find items with variances
      const itemsToAdjust = products.filter((p) => {
        const bookStock = Number(p.current_stock ?? p.qty ?? 0);
        const actualCount = physicalCounts[p.id] !== undefined ? physicalCounts[p.id] : bookStock;
        return actualCount !== bookStock;
      });

      if (itemsToAdjust.length === 0) {
        setSuccess('كافة الأرصدة الفعلية متطابقة تماماً مع الرصيد الدفتري، لا توجد فروقات للتسوية.');
        setTimeout(() => setSuccess(null), 4000);
        return;
      }

      // Process adjustments
      for (const item of itemsToAdjust) {
        const bookStock = Number(item.current_stock ?? item.qty ?? 0);
        const actualCount = physicalCounts[item.id];
        const diff = actualCount - bookStock;
        const reason = auditNotes[item.id] || `تسوية جرد فعلي معتمد (فارق: ${diff > 0 ? '+' : ''}${diff})`;

        await api.adjustStock(item.id, {
          quantity: diff,
          reason,
          type: diff >= 0 ? 'IN' : 'ADJUSTMENT',
        });
      }

      setSuccess(`تم بنجاح اعتماد الجرد المخزني وتسوية فروقات ${itemsToAdjust.length} صنف وتحديث الأرصدة!`);
      await fetchData();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء اعتماد وتسوية الجرد');
    } finally {
      setIsApplyingAudit(false);
    }
  };

  // Warranty Checker Search Action
  const handleWarrantySearch = (term?: string) => {
    const query = (term || warrantySearch).trim().toLowerCase();
    if (!query) {
      setWarrantyResult(null);
      return;
    }

    // Mock Battery Serial lookup database
    const sampleWarrantyDb = [
      {
        serialNumber: 'SN-BAT-70-2026',
        productName: 'بطارية هانكوك 70 أمبير جافة',
        batterySpec: '70Ah - 12V SMF',
        warrantyMonths: 12,
        purchaseDate: '2026-03-10',
        warrantyEndDate: '2027-03-10',
        customerName: 'مؤسسة الأفق للتجارة والتوكيلات',
        customerPhone: '967771234567',
        invoiceNumber: 'INV-2026-0042',
        scrapDiscountValue: 50,
      },
      {
        serialNumber: 'SN-BAT-100-2025',
        productName: 'بطارية إيه سي ديلكو 100 أمبير ياباني',
        batterySpec: '100Ah - 12V Heavy Duty',
        warrantyMonths: 12,
        purchaseDate: '2025-05-15',
        warrantyEndDate: '2026-05-15',
        customerName: 'شركة الوفاق للنقليات',
        customerPhone: '967733445566',
        invoiceNumber: 'INV-2025-0819',
        scrapDiscountValue: 70,
      },
      {
        serialNumber: 'SN-BAT-55-2026',
        productName: 'بطارية كلورايد ذهبية 55 أمبير',
        batterySpec: '55Ah - 12V Sealed',
        warrantyMonths: 6,
        purchaseDate: '2026-08-01',
        warrantyEndDate: '2027-02-01',
        customerName: 'علي بن أحمد الكاف',
        customerPhone: '966501234567',
        invoiceNumber: 'INV-2026-0040',
        scrapDiscountValue: 40,
      },
    ];

    const found = sampleWarrantyDb.find(
      (item) =>
        item.serialNumber.toLowerCase().includes(query) ||
        item.invoiceNumber.toLowerCase().includes(query) ||
        item.customerPhone.includes(query) ||
        item.customerName.toLowerCase().includes(query)
    );

    if (found) {
      const now = new Date();
      const end = new Date(found.warrantyEndDate);
      const isUnderWarranty = end.getTime() >= now.getTime();
      const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      setWarrantyResult({
        ...found,
        isUnderWarranty,
        diffDays,
      });
    } else {
      setWarrantyResult({ notFound: true, query });
    }
  };

  // Expirations Radar items (Products with activityType food or having expiryDate)
  const expiringFoodItems = products
    .filter((p) => p.activityType === 'food' || p.expiryDate)
    .map((p) => {
      const now = new Date();
      const expDate = p.expiryDate ? new Date(p.expiryDate) : null;
      const daysLeft = expDate ? Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 999;
      return {
        ...p,
        daysLeft,
      };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft);

  return (
    <div className="space-y-6 text-right text-slate-100 font-sans" dir="rtl">
      
      {/* Header */}
      <div className="bg-slate-900 border border-emerald-900/40 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-lg shadow-emerald-950/50 shrink-0">
                <Boxes className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>إدارة المستودع والجرد الذكي</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                    Warehouse & Inventory Suite
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 font-medium">
                  متابعة الأرصدة بالكرتون والقطعة، الجرد الفعلي وتسوية العجز والفائض، ورادار تواريخ الصلاحية وفحص ضمان وسيريال البطاريات
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Module Settings Modal Button */}
            <ModuleSettingsModal module="inventory" buttonLabel="⚙️ إعدادات القسم" />
          </div>
        </div>
      </div>

      {/* 3 Main Sub-Tabs Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSubTab('movements_balances')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'movements_balances'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-950/60 border border-emerald-400/40'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>حركة وأرصدة المستودع</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/60 text-slate-300">
            {products.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('physical_audit')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'physical_audit'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-950/60 border border-blue-400/40'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <PackageCheck className="w-4 h-4" />
          <span>الجرد المخزني الفعلي وتسوية الفروقات</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-950/60 text-blue-300 border border-blue-800/40">
            تسوية بنقرة واحدة
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('expiry_warranty_radar')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'expiry_warranty_radar'
              ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-950/60 border border-amber-400/40'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>رادار الصلاحية وفاحص ضمان البطاريات</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-950/60 text-amber-300 border border-amber-800/40">
            FEFO + السيريال
          </span>
        </button>
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

      {/* ========================================================================= */}
      {/* SUB-TAB 1: حركة وأرصدة المستودع (Carton + Piece Stock Breakdown) */}
      {/* ========================================================================= */}
      {activeSubTab === 'movements_balances' && (
        <div className="space-y-6">
          {/* Activity Filter & Search Bar */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-md">
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

            {/* Activity Type Filter Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
              {[
                { id: 'ALL', label: 'كافة الأنشطة' },
                { id: 'food', label: '🍏 أغذية' },
                { id: 'battery', label: '⚡ بطاريات' },
                { id: 'oil', label: '🛢️ زيوت' },
                { id: 'general', label: '📦 عام' },
              ].map((act) => (
                <button
                  key={act.id}
                  type="button"
                  onClick={() => setActivityFilter(act.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    activityFilter === act.id
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {act.label}
                </button>
              ))}
            </div>
          </div>

          {/* Stock Balances Table with Carton + Piece breakdown */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Boxes className="w-4 h-4 text-emerald-400" />
                <span>أرصدة المستودع مع تفصيل الكراتين والقطع</span>
              </h3>
              <span className="text-xs text-slate-400">
                إجمالي الأصناف: <strong className="text-emerald-400 font-mono">{filteredProducts.length}</strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">الصنف / النشاط</th>
                    <th className="p-3.5">الرمز SKU</th>
                    <th className="p-3.5">الرصيد الإجمالي (قطع)</th>
                    <th className="p-3.5 text-emerald-400">التفصيل بالكرتون والوحدة</th>
                    <th className="p-3.5">حد الأمان</th>
                    <th className="p-3.5">حالة التوفر</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mx-auto" />
                      </td>
                    </tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        لا توجد أصناف مطابقة للبحث أو الفلتر.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((prod) => {
                      const stock = Number(prod.current_stock ?? prod.qty ?? 0);
                      const minStock = Number(prod.min_stock_level ?? 5);
                      const isLow = stock <= minStock;

                      return (
                        <tr key={prod.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3.5 font-bold text-white">
                            <div>{prod.name}</div>
                            <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                              {prod.activityType === 'food'
                                ? '🍏 مواد غذائية'
                                : prod.activityType === 'battery'
                                ? '⚡ بطاريات وأجهزة'
                                : prod.activityType === 'oil'
                                ? '🛢️ زيوت وقطع غيار'
                                : '📦 عام'}
                              {prod.category ? ` • ${prod.category}` : ''}
                            </div>
                          </td>
                          <td className="p-3.5 font-mono text-slate-300">{prod.sku || '-'}</td>
                          <td className="p-3.5 font-mono font-bold text-slate-100">
                            {formatNumber(stock)} {prod.baseUnitName || prod.unit || 'حبة'}
                          </td>
                          <td className="p-3.5 font-bold text-emerald-400">
                            <span className="bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-800/50 inline-block font-mono">
                              {getStockBreakdown(prod)}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono text-slate-400">{minStock}</td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                stock <= 0
                                  ? 'bg-rose-950 text-rose-300 border border-rose-800/60'
                                  : isLow
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                              }`}
                            >
                              {stock <= 0 ? 'نفد من المخزن' : isLow ? 'قريب من النفاذ' : 'متوفر بالمخزن'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Movements Log Table */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-400" />
                <span>سجل حركات المخزون والوارد والمنصرف (Audit Log)</span>
              </h3>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="py-1.5 px-3 text-xs bg-slate-950 border border-slate-700/80 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="">كافة أنواع الحركات</option>
                <option value="IN">وارد للمخزن (IN)</option>
                <option value="OUT">صادر من المخزن (OUT)</option>
                <option value="ADJUSTMENT">تسوية جردية (ADJUSTMENT)</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">المنتج / الصنف</th>
                    <th className="p-3.5">نوع الحركة</th>
                    <th className="p-3.5">الكمية</th>
                    <th className="p-3.5">الرصيد بعد الحركة</th>
                    <th className="p-3.5">نوع المرجع</th>
                    <th className="p-3.5">التاريخ والوقت</th>
                    <th className="p-3.5">البيان والملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {movements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        لا توجد حركات مخزنية مسجلة حالياً.
                      </td>
                    </tr>
                  ) : (
                    movements.map((mov) => {
                      const isPositive = mov.type === 'IN';
                      const isAdjustment = mov.type === 'ADJUSTMENT';

                      return (
                        <tr key={mov.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3.5 font-bold text-white">{mov.product_name}</td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                                isPositive
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                                  : isAdjustment
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                                  : 'bg-rose-950 text-rose-300 border border-rose-800/60'
                              }`}
                            >
                              {isPositive ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpLeft className="w-3 h-3" />}
                              <span>{isPositive ? 'وارد (IN)' : isAdjustment ? 'تسوية (ADJ)' : 'صادر (OUT)'}</span>
                            </span>
                          </td>
                          <td className="p-3.5 font-mono font-bold">
                            <span className={isPositive ? 'text-emerald-400' : 'text-rose-400'}>
                              {isPositive ? `+${mov.quantity}` : `-${Math.abs(mov.quantity)}`}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono text-slate-200 font-bold">{mov.remaining_stock}</td>
                          <td className="p-3.5 text-slate-400 font-mono text-[11px]">{mov.reference_type || '-'}</td>
                          <td className="p-3.5 text-slate-400 font-mono text-[11px]">
                            {mov.date ? new Date(mov.date).toLocaleString('ar-SA') : '-'}
                          </td>
                          <td className="p-3.5 text-slate-300 max-w-[200px] truncate">{mov.notes || '-'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: الجرد المخزني الفعلي وتسوية الفروقات (Physical Inventory Audit) */}
      {/* ========================================================================= */}
      {activeSubTab === 'physical_audit' && (
        <div className="space-y-6">
          {/* Top Audit Instructions & Summary Banner */}
          <div className="bg-gradient-to-r from-blue-950/40 via-slate-900 to-indigo-950/40 border border-blue-500/30 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-blue-400" />
                <span>منصة الجرد المخزني الفعلي ومطابقة الفروقات</span>
              </h3>
              <p className="text-xs text-slate-400">
                أدخل الكميات الفعلية الموجودة على أرفف المستودع. يتم حساب الفارق المالي تلقائياً، وبنقرة واحدة يتم اعتماد الجرد وتوليد قيود التسوية.
              </p>
            </div>

            <button
              type="button"
              onClick={handleApplyInventoryAudit}
              disabled={isApplyingAudit}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs sm:text-sm shadow-xl shadow-blue-950/60 border border-blue-400/40 flex items-center gap-2 transition-all active:scale-95 cursor-pointer shrink-0"
            >
              {isApplyingAudit ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري اعتماد وتسوية المخزون...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>اعتماد الجرد وتسوية المخزون فورياً</span>
                </>
              )}
            </button>
          </div>

          {/* Interactive Physical Audit Table */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">اسم الصنف / الكود</th>
                    <th className="p-3.5">الرصيد الدفتري المسجل</th>
                    <th className="p-3.5 text-blue-400">الكمية الفعلية بالجرد (الواقع)</th>
                    <th className="p-3.5">الفارق بالكمية</th>
                    <th className="p-3.5">تكلفة الوحدة</th>
                    <th className="p-3.5">قيمة الفارق المالي</th>
                    <th className="p-3.5">حالة المطابقة</th>
                    <th className="p-3.5">ملاحظات وسبب الفارق</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {products.map((prod) => {
                    const bookStock = Number(prod.current_stock ?? prod.qty ?? 0);
                    const physicalCount =
                      physicalCounts[prod.id] !== undefined ? physicalCounts[prod.id] : bookStock;
                    const diffQty = physicalCount - bookStock;
                    const costPrice = Number(prod.purchase_price ?? prod.cost_price ?? 0);
                    const diffValue = diffQty * costPrice;

                    return (
                      <tr key={prod.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5 font-bold text-white max-w-[200px]">
                          <div className="truncate">{prod.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{prod.sku || '-'}</div>
                        </td>

                        {/* Book Stock */}
                        <td className="p-3.5 font-mono font-bold text-slate-300">
                          {formatNumber(bookStock)} {prod.baseUnitName || prod.unit || 'حبة'}
                        </td>

                        {/* Physical Count Input */}
                        <td className="p-3.5">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={physicalCount}
                            onChange={(e) =>
                              handlePhysicalCountChange(prod.id, parseFloat(e.target.value) || 0)
                            }
                            className="w-24 p-2 bg-slate-950 border border-blue-500/50 rounded-xl text-white font-mono font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>

                        {/* Variance Qty */}
                        <td className="p-3.5 font-mono font-bold">
                          <span
                            className={
                              diffQty === 0
                                ? 'text-slate-400'
                                : diffQty > 0
                                ? 'text-emerald-400'
                                : 'text-rose-400'
                            }
                          >
                            {diffQty > 0 ? `+${diffQty}` : diffQty}
                          </span>
                        </td>

                        {/* Cost Price */}
                        <td className="p-3.5 font-mono text-slate-400">{formatAmount(costPrice)}</td>

                        {/* Variance Value */}
                        <td className="p-3.5 font-mono font-bold">
                          <span
                            className={
                              diffValue === 0
                                ? 'text-slate-400'
                                : diffValue > 0
                                ? 'text-emerald-400'
                                : 'text-rose-400'
                            }
                          >
                            {formatAmount(diffValue)} YER
                          </span>
                        </td>

                        {/* Match Status Badge */}
                        <td className="p-3.5">
                          {diffQty === 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/60 flex items-center gap-1 w-max">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              مطابق تماماً
                            </span>
                          ) : diffQty > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800/60 flex items-center gap-1 w-max">
                              <ArrowDownRight className="w-3 h-3 text-blue-400" />
                              فائض مخزني (+{diffQty})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800/60 flex items-center gap-1 w-max">
                              <AlertTriangle className="w-3 h-3 text-rose-400" />
                              عجز مخزني ({diffQty})
                            </span>
                          )}
                        </td>

                        {/* Notes input */}
                        <td className="p-3.5">
                          <input
                            type="text"
                            placeholder="سبب الفارق..."
                            value={auditNotes[prod.id] || ''}
                            onChange={(e) =>
                              setAuditNotes({ ...auditNotes, [prod.id]: e.target.value })
                            }
                            className="w-full min-w-[130px] p-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: رادار الصلاحية وفاحص ضمان البطاريات (Expiry Radar & Battery Warranty) */}
      {/* ========================================================================= */}
      {activeSubTab === 'expiry_warranty_radar' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* PANEL 1: رادار صلاحية المواد الغذائية (FEFO Radar) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-950/80 text-amber-400 border border-amber-800/50 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">رادار تواريخ الصلاحية (FEFO Radar)</h3>
                  <p className="text-[11px] text-slate-400">تنبيهات استباقية للأصناف القريبة من الانتهاء</p>
                </div>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
                {expiringFoodItems.length} صنف غذائي
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[500px] custom-scrollbar">
              {expiringFoodItems.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  لا توجد أصناف مسجلة بتاريخ صلاحية حالياً.
                </div>
              ) : (
                expiringFoodItems.map((item) => {
                  const isExpired = item.daysLeft <= 0;
                  const isCritical = item.daysLeft > 0 && item.daysLeft <= 30;
                  const isWarning = item.daysLeft > 30 && item.daysLeft <= 60;

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isExpired
                          ? 'bg-rose-950/30 border-rose-800/60'
                          : isCritical
                          ? 'bg-amber-950/30 border-amber-700/60'
                          : isWarning
                          ? 'bg-amber-950/15 border-amber-800/40'
                          : 'bg-slate-950/60 border-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-white text-xs">{item.name}</h4>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            دفعة: {item.batchNumber || 'B-GEN'} • المخزون: {item.current_stock ?? item.qty ?? 0}{' '}
                            {item.baseUnitName || item.unit || 'حبة'}
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isExpired
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : isCritical
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                          }`}
                        >
                          {isExpired
                            ? 'منتهي الصلاحية'
                            : isCritical
                            ? `حرج: ${item.daysLeft} يوم متبقي`
                            : `متبقي ${item.daysLeft} يوم`}
                        </span>
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                        <span>تاريخ الانتهاء: <strong className="text-white font-mono">{item.expiryDate || '-'}</strong></span>
                        <span>الإنتاج: <span className="font-mono">{item.productionDate || '-'}</span></span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* PANEL 2: فاحص ضمان البطاريات والسيريال الفوري */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-950/80 text-blue-400 border border-blue-800/50 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">فاحص ضمان وسيريال البطاريات الفوري</h3>
                  <p className="text-[11px] text-slate-400">التحقق بالرقم التسلسلي (Serial No) أو رقم الفاتورة أو الهاتف</p>
                </div>
              </div>
            </div>

            {/* Search Input Bar */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <QrCode className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="اكتب السيريال أو رقم الفاتورة... (مثال: SN-BAT-70-2026)"
                    value={warrantySearch}
                    onChange={(e) => setWarrantySearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleWarrantySearch()}
                    className="w-full pl-3 pr-9 py-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleWarrantySearch()}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  فحص الضمان
                </button>
              </div>

              {/* Sample Quick Test Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                <span className="text-slate-400">نماذج سريعة:</span>
                {['SN-BAT-70-2026', 'SN-BAT-100-2025', 'INV-2026-0042'].map((sn) => (
                  <button
                    key={sn}
                    type="button"
                    onClick={() => {
                      setWarrantySearch(sn);
                      handleWarrantySearch(sn);
                    }}
                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-blue-300 rounded-md font-mono border border-slate-700 cursor-pointer"
                  >
                    {sn}
                  </button>
                ))}
              </div>
            </div>

            {/* Warranty Result Card */}
            {warrantyResult && (
              <div className="mt-2 flex-1">
                {warrantyResult.notFound ? (
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-center space-y-2">
                    <AlertCircle className="w-8 h-8 text-slate-500 mx-auto" />
                    <p className="text-xs text-slate-300">
                      لم يتم العثور على شهادة ضمان مسجلة لـ "{warrantyResult.query}".
                    </p>
                  </div>
                ) : (
                  <div
                    className={`p-5 rounded-2xl border space-y-4 shadow-lg ${
                      warrantyResult.isUnderWarranty
                        ? 'bg-emerald-950/20 border-emerald-700/60'
                        : 'bg-rose-950/20 border-rose-700/60'
                    }`}
                  >
                    {/* Status Badge */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 ${
                          warrantyResult.isUnderWarranty
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        {warrantyResult.isUnderWarranty ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>تحت الضمان المعتمد ساري ✅</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4 text-rose-400" />
                            <span>منتهي فترة الضمان ❌</span>
                          </>
                        )}
                      </span>

                      <span className="text-xs font-mono font-bold text-slate-300">
                        {warrantyResult.diffDays > 0
                          ? `متبقي ${warrantyResult.diffDays} يوم`
                          : `منتهي منذ ${Math.abs(warrantyResult.diffDays)} يوم`}
                      </span>
                    </div>

                    {/* Battery Details */}
                    <div className="space-y-2 text-xs">
                      <div className="font-bold text-white text-sm">{warrantyResult.productName}</div>
                      <div className="grid grid-cols-2 gap-2 text-slate-300">
                        <div>
                          <span className="text-slate-400">المواصفات:</span>{' '}
                          <strong className="text-amber-300">{warrantyResult.batterySpec}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400">السيريال:</span>{' '}
                          <strong className="font-mono">{warrantyResult.serialNumber}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400">العميل:</span> {warrantyResult.customerName}
                        </div>
                        <div>
                          <span className="text-slate-400">الهاتف:</span>{' '}
                          <strong className="font-mono">{warrantyResult.customerPhone}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400">تاريخ الشراء:</span>{' '}
                          <span className="font-mono">{warrantyResult.purchaseDate}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">نهاية الضمان:</span>{' '}
                          <strong className="font-mono text-emerald-400">
                            {warrantyResult.warrantyEndDate}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Scrap Trade-In Eligibility */}
                    <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Zap className="w-4 h-4 text-amber-400" />
                        <span>أهلية استبدال ورجيع البطارية التالفة:</span>
                      </div>
                      <span className="font-bold text-emerald-400 font-mono">
                        مستحق خصم {warrantyResult.scrapDiscountValue} YER
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};
