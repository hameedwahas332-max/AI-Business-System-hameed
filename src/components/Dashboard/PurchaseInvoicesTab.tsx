import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { formatAmount, formatSupplierAmount, parseEnglishNumber, toEnglishDigits } from '../../lib/formatters';
import { getAccountingRate } from '../../lib/exchangeRates';
import { ExportActions } from '../Common/ExportActions';
import { TableExportConfig, printInvoiceDocument } from '../../lib/exportUtils';
import { useAuth } from '../../context/AuthContext';
import {
  ShoppingBag,
  Plus,
  Search,
  Eye,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Trash2,
  Printer,
} from 'lucide-react';

export const PurchaseInvoicesTab: React.FC = () => {
  const { company } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modals state
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  // Purchase Builder State
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [currency, setCurrency] = useState('YER');
  const [exchangeRate, setExchangeRate] = useState('1.0');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState('PENDING'); // DRAFT, PENDING
  const [notes, setNotes] = useState('');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [builderItems, setBuilderItems] = useState<
    Array<{
      product_id: string;
      quantity: number;
      unit_cost: number;
      discount: number;
      tax: number;
    }>
  >([
    { product_id: '', quantity: 1, unit_cost: 0, discount: 0, tax: 0 },
  ]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [invRes, suppRes, prodRes] = await Promise.all([
        api.getPurchaseInvoices({ search: searchQuery, status: statusFilter }),
        api.getSuppliers(),
        api.getProducts(),
      ]);
      setInvoices(invRes?.data || []);
      setSuppliers(suppRes?.data || []);
      setProducts(prodRes?.data || []);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل بيانات المشتريات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchQuery, statusFilter]);

  const handleOpenBuilder = () => {
    const defaultSupplier = suppliers[0];
    setSelectedSupplierId(defaultSupplier?.id || '');
    setCurrency(defaultSupplier?.currency || 'YER');
    setExchangeRate('1.0');
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setDueDate('');
    setStatus('PENDING');
    setNotes('');
    setPaidAmount(0);
    setBuilderItems([
      {
        product_id: products[0]?.id || '',
        quantity: 1,
        unit_cost: products[0]?.purchase_price || 0,
        discount: 0,
        tax: 0,
      },
    ]);
    setIsBuilderOpen(true);
  };

  const handleProductChange = (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    const updated = [...builderItems];
    updated[index] = {
      ...updated[index],
      product_id: productId,
      unit_cost: prod ? prod.purchase_price : 0,
    };
    setBuilderItems(updated);
  };

  const handleAddItem = () => {
    setBuilderItems([
      ...builderItems,
      {
        product_id: products[0]?.id || '',
        quantity: 1,
        unit_cost: products[0]?.purchase_price || 0,
        discount: 0,
        tax: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (builderItems.length === 1) return;
    setBuilderItems(builderItems.filter((_, i) => i !== index));
  };

  // Live Calculations
  const calculatedSubtotal = builderItems.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.unit_cost || 0),
    0
  );
  const calculatedDiscount = builderItems.reduce(
    (sum, item) => sum + Number(item.discount || 0),
    0
  );
  const calculatedTax = builderItems.reduce(
    (sum, item) => sum + Number(item.tax || 0),
    0
  );
  const calculatedTotal = calculatedSubtotal - calculatedDiscount + calculatedTax;

  const totalPurchaseAmount = invoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);
  const totalPaidToSuppliers = invoices.reduce((sum, inv) => sum + Number(inv.paid_amount || 0), 0);
  const totalRemainingToSuppliers = invoices.reduce((sum, inv) => sum + Number(inv.remaining_amount || 0), 0);

  const getPurchaseExportConfig = (): TableExportConfig => ({
    filename: `purchase_invoices_${new Date().toISOString().split('T')[0]}`,
    title: 'سجل فواتير المشتريات والموردين',
    subtitle: statusFilter ? `حالة الفواتير: ${statusFilter}` : 'كافة فواتير المشتريات',
    filterBadges: [
      ...(searchQuery ? [{ label: 'بحث', value: searchQuery }] : []),
      ...(statusFilter ? [{ label: 'الحالة', value: statusFilter }] : []),
    ],
    summaryCards: [
      { label: 'إجمالي المشتريات', value: `${formatAmount(totalPurchaseAmount)} YER` },
      { label: 'المسدد للموردين', value: `${formatAmount(totalPaidToSuppliers)} YER` },
      { label: 'المتبقي للموردين', value: `${formatAmount(totalRemainingToSuppliers)} YER` },
      { label: 'عدد الفواتير المعروضة', value: invoices.length },
    ],
    headers: ['رقم الفاتورة', 'المورد', 'تاريخ الفاتورة', 'تاريخ الاستحقاق', 'المجموع الفرعي (YER)', 'الخصم (YER)', 'الضريبة (YER)', 'الإجمالي النهائي (YER)', 'المسدد (YER)', 'المتبقي (YER)', 'الحالة'],
    rows: invoices.map((inv) => [
      inv.invoice_number,
      inv.supplier_name || '-',
      inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString('ar-YE') : '-',
      inv.due_date ? new Date(inv.due_date).toLocaleDateString('ar-YE') : '-',
      inv.subtotal || 0,
      inv.discount || 0,
      inv.tax || 0,
      inv.total || 0,
      inv.paid_amount || 0,
      inv.remaining_amount || 0,
      inv.status === 'PAID'
        ? 'مسددة بالكامل'
        : inv.status === 'PARTIALLY_PAID'
        ? 'مسددة جزئياً'
        : inv.status === 'PENDING'
        ? 'مستحقة'
        : inv.status === 'DRAFT'
        ? 'مسودة'
        : inv.status,
    ]),
    alignments: ['center', 'right', 'center', 'center', 'right', 'right', 'right', 'right', 'right', 'right', 'center'],
  });

  const handlePrintSinglePurchase = (inv: any) => {
    printInvoiceDocument({
      companyName: company?.name || 'المؤسسة التجارية',
      companyCode: company?.code || '',
      invoiceType: 'PURCHASE',
      invoiceNumber: inv.invoice_number,
      date: inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString('ar-YE') : new Date().toLocaleDateString('ar-YE'),
      dueDate: inv.due_date ? new Date(inv.due_date).toLocaleDateString('ar-YE') : undefined,
      status: inv.status,
      partyName: inv.supplier_name || 'المورد',
      items: (inv.items || []).map((it: any) => ({
        name: it.product_name || 'صنف مشتريات',
        quantity: Number(it.quantity || 1),
        unitPrice: Number(it.unit_cost || 0),
        discount: Number(it.discount || 0),
        tax: Number(it.tax || 0),
        total: Number(it.total || (it.quantity * it.unit_cost)),
      })),
      subtotal: Number(inv.subtotal || 0),
      discount: Number(inv.discount || 0),
      tax: Number(inv.tax || 0),
      total: Number(inv.total || 0),
      paidAmount: Number(inv.paid_amount || 0),
      remainingAmount: Number(inv.remaining_amount || 0),
      notes: inv.notes,
    });
  };

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      if (!selectedSupplierId) {
        throw new Error('يرجى اختيار المورد');
      }

      const remainingToSupplier = Math.max(0, calculatedTotal - Number(paidAmount || 0));

      await api.createPurchaseInvoice({
        supplier_id: selectedSupplierId,
        currency: currency || 'YER',
        exchange_rate: parseFloat(exchangeRate || '1.0'),
        invoice_date: invoiceDate,
        due_date: dueDate || undefined,
        status: status === 'PENDING' && Number(paidAmount) >= calculatedTotal ? 'PAID' : status === 'PENDING' && Number(paidAmount) > 0 ? 'PARTIALLY_PAID' : status,
        paid_amount: Number(paidAmount || 0),
        remaining_amount: remainingToSupplier,
        notes,
        items: builderItems,
      });

      setSuccess('تم تسجيل فاتورة المشتريات وتوريد الكميات للمخزن بنجاح');
      setIsBuilderOpen(false);
      fetchData();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || 'فشل حفظ فاتورة المشتريات');
    }
  };

  const handleViewInvoiceDetails = async (invId: string) => {
    try {
      setError(null);
      const res = await api.getPurchaseInvoiceById(invId);
      setSelectedInvoice(res.data);
    } catch (err: any) {
      setError(err.message || 'فشل عرض تفاصيل فاتورة المشتريات');
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'PAID':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/60">مسددة للمورد</span>;
      case 'PARTIALLY_PAID':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-950 text-teal-300 border border-teal-800/60">مسددة جزئياً</span>;
      case 'PENDING':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800/60">مستحقة للمورد</span>;
      case 'DRAFT':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700/60">مسودة</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400">{st}</span>;
    }
  };

  return (
    <div className="space-y-6 text-right text-slate-100 font-sans" dir="rtl">
      {/* Header */}
      <div className="bg-slate-900 border border-emerald-900/40 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-lg shadow-emerald-950/50 shrink-0">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>إدارة فواتير المشتريات</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                    Purchase Invoices
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 font-medium">
                  تسجيل فواتير المشتريات من الموردين، زيادة المخزون تلقائياً، وإضافة الالتزامات المالية في الشجرة المحاسبية
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleOpenBuilder}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold text-xs sm:text-sm shadow-lg shadow-emerald-950/60 border border-emerald-500/40 flex items-center gap-2 transition-all active:scale-95 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل فاتورة مشتريات جديدة</span>
          </button>
        </div>
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

      {/* Invoices List */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="البحث برقم المشتريات، اسم المورد..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-9 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-2 px-3 text-xs bg-slate-950 border border-slate-700/80 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="">جميع الحالات</option>
              <option value="PENDING">مستحقة (PENDING)</option>
              <option value="PARTIALLY_PAID">مسددة جزئياً (PARTIALLY_PAID)</option>
              <option value="PAID">مسددة بالكامل (PAID)</option>
              <option value="DRAFT">مسودة (DRAFT)</option>
            </select>
            <ExportActions getConfig={getPurchaseExportConfig} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="p-3.5">رقم الفاتورة</th>
                <th className="p-3.5">المورد</th>
                <th className="p-3.5">التاريخ</th>
                <th className="p-3.5">الإجمالي</th>
                <th className="p-3.5">المسدد للمورد</th>
                <th className="p-3.5">المتبقي للمورد</th>
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
                      <span>جاري تحميل فواتير المشتريات...</span>
                    </div>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    لا توجد فواتير مشتريات مسجلة.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-bold font-mono text-emerald-400 dir-ltr text-right">
                      {inv.invoice_number}
                    </td>
                    <td className="p-3.5 font-bold text-white">{inv.supplier_name || '-'}</td>
                    <td className="p-3.5 text-slate-400 font-mono text-[11px]">
                      {inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString('ar-YE') : '-'}
                    </td>
                    <td className="p-3.5 font-mono font-bold text-white">
                      <div className="flex items-center gap-1">
                        <span>{formatAmount(inv.total)}</span>
                        <span className="text-xs font-semibold text-slate-400">{inv.currency || 'YER'}</span>
                      </div>
                      {inv.currency && inv.currency !== 'YER' && inv.exchange_rate && inv.exchange_rate !== 1 && (
                        <div className="text-[10px] text-amber-400 font-normal">
                          ≈ {formatAmount(Number(inv.total) * Number(inv.exchange_rate))} YER
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 font-mono text-emerald-400 font-bold">
                      {formatAmount(inv.paid_amount)} {inv.currency || 'YER'}
                    </td>
                    <td className="p-3.5 font-mono text-amber-400 font-bold">
                      {formatAmount(inv.remaining_amount)} {inv.currency || 'YER'}
                    </td>
                    <td className="p-3.5">{getStatusBadge(inv.status)}</td>
                    <td className="p-3.5 text-center flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleViewInvoiceDetails(inv.id)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="عرض تفاصيل الفاتورة"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handlePrintSinglePurchase(inv)}
                        className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/60 rounded-lg transition-colors cursor-pointer"
                        title="طباعة الفاتورة / PDF"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE PURCHASE INVOICE MODAL */}
      {isBuilderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150" dir="rtl">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden text-right text-slate-100">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-emerald-400" />
                <span>تسجيل فاتورة مشتريات وتوريد للمخزن</span>
              </h3>
              <button
                onClick={() => setIsBuilderOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInvoice} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">المورد <span className="text-red-400">*</span></label>
                  <select
                    required
                    value={selectedSupplierId}
                    onChange={(e) => {
                      const suppId = e.target.value;
                      setSelectedSupplierId(suppId);
                      const supp = suppliers.find((s) => s.id === suppId);
                      if (supp && supp.currency) {
                        setCurrency(supp.currency);
                        if (supp.currency === 'YER') setExchangeRate('1.0');
                      }
                    }}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- اختر المورد --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.currency || 'YER'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">العملة</label>
                  <select
                    value={currency}
                    onChange={(e) => {
                      const cur = e.target.value;
                      setCurrency(cur);
                      setExchangeRate(String(getAccountingRate(cur)));
                    }}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="YER">YER (ريال يمني)</option>
                    <option value="SAR">SAR (ريال سعودي)</option>
                    <option value="USD">USD (دولار أمريكي)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    سعر الصرف {currency !== 'YER' && <span className="text-[10px] text-amber-400 font-normal">(مقابل YER)</span>}
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    disabled={currency === 'YER'}
                    value={currency === 'YER' ? '1.0' : exchangeRate}
                    onChange={(e) => setExchangeRate(e.target.value)}
                    className={`w-full p-2 border rounded-xl font-mono ${
                      currency === 'YER' ? 'bg-slate-800 text-slate-500 border-slate-700' : 'bg-slate-900 border-slate-700 text-slate-100 focus:border-emerald-500'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">تاريخ الفاتورة</label>
                  <input
                    type="date"
                    required
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              {calculatedTotal > 0 && currency !== 'YER' && (
                <div className="bg-slate-950 border border-emerald-900/60 rounded-xl p-2.5 text-xs text-emerald-300 flex items-center justify-between">
                  <span className="font-semibold text-[11px]">المعادل بالعملة الأساسية (YER):</span>
                  <span className="font-mono font-bold text-sm">
                    {formatAmount(calculatedTotal * (parseFloat(exchangeRate) || 1))} YER
                  </span>
                </div>
              )}

              {/* Items Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-white">أصناف المشتريات الموردة للمخزن</span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-3 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800/60 hover:bg-emerald-900/60 rounded-lg font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة صنف</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {builderItems.map((item, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-12 gap-2 items-center p-2.5 bg-slate-950 border border-slate-800 rounded-xl"
                    >
                      <div className="col-span-4">
                        <label className="block text-[10px] text-slate-400 mb-0.5">الصنف / رقم القطعة</label>
                        <select
                          value={item.product_id}
                          onChange={(e) => handleProductChange(index, e.target.value)}
                          className="w-full p-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:border-emerald-500 text-xs"
                        >
                          <option value="">-- اختر صنف --</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} {p.itemCode ? `[${p.itemCode}]` : p.partNumber ? `[${p.partNumber}]` : p.sku ? `[${p.sku}]` : ''} (المخزون: {p.current_stock})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[10px] text-slate-400 mb-0.5">الكمية الموردة</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          dir="ltr"
                          lang="en"
                          value={item.quantity}
                          onChange={(e) => {
                            const updated = [...builderItems];
                            updated[index].quantity = parseEnglishNumber(e.target.value, 0);
                            setBuilderItems(updated);
                          }}
                          className="w-full p-1.5 bg-slate-900 border border-slate-700 rounded-lg font-mono text-xs text-slate-100 focus:border-emerald-500 text-center"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[10px] text-slate-400 mb-0.5">تكلفة الشراء للوحدة</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          dir="ltr"
                          lang="en"
                          value={item.unit_cost}
                          onChange={(e) => {
                            const updated = [...builderItems];
                            updated[index].unit_cost = parseEnglishNumber(e.target.value, 0);
                            setBuilderItems(updated);
                          }}
                          className="w-full p-1.5 bg-slate-900 border border-slate-700 rounded-lg font-mono text-xs text-slate-100 focus:border-emerald-500 text-center"
                        />
                      </div>

                      <div className="col-span-3 font-mono font-bold text-emerald-400 text-left pl-2">
                        {formatAmount((item.quantity || 0) * (item.unit_cost || 0))} {currency}
                      </div>

                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-1 text-red-400 hover:bg-red-950/60 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment to Supplier & Balances */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 text-xs">
                    المبلغ المسدد للمورد فورا ({currency})
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    dir="ltr"
                    lang="en"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(parseEnglishNumber(e.target.value, 0))}
                    placeholder="0.00"
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-xl text-emerald-400 font-bold font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 text-xs">
                    المتبقي للمورد (دين آجل على المنشأة)
                  </label>
                  <div className="w-full p-2 bg-slate-900 border border-slate-700 rounded-xl font-bold font-mono text-amber-400 text-sm">
                    {formatAmount(Math.max(0, calculatedTotal - paidAmount))} {currency}
                  </div>
                </div>
              </div>

              {/* Live Totals & Status */}
              <div className="p-4 bg-slate-950 border border-slate-800 text-white rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">المجموع الفرعي</span>
                    <span className="font-mono font-bold text-sm text-slate-200">
                      {formatAmount(calculatedSubtotal)} {currency}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">إجمالي التكلفة للمورد</span>
                    <span className="font-mono font-bold text-lg text-emerald-400">
                      {formatAmount(calculatedTotal)} {currency}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="p-2 bg-slate-900 border border-slate-700 text-white rounded-xl text-xs focus:border-emerald-500"
                  >
                    <option value="PENDING">اعتماد ورفع للرصيد والمخزن (تأكيد الشراء)</option>
                    <option value="DRAFT">حفظ كمسودة مشتريات</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">ملاحظات الفاتورة</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ملاحظات العقد أو الفاتورة الأصلية للمورد..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBuilderOpen(false)}
                  className="px-4 py-2 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-800 font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-950/60 border border-emerald-500/40 transition-all active:scale-95"
                >
                  حفظ وتأكيد المشتريات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150" dir="rtl">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-right text-slate-100">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60">
              <span className="font-bold text-white text-sm">
                تفاصيل فاتورة مشتريات #{selectedInvoice.invoice_number}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintSinglePurchase(selectedInvoice)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60 rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
                  title="طباعة الفاتورة أو حفظها PDF"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-400" />
                  <span>طباعة / PDF</span>
                </button>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="flex items-center justify-between bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <div>
                  <div className="text-slate-400 font-semibold text-[11px]">المورد</div>
                  <div className="font-bold text-white text-sm">{selectedInvoice.supplier_name}</div>
                </div>
                <div className="text-left dir-ltr">
                  <div className="text-slate-400 font-semibold text-[11px]">التاريخ</div>
                  <div className="font-mono font-bold text-slate-200">
                    {new Date(selectedInvoice.invoice_date).toLocaleDateString('ar-YE')}
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-right text-xs border border-slate-800 rounded-xl overflow-hidden">
                <thead className="bg-slate-950 font-bold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-2.5">الصنف</th>
                    <th className="p-2.5">الكمية الموردة</th>
                    <th className="p-2.5">التكلفة للوحدة</th>
                    <th className="p-2.5">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {selectedInvoice.items?.map((it: any) => (
                    <tr key={it.id}>
                      <td className="p-2.5 font-semibold text-white">{it.product_name}</td>
                      <td className="p-2.5 font-mono">{it.quantity}</td>
                      <td className="p-2.5 font-mono">{formatAmount(it.unit_cost)} {selectedInvoice.currency || 'YER'}</td>
                      <td className="p-2.5 font-mono font-bold text-emerald-400">
                        {formatAmount(it.total)} {selectedInvoice.currency || 'YER'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-slate-300">
                <div className="flex justify-between font-bold">
                  <span>إجمالي مستحقات المورد:</span>
                  <span className="font-mono text-emerald-400 text-sm">{formatAmount(selectedInvoice.total)} {selectedInvoice.currency || 'YER'}</span>
                </div>
                {selectedInvoice.currency && selectedInvoice.currency !== 'YER' && selectedInvoice.exchange_rate && (
                  <div className="flex justify-between text-slate-400 font-semibold text-[11px]">
                    <span>المعادل بالعملة الأساسية (YER):</span>
                    <span className="font-mono">{formatAmount(Number(selectedInvoice.total) * Number(selectedInvoice.exchange_rate))} YER (سعر الصرف: {selectedInvoice.exchange_rate})</span>
                  </div>
                )}
                <div className="flex justify-between text-amber-400 font-bold">
                  <span>المبلغ المتبقي للسداد:</span>
                  <span className="font-mono">{formatAmount(selectedInvoice.remaining_amount)} {selectedInvoice.currency || 'YER'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
