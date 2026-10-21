import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../../api';
import { formatAmount, formatNumber } from '../../lib/formatters';
import { getAccountingRate } from '../../lib/exchangeRates';
import { ExportActions } from '../Common/ExportActions';
import { TableExportConfig, printPaymentReceipt } from '../../lib/exportUtils';
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
        api.getInvoices({ status: 'PENDING' }),
        api.getPurchaseInvoices({ status: 'PENDING' }),
      ]);

      setPayments(payRes?.data || []);
      setStats(statsRes?.data || null);
      setCustomers(custRes?.data || []);
      setSuppliers(suppRes?.data || []);
      setInvoices(invRes?.data || []);
      setPurchaseInvoices(purRes?.data || []);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل بيانات السندات المالية والتحصيلات');
    } finally {
      setLoading(false);
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentsAndStats();
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
      return invoices.filter((inv) => inv.customer_id === selectedEntityId && Number(inv.balance_due || inv.remaining_amount || (Number(inv.total_amount || 0) - Number(inv.paid_amount || 0))) > 0);
    } else {
      return purchaseInvoices.filter((inv) => inv.supplier_id === selectedEntityId && Number(inv.balance_due || inv.remaining_amount || (Number(inv.total_amount || 0) - Number(inv.paid_amount || 0))) > 0);
    }
  }, [paymentType, selectedEntityId, invoices, purchaseInvoices]);

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
      supplier_id: paymentType === 'SUPPLIER_PAYMENT' ? selectedEntityId : undefined,
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

  const handlePrintVoucher = (p: any) => {
    printPaymentReceipt({
      companyName: company?.name || 'المؤسسة التجارية',
      type: p.type === 'SUPPLIER_PAYMENT' ? 'SUPPLIER_PAYMENT' : 'CUSTOMER_PAYMENT',
      receiptNumber: p.voucher_number || p.reference || `VOUCH-${p.id.slice(0, 8).toUpperCase()}`,
      date: p.payment_date ? new Date(p.payment_date).toLocaleDateString('ar-YE') : new Date().toLocaleDateString('ar-YE'),
      partyName: p.customer_name || p.supplier_name || 'الطرف المعني',
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
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const vNum = (p.voucher_number || '').toLowerCase();
        const name = (p.customer_name || p.supplier_name || '').toLowerCase();
        const ref = (p.reference || '').toLowerCase();
        const op = (p.operation_number || '').toLowerCase();
        const notes = (p.notes || '').toLowerCase();
        if (!vNum.includes(q) && !name.includes(q) && !ref.includes(q) && !op.includes(q) && !notes.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [payments, searchQuery]);

  const totalReceipts = useMemo(() => {
    return filteredPayments
      .filter((p) => p.type === 'CUSTOMER_PAYMENT' && p.status !== 'CANCELLED')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }, [filteredPayments]);

  const totalDisbursements = useMemo(() => {
    return filteredPayments
      .filter((p) => p.type === 'SUPPLIER_PAYMENT' && p.status !== 'CANCELLED')
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
      p.customer_name || p.supplier_name || '-',
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
    <div className="space-y-6" id="vouchers-module-root">
      {/* 1. Header & Primary Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-emerald-900/40 shadow-xl" id="vouchers-header">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center shadow-lg">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">السندات والتحصيلات المالية</h1>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">
              إدارة سندات القبض من العملاء وسندات الدفع للموردين مع التسوية المحاسبية والربط التلقائي بالفواتير
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={() => fetchPaymentsAndStats()}
            disabled={loading}
            className="p-2.5 text-slate-300 hover:bg-slate-800 rounded-xl border border-slate-700 transition cursor-pointer"
            title="تحديث البيانات"
            id="btn-refresh-vouchers"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <ExportActions getConfig={getPaymentExportConfig} />

          <button
            onClick={() => handleOpenCreateModal('CUSTOMER_PAYMENT')}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-md transition cursor-pointer"
            id="btn-create-customer-receipt"
          >
            <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
            <span>سند قبض من عميل</span>
          </button>

          <button
            onClick={() => handleOpenCreateModal('SUPPLIER_PAYMENT')}
            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-md transition cursor-pointer"
            id="btn-create-supplier-payment"
          >
            <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
            <span>سند دفع لمورد</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-center justify-between p-4 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-sm">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="p-1 hover:bg-rose-900/50 rounded-lg cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center justify-between p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-300 text-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="p-1 hover:bg-emerald-900/50 rounded-lg cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="vouchers-stats-cards">
        {/* Today's Receipts */}
        <div className="bg-slate-900 p-4.5 rounded-2xl border border-emerald-900/40 shadow-xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400">مقبوضات اليوم (سندات القبض)</span>
            <div className="text-xl font-extrabold text-emerald-400 font-mono">
              {formatAmount(stats?.today?.receipts || 0)} <span className="text-xs font-sans text-slate-500">YER</span>
            </div>
            <div className="text-[11px] text-slate-400">
              إجمالي الشهر: <span className="font-mono font-bold text-slate-300">{formatAmount(stats?.month?.receipts || 0)}</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        </div>

        {/* Today's Disbursements */}
        <div className="bg-slate-900 p-4.5 rounded-2xl border border-emerald-900/40 shadow-xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400">مدفوعات اليوم (سندات الصرف)</span>
            <div className="text-xl font-extrabold text-rose-400 font-mono">
              {formatAmount(stats?.today?.payments || 0)} <span className="text-xs font-sans text-slate-500">YER</span>
            </div>
            <div className="text-[11px] text-slate-400">
              إجمالي الشهر: <span className="font-mono font-bold text-slate-300">{formatAmount(stats?.month?.payments || 0)}</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-950 text-rose-400 border border-rose-800 flex items-center justify-center">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        {/* Net Movement */}
        <div className="bg-slate-900 p-4.5 rounded-2xl border border-emerald-900/40 shadow-xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400">صافي حركة اليوم</span>
            <div
              className={`text-xl font-extrabold font-mono ${
                (stats?.today?.net || 0) >= 0 ? 'text-teal-400' : 'text-amber-400'
              }`}
            >
              {formatAmount(stats?.today?.net || 0)} <span className="text-xs font-sans text-slate-500">YER</span>
            </div>
            <div className="text-[11px] text-slate-400">
              صافي الشهر: <span className="font-mono font-bold text-slate-300">{formatAmount(stats?.month?.net || 0)}</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-teal-950 text-teal-400 border border-teal-800 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Filtered View Summary */}
        <div className="bg-slate-900 p-4.5 rounded-2xl border border-emerald-900/40 shadow-xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400">السندات المعروضة</span>
            <div className="text-xl font-extrabold text-white font-mono">
              {filteredPayments.length} <span className="text-xs font-sans text-slate-500">سند</span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              قبض: {formatAmount(totalReceipts)} | دفع: {formatAmount(totalDisbursements)}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Main Navigation Tabs & Filters Bar */}
      <div className="bg-slate-900 rounded-2xl border border-emerald-900/40 shadow-xl overflow-hidden" id="vouchers-tabs-and-filters">
        {/* Tabs Bar */}
        <div className="flex border-b border-slate-800 px-4 pt-3 gap-2 bg-slate-950/60 overflow-x-auto">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`flex items-center gap-2 pb-3 px-4 font-bold text-sm border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'ALL'
                ? 'border-emerald-500 text-emerald-400 bg-slate-900 rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
            id="tab-all-vouchers"
          >
            <Layers className="w-4 h-4" />
            <span>كافة السندات المالية</span>
            <span className="px-2 py-0.5 text-xs rounded-full bg-slate-800 text-slate-400 font-mono">
              {payments.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('CUSTOMER_PAYMENT')}
            className={`flex items-center gap-2 pb-3 px-4 font-bold text-sm border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'CUSTOMER_PAYMENT'
                ? 'border-emerald-500 text-emerald-400 bg-slate-900 rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
            id="tab-receipt-vouchers"
          >
            <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
            <span>سندات القبض (مقبوضات العملاء)</span>
          </button>

          <button
            onClick={() => setActiveTab('SUPPLIER_PAYMENT')}
            className={`flex items-center gap-2 pb-3 px-4 font-bold text-sm border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'SUPPLIER_PAYMENT'
                ? 'border-rose-500 text-rose-400 bg-slate-900 rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
            id="tab-payment-vouchers"
          >
            <ArrowUpRight className="w-4 h-4 text-rose-400" />
            <span>سندات الدفع (مدفوعات الموردين)</span>
          </button>
        </div>

        {/* Filters Row */}
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 bg-slate-950/40 border-b border-slate-800">
          {/* Search Box */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث برقم السند، الطرف، المرجع، البيان..."
              className="w-full pl-3 pr-9 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
              id="input-vouchers-search"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
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
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
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
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
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
              className="w-full px-2 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-slate-200"
              title="من تاريخ"
              id="input-vouchers-start-date"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-2 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-slate-200"
              title="إلى تاريخ"
              id="input-vouchers-end-date"
            />
          </div>
        </div>

        {/* 4. Vouchers Table */}
        <div className="overflow-x-auto" id="vouchers-table-container">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold">
                <th className="py-3.5 px-4">رقم السند</th>
                <th className="py-3.5 px-4">النوع</th>
                <th className="py-3.5 px-4">الطرف المعني</th>
                <th className="py-3.5 px-4">المبلغ والعملة</th>
                <th className="py-3.5 px-4">طريقة السداد والخزينة</th>
                <th className="py-3.5 px-4">التاريخ</th>
                <th className="py-3.5 px-4 text-center">الحالة</th>
                <th className="py-3.5 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
                    <span>جاري تحميل السندات المالية والتحصيلات...</span>
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30 text-emerald-400" />
                    <p className="font-bold text-sm text-slate-300">لا توجد سندات مالية مسجلة</p>
                    <p className="text-xs text-slate-400 mt-1">
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
                      className={`hover:bg-slate-800/40 transition ${
                        isCancelled ? 'opacity-60 bg-slate-950/40' : ''
                      }`}
                    >
                      {/* Voucher Number */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleOpenDetails(p.id)}
                          className="font-mono font-bold text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>{p.voucher_number || p.reference || `V-${p.id.slice(0, 6)}`}</span>
                        </button>
                        {p.operation_number && (
                          <div className="text-[10px] text-slate-400 font-mono">عملية: {p.operation_number}</div>
                        )}
                      </td>

                      {/* Voucher Type */}
                      <td className="py-3 px-4">
                        {isReceipt ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                            <span>سند قبض</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            <span>سند صرف</span>
                          </span>
                        )}
                      </td>

                      {/* Party */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-100">
                          {p.customer_name || p.supplier_name || 'غير محدد'}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2">
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
                          className={`font-mono font-extrabold text-sm ${
                            isCancelled
                              ? 'text-slate-500 line-through'
                              : isReceipt
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {formatAmount(p.amount || 0)} <span className="text-xs font-sans font-bold text-slate-400">{p.currency || 'YER'}</span>
                        </div>
                        {p.currency && p.currency !== 'YER' && Number(p.exchange_rate) > 1 && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            ≈ {formatAmount((p.amount || 0) * (p.exchange_rate || 1))} YER (سعر: {p.exchange_rate})
                          </div>
                        )}
                      </td>

                      {/* Payment Method & Account */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-bold text-slate-300">
                          {p.payment_method === 'CASH' ? (
                            <>
                              <Wallet className="w-3.5 h-3.5 text-amber-400" />
                              <span>نقداً (خزينة)</span>
                            </>
                          ) : p.payment_method === 'BANK' || p.payment_method === 'BANK_TRANSFER' ? (
                            <>
                              <Landmark className="w-3.5 h-3.5 text-blue-400" />
                              <span>تحويل بنكي {p.bank_name ? `(${p.bank_name})` : ''}</span>
                            </>
                          ) : p.payment_method === 'WALLET' ? (
                            <>
                              <CreditCard className="w-3.5 h-3.5 text-purple-400" />
                              <span>محفظة {p.wallet_provider ? `(${p.wallet_provider})` : ''}</span>
                            </>
                          ) : (
                            <>
                              <FileText className="w-3.5 h-3.5 text-emerald-400" />
                              <span>شيك مصرفي {p.check_number ? `(#${p.check_number})` : ''}</span>
                            </>
                          )}
                        </div>
                        {p.notes && <div className="text-[11px] text-slate-400 truncate max-w-xs">{p.notes}</div>}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {p.payment_date ? new Date(p.payment_date).toLocaleDateString('ar-YE') : '-'}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {isCancelled ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/70 text-rose-300 border border-rose-800">
                            <Ban className="w-3 h-3" />
                            <span>ملغي</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/70 text-emerald-300 border border-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>معتمد</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenDetails(p.id)}
                            className="p-1.5 text-slate-300 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                            title="عرض التفاصيل والقيود المحاسبية"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handlePrintVoucher(p)}
                            className="p-1.5 text-slate-300 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                            title="طباعة السند الرسمي"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {!isCancelled && (
                            <button
                              onClick={() => handleOpenCancelDialog(p)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 rounded-lg transition cursor-pointer"
                              title="إلغاء السند وعكس القيود"
                            >
                              <Ban className="w-4 h-4" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto" id="modal-create-voucher">
          <div className="bg-slate-900 rounded-2xl max-w-2xl w-full border border-emerald-900/50 shadow-2xl overflow-hidden my-8">
            {/* Modal Header */}
            <div
              className={`p-5 flex items-center justify-between text-white border-b ${
                paymentType === 'CUSTOMER_PAYMENT'
                  ? 'bg-slate-950 border-emerald-900/40'
                  : 'bg-slate-950 border-rose-900/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${
                  paymentType === 'CUSTOMER_PAYMENT' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                }`}>
                  {paymentType === 'CUSTOMER_PAYMENT' ? (
                    <ArrowDownLeft className="w-5 h-5 stroke-[2.5]" />
                  ) : (
                    <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
                  )}
                </div>
                <div>
                  <h2 className="text-base font-black text-white">
                    {paymentType === 'CUSTOMER_PAYMENT' ? 'إنشاء سند قبض مالي (تحصيل من عميل)' : 'إنشاء سند صرف مالي (سداد لمورد)'}
                  </h2>
                  <p className="text-xs text-slate-400">تسجيل وتأكيد الحركة النقدية مع الترحيل التلقائي لدفتر الأستاذ العام</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSavePayment} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Step 1: Party Selection */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">
                    {paymentType === 'CUSTOMER_PAYMENT' ? 'العميل المستلم منه *' : 'المورد المدفوع له *'}
                  </label>
                  {selectedParty && (
                    <span className="text-[11px] font-mono font-bold text-emerald-400">
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
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
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
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">مبلغ السند *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl font-mono text-sm font-bold text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
                  />
                </div>

                {/* Currency */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">العملة</label>
                  <select
                    value={currency}
                    onChange={(e) => {
                      const cur = e.target.value;
                      setCurrency(cur);
                      setExchangeRate(String(getAccountingRate(cur)));
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
                  >
                    <option value="YER">ريال يمني (YER)</option>
                    <option value="SAR">ريال سعودي (SAR)</option>
                    <option value="USD">دولار أمريكي (USD)</option>
                  </select>
                </div>

                {/* Payment Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">تاريخ السند *</label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
                  />
                </div>
              </div>

              {/* Exchange rate if foreign */}
              {currency !== 'YER' && (
                <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl flex items-center justify-between gap-4 text-xs flex-wrap">
                  <div className="flex items-center gap-2 text-amber-300 font-bold">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>سعر صرف {currency} مقابل YER:</span>
                    {amount && Number(amount) > 0 && (
                      <span className="font-mono text-emerald-400 font-bold mr-2">
                        (المعادل: ≈ {formatNumber(Number(amount) * Number(exchangeRate))} YER)
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(e.target.value)}
                    className="w-32 px-3 py-1.5 bg-slate-900 border border-amber-700 rounded-lg font-mono font-bold text-xs text-white focus:outline-none"
                  />
                </div>
              )}

              {/* Step 3: Payment Method & Channel Details */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-300">طريقة وقناة السداد *</label>
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
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-950 border-emerald-500 text-emerald-300 shadow-xs'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-emerald-400' : ''}`} />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Conditional Fields: Bank */}
                {paymentMethod === 'BANK' && (
                  <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">اسم البنك</label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="مثل: بنك الكريمي، بنك التضامن"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">رقم الحساب / IBAN</label>
                      <input
                        type="text"
                        value={bankAccountNumber}
                        onChange={(e) => setBankAccountNumber(e.target.value)}
                        placeholder="رقم الحساب البنكي"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">رقم العملية / الإشعار</label>
                      <input
                        type="text"
                        value={operationNumber}
                        onChange={(e) => setOperationNumber(e.target.value)}
                        placeholder="رقم التحويل البنكي"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white"
                      />
                    </div>
                  </div>
                )}

                {/* Conditional Fields: Wallet */}
                {paymentMethod === 'WALLET' && (
                  <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">مزود المحفظة</label>
                      <input
                        type="text"
                        value={walletProvider}
                        onChange={(e) => setWalletProvider(e.target.value)}
                        placeholder="مثل: جوالي، فلوسك، ون كاش"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">رقم هاتف المحفظة</label>
                      <input
                        type="text"
                        value={walletNumber}
                        onChange={(e) => setWalletNumber(e.target.value)}
                        placeholder="رقم هاتف المحفظة"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">رقم عملية التحويل</label>
                      <input
                        type="text"
                        value={operationNumber}
                        onChange={(e) => setOperationNumber(e.target.value)}
                        placeholder="رقم المعاملة بالمحفظة"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white"
                      />
                    </div>
                  </div>
                )}

                {/* Conditional Fields: Check */}
                {paymentMethod === 'CHECK' && (
                  <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">رقم الشيك</label>
                      <input
                        type="text"
                        value={checkNumber}
                        onChange={(e) => setCheckNumber(e.target.value)}
                        placeholder="رقم الشيك المصرفي"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">تاريخ استحقاق الشيك</label>
                      <input
                        type="date"
                        value={checkDueDate}
                        onChange={(e) => setCheckDueDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">اسم البنك المسحوب عليه</label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="اسم البنك"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Step 4: Settlement / Allocation Mode */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">طريقة تسوية المبلغ</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAllocationMode('ON_ACCOUNT');
                        setInvoiceAllocations({});
                      }}
                      className={`px-3 py-1 text-xs rounded-lg font-bold transition cursor-pointer ${
                        allocationMode === 'ON_ACCOUNT'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      دفعة على الحساب
                    </button>
                    <button
                      type="button"
                      onClick={() => setAllocationMode('ALLOCATE_INVOICES')}
                      className={`px-3 py-1 text-xs rounded-lg font-bold transition cursor-pointer ${
                        allocationMode === 'ALLOCATE_INVOICES'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      تسوية فواتير محددة ({partyInvoices.length})
                    </button>
                  </div>
                </div>

                {/* If Invoices allocation selected */}
                {allocationMode === 'ALLOCATE_INVOICES' && (
                  <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-300">الفواتير المستحقة للطرف المحدد:</span>
                      <button
                        type="button"
                        onClick={handleAutoDistribute}
                        className="text-xs text-emerald-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>توزيع تلقائي للمبلغ على الأقدم</span>
                      </button>
                    </div>

                    {partyInvoices.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-3">لا توجد فواتير معلقة لهذا الطرف (سيتم قيد السند كدفعة على الحساب)</p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {partyInvoices.map((inv) => {
                          const due = Number(inv.balance_due || inv.remaining_amount || (Number(inv.total_amount || 0) - Number(inv.paid_amount || 0)));
                          const currentAlloc = invoiceAllocations[inv.id] || 0;

                          return (
                            <div
                              key={inv.id}
                              className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="space-y-0.5">
                                <div className="font-mono font-bold text-white">
                                  فاتورة #{inv.invoice_number || inv.id.slice(0, 6)}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  الإجمالي: {formatAmount(inv.total_amount || 0)} | المتبقي:{' '}
                                  <span className="font-mono font-bold text-rose-400">{formatAmount(due)}</span> {currency}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <label className="text-[11px] text-slate-400 font-bold">المبلغ المطبق:</label>
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
                                  className="w-24 px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs font-mono font-bold text-white focus:border-emerald-500"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Allocation summary footer */}
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800 font-mono font-bold">
                      <span className="text-slate-300">إجمالي المخصص للفواتير: {formatAmount(totalAllocatedAmount)} {currency}</span>
                      {unallocatedExcess > 0 && (
                        <span className="text-amber-400">
                          الفائض (على الحساب): +{formatAmount(unallocatedExcess)} {currency}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Step 5: Notes & Reference */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">رقم المرجع الخارجي (اختياري)</label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="رقم سند يدوي / مستند ورقي"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">رسوم التحويل (إن وجدت)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={transferFee}
                    onChange={(e) => setTransferFee(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">وذلك عن / البيان والملاحظات</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="وصف سبب السند المالي، مثل: سداد دفعة عن مبيعات شهر..."
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex items-center gap-2 px-6 py-2.5 text-white rounded-xl text-xs font-extrabold shadow-md transition cursor-pointer ${
                    paymentType === 'CUSTOMER_PAYMENT'
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30'
                      : 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/30'
                  }`}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto" id="modal-voucher-details">
          <div className="bg-slate-900 rounded-2xl max-w-3xl w-full border border-emerald-900/50 shadow-2xl overflow-hidden my-8">
            {detailsLoading ? (
              <div className="p-12 text-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-500" />
                <p className="text-sm font-bold">جاري تحميل تفاصيل السند والقيود المحاسبية...</p>
              </div>
            ) : selectedPaymentDetails ? (
              <div className="divide-y divide-slate-800">
                {/* Header */}
                <div className="p-5 flex items-center justify-between bg-slate-950 border-b border-emerald-900/40">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${
                        selectedPaymentDetails.type === 'CUSTOMER_PAYMENT' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                      }`}
                    >
                      {selectedPaymentDetails.type === 'CUSTOMER_PAYMENT' ? (
                        <ArrowDownLeft className="w-5 h-5" />
                      ) : (
                        <ArrowUpRight className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-black text-white">
                          {selectedPaymentDetails.type === 'CUSTOMER_PAYMENT' ? 'سند قبض مالي' : 'سند صرف مالي'}:{' '}
                          <span className="font-mono text-emerald-400">{selectedPaymentDetails.voucher_number || selectedPaymentDetails.reference}</span>
                        </h2>
                        {selectedPaymentDetails.status === 'CANCELLED' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                            ملغي
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                            معتمد
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        التاريخ: {new Date(selectedPaymentDetails.payment_date).toLocaleDateString('ar-YE')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePrintVoucher(selectedPaymentDetails)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-200 shadow-xs cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-emerald-400" />
                      <span>طباعة</span>
                    </button>
                    <button onClick={() => setIsDetailsOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg cursor-pointer">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Details Body */}
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                  {/* Financial & Party Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-[11px] font-bold text-slate-400 block mb-1">المبلغ والعملة</span>
                      <span className="text-lg font-extrabold font-mono text-emerald-400">
                        {formatAmount(selectedPaymentDetails.amount || 0)} {selectedPaymentDetails.currency || 'YER'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-[11px] font-bold text-slate-400 block mb-1">الطرف المعني</span>
                      <span className="text-sm font-bold text-white block">
                        {selectedPaymentDetails.customer_name || selectedPaymentDetails.supplier_name || '-'}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {selectedPaymentDetails.customer_phone || selectedPaymentDetails.supplier_phone || ''}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-[11px] font-bold text-slate-400 block mb-1">طريقة السداد</span>
                      <span className="text-sm font-bold text-white block">
                        {selectedPaymentDetails.payment_method === 'CASH'
                          ? 'نقداً (خزينة)'
                          : selectedPaymentDetails.payment_method === 'BANK'
                          ? 'تحويل بنكي'
                          : selectedPaymentDetails.payment_method === 'WALLET'
                          ? 'محفظة إلكترونية'
                          : selectedPaymentDetails.payment_method}
                      </span>
                      {selectedPaymentDetails.bank_name && (
                        <span className="text-xs text-slate-400">{selectedPaymentDetails.bank_name}</span>
                      )}
                    </div>
                  </div>

                  {/* Statement / Notes */}
                  {selectedPaymentDetails.notes && (
                    <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                      <span className="font-bold text-slate-400 block mb-1">البيان والملاحظات:</span>
                      <p className="text-slate-200 font-medium">{selectedPaymentDetails.notes}</p>
                    </div>
                  )}

                  {/* Linked Allocations Breakdown */}
                  {selectedPaymentDetails.allocations && selectedPaymentDetails.allocations.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold text-slate-300">تسوية الفواتير المرتبطة:</h3>
                      <div className="overflow-x-auto border border-slate-800 rounded-xl">
                        <table className="w-full text-right text-xs">
                          <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                            <tr>
                              <th className="p-2.5">رقم الفاتورة</th>
                              <th className="p-2.5">إجمالي الفاتورة</th>
                              <th className="p-2.5">المدفوع مسبقاً</th>
                              <th className="p-2.5 text-emerald-400">المبلغ المطبق بالسند</th>
                              <th className="p-2.5">المتبقي</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800 font-mono text-slate-300">
                            {selectedPaymentDetails.allocations.map((a: any, idx: number) => (
                              <tr key={idx} className="hover:bg-slate-800/40">
                                <td className="p-2.5 font-bold text-emerald-400">#{a.invoice_number || '-'}</td>
                                <td className="p-2.5">{formatAmount(a.invoice_total || 0)}</td>
                                <td className="p-2.5">{formatAmount(a.previous_paid || 0)}</td>
                                <td className="p-2.5 font-bold text-emerald-400">+{formatAmount(a.allocated_amount || 0)}</td>
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
                        <h3 className="text-xs font-bold text-slate-300">
                          القيود المحاسبية المرحلة بدفتر الأستاذ (Double-Entry Ledger):
                        </h3>
                        <span className="text-[11px] font-mono text-emerald-400 font-bold">متزن ومقيد</span>
                      </div>
                      <div className="overflow-x-auto border border-slate-800 rounded-xl">
                        <table className="w-full text-right text-xs">
                          <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                            <tr>
                              <th className="p-2.5">الحساب المحاسبي</th>
                              <th className="p-2.5">النوع</th>
                              <th className="p-2.5 text-emerald-400">مدين (Debit)</th>
                              <th className="p-2.5 text-rose-400">دائن (Credit)</th>
                              <th className="p-2.5">البيان</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800 font-medium text-slate-300">
                            {selectedPaymentDetails.ledger_entries.map((entry: any, idx: number) => (
                              <tr key={idx} className="hover:bg-slate-800/40">
                                <td className="p-2.5 font-bold text-white">{entry.account_name || entry.account_code || '-'}</td>
                                <td className="p-2.5 text-slate-400 font-mono text-[11px]">{entry.account_type || '-'}</td>
                                <td className="p-2.5 font-mono font-bold text-emerald-400">
                                  {Number(entry.debit || 0) > 0 ? `${formatAmount(entry.debit)} YER` : '-'}
                                </td>
                                <td className="p-2.5 font-mono font-bold text-rose-400">
                                  {Number(entry.credit || 0) > 0 ? `${formatAmount(entry.credit)} YER` : '-'}
                                </td>
                                <td className="p-2.5 text-slate-400 text-[11px]">{entry.description || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Audit Trail & Cancellation Info */}
                  {selectedPaymentDetails.status === 'CANCELLED' && (
                    <div className="p-3.5 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs space-y-1">
                      <span className="font-bold text-rose-300 block">تم إلغاء هذا السند وعكس قيوده:</span>
                      <p className="text-slate-300">
                        سبب الإلغاء: <span className="font-bold">{selectedPaymentDetails.cancellation_reason || 'غير محدد'}</span>
                      </p>
                      {selectedPaymentDetails.cancelled_at && (
                        <p className="text-slate-400 font-mono text-[10px]">
                          تاريخ الإلغاء: {new Date(selectedPaymentDetails.cancelled_at).toLocaleString('ar-YE')}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
                  {selectedPaymentDetails.status !== 'CANCELLED' ? (
                    <button
                      onClick={() => handleOpenCancelDialog(selectedPaymentDetails)}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-950/50 rounded-xl transition cursor-pointer"
                    >
                      <Ban className="w-4 h-4" />
                      <span>إلغاء السند وعكس القيود</span>
                    </button>
                  ) : (
                    <div />
                  )}

                  <button
                    onClick={() => setIsDetailsOpen(false)}
                    className="px-5 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-700 cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs" id="modal-cancel-voucher">
          <div className="bg-slate-900 rounded-2xl max-w-md w-full border border-rose-800/60 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-950 border border-rose-800 flex items-center justify-center">
                <Ban className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">إلغاء السند المالي وعكس القيود</h3>
                <p className="text-xs text-slate-400 font-mono">
                  {cancelTargetPayment.voucher_number || cancelTargetPayment.reference}
                </p>
              </div>
            </div>

            <div className="p-3 bg-rose-950/30 rounded-xl border border-rose-800/40 text-xs text-rose-300 space-y-1.5">
              <p className="font-bold">⚠️ تنبيه محاسبي هام:</p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-400">
                <li>سيتم إلغاء السند وعكس قيود اليومية بدفتر الأستاذ العام تلقائياً.</li>
                <li>سيتم إعادة فتح أي فواتير تم تسويتها بواسطة هذا السند.</li>
                <li>سيتم تعديل رصيد العميل / المورد وفقاً لمبلغ السند المعكوس.</li>
              </ul>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">سبب الإلغاء *</label>
              <textarea
                required
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="يرجى كتابة سبب إلغاء السند (مثل: خطأ في المبلغ، إيداع مكرر...)"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                disabled={isCancelling}
                className="px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isCancelling || !cancelReason.trim()}
                className="flex items-center gap-1.5 px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-900/30 transition disabled:opacity-50 cursor-pointer"
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
