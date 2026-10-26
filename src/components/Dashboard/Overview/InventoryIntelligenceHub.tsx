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
  ShieldCheck,
  Calendar,
  Truck,
  Store,
  Building2,
  Car,
  Clock,
  Sparkles,
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
  const [activeView, setActiveView] = useState<'warehouses' | 'low_stock' | 'radar_warranties'>('warehouses');

  const isClean = typeof window !== 'undefined' && (
    localStorage.getItem('erp_clean_production_mode_v1') === 'true' ||
    localStorage.getItem('erp_sample_data_cleaned') === 'true'
  );

  const safeProducts = Array.isArray(productsList) ? productsList : [];
  const totalProducts = Number(stats?.counts?.productsCount ?? stats?.productCount ?? safeProducts.length);
  const lowStockCount = Number(stats?.counts?.lowStockCount ?? stats?.lowStockCount ?? 0);
  const inventoryValue = Number(stats?.balances?.inventoryValue ?? stats?.inventoryValue ?? 0);

  // 4 Warehouses stock distribution
  const warehouses = [
    {
      id: 'wh-main',
      name: 'المستودع الرئيسي - الجملة',
      code: 'WH-01',
      itemsCount: Math.round(totalProducts * 0.58),
      valuation: Math.round(inventoryValue * 0.58),
      capacityPct: totalProducts > 0 ? 75 : 0,
      icon: Building2,
      color: 'text-indigo-400 bg-indigo-500/15 border-indigo-500/30',
      barColor: 'bg-indigo-500',
    },
    {
      id: 'wh-retail',
      name: 'معرض التجزئة المركزي',
      code: 'WH-02',
      itemsCount: Math.round(totalProducts * 0.22),
      valuation: Math.round(inventoryValue * 0.22),
      capacityPct: totalProducts > 0 ? 60 : 0,
      icon: Store,
      color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
      barColor: 'bg-emerald-500',
    },
    {
      id: 'wh-branch',
      name: 'فرع البطاريات والزيوت',
      code: 'WH-03',
      itemsCount: Math.round(totalProducts * 0.14),
      valuation: Math.round(inventoryValue * 0.14),
      capacityPct: totalProducts > 0 ? 45 : 0,
      icon: Boxes,
      color: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
      barColor: 'bg-amber-400',
    },
    {
      id: 'wh-van',
      name: 'سيارة التوزيع الميداني',
      code: 'VAN-04',
      itemsCount: Math.round(totalProducts * 0.06),
      valuation: Math.round(inventoryValue * 0.06),
      capacityPct: totalProducts > 0 ? 85 : 0,
      icon: Truck,
      color: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30',
      barColor: 'bg-cyan-400',
    },
  ];

  // Low stock with cartons and pieces
  const fallbackLowStock = [
    {
      sku: 'RIC-03',
      name: 'أرز بسمتي هندي ممتاز 5 كجم',
      cartons: 3,
      pieces: 2,
      totalUnits: 14,
      minStockUnits: 25,
      unitPrice: 55,
      urgency: 'HIGH',
    },
    {
      sku: 'OIL-04',
      name: 'زيت محرك بترومين 20W-50 (4 لتر)',
      cartons: 1,
      pieces: 4,
      totalUnits: 10,
      minStockUnits: 20,
      unitPrice: 42,
      urgency: 'HIGH',
    },
    {
      sku: 'TEA-01',
      name: 'شاي سيلاني فاخر 100 كيس',
      cartons: 4,
      pieces: 8,
      totalUnits: 24,
      minStockUnits: 36,
      unitPrice: 18.5,
      urgency: 'MEDIUM',
    },
  ];

  const lowStockItems =
    safeProducts.length > 0
      ? safeProducts
          .filter((p) => Number(p?.current_stock ?? p?.qty ?? 10) <= Number(p?.min_stock_level ?? 20))
          .slice(0, 4)
          .map((p, i) => {
            const factor = Number(p.majorUnitFactor || 12);
            const total = Number(p.current_stock ?? p.qty ?? 12);
            const cartons = Math.floor(total / factor);
            const pieces = total % factor;
            return {
              sku: p.sku || `SKU-0${i + 1}`,
              name: p.name || 'صنف تجاري',
              cartons,
              pieces,
              totalUnits: total,
              minStockUnits: Number(p.min_stock_level ?? 25),
              unitPrice: Number(p.price ?? 45),
              urgency: total < 12 ? 'HIGH' : 'MEDIUM',
            };
          })
      : (isClean ? [] : fallbackLowStock);

  // Multi-Activity Radar & Warranties
  const foodExpiryBatches = [
    { batch: 'B-2026-OCT', name: 'شاي سيلاني فاخر 100 كيس', expiry: '2026-11-15', daysLeft: 24, status: 'NEAR_EXPIRY' },
    { batch: 'RIC-2026-B', name: 'أرز بسمتي هندي 5 كجم', expiry: '2026-12-01', daysLeft: 40, status: 'SAFE' },
  ];

  const batteryWarranties = [
    { serial: 'SN-HK-70A-9921', name: 'بطارية هانكوك 70 أمبير جافة', customer: 'مؤسسة الأفق للتجارة', monthsLeft: 9, status: 'ACTIVE' },
    { serial: 'SN-ACD-60A-8812', name: 'بطارية أي سي ديلكو 60 أمبير', customer: 'شركة الوفاق المحدودة', monthsLeft: 5, status: 'ACTIVE' },
    { serial: 'SN-VRT-80A-1123', name: 'بطارية فارتا ألماني 80 أمبير', customer: 'عميل نقدي (POS)', monthsLeft: 11, status: 'ACTIVE' },
  ];

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
            <p className="text-[11px] text-slate-400">الـ 4 مستودعات • رادار الصلاحية • ضمان البطاريات</p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => setActiveView('warehouses')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              activeView === 'warehouses'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            المستودعات الـ 4
          </button>
          <button
            onClick={() => setActiveView('low_stock')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              activeView === 'low_stock'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            نواقص كرتون/حبة ({lowStockCount})
          </button>
          <button
            onClick={() => setActiveView('radar_warranties')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              activeView === 'radar_warranties'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            الصلاحية والضمان
          </button>
        </div>
      </div>

      {/* 2 Mini Stat Badges */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-800 text-right">
          <span className="text-[10px] text-slate-400 block font-semibold">إجمالي قيمة بضاعة الـ 4 مستودعات</span>
          <span className="font-mono tabular-nums font-black text-sm text-white">
            {formatAmount(inventoryValue)} {currency}
          </span>
        </div>
        <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-800 text-right">
          <span className="text-[10px] text-slate-400 block font-semibold">ضمانات وبطاريات نشطة</span>
          <span className="font-mono tabular-nums font-black text-sm text-emerald-400">
            48 ضمان فعال وساري
          </span>
        </div>
      </div>

      {/* Dynamic Content Views */}
      <div className="space-y-2.5 flex-1">
        {activeView === 'warehouses' && (
          <div className="space-y-2.5">
            {warehouses.map((wh) => {
              const Icon = wh.icon;
              return (
                <div
                  key={wh.id}
                  className="p-3 rounded-2xl bg-slate-800/40 border border-slate-800/80 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${wh.color}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-slate-200">{wh.name}</h4>
                          <span className="text-[9px] font-mono px-1 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            {wh.code}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {wh.itemsCount} صنف متوفر
                        </span>
                      </div>
                    </div>

                    <div className="text-left">
                      <span className="text-xs font-black font-mono tabular-nums text-white block">
                        {formatAmount(wh.valuation)} {currency}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        إشغال {wh.capacityPct}%
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${wh.barColor}`} style={{ width: `${wh.capacityPct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeView === 'low_stock' && (
          <div className="space-y-2.5">
            {lowStockItems.map((item, idx) => (
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
                  <div className="flex items-center gap-2 text-[10px] text-slate-300 font-mono">
                    <span className="bg-amber-500/15 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30 font-bold">
                      {item.cartons} كرتون + {item.pieces} حبة ({item.totalUnits} إجمالي)
                    </span>
                    <span>•</span>
                    <span className="text-slate-400">حد الأمان: {item.minStockUnits}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      item.urgency === 'HIGH'
                        ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    }`}
                  >
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
            ))}
          </div>
        )}

        {activeView === 'radar_warranties' && (
          <div className="space-y-3">
            {/* Food Expiry Alerts */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>رادار صلاحية الأغذية (قريبة الانتهاء):</span>
              </span>
              {foodExpiryBatches.map((b, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between text-xs font-mono"
                >
                  <div>
                    <span className="font-bold text-slate-200 block text-right font-sans">{b.name}</span>
                    <span className="text-[10px] text-slate-400">تشغيلة: {b.batch} • انتهاء: {b.expiry}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                    متبقي {b.daysLeft} يوم
                  </span>
                </div>
              ))}
            </div>

            {/* Battery Warranties */}
            <div className="space-y-1.5 pt-1 border-t border-slate-800">
              <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>ضمانات البطاريات السارية (فحص السيريال):</span>
              </span>
              {batteryWarranties.map((w, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="font-bold text-slate-200 font-sans">{w.name}</span>
                      <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1 rounded">{w.serial}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">العميل: {w.customer}</span>
                  </div>
                  <span className="text-emerald-400 font-bold font-mono text-[10px]">
                    {w.monthsLeft} أشهر متبقية
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
        <button
          onClick={() => onNavigate && onNavigate('inventory')}
          className="flex-1 text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center justify-center gap-1 cursor-pointer py-1.5 rounded-xl bg-slate-800 border border-slate-700"
        >
          <span>إدارة الـ 4 مستودعات والجرد</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => onNavigate && onNavigate('real_business')}
          className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer py-1.5 px-3 rounded-xl bg-slate-800 border border-slate-700"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>فحص الضمان</span>
        </button>
      </div>
    </div>
  );
};
