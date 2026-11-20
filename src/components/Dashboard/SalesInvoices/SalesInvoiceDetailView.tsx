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
  Trash2,
} from 'lucide-react';

interface SalesInvoiceDetailViewProps {
  invoiceId: string;
  initialInvoice?: any;
  onBack: () => void;
  onRefreshList?: () => void;
  onDeleteInvoice?: (invoiceId: string) => Promise<void> | void;
}

export const SalesInvoiceDetailView: React.FC<SalesInvoiceDetailViewProps> = ({
  invoiceId,
  initialInvoice,
  onBack,
  onRefreshList,
  onDeleteInvoice,
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

  const safeReadLocalArray = (key: string): any[] => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const enrichInvoiceDetails = (baseInv: any) => {
    const invIdNorm = String(baseInv?.id || '').trim().toLowerCase();
    const invNumNorm = String(baseInv?.invoice_number || baseInv?.invoiceNumber || '').trim().toLowerCase();
    const matchesRef = (val: any) => {
      const norm = String(val || '').trim().toLowerCase();
      if (!norm) return false;
      return (invIdNorm && norm === invIdNorm) || (invNumNorm && norm === invNumNorm);
    };

    // 1. Items normalization
    const rawItems = Array.isArray(baseInv.items) && baseInv.items.length > 0
      ? baseInv.items
      : Array.isArray(baseInv.lines)
        ? baseInv.lines
        : [];
    const normalizedItems = rawItems.map((it: any) => {
      const qty = Number(it.quantity ?? it.qty ?? 1);
      const unitPrice = Number(it.unit_price ?? it.unitPrice ?? it.price ?? 0);
      const discount = Number(it.discount || 0);
      const tax = Number(it.tax || 0);
      const itemTotal = Number(it.total ?? Math.max(0, qty * unitPrice - discount + tax));
      const unitLabel = it.unit_name || it.unit || it.product_unit || 'حبة';
      const prodName = it.product_name || it.name || it.item_name || it.description || 'صنف مبيعات';
      return {
        ...it,
        product_name: prodName,
        name: it.name || prodName,
        quantity: qty,
        unit_price: unitPrice,
        total: itemTotal,
        unit_name: unitLabel,
        unit: it.unit || unitLabel,
      };
    });

    // 2. Payments from erp_payments_v1 & erp_treasury_vouchers_v1
    let enrichedPayments = Array.isArray(baseInv.payments) ? [...baseInv.payments] : [];
    if (enrichedPayments.length === 0) {
      const storedPayments = [
        ...safeReadLocalArray('erp_payments_v1'),
        ...safeReadLocalArray('erp_treasury_vouchers_v1'),
      ];
      const matchedPayments = storedPayments.filter((p: any) =>
        matchesRef(p.referenceId) ||
        matchesRef(p.reference_id) ||
        matchesRef(p.referenceNo) ||
        matchesRef(p.reference_no) ||
        matchesRef(p.invoiceId) ||
        matchesRef(p.invoice_id) ||
        matchesRef(p.invoiceNumber) ||
        matchesRef(p.invoice_number)
      );

      if (matchedPayments.length > 0) {
        const seen = new Set<string>();
        enrichedPayments = matchedPayments
          .filter((p: any) => {
            const k = String(p.id || p.voucher_number || p.referenceNo || Math.random());
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
          })
          .map((p: any) => ({
            id: p.id || `pmt-${Date.now()}`,
            payment_date: p.payment_date || p.paymentDate || p.date || p.created_at,
            created_at: p.created_at || p.date || baseInv.created_at,
            amount: Number(p.amount || 0),
            payment_method: p.payment_method || p.paymentMethod || baseInv.payment_method || 'CASH',
            reference: p.voucher_number || p.voucherNumber || p.reference || p.referenceNo || baseInv.invoice_number || '-',
            notes: p.notes || p.description || '-',
            currency: p.currency || baseInv.currency || 'YER',
          }));
      } else {
        const paidAmt = Number(baseInv.paid_amount ?? baseInv.paidAmount ?? baseInv.amountPaid ?? baseInv.paid ?? 0);
        if (paidAmt > 0) {
          enrichedPayments = [
            {
              id: `init-pmt-${baseInv.id || baseInv.invoice_number || '1'}`,
              payment_date: baseInv.invoice_date || baseInv.created_at,
              created_at: baseInv.created_at || baseInv.invoice_date || new Date().toISOString(),
              amount: paidAmt,
              payment_method: baseInv.payment_method || baseInv.paymentMethod || 'CASH',
              reference: baseInv.invoice_number || baseInv.invoiceNumber || baseInv.id || '-',
              notes: `دفعة أولية مسددة عند إنشاء الفاتورة (${baseInv.payment_method || 'CASH'})`,
              currency: baseInv.currency || 'YER',
            },
          ];
        }
      }
    }

    // 3. Returns from erp_sales_returns_v1
    let enrichedReturns = Array.isArray(baseInv.returns) ? [...baseInv.returns] : [];
    if (enrichedReturns.length === 0) {
      const storedReturns = safeReadLocalArray('erp_sales_returns_v1');
      enrichedReturns = storedReturns
        .filter((r: any) =>
          matchesRef(r.invoice_id) ||
          matchesRef(r.invoiceId) ||
          matchesRef(r.invoice_number) ||
          matchesRef(r.invoiceNumber) ||
          matchesRef(r.reference_id) ||
          matchesRef(r.referenceId)
        )
        .map((r: any) => ({
          ...r,
          return_number: r.return_number || r.returnNumber || r.id,
          return_date: r.return_date || r.returnDate || r.date || r.created_at,
          total_amount: Number(r.total_amount ?? r.totalAmount ?? r.amount ?? 0),
          refund_method: r.refund_method || r.refundMethod || 'CREDIT_NOTE',
          reason: r.reason || r.notes || '-',
        }));
    }

    // 4. Ledger entries from erp_journal_entries_v1
    let enrichedLedger = Array.isArray(baseInv.ledger_entries) ? [...baseInv.ledger_entries] : [];
    if (enrichedLedger.length === 0) {
      const storedJournals = safeReadLocalArray('erp_journal_entries_v1');
      const matchedJournals = storedJournals.filter((je: any) => {
        const descNorm = String(je.description || '').toLowerCase();
        return (
          matchesRef(je.reference_id) ||
          matchesRef(je.referenceId) ||
          matchesRef(je.invoice_id) ||
          matchesRef(je.invoiceId) ||
          matchesRef(je.id) ||
          (invNumNorm && descNorm.includes(invNumNorm))
        );
      });

      const mappedLines: any[] = [];
      matchedJournals.forEach((je: any) => {
        if (Array.isArray(je.lines) && je.lines.length > 0) {
          je.lines.forEach((line: any, idx: number) => {
            const d = Number(line.debit || 0);
            const c = Number(line.credit || 0);
            mappedLines.push({
              id: line.id || `${je.id || 'je'}_line_${idx}`,
              reference_number: je.entry_number || je.reference_id || je.id,
              reference_id: je.reference_id || je.id,
              account_code: line.account_code || '',
              account_name: line.account_name || line.account_code || 'حساب عام',
              entry_type: d > 0 ? 'DEBIT' : 'CREDIT',
              amount: d > 0 ? d : c,
              debit: d,
              credit: c,
              description: line.description || je.description || '-',
              created_at: line.created_at || je.date || je.created_at,
              currency: baseInv.currency || 'YER',
            });
          });
        } else {
          const d = Number(je.debit ?? je.total_debit ?? 0);
          const c = Number(je.credit ?? je.total_credit ?? 0);
          mappedLines.push({
            id: je.id || `je_${mappedLines.length}`,
            reference_number: je.entry_number || je.reference_id || je.id,
            reference_id: je.reference_id || je.id,
            account_code: je.account_code || '',
            account_name: je.account_name || je.account_type || 'حساب عام',
            entry_type: d >= c ? 'DEBIT' : 'CREDIT',
            amount: d >= c ? d : c,
            debit: d,
            credit: c,
            description: je.description || '-',
            created_at: je.date || je.created_at,
            currency: baseInv.currency || 'YER',
          });
        }
      });
      enrichedLedger = mappedLines;
    }

    // 5. Inventory movements from erp_inventory_movements_v1
    let enrichedMovements = Array.isArray(baseInv.inventory_movements) ? [...baseInv.inventory_movements] : [];
    if (enrichedMovements.length === 0) {
      const storedMovs = safeReadLocalArray('erp_inventory_movements_v1');
      enrichedMovements = storedMovs
        .filter((im: any) =>
          matchesRef(im.reference_id) ||
          matchesRef(im.referenceId) ||
          matchesRef(im.reference_number) ||
          matchesRef(im.referenceNumber) ||
          matchesRef(im.invoice_id) ||
          matchesRef(im.invoiceId)
        )
        .map((im: any) => ({
          ...im,
          product_name: im.product_name || im.productName || im.name || 'منتج مخزني',
          quantity: Number(im.quantity ?? im.qty ?? 0),
          created_at: im.created_at || im.date || baseInv.created_at,
        }));
    }

    // 6. Customer current balance from erp_customers_v1
    let resolvedCustomerBalance = baseInv.customer_balance;
    if (resolvedCustomerBalance === undefined || resolvedCustomerBalance === null || Number(resolvedCustomerBalance) === 0) {
      const storedCustomers = safeReadLocalArray('erp_customers_v1');
      const custIdStr = String(baseInv.customer_id || baseInv.customerId || '').trim();
      const custNameStr = String(baseInv.customer_name || baseInv.customerName || baseInv.clientName || baseInv.customer || '').trim();
      const matchedCust = storedCustomers.find(
        (c: any) =>
          (custIdStr && custIdStr !== 'cust-cash' && custIdStr !== 'cust-direct' && String(c.id) === custIdStr) ||
          (custNameStr && custNameStr !== 'عميل نقدي' && String(c.name || '').trim() === custNameStr)
      );
      if (matchedCust) {
        resolvedCustomerBalance = Number(matchedCust.current_balance ?? matchedCust.balance ?? 0);
      } else {
        resolvedCustomerBalance = Number(baseInv.newTotalBalance ?? baseInv.customer_balance ?? 0);
      }
    }

    return {
      ...baseInv,
      items: normalizedItems,
      payments: enrichedPayments,
      returns: enrichedReturns,
      ledger_entries: enrichedLedger,
      inventory_movements: enrichedMovements,
      customer_balance: resolvedCustomerBalance,
    };
  };

  const fetchDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      let found: any = null;
      try {
        const res = await api.getInvoiceById(invoiceId);
        if (res?.success && res?.data) {
          found = res.data;
        }
      } catch {
        // Fallback to localStorage / initialInvoice below
      }

      if (!found) {
        const targetKeys = new Set(
          [
            invoiceId,
            initialInvoice?.id,
            initialInvoice?.invoice_number,
            initialInvoice?.invoiceNumber,
          ]
            .filter(Boolean)
            .map((v) => String(v).trim().toLowerCase())
        );

        const localCandidates = [
          ...safeReadLocalArray('erp_invoices_v1'),
          ...safeReadLocalArray('erp_pos_sales_log_v1'),
        ];

        found =
          localCandidates.find((inv: any) => {
            const idMatch = inv?.id && targetKeys.has(String(inv.id).trim().toLowerCase());
            const numMatch = inv?.invoice_number && targetKeys.has(String(inv.invoice_number).trim().toLowerCase());
            const altNumMatch = inv?.invoiceNumber && targetKeys.has(String(inv.invoiceNumber).trim().toLowerCase());
            return Boolean(idMatch || numMatch || altNumMatch);
          }) ||
          initialInvoice ||
          null;
      }

      if (found) {
        setInvoice(enrichInvoiceDetails(found));
      } else {
        setError('تعذر تحميل بيانات الفاتورة');
      }
    } catch (err: any) {
      if (initialInvoice) {
        setInvoice(enrichInvoiceDetails(initialInvoice));
      } else {
        setError(err.message || 'حدث خطأ أثناء تحميل الفاتورة');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (invoiceId || initialInvoice) {
      fetchDetails();
    }
  }, [invoiceId, initialInvoice]);

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
        receivedBy: invoice.receivedBy || invoice.received_by,
        previousBalance: invoice.previousBalance ?? invoice.previous_balance,
        currentInvoiceAmount: printTotal,
        newTotalBalance: invoice.newTotalBalance ?? invoice.new_total_balance ?? invoice.customer_balance,
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
      <div className="flex flex-col items-center justify-center min-h-[400px] text-[var(--md-on-surface-variant)]">
        <div className="w-10 h-10 border-4 border-[var(--md-primary)] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm">جاري تحميل تفاصيل الفاتورة القياسية...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="m3-card p-8 text-center max-w-lg mx-auto my-8">
        <AlertTriangle className="w-12 h-12 text-[var(--md-error)] mx-auto mb-4" />
        <h3 className="text-lg font-bold text-[var(--md-on-surface)] mb-2">تعذر عرض الفاتورة</h3>
        <p className="text-sm text-[var(--md-on-surface-variant)] mb-6">{error || 'الفاتورة المطلوبة غير موجودة'}</p>
        <button
          onClick={onBack}
          className="m3-btn-outlined px-5 py-2 text-sm font-medium cursor-pointer"
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
        <span className="m3-badge m3-badge-success inline-flex items-center gap-1.5 text-xs font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--md-success)] animate-pulse"></span>
          مسددة بالكامل (PAID)
        </span>
      );
    }
    if (status === 'PARTIALLY_PAID' || (paid > 0 && rem > 0.01)) {
      return (
        <span className="m3-badge m3-badge-info inline-flex items-center gap-1.5 text-xs font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--md-info)]"></span>
          مسددة جزئياً (PARTIAL)
        </span>
      );
    }
    if (status === 'DRAFT') {
      return (
        <span className="m3-badge bg-[var(--md-surface-container-high)] text-[var(--md-on-surface-variant)] border border-[var(--md-outline-variant)] inline-flex items-center gap-1.5 text-xs font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--md-on-surface-variant)]"></span>
          مسودة (DRAFT)
        </span>
      );
    }
    if (status === 'CANCELLED') {
      return (
        <span className="m3-badge m3-badge-error inline-flex items-center gap-1.5 text-xs font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--md-error)]"></span>
          ملغاة (CANCELLED)
        </span>
      );
    }
    return (
      <span className="m3-badge m3-badge-warning inline-flex items-center gap-1.5 text-xs font-semibold">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--md-warning)]"></span>
        معلقة / ذمة (PENDING)
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12" id="sales-invoice-detail-view">
      {/* Top Action & Navigation Bar */}
      <div className="m3-card p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="m3-btn-tonal p-2.5 flex items-center justify-center cursor-pointer"
            title="الرجوع للقائمة"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-[var(--md-on-surface)] tracking-tight flex items-center gap-2">
                فاتورة مبيعات <span className="font-mono text-[var(--md-primary-text)] font-extrabold tabular-nums">#{invoice.invoice_number}</span>
              </h1>
              <button
                type="button"
                onClick={copyInvoiceNumber}
                className="text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] p-1 rounded transition-colors cursor-pointer"
                title="نسخ رقم الفاتورة"
              >
                {copiedNo ? <Check className="w-4 h-4 text-[var(--md-success)]" /> : <Copy className="w-4 h-4" />}
              </button>
              {getStatusBadge(invoice.status, remaining)}
            </div>
            <p className="text-xs text-[var(--md-on-surface-variant)] mt-1 flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1 font-mono tabular-nums">
                <Calendar className="w-3.5 h-3.5" />
                تاريخ الإصدار: {invoice.invoice_date || invoice.created_at?.split('T')[0]}
              </span>
              {invoice.due_date && (
                <span className="flex items-center gap-1 text-[var(--md-warning)] font-mono tabular-nums">
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
              className="m3-btn-primary px-4 py-2 text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer"
            >
              <DollarSign className="w-4 h-4" />
              سداد دفعة
            </button>
          )}

          {invoice.status !== 'DRAFT' && invoice.status !== 'CANCELLED' && (
            <button
              type="button"
              onClick={() => setIsReturnModalOpen(true)}
              className="m3-btn-tonal px-4 py-2 text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-[var(--md-warning)]" />
              مرتجع / إشعار دائن
            </button>
          )}

          {onDeleteInvoice && (
            <button
              type="button"
              onClick={async () => {
                await onDeleteInvoice(invoice.id || invoice.invoice_number);
                onBack();
              }}
              className="m3-btn-danger px-4 py-2 text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer"
              title="حذف الفاتورة من السجل وإعادة البضاعة للمخزن وعكس الحسابات"
            >
              <Trash2 className="w-4 h-4" />
              حذف الفاتورة وعكس الحسابات
            </button>
          )}

          <button
            type="button"
            onClick={handlePrint}
            className="m3-btn-primary px-4 py-2 text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            طباعة الفاتورة
          </button>

          <button
            type="button"
            onClick={handleSendEmail}
            disabled={isSendingEmail}
            className="m3-btn-outlined px-3.5 py-2 disabled:opacity-50 text-xs sm:text-sm font-medium flex items-center gap-1.5 cursor-pointer"
            title="إرسال عبر البريد الإلكتروني"
          >
            <Mail className="w-4 h-4" />
            {isSendingEmail ? 'جاري الإرسال...' : 'إرسال بريد'}
          </button>
        </div>
      </div>

      {emailSuccess && (
        <div className="p-3 bg-[var(--md-success-container)] border border-[var(--md-success)]/30 rounded-xl text-[var(--md-on-success-container)] text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{emailSuccess}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Grand Total */}
        <div className="m3-card p-4">
          <p className="text-xs font-medium text-[var(--md-on-surface-variant)] mb-1">إجمالي الفاتورة النهائي</p>
          <h3 className="text-2xl font-bold text-[var(--md-on-surface)] tracking-tight font-mono tabular-nums">
            {formatAmount(total, invoice.currency || 'YER')}
          </h3>
          <p className="text-xs text-[var(--md-on-surface-variant)] mt-1">العملة: {invoice.currency || 'YER'}</p>
        </div>

        {/* 2. Paid Amount */}
        <div className="m3-card p-4">
          <p className="text-xs font-medium text-[var(--md-success)] mb-1">المبلغ المحصل (المدفوع)</p>
          <h3 className="text-2xl font-bold text-[var(--md-success)] tracking-tight font-mono tabular-nums">
            {formatAmount(paid, invoice.currency || 'YER')}
          </h3>
          <p className="text-xs text-[var(--md-on-surface-variant)] mt-1">{payments.length} عمليات سداد مسجلة</p>
        </div>

        {/* 3. Remaining */}
        <div className="m3-card p-4">
          <p className="text-xs font-medium text-[var(--md-warning)] mb-1">الرصيد المتبقي (الذمة)</p>
          <h3 className="text-2xl font-bold text-[var(--md-warning)] tracking-tight font-mono tabular-nums">
            {formatAmount(remaining, invoice.currency || 'YER')}
          </h3>
          <p className="text-xs text-[var(--md-on-surface-variant)] mt-1">
            {remaining <= 0.01 ? 'تم تصفية الفاتورة بالكامل' : 'مستحق الدفع'}
          </p>
        </div>

        {/* 4. Customer Balance info */}
        <div className="m3-card p-4">
          <p className="text-xs font-medium text-[var(--md-primary-text)] mb-1">رصيد العميل الحالي الإجمالي</p>
          <h3 className="text-2xl font-bold text-[var(--md-primary-text)] tracking-tight font-mono tabular-nums">
            {formatAmount(invoice.customer_balance || 0, invoice.customer_currency || invoice.currency || 'YER')}
          </h3>
          <p className="text-xs text-[var(--md-on-surface-variant)] mt-1">حساب: {invoice.customer_name}</p>
        </div>
      </div>

      {/* Customer Info & Invoice Meta Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Information Card */}
        <div className="m3-card p-5 space-y-3">
          <div className="flex items-center gap-2 text-[var(--md-primary-text)] font-semibold text-sm border-b border-[var(--md-outline-variant)] pb-2">
            <User className="w-4 h-4" />
            <span>بيانات العميل</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--md-on-surface-variant)] text-xs">اسم العميل:</span>
              <span className="text-[var(--md-on-surface)] font-medium">{customerName}</span>
            </div>
            {(invoice.receivedBy || invoice.received_by) && (
              <div className="flex justify-between bg-[var(--md-info-container)] border border-[var(--md-outline-variant)] px-2.5 py-1.5 rounded-xl">
                <span className="text-[var(--md-on-info-container)] text-xs font-bold">المستلم / الساحب:</span>
                <span className="text-[var(--md-on-info-container)] font-bold font-mono">{invoice.receivedBy || invoice.received_by}</span>
              </div>
            )}
            {invoice.customer_phone && (
              <div className="flex justify-between">
                <span className="text-[var(--md-on-surface-variant)] text-xs">رقم الهاتف:</span>
                <span className="text-[var(--md-on-surface)] font-mono tabular-nums" dir="ltr">{invoice.customer_phone}</span>
              </div>
            )}
            {invoice.customer_email && (
              <div className="flex justify-between">
                <span className="text-[var(--md-on-surface-variant)] text-xs">البريد الإلكتروني:</span>
                <span className="text-[var(--md-on-surface)] font-mono text-xs">{invoice.customer_email}</span>
              </div>
            )}
            {invoice.customer_address && (
              <div className="flex justify-between">
                <span className="text-[var(--md-on-surface-variant)] text-xs">العنوان:</span>
                <span className="text-[var(--md-on-surface)] text-xs">{invoice.customer_address}</span>
              </div>
            )}
            {invoice.customer_tax_number && (
              <div className="flex justify-between">
                <span className="text-[var(--md-on-surface-variant)] text-xs">الرقم الضريبي:</span>
                <span className="text-[var(--md-on-surface)] font-mono text-xs tabular-nums">{invoice.customer_tax_number}</span>
              </div>
            )}
          </div>
        </div>

        {/* Invoice Parameters Card */}
        <div className="m3-card p-5 space-y-3">
          <div className="flex items-center gap-2 text-[var(--md-success)] font-semibold text-sm border-b border-[var(--md-outline-variant)] pb-2">
            <FileText className="w-4 h-4" />
            <span>بيانات الفاتورة المالية</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--md-on-surface-variant)] text-xs">الرقم المرجعي:</span>
              <span className="text-[var(--md-on-surface)] font-mono font-bold tabular-nums">#{invoice.invoice_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--md-on-surface-variant)] text-xs">تاريخ الفاتورة:</span>
              <span className="text-[var(--md-on-surface)] font-mono tabular-nums">{invoice.invoice_date || invoice.created_at?.split('T')[0]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--md-on-surface-variant)] text-xs">تاريخ الاستحقاق:</span>
              <span className="text-[var(--md-on-surface)]">{invoice.due_date || 'غير محدد (فوري)'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--md-on-surface-variant)] text-xs">طريقة الدفع:</span>
              <span className="font-semibold text-xs text-[var(--md-success)]">
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
              <span className="text-[var(--md-on-surface-variant)] text-xs">العملة وسعر الصرف:</span>
              <span className="text-[var(--md-on-surface)] font-mono text-xs tabular-nums">
                {invoice.currency || 'YER'} (سعر التحويل: {invoice.exchange_rate || 1.0})
              </span>
            </div>
          </div>
        </div>

        {/* Notes & Breakdown Card */}
        <div className="m3-card p-5 space-y-3">
          <div className="flex items-center gap-2 text-[var(--md-secondary)] font-semibold text-sm border-b border-[var(--md-outline-variant)] pb-2">
            <Activity className="w-4 h-4" />
            <span>الملاحظات والملخص المالي</span>
          </div>
          <div className="space-y-1.5 text-xs text-[var(--md-on-surface)]">
            <div className="flex justify-between">
              <span className="text-[var(--md-on-surface-variant)]">المجموع الفرعي:</span>
              <span className="font-mono tabular-nums">{formatAmount(invoice.subtotal || 0, invoice.currency || 'YER')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--md-on-surface-variant)]">الخصم التجاري:</span>
              <span className="font-mono tabular-nums text-[var(--md-error)]">-{formatAmount(invoice.discount || 0, invoice.currency || 'YER')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--md-on-surface-variant)]">ضريبة القيمة المضافة:</span>
              <span className="font-mono tabular-nums text-[var(--md-success)]">+{formatAmount(invoice.tax || 0, invoice.currency || 'YER')}</span>
            </div>
            <div className="border-t border-[var(--md-outline-variant)] pt-1.5 flex justify-between font-bold text-sm text-[var(--md-on-surface)]">
              <span>الإجمالي النهائي:</span>
              <span className="font-mono tabular-nums text-[var(--md-primary-text)]">{formatAmount(total, invoice.currency || 'YER')}</span>
            </div>
          </div>
          {invoice.notes && (
            <div className="mt-2 pt-2 border-t border-[var(--md-outline-variant)] text-xs text-[var(--md-on-surface-variant)] italic">
              ملاحظات: {invoice.notes}
            </div>
          )}
        </div>
      </div>

      {/* Tabs Navigation for Full Audit & Integrations */}
      <div className="border-b border-[var(--md-outline-variant)] flex items-center gap-2 overflow-x-auto text-sm">
        <button
          type="button"
          onClick={() => setActiveTab('items')}
          className={`pb-3 px-3 font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'items'
              ? 'border-[var(--md-primary)] text-[var(--md-primary-text)]'
              : 'border-transparent text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
          }`}
        >
          <Package className="w-4 h-4" />
          أصناف الفاتورة ({items.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('payments')}
          className={`pb-3 px-3 font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'payments'
              ? 'border-[var(--md-primary)] text-[var(--md-primary-text)]'
              : 'border-transparent text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          سجل الدفعات والسندات ({payments.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('returns')}
          className={`pb-3 px-3 font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'returns'
              ? 'border-[var(--md-primary)] text-[var(--md-primary-text)]'
              : 'border-transparent text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          المرتجعات والإشعارات الدائنة ({returns.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ledger')}
          className={`pb-3 px-3 font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'ledger'
              ? 'border-[var(--md-primary)] text-[var(--md-primary-text)]'
              : 'border-transparent text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
          }`}
        >
          <Layers className="w-4 h-4" />
          القيود المحاسبية بالدفتر الأستاذ ({ledgerEntries.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('inventory')}
          className={`pb-3 px-3 font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'inventory'
              ? 'border-[var(--md-primary)] text-[var(--md-primary-text)]'
              : 'border-transparent text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
          }`}
        >
          <Building className="w-4 h-4" />
          حركات المخزون ({inventoryMovements.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`pb-3 px-3 font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'audit'
              ? 'border-[var(--md-primary)] text-[var(--md-primary-text)]'
              : 'border-transparent text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          سجل التعديلات والأنشطة ({auditLogs.length})
        </button>
      </div>

      {/* Tab 1: Line Items */}
      {activeTab === 'items' && (
        <div className="m3-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="m3-table w-full text-right text-sm">
              <thead className="m3-thead text-xs font-semibold uppercase">
                <tr>
                  <th className="m3-th py-3.5 px-4">#</th>
                  <th className="m3-th py-3.5 px-4">الصنف / الوصف</th>
                  <th className="m3-th py-3.5 px-4 text-center">رقم الصنف / القطعة</th>
                  <th className="m3-th py-3.5 px-4 text-center">الوحدة</th>
                  <th className="m3-th py-3.5 px-4 text-center">الكمية</th>
                  <th className="m3-th py-3.5 px-4 text-left">سعر الوحدة</th>
                  <th className="m3-th py-3.5 px-4 text-left">الخصم</th>
                  <th className="m3-th py-3.5 px-4 text-left">الضريبة</th>
                  <th className="m3-th py-3.5 px-4 text-left">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--md-outline-variant)]">
                {items.map((it: any, idx: number) => {
                  const qty = parseFloat(it.quantity || '0');
                  const unitPrice = parseFloat(it.unit_price || '0');
                  const discount = parseFloat(it.discount || '0');
                  const tax = parseFloat(it.tax || '0');
                  const itemTotal = parseFloat(it.total || `${qty * unitPrice - discount + tax}`);
                  const unitStr = it.unit || it.product_unit || 'حبة';

                  return (
                    <tr key={it.id || idx} className="hover:bg-[var(--md-surface-container-low)] transition-colors">
                      <td className="py-3 px-4 text-[var(--md-on-surface-variant)] text-xs font-mono tabular-nums">{idx + 1}</td>
                      <td className="py-3 px-4 font-medium text-[var(--md-on-surface)]">
                        <div>{it.product_name || it.name || it.description || 'صنف مبيعات'}</div>
                        {(it.activityType === 'tire' || it.tireSize) && (
                          <div className="text-[10px] text-[var(--md-info)] font-mono mt-0.5">
                            🛞 مقاس: {it.tireSize || '-'} {it.tireProductionDot ? `[DOT: ${it.tireProductionDot}]` : ''} {it.warrantyMonths ? `(ضمان ${it.warrantyMonths} شهر)` : ''}
                          </div>
                        )}
                        {it.serialNumber && (
                          <div className="text-[10px] text-[var(--md-warning)] font-mono mt-0.5">
                            ⚡ سيريال: {it.serialNumber} {it.warrantyEndDate ? `(ضمان حتى ${it.warrantyEndDate})` : ''}
                          </div>
                        )}
                        {!it.product_id && (
                          <span className="m3-badge mr-2 text-[10px] bg-[var(--md-surface-container-high)] text-[var(--md-on-surface-variant)]">
                            صنف يدوي
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center text-[var(--md-primary-text)] font-bold text-xs font-mono tabular-nums">
                        {it.itemCode || it.partNumber || it.product_sku || it.sku || '-'}
                      </td>
                      <td className="py-3 px-4 text-center text-xs text-[var(--md-on-surface-variant)] font-medium">{unitStr}</td>
                      <td className="py-3 px-4 text-center font-mono font-medium text-[var(--md-on-surface)] tabular-nums">{qty}</td>
                      <td className="py-3 px-4 text-left font-mono text-[var(--md-on-surface-variant)] tabular-nums">
                        {formatAmount(unitPrice, invoice.currency || 'YER')}
                      </td>
                      <td className="py-3 px-4 text-left font-mono text-[var(--md-error)] tabular-nums">
                        {discount > 0 ? `-${formatAmount(discount, invoice.currency || 'YER')}` : '-'}
                      </td>
                      <td className="py-3 px-4 text-left font-mono text-[var(--md-success)] tabular-nums">
                        {tax > 0 ? `+${formatAmount(tax, invoice.currency || 'YER')}` : '-'}
                      </td>
                      <td className="py-3 px-4 text-left font-mono font-bold text-[var(--md-on-surface)] tabular-nums">
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
        <div className="m3-card overflow-hidden">
          {payments.length === 0 ? (
            <div className="p-8 text-center text-[var(--md-on-surface-variant)] text-sm">
              لا توجد دفعات أو سندات قبض مسجلة لهذه الفاتورة بعد.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="m3-table w-full text-right text-sm">
                <thead className="m3-thead text-xs font-semibold uppercase">
                  <tr>
                    <th className="m3-th py-3.5 px-4">تاريخ السند</th>
                    <th className="m3-th py-3.5 px-4">المبلغ</th>
                    <th className="m3-th py-3.5 px-4">طريقة الدفع</th>
                    <th className="m3-th py-3.5 px-4">المرجع</th>
                    <th className="m3-th py-3.5 px-4">الملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--md-outline-variant)]">
                  {payments.map((p: any) => (
                    <tr key={p.id} className="hover:bg-[var(--md-surface-container-low)] transition-colors">
                      <td className="py-3 px-4 text-[var(--md-on-surface-variant)] text-xs font-mono tabular-nums">
                        {p.payment_date || p.created_at?.split('T')[0]}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-[var(--md-success)] tabular-nums">
                        {formatAmount(p.amount, p.currency || invoice.currency || 'YER')}
                      </td>
                      <td className="py-3 px-4 text-[var(--md-on-surface-variant)] text-xs">
                        <span className="m3-badge bg-[var(--md-surface-container-high)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] text-[11px]">
                          {p.payment_method === 'CASH'
                            ? 'نقداً'
                            : p.payment_method === 'BANK'
                              ? 'تحويل بنكي'
                              : p.payment_method === 'WALLET'
                                ? 'محفظة إلكترونية'
                                : p.payment_method}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[var(--md-on-surface)] text-xs font-mono tabular-nums">{p.reference || '-'}</td>
                      <td className="py-3 px-4 text-[var(--md-on-surface-variant)] text-xs">{p.notes || '-'}</td>
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
        <div className="m3-card overflow-hidden">
          {returns.length === 0 ? (
            <div className="p-8 text-center text-[var(--md-on-surface-variant)] text-sm">
              لا توجد مرتجعات أو إشعارات دائنة مسجلة على هذه الفاتورة.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="m3-table w-full text-right text-sm">
                <thead className="m3-thead text-xs font-semibold uppercase">
                  <tr>
                    <th className="m3-th py-3.5 px-4">رقم المرتجع</th>
                    <th className="m3-th py-3.5 px-4">التاريخ</th>
                    <th className="m3-th py-3.5 px-4">قيمة المرتجع</th>
                    <th className="m3-th py-3.5 px-4">طريقة التسوية</th>
                    <th className="m3-th py-3.5 px-4">السبب</th>
                    <th className="m3-th py-3.5 px-4">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--md-outline-variant)]">
                  {returns.map((r: any) => (
                    <tr key={r.id} className="hover:bg-[var(--md-surface-container-low)] transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[var(--md-warning)] text-xs tabular-nums">
                        #{r.return_number}
                      </td>
                      <td className="py-3 px-4 text-[var(--md-on-surface-variant)] text-xs font-mono tabular-nums">
                        {r.return_date || r.created_at?.split('T')[0]}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-[var(--md-error)] tabular-nums">
                        -{formatAmount(r.total_amount, invoice.currency || 'YER')}
                      </td>
                      <td className="py-3 px-4 text-[var(--md-on-surface)] text-xs">
                        {r.refund_method === 'CREDIT_NOTE' ? 'إشعار دائن (رصيد)' : r.refund_method === 'CASH_REFUND' ? 'استرجاع نقدي' : r.refund_method}
                      </td>
                      <td className="py-3 px-4 text-[var(--md-on-surface-variant)] text-xs">{r.reason || '-'}</td>
                      <td className="py-3 px-4">
                        <span className="m3-badge m3-badge-success text-xs font-semibold">مكتمل</span>
                      </td>
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
        <div className="m3-card overflow-hidden">
          {ledgerEntries.length === 0 ? (
            <div className="p-8 text-center text-[var(--md-on-surface-variant)] text-sm">
              لا توجد قيود أستاذ محاسبية مسجلة (الفاتورة مسودة أو قيد الإعداد).
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="m3-table w-full text-right text-sm">
                <thead className="m3-thead text-xs font-semibold uppercase">
                  <tr>
                    <th className="m3-th py-3.5 px-4">رقم القيد / المرجع</th>
                    <th className="m3-th py-3.5 px-4">الحساب المحاسبي</th>
                    <th className="m3-th py-3.5 px-4">نوع المعاملة</th>
                    <th className="m3-th py-3.5 px-4 text-left">مدين (Debit)</th>
                    <th className="m3-th py-3.5 px-4 text-left">دائن (Credit)</th>
                    <th className="m3-th py-3.5 px-4">البيان</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--md-outline-variant)]">
                  {ledgerEntries.map((l: any) => {
                    const isDebit = l.entry_type === 'DEBIT';
                    return (
                      <tr key={l.id} className="hover:bg-[var(--md-surface-container-low)] transition-colors font-mono text-xs">
                        <td className="py-3 px-4 text-[var(--md-on-surface-variant)] font-bold tabular-nums">{l.reference_number || l.reference_id?.slice(0, 8)}</td>
                        <td className="py-3 px-4 text-[var(--md-on-surface)] font-sans font-medium">{l.account_name || l.account_code || 'حساب عام'}</td>
                        <td className="py-3 px-4">
                          <span className={`m3-badge text-[10px] font-bold ${
                            isDebit ? 'm3-badge-info' : 'm3-badge-success'
                          }`}>
                            {isDebit ? 'مدين (DEBIT)' : 'دائن (CREDIT)'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-left font-bold text-[var(--md-info)] tabular-nums">
                          {isDebit ? formatAmount(l.amount, l.currency || invoice.currency || 'YER') : '-'}
                        </td>
                        <td className="py-3 px-4 text-left font-bold text-[var(--md-success)] tabular-nums">
                          {!isDebit ? formatAmount(l.amount, l.currency || invoice.currency || 'YER') : '-'}
                        </td>
                        <td className="py-3 px-4 text-[var(--md-on-surface-variant)] font-sans">{l.description || '-'}</td>
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
        <div className="m3-card overflow-hidden">
          {inventoryMovements.length === 0 ? (
            <div className="p-8 text-center text-[var(--md-on-surface-variant)] text-sm">
              لا توجد حركات مخزنية مباشرة (أصناف خدمية أو مسودة).
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="m3-table w-full text-right text-sm">
                <thead className="m3-thead text-xs font-semibold uppercase">
                  <tr>
                    <th className="m3-th py-3.5 px-4">المنتج</th>
                    <th className="m3-th py-3.5 px-4">نوع الحركة</th>
                    <th className="m3-th py-3.5 px-4 text-center">الكمية المصروفة</th>
                    <th className="m3-th py-3.5 px-4">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--md-outline-variant)]">
                  {inventoryMovements.map((im: any) => (
                    <tr key={im.id} className="hover:bg-[var(--md-surface-container-low)] transition-colors">
                      <td className="py-3 px-4 font-medium text-[var(--md-on-surface)]">{im.product_name || 'منتج مخزني'}</td>
                      <td className="py-3 px-4">
                        <span className="m3-badge m3-badge-error text-[11px] font-medium">
                          صرف مبيعات (STOCK OUT)
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-[var(--md-error)] tabular-nums">
                        -{im.quantity}
                      </td>
                      <td className="py-3 px-4 text-[var(--md-on-surface-variant)] text-xs font-mono tabular-nums">
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
        <div className="m3-card p-6">
          {auditLogs.length === 0 ? (
            <div className="text-center text-[var(--md-on-surface-variant)] text-sm">
              لا توجد سجلات تدقيق إضافية.
            </div>
          ) : (
            <div className="space-y-4">
              {auditLogs.map((log: any, idx: number) => (
                <div key={log.id || idx} className="flex items-start gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-[var(--md-primary-container)] border border-[var(--md-outline-variant)] flex items-center justify-center text-[var(--md-on-primary-container)] flex-shrink-0 mt-0.5">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div className="flex-1 bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[var(--md-on-surface)]">{log.action}</span>
                      <span className="text-xs text-[var(--md-on-surface-variant)] font-mono tabular-nums">{log.created_at}</span>
                    </div>
                    <p className="text-xs text-[var(--md-on-surface-variant)] mt-1">
                      بواسطة: {log.user_name || log.user_email || 'مستخدم النظام'}
                    </p>
                    {log.details && (
                      <pre className="mt-2 p-2 bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] rounded text-[11px] font-mono text-[var(--md-on-surface-variant)] overflow-x-auto">
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
            onRefreshList?.();
            onBack();
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
