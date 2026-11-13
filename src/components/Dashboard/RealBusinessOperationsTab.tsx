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
    <div className="space-y-6 text-right text-slate-100 font-sans" dir="rtl">
      {/* Top Banner & Title */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-lg shrink-0">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex flex-wrap items-center gap-2">
                  <span>مركز عمليات الأعمال وبداية التشغيل</span>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono">
                    Operations Hub
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-950 text-slate-300 border border-slate-800 font-mono">
                    {currCode} ({currSym})
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 font-medium">
                  شاشة التأسيس اليومية، الاستيراد الآمن، الأرصدة الافتتاحية، المطابقة البنكية ومراقبة دفتر الأستاذ
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-xs font-mono">
              <span className={`w-2 h-2 rounded-full ${dataMode === 'PRODUCTION' ? 'bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50' : 'bg-amber-400'}`} />
              <span className="text-slate-400">وضع البيانات:</span>
              <span className="font-bold text-white">{dataMode === 'PRODUCTION' ? 'إنتاجي حقيقي' : 'تجريبي'}</span>
            </div>

            <button
              type="button"
              onClick={handleToggleDefaultStartup}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                isDefaultStartup
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
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
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-700/80 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
              <span>تحديث</span>
            </button>
          </div>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between transition-all shadow-lg ${
            feedback.type === 'success'
              ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/50 border-rose-500/40 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="text-xs opacity-70 hover:opacity-100 cursor-pointer">
            إغلاق
          </button>
        </div>
      )}

      {/* Navigation Subtabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-800">
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
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-950/60 border border-emerald-500/40'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
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
          <div className="relative overflow-hidden bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-indigo-500" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h2 className="text-sm font-bold text-white">
                  شريط خطوات بداية تشغيل النظام (System Startup & Onboarding Workflow)
                </h2>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                5 خطوات متسلسلة لتجهيز التشغيل والانطلاق الكامل
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Step 1 */}
              <div className="bg-slate-950/80 border border-slate-800 hover:border-emerald-500/40 rounded-xl p-3.5 flex flex-col justify-between gap-3 transition-all">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      الخطوة 1
                    </span>
                    <Scale className="w-4 h-4 text-emerald-400" />
                  </div>
                  <h3 className="text-xs font-bold text-white">الأرصدة الافتتاحية ورأس المال</h3>
                  <p className="text-[11px] text-slate-400">ترحيل الصناديق والبنوك والذمم ({openingBalances.length} سجل)</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSubTab('opening_balances');
                    fetchOpeningBalances();
                  }}
                  className="w-full py-1.5 px-2.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>فتح الأرصدة الافتتاحية</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Step 2 */}
              <div className="bg-slate-950/80 border border-slate-800 hover:border-blue-500/40 rounded-xl p-3.5 flex flex-col justify-between gap-3 transition-all">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">
                      الخطوة 2
                    </span>
                    <Boxes className="w-4 h-4 text-blue-400" />
                  </div>
                  <h3 className="text-xs font-bold text-white">استيراد أو إضافة الأصناف والمخزون</h3>
                  <p className="text-[11px] text-slate-400">المسجلة حالياً: {formatNumber(productsList.length)} صنف</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('import')}
                    className="flex-1 py-1.5 px-2 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                  >
                    استيراد CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate && onNavigate('products')}
                    className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>الأصناف</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-slate-950/80 border border-slate-800 hover:border-amber-500/40 rounded-xl p-3.5 flex flex-col justify-between gap-3 transition-all">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      الخطوة 3
                    </span>
                    <Users className="w-4 h-4 text-amber-400" />
                  </div>
                  <h3 className="text-xs font-bold text-white">تسجيل العملاء والموردين</h3>
                  <p className="text-[11px] text-slate-400">
                    {formatNumber(customersList.length)} عميل • {formatNumber(suppliersList.length)} مورد
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onNavigate && onNavigate('customers')}
                    className="flex-1 py-1.5 px-2 bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/30 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>العملاء</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate && onNavigate('suppliers')}
                    className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>الموردين</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Step 4 */}
              <div className="bg-slate-950/80 border border-slate-800 hover:border-purple-500/40 rounded-xl p-3.5 flex flex-col justify-between gap-3 transition-all">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                      الخطوة 4
                    </span>
                    <Receipt className="w-4 h-4 text-purple-400" />
                  </div>
                  <h3 className="text-xs font-bold text-white">إصدار الفواتير ونقاط البيع</h3>
                  <p className="text-[11px] text-slate-400">البيع المباشر POS وفواتير المبيعات</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onNavigate && onNavigate('pos')}
                    className="flex-1 py-1.5 px-2 bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>POS</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate && onNavigate('invoices')}
                    className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>الفواتير</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Step 5 */}
              <div className="bg-slate-950/80 border border-slate-800 hover:border-cyan-500/40 rounded-xl p-3.5 flex flex-col justify-between gap-3 transition-all">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                      الخطوة 5
                    </span>
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  </div>
                  <h3 className="text-xs font-bold text-white">سندات الخزينة ومطابقة الأستاذ العام</h3>
                  <p className="text-[11px] text-slate-400">تدقيق القيود والمطابقة المستمرة</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onNavigate && onNavigate('payments')}
                    className="flex-1 py-1.5 px-2 bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/30 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>السندات</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate && onNavigate('ledger')}
                    className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
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
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>مؤشرات التشغيل اللحظية والأرصدة الحقيقية (12 Live Operational KPIs)</span>
              </h2>
              <span className="text-[11px] text-slate-500 font-mono font-medium">
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
                  accentBorder: 'from-emerald-500 via-teal-500 to-emerald-600',
                  iconBg: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
                  badge: (operatingData?.todaySales || 0) > 0 ? 'مبيعات نشطة اليوم' : 'بانتظار فواتير اليوم',
                  badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
                  targetTab: 'invoices',
                },
                {
                  id: 'today-collections',
                  title: 'تحصيلات وسندات قبض اليوم',
                  subtext: "Today's Cash & Bank Receipts",
                  valueText: formatAmount(operatingData?.todayCollections || 0),
                  unit: currSym,
                  icon: Wallet,
                  accentBorder: 'from-blue-500 via-cyan-500 to-indigo-500',
                  iconBg: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
                  badge: (operatingData?.todayCollections || 0) > 0 ? 'تدفق داخل للخزينة' : 'لا توجد تحصيلات اليوم',
                  badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
                  targetTab: 'payments',
                },
                {
                  id: 'today-purchases',
                  title: 'مشتريات اليوم',
                  subtext: "Today's Purchase Invoices",
                  valueText: formatAmount(operatingData?.todayPurchases || 0),
                  unit: currSym,
                  icon: ArrowDownLeft,
                  accentBorder: 'from-amber-400 via-orange-500 to-amber-600',
                  iconBg: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
                  badge: (operatingData?.todayPurchases || 0) > 0 ? 'توريدات مخزنية اليوم' : 'لا توجد مشتريات اليوم',
                  badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
                  targetTab: 'purchase_invoices',
                },
                {
                  id: 'today-expenses',
                  title: 'مدفوعات ومصروفات اليوم',
                  subtext: "Today's Payments & Expenses",
                  valueText: formatAmount((operatingData?.todayPayments || 0) + (operatingData?.todayExpenses || 0)),
                  unit: currSym,
                  icon: DollarSign,
                  accentBorder: 'from-rose-500 via-pink-500 to-rose-600',
                  iconBg: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
                  badge: ((operatingData?.todayPayments || 0) + (operatingData?.todayExpenses || 0)) > 0 ? 'منصرفات مسجلة' : 'لا توجد منصرفات اليوم',
                  badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
                  targetTab: 'expenses',
                },
                {
                  id: 'cash-1101',
                  title: 'رصيد الصندوق النقدي (1101)',
                  subtext: 'Main Cash Treasury GL 1101',
                  valueText: formatAmount(operatingData?.cashBalance || 0),
                  unit: currSym,
                  icon: Coins,
                  accentBorder: 'from-emerald-400 via-green-500 to-teal-500',
                  iconBg: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
                  badge: (operatingData?.cashBalance || 0) > 0 ? 'سيولة نقدية متاحة' : 'الرصيد 0',
                  badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
                  targetTab: 'payments',
                },
                {
                  id: 'bank-1102',
                  title: 'أرصدة الحسابات البنكية (1102)',
                  subtext: 'Bank Accounts GL 1102',
                  valueText: formatAmount(operatingData?.bankBalance || 0),
                  unit: currSym,
                  icon: Landmark,
                  accentBorder: 'from-cyan-500 via-blue-500 to-indigo-600',
                  iconBg: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30',
                  badge: (operatingData?.bankBalance || 0) > 0 ? 'أرصدة مصرفية متاحة' : 'الرصيد 0',
                  badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
                  targetTab: 'payments',
                },
                {
                  id: 'wallet-1107',
                  title: 'المحافظ الإلكترونية والشبكات (1107)',
                  subtext: 'E-Wallets & POS Networks 1107',
                  valueText: formatAmount(operatingData?.walletBalance || 0),
                  unit: currSym,
                  icon: Smartphone,
                  accentBorder: 'from-violet-500 via-purple-500 to-fuchsia-600',
                  iconBg: 'bg-violet-500/15 text-violet-400 border border-violet-500/30',
                  badge: (operatingData?.walletBalance || 0) > 0 ? 'محافظ نشطة' : 'الرصيد 0',
                  badgeClass: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
                  targetTab: 'payments',
                },
                {
                  id: 'receivables',
                  title: 'ذمم العملاء المدينة',
                  subtext: 'Accounts Receivable GL 1103',
                  valueText: formatAmount(operatingData?.receivables || 0),
                  unit: currSym,
                  icon: Users,
                  accentBorder: 'from-amber-400 via-yellow-500 to-amber-600',
                  iconBg: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
                  badge: (operatingData?.receivables || 0) > 0 ? `${customersList.length} عميل مسجل` : 'لا توجد مديونيات',
                  badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
                  targetTab: 'customers',
                },
                {
                  id: 'payables',
                  title: 'مستحقات الموردين الدائنة',
                  subtext: 'Accounts Payable GL 2101',
                  valueText: formatAmount(operatingData?.payables || 0),
                  unit: currSym,
                  icon: Building2,
                  accentBorder: 'from-rose-500 via-red-500 to-orange-500',
                  iconBg: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
                  badge: (operatingData?.payables || 0) > 0 ? `${suppliersList.length} مورد مسجل` : 'لا توجد مستحقات',
                  badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
                  targetTab: 'suppliers',
                },
                {
                  id: 'inventory-val',
                  title: 'تقييم المخزون الحالي',
                  subtext: 'Inventory Valuation GL 1104',
                  valueText: formatAmount(operatingData?.inventoryValuation || 0),
                  unit: currSym,
                  icon: Boxes,
                  accentBorder: 'from-purple-500 via-indigo-500 to-cyan-500',
                  iconBg: 'bg-purple-500/15 text-purple-400 border border-purple-500/30',
                  badge: `${productsList.length} صنف بالمستودعات`,
                  badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
                  targetTab: 'inventory',
                },
                {
                  id: 'low-stock',
                  title: 'أصناف وصلت للحد الأدنى',
                  subtext: 'Low Stock & Reorder Alerts',
                  valueText: formatNumber(operatingData?.lowStockCount || 0),
                  unit: 'صنف',
                  icon: AlertTriangle,
                  accentBorder: 'from-amber-500 via-orange-500 to-rose-500',
                  iconBg: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
                  badge: (operatingData?.lowStockCount || 0) > 0 ? 'بحاجة لإعادة طلب' : 'المخزون آمن',
                  badgeClass: (operatingData?.lowStockCount || 0) > 0
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
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
                  accentBorder:
                    operatingData?.glBalanced !== false && (operatingData?.openReconciliationIssues || 0) === 0
                      ? 'from-emerald-500 via-teal-400 to-cyan-500'
                      : 'from-rose-500 via-amber-500 to-rose-600',
                  iconBg:
                    operatingData?.glBalanced !== false && (operatingData?.openReconciliationIssues || 0) === 0
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
                  badge:
                    operatingData?.glBalanced !== false && (operatingData?.openReconciliationIssues || 0) === 0
                      ? 'القيد المزدوج متوازن ✓'
                      : 'يتطلب مراجعة التسوية',
                  badgeClass:
                    operatingData?.glBalanced !== false && (operatingData?.openReconciliationIssues || 0) === 0
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-300 border-rose-500/30',
                  targetTab: 'ledger',
                },
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.id}
                    className="relative overflow-hidden bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl hover:border-slate-700 transition-all duration-200 group flex flex-col justify-between space-y-3"
                  >
                    <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.accentBorder}`} />

                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 text-right flex-1 min-w-0">
                        <h3 className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors truncate">
                          {card.title}
                        </h3>
                        <span className="text-[10px] text-slate-500 font-mono block truncate">
                          {card.subtext}
                        </span>
                      </div>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${card.iconBg}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                    </div>

                    <div className="flex items-baseline gap-2 justify-start flex-wrap pt-1">
                      <span className="text-2xl font-black text-white font-mono tabular-nums tracking-tight">
                        {card.valueText}
                      </span>
                      {card.unit && (
                        <span className="text-xs font-bold text-slate-400 font-mono">
                          {card.unit}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-800/80 gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border truncate ${card.badgeClass}`}>
                        {card.badge}
                      </span>
                      <button
                        type="button"
                        onClick={() => onNavigate && onNavigate(card.targetTab)}
                        className="text-[11px] text-slate-300 hover:text-emerald-400 flex items-center gap-0.5 font-bold transition-colors shrink-0 cursor-pointer"
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
        <div className="relative overflow-hidden bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 text-slate-100">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-cyan-400" />
                <span>محرك استيراد ونقل البيانات المؤسسي الآمن</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                استيراد جماعي مع التدقيق الصارم والتراجع التلقائي عند أي خطأ مالي والربط الفوري بقوائم النظام
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold">نوع الكيان:</span>
              <select
                value={importEntityType}
                onChange={(e) => {
                  setImportEntityType(e.target.value);
                  setImportPreview(null);
                }}
                className="text-xs px-3 py-2 bg-slate-950 border border-slate-800 text-white rounded-xl font-medium focus:border-emerald-500 focus:outline-none"
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
                className="px-3 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-emerald-400 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                فتح القائمة المستهدفة ↗
              </button>
            </div>
          </div>

          {/* Sample CSV Template Hints */}
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 text-xs space-y-2">
            <div className="flex items-center justify-between font-semibold text-slate-200">
              <span className="flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
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
                className="px-3 py-1 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 rounded-lg font-bold transition-all cursor-pointer"
              >
                تحميل نموذج تجريبي
              </button>
            </div>
            <p className="text-[11px] text-slate-400 font-mono dir-ltr text-left">
              {(importEntityType === 'CUSTOMERS' || importEntityType === 'CUSTOMER_BALANCES') && 'name, phone, email, address, opening_balance'}
              {(importEntityType === 'SUPPLIERS' || importEntityType === 'SUPPLIER_BALANCES') && 'name, phone, email, address, opening_balance'}
              {importEntityType === 'PRODUCTS' && 'name, sku, barcode, category, unit, purchase_price, selling_price, current_stock'}
            </p>
          </div>

          {/* Textarea for CSV */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">
              محتوى ملف CSV (الصق البيانات هنا أو استخدم النموذج الجاهز):
            </label>
            <textarea
              rows={6}
              value={importCsvText}
              onChange={(e) => setImportCsvText(e.target.value)}
              placeholder="name,phone,opening_balance..."
              className="w-full text-xs font-mono p-3.5 bg-slate-950 border border-slate-800 text-white placeholder-slate-500 rounded-xl focus:border-emerald-500 focus:outline-none dir-ltr"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handlePreviewImport}
              disabled={loading || !importCsvText.trim()}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl disabled:opacity-50 transition-all shadow-lg cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>فحص وتدقيق البيانات (Validation & Preview)</span>
            </button>

            {importPreview && (
              <button
                type="button"
                onClick={handleCommitImport}
                disabled={importCommitting || importPreview.validRows === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl disabled:opacity-50 transition-all shadow-lg cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{importCommitting ? 'جاري الاعتماد والترحيل...' : `اعتماد وترحيل (${importPreview.validRows}) سجل في النظام`}</span>
              </button>
            )}
          </div>

          {/* Preview Results Panel */}
          {importPreview && (
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block mb-1">إجمالي الصفوف:</span>
                  <span className="text-base font-bold font-mono text-white">{importPreview.totalRows}</span>
                </div>
                <div className="bg-emerald-950/40 p-3.5 rounded-xl border border-emerald-500/30">
                  <span className="text-emerald-300 block mb-1">الصفوف الصالحة:</span>
                  <span className="text-base font-bold font-mono text-emerald-400">{importPreview.validRows}</span>
                </div>
                <div className="bg-rose-950/40 p-3.5 rounded-xl border border-rose-500/30">
                  <span className="text-rose-300 block mb-1">صفوف بها أخطاء:</span>
                  <span className="text-base font-bold font-mono text-rose-400">{importPreview.invalidRows}</span>
                </div>
                <div className="bg-amber-950/40 p-3.5 rounded-xl border border-amber-500/30">
                  <span className="text-amber-300 block mb-1">المبالغ المالية المستوردة:</span>
                  <span className="text-base font-bold font-mono text-amber-400">
                    {formatAmount(importPreview.financialTotal)} {currSym}
                  </span>
                </div>
              </div>

              {/* Errors List if any */}
              {importPreview.errors?.length > 0 && (
                <div className="p-4 bg-rose-950/40 rounded-xl border border-rose-500/30 space-y-2">
                  <h4 className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>سجل أخطاء التدقيق الصارم:</span>
                  </h4>
                  <ul className="text-xs text-rose-200 space-y-1">
                    {importPreview.errors.map((err: any, idx: number) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.5 rounded text-[10px]">
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
          <div className="relative overflow-hidden bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500" />
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-emerald-400" />
              <span>تسجيل رصيد افتتاحي معتمد</span>
            </h2>
            <p className="text-xs text-slate-400">
              يتم إنشاء قيد مزدوج متوازن تلقائياً وإقفال الفارق بحساب رأس المال / الأرصدة الافتتاحية (3101)
            </p>

            <form onSubmit={handlePostOpeningBalance} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">نوع الحساب:</label>
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
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl focus:border-emerald-500 focus:outline-none"
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
                  <label className="font-semibold text-slate-300 block mb-1">العميل المستهدف:</label>
                  <select
                    value={newOpBal.entityId}
                    onChange={(e) => setNewOpBal({ ...newOpBal, entityId: e.target.value })}
                    required
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl focus:border-emerald-500 focus:outline-none"
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
                  <label className="font-semibold text-slate-300 block mb-1">المورد المستهدف:</label>
                  <select
                    value={newOpBal.entityId}
                    onChange={(e) => setNewOpBal({ ...newOpBal, entityId: e.target.value })}
                    required
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl focus:border-emerald-500 focus:outline-none"
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
                  <label className="font-semibold text-slate-300 block mb-1">الصندوق المستهدف (1101):</label>
                  <select
                    value={newOpBal.entityId}
                    onChange={(e) => setNewOpBal({ ...newOpBal, entityId: e.target.value })}
                    required={cashAccounts.length > 0}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl focus:border-emerald-500 focus:outline-none"
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
                  <label className="font-semibold text-slate-300 block mb-1">الحساب البنكي (1102):</label>
                  <select
                    value={newOpBal.entityId}
                    onChange={(e) => setNewOpBal({ ...newOpBal, entityId: e.target.value })}
                    required={bankAccounts.length > 0}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl focus:border-emerald-500 focus:outline-none"
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
                <div className="p-3 bg-slate-950/70 border border-violet-500/30 rounded-xl text-violet-300 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 shrink-0 text-violet-400" />
                  <span>سيتم ترحيل الرصيد مباشرة إلى حساب المحافظ الإلكترونية والشبكات (1107)</span>
                </div>
              )}

              {newOpBal.balanceType === 'INVENTORY' && (
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">المنتج / الصنف (1104):</label>
                  <select
                    value={newOpBal.entityId}
                    onChange={(e) => setNewOpBal({ ...newOpBal, entityId: e.target.value })}
                    required
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl focus:border-emerald-500 focus:outline-none"
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
                  <label className="font-semibold text-slate-300 block mb-1">المبلغ ({currSym}):</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newOpBal.amount}
                    onChange={(e) => setNewOpBal({ ...newOpBal, amount: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 text-white placeholder-slate-500 rounded-xl font-mono focus:border-emerald-500 focus:outline-none"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">طبيعة القيد:</label>
                  <select
                    value={newOpBal.entrySide}
                    onChange={(e) => setNewOpBal({ ...newOpBal, entrySide: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="DEBIT">مدين (Debit)</option>
                    <option value="CREDIT">دائن (Credit)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">تاريخ القيد الافتتاحي:</label>
                <input
                  type="date"
                  required
                  value={newOpBal.accountingDate}
                  onChange={(e) => setNewOpBal({ ...newOpBal, accountingDate: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">البيان والملاحظات:</label>
                <input
                  type="text"
                  value={newOpBal.notes}
                  onChange={(e) => setNewOpBal({ ...newOpBal, notes: e.target.value })}
                  placeholder="رصيد افتتاحي معتمد..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 text-white placeholder-slate-500 rounded-xl focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl disabled:opacity-50 transition-all shadow-lg cursor-pointer"
              >
                ترحيل القيد الافتتاحي
              </button>
            </form>
          </div>

          {/* Opening Balances List & Status */}
          <div className="lg:col-span-2 relative overflow-hidden bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>سجل الأرصدة الافتتاحية المرحلة</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    {openingBalances.length} سجل
                  </span>
                </h3>
                <p className="text-xs text-slate-400">ترحيل فوري إلى شجرة الحسابات ودفتر الأستاذ العام</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate && onNavigate('ledger')}
                className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-emerald-400 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                عرض في دفتر الأستاذ ↗
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800/80">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-3">النوع والحساب</th>
                    <th className="p-3">الكيان / البيان</th>
                    <th className="p-3">المبلغ</th>
                    <th className="p-3">الجانب</th>
                    <th className="p-3">التاريخ</th>
                    <th className="p-3">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {openingBalances.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400">
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
                        <tr key={ob.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3 font-bold text-slate-200">{typeMap[bType] || bType}</td>
                          <td className="p-3 text-slate-300">{ob.entity_name || ob.notes || ob.reference_no || '—'}</td>
                          <td className="p-3 font-mono font-bold text-emerald-400">
                            {formatAmount(ob.amount)} <span className="text-slate-400 text-[10px]">{currSym}</span>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                side === 'DEBIT'
                                  ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              }`}
                            >
                              {side === 'DEBIT' ? 'مدين' : 'دائن'}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-slate-400">{ob.accounting_date || ob.accountingDate || '—'}</td>
                          <td className="p-3">
                            <span className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">
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
                  className="relative overflow-hidden bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-2"
                >
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${item.matched ? 'from-emerald-500 to-teal-500' : 'from-amber-500 to-rose-500'}`} />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-200">{item.title}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        item.matched
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                      }`}
                    >
                      {item.matched ? 'مطابق ✓' : 'فارق'}
                    </span>
                  </div>
                  <div className="text-sm font-black font-mono text-white">
                    {formatAmount(item.glVal)} <span className="text-[10px] text-slate-400">{currSym}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
                    <span className="font-mono">الفرعي: {formatAmount(item.subVal)}</span>
                    <button
                      type="button"
                      onClick={() => onNavigate && onNavigate(item.tab)}
                      className="text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer"
                    >
                      القائمة ↗
                    </button>
                  </div>
                </div>
              ))}

              {/* Double-Entry Balance Card */}
              <div className="relative overflow-hidden bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-2">
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${glBalanced ? 'from-cyan-500 to-emerald-500' : 'from-rose-500 to-red-600'}`} />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-200">توازن القيد المزدوج</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      glBalanced
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                    }`}
                  >
                    {glBalanced ? 'متزن 100%' : 'غير متزن'}
                  </span>
                </div>
                <div className="text-sm font-black font-mono text-white">
                  فارق: {formatAmount(operatingData?.trialBalanceDifference || 0)} <span className="text-[10px] text-slate-400">{currSym}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
                  <span>ميزان المراجعة</span>
                  <button
                    type="button"
                    onClick={() => onNavigate && onNavigate('ledger')}
                    className="text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer"
                  >
                    الأستاذ العام ↗
                  </button>
                </div>
              </div>
            </div>

            {/* Automated Audit Discrepancies Panel */}
            <div className="relative overflow-hidden bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    <span>محرك المطابقات والتسويات المالية الشاملة</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    تدقيق آلي للأرصدة (العملاء vs الأستاذ، الموردين vs الأستاذ، المخزون، الفواتير vs التحصيلات، توازن الأستاذ العام)
                  </p>
                </div>

                <button
                  type="button"
                  onClick={runFullReconciliation}
                  disabled={reconRunning}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${reconRunning ? 'animate-spin' : ''}`} />
                  <span>{reconRunning ? 'جاري فحص وتدقيق القيود...' : 'تشغيل فحص المطابقة والتدقيق الآن'}</span>
                </button>
              </div>

              {/* Discrepancies Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-800/80">
                <table className="w-full text-xs text-right">
                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-3">الكيان / الحساب</th>
                      <th className="p-3">القيمة المتوقعة</th>
                      <th className="p-3">القيمة الفعلية</th>
                      <th className="p-3">الفارق</th>
                      <th className="p-3">الخطورة</th>
                      <th className="p-3">التفاصيل</th>
                      <th className="p-3">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {reconciliations.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-emerald-400 font-semibold">
                          ✓ جميع الحركات والأرصدة المحاسبية متطابقة تماماً بنسبة 100% ولا توجد أي فروقات عالقة
                        </td>
                      </tr>
                    ) : (
                      reconciliations.map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3 font-bold text-white">{rec.entity_type}</td>
                          <td className="p-3 font-mono text-slate-300">
                            {formatAmount(rec.expected_value)} {currSym}
                          </td>
                          <td className="p-3 font-mono text-slate-300">
                            {formatAmount(rec.actual_value)} {currSym}
                          </td>
                          <td className="p-3 font-mono font-bold text-rose-400">
                            {formatAmount(rec.difference)} {currSym}
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                rec.severity === 'CRITICAL'
                                  ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              }`}
                            >
                              {rec.severity}
                            </span>
                          </td>
                          <td className="p-3 text-slate-400 max-w-xs truncate">
                            {typeof rec.details === 'object' && rec.details !== null
                              ? rec.details.message || rec.details.description || JSON.stringify(rec.details)
                              : String(rec.details || '—')}
                          </td>
                          <td className="p-3">
                            <span className="bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full text-[10px]">
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
            <div className="relative overflow-hidden bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-cyan-400" />
                  <span>مطابقة كشف الحساب البنكي / الصندوق (Bank & Cash Statement Reconciliation)</span>
                </h3>
                <button
                  type="button"
                  onClick={() => onNavigate && onNavigate('payments')}
                  className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-emerald-400 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  السندات والخزينة ↗
                </button>
              </div>

              <form onSubmit={handleBankReconcile} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">نوع الحساب:</label>
                  <select
                    value={bankReconData.accountType}
                    onChange={(e) => setBankReconData({ ...bankReconData, accountType: e.target.value, accountId: '' })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="BANK">حساب بنكي / محفظة إلكترونية</option>
                    <option value="CASH">صندوق نقدي</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">
                    {bankReconData.accountType === 'CASH' ? 'الصندوق النقدي:' : 'الحساب البنكي / المحفظة:'}
                  </label>
                  <select
                    value={bankReconData.accountId}
                    onChange={(e) => setBankReconData({ ...bankReconData, accountId: e.target.value })}
                    required
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl focus:border-emerald-500 focus:outline-none"
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
                  <label className="font-semibold text-slate-300 block mb-1">رصيد الجرد / الكشف الفعلي ({currSym}):</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={bankReconData.statementClosingBalance}
                    onChange={(e) => setBankReconData({ ...bankReconData, statementClosingBalance: e.target.value })}
                    placeholder="0.00"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 text-white placeholder-slate-500 rounded-xl font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">شيكات صادرة لم تصرف بعد (Unpresented):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={bankReconData.unpresentedChecks}
                    onChange={(e) => setBankReconData({ ...bankReconData, unpresentedChecks: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 text-white placeholder-slate-500 rounded-xl font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">إيداعات قيد التحصيل (Deposits in Transit):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={bankReconData.depositsInTransit}
                    onChange={(e) => setBankReconData({ ...bankReconData, depositsInTransit: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 text-white placeholder-slate-500 rounded-xl font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">رسوم ومصاريف بنكية مقتطعة ({currSym}):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={bankReconData.bankCharges}
                    onChange={(e) => setBankReconData({ ...bankReconData, bankCharges: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 text-white placeholder-slate-500 rounded-xl font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">أرباح / فوائد دائنة مستحقة ({currSym}):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={bankReconData.interestEarned}
                    onChange={(e) => setBankReconData({ ...bankReconData, interestEarned: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 text-white placeholder-slate-500 rounded-xl font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2 flex items-end">
                  <button
                    type="submit"
                    disabled={loading || !bankReconData.accountId}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl disabled:opacity-50 transition-all shadow-lg cursor-pointer"
                  >
                    تنفيذ مطابقة كشف الحساب
                  </button>
                </div>
              </form>

              {bankReconResult && (
                <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800/80 mt-4 text-xs space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                    <div>
                      <span className="text-slate-400 block mb-0.5">الرصيد الدفتري:</span>
                      <span className="font-bold text-white">
                        {formatAmount(bankReconResult.bookBalance)} {currSym}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">رصيد كشف الحساب:</span>
                      <span className="font-bold text-white">
                        {formatAmount(bankReconResult.statementClosingBalance)} {currSym}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">الفارق بعد التسوية:</span>
                      <span className={`font-bold ${bankReconResult.status === 'MATCHED' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatAmount(bankReconResult.difference)} {currSym}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">نتيجة المطابقة:</span>
                      <span className={`font-bold ${bankReconResult.status === 'MATCHED' ? 'text-emerald-400' : 'text-rose-400'}`}>
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
          <div className="relative overflow-hidden bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-amber-500 to-orange-500" />
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-rose-400" />
              <span>تسجيل مصروف تشغيلي</span>
            </h2>
            <p className="text-xs text-slate-400">
              تسجيل المصروف وترحيل القيد المزدوج وخصم المبلغ مباشرة من الصندوق أو البنك أو المحفظة
            </p>

            <form onSubmit={handleRecordExpense} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">تصنيف المصروف:</label>
                <select
                  value={newExpense.category}
                  onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl focus:border-emerald-500 focus:outline-none"
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
                <label className="font-semibold text-slate-300 block mb-1">وصف المصروف:</label>
                <input
                  type="text"
                  required
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  placeholder="وصف تفصيلي للمصروف..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 text-white placeholder-slate-500 rounded-xl focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">المبلغ الأساسي ({currSym}):</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 text-white placeholder-slate-500 rounded-xl font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">ضريبة القيمة المضافة ({currSym}):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newExpense.taxAmount}
                    onChange={(e) => setNewExpense({ ...newExpense, taxAmount: e.target.value })}
                    placeholder="0.00"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 text-white placeholder-slate-500 rounded-xl font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">طريقة السداد:</label>
                  <select
                    value={newExpense.paymentMethod}
                    onChange={(e) => setNewExpense({ ...newExpense, paymentMethod: e.target.value as any, paymentAccountId: '' })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="CASH">نقداً من الصندوق</option>
                    <option value="BANK">تحويل بنكي</option>
                    <option value="CARD">بطاقة / شبكة</option>
                    <option value="WALLET">محفظة إلكترونية</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">تاريخ الصرف:</label>
                  <input
                    type="date"
                    required
                    value={newExpense.expenseDate}
                    onChange={(e) => setNewExpense({ ...newExpense, expenseDate: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {newExpense.paymentMethod === 'BANK' && (
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">خصم من الحساب البنكي:</label>
                  <select
                    value={newExpense.paymentAccountId}
                    onChange={(e) => setNewExpense({ ...newExpense, paymentAccountId: e.target.value })}
                    required={bankAccounts.length > 0}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl focus:border-emerald-500 focus:outline-none"
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
                  <label className="font-semibold text-slate-300 block mb-1">خصم من الصندوق النقدي:</label>
                  <select
                    value={newExpense.paymentAccountId}
                    onChange={(e) => setNewExpense({ ...newExpense, paymentAccountId: e.target.value })}
                    required={cashAccounts.length > 0}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl focus:border-emerald-500 focus:outline-none"
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
                className="w-full py-2.5 bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 text-white font-bold rounded-xl disabled:opacity-50 transition-all shadow-lg cursor-pointer"
              >
                تسجيل وصرف المصروف
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 relative overflow-hidden bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>سجل المصروفات التشغيلية المعتمدة</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
                    {expenses.length} مصروف
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  الإجمالي المسجل:{' '}
                  <span className="font-mono font-bold text-rose-400">
                    {formatAmount(expenses.reduce((s, x) => s + Number(x.totalAmount ?? x.total_amount ?? x.amount ?? 0), 0))} {currSym}
                  </span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => onNavigate && onNavigate('expenses')}
                className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-emerald-400 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                إدارة المصروفات الكاملة ↗
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800/80">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-3">رقم المصروف</th>
                    <th className="p-3">التصنيف</th>
                    <th className="p-3">البيان</th>
                    <th className="p-3">المبلغ</th>
                    <th className="p-3">طريقة الدفع</th>
                    <th className="p-3">التاريخ</th>
                    <th className="p-3">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400">
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
                        <tr key={exp.id || idx} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-200">
                            {exp.expenseNumber || exp.voucher_number || exp.reference || `EXP-${idx + 1}`}
                          </td>
                          <td className="p-3 text-amber-300 font-semibold">{exp.category || 'تشغيلي'}</td>
                          <td className="p-3 text-slate-300 max-w-xs truncate">{exp.description || exp.notes || '—'}</td>
                          <td className="p-3 font-mono font-bold text-rose-400">
                            {formatAmount(exp.totalAmount ?? exp.total_amount ?? exp.amount ?? 0)}{' '}
                            <span className="text-slate-400 text-[10px]">{currSym}</span>
                          </td>
                          <td className="p-3 text-slate-300">{payLabel}</td>
                          <td className="p-3 font-mono text-slate-400">{exp.expenseDate || exp.expense_date || exp.date || '—'}</td>
                          <td className="p-3">
                            <span className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">
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
          <div className="relative overflow-hidden bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-blue-400" />
                  <span>إدارة مردودات المبيعات والمشتريات (إشعارات دائنة ومدينة)</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  تسجيل مردودات المبيعات والمشتريات مع تحديث كمية المخزون آلياً، تعديل ذمة العميل/المورد، وترحيل القيود في دفتر الأستاذ العام
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onNavigate?.('invoices')}
                  className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>فواتير المبيعات</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate?.('purchase_invoices')}
                  className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer"
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
                className={`p-4 rounded-xl border text-right transition-all cursor-pointer flex items-start gap-3 ${
                  newReturn.type === 'SALES'
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-white shadow-lg shadow-emerald-950/30'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${newReturn.type === 'SALES' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-900 text-slate-500'}`}>
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold">مردود مبيعات — إشعار دائن للعميل</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">إعادة البضاعة إلى المخزون وتخفيض رصيد العميل أو رد النقدية</div>
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
                className={`p-4 rounded-xl border text-right transition-all cursor-pointer flex items-start gap-3 ${
                  newReturn.type === 'PURCHASE'
                    ? 'bg-amber-500/10 border-amber-500/50 text-white shadow-lg shadow-amber-950/30'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${newReturn.type === 'PURCHASE' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-900 text-slate-500'}`}>
                  <ArrowDownLeft className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold">مردود مشتريات — إشعار مدين للمورد</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">خصم الكمية المرتجعة من المخزون وتخفيض مستحقات المورد أو استرداد النقدية</div>
                </div>
              </button>
            </div>

            {/* Return Entry Form */}
            <form onSubmit={handleCreateReturn} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
              {newReturn.type === 'SALES' ? (
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1.5">العميل (اختياري للنقدي / إلزامي للآجل):</label>
                  <select
                    value={newReturn.customerId}
                    onChange={(e) => setNewReturn({ ...newReturn, customerId: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500"
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
                  <label className="block text-[11px] font-bold text-slate-300 mb-1.5">المورد:</label>
                  <select
                    value={newReturn.supplierId}
                    onChange={(e) => setNewReturn({ ...newReturn, supplierId: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500"
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
                <label className="block text-[11px] font-bold text-slate-300 mb-1.5">الصنف المسترجع:</label>
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
                  className="w-full text-xs p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-blue-500"
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
                <label className="block text-[11px] font-bold text-slate-300 mb-1.5">طريقة التسوية المالية:</label>
                <select
                  value={newReturn.refundMethod}
                  onChange={(e) => setNewReturn({ ...newReturn, refundMethod: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="CREDIT_NOTE">خصم من رصيد الحساب الآجل (إشعار دائن/مدين)</option>
                  <option value="CASH">استرداد / توريد نقدي في الصندوق</option>
                  <option value="BANK">تحويل / تسوية بنكية</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1.5">الكمية المرتجعة:</label>
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
                  className="w-full text-xs p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1.5">
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
                  className="w-full text-xs p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1.5">سبب المردود / رقم الفاتورة المرجعية:</label>
                <input
                  type="text"
                  value={newReturn.reason}
                  onChange={(e) => setNewReturn({ ...newReturn, reason: e.target.value })}
                  placeholder="مثال: تلف أثناء الشحن / فاتورة #INV-102"
                  className="w-full text-xs p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2 lg:col-span-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800">
                <div className="text-xs text-slate-300">
                  إجمالي قيمة المردود المحتسبة:{' '}
                  <span className="font-mono font-black text-emerald-400 text-sm">
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
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>اعتماد وترحيل المردود</span>
                </button>
              </div>
            </form>
          </div>

          {/* Returns Log Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-indigo-400" />
                <span>سجل مردودات المبيعات والمشتريات ({salesReturns.length + purchaseReturns.length})</span>
              </h3>
              <span className="text-[11px] font-mono text-slate-400">
                مبيعات: {salesReturns.length} • مشتريات: {purchaseReturns.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px]">
                    <th className="py-3 px-3 font-bold">رقم المردود</th>
                    <th className="py-3 px-3 font-bold">النوع</th>
                    <th className="py-3 px-3 font-bold">الطرف (عميل / مورد)</th>
                    <th className="py-3 px-3 font-bold">التفاصيل / السبب</th>
                    <th className="py-3 px-3 font-bold text-center">طريقة التسوية</th>
                    <th className="py-3 px-3 font-bold text-center">الإجمالي ({currSym})</th>
                    <th className="py-3 px-3 font-bold text-center">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {salesReturns.length === 0 && purchaseReturns.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
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
                          <tr key={ret.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-3 font-mono font-bold text-white">
                              {ret.return_number || ret.returnNumber || ret.id}
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  isSales
                                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                    : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                }`}
                              >
                                {isSales ? 'مردود مبيعات' : 'مردود مشتريات'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-200 font-medium">{entityLabel}</td>
                            <td className="py-3 px-3 text-slate-400">
                              {ret.reason || 'مردود بضاعة'} ({itemCount} وحدة)
                            </td>
                            <td className="py-3 px-3 text-center text-slate-300">
                              {ret.refund_method === 'CASH'
                                ? 'نقدي (صندوق)'
                                : ret.refund_method === 'BANK'
                                ? 'تحويل بنكي'
                                : 'إشعار حساب آجل'}
                            </td>
                            <td className="py-3 px-3 text-center font-mono font-bold text-emerald-400">
                              {formatNumber(totalVal)} {currSym}
                            </td>
                            <td className="py-3 px-3 text-center font-mono text-[11px] text-slate-400">
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
          <div className="relative overflow-hidden bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span>الفترات المحاسبية</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsNewPeriodOpen((v) => !v)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>فتح فترة محاسبية جديدة</span>
              </button>
            </div>

            {isNewPeriodOpen && (
              <form onSubmit={handleCreatePeriod} className="p-3.5 bg-slate-950 border border-emerald-500/30 rounded-xl space-y-2.5 text-xs">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">اسم الفترة المحاسبية:</label>
                  <input
                    type="text"
                    required
                    value={newPeriodForm.name}
                    onChange={(e) => setNewPeriodForm({ ...newPeriodForm, name: e.target.value })}
                    className="w-full px-2.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100"
                    placeholder="مثال: فترة ديسمبر 2026"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">من تاريخ:</label>
                    <input
                      type="date"
                      required
                      value={newPeriodForm.startDate}
                      onChange={(e) => setNewPeriodForm({ ...newPeriodForm, startDate: e.target.value })}
                      className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">إلى تاريخ:</label>
                    <input
                      type="date"
                      required
                      value={newPeriodForm.endDate}
                      onChange={(e) => setNewPeriodForm({ ...newPeriodForm, endDate: e.target.value })}
                      className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-mono"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsNewPeriodOpen(false)}
                    className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-[11px] font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold cursor-pointer"
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
                    className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all space-y-2 ${
                      isSelected
                        ? 'bg-blue-500/10 border-blue-500/50 text-white shadow-md'
                        : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold">{p.name}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          isClosed
                            ? 'bg-slate-800 text-slate-300 border-slate-700'
                            : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        {isClosed ? 'مغلقة ومعتمدة' : 'فترة مفتوحة'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {startDateStr} إلى {endDateStr}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Month-End Close 12-Step Checklist */}
          <div className="lg:col-span-2 relative overflow-hidden bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-5">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white">قائمة فحص واعتماد الإقفال الشهري (12 خطوة)</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  إجراءات المراجعة الدقيقة لضمان توازن القوائم المالية قبل إغلاق الفترة وترحيل الأرباح المحتجزة
                </p>
              </div>

              <div className="flex items-center gap-3">
                {checklist && (
                  <div className="text-left font-mono bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl">
                    <span className="text-[10px] text-slate-400 block">نسبة الإنجاز:</span>
                    <span className="text-base font-black text-emerald-400">{checklist.completion_percentage}%</span>
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
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Unlock className="w-3.5 h-3.5 text-amber-400" />
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
                          className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                        >
                          تأكيد الإغلاق النهائي ✓
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmClosePeriodId(null)}
                          className="px-2.5 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
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
                      className="px-4 py-2 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white rounded-xl text-xs font-bold shadow-lg flex items-center gap-1.5 cursor-pointer"
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
                    className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all text-xs ${
                      it.completed
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-slate-950/70 border-slate-800 text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={Boolean(it.completed)}
                        onChange={() => {}}
                        className="rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                      />
                      <span className={`font-medium ${it.completed ? 'line-through opacity-80' : ''}`}>
                        {it.title || it.task}
                      </span>
                    </div>

                    <span className="text-[10px] text-slate-400 font-mono">خطوة #{it.id}</span>
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
          <div className="relative overflow-hidden bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-5">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-500" />
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-blue-400" />
                <span>خزينة المستندات والمرفقات الرسمية (Business Documents Vault)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                حفظ وأرشفة العقود، السجلات التجارية، الشهادات الضريبية، مرفقات الفواتير، ومحاضر الجرد بحد أقصى 10 ميجابايت مع إمكانية المعاينة والطباعة الفورية
              </p>
            </div>

            <form onSubmit={handleUploadDocument} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1.5">عنوان المستند:</label>
                <input
                  type="text"
                  required
                  value={docForm.title}
                  onChange={(e) => setDocForm({ ...docForm, title: e.target.value })}
                  placeholder="مثال: السجل التجاري 2026"
                  className="w-full text-xs p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1.5">تصنيف المستند:</label>
                <select
                  value={docForm.category}
                  onChange={(e) => setDocForm({ ...docForm, category: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-blue-500"
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
                <label className="block text-[11px] font-bold text-slate-300 mb-1.5">رقم المرجع / الربط (اختياري):</label>
                <input
                  type="text"
                  value={docForm.referenceNo}
                  onChange={(e) => setDocForm({ ...docForm, referenceNo: e.target.value })}
                  placeholder="مثال: INV-2026-01 أو CR-4421"
                  className="w-full text-xs p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1.5">اختيار الملف (PDF / صورة / مستند):</label>
                <label className="w-full flex items-center justify-between gap-2 text-xs p-2.5 bg-slate-900 border border-dashed border-slate-600 hover:border-blue-500 rounded-xl text-slate-300 cursor-pointer transition-colors">
                  <span className="truncate">{docForm.fileName || 'اضغط لاختيار ملف من الجهاز...'}</span>
                  <Paperclip className="w-4 h-4 text-blue-400 shrink-0" />
                  <input type="file" onChange={handleDocFileChange} className="hidden" />
                </label>
              </div>

              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-[11px] font-bold text-slate-300 mb-1.5">ملاحظات وتفاصيل الأرشفة:</label>
                <input
                  type="text"
                  value={docForm.notes}
                  onChange={(e) => setDocForm({ ...docForm, notes: e.target.value })}
                  placeholder="تفاصيل تاريخ الانتهاء، الجهة المصدرة، أو وصف المحتوى..."
                  className="w-full text-xs p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>حفظ وأرشفة المستند</span>
                </button>
              </div>
            </form>
          </div>

          {/* Documents Archive Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>المستندات المؤرشفة ({documentsList.length})</span>
              </h3>
              <span className="text-[11px] font-mono text-slate-400">معزولة ومؤمّنة بالكامل للشركة</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px]">
                    <th className="py-3 px-3 font-bold">عنوان المستند</th>
                    <th className="py-3 px-3 font-bold">التصنيف</th>
                    <th className="py-3 px-3 font-bold">المرجع / الملاحظات</th>
                    <th className="py-3 px-3 font-bold">الملف والحجم</th>
                    <th className="py-3 px-3 font-bold text-center">تاريخ الأرشفة</th>
                    <th className="py-3 px-3 font-bold text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {documentsList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                        لا توجد مستندات مؤرشفة بعد. ارفع أول مستند من النموذج أعلاه.
                      </td>
                    </tr>
                  ) : (
                    documentsList.map((doc: any) => (
                      <tr key={doc.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3 font-bold text-white">{doc.title}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                            {doc.category}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-400">
                          {doc.reference_no || doc.entity_id ? (
                            <span className="font-mono text-emerald-400 ml-2">#{doc.reference_no || doc.entity_id}</span>
                          ) : null}
                          <span>{doc.notes || '—'}</span>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-300">
                          <div>{doc.file_name}</div>
                          <div className="text-slate-500">{formatFileSize(doc.file_size)}</div>
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-[11px] text-slate-400">
                          {String(doc.uploaded_at || '').split('T')[0]}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setPreviewDoc(doc)}
                              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-blue-400" />
                              <span>معاينة</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePrintDocument(doc)}
                              className="px-2.5 py-1.5 bg-emerald-950/60 hover:bg-emerald-800 text-emerald-300 hover:text-white border border-emerald-700/40 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>طباعة</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDocument(doc.id)}
                              className="p-1.5 bg-rose-950/50 hover:bg-rose-900 border border-rose-800/40 text-rose-400 hover:text-rose-200 rounded-lg cursor-pointer"
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
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
                <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-blue-400" />
                    <span>{previewDoc.title}</span>
                  </h3>
                  <button type="button" onClick={() => setPreviewDoc(null)} className="text-slate-400 hover:text-white p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-5 space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                    <div><span className="text-slate-400">التصنيف:</span> <span className="font-bold text-white">{previewDoc.category}</span></div>
                    <div><span className="text-slate-400">المرجع:</span> <span className="font-mono text-emerald-400">{previewDoc.reference_no || previewDoc.entity_id || '—'}</span></div>
                    <div><span className="text-slate-400">اسم الملف:</span> <span className="font-mono text-slate-200">{previewDoc.file_name}</span></div>
                    <div><span className="text-slate-400">الحجم:</span> <span className="font-mono text-slate-200">{formatFileSize(previewDoc.file_size)}</span></div>
                    {previewDoc.notes && (
                      <div className="col-span-2"><span className="text-slate-400">ملاحظات:</span> <span className="text-slate-200">{previewDoc.notes}</span></div>
                    )}
                  </div>

                  {previewDoc.data_url && String(previewDoc.mime_type || '').startsWith('image/') ? (
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex justify-center">
                      <img src={previewDoc.data_url} alt={previewDoc.title} className="max-h-96 object-contain rounded-lg" />
                    </div>
                  ) : previewDoc.data_url && String(previewDoc.mime_type || '').includes('pdf') ? (
                    <iframe src={previewDoc.data_url} title={previewDoc.title} className="w-full h-96 rounded-xl border border-slate-800 bg-white" />
                  ) : (
                    <div className="p-6 text-center bg-slate-950 border border-dashed border-slate-700 rounded-xl text-slate-400">
                      ملف مرفق: <span className="font-mono text-slate-200">{previewDoc.file_name}</span> — يمكنك استخدام زر «طباعة» لتوليد وثيقة الأرشفة الرسمية.
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => handlePrintDocument(previewDoc)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>طباعة الوثيقة</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewDoc(null)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold cursor-pointer"
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
          <div className="relative overflow-hidden bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-5">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Search className="w-5 h-5 text-blue-400" />
                  <span>البحث الشامل في كافة سجلات الشركة (Global Multi-Entity Search)</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  بحث فوري موحد عبر العملاء، الموردين، الأصناف، فواتير المبيعات، فواتير المشتريات، وسندات الخزينة
                </p>
              </div>
              {searchResults && (
                <span className="text-xs font-mono px-3 py-1 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">
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
                className="flex-1 text-xs p-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={loading || !searchQuery.trim()}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg cursor-pointer disabled:opacity-50"
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
                      <h4 className="font-bold text-emerald-300">العملاء المطابقون ({searchResults.customers.length})</h4>
                      <button type="button" onClick={() => onNavigate?.('customers')} className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer">
                        <span>فتح القائمة ↗</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {searchResults.customers.map((c: any) => (
                        <div key={c.id} onClick={() => onNavigate?.('customers')} className="p-3 bg-slate-950/80 hover:border-emerald-500/40 rounded-xl border border-slate-800 cursor-pointer transition-all">
                          <div className="font-bold text-white">{c.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono mt-1">
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
                      <h4 className="font-bold text-amber-300">الموردون المطابقون ({searchResults.suppliers.length})</h4>
                      <button type="button" onClick={() => onNavigate?.('suppliers')} className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer">
                        <span>فتح القائمة ↗</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {searchResults.suppliers.map((s: any) => (
                        <div key={s.id} onClick={() => onNavigate?.('suppliers')} className="p-3 bg-slate-950/80 hover:border-amber-500/40 rounded-xl border border-slate-800 cursor-pointer transition-all">
                          <div className="font-bold text-white">{s.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono mt-1">
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
                      <h4 className="font-bold text-indigo-300">الأصناف والمخزون ({searchResults.products.length})</h4>
                      <button type="button" onClick={() => onNavigate?.('products')} className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer">
                        <span>فتح القائمة ↗</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {searchResults.products.map((p: any) => (
                        <div key={p.id} onClick={() => onNavigate?.('products')} className="p-3 bg-slate-950/80 hover:border-indigo-500/40 rounded-xl border border-slate-800 cursor-pointer transition-all">
                          <div className="font-bold text-white">{p.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono mt-1">
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
                      <h4 className="font-bold text-blue-300">فواتير المبيعات ({searchResults.invoices.length})</h4>
                      <button type="button" onClick={() => onNavigate?.('invoices')} className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer">
                        <span>فتح القائمة ↗</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {searchResults.invoices.map((inv: any) => (
                        <div key={inv.id} onClick={() => onNavigate?.('invoices')} className="p-3 bg-slate-950/80 hover:border-blue-500/40 rounded-xl border border-slate-800 cursor-pointer transition-all">
                          <div className="font-bold text-white font-mono">#{inv.invoice_number || inv.invoiceNumber || inv.id}</div>
                          <div className="text-[11px] text-slate-300 mt-0.5">{inv.customer_name || inv.customerName || 'عميل نقدي'}</div>
                          <div className="text-[11px] text-emerald-400 font-mono mt-1">
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
                      <h4 className="font-bold text-cyan-300">فواتير المشتريات ({searchResults.purchaseInvoices.length})</h4>
                      <button type="button" onClick={() => onNavigate?.('purchase_invoices')} className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer">
                        <span>فتح القائمة ↗</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {searchResults.purchaseInvoices.map((pur: any) => (
                        <div key={pur.id} onClick={() => onNavigate?.('purchase_invoices')} className="p-3 bg-slate-950/80 hover:border-cyan-500/40 rounded-xl border border-slate-800 cursor-pointer transition-all">
                          <div className="font-bold text-white font-mono">#{pur.invoice_number || pur.invoiceNumber || pur.id}</div>
                          <div className="text-[11px] text-slate-300 mt-0.5">{pur.supplier_name || pur.supplierName || 'مورد عام'}</div>
                          <div className="text-[11px] text-amber-400 font-mono mt-1">
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
                      <h4 className="font-bold text-teal-300">سندات الخزينة والبنك ({searchResults.payments.length})</h4>
                      <button type="button" onClick={() => onNavigate?.('payments')} className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer">
                        <span>فتح القائمة ↗</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {searchResults.payments.map((pmt: any) => (
                        <div key={pmt.id} onClick={() => onNavigate?.('payments')} className="p-3 bg-slate-950/80 hover:border-teal-500/40 rounded-xl border border-slate-800 cursor-pointer transition-all">
                          <div className="font-bold text-white font-mono">#{pmt.voucher_number || pmt.payment_number || pmt.id}</div>
                          <div className="text-[11px] text-slate-300 mt-0.5">{pmt.customer_name || pmt.supplier_name || pmt.party_name || pmt.description || 'سند مالي'}</div>
                          <div className="text-[11px] text-teal-400 font-mono mt-1">
                            المبلغ: {formatNumber(Number(pmt.amount || 0))} {currSym}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(searchResults.totalHits ?? 0) === 0 && (
                  <div className="p-6 text-center bg-slate-950 border border-slate-800 rounded-xl text-slate-400">
                    لم يتم العثور على سجلات مطابقة لعبارة البحث «{searchQuery}».
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Data Mode Management & Quick ERP Menus Launcher */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <span>إدارة وضع بيانات التشغيل (إنتاجي حقيقي / تجريبي)</span>
              </h3>
              <p className="text-xs text-slate-400">
                التحكم في نمط تشغيل النظام ومراقبة جاهزية القوائم الأساسية للعمل الفعلي بدون أي بيانات افتراضية
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center font-mono">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <div className="text-[10px] text-slate-400">العملاء</div>
                  <div className="text-base font-black text-emerald-400">{customersList.length}</div>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <div className="text-[10px] text-slate-400">الموردون</div>
                  <div className="text-base font-black text-amber-400">{suppliersList.length}</div>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <div className="text-[10px] text-slate-400">الأصناف</div>
                  <div className="text-base font-black text-blue-400">{productsList.length}</div>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <div className="text-[10px] text-slate-400">توازن GL</div>
                  <div className={`text-sm font-black mt-0.5 ${operatingData?.glBalanced !== false ? 'text-emerald-400' : 'text-rose-400'}`}>
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
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-emerald-500/50'
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
                      ? 'bg-amber-600 text-white border-amber-500 shadow-lg'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-amber-500/50'
                  }`}
                >
                  وضع المعاينة والتجريب (Demo)
                </button>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-blue-400" />
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
                    className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/40 text-slate-200 rounded-xl text-right font-bold flex items-center justify-between cursor-pointer transition-all"
                  >
                    <span>{nav.label}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-blue-400 shrink-0" />
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                <span>إدارة مناديب التوزيع الميداني والأهداف والعمولات</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                  {salesReps.length} مناديب
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                ربط حي مع فواتير المبيعات وسندات القبض، متابعة خطوط السير وتحقيق التارجت، وتوريد التحصيلات للخزينة آلياً
              </p>
            </div>

            <div className="flex items-center gap-2">
              {salesReps.length > 0 && (
                <button
                  onClick={handleClearAllReps}
                  className="px-3 py-2.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-800/60 text-rose-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
                  title="تصفير وحذف كافة مناديب التوزيع"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>تصفير كافة المناديب</span>
                </button>
              )}
              <button
                onClick={handleOpenCreateRep}
                className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950/60 flex items-center gap-2 cursor-pointer transition-all active:scale-95 shrink-0"
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
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col justify-between">
                  <span className="text-slate-400 text-[11px] font-bold">إجمالي مبيعات المناديب:</span>
                  <div className="text-lg font-bold font-mono text-emerald-400 mt-1">
                    {formatNumber(liveTotals.sales)}
                    <span className="text-[10px] text-slate-400 mr-1">{currSym}</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col justify-between">
                  <span className="text-slate-400 text-[11px] font-bold">إجمالي النقدية الموردة:</span>
                  <div className="text-lg font-bold font-mono text-blue-400 mt-1">
                    {formatNumber(liveTotals.collected)}
                    <span className="text-[10px] text-slate-400 mr-1">{currSym}</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col justify-between">
                  <span className="text-slate-400 text-[11px] font-bold">الذمم الآجلة المعلقة:</span>
                  <div className="text-lg font-bold font-mono text-amber-400 mt-1">
                    {formatNumber(liveTotals.pending)}
                    <span className="text-[10px] text-slate-400 mr-1">{currSym}</span>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-br from-[#132d22] to-slate-900 border border-emerald-500/30 rounded-xl flex flex-col justify-between">
                  <span className="text-emerald-300 text-[11px] font-bold">إجمالي العمولات المستحقة:</span>
                  <div className="text-lg font-bold font-mono text-emerald-300 mt-1">
                    {formatNumber(liveTotals.commission)}
                    <span className="text-[10px] text-emerald-400/80 mr-1">{currSym}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Reps Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[11px]">
                    <th className="py-3 px-4 font-bold">المندوب</th>
                    <th className="py-3 px-4 font-bold">خط السير والسيارة</th>
                    <th className="py-3 px-4 font-bold text-center">الهدف الشهري</th>
                    <th className="py-3 px-4 font-bold text-center">المبيعات المحققة</th>
                    <th className="py-3 px-4 font-bold text-center">نسبة الإنجاز</th>
                    <th className="py-3 px-4 font-bold text-center">التحصيل النقدي</th>
                    <th className="py-3 px-4 font-bold text-center">الذمم المعلقة</th>
                    <th className="py-3 px-4 font-bold text-center">نسبة العمولة</th>
                    <th className="py-3 px-4 font-bold text-center">صافي العمولة</th>
                    <th className="py-3 px-4 font-bold text-center">الحالة</th>
                    <th className="py-3 px-4 font-bold text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {salesReps.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-400 text-xs font-sans">
                        لا يوجد مناديب توزيع مسجلين حالياً. اضغط على «+ تسجيل مندوب جديد» لإضافة مندوب ميداني.
                      </td>
                    </tr>
                  ) : (
                    salesReps.map((rep) => {
                      const live = getRepLiveMetrics(rep);
                      const achievementPct = rep.monthlyTarget > 0 ? (live.effectiveSales / rep.monthlyTarget) * 100 : 0;
                      return (
                        <tr key={rep.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 font-sans">
                            <div className="font-bold text-white text-xs">{rep.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {rep.code} • {rep.phone}
                            </div>
                            {(live.invoiceCount > 0 || live.receiptCount > 0) && (
                              <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
                                ربط حي: {live.invoiceCount} فاتورة • {live.receiptCount} سند
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 font-sans">
                            <div className="text-slate-200">{rep.territory}</div>
                            <div className="text-[10px] text-slate-400">{rep.vehicle}</div>
                          </td>

                          <td className="py-3.5 px-4 text-center font-bold text-slate-300">
                            {formatNumber(rep.monthlyTarget)}
                          </td>

                          <td className="py-3.5 px-4 text-center font-bold text-emerald-400">
                            {formatNumber(live.effectiveSales)}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <div className="space-y-1">
                              <span className="font-bold text-[11px] text-slate-200">
                                {achievementPct.toFixed(1)}%
                              </span>
                              <div className="w-16 h-1.5 bg-slate-800 rounded-full mx-auto overflow-hidden">
                                <div
                                  style={{ width: `${Math.min(100, achievementPct)}%` }}
                                  className="h-full bg-emerald-500 rounded-full"
                                />
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-center text-blue-300 font-bold">
                            {formatNumber(live.effectiveCollected)}
                          </td>

                          <td className="py-3.5 px-4 text-center text-amber-300 font-bold">
                            {formatNumber(rep.pendingReceivables)}
                          </td>

                          <td className="py-3.5 px-4 text-center text-slate-300 font-bold">
                            {rep.commissionRate}%
                          </td>

                          <td className="py-3.5 px-4 text-center text-emerald-300 font-black text-xs">
                            {formatNumber(live.effectiveCommission)} {currSym}
                          </td>

                          <td className="py-3.5 px-4 text-center font-sans">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                rep.status === 'ACTIVE'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-slate-800 text-slate-400'
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
                                className="px-2 py-1.5 bg-blue-950/70 hover:bg-blue-700 text-blue-300 hover:text-white rounded-lg border border-blue-700/40 transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                              >
                                <Send className="w-3 h-3" />
                                <span>توريد للخزينة</span>
                              </button>
                              <button
                                onClick={() => handleOpenEditRep(rep)}
                                title="تعديل بيانات المندوب والهدف"
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
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
                                className="p-1.5 bg-emerald-950/60 hover:bg-emerald-800 text-emerald-300 hover:text-white rounded-lg border border-emerald-700/40 transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span className="text-[10px]">كشف</span>
                              </button>
                              <button
                                onClick={() => handleDeleteRep(rep.id, rep.name)}
                                title="حذف مندوب المبيعات"
                                className="p-1.5 bg-rose-950/50 hover:bg-rose-900 border border-rose-800/40 text-rose-400 hover:text-rose-200 rounded-lg transition-colors cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-blue-500/30 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Wallet className="w-4 h-4 text-blue-400" />
                <span>توريد تحصيل للخزينة — {remittingRep.name}</span>
              </h3>
              <button type="button" onClick={() => setRemittingRep(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitRemit} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                <span className="text-slate-400">الذمم المعلقة الحالية على المندوب:</span>
                <span className="font-mono font-bold text-amber-400">
                  {formatNumber(remittingRep.pendingReceivables)} {currSym}
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1.5">المبلغ المورد للخزينة ({currSym}):</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={remitForm.amount}
                  onChange={(e) => setRemitForm({ ...remitForm, amount: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                  placeholder="أدخل مبلغ التحصيل"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1.5">قناة التوريد:</label>
                <select
                  value={remitForm.paymentMethod}
                  onChange={(e) => setRemitForm({ ...remitForm, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="CASH">الخزينة الرئيسية (نقداً)</option>
                  <option value="BANK">الحساب البنكي (تحويل / إيداع)</option>
                  <option value="WALLET">محفظة إلكترونية</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1.5">البيان / الملاحظات:</label>
                <input
                  type="text"
                  value={remitForm.notes}
                  onChange={(e) => setRemitForm({ ...remitForm, notes: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setRemittingRep(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white rounded-xl font-bold shadow-lg cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>{editingRep ? 'تعديل بيانات مندوب المبيعات' : 'تسجيل مندوب مبيعات وتوزيع جديد'}</span>
              </h3>
              <button
                onClick={() => setIsRepModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRep} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">اسم المندوب:</label>
                  <input
                    type="text"
                    required
                    value={repFormData.name}
                    onChange={(e) => setRepFormData({ ...repFormData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500"
                    placeholder="مثال: أحمد ناصر العمري"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">كود المندوب:</label>
                  <input
                    type="text"
                    value={repFormData.code}
                    onChange={(e) => setRepFormData({ ...repFormData, code: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-mono focus:outline-none"
                    placeholder="REP-01"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">رقم الهاتف:</label>
                  <input
                    type="text"
                    value={repFormData.phone}
                    onChange={(e) => setRepFormData({ ...repFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-mono focus:outline-none"
                    placeholder="771234567"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">نسبة العمولة (%):</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={repFormData.commissionRate}
                    onChange={(e) => setRepFormData({ ...repFormData, commissionRate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-mono focus:outline-none"
                    placeholder="3.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">منطقة وخط السير:</label>
                  <input
                    type="text"
                    value={repFormData.territory}
                    onChange={(e) => setRepFormData({ ...repFormData, territory: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none"
                    placeholder="صنعاء الوسطى وحدّة"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">سيارة التوزيع / وسيلة النقل:</label>
                  <input
                    type="text"
                    value={repFormData.vehicle}
                    onChange={(e) => setRepFormData({ ...repFormData, vehicle: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none"
                    placeholder="هايلوكس غمارتين #3421"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">الهدف اليومي ({currSym}):</label>
                  <input
                    type="number"
                    value={repFormData.dailyTarget}
                    onChange={(e) => setRepFormData({ ...repFormData, dailyTarget: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-mono focus:outline-none"
                    placeholder="250000"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">الهدف الشهري ({currSym}):</label>
                  <input
                    type="number"
                    value={repFormData.monthlyTarget}
                    onChange={(e) => setRepFormData({ ...repFormData, monthlyTarget: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-mono focus:outline-none"
                    placeholder="6500000"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRepModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md"
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

