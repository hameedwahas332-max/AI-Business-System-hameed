import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../../api';
import { formatNumber, formatAmount, formatCustomerAmount, formatSupplierAmount, toEnglishDigits, formatDateOnly } from '../../lib/formatters';
import { ExportActions } from '../Common/ExportActions';
import { TableExportConfig, printAccountStatement, printReport, AccountStatementPrintConfig } from '../../lib/exportUtils';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  Truck,
  Plus,
  Search,
  FileText,
  DollarSign,
  Edit2,
  Trash2,
  X,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Phone,
  Mail,
  MapPin,
  Clock,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ArrowLeftRight,
  Receipt,
  Calendar,
  Filter,
  ArrowUpDown,
  Download,
  Printer,
  MoreVertical,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  MessageCircle,
  Eye,
  RefreshCw,
  LayoutGrid,
  List,
  ShieldCheck,
  Building2,
  UserCheck,
  CheckSquare,
  Square,
  Sparkles,
  Award,
  Wallet,
  AlertTriangle,
  Send,
  Copy,
  Check,
  Share2,
  Coins,
} from 'lucide-react';
import { getAccountingRate, toBaseCurrencyAmount } from '../../lib/exchangeRates';
import { recordAutomaticTreasuryVoucher } from '../../utils/treasuryVoucherHelper';
import { enqueueOutboxTransaction } from '../../services/transactionalOutbox';

export type MainTabFilter = 'ALL' | 'CUSTOMERS' | 'SUPPLIERS' | 'DEBIT' | 'CREDIT' | 'OVERDUE' | 'ACTIVE';

export interface CustomersAndSuppliersModuleProps {
  initialTab?: 'CUSTOMERS' | 'SUPPLIERS' | 'ALL';
}

