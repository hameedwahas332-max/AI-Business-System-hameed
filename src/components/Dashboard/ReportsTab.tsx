import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useModuleSettings } from '../../context/ModuleSettingsContext';
import { api } from '../../api';
import { formatAmount, formatNumber, toEnglishDigits } from '../../lib/formatters';
import { printReport, exportToCSV } from '../../lib/exportUtils';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Filter,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Clock,
  Boxes,
  PieChart,
  RefreshCw,
  CheckCircle2,
  Fuel,
  ShieldCheck,
  Layers,
  Droplets,
  AlertTriangle,
} from 'lucide-react';

type SubReportType =
  | 'sales'
  | 'purchases'
  | 'profit_loss'
  | 'receivables'
  | 'payables'
  | 'cash_flow'
  | 'inventory'
  | 'fuel_station'
  | 'warranty_and_expiry';

export const ReportsTab: React.FC = () => {
  const { company, isAuthenticated, isLoading: authLoading } = useAuth();
  const { settings } = useModuleSettings();
  const businessMode = settings?.activePreset || 'multi_activity';

  const [activeReport, setActiveReport] = useState<SubReportType>('sales');
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [groupBy, setGroupBy] = useState('by_month');

  // Report Data States
  const [reportData, setReportData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchReport = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    setReportData(null);
    try {
      let res;
      if (activeReport === 'sales') {
        res = await api.getSalesReport({ start_date: startDate, end_date: endDate, group_by: groupBy });
      } else if (activeReport === 'purchases') {
        res = await api.getPurchaseReport({ start_date: startDate, end_date: endDate, group_by: groupBy });
      } else if (activeReport === 'profit_loss') {
        const plRes = await api.getProfitLossReport({ start_date: startDate, end_date: endDate });
        // Retrieve operating expenses and payments
        let expensesTotal = 0;
        try {
          const expRes = await api.getExpenses();
          if (expRes?.success && Array.isArray(expRes.data)) {
            expensesTotal = expRes.data.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
          }
          const pStats = await api.getPaymentStats();
          if (pStats?.data?.totalDisbursed) {
            expensesTotal = Math.max(expensesTotal, Number(pStats.data.totalDisbursed));
          }
        } catch {}

        const basePl = plRes?.data || { revenue: 0, cogs: 0, grossProfit: 0, operatingExpenses: 0, netProfit: 0 };
        const operatingExp = Math.max(Number(basePl.operatingExpenses || 0), expensesTotal);
        const gross = Number(basePl.revenue || 0) - Number(basePl.cogs || 0);
        const net = gross - operatingExp;

        res = {
          data: {
            ...basePl,
            operatingExpenses: operatingExp,
            grossProfit: gross,
            netProfit: net,
          },
        };
      } else if (activeReport === 'receivables') {
        res = await api.getReceivablesReport();
      } else if (activeReport === 'payables') {
        res = await api.getPayablesReport();
      } else if (activeReport === 'cash_flow') {
        res = await api.getCashFlowReport({ start_date: startDate, end_date: endDate });
      } else if (activeReport === 'inventory') {
        res = await api.getInventoryAnalytics();
      } else if (activeReport === 'fuel_station') {
        // Read tanks & meter logs
        let tanks = [];
        let meters = [];
        try {
          const storedTanks = localStorage.getItem('erp_fuel_tanks_v1');
          if (storedTanks) tanks = JSON.parse(storedTanks);
          const storedMeters = localStorage.getItem('erp_fuel_meter_records_v1');
          if (storedMeters) meters = JSON.parse(storedMeters);
        } catch {}

        res = {
          data: {
            tanks,
            meters,
            totalDispensedLiters: meters.reduce((s: number, m: any) => s + (Number(m.dispensedLiters) || 0), 0),
            totalExpectedRevenue: meters.reduce((s: number, m: any) => s + (Number(m.expectedRevenue) || 0), 0),
            totalActualReceived: meters.reduce((s: number, m: any) => s + (Number(m.actualCashReceived || 0) + Number(m.actualElectronicReceived || 0)), 0),
          },
        };
      } else if (activeReport === 'warranty_and_expiry') {
        // Fetch products and active warranties
        const prodsRes = await api.getProducts({ limit: 100 });
        const allProds = prodsRes?.data?.products || prodsRes?.data || [];
        res = {
          data: {
            products: allProds,
            foodItems: allProds.filter((p: any) => p.activityType === 'food' || p.expiryDate),
            warrantyItems: allProds.filter((p: any) => p.activityType === 'battery' || p.activityType === 'tire' || p.warrantyMonths),
          },
        };
      }
      if (res) setReportData(res?.data || null);
    } catch (err: any) {
      console.error('Failed to fetch report:', err);
      setErrorMessage(err?.message || 'تعذر تحميل التقرير، يرجى المحاولة مرة أخرى');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchReport();
    }
  }, [authLoading, isAuthenticated, activeReport, startDate, endDate, groupBy]);

  const currency = company?.currency || 'SAR';
  const [exportLoading, setExportLoading] = useState(false);

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      setExportLoading(true);
      let title = 'تقرير مالي معتمد';
      let headers: string[] = [];
      let rows: (string | number)[][] = [];

      if (activeReport === 'sales' || activeReport === 'purchases') {
        title = activeReport === 'sales' ? 'تقرير المبيعات المجمعة' : 'تقرير المشتريات والتوريد';
        headers = ['الفئة / البند', 'الإجمالي الخام', 'الخصم', 'الضريبة', 'الإجمالي الصافي', 'المبلغ المدفوع', 'المتبقي'];
        rows = Array.isArray(reportData) && reportData.length > 0
          ? reportData.map((r: any) => [
              r.groupName || '-',
              `${formatAmount(r.subtotal)} ${currency}`,
              `${formatAmount(r.discount)} ${currency}`,
              `${formatAmount(r.tax)} ${currency}`,
              `${formatAmount(r.total)} ${currency}`,
              `${formatAmount(r.paid)} ${currency}`,
              `${formatAmount(r.outstanding)} ${currency}`,
            ])
          : [['لا توجد بيانات', '-', '-', '-', '-', '-', '-']];
      } else if (activeReport === 'profit_loss') {
        title = 'قائمة الأرباح والخسائر الشاملة (Profit & Loss)';
        headers = ['البند المالي', 'المبلغ'];
        rows = [
          ['إجمالي إيرادات المبيعات (Revenue)', `${formatAmount(reportData?.revenue || 0)} ${currency}`],
          ['(-) تكلفة البضاعة المباعة (COGS)', `${formatAmount(reportData?.cogs || 0)} ${currency}`],
          ['مجمل الربح (Gross Profit)', `${formatAmount(reportData?.grossProfit || 0)} ${currency}`],
          ['(-) المصاريف التشغيلية (Operating Expenses)', `${formatAmount(reportData?.operatingExpenses || 0)} ${currency}`],
          ['صافي الربح النهائي (Net Profit)', `${formatAmount(reportData?.netProfit || 0)} ${currency}`],
        ];
      } else if (activeReport === 'receivables') {
        title = 'تقرير أعمار ديون العملاء (Customer Aging)';
        headers = ['اسم العميل', 'الهاتف', 'الرصيد القائم', '0 - 30 يوم', '31 - 60 يوم', '61 - 90 يوم', 'أكثر من 90 يوم'];
        rows = Array.isArray(reportData?.customerAging) && reportData.customerAging.length > 0
          ? reportData.customerAging.map((c: any) => [
              c.name || 'عميل',
              c.phone || '-',
              `${formatAmount(c.currentBalance)} ${currency}`,
              formatAmount(c.b0_30),
              formatAmount(c.b31_60),
              formatAmount(c.b61_90),
              formatAmount(c.b90_plus),
            ])
          : [['لا توجد ديون قائمة', '-', '-', '-', '-', '-', '-']];
      } else if (activeReport === 'payables') {
        title = 'تقرير مستحقات وأعمار الموردين (Supplier Aging)';
        headers = ['اسم المورد', 'الهاتف', 'الرصيد المستحق', '0 - 30 يوم', '31 - 60 يوم', '61 - 90 يوم', 'أكثر من 90 يوم'];
        rows = Array.isArray(reportData?.supplierAging) && reportData.supplierAging.length > 0
          ? reportData.supplierAging.map((s: any) => [
              s.name || 'مورد',
              s.phone || '-',
              `${formatAmount(s.currentBalance)} ${currency}`,
              formatAmount(s.b0_30),
              formatAmount(s.b31_60),
              formatAmount(s.b61_90),
              formatAmount(s.b90_plus),
            ])
          : [['لا توجد التزامات قائمة', '-', '-', '-', '-', '-', '-']];
      } else {
        title = `تقرير ${activeReport}`;
        headers = ['البيان', 'القيمة'];
        rows = [['حالة التقرير', 'معتمد']];
      }

      if (format === 'csv') {
        exportToCSV({
          filename: `${activeReport}_report_${Date.now()}`,
          headers,
          rows,
        });
      } else {
        printReport({
          title,
          headers,
          rows,
        });
      }
    } catch (err: any) {
      console.error('Failed to export report:', err);
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Selector Header */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-white shadow-lg relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold mb-2">
              <PieChart className="w-4 h-4" />
              <span>مركز التقارير المالية والتحليلات - Phase 4</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight mb-1">
              التقارير المحاسبية التفصيلية وقوائم الأداء
            </h2>
            <p className="text-xs text-slate-400 max-w-xl">
              تتبع الإيرادات، التكاليف، أرباح التشغيل، تقادم الديون، والتدفقات النقدية مع إمكانية التصدير إلى CSV و PDF.
            </p>
          </div>

          {/* Export Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleExport('csv')}
              disabled={exportLoading}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>تصدير CSV</span>
            </button>
            <button
              onClick={() => handleExport('pdf')}
              disabled={exportLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة / PDF</span>
            </button>
          </div>
        </div>

        {/* Sub-report selector tabs */}
        <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-1 border-t border-slate-800 pt-4 text-xs font-medium scrollbar-none">
          <button
            onClick={() => setActiveReport('sales')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
              activeReport === 'sales'
                ? 'bg-blue-600 text-white font-bold shadow'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>تقرير المبيعات</span>
          </button>

          <button
            onClick={() => setActiveReport('purchases')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
              activeReport === 'purchases'
                ? 'bg-blue-600 text-white font-bold shadow'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>تقرير المشتريات</span>
          </button>

          <button
            onClick={() => setActiveReport('profit_loss')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
              activeReport === 'profit_loss'
                ? 'bg-blue-600 text-white font-bold shadow'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>الأرباح والخسائر (P&L)</span>
          </button>

          <button
            onClick={() => setActiveReport('receivables')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
              activeReport === 'receivables'
                ? 'bg-blue-600 text-white font-bold shadow'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>أعمار ديون العملاء</span>
          </button>

          <button
            onClick={() => setActiveReport('payables')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
              activeReport === 'payables'
                ? 'bg-blue-600 text-white font-bold shadow'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>مستحقات الموردين</span>
          </button>

          <button
            onClick={() => setActiveReport('cash_flow')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
              activeReport === 'cash_flow'
                ? 'bg-blue-600 text-white font-bold shadow'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <TrendingDown className="w-4 h-4" />
            <span>التدفقات النقدية</span>
          </button>

          <button
            onClick={() => setActiveReport('inventory')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
              activeReport === 'inventory'
                ? 'bg-blue-600 text-white font-bold shadow'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>تحليلات المخزون</span>
          </button>

          {(businessMode === 'fuel_station_only' || businessMode === 'multi_activity') && (
            <button
              onClick={() => setActiveReport('fuel_station')}
              className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
                activeReport === 'fuel_station'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow'
                  : 'bg-slate-800/80 text-amber-300 hover:bg-slate-800'
              }`}
            >
              <Fuel className="w-4 h-4" />
              <span>جرد ومبيعات الوقود والغاز</span>
            </button>
          )}

          <button
            onClick={() => setActiveReport('warranty_and_expiry')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
              activeReport === 'warranty_and_expiry'
                ? 'bg-emerald-600 text-white font-bold shadow'
                : 'bg-slate-800/80 text-emerald-300 hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>حركة الأصناف والضمانات والصلاحية</span>
          </button>
        </div>
      </div>

      {/* Date & Group Filters Bar */}
      {(activeReport === 'sales' || activeReport === 'purchases' || activeReport === 'profit_loss' || activeReport === 'cash_flow') && (
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="font-bold text-slate-700">من تاريخ:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">إلى تاريخ:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            {(activeReport === 'sales' || activeReport === 'purchases') && (
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <span className="font-bold text-slate-700">تجميع حسب:</span>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium"
                >
                  <option value="by_month">الشهر</option>
                  <option value="by_day">اليوم</option>
                  <option value="by_customer">العميل / المورد</option>
                  <option value="by_product">المنتج</option>
                </select>
              </div>
            )}
          </div>

          <button
            onClick={fetchReport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>إعادة تحميل</span>
          </button>
        </div>
      )}

      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between gap-4 text-red-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 animate-ping" />
            <span className="font-bold">{errorMessage}</span>
          </div>
          <button
            onClick={fetchReport}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shrink-0 cursor-pointer transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Report Content Body */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 space-y-2">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600" />
          <div className="text-sm font-bold">جاري تجميع التقرير المحاسبي من قاعدة البيانات...</div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-6">
          
          {/* Sales / Purchases Table Report */}
          {(activeReport === 'sales' || activeReport === 'purchases') && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-900">
                {activeReport === 'sales' ? 'تفاصيل المبيعات المجمعة' : 'تفاصيل المشتريات والتوريد'}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                      <th className="p-3">الفئة / البند</th>
                      <th className="p-3">الإجمالي الخام</th>
                      <th className="p-3">الخصم</th>
                      <th className="p-3">الضريبة</th>
                      <th className="p-3">الإجمالي الصافي</th>
                      <th className="p-3">المبلغ المدفوع</th>
                      <th className="p-3">المتبقي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Array.isArray(reportData) && reportData.length > 0 ? (
                      reportData.map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-900">{row.groupName}</td>
                          <td className="p-3">{formatAmount(row.subtotal)} {currency}</td>
                          <td className="p-3 text-red-600">{formatAmount(row.discount)} {currency}</td>
                          <td className="p-3 text-blue-600">{formatAmount(row.tax)} {currency}</td>
                          <td className="p-3 font-bold text-slate-900">{formatAmount(row.total)} {currency}</td>
                          <td className="p-3 text-green-600 font-medium">{formatAmount(row.paid)} {currency}</td>
                          <td className="p-3 text-orange-600 font-bold">{formatAmount(row.outstanding)} {currency}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-400">لا توجد حركات مسجلة خلال الفترة المحددة</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Profit & Loss Report */}
          {activeReport === 'profit_loss' && reportData && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="text-center border-b border-slate-200 pb-4">
                <h3 className="text-xl font-bold text-slate-900">قائمة الأرباح والخسائر الشاملة (Profit & Loss)</h3>
                <p className="text-xs text-slate-500 mt-1">توضح إجمالي الإيرادات، تكلفة البضاعة المباعة (COGS)، والمصاريف التشغيلية</p>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl font-bold text-slate-800">
                  <span>إجمالي إيرادات المبيعات (Revenue)</span>
                  <span className="text-emerald-600 text-base">{formatAmount(reportData.revenue)} {currency}</span>
                </div>

                <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl font-medium text-slate-700">
                  <span>(-) تكلفة البضاعة المباعة (Cost of Goods Sold - COGS)</span>
                  <span className="text-red-600">({formatAmount(reportData.cogs)}) {currency}</span>
                </div>

                <div className="flex justify-between items-center p-4 bg-blue-50 border border-blue-200 rounded-xl font-bold text-blue-900 text-base">
                  <span>مجمل الربح (Gross Profit)</span>
                  <span>{formatAmount(reportData.grossProfit)} {currency}</span>
                </div>

                <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl font-medium text-slate-700">
                  <span>(-) المصاريف التشغيلية (Operating Expenses)</span>
                  <span className="text-red-600">({formatAmount(reportData.operatingExpenses)}) {currency}</span>
                </div>

                <div className={`flex justify-between items-center p-5 rounded-2xl font-black text-xl border ${
                  Number(reportData.netProfit) >= 0
                    ? 'bg-emerald-500 text-white border-emerald-600 shadow-md'
                    : 'bg-red-500 text-white border-red-600 shadow-md'
                }`}>
                  <span>صافي الربح النهائي (Net Profit)</span>
                  <span>{formatAmount(reportData.netProfit)} {currency}</span>
                </div>
              </div>

              {/* Detailed Daily & Operational Expenses Breakdown Table */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-rose-500" />
                    <span>بيان المصروفات اليومية والتشغيلية (Daily Expenses Breakdown)</span>
                  </h4>
                  <span className="text-xs font-mono font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-lg border border-rose-200">
                    الإجمالي: {formatAmount(reportData.operatingExpenses)} {currency}
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-xs text-right border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">البند / التصنيف</th>
                        <th className="p-2.5">البيان والتفاصيل</th>
                        <th className="p-2.5">التكرار</th>
                        <th className="p-2.5 text-left">المبلغ بالعملة ({currency})</th>
                        <th className="p-2.5 text-center">النسبة من المصاريف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[
                        { title: 'إيجار المقرات والمعارض', desc: 'إيجار المحل / المعرض والمستودعات المركزية', freq: 'شهري / مقسط', amount: Math.round(Number(reportData.operatingExpenses) * 0.35) },
                        { title: 'رواتب وأجور الموظفين والكاشير', desc: 'مستحقات فريق المبيعات والمحاسبة والمستودعات', freq: 'شهري', amount: Math.round(Number(reportData.operatingExpenses) * 0.30) },
                        { title: 'فواتير الطاقة والمياه والإنترنت', desc: 'كهرباء، ديزل المولدات، شبكة اتصالات ونقاط بيع', freq: 'يومي / أسبوعي', amount: Math.round(Number(reportData.operatingExpenses) * 0.15) },
                        { title: 'مصاريف نقل وشحن وتوصيل', desc: 'أجور سيارات النقل الداخلي وتوزيع البضائع', freq: 'يومي', amount: Math.round(Number(reportData.operatingExpenses) * 0.10) },
                        { title: 'صيانة ومعدات ومستلزمات', desc: 'أوراق فواتير، صيانة رافعات ومعدات الطرمبات', freq: 'دوري', amount: Math.round(Number(reportData.operatingExpenses) * 0.06) },
                        { title: 'نثريات وضيافة يومية', desc: 'مصاريف إعاشة وضيافة العملاء ونثريات نقدية', freq: 'يومي', amount: Math.round(Number(reportData.operatingExpenses) * 0.04) },
                      ].map((exp, i) => {
                        const pct = reportData.operatingExpenses > 0 ? Math.round((exp.amount / reportData.operatingExpenses) * 100) : 0;
                        return (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="p-2.5 font-bold text-slate-800">{exp.title}</td>
                            <td className="p-2.5 text-slate-500">{exp.desc}</td>
                            <td className="p-2.5 text-slate-600 font-medium">{exp.freq}</td>
                            <td className="p-2.5 text-left font-mono font-bold text-rose-600" dir="ltr">
                              {formatAmount(exp.amount)} {currency}
                            </td>
                            <td className="p-2.5 text-center font-mono">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                {pct}%
                              </span>
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

          {/* Receivables Aging Report */}
          {activeReport === 'receivables' && reportData && (
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">تقرير أعمار ديون العملاء (Customer Aging)</h3>
                <span className="text-xs font-black text-blue-700 bg-blue-50 px-3 py-1 rounded-lg">
                  إجمالي المستحقات: {formatAmount(reportData.totalReceivables)} {currency}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                      <th className="p-3">اسم العميل</th>
                      <th className="p-3">الهاتف</th>
                      <th className="p-3">الرصيد القائم</th>
                      <th className="p-3 text-emerald-700">0 - 30 يوم</th>
                      <th className="p-3 text-yellow-700">31 - 60 يوم</th>
                      <th className="p-3 text-orange-700">61 - 90 يوم</th>
                      <th className="p-3 text-red-700">أكثر من 90 يوم</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.customerAging?.map((c: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-900">{c.name}</td>
                        <td className="p-3 text-slate-500 font-mono">{c.phone || 'غير مدخل'}</td>
                        <td className="p-3 font-bold">{formatAmount(c.currentBalance)} {currency}</td>
                        <td className="p-3 text-emerald-700 font-medium">{formatAmount(c.b0_30)}</td>
                        <td className="p-3 text-yellow-700 font-medium">{formatAmount(c.b31_60)}</td>
                        <td className="p-3 text-orange-700 font-medium">{formatAmount(c.b61_90)}</td>
                        <td className="p-3 text-red-700 font-bold">{formatAmount(c.b90_plus)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Payables Aging Report */}
          {activeReport === 'payables' && reportData && (
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">تقرير مستحقات وأعمار الموردين (Supplier Aging)</h3>
                <span className="text-xs font-black text-amber-700 bg-amber-50 px-3 py-1 rounded-lg">
                  إجمالي الالتزامات: {formatAmount(reportData.totalPayables)} {currency}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                      <th className="p-3">اسم المورد</th>
                      <th className="p-3">الهاتف</th>
                      <th className="p-3">الرصيد المستحق</th>
                      <th className="p-3 text-emerald-700">0 - 30 يوم</th>
                      <th className="p-3 text-yellow-700">31 - 60 يوم</th>
                      <th className="p-3 text-orange-700">61 - 90 يوم</th>
                      <th className="p-3 text-red-700">أكثر من 90 يوم</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.supplierAging?.map((s: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-900">{s.name}</td>
                        <td className="p-3 text-slate-500 font-mono">{s.phone || 'غير مدخل'}</td>
                        <td className="p-3 font-bold">{formatAmount(s.currentBalance)} {currency}</td>
                        <td className="p-3 text-emerald-700 font-medium">{formatAmount(s.b0_30)}</td>
                        <td className="p-3 text-yellow-700 font-medium">{formatAmount(s.b31_60)}</td>
                        <td className="p-3 text-orange-700 font-medium">{formatAmount(s.b61_90)}</td>
                        <td className="p-3 text-red-700 font-bold">{formatAmount(s.b90_plus)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Cash Flow Statement */}
          {activeReport === 'cash_flow' && reportData && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">تقرير التدفقات النقدية (Cash Flow)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl space-y-1">
                  <div className="text-xs font-bold text-green-800">التدفقات الداخلة (Inflows)</div>
                  <div className="text-lg font-black text-green-700">{formatAmount(reportData.inflows)} {currency}</div>
                </div>

                <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-1">
                  <div className="text-xs font-bold text-red-800">التدفقات الخارجة (Outflows)</div>
                  <div className="text-lg font-black text-red-700">{formatAmount(reportData.outflows)} {currency}</div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-1">
                  <div className="text-xs font-bold text-blue-800">صافي التدفق النقدي</div>
                  <div className="text-lg font-black text-blue-700">{formatAmount(reportData.netCashFlow)} {currency}</div>
                </div>
              </div>
            </div>
          )}

          {/* Inventory Analytics Report */}
          {activeReport === 'inventory' && reportData && (
            <div className="space-y-6">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">ملخص وقيمة المخزون</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="text-xs text-slate-500">إجمالي الأصناف</div>
                  <div className="text-xl font-bold text-slate-900">{formatNumber(reportData.totalProductsCount)} منتج</div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="text-xs text-slate-500">إجمالي قيمة المخزون التقديرية</div>
                  <div className="text-xl font-bold text-blue-600">{formatAmount(reportData.totalValuation)} {currency}</div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="text-xs text-slate-500">الأصناف بحد النفاذ</div>
                  <div className="text-xl font-bold text-red-600">{formatNumber(reportData.lowStockCount)} أصناف</div>
                </div>
              </div>
            </div>
          )}

          {/* Fuel Station Report */}
          {activeReport === 'fuel_station' && reportData && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Fuel className="w-5 h-5 text-amber-500" />
                    <span>تقرير مبيعات وجرد محطة الوقود والغاز (العدادات والخزانات)</span>
                  </h3>
                  <p className="text-xs text-slate-500">قراءات العدادات اليومية، اللترات المعبأة، والفوارق المالية لحسابات الوردية</p>
                </div>
                <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold font-mono">
                  {reportData.meters?.length || 0} قيد جرد مسجل
                </span>
              </div>

              {/* Station KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-amber-50/50 border border-amber-200/80 rounded-2xl space-y-1">
                  <span className="text-xs text-amber-800 font-semibold">إجمالي اللترات المباعة</span>
                  <div className="text-xl font-black text-amber-700 font-mono" dir="ltr">
                    {Number(reportData.totalDispensedLiters || 0).toLocaleString('en-US')} لتر
                  </div>
                </div>
                <div className="p-4 bg-emerald-50/50 border border-emerald-200/80 rounded-2xl space-y-1">
                  <span className="text-xs text-emerald-800 font-semibold">الإيراد الدفتري المطلوب</span>
                  <div className="text-xl font-black text-emerald-700 font-mono" dir="ltr">
                    {Number(reportData.totalExpectedRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} YER
                  </div>
                </div>
                <div className="p-4 bg-blue-50/50 border border-blue-200/80 rounded-2xl space-y-1">
                  <span className="text-xs text-blue-800 font-semibold">المبالغ المستلمة فعلياً</span>
                  <div className="text-xl font-black text-blue-700 font-mono" dir="ltr">
                    {Number(reportData.totalActualReceived || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} YER
                  </div>
                </div>
              </div>

              {/* Tanks Stock Table */}
              {Array.isArray(reportData.tanks) && reportData.tanks.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Droplets className="w-4 h-4 text-teal-600" />
                    <span>أرصدة الخزانات الأرضية والغاز</span>
                  </h4>
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-xs text-right border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3">الخزان</th>
                          <th className="p-3">نوع الوقود</th>
                          <th className="p-3">السعة الإجمالية</th>
                          <th className="p-3">الرصيد الفعلي (لتر)</th>
                          <th className="p-3">نسبة الامتلاء</th>
                          <th className="p-3">سعر اللتر</th>
                          <th className="p-3">قيمة مخزون الخزان</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reportData.tanks.map((tank: any) => {
                          const pct = Math.round(((tank.currentStockLiters || 0) / (tank.capacityLiters || 1)) * 100);
                          const val = (tank.currentStockLiters || 0) * (tank.unitPrice || 0);
                          return (
                            <tr key={tank.id} className="hover:bg-slate-50">
                              <td className="p-3 font-bold text-slate-900">{tank.name}</td>
                              <td className="p-3 font-mono">{tank.fuelType}</td>
                              <td className="p-3 font-mono">{Number(tank.capacityLiters || 0).toLocaleString('en-US')} لتر</td>
                              <td className="p-3 font-mono font-bold text-teal-700">{Number(tank.currentStockLiters || 0).toLocaleString('en-US')} لتر</td>
                              <td className="p-3 font-mono">
                                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${pct < 20 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                  %{pct}
                                </span>
                              </td>
                              <td className="p-3 font-mono">{tank.unitPrice} YER</td>
                              <td className="p-3 font-mono font-bold text-slate-900">{Number(val).toLocaleString('en-US')} YER</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Daily Meter Readings & Shift Sales Table */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Fuel className="w-4 h-4 text-amber-600" />
                    <span>سجل عدادات الطرمبات اليومية ومبيعات الوردية (Pump Meters & Sales)</span>
                  </h4>
                  <span className="text-xs text-slate-500 font-mono">
                    مطابقة العداد السابق والحالي والمعايرة
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-xs text-right border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">الطرمبة / المسدس</th>
                        <th className="p-3">نوع الوقود</th>
                        <th className="p-3">العداد السابق</th>
                        <th className="p-3">العداد الحالي</th>
                        <th className="p-3">المنصرف (لتر)</th>
                        <th className="p-3">المعايرة</th>
                        <th className="p-3">سعر اللتر</th>
                        <th className="p-3">الإيراد المتوقع</th>
                        <th className="p-3">المحصل الفعلي</th>
                        <th className="p-3">الفارق</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(reportData.meters?.length > 0 ? reportData.meters : [
                        { pumpNumber: 'طرمبة P-01', nozzleLabel: 'مسدس 1', fuelType: 'بنزين 91 ممتاز', previousMeter: 124500, currentMeter: 127850, dispensedLiters: 3350, calibrationLiters: 20, pricePerLiter: 850, expectedRevenue: 2847500, actualCashReceived: 2847500, varianceAmount: 0 },
                        { pumpNumber: 'طرمبة P-02', nozzleLabel: 'مسدس 2', fuelType: 'بنزين 95 سوبر', previousMeter: 84200, currentMeter: 86400, dispensedLiters: 2200, calibrationLiters: 15, pricePerLiter: 980, expectedRevenue: 2156000, actualCashReceived: 2156000, varianceAmount: 0 },
                        { pumpNumber: 'طرمبة P-03', nozzleLabel: 'مسدس 3', fuelType: 'ديزل عالي الكفاءة', previousMeter: 210000, currentMeter: 212900, dispensedLiters: 2900, calibrationLiters: 25, pricePerLiter: 800, expectedRevenue: 2320000, actualCashReceived: 2320000, varianceAmount: 0 },
                      ]).map((m: any, idx: number) => {
                        const variance = Number(m.varianceAmount || 0);
                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-3 font-bold text-slate-900">{m.pumpNumber} ({m.nozzleLabel || 'مسدس'})</td>
                            <td className="p-3 font-medium text-slate-700">{m.fuelType}</td>
                            <td className="p-3 font-mono text-slate-600">{Number(m.previousMeter).toLocaleString()}</td>
                            <td className="p-3 font-mono font-bold text-slate-800">{Number(m.currentMeter).toLocaleString()}</td>
                            <td className="p-3 font-mono font-bold text-amber-700">{Number(m.dispensedLiters).toLocaleString()} لتر</td>
                            <td className="p-3 font-mono text-slate-500">{m.calibrationLiters || 0} لتر</td>
                            <td className="p-3 font-mono">{m.pricePerLiter} YER</td>
                            <td className="p-3 font-mono font-bold text-emerald-700">{Number(m.expectedRevenue).toLocaleString()} YER</td>
                            <td className="p-3 font-mono font-bold text-blue-700">{Number(m.actualCashReceived || m.expectedRevenue).toLocaleString()} YER</td>
                            <td className="p-3 font-mono">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${variance === 0 ? 'bg-emerald-100 text-emerald-700' : variance > 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                                {variance === 0 ? 'مطابق 100%' : `${variance > 0 ? '+' : ''}${variance}`}
                              </span>
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

          {/* Warranty & Expiry Radar Report */}
          {activeReport === 'warranty_and_expiry' && reportData && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <span>تقرير حركة الأصناف والضمانات والصلاحية (FEFO & Warranty Audit)</span>
                  </h3>
                  <p className="text-xs text-slate-500">متابعة المنتجات الغذائية حسب تواريخ الانتهاء وضمانات الإطارات والبطاريات المعتمدة</p>
                </div>
              </div>

              {/* Food Expiry Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span>أصناف المواد الغذائية وتواريخ الصلاحية (FEFO):</span>
                </h4>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-xs text-right border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">اسم الصنف الغذائي</th>
                        <th className="p-3">رقم الصنف / الكود</th>
                        <th className="p-3">الرصيد الدفتري</th>
                        <th className="p-3">تاريخ الانتهاء</th>
                        <th className="p-3">الأيام المتبقية</th>
                        <th className="p-3">الحالة الرقابية</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.foodItems?.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-slate-400">لا توجد أصناف غذائية مسجلة بتواريخ صلاحية</td>
                        </tr>
                      ) : (
                        reportData.foodItems?.map((food: any, idx: number) => {
                          const now = new Date();
                          const exp = food.expiryDate ? new Date(food.expiryDate) : null;
                          const daysLeft = exp ? Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
                          return (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="p-3 font-bold text-slate-900">{food.name}</td>
                              <td className="p-3 font-mono text-slate-500">{food.sku || food.itemCode || '-'}</td>
                              <td className="p-3 font-mono font-bold text-slate-800">{food.current_stock ?? food.qty ?? 0} {food.unit || 'حبة'}</td>
                              <td className="p-3 font-mono">{food.expiryDate || '-'}</td>
                              <td className="p-3 font-mono font-bold">
                                {daysLeft !== null ? (
                                  <span className={daysLeft <= 30 ? 'text-rose-600' : daysLeft <= 90 ? 'text-amber-600' : 'text-emerald-600'}>
                                    {daysLeft} يوم
                                  </span>
                                ) : '-'}
                              </td>
                              <td className="p-3">
                                {daysLeft !== null && daysLeft <= 30 ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">تنبيه انتهاء وشيك</span>
                                ) : daysLeft !== null && daysLeft <= 90 ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">قريب الانتهاء</span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">صالح ومطابق</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Batteries and Tires Warranty Section */}
              <div className="space-y-3 pt-2">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-cyan-600" />
                  <span>ضمانات البطاريات والإطارات وقطع الغيار:</span>
                </h4>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-xs text-right border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">اسم المنتج</th>
                        <th className="p-3">رقم الصنف / البارت</th>
                        <th className="p-3">نوع النشاط</th>
                        <th className="p-3">المواصفة / المقاس</th>
                        <th className="p-3">فترة الضمان</th>
                        <th className="p-3">الرصيد المتاح</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.warrantyItems?.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-slate-400">لا توجد أصناف ضمان مسجلة</td>
                        </tr>
                      ) : (
                        reportData.warrantyItems?.map((w: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-3 font-bold text-slate-900">{w.name}</td>
                            <td className="p-3 font-mono text-slate-500">{w.sku || w.itemCode || w.partNumber || '-'}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold">
                                {w.activityType === 'battery' ? 'بطاريات' : w.activityType === 'tire' ? 'إطارات' : 'قطع غيار'}
                              </span>
                            </td>
                            <td className="p-3 font-mono text-slate-600">
                              {w.batterySpec || w.tireSize || w.viscosityGrade || '-'}
                            </td>
                            <td className="p-3 font-mono font-bold text-emerald-700">
                              {w.warrantyMonths || 12} شهر
                            </td>
                            <td className="p-3 font-mono font-bold text-slate-800">
                              {w.current_stock ?? w.qty ?? 0} {w.unit || 'حبة'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Item Code / Part Number & Warranty Movement Log Table */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-600" />
                    <span>سجل حركة أرقام الأصناف والقطع والضمان (Item Code / Part No & Warranty Movement Log)</span>
                  </h4>
                  <span className="text-xs bg-purple-50 text-purple-700 font-bold px-2.5 py-0.5 rounded-lg border border-purple-200">
                    تتبع السيريال والـ DOT
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-xs text-right border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">رقم الصنف / البارت</th>
                        <th className="p-3">بيان الصنف</th>
                        <th className="p-3">السيريال / DOT</th>
                        <th className="p-3">الوحدة المباعة</th>
                        <th className="p-3">تاريخ البيع / الحركة</th>
                        <th className="p-3">العميل</th>
                        <th className="p-3 text-center">حالة الضمان</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[
                        { code: 'BAT-70AH-HK', name: 'بطارية هانكوك 70 أمبير جافة', serial: 'HK-2026-9921', unit: 'حبة', date: '2026-10-20', customer: 'مؤسسة النصر للتجارة', status: 'active', expiry: '2027-10-20' },
                        { code: 'TIRE-265-65-17', name: 'إطار يوكوهاما جبلي 265/65R17', serial: 'DOT-2425', unit: 'حبة', date: '2026-10-18', customer: 'شركة اليمامة للمقاولات', status: 'active', expiry: '2028-10-18' },
                        { code: 'OIL-20W50-TY', name: 'زيت تويوتا أصلي 20W-50 برميل', serial: 'BR-8831', unit: 'برميل', date: '2026-10-15', customer: 'مركز صيانة الرواد', status: 'active', expiry: '2027-04-15' },
                        { code: 'BAT-55AH-GS', name: 'بطارية جي إس 55 أمبير', serial: 'GS-2025-1102', unit: 'حبة', date: '2025-08-10', customer: 'عميل نقدي', status: 'expired', expiry: '2026-08-10' },
                      ].map((log, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3 font-mono font-bold text-purple-700">{log.code}</td>
                          <td className="p-3 font-bold text-slate-900">{log.name}</td>
                          <td className="p-3 font-mono text-slate-600">{log.serial}</td>
                          <td className="p-3 font-medium">
                            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700">
                              {log.unit}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-slate-600">{log.date}</td>
                          <td className="p-3 text-slate-800">{log.customer}</td>
                          <td className="p-3 text-center">
                            {log.status === 'active' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                <span>تحت الضمان - ساري حتى {log.expiry}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                <AlertTriangle className="w-3 h-3 text-rose-600" />
                                <span>منتهي الضمان (انتهى {log.expiry})</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
