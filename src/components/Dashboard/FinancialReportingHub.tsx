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

export const FinancialReportingHub: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'overview' | 'reports' | 'forecast'>('overview');
  const [isRatesOpen, setIsRatesOpen] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);

  const currSym = getActiveCurrencySymbol();

  // Reload handler for demo wiped or inventory updated
  useEffect(() => {
    const handleUpdate = () => {
      setDataVersion((v) => v + 1);
    };

    window.addEventListener('erp-demo-data-wiped', handleUpdate);
    window.addEventListener('erp-inventory-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('erp-demo-data-wiped', handleUpdate);
      window.removeEventListener('erp-inventory-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Compute live financial metrics from local system stores
  const financialData = useMemo(() => {
    const isClean = localStorage.getItem('erp_clean_production_mode_v1') === 'true';

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
  }, [dataVersion]);

  const handlePrintOverview = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-cyan-400" />
            مركز التقارير والذكاء المالي (Financial Intelligence Hub)
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            القوائم المالية الختامية، قائمة الدخل والميزانية، التحليل المالي، ومعدلات الأداء بالعملة النشطة ({currSym}).
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsRatesOpen(true)}
            className="px-3.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="إدارة وتعديل أسعار الصرف اليومية"
          >
            <Coins className="w-4 h-4 text-amber-400" />
            <span>نشرة أسعار الصرف اليومية</span>
          </button>

          {activeSection === 'overview' && (
            <button
              type="button"
              onClick={handlePrintOverview}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="طباعة المركز المالي والقوائم"
            >
              <Printer className="w-4 h-4 text-cyan-400" />
              <span>طباعة القوائم</span>
            </button>
          )}

          <div className="flex bg-slate-800/80 p-1 rounded-lg border border-slate-700">
            <button
              onClick={() => setActiveSection('overview')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                activeSection === 'overview'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <PieChart className="w-4 h-4" />
              المركز والقوائم المالية
            </button>
            <button
              onClick={() => setActiveSection('reports')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                activeSection === 'reports'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              التقارير المحاسبية
            </button>
            <button
              onClick={() => setActiveSection('forecast')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                activeSection === 'forecast'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-300 hover:text-white'
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
            <div className="p-4 bg-cyan-950/30 border border-cyan-800/40 rounded-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-cyan-200">وضع الإنتاج النظيف نشط (Clean Production Mode)</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    جميع الحسابات والقوائم الختامية مصفّرة وجاهزة لاحتساب عملياتك التجارية الفعلية فور تسجيلها.
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/20">
                0.00 {currSym}
              </span>
            </div>
          )}

          {/* Top 4 Financial KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>إجمالي الإيرادات (المبيعات)</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-white font-mono">
                  {formatNumber(financialData.salesRevenue)} <span className="text-xs font-bold text-slate-400">{currSym}</span>
                </div>
                <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1 font-semibold">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>هامش الربح: {financialData.grossMargin.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>صافي الدخل التشغيلي</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${financialData.netIncome >= 0 ? 'bg-cyan-500/10 text-cyan-400' : 'bg-rose-500/10 text-rose-400'}`}>
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className={`text-2xl font-black font-mono ${financialData.netIncome >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
                  {formatNumber(financialData.netIncome)} <span className="text-xs font-bold text-slate-400">{currSym}</span>
                </div>
                <div className="text-xs text-slate-400 mt-1 font-medium">
                  بعد خصم المصاريف: {formatNumber(financialData.operatingExpenses)} {currSym}
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>تقييم المخزون الحالي بالتكلفة</span>
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-white font-mono">
                  {formatNumber(financialData.inventoryValuation)} <span className="text-xs font-bold text-slate-400">{currSym}</span>
                </div>
                <div className="text-xs text-slate-400 mt-1 font-medium">
                  أصل متداول جاهز للبيع والتشغيل
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>رأس المال العامل (Working Capital)</span>
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <Scale className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-amber-400 font-mono">
                  {formatNumber(financialData.workingCapital)} <span className="text-xs font-bold text-slate-400">{currSym}</span>
                </div>
                <div className="text-xs text-slate-400 mt-1 font-medium">
                  نسبة التداول: {financialData.currentRatio > 0 ? financialData.currentRatio.toFixed(2) : '1.00'}x
                </div>
              </div>
            </div>
          </div>

          {/* Dual Financial Statements Grid: Income Statement & Balance Sheet */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. قائمة الدخل والأرباح والخسائر */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-400" />
                  قائمة الدخل والأرباح (Income Statement)
                </h3>
                <span className="text-xs font-mono text-slate-400 font-semibold">{currSym}</span>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-300 font-medium">إجمالي إيرادات المبيعات (Sales Revenue)</span>
                  <span className="font-mono font-bold text-emerald-400">
                    +{formatNumber(financialData.salesRevenue)} {currSym}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-300 font-medium">تكلفة البضاعة المباعة (Cost of Goods Sold - COGS)</span>
                  <span className="font-mono font-bold text-rose-400">
                    -{formatNumber(financialData.cogs)} {currSym}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 bg-slate-950/60 px-3 rounded-xl border border-slate-800 font-bold">
                  <span className="text-white">إجمالي الربح (Gross Profit)</span>
                  <span className="font-mono text-emerald-400">
                    {formatNumber(financialData.grossProfit)} {currSym}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">المصروفات التشغيلية والعمومية (Operating Expenses)</span>
                  <span className="font-mono text-slate-300">
                    -{formatNumber(financialData.operatingExpenses)} {currSym}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">الرواتب والأجور المقدرة (Salaries & Wages)</span>
                  <span className="font-mono text-slate-300">
                    -{formatNumber(financialData.salaries)} {currSym}
                  </span>
                </div>

                <div className="flex justify-between items-center py-3 bg-gradient-to-r from-emerald-950/30 to-cyan-950/30 px-3.5 rounded-xl border border-emerald-500/30 font-black text-base">
                  <span className="text-emerald-300">صافي الأرباح التشغيلية (Net Income)</span>
                  <span className="font-mono text-emerald-400">
                    {formatNumber(financialData.netIncome)} {currSym}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. الميزانية العمومية والمركز المالي */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Scale className="w-5 h-5 text-cyan-400" />
                  الميزانية العمومية والمركز المالي (Balance Sheet)
                </h3>
                <span className="text-xs font-mono text-slate-400 font-semibold">{currSym}</span>
              </div>

              <div className="space-y-3 text-sm">
                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-cyan-400">الأصول المتداولة (Current Assets):</div>
                  <div className="flex justify-between items-center py-1 text-xs border-b border-slate-800/60">
                    <span className="text-slate-300">النقدية وما يعادلها في الصندوق والبنوك</span>
                    <span className="font-mono font-bold text-slate-200">{formatNumber(financialData.cashAndBank)} {currSym}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 text-xs border-b border-slate-800/60">
                    <span className="text-slate-300">حسابات العملاء والمدينون (Accounts Receivable)</span>
                    <span className="font-mono font-bold text-slate-200">{formatNumber(financialData.accountsReceivable)} {currSym}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 text-xs border-b border-slate-800/60">
                    <span className="text-slate-300">بضاعة آخر المدة بالمخازن (Inventory)</span>
                    <span className="font-mono font-bold text-slate-200">{formatNumber(financialData.inventoryValuation)} {currSym}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 font-bold text-xs bg-slate-950/50 px-2 rounded-lg">
                    <span className="text-cyan-300">إجمالي الأصول المتداولة</span>
                    <span className="font-mono text-cyan-400">{formatNumber(financialData.totalCurrentAssets)} {currSym}</span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="text-xs font-bold text-amber-400">الالتزامات والخصوم المتداولة (Liabilities):</div>
                  <div className="flex justify-between items-center py-1 text-xs border-b border-slate-800/60">
                    <span className="text-slate-300">ذمم الموردين والدائنون (Accounts Payable)</span>
                    <span className="font-mono font-bold text-slate-200">{formatNumber(financialData.accountsPayable)} {currSym}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 text-xs border-b border-slate-800/60">
                    <span className="text-slate-300">مخصص ضريبة القيمة المضافة المستحقة</span>
                    <span className="font-mono font-bold text-slate-200">{formatNumber(financialData.vatPayable)} {currSym}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 font-bold text-xs bg-slate-950/50 px-2 rounded-lg">
                    <span className="text-amber-300">إجمالي الالتزامات المتداولة</span>
                    <span className="font-mono text-amber-400">{formatNumber(financialData.totalCurrentLiabilities)} {currSym}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center py-3 bg-gradient-to-r from-amber-950/30 to-blue-950/30 px-3.5 rounded-xl border border-amber-500/30 font-black text-base">
                  <span className="text-amber-300">صافي رأس المال العامل (Working Capital)</span>
                  <span className="font-mono text-amber-400">
                    {formatNumber(financialData.workingCapital)} {currSym}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Third Row: Tax & Zakat Cockpit + Cash Flow Statement */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Zakat & Tax Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  الإقرار الضريبي والوعاء الزكوي (Tax & Zakat Cockpit)
                </h3>
                <span className="text-xs font-mono text-slate-400 font-semibold">{currSym}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-xs text-slate-400">ضريبة المخرجات (المبيعات)</span>
                  <div className="text-base font-bold text-emerald-400 font-mono">
                    {formatNumber(financialData.vatOutput)} {currSym}
                  </div>
                </div>

                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-xs text-slate-400">ضريبة المدخلات (المشتريات)</span>
                  <div className="text-base font-bold text-blue-400 font-mono">
                    {formatNumber(financialData.vatInput)} {currSym}
                  </div>
                </div>

                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-xs text-slate-400">صافي الضريبة المستحقة</span>
                  <div className="text-base font-bold text-amber-400 font-mono">
                    {formatNumber(financialData.netVat)} {currSym}
                  </div>
                </div>

                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-xs text-slate-400">الزكاة الشرعية التقديرية (2.5%)</span>
                  <div className="text-base font-bold text-emerald-400 font-mono">
                    {formatNumber(financialData.zakatDue)} {currSym}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 text-xs text-slate-400 leading-relaxed">
                يتم احتساب الوعاء الزكوي على رأس المال العامل وصافي الأرباح السنوية وفقاً للمعايير المحاسبية المعتمدة بنسبة 2.5%.
              </div>
            </div>

            {/* Cash Flow Summary Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-cyan-400" />
                  ملخص التدفقات النقدية الفعلية (Cash Flow)
                </h3>
                <span className="text-xs font-mono text-slate-400 font-semibold">{currSym}</span>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
                  <span className="text-slate-300 flex items-center gap-2">
                    <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                    المقبوضات النقدية المحصلة (Cash Inflow)
                  </span>
                  <span className="font-mono font-bold text-emerald-400">
                    +{formatNumber(financialData.cashInflow)} {currSym}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
                  <span className="text-slate-300 flex items-center gap-2">
                    <ArrowUpRight className="w-4 h-4 text-rose-400" />
                    المدفوعات والمصاريف النقدية (Cash Outflow)
                  </span>
                  <span className="font-mono font-bold text-rose-400">
                    -{formatNumber(financialData.cashOutflow)} {currSym}
                  </span>
                </div>

                <div className="flex justify-between items-center py-3 bg-gradient-to-r from-blue-950/30 to-cyan-950/30 px-3.5 rounded-xl border border-blue-500/30 font-black text-base">
                  <span className="text-cyan-300">صافي السيولة النقدية المتولدة</span>
                  <span className="font-mono text-cyan-400">
                    {formatNumber(financialData.netCashFlow)} {currSym}
                  </span>
                </div>

                <div className="text-xs text-slate-400 pt-1">
                  حالة السيولة: {financialData.netCashFlow >= 0 ? '🟢 سيولة إيجابية متوازنة' : '🔴 عجز في التدفق النقدي'}
                </div>
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