export const CustomersAndSuppliersModule: React.FC<CustomersAndSuppliersModuleProps> = ({
  initialTab = 'ALL',
}) => {
  const { company } = useAuth();

  // Main Data States
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Search & Navigation Tabs
  const [activeMainTab, setActiveMainTab] = useState<MainTabFilter>(
    initialTab === 'CUSTOMERS' ? 'CUSTOMERS' : initialTab === 'SUPPLIERS' ? 'SUPPLIERS' : 'ALL'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'TABLE' | 'CARDS'>('TABLE');

  // Advanced Filters
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DEBIT' | 'CREDIT' | 'SETTLED' | 'OVERDUE'>('ALL');
  const [currencyFilter, setCurrencyFilter] = useState<'ALL' | 'YER' | 'SAR' | 'USD'>('ALL');
  const [segmentFilter, setSegmentFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'BALANCE_DESC' | 'BALANCE_ASC' | 'LATEST' | 'NAME'>('BALANCE_DESC');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals States
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);

  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any | null>(null);

  // Detail / Statement Modal
  const [detailAccount, setDetailAccount] = useState<{ party: any; type: 'CUSTOMER' | 'SUPPLIER' } | null>(null);
  const [detailTab, setDetailTab] = useState<'OVERVIEW' | 'STATEMENT' | 'NOTES'>('STATEMENT');
  const [statementData, setStatementData] = useState<any | null>(null);
  const [statementLoading, setStatementLoading] = useState(false);
  const [stmtFromDate, setStmtFromDate] = useState<string>('');
  const [stmtToDate, setStmtToDate] = useState<string>('');
  const [stmtPage, setStmtPage] = useState<number>(1);
  const [stmtLimit, setStmtLimit] = useState<number>(50);

  // Direct Transaction Modal
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txTarget, setTxTarget] = useState<{ party: any; type: 'CUSTOMER' | 'SUPPLIER' } | null>(null);
  const [txSubmitting, setTxSubmitting] = useState(false);

  // WhatsApp Message Preview Modal
  const [whatsAppModalData, setWhatsAppModalData] = useState<{
    party: any;
    type: 'CUSTOMER' | 'SUPPLIER';
    phone: string;
    message: string;
    statementSummary?: {
      openingBalance: number;
      totalDebit: number;
      totalCredit: number;
      closingBalance: number;
      currency: string;
      statementDate: string;
    };
  } | null>(null);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);

  // Import Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Form States
  const [customerFormData, setCustomerFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    openingBalance: '0',
    currency: 'YER',
    notes: '',
  });

  const [supplierFormData, setSupplierFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    openingBalance: '0',
    currency: 'YER',
    notes: '',
  });

  const [txFormData, setTxFormData] = useState({
    type: 'DEBIT', // DEBIT, CREDIT, PAYMENT
    amount: '',
    currency: 'YER',
    exchangeRate: '1.0',
    date: new Date().toISOString().split('T')[0],
    description: '',
    referenceNo: '',
    receivedBy: '',
  });

  // Customer Merge Modal State (CR-2026-CUSTOMER-MERGE-HANDLER)
  const [mergeModal, setMergeModal] = useState<{ sourceCustomer: any; targetCustomerId: string } | null>(null);
  const [isMerging, setIsMerging] = useState(false);

  // Fetch Data Function
  const fetchAllData = async (q = '') => {
    try {
      setLoading(true);
      setError(null);
      const [custRes, suppRes] = await Promise.all([
        api.getCustomers(q),
        api.getSuppliers(q),
      ]);
      const custData = Array.isArray(custRes)
        ? custRes
        : (custRes?.data || custRes?.items || custRes?.customers || []);
      const suppData = Array.isArray(suppRes)
        ? suppRes
        : (suppRes?.data || suppRes?.items || suppRes?.suppliers || []);
      setCustomers(custData);
      setSuppliers(suppData);
    } catch (err: any) {
      setError(err.message || 'فشل جلب بيانات الحسابات من الخادم');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData(searchQuery);
    const handleWiped = () => {
      setCustomers([]);
      setSuppliers([]);
      setSelectedIds(new Set());
      fetchAllData(searchQuery);
    };
    const handleUpdated = () => {
      fetchAllData(searchQuery);
    };
    window.addEventListener('erp-demo-data-wiped', handleWiped);
    window.addEventListener('erp-customers-updated', handleUpdated);
    window.addEventListener('erp-suppliers-updated', handleUpdated);
    window.addEventListener('erp-data-updated', handleUpdated);
    window.addEventListener('storage', handleUpdated);
    return () => {
      window.removeEventListener('erp-demo-data-wiped', handleWiped);
      window.removeEventListener('erp-customers-updated', handleUpdated);
      window.removeEventListener('erp-suppliers-updated', handleUpdated);
      window.removeEventListener('erp-data-updated', handleUpdated);
      window.removeEventListener('storage', handleUpdated);
    };
  }, [searchQuery]);

  // Combined List with Normalized Types
  const unifiedAccounts = useMemo(() => {
    const customerItems = customers.map((c) => {
      const opBal = Number(c.opening_balance !== undefined ? c.opening_balance : (c.openingBalance !== undefined ? c.openingBalance : (c.balance || 0)));
      const curBal = Number(c.current_balance !== undefined ? c.current_balance : (c.balance || 0));
      const cur = c.currency || 'YER';

      return {
        ...c,
        _accountType: 'CUSTOMER' as const,
        _uniqueKey: `cust_${c.id}`,
        _displayCode: `CUST-${String(c.id).slice(-4).toUpperCase()}`,
        _name: c.name || '',
        _phone: c.phone || '',
        _email: c.email || '',
        _address: c.address || '',
        _currency: cur,
        _openingBalance: opBal,
        _currentBalance: curBal,
        _notes: c.notes || '',
        _createdAt: c.created_at || new Date().toISOString(),
        _segment:
          Math.abs(curBal) > 500000
            ? 'VIP'
            : Math.abs(curBal) > 100000
            ? 'عميل دائم'
            : 'عميل نشط',
      };
    });

    const supplierItems = suppliers.map((s) => {
      const opBal = Number(s.opening_balance !== undefined ? s.opening_balance : (s.openingBalance !== undefined ? s.openingBalance : (s.balance || 0)));
      const curBal = Number(s.current_balance !== undefined ? s.current_balance : (s.balance || 0));
      const cur = s.currency || 'YER';

      return {
        ...s,
        _accountType: 'SUPPLIER' as const,
        _uniqueKey: `supp_${s.id}`,
        _displayCode: `SUPP-${String(s.id).slice(-4).toUpperCase()}`,
        _name: s.name || '',
        _phone: s.phone || '',
        _email: s.email || '',
        _address: s.address || '',
        _currency: cur,
        _openingBalance: opBal,
        _currentBalance: curBal,
        _notes: s.notes || '',
        _createdAt: s.created_at || new Date().toISOString(),
        _segment:
          Math.abs(curBal) > 500000
            ? 'مورد استراتيجي'
            : Math.abs(curBal) > 100000
            ? 'مورد رئيسي'
            : 'مورد معتمد',
      };
    });

    return [...customerItems, ...supplierItems];
  }, [customers, suppliers]);

  // KPI Calculations using real values
  const totalCustomerCount = customers.length;
  const activeCustomerCount = customers.filter((c) => Number(c.current_balance || 0) !== 0 || c.updated_at).length;
  const totalCustomerReceivables = customers.reduce((sum, c) => sum + Math.max(0, Number(c.current_balance || 0)), 0);

  const totalSupplierCount = suppliers.length;
  const activeSupplierCount = suppliers.filter((s) => Number(s.current_balance || 0) !== 0 || s.updated_at).length;
  const totalSupplierPayables = suppliers.reduce((sum, s) => sum + Math.max(0, Number(s.current_balance || 0)), 0);

  // Multi-currency breakdown & base currency (YER) conversion summary
  const currencyBreakdown = useMemo(() => {
    let yerReceivables = 0;
    let sarReceivables = 0;
    let usdReceivables = 0;
    let yerPayables = 0;
    let sarPayables = 0;
    let usdPayables = 0;

    customers.forEach((c) => {
      const cur = (c.currency || 'YER').toUpperCase();
      const bal = Math.max(0, Number(c.current_balance || 0));
      if (cur === 'SAR') sarReceivables += bal;
      else if (cur === 'USD') usdReceivables += bal;
      else yerReceivables += bal;
    });

    suppliers.forEach((s) => {
      const cur = (s.currency || 'YER').toUpperCase();
      const bal = Math.max(0, Number(s.current_balance || 0));
      if (cur === 'SAR') sarPayables += bal;
      else if (cur === 'USD') usdPayables += bal;
      else yerPayables += bal;
    });

    const sarRate = getAccountingRate('SAR');
    const usdRate = getAccountingRate('USD');

    const totalReceivablesInBase = yerReceivables + (sarReceivables * sarRate) + (usdReceivables * usdRate);
    const totalPayablesInBase = yerPayables + (sarPayables * sarRate) + (usdPayables * usdRate);
    const netBaseEquivalent = totalReceivablesInBase - totalPayablesInBase;

    return {
      yerReceivables,
      sarReceivables,
      usdReceivables,
      yerPayables,
      sarPayables,
      usdPayables,
      sarRate,
      usdRate,
      totalReceivablesInBase,
      totalPayablesInBase,
      netBaseEquivalent,
    };
  }, [customers, suppliers]);

  // Filtered List
  const filteredAccounts = useMemo(() => {
    return unifiedAccounts.filter((item) => {
      // Main Tab Filter
      if (activeMainTab === 'CUSTOMERS' && item._accountType !== 'CUSTOMER') return false;
      if (activeMainTab === 'SUPPLIERS' && item._accountType !== 'SUPPLIER') return false;
      if (activeMainTab === 'DEBIT' && item._currentBalance <= 0) return false;
      if (activeMainTab === 'CREDIT' && item._currentBalance >= 0) return false;
      if (activeMainTab === 'OVERDUE' && Math.abs(item._currentBalance) === 0) return false;
      if (activeMainTab === 'ACTIVE' && item._currentBalance === 0) return false;

      // Status Filter
      if (statusFilter === 'DEBIT' && item._currentBalance <= 0) return false;
      if (statusFilter === 'CREDIT' && item._currentBalance >= 0) return false;
      if (statusFilter === 'SETTLED' && item._currentBalance !== 0) return false;
      if (statusFilter === 'OVERDUE' && item._currentBalance <= 0) return false;

      // Currency Filter
      if (currencyFilter !== 'ALL' && item._currency !== currencyFilter) return false;

      // Segment Filter
      if (segmentFilter !== 'ALL' && item._segment !== segmentFilter) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'BALANCE_DESC') {
        return Math.abs(b._currentBalance) - Math.abs(a._currentBalance);
      }
      if (sortBy === 'BALANCE_ASC') {
        return Math.abs(a._currentBalance) - Math.abs(b._currentBalance);
      }
      if (sortBy === 'LATEST') {
        return new Date(b._createdAt).getTime() - new Date(a._createdAt).getTime();
      }
      if (sortBy === 'NAME') {
        return a._name.localeCompare(b._name, 'ar');
      }
      return 0;
    });
  }, [unifiedAccounts, activeMainTab, statusFilter, currencyFilter, segmentFilter, sortBy]);

  // Handler: Open Create Customer
  const handleOpenCreateCustomer = () => {
    setEditingCustomer(null);
    setCustomerFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      openingBalance: '0',
      currency: (company?.currency as any) || 'YER',
      notes: '',
    });
    setIsCustomerModalOpen(true);
  };

  // Handler: Open Edit Customer
  const handleOpenEditCustomer = (cust: any) => {
    setEditingCustomer(cust);
    const opBal = cust.opening_balance !== undefined ? cust.opening_balance : (cust.openingBalance !== undefined ? cust.openingBalance : (cust.balance || 0));
    setCustomerFormData({
      name: cust.name || '',
      phone: cust.phone || '',
      email: cust.email || '',
      address: cust.address || '',
      openingBalance: String(opBal || 0),
      currency: cust.currency || 'YER',
      notes: cust.notes || '',
    });
    setIsCustomerModalOpen(true);
  };

  // Handler: Save Customer
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const opNum = parseFloat(customerFormData.openingBalance || '0');
      let customerRecord: any = null;
      if (editingCustomer) {
        const updateRes: any = await api.updateCustomer(editingCustomer.id, {
          name: customerFormData.name,
          phone: customerFormData.phone,
          email: customerFormData.email,
          address: customerFormData.address,
          currency: customerFormData.currency,
          opening_balance: opNum,
          openingBalance: opNum,
          notes: customerFormData.notes,
        });
        customerRecord = updateRes?.data || updateRes;
        if (customerRecord?.id) {
          setCustomers((prev) =>
            prev.map((c) => (c.id === customerRecord.id ? { ...c, ...customerRecord } : c))
          );
        }
        setSuccess('تم تحديث بيانات حساب العميل والعملة بنجاح');
      } else {
        const createRes: any = await api.createCustomer({
          name: customerFormData.name,
          phone: customerFormData.phone,
          email: customerFormData.email,
          address: customerFormData.address,
          openingBalance: opNum,
          opening_balance: opNum,
          balance: opNum,
          currency: customerFormData.currency,
          notes: customerFormData.notes,
        });
        customerRecord = createRes?.data || createRes;
        if (customerRecord && (customerRecord.id || customerRecord.name)) {
          setCustomers((prev) => [
            customerRecord,
            ...prev.filter((c) => c.id !== customerRecord.id),
          ]);
        }
        setSuccess('تم تسجيل العميل الجديد وتثبيت الرصيد الافتتاحي والعملة بنجاح');
      }

      try {
        localStorage.removeItem('erp_clean_production_mode_v1');
        localStorage.removeItem('erp_sample_data_cleaned');
      } catch {}

      // Enqueue Master Data change into Transactional Outbox (CR-2026-TAURI-OFFLINE-SYNC-001)
      enqueueOutboxTransaction(
        editingCustomer ? 'UPDATE_CUSTOMER_MASTER' : 'CREATE_CUSTOMER_MASTER',
        {
          id: customerRecord?.id || editingCustomer?.id,
          name: customerFormData.name,
          phone: customerFormData.phone,
          currency: customerFormData.currency,
          opening_balance: opNum,
        },
        { dependencyOrder: 10 }
      ).catch(() => {});

      setIsCustomerModalOpen(false);
      fetchAllData(searchQuery);
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || 'فشل حفظ بيانات العميل');
    }
  };

  // Handler: Delete Customer
  const handleDeleteCustomer = async (cust: any) => {
    if (!window.confirm(`هل أنت متأكد من رغبتك في حذف / تعطيل حساب العميل "${cust.name || cust._name}"؟`)) return;
    try {
      setError(null);
      const res = await api.deleteCustomer(cust.id);
      setSuccess(res?.message || 'تمت معالجة حذف / تعطيل حساب العميل بنجاح');
      fetchAllData(searchQuery);
      if (detailAccount?.party?.id === cust.id) setDetailAccount(null);
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message || 'فشل حذف العميل');
    }
  };

  // Handler: Open Create Supplier
  const handleOpenCreateSupplier = () => {
    setEditingSupplier(null);
    setSupplierFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      openingBalance: '0',
      currency: (company?.currency as any) || 'YER',
      notes: '',
    });
    setIsSupplierModalOpen(true);
  };

  // Handler: Open Edit Supplier
  const handleOpenEditSupplier = (supp: any) => {
    setEditingSupplier(supp);
    const opBal = supp.opening_balance !== undefined ? supp.opening_balance : (supp.openingBalance !== undefined ? supp.openingBalance : (supp.balance || 0));
    setSupplierFormData({
      name: supp.name || '',
      phone: supp.phone || '',
      email: supp.email || '',
      address: supp.address || '',
      openingBalance: String(opBal || 0),
      currency: supp.currency || 'YER',
      notes: supp.notes || '',
    });
    setIsSupplierModalOpen(true);
  };

  // Handler: Save Supplier
  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const opNum = parseFloat(supplierFormData.openingBalance || '0');
      let supplierRecord: any = null;
      if (editingSupplier) {
        const updateRes: any = await api.updateSupplier(editingSupplier.id, {
          name: supplierFormData.name,
          phone: supplierFormData.phone,
          email: supplierFormData.email,
          address: supplierFormData.address,
          currency: supplierFormData.currency,
          opening_balance: opNum,
          openingBalance: opNum,
          notes: supplierFormData.notes,
        });
        supplierRecord = updateRes?.data || updateRes;
        if (supplierRecord?.id) {
          setSuppliers((prev) =>
            prev.map((s) => (s.id === supplierRecord.id ? { ...s, ...supplierRecord } : s))
          );
        }
        setSuccess('تم تحديث بيانات المورد والعملة بنجاح');
      } else {
        const createRes: any = await api.createSupplier({
          name: supplierFormData.name,
          phone: supplierFormData.phone,
          email: supplierFormData.email,
          address: supplierFormData.address,
          openingBalance: opNum,
          opening_balance: opNum,
          balance: opNum,
          currency: supplierFormData.currency,
          notes: supplierFormData.notes,
        });
        supplierRecord = createRes?.data || createRes;
        if (supplierRecord && (supplierRecord.id || supplierRecord.name)) {
          setSuppliers((prev) => [
            supplierRecord,
            ...prev.filter((s) => s.id !== supplierRecord.id),
          ]);
        }
        setSuccess('تم تسجيل المورد الجديد وتثبيت الرصيد الافتتاحي والعملة بنجاح');
      }

      try {
        localStorage.removeItem('erp_clean_production_mode_v1');
        localStorage.removeItem('erp_sample_data_cleaned');
      } catch {}

      // Enqueue Master Data change into Transactional Outbox (CR-2026-TAURI-OFFLINE-SYNC-001)
      enqueueOutboxTransaction(
        editingSupplier ? 'UPDATE_SUPPLIER_MASTER' : 'CREATE_SUPPLIER_MASTER',
        {
          id: supplierRecord?.id || editingSupplier?.id,
          name: supplierFormData.name,
          phone: supplierFormData.phone,
          currency: supplierFormData.currency,
          opening_balance: opNum,
        },
        { dependencyOrder: 10 }
      ).catch(() => {});

      setIsSupplierModalOpen(false);
      fetchAllData(searchQuery);
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || 'فشل حفظ بيانات المورد');
    }
  };

  // Handler: Delete Supplier
  const handleDeleteSupplier = async (supp: any) => {
    if (!window.confirm(`هل أنت متأكد من رغبتك في حذف المورد "${supp.name || supp._name}"؟`)) return;
    try {
      setError(null);
      await api.deleteSupplier(supp.id);
      setSuccess('تم حذف المورد بنجاح');
      fetchAllData(searchQuery);
      if (detailAccount?.party?.id === supp.id) setDetailAccount(null);
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || 'فشل حذف المورد');
    }
  };

  // Handler: Fetch Account Statement with filters & pagination
  const fetchAccountStatement = async (party: any, type: 'CUSTOMER' | 'SUPPLIER', from?: string, to?: string, page?: number, limit?: number) => {
    try {
      setStatementLoading(true);
      if (type === 'CUSTOMER') {
        const res = await api.getCustomerStatement(party.id, {
          from_date: from || undefined,
          to_date: to || undefined,
          page: page ?? stmtPage,
          limit: limit ?? stmtLimit,
        });
        setStatementData(res?.data || null);
      } else {
        const res = await api.getSupplierStatement(party.id, {
          from_date: from || undefined,
          to_date: to || undefined,
          page: page ?? stmtPage,
          limit: limit ?? stmtLimit,
        });
        setStatementData(res?.data || null);
      }
    } catch (err: any) {
      setError(err.message || 'فشل تحميل كشف الحساب');
    } finally {
      setStatementLoading(false);
    }
  };

  // Handler: Open Account Statement / Detail
  const handleOpenAccountDetail = async (party: any, type: 'CUSTOMER' | 'SUPPLIER') => {
    try {
      setDetailAccount({ party, type });
      setDetailTab('STATEMENT');
      setStmtFromDate('');
      setStmtToDate('');
      setStmtPage(1);
      await fetchAccountStatement(party, type, '', '', 1, stmtLimit);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل كشف الحساب');
    }
  };

  // Handler: Open Direct Transaction Modal
  const handleOpenTransactionModal = (party?: any, type?: 'CUSTOMER' | 'SUPPLIER') => {
    const selectedParty = party || (customers[0] ? { ...customers[0], _accountType: 'CUSTOMER' } : null);
    const selectedType = type || (selectedParty?._accountType || 'CUSTOMER');

    setTxTarget({ party: selectedParty, type: selectedType });
    setTxFormData({
      type: selectedType === 'CUSTOMER' ? 'DEBIT' : 'CREDIT',
      amount: '',
      currency: selectedParty?.currency || 'YER',
      exchangeRate: '1.0',
      date: new Date().toISOString().split('T')[0],
      description: '',
      referenceNo: '',
      receivedBy: '',
    });
    setIsTxModalOpen(true);
  };

  // Handler: Customer Merge
  const handleOpenMergeModal = (customer: any) => {
    const targetCandidates = customers.filter((c) => c.id !== customer.id);
    const defaultTarget = targetCandidates[0]?.id || '';
    setMergeModal({ sourceCustomer: customer, targetCustomerId: defaultTarget });
  };

  const handleExecuteMerge = async () => {
    if (!mergeModal || !mergeModal.targetCustomerId) return;
    try {
      setIsMerging(true);
      setError(null);
      await api.mergeCustomers(mergeModal.sourceCustomer.id, mergeModal.targetCustomerId);
      setSuccess(`تم دمج حساب العميل "${mergeModal.sourceCustomer.name || mergeModal.sourceCustomer._name}" بنجاح ونقل كافة الحركات والفواتير والرصيد`);
      setMergeModal(null);
      fetchAllData(searchQuery);
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err?.message || 'فشل دمج حساب العميل');
    } finally {
      setIsMerging(false);
    }
  };

  // Handler: Submit Direct Transaction
  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txTarget?.party?.id) {
      setError('يرجى تحديد الحساب المستهدف للعملية');
      return;
    }
    const numAmount = parseFloat(txFormData.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('يرجى إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }

    try {
      setTxSubmitting(true);
      setError(null);

      const cleanReceivedBy = txFormData.receivedBy?.trim() || undefined;

      if (txTarget.type === 'CUSTOMER') {
        await api.addCustomerTransaction(txTarget.party.id, {
          type: txFormData.type,
          amount: numAmount,
          currency: txFormData.currency || 'YER',
          exchange_rate: parseFloat(txFormData.exchangeRate || '1.0'),
          date: txFormData.date || new Date().toISOString().split('T')[0],
          description: txFormData.description?.trim() || undefined,
          referenceNo: txFormData.referenceNo?.trim() || undefined,
          receivedBy: cleanReceivedBy,
          received_by: cleanReceivedBy,
        });

        // If customer payment (CREDIT transaction), record automatic receipt voucher
        if (txFormData.type === 'CREDIT') {
          try {
            recordAutomaticTreasuryVoucher({
              type: 'CUSTOMER_PAYMENT',
              amount: numAmount,
              currency: txFormData.currency || 'YER',
              paymentMethod: 'CASH',
              paymentDate: txFormData.date || new Date().toISOString().split('T')[0],
              partyId: txTarget.party.id,
              partyName: txTarget.party.name || txTarget.party._name,
              partyPhone: txTarget.party.phone || txTarget.party._phone,
              referenceNo: txFormData.referenceNo?.trim(),
              referenceType: 'DEBT_COLLECTION',
              notes: txFormData.description?.trim() || `سند تحصيل ذمة عميل (${txTarget.party.name || txTarget.party._name})${cleanReceivedBy ? ` - المستلم: ${cleanReceivedBy}` : ''}`,
            });
          } catch (pmtErr) {
            console.warn('Voucher sync warn:', pmtErr);
          }
        }

        setSuccess('تم تسجيل حركة حساب العميل وتحديث رصيد الذمم المدينة بنجاح');
      } else {
        await api.addSupplierTransaction(txTarget.party.id, {
          type: txFormData.type,
          amount: numAmount,
          currency: txFormData.currency || 'YER',
          exchange_rate: parseFloat(txFormData.exchangeRate || '1.0'),
          date: txFormData.date || new Date().toISOString().split('T')[0],
          description: txFormData.description?.trim() || undefined,
          referenceNo: txFormData.referenceNo?.trim() || undefined,
          receivedBy: cleanReceivedBy,
          received_by: cleanReceivedBy,
        });

        // If supplier payment (DEBIT transaction), record automatic payment voucher
        if (txFormData.type === 'DEBIT') {
          try {
            recordAutomaticTreasuryVoucher({
              type: 'SUPPLIER_PAYMENT',
              amount: numAmount,
              currency: txFormData.currency || 'YER',
              paymentMethod: 'CASH',
              paymentDate: txFormData.date || new Date().toISOString().split('T')[0],
              partyId: txTarget.party.id,
              partyName: txTarget.party.name || txTarget.party._name,
              partyPhone: txTarget.party.phone || txTarget.party._phone,
              referenceNo: txFormData.referenceNo?.trim(),
              referenceType: 'DEBT_PAYMENT',
              notes: txFormData.description?.trim() || `سند صرف / سداد دفعة للمورد (${txTarget.party.name || txTarget.party._name})`,
            });
          } catch (pmtErr) {
            console.warn('Voucher sync warn:', pmtErr);
          }
        }

        setSuccess('تم تسجيل حركة حساب المورد وتحديث رصيد الذمم الدائنة بنجاح');
      }

      setIsTxModalOpen(false);
      fetchAllData(searchQuery);

      if (detailAccount && detailAccount.party.id === txTarget.party.id) {
        handleOpenAccountDetail(detailAccount.party, detailAccount.type);
      }
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || 'فشل قيد وتسجيل الحركة المالية');
    } finally {
      setTxSubmitting(false);
    }
  };

  // Handler: WhatsApp Share Trigger
  const handleOpenWhatsAppModal = (party: any, type: 'CUSTOMER' | 'SUPPLIER') => {
    const curBal = Number(party.current_balance || party._currentBalance || 0);
    const opBal = Number(party.opening_balance || party._openingBalance || 0);
    const cur = party.currency || party._currency || 'YER';
    const cleanPhone = (party.phone || party._phone || '').replace(/[^0-9+]/g, '');
    const accountCode = `ACC-${String(party.id).slice(-6)}`;
    const todayStr = new Date().toISOString().slice(0, 10);
    const partyName = party.name || party._name || '';

    // If opening from inside an open statement detail that already loaded statementData
    const hasLoadedStatement = detailAccount && detailAccount.party.id === party.id && statementData;
    const totalDeb = hasLoadedStatement && statementData.totalDebit !== undefined ? Number(statementData.totalDebit) : 0;
    const totalCred = hasLoadedStatement && statementData.totalCredit !== undefined ? Number(statementData.totalCredit) : 0;

    const formattedMessage =
`📄 كشف حساب معتمد — نظام المحاسبي الذكي ERP
═════════════════════════════
👤 ${type === 'CUSTOMER' ? 'العميل' : 'المورد'}: ${partyName}
🔢 رقم الحساب: ${accountCode}
📅 تاريخ الكشف: ${todayStr}
═════════════════════════════
• الرصيد الافتتاحي: ${toEnglishDigits(formatNumber(opBal))} ${cur}
${totalDeb > 0 ? `• إجمالي المدين: ${toEnglishDigits(formatNumber(totalDeb))} ${cur}\n` : ''}${totalCred > 0 ? `• إجمالي الدائن / المسدد: ${toEnglishDigits(formatNumber(totalCred))} ${cur}\n` : ''}• الرصيد الختامي المستحق: ${toEnglishDigits(formatNumber(curBal))} ${cur} (${curBal > 0 ? (type === 'CUSTOMER' ? 'مدين مستحق عليكم' : 'دائن مستحق لكم') : (curBal < 0 ? 'رصيد دائن' : 'حساب مسدد بالكامل')})
═════════════════════════════
شاكرين ومقدرين حسن تعاملكم معنا.
المؤسسة: ${company?.name || 'مؤسستنا التجارية'}
هاتف الإدارة: ${company?.phone || 'الرقم المعتمد'}`;

    setWhatsAppModalData({
      party,
      type,
      phone: cleanPhone,
      message: formattedMessage,
      statementSummary: {
        openingBalance: opBal,
        totalDebit: totalDeb,
        totalCredit: totalCred,
        closingBalance: curBal,
        currency: cur,
        statementDate: todayStr,
      },
    });
    setCopiedWhatsApp(false);
  };

  // Handler: In-System WhatsApp Dispatch via Backend Engine
  const handleSendWhatsAppInSystem = async () => {
    if (!whatsAppModalData) return;
    if (!whatsAppModalData.phone.trim()) {
      setError('يرجى تحديد أو إدخال رقم هاتف المستلم بصيغة صحيحة');
      return;
    }

    setIsSendingWhatsApp(true);
    setError(null);
    try {
      const token = localStorage.getItem('erp_auth_token') || '';
      const companyId = company?.id || 'comp_001';

      const res = await fetch('/api/v1/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-company-id': companyId,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          recipientPhone: whatsAppModalData.phone,
          recipientName: whatsAppModalData.party.name || whatsAppModalData.party._name,
          customerId: whatsAppModalData.type === 'CUSTOMER' ? whatsAppModalData.party.id : undefined,
          supplierId: whatsAppModalData.type === 'SUPPLIER' ? whatsAppModalData.party.id : undefined,
          messageText: whatsAppModalData.message,
          messageType: 'ACCOUNT_STATEMENT',
          attachmentSummary: `كشف حساب بمبلغ ${toEnglishDigits(formatNumber(whatsAppModalData.statementSummary?.closingBalance || 0))} ${whatsAppModalData.statementSummary?.currency || ''}`,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess('✅ تم إرسال كشف الحساب وتسجيله في محادثات واتساب النظام بنجاح');
        setWhatsAppModalData(null);
        setTimeout(() => setSuccess(null), 5000);
      } else {
        throw new Error(data.error || 'تعذر إرسال كشف الحساب عبر الواتساب');
      }
    } catch (err: any) {
      setError(err?.message || 'فشل إرسال كشف الحساب عبر الواتساب');
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  // Selection Checkbox Helpers
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAccounts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAccounts.map((a) => a._uniqueKey)));
    }
  };

  const toggleSelectOne = (key: string) => {
    const next = new Set(selectedIds);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedIds(next);
  };

  // Export Configurations
  const getUnifiedExportConfig = (): TableExportConfig => ({
    filename: `accounts_customers_suppliers_${new Date().toISOString().split('T')[0]}`,
    title: 'دليل وأرصدة العملاء والموردين - منظومة الأعمال',
    subtitle: searchQuery ? `نتائج البحث: "${searchQuery}"` : `التقرير الشامل - ${filteredAccounts.length} سجل`,
    filterBadges: [
      { label: 'الفلتر النشط', value: activeMainTab },
      { label: 'تاريخ الاستخراج', value: new Date().toLocaleDateString('ar-YE') },
    ],
    summaryCards: [
      { label: 'إجمالي مستحقات العملاء', value: `${formatNumber(totalCustomerReceivables)} YER`, color: 'emerald' },
      { label: 'إجمالي مستحقات الموردين', value: `${formatNumber(totalSupplierPayables)} YER`, color: 'amber' },
      { label: 'عدد الحسابات', value: filteredAccounts.length, color: 'blue' },
    ],
    headers: ['رمز الحساب', 'الاسم', 'النوع', 'الهاتف', 'العملة', 'الرصيد الافتتاحي', 'الرصيد الحالي', 'التصنيف', 'العنوان'],
    rows: filteredAccounts.map((a) => [
      a._displayCode,
      a._name,
      a._accountType === 'CUSTOMER' ? 'عميل' : 'مورد',
      a._phone || '-',
      a._currency,
      a._openingBalance,
      a._currentBalance,
      a._segment,
      a._address || '-',
    ]),
    alignments: ['center', 'right', 'center', 'right', 'center', 'right', 'right', 'center', 'right'],
  });

  const getStatementExportConfig = (): TableExportConfig => {
    if (!detailAccount?.party || !statementData) {
      return { filename: 'statement', title: 'كشف الحساب', headers: [], rows: [] };
    }
    const { party, type } = detailAccount;
    const cur = party.currency || party._currency || 'YER';
    const period = statementData.period;
    const opBalance = period?.opening_balance !== undefined 
      ? period.opening_balance 
      : (statementData.openingBalance !== undefined ? statementData.openingBalance : (party.opening_balance || party._openingBalance || 0));
    const clBalance = period?.closing_balance !== undefined 
      ? period.closing_balance 
      : (statementData.closingBalance !== undefined ? statementData.closingBalance : (party.current_balance || party._currentBalance || 0));
    const totalDebit = period?.total_debit !== undefined ? period.total_debit : (statementData.totalDebit || 0);
    const totalCredit = period?.total_credit !== undefined ? period.total_credit : (statementData.totalCredit || 0);
    const actualTxCount = statementData.transactionCount !== undefined 
      ? statementData.transactionCount 
      : (period?.transaction_count !== undefined ? period.transaction_count : (statementData.transactions || []).length);

    const filterBadges = [
      { label: 'الحساب', value: party.name || party._name },
      { label: 'النوع', value: type === 'CUSTOMER' ? 'عميل (ذمم مدينة)' : 'مورد (ذمم دائنة)' },
      { label: 'تاريخ الاستخراج', value: formatDateOnly(new Date()) },
    ];
    if (stmtFromDate) filterBadges.push({ label: 'من تاريخ', value: formatDateOnly(stmtFromDate) });
    if (stmtToDate) filterBadges.push({ label: 'إلى تاريخ', value: formatDateOnly(stmtToDate) });

    // Build rows starting with dedicated Opening Balance baseline row (Row 0)
    // Structured 8 Columns matching the system layout:
    // 1. م (Sequence #)
    // 2. التاريخ (Date Only YYYY-MM-DD)
    // 3. نوع ورقم السند/الفاتورة (Reference / Voucher #)
    // 4. البيان والتفاصيل (Description)
    // 5. مدين (عليه) (Debit in English digits)
    // 6. دائن (له) (Credit in English digits)
    // 7. الرصيد التراكمي (Running Balance in English digits)
    // 8. العملة (Currency)
    const exportRows: (string | number | null | undefined)[][] = [
      [
        '0',
        stmtFromDate ? formatDateOnly(stmtFromDate) : 'رصيد بداية',
        'BASELINE',
        'الرصيد الافتتاحي (أساس البداية المحاسبية)',
        '—',
        '—',
        formatNumber(opBalance),
        cur,
      ],
      ...(statementData.transactions || []).map((tx: any, idx: number) => {
        let d = 0;
        let c = 0;
        if (tx.debit !== undefined) d = Number(tx.debit);
        else if (tx.debitAmount !== undefined) d = Number(tx.debitAmount);
        else if (tx.debit_amount !== undefined) d = Number(tx.debit_amount);
        else if (tx.type === 'DEBIT' || tx.type === 'INVOICE' || tx.type === 'SALES_INVOICE') d = Number(tx.amount || 0);

        if (tx.credit !== undefined) c = Number(tx.credit);
        else if (tx.creditAmount !== undefined) c = Number(tx.creditAmount);
        else if (tx.credit_amount !== undefined) c = Number(tx.credit_amount);
        else if (tx.type === 'CREDIT' || tx.type === 'PURCHASE_INVOICE' || tx.type === 'PAYMENT') c = Number(tx.amount || 0);

        const rBal = Number(
          tx.balance_after !== undefined
            ? tx.balance_after
            : (tx.running_balance !== undefined
              ? tx.running_balance
              : (tx.runningBalance !== undefined ? tx.runningBalance : 0))
        );

        const txCur = tx.currency || cur;
        const ref = tx.reference_no || tx.referenceNo || tx.reference || tx.id || '-';
        const cleanDate = formatDateOnly(tx.date || tx.created_at) || '-';
        const recBy = tx.received_by || tx.receivedBy;
        const fullDesc = tx.description 
          ? (recBy ? `${tx.description} (المستلم: ${recBy})` : tx.description)
          : (recBy ? `المستلم: ${recBy}` : (d > 0 ? 'قيد مدين / مبيعات' : 'سند صرف / قبض / دائن'));

        return [
          idx + 1,
          cleanDate,
          ref,
          fullDesc,
          d > 0 ? formatNumber(d) : '—',
          c > 0 ? formatNumber(c) : '—',
          formatNumber(rBal),
          txCur,
        ];
      }),
      // Footer Totals Row
      [
        '—',
        '—',
        'الإجمالي الكلي',
        'إجمالي الفترة والرصيد الختامي المستحق',
        formatNumber(totalDebit),
        formatNumber(totalCredit),
        formatNumber(clBalance),
        cur,
      ],
    ];

    return {
      filename: `statement_${(party.name || party._name).replace(/\s+/g, '_')}_${formatDateOnly(new Date())}`,
      title: `كشف حساب تفصيلي - ${type === 'CUSTOMER' ? 'عميل' : 'مورد'}: ${party.name || party._name}`,
      subtitle: `الطرف التجاري: ${party.name || party._name} | الهاتف: ${party.phone || party._phone || '-'} | العملة: ${cur} | الفترة: ${stmtFromDate ? formatDateOnly(stmtFromDate) : 'من البداية'} إلى ${stmtToDate ? formatDateOnly(stmtToDate) : 'الآن'}`,
      companyName: company?.name || 'مؤسسة الأعمال الذكية التجارية',
      filterBadges,
      summaryCards: [
        { label: 'الرصيد الافتتاحي', value: `${formatNumber(opBalance)} ${cur}` },
        { label: 'إجمالي مدين الفترة (+)', value: `${formatNumber(totalDebit)} ${cur}` },
        { label: 'إجمالي دائن / مسددات (-)', value: `${formatNumber(totalCredit)} ${cur}` },
        { label: 'الرصيد الختامي المستحق', value: `${formatNumber(clBalance)} ${cur}` },
        { label: 'عدد الحركات المسجلة', value: `${actualTxCount} حركة` },
      ],
      headers: [
        'م',
        'التاريخ',
        'نوع ورقم السند/الفاتورة',
        'البيان والتفاصيل والمستلم',
        'مدين (عليه)',
        'دائن (له)',
        'الرصيد التراكمي',
        'العملة',
      ],
      rows: exportRows,
      alignments: ['center', 'center', 'center', 'right', 'right', 'right', 'right', 'center'],
      footerNotes: `يعد هذا الكشف وثيقة محاسبية معتمدة مستخرجة من نظام ERP السحابي. الرصيد الافتتاحي يمثل خط الأساس ولا يعتبر حركة مسجلة خلال الفترة.`,
    };
  };

  // Dedicated Professional Statement Print Trigger (CR-20260926-UI-STATEMENT-PRINT-PROFESSIONAL-DESIGN-01)
  const handlePrintStatement = () => {
    if (!detailAccount?.party || !statementData) return;
    const { party, type } = detailAccount;
    const cur = party.currency || party._currency || 'YER';
    const period = statementData.period;
    const opBalance = period?.opening_balance !== undefined 
      ? period.opening_balance 
      : (statementData.openingBalance !== undefined ? statementData.openingBalance : (party.opening_balance || party._openingBalance || 0));
    const clBalance = period?.closing_balance !== undefined 
      ? period.closing_balance 
      : (statementData.closingBalance !== undefined ? statementData.closingBalance : (party.current_balance || party._currentBalance || 0));
    const totalDebit = period?.total_debit !== undefined ? period.total_debit : (statementData.totalDebit || 0);
    const totalCredit = period?.total_credit !== undefined ? period.total_credit : (statementData.totalCredit || 0);
    const actualTxCount = statementData.transactionCount !== undefined 
      ? statementData.transactionCount 
      : (period?.transaction_count !== undefined ? period.transaction_count : (statementData.transactions || []).length);

    printAccountStatement({
      companyName: company?.name || 'مؤسسة الأعمال الذكية التجارية',
      companyCode: company?.code || '',
      companyPhone: (company as any)?.phone || '',
      companyAddress: (company as any)?.address || '',
      companyTaxNo: (company as any)?.tax_number || '',
      companyCommercialRegister: (company as any)?.commercial_register || '',
      partyType: type,
      partyName: party.name || party._name,
      partyCode: `ACC-${party.id.slice(-6).toUpperCase()}`,
      partyPhone: party.phone || party._phone || '',
      partyAddress: party.address || party._address || '',
      currency: cur,
      periodFrom: stmtFromDate ? formatDateOnly(stmtFromDate) : undefined,
      periodTo: stmtToDate ? formatDateOnly(stmtToDate) : undefined,
      openingBalance: opBalance,
      totalDebit,
      totalCredit,
      closingBalance: clBalance,
      transactionCount: actualTxCount,
      transactions: (statementData.transactions || []).map((tx: any) => {
        let d = 0;
        let c = 0;
        if (tx.debit !== undefined) d = Number(tx.debit);
        else if (tx.debitAmount !== undefined) d = Number(tx.debitAmount);
        else if (tx.debit_amount !== undefined) d = Number(tx.debit_amount);
        else if (tx.type === 'DEBIT' || tx.type === 'INVOICE' || tx.type === 'SALES_INVOICE') d = Number(tx.amount || 0);

        if (tx.credit !== undefined) c = Number(tx.credit);
        else if (tx.creditAmount !== undefined) c = Number(tx.creditAmount);
        else if (tx.credit_amount !== undefined) c = Number(tx.credit_amount);
        else if (tx.type === 'CREDIT' || tx.type === 'PURCHASE_INVOICE' || tx.type === 'PAYMENT') c = Number(tx.amount || 0);

        const rBal = Number(
          tx.balance_after !== undefined
            ? tx.balance_after
            : (tx.running_balance !== undefined
              ? tx.running_balance
              : (tx.runningBalance !== undefined ? tx.runningBalance : 0))
        );

        return {
          id: tx.id,
          date: formatDateOnly(tx.date || tx.created_at),
          type: tx.type,
          referenceNo: tx.reference_no || tx.referenceNo || tx.reference || tx.id,
          reference: tx.reference_no || tx.referenceNo || tx.reference || tx.id,
          description: tx.description,
          receivedBy: tx.received_by || tx.receivedBy,
          received_by: tx.received_by || tx.receivedBy,
          debit: d,
          credit: c,
          debitAmount: d,
          creditAmount: c,
          amount: parseFloat(tx.amount || 0),
          runningBalance: rBal,
          currency: tx.currency || cur,
        };
      }),
      notes: 'يعد هذا الكشف وثيقة محاسبية رسمية معتمدة صادرة من نظام ERP السحابي.',
    });
  };

  // Direct Print Trigger
  const handleDirectPrint = () => {
    const config = getUnifiedExportConfig();
    printReport(config);
  };

  // Live balance simulation in transaction modal
  const simulatedParty = txTarget?.party;
  const currentPartyBalance = simulatedParty ? Number(simulatedParty.current_balance || simulatedParty._currentBalance || 0) : 0;
  const inputTxAmount = parseFloat(txFormData.amount) || 0;
  const simulatedNewBalance =
    txTarget?.type === 'CUSTOMER'
      ? txFormData.type === 'DEBIT'
        ? currentPartyBalance + inputTxAmount
        : currentPartyBalance - inputTxAmount
      : txFormData.type === 'CREDIT'
      ? currentPartyBalance + inputTxAmount
      : currentPartyBalance - inputTxAmount;

  return (
    <div className="space-y-5 text-right font-sans" dir="rtl">
      
      {/* ========================================================================= */}
      {/* 1. PAGE HEADER (M3 Unified Header)                                        */}
      {/* ========================================================================= */}
      <div className="m3-card-elevated relative overflow-hidden p-5 sm:p-6">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--md-primary)]" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Title & Subtitle */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] flex items-center justify-center border border-[var(--md-primary)]/25 shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--md-on-surface)] flex items-center gap-2 flex-wrap">
                  <span>العملاء والموردون</span>
                  <span className="m3-badge m3-badge-primary text-[10px]">
                    ERP Financial Suite
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-[var(--md-on-surface-variant)]">
                  إدارة الحسابات والعلاقات التجارية والأرصدة والمدفوعات
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              onClick={handleOpenCreateCustomer}
              className="m3-btn-primary px-3.5 py-2 text-xs font-bold cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ إضافة عميل</span>
            </button>

            <button
              onClick={handleOpenCreateSupplier}
              className="m3-btn-tonal px-3.5 py-2 text-xs font-bold cursor-pointer active:scale-95"
            >
              <Truck className="w-4 h-4 text-[var(--md-secondary)]" />
              <span>+ إضافة مورد</span>
            </button>

            <button
              onClick={() => handleOpenTransactionModal()}
              className="m3-btn-outlined px-3 py-2 text-xs font-semibold cursor-pointer"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-[var(--md-primary-text)]" />
              <span className="hidden sm:inline">حركة حساب</span>
            </button>

            <ExportActions getConfig={getUnifiedExportConfig} variant="dropdown" className="shrink-0" />

            <button
              onClick={handleDirectPrint}
              title="طباعة التقرير الشامل"
              className="m3-btn-outlined !min-h-[38px] !px-2.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsImportModalOpen(true)}
              title="استيراد البيانات"
              className="m3-btn-outlined !min-h-[38px] !px-2.5 cursor-pointer"
            >
              <Download className="w-4 h-4 rotate-180" />
            </button>

            <button
              onClick={() => fetchAllData(searchQuery)}
              title="تحديث البيانات فوراً"
              className="m3-btn-outlined !min-h-[38px] !px-2.5 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[var(--md-primary-text)]' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. FINANCIAL KPI CARDS (Western Numbers + Real Verified ERP Stats)        */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Total Customers */}
        <div className="m3-card p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--md-on-surface-variant)] text-[11px] font-medium mb-1">
            <span>إجمالي العملاء</span>
            <Users className="w-3.5 h-3.5 text-[var(--md-primary-text)]" />
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg sm:text-xl font-bold font-mono tabular-nums text-[var(--md-on-surface)]">
              {formatNumber(totalCustomerCount)}
            </span>
            <span className="m3-badge m3-badge-primary text-[10px]">
              حساب
            </span>
          </div>
        </div>

        {/* Card 2: Active Customers */}
        <div className="m3-card p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--md-on-surface-variant)] text-[11px] font-medium mb-1">
            <span>العملاء النشطون</span>
            <UserCheck className="w-3.5 h-3.5 text-[var(--md-success)]" />
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg sm:text-xl font-bold font-mono tabular-nums text-[var(--md-success)]">
              {formatNumber(activeCustomerCount)}
            </span>
            <span className="text-[10px] text-[var(--md-on-surface-variant)] font-mono tabular-nums">
              {totalCustomerCount > 0 ? `${Math.round((activeCustomerCount / totalCustomerCount) * 100)}%` : '0%'}
            </span>
          </div>
        </div>

        {/* Card 3: Total Customer Receivables (المبالغ المستحقة من العملاء) */}
        <div className="m3-card p-3.5 border-[var(--md-success)]/35 bg-[var(--md-success-container)]/35 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between text-[var(--md-success)] text-[11px] font-semibold mb-1">
            <span>مستحقات العملاء (مدين)</span>
            <TrendingUp className="w-3.5 h-3.5 text-[var(--md-success)]" />
          </div>
          <div className="mt-1">
            <div className="text-base sm:text-lg font-black font-mono tabular-nums text-[var(--md-success)]">
              {formatNumber(totalCustomerReceivables)}
            </div>
            <div className="text-[10px] font-bold text-[var(--md-on-surface-variant)] font-mono">
              YER (ريال يمني)
            </div>
          </div>
        </div>

        {/* Card 4: Total Suppliers */}
        <div className="m3-card p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--md-on-surface-variant)] text-[11px] font-medium mb-1">
            <span>إجمالي الموردين</span>
            <Truck className="w-3.5 h-3.5 text-[var(--md-secondary)]" />
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg sm:text-xl font-bold font-mono tabular-nums text-[var(--md-on-surface)]">
              {formatNumber(totalSupplierCount)}
            </span>
            <span className="m3-badge m3-badge-secondary text-[10px]">
              شركة
            </span>
          </div>
        </div>

        {/* Card 5: Active Suppliers */}
        <div className="m3-card p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--md-on-surface-variant)] text-[11px] font-medium mb-1">
            <span>الموردون النشطون</span>
            <Building2 className="w-3.5 h-3.5 text-[var(--md-warning)]" />
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg sm:text-xl font-bold font-mono tabular-nums text-[var(--md-warning)]">
              {formatNumber(activeSupplierCount)}
            </span>
            <span className="text-[10px] text-[var(--md-on-surface-variant)] font-mono tabular-nums">
              {totalSupplierCount > 0 ? `${Math.round((activeSupplierCount / totalSupplierCount) * 100)}%` : '0%'}
            </span>
          </div>
        </div>

        {/* Card 6: Total Supplier Payables (المبالغ المستحقة للموردين) */}
        <div className="m3-card p-3.5 border-[var(--md-warning)]/35 bg-[var(--md-warning-container)]/35 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--md-warning)] text-[11px] font-semibold mb-1">
            <span>مستحقات الموردين (دائن)</span>
            <TrendingDown className="w-3.5 h-3.5 text-[var(--md-warning)]" />
          </div>
          <div className="mt-1">
            <div className="text-base sm:text-lg font-black font-mono tabular-nums text-[var(--md-warning)]">
              {formatNumber(totalSupplierPayables)}
            </div>
            <div className="text-[10px] font-bold text-[var(--md-on-surface-variant)] font-mono">
              YER (التزامات)
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2.1 MULTI-CURRENCY BALANCE & EXCHANGE RATE CONVERSION SUMMARY BANNER       */}
      {/* ========================================================================= */}
      <div className="m3-card p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 mb-3 border-b border-[var(--md-outline-variant)] gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border border-[var(--md-primary)]/25">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-[var(--md-on-surface)] flex items-center gap-2 flex-wrap">
                <span>ملخص الأرصدة بحسب العملات ومعادل الصرف المحاسبي</span>
                <span className="m3-badge m3-badge-secondary text-[10px] font-mono">
                  Base: YER
                </span>
              </h3>
              <p className="text-[11px] text-[var(--md-on-surface-variant)] font-mono tabular-nums">
                أسعار الصرف اللحظية: 1 SAR = {currencyBreakdown.sarRate} YER | 1 USD = {currencyBreakdown.usdRate} YER
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-[var(--md-on-surface-variant)]">تصفية سريعة:</span>
            {(['ALL', 'YER', 'SAR', 'USD'] as const).map((curr) => (
              <button
                key={curr}
                onClick={() => setCurrencyFilter(curr)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer border ${
                  currencyFilter === curr
                    ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)] border-[var(--md-primary)]'
                    : 'bg-[var(--md-surface-container-low)] text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] border-[var(--md-outline-variant)]'
                }`}
              >
                {curr === 'ALL' ? 'الكل' : curr}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* YER Card */}
          <div
            onClick={() => setCurrencyFilter(currencyFilter === 'YER' ? 'ALL' : 'YER')}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              currencyFilter === 'YER'
                ? 'bg-[var(--md-primary-container)]/40 border-[var(--md-primary)] ring-1 ring-[var(--md-primary)]/40'
                : 'bg-[var(--md-surface-container-low)] border-[var(--md-outline-variant)] hover:border-[var(--md-primary)]/50'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-[var(--md-primary-text)]">الريال اليمني (YER)</span>
              <span className="m3-badge m3-badge-primary text-[9px] font-mono">
                الأساس
              </span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-[var(--md-on-surface-variant)]">مستحق لنا (عملاء):</span>
                <span className="font-mono tabular-nums font-bold text-[var(--md-success)]">{formatNumber(currencyBreakdown.yerReceivables)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-[var(--md-on-surface-variant)]">مستحق علينا (موردون):</span>
                <span className="font-mono tabular-nums font-bold text-[var(--md-warning)]">{formatNumber(currencyBreakdown.yerPayables)}</span>
              </div>
              <div className="pt-1 mt-1 border-t border-[var(--md-outline-variant)] flex justify-between items-center text-[11px]">
                <span className="text-[var(--md-on-surface-variant)]">الصافي:</span>
                <span className={`font-mono tabular-nums font-bold ${currencyBreakdown.yerReceivables >= currencyBreakdown.yerPayables ? 'text-[var(--md-success)]' : 'text-[var(--md-error)]'}`}>
                  {formatNumber(currencyBreakdown.yerReceivables - currencyBreakdown.yerPayables)} YER
                </span>
              </div>
            </div>
          </div>

          {/* SAR Card */}
          <div
            onClick={() => setCurrencyFilter(currencyFilter === 'SAR' ? 'ALL' : 'SAR')}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              currencyFilter === 'SAR'
                ? 'bg-[var(--md-secondary-container)]/50 border-[var(--md-secondary)] ring-1 ring-[var(--md-secondary)]/40'
                : 'bg-[var(--md-surface-container-low)] border-[var(--md-outline-variant)] hover:border-[var(--md-secondary)]/50'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-[var(--md-secondary)]">الريال السعودي (SAR)</span>
              <span className="m3-badge m3-badge-secondary text-[9px] font-mono tabular-nums">
                1 SAR = {currencyBreakdown.sarRate} YER
              </span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-[var(--md-on-surface-variant)]">مستحق لنا (عملاء):</span>
                <span className="font-mono tabular-nums font-bold text-[var(--md-success)]">{formatNumber(currencyBreakdown.sarReceivables)} SAR</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-[var(--md-on-surface-variant)]">مستحق علينا (موردون):</span>
                <span className="font-mono tabular-nums font-bold text-[var(--md-warning)]">{formatNumber(currencyBreakdown.sarPayables)} SAR</span>
              </div>
              <div className="pt-1 mt-1 border-t border-[var(--md-outline-variant)] flex justify-between items-center text-[10px]">
                <span className="text-[var(--md-on-surface-variant)]">المعادل بالريال اليمني:</span>
                <span className="font-mono tabular-nums font-bold text-[var(--md-secondary)]">
                  ≈ {formatNumber((currencyBreakdown.sarReceivables - currencyBreakdown.sarPayables) * currencyBreakdown.sarRate)} YER
                </span>
              </div>
            </div>
          </div>

          {/* USD Card */}
          <div
            onClick={() => setCurrencyFilter(currencyFilter === 'USD' ? 'ALL' : 'USD')}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              currencyFilter === 'USD'
                ? 'bg-[var(--md-info-container)]/50 border-[var(--md-info)] ring-1 ring-[var(--md-info)]/40'
                : 'bg-[var(--md-surface-container-low)] border-[var(--md-outline-variant)] hover:border-[var(--md-info)]/50'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-[var(--md-info)]">الدولار الأمريكي (USD)</span>
              <span className="m3-badge m3-badge-info text-[9px] font-mono tabular-nums">
                1 USD = {currencyBreakdown.usdRate} YER
              </span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-[var(--md-on-surface-variant)]">مستحق لنا (عملاء):</span>
                <span className="font-mono tabular-nums font-bold text-[var(--md-success)]">{formatNumber(currencyBreakdown.usdReceivables)} USD</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-[var(--md-on-surface-variant)]">مستحق علينا (موردون):</span>
                <span className="font-mono tabular-nums font-bold text-[var(--md-warning)]">{formatNumber(currencyBreakdown.usdPayables)} USD</span>
              </div>
              <div className="pt-1 mt-1 border-t border-[var(--md-outline-variant)] flex justify-between items-center text-[10px]">
                <span className="text-[var(--md-on-surface-variant)]">المعادل بالريال اليمني:</span>
                <span className="font-mono tabular-nums font-bold text-[var(--md-info)]">
                  ≈ {formatNumber((currencyBreakdown.usdReceivables - currencyBreakdown.usdPayables) * currencyBreakdown.usdRate)} YER
                </span>
              </div>
            </div>
          </div>

          {/* Consolidated Net Base Valuation Card */}
          <div className="p-3 rounded-xl bg-[var(--md-primary-container)]/35 border border-[var(--md-primary)]/35 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-black text-[var(--md-primary-text)]">إجمالي المعادل الشامل</span>
              <span className="m3-badge m3-badge-primary text-[9px]">
                محاسبي موحّد
              </span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-[var(--md-on-surface-variant)]">إجمالي حقوقنا المحولة:</span>
                <span className="font-mono tabular-nums font-bold text-[var(--md-success)]">
                  {formatNumber(currencyBreakdown.totalReceivablesInBase)} YER
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-[var(--md-on-surface-variant)]">إجمالي التزاماتنا المحولة:</span>
                <span className="font-mono tabular-nums font-bold text-[var(--md-warning)]">
                  {formatNumber(currencyBreakdown.totalPayablesInBase)} YER
                </span>
              </div>
              <div className="pt-1.5 mt-1 border-t border-[var(--md-primary)]/25 flex justify-between items-center">
                <span className="text-[11px] font-bold text-[var(--md-on-surface)]">صافي المركز المالي:</span>
                <span
                  className={`font-mono tabular-nums font-black text-xs ${
                    currencyBreakdown.netBaseEquivalent >= 0 ? 'text-[var(--md-success)]' : 'text-[var(--md-error)]'
                  }`}
                >
                  {formatNumber(currencyBreakdown.netBaseEquivalent)} YER
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications / Feedback */}
      {error && (
        <div className="p-3.5 bg-[var(--md-error-container)] border border-[var(--md-error)]/35 text-[var(--md-on-error-container)] text-xs rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="opacity-75 hover:opacity-100 p-1 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="p-3.5 bg-[var(--md-success-container)] border border-[var(--md-success)]/35 text-[var(--md-on-success-container)] text-xs rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="opacity-75 hover:opacity-100 p-1 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MAIN NAVIGATION TABS (الكل، العملاء، الموردون، حسابات مدينة، ...)         */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between border-b border-[var(--md-outline-variant)] pb-2 overflow-x-auto gap-2">
        <div className="flex items-center gap-1.5 shrink-0">
          {[
            { id: 'ALL', label: 'الكل', count: unifiedAccounts.length },
            { id: 'CUSTOMERS', label: 'العملاء', count: customers.length },
            { id: 'SUPPLIERS', label: 'الموردون', count: suppliers.length },
            { id: 'DEBIT', label: 'حسابات مدينة', count: unifiedAccounts.filter((a) => a._currentBalance > 0).length },
            { id: 'CREDIT', label: 'حسابات دائنة', count: unifiedAccounts.filter((a) => a._currentBalance < 0).length },
            { id: 'OVERDUE', label: 'المتأخرات', count: unifiedAccounts.filter((a) => a._currentBalance !== 0).length },
            { id: 'ACTIVE', label: 'الأكثر نشاطًا', count: unifiedAccounts.filter((a) => a._currentBalance !== 0).length },
          ].map((tab) => {
            const isActive = activeMainTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveMainTab(tab.id as MainTabFilter)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)] border-[var(--md-primary)]'
                    : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-high)] border-transparent'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono tabular-nums font-bold ${
                    isActive
                      ? 'bg-[var(--md-on-primary)]/20 text-[var(--md-on-primary)]'
                      : 'bg-[var(--md-surface-container-high)] text-[var(--md-primary-text)]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* View Mode Toggle (جدول / بطاقات) */}
        <div className="flex items-center gap-1 bg-[var(--md-surface-container)] p-1 rounded-xl border border-[var(--md-outline-variant)] shrink-0">
          <button
            onClick={() => setViewMode('TABLE')}
            title="عرض كجدول ERP متكامل"
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'TABLE'
                ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)]'
                : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">جدول</span>
          </button>
          <button
            onClick={() => setViewMode('CARDS')}
            title="عرض كبطاقات تفاعلية"
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'CARDS'
                ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)]'
                : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">بطاقات</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. ADVANCED FILTER & SEARCH TOOLBAR                                      */}
      {/* ========================================================================= */}
      <div className="m3-card p-3.5 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        {/* Search Input */}
        <div className="relative flex-1 w-full max-w-md">
          <Search className="w-4 h-4 text-[var(--md-on-surface-variant)] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="البحث بالاسم، رقم الهاتف، المعرف، أو المدينة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="m3-input !h-10 w-full !pl-8 !pr-9 text-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-between md:justify-end">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="m3-select !h-10 !w-auto text-xs"
          >
            <option value="ALL">الحالة: الكل</option>
            <option value="DEBIT">مدين (له رصيد مستحق)</option>
            <option value="CREDIT">دائن (مستحق عليه)</option>
            <option value="SETTLED">مسدد (رصيد صفر)</option>
            <option value="OVERDUE">متأخرات</option>
          </select>

          {/* Currency Filter */}
          <select
            value={currencyFilter}
            onChange={(e) => setCurrencyFilter(e.target.value as any)}
            className="m3-select !h-10 !w-auto text-xs"
          >
            <option value="ALL">العملة: الكل</option>
            <option value="YER">YER (ريال يمني)</option>
            <option value="SAR">SAR (ريال سعودي)</option>
            <option value="USD">USD (دولار أمريكي)</option>
          </select>

          {/* Sorting */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="m3-select !h-10 !w-auto text-xs font-medium"
          >
            <option value="BALANCE_DESC">الترتيب: أعلى رصيد</option>
            <option value="BALANCE_ASC">الترتيب: الأقل رصيداً</option>
            <option value="LATEST">الترتيب: أحدث حركة</option>
            <option value="NAME">الترتيب: أبجدياً (الاسم)</option>
          </select>

          <div className="text-[11px] text-[var(--md-on-surface-variant)] font-mono tabular-nums">
            النتائج: <span className="font-bold text-[var(--md-primary-text)]">{filteredAccounts.length}</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. MAIN ACCOUNTS PRESENTATION (Table View / Card View)                    */}
      {/* ========================================================================= */}
      {loading ? (
        <div className="m3-card p-12 text-center flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--md-primary-text)]" />
          <span className="text-sm font-semibold text-[var(--md-on-surface-variant)]">جاري تحميل سجلات وحسابات المنظومة...</span>
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="m3-card p-12 text-center text-[var(--md-on-surface-variant)] space-y-3">
          <Users className="w-10 h-10 mx-auto text-[var(--md-primary-text)] opacity-50" />
          <div className="text-sm font-bold text-[var(--md-on-surface)]">لا توجد حسابات مطابقة للبحث أو الفلتر المختار</div>
          <p className="text-xs text-[var(--md-on-surface-variant)] max-w-sm mx-auto">
            يمكنك إضافة عميل أو مورد جديد أو إعادة ضبط خيارات البحث.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={handleOpenCreateCustomer}
              className="m3-btn-primary px-4 py-2 text-xs font-bold cursor-pointer"
            >
              + إضافة عميل
            </button>
            <button
              onClick={handleOpenCreateSupplier}
              className="m3-btn-tonal px-4 py-2 text-xs font-bold cursor-pointer"
            >
              + إضافة مورد
            </button>
          </div>
        </div>
      ) : viewMode === 'TABLE' ? (
        /* TABLE VIEW (Dense Professional ERP Layout) */
        <div className="m3-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="m3-table w-full text-right text-xs">
              <thead className="m3-thead">
                <tr>
                  <th className="m3-th p-3.5 text-center w-10">
                    <button
                      onClick={toggleSelectAll}
                      className="text-[var(--md-on-surface-variant)] hover:text-[var(--md-primary-text)] cursor-pointer"
                    >
                      {selectedIds.size === filteredAccounts.length && filteredAccounts.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-[var(--md-primary-text)]" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="m3-th p-3.5">الاسم والحساب</th>
                  <th className="m3-th p-3.5 text-center">النوع</th>
                  <th className="m3-th p-3.5 text-center">رقم الحساب</th>
                  <th className="m3-th p-3.5">الهاتف</th>
                  <th className="m3-th p-3.5 text-center">العملة</th>
                  <th className="m3-th p-3.5">الرصيد الحالي</th>
                  <th className="m3-th p-3.5 text-center">حالة الحساب</th>
                  <th className="m3-th p-3.5 text-center">آخر حركة</th>
                  <th className="m3-th p-3.5 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--md-outline-variant)]">
                {filteredAccounts.map((account) => {
                  const isSelected = selectedIds.has(account._uniqueKey);
                  const isCustomer = account._accountType === 'CUSTOMER';
                  const bal = account._currentBalance;

                  return (
                    <tr
                      key={account._uniqueKey}
                      className={`hover:bg-[var(--md-surface-container-low)] transition-colors ${
                        isSelected ? 'bg-[var(--md-primary-container)]/30' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-3 text-center">
                        <button
                          onClick={() => toggleSelectOne(account._uniqueKey)}
                          className="text-[var(--md-on-surface-variant)] hover:text-[var(--md-primary-text)] cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[var(--md-primary-text)]" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Name & Avatar */}
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 border ${
                              isCustomer
                                ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border-[var(--md-primary)]/25'
                                : 'bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)] border-[var(--md-secondary)]/30'
                            }`}
                          >
                            {account._name.slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-bold text-[var(--md-on-surface)] flex items-center gap-1.5 flex-wrap">
                              <span>{account._name}</span>
                              <span className="m3-badge text-[9px] font-normal">
                                {account._segment}
                              </span>
                            </div>
                            {account._email && (
                              <div className="text-[10px] text-[var(--md-on-surface-variant)]">{account._email}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="p-3 text-center">
                        <span
                          className={`m3-badge text-[10px] ${
                            isCustomer ? 'm3-badge-primary' : 'm3-badge-secondary'
                          }`}
                        >
                          {isCustomer ? <Users className="w-3 h-3" /> : <Truck className="w-3 h-3" />}
                          <span>{isCustomer ? 'عميل' : 'مورد'}</span>
                        </span>
                      </td>

                      {/* Account Number */}
                      <td className="p-3 text-center font-mono text-[var(--md-on-surface-variant)] text-[11px]">
                        {account._displayCode}
                      </td>

                      {/* Phone */}
                      <td className="p-3 dir-ltr text-right font-mono text-[var(--md-on-surface)] text-xs">
                        {account._phone ? (
                          <a
                            href={`tel:${account._phone}`}
                            className="hover:text-[var(--md-primary-text)] transition-colors"
                          >
                            {account._phone}
                          </a>
                        ) : (
                          <span className="text-[var(--md-on-surface-variant)]">-</span>
                        )}
                      </td>

                      {/* Currency */}
                      <td className="p-3 text-center">
                        <span className="m3-badge font-mono font-semibold text-[10px]">
                          {account._currency}
                        </span>
                      </td>

                      {/* Current Balance (Hero Financial Field) */}
                      <td className="p-3 font-mono tabular-nums font-bold text-xs">
                        <div
                          className={`inline-flex items-baseline gap-1 px-2.5 py-1 rounded-lg border ${
                            bal > 0
                              ? isCustomer
                                ? 'bg-[var(--md-success-container)] text-[var(--md-on-success-container)] border-[var(--md-success)]/30'
                                : 'bg-[var(--md-warning-container)] text-[var(--md-on-warning-container)] border-[var(--md-warning)]/30'
                              : bal < 0
                              ? 'bg-[var(--md-info-container)] text-[var(--md-on-info-container)] border-[var(--md-info)]/30'
                              : 'bg-[var(--md-surface-container-high)] text-[var(--md-on-surface-variant)] border-[var(--md-outline-variant)]'
                          }`}
                        >
                          <span className="text-sm font-black tracking-tight">{formatNumber(Math.abs(bal))}</span>
                          <span className="text-[10px] font-normal opacity-80">{account._currency}</span>
                          <span className="text-[9px] font-bold opacity-80 mr-1">
                            {bal > 0 ? (isCustomer ? '(مدين)' : '(دائن)') : bal < 0 ? '(-)' : '(خالص)'}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-3 text-center">
                        <span
                          className={`m3-badge text-[10px] ${
                            bal > 0
                              ? isCustomer
                                ? 'm3-badge-success'
                                : 'm3-badge-warning'
                              : bal < 0
                              ? 'm3-badge-info'
                              : ''
                          }`}
                        >
                          {bal > 0 ? (isCustomer ? 'مدين' : 'دائن') : bal < 0 ? 'تسوية' : 'مسدد'}
                        </span>
                      </td>

                      {/* Last Activity Date */}
                      <td className="p-3 text-center text-[var(--md-on-surface-variant)] font-mono tabular-nums text-[10px]">
                        {new Date(account._createdAt).toLocaleDateString('ar-YE')}
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenAccountDetail(account, account._accountType)}
                            title="فتح كشف الحساب والملف المالي"
                            className="m3-btn-tonal !min-h-[30px] !px-2 rounded-lg cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleOpenTransactionModal(account, account._accountType)}
                            title="إضافة حركة مالية مباشرة"
                            className="m3-btn-outlined !min-h-[30px] !px-2 rounded-lg text-[var(--md-primary-text)] cursor-pointer"
                          >
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleOpenWhatsAppModal(account, account._accountType)}
                            title="مشاركة كشف الحساب عبر WhatsApp"
                            className="m3-btn-outlined !min-h-[30px] !px-2 rounded-lg text-[var(--md-success)] cursor-pointer"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() =>
                              isCustomer
                                ? handleOpenEditCustomer(account)
                                : handleOpenEditSupplier(account)
                            }
                            title="تعديل بيانات الحساب"
                            className="m3-btn-outlined !min-h-[30px] !px-2 rounded-lg cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {isCustomer && (
                            <button
                              onClick={() => handleOpenMergeModal(account)}
                              title="دمج حساب العميل مع عميل آخر (Merge Customer)"
                              className="m3-btn-outlined !min-h-[30px] !px-2 rounded-lg text-[var(--md-warning)] cursor-pointer"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() =>
                              isCustomer
                                ? handleDeleteCustomer(account)
                                : handleDeleteSupplier(account)
                            }
                            title="حذف الحساب"
                            className="m3-btn-danger !min-h-[30px] !px-2 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* CARDS VIEW (Mobile-First Responsive Layout) */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAccounts.map((account) => {
            const isCustomer = account._accountType === 'CUSTOMER';
            const bal = account._currentBalance;

            return (
              <div
                key={account._uniqueKey}
                className="m3-card p-4 hover:border-[var(--md-primary)]/40 transition-all flex flex-col justify-between space-y-3"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border ${
                        isCustomer
                          ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border-[var(--md-primary)]/30'
                          : 'bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)] border-[var(--md-secondary)]/30'
                      }`}
                    >
                      {account._name.slice(0, 2)}
                    </div>
                    <div>
                      <div className="font-bold text-[var(--md-on-surface)] text-sm">{account._name}</div>
                      <div className="text-[10px] text-[var(--md-on-surface-variant)] flex items-center gap-1.5">
                        <span className="font-mono">{account._displayCode}</span>
                        <span>•</span>
                        <span className="text-[var(--md-primary-text)] font-semibold">{account._segment}</span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`m3-badge text-[10px] ${
                      isCustomer ? 'm3-badge-primary' : 'm3-badge-secondary'
                    }`}
                  >
                    {isCustomer ? 'عميل' : 'مورد'}
                  </span>
                </div>

                {/* Balance Highlight Box */}
                <div className="p-3 bg-[var(--md-surface-container-low)] rounded-xl border border-[var(--md-outline-variant)] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-[var(--md-on-surface-variant)] block">الرصيد المالي الحالي:</span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className={`text-lg font-black font-mono tabular-nums ${bal > 0 ? (isCustomer ? 'text-[var(--md-success)]' : 'text-[var(--md-warning)]') : 'text-[var(--md-on-surface)]'}`}>
                        {formatNumber(Math.abs(bal))}
                      </span>
                      <span className="text-[10px] text-[var(--md-on-surface-variant)] font-mono">{account._currency}</span>
                    </div>
                  </div>
                  <span
                    className={`m3-badge text-[10px] ${
                      bal > 0
                        ? isCustomer
                          ? 'm3-badge-success'
                          : 'm3-badge-warning'
                        : ''
                    }`}
                  >
                    {bal > 0 ? (isCustomer ? 'مدين مستحق' : 'دائن مستحق') : bal < 0 ? 'دائن' : 'خالص'}
                  </span>
                </div>

                {/* Details Meta */}
                <div className="grid grid-cols-2 gap-2 text-[11px] text-[var(--md-on-surface-variant)] pt-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <Phone className="w-3.5 h-3.5 opacity-70 shrink-0" />
                    <span className="font-mono dir-ltr">{account._phone || 'بدون هاتف'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 opacity-70 shrink-0" />
                    <span className="truncate">{account._address || 'المركز الرئيسي'}</span>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="pt-2 border-t border-[var(--md-outline-variant)] flex items-center justify-between gap-1.5">
                  <button
                    onClick={() => handleOpenAccountDetail(account, account._accountType)}
                    className="m3-btn-tonal flex-1 !min-h-[34px] py-1.5 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>كشف الحساب</span>
                  </button>

                  <button
                    onClick={() => handleOpenTransactionModal(account, account._accountType)}
                    className="m3-btn-outlined !min-h-[34px] !px-2 text-[var(--md-primary-text)] cursor-pointer"
                    title="حركة حساب"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleOpenWhatsAppModal(account, account._accountType)}
                    className="m3-btn-outlined !min-h-[34px] !px-2 text-[var(--md-success)] cursor-pointer"
                    title="مشاركة WhatsApp"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                  </button>

                  {isCustomer && (
                    <button
                      onClick={() => handleOpenMergeModal(account)}
                      className="m3-btn-outlined !min-h-[34px] !px-2 text-[var(--md-warning)] cursor-pointer"
                      title="دمج الحساب"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() =>
                      isCustomer ? handleOpenEditCustomer(account) : handleOpenEditSupplier(account)
                    }
                    className="m3-btn-outlined !min-h-[34px] !px-2 cursor-pointer"
                    title="تعديل"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. DETAIL & STATEMENT MODAL / DRAWER (ERP Financial Account Center)       */}
      {/* ========================================================================= */}
      {detailAccount && (
        <div className="m3-backdrop fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="m3-modal-surface w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-right">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-[var(--md-surface-container-low)] border-b border-[var(--md-outline-variant)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border ${
                    detailAccount.type === 'CUSTOMER'
                      ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border-[var(--md-primary)]/30'
                      : 'bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)] border-[var(--md-secondary)]/30'
                  }`}
                >
                  {detailAccount.party.name ? detailAccount.party.name.slice(0, 2) : 'AC'}
                </div>
                <div>
                  <h3 className="font-bold text-[var(--md-on-surface)] text-base flex items-center gap-2 flex-wrap">
                    <span>{detailAccount.party.name || detailAccount.party._name}</span>
                    <span className={`m3-badge text-[10px] ${detailAccount.type === 'CUSTOMER' ? 'm3-badge-primary' : 'm3-badge-secondary'}`}>
                      {detailAccount.type === 'CUSTOMER' ? 'حساب عميل' : 'حساب مورد'}
                    </span>
                  </h3>
                  <p className="text-xs text-[var(--md-on-surface-variant)]">
                    رقم الحساب: <span className="font-mono text-[var(--md-primary-text)] font-semibold">ACC-{detailAccount.party.id.slice(-6)}</span> • الهاتف: <span className="font-mono">{detailAccount.party.phone || '-'}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailAccount(null)}
                className="m3-btn-outlined !min-h-[36px] !px-2 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Financial Summary Cards inside Modal */}
            {(() => {
              const cur = detailAccount.party.currency || detailAccount.party._currency || 'YER';
              const period = statementData?.period;
              const opBalance = period?.opening_balance !== undefined
                ? period.opening_balance
                : (statementData?.openingBalance !== undefined
                  ? statementData.openingBalance
                  : (detailAccount.party.opening_balance || detailAccount.party._openingBalance || 0));
              const clBalance = period?.closing_balance !== undefined
                ? period.closing_balance
                : (statementData?.closingBalance !== undefined
                  ? statementData.closingBalance
                  : (detailAccount.party.current_balance || detailAccount.party._currentBalance || 0));
              const totalDebit = period?.total_debit !== undefined ? period.total_debit : (statementData?.totalDebit || 0);
              const totalCredit = period?.total_credit !== undefined ? period.total_credit : (statementData?.totalCredit || 0);
              const actualTxCount = statementData?.transactionCount !== undefined
                ? statementData.transactionCount
                : (period?.transaction_count !== undefined
                  ? period.transaction_count
                  : (statementData?.transactions || []).length);

              return (
                <div className="p-4 bg-[var(--md-surface-container)] border-b border-[var(--md-outline-variant)] grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                  <div className="m3-card p-3 border-[var(--md-info)]/30">
                    <span className="text-[var(--md-info)] block text-[10px] font-bold">الرصيد الافتتاحي (الأساس):</span>
                    <span className="text-sm font-bold font-mono tabular-nums text-[var(--md-on-surface)]">
                      {formatNumber(opBalance)} {cur}
                    </span>
                  </div>

                  <div className="m3-card p-3 border-[var(--md-warning)]/30">
                    <span className="text-[var(--md-warning)] block text-[10px] font-bold">إجمالي مدين الفترة (+):</span>
                    <span className="text-sm font-bold font-mono tabular-nums text-[var(--md-warning)]">
                      {formatNumber(totalDebit)} {cur}
                    </span>
                  </div>

                  <div className="m3-card p-3 border-[var(--md-success)]/30">
                    <span className="text-[var(--md-success)] block text-[10px] font-bold">إجمالي دائن / مسددات (-):</span>
                    <span className="text-sm font-bold font-mono tabular-nums text-[var(--md-success)]">
                      {formatNumber(totalCredit)} {cur}
                    </span>
                  </div>

                  <div className="m3-card p-3 border-[var(--md-primary)]/40 bg-[var(--md-primary-container)]/35">
                    <span className="text-[var(--md-primary-text)] block text-[10px] font-bold">الرصيد الختامي النهائي:</span>
                    <span className="text-base font-black font-mono tabular-nums text-[var(--md-primary-text)]">
                      {formatNumber(clBalance)} {cur}
                    </span>
                    {cur !== 'YER' && (
                      <span className="block text-[10px] text-[var(--md-on-surface-variant)] font-mono tabular-nums mt-0.5">
                        ≈ {formatNumber(toBaseCurrencyAmount(clBalance, cur))} YER
                      </span>
                    )}
                  </div>

                  <div className="m3-card p-3 col-span-2 sm:col-span-1">
                    <span className="text-[var(--md-on-surface-variant)] block text-[10px] font-bold">عدد الحركات الفعلية:</span>
                    <span className="text-sm font-bold font-mono tabular-nums text-[var(--md-on-surface)]">
                      {actualTxCount} حركة
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Statement Filter & Action Bar */}
            <div className="p-3 bg-[var(--md-surface-container-low)] border-b border-[var(--md-outline-variant)] flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleOpenTransactionModal(detailAccount.party, detailAccount.type)}
                  className="m3-btn-primary !min-h-[34px] px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>+ إضافة حركة</span>
                </button>

                <button
                  onClick={() => handleOpenWhatsAppModal(detailAccount.party, detailAccount.type)}
                  className="m3-btn-tonal !min-h-[34px] px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>

                {/* Date Filter Inputs */}
                <div className="flex items-center gap-1.5 bg-[var(--md-surface-container-lowest)] px-2.5 py-1 rounded-xl border border-[var(--md-outline-variant)] text-xs">
                  <span className="text-[var(--md-on-surface-variant)] text-[11px]">من:</span>
                  <input
                    type="date"
                    value={stmtFromDate}
                    onChange={(e) => setStmtFromDate(e.target.value)}
                    className="bg-transparent text-[var(--md-on-surface)] text-xs font-mono focus:outline-none"
                  />
                  <span className="text-[var(--md-on-surface-variant)] text-[11px] mr-1">إلى:</span>
                  <input
                    type="date"
                    value={stmtToDate}
                    onChange={(e) => setStmtToDate(e.target.value)}
                    className="bg-transparent text-[var(--md-on-surface)] text-xs font-mono focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      setStmtPage(1);
                      fetchAccountStatement(detailAccount.party, detailAccount.type, stmtFromDate, stmtToDate, 1, stmtLimit);
                    }}
                    className="px-2.5 py-1 bg-[var(--md-primary)] hover:bg-[var(--md-primary-hover)] text-[var(--md-on-primary)] rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                  >
                    تطبيق
                  </button>
                  {(stmtFromDate || stmtToDate) && (
                    <button
                      onClick={() => {
                        setStmtFromDate('');
                        setStmtToDate('');
                        setStmtPage(1);
                        fetchAccountStatement(detailAccount.party, detailAccount.type, '', '', 1, stmtLimit);
                      }}
                      className="px-1.5 py-1 text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] text-[11px] cursor-pointer"
                      title="إلغاء الفلتر"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintStatement}
                  className="m3-btn-tonal !min-h-[34px] px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  title="طباعة كشف حساب معتمد (A4 / PDF)"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة كشف الحساب</span>
                </button>
                <ExportActions getConfig={getStatementExportConfig} variant="dropdown" customPrint={handlePrintStatement} />
              </div>
            </div>

            {/* Statement Table Body */}
            <div className="flex-1 overflow-y-auto p-4 bg-[var(--md-surface)]">
              {statementLoading ? (
                <div className="p-12 text-center text-[var(--md-on-surface-variant)] flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--md-primary-text)]" />
                  <span>جاري تحميل كشف الحساب المعتمد...</span>
                </div>
              ) : !statementData ? (
                <div className="p-10 text-center text-[var(--md-on-surface-variant)]">
                  لا توجد بيانات متاحة لهذا الحساب.
                </div>
              ) : (
                (() => {
                  const cur = detailAccount.party.currency || detailAccount.party._currency || 'YER';
                  const period = statementData.period;
                  const opBalance = period?.opening_balance !== undefined
                    ? period.opening_balance
                    : (statementData.openingBalance !== undefined
                      ? statementData.openingBalance
                      : (detailAccount.party.opening_balance || detailAccount.party._openingBalance || 0));
                  const clBalance = period?.closing_balance !== undefined
                    ? period.closing_balance
                    : (statementData.closingBalance !== undefined
                      ? statementData.closingBalance
                      : (detailAccount.party.current_balance || detailAccount.party._currentBalance || 0));
                  const totalDebit = period?.total_debit !== undefined ? period.total_debit : (statementData.totalDebit || 0);
                  const totalCredit = period?.total_credit !== undefined ? period.total_credit : (statementData.totalCredit || 0);
                  const actualTxList = statementData.transactions || [];
                  const actualTxCount = statementData.transactionCount !== undefined 
                    ? statementData.transactionCount 
                    : actualTxList.length;

                  return (
                    <div className="m3-card overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="m3-table w-full text-right text-xs">
                          <thead className="m3-thead">
                            <tr>
                              <th className="m3-th p-2.5">التاريخ</th>
                              <th className="m3-th p-2.5">نوع الحركة</th>
                              <th className="m3-th p-2.5">مبلغ الحركة</th>
                              <th className="m3-th p-2.5">الرصيد التراكمي</th>
                              <th className="m3-th p-2.5">البيان / سبب القيد</th>
                              <th className="m3-th p-2.5 text-center">المستلم / الساحب</th>
                              <th className="m3-th p-2.5 text-center">المرجع</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--md-outline-variant)]">
                            {/* 1. DEDICATED OPENING BALANCE BASELINE ROW (ROW 0) */}
                            <tr className="bg-[var(--md-primary-container)]/35 border-b-2 border-[var(--md-primary)]/35">
                              <td className="p-2.5 text-[var(--md-on-surface-variant)] font-mono tabular-nums text-[11px]">
                                {stmtFromDate ? formatDateOnly(stmtFromDate) : 'رصيد بداية'}
                              </td>
                              <td className="p-2.5">
                                <span className="m3-badge m3-badge-primary text-[10px]">
                                  <Sparkles className="w-3 h-3 text-[var(--md-secondary)]" />
                                  <span>الرصيد الافتتاحي (أساس البداية)</span>
                                </span>
                              </td>
                              <td className="p-2.5 font-mono text-[var(--md-on-surface-variant)]">
                                —
                              </td>
                              <td className="p-2.5 font-mono tabular-nums font-black text-sm text-[var(--md-primary-text)]">
                                {formatNumber(opBalance)} {cur}
                              </td>
                              <td className="p-2.5 text-[var(--md-on-surface)] font-medium text-[11px]">
                                الرصيد الافتتاحي المعتمد لبداية الفترة (خط الأساس المحاسبي)
                              </td>
                              <td className="p-2.5 text-center text-[var(--md-on-surface-variant)] font-mono text-[10px]">
                                —
                              </td>
                              <td className="p-2.5 text-center text-[var(--md-on-surface-variant)] font-mono text-[10px]">
                                BASELINE
                              </td>
                            </tr>

                            {/* 2. SECTION DIVIDER FOR ACTUAL MOVEMENTS */}
                            <tr className="bg-[var(--md-surface-container)] text-[var(--md-primary-text)] font-bold text-[10px]">
                              <td colSpan={7} className="py-1.5 px-3 text-right border-y border-[var(--md-outline-variant)]">
                                ▼ الحركات الفعلية المسجلة خلال الفترة ({actualTxCount} حركة مسجلة)
                              </td>
                            </tr>

                            {/* 3. ACTUAL TRANSACTIONS */}
                            {actualTxList.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="p-8 text-center text-[var(--md-on-surface-variant)]">
                                  لا توجد حركات مالية مسجلة خلال الفترة المحددة — الرصيد النهائي مطابق للرصيد الافتتاحي ({formatNumber(opBalance)} {cur}).
                                </td>
                              </tr>
                            ) : (
                              actualTxList.map((tx: any) => {
                                const txCur = tx.currency || cur;
                                const recBy = tx.received_by || tx.receivedBy;
                                return (
                                  <tr key={tx.id} className="hover:bg-[var(--md-surface-container-low)] transition-colors">
                                    <td className="p-2.5 text-[var(--md-on-surface-variant)] font-mono tabular-nums text-[11px]">
                                      {formatDateOnly(tx.date || tx.created_at)}
                                    </td>
                                    <td className="p-2.5 font-bold">
                                      <span
                                        className={`m3-badge text-[10px] ${
                                          tx.type === 'DEBIT'
                                            ? 'm3-badge-warning'
                                            : tx.type === 'CREDIT' || tx.type === 'PAYMENT'
                                            ? 'm3-badge-success'
                                            : ''
                                        }`}
                                      >
                                        {tx.type === 'DEBIT'
                                          ? 'مدين (+ مبيعات)'
                                          : tx.type === 'CREDIT'
                                          ? 'دائن (+ توريد)'
                                          : tx.type === 'PAYMENT'
                                          ? 'سداد / تحصيل'
                                          : 'تعديل رصيد'}
                                      </span>
                                    </td>
                                    <td className="p-2.5 font-mono tabular-nums font-bold text-[var(--md-on-surface)]">
                                      <div className="flex items-center gap-1">
                                        <span>{formatNumber(tx.amount)}</span>
                                        <span className="text-[10px] text-[var(--md-on-surface-variant)] font-normal">{txCur}</span>
                                      </div>
                                      {txCur !== 'YER' && tx.exchange_rate && tx.exchange_rate !== 1 && (
                                        <div className="text-[9px] text-[var(--md-warning)] font-mono tabular-nums">
                                          ≈ {formatNumber(Number(tx.amount) * Number(tx.exchange_rate))} YER
                                        </div>
                                      )}
                                    </td>
                                    <td className="p-2.5 font-mono tabular-nums font-bold text-[var(--md-primary-text)]">
                                      {formatNumber(tx.balance_after || tx.running_balance)} {txCur}
                                    </td>
                                    <td className="p-2.5 text-[var(--md-on-surface)]">
                                      {tx.description || '-'}
                                    </td>
                                    <td className="p-2.5 text-center font-medium">
                                      {recBy ? (
                                        <span className="m3-badge m3-badge-info text-[10px]">
                                          {recBy}
                                        </span>
                                      ) : (
                                        <span className="text-[var(--md-on-surface-variant)] text-[11px]">—</span>
                                      )}
                                    </td>
                                    <td className="p-2.5 text-center text-[var(--md-on-surface-variant)] font-mono text-[10px]">
                                      {tx.reference_no || '-'}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>

                          {/* 4. FINAL ACCOUNT SUMMARY BLOCK (TFOOT) */}
                          <tfoot className="bg-[var(--md-surface-container-low)] border-t-2 border-[var(--md-primary)]/35 text-xs font-semibold">
                            <tr className="border-b border-[var(--md-outline-variant)]">
                              <td colSpan={4} className="p-2.5 text-[var(--md-on-surface-variant)]">الرصيد الافتتاحي لبداية الفترة (Opening Balance):</td>
                              <td colSpan={3} className="p-2.5 font-mono tabular-nums text-[var(--md-on-surface)] text-left font-bold" dir="ltr">{formatNumber(opBalance)} {cur}</td>
                            </tr>
                            <tr className="border-b border-[var(--md-outline-variant)]">
                              <td colSpan={4} className="p-2.5 text-[var(--md-warning)]">إجمالي مدين الفترة / المسحوبات (Total Debit):</td>
                              <td colSpan={3} className="p-2.5 font-mono tabular-nums text-[var(--md-warning)] text-left font-bold" dir="ltr">+{formatNumber(totalDebit)} {cur}</td>
                            </tr>
                            <tr className="border-b border-[var(--md-outline-variant)]">
                              <td colSpan={4} className="p-2.5 text-[var(--md-success)]">إجمالي دائن / مسددات الفترة (Total Credit / Payments):</td>
                              <td colSpan={3} className="p-2.5 font-mono tabular-nums text-[var(--md-success)] text-left font-bold" dir="ltr">-{formatNumber(totalCredit)} {cur}</td>
                            </tr>
                            <tr className="bg-[var(--md-primary-container)]/45 text-sm font-black">
                              <td colSpan={4} className="p-3 text-[var(--md-primary-text)]">
                                الرصيد الختامي النهائي (Final Account Balance) — [{actualTxCount} حركة فعلية]:
                              </td>
                              <td colSpan={3} className="p-3 font-mono tabular-nums text-[var(--md-primary-text)] text-base text-left" dir="ltr">{formatNumber(clBalance)} {cur}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>

            {/* Modal Footer with Pagination */}
            <div className="p-3 bg-[var(--md-surface-container-low)] border-t border-[var(--md-outline-variant)] flex items-center justify-between text-xs flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <span className="text-[var(--md-on-surface-variant)] text-[11px]">
                  نظام AI Business System • تدقيق وعزل محاسبي معتمد
                </span>
                {statementData?.pagination && statementData.pagination.totalPages > 1 && (
                  <div className="flex items-center gap-1.5 text-xs text-[var(--md-on-surface)]">
                    <button
                      disabled={statementData.pagination.page <= 1 || statementLoading}
                      onClick={() => {
                        const newPage = statementData.pagination.page - 1;
                        setStmtPage(newPage);
                        fetchAccountStatement(detailAccount.party, detailAccount.type, stmtFromDate, stmtToDate, newPage, stmtLimit);
                      }}
                      className="m3-btn-outlined !min-h-[28px] !px-1.5 disabled:opacity-30 cursor-pointer"
                      title="الصفحة السابقة"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <span className="font-mono tabular-nums text-[11px] px-2 py-0.5 bg-[var(--md-surface-container)] rounded border border-[var(--md-outline-variant)]">
                      صفحة {statementData.pagination.page} من {statementData.pagination.totalPages}
                    </span>
                    <button
                      disabled={statementData.pagination.page >= statementData.pagination.totalPages || statementLoading}
                      onClick={() => {
                        const newPage = statementData.pagination.page + 1;
                        setStmtPage(newPage);
                        fetchAccountStatement(detailAccount.party, detailAccount.type, stmtFromDate, stmtToDate, newPage, stmtLimit);
                      }}
                      className="m3-btn-outlined !min-h-[28px] !px-1.5 disabled:opacity-30 cursor-pointer"
                      title="الصفحة التالية"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => setDetailAccount(null)}
                className="m3-btn-outlined !min-h-[34px] px-4 py-1.5 font-semibold cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. CREATE / EDIT CUSTOMER MODAL (M3 Unified Modal)                        */}
      {/* ========================================================================= */}
      {isCustomerModalOpen && (
        <div className="m3-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="m3-modal-surface w-full max-w-lg overflow-hidden text-right">
            <div className="p-4 bg-[var(--md-surface-container-low)] border-b border-[var(--md-outline-variant)] flex items-center justify-between">
              <h3 className="font-bold text-[var(--md-on-surface)] text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-[var(--md-primary-text)]" />
                <span>{editingCustomer ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}</span>
              </h3>
              <button
                onClick={() => setIsCustomerModalOpen(false)}
                className="m3-btn-text p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-[var(--md-on-surface-variant)] font-semibold mb-1">
                  اسم العميل / الشركة <span className="text-[var(--md-primary-text)]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: مؤسسة الأمل للتجارة"
                  value={customerFormData.name}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, name: e.target.value })}
                  className="m3-input w-full text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--md-on-surface-variant)] font-semibold mb-1">رقم الهاتف</label>
                  <input
                    type="text"
                    placeholder="+967770000000"
                    value={customerFormData.phone}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, phone: e.target.value })}
                    className="m3-input w-full text-xs dir-ltr text-right font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[var(--md-on-surface-variant)] font-semibold mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    placeholder="client@company.com"
                    value={customerFormData.email}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, email: e.target.value })}
                    className="m3-input w-full text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--md-on-surface-variant)] font-semibold mb-1">العملة الافتراضية</label>
                  <select
                    value={customerFormData.currency}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, currency: e.target.value })}
                    className="m3-select w-full text-xs"
                  >
                    <option value="YER">ريال يمني (YER)</option>
                    <option value="SAR">ريال سعودي (SAR)</option>
                    <option value="USD">دولار أمريكي (USD)</option>
                  </select>
                </div>

                {!editingCustomer ? (
                  <div>
                    <label className="block text-[var(--md-on-surface-variant)] font-semibold mb-1 flex items-center justify-between">
                      <span>الرصيد الافتتاحي</span>
                      <span className="text-[10px] text-[var(--md-primary-text)] font-mono">0-9 EN</span>
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      dir="ltr"
                      lang="en"
                      placeholder="0.00"
                      value={customerFormData.openingBalance}
                      onChange={(e) =>
                        setCustomerFormData({
                          ...customerFormData,
                          openingBalance: toEnglishDigits(e.target.value).replace(/[^0-9.-]/g, ''),
                        })
                      }
                      className="m3-input w-full text-xs font-mono tabular-nums text-left"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-[var(--md-on-surface-variant)] font-semibold mb-1">الرصيد الافتتاحي المسجل</label>
                    <input
                      type="text"
                      disabled
                      value={`${formatNumber(customerFormData.openingBalance)} ${customerFormData.currency}`}
                      className="m3-input w-full text-xs font-mono tabular-nums"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[var(--md-on-surface-variant)] font-semibold mb-1">العنوان التفصيلي</label>
                <input
                  type="text"
                  placeholder="صنعاء - شارع الزبيري"
                  value={customerFormData.address}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, address: e.target.value })}
                  className="m3-input w-full text-xs"
                />
              </div>

              <div>
                <label className="block text-[var(--md-on-surface-variant)] font-semibold mb-1">ملاحظات وشروط الدفع</label>
                <textarea
                  rows={2}
                  placeholder="سقف الائتمان، الملاحظات التعاقدية..."
                  value={customerFormData.notes}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, notes: e.target.value })}
                  className="m3-input !h-auto py-2.5 w-full text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--md-outline-variant)]">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="m3-btn-outlined px-4 py-2 font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="m3-btn-primary px-5 py-2 font-bold cursor-pointer"
                >
                  حفظ العميل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. CREATE / EDIT SUPPLIER MODAL (M3 Unified Modal)                        */}
      {/* ========================================================================= */}
      {isSupplierModalOpen && (
        <div className="m3-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="m3-modal-surface w-full max-w-lg overflow-hidden text-right">
            <div className="p-4 bg-[var(--md-surface-container-low)] border-b border-[var(--md-outline-variant)] flex items-center justify-between">
              <h3 className="font-bold text-[var(--md-on-surface)] text-sm flex items-center gap-2">
                <Truck className="w-4 h-4 text-[var(--md-secondary)]" />
                <span>{editingSupplier ? 'تعديل بيانات المورد' : 'إضافة مورد / مصنع جديد'}</span>
              </h3>
              <button
                onClick={() => setIsSupplierModalOpen(false)}
                className="m3-btn-text p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-[var(--md-on-surface-variant)] font-semibold mb-1">
                  اسم المورد / الشركة <span className="text-[var(--md-secondary)]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: شركة النور للاستيراد والتوزيع"
                  value={supplierFormData.name}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, name: e.target.value })}
                  className="m3-input w-full text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--md-on-surface-variant)] font-semibold mb-1">رقم الهاتف</label>
                  <input
                    type="text"
                    placeholder="+967770000000"
                    value={supplierFormData.phone}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, phone: e.target.value })}
                    className="m3-input w-full text-xs dir-ltr text-right font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[var(--md-on-surface-variant)] font-semibold mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    placeholder="supplier@trade.com"
                    value={supplierFormData.email}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, email: e.target.value })}
                    className="m3-input w-full text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--md-on-surface-variant)] font-semibold mb-1">عملة التعامل</label>
                  <select
                    value={supplierFormData.currency}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, currency: e.target.value })}
                    className="m3-select w-full text-xs"
                  >
                    <option value="YER">ريال يمني (YER)</option>
                    <option value="SAR">ريال سعودي (SAR)</option>
                    <option value="USD">دولار أمريكي (USD)</option>
                  </select>
                </div>

                {!editingSupplier ? (
                  <div>
                    <label className="block text-[var(--md-on-surface-variant)] font-semibold mb-1 flex items-center justify-between">
                      <span>الرصيد الافتتاحي</span>
                      <span className="text-[10px] text-[var(--md-secondary)] font-mono">0-9 EN</span>
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      dir="ltr"
                      lang="en"
                      placeholder="0.00"
                      value={supplierFormData.openingBalance}
                      onChange={(e) =>
                        setSupplierFormData({
                          ...supplierFormData,
                          openingBalance: toEnglishDigits(e.target.value).replace(/[^0-9.-]/g, ''),
                        })
                      }
                      className="m3-input w-full text-xs font-mono tabular-nums text-left"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-[var(--md-on-surface-variant)] font-semibold mb-1">الرصيد الافتتاحي المسجل</label>
                    <input
                      type="text"
                      disabled
                      value={`${formatNumber(supplierFormData.openingBalance)} ${supplierFormData.currency}`}
                      className="m3-input w-full text-xs font-mono tabular-nums"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[var(--md-on-surface-variant)] font-semibold mb-1">العنوان والمقر</label>
                <input
                  type="text"
                  placeholder="الميناء / المنطقة الصناعية"
                  value={supplierFormData.address}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, address: e.target.value })}
                  className="m3-input w-full text-xs"
                />
              </div>

              <div>
                <label className="block text-[var(--md-on-surface-variant)] font-semibold mb-1">ملاحظات التوريد</label>
                <textarea
                  rows={2}
                  placeholder="فترة السماح، شروط الاستحقاق..."
                  value={supplierFormData.notes}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, notes: e.target.value })}
                  className="m3-input !h-auto py-2.5 w-full text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--md-outline-variant)]">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="m3-btn-outlined px-4 py-2 font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="m3-btn-primary px-5 py-2 font-bold cursor-pointer"
                >
                  حفظ المورد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. DIRECT ACCOUNT TRANSACTION MODAL (Customer & Supplier)                 */}
      {/* ========================================================================= */}
      {isTxModalOpen && (
        <div className="m3-backdrop fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="m3-modal-surface w-full max-w-lg overflow-hidden text-right space-y-0 text-xs">
            <div className="p-4 bg-[var(--md-surface-container-low)] border-b border-[var(--md-outline-variant)] flex items-center justify-between">
              <div>
                <h4 className="font-bold text-[var(--md-on-surface)] text-sm flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4 text-[var(--md-primary-text)]" />
                  <span>تسجيل حركة حساب مباشرة (Direct Transaction)</span>
                </h4>
                <p className="text-[11px] text-[var(--md-on-surface-variant)] mt-0.5">
                  قيد حركة مالية مدينة/دائنة بدون فاتورة مع تدقيق الأثر المباشر
                </p>
              </div>
              <button
                onClick={() => setIsTxModalOpen(false)}
                className="m3-btn-text p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitTransaction} className="p-5 space-y-4">
              {/* Account Selector */}
              <div>
                <label className="block text-[var(--md-on-surface-variant)] font-semibold mb-1">
                  الحساب المستهدف <span className="text-[var(--md-primary-text)]">*</span>
                </label>
                <select
                  required
                  value={txTarget?.party?.id ? `${txTarget.type}_${txTarget.party.id}` : ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    const [t, id] = val.split('_');
                    const targetList = t === 'CUSTOMER' ? customers : suppliers;
                    const found = targetList.find((x) => x.id === id);
                    if (found) {
                      setTxTarget({ party: found, type: t as 'CUSTOMER' | 'SUPPLIER' });
                      setTxFormData({
                        ...txFormData,
                        type: t === 'CUSTOMER' ? 'DEBIT' : 'CREDIT',
                        currency: found.currency || 'YER',
                      });
                    }
                  }}
                  className="m3-select w-full text-xs"
                >
                  <option value="" disabled>اختر الحساب...</option>
                  <optgroup label="العملاء (Customers)">
                    {customers.map((c) => (
                      <option key={`c_${c.id}`} value={`CUSTOMER_${c.id}`}>
                        {c.name} - الرصيد: {formatNumber(c.current_balance)} {c.currency || 'YER'}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="الموردون (Suppliers)">
                    {suppliers.map((s) => (
                      <option key={`s_${s.id}`} value={`SUPPLIER_${s.id}`}>
                        {s.name} - الرصيد: {formatNumber(s.current_balance)} {s.currency || 'YER'}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Transaction Type Buttons */}
              <div>
                <label className="block text-[var(--md-on-surface-variant)] font-semibold mb-1">
                  نوع القيد / الحركة <span className="text-[var(--md-primary-text)]">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTxFormData({ ...txFormData, type: 'DEBIT' })}
                    className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      txFormData.type === 'DEBIT'
                        ? 'border-[var(--md-primary)] bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] ring-1 ring-[var(--md-primary)]/40'
                        : 'border-[var(--md-outline-variant)] bg-[var(--md-surface-container-low)] text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
                    }`}
                  >
                    <div>مدين (DEBIT)</div>
                    <div className="text-[9px] font-normal opacity-80">مبيعات / زيادة مديونية</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTxFormData({ ...txFormData, type: 'CREDIT' })}
                    className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      txFormData.type === 'CREDIT'
                        ? 'border-[var(--md-warning)] bg-[var(--md-warning-container)] text-[var(--md-on-warning-container)] ring-1 ring-[var(--md-warning)]/40'
                        : 'border-[var(--md-outline-variant)] bg-[var(--md-surface-container-low)] text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
                    }`}
                  >
                    <div>دائن (CREDIT)</div>
                    <div className="text-[9px] font-normal opacity-80">توريد / استحقاق</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTxFormData({ ...txFormData, type: 'PAYMENT' })}
                    className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      txFormData.type === 'PAYMENT'
                        ? 'border-[var(--md-info)] bg-[var(--md-info-container)] text-[var(--md-on-info-container)] ring-1 ring-[var(--md-info)]/40'
                        : 'border-[var(--md-outline-variant)] bg-[var(--md-surface-container-low)] text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
                    }`}
                  >
                    <div>سداد/قبض</div>
                    <div className="text-[9px] font-normal opacity-80">تحصيل أو دفع نقدي</div>
                  </button>
                </div>
              </div>

              {/* Amount, Currency, Rate */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[var(--md-on-surface-variant)] font-semibold mb-1 flex items-center justify-between">
                    <span>
                      المبلغ <span className="text-[var(--md-primary-text)]">*</span>
                    </span>
                    <span className="text-[10px] text-[var(--md-primary-text)] font-mono">0-9 EN</span>
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    dir="ltr"
                    lang="en"
                    required
                    placeholder="0.00"
                    value={txFormData.amount}
                    onChange={(e) =>
                      setTxFormData({
                        ...txFormData,
                        amount: toEnglishDigits(e.target.value).replace(/[^0-9.]/g, ''),
                      })
                    }
                    className="m3-input w-full text-xs font-mono tabular-nums text-left"
                  />
                </div>

                <div>
                  <label className="block text-[var(--md-on-surface-variant)] font-semibold mb-1">العملة</label>
                  <select
                    value={txFormData.currency}
                    onChange={(e) => {
                      const cur = e.target.value;
                      setTxFormData({
                        ...txFormData,
                        currency: cur,
                        exchangeRate: cur === 'YER' ? '1.0' : txFormData.exchangeRate || '1.0',
                      });
                    }}
                    className="m3-select w-full text-xs"
                  >
                    <option value="YER">YER (ريال يمني)</option>
                    <option value="SAR">SAR (ريال سعودي)</option>
                    <option value="USD">USD (دولار)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[var(--md-on-surface-variant)] font-semibold mb-1 flex items-center justify-between">
                    <span>
                      سعر الصرف {txFormData.currency !== 'YER' && <span className="text-[10px] text-[var(--md-warning)]">(مقابل YER)</span>}
                    </span>
                    <span className="text-[10px] text-[var(--md-secondary)] font-mono">0-9 EN</span>
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    dir="ltr"
                    lang="en"
                    disabled={txFormData.currency === 'YER'}
                    value={txFormData.currency === 'YER' ? '1.0' : txFormData.exchangeRate}
                    onChange={(e) =>
                      setTxFormData({
                        ...txFormData,
                        exchangeRate: toEnglishDigits(e.target.value).replace(/[^0-9.]/g, ''),
                      })
                    }
                    placeholder="1.0"
                    className="m3-input w-full text-xs font-mono tabular-nums text-left"
                  />
                </div>
              </div>

              {/* Date & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--md-on-surface-variant)] font-semibold mb-1">تاريخ الحركة</label>
                  <input
                    type="date"
                    required
                    value={txFormData.date}
                    onChange={(e) => setTxFormData({ ...txFormData, date: e.target.value })}
                    className="m3-input w-full text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[var(--md-on-surface-variant)] font-semibold mb-1">رقم السند / المرجع</label>
                  <input
                    type="text"
                    placeholder="TX-000001 (اختياري)"
                    value={txFormData.referenceNo}
                    onChange={(e) => setTxFormData({ ...txFormData, referenceNo: e.target.value })}
                    className="m3-input w-full text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--md-on-surface-variant)] font-semibold mb-1">البيان / الوصف</label>
                  <input
                    type="text"
                    placeholder="سبب الحركة أو الشرح المحاسبي..."
                    value={txFormData.description}
                    onChange={(e) => setTxFormData({ ...txFormData, description: e.target.value })}
                    className="m3-input w-full text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[var(--md-on-surface-variant)] font-semibold mb-1 flex items-center justify-between">
                    <span>المستلم / المسحوب بواسطة</span>
                    <span className="text-[10px] text-[var(--md-info)] font-normal">اختياري</span>
                  </label>
                  <input
                    type="text"
                    placeholder="اسم الشخص المستلم أو السائق..."
                    value={txFormData.receivedBy}
                    onChange={(e) => setTxFormData({ ...txFormData, receivedBy: e.target.value })}
                    className="m3-input w-full text-xs"
                  />
                </div>
              </div>

              {/* Live Simulation Box */}
              {simulatedParty && (
                <div className="p-3 bg-[var(--md-surface-container-low)] rounded-xl border border-[var(--md-outline-variant)] space-y-1 text-[11px]">
                  <div className="flex justify-between text-[var(--md-on-surface-variant)]">
                    <span>الرصيد الحالي السابق:</span>
                    <span className="font-mono tabular-nums">{formatNumber(currentPartyBalance)} {simulatedParty.currency || 'YER'}</span>
                  </div>
                  <div className="flex justify-between font-bold text-[var(--md-primary-text)] pt-1 border-t border-[var(--md-outline-variant)]">
                    <span>الرصيد الجديد المتوقع بعد الحفظ:</span>
                    <span className="font-mono tabular-nums text-sm">{formatNumber(simulatedNewBalance)} {simulatedParty.currency || 'YER'}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--md-outline-variant)]">
                <button
                  type="button"
                  onClick={() => setIsTxModalOpen(false)}
                  disabled={txSubmitting}
                  className="m3-btn-outlined px-4 py-2 font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={txSubmitting}
                  className="m3-btn-primary px-5 py-2 font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {txSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>اعتماد وقيد الحركة</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9.5 CUSTOMER MERGE MODAL (دمج حساب عميل مكرر أو مجهول)                     */}
      {/* ========================================================================= */}
      {mergeModal && (
        <div className="m3-backdrop fixed inset-0 z-[65] flex items-center justify-center p-4 animate-fade-in" dir="rtl">
          <div className="m3-modal-surface w-full max-w-md overflow-hidden text-right">
            <div className="p-4 bg-[var(--md-surface-container-low)] border-b border-[var(--md-outline-variant)] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[var(--md-warning-container)] text-[var(--md-on-warning-container)] flex items-center justify-center">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-[var(--md-on-surface)] text-sm">دمج حساب العميل (Customer Merge)</h4>
                  <p className="text-[11px] text-[var(--md-on-surface-variant)]">نقل الحركات والرصيد والفواتير إلى الحساب الأساسي</p>
                </div>
              </div>
              <button
                onClick={() => setMergeModal(null)}
                className="m3-btn-text p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-[var(--md-warning-container)]/50 border border-[var(--md-warning)]/35 rounded-xl space-y-1.5">
                <div className="text-[11px] font-bold text-[var(--md-on-warning-container)]">العميل المُراد دمجه (المصدر):</div>
                <div className="text-[var(--md-on-surface)] font-black text-sm">{mergeModal.sourceCustomer.name || mergeModal.sourceCustomer._name}</div>
                <div className="text-[var(--md-on-surface-variant)] font-mono tabular-nums text-[11px]">
                  الرصيد الحالي: {formatNumber(mergeModal.sourceCustomer.current_balance || mergeModal.sourceCustomer.balance || 0)} {mergeModal.sourceCustomer.currency || 'YER'}
                </div>
              </div>

              <div>
                <label className="block text-[var(--md-on-surface-variant)] font-bold mb-1.5">
                  اختر العميل الأساسي المُراد الدمج إليه (الهدف) <span className="text-[var(--md-warning)]">*</span>:
                </label>
                <select
                  value={mergeModal.targetCustomerId}
                  onChange={(e) => setMergeModal({ ...mergeModal, targetCustomerId: e.target.value })}
                  className="m3-select w-full text-xs font-bold"
                >
                  <option value="" disabled>اختر العميل المستهدف...</option>
                  {customers
                    .filter((c) => c.id !== mergeModal.sourceCustomer.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} — الرصيد: {formatNumber(c.current_balance || c.balance || 0)} {c.currency || 'YER'}
                      </option>
                    ))}
                </select>
              </div>

              <div className="p-3 bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] rounded-xl text-[var(--md-on-surface-variant)] text-[11px] space-y-1">
                <div className="text-[var(--md-on-surface)]">⚠️ <strong>ماذا سيحدث بعد تأكيد الدمج؟</strong></div>
                <div>• سيتم نقل كافة الفواتير وسندات القبض وحركات الحساب فوراً إلى العميل المستهدف.</div>
                <div>• سيتم دمج الرصيد المالي وإلغاء حساب العميل المصدر لمنع التكرار والحسابات المجهولة.</div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--md-outline-variant)]">
                <button
                  type="button"
                  onClick={() => setMergeModal(null)}
                  disabled={isMerging}
                  className="m3-btn-outlined px-4 py-2 font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleExecuteMerge}
                  disabled={isMerging || !mergeModal.targetCustomerId}
                  className="m3-btn-primary px-5 py-2 font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isMerging && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>تأكيد دمج الحساب</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 10. IN-SYSTEM WHATSAPP STATEMENT SENDER MODAL                            */}
      {/* ========================================================================= */}
      {whatsAppModalData && (
        <div className="m3-backdrop fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="m3-modal-surface w-full max-w-xl overflow-hidden text-right flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="p-4 bg-[var(--md-surface-container-low)] border-b border-[var(--md-outline-variant)] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[var(--md-success-container)] text-[var(--md-on-success-container)] flex items-center justify-center">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[var(--md-on-surface)] text-sm flex items-center gap-2 flex-wrap">
                    <span>إرسال كشف الحساب عبر WhatsApp</span>
                    <span className="m3-badge m3-badge-success text-[10px]">
                      إرسال فوري داخل النظام
                    </span>
                  </h3>
                  <p className="text-[11px] text-[var(--md-on-surface-variant)]">
                    الحساب: <span className="text-[var(--md-on-surface)] font-semibold">{whatsAppModalData.party.name || whatsAppModalData.party._name}</span>
                    <span className="font-mono text-[var(--md-primary-text)] mx-1.5">• ACC-{String(whatsAppModalData.party.id).slice(-6)}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setWhatsAppModalData(null)}
                disabled={isSendingWhatsApp}
                className="m3-btn-outlined !min-h-[34px] !px-2 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto text-xs flex-1">
              
              {/* Recipient Phone Configuration */}
              <div className="p-3.5 bg-[var(--md-surface-container-low)] rounded-xl border border-[var(--md-outline-variant)] space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <label className="text-xs font-bold text-[var(--md-on-surface)] flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[var(--md-primary-text)]" />
                    <span>رقم هاتف المستلم (WhatsApp)</span>
                  </label>
                  <span className="text-[10px] text-[var(--md-on-surface-variant)]">يجب أن يتضمن مفتاح الدولة (مثل: 967+ أو 966+)</span>
                </div>
                <input
                  type="text"
                  dir="ltr"
                  value={whatsAppModalData.phone}
                  onChange={(e) =>
                    setWhatsAppModalData({
                      ...whatsAppModalData,
                      phone: e.target.value,
                    })
                  }
                  placeholder="+967 770 000 000"
                  className="m3-input w-full text-xs font-mono"
                />
              </div>

              {/* Statement Financial Metrics Pill Summary */}
              {whatsAppModalData.statementSummary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)]">
                    <div className="text-[10px] text-[var(--md-on-surface-variant)]">الرصيد الافتتاحي</div>
                    <div className="font-mono tabular-nums font-bold text-[var(--md-on-surface)] text-xs mt-0.5">
                      {toEnglishDigits(formatNumber(whatsAppModalData.statementSummary.openingBalance))}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)]">
                    <div className="text-[10px] text-[var(--md-warning)]">إجمالي المدين</div>
                    <div className="font-mono tabular-nums font-bold text-[var(--md-warning)] text-xs mt-0.5">
                      +{toEnglishDigits(formatNumber(whatsAppModalData.statementSummary.totalDebit))}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)]">
                    <div className="text-[10px] text-[var(--md-success)]">إجمالي الدائن</div>
                    <div className="font-mono tabular-nums font-bold text-[var(--md-success)] text-xs mt-0.5">
                      -{toEnglishDigits(formatNumber(whatsAppModalData.statementSummary.totalCredit))}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-[var(--md-primary-container)]/50 border border-[var(--md-primary)]/35">
                    <div className="text-[10px] text-[var(--md-primary-text)] font-bold">الرصيد النهائي</div>
                    <div className="font-mono tabular-nums font-black text-[var(--md-primary-text)] text-xs mt-0.5">
                      {toEnglishDigits(formatNumber(whatsAppModalData.statementSummary.closingBalance))} {whatsAppModalData.statementSummary.currency}
                    </div>
                  </div>
                </div>
              )}

              {/* Editable Formatted Statement Text */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[var(--md-on-surface)] flex-wrap gap-1">
                  <span className="font-bold flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[var(--md-primary-text)]" />
                    <span>نص كشف الحساب المعتمد للإرسال</span>
                  </span>
                  <span className="text-[10px] text-[var(--md-on-surface-variant)]">يمكنك التعديل أو إضافة ملاحظات خاصة قبل الإرسال</span>
                </div>
                <textarea
                  rows={9}
                  value={whatsAppModalData.message}
                  onChange={(e) =>
                    setWhatsAppModalData({
                      ...whatsAppModalData,
                      message: e.target.value,
                    })
                  }
                  className="m3-input !h-auto p-3 w-full font-mono text-[11px] leading-relaxed"
                />
              </div>

              {/* Internal System Archival Note */}
              <div className="p-2.5 rounded-lg bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] flex items-center gap-2 text-[11px] text-[var(--md-on-surface-variant)]">
                <ShieldCheck className="w-4 h-4 text-[var(--md-primary-text)] shrink-0" />
                <span>
                  يتم إرسال هذا الكشف وتسجيله فورياً في مركز محادثات واتساب النظام الداخلي وتحديث مؤشرات التوصيل وسجل التدقيق.
                </span>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 bg-[var(--md-surface-container-low)] border-t border-[var(--md-outline-variant)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              
              {/* Copy & External WhatsApp Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(whatsAppModalData.message);
                    setCopiedWhatsApp(true);
                    setTimeout(() => setCopiedWhatsApp(false), 3000);
                  }}
                  className="m3-btn-outlined px-3 py-2 font-semibold flex items-center gap-1.5 cursor-pointer text-xs"
                >
                  {copiedWhatsApp ? <Check className="w-3.5 h-3.5 text-[var(--md-success)]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedWhatsApp ? 'تم النسخ' : 'نسخ النص'}</span>
                </button>

                <a
                  href={`https://wa.me/${whatsAppModalData.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(whatsAppModalData.message)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="m3-btn-outlined px-3 py-2 font-medium flex items-center gap-1.5 cursor-pointer text-xs"
                  title="فتح تطبيق واتساب الخارجي كنسخة إضافية عند الحاجة"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">فتح خارجي (اختياري)</span>
                </a>
              </div>

              {/* Primary Dispatch In System */}
              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setWhatsAppModalData(null)}
                  disabled={isSendingWhatsApp}
                  className="m3-btn-outlined px-4 py-2 font-semibold cursor-pointer text-xs"
                >
                  إلغاء
                </button>

                <button
                  type="button"
                  onClick={handleSendWhatsAppInSystem}
                  disabled={isSendingWhatsApp || !whatsAppModalData.phone.trim()}
                  className="m3-btn-primary px-5 py-2.5 font-bold flex items-center justify-center gap-2 cursor-pointer text-xs disabled:opacity-50"
                >
                  {isSendingWhatsApp ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري الإرسال داخل النظام...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>إرسال فوري داخل النظام 💬</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 11. IMPORT HELPER MODAL                                                  */}
      {/* ========================================================================= */}
      {isImportModalOpen && (
        <div className="m3-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="m3-modal-surface w-full max-w-md overflow-hidden text-right">
            <div className="p-4 bg-[var(--md-surface-container-low)] border-b border-[var(--md-outline-variant)] flex items-center justify-between">
              <h3 className="font-bold text-[var(--md-on-surface)] text-sm flex items-center gap-2">
                <Download className="w-4 h-4 text-[var(--md-primary-text)] rotate-180" />
                <span>استيراد دليل العملاء والموردين</span>
              </h3>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="m3-btn-text p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-[var(--md-on-surface-variant)]">
              <p className="leading-relaxed">
                يدعم نظام AI Business System استيراد ملفات Excel (.xlsx) و CSV للعملاء والموردين مع المطابقة التلقائية للحقول والأرصدة الافتتاحية.
              </p>

              <div className="p-3 bg-[var(--md-surface-container-low)] rounded-xl border border-[var(--md-outline-variant)] space-y-1.5 text-[11px]">
                <div className="font-bold text-[var(--md-primary-text)]">الهيكل الموصى به للملف:</div>
                <div className="font-mono text-[var(--md-on-surface-variant)]">
                  الاسم | الهاتف | البريد | العنوان | الرصيد الافتتاحي | العملة
                </div>
              </div>

              <div className="border-2 border-dashed border-[var(--md-outline)] rounded-xl p-6 text-center bg-[var(--md-surface-container-low)] hover:border-[var(--md-primary)] transition-colors cursor-pointer">
                <Download className="w-8 h-8 mx-auto text-[var(--md-primary-text)] mb-2" />
                <div className="font-bold text-[var(--md-on-surface)]">انقر لاختيار ملف Excel أو CSV أو اسحبه هنا</div>
                <div className="text-[10px] text-[var(--md-on-surface-variant)] mt-1">الحد الأقصى لحجم الملف: 5MB</div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--md-outline-variant)]">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="m3-btn-outlined px-4 py-2 font-semibold cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
