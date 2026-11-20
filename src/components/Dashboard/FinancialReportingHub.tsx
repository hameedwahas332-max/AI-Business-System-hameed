import React, { useState, useEffect, useMemo } from 'react';
import { ReportsTab } from './ReportsTab';
import { CashFlowForecastTab } from './CashFlowForecastTab';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  DollarSign,
  Calendar,
  FileSpreadsheet,
  Coins,
  ShieldCheck,
  Scale,
  Wallet,
  Receipt,
  PieChart,
  ArrowUpRight,
  ArrowDownLeft,
  Building2,
  CheckCircle2,
  RefreshCw,
  Printer,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { DailyExchangeRateModal } from '../Common/DailyExchangeRateModal';
import { getActiveCurrencySymbol, formatNumber, formatAmount } from '../../lib/formatters';
import { api } from '../../api';

export const FinancialReportingHub: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'overview' | 'reports' | 'forecast'>('overview');
  const [isRatesOpen, setIsRatesOpen] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  const [backendMetrics, setBackendMetrics] = useState<any>(null);

  const currSym = getActiveCurrencySymbol();

  // Reload handler for demo wiped or inventory updated and fetch backend unified metrics
  useEffect(() => {
    const handleUpdate = () => {
      setDataVersion((v) => v + 1);
    };

    const fetchMetrics = async () => {
      try {
        const res = await api.request<any>('/reports/comprehensive').catch(() => null);
        const data = res?.data || res;
        if (data) {
          setBackendMetrics(data);
        }
      } catch (err) {
        console.warn('Backend metrics fetch note:', err);
      }
    };

    fetchMetrics();

    window.addEventListener('erp-demo-data-wiped', handleUpdate);
    window.addEventListener('erp-inventory-updated', handleUpdate);
    window.addEventListener('erp-data-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('erp-demo-data-wiped', handleUpdate);
      window.removeEventListener('erp-inventory-updated', handleUpdate);
      window.removeEventListener('erp-data-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [dataVersion]);

  // Compute live financial metrics from backend unified metrics or fallback to local stores
  const financialData = useMemo(() => {
    const isClean = localStorage.getItem('erp_clean_production_mode_v1') === 'true';

    if (backendMetrics) {
      const salesRevenue = Number(backendMetrics.salesTotal ?? backendMetrics.revenue ?? 0);
      const cogs = Number(backendMetrics.cogsTotal ?? backendMetrics.cogs ?? 0);
      const grossProfit = Number(backendMetrics.grossProfit ?? Math.max(0, salesRevenue - cogs));
      const operatingExpenses = Number(backendMetrics.operatingExpenses ?? 0);
      const netIncome = Number(backendMetrics.netProfit ?? backendMetrics.netIncome ?? (grossProfit - operatingExpenses));
      const grossMargin = salesRevenue > 0 ? Number(((grossProfit / salesRevenue) * 100).toFixed(1)) : 0;
      const netMargin = salesRevenue > 0 ? Number(((netIncome / salesRevenue) * 100).toFixed(1)) : 0;
      const accountsReceivable = Number(backendMetrics.receivables ?? 0);
      const accountsPayable = Number(backendMetrics.payables ?? 0);
      const inventoryValuation = Number(backendMetrics.inventoryValuation ?? 0);
      const cashAndBank = Number(backendMetrics.cashBalance ?? 0);
      const vatPayable = Number(backendMetrics.vatPayable ?? 0);
      const totalCurrentAssets = cashAndBank + accountsReceivable + inventoryValuation;
      const totalCurrentLiabilities = accountsPayable + vatPayable;
      const workingCapital = totalCurrentAssets - totalCurrentLiabilities;
      const currentRatio = totalCurrentLiabilities > 0 ? Number((totalCurrentAssets / totalCurrentLiabilities).toFixed(2)) : (totalCurrentAssets > 0 ? 99 : 1);

      return {
        isClean,
        hasData: salesRevenue > 0 || accountsReceivable > 0 || accountsPayable > 0 || inventoryValuation > 0,
        salesRevenue,
        cogs,
        grossProfit,
        grossMargin,
        operatingExpenses,
        salaries: 0,
        netIncome,
        netMargin,
        cashAndBank,
        accountsReceivable,
        inventoryValuation,
        totalCurrentAssets,
        accountsPayable,
        vatPayable,
        totalCurrentLiabilities,
        workingCapital,
        cashInflow: cashAndBank,
        cashOutflow: operatingExpenses,
        netCashFlow: cashAndBank - operatingExpenses,
        currentRatio,
        vatOutput: vatPayable,
        vatInput: 0,
        netVat: vatPayable,
        zakatBase: Math.max(0, workingCapital),
        zakatDue: Math.max(0, Math.round(workingCapital * 0.025)),
      };
    }

    let invoices: any[] = [];
    let purchases: any[] = [];
    let payments: any[] = [];
    let expenses: any[] = [];
    let products: any[] = [];
    let posSales: any[] = [];
    let customers: any[] = [];
    let suppliers: any[] = [];

    try {
      invoices = JSON.parse(localStorage.getItem('erp_invoices_v1') || '[]');
      purchases = JSON.parse(localStorage.getItem('erp_purchase_invoices_v1') || '[]');
      payments = JSON.parse(localStorage.getItem('erp_payments_v1') || '[]');
      expenses = JSON.parse(localStorage.getItem('erp_employees_expenses_v1') || '[]');
      products = JSON.parse(localStorage.getItem('erp_products_v1') || '[]');
      posSales = JSON.parse(localStorage.getItem('erp_pos_sales_log_v1') || '[]');
      customers = JSON.parse(localStorage.getItem('erp_customers_v1') || '[]');
      suppliers = JSON.parse(localStorage.getItem('erp_suppliers_v1') || '[]');
    } catch (e) {
      console.warn('Error reading financial storage in FinancialReportingHub:', e);
    }

    if (isClean && invoices.length === 0 && purchases.length === 0 && payments.length === 0) {
      return {
        isClean: true,
        hasData: false,
        salesRevenue: 0,
        cogs: 0,
        grossProfit: 0,
        grossMargin: 0,
        operatingExpenses: 0,
        salaries: 0,
        netIncome: 0,
        netMargin: 0,
        cashAndBank: 0,
        accountsReceivable: 0,
        inventoryValuation: 0,
        totalCurrentAssets: 0,
        accountsPayable: 0,
        vatPayable: 0,
        totalCurrentLiabilities: 0,
        workingCapital: 0,
        cashInflow: 0,
        cashOutflow: 0,
        netCashFlow: 0,
        currentRatio: 0,
        vatOutput: 0,
        vatInput: 0,
        netVat: 0,
        zakatBase: 0,
        zakatDue: 0,
      };
    }

    // 1. Sales Revenue
    const invoiceSales = invoices.reduce((sum, inv) => sum + Number(inv.total || inv.grand_total || inv.grandTotal || 0), 0);
    const posSalesTotal = posSales.reduce((sum, log) => sum + Number(log.total || log.paidAmount || 0), 0);
    const salesRevenue = invoiceSales + posSalesTotal;

    // 2. Cost of Goods Sold (COGS)
    // Calculated based on products cost in sold items or purchase invoices
    let calculatedCogs = 0;
    invoices.forEach((inv) => {
      const items = Array.isArray(inv.items) ? inv.items : [];
      items.forEach((item: any) => {
        const prod = products.find((p) => p.id === item.productId || p.id === item.product_id);
        const unitCost = Number(prod?.costPrice || prod?.cost_price || prod?.purchasePrice || item.costPrice || 0);
        calculatedCogs += unitCost * Number(item.quantity || 1);
      });
    });

    const purchasesTotal = purchases.reduce((sum, p) => sum + Number(p.total || p.grand_total || p.netTotal || 0), 0);
    const cogs = calculatedCogs > 0 ? calculatedCogs : purchasesTotal * 0.75;
    const grossProfit = Math.max(0, salesRevenue - cogs);
    const grossMargin = salesRevenue > 0 ? (grossProfit / salesRevenue) * 100 : 0;

    // 3. Operating Expenses & Salaries
    const generalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
    const paymentExpenses = payments
      .filter((pay) => pay.type === 'EXPENSE' || pay.payment_type === 'EXPENSE')
      .reduce((sum, pay) => sum + Number(pay.amount || 0), 0);

    const operatingExpenses = generalExpenses + paymentExpenses;
    const netIncome = grossProfit - operatingExpenses;
    const netMargin = salesRevenue > 0 ? (netIncome / salesRevenue) * 100 : 0;

    // 4. Balance Sheet Assets
    const customerPayments = payments
      .filter((p) => p.type === 'CUSTOMER_PAYMENT' || p.type === 'RECEIPT')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const supplierPayments = payments
      .filter((p) => p.type === 'SUPPLIER_PAYMENT' || p.type === 'EXPENSE')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const cashAndBank = Math.max(0, customerPayments - supplierPayments);

    // Accounts Receivable
    const accountsReceivable = invoices.reduce((sum, inv) => {
      const tot = Number(inv.total || inv.grand_total || 0);
      const pd = Number(inv.paid_amount || inv.paidAmount || 0);
      return sum + Math.max(0, tot - pd);
    }, 0);

    // Inventory Asset Valuation
    const inventoryValuation = products.reduce((sum, p) => {
      const stock = Number(p.current_stock ?? p.stock ?? p.quantity ?? 0);
      const cost = Number(p.costPrice || p.cost_price || p.purchasePrice || p.selling_price || 0);
      return sum + Math.max(0, stock * cost);
    }, 0);

    const totalCurrentAssets = cashAndBank + accountsReceivable + inventoryValuation;

    // 5. Balance Sheet Liabilities
    const accountsPayable = purchases.reduce((sum, p) => {
      const tot = Number(p.total || p.grand_total || 0);
      const pd = Number(p.paid_amount || p.paidAmount || 0);
      return sum + Math.max(0, tot - pd);
    }, 0);

    const vatOutput = salesRevenue * 0.15;
    const vatInput = purchasesTotal * 0.15;
    const netVat = Math.max(0, vatOutput - vatInput);
    const totalCurrentLiabilities = accountsPayable + netVat;

    const workingCapital = totalCurrentAssets - totalCurrentLiabilities;
    const currentRatio = totalCurrentLiabilities > 0 ? totalCurrentAssets / totalCurrentLiabilities : totalCurrentAssets > 0 ? 1 : 0;

    // 6. Cash Flow
    const cashInflow = customerPayments + (posSalesTotal > 0 ? posSalesTotal : 0);
    const cashOutflow = supplierPayments + operatingExpenses;
    const netCashFlow = cashInflow - cashOutflow;

    // 7. Zakat Estimation
    const zakatBase = Math.max(0, workingCapital + (netIncome > 0 ? netIncome : 0));
    const zakatDue = zakatBase * 0.025;

    const hasData = salesRevenue > 0 || purchasesTotal > 0 || inventoryValuation > 0 || operatingExpenses > 0;

    return {
      isClean,
      hasData,
      salesRevenue,
      cogs,
      grossProfit,
      grossMargin,
      operatingExpenses,
      salaries: generalExpenses * 0.6,
      netIncome,
      netMargin,
      cashAndBank,
      accountsReceivable,
      inventoryValuation,
      totalCurrentAssets,
      accountsPayable,
      vatPayable: netVat,
      totalCurrentLiabilities,
      workingCapital,
      cashInflow,
      cashOutflow,
      netCashFlow,
      currentRatio,
      vatOutput,
      vatInput,
      netVat,
      zakatBase,
      zakatDue,
    };
  }, [dataVersion, backendMetrics]);

  const handlePrintOverview = () => {
    window.print();
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Top Header Bar */}
      <div className="m3-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--md-on-surface)] flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-[var(--md-primary-text)]" />
            مركز التقارير والذكاء المالي (Financial Intelligence Hub)
          </h2>
          <p className="text-sm text-[var(--md-on-surface-variant)] mt-1">
            القوائم المالية الختامية، قائمة الدخل والميزانية، التحليل المالي، ومعدلات الأداء بالعملة النشطة ({currSym}).
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsRatesOpen(true)}
            className="m3-btn-tonal !min-h-[38px] text-xs"
            title="إدارة وتعديل أسعار الصرف اليومية"
          >
            <Coins className="w-4 h-4 text-[var(--md-secondary)]" />
            <span>نشرة أسعار الصرف اليومية</span>
          </button>

          {activeSection === 'overview' && (
            <button
              type="button"
              onClick={handlePrintOverview}
              className="m3-btn-outlined !min-h-[38px] text-xs"
              title="طباعة المركز المالي والقوائم"
            >
              <Printer className="w-4 h-4 text-[var(--md-primary-text)]" />
              <span>طباعة القوائم</span>
            </button>
          )}

          <div className="flex flex-wrap bg-[var(--md-surface-container)] p-1 rounded-xl border border-[var(--md-outline-variant)] gap-1">
            <button
              onClick={() => setActiveSection('overview')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeSection === 'overview'
                  ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border border-[var(--md-primary)]/35 font-bold shadow-sm'
                  : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-high)] border border-transparent'
              }`}
            >
              <PieChart className="w-4 h-4" />
              المركز والقوائم المالية
            </button>
            <button
              onClick={() => setActiveSection('reports')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeSection === 'reports'
                  ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border border-[var(--md-primary)]/35 font-bold shadow-sm'
                  : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-high)] border border-transparent'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              التقارير المحاسبية
            </button>
            <button
              onClick={() => setActiveSection('forecast')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeSection === 'forecast'
                  ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border border-[var(--md-primary)]/35 font-bold shadow-sm'
                  : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-high)] border border-transparent'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              توقعات التدفقات النقدية
            </button>
          </div>
        </div>
      </div>

      <DailyExchangeRateModal isOpen={isRatesOpen} onClose={() => setIsRatesOpen(false)} />

      {activeSection === 'overview' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Status banner for Clean Mode */}
          {financialData.isClean && !financialData.hasData && (
            <div className="p-4 bg-[var(--md-info-container)] border border-[var(--md-info)]/35 text-[var(--md-on-info-container)] rounded-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-[var(--md-info)] shrink-0" />
                <div>
                  <h4 className="text-sm font-bold">وضع الإنتاج النظيف نشط (Clean Production Mode)</h4>
                  <p className="text-xs opacity-85 mt-0.5">
                    جميع الحسابات والقوائم الختامية مصفّرة وجاهزة لاحتساب عملياتك التجارية الفعلية فور تسجيلها.
                  </p>
                </div>
              </div>
              <span className="m3-badge m3-badge-info font-mono font-bold tabular-nums">
                0.00 {currSym}
              </span>
            </div>
          )}

          {/* Top 4 Financial KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="m3-card p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[var(--md-on-surface-variant)] text-xs font-semibold">
                <span>إجمالي الإيرادات (المبيعات)</span>
                <div className="w-8 h-8 rounded-lg bg-[var(--md-success-container)] text-[var(--md-on-success-container)] border border-[var(--md-success)]/25 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-[var(--md-on-surface)] font-mono tabular-nums">
                  {formatNumber(financialData.salesRevenue)}{' '}
                  <span className="text-xs font-bold text-[var(--md-on-surface-variant)]">{currSym}</span>
                </div>
                <div className="text-xs text-[var(--md-success)] mt-1 flex items-center gap-1 font-semibold tabular-nums">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>هامش الربح: {financialData.grossMargin.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div className="m3-card p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[var(--md-on-surface-variant)] text-xs font-semibold">
                <span>صافي الدخل التشغيلي</span>
                <div
                  className={`w-8 h-8 rounded-lg border flex items-center justify-center ${
                    financialData.netIncome >= 0
                      ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border-[var(--md-primary)]/25'
                      : 'bg-[var(--md-error-container)] text-[var(--md-on-error-container)] border-[var(--md-error)]/25'
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div
                  className={`text-2xl font-black font-mono tabular-nums ${
                    financialData.netIncome >= 0 ? 'text-[var(--md-primary-text)]' : 'text-[var(--md-error)]'
                  }`}
                >
                  {formatNumber(financialData.netIncome)}{' '}
                  <span className="text-xs font-bold text-[var(--md-on-surface-variant)]">{currSym}</span>
                </div>
                <div className="text-xs text-[var(--md-on-surface-variant)] mt-1 font-medium tabular-nums">
                  بعد خصم المصاريف: {formatNumber(financialData.operatingExpenses)} {currSym}
                </div>
              </div>
            </div>

            <div className="m3-card p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[var(--md-on-surface-variant)] text-xs font-semibold">
                <span>تقييم المخزون الحالي بالتكلفة</span>
                <div className="w-8 h-8 rounded-lg bg-[var(--md-info-container)] text-[var(--md-on-info-container)] border border-[var(--md-info)]/25 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-[var(--md-on-surface)] font-mono tabular-nums">
                  {formatNumber(financialData.inventoryValuation)}{' '}
                  <span className="text-xs font-bold text-[var(--md-on-surface-variant)]">{currSym}</span>
                </div>
                <div className="text-xs text-[var(--md-on-surface-variant)] mt-1 font-medium">
                  أصل متداول جاهز للبيع والتشغيل
                </div>
              </div>
            </div>

            <div className="m3-card p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[var(--md-on-surface-variant)] text-xs font-semibold">
                <span>رأس المال العامل (Working Capital)</span>
                <div className="w-8 h-8 rounded-lg bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)] border border-[var(--md-secondary)]/25 flex items-center justify-center">
                  <Scale className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-[var(--md-secondary)] font-mono tabular-nums">
                  {formatNumber(financialData.workingCapital)}{' '}
                  <span className="text-xs font-bold text-[var(--md-on-surface-variant)]">{currSym}</span>
                </div>
                <div className="text-xs text-[var(--md-on-surface-variant)] mt-1 font-medium tabular-nums">
                  نسبة التداول: {financialData.currentRatio > 0 ? financialData.currentRatio.toFixed(2) : '1.00'}x
                </div>
              </div>
            </div>
          </div>

          {/* Dual Financial Statements Grid: Income Statement & Balance Sheet */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. قائمة الدخل والأرباح والخسائر */}
            <div className="m3-card p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--md-outline-variant)] pb-3">
                <h3 className="text-base font-bold text-[var(--md-on-surface)] flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-[var(--md-success)]" />
                  قائمة الدخل والأرباح (Income Statement)
                </h3>
                <span className="text-xs font-mono text-[var(--md-on-surface-variant)] font-semibold">{currSym}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="m3-table text-right">
                  <tbody>
                    <tr>
                      <td className="font-medium text-[var(--md-on-surface)]">
                        إجمالي إيرادات المبيعات (Sales Revenue)
                      </td>
                      <td className="text-left font-mono font-bold text-[var(--md-success)] tabular-nums whitespace-nowrap">
                        +{formatNumber(financialData.salesRevenue)} {currSym}
                      </td>
                    </tr>
                    <tr>
                      <td className="font-medium text-[var(--md-on-surface)]">
                        تكلفة البضاعة المباعة (Cost of Goods Sold - COGS)
                      </td>
                      <td className="text-left font-mono font-bold text-[var(--md-error)] tabular-nums whitespace-nowrap">
                        -{formatNumber(financialData.cogs)} {currSym}
                      </td>
                    </tr>
                    <tr className="bg-[var(--md-surface-container)] font-bold">
                      <td className="text-[var(--md-on-surface)] font-bold">إجمالي الربح (Gross Profit)</td>
                      <td className="text-left font-mono font-bold text-[var(--md-success)] tabular-nums whitespace-nowrap">
                        {formatNumber(financialData.grossProfit)} {currSym}
                      </td>
                    </tr>
                    <tr>
                      <td className="text-[var(--md-on-surface-variant)]">
                        المصروفات التشغيلية والعمومية (Operating Expenses)
                      </td>
                      <td className="text-left font-mono text-[var(--md-on-surface)] tabular-nums whitespace-nowrap">
                        -{formatNumber(financialData.operatingExpenses)} {currSym}
                      </td>
                    </tr>
                    <tr>
                      <td className="text-[var(--md-on-surface-variant)]">
                        الرواتب والأجور المقدرة (Salaries & Wages)
                      </td>
                      <td className="text-left font-mono text-[var(--md-on-surface)] tabular-nums whitespace-nowrap">
                        -{formatNumber(financialData.salaries)} {currSym}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div
                className={`flex justify-between items-center py-3 px-4 rounded-xl border font-black text-base tabular-nums ${
                  financialData.netIncome >= 0
                    ? 'bg-[var(--md-success-container)] border-[var(--md-success)]/35 text-[var(--md-on-success-container)]'
                    : 'bg-[var(--md-error-container)] border-[var(--md-error)]/35 text-[var(--md-on-error-container)]'
                }`}
              >
                <span>صافي الأرباح التشغيلية (Net Income)</span>
                <span className="font-mono">
                  {formatNumber(financialData.netIncome)} {currSym}
                </span>
              </div>
            </div>

            {/* 2. الميزانية العمومية والمركز المالي */}
            <div className="m3-card p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--md-outline-variant)] pb-3">
                <h3 className="text-base font-bold text-[var(--md-on-surface)] flex items-center gap-2">
                  <Scale className="w-5 h-5 text-[var(--md-primary-text)]" />
                  الميزانية العمومية والمركز المالي (Balance Sheet)
                </h3>
                <span className="text-xs font-mono text-[var(--md-on-surface-variant)] font-semibold">{currSym}</span>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-xs font-bold text-[var(--md-primary-text)] mb-1.5">
                    الأصول المتداولة (Current Assets):
                  </div>
                  <div className="overflow-x-auto">
                    <table className="m3-table text-right text-xs">
                      <tbody>
                        <tr>
                          <td className="!py-2 text-[var(--md-on-surface)]">
                            النقدية وما يعادلها في الصندوق والبنوك
                          </td>
                          <td className="!py-2 text-left font-mono font-bold text-[var(--md-on-surface)] tabular-nums whitespace-nowrap">
                            {formatNumber(financialData.cashAndBank)} {currSym}
                          </td>
                        </tr>
                        <tr>
                          <td className="!py-2 text-[var(--md-on-surface)]">
                            حسابات العملاء والمدينون (Accounts Receivable)
                          </td>
                          <td className="!py-2 text-left font-mono font-bold text-[var(--md-on-surface)] tabular-nums whitespace-nowrap">
                            {formatNumber(financialData.accountsReceivable)} {currSym}
                          </td>
                        </tr>
                        <tr>
                          <td className="!py-2 text-[var(--md-on-surface)]">
                            بضاعة آخر المدة بالمخازن (Inventory)
                          </td>
                          <td className="!py-2 text-left font-mono font-bold text-[var(--md-on-surface)] tabular-nums whitespace-nowrap">
                            {formatNumber(financialData.inventoryValuation)} {currSym}
                          </td>
                        </tr>
                        <tr className="bg-[var(--md-surface-container)] font-bold">
                          <td className="!py-2 text-[var(--md-primary-text)] font-bold">إجمالي الأصول المتداولة</td>
                          <td className="!py-2 text-left font-mono font-bold text-[var(--md-primary-text)] tabular-nums whitespace-nowrap">
                            {formatNumber(financialData.totalCurrentAssets)} {currSym}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold text-[var(--md-warning)] mb-1.5">
                    الالتزامات والخصوم المتداولة (Liabilities):
                  </div>
                  <div className="overflow-x-auto">
                    <table className="m3-table text-right text-xs">
                      <tbody>
                        <tr>
                          <td className="!py-2 text-[var(--md-on-surface)]">
                            ذمم الموردين والدائنون (Accounts Payable)
                          </td>
                          <td className="!py-2 text-left font-mono font-bold text-[var(--md-on-surface)] tabular-nums whitespace-nowrap">
                            {formatNumber(financialData.accountsPayable)} {currSym}
                          </td>
                        </tr>
                        <tr>
                          <td className="!py-2 text-[var(--md-on-surface)]">
                            مخصص ضريبة القيمة المضافة المستحقة
                          </td>
                          <td className="!py-2 text-left font-mono font-bold text-[var(--md-on-surface)] tabular-nums whitespace-nowrap">
                            {formatNumber(financialData.vatPayable)} {currSym}
                          </td>
                        </tr>
                        <tr className="bg-[var(--md-surface-container)] font-bold">
                          <td className="!py-2 text-[var(--md-warning)] font-bold">إجمالي الالتزامات المتداولة</td>
                          <td className="!py-2 text-left font-mono font-bold text-[var(--md-warning)] tabular-nums whitespace-nowrap">
                            {formatNumber(financialData.totalCurrentLiabilities)} {currSym}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-between items-center py-3 px-4 rounded-xl bg-[var(--md-secondary-container)] border border-[var(--md-secondary)]/35 text-[var(--md-on-secondary-container)] font-black text-base tabular-nums">
                  <span>صافي رأس المال العامل (Working Capital)</span>
                  <span className="font-mono">
                    {formatNumber(financialData.workingCapital)} {currSym}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Third Row: Tax & Zakat Cockpit + Cash Flow Statement */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Zakat & Tax Card */}
            <div className="m3-card p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--md-outline-variant)] pb-3">
                <h3 className="text-base font-bold text-[var(--md-on-surface)] flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[var(--md-success)]" />
                  الإقرار الضريبي والوعاء الزكوي (Tax & Zakat Cockpit)
                </h3>
                <span className="text-xs font-mono text-[var(--md-on-surface-variant)] font-semibold">{currSym}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] rounded-xl space-y-1">
                  <span className="text-xs text-[var(--md-on-surface-variant)]">ضريبة المخرجات (المبيعات)</span>
                  <div className="text-base font-bold text-[var(--md-success)] font-mono tabular-nums">
                    {formatNumber(financialData.vatOutput)} {currSym}
                  </div>
                </div>

                <div className="p-3.5 bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] rounded-xl space-y-1">
                  <span className="text-xs text-[var(--md-on-surface-variant)]">ضريبة المدخلات (المشتريات)</span>
                  <div className="text-base font-bold text-[var(--md-info)] font-mono tabular-nums">
                    {formatNumber(financialData.vatInput)} {currSym}
                  </div>
                </div>

                <div className="p-3.5 bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] rounded-xl space-y-1">
                  <span className="text-xs text-[var(--md-on-surface-variant)]">صافي الضريبة المستحقة</span>
                  <div className="text-base font-bold text-[var(--md-warning)] font-mono tabular-nums">
                    {formatNumber(financialData.netVat)} {currSym}
                  </div>
                </div>

                <div className="p-3.5 bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] rounded-xl space-y-1">
                  <span className="text-xs text-[var(--md-on-surface-variant)]">الزكاة الشرعية التقديرية (2.5%)</span>
                  <div className="text-base font-bold text-[var(--md-primary-text)] font-mono tabular-nums">
                    {formatNumber(financialData.zakatDue)} {currSym}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-[var(--md-surface-container-low)] rounded-xl border border-[var(--md-outline-variant)] text-xs text-[var(--md-on-surface-variant)] leading-relaxed">
                يتم احتساب الوعاء الزكوي على رأس المال العامل وصافي الأرباح السنوية وفقاً للمعايير المحاسبية المعتمدة بنسبة 2.5%.
              </div>
            </div>

            {/* Cash Flow Summary Card */}
            <div className="m3-card p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--md-outline-variant)] pb-3">
                <h3 className="text-base font-bold text-[var(--md-on-surface)] flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-[var(--md-primary-text)]" />
                  ملخص التدفقات النقدية الفعلية (Cash Flow)
                </h3>
                <span className="text-xs font-mono text-[var(--md-on-surface-variant)] font-semibold">{currSym}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="m3-table text-right">
                  <tbody>
                    <tr>
                      <td className="text-[var(--md-on-surface)]">
                        <span className="inline-flex items-center gap-2 font-medium">
                          <ArrowDownLeft className="w-4 h-4 text-[var(--md-success)]" />
                          المقبوضات النقدية المحصلة (Cash Inflow)
                        </span>
                      </td>
                      <td className="text-left font-mono font-bold text-[var(--md-success)] tabular-nums whitespace-nowrap">
                        +{formatNumber(financialData.cashInflow)} {currSym}
                      </td>
                    </tr>
                    <tr>
                      <td className="text-[var(--md-on-surface)]">
                        <span className="inline-flex items-center gap-2 font-medium">
                          <ArrowUpRight className="w-4 h-4 text-[var(--md-error)]" />
                          المدفوعات والمصاريف النقدية (Cash Outflow)
                        </span>
                      </td>
                      <td className="text-left font-mono font-bold text-[var(--md-error)] tabular-nums whitespace-nowrap">
                        -{formatNumber(financialData.cashOutflow)} {currSym}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div
                className={`flex justify-between items-center py-3 px-4 rounded-xl border font-black text-base tabular-nums ${
                  financialData.netCashFlow >= 0
                    ? 'bg-[var(--md-primary-container)] border-[var(--md-primary)]/35 text-[var(--md-on-primary-container)]'
                    : 'bg-[var(--md-error-container)] border-[var(--md-error)]/35 text-[var(--md-on-error-container)]'
                }`}
              >
                <span>صافي السيولة النقدية المتولدة</span>
                <span className="font-mono">
                  {formatNumber(financialData.netCashFlow)} {currSym}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-[var(--md-on-surface-variant)] font-semibold">حالة السيولة:</span>
                <span
                  className={`m3-badge ${
                    financialData.netCashFlow >= 0 ? 'm3-badge-success' : 'm3-badge-error'
                  }`}
                >
                  {financialData.netCashFlow >= 0 ? 'سيولة إيجابية متوازنة' : 'عجز في التدفق النقدي'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSection === 'reports' && <ReportsTab />}
      {activeSection === 'forecast' && <CashFlowForecastTab />}
    </div>
  );
};

export default FinancialReportingHub;
