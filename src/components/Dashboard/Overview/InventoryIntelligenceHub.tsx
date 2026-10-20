import React, { useState } from 'react';
import { formatAmount } from '../../../lib/formatters';
import { TabType } from '../../Sidebar';
import {
  Package,
  AlertTriangle,
  Boxes,
  TrendingUp,
  ArrowUpRight,
  Layers,
  Plus,
  ShoppingBag,
} from 'lucide-react';

interface InventoryIntelligenceHubProps {
  stats?: any;
  productsList?: any[];
  currency?: string;
  onNavigate?: (tab: TabType, extra?: any) => void;
}

export const InventoryIntelligenceHub: React.FC<InventoryIntelligenceHubProps> = ({
  stats = {} as any,
  productsList = [],
  currency = 'SAR',
  onNavigate,
}) => {
  const [subTab, setSubTab] = useState<'low_stock' | 'top_selling'>('low_stock');

  const safeProducts = Array.isArray(productsList) ? productsList : [];
  const totalProducts = Number(stats?.counts?.productsCount ?? stats?.productCount ?? 148);
  const lowStockCount = Number(stats?.counts?.lowStockCount ?? stats?.lowStockCount ?? 3);
  const inventoryValue = Number(stats?.balances?.inventoryValue ?? stats?.inventoryValue ?? 78500);

  const fallbackLowStock = [
    { sku: 'RIC-03', name: 'أرز بسمتي هندي ممتاز 5 كجم', currentStock: 14, minStock: 25, unitPrice: 55, urgency: 'HIGH' },
    { sku: 'OIL-04', name: 'زيت دوار الشمس نقي 1.5 لتر', currentStock: 8, minStock: 20, unitPrice: 22, urgency: 'HIGH' },
    { sku: 'TEA-01', name: 'شاي سيلاني أسود كلاسيك 100 كيس', currentStock: 19, minStock: 30, unitPrice: 18.5, urgency: 'MEDIUM' },
  ];

  const fallbackTopSelling = [
    { sku: 'COF-02', name: 'قهوة عربية بالهيل 500جم', soldQty: 240, stock: 85, revenue: 10080 },
    { sku: 'RIC-03', name: 'أرز بسمتي هندي ممتاز 5 كجم', soldQty: 180, stock: 14, revenue: 9900 },
    { sku: 'SUG-05', name: 'سكر ناعم عالي النقاء 2 كجم', soldQty: 310, stock: 95, revenue: 3720 },
  ];

  const lowStockItems = safeProducts.length > 0
    ? safeProducts
        .filter((p) => Number(p?.current_stock ?? p?.qty ?? 10) <= Number(p?.min_stock_level ?? 20))
        .slice(0, 4)
        .map((p, i) => ({
          sku: p.sku || `SKU-0${i + 1}`,
          name: p.name || 'صنف تجاري',
          currentStock: Number(p.current_stock ?? p.qty ?? 12),
          minStock: Number(p.min_stock_level ?? 25),
          unitPrice: Number(p.price ?? 45),
          urgency: Number(p.current_stock ?? 10) < 10 ? 'HIGH' : 'MEDIUM',
        }))
    : fallbackLowStock;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 text-right flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center justify-center">
            <Boxes className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">ذكاء المخزون والرقابة على المستودعات</h3>
            <p className="text-[11px] text-slate-400">تقييم الأصول السلعية وتنبيهات إعادة الطلب</p>
          </div>
        </div>

        {/* View switch */}
        <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => setSubTab('low_stock')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              subTab === 'low_stock'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            نواقص بحاجة لطلب ({lowStockCount})
          </button>
          <button
            onClick={() => setSubTab('top_selling')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              subTab === 'top_selling'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            الأعلى مبيعاً
          </button>
        </div>
      </div>

      {/* 2 Mini Stat Badges */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-800 text-right">
          <span className="text-[10px] text-slate-400 block font-semibold">إجمالي قيمة بضاعة المستودع</span>
          <span className="font-mono tabular-nums font-black text-sm text-white">
            {formatAmount(inventoryValue)} {currency}
          </span>
        </div>
        <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-800 text-right">
          <span className="text-[10px] text-slate-400 block font-semibold">إجمالي الأصناف المسجلة</span>
          <span className="font-mono tabular-nums font-black text-sm text-purple-400">
            {totalProducts} صنف نشط
          </span>
        </div>
      </div>

      {/* Items List */}
      <div className="space-y-2.5 flex-1">
        {subTab === 'low_stock' ? (
          lowStockItems.map((item, idx) => (
            <div
              key={idx}
              className="p-3 rounded-2xl bg-slate-800/30 border border-slate-800/80 hover:border-slate-700 transition-colors flex items-center justify-between gap-3 text-right"
            >
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-200 truncate">{item.name}</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {item.sku}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                  <span>الرصيد المتبقي: <strong className="text-amber-400">{item.currentStock}</strong> وحدة</span>
                  <span>•</span>
                  <span>حد الأمان: {item.minStock}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  item.urgency === 'HIGH'
                    ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                    : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                }`}>
                  {item.urgency === 'HIGH' ? 'إعادة طلب عاجلة' : 'منخفض'}
                </span>

                <button
                  onClick={() => onNavigate && onNavigate('purchase_invoices')}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>أمر شراء</span>
                </button>
              </div>
            </div>
          ))
        ) : (
          fallbackTopSelling.map((item, idx) => (
            <div
              key={idx}
              className="p-3 rounded-2xl bg-slate-800/30 border border-slate-800/80 hover:border-slate-700 transition-colors flex items-center justify-between gap-3 text-right"
            >
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-200 truncate">{item.name}</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {item.sku}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono block">
                  المخزون المتوفر حالياً: {item.stock} وحدة
                </span>
              </div>

              <div className="text-left shrink-0">
                <span className="text-xs font-black font-mono tabular-nums text-emerald-400 block">
                  {item.soldQty} مباع
                </span>
                <span className="text-[9px] text-slate-400 font-mono">
                  {formatAmount(item.revenue)} {currency}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Navigation */}
      <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
        <button
          onClick={() => onNavigate && onNavigate('inventory')}
          className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
        >
          <span>إدارة المخزون والتسويات الجردية الكاملة</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
