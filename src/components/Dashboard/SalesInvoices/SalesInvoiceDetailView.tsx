import React, { useEffect, useState } from 'react';
import { api } from '../../../api';
import { formatAmount, getActiveCurrencySymbol } from '../../../lib/formatters';
import { printInvoiceDocument } from '../../../lib/exportUtils';
import { SalesInvoiceReturnModal } from './SalesInvoiceReturnModal';
import { SalesInvoicePaymentModal } from './SalesInvoicePaymentModal';
import {
  ArrowRight,
  Printer,
  Mail,
  DollarSign,
  RotateCcw,
  Calendar,
  User,
  Phone,
  MapPin,
  FileText,
  Clock,
  ShieldCheck,
  Package,
  Layers,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  CreditCard,
  Building,
} from 'lucide-react';

interface SalesInvoiceDetailViewProps {
  invoiceId: string;
  onBack: () => void;
  onRefreshList?: () => void;
}

export const SalesInvoiceDetailView: React.FC<SalesInvoiceDetailViewProps> = ({
  invoiceId,
  onBack,
  onRefreshList,
}) => {
  const [invoice, setInvoice] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedNo, setCopiedNo] = useState(false);
  const [activeTab, setActiveTab] = useState<'items' | 'payments' | 'returns' | 'ledger' | 'inventory' | 'audit'>('items');
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getInvoiceById(invoiceId);
      if (res.success && res.data) {
        setInvoice(res.data);
      } else {
        setError(res.error?.message || 'تعذر تحميل بيانات الفاتورة');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحميل الفاتورة');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (invoiceId) {
      fetchDetails();
    }
  }, [invoiceId]);

  const copyInvoiceNumber = () => {
    if (invoice?.invoice_number) {
      navigator.clipboard.writeText(invoice.invoice_number);
      setCopiedNo(true);
      setTimeout(() => setCopiedNo(false), 2000);
    }
  };

  const handleSendEmail = async () => {
    if (!invoice?.id) return;
    try {
      setIsSendingEmail(true);
      setEmailSuccess(null);
      setError(null);
      const res = await api.sendInvoiceEmail(invoice.id, invoice.customer_email);
      if (res.success) {
        setEmailSuccess('تم إرسال الفاتورة عبر البريد الإلكتروني بنجاح!');
        setTimeout(() => setEmailSuccess(null), 4000);
      } else {
        setError(res.error?.message || 'فشل إرسال البريد الإلكتروني');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء إرسال البريد');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handlePrint = () => {
    if (invoice) {
      const rawTotal = Number(invoice.total ?? invoice.totalAmount ?? invoice.grandTotal ?? invoice.netTotal ?? invoice.total_amount ?? invoice.amount ?? 0);
      const invoiceItems = invoice.items || [];
      const itemsSum = invoiceItems.length > 0
        ? invoiceItems.reduce((acc: number, it: any) => acc + Number(it.total || (Number(it.quantity || 1) * Number(it.unit_price || it.price || 0) - Number(it.discount || 0))), 0)
        : 0;
      const printTotal = rawTotal > 0 ? rawTotal : itemsSum;
      const printPaid = Number(
        invoice.paid_amount ?? invoice.paidAmount ?? invoice.amountPaid ?? invoice.paid ?? (invoice.status === 'PAID' || invoice.status === 'paid' ? printTotal : 0)
      );
      const printRemaining = Math.max(
        0,
        Number(
          invoice.remaining_amount ?? invoice.remainingAmount ?? invoice.remainingBalance ?? invoice.remaining ?? invoice.balanceDue ?? (printTotal - printPaid)
        )
      );
      const partyName = (invoice.customer_name || invoice.customerName || invoice.clientName || invoice.customer || 'عميل نقدي').trim();
      const salesperson = (
        invoice.salesperson_name ||
        invoice.salesperson ||
        invoice.salespersonName ||
        invoice.sales_rep_name ||
        invoice.sales_rep ||
        invoice.cashier_name ||
        invoice.cashierName ||
        invoice.created_by_name ||
        invoice.createdBy ||
        'حميد وهاس'
      ).trim();

      printInvoiceDocument({
        companyName: invoice.company_name || 'المؤسسة التجارية',
        invoiceType: 'SALES',
        invoiceNumber: invoice.invoice_number,
        currency: getActiveCurrencySymbol(invoice.currency),
        date: invoice.invoice_date || invoice.created_at?.split('T')[0],
        dueDate: invoice.due_date,
        status: invoice.status,
        paymentMethod: invoice.payment_method,
        partyName,
        customer_name: partyName,
        salesperson,
        salesperson_name: salesperson,
        partyPhone: invoice.customer_phone,
        partyAddress: invoice.customer_address,
        items: invoiceItems.map((it: any) => ({
          name: it.product_name || it.name || 'صنف مبيعات',
          sku: it.product_sku || it.sku,
          unit: it.unit || it.product_unit || 'حبة',
          quantity: parseFloat(it.quantity || '0'),
          unitPrice: parseFloat(it.unit_price || '0'),
          discount: parseFloat(it.discount || '0'),
          tax: parseFloat(it.tax || '0'),
          total: parseFloat(it.total || '0'),
        })),
        subtotal: parseFloat(invoice.subtotal || '0') || printTotal,
        discount: parseFloat(invoice.discount || '0'),
        tax: parseFloat(invoice.tax || '0'),
        total: printTotal,
        paidAmount: printPaid,
        remainingAmount: printRemaining,
        notes: invoice.notes,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm">جاري تحميل تفاصيل الفاتورة القياسية...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center max-w-lg mx-auto my-8">
        <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">تعذر عرض الفاتورة</h3>
        <p className="text-sm text-slate-400 mb-6">{error || 'الفاتورة المطلوبة غير موجودة'}</p>
        <button
          onClick={onBack}
          className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition-colors"
        >
          العودة لقائمة الفواتير
        </button>
      </div>
    );
  }

  const items = invoice.items || [];
  const rawTotal = Number(invoice.total ?? invoice.totalAmount ?? invoice.grandTotal ?? invoice.netTotal ?? invoice.total_amount ?? invoice.amount ?? 0);
  const itemsSum = items.length > 0
    ? items.reduce((acc: number, it: any) => acc + Number(it.total || (Number(it.quantity || 1) * Number(it.unit_price || it.price || 0) - Number(it.discount || 0))), 0)
    : 0;
  const total = rawTotal > 0 ? rawTotal : itemsSum;
  const paid = Number(
    invoice.paid_amount ?? invoice.paidAmount ?? invoice.amountPaid ?? invoice.paid ?? (invoice.status === 'PAID' || invoice.status === 'paid' ? total : 0)
  );
  const remaining = Math.max(
    0,
    Number(
      invoice.remaining_amount ?? invoice.remainingAmount ?? invoice.remainingBalance ?? invoice.remaining ?? invoice.balanceDue ?? (total - paid)
    )
  );
  const customerName = (invoice.customer_name || invoice.customerName || invoice.clientName || invoice.customer || 'عميل نقدي').trim();
  const salesRep = (
    invoice.salesperson_name ||
    invoice.salesperson ||
    invoice.salespersonName ||
    invoice.sales_rep_name ||
    invoice.sales_rep ||
    invoice.cashier_name ||
    invoice.cashierName ||
    invoice.created_by_name ||
    invoice.createdBy ||
    'حميد وهاس'
  ).trim();
  const payments = invoice.payments || [];
  const returns = invoice.returns || [];
  const ledgerEntries = invoice.ledger_entries || [];
  const inventoryMovements = invoice.inventory_movements || [];
  const auditLogs = invoice.audit_timeline || [];

  const getStatusBadge = (status: string, rem: number) => {
    if (status === 'PAID' || rem <= 0.01) {
      return (
        <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-xs font-semibold flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          مسددة بالكامل (PAID)
        </span>
      );
    }
    if (status === 'PARTIALLY_PAID' || (paid > 0 && rem > 0.01)) {
      return (
        <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-full text-xs font-semibold flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
          مسددة جزئياً (PARTIAL)
        </span>
      );
    }
    if (status === 'DRAFT') {
      return (
        <span className="px-3 py-1 bg-slate-500/10 border border-slate-500/30 text-slate-300 rounded-full text-xs font-semibold flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
          مسودة (DRAFT)
        </span>
      );
    }
    if (status === 'CANCELLED') {
      return (
        <span className="px-3 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-full text-xs font-semibold flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
          ملغاة (CANCELLED)
        </span>
      );
    }
    return (
      <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full text-xs font-semibold flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
        معلقة / ذمة (PENDING)
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12" id="sales-invoice-detail-view">
      {/* Top Action & Navigation Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors flex items-center justify-center"
            title="الرجوع للقائمة"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                فاتورة مبيعات <span className="font-mono text-blue-400 font-extrabold">#{invoice.invoice_number}</span>
              </h1>
              <button
                type="button"
                onClick={copyInvoiceNumber}
                className="text-slate-400 hover:text-white p-1 rounded transition-colors"
                title="نسخ رقم الفاتورة"
              >
                {copiedNo ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
              {getStatusBadge(invoice.status, remaining)}
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                تاريخ الإصدار: {invoice.invoice_date || invoice.created_at?.split('T')[0]}
              </span>
              {invoice.due_date && (
                <span className="flex items-center gap-1 text-amber-400/90">
                  <Clock className="w-3.5 h-3.5" />
                  تاريخ الاستحقاق: {invoice.due_date}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {remaining > 0.01 && invoice.status !== 'CANCELLED' && (
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
            >
              <DollarSign className="w-4 h-4" />
              سداد دفعة
            </button>
          )}

          {invoice.status !== 'DRAFT' && invoice.status !== 'CANCELLED' && (
            <button
              type="button"
              onClick={() => setIsReturnModalOpen(true)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              مرتجع / إشعار دائن
            </button>
          )}

          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all"
          >
            <Printer className="w-4 h-4" />
            طباعة الفاتورة
          </button>

          <button
            type="button"
            onClick={handleSendEmail}
            disabled={isSendingEmail}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors border border-slate-700"
            title="إرسال عبر البريد الإلكتروني"
          >
            <Mail className="w-4 h-4" />
            {isSendingEmail ? 'جاري الإرسال...' : 'إرسال بريد'}
          </button>
        </div>
      </div>

      {emailSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{emailSuccess}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Grand Total */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-400 mb-1">إجمالي الفاتورة النهائي</p>
          <h3 className="text-2xl font-bold text-white tracking-tight font-mono">
            {formatAmount(total, invoice.currency || 'YER')}
          </h3>
          <p className="text-xs text-slate-500 mt-1">العملة: {invoice.currency || 'YER'}</p>
        </div>

        {/* 2. Paid Amount */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <p className="text-xs font-medium text-emerald-400 mb-1">المبلغ المحصل (المدفوع)</p>
          <h3 className="text-2xl font-bold text-emerald-400 tracking-tight font-mono">
            {formatAmount(paid, invoice.currency || 'YER')}
          </h3>
          <p className="text-xs text-slate-500 mt-1">{payments.length} عمليات سداد مسجلة</p>
        </div>

        {/* 3. Remaining */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <p className="text-xs font-medium text-amber-400 mb-1">الرصيد المتبقي (الذمة)</p>
          <h3 className="text-2xl font-bold text-amber-400 tracking-tight font-mono">
            {formatAmount(remaining, invoice.currency || 'YER')}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {remaining <= 0.01 ? 'تم تصفية الفاتورة بالكامل' : 'مستحق الدفع'}
          </p>
        </div>

        {/* 4. Customer Balance info */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <p className="text-xs font-medium text-blue-400 mb-1">رصيد العميل الحالي الإجمالي</p>
          <h3 className="text-2xl font-bold text-blue-400 tracking-tight font-mono">
            {formatAmount(invoice.customer_balance || 0, invoice.customer_currency || invoice.currency || 'YER')}
          </h3>
          <p className="text-xs text-slate-500 mt-1">حساب: {invoice.customer_name}</p>
        </div>
      </div>

      {/* Customer Info & Invoice Meta Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Information Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm border-b border-slate-800 pb-2">
            <User className="w-4 h-4" />
            <span>بيانات العميل</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400 text-xs">اسم العميل:</span>
              <span className="text-white font-medium">{customerName}</span>
            </div>
            {invoice.customer_phone && (
              <div className="flex justify-between">
                <span className="text-slate-400 text-xs">رقم الهاتف:</span>
                <span className="text-slate-200 font-mono" dir="ltr">{invoice.customer_phone}</span>
              </div>
            )}
            {invoice.customer_email && (
              <div className="flex justify-between">
                <span className="text-slate-400 text-xs">البريد الإلكتروني:</span>
                <span className="text-slate-200 font-mono text-xs">{invoice.customer_email}</span>
              </div>
            )}
            {invoice.customer_address && (
              <div className="flex justify-between">
                <span className="text-slate-400 text-xs">العنوان:</span>
                <span className="text-slate-200 text-xs">{invoice.customer_address}</span>
              </div>
            )}
            {invoice.customer_tax_number && (
              <div className="flex justify-between">
                <span className="text-slate-400 text-xs">الرقم الضريبي:</span>
                <span className="text-slate-200 font-mono text-xs">{invoice.customer_tax_number}</span>
              </div>
            )}
          </div>
        </div>

        {/* Invoice Parameters Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm border-b border-slate-800 pb-2">
            <FileText className="w-4 h-4" />
            <span>بيانات الفاتورة المالية</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400 text-xs">الرقم المرجعي:</span>
              <span className="text-white font-mono font-bold">#{invoice.invoice_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 text-xs">تاريخ الفاتورة:</span>
              <span className="text-slate-200">{invoice.invoice_date || invoice.created_at?.split('T')[0]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 text-xs">تاريخ الاستحقاق:</span>
              <span className="text-slate-200">{invoice.due_date || 'غير محدد (فوري)'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 text-xs">طريقة الدفع:</span>
              <span className="font-semibold text-xs text-emerald-400">
                {invoice.payment_method === 'BANK'
                  ? 'تحويل بنكي'
                  : invoice.payment_method === 'CREDIT'
                  ? 'آجل (ذمة)'
                  : invoice.payment_method === 'WALLET'
                  ? 'محفظة إلكترونية'
                  : 'نقداً'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 text-xs">العملة وسعر الصرف:</span>
              <span className="text-slate-200 font-mono text-xs">
                {invoice.currency || 'YER'} (سعر التحويل: {invoice.exchange_rate || 1.0})
              </span>
            </div>
          </div>
        </div>

        {/* Notes & Breakdown Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm border-b border-slate-800 pb-2">
            <Activity className="w-4 h-4" />
            <span>الملاحظات والملخص المالي</span>
          </div>
          <div className="space-y-1.5 text-xs text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">المجموع الفرعي:</span>
              <span className="font-mono">{formatAmount(invoice.subtotal || 0, invoice.currency || 'YER')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">الخصم التجاري:</span>
              <span className="font-mono text-rose-400">-{formatAmount(invoice.discount || 0, invoice.currency || 'YER')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">ضريبة القيمة المضافة:</span>
              <span className="font-mono text-emerald-400">+{formatAmount(invoice.tax || 0, invoice.currency || 'YER')}</span>
            </div>
            <div className="border-t border-slate-800 pt-1.5 flex justify-between font-bold text-sm text-white">
              <span>الإجمالي النهائي:</span>
              <span className="font-mono text-blue-400">{formatAmount(total, invoice.currency || 'YER')}</span>
            </div>
          </div>
          {invoice.notes && (
            <div className="mt-2 pt-2 border-t border-slate-800 text-xs text-slate-400 italic">
              ملاحظات: {invoice.notes}
            </div>
          )}
        </div>
      </div>

      {/* Tabs Navigation for Full Audit & Integrations */}
      <div className="border-b border-slate-800 flex items-center gap-2 overflow-x-auto text-sm">
        <button
          type="button"
          onClick={() => setActiveTab('items')}
          className={`pb-3 px-3 font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'items'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Package className="w-4 h-4" />
          أصناف الفاتورة ({items.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('payments')}
          className={`pb-3 px-3 font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'payments'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          سجل الدفعات والسندات ({payments.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('returns')}
          className={`pb-3 px-3 font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'returns'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          المرتجعات والإشعارات الدائنة ({returns.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ledger')}
          className={`pb-3 px-3 font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'ledger'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          القيود المحاسبية بالدفتر الأستاذ ({ledgerEntries.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('inventory')}
          className={`pb-3 px-3 font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'inventory'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building className="w-4 h-4" />
          حركات المخزون ({inventoryMovements.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`pb-3 px-3 font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'audit'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          سجل التعديلات والأنشطة ({auditLogs.length})
        </button>
      </div>

      {/* Tab 1: Line Items */}
      {activeTab === 'items' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase">
                <tr>
                  <th className="py-3.5 px-4">#</th>
                  <th className="py-3.5 px-4">الصنف / الوصف</th>
                  <th className="py-3.5 px-4 text-center">رقم الصنف / القطعة</th>
                  <th className="py-3.5 px-4 text-center">الوحدة</th>
                  <th className="py-3.5 px-4 text-center">الكمية</th>
                  <th className="py-3.5 px-4 text-left">سعر الوحدة</th>
                  <th className="py-3.5 px-4 text-left">الخصم</th>
                  <th className="py-3.5 px-4 text-left">الضريبة</th>
                  <th className="py-3.5 px-4 text-left">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {items.map((it: any, idx: number) => {
                  const qty = parseFloat(it.quantity || '0');
                  const unitPrice = parseFloat(it.unit_price || '0');
                  const discount = parseFloat(it.discount || '0');
                  const tax = parseFloat(it.tax || '0');
                  const itemTotal = parseFloat(it.total || `${qty * unitPrice - discount + tax}`);
                  const unitStr = it.unit || it.product_unit || 'حبة';

                  return (
                    <tr key={it.id || idx} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 text-slate-500 text-xs font-mono">{idx + 1}</td>
                      <td className="py-3 px-4 font-medium text-slate-100">
                        <div>{it.product_name || it.name || it.description || 'صنف مبيعات'}</div>
                        {(it.activityType === 'tire' || it.tireSize) && (
                          <div className="text-[10px] text-sky-400 font-mono mt-0.5">
                            🛞 مقاس: {it.tireSize || '-'} {it.tireProductionDot ? `[DOT: ${it.tireProductionDot}]` : ''} {it.warrantyMonths ? `(ضمان ${it.warrantyMonths} شهر)` : ''}
                          </div>
                        )}
                        {it.serialNumber && (
                          <div className="text-[10px] text-amber-400 font-mono mt-0.5">
                            ⚡ سيريال: {it.serialNumber} {it.warrantyEndDate ? `(ضمان حتى ${it.warrantyEndDate})` : ''}
                          </div>
                        )}
                        {!it.product_id && (
                          <span className="mr-2 text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded">
                            صنف يدوي
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center text-blue-400 font-bold text-xs font-mono">
                        {it.itemCode || it.partNumber || it.product_sku || it.sku || '-'}
                      </td>
                      <td className="py-3 px-4 text-center text-xs text-slate-300 font-medium">{unitStr}</td>
                      <td className="py-3 px-4 text-center font-mono font-medium text-white">{qty}</td>
                      <td className="py-3 px-4 text-left font-mono text-slate-300">
                        {formatAmount(unitPrice, invoice.currency || 'YER')}
                      </td>
                      <td className="py-3 px-4 text-left font-mono text-rose-400/90">
                        {discount > 0 ? `-${formatAmount(discount, invoice.currency || 'YER')}` : '-'}
                      </td>
                      <td className="py-3 px-4 text-left font-mono text-emerald-400/90">
                        {tax > 0 ? `+${formatAmount(tax, invoice.currency || 'YER')}` : '-'}
                      </td>
                      <td className="py-3 px-4 text-left font-mono font-bold text-white">
                        {formatAmount(itemTotal, invoice.currency || 'YER')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Payments History */}
      {activeTab === 'payments' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          {payments.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              لا توجد دفعات أو سندات قبض مسجلة لهذه الفاتورة بعد.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-950/70 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase">
                  <tr>
                    <th className="py-3.5 px-4">تاريخ السند</th>
                    <th className="py-3.5 px-4">المبلغ</th>
                    <th className="py-3.5 px-4">طريقة الدفع</th>
                    <th className="py-3.5 px-4">المرجع</th>
                    <th className="py-3.5 px-4">الملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {payments.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 text-slate-300 text-xs font-mono">
                        {p.payment_date || p.created_at?.split('T')[0]}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                        {formatAmount(p.amount, p.currency || invoice.currency || 'YER')}
                      </td>
                      <td className="py-3 px-4 text-slate-300 text-xs">
                        <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-[11px]">
                          {p.payment_method === 'CASH' ? 'نقداً' : p.payment_method === 'BANK' ? 'تحويل بنكي' : p.payment_method}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300 text-xs font-mono">{p.reference || '-'}</td>
                      <td className="py-3 px-4 text-slate-400 text-xs">{p.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Returns & Credit Notes */}
      {activeTab === 'returns' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          {returns.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              لا توجد مرتجعات أو إشعارات دائنة مسجلة على هذه الفاتورة.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-950/70 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase">
                  <tr>
                    <th className="py-3.5 px-4">رقم المرتجع</th>
                    <th className="py-3.5 px-4">التاريخ</th>
                    <th className="py-3.5 px-4">قيمة المرتجع</th>
                    <th className="py-3.5 px-4">طريقة التسوية</th>
                    <th className="py-3.5 px-4">السبب</th>
                    <th className="py-3.5 px-4">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {returns.map((r: any) => (
                    <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-amber-400 text-xs">
                        #{r.return_number}
                      </td>
                      <td className="py-3 px-4 text-slate-300 text-xs font-mono">
                        {r.return_date || r.created_at?.split('T')[0]}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-rose-400">
                        -{formatAmount(r.total_amount, invoice.currency || 'YER')}
                      </td>
                      <td className="py-3 px-4 text-slate-300 text-xs">
                        {r.refund_method === 'CREDIT_NOTE' ? 'إشعار دائن (رصيد)' : r.refund_method === 'CASH_REFUND' ? 'استرجاع نقدي' : r.refund_method}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-xs">{r.reason || '-'}</td>
                      <td className="py-3 px-4 text-emerald-400 text-xs font-semibold">مكتمل</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Double-Entry Accounting Ledger */}
      {activeTab === 'ledger' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          {ledgerEntries.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              لا توجد قيود أستاذ محاسبية مسجلة (الفاتورة مسودة أو قيد الإعداد).
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-950/70 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase">
                  <tr>
                    <th className="py-3.5 px-4">رقم القيد / المرجع</th>
                    <th className="py-3.5 px-4">الحساب المحاسبي</th>
                    <th className="py-3.5 px-4">نوع المعاملة</th>
                    <th className="py-3.5 px-4 text-left">مدين (Debit)</th>
                    <th className="py-3.5 px-4 text-left">دائن (Credit)</th>
                    <th className="py-3.5 px-4">البيان</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {ledgerEntries.map((l: any) => {
                    const isDebit = l.entry_type === 'DEBIT';
                    return (
                      <tr key={l.id} className="hover:bg-slate-800/30 transition-colors font-mono text-xs">
                        <td className="py-3 px-4 text-slate-400 font-bold">{l.reference_number || l.reference_id?.slice(0, 8)}</td>
                        <td className="py-3 px-4 text-slate-200 font-sans font-medium">{l.account_name || l.account_code || 'حساب عام'}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isDebit ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {isDebit ? 'مدين (DEBIT)' : 'دائن (CREDIT)'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-left font-bold text-blue-400">
                          {isDebit ? formatAmount(l.amount, l.currency || invoice.currency || 'YER') : '-'}
                        </td>
                        <td className="py-3 px-4 text-left font-bold text-emerald-400">
                          {!isDebit ? formatAmount(l.amount, l.currency || invoice.currency || 'YER') : '-'}
                        </td>
                        <td className="py-3 px-4 text-slate-400 font-sans">{l.description || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Inventory Movements */}
      {activeTab === 'inventory' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          {inventoryMovements.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              لا توجد حركات مخزنية مباشرة (أصناف خدمية أو مسودة).
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-950/70 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase">
                  <tr>
                    <th className="py-3.5 px-4">المنتج</th>
                    <th className="py-3.5 px-4">نوع الحركة</th>
                    <th className="py-3.5 px-4 text-center">الكمية المصروفة</th>
                    <th className="py-3.5 px-4">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {inventoryMovements.map((im: any) => (
                    <tr key={im.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-100">{im.product_name || 'منتج مخزني'}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded text-[11px] font-medium">
                          صرف مبيعات (STOCK OUT)
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-rose-400">
                        -{im.quantity}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-xs font-mono">
                        {im.created_at?.split('T')[0]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 6: Audit Logs & Timeline */}
      {activeTab === 'audit' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
          {auditLogs.length === 0 ? (
            <div className="text-center text-slate-400 text-sm">
              لا توجد سجلات تدقيق إضافية.
            </div>
          ) : (
            <div className="space-y-4">
              {auditLogs.map((log: any, idx: number) => (
                <div key={log.id || idx} className="flex items-start gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0 mt-0.5">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div className="flex-1 bg-slate-950/40 border border-slate-800 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">{log.action}</span>
                      <span className="text-xs text-slate-500 font-mono">{log.created_at}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      بواسطة: {log.user_name || log.user_email || 'مستخدم النظام'}
                    </p>
                    {log.details && (
                      <pre className="mt-2 p-2 bg-slate-900 rounded text-[11px] font-mono text-slate-400 overflow-x-auto">
                        {typeof log.details === 'string' ? log.details : JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Return Modal */}
      {isReturnModalOpen && (
        <SalesInvoiceReturnModal
          invoice={invoice}
          isOpen={isReturnModalOpen}
          onClose={() => setIsReturnModalOpen(false)}
          onSuccess={() => {
            fetchDetails();
            onRefreshList?.();
          }}
        />
      )}

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <SalesInvoicePaymentModal
          invoice={invoice}
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          onSuccess={() => {
            fetchDetails();
            onRefreshList?.();
          }}
        />
      )}
    </div>
  );
};
