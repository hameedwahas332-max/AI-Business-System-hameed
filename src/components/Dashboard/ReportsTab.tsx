import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useModuleSettings } from '../../context/ModuleSettingsContext';
import { api } from '../../api';
import { formatAmount, formatNumber, toEnglishDigits, getActiveCurrencySymbol } from '../../lib/formatters';
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
  | 'tax'
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
        let actualExpensesList: any[] = [];
        let expensesTotal = 0;
        try {
          const expRes = await api.getExpenses();
          if (expRes?.success && Array.isArray(expRes.data)) {
            actualExpensesList = expRes.data.filter((e: any) => e && e.status !== 'CANCELLED');
            expensesTotal = actualExpensesList.reduce((sum: number, e: any) => sum + (Number(e.amount || e.total) || 0), 0);
          }
        } catch {}

        const basePl = plRes?.data || {};
        const rev = Number(
          typeof basePl.revenue === 'object'
            ? (basePl.revenue?.netRevenue ?? basePl.revenue?.salesRevenue ?? 0)
            : (basePl.netRevenue ?? basePl.revenue ?? 0)
        );
        const cogsVal = Number(basePl.cogs ?? basePl.costOfGoodsSold?.totalCOGS ?? 0);
        const baseOpEx = Number(
          typeof basePl.operatingExpenses === 'object'
            ? (basePl.operatingExpenses?.totalOperatingExpenses ?? 0)
            : (basePl.operatingExpensesTotal ?? basePl.operatingExpenses ?? 0)
        );

        const operatingExp = expensesTotal > 0 ? expensesTotal : baseOpEx;
        const gross = rev - cogsVal;
        const net = gross - operatingExp;

        res = {
          data: {
            ...basePl,
            revenue: rev,
            cogs: cogsVal,
            operatingExpenses: operatingExp,
            grossProfit: gross,
            netProfit: net,
            expensesList: actualExpensesList,
          },
        };
      } else if (activeReport === 'tax') {
        try {
          res = await api.getTaxReport({ start_date: startDate, end_date: endDate });
        } catch (taxErr) {
          console.warn('api.getTaxReport failed, calculating locally:', taxErr);
        }

        if (!res || !res.data) {
          let taxableSales = 0;
          let outputVat = 0;
          let taxablePurchases = 0;
          let inputVat = 0;
          const taxableInvoices: any[] = [];

          try {
            const invsRes = await api.getInvoices({ limit: 500 });
            const invs = Array.isArray(invsRes?.data?.invoices)
              ? invsRes.data.invoices
              : Array.isArray(invsRes?.data)
              ? invsRes.data
              : [];
            for (const inv of invs) {
              if (!inv || inv.status === 'CANCELLED' || inv.status === 'VOID') continue;
              const tot = Number(inv.total || inv.grandTotal || inv.amount || 0);
              const tx = Number(inv.tax || 0);
              outputVat += tx;
              taxableSales += tot - tx;
              taxableInvoices.push({
                id: inv.id,
                invoiceNumber: inv.invoice_number || inv.invoiceNumber || '-',
                customerName: inv.customer_name || inv.customerName || 'عميل',
                date: inv.date || inv.issue_date || inv.created_at || '',
                subtotal: tot - tx,
                tax: tx,
                total: tot,
              });
            }

            const piRes = await api.getPurchaseInvoices({ limit: 500 });
            const pis = Array.isArray(piRes?.data?.invoices)
              ? piRes.data.invoices
              : Array.isArray(piRes?.data)
              ? piRes.data
              : [];
            for (const pi of pis) {
              if (!pi || pi.status === 'CANCELLED' || pi.status === 'VOID') continue;
              const tot = Number(pi.grandTotal || pi.total || 0);
              const tx = Number(pi.taxAmount || pi.tax || 0);
              inputVat += tx;
              taxablePurchases += tot - tx;
            }
          } catch {}

          if (outputVat === 0 && taxableSales > 0) outputVat = Math.round(taxableSales * 0.15);
          if (inputVat === 0 && taxablePurchases > 0) inputVat = Math.round(taxablePurchases * 0.15);

          res = {
            data: {
              taxableSales,
              outputVat,
              taxablePurchases,
              inputVat,
              netVatPayable: outputVat - inputVat,
              taxableInvoices,
              period: 'الفترة الضريبية الحالية',
            },
          };
        }
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
    const handleWiped = () => {
      setReportData(null);
      if (!authLoading) {
        fetchReport();
      }
    };
    window.addEventListener('erp-demo-data-wiped', handleWiped);
    window.addEventListener('erp-inventory-updated', handleWiped);
    return () => {
      window.removeEventListener('erp-demo-data-wiped', handleWiped);
      window.removeEventListener('erp-inventory-updated', handleWiped);
    };
  }, [authLoading, isAuthenticated, activeReport, startDate, endDate, groupBy]);

  const currency = getActiveCurrencySymbol(company?.currency);
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
      } else if (activeReport === 'tax') {
        title = 'تقرير الإقرار الضريبي وضريبة القيمة المضافة (VAT)';
        headers = ['رقم الفاتورة / البند', 'العميل', 'التاريخ', 'المبلغ قبل الضريبة', 'الضريبة (VAT)', 'الإجمالي'];
        const summaryRows = [
          ['[ملخص] إجمالي المبيعات الخاضعة للضريبة', '-', '-', `${formatAmount(reportData?.taxableSales || 0)} ${currency}`, `${formatAmount(reportData?.outputVat || 0)} ${currency}`, '-'],
          ['[ملخص] إجمالي المشتريات الخاضعة للضريبة', '-', '-', `${formatAmount(reportData?.taxablePurchases || 0)} ${currency}`, `${formatAmount(reportData?.inputVat || 0)} ${currency}`, '-'],
          ['[ملخص] صافي الضريبة المستحقة للإقرار', '-', '-', '-', `${formatAmount(reportData?.netVatPayable ?? (Number(reportData?.outputVat || 0) - Number(reportData?.inputVat || 0)))} ${currency}`, '-'],
        ];
        const invoiceRows = Array.isArray(reportData?.taxableInvoices) && reportData.taxableInvoices.length > 0
          ? reportData.taxableInvoices.map((inv: any) => [
              inv.invoiceNumber || '-',
              inv.customerName || 'عميل',
              inv.date || '-',
              `${formatAmount(inv.subtotal)} ${currency}`,
              `${formatAmount(inv.tax)} ${currency}`,
              `${formatAmount(inv.total)} ${currency}`,
            ])
          : [];
        rows = [...summaryRows, ...invoiceRows];
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
      } else if (activeReport === 'cash_flow') {
        title = 'تقرير التدفقات النقدية الفعلية (Cash Flow)';
        headers = ['بند التدفق النقدي', 'المبلغ بالعملة'];
        rows = [
          ['التدفقات النقدية الداخلة (Inflows)', `${formatAmount(reportData?.inflows || 0)} ${currency}`],
          ['التدفقات النقدية الخارجة (Outflows)', `${formatAmount(reportData?.outflows || 0)} ${currency}`],
          ['صافي التدفق النقدي التشغيلي (Net Cash Flow)', `${formatAmount(reportData?.netCashFlow || 0)} ${currency}`],
          ['الرصيد النقدي الختامي (Closing Cash)', `${formatAmount(reportData?.closingCash ?? reportData?.totalCashAndBank ?? 0)} ${currency}`],
        ];
      } else if (activeReport === 'inventory') {
        title = 'تقرير تقييم وجرد المخزون (Inventory Valuation)';
        headers = ['اسم الصنف', 'الباركود / SKU', 'التصنيف', 'الرصيد الحالي', 'تكلفة الوحدة', 'سعر البيع', 'القيمة التقديرية'];
        rows = Array.isArray(reportData?.products) && reportData.products.length > 0
          ? reportData.products.map((p: any) => [
              p.name || 'منتج',
              p.sku || '-',
              p.category || 'عام',
              `${p.stock || 0}`,
              `${formatAmount(p.unitCost)} ${currency}`,
              `${formatAmount(p.unitPrice)} ${currency}`,
              `${formatAmount(p.valuation)} ${currency}`,
            ])
          : [
              ['إجمالي الأصناف', `${reportData?.totalProductsCount || 0} صنف`, '-', '-', '-', '-', '-'],
              ['إجمالي قيمة المخزون', `${formatAmount(reportData?.totalValuation || 0)} ${currency}`, '-', '-', '-', '-', '-'],
              ['الأصناف بحد النفاذ', `${reportData?.lowStockCount || 0} صنف`, '-', '-', '-', '-', '-'],
            ];
      } else if (activeReport === 'fuel_station') {
        title = 'تقرير جرد ومبيعات الوقود والغاز';
        headers = ['البيان / الطرمبة', 'نوع الوقود', 'العداد السابق', 'العداد الحالي', 'المنصرف (لتر)', 'سعر اللتر', 'الإيراد المتوقع', 'المحصل الفعلي'];
        rows = Array.isArray(reportData?.meters) && reportData.meters.length > 0
          ? reportData.meters.map((m: any) => [
              `${m.pumpNumber || 'طرمبة'} (${m.nozzleLabel || 'مسدس'})`,
              m.fuelType || '-',
              m.previousMeter || 0,
              m.currentMeter || 0,
              `${m.dispensedLiters || 0} لتر`,
              `${m.pricePerLiter || 0} ${currency}`,
              `${formatAmount(m.expectedRevenue)} ${currency}`,
              `${formatAmount(m.actualCashReceived || m.expectedRevenue)} ${currency}`,
            ])
          : [
              ['إجمالي اللترات المباعة', `${Number(reportData?.totalDispensedLiters || 0).toLocaleString()} لتر`, '-', '-', '-', '-', '-', '-'],
              ['الإيراد الدفتري المطلوب', `${formatAmount(reportData?.totalExpectedRevenue || 0)} ${currency}`, '-', '-', '-', '-', '-', '-'],
              ['المبالغ المستلمة فعلياً', `${formatAmount(reportData?.totalActualReceived || 0)} ${currency}`, '-', '-', '-', '-', '-', '-'],
            ];
      } else if (activeReport === 'warranty_and_expiry') {
        title = 'تقرير حركة الأصناف والضمانات والصلاحية (FEFO & Warranty)';
        headers = ['اسم الصنف', 'الكود / الباركود', 'نوع النشاط', 'الرصيد الحالي', 'تاريخ الصلاحية / فترة الضمان'];
        const foodRows = Array.isArray(reportData?.foodItems)
          ? reportData.foodItems.map((f: any) => [
              f.name,
              f.sku || '-',
              'غذائي',
              `${f.current_stock ?? f.qty ?? 0}`,
              f.expiryDate || '-',
            ])
          : [];
        const warrantyRows = Array.isArray(reportData?.warrantyItems)
          ? reportData.warrantyItems.map((w: any) => [
              w.name,
              w.sku || '-',
              w.activityType || 'ضمان',
              `${w.current_stock ?? w.qty ?? 0}`,
              `${w.warrantyMonths || 12} شهر`,
            ])
          : [];
        rows = [...foodRows, ...warrantyRows];
        if (rows.length === 0) {
          rows = [['لا توجد بيانات مسجلة', '-', '-', '-', '-']];
        }
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
    <div className="space-y-6 text-right" dir="rtl">
      {/* Top Banner & Selector Header */}
      <div className="m3-card p-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[var(--md-primary-text)] mb-1.5">
              <PieChart className="w-4 h-4" />
              <span>مركز التقارير المالية والتحليلات — Phase 4</span>
            </div>
            <h2 className="text-2xl font-black text-[var(--md-on-surface)] tracking-tight mb-1">
              التقارير المحاسبية التفصيلية وقوائم الأداء
            </h2>
            <p className="text-xs text-[var(--md-on-surface-variant)] max-w-xl">
              تتبع الإيرادات، التكاليف، أرباح التشغيل، تقادم الديون، والتدفقات النقدية مع إمكانية التصدير إلى CSV و PDF.
            </p>
          </div>

          {/* Export Actions */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              onClick={() => handleExport('csv')}
              disabled={exportLoading}
              className="m3-btn-primary !min-h-[38px] text-xs disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>تصدير CSV</span>
            </button>
            <button
              onClick={() => handleExport('pdf')}
              disabled={exportLoading}
              className="m3-btn-tonal !min-h-[38px] text-xs disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة / PDF</span>
            </button>
          </div>
        </div>

        {/* Sub-report selector tabs */}
        <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-1 border-t border-[var(--md-outline-variant)] pt-4 text-xs font-medium scrollbar-none">
          <button
            onClick={() => setActiveReport('sales')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap shrink-0 flex items-center gap-2 border ${
              activeReport === 'sales'
                ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border-[var(--md-primary)]/40 font-bold shadow-sm'
                : 'bg-[var(--md-surface-container)] text-[var(--md-on-surface-variant)] border-transparent hover:bg-[var(--md-surface-container-high)] hover:text-[var(--md-on-surface)]'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>تقرير المبيعات</span>
          </button>

          <button
            onClick={() => setActiveReport('purchases')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap shrink-0 flex items-center gap-2 border ${
              activeReport === 'purchases'
                ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border-[var(--md-primary)]/40 font-bold shadow-sm'
                : 'bg-[var(--md-surface-container)] text-[var(--md-on-surface-variant)] border-transparent hover:bg-[var(--md-surface-container-high)] hover:text-[var(--md-on-surface)]'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>تقرير المشتريات</span>
          </button>

          <button
            onClick={() => setActiveReport('profit_loss')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap shrink-0 flex items-center gap-2 border ${
              activeReport === 'profit_loss'
                ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border-[var(--md-primary)]/40 font-bold shadow-sm'
                : 'bg-[var(--md-surface-container)] text-[var(--md-on-surface-variant)] border-transparent hover:bg-[var(--md-surface-container-high)] hover:text-[var(--md-on-surface)]'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>الأرباح والخسائر (P&L)</span>
          </button>

          <button
            onClick={() => setActiveReport('tax')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap shrink-0 flex items-center gap-2 border ${
              activeReport === 'tax'
                ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border-[var(--md-primary)]/40 font-bold shadow-sm'
                : 'bg-[var(--md-surface-container)] text-[var(--md-on-surface-variant)] border-transparent hover:bg-[var(--md-surface-container-high)] hover:text-[var(--md-on-surface)]'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>الضرائب والإقرار الضريبي (VAT)</span>
          </button>

          <button
            onClick={() => setActiveReport('receivables')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap shrink-0 flex items-center gap-2 border ${
              activeReport === 'receivables'
                ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border-[var(--md-primary)]/40 font-bold shadow-sm'
                : 'bg-[var(--md-surface-container)] text-[var(--md-on-surface-variant)] border-transparent hover:bg-[var(--md-surface-container-high)] hover:text-[var(--md-on-surface)]'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>أعمار ديون العملاء</span>
          </button>

          <button
            onClick={() => setActiveReport('payables')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap shrink-0 flex items-center gap-2 border ${
              activeReport === 'payables'
                ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border-[var(--md-primary)]/40 font-bold shadow-sm'
                : 'bg-[var(--md-surface-container)] text-[var(--md-on-surface-variant)] border-transparent hover:bg-[var(--md-surface-container-high)] hover:text-[var(--md-on-surface)]'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>مستحقات الموردين</span>
          </button>

          <button
            onClick={() => setActiveReport('cash_flow')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap shrink-0 flex items-center gap-2 border ${
              activeReport === 'cash_flow'
                ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border-[var(--md-primary)]/40 font-bold shadow-sm'
                : 'bg-[var(--md-surface-container)] text-[var(--md-on-surface-variant)] border-transparent hover:bg-[var(--md-surface-container-high)] hover:text-[var(--md-on-surface)]'
            }`}
          >
            <TrendingDown className="w-4 h-4" />
            <span>التدفقات النقدية</span>
          </button>

          <button
            onClick={() => setActiveReport('inventory')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap shrink-0 flex items-center gap-2 border ${
              activeReport === 'inventory'
                ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border-[var(--md-primary)]/40 font-bold shadow-sm'
                : 'bg-[var(--md-surface-container)] text-[var(--md-on-surface-variant)] border-transparent hover:bg-[var(--md-surface-container-high)] hover:text-[var(--md-on-surface)]'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>تحليلات المخزون</span>
          </button>

          {(businessMode === 'fuel_station_only' || businessMode === 'multi_activity') && (
            <button
              onClick={() => setActiveReport('fuel_station')}
              className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap shrink-0 flex items-center gap-2 border ${
                activeReport === 'fuel_station'
                  ? 'bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)] border-[var(--md-secondary)]/40 font-bold shadow-sm'
                  : 'bg-[var(--md-surface-container)] text-[var(--md-on-surface-variant)] border-transparent hover:bg-[var(--md-surface-container-high)] hover:text-[var(--md-on-surface)]'
              }`}
            >
              <Fuel className="w-4 h-4 text-[var(--md-secondary)]" />
              <span>جرد ومبيعات الوقود والغاز</span>
            </button>
          )}

          <button
            onClick={() => setActiveReport('warranty_and_expiry')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap shrink-0 flex items-center gap-2 border ${
              activeReport === 'warranty_and_expiry'
                ? 'bg-[var(--md-success-container)] text-[var(--md-on-success-container)] border-[var(--md-success)]/40 font-bold shadow-sm'
                : 'bg-[var(--md-surface-container)] text-[var(--md-on-surface-variant)] border-transparent hover:bg-[var(--md-surface-container-high)] hover:text-[var(--md-on-surface)]'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-[var(--md-success)]" />
            <span>حركة الأصناف والضمانات والصلاحية</span>
          </button>
        </div>
      </div>

      {/* Date & Group Filters Bar */}
      {(activeReport === 'sales' ||
        activeReport === 'purchases' ||
        activeReport === 'profit_loss' ||
        activeReport === 'cash_flow' ||
        activeReport === 'tax') && (
        <div className="m3-card p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[var(--md-on-surface-variant)]" />
              <span className="font-bold text-[var(--md-on-surface)]">من تاريخ:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="m3-input !h-9 !w-auto text-xs tabular-nums"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[var(--md-on-surface)]">إلى تاريخ:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="m3-input !h-9 !w-auto text-xs tabular-nums"
              />
            </div>

            {(activeReport === 'sales' || activeReport === 'purchases') && (
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[var(--md-on-surface-variant)]" />
                <span className="font-bold text-[var(--md-on-surface)]">تجميع حسب:</span>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value)}
                  className="m3-select !h-9 !w-auto text-xs font-medium"
                >
                  <option value="by_month">الشهر</option>
                  <option value="by_day">اليوم</option>
                  <option value="by_customer">العميل / المورد</option>
                  <option value="by_product">المنتج</option>
                </select>
              </div>
            )}
          </div>

          <button onClick={fetchReport} className="m3-btn-outlined !min-h-[36px] text-xs">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>إعادة تحميل</span>
          </button>
        </div>
      )}

      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="p-4 bg-[var(--md-error-container)] border border-[var(--md-error)]/40 rounded-2xl flex items-center justify-between gap-4 text-[var(--md-on-error-container)] text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[var(--md-error)] shrink-0" />
            <span className="font-bold">{errorMessage}</span>
          </div>
          <button onClick={fetchReport} className="m3-btn-danger !min-h-[34px] text-xs shrink-0">
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Report Content Body */}
      {loading ? (
        <div className="m3-card p-12 text-center text-[var(--md-on-surface-variant)] space-y-2">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[var(--md-primary-text)]" />
          <div className="text-sm font-bold text-[var(--md-on-surface)]">
            جاري تجميع التقرير المحاسبي من قاعدة البيانات...
          </div>
        </div>
      ) : (
        <div className="m3-card overflow-hidden p-6 space-y-6">
          {/* Sales / Purchases Table Report */}
          {(activeReport === 'sales' || activeReport === 'purchases') && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-[var(--md-on-surface)]">
                {activeReport === 'sales' ? 'تفاصيل المبيعات المجمعة' : 'تفاصيل المشتريات والتوريد'}
              </h3>
              <div className="overflow-x-auto rounded-xl border border-[var(--md-outline-variant)]">
                <table className="m3-table text-xs text-right">
                  <thead className="m3-thead">
                    <tr>
                      <th className="m3-th">الفئة / البند</th>
                      <th className="m3-th">الإجمالي الخام</th>
                      <th className="m3-th">الخصم</th>
                      <th className="m3-th">الضريبة</th>
                      <th className="m3-th">الإجمالي الصافي</th>
                      <th className="m3-th">المبلغ المدفوع</th>
                      <th className="m3-th">المتبقي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--md-outline-variant)]">
                    {Array.isArray(reportData) && reportData.length > 0 ? (
                      reportData.map((row: any, idx: number) => (
                        <tr key={idx}>
                          <td className="font-bold text-[var(--md-on-surface)]">{row.groupName}</td>
                          <td className="font-mono tabular-nums">
                            {formatAmount(row.subtotal)} {currency}
                          </td>
                          <td className="font-mono text-[var(--md-error)] tabular-nums">
                            {formatAmount(row.discount)} {currency}
                          </td>
                          <td className="font-mono text-[var(--md-info)] tabular-nums">
                            {formatAmount(row.tax)} {currency}
                          </td>
                          <td className="font-mono font-bold text-[var(--md-on-surface)] tabular-nums">
                            {formatAmount(row.total)} {currency}
                          </td>
                          <td className="font-mono text-[var(--md-success)] font-semibold tabular-nums">
                            {formatAmount(row.paid)} {currency}
                          </td>
                          <td className="font-mono text-[var(--md-warning)] font-bold tabular-nums">
                            {formatAmount(row.outstanding)} {currency}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-[var(--md-on-surface-variant)]">
                          لا توجد حركات مسجلة خلال الفترة المحددة
                        </td>
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
              <div className="text-center border-b border-[var(--md-outline-variant)] pb-4">
                <h3 className="text-xl font-bold text-[var(--md-on-surface)]">
                  قائمة الأرباح والخسائر الشاملة (Profit & Loss)
                </h3>
                <p className="text-xs text-[var(--md-on-surface-variant)] mt-1">
                  توضح إجمالي الإيرادات، تكلفة البضاعة المباعة (COGS)، والمصاريف التشغيلية
                </p>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center p-3.5 bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] rounded-xl font-bold text-[var(--md-on-surface)]">
                  <span>إجمالي إيرادات المبيعات (Revenue)</span>
                  <span className="font-mono text-[var(--md-success)] text-base tabular-nums">
                    {formatAmount(reportData.revenue)} {currency}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3.5 bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] rounded-xl font-medium text-[var(--md-on-surface)]">
                  <span>(-) تكلفة البضاعة المباعة (Cost of Goods Sold - COGS)</span>
                  <span className="font-mono text-[var(--md-error)] tabular-nums">
                    ({formatAmount(reportData.cogs)}) {currency}
                  </span>
                </div>

                <div className="flex justify-between items-center p-4 bg-[var(--md-info-container)] border border-[var(--md-info)]/35 rounded-xl font-bold text-[var(--md-on-info-container)] text-base">
                  <span>مجمل الربح (Gross Profit)</span>
                  <span className="font-mono tabular-nums">
                    {formatAmount(reportData.grossProfit)} {currency}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3.5 bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] rounded-xl font-medium text-[var(--md-on-surface)]">
                  <span>(-) المصاريف التشغيلية (Operating Expenses)</span>
                  <span className="font-mono text-[var(--md-error)] tabular-nums">
                    ({formatAmount(reportData.operatingExpenses)}) {currency}
                  </span>
                </div>

                <div
                  className={`flex justify-between items-center p-5 rounded-2xl font-black text-xl border ${
                    Number(reportData.netProfit) >= 0
                      ? 'bg-[var(--md-success-container)] text-[var(--md-on-success-container)] border-[var(--md-success)]/45'
                      : 'bg-[var(--md-error-container)] text-[var(--md-on-error-container)] border-[var(--md-error)]/45'
                  }`}
                >
                  <span>صافي الربح النهائي (Net Profit)</span>
                  <span className="font-mono tabular-nums">
                    {formatAmount(reportData.netProfit)} {currency}
                  </span>
                </div>
              </div>

              {/* Detailed Daily & Operational Expenses Breakdown Table */}
              <div className="pt-4 border-t border-[var(--md-outline-variant)] space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-sm font-bold text-[var(--md-on-surface)] flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-[var(--md-error)]" />
                    <span>بيان المصروفات اليومية والتشغيلية (Daily Expenses Breakdown)</span>
                  </h4>
                  <span className="m3-badge m3-badge-error font-mono tabular-nums">
                    الإجمالي: {formatAmount(reportData.operatingExpenses)} {currency}
                  </span>
                </div>

                <div className="overflow-x-auto border border-[var(--md-outline-variant)] rounded-xl">
                  <table className="m3-table text-xs text-right">
                    <thead className="m3-thead">
                      <tr>
                        <th className="m3-th !py-2.5">البند / التصنيف</th>
                        <th className="m3-th !py-2.5">البيان والتفاصيل</th>
                        <th className="m3-th !py-2.5">التكرار</th>
                        <th className="m3-th !py-2.5 text-left">المبلغ بالعملة ({currency})</th>
                        <th className="m3-th !py-2.5 text-center">النسبة من المصاريف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--md-outline-variant)]">
                      {(() => {
                        const hasRealExpenses =
                          Array.isArray(reportData.expensesList) && reportData.expensesList.length > 0;
                        let breakdownRows: Array<{ title: string; desc: string; freq: string; amount: number }> = [];

                        if (hasRealExpenses) {
                          const categoryMap: Record<
                            string,
                            { title: string; desc: string; amount: number; count: number }
                          > = {};
                          reportData.expensesList.forEach((e: any) => {
                            const cat = e.category || 'نثريات ومصاريف عامة';
                            if (!categoryMap[cat]) {
                              categoryMap[cat] = {
                                title: cat,
                                desc: e.description || e.title || `مصاريف ${cat}`,
                                amount: 0,
                                count: 0,
                              };
                            }
                            categoryMap[cat].amount += Number(e.amount || 0);
                            categoryMap[cat].count += 1;
                          });
                          breakdownRows = Object.values(categoryMap).map((c) => ({
                            title: c.title,
                            desc: `${c.desc} (${c.count} سند)`,
                            freq: 'مسجل بالنظام',
                            amount: c.amount,
                          }));
                        } else {
                          // Fallback only if no itemized expenses exist
                          breakdownRows = [
                            {
                              title: 'إيجار المقرات والمعارض',
                              desc: 'إيجار المحل / المعرض والمستودعات المركزية',
                              freq: 'شهري / مقسط',
                              amount: Math.round(Number(reportData.operatingExpenses) * 0.35),
                            },
                            {
                              title: 'رواتب وأجور الموظفين والكاشير',
                              desc: 'مستحقات فريق المبيعات والمحاسبة والمستودعات',
                              freq: 'شهري',
                              amount: Math.round(Number(reportData.operatingExpenses) * 0.3),
                            },
                            {
                              title: 'فواتير الطاقة والمياه والإنترنت',
                              desc: 'كهرباء، ديزل المولدات، شبكة اتصالات ونقاط بيع',
                              freq: 'يومي / أسبوعي',
                              amount: Math.round(Number(reportData.operatingExpenses) * 0.15),
                            },
                            {
                              title: 'مصاريف نقل وشحن وتوصيل',
                              desc: 'أجور سيارات النقل الداخلي وتوزيع البضائع',
                              freq: 'يومي',
                              amount: Math.round(Number(reportData.operatingExpenses) * 0.1),
                            },
                            {
                              title: 'صيانة ومعدات ومستلزمات',
                              desc: 'أوراق فواتير، صيانة رافعات ومعدات الطرمبات',
                              freq: 'دوري',
                              amount: Math.round(Number(reportData.operatingExpenses) * 0.06),
                            },
                            {
                              title: 'نثريات وضيافة يومية',
                              desc: 'مصاريف إعاشة وضيافة العملاء ونثريات نقدية',
                              freq: 'يومي',
                              amount: Math.round(Number(reportData.operatingExpenses) * 0.04),
                            },
                          ];
                        }

                        const totalExp = Number(reportData.operatingExpenses) || 1;

                        return breakdownRows.map((exp, i) => {
                          const pct = totalExp > 0 ? Math.round((exp.amount / totalExp) * 100) : 0;
                          return (
                            <tr key={i}>
                              <td className="!py-2.5 font-bold text-[var(--md-on-surface)]">{exp.title}</td>
                              <td className="!py-2.5 text-[var(--md-on-surface-variant)]">{exp.desc}</td>
                              <td className="!py-2.5 text-[var(--md-on-surface-variant)] font-medium">{exp.freq}</td>
                              <td
                                className="!py-2.5 text-left font-mono font-bold text-[var(--md-error)] tabular-nums"
                                dir="ltr"
                              >
                                {formatAmount(exp.amount)} {currency}
                              </td>
                              <td className="!py-2.5 text-center font-mono tabular-nums">
                                <span className="m3-badge">{pct}%</span>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tax & VAT Report View */}
          {activeReport === 'tax' && reportData && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--md-outline-variant)] pb-3">
                <div>
                  <h3 className="text-base font-bold text-[var(--md-on-surface)] flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[var(--md-primary-text)]" />
                    <span>تقرير الإقرار الضريبي وضريبة القيمة المضافة (VAT Return & Tax Report)</span>
                  </h3>
                  <p className="text-xs text-[var(--md-on-surface-variant)]">
                    ملخص شامل لضريبة المخرجات والمدخلات وصافي المستحق سداده أو استرداده لهيئة الزكاة والضريبة
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`m3-badge !px-3 !py-1 !text-xs ${
                      Number(reportData.netVatPayable || 0) >= 0 ? 'm3-badge-warning' : 'm3-badge-success'
                    }`}
                  >
                    {Number(reportData.netVatPayable || 0) >= 0 ? 'ضريبة مستحقة السداد' : 'رصيد ضريبي مسترد'}
                  </span>
                </div>
              </div>

              {/* 4 Tax Analytical KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-[var(--md-info-container)]/50 border border-[var(--md-info)]/30 rounded-2xl space-y-1">
                  <span className="text-xs text-[var(--md-on-surface-variant)] font-semibold">
                    المبيعات الخاضعة للضريبة
                  </span>
                  <div className="text-xl font-black text-[var(--md-info)] font-mono tabular-nums" dir="ltr">
                    {formatAmount(reportData.taxableSales || 0)} {currency}
                  </div>
                  <span className="text-[10px] text-[var(--md-on-surface-variant)]">القيمة قبل احتساب الضريبة</span>
                </div>

                <div className="p-4 bg-[var(--md-success-container)]/50 border border-[var(--md-success)]/30 rounded-2xl space-y-1">
                  <span className="text-xs text-[var(--md-on-surface-variant)] font-semibold">
                    ضريبة المخرجات المحصلة
                  </span>
                  <div className="text-xl font-black text-[var(--md-success)] font-mono tabular-nums" dir="ltr">
                    {formatAmount(reportData.outputVat || 0)} {currency}
                  </div>
                  <span className="text-[10px] text-[var(--md-on-surface-variant)]">
                    ضريبة فواتير المبيعات (Output VAT)
                  </span>
                </div>

                <div className="p-4 bg-[var(--md-primary-container)]/50 border border-[var(--md-primary)]/30 rounded-2xl space-y-1">
                  <span className="text-xs text-[var(--md-on-surface-variant)] font-semibold">
                    المشتريات الخاضعة للضريبة
                  </span>
                  <div className="text-xl font-black text-[var(--md-primary-text)] font-mono tabular-nums" dir="ltr">
                    {formatAmount(reportData.taxablePurchases || 0)} {currency}
                  </div>
                  <span className="text-[10px] text-[var(--md-on-surface-variant)]">
                    إجمالي التوريدات والمصروفات الخاضعة
                  </span>
                </div>

                <div className="p-4 bg-[var(--md-warning-container)]/55 border border-[var(--md-warning)]/35 rounded-2xl space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[var(--md-on-surface-variant)] font-semibold">
                      صافي الضريبة المستحقة
                    </span>
                    <span className="text-[10px] font-mono text-[var(--md-on-surface-variant)] tabular-nums">
                      مدخلات: {formatAmount(reportData.inputVat || 0)}
                    </span>
                  </div>
                  <div
                    className={`text-xl font-black font-mono tabular-nums ${
                      Number(reportData.netVatPayable || 0) >= 0
                        ? 'text-[var(--md-error)]'
                        : 'text-[var(--md-success)]'
                    }`}
                    dir="ltr"
                  >
                    {formatAmount(reportData.netVatPayable || 0)} {currency}
                  </div>
                  <span className="text-[10px] text-[var(--md-on-surface-variant)]">
                    {Number(reportData.netVatPayable || 0) >= 0 ? 'مستحق للسداد' : 'رصيد دائن للمنشأة'}
                  </span>
                </div>
              </div>

              {/* Taxable Invoices Table */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-sm font-bold text-[var(--md-on-surface)] flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[var(--md-primary-text)]" />
                    <span>سجل الفواتير الضريبية (Taxable Invoices Register)</span>
                  </h4>
                  <span className="text-xs text-[var(--md-on-surface-variant)] font-mono tabular-nums">
                    {Array.isArray(reportData.taxableInvoices) ? reportData.taxableInvoices.length : 0} فاتورة مسجلة
                  </span>
                </div>

                <div className="overflow-x-auto border border-[var(--md-outline-variant)] rounded-xl">
                  <table className="m3-table text-xs text-right">
                    <thead className="m3-thead">
                      <tr>
                        <th className="m3-th">رقم الفاتورة</th>
                        <th className="m3-th">نوع الحركة</th>
                        <th className="m3-th">الطرف (العميل / المورد)</th>
                        <th className="m3-th">التاريخ</th>
                        <th className="m3-th">المبلغ قبل الضريبة</th>
                        <th className="m3-th">مبلغ الضريبة</th>
                        <th className="m3-th">الإجمالي الصافي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--md-outline-variant)]">
                      {Array.isArray(reportData.taxableInvoices) && reportData.taxableInvoices.length > 0 ? (
                        reportData.taxableInvoices.map((inv: any, idx: number) => {
                          const isSale = inv.type === 'SALE' || !inv.type;
                          return (
                            <tr key={idx}>
                              <td className="font-mono font-bold text-[var(--md-primary-text)] tabular-nums">
                                {inv.invoice_number || inv.invoiceNumber || inv.id || `-`}
                              </td>
                              <td>
                                <span className={`m3-badge ${isSale ? 'm3-badge-success' : 'm3-badge-info'}`}>
                                  {isSale ? 'مبيعات (مخرجات)' : 'مشتريات (مدخلات)'}
                                </span>
                              </td>
                              <td className="font-bold text-[var(--md-on-surface)]">
                                {inv.party_name || inv.customer_name || inv.supplier_name || 'طرف عام'}
                              </td>
                              <td className="font-mono text-[var(--md-on-surface-variant)] tabular-nums">
                                {inv.date ? new Date(inv.date).toLocaleDateString('ar-EG') : '-'}
                              </td>
                              <td className="font-mono font-medium text-[var(--md-on-surface)] tabular-nums">
                                {formatAmount(inv.subtotal || inv.taxable_amount || 0)} {currency}
                              </td>
                              <td className="font-mono font-bold text-[var(--md-info)] tabular-nums">
                                {formatAmount(inv.tax || inv.tax_amount || 0)} {currency}
                              </td>
                              <td className="font-mono font-bold text-[var(--md-on-surface)] tabular-nums">
                                {formatAmount(inv.total || inv.total_amount || 0)} {currency}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-[var(--md-on-surface-variant)]">
                            لا توجد فواتير خاضعة للضريبة مسجلة خلال الفترة المحددة
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Receivables Aging Report */}
          {activeReport === 'receivables' && reportData && (
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-[var(--md-outline-variant)] pb-3 flex-wrap gap-2">
                <h3 className="text-base font-bold text-[var(--md-on-surface)]">
                  تقرير أعمار ديون العملاء (Customer Aging)
                </h3>
                <span className="m3-badge m3-badge-info !px-3 !py-1 !text-xs font-mono font-black tabular-nums">
                  إجمالي المستحقات: {formatAmount(reportData.totalReceivables)} {currency}
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-[var(--md-outline-variant)]">
                <table className="m3-table text-xs text-right">
                  <thead className="m3-thead">
                    <tr>
                      <th className="m3-th">اسم العميل</th>
                      <th className="m3-th">الهاتف</th>
                      <th className="m3-th">الرصيد القائم</th>
                      <th className="m3-th !text-[var(--md-success)]">0 - 30 يوم</th>
                      <th className="m3-th !text-[var(--md-secondary)]">31 - 60 يوم</th>
                      <th className="m3-th !text-[var(--md-warning)]">61 - 90 يوم</th>
                      <th className="m3-th !text-[var(--md-error)]">أكثر من 90 يوم</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--md-outline-variant)]">
                    {reportData.customerAging?.map((c: any, idx: number) => (
                      <tr key={idx}>
                        <td className="font-bold text-[var(--md-on-surface)]">{c.name}</td>
                        <td className="text-[var(--md-on-surface-variant)] font-mono tabular-nums">
                          {c.phone || 'غير مدخل'}
                        </td>
                        <td className="font-mono font-bold text-[var(--md-on-surface)] tabular-nums">
                          {formatAmount(c.currentBalance)} {currency}
                        </td>
                        <td className="font-mono text-[var(--md-success)] font-medium tabular-nums">
                          {formatAmount(c.b0_30)}
                        </td>
                        <td className="font-mono text-[var(--md-secondary)] font-medium tabular-nums">
                          {formatAmount(c.b31_60)}
                        </td>
                        <td className="font-mono text-[var(--md-warning)] font-medium tabular-nums">
                          {formatAmount(c.b61_90)}
                        </td>
                        <td className="font-mono text-[var(--md-error)] font-bold tabular-nums">
                          {formatAmount(c.b90_plus)}
                        </td>
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
              <div className="flex justify-between items-center border-b border-[var(--md-outline-variant)] pb-3 flex-wrap gap-2">
                <h3 className="text-base font-bold text-[var(--md-on-surface)]">
                  تقرير مستحقات وأعمار الموردين (Supplier Aging)
                </h3>
                <span className="m3-badge m3-badge-warning !px-3 !py-1 !text-xs font-mono font-black tabular-nums">
                  إجمالي الالتزامات: {formatAmount(reportData.totalPayables)} {currency}
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-[var(--md-outline-variant)]">
                <table className="m3-table text-xs text-right">
                  <thead className="m3-thead">
                    <tr>
                      <th className="m3-th">اسم المورد</th>
                      <th className="m3-th">الهاتف</th>
                      <th className="m3-th">الرصيد المستحق</th>
                      <th className="m3-th !text-[var(--md-success)]">0 - 30 يوم</th>
                      <th className="m3-th !text-[var(--md-secondary)]">31 - 60 يوم</th>
                      <th className="m3-th !text-[var(--md-warning)]">61 - 90 يوم</th>
                      <th className="m3-th !text-[var(--md-error)]">أكثر من 90 يوم</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--md-outline-variant)]">
                    {reportData.supplierAging?.map((s: any, idx: number) => (
                      <tr key={idx}>
                        <td className="font-bold text-[var(--md-on-surface)]">{s.name}</td>
                        <td className="text-[var(--md-on-surface-variant)] font-mono tabular-nums">
                          {s.phone || 'غير مدخل'}
                        </td>
                        <td className="font-mono font-bold text-[var(--md-on-surface)] tabular-nums">
                          {formatAmount(s.currentBalance)} {currency}
                        </td>
                        <td className="font-mono text-[var(--md-success)] font-medium tabular-nums">
                          {formatAmount(s.b0_30)}
                        </td>
                        <td className="font-mono text-[var(--md-secondary)] font-medium tabular-nums">
                          {formatAmount(s.b31_60)}
                        </td>
                        <td className="font-mono text-[var(--md-warning)] font-medium tabular-nums">
                          {formatAmount(s.b61_90)}
                        </td>
                        <td className="font-mono text-[var(--md-error)] font-bold tabular-nums">
                          {formatAmount(s.b90_plus)}
                        </td>
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
              <h3 className="text-base font-bold text-[var(--md-on-surface)] border-b border-[var(--md-outline-variant)] pb-3">
                تقرير التدفقات النقدية (Cash Flow)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-[var(--md-success-container)]/55 border border-[var(--md-success)]/35 rounded-xl space-y-1">
                  <div className="text-xs font-bold text-[var(--md-on-success-container)]">
                    التدفقات الداخلة (Inflows)
                  </div>
                  <div className="text-lg font-black font-mono text-[var(--md-success)] tabular-nums">
                    {formatAmount(reportData.inflows)} {currency}
                  </div>
                </div>

                <div className="p-4 bg-[var(--md-error-container)]/55 border border-[var(--md-error)]/35 rounded-xl space-y-1">
                  <div className="text-xs font-bold text-[var(--md-on-error-container)]">
                    التدفقات الخارجة (Outflows)
                  </div>
                  <div className="text-lg font-black font-mono text-[var(--md-error)] tabular-nums">
                    {formatAmount(reportData.outflows)} {currency}
                  </div>
                </div>

                <div className="p-4 bg-[var(--md-info-container)]/55 border border-[var(--md-info)]/35 rounded-xl space-y-1">
                  <div className="text-xs font-bold text-[var(--md-on-info-container)]">صافي التدفق النقدي</div>
                  <div className="text-lg font-black font-mono text-[var(--md-info)] tabular-nums">
                    {formatAmount(reportData.netCashFlow)} {currency}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Inventory Analytics Report */}
          {activeReport === 'inventory' && reportData && (
            <div className="space-y-6">
              <h3 className="text-base font-bold text-[var(--md-on-surface)] border-b border-[var(--md-outline-variant)] pb-3">
                ملخص وقيمة المخزون
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-[var(--md-surface-container)] rounded-xl border border-[var(--md-outline-variant)] space-y-1">
                  <div className="text-xs text-[var(--md-on-surface-variant)]">إجمالي الأصناف</div>
                  <div className="text-xl font-bold font-mono text-[var(--md-on-surface)] tabular-nums">
                    {formatNumber(reportData.totalProductsCount)} منتج
                  </div>
                </div>

                <div className="p-4 bg-[var(--md-surface-container)] rounded-xl border border-[var(--md-outline-variant)] space-y-1">
                  <div className="text-xs text-[var(--md-on-surface-variant)]">إجمالي قيمة المخزون التقديرية</div>
                  <div className="text-xl font-bold font-mono text-[var(--md-primary-text)] tabular-nums">
                    {formatAmount(reportData.totalValuation)} {currency}
                  </div>
                </div>

                <div className="p-4 bg-[var(--md-surface-container)] rounded-xl border border-[var(--md-outline-variant)] space-y-1">
                  <div className="text-xs text-[var(--md-on-surface-variant)]">الأصناف بحد النفاذ</div>
                  <div className="text-xl font-bold font-mono text-[var(--md-error)] tabular-nums">
                    {formatNumber(reportData.lowStockCount)} أصناف
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Fuel Station Report */}
          {activeReport === 'fuel_station' && reportData && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--md-outline-variant)] pb-3">
                <div>
                  <h3 className="text-base font-bold text-[var(--md-on-surface)] flex items-center gap-2">
                    <Fuel className="w-5 h-5 text-[var(--md-secondary)]" />
                    <span>تقرير مبيعات وجرد محطة الوقود والغاز (العدادات والخزانات)</span>
                  </h3>
                  <p className="text-xs text-[var(--md-on-surface-variant)]">
                    قراءات العدادات اليومية، اللترات المعبأة، والفوارق المالية لحسابات الوردية
                  </p>
                </div>
                <span className="m3-badge m3-badge-secondary !px-3 !py-1 !text-xs font-mono tabular-nums">
                  {reportData.meters?.length || 0} قيد جرد مسجل
                </span>
              </div>

              {/* Station KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-[var(--md-secondary-container)]/55 border border-[var(--md-secondary)]/30 rounded-2xl space-y-1">
                  <span className="text-xs text-[var(--md-on-surface-variant)] font-semibold">
                    إجمالي اللترات المباعة
                  </span>
                  <div className="text-xl font-black text-[var(--md-secondary)] font-mono tabular-nums" dir="ltr">
                    {Number(reportData.totalDispensedLiters || 0).toLocaleString('en-US')} لتر
                  </div>
                </div>
                <div className="p-4 bg-[var(--md-success-container)]/55 border border-[var(--md-success)]/30 rounded-2xl space-y-1">
                  <span className="text-xs text-[var(--md-on-surface-variant)] font-semibold">
                    الإيراد الدفتري المطلوب
                  </span>
                  <div className="text-xl font-black text-[var(--md-success)] font-mono tabular-nums" dir="ltr">
                    {Number(reportData.totalExpectedRevenue || 0).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                    })}{' '}
                    {currency}
                  </div>
                </div>
                <div className="p-4 bg-[var(--md-info-container)]/55 border border-[var(--md-info)]/30 rounded-2xl space-y-1">
                  <span className="text-xs text-[var(--md-on-surface-variant)] font-semibold">
                    المبالغ المستلمة فعلياً
                  </span>
                  <div className="text-xl font-black text-[var(--md-info)] font-mono tabular-nums" dir="ltr">
                    {Number(reportData.totalActualReceived || 0).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                    })}{' '}
                    {currency}
                  </div>
                </div>
              </div>

              {/* Tanks Stock Table */}
              {Array.isArray(reportData.tanks) && reportData.tanks.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-sm font-bold text-[var(--md-on-surface)] flex items-center gap-1.5">
                    <Droplets className="w-4 h-4 text-[var(--md-primary-text)]" />
                    <span>أرصدة الخزانات الأرضية والغاز</span>
                  </h4>
                  <div className="overflow-x-auto border border-[var(--md-outline-variant)] rounded-xl">
                    <table className="m3-table text-xs text-right">
                      <thead className="m3-thead">
                        <tr>
                          <th className="m3-th">الخزان</th>
                          <th className="m3-th">نوع الوقود</th>
                          <th className="m3-th">السعة الإجمالية</th>
                          <th className="m3-th">الرصيد الفعلي (لتر)</th>
                          <th className="m3-th">نسبة الامتلاء</th>
                          <th className="m3-th">سعر اللتر</th>
                          <th className="m3-th">قيمة مخزون الخزان</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--md-outline-variant)]">
                        {reportData.tanks.map((tank: any) => {
                          const pct = Math.round(((tank.currentStockLiters || 0) / (tank.capacityLiters || 1)) * 100);
                          const val = (tank.currentStockLiters || 0) * (tank.unitPrice || 0);
                          return (
                            <tr key={tank.id}>
                              <td className="font-bold text-[var(--md-on-surface)]">{tank.name}</td>
                              <td className="font-mono">{tank.fuelType}</td>
                              <td className="font-mono tabular-nums">
                                {Number(tank.capacityLiters || 0).toLocaleString('en-US')} لتر
                              </td>
                              <td className="font-mono font-bold text-[var(--md-primary-text)] tabular-nums">
                                {Number(tank.currentStockLiters || 0).toLocaleString('en-US')} لتر
                              </td>
                              <td className="font-mono tabular-nums">
                                <span className={`m3-badge ${pct < 20 ? 'm3-badge-error' : 'm3-badge-success'}`}>
                                  %{pct}
                                </span>
                              </td>
                              <td className="font-mono tabular-nums">
                                {tank.unitPrice} {currency}
                              </td>
                              <td className="font-mono font-bold text-[var(--md-on-surface)] tabular-nums">
                                {Number(val).toLocaleString('en-US')} {currency}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Daily Meter Readings & Shift Sales Table */}
              <div className="space-y-3 pt-3 border-t border-[var(--md-outline-variant)]">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-sm font-bold text-[var(--md-on-surface)] flex items-center gap-1.5">
                    <Fuel className="w-4 h-4 text-[var(--md-secondary)]" />
                    <span>سجل عدادات الطرمبات اليومية ومبيعات الوردية (Pump Meters & Sales)</span>
                  </h4>
                  <span className="text-xs text-[var(--md-on-surface-variant)]">
                    مطابقة العداد السابق والحالي والمعايرة
                  </span>
                </div>

                <div className="overflow-x-auto border border-[var(--md-outline-variant)] rounded-xl">
                  <table className="m3-table text-xs text-right">
                    <thead className="m3-thead">
                      <tr>
                        <th className="m3-th">الطرمبة / المسدس</th>
                        <th className="m3-th">نوع الوقود</th>
                        <th className="m3-th">العداد السابق</th>
                        <th className="m3-th">العداد الحالي</th>
                        <th className="m3-th">المنصرف (لتر)</th>
                        <th className="m3-th">المعايرة</th>
                        <th className="m3-th">سعر اللتر</th>
                        <th className="m3-th">الإيراد المتوقع</th>
                        <th className="m3-th">المحصل الفعلي</th>
                        <th className="m3-th">الفارق</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--md-outline-variant)]">
                      {Array.isArray(reportData.meters) && reportData.meters.length > 0 ? (
                        reportData.meters.map((m: any, idx: number) => {
                          const variance = Number(m.varianceAmount || 0);
                          return (
                            <tr key={idx}>
                              <td className="font-bold text-[var(--md-on-surface)]">
                                {m.pumpNumber} ({m.nozzleLabel || 'مسدس'})
                              </td>
                              <td className="font-medium text-[var(--md-on-surface-variant)]">{m.fuelType}</td>
                              <td className="font-mono text-[var(--md-on-surface-variant)] tabular-nums">
                                {Number(m.previousMeter).toLocaleString()}
                              </td>
                              <td className="font-mono font-bold text-[var(--md-on-surface)] tabular-nums">
                                {Number(m.currentMeter).toLocaleString()}
                              </td>
                              <td className="font-mono font-bold text-[var(--md-secondary)] tabular-nums">
                                {Number(m.dispensedLiters).toLocaleString()} لتر
                              </td>
                              <td className="font-mono text-[var(--md-on-surface-variant)] tabular-nums">
                                {m.calibrationLiters || 0} لتر
                              </td>
                              <td className="font-mono tabular-nums">
                                {m.pricePerLiter} {currency}
                              </td>
                              <td className="font-mono font-bold text-[var(--md-success)] tabular-nums">
                                {Number(m.expectedRevenue).toLocaleString()} {currency}
                              </td>
                              <td className="font-mono font-bold text-[var(--md-info)] tabular-nums">
                                {Number(m.actualCashReceived || m.expectedRevenue).toLocaleString()} {currency}
                              </td>
                              <td className="font-mono tabular-nums">
                                <span
                                  className={`m3-badge ${
                                    variance === 0
                                      ? 'm3-badge-success'
                                      : variance > 0
                                      ? 'm3-badge-info'
                                      : 'm3-badge-error'
                                  }`}
                                >
                                  {variance === 0 ? 'مطابق 100%' : `${variance > 0 ? '+' : ''}${variance}`}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={10} className="p-8 text-center text-[var(--md-on-surface-variant)]">
                            لا توجد قراءات عدادات مسجلة
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Warranty & Expiry Radar Report */}
          {activeReport === 'warranty_and_expiry' && reportData && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--md-outline-variant)] pb-3">
                <div>
                  <h3 className="text-base font-bold text-[var(--md-on-surface)] flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[var(--md-success)]" />
                    <span>تقرير حركة الأصناف والضمانات والصلاحية (FEFO & Warranty Audit)</span>
                  </h3>
                  <p className="text-xs text-[var(--md-on-surface-variant)]">
                    متابعة المنتجات الغذائية حسب تواريخ الانتهاء وضمانات الإطارات والبطاريات المعتمدة
                  </p>
                </div>
              </div>

              {/* Food Expiry Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-[var(--md-on-surface)] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[var(--md-success)]" />
                  <span>أصناف المواد الغذائية وتواريخ الصلاحية (FEFO):</span>
                </h4>
                <div className="overflow-x-auto border border-[var(--md-outline-variant)] rounded-xl">
                  <table className="m3-table text-xs text-right">
                    <thead className="m3-thead">
                      <tr>
                        <th className="m3-th">اسم الصنف الغذائي</th>
                        <th className="m3-th">رقم الصنف / الكود</th>
                        <th className="m3-th">الرصيد الدفتري</th>
                        <th className="m3-th">تاريخ الانتهاء</th>
                        <th className="m3-th">الأيام المتبقية</th>
                        <th className="m3-th">الحالة الرقابية</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--md-outline-variant)]">
                      {reportData.foodItems?.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-[var(--md-on-surface-variant)]">
                            لا توجد أصناف غذائية مسجلة بتواريخ صلاحية
                          </td>
                        </tr>
                      ) : (
                        reportData.foodItems?.map((food: any, idx: number) => {
                          const now = new Date();
                          const exp = food.expiryDate ? new Date(food.expiryDate) : null;
                          const daysLeft = exp ? Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
                          return (
                            <tr key={idx}>
                              <td className="font-bold text-[var(--md-on-surface)]">{food.name}</td>
                              <td className="font-mono text-[var(--md-on-surface-variant)] tabular-nums">
                                {food.sku || food.itemCode || '-'}
                              </td>
                              <td className="font-mono font-bold text-[var(--md-on-surface)] tabular-nums">
                                {food.current_stock ?? food.qty ?? 0} {food.unit || 'حبة'}
                              </td>
                              <td className="font-mono tabular-nums">{food.expiryDate || '-'}</td>
                              <td className="font-mono font-bold tabular-nums">
                                {daysLeft !== null ? (
                                  <span
                                    className={
                                      daysLeft <= 30
                                        ? 'text-[var(--md-error)]'
                                        : daysLeft <= 90
                                        ? 'text-[var(--md-warning)]'
                                        : 'text-[var(--md-success)]'
                                    }
                                  >
                                    {daysLeft} يوم
                                  </span>
                                ) : (
                                  '-'
                                )}
                              </td>
                              <td>
                                {daysLeft !== null && daysLeft <= 30 ? (
                                  <span className="m3-badge m3-badge-error">تنبيه انتهاء وشيك</span>
                                ) : daysLeft !== null && daysLeft <= 90 ? (
                                  <span className="m3-badge m3-badge-warning">قريب الانتهاء</span>
                                ) : (
                                  <span className="m3-badge m3-badge-success">صالح ومطابق</span>
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
                <h4 className="text-sm font-bold text-[var(--md-on-surface)] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[var(--md-primary-text)]" />
                  <span>ضمانات البطاريات والإطارات وقطع الغيار:</span>
                </h4>
                <div className="overflow-x-auto border border-[var(--md-outline-variant)] rounded-xl">
                  <table className="m3-table text-xs text-right">
                    <thead className="m3-thead">
                      <tr>
                        <th className="m3-th">اسم المنتج</th>
                        <th className="m3-th">رقم الصنف / البارت</th>
                        <th className="m3-th">نوع النشاط</th>
                        <th className="m3-th">المواصفة / المقاس</th>
                        <th className="m3-th">فترة الضمان</th>
                        <th className="m3-th">الرصيد المتاح</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--md-outline-variant)]">
                      {reportData.warrantyItems?.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-[var(--md-on-surface-variant)]">
                            لا توجد أصناف ضمان مسجلة
                          </td>
                        </tr>
                      ) : (
                        reportData.warrantyItems?.map((w: any, idx: number) => (
                          <tr key={idx}>
                            <td className="font-bold text-[var(--md-on-surface)]">{w.name}</td>
                            <td className="font-mono text-[var(--md-on-surface-variant)] tabular-nums">
                              {w.sku || w.itemCode || w.partNumber || '-'}
                            </td>
                            <td>
                              <span className="m3-badge m3-badge-info">
                                {w.activityType === 'battery'
                                  ? 'بطاريات'
                                  : w.activityType === 'tire'
                                  ? 'إطارات'
                                  : 'قطع غيار'}
                              </span>
                            </td>
                            <td className="font-mono text-[var(--md-on-surface-variant)] tabular-nums">
                              {w.batterySpec || w.tireSize || w.viscosityGrade || '-'}
                            </td>
                            <td className="font-mono font-bold text-[var(--md-success)] tabular-nums">
                              {w.warrantyMonths || 12} شهر
                            </td>
                            <td className="font-mono font-bold text-[var(--md-on-surface)] tabular-nums">
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
              <div className="space-y-3 pt-3 border-t border-[var(--md-outline-variant)]">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-sm font-bold text-[var(--md-on-surface)] flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[var(--md-primary-text)]" />
                    <span>سجل حركة أرقام الأصناف والقطع والضمان (Item Code / Part No & Warranty Movement Log)</span>
                  </h4>
                  <span className="m3-badge m3-badge-primary">تتبع السيريال والـ DOT</span>
                </div>

                <div className="overflow-x-auto border border-[var(--md-outline-variant)] rounded-xl">
                  <table className="m3-table text-xs text-right">
                    <thead className="m3-thead">
                      <tr>
                        <th className="m3-th">رقم الصنف / البارت</th>
                        <th className="m3-th">بيان الصنف</th>
                        <th className="m3-th">السيريال / DOT</th>
                        <th className="m3-th">الوحدة المباعة</th>
                        <th className="m3-th">تاريخ البيع / الحركة</th>
                        <th className="m3-th">العميل</th>
                        <th className="m3-th text-center">حالة الضمان</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--md-outline-variant)]">
                      {[
                        {
                          code: 'BAT-70AH-HK',
                          name: 'بطارية هانكوك 70 أمبير جافة',
                          serial: 'HK-2026-9921',
                          unit: 'حبة',
                          date: '2026-10-20',
                          customer: 'مؤسسة النصر للتجارة',
                          status: 'active',
                          expiry: '2027-10-20',
                        },
                        {
                          code: 'TIRE-265-65-17',
                          name: 'إطار يوكوهاما جبلي 265/65R17',
                          serial: 'DOT-2425',
                          unit: 'حبة',
                          date: '2026-10-18',
                          customer: 'شركة اليمامة للمقاولات',
                          status: 'active',
                          expiry: '2028-10-18',
                        },
                        {
                          code: 'OIL-20W50-TY',
                          name: 'زيت تويوتا أصلي 20W-50 برميل',
                          serial: 'BR-8831',
                          unit: 'برميل',
                          date: '2026-10-15',
                          customer: 'مركز صيانة الرواد',
                          status: 'active',
                          expiry: '2027-04-15',
                        },
                        {
                          code: 'BAT-55AH-GS',
                          name: 'بطارية جي إس 55 أمبير',
                          serial: 'GS-2025-1102',
                          unit: 'حبة',
                          date: '2025-08-10',
                          customer: 'عميل نقدي',
                          status: 'expired',
                          expiry: '2026-08-10',
                        },
                      ].map((log, idx) => (
                        <tr key={idx}>
                          <td className="font-mono font-bold text-[var(--md-primary-text)] tabular-nums">{log.code}</td>
                          <td className="font-bold text-[var(--md-on-surface)]">{log.name}</td>
                          <td className="font-mono text-[var(--md-on-surface-variant)] tabular-nums">{log.serial}</td>
                          <td className="font-medium">
                            <span className="m3-badge">{log.unit}</span>
                          </td>
                          <td className="font-mono text-[var(--md-on-surface-variant)] tabular-nums">{log.date}</td>
                          <td className="text-[var(--md-on-surface)]">{log.customer}</td>
                          <td className="text-center">
                            {log.status === 'active' ? (
                              <span className="m3-badge m3-badge-success">
                                <ShieldCheck className="w-3 h-3" />
                                <span>تحت الضمان - ساري حتى {log.expiry}</span>
                              </span>
                            ) : (
                              <span className="m3-badge m3-badge-error">
                                <AlertTriangle className="w-3 h-3" />
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
