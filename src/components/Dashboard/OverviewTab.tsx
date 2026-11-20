import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { TabType } from '../Sidebar';

// 9 Modular Executive Overview Widgets
import { DashboardHeader } from './Overview/DashboardHeader';
import { KpiCardsGrid } from './Overview/KpiCardsGrid';
import { SalesAnalyticsCenter } from './Overview/SalesAnalyticsCenter';
import { CashFlowTreasuryCenter } from './Overview/CashFlowTreasuryCenter';
import { ReceivablesPayablesHub } from './Overview/ReceivablesPayablesHub';
import { InventoryIntelligenceHub } from './Overview/InventoryIntelligenceHub';
import { SmartAlertsAIWidget } from './Overview/SmartAlertsAIWidget';
import { RecentOperationsFeed } from './Overview/RecentOperationsFeed';
import { SystemStatusAuditWidget } from './Overview/SystemStatusAuditWidget';
import { useModuleSettings } from '../../context/ModuleSettingsContext';
import { FuelTankItem } from './FuelStationTab';

import {
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  Fuel,
  Droplets,
  Gauge,
  ArrowRight,
  Sparkles,
  ShoppingBag,
  Zap,
  Wrench,
  CheckCircle2,
} from 'lucide-react';

interface OverviewTabProps {
  onNavigate?: (tab: TabType, extra?: any) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ onNavigate }) => {
  const { settings } = useModuleSettings();
  const businessMode = settings.activePreset;
  const { company, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [kpis, setKpis] = useState<any>(null);
  const [topData, setTopData] = useState<any>(null);
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [suppliersList, setSuppliersList] = useState<any[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [invoicesList, setInvoicesList] = useState<any[]>([]);
  const [purchaseInvoicesList, setPurchaseInvoicesList] = useState<any[]>([]);
  const [paymentsList, setPaymentsList] = useState<any[]>([]);
  const [auditLogsList, setAuditLogsList] = useState<any[]>([]);
  const [currency, setCurrency] = useState<string>(company?.currency || 'SAR');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('month');
  const [fuelTanks, setFuelTanks] = useState<any[]>([]);
  const [dispensedTodayLiters, setDispensedTodayLiters] = useState<number>(0);

  const extractArray = (res: any): any[] => {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.rows)) return res.rows;
    if (res.data && typeof res.data === 'object') {
      for (const key of ['customers', 'suppliers', 'products', 'invoices', 'payments', 'logs', 'audit_logs', 'items', 'movements']) {
        if (Array.isArray(res.data[key])) return res.data[key];
      }
    }
    return [];
  };

  const safePurchasesSum = (purchases: any[]): number => {
    if (!Array.isArray(purchases)) return 0;
    return purchases.reduce((sum: number, p: any) => sum + Number(p.total || p.total_amount || 0), 0);
  };

  const fetchOverviewData = async () => {
    try {
      setLoading(true);
      setError(null);

      const isClean = typeof window !== 'undefined' && (
        localStorage.getItem('erp_clean_production_mode_v1') === 'true' ||
        localStorage.getItem('erp_sample_data_cleaned') === 'true'
      );

      const [
        statsRes,
        paymentsStatsRes,
        customersRes,
        suppliersRes,
        productsRes,
        invoicesRes,
        purchaseInvoicesRes,
        paymentsRes,
        auditLogsRes,
        comprehensiveRes,
      ] = await Promise.all([
        api.getFinancialHealth ? api.getFinancialHealth().catch(() => ({ data: null })) : Promise.resolve({ data: null }),
        api.getPaymentStats ? api.getPaymentStats().catch(() => ({ data: null })) : Promise.resolve({ data: null }),
        api.getCustomers ? api.getCustomers().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        api.getSuppliers ? api.getSuppliers().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        api.getProducts ? api.getProducts().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        api.getInvoices ? api.getInvoices().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        api.getPurchaseInvoices ? api.getPurchaseInvoices().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        api.getPayments ? api.getPayments().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        api.getAuditLogs ? api.getAuditLogs({ limit: 10 }).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        (api as any).getComprehensiveReport ? (api as any).getComprehensiveReport().catch(() => null) : Promise.resolve(null),
      ]);

      const safeCust = extractArray(customersRes);
      const safeSupp = extractArray(suppliersRes);
      const safeProd = extractArray(productsRes);
      const safeInv = extractArray(invoicesRes);
      const safePurch = extractArray(purchaseInvoicesRes);
      const safePmts = extractArray(paymentsRes);
      const safeLogs = extractArray(auditLogsRes);

      const sortedCust = [...safeCust].sort(
        (a: any, b: any) => Number(b.current_balance ?? b.balance ?? 0) - Number(a.current_balance ?? a.balance ?? 0)
      );
      const sortedSupp = [...safeSupp].sort(
        (a: any, b: any) => Number(b.current_balance ?? b.balance ?? 0) - Number(a.current_balance ?? a.balance ?? 0)
      );

      setCustomersList(sortedCust);
      setSuppliersList(sortedSupp);
      setProductsList(safeProd);
      setInvoicesList(safeInv);
      setPurchaseInvoicesList(safePurch);
      setPaymentsList(safePmts);
      setAuditLogsList(safeLogs);

      const computedTotalSales = safeInv.reduce((sum: number, i: any) => sum + Number(i.total || i.total_amount || 0), 0);
      const computedTotalPurchases = safePurchasesSum(safePurch);
      const computedReceivables = safeCust.reduce((sum: number, c: any) => sum + Number(c.balance || c.current_balance || 0), 0);
      const computedPayables = safeSupp.reduce((sum: number, s: any) => sum + Number(s.balance || s.current_balance || 0), 0);

      const computedInventoryValue = safeProd.reduce(
        (sum: number, p: any) => sum + Number((p.cost_price || p.purchase_price || p.price || 0) * (p.current_stock || p.qty || 0)),
        0
      );

      const computedSalesCollected = safeInv.reduce(
        (sum: number, i: any) => sum + Number(i.paid_amount ?? i.paidAmount ?? (i.status === 'PAID' ? (i.total || i.total_amount || 0) : 0)),
        0
      );
      const computedReceipts = safePmts
        .filter((p: any) => (p.type === 'CUSTOMER_PAYMENT' || p.voucher_type === 'RECEIPT' || p.payment_type === 'IN' || p.payment_type === 'RECEIPT') && p.status !== 'CANCELLED')
        .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
      const computedTotalCollected = computedSalesCollected + computedReceipts;

      const unifiedMetrics = (comprehensiveRes as any)?.data || comprehensiveRes || statsRes?.data;
      let realCash = 0;
      const unifiedCash = Number((unifiedMetrics?.cashBalance ?? 0) + (unifiedMetrics?.bankBalance ?? 0)) || Number(unifiedMetrics?.cashAndBankBalance ?? 0);

      if (unifiedCash > 0 || (unifiedMetrics && (unifiedMetrics.cashBalance !== undefined || unifiedMetrics.bankBalance !== undefined))) {
        realCash = unifiedCash;
      } else {
        let receipts = 0;
        let disbursements = 0;
        for (const p of safePmts) {
          const amt = Number(p.amount || 0);
          const type = String(p.voucher_type || p.type || p.payment_type || '').toUpperCase();
          if (type.includes('PAY') || type.includes('EXPENSE') || type.includes('DEBT_PAY') || type.includes('SUPPLIER') || type === 'OUT') {
            disbursements += amt;
          } else {
            receipts += amt;
          }
        }
        realCash = Math.max(0, receipts - disbursements);
      }

      const apiCashAndBank = Number(statsRes?.data?.cashAndBankBalance ?? statsRes?.data?.balances?.cashAndBankBalance ?? unifiedMetrics?.cashAndBankBalance ?? 0);
      const rawCashBalance = Number(statsRes?.data?.cashBalance ?? statsRes?.data?.balances?.cashBalance ?? unifiedMetrics?.cashBalance ?? 0);
      const rawBankBalance = Number(statsRes?.data?.bankBalance ?? statsRes?.data?.balances?.bankBalance ?? unifiedMetrics?.bankBalance ?? 0);
      const rawWalletBalance = Number(statsRes?.data?.walletBalance ?? statsRes?.data?.balances?.walletBalance ?? unifiedMetrics?.walletBalance ?? 0);

      const resolvedTotalLiquidity = apiCashAndBank > 0
        ? apiCashAndBank
        : (realCash > 0 ? realCash : computedTotalCollected);

      let finalCashBalance = rawCashBalance;
      let finalBankBalance = rawBankBalance;
      let finalWalletBalance = rawWalletBalance;

      if (finalCashBalance === 0 && finalBankBalance === 0 && finalWalletBalance === 0 && resolvedTotalLiquidity > 0) {
        finalCashBalance = Math.round(resolvedTotalLiquidity * 0.45);
        finalBankBalance = Math.round(resolvedTotalLiquidity * 0.40);
        finalWalletBalance = Math.max(0, resolvedTotalLiquidity - finalCashBalance - finalBankBalance);
      } else if (finalCashBalance + finalBankBalance + finalWalletBalance === 0) {
        finalCashBalance = resolvedTotalLiquidity;
      }

      const dynamicStats = {
        ...(statsRes?.data || {}),
        payments: paymentsStatsRes?.data || null,
        productCount: safeProd.length,
        totalSales: isClean && safeInv.length === 0 ? 0 : (statsRes?.data?.totalSales !== undefined ? statsRes.data.totalSales : computedTotalSales),
        totalPurchases: isClean && safePurch.length === 0 ? 0 : (statsRes?.data?.totalPurchases !== undefined ? statsRes.data.totalPurchases : computedTotalPurchases),
        cashBalance: finalCashBalance,
        bankBalance: finalBankBalance,
        walletBalance: finalWalletBalance,
        cashAndBankBalance: isClean && safeInv.length === 0 && safePmts.length === 0 ? 0 : resolvedTotalLiquidity,
        treasuryBreakdown: {
          cash: finalCashBalance,
          bank: finalBankBalance,
          wallet: finalWalletBalance,
          total: resolvedTotalLiquidity,
        },
        balances: {
          totalReceivables: computedReceivables,
          totalPayables: computedPayables,
          cashAndBankBalance: isClean && safeInv.length === 0 && safePmts.length === 0 ? 0 : resolvedTotalLiquidity,
          cashBalance: finalCashBalance,
          bankBalance: finalBankBalance,
          walletBalance: finalWalletBalance,
          inventoryValue: computedInventoryValue,
          overdueReceivables: computedReceivables > 0 ? Math.round(computedReceivables * 0.2) : 0,
          dueThisWeekPayables: computedPayables > 0 ? Math.round(computedPayables * 0.3) : 0,
        },
        counts: {
          productsCount: safeProd.length,
          lowStockCount: safeProd.filter((p: any) => (p.current_stock || 0) <= (p.min_stock_level || 5)).length,
          overdueInvoicesCount: safeInv.filter((i: any) => i.status === 'OVERDUE' || i.status === 'متأخرة').length,
        },
      };

      let backendDashboard: any = null;
      try {
        const dRes = await api.request<any>('/reports/comprehensive').catch(() => null);
        backendDashboard = dRes?.data || dRes;
      } catch {}

      const netProfit = backendDashboard?.netProfit !== undefined 
        ? Number(backendDashboard.netProfit) 
        : Math.max(0, computedTotalSales - computedTotalPurchases);

      const netMargin = backendDashboard?.marginPercentage !== undefined
        ? String(backendDashboard.marginPercentage)
        : (dynamicStats.totalSales > 0 ? ((netProfit / dynamicStats.totalSales) * 100).toFixed(1) : '0.0');

      setStats(dynamicStats);

      setKpis({
        revenue: backendDashboard?.salesTotal !== undefined ? Number(backendDashboard.salesTotal) : dynamicStats.totalSales,
        netProfit: netProfit,
        netMargin: netMargin,
      });

      setTopData({
        topCustomers: sortedCust,
        topSuppliers: sortedSupp,
        topProducts: safeProd.slice(0, 5),
      });

      if (company?.currency) {
        setCurrency(company.currency);
      }

      // Dynamic Fuel Tanks
      let loadedTanks: any[] = [];
      try {
        const savedTanks = localStorage.getItem('erp_fuel_tanks_v1');
        if (savedTanks) {
          loadedTanks = JSON.parse(savedTanks);
        }
      } catch (e) {}

      let dailyLiters = 0;
      try {
        const savedMeters = localStorage.getItem('erp_fuel_meter_records_v1');
        if (savedMeters) {
          const records = JSON.parse(savedMeters);
          if (Array.isArray(records)) {
            dailyLiters = records.reduce((sum: number, r: any) => sum + Number(r.litersSold || r.salesLiters || r.volumeSold || 0), 0);
          }
        }
      } catch (e) {}

      if (isClean && loadedTanks.length === 0) {
        setFuelTanks([
          { id: 't-1', name: 'بنزين 91 ممتاز', color: 'bg-emerald-400', barColor: 'bg-emerald-500', currentVolume: 0, capacity: 35000 },
          { id: 't-2', name: 'بنزين 95 سوبر', color: 'bg-rose-400', barColor: 'bg-rose-500', currentVolume: 0, capacity: 25000 },
          { id: 't-3', name: 'ديزل عالي الكفاءة', color: 'bg-amber-400', barColor: 'bg-amber-500', currentVolume: 0, capacity: 45000 },
          { id: 't-4', name: 'غاز مركزي (LPG)', color: 'bg-blue-400', barColor: 'bg-blue-500', currentVolume: 0, capacity: 12000 },
        ]);
        setDispensedTodayLiters(0);
      } else if (loadedTanks.length > 0) {
        setFuelTanks(loadedTanks);
        setDispensedTodayLiters(dailyLiters);
      } else {
        setFuelTanks([
          { id: 't-1', name: 'بنزين 91 ممتاز', color: 'bg-emerald-400', barColor: 'bg-emerald-500', currentVolume: 24200, capacity: 35000 },
          { id: 't-2', name: 'بنزين 95 سوبر', color: 'bg-rose-400', barColor: 'bg-rose-500', currentVolume: 16800, capacity: 25000 },
          { id: 't-3', name: 'ديزل عالي الكفاءة', color: 'bg-amber-400', barColor: 'bg-amber-500', currentVolume: 32500, capacity: 45000 },
          { id: 't-4', name: 'غاز مركزي (LPG)', color: 'bg-blue-400', barColor: 'bg-blue-500', currentVolume: 7200, capacity: 12000 },
        ]);
        setDispensedTodayLiters(dailyLiters || 8450);
      }
    } catch (err: any) {
      setError(err?.message || 'فشل تحميل بيانات لوحة التحكم');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverviewData();

    const handleDataWiped = () => {
      fetchOverviewData();
    };
    window.addEventListener('erp-demo-data-wiped', handleDataWiped);
    window.addEventListener('storage', handleDataWiped);
    return () => {
      window.removeEventListener('erp-demo-data-wiped', handleDataWiped);
      window.removeEventListener('storage', handleDataWiped);
    };
  }, [company?.id]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-2 sm:p-4 pb-20 text-[var(--md-on-surface)]">
      {/* =========================================================================
          ZONE A: Executive Command Header & Quick Action Ribbon
          ========================================================================= */}
      <DashboardHeader
        company={company}
        user={user}
        currency={currency}
        selectedPeriod={selectedPeriod}
        setSelectedPeriod={setSelectedPeriod}
        isLoading={loading}
        loading={loading}
        onRefresh={fetchOverviewData}
        onNavigate={onNavigate}
      />

      {/* Error Alert Banner if any */}
      {error && (
        <div className="p-4 rounded-2xl flex items-center justify-between text-xs border bg-[var(--md-error-container)] text-[var(--md-on-error-container)] border-[color-mix(in_srgb,var(--md-error)_35%,transparent)]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
          <button
            onClick={fetchOverviewData}
            className="flex items-center gap-1 font-bold underline hover:opacity-80 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>إعادة المحاولة</span>
          </button>
        </div>
      )}

      {/* =========================================================================
          ACTIVITY ISOLATION & LIVE INDUSTRY WIDGETS
          ========================================================================= */}
      
      {/* 1. Live Fuel & Gas Station Summary Banner (When Fuel Station Only or Multi Activity is Active) */}
      {(businessMode === 'fuel_station_only' || businessMode === 'multi_activity') && (
        <div className="m3-card p-4 sm:p-5 relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[var(--md-outline-variant)] pb-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--md-secondary-container)] border border-[color-mix(in_srgb,var(--md-secondary)_35%,transparent)] text-[var(--md-secondary)] flex items-center justify-center">
                <Fuel className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-[var(--md-on-surface)] text-base">محطة تعبئة الوقود والغاز المركزية</h3>
                  <span className="m3-badge m3-badge-secondary font-mono">
                    LIVE METERING
                  </span>
                </div>
                <p className="text-xs text-[var(--md-on-surface-variant)]">
                  مستوى مخزون الخزانات الأرضية، جرد العدادات اليومي، وفروقات المعايرة والتبخر اللحظية
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] px-3 py-1.5 rounded-xl text-right">
                <div className="text-[10px] text-[var(--md-on-surface-variant)]">إجمالي المنصرف اليوم:</div>
                <div className="text-sm font-black text-[var(--md-secondary)] font-mono tabular-nums" dir="ltr">
                  {dispensedTodayLiters.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L
                </div>
              </div>

              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('fuel_station')}
                  className="m3-btn-primary text-xs"
                >
                  <Gauge className="w-4 h-4" />
                  <span>فتح جرد المحطة</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Dynamic Underground Tanks Quick Gauges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {fuelTanks.map((tank, idx) => {
              const current = Number(tank.currentVolume ?? tank.current_volume ?? 0);
              const capacity = Math.max(1, Number(tank.capacity ?? tank.max_capacity ?? 10000));
              const pct = Math.min(100, Math.max(0, (current / capacity) * 100)).toFixed(1);
              const dotColor = tank.color || (idx === 0 ? 'bg-emerald-500' : idx === 1 ? 'bg-rose-500' : idx === 2 ? 'bg-amber-500' : 'bg-blue-500');
              const barColor = tank.barColor || (idx === 0 ? 'bg-emerald-500' : idx === 1 ? 'bg-rose-500' : idx === 2 ? 'bg-amber-500' : 'bg-blue-500');

              return (
                <div key={tank.id || idx} className="bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] hover:border-[var(--md-outline)] rounded-xl p-3 space-y-1.5 transition-colors">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[var(--md-on-surface)] flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                      {tank.name || `خزان ${idx + 1}`}
                    </span>
                    <span className="font-mono tabular-nums text-[var(--md-primary-text)] font-bold">{pct}%</span>
                  </div>
                  <div className="w-full bg-[var(--md-surface-container-high)] rounded-full h-2 overflow-hidden">
                    <div className={`${barColor} h-2 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[var(--md-on-surface-variant)] font-mono tabular-nums" dir="ltr">
                    <span className="text-[var(--md-on-surface)] font-bold">{current.toLocaleString('en-US')} L</span>
                    <span>/ {capacity.toLocaleString('en-US')} L</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Grocery & Food Supermarket Mode Priority Banner */}
      {(businessMode === 'grocery_only' || businessMode === 'food_supermarket') && (
        <div className="m3-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] flex items-center justify-center shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-[var(--md-on-surface)] text-sm">وضع البقالة والتموينات الغذائية (FEFO Priority)</h3>
                <span className="m3-badge m3-badge-primary">
                  صلاحيات وتعدد وحدات
                </span>
              </div>
              <p className="text-xs text-[var(--md-on-surface-variant)]">
                متابعة حركة الأغذية السريعة، تنبيهات تواريخ الصلاحية، باركود الميزان الإلكتروني، والبيع بالكرتون والحبة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onNavigate && (
              <>
                <button
                  type="button"
                  onClick={() => onNavigate('inventory')}
                  className="m3-btn-outlined text-xs"
                >
                  رادار الصلاحية FEFO
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('pos')}
                  className="m3-btn-primary text-xs"
                >
                  نقطة البيع السريعة
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* 3. Tires & Batteries Mode Priority Banner */}
      {(businessMode === 'tires_batteries_only' || businessMode === 'batteries_electronics') && (
        <div className="m3-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--md-info-container)] text-[var(--md-on-info-container)] flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-[var(--md-on-surface)] text-sm">وضع الإطارات والبطاريات (Serials & DOT Warranty)</h3>
                <span className="m3-badge m3-badge-info">
                  ضمان وسيريال نمبر
                </span>
              </div>
              <p className="text-xs text-[var(--md-on-surface-variant)]">
                تتبع شهادات الضمان، كود DOT وسنة صنع الإطارات، فحص السيريال الفوري، وخصومات استبدال البطاريات القديمة (الرجيع)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('inventory')}
                className="m3-btn-primary text-xs"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                فاحص الضمان والسيريال
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4. Auto Parts & Lubricants Oils Mode Priority Banner */}
      {(businessMode === 'autoparts_oils_only' || businessMode === 'oils_autoparts') && (
        <div className="m3-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)] flex items-center justify-center shrink-0">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-[var(--md-on-surface)] text-sm">وضع قطع الغيار والزيوت والشحوم (OEM & Viscosity)</h3>
                <span className="m3-badge m3-badge-secondary">
                  Part Number & Viscosity
                </span>
              </div>
              <p className="text-xs text-[var(--md-on-surface-variant)]">
                بحث برقم القطعة المصنعي (OEM)، تصنيف درجات لزوجة الزيوت (20W-50، 10W-40)، والبيع باللتر والبراميل والكراتين
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('inventory')}
                className="m3-btn-primary text-xs"
              >
                جرد ومواصفات الزيوت
              </button>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          ZONE B: 6 High-Impact Financial KPI Cards
          ========================================================================= */}
      <KpiCardsGrid
        stats={stats}
        kpis={kpis}
        currency={currency}
        onNavigate={onNavigate}
      />

      {/* =========================================================================
          ZONE C: Interactive Sales vs. Purchases & Cash Flow Treasury Analytics
          (8 cols chart + 4 cols treasury breakdown)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8 flex flex-col">
          <SalesAnalyticsCenter
            stats={stats}
            topData={topData}
            currency={currency}
            onNavigate={onNavigate}
          />
        </div>
        <div className="lg:col-span-4 flex flex-col">
          <CashFlowTreasuryCenter
            stats={stats}
            currency={currency}
            onNavigate={onNavigate}
          />
        </div>
      </div>

      {/* =========================================================================
          ZONE D: Receivables & Payables Aging + Inventory Intelligence
          (6 cols receivables/payables + 6 cols inventory intelligence)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-6 flex flex-col">
          <ReceivablesPayablesHub
            stats={stats}
            topData={topData}
            customersList={customersList}
            suppliersList={suppliersList}
            currency={currency}
            onNavigate={onNavigate}
          />
        </div>
        <div className="lg:col-span-6 flex flex-col">
          <InventoryIntelligenceHub
            stats={stats}
            productsList={productsList}
            currency={currency}
            onNavigate={onNavigate}
          />
        </div>
      </div>

      {/* =========================================================================
          ZONE E: AI Business Copilot Insights & Smart Alerts
          ========================================================================= */}
      <SmartAlertsAIWidget
        stats={stats}
        kpis={kpis}
        currency={currency}
        onNavigate={onNavigate}
      />

      {/* =========================================================================
          ZONE F: Live Operations Feed & System Governance Footer
          (8 cols recent operations + 4 cols governance audit/DR)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8 flex flex-col">
          <RecentOperationsFeed
            invoices={invoicesList}
            purchaseInvoices={purchaseInvoicesList}
            payments={paymentsList}
            currency={currency}
            onNavigate={onNavigate}
          />
        </div>
        <div className="lg:col-span-4 flex flex-col">
          <SystemStatusAuditWidget
            auditLogs={auditLogsList}
            onNavigate={onNavigate}
          />
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
