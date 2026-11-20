import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../../api';
import { formatAmount, formatNumber, toEnglishDigits, formatDateOnly } from '../../lib/formatters';
import { getAccountingRate } from '../../lib/exchangeRates';
import { ExportActions } from '../Common/ExportActions';
import { TableExportConfig, printPaymentReceipt } from '../../lib/exportUtils';
import { enqueueOutboxTransaction } from '../../services/transactionalOutbox';
import { useAuth } from '../../context/AuthContext';
import {
  CreditCard,
  Plus,
  Search,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowDownLeft,
  ArrowUpRight,
  UserCheck,
  Building2,
  Printer,
  Ban,
  FileText,
  Calendar,
  Wallet,
  Landmark,
  Layers,
  Sparkles,
  Info,
  RefreshCw,
  Eye,
  Check,
  DollarSign,
  Receipt,
  FileSpreadsheet,
} from 'lucide-react';

interface PaymentAllocation {
  invoice_id: string;
  invoice_number?: string;
  invoice_date?: string;
  invoice_total?: number;
  previous_paid?: number;
  remaining_balance?: number;
  allocated_amount: number;
}

export const PaymentsTab: React.FC = () => {
  const { company, user } = useAuth();

  // Primary Data States
  const [payments, setPayments] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);

  // Filters
  const [activeTab, setActiveTab] = useState<'ALL' | 'CUSTOMER_PAYMENT' | 'SUPPLIER_PAYMENT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Messages
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paymentType, setPaymentType] = useState<'CUSTOMER_PAYMENT' | 'SUPPLIER_PAYMENT'>('CUSTOMER_PAYMENT');
  const [selectedEntityId, setSelectedEntityId] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('YER');
  const [exchangeRate, setExchangeRate] = useState('1.0');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Method-specific Fields
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [walletProvider, setWalletProvider] = useState('');
  const [walletNumber, setWalletNumber] = useState('');
  const [checkNumber, setCheckNumber] = useState('');
  const [checkDueDate, setCheckDueDate] = useState('');
  const [operationNumber, setOperationNumber] = useState('');
  const [senderName, setSenderName] = useState('');
  const [transferFee, setTransferFee] = useState('');

  // Allocation State
  const [allocationMode, setAllocationMode] = useState<'ON_ACCOUNT' | 'ALLOCATE_INVOICES'>('ON_ACCOUNT');
  const [invoiceAllocations, setInvoiceAllocations] = useState<{ [invoiceId: string]: number }>({});

  // View Details Modal State
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedPaymentDetails, setSelectedPaymentDetails] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Cancel Modal State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelTargetPayment, setCancelTargetPayment] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchPaymentsAndStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const typeParam = activeTab === 'ALL' ? undefined : activeTab;

      const [payRes, statsRes, custRes, suppRes, invRes, purRes] = await Promise.all([
        api.getPayments({
          type: typeParam,
          status: statusFilter || undefined,
          payment_method: methodFilter || undefined,
          currency: currencyFilter || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          search: searchQuery || undefined,
        }),
        api.getPaymentStats(),
        api.getCustomers(),
        api.getSuppliers(),
        api.getInvoices(),
        api.getPurchaseInvoices(),
      ]);

      let loadedPayments = Array.isArray(payRes) ? payRes : (payRes?.data || payRes?.items || []);
      try {
        const stored = localStorage.getItem('erp_payments_v1');
        if (stored) {
          const localList: any[] = JSON.parse(stored);
          if (Array.isArray(localList) && localList.length > 0) {
            const serverIds = new Set(loadedPayments.map((p: any) => p.id || p.voucher_number));
            const newLocal = localList.filter((p: any) => !serverIds.has(p.id) && !serverIds.has(p.voucher_number));
            loadedPayments = [...newLocal, ...loadedPayments];
          }
        }
      } catch (e) {
        console.warn('Failed to merge local payments:', e);
      }

      setPayments(loadedPayments);
      setStats(statsRes?.data || null);
      setCustomers(Array.isArray(custRes) ? custRes : (custRes?.data || custRes?.items || []));
      setSuppliers(Array.isArray(suppRes) ? suppRes : (suppRes?.data || suppRes?.items || []));
      setInvoices(Array.isArray(invRes) ? invRes : (invRes?.data || invRes?.items || []));
      setPurchaseInvoices(Array.isArray(purRes) ? purRes : (purRes?.data || purRes?.items || []));
    } catch (err: any) {
      setError(err.message || 'فشل تحميل بيانات السندات المالية والتحصيلات');
    } finally {
      setLoading(false);
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentsAndStats();
    const handleWiped = () => {
      setPayments([]);
      setStats(null);
      setCustomers([]);
      setSuppliers([]);
      setInvoices([]);
      setPurchaseInvoices([]);
      fetchPaymentsAndStats();
    };
    const handleUpdated = () => {
      fetchPaymentsAndStats();
    };
    window.addEventListener('erp-demo-data-wiped', handleWiped);
    window.addEventListener('erp-payments-updated', handleUpdated);
    window.addEventListener('erp-data-updated', handleUpdated);
    window.addEventListener('storage', handleUpdated);
    return () => {
      window.removeEventListener('erp-demo-data-wiped', handleWiped);
      window.removeEventListener('erp-payments-updated', handleUpdated);
      window.removeEventListener('erp-data-updated', handleUpdated);
      window.removeEventListener('storage', handleUpdated);
    };
  }, [activeTab, statusFilter, methodFilter, currencyFilter, startDate, endDate]);

  // Selected party object
  const selectedParty = useMemo(() => {
    if (paymentType === 'CUSTOMER_PAYMENT') {
      return customers.find((c) => c.id === selectedEntityId) || null;
    } else {
      return suppliers.find((s) => s.id === selectedEntityId) || null;
    }
  }, [paymentType, selectedEntityId, customers, suppliers]);

  // Eligible unpaid invoices for selected party
  const partyInvoices = useMemo(() => {
    if (!selectedEntityId) return [];
    if (paymentType === 'CUSTOMER_PAYMENT') {
      return invoices.filter((inv) => {
        const matchesParty = inv.customer_id === selectedEntityId || (selectedParty && inv.customer_name === selectedParty.name);
        const due = Number(inv.remaining_amount ?? inv.balance_due ?? (Number(inv.total ?? inv.total_amount ?? 0) - Number(inv.paid_amount ?? 0)));
        return matchesParty && due > 0;
      });
    } else {
      return purchaseInvoices.filter((inv) => {
        const matchesParty = inv.supplier_id === selectedEntityId || (selectedParty && (inv.supplier_name === selectedParty.name || inv.supplier === selectedParty.name));
        const due = Number(inv.remaining_amount ?? inv.balance_due ?? (Number(inv.total ?? inv.total_amount ?? 0) - Number(inv.paid_amount ?? 0)));
        return matchesParty && due > 0;
      });
    }
  }, [paymentType, selectedEntityId, selectedParty, invoices, purchaseInvoices]);

  const handleOpenCreateModal = (type: 'CUSTOMER_PAYMENT' | 'SUPPLIER_PAYMENT') => {
    setPaymentType(type);
    const defaultList = type === 'CUSTOMER_PAYMENT' ? customers : suppliers;
    const firstEntity = defaultList[0];

    setSelectedEntityId(firstEntity?.id || '');
    setAmount('');
    setCurrency(firstEntity?.currency || 'YER');
    setExchangeRate('1.0');
    setPaymentMethod('CASH');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setReference('');
    setNotes('');
    setBankName('');
    setBankAccountNumber('');
    setWalletProvider('');
    setWalletNumber('');
    setCheckNumber('');
    setCheckDueDate('');
    setOperationNumber('');
    setSenderName('');
    setTransferFee('');
    setAllocationMode('ON_ACCOUNT');
    setInvoiceAllocations({});
    setIsModalOpen(true);
  };

  // Auto-distribute entered amount across pending invoices
  const handleAutoDistribute = () => {
    const totalToAllocate = Number(amount || 0);
    if (totalToAllocate <= 0) return;

    let remaining = totalToAllocate;
    const newAllocations: { [invoiceId: string]: number } = {};

    for (const inv of partyInvoices) {
      if (remaining <= 0) break;
      const invDue = Number(inv.balance_due || inv.remaining_amount || (Number(inv.total_amount || 0) - Number(inv.paid_amount || 0)));
      if (invDue > 0) {
        const alloc = Math.min(remaining, invDue);
        newAllocations[inv.id] = Math.round(alloc * 100) / 100;
        remaining -= alloc;
      }
    }

    setInvoiceAllocations(newAllocations);
    setAllocationMode('ALLOCATE_INVOICES');
  };

  const totalAllocatedAmount = useMemo(() => {
    return Object.values(invoiceAllocations).reduce((sum: number, val: number) => sum + Number(val || 0), 0);
  }, [invoiceAllocations]);

  const unallocatedExcess = useMemo(() => {
    const total = Number(amount || 0);
    return Math.max(0, total - totalAllocatedAmount);
  }, [amount, totalAllocatedAmount]);

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError('يرجى إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }

    if (!selectedEntityId) {
      setError(paymentType === 'CUSTOMER_PAYMENT' ? 'يرجى اختيار العميل' : 'يرجى اختيار المورد');
      return;
    }

    // Build allocations list if in allocation mode
    const allocationsList: any[] = [];
    if (allocationMode === 'ALLOCATE_INVOICES') {
      Object.entries(invoiceAllocations).forEach(([invId, allocAmt]) => {
        if (Number(allocAmt) > 0) {
          allocationsList.push({
            invoice_id: invId,
            allocated_amount: Number(allocAmt),
          });
        }
      });
    }

    const payload = {
      type: paymentType,
      customer_id: paymentType === 'CUSTOMER_PAYMENT' ? selectedEntityId : undefined,
      customer_name: paymentType === 'CUSTOMER_PAYMENT' ? selectedParty?.name : undefined,
      supplier_id: paymentType === 'SUPPLIER_PAYMENT' ? selectedEntityId : undefined,
      supplier_name: paymentType === 'SUPPLIER_PAYMENT' ? selectedParty?.name : undefined,
      party_name: selectedParty?.name,
      amount: parsedAmount,
      currency: currency || 'YER',
      exchange_rate: Number(exchangeRate) || 1.0,
      payment_method: paymentMethod,
      payment_date: paymentDate,
      reference: reference || undefined,
      notes: notes || undefined,
      bank_name: bankName || undefined,
      bank_account_number: bankAccountNumber || undefined,
      wallet_provider: walletProvider || undefined,
      wallet_number: walletNumber || undefined,
      check_number: checkNumber || undefined,
      check_due_date: checkDueDate || undefined,
      operation_number: operationNumber || undefined,
      sender_name: senderName || undefined,
      transfer_fee: Number(transferFee) || 0,
      allocations: allocationsList.length > 0 ? allocationsList : undefined,
    };

    try {
      setIsSubmitting(true);
      const res = await api.createPayment(payload);

      // Enqueue into persistent Transactional Outbox (CR-2026-TAURI-OFFLINE-SYNC-001)
      try {
        const pmtRecord = res?.data || { ...payload, id: `pmt-${Date.now()}` };
        enqueueOutboxTransaction(
          paymentType === 'CUSTOMER_PAYMENT' ? 'MANUAL_RECEIPT_VOUCHER' : 'MANUAL_PAYMENT_VOUCHER',
          pmtRecord,
          {
            dependencyOrder: 40,
            idempotencyKey: `pmt_${pmtRecord.id || Date.now()}`,
          }
        ).catch((e) => console.warn('[OUTBOX_PAYMENTS_WARN]', e));
      } catch (outboxErr) {
        console.warn('[OUTBOX_PAYMENTS_ERR]', outboxErr);
      }

      setIsModalOpen(false);
      setSuccess(
        paymentType === 'CUSTOMER_PAYMENT'
          ? `تم إنشاء سند القبض رقم ${res?.data?.voucher_number || res?.data?.reference || ''} بنجاح وقيده محاسبياً`
          : `تم إنشاء سند الصرف رقم ${res?.data?.voucher_number || res?.data?.reference || ''} بنجاح وقيده محاسبياً`
      );
      await fetchPaymentsAndStats();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حفظ السند المالي');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDetails = async (paymentId: string) => {
    try {
      setDetailsLoading(true);
      setIsDetailsOpen(true);
      const res = await api.getPaymentDetails(paymentId);
      setSelectedPaymentDetails(res?.data || null);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل تفاصيل السند المالي');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleOpenCancelDialog = (p: any) => {
    setCancelTargetPayment(p);
    setCancelReason('');
    setIsCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!cancelTargetPayment) return;
    if (!cancelReason.trim()) {
      setError('يرجى كتابة سبب الإلغاء');
      return;
    }

    try {
      setIsCancelling(true);
      await api.cancelPayment(cancelTargetPayment.id, cancelReason);
      setIsCancelModalOpen(false);
      if (isDetailsOpen && selectedPaymentDetails?.id === cancelTargetPayment.id) {
        setIsDetailsOpen(false);
      }
      setSuccess(`تم إلغاء السند ${cancelTargetPayment.voucher_number || cancelTargetPayment.reference || ''} وعكس كافة القيود المحاسبية بنجاح`);
      await fetchPaymentsAndStats();
    } catch (err: any) {
      setError(err.message || 'فشل إلغاء السند المالي');
    } finally {
      setIsCancelling(false);
    }
  };

  const resolvePartyName = (p: any): string => {
    return (
      p?.customer_name ||
      p?.supplier_name ||
      p?.party_name ||
      p?.partyName ||
      customers.find((c) => String(c.id) === String(p?.customer_id || p?.party_id))?.name ||
      suppliers.find((s) => String(s.id) === String(p?.supplier_id || p?.party_id))?.name ||
      'طرف عام'
    );
  };

  const handlePrintVoucher = (p: any) => {
    printPaymentReceipt({
      companyName: company?.name || 'المؤسسة التجارية',
      type: p.type === 'SUPPLIER_PAYMENT' ? 'SUPPLIER_PAYMENT' : 'CUSTOMER_PAYMENT',
      receiptNumber: p.voucher_number || p.reference || `VOUCH-${p.id.slice(0, 8).toUpperCase()}`,
      date: p.payment_date ? new Date(p.payment_date).toLocaleDateString('ar-YE') : new Date().toLocaleDateString('ar-YE'),
      partyName: resolvePartyName(p),
      phone: p.customer_phone || p.supplier_phone,
      accountNumber: p.customer_account_number || p.supplier_account_number,
      amount: Number(p.amount || 0),
      currency: p.currency || 'YER',
      paymentMethod: p.payment_method || 'CASH',
      bankName: p.bank_name,
      iban: p.bank_account_number,
      walletProvider: p.wallet_provider,
      walletNumber: p.wallet_number,
      operationNumber: p.operation_number,
      senderName: p.sender_name,
      transferFee: Number(p.transfer_fee || 0),
      creatorName: p.created_by_name || user?.name,
      reference: p.reference,
      notes: p.notes,
      allocations: p.allocations?.map((a: any) => ({
        invoiceNumber: a.invoice_number,
        invoiceDate: a.invoice_date,
        invoiceTotal: Number(a.invoice_total || 0),
        previousPaid: Number(a.previous_paid || 0),
        allocatedAmount: Number(a.allocated_amount || 0),
        remainingBalance: Number(a.remaining_balance || 0),
      })),
    });
  };

  // Filtered payments list
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      // 1. activeTab filter
      if (activeTab === 'CUSTOMER_PAYMENT') {
        const isReceipt = p.type === 'CUSTOMER_PAYMENT' || p.voucher_type === 'RECEIPT' || p.payment_type === 'IN';
        if (!isReceipt) return false;
      } else if (activeTab === 'SUPPLIER_PAYMENT') {
        const isPayment = p.type === 'SUPPLIER_PAYMENT' || p.voucher_type === 'PAYMENT' || p.payment_type === 'OUT';
        if (!isPayment) return false;
      }

      // 2. statusFilter
      if (statusFilter && (p.status || 'CONFIRMED') !== statusFilter) {
        return false;
      }

      // 3. methodFilter
      if (methodFilter && !String(p.payment_method || 'CASH').toUpperCase().includes(methodFilter)) {
        return false;
      }

      // 4. currencyFilter
      if (currencyFilter && (p.currency || 'YER') !== currencyFilter) {
        return false;
      }

      // 5. Date filters
      const pDate = String(p.payment_date || p.date || '').split('T')[0];
      if (startDate && pDate && pDate < startDate) {
        return false;
      }
      if (endDate && pDate && pDate > endDate) {
        return false;
      }

      // 6. Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const vNum = (p.voucher_number || '').toLowerCase();
        const name = resolvePartyName(p).toLowerCase();
        const ref = (p.reference || '').toLowerCase();
        const op = (p.operation_number || '').toLowerCase();
        const notes = (p.notes || '').toLowerCase();
        if (!vNum.includes(q) && !name.includes(q) && !ref.includes(q) && !op.includes(q) && !notes.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [payments, activeTab, statusFilter, methodFilter, currencyFilter, startDate, endDate, searchQuery, customers, suppliers]);

  const totalReceipts = useMemo(() => {
    return filteredPayments
      .filter(
        (p) =>
          (p.type === 'CUSTOMER_PAYMENT' ||
            p.voucher_type === 'RECEIPT' ||
            p.payment_type === 'IN' ||
            p.payment_type === 'RECEIPT') &&
          p.status !== 'CANCELLED'
      )
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }, [filteredPayments]);

  const totalDisbursements = useMemo(() => {
    return filteredPayments
      .filter(
        (p) =>
          (p.type === 'SUPPLIER_PAYMENT' ||
            p.voucher_type === 'PAYMENT' ||
            p.payment_type === 'OUT' ||
            p.payment_type === 'PAYMENT' ||
            p.type === 'EXPENSE') &&
          p.status !== 'CANCELLED'
      )
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }, [filteredPayments]);

  const getPaymentExportConfig = (): TableExportConfig => ({
    filename: `vouchers_${new Date().toISOString().split('T')[0]}`,
    title: 'سجل السندات والتحصيلات المالية',
    subtitle:
      activeTab === 'CUSTOMER_PAYMENT'
        ? 'سندات القبض (مقبوضات العملاء)'
        : activeTab === 'SUPPLIER_PAYMENT'
        ? 'سندات الدفع (مدفوعات الموردين)'
        : 'كافة السندات المالية المقيدة بالدفاتر',
    filterBadges: [
      ...(activeTab !== 'ALL' ? [{ label: 'نوع السند', value: activeTab === 'CUSTOMER_PAYMENT' ? 'سند قبض' : 'سند صرف' }] : []),
      ...(statusFilter ? [{ label: 'الحالة', value: statusFilter === 'CONFIRMED' ? 'معتمد' : 'ملغي' }] : []),
      ...(methodFilter ? [{ label: 'طريقة الدفع', value: methodFilter }] : []),
      ...(currencyFilter ? [{ label: 'العملة', value: currencyFilter }] : []),
      ...(searchQuery ? [{ label: 'بحث', value: searchQuery }] : []),
    ],
    summaryCards: [
      { label: 'إجمالي سندات القبض', value: `${formatAmount(totalReceipts)} YER` },
      { label: 'إجمالي سندات الدفع', value: `${formatAmount(totalDisbursements)} YER` },
      { label: 'صافي الحركة', value: `${formatAmount(totalReceipts - totalDisbursements)} YER` },
      { label: 'عدد السندات المعروضة', value: filteredPayments.length },
    ],
    headers: ['رقم السند', 'النوع', 'الطرف (العميل / المورد)', 'المبلغ', 'العملة', 'طريقة الدفع', 'التاريخ', 'الحالة', 'المرجع / رقم العملية', 'البيان'],
    rows: filteredPayments.map((p) => [
      p.voucher_number || p.reference || '-',
      p.type === 'CUSTOMER_PAYMENT' ? 'سند قبض' : 'سند صرف',
      resolvePartyName(p),
      p.amount || 0,
      p.currency || 'YER',
      p.payment_method === 'CASH'
        ? 'نقداً'
        : p.payment_method === 'BANK' || p.payment_method === 'BANK_TRANSFER'
        ? 'تحويل بنكي'
        : p.payment_method === 'WALLET'
        ? 'محفظة إلكترونية'
        : p.payment_method === 'CHECK' || p.payment_method === 'CHEQUE'
        ? 'شيك مصرفي'
        : p.payment_method,
      p.payment_date ? new Date(p.payment_date).toLocaleDateString('ar-YE') : '-',
      p.status === 'CANCELLED' ? 'ملغي' : 'معتمد',
      p.operation_number || p.reference || '-',
      p.notes || '-',
    ]),
    alignments: ['center', 'center', 'right', 'right', 'center', 'center', 'center', 'center', 'center', 'right'],
  });

  return (
    <div className="space-y-6 text-right text-[var(--md-on-surface)] font-sans" id="vouchers-module-root" dir="rtl">
      {/* 1. Header & Primary Action Bar */}
      <div className="m3-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4" id="vouchers-header">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-[var(--md-radius-md)] bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border border-[var(--md-outline-variant)] flex items-center justify-center shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-[var(--md-on-surface)] tracking-tight">السندات والتحصيلات المالية</h1>
            <p className="text-xs font-medium text-[var(--md-on-surface-variant)] mt-0.5">
              إدارة سندات القبض من العملاء وسندات الدفع للموردين مع التسوية المحاسبية والربط التلقائي بالفواتير
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={() => fetchPaymentsAndStats()}
            disabled={loading}
            className="m3-btn-outlined !px-3"
            title="تحديث البيانات"
            id="btn-refresh-vouchers"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <ExportActions getConfig={getPaymentExportConfig} />

          <button
            onClick={() => handleOpenCreateModal('CUSTOMER_PAYMENT')}
            className="m3-btn-primary text-xs sm:text-sm"
            id="btn-create-customer-receipt"
          >
            <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
            <span>سند قبض من عميل</span>
          </button>

          <button
            onClick={() => handleOpenCreateModal('SUPPLIER_PAYMENT')}
            className="m3-btn-danger text-xs sm:text-sm"
            id="btn-create-supplier-payment"
          >
            <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
            <span>سند دفع لمورد</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-center justify-between p-4 bg-[var(--md-error-container)] border border-[var(--md-error)]/30 rounded-[var(--md-radius-md)] text-[var(--md-on-error-container)] text-sm">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="p-1 opacity-80 hover:opacity-100 rounded-lg cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center justify-between p-4 bg-[var(--md-success-container)] border border-[var(--md-success)]/30 rounded-[var(--md-radius-md)] text-[var(--md-on-success-container)] text-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span className="font-semibold">{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="p-1 opacity-80 hover:opacity-100 rounded-lg cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="vouchers-stats-cards">
        {/* Total / Today's Receipts */}
        <div className="m3-card p-4.5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-[var(--md-on-surface-variant)]">إجمالي المقبوضات (سندات القبض)</span>
            <div className="text-xl font-extrabold text-[var(--md-success)] font-mono tabular-nums">
              {formatAmount(totalReceipts || stats?.totalCollected || stats?.month?.receipts || 0)} <span className="text-xs font-sans text-[var(--md-on-surface-variant)]">YER</span>
            </div>
            <div className="text-[11px] text-[var(--md-on-surface-variant)] tabular-nums">
              مقبوضات اليوم: <span className="font-mono font-bold text-[var(--md-on-surface)]">{formatAmount(stats?.today?.receipts || 0)}</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-[var(--md-radius-md)] bg-[var(--md-success-container)] text-[var(--md-on-success-container)] flex items-center justify-center shrink-0">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        </div>

        {/* Total / Today's Disbursements */}
        <div className="m3-card p-4.5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-[var(--md-on-surface-variant)]">إجمالي المدفوعات (سندات الصرف)</span>
            <div className="text-xl font-extrabold text-[var(--md-error)] font-mono tabular-nums">
              {formatAmount(totalDisbursements || stats?.totalDisbursed || stats?.month?.payments || 0)} <span className="text-xs font-sans text-[var(--md-on-surface-variant)]">YER</span>
            </div>
            <div className="text-[11px] text-[var(--md-on-surface-variant)] tabular-nums">
              مدفوعات اليوم: <span className="font-mono font-bold text-[var(--md-on-surface)]">{formatAmount(stats?.today?.payments || 0)}</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-[var(--md-radius-md)] bg-[var(--md-error-container)] text-[var(--md-on-error-container)] flex items-center justify-center shrink-0">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        {/* Net Movement */}
        <div className="m3-card p-4.5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-[var(--md-on-surface-variant)]">صافي حركة الخزينة</span>
            <div
              className={`text-xl font-extrabold font-mono tabular-nums ${
                ((totalReceipts - totalDisbursements) || stats?.netCashflow || stats?.month?.net || 0) >= 0 ? 'text-[var(--md-primary-text)]' : 'text-[var(--md-warning)]'
              }`}
            >
              {formatAmount((totalReceipts - totalDisbursements) || stats?.netCashflow || stats?.month?.net || 0)} <span className="text-xs font-sans text-[var(--md-on-surface-variant)]">YER</span>
            </div>
            <div className="text-[11px] text-[var(--md-on-surface-variant)] tabular-nums">
              صافي حركة اليوم: <span className="font-mono font-bold text-[var(--md-on-surface)]">{formatAmount(stats?.today?.net || 0)}</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-[var(--md-radius-md)] bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Filtered View Summary */}
        <div className="m3-card p-4.5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-[var(--md-on-surface-variant)]">السندات المعروضة</span>
            <div className="text-xl font-extrabold text-[var(--md-on-surface)] font-mono tabular-nums">
              {filteredPayments.length} <span className="text-xs font-sans text-[var(--md-on-surface-variant)]">سند</span>
            </div>
            <div className="text-[11px] text-[var(--md-on-surface-variant)] font-mono tabular-nums">
              قبض: {formatAmount(totalReceipts)} | دفع: {formatAmount(totalDisbursements)}
            </div>
          </div>
          <div className="w-11 h-11 rounded-[var(--md-radius-md)] bg-[var(--md-surface-container-high)] text-[var(--md-on-surface-variant)] flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Main Navigation Tabs & Filters Bar */}
      <div className="m3-card overflow-hidden" id="vouchers-tabs-and-filters">
        {/* Tabs Bar */}
        <div className="flex border-b border-[var(--md-outline-variant)] px-4 pt-3 gap-2 bg-[var(--md-surface-container-low)] overflow-x-auto">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`flex items-center gap-2 pb-3 px-4 font-bold text-sm border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'ALL'
                ? 'border-[var(--md-primary)] text-[var(--md-primary-text)] bg-[var(--md-surface-container)] rounded-t-[var(--md-radius-md)]'
                : 'border-transparent text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
            }`}
            id="tab-all-vouchers"
          >
            <Layers className="w-4 h-4" />
            <span>كافة السندات المالية</span>
            <span className="px-2 py-0.5 text-xs rounded-full bg-[var(--md-surface-container-high)] text-[var(--md-on-surface-variant)] font-mono tabular-nums">
              {payments.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('CUSTOMER_PAYMENT')}
            className={`flex items-center gap-2 pb-3 px-4 font-bold text-sm border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'CUSTOMER_PAYMENT'
                ? 'border-[var(--md-success)] text-[var(--md-success)] bg-[var(--md-surface-container)] rounded-t-[var(--md-radius-md)]'
                : 'border-transparent text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
            }`}
            id="tab-receipt-vouchers"
          >
            <ArrowDownLeft className="w-4 h-4 text-[var(--md-success)]" />
            <span>سندات القبض (مقبوضات العملاء)</span>
          </button>

          <button
            onClick={() => setActiveTab('SUPPLIER_PAYMENT')}
            className={`flex items-center gap-2 pb-3 px-4 font-bold text-sm border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'SUPPLIER_PAYMENT'
                ? 'border-[var(--md-error)] text-[var(--md-error)] bg-[var(--md-surface-container)] rounded-t-[var(--md-radius-md)]'
                : 'border-transparent text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
            }`}
            id="tab-payment-vouchers"
          >
            <ArrowUpRight className="w-4 h-4 text-[var(--md-error)]" />
            <span>سندات الدفع (مدفوعات الموردين)</span>
          </button>
        </div>

        {/* Filters Row */}
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 bg-[var(--md-surface-container-low)]/60 border-b border-[var(--md-outline-variant)]">
          {/* Search Box */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[var(--md-on-surface-variant)] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث برقم السند، الطرف، المرجع، البيان..."
              className="m3-input !h-10 !pr-9 text-xs"
              id="input-vouchers-search"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="m3-select !h-10 text-xs"
              id="select-voucher-status"
            >
              <option value="">جميع الحالات</option>
              <option value="CONFIRMED">معتمد (CONFIRMED)</option>
              <option value="CANCELLED">ملغي (CANCELLED)</option>
            </select>
          </div>

          {/* Method Filter */}
          <div>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="m3-select !h-10 text-xs"
              id="select-voucher-method"
            >
              <option value="">جميع طرق السداد</option>
              <option value="CASH">نقداً (CASH)</option>
              <option value="BANK">تحويل بنكي (BANK)</option>
              <option value="WALLET">محفظة إلكترونية (WALLET)</option>
              <option value="CHECK">شيك مصرفي (CHECK)</option>
            </select>
          </div>

          {/* Currency Filter */}
          <div>
            <select
              value={currencyFilter}
              onChange={(e) => setCurrencyFilter(e.target.value)}
              className="m3-select !h-10 text-xs"
              id="select-voucher-currency"
            >
              <option value="">جميع العملات</option>
              <option value="YER">ريال يمني (YER)</option>
              <option value="SAR">ريال سعودي (SAR)</option>
              <option value="USD">دولار أمريكي (USD)</option>
            </select>
          </div>

          {/* Date range filters */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="m3-input !h-10 !px-2 text-xs"
              title="من تاريخ"
              id="input-vouchers-start-date"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="m3-input !h-10 !px-2 text-xs"
              title="إلى تاريخ"
              id="input-vouchers-end-date"
            />
          </div>
        </div>

        {/* 4. Vouchers Table */}
        <div className="overflow-x-auto" id="vouchers-table-container">
          <table className="m3-table text-right text-xs">
            <thead className="m3-thead">
              <tr>
                <th className="m3-th">رقم السند</th>
                <th className="m3-th">النوع</th>
                <th className="m3-th">الطرف المعني</th>
                <th className="m3-th">المبلغ والعملة</th>
                <th className="m3-th">طريقة السداد والخزينة</th>
                <th className="m3-th">التاريخ</th>
                <th className="m3-th text-center">الحالة</th>
                <th className="m3-th text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--md-outline-variant)] font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[var(--md-on-surface-variant)]">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[var(--md-primary-text)]" />
                    <span>جاري تحميل السندات المالية والتحصيلات...</span>
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[var(--md-on-surface-variant)]">
                    <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30 text-[var(--md-primary-text)]" />
                    <p className="font-bold text-sm text-[var(--md-on-surface)]">لا توجد سندات مالية مسجلة</p>
                    <p className="text-xs text-[var(--md-on-surface-variant)] mt-1">
                      {searchQuery || statusFilter || methodFilter
                        ? 'جرّب تغيير خيارات البحث أو التصفية أعلاه'
                        : 'يمكنك إضافة سند قبض جديد من عميل أو سند صرف لمورد'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => {
                  const isReceipt = p.type === 'CUSTOMER_PAYMENT';
                  const isCancelled = p.status === 'CANCELLED';

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-[var(--md-surface-container-low)] transition-colors ${
                        isCancelled ? 'opacity-65 bg-[var(--md-surface-container-low)]/50' : ''
                      }`}
                    >
                      {/* Voucher Number */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => handleOpenDetails(p.id)}
                            className="font-mono font-bold text-[var(--md-primary-text)] hover:underline flex items-center gap-1 cursor-pointer tabular-nums"
                          >
                            <span>{p.voucher_number || p.reference || `V-${p.id.slice(0, 6)}`}</span>
                          </button>

                          {/* Cloud Synchronization Status Indicator */}
                          {p.syncStatus === 'CONFLICT' ? (
                            <span className="m3-badge m3-badge-error text-[10px]" title="يوجد تعارض في السيرفر">
                              <span>⚠️</span>
                              <span>تعارض</span>
                            </span>
                          ) : p.serverSeq || p.syncStatus === 'SYNCED' || p.is_synced ? (
                            <span className="m3-badge m3-badge-success text-[10px]" title={`تم التأكيد بالسيرفر #${p.serverSeq || ''}`}>
                              <span>☁️</span>
                              <span>متزامن</span>
                            </span>
                          ) : (
                            <span className="m3-badge m3-badge-warning text-[10px]" title="محفوظ محلياً بانتظار الإرسال">
                              <span>⏳</span>
                              <span>معلق محلياً</span>
                            </span>
                          )}
                        </div>
                        {p.operation_number && (
                          <div className="text-[10px] text-[var(--md-on-surface-variant)] font-mono mt-0.5">عملية: {p.operation_number}</div>
                        )}
                      </td>

                      {/* Voucher Type */}
                      <td className="py-3 px-4">
                        {isReceipt ? (
                          <span className="m3-badge m3-badge-success text-[11px]">
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                            <span>سند قبض</span>
                          </span>
                        ) : (
                          <span className="m3-badge m3-badge-error text-[11px]">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            <span>سند صرف</span>
                          </span>
                        )}
                      </td>

                      {/* Party */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-[var(--md-on-surface)]">
                          {resolvePartyName(p)}
                        </div>
                        <div className="text-[11px] text-[var(--md-on-surface-variant)] flex items-center gap-2 tabular-nums">
                          {p.customer_phone || p.supplier_phone ? (
                            <span>هاتف: {p.customer_phone || p.supplier_phone}</span>
                          ) : null}
                          {p.customer_account_number || p.supplier_account_number ? (
                            <span className="font-mono">حساب: {p.customer_account_number || p.supplier_account_number}</span>
                          ) : null}
                        </div>
                      </td>

                      {/* Amount & Currency */}
                      <td className="py-3 px-4">
                        <div
                          className={`font-mono font-extrabold text-sm tabular-nums ${
                            isCancelled
                              ? 'text-[var(--md-on-surface-variant)] line-through'
                              : isReceipt
                              ? 'text-[var(--md-success)]'
                              : 'text-[var(--md-error)]'
                          }`}
                        >
                          {formatAmount(p.amount || 0)} <span className="text-xs font-sans font-bold text-[var(--md-on-surface-variant)]">{p.currency || 'YER'}</span>
                        </div>
                        {p.currency && p.currency !== 'YER' && Number(p.exchange_rate) > 1 && (
                          <div className="text-[10px] text-[var(--md-on-surface-variant)] font-mono tabular-nums">
                            ≈ {formatAmount((p.amount || 0) * (p.exchange_rate || 1))} YER (سعر: {p.exchange_rate})
                          </div>
                        )}
                      </td>

                      {/* Payment Method & Account */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-bold text-[var(--md-on-surface)]">
                          {p.payment_method === 'CASH' ? (
                            <>
                              <Wallet className="w-3.5 h-3.5 text-[var(--md-warning)]" />
                              <span>نقداً (خزينة)</span>
                            </>
                          ) : p.payment_method === 'BANK' || p.payment_method === 'BANK_TRANSFER' ? (
                            <>
                              <Landmark className="w-3.5 h-3.5 text-[var(--md-info)]" />
                              <span>تحويل بنكي {p.bank_name ? `(${p.bank_name})` : ''}</span>
                            </>
                          ) : p.payment_method === 'WALLET' ? (
                            <>
                              <CreditCard className="w-3.5 h-3.5 text-[var(--md-secondary)]" />
                              <span>محفظة {p.wallet_provider ? `(${p.wallet_provider})` : ''}</span>
                            </>
                          ) : (
                            <>
                              <FileText className="w-3.5 h-3.5 text-[var(--md-primary-text)]" />
                              <span>شيك مصرفي {p.check_number ? `(#${p.check_number})` : ''}</span>
                            </>
                          )}
                        </div>
                        {p.notes && <div className="text-[11px] text-[var(--md-on-surface-variant)] truncate max-w-xs">{p.notes}</div>}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 font-mono text-[var(--md-on-surface-variant)] tabular-nums">
                        {p.payment_date ? formatDateOnly(p.payment_date) : '-'}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {isCancelled ? (
                          <span className="m3-badge m3-badge-error text-[10px]">
                            <Ban className="w-3 h-3" />
                            <span>ملغي</span>
                          </span>
                        ) : (
                          <span className="m3-badge m3-badge-success text-[10px]">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>معتمد</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenDetails(p.id)}
                            className="m3-btn-outlined !min-h-[32px] !px-2 !py-1.5"
                            title="عرض التفاصيل والقيود المحاسبية"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handlePrintVoucher(p)}
                            className="m3-btn-tonal !min-h-[32px] !px-2 !py-1.5"
                            title="طباعة السند الرسمي"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {!isCancelled && (
                            <button
                              onClick={() => handleOpenCancelDialog(p)}
                              className="m3-btn-danger !min-h-[32px] !px-2 !py-1.5"
                              title="إلغاء السند وعكس القيود"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Create Payment / Receipt Modal */}
      {isModalOpen && (
        <div className="m3-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" id="modal-create-voucher" dir="rtl">
          <div className="m3-modal-surface max-w-2xl w-full overflow-hidden my-8 text-right text-[var(--md-on-surface)]">
            {/* Modal Header */}
            <div className="p-5 flex items-center justify-between bg-[var(--md-surface-container-low)] border-b border-[var(--md-outline-variant)]">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-[var(--md-radius-md)] flex items-center justify-center shrink-0 ${
                  paymentType === 'CUSTOMER_PAYMENT'
                    ? 'bg-[var(--md-success-container)] text-[var(--md-on-success-container)]'
                    : 'bg-[var(--md-error-container)] text-[var(--md-on-error-container)]'
                }`}>
                  {paymentType === 'CUSTOMER_PAYMENT' ? (
                    <ArrowDownLeft className="w-5 h-5 stroke-[2.5]" />
                  ) : (
                    <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
                  )}
                </div>
                <div>
                  <h2 className="text-base font-black text-[var(--md-on-surface)]">
                    {paymentType === 'CUSTOMER_PAYMENT' ? 'إنشاء سند قبض مالي (تحصيل من عميل)' : 'إنشاء سند صرف مالي (سداد لمورد)'}
                  </h2>
                  <p className="text-xs text-[var(--md-on-surface-variant)]">تسجيل وتأكيد الحركة النقدية مع الترحيل التلقائي لدفتر الأستاذ العام</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-high)] rounded-[var(--md-radius-sm)] cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSavePayment} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
              {/* Step 1: Party Selection */}
              <div className="bg-[var(--md-surface-container-low)] p-4 rounded-[var(--md-radius-md)] border border-[var(--md-outline-variant)] space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <label className="text-xs font-bold text-[var(--md-on-surface)]">
                    {paymentType === 'CUSTOMER_PAYMENT' ? 'العميل المستلم منه *' : 'المورد المدفوع له *'}
                  </label>
                  {selectedParty && (
                    <span className="m3-badge m3-badge-primary font-mono text-[11px] tabular-nums">
                      الرصيد الحالي: {formatAmount(selectedParty.balance || selectedParty.current_balance || 0)}{' '}
                      {selectedParty.currency || 'YER'}
                    </span>
                  )}
                </div>

                <select
                  value={selectedEntityId}
                  onChange={(e) => {
                    setSelectedEntityId(e.target.value);
                    setInvoiceAllocations({});
                  }}
                  required
                  className="m3-select text-xs font-bold"
                >
                  <option value="">{paymentType === 'CUSTOMER_PAYMENT' ? 'اختر العميل...' : 'اختر المورد...'}</option>
                  {(paymentType === 'CUSTOMER_PAYMENT' ? customers : suppliers).map((ent) => (
                    <option key={ent.id} value={ent.id}>
                      {ent.name} {ent.account_number ? `(${ent.account_number})` : ''} - رصيد:{' '}
                      {formatAmount(ent.balance || ent.current_balance || 0)} {ent.currency || 'YER'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: Amount, Currency & Payment Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Amount */}
                <div>
                  <label className="block text-xs font-bold text-[var(--md-on-surface-variant)] mb-1.5 flex items-center justify-between">
                    <span>مبلغ السند *</span>
                    <span className="text-[10px] text-[var(--md-primary-text)] font-mono">0-9 EN</span>
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    dir="ltr"
                    lang="en"
                    required
                    value={amount}
                    onChange={(e) => setAmount(toEnglishDigits(e.target.value).replace(/[^0-9.]/g, ''))}
                    placeholder="0.00"
                    className="m3-input font-mono text-sm font-bold text-left tabular-nums"
                  />
                </div>

                {/* Currency */}
                <div>
                  <label className="block text-xs font-bold text-[var(--md-on-surface-variant)] mb-1.5">العملة</label>
                  <select
                    value={currency}
                    onChange={(e) => {
                      const cur = e.target.value;
                      setCurrency(cur);
                      setExchangeRate(String(getAccountingRate(cur)));
                    }}
                    className="m3-select text-xs font-bold"
                  >
                    <option value="YER">ريال يمني (YER)</option>
                    <option value="SAR">ريال سعودي (SAR)</option>
                    <option value="USD">دولار أمريكي (USD)</option>
                  </select>
                </div>

                {/* Payment Date */}
                <div>
                  <label className="block text-xs font-bold text-[var(--md-on-surface-variant)] mb-1.5">تاريخ السند *</label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="m3-input text-xs font-bold"
                  />
                </div>
              </div>

              {/* Exchange rate if foreign */}
              {currency !== 'YER' && (
                <div className="p-3 bg-[var(--md-warning-container)]/35 border border-[var(--md-warning)]/35 rounded-[var(--md-radius-md)] flex items-center justify-between gap-4 text-xs flex-wrap">
                  <div className="flex items-center gap-2 text-[var(--md-on-warning-container)] font-bold">
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span>سعر صرف {currency} مقابل YER:</span>
                    {amount && Number(amount) > 0 && (
                      <span className="font-mono text-[var(--md-success)] font-bold mr-2 tabular-nums">
                        (المعادل: ≈ {formatNumber(Number(amount) * Number(exchangeRate))} YER)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-[var(--md-on-warning-container)] font-mono">0-9 EN</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      dir="ltr"
                      lang="en"
                      value={exchangeRate}
                      onChange={(e) => setExchangeRate(toEnglishDigits(e.target.value).replace(/[^0-9.]/g, ''))}
                      className="m3-input !h-9 !w-32 font-mono font-bold text-xs text-left tabular-nums"
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Payment Method & Channel Details */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-[var(--md-on-surface-variant)]">طريقة وقناة السداد *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'CASH', label: 'نقدًا (خزينة)', icon: Wallet },
                    { id: 'BANK', label: 'تحويل بنكي', icon: Landmark },
                    { id: 'WALLET', label: 'محفظة إلكترونية', icon: CreditCard },
                    { id: 'CHECK', label: 'شيك مصرفي', icon: FileText },
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSelected = paymentMethod === m.id;
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => setPaymentMethod(m.id)}
                        className={`flex flex-col items-center justify-center p-3 rounded-[var(--md-radius-md)] border text-xs font-bold transition gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-[var(--md-primary-container)] border-[var(--md-primary)] text-[var(--md-on-primary-container)] shadow-sm'
                            : 'bg-[var(--md-surface-container-low)] border-[var(--md-outline-variant)] text-[var(--md-on-surface-variant)] hover:bg-[var(--md-surface-container-high)] hover:text-[var(--md-on-surface)]'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Conditional Fields: Bank */}
                {paymentMethod === 'BANK' && (
                  <div className="p-3.5 bg-[var(--md-surface-container-low)] rounded-[var(--md-radius-md)] border border-[var(--md-outline-variant)] grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-[var(--md-on-surface-variant)] mb-1">اسم البنك</label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="مثل: بنك الكريمي، بنك التضامن"
                        className="m3-input !h-9 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[var(--md-on-surface-variant)] mb-1">رقم الحساب / IBAN</label>
                      <input
                        type="text"
                        value={bankAccountNumber}
                        onChange={(e) => setBankAccountNumber(e.target.value)}
                        placeholder="رقم الحساب البنكي"
                        className="m3-input !h-9 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[var(--md-on-surface-variant)] mb-1">رقم العملية / الإشعار</label>
                      <input
                        type="text"
                        value={operationNumber}
                        onChange={(e) => setOperationNumber(e.target.value)}
                        placeholder="رقم التحويل البنكي"
                        className="m3-input !h-9 text-xs font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* Conditional Fields: Wallet */}
                {paymentMethod === 'WALLET' && (
                  <div className="p-3.5 bg-[var(--md-surface-container-low)] rounded-[var(--md-radius-md)] border border-[var(--md-outline-variant)] grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-[var(--md-on-surface-variant)] mb-1">مزود المحفظة</label>
                      <input
                        type="text"
                        value={walletProvider}
                        onChange={(e) => setWalletProvider(e.target.value)}
                        placeholder="مثل: جوالي، فلوسك، ون كاش"
                        className="m3-input !h-9 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[var(--md-on-surface-variant)] mb-1">رقم هاتف المحفظة</label>
                      <input
                        type="text"
                        value={walletNumber}
                        onChange={(e) => setWalletNumber(e.target.value)}
                        placeholder="رقم هاتف المحفظة"
                        className="m3-input !h-9 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[var(--md-on-surface-variant)] mb-1">رقم عملية التحويل</label>
                      <input
                        type="text"
                        value={operationNumber}
                        onChange={(e) => setOperationNumber(e.target.value)}
                        placeholder="رقم المعاملة بالمحفظة"
                        className="m3-input !h-9 text-xs font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* Conditional Fields: Check */}
                {paymentMethod === 'CHECK' && (
                  <div className="p-3.5 bg-[var(--md-surface-container-low)] rounded-[var(--md-radius-md)] border border-[var(--md-outline-variant)] grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-[var(--md-on-surface-variant)] mb-1">رقم الشيك</label>
                      <input
                        type="text"
                        value={checkNumber}
                        onChange={(e) => setCheckNumber(e.target.value)}
                        placeholder="رقم الشيك المصرفي"
                        className="m3-input !h-9 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[var(--md-on-surface-variant)] mb-1">تاريخ استحقاق الشيك</label>
                      <input
                        type="date"
                        value={checkDueDate}
                        onChange={(e) => setCheckDueDate(e.target.value)}
                        className="m3-input !h-9 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[var(--md-on-surface-variant)] mb-1">اسم البنك المسحوب عليه</label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="اسم البنك"
                        className="m3-input !h-9 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Step 4: Settlement / Allocation Mode */}
              <div className="space-y-3 pt-3 border-t border-[var(--md-outline-variant)]">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-bold text-[var(--md-on-surface)]">طريقة تسوية المبلغ</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAllocationMode('ON_ACCOUNT');
                        setInvoiceAllocations({});
                      }}
                      className={`px-3 py-1.5 text-xs rounded-[var(--md-radius-md)] font-bold transition cursor-pointer border ${
                        allocationMode === 'ON_ACCOUNT'
                          ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)] border-[var(--md-primary)]'
                          : 'bg-[var(--md-surface-container-low)] border-[var(--md-outline-variant)] text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
                      }`}
                    >
                      دفعة على الحساب
                    </button>
                    <button
                      type="button"
                      onClick={() => setAllocationMode('ALLOCATE_INVOICES')}
                      className={`px-3 py-1.5 text-xs rounded-[var(--md-radius-md)] font-bold transition cursor-pointer border ${
                        allocationMode === 'ALLOCATE_INVOICES'
                          ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)] border-[var(--md-primary)]'
                          : 'bg-[var(--md-surface-container-low)] border-[var(--md-outline-variant)] text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
                      }`}
                    >
                      تسوية فواتير محددة ({partyInvoices.length})
                    </button>
                  </div>
                </div>

                {/* If Invoices allocation selected */}
                {allocationMode === 'ALLOCATE_INVOICES' && (
                  <div className="p-3.5 bg-[var(--md-surface-container-low)] rounded-[var(--md-radius-md)] border border-[var(--md-outline-variant)] space-y-3">
                    <div className="flex items-center justify-between text-xs gap-2 flex-wrap">
                      <span className="font-bold text-[var(--md-on-surface)]">الفواتير المستحقة للطرف المحدد:</span>
                      <button
                        type="button"
                        onClick={handleAutoDistribute}
                        className="text-xs text-[var(--md-primary-text)] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>توزيع تلقائي للمبلغ على الأقدم</span>
                      </button>
                    </div>

                    {partyInvoices.length === 0 ? (
                      <p className="text-xs text-[var(--md-on-surface-variant)] text-center py-3">لا توجد فواتير معلقة لهذا الطرف (سيتم قيد السند كدفعة على الحساب)</p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {partyInvoices.map((inv) => {
                          const due = Number(inv.balance_due || inv.remaining_amount || (Number(inv.total_amount || 0) - Number(inv.paid_amount || 0)));
                          const currentAlloc = invoiceAllocations[inv.id] || 0;

                          return (
                            <div
                              key={inv.id}
                              className="p-2.5 bg-[var(--md-surface-container)] rounded-[var(--md-radius-sm)] border border-[var(--md-outline-variant)] flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="space-y-0.5">
                                <div className="font-mono font-bold text-[var(--md-on-surface)]">
                                  فاتورة #{inv.invoice_number || inv.id.slice(0, 6)}
                                </div>
                                <div className="text-[11px] text-[var(--md-on-surface-variant)] tabular-nums">
                                  الإجمالي: {formatAmount(inv.total_amount || 0)} | المتبقي:{' '}
                                  <span className="font-mono font-bold text-[var(--md-error)]">{formatAmount(due)}</span> {currency}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <label className="text-[11px] text-[var(--md-on-surface-variant)] font-bold">المبلغ المطبق:</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max={due}
                                  value={currentAlloc || ''}
                                  onChange={(e) => {
                                    const val = Number(e.target.value) || 0;
                                    setInvoiceAllocations({
                                      ...invoiceAllocations,
                                      [inv.id]: val,
                                    });
                                  }}
                                  placeholder="0.00"
                                  className="m3-input !h-8 !w-24 text-xs font-mono font-bold tabular-nums"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Allocation summary footer */}
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-[var(--md-outline-variant)] font-mono font-bold tabular-nums">
                      <span className="text-[var(--md-on-surface)]">إجمالي المخصص للفواتير: {formatAmount(totalAllocatedAmount)} {currency}</span>
                      {unallocatedExcess > 0 && (
                        <span className="text-[var(--md-warning)]">
                          الفائض (على الحساب): +{formatAmount(unallocatedExcess)} {currency}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Step 5: Notes & Reference */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[var(--md-outline-variant)]">
                <div>
                  <label className="block text-xs font-bold text-[var(--md-on-surface-variant)] mb-1">رقم المرجع الخارجي (اختياري)</label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="رقم سند يدوي / مستند ورقي"
                    className="m3-input !h-10 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--md-on-surface-variant)] mb-1">رسوم التحويل (إن وجدت)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={transferFee}
                    onChange={(e) => setTransferFee(e.target.value)}
                    placeholder="0.00"
                    className="m3-input !h-10 text-xs font-mono tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--md-on-surface-variant)] mb-1">وذلك عن / البيان والملاحظات</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="وصف سبب السند المالي، مثل: سداد دفعة عن مبيعات شهر..."
                  className="m3-input !h-auto py-2.5 text-xs"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--md-outline-variant)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="m3-btn-outlined text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={paymentType === 'CUSTOMER_PAYMENT' ? 'm3-btn-primary text-xs' : 'm3-btn-danger text-xs'}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري حفظ وترحيل السند...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>حفظ وترحيل السند المالي</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. View Voucher Details Modal */}
      {isDetailsOpen && (
        <div className="m3-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" id="modal-voucher-details" dir="rtl">
          <div className="m3-modal-surface max-w-3xl w-full overflow-hidden my-8 text-right text-[var(--md-on-surface)]">
            {detailsLoading ? (
              <div className="p-12 text-center text-[var(--md-on-surface-variant)]">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-[var(--md-primary-text)]" />
                <p className="text-sm font-bold">جاري تحميل تفاصيل السند والقيود المحاسبية...</p>
              </div>
            ) : selectedPaymentDetails ? (
              <div className="divide-y divide-[var(--md-outline-variant)]">
                {/* Header */}
                <div className="p-5 flex items-center justify-between bg-[var(--md-surface-container-low)]">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-[var(--md-radius-md)] flex items-center justify-center shrink-0 ${
                        selectedPaymentDetails.type === 'CUSTOMER_PAYMENT'
                          ? 'bg-[var(--md-success-container)] text-[var(--md-on-success-container)]'
                          : 'bg-[var(--md-error-container)] text-[var(--md-on-error-container)]'
                      }`}
                    >
                      {selectedPaymentDetails.type === 'CUSTOMER_PAYMENT' ? (
                        <ArrowDownLeft className="w-5 h-5" />
                      ) : (
                        <ArrowUpRight className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base font-black text-[var(--md-on-surface)]">
                          {selectedPaymentDetails.type === 'CUSTOMER_PAYMENT' ? 'سند قبض مالي' : 'سند صرف مالي'}:{' '}
                          <span className="font-mono text-[var(--md-primary-text)]">{selectedPaymentDetails.voucher_number || selectedPaymentDetails.reference}</span>
                        </h2>
                        {selectedPaymentDetails.status === 'CANCELLED' ? (
                          <span className="m3-badge m3-badge-error text-[10px]">
                            ملغي
                          </span>
                        ) : (
                          <span className="m3-badge m3-badge-success text-[10px]">
                            معتمد
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--md-on-surface-variant)] mt-0.5 tabular-nums">
                        التاريخ: {new Date(selectedPaymentDetails.payment_date).toLocaleDateString('ar-YE')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePrintVoucher(selectedPaymentDetails)}
                      className="m3-btn-tonal !min-h-[36px] text-xs"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>طباعة</span>
                    </button>
                    <button
                      onClick={() => setIsDetailsOpen(false)}
                      className="p-1.5 text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-high)] rounded-[var(--md-radius-sm)] cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Details Body */}
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                  {/* Financial & Party Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="p-3.5 bg-[var(--md-surface-container-low)] rounded-[var(--md-radius-md)] border border-[var(--md-outline-variant)]">
                      <span className="text-[11px] font-bold text-[var(--md-on-surface-variant)] block mb-1">المبلغ والعملة</span>
                      <span className="text-lg font-extrabold font-mono text-[var(--md-success)] tabular-nums">
                        {formatAmount(selectedPaymentDetails.amount || 0)} {selectedPaymentDetails.currency || 'YER'}
                      </span>
                    </div>

                    <div className="p-3.5 bg-[var(--md-surface-container-low)] rounded-[var(--md-radius-md)] border border-[var(--md-outline-variant)]">
                      <span className="text-[11px] font-bold text-[var(--md-on-surface-variant)] block mb-1">الطرف المعني</span>
                      <span className="text-sm font-bold text-[var(--md-on-surface)] block">
                        {resolvePartyName(selectedPaymentDetails)}
                      </span>
                      <span className="text-xs text-[var(--md-on-surface-variant)] font-mono">
                        {selectedPaymentDetails.customer_phone || selectedPaymentDetails.supplier_phone || ''}
                      </span>
                    </div>

                    <div className="p-3.5 bg-[var(--md-surface-container-low)] rounded-[var(--md-radius-md)] border border-[var(--md-outline-variant)]">
                      <span className="text-[11px] font-bold text-[var(--md-on-surface-variant)] block mb-1">طريقة السداد</span>
                      <span className="text-sm font-bold text-[var(--md-on-surface)] block">
                        {selectedPaymentDetails.payment_method === 'CASH'
                          ? 'نقداً (خزينة)'
                          : selectedPaymentDetails.payment_method === 'BANK'
                          ? 'تحويل بنكي'
                          : selectedPaymentDetails.payment_method === 'WALLET'
                          ? 'محفظة إلكترونية'
                          : selectedPaymentDetails.payment_method}
                      </span>
                      {selectedPaymentDetails.bank_name && (
                        <span className="text-xs text-[var(--md-on-surface-variant)]">{selectedPaymentDetails.bank_name}</span>
                      )}
                    </div>
                  </div>

                  {/* Statement / Notes */}
                  {selectedPaymentDetails.notes && (
                    <div className="p-3.5 bg-[var(--md-surface-container-low)] rounded-[var(--md-radius-md)] border border-[var(--md-outline-variant)] text-xs">
                      <span className="font-bold text-[var(--md-on-surface-variant)] block mb-1">البيان والملاحظات:</span>
                      <p className="text-[var(--md-on-surface)] font-medium">{selectedPaymentDetails.notes}</p>
                    </div>
                  )}

                  {/* Linked Allocations Breakdown */}
                  {selectedPaymentDetails.allocations && selectedPaymentDetails.allocations.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold text-[var(--md-on-surface)]">تسوية الفواتير المرتبطة:</h3>
                      <div className="overflow-x-auto border border-[var(--md-outline-variant)] rounded-[var(--md-radius-md)]">
                        <table className="m3-table text-right text-xs">
                          <thead className="m3-thead">
                            <tr>
                              <th className="m3-th">رقم الفاتورة</th>
                              <th className="m3-th">إجمالي الفاتورة</th>
                              <th className="m3-th">المدفوع مسبقاً</th>
                              <th className="m3-th !text-[var(--md-success)]">المبلغ المطبق بالسند</th>
                              <th className="m3-th">المتبقي</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--md-outline-variant)] font-mono tabular-nums">
                            {selectedPaymentDetails.allocations.map((a: any, idx: number) => (
                              <tr key={idx} className="hover:bg-[var(--md-surface-container-low)]">
                                <td className="p-2.5 font-bold text-[var(--md-primary-text)]">#{a.invoice_number || '-'}</td>
                                <td className="p-2.5">{formatAmount(a.invoice_total || 0)}</td>
                                <td className="p-2.5">{formatAmount(a.previous_paid || 0)}</td>
                                <td className="p-2.5 font-bold text-[var(--md-success)]">+{formatAmount(a.allocated_amount || 0)}</td>
                                <td className="p-2.5">{formatAmount(a.remaining_balance || 0)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Accounting Ledger Entries */}
                  {selectedPaymentDetails.ledger_entries && selectedPaymentDetails.ledger_entries.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-[var(--md-on-surface)]">
                          القيود المحاسبية المرحلة بدفتر الأستاذ (Double-Entry Ledger):
                        </h3>
                        <span className="m3-badge m3-badge-success text-[10px]">متزن ومقيد</span>
                      </div>
                      <div className="overflow-x-auto border border-[var(--md-outline-variant)] rounded-[var(--md-radius-md)]">
                        <table className="m3-table text-right text-xs">
                          <thead className="m3-thead">
                            <tr>
                              <th className="m3-th">الحساب المحاسبي</th>
                              <th className="m3-th">النوع</th>
                              <th className="m3-th !text-[var(--md-success)]">مدين (Debit)</th>
                              <th className="m3-th !text-[var(--md-error)]">دائن (Credit)</th>
                              <th className="m3-th">البيان</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--md-outline-variant)] font-medium">
                            {selectedPaymentDetails.ledger_entries.map((entry: any, idx: number) => (
                              <tr key={idx} className="hover:bg-[var(--md-surface-container-low)]">
                                <td className="p-2.5 font-bold text-[var(--md-on-surface)]">{entry.account_name || entry.account_code || '-'}</td>
                                <td className="p-2.5 text-[var(--md-on-surface-variant)] font-mono text-[11px]">{entry.account_type || '-'}</td>
                                <td className="p-2.5 font-mono font-bold text-[var(--md-success)] tabular-nums">
                                  {Number(entry.debit || 0) > 0 ? `${formatAmount(entry.debit)} YER` : '-'}
                                </td>
                                <td className="p-2.5 font-mono font-bold text-[var(--md-error)] tabular-nums">
                                  {Number(entry.credit || 0) > 0 ? `${formatAmount(entry.credit)} YER` : '-'}
                                </td>
                                <td className="p-2.5 text-[var(--md-on-surface-variant)] text-[11px]">{entry.description || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Audit Trail & Cancellation Info */}
                  {selectedPaymentDetails.status === 'CANCELLED' && (
                    <div className="p-3.5 bg-[var(--md-error-container)]/35 border border-[var(--md-error)]/40 rounded-[var(--md-radius-md)] text-xs space-y-1">
                      <span className="font-bold text-[var(--md-error)] block">تم إلغاء هذا السند وعكس قيوده:</span>
                      <p className="text-[var(--md-on-surface)]">
                        سبب الإلغاء: <span className="font-bold">{selectedPaymentDetails.cancellation_reason || 'غير محدد'}</span>
                      </p>
                      {selectedPaymentDetails.cancelled_at && (
                        <p className="text-[var(--md-on-surface-variant)] font-mono text-[10px] tabular-nums">
                          تاريخ الإلغاء: {new Date(selectedPaymentDetails.cancelled_at).toLocaleString('ar-YE')}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-[var(--md-surface-container-low)] flex items-center justify-between">
                  {selectedPaymentDetails.status !== 'CANCELLED' ? (
                    <button
                      onClick={() => handleOpenCancelDialog(selectedPaymentDetails)}
                      className="m3-btn-danger !min-h-[36px] text-xs"
                    >
                      <Ban className="w-4 h-4" />
                      <span>إلغاء السند وعكس القيود</span>
                    </button>
                  ) : (
                    <div />
                  )}

                  <button
                    onClick={() => setIsDetailsOpen(false)}
                    className="m3-btn-outlined text-xs"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* 7. Cancel Voucher Confirmation Modal */}
      {isCancelModalOpen && cancelTargetPayment && (
        <div className="m3-backdrop fixed inset-0 z-50 flex items-center justify-center p-4" id="modal-cancel-voucher" dir="rtl">
          <div className="m3-modal-surface max-w-md w-full border-[var(--md-error)]/40 p-6 space-y-4 text-right text-[var(--md-on-surface)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[var(--md-radius-md)] bg-[var(--md-error-container)] text-[var(--md-on-error-container)] flex items-center justify-center shrink-0">
                <Ban className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base font-black text-[var(--md-on-surface)]">إلغاء السند المالي وعكس القيود</h3>
                <p className="text-xs text-[var(--md-on-surface-variant)] font-mono">
                  {cancelTargetPayment.voucher_number || cancelTargetPayment.reference}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-[var(--md-error-container)]/35 rounded-[var(--md-radius-md)] border border-[var(--md-error)]/30 text-xs space-y-1.5">
              <p className="font-bold text-[var(--md-error)]">⚠️ تنبيه محاسبي هام:</p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-[var(--md-on-surface-variant)]">
                <li>سيتم إلغاء السند وعكس قيود اليومية بدفتر الأستاذ العام تلقائياً.</li>
                <li>سيتم إعادة فتح أي فواتير تم تسويتها بواسطة هذا السند.</li>
                <li>سيتم تعديل رصيد العميل / المورد وفقاً لمبلغ السند المعكوس.</li>
              </ul>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--md-on-surface-variant)] mb-1.5">سبب الإلغاء *</label>
              <textarea
                required
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="يرجى كتابة سبب إلغاء السند (مثل: خطأ في المبلغ، إيداع مكرر...)"
                className="m3-input !h-auto py-2.5 text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                disabled={isCancelling}
                className="m3-btn-outlined text-xs"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isCancelling || !cancelReason.trim()}
                className="m3-btn-danger text-xs disabled:opacity-50"
              >
                {isCancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                <span>تأكيد الإلغاء وعكس القيود</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
