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
import { formatAmount, getActiveCurrencySymbol } from '../../lib/formatters';
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
  const [selectedInvoiceData, setSelectedInvoiceData] = useState<any | null>(null);

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
  const [selectedPriceTier, setSelectedPriceTier] = useState('');
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
      if (selectedPriceTier) params.price_tier = selectedPriceTier;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (isOverdueOnly) params.is_overdue = 'true';

      const [invRes, custRes, prodRes] = await Promise.all([
        api.getInvoices(params),
        api.getCustomers(),
        api.getProducts(),
      ]);

      let loadedInvoices = Array.isArray(invRes?.data) ? invRes.data : [];

      try {
        const stored = localStorage.getItem('erp_invoices_v1');
        if (stored) {
          const localInvs: any[] = JSON.parse(stored);
          if (Array.isArray(localInvs) && localInvs.length > 0) {
            const serverIds = new Set(
              loadedInvoices.flatMap((i: any) => [
                String(i.id || '').toLowerCase(),
                String(i.invoice_number || i.invoiceNumber || '').toLowerCase(),
              ]).filter(Boolean)
            );
            // Only include offline local invoices that do not exist on the server; server invoices take strict precedence
            const newLocal = localInvs.filter(
              (i: any) =>
                !serverIds.has(String(i.id || '').toLowerCase()) &&
                !serverIds.has(String(i.invoice_number || i.invoiceNumber || '').toLowerCase())
            );
            loadedInvoices = [
              ...loadedInvoices,
              ...newLocal,
            ];
          }
        }
      } catch (e) {
        console.error('Failed to merge local invoices:', e);
      }

      // Filter out hidden/deleted/cancelled invoices and internal return credit records from active sales register
      loadedInvoices = loadedInvoices.filter((inv: any) => {
        if (!inv) return false;
        const st = String(inv.status || '').toUpperCase();
        const refType = String(inv.reference_type || inv.type || '').toUpperCase();
        if (inv.is_deleted || inv.hidden_from_register) return false;
        if (refType === 'SALES_RETURN') return false;
        if ((st === 'CANCELLED' || st === 'RETURNED') && statusFilter.toUpperCase() !== st) return false;
        return true;
      });

      // Smart Auto-Repair for invoices with 0 total or missing fields but existing items
      let hadRepairedInvoices = false;
      loadedInvoices = loadedInvoices.map((inv: any) => {
        const items = Array.isArray(inv.items) ? inv.items : [];
        const itemsSum = items.reduce((acc: number, it: any) => {
          const q = Number(it.quantity || it.qty || 1);
          const p = Number(it.unit_price || it.unitPrice || it.price || 0);
          const d = Number(it.discount || 0);
          const s = Number(it.scrapDiscount || 0);
          const tx = Number(it.tax || 0);
          return acc + Math.max(0, q * p - d - s) + tx;
        }, 0);

        let total = Number(inv.total ?? inv.totalAmount ?? inv.grandTotal ?? inv.netTotal ?? inv.total_amount ?? inv.amount ?? 0);
        if (total === 0 && itemsSum > 0) {
          total = itemsSum;
          hadRepairedInvoices = true;
        }

        const rawRemaining = inv.remaining_amount ?? inv.remainingAmount ?? inv.remainingBalance ?? inv.remaining ?? inv.balanceDue;
        const explicitRemaining = rawRemaining !== undefined && rawRemaining !== null ? Number(rawRemaining) : null;
        const upperStatus = String(inv.status || '').toUpperCase();
        const isPartialOrUnpaidStatus = ['PARTIAL', 'PARTIALLY_PAID', 'ISSUED', 'UNPAID', 'PENDING'].includes(upperStatus);

        const rawPaid = inv.paid_amount ?? inv.paidAmount ?? inv.amountPaid ?? inv.paid;
        let paid =
          rawPaid !== undefined && rawPaid !== null
            ? Number(rawPaid)
            : upperStatus === 'PAID'
              ? total
              : explicitRemaining !== null
                ? Math.max(0, total - explicitRemaining)
                : 0;

        if (
          rawPaid === undefined &&
          paid === 0 &&
          !isPartialOrUnpaidStatus &&
          (explicitRemaining === null || explicitRemaining <= 0) &&
          (inv.payment_method === 'CASH' || inv.paymentMethod === 'CASH' || upperStatus === 'PAID')
        ) {
          paid = total;
          hadRepairedInvoices = true;
        }

        const remaining =
          explicitRemaining !== null && (isPartialOrUnpaidStatus || explicitRemaining > 0)
            ? Math.max(0, Number(Math.min(total, explicitRemaining).toFixed(2)))
            : Math.max(0, Number((total - paid).toFixed(2)));
        const status = upperStatus === 'DRAFT' ? 'draft' : remaining <= 0.01 && total > 0 ? 'paid' : paid > 0 ? 'partial' : 'unpaid';

        return {
          ...inv,
          total,
          totalAmount: total,
          grandTotal: total,
          netTotal: total,
          paid_amount: paid,
          paidAmount: paid,
          amountPaid: paid,
          remaining_amount: remaining,
          remainingAmount: remaining,
          remainingBalance: remaining,
          status: inv.status === 'DRAFT' || inv.status === 'draft' ? 'draft' : status,
          customer_name: inv.customer_name || inv.customerName || inv.customer || inv.clientName || 'عميل نقدي',
          salesperson_name: inv.salesperson_name || inv.salespersonName || inv.salesperson || inv.cashier_name || 'حميد وهاس',
        };
      });

      if (hadRepairedInvoices) {
        try {
          localStorage.setItem('erp_invoices_v1', JSON.stringify(loadedInvoices));
        } catch {}
      }

      // Client-side fallback filter for price tier and itemCode/serial
      if (selectedPriceTier) {
        loadedInvoices = loadedInvoices.filter(
          (inv: any) => (inv.price_tier || inv.tier || 'retail') === selectedPriceTier
        );
      }

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        loadedInvoices = loadedInvoices.filter((inv: any) => {
          const invNum = String(inv.invoice_number || '').toLowerCase();
          const custName = String(inv.customer_name || '').toLowerCase();
          const custPhone = String(inv.customer_phone || '').toLowerCase();
          const repName = String(inv.sales_rep_name || '').toLowerCase();
          const hasItemCode = Array.isArray(inv.items) && inv.items.some((i: any) => 
            String(i.item_code || i.part_number || i.sku || '').toLowerCase().includes(q) ||
            String(i.serial_number || i.dot_code || '').toLowerCase().includes(q) ||
            String(i.name || '').toLowerCase().includes(q)
          );
          return invNum.includes(q) || custName.includes(q) || custPhone.includes(q) || repName.includes(q) || hasItemCode;
        });
      }

      setInvoices(loadedInvoices);
      setTotalCount(
        (invRes as any)?.pagination?.totalRecords ??
        (invRes as any)?.pagination?.total ??
        loadedInvoices.length
      );
      setCustomers(Array.isArray(custRes) ? custRes : (custRes?.data || custRes?.items || []));
      setProducts(Array.isArray(prodRes) ? prodRes : (prodRes?.data || prodRes?.items || []));
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
    const handleWiped = () => {
      setInvoices([]);
      setTotalCount(0);
      setCustomers([]);
      setProducts([]);
      setSelectedIds([]);
      fetchData();
    };
    const handleUpdated = () => {
      fetchData();
    };
    window.addEventListener('erp-demo-data-wiped', handleWiped);
    window.addEventListener('erp-inventory-updated', handleUpdated);
    window.addEventListener('erp-invoices-updated', handleUpdated);
    window.addEventListener('erp-customers-updated', handleUpdated);
    window.addEventListener('erp-data-updated', handleUpdated);
    window.addEventListener('storage', handleUpdated);
    return () => {
      window.removeEventListener('erp-demo-data-wiped', handleWiped);
      window.removeEventListener('erp-inventory-updated', handleUpdated);
      window.removeEventListener('erp-invoices-updated', handleUpdated);
      window.removeEventListener('erp-customers-updated', handleUpdated);
      window.removeEventListener('erp-data-updated', handleUpdated);
      window.removeEventListener('storage', handleUpdated);
    };
  }, [
    activeSubView,
    searchQuery,
    statusFilter,
    selectedCustomerId,
    selectedCurrency,
    selectedPriceTier,
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
    setSelectedPriceTier('');
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
    setSelectedInvoiceData(invoice);
    setSelectedInvoiceId(invoice.id || invoice.invoice_number);
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
    const targetKey = String(invoiceId || '').trim().toLowerCase();
    if (!targetKey) return;

    try {
      setError(null);
      setSuccess(null);

      // 1. Locate the invoice in memory or localStorage before deleting so we can reverse local stock & customer debt
      let targetInv = invoices.find(
        (inv) =>
          String(inv.id || '').toLowerCase() === targetKey ||
          String(inv.invoice_number || inv.invoiceNumber || '').toLowerCase() === targetKey
      );

      if (!targetInv) {
        try {
          const rawLocal = JSON.parse(localStorage.getItem('erp_invoices_v1') || '[]');
          if (Array.isArray(rawLocal)) {
            targetInv = rawLocal.find(
              (inv: any) =>
                String(inv.id || '').toLowerCase() === targetKey ||
                String(inv.invoice_number || inv.invoiceNumber || '').toLowerCase() === targetKey
            );
          }
        } catch {}
      }

      const actualId = targetInv?.id || invoiceId;
      const actualInvNo = targetInv?.invoice_number || targetInv?.invoiceNumber || invoiceId;
      const wasAlreadyReversed =
        String(targetInv?.status || '').toUpperCase() === 'CANCELLED' ||
        String(targetInv?.status || '').toUpperCase() === 'RETURNED';

      // 2. Call Server / Desktop Fallback API to reverse & permanently delete
      try {
        await api.deleteInvoice(String(actualId));
      } catch (apiErr) {
        console.warn('Server deleteInvoice warning (continuing local cleanup):', apiErr);
      }

      // 3. Reverse local inventory stock, customer remaining debt, and linked payment vouchers if not already reversed
      if (targetInv && !wasAlreadyReversed) {
        try {
          const invItems = Array.isArray(targetInv.items) ? targetInv.items : [];
          if (invItems.length > 0) {
            const rawProds = JSON.parse(localStorage.getItem('erp_products_v1') || '[]');
            if (Array.isArray(rawProds) && rawProds.length > 0) {
              const updatedProds = rawProds.map((p: any) => {
                const matchedItem = invItems.find(
                  (it: any) =>
                    (it.product_id && String(it.product_id) === String(p.id)) ||
                    (it.productId && String(it.productId) === String(p.id)) ||
                    (it.id && String(it.id) === String(p.id)) ||
                    (it.item_code && p.sku && String(it.item_code) === String(p.sku)) ||
                    (it.sku && p.sku && String(it.sku) === String(p.sku))
                );
                if (!matchedItem) return p;
                const qty = Math.max(0, Number(matchedItem.quantity ?? matchedItem.qty ?? 1));
                const factor = Number(matchedItem.unitFactor || matchedItem.conversionFactor || 1);
                const baseQty = qty * factor;
                const curStock = Number(p.current_stock ?? p.stock_quantity ?? p.stock ?? p.qty ?? 0);
                const restored = curStock + baseQty;
                return {
                  ...p,
                  current_stock: restored,
                  stock_quantity: restored,
                  stock: restored,
                  qty: restored,
                  quantity: restored,
                };
              });
              localStorage.setItem('erp_products_v1', JSON.stringify(updatedProds));
            }
          }

          // Reverse customer remaining debt on this invoice
          const remDebt = Math.max(
            0,
            Number(
              targetInv.remaining_amount ??
                targetInv.remainingAmount ??
                targetInv.remainingBalance ??
                (Number(targetInv.total || 0) - Number(targetInv.paid_amount ?? targetInv.paidAmount ?? 0))
            )
          );
          const custId = targetInv.customer_id || targetInv.customerId;
          const custName = String(targetInv.customer_name || targetInv.customerName || '').trim().toLowerCase();
          if (remDebt > 0 && (custId || custName)) {
            const rawCusts = JSON.parse(localStorage.getItem('erp_customers_v1') || '[]');
            if (Array.isArray(rawCusts) && rawCusts.length > 0) {
              const updatedCusts = rawCusts.map((c: any) => {
                const isMatch =
                  (custId && String(c.id) === String(custId)) ||
                  (custName && String(c.name || '').trim().toLowerCase() === custName);
                if (!isMatch) return c;
                const curBal = Number(c.current_balance ?? c.balance ?? c.total_debt ?? 0);
                const nextBal = Math.max(0, Number((curBal - remDebt).toFixed(2)));
                return {
                  ...c,
                  current_balance: nextBal,
                  balance: nextBal,
                  total_debt: nextBal,
                };
              });
              localStorage.setItem('erp_customers_v1', JSON.stringify(updatedCusts));
            }
          }

          // Remove linked automatic payment vouchers from erp_payments_v1 & erp_treasury_vouchers_v1
          for (const vKey of ['erp_payments_v1', 'erp_treasury_vouchers_v1']) {
            const rawVouchers = JSON.parse(localStorage.getItem(vKey) || '[]');
            if (Array.isArray(rawVouchers) && rawVouchers.length > 0) {
              const filteredVouchers = rawVouchers.filter((v: any) => {
                const ref = String(v.reference_id || v.reference_no || v.invoice_id || v.invoice_number || '').toLowerCase();
                return ref !== String(actualId).toLowerCase() && ref !== String(actualInvNo).toLowerCase();
              });
              localStorage.setItem(vKey, JSON.stringify(filteredVouchers));
            }
          }
        } catch (revErr) {
          console.error('Failed to reverse local storage records on delete:', revErr);
        }
      }

      // 4. Permanently remove invoice from erp_invoices_v1 and erp_pos_sales_log_v1 so fetchData never re-adds it
      for (const sKey of ['erp_invoices_v1', 'erp_pos_sales_log_v1']) {
        try {
          const rawList = JSON.parse(localStorage.getItem(sKey) || '[]');
          if (Array.isArray(rawList)) {
            const cleaned = rawList.filter(
              (inv: any) =>
                String(inv.id || '').toLowerCase() !== targetKey &&
                String(inv.id || '').toLowerCase() !== String(actualId).toLowerCase() &&
                String(inv.invoice_number || inv.invoiceNumber || '').toLowerCase() !== targetKey &&
                String(inv.invoice_number || inv.invoiceNumber || '').toLowerCase() !== String(actualInvNo).toLowerCase()
            );
            localStorage.setItem(sKey, JSON.stringify(cleaned));
          }
        } catch {}
      }

      // Immediately update UI state
      setInvoices((prev) =>
        prev.filter(
          (inv) =>
            String(inv.id || '').toLowerCase() !== targetKey &&
            String(inv.id || '').toLowerCase() !== String(actualId).toLowerCase() &&
            String(inv.invoice_number || inv.invoiceNumber || '').toLowerCase() !== targetKey &&
            String(inv.invoice_number || inv.invoiceNumber || '').toLowerCase() !== String(actualInvNo).toLowerCase()
        )
      );
      setSelectedIds((prev) => prev.filter((id) => String(id).toLowerCase() !== targetKey));

      window.dispatchEvent(new Event('erp-invoices-updated'));
      window.dispatchEvent(new Event('erp-inventory-updated'));
      window.dispatchEvent(new Event('erp-customers-updated'));
      window.dispatchEvent(new Event('erp-data-updated'));

      setSuccess('تم حذف الفاتورة من السجل وإعادة البضاعة للمخزن وعكس الحسابات بنجاح');
      fetchData();
      setTimeout(() => setSuccess(null), 4000);
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
      rows: listToExport.map((inv) => {
        const rawTotal = Number(inv.total ?? inv.totalAmount ?? inv.grandTotal ?? inv.netTotal ?? inv.total_amount ?? inv.amount ?? 0);
        const itemsSum = Array.isArray(inv.items) && inv.items.length > 0
          ? inv.items.reduce((acc: number, it: any) => acc + Number(it.total || (Number(it.quantity || 1) * Number(it.unit_price || it.price || 0) - Number(it.discount || 0))), 0)
          : 0;
        const total = rawTotal > 0 ? rawTotal : itemsSum;
        const paid = Number(
          inv.paid_amount ?? inv.paidAmount ?? inv.amountPaid ?? inv.paid ?? (inv.status === 'PAID' || inv.status === 'paid' ? total : 0)
        );
        const remaining = Math.max(
          0,
          Number(
            inv.remaining_amount ?? inv.remainingAmount ?? inv.remainingBalance ?? inv.remaining ?? inv.balanceDue ?? (total - paid)
          )
        );
        const customerDisplayName = (inv.customer_name || inv.customerName || inv.clientName || inv.customer || 'عميل نقدي').trim();

        return [
          inv.invoice_number,
          customerDisplayName,
          inv.customer_phone || '-',
          inv.invoice_date || inv.created_at?.split('T')[0] || '-',
          inv.due_date || '-',
          `${getActiveCurrencySymbol(inv.currency)} (${inv.currency || 'YER'})`,
          formatAmount(inv.subtotal || total, inv.currency),
          formatAmount(inv.discount || 0, inv.currency),
          formatAmount(inv.tax || 0, inv.currency),
          formatAmount(total, inv.currency),
          formatAmount(paid, inv.currency),
          formatAmount(remaining, inv.currency),
          remaining <= 0.01 && total > 0
            ? 'مسددة بالكامل'
            : paid > 0 && remaining > 0.01
            ? 'مسددة جزئياً'
            : inv.status === 'DRAFT'
            ? 'مسودة'
            : inv.status === 'CANCELLED'
            ? 'ملغاة'
            : 'معلقة (ذمة)',
        ];
      }),
    };
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="space-y-6 animate-fadeIn pb-12" id="invoices-tab-container">
      {/* Top Level Module Switcher: POS vs Sales Invoices */}
      <div className="m3-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 sm:p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveSubView('invoices')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              activeSubView === 'invoices'
                ? 'm3-btn-primary'
                : 'm3-btn-outlined'
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
                ? 'm3-btn-primary'
                : 'm3-btn-outlined'
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
              className="m3-btn-outlined p-2.5"
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <ExportActions getConfig={getExportConfig} />

            <button
              type="button"
              onClick={() => setInvoiceSubView('create')}
              className="m3-btn-primary flex items-center gap-2 px-4 py-2 text-sm font-bold"
            >
              <Plus className="w-4 h-4" />
              إنشاء فاتورة جديدة
            </button>
          </div>
        )}
      </div>

      {/* POS Sub-module Render */}
      {activeSubView === 'pos' && (
        <div className="m3-card p-4">
          <POSMain />
        </div>
      )}

      {/* Sales Invoices Sub-module Render */}
      {activeSubView === 'invoices' && (
        <>
          {/* Notifications */}
          {error && (
            <div className="p-4 bg-[var(--md-error-container)] border border-[var(--md-error)]/30 rounded-2xl text-[var(--md-on-error-container)] text-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-[var(--md-error)]" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-[var(--md-on-error-container)] hover:underline text-xs font-semibold cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          )}

          {success && (
            <div className="p-4 bg-[var(--md-success-container)] border border-[var(--md-success)]/30 rounded-2xl text-[var(--md-on-success-container)] text-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-[var(--md-success)]" />
                <span>{success}</span>
              </div>
              <button
                type="button"
                onClick={() => setSuccess(null)}
                className="text-[var(--md-on-success-container)] hover:underline text-xs font-semibold cursor-pointer"
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
              initialInvoice={selectedInvoiceData}
              onBack={() => {
                setInvoiceSubView('list');
                setSelectedInvoiceId(null);
                setSelectedInvoiceData(null);
              }}
              onRefreshList={fetchData}
              onDeleteInvoice={handleDeleteInvoice}
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
                selectedPriceTier={selectedPriceTier}
                onPriceTierChange={setSelectedPriceTier}
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
