import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { POSMain } from './POS/POSMain';
import { SalesInvoicesKPIs } from './SalesInvoices/SalesInvoicesKPIs';
import { SalesInvoicesFilterBar } from './SalesInvoices/SalesInvoicesFilterBar';
import { SalesInvoicesTable } from './SalesInvoices/SalesInvoicesTable';
import { SalesInvoiceCreateView } from './SalesInvoices/SalesInvoiceCreateView';
import { SalesInvoiceDetailView } from './SalesInvoices/SalesInvoiceDetailView';
import { SalesInvoicePaymentModal } from './SalesInvoices/SalesInvoicePaymentModal';
import { SalesInvoiceReturnModal } from './SalesInvoices/SalesInvoiceReturnModal';
import { ExportActions } from '../Common/ExportActions';
import { TableExportConfig, printInvoiceDocument } from '../../lib/exportUtils';
import { formatAmount } from '../../lib/formatters';
import {
  FileText,
  ShoppingBag,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Receipt,
} from 'lucide-react';

export const InvoicesTab: React.FC = () => {
  // Main Sub-Module Toggle: POS vs Professional Invoices
  const [activeSubView, setActiveSubView] = useState<'invoices' | 'pos'>('invoices');

  // Invoices View state: 'list' | 'create' | 'detail'
  const [invoiceSubView, setInvoiceSubView] = useState<'list' | 'create' | 'detail'>('list');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  // Data state
  const [invoices, setInvoices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isOverdueOnly, setIsOverdueOnly] = useState(false);

  // Pagination & Selection
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals for Table quick actions
  const [modalPaymentInvoice, setModalPaymentInvoice] = useState<any | null>(null);
  const [modalReturnInvoice, setModalReturnInvoice] = useState<any | null>(null);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {
        page: currentPage,
        limit: pageSize,
      };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (statusFilter) params.status = statusFilter;
      if (selectedCustomerId) params.customer_id = selectedCustomerId;
      if (selectedCurrency) params.currency = selectedCurrency;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (isOverdueOnly) params.is_overdue = 'true';

      const [invRes, custRes, prodRes] = await Promise.all([
        api.getInvoices(params),
        api.getCustomers(),
        api.getProducts(),
      ]);

      setInvoices(Array.isArray(invRes?.data) ? invRes.data : []);
      setTotalCount(
        (invRes as any)?.pagination?.totalRecords ??
        (invRes as any)?.pagination?.total ??
        (Array.isArray(invRes?.data) ? invRes.data.length : 0)
      );
      setCustomers(Array.isArray(custRes?.data) ? custRes.data : []);
      setProducts(Array.isArray(prodRes?.data) ? prodRes.data : []);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل بيانات فواتير المبيعات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubView === 'invoices') {
      fetchData();
    }
  }, [
    activeSubView,
    searchQuery,
    statusFilter,
    selectedCustomerId,
    selectedCurrency,
    startDate,
    endDate,
    isOverdueOnly,
    currentPage,
  ]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setSelectedCustomerId('');
    setSelectedCurrency('');
    setStartDate('');
    setEndDate('');
    setIsOverdueOnly(false);
    setCurrentPage(1);
  };

  const handleSelectToggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === invoices.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(invoices.map((inv) => inv.id));
    }
  };

  const handleViewDetails = (invoice: any) => {
    setSelectedInvoiceId(invoice.id);
    setInvoiceSubView('detail');
  };

  const handleSendEmail = async (invoiceId: string) => {
    try {
      setSendingEmailId(invoiceId);
      setError(null);
      setSuccess(null);
      const res = await api.sendInvoiceEmail(invoiceId);
      if (res.success) {
        setSuccess('تم إرسال الفاتورة عبر البريد الإلكتروني بنجاح!');
        setTimeout(() => setSuccess(null), 4000);
      } else {
        setError(res.error?.message || 'فشل إرسال البريد الإلكتروني');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء إرسال البريد');
    } finally {
      setSendingEmailId(null);
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الفاتورة؟ سيتم إلغاؤها وإعادة قيد المخزون والحسابات.')) {
      return;
    }
    try {
      setError(null);
      const res = await api.deleteInvoice(invoiceId);
      if (res.success) {
        setSuccess('تم حذف الفاتورة بنجاح');
        fetchData();
        setTimeout(() => setSuccess(null), 4000);
      } else {
        setError(res.error?.message || 'فشل حذف الفاتورة');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حذف الفاتورة');
    }
  };

  // Dynamic Export Config for Excel, CSV, PDF, and Print
  const getExportConfig = (): TableExportConfig => {
    const listToExport =
      selectedIds.length > 0
        ? invoices.filter((inv) => selectedIds.includes(inv.id))
        : invoices;

    return {
      filename: `sales_invoices_${new Date().toISOString().split('T')[0]}`,
      title: 'سجل فواتير المبيعات وحسابات العملاء',
      headers: [
        'رقم الفاتورة',
        'العميل',
        'هاتف العميل',
        'تاريخ الفاتورة',
        'تاريخ الاستحقاق',
        'العملة',
        'المجموع الفرعي',
        'الخصم',
        'الضريبة',
        'الإجمالي النهائي',
        'المبلغ المدفوع',
        'المبلغ المتبقي',
        'الحالة',
      ],
      rows: listToExport.map((inv) => [
        inv.invoice_number,
        inv.customer_name || 'عميل نقدي',
        inv.customer_phone || '-',
        inv.invoice_date || inv.created_at?.split('T')[0] || '-',
        inv.due_date || '-',
        inv.currency || 'YER',
        formatAmount(inv.subtotal, inv.currency),
        formatAmount(inv.discount, inv.currency),
        formatAmount(inv.tax, inv.currency),
        formatAmount(inv.total, inv.currency),
        formatAmount(inv.paid_amount, inv.currency),
        formatAmount(inv.remaining_amount, inv.currency),
        inv.status === 'PAID'
          ? 'مسددة بالكامل'
          : inv.status === 'PARTIALLY_PAID'
          ? 'مسددة جزئياً'
          : inv.status === 'DRAFT'
          ? 'مسودة'
          : inv.status === 'CANCELLED'
          ? 'ملغاة'
          : 'معلقة (ذمة)',
      ]),
    };
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="space-y-6 animate-fadeIn pb-12" id="invoices-tab-container">
      {/* Top Level Module Switcher: POS vs Sales Invoices */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-emerald-900/50 rounded-2xl p-3 sm:p-4 shadow-xl">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubView('invoices')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              activeSubView === 'invoices'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            فواتير المبيعات القياسية (Sales Invoices)
          </button>

          <button
            type="button"
            onClick={() => setActiveSubView('pos')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              activeSubView === 'pos'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            نقطة البيع السريعة (POS)
          </button>
        </div>

        {activeSubView === 'invoices' && invoiceSubView === 'list' && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer"
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <ExportActions getConfig={getExportConfig} />

            <button
              type="button"
              onClick={() => setInvoiceSubView('create')}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              إنشاء فاتورة جديدة
            </button>
          </div>
        )}
      </div>

      {/* POS Sub-module Render */}
      {activeSubView === 'pos' && (
        <div className="bg-slate-900 border border-emerald-900/50 rounded-2xl p-4 shadow-xl">
          <POSMain />
        </div>
      )}

      {/* Sales Invoices Sub-module Render */}
      {activeSubView === 'invoices' && (
        <>
          {/* Notifications */}
          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                إغلاق
              </button>
            </div>
          )}

          {success && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span>{success}</span>
              </div>
              <button
                type="button"
                onClick={() => setSuccess(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                إغلاق
              </button>
            </div>
          )}

          {/* VIEW: CREATE INVOICE */}
          {invoiceSubView === 'create' && (
            <SalesInvoiceCreateView
              onBack={() => setInvoiceSubView('list')}
              onSuccess={(newInv) => {
                setSuccess('تم إنشاء واعتماد الفاتورة بنجاح!');
                setInvoiceSubView('list');
                fetchData();
              }}
              customers={customers}
              products={products}
            />
          )}

          {/* VIEW: INVOICE DETAILS */}
          {invoiceSubView === 'detail' && selectedInvoiceId && (
            <SalesInvoiceDetailView
              invoiceId={selectedInvoiceId}
              onBack={() => {
                setInvoiceSubView('list');
                setSelectedInvoiceId(null);
              }}
              onRefreshList={fetchData}
            />
          )}

          {/* VIEW: INVOICE LIST / REGISTER */}
          {invoiceSubView === 'list' && (
            <div className="space-y-6">
              {/* Dynamic Real-Data KPI Header */}
              <SalesInvoicesKPIs invoices={invoices} currency={selectedCurrency || 'YER'} />

              {/* Advanced Filter Bar */}
              <SalesInvoicesFilterBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                statusFilter={statusFilter}
                onStatusChange={setStatusFilter}
                selectedCustomerId={selectedCustomerId}
                onCustomerChange={setSelectedCustomerId}
                selectedCurrency={selectedCurrency}
                onCurrencyChange={setSelectedCurrency}
                startDate={startDate}
                onStartDateChange={setStartDate}
                endDate={endDate}
                onEndDateChange={setEndDate}
                isOverdueOnly={isOverdueOnly}
                onOverdueToggle={setIsOverdueOnly}
                customers={customers}
                onReset={handleResetFilters}
              />

              {/* Invoices Register Table */}
              <SalesInvoicesTable
                invoices={invoices}
                loading={loading}
                selectedIds={selectedIds}
                onSelectToggle={handleSelectToggle}
                onSelectAll={handleSelectAll}
                onViewDetails={handleViewDetails}
                onRecordPayment={(inv) => setModalPaymentInvoice(inv)}
                onRecordReturn={(inv) => setModalReturnInvoice(inv)}
                onSendEmail={handleSendEmail}
                onDeleteInvoice={handleDeleteInvoice}
                sendingEmailId={sendingEmailId}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalCount={totalCount}
              />
            </div>
          )}

          {/* Quick Payment Modal */}
          {modalPaymentInvoice && (
            <SalesInvoicePaymentModal
              invoice={modalPaymentInvoice}
              isOpen={Boolean(modalPaymentInvoice)}
              onClose={() => setModalPaymentInvoice(null)}
              onSuccess={() => {
                setSuccess('تم تسجيل سند القبض بنجاح!');
                fetchData();
                setTimeout(() => setSuccess(null), 4000);
              }}
            />
          )}

          {/* Quick Return Modal */}
          {modalReturnInvoice && (
            <SalesInvoiceReturnModal
              invoice={modalReturnInvoice}
              isOpen={Boolean(modalReturnInvoice)}
              onClose={() => setModalReturnInvoice(null)}
              onSuccess={() => {
                setSuccess('تم تسجيل مرتجع المبيعات وقيد الإشعار الدائن والمخزون بنجاح!');
                fetchData();
                setTimeout(() => setSuccess(null), 4000);
              }}
            />
          )}
        </>
      )}
    </div>
  );
};
