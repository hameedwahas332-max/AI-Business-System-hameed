import React, { useState, useEffect } from 'react';
import { safeFetchJson } from '../../lib/safeFetch';
import { formatAmount, formatNumber, getActiveCurrencySymbol, getActiveCurrencyCode } from '../../lib/formatters';
import {
  Briefcase,
  UploadCloud,
  Scale,
  DollarSign,
  RotateCcw,
  Calendar,
  Search,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  FileSpreadsheet,
  Building2,
  Wallet,
  Landmark,
  ShieldCheck,
  AlertCircle,
  TrendingUp,
  Boxes,
  Users,
  Printer,
  X,
  Trash2,
  Coins,
  Smartphone,
  Receipt,
  Home,
  Eye,
  FileText,
  Lock,
  Unlock,
  Database,
  ExternalLink,
  Paperclip,
  Send,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { renderAndPrintDocument } from '../../lib/exportUtils';

interface RealBusinessOperationsTabProps {
  onNavigate?: (tab: any, extra?: any) => void;
}

export interface SalesRep {
  id: string;
  name: string;
  code: string;
  phone: string;
  territory: string;
  vehicle: string;
  dailyTarget: number;
  monthlyTarget: number;
  achievedSales: number;
  collectedCash: number;
  pendingReceivables: number;
  commissionRate: number; // e.g. 3.5%
  earnedCommission: number;
  status: 'ACTIVE' | 'INACTIVE';
  lastActivityDate: string;
}

export const INITIAL_SALES_REPS: SalesRep[] = [
  {
    id: 'rep-01',
    name: 'أحمد ناصر العمري',
    code: 'REP-01',
    phone: '771239876',
    territory: 'صنعاء الوسطى وحدّة',
    vehicle: 'هايلوكس غمارتين #3421',
    dailyTarget: 250000,
    monthlyTarget: 6500000,
    achievedSales: 5420000,
    collectedCash: 4150000,
    pendingReceivables: 1270000,
    commissionRate: 3.5,
    earnedCommission: 189700,
    status: 'ACTIVE',
    lastActivityDate: new Date().toISOString().split('T')[0],
  },
  {
    id: 'rep-02',
    name: 'صلاح محمد القدسي',
    code: 'REP-02',
    phone: '772348765',
    territory: 'شارع تعز والحثيلي ودار سلم',
    vehicle: 'دباب تويوتا مغلق #1892',
    dailyTarget: 180000,
    monthlyTarget: 4800000,
    achievedSales: 4120000,
    collectedCash: 3600000,
    pendingReceivables: 520000,
    commissionRate: 4.0,
    earnedCommission: 164800,
    status: 'ACTIVE',
    lastActivityDate: new Date().toISOString().split('T')[0],
  },
  {
    id: 'rep-03',
    name: 'عبدالرحمن الصبري',
    code: 'REP-03',
    phone: '773457654',
    territory: 'مذبح وشارع الستين وشملان',
    vehicle: 'سيارة جامبو مجهزة #5421',
    dailyTarget: 300000,
    monthlyTarget: 7800000,
    achievedSales: 6950000,
    collectedCash: 5400000,
    pendingReceivables: 1550000,
    commissionRate: 3.0,
    earnedCommission: 208500,
    status: 'ACTIVE',
    lastActivityDate: new Date().toISOString().split('T')[0],
  },
  {
    id: 'rep-04',
    name: 'مروان قائد الحكيمي',
    code: 'REP-04',
    phone: '774566543',
    territory: 'الحصبة وشعوب وشارع مأرب',
    vehicle: 'دينا إيسوزو #7104',
    dailyTarget: 220000,
    monthlyTarget: 5700000,
    achievedSales: 4680000,
    collectedCash: 3890000,
    pendingReceivables: 790000,
    commissionRate: 3.5,
    earnedCommission: 163800,
    status: 'ACTIVE',
    lastActivityDate: new Date().toISOString().split('T')[0],
  },
];

type SubTab =
  | 'dashboard'
  | 'import'
  | 'opening_balances'
  | 'reconciliation'
  | 'expenses'
  | 'returns'
  | 'period_close'
  | 'documents'
  | 'search_mode'
  | 'sales_reps';

export const RealBusinessOperationsTab: React.FC<RealBusinessOperationsTabProps> = ({ onNavigate }) => {
  const { token } = useAuth();
  const currSym = getActiveCurrencySymbol();
  const currCode = getActiveCurrencyCode();
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('dashboard');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isDefaultStartup, setIsDefaultStartup] = useState<boolean>(() => {
    try {
      const val = localStorage.getItem('erp_default_startup_tab');
      return val === null || val === 'real_business';
    } catch {
      return true;
    }
  });

  // 1. Operating Dashboard State
  const [operatingData, setOperatingData] = useState<any>(null);
  const [comprehensiveReport, setComprehensiveReport] = useState<any>(null);

  // 2. Import Engine State
  const [importEntityType, setImportEntityType] = useState<string>('CUSTOMERS');
  const [importCsvText, setImportCsvText] = useState<string>('');
  const [importFileName, setImportFileName] = useState<string>('customers.csv');
  const [importPreview, setImportPreview] = useState<any>(null);
  const [importCommitting, setImportCommitting] = useState(false);

  // 3. Opening Balances State
  const [openingBalances, setOpeningBalances] = useState<any[]>([]);
  const [newOpBal, setNewOpBal] = useState({
    balanceType: 'CUSTOMER',
    entityId: '',
    amount: '',
    entrySide: 'DEBIT',
    accountingDate: new Date().toISOString().split('T')[0],
    referenceNo: '',
    notes: ''
  });

  // 4. Reconciliation State
  const [reconciliations, setReconciliations] = useState<any[]>([]);
  const [reconRunning, setReconRunning] = useState(false);
  const [bankReconData, setBankReconData] = useState({
    accountType: 'BANK',
    accountId: '',
    statementStartDate: new Date().toISOString().split('T')[0],
    statementEndDate: new Date().toISOString().split('T')[0],
    statementOpeningBalance: '',
    statementClosingBalance: '',
    unpresentedChecks: '0',
    depositsInTransit: '0',
    bankCharges: '0',
    interestEarned: '0',
    notes: ''
  });
  const [bankReconResult, setBankReconResult] = useState<any>(null);

  // 5. Operational Expenses State
  const [expenses, setExpenses] = useState<any[]>([]);
  const [newExpense, setNewExpense] = useState({
    category: 'إيجار ومرافق',
    description: '',
    amount: '',
    taxAmount: '0',
    paymentMethod: 'CASH',
    paymentAccountId: '',
    expenseDate: new Date().toISOString().split('T')[0],
    reference: '',
    notes: ''
  });

  // 6. Returns State
  const [salesReturns, setSalesReturns] = useState<any[]>([]);
  const [purchaseReturns, setPurchaseReturns] = useState<any[]>([]);
  const [newReturn, setNewReturn] = useState({
    type: 'SALES',
    customerId: '',
    supplierId: '',
    refundMethod: 'CREDIT_NOTE',
    reason: '',
    items: [{ productId: '', quantity: '1', priceOrCost: '0' }]
  });

  // 7. Period Close & Month-End Checklist State
  const [periods, setPeriods] = useState<any[]>([]);
  const [activePeriodId, setActivePeriodId] = useState<string>('');
  const [checklist, setChecklist] = useState<any>(null);
  const [isNewPeriodOpen, setIsNewPeriodOpen] = useState(false);
  const [confirmClosePeriodId, setConfirmClosePeriodId] = useState<string | null>(null);
  const [newPeriodForm, setNewPeriodForm] = useState(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return {
      name: `فترة ${now.toLocaleDateString('ar-YE', { month: 'long', year: 'numeric' })}`,
      startDate: `${ym}-01`,
      endDate: `${ym}-${String(lastDay).padStart(2, '0')}`,
    };
  });

  // 8. Cash, Bank & Master Accounts State
  const [cashAccounts, setCashAccounts] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [suppliersList, setSuppliersList] = useState<any[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);

  // 8B. Document Vault State
  const [documentsList, setDocumentsList] = useState<any[]>([]);
  const [docForm, setDocForm] = useState({
    title: '',
    category: 'عقد',
    referenceNo: '',
    notes: '',
    fileName: '',
    fileSize: 0,
    mimeType: '',
    dataUrl: '',
  });
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);

  // 9. Global Search & Data Mode State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [dataMode, setDataMode] = useState<string>('PRODUCTION');

  // 10B. Live Invoices & Payments for Sales Reps Linkage & Treasury Remittance
  const [invoicesList, setInvoicesList] = useState<any[]>([]);
  const [paymentsList, setPaymentsList] = useState<any[]>([]);
  const [remittingRep, setRemittingRep] = useState<SalesRep | null>(null);
  const [remitForm, setRemitForm] = useState({
    amount: '',
    paymentMethod: 'CASH',
    notes: '',
  });

  // 10. Sales Representatives & Commissions State
  const [salesReps, setSalesReps] = useState<SalesRep[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const isClean =
          localStorage.getItem('erp_clean_production_mode_v1') === 'true' ||
          localStorage.getItem('erp_sample_data_cleaned') === 'true';

        const saved = localStorage.getItem('erp_sales_reps_v1');
        if (saved !== null) {
          return JSON.parse(saved);
        }
        const savedLegacy = localStorage.getItem('erp_sales_reps');
        if (savedLegacy !== null) {
          return JSON.parse(savedLegacy);
        }
        if (isClean) {
          return [];
        }
      }
    } catch {}
    const isClean =
      typeof window !== 'undefined' &&
      (localStorage.getItem('erp_clean_production_mode_v1') === 'true' ||
        localStorage.getItem('erp_sample_data_cleaned') === 'true');
    if (isClean) return [];
    return INITIAL_SALES_REPS;
  });

  const [isRepModalOpen, setIsRepModalOpen] = useState(false);
  const [editingRep, setEditingRep] = useState<SalesRep | null>(null);
  const [selectedRepForStatement, setSelectedRepForStatement] = useState<SalesRep | null>(null);

  const [repFormData, setRepFormData] = useState({
    name: '',
    code: '',
    phone: '',
    territory: '',
    vehicle: '',
    dailyTarget: '250000',
    monthlyTarget: '6500000',
    commissionRate: '3.5',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  });

  const handleOpenCreateRep = () => {
    setEditingRep(null);
    setRepFormData({
      name: '',
      code: `REP-0${salesReps.length + 1}`,
      phone: '',
      territory: '',
      vehicle: '',
      dailyTarget: '250000',
      monthlyTarget: '6500000',
      commissionRate: '3.5',
      status: 'ACTIVE',
    });
    setIsRepModalOpen(true);
  };

  const handleOpenEditRep = (rep: SalesRep) => {
    setEditingRep(rep);
    setRepFormData({
      name: rep.name,
      code: rep.code,
      phone: rep.phone,
      territory: rep.territory,
      vehicle: rep.vehicle,
      dailyTarget: String(rep.dailyTarget),
      monthlyTarget: String(rep.monthlyTarget),
      commissionRate: String(rep.commissionRate),
      status: rep.status,
    });
    setIsRepModalOpen(true);
  };

  const handleSaveRep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repFormData.name.trim()) {
      showFeedback('error', 'يرجى إدخال اسم مندوب المبيعات');
      return;
    }

    const dTarget = parseFloat(repFormData.dailyTarget) || 0;
    const mTarget = parseFloat(repFormData.monthlyTarget) || 0;
    const cRate = parseFloat(repFormData.commissionRate) || 0;

    let updated: SalesRep[];
    if (editingRep) {
      updated = salesReps.map((r) =>
        r.id === editingRep.id
          ? {
              ...r,
              name: repFormData.name,
              code: repFormData.code,
              phone: repFormData.phone,
              territory: repFormData.territory,
              vehicle: repFormData.vehicle,
              dailyTarget: dTarget,
              monthlyTarget: mTarget,
              commissionRate: cRate,
              earnedCommission: Math.round(r.achievedSales * (cRate / 100)),
              status: repFormData.status,
            }
          : r
      );
      showFeedback('success', `تم تحديث بيانات المندوب (${repFormData.name}) بنجاح`);
    } else {
      const newRep: SalesRep = {
        id: `rep_${Date.now()}`,
        name: repFormData.name,
        code: repFormData.code || `REP-0${salesReps.length + 1}`,
        phone: repFormData.phone,
        territory: repFormData.territory,
        vehicle: repFormData.vehicle,
        dailyTarget: dTarget,
        monthlyTarget: mTarget,
        achievedSales: 0,
        collectedCash: 0,
        pendingReceivables: 0,
        commissionRate: cRate,
        earnedCommission: 0,
        status: repFormData.status,
        lastActivityDate: new Date().toISOString().split('T')[0],
      };
      updated = [...salesReps, newRep];
      showFeedback('success', `تم تسجيل مندوب المبيعات الجديد (${newRep.name}) بنجاح`);
    }

    setSalesReps(updated);
    localStorage.setItem('erp_sales_reps_v1', JSON.stringify(updated));
    localStorage.setItem('erp_sales_reps', JSON.stringify(updated));
    window.dispatchEvent(new Event('erp-sales-reps-updated'));
    setIsRepModalOpen(false);
  };

  const handleDeleteRep = (repId: string, repName: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف مندوب المبيعات (${repName})؟`)) return;
    const updated = salesReps.filter((r) => r.id !== repId);
    setSalesReps(updated);
    localStorage.setItem('erp_sales_reps_v1', JSON.stringify(updated));
    localStorage.setItem('erp_sales_reps', JSON.stringify(updated));
    window.dispatchEvent(new Event('erp-sales-reps-updated'));
    showFeedback('success', `تم حذف المندوب (${repName}) بنجاح`);
  };

  const handleClearAllReps = () => {
    if (!window.confirm('هل أنت متأكد من تصفير وحذف كافة مناديب التوزيع الميداني؟')) return;
    setSalesReps([]);
    localStorage.setItem('erp_sales_reps_v1', '[]');
    localStorage.setItem('erp_sales_reps', '[]');
    window.dispatchEvent(new Event('erp-sales-reps-updated'));
    showFeedback('success', 'تم تصفير وحذف كافة مناديب التوزيع الميداني بنجاح');
  };

  const handlePrintRepStatement = (rep: SalesRep) => {
    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; color: #1e293b; padding: 24px; max-width: 800px; margin: auto;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #059669; padding-bottom: 14px; margin-bottom: 16px;">
          <div>
            <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #059669;">كشف أداء وتصفية عمولة مندوب مبيعات</h1>
            <p style="margin: 4px 0 0; font-size: 12px; color: #64748b;">إدارة المبيعات والتوزيع الميداني (Field Sales Rep Performance & Commission)</p>
          </div>
          <div style="text-align: left; font-family: monospace;">
            <div style="font-size: 15px; font-weight: bold; color: #0f172a;">${rep.code}</div>
            <div style="font-size: 11px; color: #64748b;">تاريخ التقرير: ${new Date().toLocaleDateString('ar-YE')}</div>
            <div style="display: inline-block; background: #ecfdf5; color: #065f46; font-size: 10px; font-weight: bold; padding: 2px 8px; border-radius: 9999px; margin-top: 4px; border: 1px solid #a7f3d0;">
              حساب نشط ومطابق ✅
            </div>
          </div>
        </div>

        <!-- Rep Profile Card -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-bottom: 18px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px;">
            <div><strong>اسم المندوب:</strong> <span style="font-size: 13px; color: #0f172a; font-weight: bold;">${rep.name}</span></div>
            <div><strong>رقم الهاتف:</strong> <span style="font-family: monospace;">${rep.phone}</span></div>
            <div><strong>منطقة وخط السير:</strong> ${rep.territory}</div>
            <div><strong>سيارة التوزيع:</strong> ${rep.vehicle}</div>
            <div><strong>الهدف الشهري المقرر:</strong> <span style="font-family: monospace; font-weight: bold;">${formatNumber(rep.monthlyTarget)} ${currSym}</span></div>
            <div><strong>نسبة العمولة المعتمدة:</strong> <span style="font-family: monospace; font-weight: bold; color: #059669;">${rep.commissionRate}%</span></div>
          </div>
        </div>

        <!-- KPI Performance Grid -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; text-align: center;">
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px;">
            <div style="font-size: 10px; color: #166534; font-weight: bold;">المبيعات المحققة</div>
            <div style="font-size: 14px; font-weight: bold; font-family: monospace; color: #15803d; margin-top: 4px;">${formatNumber(rep.achievedSales)}</div>
            <div style="font-size: 9px; color: #166534;">${currSym}</div>
          </div>
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 10px;">
            <div style="font-size: 10px; color: #1e40af; font-weight: bold;">التحصيلات النقدية الموردة</div>
            <div style="font-size: 14px; font-weight: bold; font-family: monospace; color: #1d4ed8; margin-top: 4px;">${formatNumber(rep.collectedCash)}</div>
            <div style="font-size: 9px; color: #1e40af;">${currSym}</div>
          </div>
          <div style="background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 10px;">
            <div style="font-size: 10px; color: #92400e; font-weight: bold;">الذمم الآجلة المعلقة</div>
            <div style="font-size: 14px; font-weight: bold; font-family: monospace; color: #b45309; margin-top: 4px;">${formatNumber(rep.pendingReceivables)}</div>
            <div style="font-size: 9px; color: #92400e;">${currSym}</div>
          </div>
          <div style="background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 8px; padding: 10px;">
            <div style="font-size: 10px; color: #6b21a8; font-weight: bold;">صافي العمولة المستحقة</div>
            <div style="font-size: 14px; font-weight: bold; font-family: monospace; color: #7e22ce; margin-top: 4px;">${formatNumber(rep.earnedCommission)}</div>
            <div style="font-size: 9px; color: #6b21a8;">${currSym}</div>
          </div>
        </div>

        <!-- Target vs Achievement -->
        <div style="background: #f1f5f9; padding: 12px; border-radius: 8px; margin-bottom: 24px; font-size: 11px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span>نسبة إنجاز الهدف الشهري:</span>
            <span style="font-weight: bold; font-family: monospace;">${((rep.achievedSales / rep.monthlyTarget) * 100).toFixed(1)}%</span>
          </div>
          <div style="width: 100%; height: 8px; background: #cbd5e1; border-radius: 4px; overflow: hidden;">
            <div style="width: ${Math.min(100, (rep.achievedSales / rep.monthlyTarget) * 100)}%; height: 100%; background: #059669;"></div>
          </div>
        </div>

        <!-- Signatures Grid -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 40px; text-align: center; font-size: 11px;">
          <div style="border-top: 1px dashed #94a3b8; padding-top: 8px;">
            <div style="font-weight: bold; color: #0f172a;">المندوب المستلم للعمولة</div>
            <div style="color: #64748b; margin-top: 25px;">التوقيع: ....................</div>
          </div>
          <div style="border-top: 1px dashed #94a3b8; padding-top: 8px;">
            <div style="font-weight: bold; color: #0f172a;">مدير المبيعات والتوزيع</div>
            <div style="color: #64748b; margin-top: 25px;">التوقيع: ....................</div>
          </div>
          <div style="border-top: 1px dashed #94a3b8; padding-top: 8px;">
            <div style="font-weight: bold; color: #0f172a;">المدير المالي والاعتماد الصرفي</div>
            <div style="color: #64748b; margin-top: 25px;">الختم والتوقيع</div>
          </div>
        </div>
      </div>
    `;

    renderAndPrintDocument(html, {
      documentTitle: `كشف_عمولة_${rep.code}_${rep.name.replace(/\s+/g, '_')}`,
      pageSize: 'A4',
    });
  };

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  const handleToggleDefaultStartup = () => {
    try {
      if (isDefaultStartup) {
        localStorage.setItem('erp_default_startup_tab', 'overview');
        setIsDefaultStartup(false);
        showFeedback('success', 'تم تعيين «لوحة التحكم الرئيسية» كشاشة بداية النظام');
      } else {
        localStorage.setItem('erp_default_startup_tab', 'real_business');
        setIsDefaultStartup(true);
        showFeedback('success', 'تم تعيين «مركز عمليات الأعمال وبداية التشغيل» كشاشة بداية النظام الافتراضية ✅');
      }
    } catch {}
  };

  // Initial Load
  useEffect(() => {
    fetchMasterData();
    fetchDashboard();
    fetchPeriods();
    fetchOpeningBalances();
    fetchExpenses();
    fetchReconciliations();
    fetchReturns();
    fetchDocuments();
    fetchRepsLiveData();

    const handleWiped = () => {
      setSalesReps([]);
      try {
        localStorage.setItem('erp_sales_reps_v1', '[]');
        localStorage.setItem('erp_sales_reps', '[]');
      } catch {}
      setOpeningBalances([]);
      setExpenses([]);
      setSalesReturns([]);
      setPurchaseReturns([]);
      setDocumentsList([]);
      setInvoicesList([]);
      setPaymentsList([]);
      setComprehensiveReport(null);
      fetchMasterData();
      fetchDashboard();
      fetchReconciliations();
      fetchReturns();
      fetchDocuments();
    };

    const handleLiveRefresh = () => {
      fetchMasterData();
      fetchDashboard();
      fetchOpeningBalances();
      fetchExpenses();
      fetchReturns();
      fetchRepsLiveData();
    };

    window.addEventListener('erp-demo-data-wiped', handleWiped);
    window.addEventListener('erp-inventory-updated', handleLiveRefresh);
    window.addEventListener('erp-customers-updated', handleLiveRefresh);
    window.addEventListener('erp-suppliers-updated', handleLiveRefresh);
    window.addEventListener('erp-invoices-updated', handleLiveRefresh);
    window.addEventListener('erp-purchases-updated', handleLiveRefresh);
    window.addEventListener('erp-payments-updated', handleLiveRefresh);
    window.addEventListener('erp-expenses-updated', handleLiveRefresh);
    window.addEventListener('erp-data-updated', handleLiveRefresh);
    return () => {
      window.removeEventListener('erp-demo-data-wiped', handleWiped);
      window.removeEventListener('erp-inventory-updated', handleLiveRefresh);
      window.removeEventListener('erp-customers-updated', handleLiveRefresh);
      window.removeEventListener('erp-suppliers-updated', handleLiveRefresh);
      window.removeEventListener('erp-invoices-updated', handleLiveRefresh);
      window.removeEventListener('erp-purchases-updated', handleLiveRefresh);
      window.removeEventListener('erp-payments-updated', handleLiveRefresh);
      window.removeEventListener('erp-expenses-updated', handleLiveRefresh);
      window.removeEventListener('erp-data-updated', handleLiveRefresh);
    };
  }, [token]);

  const fetchMasterData = async () => {
    try {
      const [cashRes, bankRes, custRes, suppRes, prodRes, modeRes] = await Promise.all([
        safeFetchJson('/api/v1/business/cash-accounts', { headers }),
        safeFetchJson('/api/v1/business/bank-accounts', { headers }),
        safeFetchJson('/api/v1/customers?limit=100', { headers }),
        safeFetchJson('/api/v1/suppliers?limit=100', { headers }),
        safeFetchJson('/api/v1/products?limit=100', { headers }),
        safeFetchJson('/api/v1/business/data-mode', { headers })
      ]);

      const extract = (res: any): any[] => {
        if (!res || !res.ok) return [];
        const d = res.data;
        if (Array.isArray(d)) return d;
        if (Array.isArray(d?.data)) return d.data;
        if (Array.isArray(d?.rows)) return d.rows;
        if (d && typeof d === 'object') {
          for (const key of ['customers', 'suppliers', 'products', 'accounts', 'items']) {
            if (Array.isArray(d[key])) return d[key];
            if (Array.isArray(d.data?.[key])) return d.data[key];
          }
        }
        return [];
      };

      setCashAccounts(extract(cashRes));
      setBankAccounts(extract(bankRes));
      setCustomersList(extract(custRes));
      setSuppliersList(extract(suppRes));
      setProductsList(extract(prodRes));
      if (modeRes.ok && modeRes.data) {
        setDataMode(modeRes.data.data?.dataMode || modeRes.data.dataMode || 'PRODUCTION');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchOpeningBalances = async () => {
    try {
      const res = await safeFetchJson('/api/v1/business/opening-balances', { headers });
      if (res.ok && (res.data?.success || res.success)) {
        const list = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
            ? res.data
            : [];
        setOpeningBalances(list);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchExpenses = async () => {
    try {
      const [bizRes, expRes] = await Promise.all([
        safeFetchJson('/api/v1/business/expenses', { headers }).catch(() => ({ ok: false, data: null })),
        safeFetchJson('/api/v1/expenses', { headers }).catch(() => ({ ok: false, data: null })),
      ]);

      const extractExp = (r: any): any[] => {
        if (!r || !r.ok) return [];
        const d = r.data;
        if (Array.isArray(d)) return d;
        if (Array.isArray(d?.data)) return d.data;
        if (Array.isArray(d?.expenses)) return d.expenses;
        if (Array.isArray(d?.data?.expenses)) return d.data.expenses;
        return [];
      };

      const merged = new Map<string, any>();
      [...extractExp(bizRes), ...extractExp(expRes)].forEach((item: any) => {
        const key = String(item.id || item.expenseNumber || item.voucher_number || Math.random());
        if (!merged.has(key)) merged.set(key, item);
      });

      setExpenses(Array.from(merged.values()));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const [dashRes, compRes] = await Promise.all([
        safeFetchJson('/api/v1/business/dashboard', { headers }).catch(() => ({ ok: false, data: null, error: undefined })),
        safeFetchJson('/api/v1/reports/comprehensive', { headers }).catch(() => ({ ok: false, data: null })),
      ]);

      const dashData = dashRes.ok && dashRes.data?.success ? dashRes.data.data : (dashRes.ok && dashRes.data ? dashRes.data : null);
      const compRaw = compRes.ok ? (compRes.data?.data || compRes.data) : null;
      if (compRaw) setComprehensiveReport(compRaw);

      const isClean =
        typeof window !== 'undefined' &&
        (localStorage.getItem('erp_clean_production_mode_v1') === 'true' ||
          localStorage.getItem('erp_sample_data_cleaned') === 'true');

      const cashBal = Number(compRaw?.cashBalance ?? compRaw?.balances?.cashBalance ?? dashData?.cashBalance ?? 0);
      const bankBal = Number(compRaw?.bankBalance ?? compRaw?.balances?.bankBalance ?? dashData?.bankBalance ?? 0);
      const walletBal = Number(compRaw?.walletBalance ?? compRaw?.balances?.walletBalance ?? dashData?.walletBalance ?? 0);
      const receivablesBal = Number(compRaw?.receivables ?? compRaw?.balances?.totalReceivables ?? dashData?.receivables ?? 0);
      const payablesBal = Number(compRaw?.payables ?? compRaw?.balances?.totalPayables ?? dashData?.payables ?? 0);
      const invVal = Number(compRaw?.inventoryValuation ?? compRaw?.balances?.inventoryValue ?? dashData?.inventoryValuation ?? 0);
      const tbDiff = Number(compRaw?.trialBalance?.difference ?? 0);
      const isGlBalanced = compRaw?.trialBalance?.isBalanced !== undefined
        ? Boolean(compRaw.trialBalance.isBalanced)
        : Math.abs(tbDiff) <= 0.01;

      if (dashData || compRaw) {
        setOperatingData({
          todaySales: Number(dashData?.todaySales ?? 0),
          todayCollections: Number(dashData?.todayCollections ?? 0),
          todayPurchases: Number(dashData?.todayPurchases ?? 0),
          todayPayments: Number(dashData?.todayPayments ?? 0),
          todayExpenses: Number(dashData?.todayExpenses ?? 0),
          cashBalance: isClean && cashBal === 0 ? 0 : cashBal,
          bankBalance: isClean && bankBal === 0 ? 0 : bankBal,
          walletBalance: isClean && walletBal === 0 ? 0 : walletBal,
          receivables: receivablesBal,
          payables: payablesBal,
          inventoryValuation: invVal,
          netCashFlow: Number(dashData?.netCashFlow ?? (Number(dashData?.todayCollections ?? 0) - Number(dashData?.todayPayments ?? 0) - Number(dashData?.todayExpenses ?? 0))),
          lowStockCount: Number(dashData?.lowStockCount ?? compRaw?.counts?.lowStockCount ?? 0),
          openReconciliationIssues: Number(dashData?.openReconciliationIssues ?? 0),
          glBalanced: isGlBalanced,
          trialBalanceDifference: tbDiff,
        });
      } else if ((dashRes as any).error) {
        showFeedback('error', (dashRes as any).error);
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPeriods = async () => {
    try {
      const res = await safeFetchJson('/api/v1/business/periods', { headers });
      if (res.ok && res.data?.success) {
        setPeriods(res.data.data || []);
        if (res.data.data?.length > 0 && !activePeriodId) {
          setActivePeriodId(res.data.data[0].id);
          fetchChecklist(res.data.data[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchChecklist = async (periodId: string) => {
    try {
      const res = await safeFetchJson(`/api/v1/business/month-end-checklist/${periodId}`, { headers });
      if (res.ok && res.data?.success) setChecklist(res.data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReconciliations = async () => {
    try {
      setLoading(true);
      const res = await safeFetchJson('/api/v1/business/reconciliations', { headers });
      if (res.ok && res.data?.success) setReconciliations(res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const runFullReconciliation = async () => {
    try {
      setReconRunning(true);
      const res = await safeFetchJson('/api/v1/business/reconciliations/run', { method: 'POST', headers });
      if (res.ok && res.data?.success) {
        showFeedback('success', `تم الفحص بنجاح: تم تدقيق ${res.data.data?.totalChecks} حركة واكتشاف ${res.data.data?.discrepanciesCount} فارق`);
        fetchReconciliations();
      } else {
        showFeedback('error', res.error || res.data?.message || 'فشل تشغيل المطابقة');
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    } finally {
      setReconRunning(false);
    }
  };

  // Preview Import CSV
  const handlePreviewImport = async () => {
    if (!importCsvText.trim()) {
      showFeedback('error', 'يرجى إدخال أو لصق محتوى ملف البيانات بتنسيق CSV');
      return;
    }

    try {
      setLoading(true);
      const res = await safeFetchJson('/api/v1/business/import/preview', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          entityType: importEntityType,
          fileName: importFileName,
          content: importCsvText,
          idempotencyKey: `IMP-${Date.now()}`
        })
      });

      if (res.ok && res.data?.success) {
        setImportPreview(res.data.data);
        showFeedback('success', `تم تحليل الملف: ${res.data.data.validRows} صف صالح، ${res.data.data.invalidRows} خطأ`);
      } else {
        showFeedback('error', res.error || res.data?.message || 'فشل استعراض الاستيراد');
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    } finally {
      setLoading(false);
    }
  };

  // Commit Import
  const handleCommitImport = async () => {
    if (!importPreview?.jobId) return;

    try {
      setImportCommitting(true);
      const res = await safeFetchJson('/api/v1/business/import/commit', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          jobId: importPreview.jobId
        })
      });

      if (res.ok && res.data?.success) {
        showFeedback('success', `تم اعتماد وترحيل ${res.data.data.importedCount} سجل بنجاح في النظام مع التوازن المحاسبي!`);
        setImportPreview(null);
        setImportCsvText('');
        fetchMasterData();
        fetchDashboard();
        fetchOpeningBalances();
        fetchReconciliations();
        try {
          window.dispatchEvent(new Event('erp-inventory-updated'));
          window.dispatchEvent(new Event('erp-customers-updated'));
          window.dispatchEvent(new Event('erp-suppliers-updated'));
          window.dispatchEvent(new Event('erp-data-updated'));
        } catch {}
      } else {
        showFeedback('error', res.error || res.data?.message || 'فشل ترحيل الاستيراد');
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    } finally {
      setImportCommitting(false);
    }
  };

  // Post Opening Balance
  const handlePostOpeningBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOpBal.amount || parseFloat(newOpBal.amount) <= 0) {
      showFeedback('error', 'المبلغ يجب أن يكون أكبر من الصفر');
      return;
    }

    try {
      setLoading(true);
      const res = await safeFetchJson('/api/v1/business/opening-balances', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          balanceType: newOpBal.balanceType,
          entityType: newOpBal.balanceType === 'CUSTOMER' ? 'CUSTOMERS' : newOpBal.balanceType === 'SUPPLIER' ? 'SUPPLIERS' : 'ACCOUNTS',
          entityId: newOpBal.entityId || undefined,
          amount: parseFloat(newOpBal.amount),
          entrySide: newOpBal.entrySide,
          accountingDate: newOpBal.accountingDate,
          referenceNo: newOpBal.referenceNo,
          notes: newOpBal.notes
        })
      });

      if (res.ok && (res.data?.success || res.success)) {
        showFeedback('success', 'تم ترحيل القيد الافتتاحي وتحديث رصيد الحساب ودفتر الأستاذ العام بنجاح');
        setNewOpBal({
          balanceType: 'CUSTOMER',
          entityId: '',
          amount: '',
          entrySide: 'DEBIT',
          accountingDate: new Date().toISOString().split('T')[0],
          referenceNo: '',
          notes: ''
        });
        await Promise.all([fetchOpeningBalances(), fetchMasterData(), fetchDashboard(), fetchReconciliations()]);
        try {
          window.dispatchEvent(new Event('erp-inventory-updated'));
          window.dispatchEvent(new Event('erp-customers-updated'));
          window.dispatchEvent(new Event('erp-suppliers-updated'));
          window.dispatchEvent(new Event('erp-payments-updated'));
          window.dispatchEvent(new Event('erp-ledger-updated'));
          window.dispatchEvent(new Event('erp-accounts-updated'));
          window.dispatchEvent(new Event('erp-data-updated'));
          window.dispatchEvent(new Event('storage'));
        } catch {}
      } else {
        showFeedback('error', res.error || res.data?.message || 'فشل ترحيل الرصيد الافتتاحي');
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    } finally {
      setLoading(false);
    }
  };

  // Record Expense
  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.amount || parseFloat(newExpense.amount) <= 0) {
      showFeedback('error', 'المبلغ يجب أن يكون أكبر من الصفر');
      return;
    }

    try {
      setLoading(true);
      const res = await safeFetchJson('/api/v1/business/expenses', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          category: newExpense.category,
          description: newExpense.description,
          amount: parseFloat(newExpense.amount),
          taxAmount: parseFloat(newExpense.taxAmount || '0'),
          paymentMethod: newExpense.paymentMethod,
          paymentAccountId: newExpense.paymentAccountId || undefined,
          expenseDate: newExpense.expenseDate,
          reference: newExpense.reference,
          notes: newExpense.notes
        })
      });

      if (res.ok && res.data?.success) {
        showFeedback('success', `تم تسجيل المصروف (${res.data.data?.expenseNumber || 'معتمد'}) وترحيل القيد المحاسبي بنجاح`);
        setNewExpense({
          category: 'إيجار ومرافق',
          description: '',
          amount: '',
          taxAmount: '0',
          paymentMethod: 'CASH',
          paymentAccountId: '',
          expenseDate: new Date().toISOString().split('T')[0],
          reference: '',
          notes: ''
        });
        await Promise.all([fetchExpenses(), fetchMasterData(), fetchDashboard()]);
        try {
          window.dispatchEvent(new Event('erp-expenses-updated'));
          window.dispatchEvent(new Event('erp-payments-updated'));
          window.dispatchEvent(new Event('erp-data-updated'));
          window.dispatchEvent(new Event('storage'));
        } catch {}
      } else {
        showFeedback('error', res.error || res.data?.message || 'فشل تسجيل المصروف');
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    } finally {
      setLoading(false);
    }
  };

  // Perform Bank Reconciliation
  const handleBankReconcile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await safeFetchJson('/api/v1/business/reconciliations/bank', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          accountType: bankReconData.accountType,
          accountId: bankReconData.accountId,
          statementStartDate: bankReconData.statementStartDate,
          statementEndDate: bankReconData.statementEndDate,
          statementOpeningBalance: parseFloat(bankReconData.statementOpeningBalance || '0'),
          statementClosingBalance: parseFloat(bankReconData.statementClosingBalance || '0'),
          unpresentedChecks: parseFloat(bankReconData.unpresentedChecks || '0'),
          depositsInTransit: parseFloat(bankReconData.depositsInTransit || '0'),
          bankCharges: parseFloat(bankReconData.bankCharges || '0'),
          interestEarned: parseFloat(bankReconData.interestEarned || '0'),
          notes: bankReconData.notes
        })
      });

      if (res.ok && res.data?.success) {
        setBankReconResult(res.data.data);
        showFeedback('success', 'تمت مطابقة كشف الحساب البنكي وتسجيل التسويات اللازمة بنجاح');
      } else {
        showFeedback('error', res.error || res.data?.message || 'فشل إجراء مطابقة البنك');
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Returns (Sales & Purchase)
  const fetchReturns = async () => {
    try {
      const res = await safeFetchJson('/api/v1/business/returns', { headers });
      if (res.ok && res.data?.success) {
        const d = res.data.data || {};
        setSalesReturns(Array.isArray(d.salesReturns) ? d.salesReturns : []);
        setPurchaseReturns(Array.isArray(d.purchaseReturns) ? d.purchaseReturns : []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Create Return (Sales or Purchase)
  const handleCreateReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    const firstItem = newReturn.items[0];
    if (!firstItem?.productId) {
      showFeedback('error', 'يرجى اختيار الصنف المسترجع أولاً');
      return;
    }
    const qty = Math.max(0, parseFloat(firstItem.quantity || '0'));
    const unitPrice = Math.max(0, parseFloat(firstItem.priceOrCost || '0'));
    if (qty <= 0 || unitPrice <= 0) {
      showFeedback('error', 'يرجى إدخال كمية وسعر صحيحين للمردود');
      return;
    }
    const totalAmount = Math.round(qty * unitPrice * 100) / 100;

    try {
      setLoading(true);
      const res = await safeFetchJson('/api/v1/business/returns', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: newReturn.type,
          customerId: newReturn.type === 'SALES' ? newReturn.customerId || undefined : undefined,
          supplierId: newReturn.type === 'PURCHASE' ? newReturn.supplierId || undefined : undefined,
          refundMethod: newReturn.refundMethod,
          reason: newReturn.reason || (newReturn.type === 'SALES' ? 'مردود مبيعات' : 'مردود مشتريات'),
          totalAmount,
          items: [
            {
              productId: firstItem.productId,
              quantity: qty,
              priceOrCost: unitPrice,
            },
          ],
        }),
      });

      if (res.ok && res.data?.success) {
        const retNum = res.data.data?.returnNumber || 'معتمد';
        showFeedback(
          'success',
          `تم اعتماد وترحيل ${newReturn.type === 'SALES' ? 'مردود المبيعات' : 'مردود المشتريات'} (#${retNum}) وتحديث المخزون ودفتر الأستاذ بنجاح`
        );
        setNewReturn({
          type: newReturn.type,
          customerId: '',
          supplierId: '',
          refundMethod: 'CREDIT_NOTE',
          reason: '',
          items: [{ productId: '', quantity: '1', priceOrCost: '0' }],
        });
        await Promise.all([fetchReturns(), fetchMasterData(), fetchDashboard(), fetchReconciliations()]);
        try {
          window.dispatchEvent(new Event('erp-inventory-updated'));
          window.dispatchEvent(new Event('erp-customers-updated'));
          window.dispatchEvent(new Event('erp-suppliers-updated'));
          window.dispatchEvent(new Event('erp-invoices-updated'));
          window.dispatchEvent(new Event('erp-purchases-updated'));
          window.dispatchEvent(new Event('erp-payments-updated'));
          window.dispatchEvent(new Event('erp-data-updated'));
          window.dispatchEvent(new Event('storage'));
        } catch {}
      } else {
        showFeedback('error', res.error || res.data?.message || 'فشل اعتماد المردود');
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    } finally {
      setLoading(false);
    }
  };

  // Period Creation & Close/Reopen
  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPeriodForm.name.trim() || !newPeriodForm.startDate || !newPeriodForm.endDate) {
      showFeedback('error', 'يرجى إدخال اسم الفترة وتاريخ البداية والنهاية');
      return;
    }
    try {
      setLoading(true);
      const res = await safeFetchJson('/api/v1/business/periods', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: newPeriodForm.name.trim(),
          start_date: newPeriodForm.startDate,
          end_date: newPeriodForm.endDate,
        }),
      });
      if (res.ok && res.data?.success) {
        const created = res.data.data;
        showFeedback('success', `تم فتح الفترة المحاسبية «${created?.name || newPeriodForm.name}» بنجاح`);
        setIsNewPeriodOpen(false);
        await fetchPeriods();
        if (created?.id) {
          setActivePeriodId(created.id);
          fetchChecklist(created.id);
        }
      } else {
        showFeedback('error', res.error || res.data?.message || 'فشل فتح الفترة المحاسبية');
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePeriodStatus = async (period: any, action: 'CLOSE' | 'OPEN') => {
    try {
      setLoading(true);
      const res = await safeFetchJson('/api/v1/business/periods', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          periodId: period.id,
          action,
        }),
      });
      if (res.ok && res.data?.success) {
        setConfirmClosePeriodId(null);
        showFeedback(
          'success',
          action === 'CLOSE'
            ? `تم إغلاق الفترة «${period.name}» وترحيل الأرباح والاعتماد بنجاح ✅`
            : `تم إعادة فتح الفترة «${period.name}» بنجاح`
        );
        await fetchPeriods();
        await fetchDashboard();
      } else {
        showFeedback('error', res.error || res.data?.message || 'فشل تحديث حالة الفترة');
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    } finally {
      setLoading(false);
    }
  };

  // Document Vault Handlers
  const fetchDocuments = async () => {
    try {
      const res = await safeFetchJson('/api/v1/business/documents', { headers });
      if (res.ok && res.data?.success) {
        setDocumentsList(Array.isArray(res.data.data) ? res.data.data : []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDocFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showFeedback('error', 'الحد الأقصى لحجم المستند المسموح به هو 10 ميجابايت');
      return;
    }
    setDocForm((prev) => ({
      ...prev,
      title: prev.title || file.name.replace(/\.[^/.]+$/, ''),
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
      dataUrl: '',
    }));

    if (file.size <= 2 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        setDocForm((prev) => ({ ...prev, dataUrl: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docForm.title.trim()) {
      showFeedback('error', 'يرجى إدخال عنوان المستند');
      return;
    }
    try {
      setLoading(true);
      const res = await safeFetchJson('/api/v1/business/documents', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: docForm.title.trim(),
          category: docForm.category,
          entityType: docForm.category,
          entityId: docForm.referenceNo.trim() || null,
          referenceNo: docForm.referenceNo.trim(),
          fileName: docForm.fileName || `${docForm.title.trim()}.pdf`,
          fileSize: docForm.fileSize || 1024,
          mimeType: docForm.mimeType || 'application/pdf',
          dataUrl: docForm.dataUrl || '',
          notes: docForm.notes.trim(),
        }),
      });

      if (res.ok && res.data?.success) {
        showFeedback('success', 'تم أرشفة وحفظ المستند في خزينة المستندات الرسمية بنجاح');
        setDocForm({
          title: '',
          category: 'عقد',
          referenceNo: '',
          notes: '',
          fileName: '',
          fileSize: 0,
          mimeType: '',
          dataUrl: '',
        });
        await fetchDocuments();
      } else {
        showFeedback('error', res.error || res.data?.message || 'فشل حفظ المستند');
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      setLoading(true);
      const res = await safeFetchJson(`/api/v1/business/documents/${docId}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok && res.data?.success) {
        if (previewDoc?.id === docId) setPreviewDoc(null);
        showFeedback('success', 'تم حذف المستند من الخزينة بنجاح');
        await fetchDocuments();
      } else {
        showFeedback('error', res.error || 'فشل حذف المستند');
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintDocument = (doc: any) => {
    const isImage = String(doc.mime_type || '').startsWith('image/') && doc.data_url;
    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; color: #0f172a; padding: 24px; max-width: 800px; margin: auto;">
        <div style="border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h1 style="margin: 0; font-size: 18px; color: #059669;">وثيقة رسمية — خزينة المستندات والمرفقات</h1>
            <p style="margin: 4px 0 0; font-size: 12px; color: #64748b;">Business Documents Vault Archive</p>
          </div>
          <div style="text-align: left; font-family: monospace; font-size: 11px;">
            <div>رقم المرجع: ${doc.reference_no || doc.entity_id || doc.id}</div>
            <div>تاريخ الأرشفة: ${new Date(doc.uploaded_at || Date.now()).toLocaleDateString('ar-YE')}</div>
          </div>
        </div>
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px; margin-bottom: 16px; font-size: 12px; line-height: 1.8;">
          <div><strong>عنوان المستند:</strong> ${doc.title}</div>
          <div><strong>التصنيف:</strong> ${doc.category}</div>
          <div><strong>اسم الملف المرفق:</strong> <span style="font-family: monospace;">${doc.file_name}</span></div>
          <div><strong>حجم الملف:</strong> ${formatFileSize(doc.file_size)}</div>
          ${doc.notes ? `<div><strong>ملاحظات وتفاصيل:</strong> ${doc.notes}</div>` : ''}
        </div>
        ${
          isImage
            ? `<div style="text-align: center; border: 1px solid #e2e8f0; padding: 12px; border-radius: 10px;">
                 <img src="${doc.data_url}" style="max-width: 100%; max-height: 550px; object-fit: contain;" />
               </div>`
            : `<div style="padding: 20px; border: 1px dashed #94a3b8; border-radius: 10px; text-align: center; color: #475569; font-size: 12px;">
                 تم التحقق من أرشفة الملف الرقمي (${doc.file_name}) داخل خزينة النظام.
               </div>`
        }
      </div>
    `;
    renderAndPrintDocument(html, {
      documentTitle: doc.title || 'مستند_رسمي',
      pageSize: 'A4',
    });
  };

  const formatFileSize = (bytes: number) => {
    const b = Number(bytes || 0);
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Sales Reps Live Invoices & Payments Fetcher + Remittance Handler
  const fetchRepsLiveData = async () => {
    try {
      const [invRes, pmtRes] = await Promise.all([
        safeFetchJson('/api/v1/invoices?limit=200', { headers }).catch(() => ({ ok: false, data: null })),
        safeFetchJson('/api/v1/payments?limit=200', { headers }).catch(() => ({ ok: false, data: null })),
      ]);

      const extractArr = (r: any, keys: string[]): any[] => {
        if (!r || !r.ok) return [];
        const d = r.data;
        if (Array.isArray(d)) return d;
        if (Array.isArray(d?.data)) return d.data;
        for (const k of keys) {
          if (Array.isArray(d?.[k])) return d[k];
          if (Array.isArray(d?.data?.[k])) return d.data[k];
        }
        return [];
      };

      setInvoicesList(extractArr(invRes, ['invoices', 'rows', 'items']));
      setPaymentsList(extractArr(pmtRes, ['payments', 'vouchers', 'rows', 'items']));
    } catch (e) {
      console.error(e);
    }
  };

  const getRepLiveMetrics = (rep: SalesRep) => {
    const repNameLower = String(rep.name || '').trim().toLowerCase();
    const repCodeLower = String(rep.code || '').trim().toLowerCase();

    const matchesRep = (obj: any) => {
      if (!repNameLower && !repCodeLower) return false;
      const fields = [
        obj?.sales_rep,
        obj?.salesRep,
        obj?.rep_name,
        obj?.repName,
        obj?.rep_code,
        obj?.repCode,
        obj?.receivedBy,
        obj?.received_by,
        obj?.party_name,
        obj?.partyName,
        obj?.description,
        obj?.notes,
      ]
        .filter(Boolean)
        .map((v) => String(v).toLowerCase());
      return fields.some((f) => (repNameLower && f.includes(repNameLower)) || (repCodeLower && f.includes(repCodeLower)));
    };

    const matchedInvoices = invoicesList.filter((inv) => inv.status !== 'CANCELLED' && matchesRep(inv));
    const matchedReceipts = paymentsList.filter(
      (pmt) =>
        pmt.status !== 'CANCELLED' &&
        (pmt.voucher_type === 'RECEIPT' || pmt.type === 'CUSTOMER_PAYMENT' || pmt.payment_type === 'IN') &&
        matchesRep(pmt)
    );

    const liveInvoiceSales = matchedInvoices.reduce((s, inv) => s + Number(inv.total || inv.grandTotal || inv.total_amount || 0), 0);
    const liveReceiptCash = matchedReceipts.reduce((s, pmt) => s + Number(pmt.amount || 0), 0);

    const effectiveSales = Math.max(rep.achievedSales, liveInvoiceSales);
    const effectiveCollected = Math.max(rep.collectedCash, liveReceiptCash);
    const effectiveCommission = Math.round(effectiveSales * (rep.commissionRate / 100));

    return {
      invoiceCount: matchedInvoices.length,
      receiptCount: matchedReceipts.length,
      liveInvoiceSales,
      liveReceiptCash,
      effectiveSales,
      effectiveCollected,
      effectiveCommission,
    };
  };

  const handleOpenRemitModal = (rep: SalesRep) => {
    setRemittingRep(rep);
    setRemitForm({
      amount: String(rep.pendingReceivables > 0 ? rep.pendingReceivables : ''),
      paymentMethod: 'CASH',
      notes: `توريد تحصيل مبيعات مندوب ${rep.name} (${rep.code})`,
    });
  };

  const handleSubmitRemit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remittingRep) return;
    const amt = parseFloat(remitForm.amount || '0');
    if (isNaN(amt) || amt <= 0) {
      showFeedback('error', 'يرجى إدخال مبلغ توريد صحيح أكبر من الصفر');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    try {
      setLoading(true);
      const res = await safeFetchJson('/api/v1/payments', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: 'CUSTOMER_PAYMENT',
          voucher_type: 'RECEIPT',
          payment_type: 'IN',
          party_type: 'OTHER',
          party_name: `تحصيل مندوب: ${remittingRep.name}`,
          amount: amt,
          payment_method: remitForm.paymentMethod,
          date: today,
          payment_date: today,
          description: remitForm.notes || `توريد تحصيل مبيعات مندوب ${remittingRep.name} (${remittingRep.code})`,
          notes: remitForm.notes || `توريد تحصيل مبيعات مندوب ${remittingRep.name} (${remittingRep.code})`,
          sales_rep: remittingRep.name,
          rep_code: remittingRep.code,
        }),
      });

      if (res.ok && (res.data?.success !== false)) {
        const updatedReps = salesReps.map((r) =>
          r.id === remittingRep.id
            ? {
                ...r,
                collectedCash: Math.round((r.collectedCash + amt) * 100) / 100,
                pendingReceivables: Math.max(0, Math.round((r.pendingReceivables - amt) * 100) / 100),
                lastActivityDate: today,
              }
            : r
        );
        setSalesReps(updatedReps);
        try {
          localStorage.setItem('erp_sales_reps_v1', JSON.stringify(updatedReps));
          localStorage.setItem('erp_sales_reps', JSON.stringify(updatedReps));
        } catch {}

        setRemittingRep(null);
        showFeedback('success', `تم توريد تحصيل بقيمة ${formatNumber(amt)} ${currSym} من المندوب «${remittingRep.name}» وإصدار سند قبض في الخزينة ✅`);
        await Promise.all([fetchDashboard(), fetchRepsLiveData()]);
        try {
          window.dispatchEvent(new Event('erp-payments-updated'));
          window.dispatchEvent(new Event('erp-sales-reps-updated'));
          window.dispatchEvent(new Event('erp-data-updated'));
          window.dispatchEvent(new Event('storage'));
        } catch {}
      } else {
        showFeedback('error', res.error || res.data?.message || 'فشل تسجيل سند توريد التحصيل');
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    } finally {
      setLoading(false);
    }
  };

  // Switch Data Mode (PRODUCTION / DEMO)
  const handleSwitchDataMode = async (targetMode: 'PRODUCTION' | 'DEMO') => {
    try {
      setLoading(true);
      const res = await safeFetchJson('/api/v1/business/data-mode', {
        method: 'POST',
        headers,
        body: JSON.stringify({ mode: targetMode, dataMode: targetMode }),
      });
      if (res.ok && res.data?.success) {
        setDataMode(targetMode);
        try {
          localStorage.setItem('erp_clean_production_mode_v1', targetMode === 'PRODUCTION' ? 'true' : 'false');
        } catch {}
        showFeedback(
          'success',
          targetMode === 'PRODUCTION'
            ? 'تم التحويل إلى وضع «البيانات الإنتاجية الحقيقية» — جميع الأرصدة والعمليات تعكس الواقع الفعلي للشركة'
            : 'تم التحويل إلى وضع «البيانات التجريبية» لأغراض التدريب والمعاينة'
        );
        await Promise.all([fetchDashboard(), fetchMasterData()]);
      } else {
        showFeedback('error', res.error || res.data?.message || 'فشل تغيير وضع البيانات');
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    } finally {
      setLoading(false);
    }
  };

  // Checklist Item Toggle
  const handleToggleChecklist = async (itemId: string, currentVal: boolean) => {
    if (!activePeriodId) return;
    try {
      const res = await safeFetchJson(`/api/v1/business/month-end-checklist/${activePeriodId}/item`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ itemId, completed: !currentVal })
      });

      if (res.ok && res.data?.success) {
        fetchChecklist(activePeriodId);
      } else {
        showFeedback('error', res.error || res.data?.message || 'فشل تحديث القائمة');
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    }
  };

  // Global Search Handler
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    try {
      setLoading(true);
      const res = await safeFetchJson(`/api/v1/business/search?q=${encodeURIComponent(searchQuery)}`, { headers });
      if (res.ok && res.data?.success) setSearchResults(res.data.data);
    } catch (e: any) {
      showFeedback('error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-right text-[var(--md-on-surface)] font-sans" dir="rtl">
      {/* Top Banner & Title */}
      <div className="m3-card p-5 sm:p-6 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border border-[var(--md-primary)]/25 flex items-center justify-center shrink-0">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-[var(--md-on-surface)] tracking-tight flex flex-wrap items-center gap-2">
                  <span>مركز عمليات الأعمال وبداية التشغيل</span>
                  <span className="m3-badge m3-badge-primary text-[10px] font-mono">
                    Operations Hub
                  </span>
                  <span className="m3-badge m3-badge-secondary text-[10px] font-mono">
                    {currCode} ({currSym})
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-[var(--md-on-surface-variant)] font-medium">
                  شاشة التأسيس اليومية، الاستيراد الآمن، الأرصدة الافتتاحية، المطابقة البنكية ومراقبة دفتر الأستاذ
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] px-3 py-2 rounded-xl text-xs font-mono">
              <span className={`w-2 h-2 rounded-full ${dataMode === 'PRODUCTION' ? 'bg-[var(--md-success)]' : 'bg-[var(--md-warning)]'}`} />
              <span className="text-[var(--md-on-surface-variant)]">وضع البيانات:</span>
              <span className="font-bold text-[var(--md-on-surface)]">{dataMode === 'PRODUCTION' ? 'إنتاجي حقيقي' : 'تجريبي'}</span>
            </div>

            <button
              type="button"
              onClick={handleToggleDefaultStartup}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors border cursor-pointer ${
                isDefaultStartup
                  ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border-[var(--md-primary)]/30 hover:opacity-90'
                  : 'm3-btn-outlined'
              }`}
              title="تحديد ما إذا كانت هذه الشاشة تفتح تلقائياً عند تشغيل النظام"
            >
              <Home className="w-3.5 h-3.5" />
              <span>{isDefaultStartup ? 'شاشة بداية النظام (مفعّل ✓)' : 'تعيين كشاشة بداية النظام'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                fetchDashboard();
                fetchMasterData();
                fetchOpeningBalances();
                fetchExpenses();
                fetchReconciliations();
              }}
              className="m3-btn-outlined flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[var(--md-primary-text)]' : ''}`} />
              <span>تحديث</span>
            </button>
          </div>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
            feedback.type === 'success'
              ? 'bg-[var(--md-success-container)] border-[var(--md-success)]/35 text-[var(--md-on-success-container)]'
              : 'bg-[var(--md-error-container)] border-[var(--md-error)]/35 text-[var(--md-on-error-container)]'
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-[var(--md-success)] shrink-0" /> : <AlertCircle className="w-4 h-4 text-[var(--md-error)] shrink-0" />}
            <span>{feedback.message}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="text-xs opacity-75 hover:opacity-100 cursor-pointer font-bold">
            إغلاق
          </button>
        </div>
      )}

      {/* Navigation Subtabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-[var(--md-outline-variant)]">
        {[
          { id: 'dashboard', label: 'لوحة العمليات اليومية', icon: TrendingUp },
          { id: 'import', label: 'محرك الاستيراد الآمن (CSV/Excel)', icon: UploadCloud },
          { id: 'opening_balances', label: 'الأرصدة الافتتاحية', icon: Scale },
          { id: 'reconciliation', label: 'المطابقات والتسويات المالية', icon: ShieldCheck },
          { id: 'expenses', label: 'المصروفات التشغيلية', icon: DollarSign },
          { id: 'returns', label: 'المردودات (مبيعات ومشتريات)', icon: RotateCcw },
          { id: 'period_close', label: 'إغلاق الفترات والشهر', icon: Calendar },
          { id: 'documents', label: 'خزينة المستندات', icon: FileCheck },
          { id: 'sales_reps', label: 'إدارة مناديب التوزيع والعمولات', icon: Users },
          { id: 'search_mode', label: 'البحث الشامل ووضع البيانات', icon: Search }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveSubTab(tab.id as SubTab);
                if (tab.id === 'reconciliation') fetchReconciliations();
                if (tab.id === 'opening_balances') fetchOpeningBalances();
                if (tab.id === 'expenses') fetchExpenses();
                if (tab.id === 'returns') fetchReturns();
                if (tab.id === 'period_close') fetchPeriods();
                if (tab.id === 'documents') fetchDocuments();
                if (tab.id === 'sales_reps') fetchRepsLiveData();
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors border cursor-pointer ${
                isActive
                  ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)] border-[var(--md-primary)]'
                  : 'bg-[var(--md-surface-container-low)] text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container)] border-[var(--md-outline-variant)]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 1. SUBTAB: REAL OPERATING DASHBOARD & SYSTEM STARTUP WORKFLOW */}
      {/* ========================================================================= */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-6">
          {/* System Startup & Onboarding Workflow Bar */}
          <div className="m3-card p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--md-primary)]" />
                <h2 className="text-sm font-bold text-[var(--md-on-surface)]">
                  شريط خطوات بداية تشغيل النظام (System Startup & Onboarding Workflow)
                </h2>
              </div>
              <span className="text-[11px] text-[var(--md-on-surface-variant)] font-mono">
                5 خطوات متسلسلة لتجهيز التشغيل والانطلاق الكامل
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Step 1 */}
              <div className="bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] hover:border-[var(--md-primary)]/40 rounded-xl p-3.5 flex flex-col justify-between gap-3 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="m3-badge m3-badge-primary text-[10px] font-mono">
                      الخطوة 1
                    </span>
                    <Scale className="w-4 h-4 text-[var(--md-primary-text)]" />
                  </div>
                  <h3 className="text-xs font-bold text-[var(--md-on-surface)]">الأرصدة الافتتاحية ورأس المال</h3>
                  <p className="text-[11px] text-[var(--md-on-surface-variant)]">ترحيل الصناديق والبنوك والذمم ({openingBalances.length} سجل)</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSubTab('opening_balances');
                    fetchOpeningBalances();
                  }}
                  className="m3-btn-tonal w-full py-1.5 px-2.5 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>فتح الأرصدة الافتتاحية</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Step 2 */}
              <div className="bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] hover:border-[var(--md-info)]/40 rounded-xl p-3.5 flex flex-col justify-between gap-3 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="m3-badge m3-badge-info text-[10px] font-mono">
                      الخطوة 2
                    </span>
                    <Boxes className="w-4 h-4 text-[var(--md-info)]" />
                  </div>
                  <h3 className="text-xs font-bold text-[var(--md-on-surface)]">استيراد أو إضافة الأصناف والمخزون</h3>
                  <p className="text-[11px] text-[var(--md-on-surface-variant)] tabular-nums">المسجلة حالياً: {formatNumber(productsList.length)} صنف</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('import')}
                    className="flex-1 py-1.5 px-2 bg-[var(--md-info-container)] text-[var(--md-on-info-container)] border border-[var(--md-info)]/30 hover:opacity-90 rounded-lg text-[11px] font-bold transition-opacity cursor-pointer"
                  >
                    استيراد CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate && onNavigate('products')}
                    className="m3-btn-outlined flex-1 py-1.5 px-2 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>الأصناف</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] hover:border-[var(--md-warning)]/40 rounded-xl p-3.5 flex flex-col justify-between gap-3 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="m3-badge m3-badge-warning text-[10px] font-mono">
                      الخطوة 3
                    </span>
                    <Users className="w-4 h-4 text-[var(--md-warning)]" />
                  </div>
                  <h3 className="text-xs font-bold text-[var(--md-on-surface)]">تسجيل العملاء والموردين</h3>
                  <p className="text-[11px] text-[var(--md-on-surface-variant)] tabular-nums">
                    {formatNumber(customersList.length)} عميل • {formatNumber(suppliersList.length)} مورد
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onNavigate && onNavigate('customers')}
                    className="flex-1 py-1.5 px-2 bg-[var(--md-warning-container)] text-[var(--md-on-warning-container)] border border-[var(--md-warning)]/30 hover:opacity-90 rounded-lg text-[11px] font-bold transition-opacity flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>العملاء</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate && onNavigate('suppliers')}
                    className="m3-btn-outlined flex-1 py-1.5 px-2 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>الموردين</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Step 4 */}
              <div className="bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] hover:border-[var(--md-secondary)]/40 rounded-xl p-3.5 flex flex-col justify-between gap-3 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="m3-badge m3-badge-secondary text-[10px] font-mono">
                      الخطوة 4
                    </span>
                    <Receipt className="w-4 h-4 text-[var(--md-secondary)]" />
                  </div>
                  <h3 className="text-xs font-bold text-[var(--md-on-surface)]">إصدار الفواتير ونقاط البيع</h3>
                  <p className="text-[11px] text-[var(--md-on-surface-variant)]">البيع المباشر POS وفواتير المبيعات</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onNavigate && onNavigate('pos')}
                    className="flex-1 py-1.5 px-2 bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)] border border-[var(--md-secondary)]/30 hover:opacity-90 rounded-lg text-[11px] font-bold transition-opacity flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>POS</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate && onNavigate('invoices')}
                    className="m3-btn-outlined flex-1 py-1.5 px-2 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>الفواتير</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Step 5 */}
              <div className="bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] hover:border-[var(--md-primary)]/40 rounded-xl p-3.5 flex flex-col justify-between gap-3 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="m3-badge m3-badge-success text-[10px] font-mono">
                      الخطوة 5
                    </span>
                    <ShieldCheck className="w-4 h-4 text-[var(--md-success)]" />
                  </div>
                  <h3 className="text-xs font-bold text-[var(--md-on-surface)]">سندات الخزينة ومطابقة الأستاذ العام</h3>
                  <p className="text-[11px] text-[var(--md-on-surface-variant)]">تدقيق القيود والمطابقة المستمرة</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onNavigate && onNavigate('payments')}
                    className="flex-1 py-1.5 px-2 bg-[var(--md-success-container)] text-[var(--md-on-success-container)] border border-[var(--md-success)]/30 hover:opacity-90 rounded-lg text-[11px] font-bold transition-opacity flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>السندات</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate && onNavigate('ledger')}
                    className="m3-btn-outlined flex-1 py-1.5 px-2 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>الأستاذ العام</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 12 Live Operational KPI Cards matching KpiCardsGrid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--md-on-surface-variant)] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--md-primary)]" />
                <span>مؤشرات التشغيل اللحظية والأرصدة الحقيقية (12 Live Operational KPIs)</span>
              </h2>
              <span className="text-[11px] text-[var(--md-on-surface-variant)] font-mono font-medium">
                100% Synced with Comprehensive GL & Treasuries
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  id: 'today-sales',
                  title: 'مبيعات اليوم',
                  subtext: "Today's Gross Sales",
                  valueText: formatAmount(operatingData?.todaySales || 0),
                  unit: currSym,
                  icon: ArrowUpRight,
                  iconBg: 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border border-[var(--md-primary)]/25',
                  badge: (operatingData?.todaySales || 0) > 0 ? 'مبيعات نشطة اليوم' : 'بانتظار فواتير اليوم',
                  badgeClass: 'm3-badge m3-badge-success',
                  targetTab: 'invoices',
                },
                {
                  id: 'today-collections',
                  title: 'تحصيلات وسندات قبض اليوم',
                  subtext: "Today's Cash & Bank Receipts",
                  valueText: formatAmount(operatingData?.todayCollections || 0),
                  unit: currSym,
                  icon: Wallet,
                  iconBg: 'bg-[var(--md-info-container)] text-[var(--md-on-info-container)] border border-[var(--md-info)]/25',
                  badge: (operatingData?.todayCollections || 0) > 0 ? 'تدفق داخل للخزينة' : 'لا توجد تحصيلات اليوم',
                  badgeClass: 'm3-badge m3-badge-info',
                  targetTab: 'payments',
                },
                {
                  id: 'today-purchases',
                  title: 'مشتريات اليوم',
                  subtext: "Today's Purchase Invoices",
                  valueText: formatAmount(operatingData?.todayPurchases || 0),
                  unit: currSym,
                  icon: ArrowDownLeft,
                  iconBg: 'bg-[var(--md-warning-container)] text-[var(--md-on-warning-container)] border border-[var(--md-warning)]/25',
                  badge: (operatingData?.todayPurchases || 0) > 0 ? 'توريدات مخزنية اليوم' : 'لا توجد مشتريات اليوم',
                  badgeClass: 'm3-badge m3-badge-warning',
                  targetTab: 'purchase_invoices',
                },
                {
                  id: 'today-expenses',
                  title: 'مدفوعات ومصروفات اليوم',
                  subtext: "Today's Payments & Expenses",
                  valueText: formatAmount((operatingData?.todayPayments || 0) + (operatingData?.todayExpenses || 0)),
                  unit: currSym,
                  icon: DollarSign,
                  iconBg: 'bg-[var(--md-error-container)] text-[var(--md-on-error-container)] border border-[var(--md-error)]/25',
                  badge: ((operatingData?.todayPayments || 0) + (operatingData?.todayExpenses || 0)) > 0 ? 'منصرفات مسجلة' : 'لا توجد منصرفات اليوم',
                  badgeClass: 'm3-badge m3-badge-error',
                  targetTab: 'expenses',
                },
                {
                  id: 'cash-1101',
                  title: 'رصيد الصندوق النقدي (1101)',
                  subtext: 'Main Cash Treasury GL 1101',
                  valueText: formatAmount(operatingData?.cashBalance || 0),
                  unit: currSym,
                  icon: Coins,
                  iconBg: 'bg-[var(--md-success-container)] text-[var(--md-on-success-container)] border border-[var(--md-success)]/25',
                  badge: (operatingData?.cashBalance || 0) > 0 ? 'سيولة نقدية متاحة' : 'الرصيد 0',
                  badgeClass: 'm3-badge m3-badge-success',
                  targetTab: 'payments',
                },
                {
                  id: 'bank-1102',
                  title: 'أرصدة الحسابات البنكية (1102)',
                  subtext: 'Bank Accounts GL 1102',
                  valueText: formatAmount(operatingData?.bankBalance || 0),
                  unit: currSym,
                  icon: Landmark,
                  iconBg: 'bg-[var(--md-info-container)] text-[var(--md-on-info-container)] border border-[var(--md-info)]/25',
                  badge: (operatingData?.bankBalance || 0) > 0 ? 'أرصدة مصرفية متاحة' : 'الرصيد 0',
                  badgeClass: 'm3-badge m3-badge-info',
                  targetTab: 'payments',
                },
                {
                  id: 'wallet-1107',
                  title: 'المحافظ الإلكترونية والشبكات (1107)',
                  subtext: 'E-Wallets & POS Networks 1107',
                  valueText: formatAmount(operatingData?.walletBalance || 0),
                  unit: currSym,
                  icon: Smartphone,
                  iconBg: 'bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)] border border-[var(--md-secondary)]/25',
                  badge: (operatingData?.walletBalance || 0) > 0 ? 'محافظ نشطة' : 'الرصيد 0',
                  badgeClass: 'm3-badge m3-badge-secondary',
                  targetTab: 'payments',
                },
                {
                  id: 'receivables',
                  title: 'ذمم العملاء المدينة',
                  subtext: 'Accounts Receivable GL 1103',
                  valueText: formatAmount(operatingData?.receivables || 0),
                  unit: currSym,
                  icon: Users,
                  iconBg: 'bg-[var(--md-warning-container)] text-[var(--md-on-warning-container)] border border-[var(--md-warning)]/25',
                  badge: (operatingData?.receivables || 0) > 0 ? `${customersList.length} عميل مسجل` : 'لا توجد مديونيات',
                  badgeClass: 'm3-badge m3-badge-warning',
                  targetTab: 'customers',
                },
                {
                  id: 'payables',
                  title: 'مستحقات الموردين الدائنة',
                  subtext: 'Accounts Payable GL 2101',
                  valueText: formatAmount(operatingData?.payables || 0),
                  unit: currSym,
                  icon: Building2,
                  iconBg: 'bg-[var(--md-error-container)] text-[var(--md-on-error-container)] border border-[var(--md-error)]/25',
                  badge: (operatingData?.payables || 0) > 0 ? `${suppliersList.length} مورد مسجل` : 'لا توجد مستحقات',
                  badgeClass: 'm3-badge m3-badge-error',
                  targetTab: 'suppliers',
                },
                {
                  id: 'inventory-val',
                  title: 'تقييم المخزون الحالي',
                  subtext: 'Inventory Valuation GL 1104',
                  valueText: formatAmount(operatingData?.inventoryValuation || 0),
                  unit: currSym,
                  icon: Boxes,
                  iconBg: 'bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)] border border-[var(--md-secondary)]/25',
                  badge: `${productsList.length} صنف بالمستودعات`,
                  badgeClass: 'm3-badge m3-badge-secondary',
                  targetTab: 'inventory',
                },
                {
                  id: 'low-stock',
                  title: 'أصناف وصلت للحد الأدنى',
                  subtext: 'Low Stock & Reorder Alerts',
                  valueText: formatNumber(operatingData?.lowStockCount || 0),
                  unit: 'صنف',
                  icon: AlertTriangle,
                  iconBg: 'bg-[var(--md-warning-container)] text-[var(--md-on-warning-container)] border border-[var(--md-warning)]/25',
                  badge: (operatingData?.lowStockCount || 0) > 0 ? 'بحاجة لإعادة طلب' : 'المخزون آمن',
                  badgeClass: (operatingData?.lowStockCount || 0) > 0
                    ? 'm3-badge m3-badge-warning'
                    : 'm3-badge m3-badge-success',
                  targetTab: 'products',
                },
                {
                  id: 'gl-recon',
                  title: 'حالة مطابقة دفتر الأستاذ العام',
                  subtext: 'General Ledger Trial Parity',
                  valueText:
                    operatingData?.glBalanced !== false && (operatingData?.openReconciliationIssues || 0) === 0
                      ? 'متطابق 100%'
                      : `${operatingData?.openReconciliationIssues || 1} تنبيه`,
                  unit: '',
                  icon: ShieldCheck,
                  iconBg:
                    operatingData?.glBalanced !== false && (operatingData?.openReconciliationIssues || 0) === 0
                      ? 'bg-[var(--md-success-container)] text-[var(--md-on-success-container)] border border-[var(--md-success)]/25'
                      : 'bg-[var(--md-error-container)] text-[var(--md-on-error-container)] border border-[var(--md-error)]/25',
                  badge:
                    operatingData?.glBalanced !== false && (operatingData?.openReconciliationIssues || 0) === 0
                      ? 'القيد المزدوج متوازن ✓'
                      : 'يتطلب مراجعة التسوية',
                  badgeClass:
                    operatingData?.glBalanced !== false && (operatingData?.openReconciliationIssues || 0) === 0
                      ? 'm3-badge m3-badge-success'
                      : 'm3-badge m3-badge-error',
                  targetTab: 'ledger',
                },
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.id}
                    className="m3-card p-5 hover:border-[var(--md-primary)]/40 transition-colors group flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 text-right flex-1 min-w-0">
                        <h3 className="text-xs font-bold text-[var(--md-on-surface-variant)] group-hover:text-[var(--md-on-surface)] transition-colors truncate">
                          {card.title}
                        </h3>
                        <span className="text-[10px] text-[var(--md-on-surface-variant)]/75 font-mono block truncate">
                          {card.subtext}
                        </span>
                      </div>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${card.iconBg}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                    </div>

                    <div className="flex items-baseline gap-2 justify-start flex-wrap pt-1">
                      <span className="text-2xl font-black text-[var(--md-on-surface)] font-mono tabular-nums tracking-tight">
                        {card.valueText}
                      </span>
                      {card.unit && (
                        <span className="text-xs font-bold text-[var(--md-on-surface-variant)] font-mono">
                          {card.unit}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2.5 border-t border-[var(--md-outline-variant)] gap-2">
                      <span className={`text-[10px] truncate ${card.badgeClass}`}>
                        {card.badge}
                      </span>
                      <button
                        type="button"
                        onClick={() => onNavigate && onNavigate(card.targetTab)}
                        className="text-[11px] text-[var(--md-on-surface-variant)] hover:text-[var(--md-primary-text)] flex items-center gap-0.5 font-bold transition-colors shrink-0 cursor-pointer"
                      >
                        <span>انتقال للقائمة ↗</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SUBTAB: SAFE IMPORT ENGINE */}
      {/* ========================================================================= */}
      {activeSubTab === 'import' && (
        <div className="m3-card p-6 space-y-6 text-[var(--md-on-surface)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[var(--md-outline-variant)] gap-4">
            <div>
              <h2 className="text-base font-bold text-[var(--md-on-surface)] flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-[var(--md-info)]" />
                <span>محرك استيراد ونقل البيانات المؤسسي الآمن</span>
              </h2>
              <p className="text-xs text-[var(--md-on-surface-variant)] mt-0.5">
                استيراد جماعي مع التدقيق الصارم والتراجع التلقائي عند أي خطأ مالي والربط الفوري بقوائم النظام
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-[var(--md-on-surface-variant)] font-semibold">نوع الكيان:</span>
              <select
                value={importEntityType}
                onChange={(e) => {
                  setImportEntityType(e.target.value);
                  setImportPreview(null);
                }}
                className="m3-select text-xs px-3 py-2 w-auto"
              >
                <option value="CUSTOMERS">العملاء (Customers)</option>
                <option value="SUPPLIERS">الموردين (Suppliers)</option>
                <option value="PRODUCTS">المنتجات وبضاعة أول المدة (Products)</option>
                <option value="CUSTOMER_BALANCES">الأرصدة الافتتاحية للعملاء</option>
                <option value="SUPPLIER_BALANCES">الأرصدة الافتتاحية للموردين</option>
              </select>

              <button
                type="button"
                onClick={() => {
                  if (importEntityType === 'PRODUCTS') onNavigate?.('products');
                  else if (importEntityType === 'SUPPLIERS' || importEntityType === 'SUPPLIER_BALANCES') onNavigate?.('suppliers');
                  else onNavigate?.('customers');
                }}
                className="m3-btn-outlined px-3 py-2 text-xs font-bold cursor-pointer"
              >
                فتح القائمة المستهدفة ↗
              </button>
            </div>
          </div>

          {/* Sample CSV Template Hints */}
          <div className="bg-[var(--md-surface-container-low)] p-4 rounded-xl border border-[var(--md-outline-variant)] text-xs space-y-2">
            <div className="flex items-center justify-between font-semibold text-[var(--md-on-surface)]">
              <span className="flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-[var(--md-info)]" />
                <span>نموذج الترويسة المطلوب لـ ({importEntityType}):</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  if (importEntityType === 'CUSTOMERS' || importEntityType === 'CUSTOMER_BALANCES') {
                    setImportCsvText(`name,phone,email,address,opening_balance\nشركة الأمل للتجارة,770123456,info@alamal.com,صنعاء,50000\nمؤسسة النور التجارية,771987654,sales@alnoor.com,عدن,125000`);
                  } else if (importEntityType === 'SUPPLIERS' || importEntityType === 'SUPPLIER_BALANCES') {
                    setImportCsvText(`name,phone,email,address,opening_balance\nمورد الأجهزة الحديثة,772345678,supp@tech.com,صنعاء,80000\nمصنع التغليف الوطني,773456789,order@factory.com,تعز,250000`);
                  } else if (importEntityType === 'PRODUCTS') {
                    setImportCsvText(`name,sku,barcode,category,unit,purchase_price,selling_price,current_stock\nلابتوب ديل للأعمال,SKU-DELL-01,62810001,أجهزة,حبة,320000,410000,10\nطابعة ليزرية كانون,SKU-CAN-02,62810002,طابعات,حبة,85000,115000,5`);
                  }
                }}
                className="px-3 py-1 bg-[var(--md-info-container)] text-[var(--md-on-info-container)] border border-[var(--md-info)]/30 hover:opacity-90 rounded-lg font-bold transition-opacity cursor-pointer"
              >
                تحميل نموذج تجريبي
              </button>
            </div>
            <p className="text-[11px] text-[var(--md-on-surface-variant)] font-mono dir-ltr text-left">
              {(importEntityType === 'CUSTOMERS' || importEntityType === 'CUSTOMER_BALANCES') && 'name, phone, email, address, opening_balance'}
              {(importEntityType === 'SUPPLIERS' || importEntityType === 'SUPPLIER_BALANCES') && 'name, phone, email, address, opening_balance'}
              {importEntityType === 'PRODUCTS' && 'name, sku, barcode, category, unit, purchase_price, selling_price, current_stock'}
            </p>
          </div>

          {/* Textarea for CSV */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[var(--md-on-surface)] block">
              محتوى ملف CSV (الصق البيانات هنا أو استخدم النموذج الجاهز):
            </label>
            <textarea
              rows={6}
              value={importCsvText}
              onChange={(e) => setImportCsvText(e.target.value)}
              placeholder="name,phone,opening_balance..."
              className="m3-input w-full text-xs font-mono p-3.5 dir-ltr"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handlePreviewImport}
              disabled={loading || !importCsvText.trim()}
              className="m3-btn-tonal flex items-center gap-2 px-4 py-2.5 text-xs font-bold disabled:opacity-50 cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>فحص وتدقيق البيانات (Validation & Preview)</span>
            </button>

            {importPreview && (
              <button
                type="button"
                onClick={handleCommitImport}
                disabled={importCommitting || importPreview.validRows === 0}
                className="m3-btn-primary flex items-center gap-2 px-5 py-2.5 text-xs font-bold disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{importCommitting ? 'جاري الاعتماد والترحيل...' : `اعتماد وترحيل (${importPreview.validRows}) سجل في النظام`}</span>
              </button>
            )}
          </div>

          {/* Preview Results Panel */}
          {importPreview && (
            <div className="space-y-4 pt-4 border-t border-[var(--md-outline-variant)]">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-[var(--md-surface-container-low)] p-3.5 rounded-xl border border-[var(--md-outline-variant)]">
                  <span className="text-[var(--md-on-surface-variant)] block mb-1">إجمالي الصفوف:</span>
                  <span className="text-base font-bold font-mono tabular-nums text-[var(--md-on-surface)]">{importPreview.totalRows}</span>
                </div>
                <div className="bg-[var(--md-success-container)] p-3.5 rounded-xl border border-[var(--md-success)]/30">
                  <span className="text-[var(--md-on-success-container)] block mb-1">الصفوف الصالحة:</span>
                  <span className="text-base font-bold font-mono tabular-nums text-[var(--md-on-success-container)]">{importPreview.validRows}</span>
                </div>
                <div className="bg-[var(--md-error-container)] p-3.5 rounded-xl border border-[var(--md-error)]/30">
                  <span className="text-[var(--md-on-error-container)] block mb-1">صفوف بها أخطاء:</span>
                  <span className="text-base font-bold font-mono tabular-nums text-[var(--md-on-error-container)]">{importPreview.invalidRows}</span>
                </div>
                <div className="bg-[var(--md-warning-container)] p-3.5 rounded-xl border border-[var(--md-warning)]/30">
                  <span className="text-[var(--md-on-warning-container)] block mb-1">المبالغ المالية المستوردة:</span>
                  <span className="text-base font-bold font-mono tabular-nums text-[var(--md-on-warning-container)]">
                    {formatAmount(importPreview.financialTotal)} {currSym}
                  </span>
                </div>
              </div>

              {/* Errors List if any */}
              {importPreview.errors?.length > 0 && (
                <div className="p-4 bg-[var(--md-error-container)] rounded-xl border border-[var(--md-error)]/30 space-y-2">
                  <h4 className="text-xs font-bold text-[var(--md-on-error-container)] flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-[var(--md-error)]" />
                    <span>سجل أخطاء التدقيق الصارم:</span>
                  </h4>
                  <ul className="text-xs text-[var(--md-on-error-container)] space-y-1">
                    {importPreview.errors.map((err: any, idx: number) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="m3-badge m3-badge-error font-mono text-[10px]">
                          سطر {err.row}
                        </span>
                        <span className="font-semibold">[{err.field}]:</span>
                        <span>{err.message}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SUBTAB: OPENING BALANCES */}
      {/* ========================================================================= */}
      {activeSubTab === 'opening_balances' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Post Opening Balance Form */}
          <div className="m3-card p-6 space-y-4">
            <h2 className="text-base font-bold text-[var(--md-on-surface)] flex items-center gap-2">
              <Scale className="w-4 h-4 text-[var(--md-primary-text)]" />
              <span>تسجيل رصيد افتتاحي معتمد</span>
            </h2>
            <p className="text-xs text-[var(--md-on-surface-variant)]">
              يتم إنشاء قيد مزدوج متوازن تلقائياً وإقفال الفارق بحساب رأس المال / الأرصدة الافتتاحية (3101)
            </p>

            <form onSubmit={handlePostOpeningBalance} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-[var(--md-on-surface)] block mb-1">نوع الحساب:</label>
                <select
                  value={newOpBal.balanceType}
                  onChange={(e) => {
                    const bType = e.target.value;
                    setNewOpBal({
                      ...newOpBal,
                      balanceType: bType,
                      entityId: '',
                      entrySide: bType === 'SUPPLIER' ? 'CREDIT' : 'DEBIT',
                    });
                  }}
                  className="m3-select w-full p-2.5"
                >
                  <option value="CUSTOMER">عميل (Accounts Receivable - 1103)</option>
                  <option value="SUPPLIER">مورد (Accounts Payable - 2101)</option>
                  <option value="CASH">صندوق نقدي (Cash Account - 1101)</option>
                  <option value="BANK">حساب بنكي (Bank Account - 1102)</option>
                  <option value="WALLET">محفظة إلكترونية / شبكة (Wallet - 1107)</option>
                  <option value="INVENTORY">بضاعة أول المدة (Inventory - 1104)</option>
                </select>
              </div>

              {/* Target Entity Selector */}
              {newOpBal.balanceType === 'CUSTOMER' && (
                <div>
                  <label className="font-semibold text-[var(--md-on-surface)] block mb-1">العميل المستهدف:</label>
                  <select
                    value={newOpBal.entityId}
                    onChange={(e) => setNewOpBal({ ...newOpBal, entityId: e.target.value })}
                    required
                    className="m3-select w-full p-2.5"
                  >
                    <option value="">-- اختر العميل --</option>
                    {(customersList || []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (الرصيد: {formatAmount(c.current_balance ?? c.balance ?? 0)} {currSym})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {newOpBal.balanceType === 'SUPPLIER' && (
                <div>
                  <label className="font-semibold text-[var(--md-on-surface)] block mb-1">المورد المستهدف:</label>
                  <select
                    value={newOpBal.entityId}
                    onChange={(e) => setNewOpBal({ ...newOpBal, entityId: e.target.value })}
                    required
                    className="m3-select w-full p-2.5"
                  >
                    <option value="">-- اختر المورد --</option>
                    {(suppliersList || []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (الرصيد: {formatAmount(s.current_balance ?? s.balance ?? 0)} {currSym})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {newOpBal.balanceType === 'CASH' && (
                <div>
                  <label className="font-semibold text-[var(--md-on-surface)] block mb-1">الصندوق المستهدف (1101):</label>
                  <select
                    value={newOpBal.entityId}
                    onChange={(e) => setNewOpBal({ ...newOpBal, entityId: e.target.value })}
                    required={cashAccounts.length > 0}
                    className="m3-select w-full p-2.5"
                  >
                    <option value="">-- اختر الصندوق النقدي --</option>
                    {cashAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name || a.account_name} (الرصيد: {formatAmount(a.current_balance ?? a.balance ?? 0)} {currSym})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {newOpBal.balanceType === 'BANK' && (
                <div>
                  <label className="font-semibold text-[var(--md-on-surface)] block mb-1">الحساب البنكي (1102):</label>
                  <select
                    value={newOpBal.entityId}
                    onChange={(e) => setNewOpBal({ ...newOpBal, entityId: e.target.value })}
                    required={bankAccounts.length > 0}
                    className="m3-select w-full p-2.5"
                  >
                    <option value="">-- اختر الحساب البنكي --</option>
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.account_name || b.name} - {b.bank_name || 'بنك'} ({formatAmount(b.current_balance ?? b.balance ?? 0)} {currSym})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {newOpBal.balanceType === 'WALLET' && (
                <div className="p-3 bg-[var(--md-secondary-container)] border border-[var(--md-secondary)]/30 rounded-xl text-[var(--md-on-secondary-container)] flex items-center gap-2">
                  <Smartphone className="w-4 h-4 shrink-0" />
                  <span>سيتم ترحيل الرصيد مباشرة إلى حساب المحافظ الإلكترونية والشبكات (1107)</span>
                </div>
              )}

              {newOpBal.balanceType === 'INVENTORY' && (
                <div>
                  <label className="font-semibold text-[var(--md-on-surface)] block mb-1">المنتج / الصنف (1104):</label>
                  <select
                    value={newOpBal.entityId}
                    onChange={(e) => setNewOpBal({ ...newOpBal, entityId: e.target.value })}
                    required
                    className="m3-select w-full p-2.5"
                  >
                    <option value="">-- اختر المنتج --</option>
                    {(productsList || []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (المخزون: {formatNumber(p.current_stock ?? p.stock ?? 0)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-[var(--md-on-surface)] block mb-1">المبلغ ({currSym}):</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newOpBal.amount}
                    onChange={(e) => setNewOpBal({ ...newOpBal, amount: e.target.value })}
                    className="m3-input w-full p-2.5 font-mono tabular-nums"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[var(--md-on-surface)] block mb-1">طبيعة القيد:</label>
                  <select
                    value={newOpBal.entrySide}
                    onChange={(e) => setNewOpBal({ ...newOpBal, entrySide: e.target.value as any })}
                    className="m3-select w-full p-2.5"
                  >
                    <option value="DEBIT">مدين (Debit)</option>
                    <option value="CREDIT">دائن (Credit)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-[var(--md-on-surface)] block mb-1">تاريخ القيد الافتتاحي:</label>
                <input
                  type="date"
                  required
                  value={newOpBal.accountingDate}
                  onChange={(e) => setNewOpBal({ ...newOpBal, accountingDate: e.target.value })}
                  className="m3-input w-full p-2.5"
                />
              </div>

              <div>
                <label className="font-semibold text-[var(--md-on-surface)] block mb-1">البيان والملاحظات:</label>
                <input
                  type="text"
                  value={newOpBal.notes}
                  onChange={(e) => setNewOpBal({ ...newOpBal, notes: e.target.value })}
                  placeholder="رصيد افتتاحي معتمد..."
                  className="m3-input w-full p-2.5"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="m3-btn-primary w-full py-2.5 font-bold disabled:opacity-50 cursor-pointer"
              >
                ترحيل القيد الافتتاحي
              </button>
            </form>
          </div>

          {/* Opening Balances List & Status */}
          <div className="lg:col-span-2 m3-card p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[var(--md-on-surface)] flex items-center gap-2">
                  <span>سجل الأرصدة الافتتاحية المرحلة</span>
                  <span className="m3-badge m3-badge-primary text-[10px] font-mono">
                    {openingBalances.length} سجل
                  </span>
                </h3>
                <p className="text-xs text-[var(--md-on-surface-variant)]">ترحيل فوري إلى شجرة الحسابات ودفتر الأستاذ العام</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate && onNavigate('ledger')}
                className="m3-btn-outlined px-3 py-1.5 text-xs font-bold cursor-pointer"
              >
                عرض في دفتر الأستاذ ↗
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[var(--md-outline-variant)]">
              <table className="m3-table w-full text-xs text-right">
                <thead className="m3-thead">
                  <tr>
                    <th className="m3-th">النوع والحساب</th>
                    <th className="m3-th">الكيان / البيان</th>
                    <th className="m3-th">المبلغ</th>
                    <th className="m3-th">الجانب</th>
                    <th className="m3-th">التاريخ</th>
                    <th className="m3-th">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--md-outline-variant)]">
                  {openingBalances.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-[var(--md-on-surface-variant)]">
                        لا توجد أرصدة افتتاحية مسجلة حتى الآن. أضف الرصيد من النموذج الجانبي للبدء.
                      </td>
                    </tr>
                  ) : (
                    openingBalances.map((ob) => {
                      const typeMap: Record<string, string> = {
                        CUSTOMER: 'عميل (1103)',
                        SUPPLIER: 'مورد (2101)',
                        CASH: 'صندوق نقدي (1101)',
                        BANK: 'حساب بنكي (1102)',
                        WALLET: 'محفظة إلكترونية (1107)',
                        INVENTORY: 'بضاعة أول المدة (1104)',
                      };
                      const bType = String(ob.balance_type || ob.balanceType || 'ACCOUNT').toUpperCase();
                      const side = String(ob.entry_side || ob.entrySide || 'DEBIT').toUpperCase();
                      return (
                        <tr key={ob.id} className="hover:bg-[var(--md-surface-container-low)] transition-colors">
                          <td className="p-3 font-bold text-[var(--md-on-surface)]">{typeMap[bType] || bType}</td>
                          <td className="p-3 text-[var(--md-on-surface-variant)]">{ob.entity_name || ob.notes || ob.reference_no || '—'}</td>
                          <td className="p-3 font-mono font-bold text-[var(--md-primary-text)] tabular-nums">
                            {formatAmount(ob.amount)} <span className="text-[var(--md-on-surface-variant)] text-[10px]">{currSym}</span>
                          </td>
                          <td className="p-3">
                            <span
                              className={`m3-badge text-[10px] ${
                                side === 'DEBIT'
                                  ? 'm3-badge-info'
                                  : 'm3-badge-warning'
                              }`}
                            >
                              {side === 'DEBIT' ? 'مدين' : 'دائن'}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-[var(--md-on-surface-variant)]">{ob.accounting_date || ob.accountingDate || '—'}</td>
                          <td className="p-3">
                            <span className="m3-badge m3-badge-success text-[10px]">
                              {ob.status === 'POSTED' ? 'مرحّل ✓' : (ob.status || 'مرحّل')}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SUBTAB: RECONCILIATION & AUDIT CHECKS */}
      {/* ========================================================================= */}
      {activeSubTab === 'reconciliation' && (() => {
        const custSubTotal = customersList.reduce((sum, c) => sum + Number(c.current_balance ?? c.balance ?? 0), 0);
        const suppSubTotal = suppliersList.reduce((sum, s) => sum + Number(s.current_balance ?? s.balance ?? 0), 0);
        const invSubTotal = productsList.reduce(
          (sum, p) => sum + Number(p.cost_price ?? p.purchase_price ?? 0) * Number(p.current_stock ?? p.stock ?? p.qty ?? 0),
          0
        );
        const glCustomers = Number(comprehensiveReport?.receivables ?? operatingData?.receivables ?? custSubTotal);
        const glSuppliers = Number(comprehensiveReport?.payables ?? operatingData?.payables ?? suppSubTotal);
        const glInventory = Number(comprehensiveReport?.inventoryValuation ?? operatingData?.inventoryValuation ?? invSubTotal);
        const treasurySubTotal =
          Number(operatingData?.cashBalance || 0) +
          Number(operatingData?.bankBalance || 0) +
          Number(operatingData?.walletBalance || 0);
        const glTreasury = Number(comprehensiveReport?.cashAndBankBalance ?? treasurySubTotal);
        const glBalanced = operatingData?.glBalanced !== false;

        const reconSummaryCards = [
          {
            title: 'العملاء vs الأستاذ (1103)',
            subVal: custSubTotal,
            glVal: glCustomers,
            matched: Math.abs(custSubTotal - glCustomers) <= 1,
            tab: 'customers',
          },
          {
            title: 'الموردون vs الأستاذ (2101)',
            subVal: suppSubTotal,
            glVal: glSuppliers,
            matched: Math.abs(suppSubTotal - glSuppliers) <= 1,
            tab: 'suppliers',
          },
          {
            title: 'المخزون vs الأستاذ (1104)',
            subVal: invSubTotal,
            glVal: glInventory,
            matched: Math.abs(invSubTotal - glInventory) <= 1,
            tab: 'inventory',
          },
          {
            title: 'الخزينة والبنوك vs الأستاذ',
            subVal: treasurySubTotal,
            glVal: glTreasury,
            matched: Math.abs(treasurySubTotal - glTreasury) <= 1,
            tab: 'payments',
          },
        ];

        const activeReconList = bankReconData.accountType === 'CASH' ? cashAccounts : bankAccounts;

        return (
          <div className="space-y-6">
            {/* Live Reconciliation Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {reconSummaryCards.map((item) => (
                <div
                  key={item.title}
                  className="m3-card p-4 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[var(--md-on-surface)]">{item.title}</span>
                    <span
                      className={`m3-badge text-[10px] ${
                        item.matched
                          ? 'm3-badge-success'
                          : 'm3-badge-error'
                      }`}
                    >
                      {item.matched ? 'مطابق ✓' : 'فارق'}
                    </span>
                  </div>
                  <div className="text-sm font-black font-mono tabular-nums text-[var(--md-on-surface)]">
                    {formatAmount(item.glVal)} <span className="text-[10px] text-[var(--md-on-surface-variant)]">{currSym}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[var(--md-on-surface-variant)] pt-1 border-t border-[var(--md-outline-variant)]">
                    <span className="font-mono tabular-nums">الفرعي: {formatAmount(item.subVal)}</span>
                    <button
                      type="button"
                      onClick={() => onNavigate && onNavigate(item.tab)}
                      className="text-[var(--md-primary-text)] hover:opacity-80 font-bold cursor-pointer"
                    >
                      القائمة ↗
                    </button>
                  </div>
                </div>
              ))}

              {/* Double-Entry Balance Card */}
              <div className="m3-card p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[var(--md-on-surface)]">توازن القيد المزدوج</span>
                  <span
                    className={`m3-badge text-[10px] ${
                      glBalanced
                        ? 'm3-badge-success'
                        : 'm3-badge-error'
                    }`}
                  >
                    {glBalanced ? 'متزن 100%' : 'غير متزن'}
                  </span>
                </div>
                <div className="text-sm font-black font-mono tabular-nums text-[var(--md-on-surface)]">
                  فارق: {formatAmount(operatingData?.trialBalanceDifference || 0)} <span className="text-[10px] text-[var(--md-on-surface-variant)]">{currSym}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-[var(--md-on-surface-variant)] pt-1 border-t border-[var(--md-outline-variant)]">
                  <span>ميزان المراجعة</span>
                  <button
                    type="button"
                    onClick={() => onNavigate && onNavigate('ledger')}
                    className="text-[var(--md-primary-text)] hover:opacity-80 font-bold cursor-pointer"
                  >
                    الأستاذ العام ↗
                  </button>
                </div>
              </div>
            </div>

            {/* Automated Audit Discrepancies Panel */}
            <div className="m3-card p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-[var(--md-on-surface)] flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[var(--md-primary-text)]" />
                    <span>محرك المطابقات والتسويات المالية الشاملة</span>
                  </h2>
                  <p className="text-xs text-[var(--md-on-surface-variant)] mt-0.5">
                    تدقيق آلي للأرصدة (العملاء vs الأستاذ، الموردين vs الأستاذ، المخزون، الفواتير vs التحصيلات، توازن الأستاذ العام)
                  </p>
                </div>

                <button
                  type="button"
                  onClick={runFullReconciliation}
                  disabled={reconRunning}
                  className="m3-btn-primary flex items-center gap-2 px-4 py-2.5 text-xs font-bold cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${reconRunning ? 'animate-spin' : ''}`} />
                  <span>{reconRunning ? 'جاري فحص وتدقيق القيود...' : 'تشغيل فحص المطابقة والتدقيق الآن'}</span>
                </button>
              </div>

              {/* Discrepancies Table */}
              <div className="overflow-x-auto rounded-xl border border-[var(--md-outline-variant)]">
                <table className="m3-table w-full text-xs text-right">
                  <thead className="m3-thead">
                    <tr>
                      <th className="m3-th">الكيان / الحساب</th>
                      <th className="m3-th">القيمة المتوقعة</th>
                      <th className="m3-th">القيمة الفعلية</th>
                      <th className="m3-th">الفارق</th>
                      <th className="m3-th">الخطورة</th>
                      <th className="m3-th">التفاصيل</th>
                      <th className="m3-th">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--md-outline-variant)]">
                    {reconciliations.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-[var(--md-primary-text)] font-semibold">
                          ✓ جميع الحركات والأرصدة المحاسبية متطابقة تماماً بنسبة 100% ولا توجد أي فروقات عالقة
                        </td>
                      </tr>
                    ) : (
                      reconciliations.map((rec) => (
                        <tr key={rec.id} className="hover:bg-[var(--md-surface-container-low)] transition-colors">
                          <td className="p-3 font-bold text-[var(--md-on-surface)]">{rec.entity_type}</td>
                          <td className="p-3 font-mono tabular-nums text-[var(--md-on-surface-variant)]">
                            {formatAmount(rec.expected_value)} {currSym}
                          </td>
                          <td className="p-3 font-mono tabular-nums text-[var(--md-on-surface-variant)]">
                            {formatAmount(rec.actual_value)} {currSym}
                          </td>
                          <td className="p-3 font-mono tabular-nums font-bold text-[var(--md-error)]">
                            {formatAmount(rec.difference)} {currSym}
                          </td>
                          <td className="p-3">
                            <span
                              className={`m3-badge text-[10px] ${
                                rec.severity === 'CRITICAL'
                                  ? 'm3-badge-error'
                                  : 'm3-badge-warning'
                              }`}
                            >
                              {rec.severity}
                            </span>
                          </td>
                          <td className="p-3 text-[var(--md-on-surface-variant)] max-w-xs truncate">
                            {typeof rec.details === 'object' && rec.details !== null
                              ? rec.details.message || rec.details.description || JSON.stringify(rec.details)
                              : String(rec.details || '—')}
                          </td>
                          <td className="p-3">
                            <span className="m3-badge m3-badge-secondary text-[10px]">
                              {rec.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cash & Bank Statement Reconciliation Module */}
            <div className="m3-card p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-[var(--md-on-surface)] flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-[var(--md-info)]" />
                  <span>مطابقة كشف الحساب البنكي / الصندوق (Bank & Cash Statement Reconciliation)</span>
                </h3>
                <button
                  type="button"
                  onClick={() => onNavigate && onNavigate('payments')}
                  className="m3-btn-outlined px-3 py-1.5 text-xs font-bold cursor-pointer"
                >
                  السندات والخزينة ↗
                </button>
              </div>

              <form onSubmit={handleBankReconcile} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="font-semibold text-[var(--md-on-surface)] block mb-1">نوع الحساب:</label>
                  <select
                    value={bankReconData.accountType}
                    onChange={(e) => setBankReconData({ ...bankReconData, accountType: e.target.value, accountId: '' })}
                    className="m3-select w-full p-2.5"
                  >
                    <option value="BANK">حساب بنكي / محفظة إلكترونية</option>
                    <option value="CASH">صندوق نقدي</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-[var(--md-on-surface)] block mb-1">
                    {bankReconData.accountType === 'CASH' ? 'الصندوق النقدي:' : 'الحساب البنكي / المحفظة:'}
                  </label>
                  <select
                    value={bankReconData.accountId}
                    onChange={(e) => setBankReconData({ ...bankReconData, accountId: e.target.value })}
                    required
                    className="m3-select w-full p-2.5"
                  >
                    <option value="">
                      {bankReconData.accountType === 'CASH' ? '-- اختر الصندوق النقدي --' : '-- اختر الحساب البنكي --'}
                    </option>
                    {activeReconList.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.account_name || acc.name} {acc.bank_name ? `- ${acc.bank_name}` : ''} (الرصيد الدفتري:{' '}
                        {formatAmount(acc.current_balance ?? acc.balance ?? 0)} {currSym})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-[var(--md-on-surface)] block mb-1">رصيد الجرد / الكشف الفعلي ({currSym}):</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={bankReconData.statementClosingBalance}
                    onChange={(e) => setBankReconData({ ...bankReconData, statementClosingBalance: e.target.value })}
                    placeholder="0.00"
                    className="m3-input w-full p-2.5 font-mono tabular-nums"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[var(--md-on-surface)] block mb-1">شيكات صادرة لم تصرف بعد (Unpresented):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={bankReconData.unpresentedChecks}
                    onChange={(e) => setBankReconData({ ...bankReconData, unpresentedChecks: e.target.value })}
                    className="m3-input w-full p-2.5 font-mono tabular-nums"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[var(--md-on-surface)] block mb-1">إيداعات قيد التحصيل (Deposits in Transit):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={bankReconData.depositsInTransit}
                    onChange={(e) => setBankReconData({ ...bankReconData, depositsInTransit: e.target.value })}
                    className="m3-input w-full p-2.5 font-mono tabular-nums"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[var(--md-on-surface)] block mb-1">رسوم ومصاريف بنكية مقتطعة ({currSym}):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={bankReconData.bankCharges}
                    onChange={(e) => setBankReconData({ ...bankReconData, bankCharges: e.target.value })}
                    className="m3-input w-full p-2.5 font-mono tabular-nums"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[var(--md-on-surface)] block mb-1">أرباح / فوائد دائنة مستحقة ({currSym}):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={bankReconData.interestEarned}
                    onChange={(e) => setBankReconData({ ...bankReconData, interestEarned: e.target.value })}
                    className="m3-input w-full p-2.5 font-mono tabular-nums"
                  />
                </div>

                <div className="md:col-span-2 flex items-end">
                  <button
                    type="submit"
                    disabled={loading || !bankReconData.accountId}
                    className="m3-btn-primary px-6 py-2.5 font-bold disabled:opacity-50 cursor-pointer"
                  >
                    تنفيذ مطابقة كشف الحساب
                  </button>
                </div>
              </form>

              {bankReconResult && (
                <div className="p-4 bg-[var(--md-surface-container-low)] rounded-xl border border-[var(--md-outline-variant)] mt-4 text-xs space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono tabular-nums">
                    <div>
                      <span className="text-[var(--md-on-surface-variant)] block mb-0.5 font-sans">الرصيد الدفتري:</span>
                      <span className="font-bold text-[var(--md-on-surface)]">
                        {formatAmount(bankReconResult.bookBalance)} {currSym}
                      </span>
                    </div>
                    <div>
                      <span className="text-[var(--md-on-surface-variant)] block mb-0.5 font-sans">رصيد كشف الحساب:</span>
                      <span className="font-bold text-[var(--md-on-surface)]">
                        {formatAmount(bankReconResult.statementClosingBalance)} {currSym}
                      </span>
                    </div>
                    <div>
                      <span className="text-[var(--md-on-surface-variant)] block mb-0.5 font-sans">الفارق بعد التسوية:</span>
                      <span className={`font-bold ${bankReconResult.status === 'MATCHED' ? 'text-[var(--md-primary-text)]' : 'text-[var(--md-error)]'}`}>
                        {formatAmount(bankReconResult.difference)} {currSym}
                      </span>
                    </div>
                    <div>
                      <span className="text-[var(--md-on-surface-variant)] block mb-0.5 font-sans">نتيجة المطابقة:</span>
                      <span className={`font-bold font-sans ${bankReconResult.status === 'MATCHED' ? 'text-[var(--md-primary-text)]' : 'text-[var(--md-error)]'}`}>
                        {bankReconResult.status === 'MATCHED' ? '✓ متطابق تماماً' : '⚠ يوجد فارق معلق'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* 5. SUBTAB: OPERATIONAL EXPENSES */}
      {/* ========================================================================= */}
      {activeSubTab === 'expenses' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="m3-card p-6 space-y-4">
            <h2 className="text-base font-bold text-[var(--md-on-surface)] flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[var(--md-error)]" />
              <span>تسجيل مصروف تشغيلي</span>
            </h2>
            <p className="text-xs text-[var(--md-on-surface-variant)]">
              تسجيل المصروف وترحيل القيد المزدوج وخصم المبلغ مباشرة من الصندوق أو البنك أو المحفظة
            </p>

            <form onSubmit={handleRecordExpense} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-[var(--md-on-surface)] block mb-1">تصنيف المصروف:</label>
                <select
                  value={newExpense.category}
                  onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                  className="m3-select w-full p-2.5"
                >
                  <option value="إيجار ومرافق">إيجار ومرافق</option>
                  <option value="رواتب وأجور">رواتب وأجور</option>
                  <option value="صيانة وتشغيل">صيانة وتشغيل</option>
                  <option value="دعاية وتسويق">دعاية وتسويق</option>
                  <option value="نقل وضيافة">نقل وضيافة</option>
                  <option value="رسوم حكومية ورخص">رسوم حكومية ورخص</option>
                  <option value="مصاريف أخرى">مصاريف أخرى</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-[var(--md-on-surface)] block mb-1">وصف المصروف:</label>
                <input
                  type="text"
                  required
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  placeholder="وصف تفصيلي للمصروف..."
                  className="m3-input w-full p-2.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-[var(--md-on-surface)] block mb-1">المبلغ الأساسي ({currSym}):</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                    placeholder="0.00"
                    className="m3-input w-full p-2.5 font-mono tabular-nums"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[var(--md-on-surface)] block mb-1">ضريبة القيمة المضافة ({currSym}):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newExpense.taxAmount}
                    onChange={(e) => setNewExpense({ ...newExpense, taxAmount: e.target.value })}
                    placeholder="0.00"
                    className="m3-input w-full p-2.5 font-mono tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-[var(--md-on-surface)] block mb-1">طريقة السداد:</label>
                  <select
                    value={newExpense.paymentMethod}
                    onChange={(e) => setNewExpense({ ...newExpense, paymentMethod: e.target.value as any, paymentAccountId: '' })}
                    className="m3-select w-full p-2.5"
                  >
                    <option value="CASH">نقداً من الصندوق</option>
                    <option value="BANK">تحويل بنكي</option>
                    <option value="CARD">بطاقة / شبكة</option>
                    <option value="WALLET">محفظة إلكترونية</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-[var(--md-on-surface)] block mb-1">تاريخ الصرف:</label>
                  <input
                    type="date"
                    required
                    value={newExpense.expenseDate}
                    onChange={(e) => setNewExpense({ ...newExpense, expenseDate: e.target.value })}
                    className="m3-input w-full p-2.5"
                  />
                </div>
              </div>

              {newExpense.paymentMethod === 'BANK' && (
                <div>
                  <label className="font-semibold text-[var(--md-on-surface)] block mb-1">خصم من الحساب البنكي:</label>
                  <select
                    value={newExpense.paymentAccountId}
                    onChange={(e) => setNewExpense({ ...newExpense, paymentAccountId: e.target.value })}
                    required={bankAccounts.length > 0}
                    className="m3-select w-full p-2.5"
                  >
                    <option value="">-- اختر الحساب البنكي --</option>
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.account_name || b.name} ({formatAmount(b.current_balance ?? b.balance ?? 0)} {currSym})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {newExpense.paymentMethod === 'CASH' && (
                <div>
                  <label className="font-semibold text-[var(--md-on-surface)] block mb-1">خصم من الصندوق النقدي:</label>
                  <select
                    value={newExpense.paymentAccountId}
                    onChange={(e) => setNewExpense({ ...newExpense, paymentAccountId: e.target.value })}
                    required={cashAccounts.length > 0}
                    className="m3-select w-full p-2.5"
                  >
                    <option value="">-- اختر الصندوق --</option>
                    {cashAccounts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name || c.account_name} ({formatAmount(c.current_balance ?? c.balance ?? 0)} {currSym})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="m3-btn-danger w-full py-2.5 font-bold disabled:opacity-50 cursor-pointer"
              >
                تسجيل وصرف المصروف
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 m3-card p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[var(--md-on-surface)] flex items-center gap-2">
                  <span>سجل المصروفات التشغيلية المعتمدة</span>
                  <span className="m3-badge m3-badge-error text-[10px] font-mono">
                    {expenses.length} مصروف
                  </span>
                </h3>
                <p className="text-xs text-[var(--md-on-surface-variant)]">
                  الإجمالي المسجل:{' '}
                  <span className="font-mono tabular-nums font-bold text-[var(--md-error)]">
                    {formatAmount(expenses.reduce((s, x) => s + Number(x.totalAmount ?? x.total_amount ?? x.amount ?? 0), 0))} {currSym}
                  </span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => onNavigate && onNavigate('expenses')}
                className="m3-btn-outlined px-3 py-1.5 text-xs font-bold cursor-pointer"
              >
                إدارة المصروفات الكاملة ↗
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[var(--md-outline-variant)]">
              <table className="m3-table w-full text-xs text-right">
                <thead className="m3-thead">
                  <tr>
                    <th className="m3-th">رقم المصروف</th>
                    <th className="m3-th">التصنيف</th>
                    <th className="m3-th">البيان</th>
                    <th className="m3-th">المبلغ</th>
                    <th className="m3-th">طريقة الدفع</th>
                    <th className="m3-th">التاريخ</th>
                    <th className="m3-th">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--md-outline-variant)]">
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-[var(--md-on-surface-variant)]">
                        لا توجد مصروفات تشغيلية مسجلة حالياً. سجل مصروفاً جديداً ليظهر فوراً في الدفاتر والأرباح والخسائر.
                      </td>
                    </tr>
                  ) : (
                    expenses.map((exp, idx) => {
                      const pMethod = String(exp.paymentMethod || exp.payment_method || 'CASH').toUpperCase();
                      const payLabel =
                        pMethod === 'BANK'
                          ? 'تحويل بنكي'
                          : pMethod === 'WALLET'
                          ? 'محفظة إلكترونية'
                          : pMethod === 'CARD'
                          ? 'بطاقة / شبكة'
                          : 'نقدي (صندوق)';
                      return (
                        <tr key={exp.id || idx} className="hover:bg-[var(--md-surface-container-low)] transition-colors">
                          <td className="p-3 font-mono font-bold text-[var(--md-on-surface)]">
                            {exp.expenseNumber || exp.voucher_number || exp.reference || `EXP-${idx + 1}`}
                          </td>
                          <td className="p-3 text-[var(--md-secondary)] font-semibold">{exp.category || 'تشغيلي'}</td>
                          <td className="p-3 text-[var(--md-on-surface-variant)] max-w-xs truncate">{exp.description || exp.notes || '—'}</td>
                          <td className="p-3 font-mono tabular-nums font-bold text-[var(--md-error)]">
                            {formatAmount(exp.totalAmount ?? exp.total_amount ?? exp.amount ?? 0)}{' '}
                            <span className="text-[var(--md-on-surface-variant)] text-[10px]">{currSym}</span>
                          </td>
                          <td className="p-3 text-[var(--md-on-surface)]">{payLabel}</td>
                          <td className="p-3 font-mono text-[var(--md-on-surface-variant)]">{exp.expenseDate || exp.expense_date || exp.date || '—'}</td>
                          <td className="p-3">
                            <span className="m3-badge m3-badge-success text-[10px]">
                              مدفوع ومعتمد
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. SUBTAB: RETURNS & REVERSALS (المردودات — مبيعات ومشتريات)            */}
      {/* ========================================================================= */}
      {activeSubTab === 'returns' && (
        <div className="space-y-6">
          <div className="m3-card p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-[var(--md-on-surface)] flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-[var(--md-info)]" />
                  <span>إدارة مردودات المبيعات والمشتريات (إشعارات دائنة ومدينة)</span>
                </h2>
                <p className="text-xs text-[var(--md-on-surface-variant)] mt-1">
                  تسجيل مردودات المبيعات والمشتريات مع تحديث كمية المخزون آلياً، تعديل ذمة العميل/المورد، وترحيل القيود في دفتر الأستاذ العام
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onNavigate?.('invoices')}
                  className="m3-btn-outlined px-3 py-1.5 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>فواتير المبيعات</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate?.('purchase_invoices')}
                  className="m3-btn-outlined px-3 py-1.5 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>فواتير المشتريات</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Return Type Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  setNewReturn((prev) => ({
                    ...prev,
                    type: 'SALES',
                    supplierId: '',
                  }))
                }
                className={`p-4 rounded-xl border text-right transition-colors cursor-pointer flex items-start gap-3 ${
                  newReturn.type === 'SALES'
                    ? 'bg-[var(--md-primary-container)] border-[var(--md-primary)]/50 text-[var(--md-on-primary-container)]'
                    : 'bg-[var(--md-surface-container-low)] border-[var(--md-outline-variant)] text-[var(--md-on-surface-variant)] hover:border-[var(--md-outline)]'
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${newReturn.type === 'SALES' ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)]' : 'bg-[var(--md-surface-container)] text-[var(--md-on-surface-variant)]'}`}>
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold">مردود مبيعات — إشعار دائن للعميل</div>
                  <div className="text-[11px] opacity-80 mt-0.5">إعادة البضاعة إلى المخزون وتخفيض رصيد العميل أو رد النقدية</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  setNewReturn((prev) => ({
                    ...prev,
                    type: 'PURCHASE',
                    customerId: '',
                  }))
                }
                className={`p-4 rounded-xl border text-right transition-colors cursor-pointer flex items-start gap-3 ${
                  newReturn.type === 'PURCHASE'
                    ? 'bg-[var(--md-warning-container)] border-[var(--md-warning)]/50 text-[var(--md-on-warning-container)]'
                    : 'bg-[var(--md-surface-container-low)] border-[var(--md-outline-variant)] text-[var(--md-on-surface-variant)] hover:border-[var(--md-outline)]'
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${newReturn.type === 'PURCHASE' ? 'bg-[var(--md-warning)] text-[var(--md-on-primary)]' : 'bg-[var(--md-surface-container)] text-[var(--md-on-surface-variant)]'}`}>
                  <ArrowDownLeft className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold">مردود مشتريات — إشعار مدين للمورد</div>
                  <div className="text-[11px] opacity-80 mt-0.5">خصم الكمية المرتجعة من المخزون وتخفيض مستحقات المورد أو استرداد النقدية</div>
                </div>
              </button>
            </div>

            {/* Return Entry Form */}
            <form onSubmit={handleCreateReturn} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-[var(--md-surface-container-low)] p-4 rounded-xl border border-[var(--md-outline-variant)]">
              {newReturn.type === 'SALES' ? (
                <div>
                  <label className="block text-[11px] font-bold text-[var(--md-on-surface)] mb-1.5">العميل (اختياري للنقدي / إلزامي للآجل):</label>
                  <select
                    value={newReturn.customerId}
                    onChange={(e) => setNewReturn({ ...newReturn, customerId: e.target.value })}
                    className="m3-select w-full text-xs p-2.5"
                  >
                    <option value="">-- عميل عام / نقدي --</option>
                    {customersList.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({formatNumber(Number(c.current_balance ?? c.balance ?? 0))} {currSym})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-bold text-[var(--md-on-surface)] mb-1.5">المورد:</label>
                  <select
                    value={newReturn.supplierId}
                    onChange={(e) => setNewReturn({ ...newReturn, supplierId: e.target.value })}
                    className="m3-select w-full text-xs p-2.5"
                  >
                    <option value="">-- مورد عام / نقدي --</option>
                    {suppliersList.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({formatNumber(Number(s.current_balance ?? s.balance ?? 0))} {currSym})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-[var(--md-on-surface)] mb-1.5">الصنف المسترجع:</label>
                <select
                  required
                  value={newReturn.items[0]?.productId || ''}
                  onChange={(e) => {
                    const pid = e.target.value;
                    const prod = productsList.find((p: any) => String(p.id) === String(pid));
                    const defaultPrice = prod
                      ? newReturn.type === 'SALES'
                        ? Number(prod.selling_price ?? prod.sale_price ?? prod.price ?? 0)
                        : Number(prod.cost_price ?? prod.purchase_price ?? 0)
                      : 0;
                    setNewReturn((prev) => ({
                      ...prev,
                      items: [{ ...prev.items[0], productId: pid, priceOrCost: String(defaultPrice) }],
                    }));
                  }}
                  className="m3-select w-full text-xs p-2.5"
                >
                  <option value="">-- اختر الصنف --</option>
                  {productsList.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (متوفر: {formatNumber(Number(p.current_stock ?? p.stock ?? p.qty ?? 0))})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--md-on-surface)] mb-1.5">طريقة التسوية المالية:</label>
                <select
                  value={newReturn.refundMethod}
                  onChange={(e) => setNewReturn({ ...newReturn, refundMethod: e.target.value })}
                  className="m3-select w-full text-xs p-2.5"
                >
                  <option value="CREDIT_NOTE">خصم من رصيد الحساب الآجل (إشعار دائن/مدين)</option>
                  <option value="CASH">استرداد / توريد نقدي في الصندوق</option>
                  <option value="BANK">تحويل / تسوية بنكية</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--md-on-surface)] mb-1.5">الكمية المرتجعة:</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={newReturn.items[0]?.quantity || '1'}
                  onChange={(e) =>
                    setNewReturn((prev) => ({
                      ...prev,
                      items: [{ ...prev.items[0], quantity: e.target.value }],
                    }))
                  }
                  className="m3-input w-full text-xs p-2.5 font-mono tabular-nums"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--md-on-surface)] mb-1.5">
                  {newReturn.type === 'SALES' ? `سعر البيع للوحدة (${currSym}):` : `سعر التكلفة للوحدة (${currSym}):`}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={newReturn.items[0]?.priceOrCost || '0'}
                  onChange={(e) =>
                    setNewReturn((prev) => ({
                      ...prev,
                      items: [{ ...prev.items[0], priceOrCost: e.target.value }],
                    }))
                  }
                  className="m3-input w-full text-xs p-2.5 font-mono tabular-nums"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--md-on-surface)] mb-1.5">سبب المردود / رقم الفاتورة المرجعية:</label>
                <input
                  type="text"
                  value={newReturn.reason}
                  onChange={(e) => setNewReturn({ ...newReturn, reason: e.target.value })}
                  placeholder="مثال: تلف أثناء الشحن / فاتورة #INV-102"
                  className="m3-input w-full text-xs p-2.5"
                />
              </div>

              <div className="md:col-span-2 lg:col-span-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[var(--md-outline-variant)]">
                <div className="text-xs text-[var(--md-on-surface-variant)]">
                  إجمالي قيمة المردود المحتسبة:{' '}
                  <span className="font-mono tabular-nums font-black text-[var(--md-primary-text)] text-sm">
                    {formatNumber(
                      (parseFloat(newReturn.items[0]?.quantity || '0') || 0) *
                        (parseFloat(newReturn.items[0]?.priceOrCost || '0') || 0)
                    )}{' '}
                    {currSym}
                  </span>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="m3-btn-primary px-6 py-2.5 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>اعتماد وترحيل المردود</span>
                </button>
              </div>
            </form>
          </div>

          {/* Returns Log Table */}
          <div className="m3-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--md-on-surface)] flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[var(--md-primary-text)]" />
                <span>سجل مردودات المبيعات والمشتريات ({salesReturns.length + purchaseReturns.length})</span>
              </h3>
              <span className="text-[11px] font-mono text-[var(--md-on-surface-variant)]">
                مبيعات: {salesReturns.length} • مشتريات: {purchaseReturns.length}
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[var(--md-outline-variant)]">
              <table className="m3-table w-full text-xs text-right border-collapse">
                <thead className="m3-thead">
                  <tr>
                    <th className="m3-th">رقم المردود</th>
                    <th className="m3-th">النوع</th>
                    <th className="m3-th">الطرف (عميل / مورد)</th>
                    <th className="m3-th">التفاصيل / السبب</th>
                    <th className="m3-th text-center">طريقة التسوية</th>
                    <th className="m3-th text-center">الإجمالي ({currSym})</th>
                    <th className="m3-th text-center">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--md-outline-variant)]">
                  {salesReturns.length === 0 && purchaseReturns.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[var(--md-on-surface-variant)] text-xs">
                        لا توجد مردودات مبيعات أو مشتريات مسجلة حتى الآن.
                      </td>
                    </tr>
                  ) : (
                    [
                      ...salesReturns.map((r: any) => ({ ...r, _kind: 'SALES' })),
                      ...purchaseReturns.map((r: any) => ({ ...r, _kind: 'PURCHASE' })),
                    ]
                      .sort((a, b) => new Date(b.created_at || b.date || 0).getTime() - new Date(a.created_at || a.date || 0).getTime())
                      .map((ret: any) => {
                        const isSales = ret._kind === 'SALES';
                        const entityObj = isSales
                          ? customersList.find((c: any) => String(c.id) === String(ret.customer_id))
                          : suppliersList.find((s: any) => String(s.id) === String(ret.supplier_id));
                        const entityLabel =
                          ret.customer_name ||
                          ret.supplier_name ||
                          entityObj?.name ||
                          (isSales ? 'عميل عام' : 'مورد عام');
                        const totalVal = Number(ret.total_amount ?? ret.total ?? ret.refundAmount ?? 0);
                        const itemCount = Array.isArray(ret.items) ? ret.items.reduce((s: number, it: any) => s + Number(it.quantity || 1), 0) : 1;
                        return (
                          <tr key={ret.id} className="hover:bg-[var(--md-surface-container-low)] transition-colors">
                            <td className="py-3 px-3 font-mono font-bold text-[var(--md-on-surface)]">
                              {ret.return_number || ret.returnNumber || ret.id}
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`m3-badge text-[10px] ${
                                  isSales
                                    ? 'm3-badge-success'
                                    : 'm3-badge-warning'
                                }`}
                              >
                                {isSales ? 'مردود مبيعات' : 'مردود مشتريات'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-[var(--md-on-surface)] font-medium">{entityLabel}</td>
                            <td className="py-3 px-3 text-[var(--md-on-surface-variant)]">
                              {ret.reason || 'مردود بضاعة'} ({itemCount} وحدة)
                            </td>
                            <td className="py-3 px-3 text-center text-[var(--md-on-surface-variant)]">
                              {ret.refund_method === 'CASH'
                                ? 'نقدي (صندوق)'
                                : ret.refund_method === 'BANK'
                                ? 'تحويل بنكي'
                                : 'إشعار حساب آجل'}
                            </td>
                            <td className="py-3 px-3 text-center font-mono tabular-nums font-bold text-[var(--md-primary-text)]">
                              {formatNumber(totalVal)} {currSym}
                            </td>
                            <td className="py-3 px-3 text-center font-mono text-[11px] text-[var(--md-on-surface-variant)]">
                              {String(ret.created_at || ret.date || '').split('T')[0]}
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. SUBTAB: ACCOUNTING PERIOD & MONTH-END CLOSE (إغلاق الفترات والشهر)     */}
      {/* ========================================================================= */}
      {activeSubTab === 'period_close' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Periods List */}
          <div className="m3-card p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-[var(--md-on-surface)] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[var(--md-info)]" />
                <span>الفترات المحاسبية</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsNewPeriodOpen((v) => !v)}
                className="m3-btn-primary px-3 py-1.5 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>فتح فترة محاسبية جديدة</span>
              </button>
            </div>

            {isNewPeriodOpen && (
              <form onSubmit={handleCreatePeriod} className="p-3.5 bg-[var(--md-surface-container-low)] border border-[var(--md-primary)]/30 rounded-xl space-y-2.5 text-xs">
                <div>
                  <label className="block text-[10px] text-[var(--md-on-surface-variant)] mb-1">اسم الفترة المحاسبية:</label>
                  <input
                    type="text"
                    required
                    value={newPeriodForm.name}
                    onChange={(e) => setNewPeriodForm({ ...newPeriodForm, name: e.target.value })}
                    className="m3-input w-full px-2.5 py-2"
                    placeholder="مثال: فترة ديسمبر 2026"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-[var(--md-on-surface-variant)] mb-1">من تاريخ:</label>
                    <input
                      type="date"
                      required
                      value={newPeriodForm.startDate}
                      onChange={(e) => setNewPeriodForm({ ...newPeriodForm, startDate: e.target.value })}
                      className="m3-input w-full px-2 py-1.5 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[var(--md-on-surface-variant)] mb-1">إلى تاريخ:</label>
                    <input
                      type="date"
                      required
                      value={newPeriodForm.endDate}
                      onChange={(e) => setNewPeriodForm({ ...newPeriodForm, endDate: e.target.value })}
                      className="m3-input w-full px-2 py-1.5 font-mono"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsNewPeriodOpen(false)}
                    className="m3-btn-outlined px-3 py-1.5 text-[11px] font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="m3-btn-primary px-3.5 py-1.5 text-[11px] font-bold cursor-pointer"
                  >
                    حفظ وفتح الفترة
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-2.5">
              {periods.map((p) => {
                const startDateStr = p.start_date || p.startDate || '';
                const endDateStr = p.end_date || p.endDate || '';
                const isClosed = p.status === 'CLOSED' || p.is_closed;
                const isSelected = activePeriodId === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      setActivePeriodId(p.id);
                      fetchChecklist(p.id);
                    }}
                    className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-colors space-y-2 ${
                      isSelected
                        ? 'bg-[var(--md-primary-container)] border-[var(--md-primary)]/50 text-[var(--md-on-primary-container)]'
                        : 'bg-[var(--md-surface-container-low)] border-[var(--md-outline-variant)] text-[var(--md-on-surface)] hover:border-[var(--md-outline)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold">{p.name}</span>
                      <span
                        className={`m3-badge text-[10px] ${
                          isClosed
                            ? 'm3-badge-secondary'
                            : 'm3-badge-success'
                        }`}
                      >
                        {isClosed ? 'مغلقة ومعتمدة' : 'فترة مفتوحة'}
                      </span>
                    </div>
                    <div className="text-[11px] opacity-80 font-mono">
                      {startDateStr} إلى {endDateStr}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Month-End Close 12-Step Checklist */}
          <div className="lg:col-span-2 m3-card p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[var(--md-on-surface)]">قائمة فحص واعتماد الإقفال الشهري (12 خطوة)</h3>
                <p className="text-xs text-[var(--md-on-surface-variant)] mt-0.5">
                  إجراءات المراجعة الدقيقة لضمان توازن القوائم المالية قبل إغلاق الفترة وترحيل الأرباح المحتجزة
                </p>
              </div>

              <div className="flex items-center gap-3">
                {checklist && (
                  <div className="text-left font-mono bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] px-3 py-1.5 rounded-xl">
                    <span className="text-[10px] text-[var(--md-on-surface-variant)] block font-sans">نسبة الإنجاز:</span>
                    <span className="text-base font-black text-[var(--md-primary-text)] tabular-nums">{checklist.completion_percentage}%</span>
                  </div>
                )}

                {(() => {
                  const activePeriod = periods.find((p) => p.id === activePeriodId);
                  if (!activePeriod) return null;
                  const isClosed = activePeriod.status === 'CLOSED' || activePeriod.is_closed;
                  if (isClosed) {
                    return (
                      <button
                        type="button"
                        onClick={() => handleTogglePeriodStatus(activePeriod, 'OPEN')}
                        disabled={loading}
                        className="m3-btn-outlined px-3.5 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Unlock className="w-3.5 h-3.5 text-[var(--md-warning)]" />
                        <span>إعادة فتح الفترة</span>
                      </button>
                    );
                  }
                  if (confirmClosePeriodId === activePeriod.id) {
                    return (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleTogglePeriodStatus(activePeriod, 'CLOSE')}
                          disabled={loading}
                          className="m3-btn-danger px-3.5 py-2 text-xs font-bold cursor-pointer"
                        >
                          تأكيد الإغلاق النهائي ✓
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmClosePeriodId(null)}
                          className="m3-btn-outlined px-2.5 py-2 text-xs font-bold cursor-pointer"
                        >
                          تراجع
                        </button>
                      </div>
                    );
                  }
                  return (
                    <button
                      type="button"
                      onClick={() => setConfirmClosePeriodId(activePeriod.id)}
                      className="m3-btn-danger px-4 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>إغلاق الفترة الحالية وترحيل الأرباح</span>
                    </button>
                  );
                })()}
              </div>
            </div>

            {/* Checklist Items */}
            <div className="space-y-2">
              {checklist?.checklist_items &&
                (typeof checklist.checklist_items === 'string'
                  ? JSON.parse(checklist.checklist_items)
                  : checklist.checklist_items
                ).map((it: any) => (
                  <div
                    key={it.id}
                    onClick={() => handleToggleChecklist(it.id, it.completed)}
                    className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors text-xs ${
                      it.completed
                        ? 'bg-[var(--md-success-container)] border-[var(--md-success)]/35 text-[var(--md-on-success-container)]'
                        : 'bg-[var(--md-surface-container-low)] border-[var(--md-outline-variant)] text-[var(--md-on-surface)] hover:border-[var(--md-outline)]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={Boolean(it.completed)}
                        onChange={() => {}}
                        className="rounded border-[var(--md-outline)] bg-[var(--md-surface-container-lowest)] accent-[var(--md-primary)] w-4 h-4 cursor-pointer"
                      />
                      <span className={`font-medium ${it.completed ? 'line-through opacity-80' : ''}`}>
                        {it.title || it.task}
                      </span>
                    </div>

                    <span className="text-[10px] opacity-75 font-mono">خطوة #{it.id}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. SUBTAB: DOCUMENT VAULT (خزينة المستندات والمرفقات الرسمية)           */}
      {/* ========================================================================= */}
      {activeSubTab === 'documents' && (
        <div className="space-y-6">
          <div className="m3-card-elevated relative overflow-hidden p-6 space-y-5">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--md-primary)]" />
            <div>
              <h2 className="text-base font-bold text-[var(--md-on-surface)] flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-[var(--md-primary-text)]" />
                <span>خزينة المستندات والمرفقات الرسمية (Business Documents Vault)</span>
              </h2>
              <p className="text-xs text-[var(--md-on-surface-variant)] mt-1">
                حفظ وأرشفة العقود، السجلات التجارية، الشهادات الضريبية، مرفقات الفواتير، ومحاضر الجرد بحد أقصى 10 ميجابايت مع إمكانية المعاينة والطباعة الفورية
              </p>
            </div>

            <form onSubmit={handleUploadDocument} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-[var(--md-surface-container-low)] p-4 rounded-xl border border-[var(--md-outline-variant)]">
              <div>
                <label className="block text-[11px] font-bold text-[var(--md-on-surface-variant)] mb-1.5">عنوان المستند:</label>
                <input
                  type="text"
                  required
                  value={docForm.title}
                  onChange={(e) => setDocForm({ ...docForm, title: e.target.value })}
                  placeholder="مثال: السجل التجاري 2026"
                  className="m3-input w-full text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--md-on-surface-variant)] mb-1.5">تصنيف المستند:</label>
                <select
                  value={docForm.category}
                  onChange={(e) => setDocForm({ ...docForm, category: e.target.value })}
                  className="m3-select w-full text-xs"
                >
                  <option value="عقد">عقد واتفاقية</option>
                  <option value="سجل تجاري وضريبي">سجل تجاري وبطاقة ضريبية</option>
                  <option value="مرفق فاتورة">مرفق فاتورة مبيعات / مشتريات</option>
                  <option value="سند استلام">سند استلام وتسليم بضاعة</option>
                  <option value="محضر جرد">محضر جرد ومطابقة</option>
                  <option value="أخرى">مستندات إدارية أخرى</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--md-on-surface-variant)] mb-1.5">رقم المرجع / الربط (اختياري):</label>
                <input
                  type="text"
                  value={docForm.referenceNo}
                  onChange={(e) => setDocForm({ ...docForm, referenceNo: e.target.value })}
                  placeholder="مثال: INV-2026-01 أو CR-4421"
                  className="m3-input w-full text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--md-on-surface-variant)] mb-1.5">اختيار الملف (PDF / صورة / مستند):</label>
                <label className="w-full flex items-center justify-between gap-2 text-xs p-2.5 bg-[var(--md-surface-container-lowest)] border border-dashed border-[var(--md-outline)] hover:border-[var(--md-primary)] rounded-xl text-[var(--md-on-surface-variant)] cursor-pointer transition-colors">
                  <span className="truncate">{docForm.fileName || 'اضغط لاختيار ملف من الجهاز...'}</span>
                  <Paperclip className="w-4 h-4 text-[var(--md-primary-text)] shrink-0" />
                  <input type="file" onChange={handleDocFileChange} className="hidden" />
                </label>
              </div>

              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-[11px] font-bold text-[var(--md-on-surface-variant)] mb-1.5">ملاحظات وتفاصيل الأرشفة:</label>
                <input
                  type="text"
                  value={docForm.notes}
                  onChange={(e) => setDocForm({ ...docForm, notes: e.target.value })}
                  placeholder="تفاصيل تاريخ الانتهاء، الجهة المصدرة، أو وصف المحتوى..."
                  className="m3-input w-full text-xs"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="m3-btn-primary w-full py-2.5 px-4 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>حفظ وأرشفة المستند</span>
                </button>
              </div>
            </form>
          </div>

          {/* Documents Archive Table */}
          <div className="m3-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--md-on-surface)] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[var(--md-primary-text)]" />
                <span>المستندات المؤرشفة ({documentsList.length})</span>
              </h3>
              <span className="text-[11px] font-mono text-[var(--md-on-surface-variant)]">معزولة ومؤمّنة بالكامل للشركة</span>
            </div>

            <div className="overflow-x-auto">
              <table className="m3-table w-full text-xs text-right border-collapse">
                <thead className="m3-thead">
                  <tr>
                    <th className="m3-th py-3 px-3 font-bold">عنوان المستند</th>
                    <th className="m3-th py-3 px-3 font-bold">التصنيف</th>
                    <th className="m3-th py-3 px-3 font-bold">المرجع / الملاحظات</th>
                    <th className="m3-th py-3 px-3 font-bold">الملف والحجم</th>
                    <th className="m3-th py-3 px-3 font-bold text-center">تاريخ الأرشفة</th>
                    <th className="m3-th py-3 px-3 font-bold text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--md-outline-variant)]">
                  {documentsList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[var(--md-on-surface-variant)] text-xs">
                        لا توجد مستندات مؤرشفة بعد. ارفع أول مستند من النموذج أعلاه.
                      </td>
                    </tr>
                  ) : (
                    documentsList.map((doc: any) => (
                      <tr key={doc.id} className="hover:bg-[var(--md-surface-container-low)] transition-colors">
                        <td className="py-3 px-3 font-bold text-[var(--md-on-surface)]">{doc.title}</td>
                        <td className="py-3 px-3">
                          <span className="m3-badge m3-badge-info text-[10px]">
                            {doc.category}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[var(--md-on-surface-variant)]">
                          {doc.reference_no || doc.entity_id ? (
                            <span className="font-mono text-[var(--md-primary-text)] ml-2">#{doc.reference_no || doc.entity_id}</span>
                          ) : null}
                          <span>{doc.notes || '—'}</span>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-[var(--md-on-surface)] tabular-nums">
                          <div>{doc.file_name}</div>
                          <div className="text-[var(--md-on-surface-variant)]">{formatFileSize(doc.file_size)}</div>
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-[11px] text-[var(--md-on-surface-variant)] tabular-nums">
                          {String(doc.uploaded_at || '').split('T')[0]}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setPreviewDoc(doc)}
                              className="m3-btn-outlined px-2.5 py-1.5 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-[var(--md-info)]" />
                              <span>معاينة</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePrintDocument(doc)}
                              className="m3-btn-tonal px-2.5 py-1.5 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>طباعة</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDocument(doc.id)}
                              className="m3-btn-danger p-1.5 rounded-lg cursor-pointer"
                              title="حذف المستند"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Document Preview Modal */}
          {previewDoc && (
            <div className="m3-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="m3-modal-surface w-full max-w-2xl overflow-hidden">
                <div className="p-4 bg-[var(--md-surface-container-low)] border-b border-[var(--md-outline-variant)] flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[var(--md-on-surface)] flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-[var(--md-primary-text)]" />
                    <span>{previewDoc.title}</span>
                  </h3>
                  <button type="button" onClick={() => setPreviewDoc(null)} className="m3-btn-text p-1.5 rounded-lg cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-5 space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-3 bg-[var(--md-surface-container-low)] p-3.5 rounded-xl border border-[var(--md-outline-variant)]">
                    <div><span className="text-[var(--md-on-surface-variant)]">التصنيف:</span> <span className="font-bold text-[var(--md-on-surface)]">{previewDoc.category}</span></div>
                    <div><span className="text-[var(--md-on-surface-variant)]">المرجع:</span> <span className="font-mono text-[var(--md-primary-text)]">{previewDoc.reference_no || previewDoc.entity_id || '—'}</span></div>
                    <div><span className="text-[var(--md-on-surface-variant)]">اسم الملف:</span> <span className="font-mono text-[var(--md-on-surface)]">{previewDoc.file_name}</span></div>
                    <div><span className="text-[var(--md-on-surface-variant)]">الحجم:</span> <span className="font-mono text-[var(--md-on-surface)] tabular-nums">{formatFileSize(previewDoc.file_size)}</span></div>
                    {previewDoc.notes && (
                      <div className="col-span-2"><span className="text-[var(--md-on-surface-variant)]">ملاحظات:</span> <span className="text-[var(--md-on-surface)]">{previewDoc.notes}</span></div>
                    )}
                  </div>

                  {previewDoc.data_url && String(previewDoc.mime_type || '').startsWith('image/') ? (
                    <div className="bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] rounded-xl p-3 flex justify-center">
                      <img src={previewDoc.data_url} alt={previewDoc.title} className="max-h-96 object-contain rounded-lg" />
                    </div>
                  ) : previewDoc.data_url && String(previewDoc.mime_type || '').includes('pdf') ? (
                    <iframe src={previewDoc.data_url} title={previewDoc.title} className="w-full h-96 rounded-xl border border-[var(--md-outline-variant)] bg-white" />
                  ) : (
                    <div className="p-6 text-center bg-[var(--md-surface-container-low)] border border-dashed border-[var(--md-outline)] rounded-xl text-[var(--md-on-surface-variant)]">
                      ملف مرفق: <span className="font-mono text-[var(--md-on-surface)]">{previewDoc.file_name}</span> — يمكنك استخدام زر «طباعة» لتوليد وثيقة الأرشفة الرسمية.
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2 border-t border-[var(--md-outline-variant)]">
                    <button
                      type="button"
                      onClick={() => handlePrintDocument(previewDoc)}
                      className="m3-btn-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>طباعة الوثيقة</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewDoc(null)}
                      className="m3-btn-outlined px-4 py-2 text-xs font-bold cursor-pointer"
                    >
                      إغلاق
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. SUBTAB: GLOBAL SEARCH & DATA MODE (البحث الشامل ووضع بيانات التشغيل)   */}
      {/* ========================================================================= */}
      {activeSubTab === 'search_mode' && (
        <div className="space-y-6">
          {/* Global Multi-Entity Search */}
          <div className="m3-card-elevated relative overflow-hidden p-6 space-y-5">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--md-primary)]" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-[var(--md-on-surface)] flex items-center gap-2">
                  <Search className="w-5 h-5 text-[var(--md-primary-text)]" />
                  <span>البحث الشامل في كافة سجلات الشركة (Global Multi-Entity Search)</span>
                </h2>
                <p className="text-xs text-[var(--md-on-surface-variant)] mt-1">
                  بحث فوري موحد عبر العملاء، الموردين، الأصناف، فواتير المبيعات، فواتير المشتريات، وسندات الخزينة
                </p>
              </div>
              {searchResults && (
                <span className="m3-badge m3-badge-info text-xs font-mono tabular-nums">
                  إجمالي النتائج: {searchResults.totalHits ?? 0}
                </span>
              )}
            </div>

            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالاسم، رقم الفاتورة، الباركود، رقم الهاتف، أو رقم السند..."
                className="m3-input flex-1 text-xs py-3"
              />
              <button
                type="submit"
                disabled={loading || !searchQuery.trim()}
                className="m3-btn-primary px-6 py-3 text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                بحث شامل
              </button>
            </form>

            {searchResults && (
              <div className="space-y-5 pt-2 text-xs">
                {/* 1. Customers */}
                {searchResults.customers?.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-[var(--md-success)]">العملاء المطابقون ({searchResults.customers.length})</h4>
                      <button type="button" onClick={() => onNavigate?.('customers')} className="text-[11px] text-[var(--md-primary-text)] hover:underline flex items-center gap-1 cursor-pointer">
                        <span>فتح القائمة ↗</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {searchResults.customers.map((c: any) => (
                        <div key={c.id} onClick={() => onNavigate?.('customers')} className="p-3 bg-[var(--md-surface-container-low)] hover:border-[var(--md-primary)]/50 rounded-xl border border-[var(--md-outline-variant)] cursor-pointer transition-all">
                          <div className="font-bold text-[var(--md-on-surface)]">{c.name}</div>
                          <div className="text-[11px] text-[var(--md-on-surface-variant)] font-mono tabular-nums mt-1">
                            الرصيد: {formatNumber(Number(c.current_balance ?? c.balance ?? 0))} {currSym}
                            {c.phone ? ` • ${c.phone}` : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Suppliers */}
                {searchResults.suppliers?.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-[var(--md-warning)]">الموردون المطابقون ({searchResults.suppliers.length})</h4>
                      <button type="button" onClick={() => onNavigate?.('suppliers')} className="text-[11px] text-[var(--md-primary-text)] hover:underline flex items-center gap-1 cursor-pointer">
                        <span>فتح القائمة ↗</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {searchResults.suppliers.map((s: any) => (
                        <div key={s.id} onClick={() => onNavigate?.('suppliers')} className="p-3 bg-[var(--md-surface-container-low)] hover:border-[var(--md-warning)]/50 rounded-xl border border-[var(--md-outline-variant)] cursor-pointer transition-all">
                          <div className="font-bold text-[var(--md-on-surface)]">{s.name}</div>
                          <div className="text-[11px] text-[var(--md-on-surface-variant)] font-mono tabular-nums mt-1">
                            الرصيد: {formatNumber(Number(s.current_balance ?? s.balance ?? 0))} {currSym}
                            {s.phone ? ` • ${s.phone}` : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Products */}
                {searchResults.products?.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-[var(--md-primary-text)]">الأصناف والمخزون ({searchResults.products.length})</h4>
                      <button type="button" onClick={() => onNavigate?.('products')} className="text-[11px] text-[var(--md-primary-text)] hover:underline flex items-center gap-1 cursor-pointer">
                        <span>فتح القائمة ↗</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {searchResults.products.map((p: any) => (
                        <div key={p.id} onClick={() => onNavigate?.('products')} className="p-3 bg-[var(--md-surface-container-low)] hover:border-[var(--md-primary)]/50 rounded-xl border border-[var(--md-outline-variant)] cursor-pointer transition-all">
                          <div className="font-bold text-[var(--md-on-surface)]">{p.name}</div>
                          <div className="text-[11px] text-[var(--md-on-surface-variant)] font-mono tabular-nums mt-1">
                            المخزون: {formatNumber(Number(p.current_stock ?? p.stock ?? p.qty ?? 0))} | السعر: {formatNumber(Number(p.selling_price ?? p.sale_price ?? p.price ?? 0))} {currSym}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Sales Invoices */}
                {searchResults.invoices?.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-[var(--md-info)]">فواتير المبيعات ({searchResults.invoices.length})</h4>
                      <button type="button" onClick={() => onNavigate?.('invoices')} className="text-[11px] text-[var(--md-primary-text)] hover:underline flex items-center gap-1 cursor-pointer">
                        <span>فتح القائمة ↗</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {searchResults.invoices.map((inv: any) => (
                        <div key={inv.id} onClick={() => onNavigate?.('invoices')} className="p-3 bg-[var(--md-surface-container-low)] hover:border-[var(--md-info)]/50 rounded-xl border border-[var(--md-outline-variant)] cursor-pointer transition-all">
                          <div className="font-bold text-[var(--md-on-surface)] font-mono">#{inv.invoice_number || inv.invoiceNumber || inv.id}</div>
                          <div className="text-[11px] text-[var(--md-on-surface-variant)] mt-0.5">{inv.customer_name || inv.customerName || 'عميل نقدي'}</div>
                          <div className="text-[11px] text-[var(--md-success)] font-mono tabular-nums mt-1">
                            الإجمالي: {formatNumber(Number(inv.total ?? inv.total_amount ?? 0))} {currSym}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. Purchase Invoices */}
                {searchResults.purchaseInvoices?.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-[var(--md-secondary)]">فواتير المشتريات ({searchResults.purchaseInvoices.length})</h4>
                      <button type="button" onClick={() => onNavigate?.('purchase_invoices')} className="text-[11px] text-[var(--md-primary-text)] hover:underline flex items-center gap-1 cursor-pointer">
                        <span>فتح القائمة ↗</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {searchResults.purchaseInvoices.map((pur: any) => (
                        <div key={pur.id} onClick={() => onNavigate?.('purchase_invoices')} className="p-3 bg-[var(--md-surface-container-low)] hover:border-[var(--md-secondary)]/50 rounded-xl border border-[var(--md-outline-variant)] cursor-pointer transition-all">
                          <div className="font-bold text-[var(--md-on-surface)] font-mono">#{pur.invoice_number || pur.invoiceNumber || pur.id}</div>
                          <div className="text-[11px] text-[var(--md-on-surface-variant)] mt-0.5">{pur.supplier_name || pur.supplierName || 'مورد عام'}</div>
                          <div className="text-[11px] text-[var(--md-warning)] font-mono tabular-nums mt-1">
                            الإجمالي: {formatNumber(Number(pur.total ?? pur.total_amount ?? 0))} {currSym}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. Payments / Vouchers */}
                {searchResults.payments?.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-[var(--md-primary-text)]">سندات الخزينة والبنك ({searchResults.payments.length})</h4>
                      <button type="button" onClick={() => onNavigate?.('payments')} className="text-[11px] text-[var(--md-primary-text)] hover:underline flex items-center gap-1 cursor-pointer">
                        <span>فتح القائمة ↗</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {searchResults.payments.map((pmt: any) => (
                        <div key={pmt.id} onClick={() => onNavigate?.('payments')} className="p-3 bg-[var(--md-surface-container-low)] hover:border-[var(--md-primary)]/50 rounded-xl border border-[var(--md-outline-variant)] cursor-pointer transition-all">
                          <div className="font-bold text-[var(--md-on-surface)] font-mono">#{pmt.voucher_number || pmt.payment_number || pmt.id}</div>
                          <div className="text-[11px] text-[var(--md-on-surface-variant)] mt-0.5">{pmt.customer_name || pmt.supplier_name || pmt.party_name || pmt.description || 'سند مالي'}</div>
                          <div className="text-[11px] text-[var(--md-primary-text)] font-mono tabular-nums mt-1">
                            المبلغ: {formatNumber(Number(pmt.amount || 0))} {currSym}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(searchResults.totalHits ?? 0) === 0 && (
                  <div className="p-6 text-center bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] rounded-xl text-[var(--md-on-surface-variant)]">
                    لم يتم العثور على سجلات مطابقة لعبارة البحث «{searchQuery}».
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Data Mode Management & Quick ERP Menus Launcher */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="m3-card p-6 space-y-4">
              <h3 className="text-sm font-bold text-[var(--md-on-surface)] flex items-center gap-2">
                <Database className="w-4 h-4 text-[var(--md-primary-text)]" />
                <span>إدارة وضع بيانات التشغيل (إنتاجي حقيقي / تجريبي)</span>
              </h3>
              <p className="text-xs text-[var(--md-on-surface-variant)]">
                التحكم في نمط تشغيل النظام ومراقبة جاهزية القوائم الأساسية للعمل الفعلي بدون أي بيانات افتراضية
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center font-mono tabular-nums">
                <div className="p-3 bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] rounded-xl">
                  <div className="text-[10px] text-[var(--md-on-surface-variant)] font-sans">العملاء</div>
                  <div className="text-base font-black text-[var(--md-success)]">{customersList.length}</div>
                </div>
                <div className="p-3 bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] rounded-xl">
                  <div className="text-[10px] text-[var(--md-on-surface-variant)] font-sans">الموردون</div>
                  <div className="text-base font-black text-[var(--md-warning)]">{suppliersList.length}</div>
                </div>
                <div className="p-3 bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] rounded-xl">
                  <div className="text-[10px] text-[var(--md-on-surface-variant)] font-sans">الأصناف</div>
                  <div className="text-base font-black text-[var(--md-info)]">{productsList.length}</div>
                </div>
                <div className="p-3 bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] rounded-xl">
                  <div className="text-[10px] text-[var(--md-on-surface-variant)] font-sans">توازن GL</div>
                  <div className={`text-sm font-black mt-0.5 font-sans ${operatingData?.glBalanced !== false ? 'text-[var(--md-success)]' : 'text-[var(--md-error)]'}`}>
                    {operatingData?.glBalanced !== false ? 'متوازن ✓' : 'غير متوازن'}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => handleSwitchDataMode('PRODUCTION')}
                  disabled={loading}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    dataMode === 'PRODUCTION'
                      ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)] border-[var(--md-primary)]'
                      : 'bg-[var(--md-surface-container-low)] text-[var(--md-on-surface)] border-[var(--md-outline-variant)] hover:border-[var(--md-primary)]/50'
                  }`}
                >
                  اعتماد وضع الإنتاج الحقيقي (Production)
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchDataMode('DEMO')}
                  disabled={loading}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    dataMode === 'DEMO'
                      ? 'bg-[var(--md-warning-container)] text-[var(--md-on-warning-container)] border-[var(--md-warning)]/40'
                      : 'bg-[var(--md-surface-container-low)] text-[var(--md-on-surface)] border-[var(--md-outline-variant)] hover:border-[var(--md-warning)]/50'
                  }`}
                >
                  وضع المعاينة والتجريب (Demo)
                </button>
              </div>
            </div>

            <div className="m3-card p-6 space-y-4">
              <h3 className="text-sm font-bold text-[var(--md-on-surface)] flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-[var(--md-primary-text)]" />
                <span>الانتقال السريع لقوائم النظام الرئيسية</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {[
                  { id: 'overview', label: 'لوحة التحكم' },
                  { id: 'pos', label: 'نقطة البيع (كاشير)' },
                  { id: 'invoices', label: 'فواتير المبيعات' },
                  { id: 'purchase_invoices', label: 'فواتير المشتريات' },
                  { id: 'products', label: 'الأصناف والمخزون' },
                  { id: 'customers', label: 'العملاء والمدينون' },
                  { id: 'suppliers', label: 'الموردون والدائنون' },
                  { id: 'payments', label: 'سندات الخزينة' },
                  { id: 'ledger', label: 'دفتر الأستاذ العام' },
                ].map((nav) => (
                  <button
                    key={nav.id}
                    type="button"
                    onClick={() => onNavigate?.(nav.id)}
                    className="p-2.5 bg-[var(--md-surface-container-low)] hover:bg-[var(--md-surface-container-high)] border border-[var(--md-outline-variant)] hover:border-[var(--md-primary)]/40 text-[var(--md-on-surface)] rounded-xl text-right font-bold flex items-center justify-between cursor-pointer transition-all"
                  >
                    <span>{nav.label}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-[var(--md-primary-text)] shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 10. SUBTAB: SALES REPRESENTATIVES & COMMISSIONS (إدارة مناديب التوزيع)     */}
      {/* ========================================================================= */}
      {activeSubTab === 'sales_reps' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="m3-card p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-[var(--md-on-surface)] flex items-center gap-2">
                <Users className="w-5 h-5 text-[var(--md-primary-text)]" />
                <span>إدارة مناديب التوزيع الميداني والأهداف والعمولات</span>
                <span className="m3-badge m3-badge-primary text-[10px] font-mono tabular-nums">
                  {salesReps.length} مناديب
                </span>
              </h2>
              <p className="text-xs text-[var(--md-on-surface-variant)] mt-1">
                ربط حي مع فواتير المبيعات وسندات القبض، متابعة خطوط السير وتحقيق التارجت، وتوريد التحصيلات للخزينة آلياً
              </p>
            </div>

            <div className="flex items-center gap-2">
              {salesReps.length > 0 && (
                <button
                  onClick={handleClearAllReps}
                  className="m3-btn-danger px-3 py-2.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                  title="تصفير وحذف كافة مناديب التوزيع"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>تصفير كافة المناديب</span>
                </button>
              )}
              <button
                onClick={handleOpenCreateRep}
                className="m3-btn-primary px-4 py-2.5 text-xs font-bold flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ تسجيل مندوب جديد</span>
              </button>
            </div>
          </div>

          {/* KPI Summary Cards */}
          {(() => {
            const liveTotals = salesReps.reduce(
              (acc, r) => {
                const live = getRepLiveMetrics(r);
                return {
                  sales: acc.sales + live.effectiveSales,
                  collected: acc.collected + live.effectiveCollected,
                  pending: acc.pending + r.pendingReceivables,
                  commission: acc.commission + live.effectiveCommission,
                };
              },
              { sales: 0, collected: 0, pending: 0, commission: 0 }
            );
            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="m3-card p-4 flex flex-col justify-between">
                  <span className="text-[var(--md-on-surface-variant)] text-[11px] font-bold">إجمالي مبيعات المناديب:</span>
                  <div className="text-lg font-bold font-mono tabular-nums text-[var(--md-success)] mt-1">
                    {formatNumber(liveTotals.sales)}
                    <span className="text-[10px] text-[var(--md-on-surface-variant)] mr-1">{currSym}</span>
                  </div>
                </div>

                <div className="m3-card p-4 flex flex-col justify-between">
                  <span className="text-[var(--md-on-surface-variant)] text-[11px] font-bold">إجمالي النقدية الموردة:</span>
                  <div className="text-lg font-bold font-mono tabular-nums text-[var(--md-info)] mt-1">
                    {formatNumber(liveTotals.collected)}
                    <span className="text-[10px] text-[var(--md-on-surface-variant)] mr-1">{currSym}</span>
                  </div>
                </div>

                <div className="m3-card p-4 flex flex-col justify-between">
                  <span className="text-[var(--md-on-surface-variant)] text-[11px] font-bold">الذمم الآجلة المعلقة:</span>
                  <div className="text-lg font-bold font-mono tabular-nums text-[var(--md-warning)] mt-1">
                    {formatNumber(liveTotals.pending)}
                    <span className="text-[10px] text-[var(--md-on-surface-variant)] mr-1">{currSym}</span>
                  </div>
                </div>

                <div className="p-4 bg-[var(--md-primary-container)] border border-[var(--md-primary)]/30 rounded-2xl flex flex-col justify-between">
                  <span className="text-[var(--md-on-primary-container)] text-[11px] font-bold">إجمالي العمولات المستحقة:</span>
                  <div className="text-lg font-bold font-mono tabular-nums text-[var(--md-on-primary-container)] mt-1">
                    {formatNumber(liveTotals.commission)}
                    <span className="text-[10px] opacity-80 mr-1">{currSym}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Reps Table */}
          <div className="m3-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="m3-table w-full text-xs text-right">
                <thead className="m3-thead">
                  <tr>
                    <th className="m3-th py-3 px-4 font-bold">المندوب</th>
                    <th className="m3-th py-3 px-4 font-bold">خط السير والسيارة</th>
                    <th className="m3-th py-3 px-4 font-bold text-center">الهدف الشهري</th>
                    <th className="m3-th py-3 px-4 font-bold text-center">المبيعات المحققة</th>
                    <th className="m3-th py-3 px-4 font-bold text-center">نسبة الإنجاز</th>
                    <th className="m3-th py-3 px-4 font-bold text-center">التحصيل النقدي</th>
                    <th className="m3-th py-3 px-4 font-bold text-center">الذمم المعلقة</th>
                    <th className="m3-th py-3 px-4 font-bold text-center">نسبة العمولة</th>
                    <th className="m3-th py-3 px-4 font-bold text-center">صافي العمولة</th>
                    <th className="m3-th py-3 px-4 font-bold text-center">الحالة</th>
                    <th className="m3-th py-3 px-4 font-bold text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--md-outline-variant)] font-mono tabular-nums">
                  {salesReps.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-[var(--md-on-surface-variant)] text-xs font-sans">
                        لا يوجد مناديب توزيع مسجلين حالياً. اضغط على «+ تسجيل مندوب جديد» لإضافة مندوب ميداني.
                      </td>
                    </tr>
                  ) : (
                    salesReps.map((rep) => {
                      const live = getRepLiveMetrics(rep);
                      const achievementPct = rep.monthlyTarget > 0 ? (live.effectiveSales / rep.monthlyTarget) * 100 : 0;
                      return (
                        <tr key={rep.id} className="hover:bg-[var(--md-surface-container-low)] transition-colors">
                          <td className="py-3.5 px-4 font-sans">
                            <div className="font-bold text-[var(--md-on-surface)] text-xs">{rep.name}</div>
                            <div className="text-[10px] text-[var(--md-on-surface-variant)] font-mono">
                              {rep.code} • {rep.phone}
                            </div>
                            {(live.invoiceCount > 0 || live.receiptCount > 0) && (
                              <div className="text-[10px] text-[var(--md-primary-text)] font-mono mt-0.5">
                                ربط حي: {live.invoiceCount} فاتورة • {live.receiptCount} سند
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 font-sans">
                            <div className="text-[var(--md-on-surface)]">{rep.territory}</div>
                            <div className="text-[10px] text-[var(--md-on-surface-variant)]">{rep.vehicle}</div>
                          </td>

                          <td className="py-3.5 px-4 text-center font-bold text-[var(--md-on-surface-variant)]">
                            {formatNumber(rep.monthlyTarget)}
                          </td>

                          <td className="py-3.5 px-4 text-center font-bold text-[var(--md-success)]">
                            {formatNumber(live.effectiveSales)}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <div className="space-y-1">
                              <span className="font-bold text-[11px] text-[var(--md-on-surface)]">
                                {achievementPct.toFixed(1)}%
                              </span>
                              <div className="w-16 h-1.5 bg-[var(--md-surface-container-highest)] rounded-full mx-auto overflow-hidden">
                                <div
                                  style={{ width: `${Math.min(100, achievementPct)}%` }}
                                  className="h-full bg-[var(--md-primary)] rounded-full"
                                />
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-center text-[var(--md-info)] font-bold">
                            {formatNumber(live.effectiveCollected)}
                          </td>

                          <td className="py-3.5 px-4 text-center text-[var(--md-warning)] font-bold">
                            {formatNumber(rep.pendingReceivables)}
                          </td>

                          <td className="py-3.5 px-4 text-center text-[var(--md-on-surface-variant)] font-bold">
                            {rep.commissionRate}%
                          </td>

                          <td className="py-3.5 px-4 text-center text-[var(--md-primary-text)] font-black text-xs">
                            {formatNumber(live.effectiveCommission)} {currSym}
                          </td>

                          <td className="py-3.5 px-4 text-center font-sans">
                            <span
                              className={`m3-badge text-[10px] ${
                                rep.status === 'ACTIVE'
                                  ? 'm3-badge-success'
                                  : 'bg-[var(--md-surface-container-high)] text-[var(--md-on-surface-variant)]'
                              }`}
                            >
                              {rep.status === 'ACTIVE' ? 'نشط في الميدان' : 'متوقف'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-center font-sans">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              <button
                                onClick={() => handleOpenRemitModal(rep)}
                                title="توريد تحصيل نقدي أو بنكي من المندوب للخزينة"
                                className="m3-btn-tonal px-2 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                              >
                                <Send className="w-3 h-3" />
                                <span>توريد للخزينة</span>
                              </button>
                              <button
                                onClick={() => handleOpenEditRep(rep)}
                                title="تعديل بيانات المندوب والهدف"
                                className="m3-btn-outlined px-2 py-1.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                              >
                                تعديل
                              </button>
                              <button
                                onClick={() =>
                                  handlePrintRepStatement({
                                    ...rep,
                                    achievedSales: live.effectiveSales,
                                    collectedCash: live.effectiveCollected,
                                    earnedCommission: live.effectiveCommission,
                                  })
                                }
                                title="طباعة كشف أداء وتصفية عمولة المندوب"
                                className="m3-btn-outlined px-2 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[var(--md-primary-text)]"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span className="text-[10px]">كشف</span>
                              </button>
                              <button
                                onClick={() => handleDeleteRep(rep.id, rep.name)}
                                title="حذف مندوب المبيعات"
                                className="m3-btn-danger p-1.5 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: توريد تحصيل مندوب للخزينة (Treasury Remittance Modal)              */}
      {/* ========================================================================= */}
      {remittingRep && (
        <div className="m3-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="m3-modal-surface w-full max-w-md overflow-hidden">
            <div className="p-4 bg-[var(--md-surface-container-low)] border-b border-[var(--md-outline-variant)] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--md-on-surface)] flex items-center gap-2">
                <Wallet className="w-4 h-4 text-[var(--md-primary-text)]" />
                <span>توريد تحصيل للخزينة — {remittingRep.name}</span>
              </h3>
              <button type="button" onClick={() => setRemittingRep(null)} className="m3-btn-text p-1.5 rounded-lg cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitRemit} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] rounded-xl flex items-center justify-between">
                <span className="text-[var(--md-on-surface-variant)]">الذمم المعلقة الحالية على المندوب:</span>
                <span className="font-mono tabular-nums font-bold text-[var(--md-warning)]">
                  {formatNumber(remittingRep.pendingReceivables)} {currSym}
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--md-on-surface-variant)] mb-1.5">المبلغ المورد للخزينة ({currSym}):</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={remitForm.amount}
                  onChange={(e) => setRemitForm({ ...remitForm, amount: e.target.value })}
                  className="m3-input w-full font-mono tabular-nums"
                  placeholder="أدخل مبلغ التحصيل"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--md-on-surface-variant)] mb-1.5">قناة التوريد:</label>
                <select
                  value={remitForm.paymentMethod}
                  onChange={(e) => setRemitForm({ ...remitForm, paymentMethod: e.target.value })}
                  className="m3-select w-full"
                >
                  <option value="CASH">الخزينة الرئيسية (نقداً)</option>
                  <option value="BANK">الحساب البنكي (تحويل / إيداع)</option>
                  <option value="WALLET">محفظة إلكترونية</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--md-on-surface-variant)] mb-1.5">البيان / الملاحظات:</label>
                <input
                  type="text"
                  value={remitForm.notes}
                  onChange={(e) => setRemitForm({ ...remitForm, notes: e.target.value })}
                  className="m3-input w-full"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--md-outline-variant)]">
                <button
                  type="button"
                  onClick={() => setRemittingRep(null)}
                  className="m3-btn-outlined px-4 py-2 font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="m3-btn-primary px-5 py-2 font-bold cursor-pointer"
                >
                  اعتماد سند القبض والتوريد ✓
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: إضافة / تعديل مندوب مبيعات (Add/Edit Sales Rep Modal)               */}
      {/* ========================================================================= */}
      {isRepModalOpen && (
        <div className="m3-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="m3-modal-surface w-full max-w-lg overflow-hidden">
            <div className="p-4 bg-[var(--md-surface-container-low)] border-b border-[var(--md-outline-variant)] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--md-on-surface)] flex items-center gap-2">
                <Users className="w-4 h-4 text-[var(--md-primary-text)]" />
                <span>{editingRep ? 'تعديل بيانات مندوب المبيعات' : 'تسجيل مندوب مبيعات وتوزيع جديد'}</span>
              </h3>
              <button
                onClick={() => setIsRepModalOpen(false)}
                className="m3-btn-text p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRep} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[var(--md-on-surface-variant)] mb-1">اسم المندوب:</label>
                  <input
                    type="text"
                    required
                    value={repFormData.name}
                    onChange={(e) => setRepFormData({ ...repFormData, name: e.target.value })}
                    className="m3-input w-full"
                    placeholder="مثال: أحمد ناصر العمري"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[var(--md-on-surface-variant)] mb-1">كود المندوب:</label>
                  <input
                    type="text"
                    value={repFormData.code}
                    onChange={(e) => setRepFormData({ ...repFormData, code: e.target.value })}
                    className="m3-input w-full font-mono"
                    placeholder="REP-01"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[var(--md-on-surface-variant)] mb-1">رقم الهاتف:</label>
                  <input
                    type="text"
                    value={repFormData.phone}
                    onChange={(e) => setRepFormData({ ...repFormData, phone: e.target.value })}
                    className="m3-input w-full font-mono"
                    placeholder="771234567"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[var(--md-on-surface-variant)] mb-1">نسبة العمولة (%):</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={repFormData.commissionRate}
                    onChange={(e) => setRepFormData({ ...repFormData, commissionRate: e.target.value })}
                    className="m3-input w-full font-mono tabular-nums"
                    placeholder="3.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[var(--md-on-surface-variant)] mb-1">منطقة وخط السير:</label>
                  <input
                    type="text"
                    value={repFormData.territory}
                    onChange={(e) => setRepFormData({ ...repFormData, territory: e.target.value })}
                    className="m3-input w-full"
                    placeholder="صنعاء الوسطى وحدّة"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[var(--md-on-surface-variant)] mb-1">سيارة التوزيع / وسيلة النقل:</label>
                  <input
                    type="text"
                    value={repFormData.vehicle}
                    onChange={(e) => setRepFormData({ ...repFormData, vehicle: e.target.value })}
                    className="m3-input w-full"
                    placeholder="هايلوكس غمارتين #3421"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[var(--md-on-surface-variant)] mb-1">الهدف اليومي ({currSym}):</label>
                  <input
                    type="number"
                    value={repFormData.dailyTarget}
                    onChange={(e) => setRepFormData({ ...repFormData, dailyTarget: e.target.value })}
                    className="m3-input w-full font-mono tabular-nums"
                    placeholder="250000"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[var(--md-on-surface-variant)] mb-1">الهدف الشهري ({currSym}):</label>
                  <input
                    type="number"
                    value={repFormData.monthlyTarget}
                    onChange={(e) => setRepFormData({ ...repFormData, monthlyTarget: e.target.value })}
                    className="m3-input w-full font-mono tabular-nums"
                    placeholder="6500000"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--md-outline-variant)]">
                <button
                  type="button"
                  onClick={() => setIsRepModalOpen(false)}
                  className="m3-btn-outlined px-4 py-2 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="m3-btn-primary px-5 py-2 text-xs font-bold cursor-pointer"
                >
                  حفظ البيانات ✅
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

