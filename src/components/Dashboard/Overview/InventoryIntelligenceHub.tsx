import React, { useState } from 'react';
import { formatAmount } from '../../../lib/formatters';
import { getProductMajorFactor, computeLiveProductStockMetrics } from '../../../utils/inventoryMath';
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
      color: 'bg-[var(--md-info-container)] text-[var(--md-on-info-container)]',
      barColor: 'bg-[var(--md-info)]',
    },
    {
      id: 'wh-retail',
      name: 'معرض التجزئة المركزي',
      code: 'WH-02',
      itemsCount: Math.round(totalProducts * 0.22),
      valuation: Math.round(inventoryValue * 0.22),
      capacityPct: totalProducts > 0 ? 60 : 0,
      icon: Store,
      color: 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)]',
      barColor: 'bg-[var(--md-primary)]',
    },
    {
      id: 'wh-branch',
      name: 'فرع البطاريات والزيوت',
      code: 'WH-03',
      itemsCount: Math.round(totalProducts * 0.14),
      valuation: Math.round(inventoryValue * 0.14),
      capacityPct: totalProducts > 0 ? 45 : 0,
      icon: Boxes,
      color: 'bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)]',
      barColor: 'bg-[var(--md-secondary)]',
    },
    {
      id: 'wh-van',
      name: 'سيارة التوزيع الميداني',
      code: 'VAN-04',
      itemsCount: Math.round(totalProducts * 0.06),
      valuation: Math.round(inventoryValue * 0.06),
      capacityPct: totalProducts > 0 ? 85 : 0,
      icon: Truck,
      color: 'bg-[var(--md-success-container)] text-[var(--md-on-success-container)]',
      barColor: 'bg-[var(--md-success)]',
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
          .map((p, i) => {
            const m = computeLiveProductStockMetrics(p);
            const total = m.currentStock;
            const factor = m.majorFactor;
            const cartons = m.majorCount;
            const pieces = m.remainderSub;
            return {
              product: p,
              sku: p.sku || `SKU-0${i + 1}`,
              name: p.name || 'صنف تجاري',
              cartons,
              pieces,
              totalUnits: total,
              minStockUnits: Number(p.min_stock_level ?? 25),
              unitPrice: Number(p.price ?? p.selling_price ?? 45),
              urgency: total < (Number(p.min_stock_level ?? 25) / 2) ? 'HIGH' : 'MEDIUM',
              isLow: total <= Number(p.min_stock_level ?? 25),
            };
          })
          .filter((item) => item.isLow)
          .slice(0, 4)
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
    <div className="m3-card p-5 sm:p-6 space-y-4 text-right flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--md-outline-variant)] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] flex items-center justify-center shrink-0">
            <Boxes className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--md-on-surface)]">ذكاء المخزون والرقابة على المستودعات</h3>
            <p className="text-[11px] text-[var(--md-on-surface-variant)]">الـ 4 مستودعات • رادار الصلاحية • ضمان البطاريات</p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center bg-[var(--md-surface-container)] p-1 rounded-xl border border-[var(--md-outline-variant)]">
          <button
            onClick={() => setActiveView('warehouses')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeView === 'warehouses'
                ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)] shadow-sm'
                : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
            }`}
          >
            المستودعات الـ 4
          </button>
          <button
            onClick={() => setActiveView('low_stock')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeView === 'low_stock'
                ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)] shadow-sm'
                : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
            }`}
          >
            نواقص كرتون/حبة ({lowStockCount})
          </button>
          <button
            onClick={() => setActiveView('radar_warranties')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeView === 'radar_warranties'
                ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)] shadow-sm'
                : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
            }`}
          >
            الصلاحية والضمان
          </button>
        </div>
      </div>

      {/* 2 Mini Stat Badges */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] text-right">
          <span className="text-[10px] text-[var(--md-on-surface-variant)] block font-semibold">إجمالي قيمة بضاعة الـ 4 مستودعات</span>
          <span className="font-mono tabular-nums font-black text-sm text-[var(--md-on-surface)]">
            {formatAmount(inventoryValue)} {currency}
          </span>
        </div>
        <div className="p-3 rounded-xl bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] text-right">
          <span className="text-[10px] text-[var(--md-on-surface-variant)] block font-semibold">ضمانات وبطاريات نشطة</span>
          <span className="font-mono tabular-nums font-black text-sm text-[var(--md-primary-text)]">
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
                  className="p-3 rounded-xl bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] hover:border-[var(--md-outline)] transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5 gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${wh.color}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-[var(--md-on-surface)] truncate">{wh.name}</h4>
                          <span className="m3-badge font-mono text-[9px] px-1.5 py-0">
                            {wh.code}
                          </span>
                        </div>
                        <span className="text-[10px] text-[var(--md-on-surface-variant)] font-mono tabular-nums">
                          {wh.itemsCount} صنف متوفر
                        </span>
                      </div>
                    </div>

                    <div className="text-left shrink-0">
                      <span className="text-xs font-black font-mono tabular-nums text-[var(--md-on-surface)] block">
                        {formatAmount(wh.valuation)} {currency}
                      </span>
                      <span className="text-[10px] text-[var(--md-on-surface-variant)] font-mono tabular-nums">
                        إشغال {wh.capacityPct}%
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-1.5 bg-[var(--md-surface-container-high)] rounded-full overflow-hidden">
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
                className="p-3 rounded-xl bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] hover:border-[var(--md-outline)] transition-colors flex items-center justify-between gap-3 text-right"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[var(--md-on-surface)] truncate">{item.name}</span>
                    <span className="m3-badge font-mono text-[9px] px-1.5 py-0">
                      {item.sku}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-[var(--md-on-surface-variant)] font-mono flex-wrap tabular-nums">
                    <span className="m3-badge m3-badge-warning font-bold">
                      {item.cartons} كرتون + {item.pieces} حبة ({item.totalUnits} إجمالي)
                    </span>
                    <span>•</span>
                    <span>حد الأمان: {item.minStockUnits}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`m3-badge ${
                      item.urgency === 'HIGH' ? 'm3-badge-error' : 'm3-badge-warning'
                    }`}
                  >
                    {item.urgency === 'HIGH' ? 'إعادة طلب عاجلة' : 'منخفض'}
                  </span>

                  <button
                    onClick={() => onNavigate && onNavigate('purchase_invoices')}
                    className="px-2.5 py-1.5 rounded-lg bg-[var(--md-primary-container)] hover:opacity-85 text-[var(--md-on-primary-container)] text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1"
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
              <span className="text-[11px] font-bold text-[var(--md-secondary)] flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>رادار صلاحية الأغذية (قريبة الانتهاء):</span>
              </span>
              {foodExpiryBatches.map((b, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-xl bg-[var(--md-warning-container)] border border-[color-mix(in_srgb,var(--md-warning)_30%,transparent)] flex items-center justify-between text-xs font-mono"
                >
                  <div>
                    <span className="font-bold text-[var(--md-on-warning-container)] block text-right font-sans">{b.name}</span>
                    <span className="text-[10px] text-[var(--md-on-warning-container)] opacity-85">تشغيلة: {b.batch} • انتهاء: {b.expiry}</span>
                  </div>
                  <span className="m3-badge m3-badge-warning font-bold text-[10px]">
                    متبقي {b.daysLeft} يوم
                  </span>
                </div>
              ))}
            </div>

            {/* Battery Warranties */}
            <div className="space-y-1.5 pt-1 border-t border-[var(--md-outline-variant)]">
              <span className="text-[11px] font-bold text-[var(--md-primary-text)] flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>ضمانات البطاريات السارية (فحص السيريال):</span>
              </span>
              {batteryWarranties.map((w, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-xl bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="font-bold text-[var(--md-on-surface)] font-sans">{w.name}</span>
                      <span className="m3-badge m3-badge-primary text-[9px] px-1.5 py-0">{w.serial}</span>
                    </div>
                    <span className="text-[10px] text-[var(--md-on-surface-variant)]">العميل: {w.customer}</span>
                  </div>
                  <span className="text-[var(--md-primary-text)] font-bold font-mono text-[10px] tabular-nums">
                    {w.monthsLeft} أشهر متبقية
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="pt-2 border-t border-[var(--md-outline-variant)] flex items-center justify-between gap-2">
        <button
          onClick={() => onNavigate && onNavigate('inventory')}
          className="m3-btn-outlined flex-1 text-xs"
        >
          <span>إدارة الـ 4 مستودعات والجرد</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-[var(--md-primary-text)]" />
        </button>

        <button
          onClick={() => onNavigate && onNavigate('real_business')}
          className="m3-btn-tonal text-xs"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>فحص الضمان</span>
        </button>
      </div>
    </div>
  );
};
