import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../api';
import { safeFetchJson } from '../../lib/safeFetch';
import { formatAmount, formatNumber, getActiveCurrencySymbol } from '../../lib/formatters';
import { useAuth } from '../../context/AuthContext';
import { computeLocalUnifiedFinancialMetrics } from '../../services/localDesktopApiFallback';
import {
  Bot,
  Sparkles,
  Send,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Lightbulb,
  PhoneCall,
  Copy,
  Check,
  RefreshCw,
  MessageCircle,
  Users,
  Truck,
  FileText,
  Receipt,
  UserCheck,
  Briefcase,
  PackageMinus,
  Phone,
  Edit3,
} from 'lucide-react';

type ModuleCategory =
  | 'CUSTOMER'
  | 'SUPPLIER'
  | 'INVOICE'
  | 'VOUCHER'
  | 'EMPLOYEE'
  | 'SALES_REP'
  | 'LOW_STOCK';

interface MessageTypeOption {
  value: string;
  label: string;
}

const MODULE_CATEGORIES: Array<{ value: ModuleCategory; label: string }> = [
  { value: 'CUSTOMER', label: 'العملاء والمدينون' },
  { value: 'SUPPLIER', label: 'الموردون والدائنون' },
  { value: 'INVOICE', label: 'فواتير المبيعات والمشتريات' },
  { value: 'VOUCHER', label: 'الخزينة وسندات القبض والصرف' },
  { value: 'EMPLOYEE', label: 'الموظفون والرواتب' },
  { value: 'SALES_REP', label: 'مناديب التوزيع الميداني' },
  { value: 'LOW_STOCK', label: 'طلبيات نواقص المخزون للموردين' },
];

const MESSAGE_TYPES_BY_CATEGORY: Record<ModuleCategory, MessageTypeOption[]> = {
  CUSTOMER: [
    { value: 'REMINDER', label: 'تذكير لطيف بالسداد' },
    { value: 'STATEMENT', label: 'كشف حساب ومصادقة رصيد' },
    { value: 'FORMAL_NOTICE', label: 'إنذار رسمي بالتأخير' },
    { value: 'THANK_YOU', label: 'شكر على السداد' },
  ],
  SUPPLIER: [
    { value: 'SUPPLY_ORDER', label: 'طلب توريد بضاعة' },
    { value: 'TRANSFER_NOTICE', label: 'إشعار تحويل دفعة مالية' },
    { value: 'BALANCE_CONFIRM', label: 'مطابقة رصيد حساب' },
  ],
  INVOICE: [
    { value: 'INVOICE_DETAILS', label: 'إرسال تفاصيل فاتورة' },
    { value: 'RECEIPT_NOTICE', label: 'إشعار سند قبض مستلم' },
    { value: 'PAYMENT_NOTICE', label: 'إشعار سند صرف مسدد' },
  ],
  VOUCHER: [
    { value: 'RECEIPT_NOTICE', label: 'إشعار سند قبض مستلم' },
    { value: 'PAYMENT_NOTICE', label: 'إشعار سند صرف مسدد' },
    { value: 'INVOICE_DETAILS', label: 'إرسال تفاصيل فاتورة' },
  ],
  EMPLOYEE: [
    { value: 'SALARY_NOTICE', label: 'إشعار صرف راتب / سلفة' },
    { value: 'REP_COMMISSION_SUMMARY', label: 'ملخص التارجت والعمولة وتصفية العهدة' },
  ],
  SALES_REP: [
    { value: 'REP_COMMISSION_SUMMARY', label: 'ملخص التارجت والعمولة وتصفية العهدة' },
    { value: 'SALARY_NOTICE', label: 'إشعار صرف راتب / سلفة' },
  ],
  LOW_STOCK: [
    { value: 'LOW_STOCK_PO', label: 'إرسال طلبية شراء بالأصناف الناقصة للمورد' },
  ],
};

const QUICK_PROMPTS = [
  'كم إجمالي السيولة في الخزينة والبنوك والمحافظ؟',
  'ملخص المبيعات والمشتريات وصافي الربح',
  'من هم أعلى العملاء مديونية وما هي مطالباتهم؟',
  'كم مستحقات الموردين والفواتير الآجلة؟',
  'ما هي الأصناف الناقصة في المخزون التي تحتاج طلب شراء؟',
  'ملخص أداء وعمولات مناديب التوزيع والرواتب',
];

const extractArray = (res: any, key?: string): any[] => {
  if (Array.isArray(res?.data?.data)) return res.data.data;
  if (key && Array.isArray(res?.data?.[key])) return res.data[key];
  if (Array.isArray(res?.data?.items)) return res.data.items;
  if (Array.isArray(res?.data)) return res.data;
  if (key && Array.isArray(res?.[key])) return res[key];
  if (Array.isArray(res)) return res;
  return [];
};

function readLocalFallbackList(key: string, companyId?: string): any[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    if (companyId) {
      const scoped = localStorage.getItem(`${key}_${companyId}`);
      if (scoped !== null) {
        const parsed = JSON.parse(scoped);
        if (Array.isArray(parsed)) return parsed;
      }
    }
    const base = localStorage.getItem(key);
    if (base !== null) {
      const parsed = JSON.parse(base);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function cleanWhatsAppPhone(rawPhone: string): string {
  let digits = String(rawPhone || '').replace(/[^\d]/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }
  // 9-digit Yemeni mobile starting with 7 -> prepend 967
  if (digits.length === 9 && digits.startsWith('7')) {
    digits = `967${digits}`;
  } else if (digits.length === 10 && digits.startsWith('07')) {
    digits = `967${digits.slice(1)}`;
  } else if (digits.length === 10 && digits.startsWith('05')) {
    digits = `966${digits.slice(1)}`;
  } else if (digits.length === 9 && digits.startsWith('5')) {
    digits = `966${digits}`;
  }
  return digits;
}

export const AIAssistantTab: React.FC = () => {
  const { company } = useAuth();
  const companyId = company?.id || 'comp_001';
  const currency = getActiveCurrencySymbol(company?.currency);
  const companyDisplayName = company?.name || 'إدارة المنشأة';

  const [activeSubTab, setActiveSubTab] = useState<'chat' | 'insights' | 'messaging'>('chat');

  // Chat State
  const [conversationId, setConversationId] = useState<string>('new');
  const [messages, setMessages] = useState<Array<{
    id: string;
    sender: 'user' | 'assistant';
    content: string;
    toolCalls?: any[];
    proposedAction?: any;
    createdAt?: string;
  }>>([
    {
      id: 'welcome',
      sender: 'assistant',
      content: 'مرحباً بك! أنا مساعدك الذكي للأعمال (Arabic AI Business Assistant). مرتبط مباشرة بجميع قوائم النظام (الخزينة، المبيعات، المشتريات، العملاء، الموردين، المخزون، الموظفين والمناديب) لتقديم تقارير فورية وصياغة رسائل واتساب رسمية.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [confirmingAction, setConfirmingAction] = useState<any | null>(null);
  const [confirmStatus, setConfirmStatus] = useState<string | null>(null);

  // Smart Insights State
  const [insights, setInsights] = useState<any[]>([]);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);

  // All ERP Collections State
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState<any[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [salesReps, setSalesReps] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isLoadingCollections, setIsLoadingCollections] = useState(false);

  // Comprehensive Business Messaging State
  const [selectedCategory, setSelectedCategory] = useState<ModuleCategory>('CUSTOMER');
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');
  const [messageType, setMessageType] = useState<string>('REMINDER');
  const [draftResult, setDraftResult] = useState<{
    entityName: string;
    recipientPhone: string;
    draftText: string;
    moduleCategory: ModuleCategory;
  } | null>(null);
  const [isDrafting, setIsDrafting] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [whatsAppStatus, setWhatsAppStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const loadAllErpCollections = useCallback(async () => {
    setIsLoadingCollections(true);
    try {
      const [
        custRes,
        suppRes,
        invRes,
        purRes,
        pmtRes,
        prodRes,
        empRes,
        repsRes,
        expRes,
      ] = await Promise.all([
        safeFetchJson('/api/v1/customers').catch(() => null),
        safeFetchJson('/api/v1/suppliers').catch(() => null),
        safeFetchJson('/api/v1/invoices').catch(() => null),
        safeFetchJson('/api/v1/purchase-invoices').catch(() => null),
        safeFetchJson('/api/v1/payments').catch(() => null),
        safeFetchJson('/api/v1/products').catch(() => null),
        safeFetchJson('/api/v1/employees').catch(() => null),
        safeFetchJson('/api/v1/sales-reps').catch(() => null),
        safeFetchJson('/api/v1/expenses').catch(() => null),
      ]);

      const apiCust = extractArray(custRes, 'customers');
      const apiSupp = extractArray(suppRes, 'suppliers');
      const apiInv = extractArray(invRes, 'invoices');
      const apiPur = extractArray(purRes, 'purchaseInvoices');
      const apiPmt = extractArray(pmtRes, 'payments');
      const apiProd = extractArray(prodRes, 'products');
      const apiEmp = extractArray(empRes, 'employees');
      const apiReps = extractArray(repsRes, 'salesReps');
      const apiExp = extractArray(expRes, 'expenses');

      const finalCust = apiCust.length > 0 ? apiCust : readLocalFallbackList('erp_customers_v1', companyId);
      const finalSupp = apiSupp.length > 0 ? apiSupp : readLocalFallbackList('erp_suppliers_v1', companyId);
      const finalInv = apiInv.length > 0 ? apiInv : readLocalFallbackList('erp_invoices_v1', companyId);
      const finalPur = apiPur.length > 0 ? apiPur : readLocalFallbackList('erp_purchase_invoices_v1', companyId);
      const finalPmt = apiPmt.length > 0 ? apiPmt : readLocalFallbackList('erp_payments_v1', companyId);
      const finalProd = apiProd.length > 0 ? apiProd : readLocalFallbackList('erp_products_v1', companyId);
      const finalEmp = apiEmp.length > 0 ? apiEmp : readLocalFallbackList('erp_employees_v1', companyId);
      const finalExp = apiExp.length > 0 ? apiExp : readLocalFallbackList('erp_employees_expenses_v1', companyId);

      let finalReps = apiReps;
      if (finalReps.length === 0 && typeof window !== 'undefined') {
        try {
          const rawV1 = localStorage.getItem('erp_sales_reps_v1');
          const rawLegacy = localStorage.getItem('erp_sales_reps');
          if (rawV1 !== null) {
            const parsed = JSON.parse(rawV1);
            if (Array.isArray(parsed)) finalReps = parsed;
          } else if (rawLegacy !== null) {
            const parsed = JSON.parse(rawLegacy);
            if (Array.isArray(parsed)) finalReps = parsed;
          }
        } catch {}
      }

      setCustomers(finalCust);
      setSuppliers(finalSupp);
      setInvoices(finalInv);
      setPurchaseInvoices(finalPur);
      setVouchers(finalPmt);
      setProducts(finalProd);
      setEmployees(finalEmp);
      setSalesReps(finalReps);
      setExpenses(finalExp);
    } finally {
      setIsLoadingCollections(false);
    }
  }, [companyId]);

  const fetchInsights = useCallback(async () => {
    setIsLoadingInsights(true);
    try {
      const res = await safeFetchJson<any[]>('/api/v1/ai/insights');
      const apiInsights = extractArray(res, 'insights');
      if (res.success && apiInsights.length > 0) {
        setInsights(apiInsights);
      } else {
        let localMetrics: any = {};
        try {
          localMetrics = computeLocalUnifiedFinancialMetrics(companyId);
        } catch {}

        const liveSales = Number(localMetrics?.salesTotal ?? 0);
        const liveCash = Number(localMetrics?.cashAndBankBalance ?? 0);
        const liveRec = Number(localMetrics?.receivables ?? 0);
        const livePay = Number(localMetrics?.payables ?? 0);
        const lowCount = products.filter(
          (p) => Number(p.current_stock ?? p.stock ?? p.qty ?? 0) <= Number(p.min_stock ?? p.minStock ?? 5)
        ).length;

        setInsights([
          {
            id: 'ins-1',
            category: 'FACT',
            impact: 'HIGH',
            title: 'ملخص المبيعات والتدفقات النقدية',
            description: `إجمالي المبيعات المسجلة حتى الآن يبلغ ${formatAmount(liveSales)} ${currency} مع سيولة متاحة بقيمة ${formatAmount(liveCash)} ${currency}.`,
            actionableStep: 'مراجعة الفواتير الأعلى قيمة وتعزيز حركة الأصناف سريعة الدوران.',
          },
          {
            id: 'ins-2',
            category: 'CALCULATION',
            impact: 'HIGH',
            title: 'تغطية السيولة للالتزامات والذمم',
            description: `إجمالي ذمم العملاء المستحقة ${formatAmount(liveRec)} ${currency} مقابل التزامات موردين بقيمة ${formatAmount(livePay)} ${currency}.`,
            actionableStep: liveRec > 0 ? 'توجيه إشعارات السداد الفورية للعملاء عبر تبويب مراسل الأعمال والواتساب.' : 'الحفاظ على توازن التحصيل والسداد مع الموردين.',
          },
          {
            id: 'ins-3',
            category: 'INTERPRETATION',
            impact: 'MEDIUM',
            title: 'مراقبة نواقص المخزون وإعادة الطلب',
            description: lowCount > 0
              ? `تم رصد ${lowCount} أصناف وصلت إلى حد إعادة الطلب وتحتاج إلى توريد فوري لتفادي انقطاع المبيعات.`
              : 'مستويات المخزون الحالية مستقرة ولا توجد أصناف حرجة منخفضة المخزون حالياً.',
            actionableStep: lowCount > 0 ? 'انتقل إلى مراسل الأعمال لإرسال طلبية شراء مباشرة للمورد عبر واتساب.' : 'مواصلة الجرد الدوري ومتابعة حركة الصرف.',
          },
          {
            id: 'ins-4',
            category: 'RECOMMENDATION',
            impact: 'HIGH',
            title: 'تحصيل المناديب وأداء المبيعات الميدانية',
            description: `عدد مناديب التوزيع النشطين: ${salesReps.length}، بإجمالي مبيعات محققة ${formatAmount(salesReps.reduce((s, r) => s + Number(r.achievedSales ?? r.salesMonth ?? 0), 0))} ${currency}.`,
            actionableStep: 'إرسال كشوفات العمولات والأهداف الشهرية للمناديب لتحفيز الإنجاز.',
          },
        ]);
      }
    } catch {
      setInsights([]);
    } finally {
      setIsLoadingInsights(false);
    }
  }, [companyId, currency, products, salesReps]);

  useEffect(() => {
    loadAllErpCollections();
  }, [loadAllErpCollections]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  useEffect(() => {
    const syncHandler = () => {
      loadAllErpCollections();
    };
    const events = [
      'erp-demo-data-wiped',
      'erp-inventory-updated',
      'erp-invoices-updated',
      'erp-purchases-updated',
      'erp-payments-updated',
      'erp-customers-updated',
      'erp-suppliers-updated',
      'erp-employees-updated',
      'erp-expenses-updated',
      'erp-sales-reps-updated',
      'erp-data-updated',
    ];
    events.forEach((ev) => window.addEventListener(ev, syncHandler));
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, syncHandler));
    };
  }, [loadAllErpCollections]);

  // Refresh data when switching to messaging tab
  useEffect(() => {
    if (activeSubTab === 'messaging') {
      loadAllErpCollections();
    }
  }, [activeSubTab, loadAllErpCollections]);

  // Low stock items helper
  const lowStockProducts = products.filter((p) => {
    const stock = Number(p.current_stock ?? p.stock ?? p.qty ?? p.quantity ?? 0);
    const min = Number(p.min_stock ?? p.minStock ?? 5);
    return stock <= min;
  });

  // Combined invoices list for INVOICE module
  const combinedInvoices = [
    ...invoices.map((inv) => ({ ...inv, _docKind: 'SALE' })),
    ...purchaseInvoices.map((pur) => ({ ...pur, _docKind: 'PURCHASE' })),
  ];

  // Resolve target entities for selected category
  const getEntitiesForCategory = useCallback(
    (category: ModuleCategory) => {
      switch (category) {
        case 'CUSTOMER':
          return customers.map((c) => {
            const bal = Number(c.current_balance ?? c.balance ?? 0);
            const phone = c.phone || c.mobile || '';
            return {
              id: String(c.id),
              name: c.name || c.full_name || 'عميل',
              phone,
              amount: bal,
              label: `${c.name || c.full_name} — الرصيد: ${formatAmount(bal)} ${currency}${phone ? ` (${phone})` : ''}`,
              raw: c,
            };
          });
        case 'SUPPLIER':
          return suppliers.map((s) => {
            const bal = Number(s.current_balance ?? s.balance ?? 0);
            const phone = s.phone || s.mobile || '';
            return {
              id: String(s.id),
              name: s.name || s.full_name || 'مورد',
              phone,
              amount: bal,
              label: `${s.name || s.full_name} — المستحق: ${formatAmount(bal)} ${currency}${phone ? ` (${phone})` : ''}`,
              raw: s,
            };
          });
        case 'INVOICE':
          return combinedInvoices.map((inv) => {
            const isPurchase = inv._docKind === 'PURCHASE';
            const num = inv.invoice_number || inv.invoiceNumber || inv.id;
            const total = Number(inv.grandTotal ?? inv.total ?? inv.total_amount ?? 0);
            const partyName = isPurchase
              ? inv.supplier_name || inv.supplierName || suppliers.find((s) => s.id === inv.supplier_id)?.name || 'مورد'
              : inv.customer_name || inv.customerName || customers.find((c) => c.id === inv.customer_id)?.name || 'عميل';
            const matchedParty = isPurchase
              ? suppliers.find((s) => s.id === inv.supplier_id || s.name === partyName)
              : customers.find((c) => c.id === inv.customer_id || c.name === partyName);
            const phone = inv.phone || inv.customer_phone || inv.supplier_phone || matchedParty?.phone || matchedParty?.mobile || '';
            return {
              id: `${inv._docKind}_${inv.id}`,
              name: partyName,
              docNumber: num,
              phone,
              amount: total,
              label: `${isPurchase ? 'فاتورة مشتريات' : 'فاتورة مبيعات'} #${num} | ${partyName} — ${formatAmount(total)} ${currency}${phone ? ` (${phone})` : ''}`,
              raw: inv,
            };
          });
        case 'VOUCHER':
          return vouchers.map((v) => {
            const amt = Number(v.amount ?? 0);
            const isReceipt =
              v.type === 'CUSTOMER_PAYMENT' ||
              v.voucher_type === 'RECEIPT' ||
              v.payment_type === 'IN' ||
              v.payment_type === 'RECEIPT';
            const partyName =
              v.customer_name ||
              v.supplier_name ||
              v.party_name ||
              v.partyName ||
              customers.find((c) => c.id === (v.customer_id || v.party_id))?.name ||
              suppliers.find((s) => s.id === (v.supplier_id || v.party_id))?.name ||
              'طرف عام';
            const matchedParty =
              customers.find((c) => c.id === (v.customer_id || v.party_id) || c.name === partyName) ||
              suppliers.find((s) => s.id === (v.supplier_id || v.party_id) || s.name === partyName);
            const phone = v.phone || matchedParty?.phone || matchedParty?.mobile || '';
            const vNum = v.voucher_number || v.reference_number || v.id;
            return {
              id: String(v.id),
              name: partyName,
              docNumber: vNum,
              phone,
              amount: amt,
              isReceipt,
              label: `${isReceipt ? 'سند قبض' : 'سند صرف'} #${vNum} | ${partyName} — ${formatAmount(amt)} ${currency}${phone ? ` (${phone})` : ''}`,
              raw: v,
            };
          });
        case 'EMPLOYEE':
          return employees.map((emp) => {
            const salary = Number(emp.salary ?? emp.net_salary ?? emp.base_salary ?? 0);
            const phone = emp.phone || emp.mobile || '';
            return {
              id: String(emp.id),
              name: emp.name || emp.full_name || 'موظف',
              phone,
              amount: salary,
              label: `${emp.name || emp.full_name} (${emp.position || emp.role || 'موظف'}) — الراتب: ${formatAmount(salary)} ${currency}${phone ? ` (${phone})` : ''}`,
              raw: emp,
            };
          });
        case 'SALES_REP':
          return salesReps.map((rep) => {
            const achieved = Number(rep.achievedSales ?? rep.salesMonth ?? 0);
            const phone = rep.phone || '';
            return {
              id: String(rep.id),
              name: rep.name || 'مندوب',
              phone,
              amount: achieved,
              label: `${rep.name} (${rep.territory || rep.zone || 'ميداني'}) — المبيعات: ${formatAmount(achieved)} ${currency}${phone ? ` (${phone})` : ''}`,
              raw: rep,
            };
          });
        case 'LOW_STOCK': {
          const itemsList = lowStockProducts.map((p) => {
            const stock = Number(p.current_stock ?? p.stock ?? p.qty ?? 0);
            const min = Number(p.min_stock ?? p.minStock ?? 5);
            const cost = Number(p.cost_price ?? p.purchase_price ?? 0);
            const matchedSupplier = suppliers.find((s) => s.id === p.supplier_id || s.name === p.supplier_name) || suppliers[0];
            const phone = matchedSupplier?.phone || matchedSupplier?.mobile || '';
            return {
              id: String(p.id),
              name: matchedSupplier?.name || p.supplier_name || 'المورد المعتمد',
              productName: p.name,
              stock,
              min,
              phone,
              amount: cost * Math.max(10, min * 2 - stock),
              label: `${p.name} — المتوفر: ${stock} (الحد الأدنى: ${min})${phone ? ` | هاتف المورد: ${phone}` : ''}`,
              raw: p,
            };
          });
          if (itemsList.length > 1) {
            const defaultSupplier = suppliers[0];
            return [
              {
                id: 'ALL_LOW_STOCK',
                name: defaultSupplier?.name || 'المورد المعتمد',
                phone: defaultSupplier?.phone || defaultSupplier?.mobile || '',
                amount: itemsList.reduce((sum, i) => sum + Number(i.amount || 0), 0),
                label: `طلبية شراء مجمّعة (${itemsList.length} أصناف ناقصة في المخزون)`,
                raw: lowStockProducts,
              },
              ...itemsList,
            ];
          }
          return itemsList;
        }
        default:
          return [];
      }
    },
    [customers, suppliers, combinedInvoices, vouchers, employees, salesReps, lowStockProducts, currency]
  );

  const currentEntities = getEntitiesForCategory(selectedCategory);

  // Sync selectedEntityId and messageType when category or data changes
  useEffect(() => {
    const validTypes = MESSAGE_TYPES_BY_CATEGORY[selectedCategory] || [];
    if (!validTypes.some((t) => t.value === messageType)) {
      setMessageType(validTypes[0]?.value || 'REMINDER');
    }

    if (currentEntities.length === 0) {
      setSelectedEntityId('');
    } else if (!currentEntities.some((e) => e.id === selectedEntityId)) {
      setSelectedEntityId(currentEntities[0].id);
    }
  }, [selectedCategory, currentEntities, selectedEntityId, messageType]);

  // Local Intelligent Financial Chat Engine (Fallback / Real-Time Data Responder)
  const buildLocalAccountingReply = (queryText: string): string => {
    const q = queryText.toLowerCase();
    let metrics: any = null;
    try {
      metrics = computeLocalUnifiedFinancialMetrics(companyId);
    } catch {}

    const totalCashAndBank = Number(metrics?.cashAndBankBalance ?? 0);
    const cashBox = Number(metrics?.cashBalance ?? 0);
    const bankBal = Number(metrics?.bankBalance ?? 0);
    const walletBal = Number(metrics?.walletBalance ?? 0);

    const salesTotal = invoices.length > 0
      ? invoices.filter((i) => (i.status || '').toUpperCase() !== 'CANCELLED').reduce((s, i) => s + Number(i.grandTotal ?? i.total ?? 0), 0)
      : Number(metrics?.salesTotal ?? 0);
    const purchasesTotal = purchaseInvoices.length > 0
      ? purchaseInvoices.filter((p) => (p.status || '').toUpperCase() !== 'CANCELLED').reduce((s, p) => s + Number(p.grandTotal ?? p.total ?? p.total_amount ?? 0), 0)
      : Number(metrics?.purchasesTotal ?? 0);
    const totalExpenses = expenses.length > 0
      ? expenses.reduce((s, e) => s + Number(e.amount ?? 0), 0)
      : Number(metrics?.operatingExpenses ?? 0);
    const netProfit = Number(metrics?.netIncome ?? metrics?.netProfit ?? (salesTotal - Number(metrics?.cogsTotal ?? 0) - totalExpenses));

    const totalReceivables = customers.length > 0
      ? customers.reduce((s, c) => s + Math.max(0, Number(c.current_balance ?? c.balance ?? 0)), 0)
      : Number(metrics?.receivables ?? 0);
    const totalPayables = suppliers.length > 0
      ? suppliers.reduce((s, sp) => s + Math.max(0, Number(sp.current_balance ?? sp.balance ?? 0)), 0)
      : Number(metrics?.payables ?? 0);

    const invValuation = products.length > 0
      ? products.reduce((s, pr) => s + Number(pr.cost_price ?? pr.purchase_price ?? 0) * Math.max(0, Number(pr.current_stock ?? pr.stock ?? pr.qty ?? 0)), 0)
      : Number(metrics?.inventoryValuation ?? 0);

    // 1. Liquidity / Treasury / Cash / Bank / Wallets
    if (q.includes('سيول') || q.includes('خزين') || q.includes('بنك') || q.includes('محفظ') || q.includes('نقد') || q.includes('صندوق')) {
      const receiptsCount = vouchers.filter((v) => v.type === 'CUSTOMER_PAYMENT' || v.voucher_type === 'RECEIPT' || v.payment_type === 'IN').length;
      const disbursementsCount = vouchers.filter((v) => v.type === 'SUPPLIER_PAYMENT' || v.voucher_type === 'PAYMENT' || v.payment_type === 'OUT').length;
      return [
        `📊 ملخص السيولة النقدية والأرصدة الحالية (${companyDisplayName}):`,
        `• إجمالي السيولة المتاحة: ${formatAmount(totalCashAndBank)} ${currency}`,
        `• رصيد الخزينة الرئيسية (النقدية): ${formatAmount(cashBox)} ${currency}`,
        `• رصيد البنوك والحسابات المصرفية: ${formatAmount(bankBal)} ${currency}`,
        `• رصيد المحافظ الإلكترونية: ${formatAmount(walletBal)} ${currency}`,
        `• إجمالي سندات القبض (${receiptsCount}) وسندات الصرف (${disbursementsCount}) المسجلة: ${vouchers.length} سند.`,
      ].join('\n');
    }

    // 2. Sales, Purchases & Net Profit
    if (q.includes('مبيعات') || q.includes('مشتريات') || q.includes('ربح') || q.includes('أرباح') || q.includes('دخل')) {
      const cogs = Number(metrics?.cogsTotal ?? 0);
      const grossProfit = Number(metrics?.grossProfit ?? (salesTotal - cogs));
      return [
        `📈 ملخص الأداء التجاري والربحية (${companyDisplayName}):`,
        `• إجمالي المبيعات (${invoices.length} فاتورة): ${formatAmount(salesTotal)} ${currency}`,
        `• إجمالي المشتريات (${purchaseInvoices.length} فاتورة): ${formatAmount(purchasesTotal)} ${currency}`,
        `• تكلفة البضاعة المباعة (COGS): ${formatAmount(cogs)} ${currency}`,
        `• مجمل الربح: ${formatAmount(grossProfit)} ${currency}`,
        `• المصروفات التشغيلية (${expenses.length} بند): ${formatAmount(totalExpenses)} ${currency}`,
        `• صافي الربح التشغيلي: ${formatAmount(netProfit)} ${currency}`,
      ].join('\n');
    }

    // 3. Customers / Debtors
    if (q.includes('عملاء') || q.includes('مديوني') || q.includes('ديون') || q.includes('مطالب')) {
      const debtors = [...customers]
        .map((c) => ({
          name: c.name || c.full_name || 'عميل',
          balance: Number(c.current_balance ?? c.balance ?? 0),
          phone: c.phone || c.mobile || 'غير مسجل',
        }))
        .filter((c) => c.balance > 0)
        .sort((a, b) => b.balance - a.balance);

      if (debtors.length === 0) {
        return `✅ سجل العملاء (${customers.length} عميل): لا توجد مديونيات قائمة أو متأخرة على العملاء حالياً (${formatAmount(0)} ${currency}).`;
      }
      const topList = debtors
        .slice(0, 5)
        .map((d, idx) => `${idx + 1}. ${d.name}: ${formatAmount(d.balance)} ${currency} (هاتف: ${d.phone})`)
        .join('\n');
      return [
        `👥 تقرير أعلى العملاء مديونية والمطالبات (${debtors.length} عميل مدين من أصل ${customers.length}):`,
        `• إجمالي الذمم المدينة المستحقة: ${formatAmount(totalReceivables)} ${currency}`,
        topList,
        `💡 يمكنك الانتقال إلى تبويب «مراسل المطالبات والواتساب» لصياغة وإرسال مطالبة فورية لأي عميل.`,
      ].join('\n');
    }

    // 4. Suppliers / Payables / Pending Invoices
    if (q.includes('مورد') || q.includes('مستحق') || q.includes('آجل') || q.includes('دائن') || q.includes('فواتير')) {
      const creditors = [...suppliers]
        .map((s) => ({
          name: s.name || s.full_name || 'مورد',
          balance: Number(s.current_balance ?? s.balance ?? 0),
          phone: s.phone || s.mobile || 'غير مسجل',
        }))
        .filter((s) => s.balance > 0)
        .sort((a, b) => b.balance - a.balance);

      const pendingInv = invoices.filter((i) => {
        const rem = Number(i.remaining_amount ?? i.balance_due ?? (Number(i.grandTotal ?? i.total ?? 0) - Number(i.paid_amount ?? i.paidAmount ?? 0)));
        return (i.status || '').toUpperCase() !== 'CANCELLED' && rem > 0;
      });
      const pendingPur = purchaseInvoices.filter((p) => {
        const rem = Number(p.remaining_amount ?? p.balance_due ?? (Number(p.grandTotal ?? p.total ?? 0) - Number(p.paid_amount ?? p.paidAmount ?? 0)));
        return (p.status || '').toUpperCase() !== 'CANCELLED' && rem > 0;
      });

      const topSuppList = creditors.length > 0
        ? creditors.slice(0, 5).map((s, idx) => `${idx + 1}. ${s.name}: ${formatAmount(s.balance)} ${currency}`).join('\n')
        : 'لا توجد التزامات قائمة للموردين حالياً.';

      return [
        `🏭 تقرير مستحقات الموردين والفواتير الآجلة:`,
        `• إجمالي الذمم الدائنة للموردين (${creditors.length} مورد): ${formatAmount(totalPayables)} ${currency}`,
        topSuppList,
        `• فواتير المبيعات الآجلة/الجزئية المعلقة: ${pendingInv.length} فاتورة.`,
        `• فواتير المشتريات الآجلة/الجزئية المعلقة: ${pendingPur.length} فاتورة.`,
      ].join('\n');
    }

    // 5. Inventory & Low Stock
    if (q.includes('مخزون') || q.includes('صنف') || q.includes('أصناف') || q.includes('ناقص') || q.includes('شراء') || q.includes('منخفض')) {
      if (lowStockProducts.length === 0) {
        return [
          `📦 حالة المخزون (${products.length} صنف مسجل):`,
          `• إجمالي قيمة المخزون بالتكلفة: ${formatAmount(invValuation)} ${currency}`,
          `• ✅ جميع الأصناف ضمن الحدود الآمنة ولا توجد نواقص حالياً.`,
        ].join('\n');
      }
      const list = lowStockProducts
        .slice(0, 8)
        .map((p, idx) => {
          const stk = Number(p.current_stock ?? p.stock ?? p.qty ?? 0);
          const min = Number(p.min_stock ?? p.minStock ?? 5);
          return `${idx + 1}. ${p.name} — الرصيد الحالي: ${stk} (الحد الأدنى: ${min})`;
        })
        .join('\n');
      return [
        `⚠️ تنبيه نواقص المخزون (${lowStockProducts.length} صنف بحاجة لطلب شراء من أصل ${products.length}):`,
        `• إجمالي قيمة المخزون الحالية: ${formatAmount(invValuation)} ${currency}`,
        list,
        `💡 يمكنك التوجه إلى «مراسل المطالبات والواتساب» واختيار قسم «طلبيات نواقص المخزون للموردين» لإرسال طلبية الشراء عبر واتساب مباشرة.`,
      ].join('\n');
    }

    // 6. Sales Reps & Employees Payroll
    if (q.includes('مندوب') || q.includes('مناديب') || q.includes('عمول') || q.includes('توزيع') || q.includes('موظف') || q.includes('رواتب') || q.includes('راتب')) {
      const totalPayroll = employees.reduce((s, e) => s + Number(e.salary ?? e.net_salary ?? e.base_salary ?? 0), 0);
      const repsAchieved = salesReps.reduce((s, r) => s + Number(r.achievedSales ?? r.salesMonth ?? 0), 0);
      const repsCollected = salesReps.reduce((s, r) => s + Number(r.collectedCash ?? r.collected ?? 0), 0);
      const repsCommissions = salesReps.reduce((s, r) => s + Number(r.earnedCommission ?? r.commissionEarned ?? 0), 0);

      return [
        `🚚 تقرير مناديب التوزيع الميداني والموظفين:`,
        `• عدد مناديب التوزيع المسجلين: ${salesReps.length} مندوب`,
        `• إجمالي مبيعات المناديب المحققة: ${formatAmount(repsAchieved)} ${currency}`,
        `• إجمالي النقدية الموردة من المناديب: ${formatAmount(repsCollected)} ${currency}`,
        `• إجمالي العمولات المستحقة: ${formatAmount(repsCommissions)} ${currency}`,
        `• عدد الموظفين المسجلين: ${employees.length} موظف (إجمالي الرواتب الشهرية: ${formatAmount(totalPayroll)} ${currency}).`,
      ].join('\n');
    }

    // Default Executive Summary
    return [
      `📌 الملخص التنفيذي الحي لبيانات (${companyDisplayName}):`,
      `• إجمالي السيولة (خزينة + بنوك + محافظ): ${formatAmount(totalCashAndBank)} ${currency}`,
      `• المبيعات (${invoices.length} فاتورة): ${formatAmount(salesTotal)} ${currency} | صافي الربح: ${formatAmount(netProfit)} ${currency}`,
      `• المشتريات (${purchaseInvoices.length} فاتورة): ${formatAmount(purchasesTotal)} ${currency}`,
      `• ذمم العملاء: ${formatAmount(totalReceivables)} ${currency} (${customers.length} عميل) | مستحقات الموردين: ${formatAmount(totalPayables)} ${currency} (${suppliers.length} مورد)`,
      `• المخزون: ${products.length} صنف (نواقص: ${lowStockProducts.length}) بقيمة ${formatAmount(invValuation)} ${currency}`,
      `• السندات: ${vouchers.length} | الموظفون: ${employees.length} | المناديب: ${salesReps.length}`,
    ].join('\n');
  };

  // Local Business Message Draft Builder (Guaranteed 100% Web + Desktop)
  const buildLocalDraftText = (
    category: ModuleCategory,
    entity: any,
    msgType: string
  ): { entityName: string; recipientPhone: string; draftText: string } => {
    if (!entity) {
      return {
        entityName: 'غير محدد',
        recipientPhone: '',
        draftText: 'يرجى اختيار طرف أو مستند من القائمة أعلاه لصياغة الرسالة.',
      };
    }

    const name = entity.name || 'الشريك الكريم';
    const phone = entity.phone || '';
    const amountFormatted = `${formatAmount(entity.amount || 0)} ${currency}`;
    const docNum = entity.docNumber || '';
    const todayStr = new Date().toISOString().split('T')[0];

    if (category === 'CUSTOMER') {
      if (msgType === 'STATEMENT') {
        return {
          entityName: name,
          recipientPhone: phone,
          draftText: `السادة / ${name} المحترمون،\nتحية طيبة من ${companyDisplayName}،\n\nنرفق لكم خلاصة كشف حسابكم ومصادقة الرصيد حتى تاريخ ${todayStr}:\n• الرصيد المستحق الحالي: ${amountFormatted}\n\nنرجو مراجعة الرصيد وإفادتنا بالمطابقة أو جدولة السداد. شاكرين لكم حسن تعاونكم المستمر.`,
        };
      }
      if (msgType === 'FORMAL_NOTICE') {
        return {
          entityName: name,
          recipientPhone: phone,
          draftText: `السادة / ${name} المحترمون،\nإشعار رسمي صادر عن الإدارة المالية في ${companyDisplayName}،\n\nنحيطكم علماً بأن رصيد حسابكم المستحق والبالغ (${amountFormatted}) قد تجاوز فترة الاستحقاق المتفق عليها.\nنرجو المبادرة بتسوية المبلغ خلال 48 ساعة لتفادي إيقاف التوريد أو الإجراءات النظامية، وموافاتنا بإيصال الحوالة فور السداد.`,
        };
      }
      if (msgType === 'THANK_YOU') {
        return {
          entityName: name,
          recipientPhone: phone,
          draftText: `الأخوة الأعزاء / ${name} المحترمون،\n\nنتقدم لكم بجزيل الشكر والتقدير من ${companyDisplayName} على التزامكم الكريم وسرعة سدادكم. الرصيد الحالي المسجل لدينا: ${amountFormatted}.\nنتطلع دائماً لاستمرار شراكتنا المثمرة معكم.`,
        };
      }
      // REMINDER
      return {
        entityName: name,
        recipientPhone: phone,
        draftText: `السلام عليكم ورحمة الله وبركاته،\nالسادة / ${name} المحترمون،\n\nتود ${companyDisplayName} تذكيركم بلطف بالرصيد المستحق على حسابكم بمبلغ وقدره (${amountFormatted}).\nنرجو التكرم بالسداد في أقرب وقت ممكن أو التواصل معنا في حال وجود أي استفسار. ولكم خالص الشكر.`,
      };
    }

    if (category === 'SUPPLIER') {
      if (msgType === 'TRANSFER_NOTICE') {
        return {
          entityName: name,
          recipientPhone: phone,
          draftText: `السادة / ${name} المحترمون،\nتحية طيبة من ${companyDisplayName}،\n\nنود إشعاركم بمراجعة رصيدكم الدائن لدينا البالغ (${amountFormatted}) تمهيداً لتحويل الدفعة المالية المستحقة. يرجى تزويدنا ببيانات الحساب البنكي المعتمدة لتنفيذ التحويل وإرسال الإشعار.`,
        };
      }
      if (msgType === 'BALANCE_CONFIRM') {
        return {
          entityName: name,
          recipientPhone: phone,
          draftText: `السادة / ${name} المحترمون،\n\nلأغراض المراجعة والمطابقة الدورية في ${companyDisplayName} حتى تاريخ ${todayStr}، يظهر الرصيد الدائن لكم في دفاترنا بمبلغ: ${amountFormatted}.\nنأمل مطابقته وإفادتنا بالاعتماد.`,
        };
      }
      // SUPPLY_ORDER
      return {
        entityName: name,
        recipientPhone: phone,
        draftText: `السادة / ${name} المحترمون،\nتحية طيبة من إدارة المشتريات في ${companyDisplayName}،\n\nنرغب برفع طلب توريد بضاعة جديدة وفق الأصناف والكميات المطلوبة لدينا. يرجى تزويدنا بعرض السعر وموعد التسليم المتوقع في أقرب فرصة.`,
      };
    }

    if (category === 'INVOICE') {
      const rawInv = entity.raw || {};
      const isPurchase = rawInv._docKind === 'PURCHASE';
      const paid = Number(rawInv.paid_amount ?? rawInv.paidAmount ?? 0);
      const remaining = Math.max(0, Number(entity.amount || 0) - paid);
      return {
        entityName: name,
        recipientPhone: phone,
        draftText: `السادة / ${name} المحترمون،\nتحية طيبة من ${companyDisplayName}،\n\nإليكم تفاصيل ${isPurchase ? 'فاتورة المشتريات' : 'فاتورة المبيعات'} رقم (${docNum}):\n• الإجمالي: ${amountFormatted}\n• المبلغ المدفوع: ${formatAmount(paid)} ${currency}\n• المتبقي المستحق: ${formatAmount(remaining)} ${currency}\n\nنشكركم لتعاملكم الدائم معنا.`,
      };
    }

    if (category === 'VOUCHER') {
      const isReceipt = msgType === 'RECEIPT_NOTICE' || (msgType !== 'PAYMENT_NOTICE' && entity.isReceipt);
      return {
        entityName: name,
        recipientPhone: phone,
        draftText: isReceipt
          ? `السادة / ${name} المحترمون،\nتحية طيبة من ${companyDisplayName}،\n\nنؤكد لكم استلامنا لمبلغ (${amountFormatted}) بموجب سند قبض رقم (${docNum}) بتاريخ ${todayStr}، وتم قيده في حسابكم بنجاح.\nشكراً لتعاونكم.`
          : `السادة / ${name} المحترمون،\nتحية طيبة من ${companyDisplayName}،\n\nنود إشعاركم بأنه تم صرف مبلغ (${amountFormatted}) لحسابكم بموجب سند صرف رقم (${docNum}) بتاريخ ${todayStr}.\nنرجو تأكيد الاستلام.`,
      };
    }

    if (category === 'EMPLOYEE') {
      const rawEmp = entity.raw || {};
      return {
        entityName: name,
        recipientPhone: phone,
        draftText: `الأخ الكريم / ${name} (${rawEmp.position || rawEmp.role || 'موظف'})،\nتحية طيبة من إدارة الموارد البشرية في ${companyDisplayName}،\n\nنود إشعاركم باعتماد مستحقاتكم المالية / الراتب الشهري بمبلغ (${amountFormatted}) بتاريخ ${todayStr}.\nنتمنى لكم دوام التوفيق والعطاء.`,
      };
    }

    if (category === 'SALES_REP') {
      const rawRep = entity.raw || {};
      const target = Number(rawRep.monthlyTarget ?? 0);
      const achieved = Number(rawRep.achievedSales ?? rawRep.salesMonth ?? 0);
      const collected = Number(rawRep.collectedCash ?? rawRep.collected ?? 0);
      const pending = Number(rawRep.pendingReceivables ?? 0);
      const commRate = Number(rawRep.commissionRate ?? 0);
      const earnedComm = Number(rawRep.earnedCommission ?? rawRep.commissionEarned ?? 0);
      const pct = target > 0 ? ((achieved / target) * 100).toFixed(1) : '0';

      return {
        entityName: name,
        recipientPhone: phone,
        draftText: `الأخ المندوب / ${name} المحترم،\nتحية طيبة من إدارة المبيعات في ${companyDisplayName}،\n\nملخص أدائكم الميداني وتصفية العمولة حتى ${todayStr}:\n• الهدف الشهري: ${formatAmount(target)} ${currency}\n• المبيعات المحققة: ${formatAmount(achieved)} ${currency} (${pct}%)\n• النقدية الموردة: ${formatAmount(collected)} ${currency}\n• الذمم المعلقة: ${formatAmount(pending)} ${currency}\n• نسبة العمولة (${commRate}%): ${formatAmount(earnedComm)} ${currency}\n\nشكراً لجهودكم الميدانية ونتمنى لكم مزيداً من الإنجاز.`,
      };
    }

    // LOW_STOCK
    if (entity.id === 'ALL_LOW_STOCK' && Array.isArray(entity.raw)) {
      const lines = entity.raw
        .map((p: any, idx: number) => {
          const stk = Number(p.current_stock ?? p.stock ?? p.qty ?? 0);
          const min = Number(p.min_stock ?? p.minStock ?? 5);
          const suggestedOrder = Math.max(10, min * 2 - stk);
          return `${idx + 1}. ${p.name} (المتوفر: ${stk} | المطلوب توريده: ${suggestedOrder})`;
        })
        .join('\n');
      return {
        entityName: name,
        recipientPhone: phone,
        draftText: `السادة / ${name} المحترمون،\nتحية طيبة من إدارة المشتريات في ${companyDisplayName}،\n\nنرجو التكرم بتوريد طلبية الشراء التالية لتغطية نواقص المخزون لدينا:\n${lines}\n\nيرجى موافاتنا بعرض السعر النهائي وموعد التسليم المحدد.`,
      };
    }

    const rawProd = entity.raw || {};
    const stk = Number(rawProd.current_stock ?? rawProd.stock ?? rawProd.qty ?? 0);
    const min = Number(rawProd.min_stock ?? rawProd.minStock ?? 5);
    const suggestedQty = Math.max(10, min * 2 - stk);
    return {
      entityName: name,
      recipientPhone: phone,
      draftText: `السادة / ${name} المحترمون،\nتحية طيبة من إدارة المشتريات في ${companyDisplayName}،\n\nنرغب بطلب شراء عاجل للصنف الناقص التالي:\n• الصنف: ${entity.productName || rawProd.name}\n• الرصيد الحالي لدينا: ${stk}\n• الكمية المطلوب توريدها: ${suggestedQty} ${rawProd.unit || 'حبة'}\n\nيرجى تأكيد التوفر وإرسال عرض السعر وموعد التسليم.`,
    };
  };

  const handleSend = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = customText || input;
    if (!textToSend.trim() || isSending) return;

    const userMsgId = `usr_${Date.now()}`;
    setMessages((prev) => [...prev, { id: userMsgId, sender: 'user', content: textToSend }]);
    if (!customText) setInput('');
    setIsSending(true);

    try {
      const token = api.getToken();
      const res = await safeFetchJson(`/api/v1/ai/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: textToSend, text: textToSend, content: textToSend }),
      });

      const data = res?.data;
      if (data?.data?.conversationId) {
        setConversationId(data.data.conversationId);
      }

      const replyContent =
        data?.data?.responseMessage ||
        data?.data?.text ||
        data?.data?.reply ||
        data?.responseMessage ||
        data?.text ||
        data?.reply;

      const isGenericStub =
        !replyContent ||
        !String(replyContent).trim() ||
        String(replyContent).includes('تم معالجة استفسارك بنجاح') ||
        String(replyContent).startsWith('تم استلام طلبك:');

      const finalContent =
        res.ok && !isGenericStub
          ? String(replyContent)
          : buildLocalAccountingReply(textToSend);

      const asstMsg = {
        id: `asst_${Date.now()}`,
        sender: 'assistant' as const,
        content: finalContent,
        toolCalls: data?.data?.toolCallsExecuted,
        proposedAction: data?.data?.proposedAction,
      };

      setMessages((prev) => [...prev, asstMsg]);

      if (data?.data?.proposedAction) {
        setConfirmingAction(data.data.proposedAction);
      }
    } catch {
      const fallbackContent = buildLocalAccountingReply(textToSend);
      setMessages((prev) => [
        ...prev,
        {
          id: `asst_${Date.now()}`,
          sender: 'assistant',
          content: fallbackContent,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmingAction) return;
    setConfirmStatus('جاري الاعتماد المحاسبي المزدوج...');

    try {
      const token = api.getToken();
      const res = await safeFetchJson('/api/v1/ai/actions/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ proposedAction: confirmingAction }),
      });

      if (!res.ok || !res.data) {
        throw new Error(res.error || res.data?.error?.message || 'فشل اعتماد الإجراء');
      }

      setConfirmStatus(`تم الاعتماد بنجاح! ${res.data.data?.message || 'تم الترحيل بنجاح'}`);
      setConfirmingAction(null);
    } catch (err: any) {
      setConfirmStatus(`خطأ في الاعتماد: ${err.message}`);
    }
  };

  const handleGenerateDraftMessage = async () => {
    const selectedEntity = currentEntities.find((e) => e.id === selectedEntityId);
    if (!selectedEntity) return;

    setIsDrafting(true);
    setWhatsAppStatus(null);

    try {
      const token = api.getToken();
      const localDraft = buildLocalDraftText(selectedCategory, selectedEntity, messageType);

      let resolvedDraftText = localDraft.draftText;
      let resolvedName = localDraft.entityName;
      let resolvedPhone = localDraft.recipientPhone;

      try {
        const res = await safeFetchJson('/api/v1/ai/draft-message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            customerId: selectedCategory === 'CUSTOMER' ? selectedEntity.id : undefined,
            entityId: selectedEntity.id,
            moduleType: selectedCategory,
            messageType,
            recipientName: selectedEntity.name,
            recipientPhone: selectedEntity.phone,
            amount: selectedEntity.amount,
            currency,
          }),
        });

        if (res.ok && res.data) {
          const payload = res.data?.data || res.data;
          const serverText = payload?.draftText || payload?.draft;
          const isHardcodedServerStub =
            typeof serverText === 'string' &&
            serverText.includes('مؤسسة الأفق للتجارة') &&
            !String(selectedEntity.name || '').includes('الأفق');

          if (serverText && String(serverText).trim() && !isHardcodedServerStub) {
            resolvedDraftText = String(serverText);
            if (payload.customerName || payload.recipientName) {
              resolvedName = payload.customerName || payload.recipientName;
            }
            if (payload.recipientPhone) {
              resolvedPhone = payload.recipientPhone;
            }
          }
        }
      } catch {
        // Silent fallback to guaranteed local draft
      }

      setDraftResult({
        entityName: resolvedName,
        recipientPhone: resolvedPhone,
        draftText: resolvedDraftText,
        moduleCategory: selectedCategory,
      });
    } finally {
      setIsDrafting(false);
    }
  };

  const handleSendViaWhatsApp = async () => {
    if (!draftResult || !draftResult.draftText.trim()) return;
    setIsSendingWhatsApp(true);
    setWhatsAppStatus(null);

    const cleanPhone = cleanWhatsAppPhone(draftResult.recipientPhone);
    if (!cleanPhone) {
      setWhatsAppStatus({
        type: 'error',
        text: 'يرجى إدخال رقم هاتف صحيح في خانة الهاتف قبل الإرسال عبر واتساب.',
      });
      setIsSendingWhatsApp(false);
      return;
    }

    try {
      const token = api.getToken();
      await safeFetchJson('/api/v1/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-company-id': companyId,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          recipientPhone: cleanPhone,
          phone: cleanPhone,
          recipientName: draftResult.entityName,
          customer_name: draftResult.entityName,
          messageText: draftResult.draftText,
          message: draftResult.draftText,
          messageType: messageType,
          moduleCategory: draftResult.moduleCategory,
          relatedEntityId: selectedEntityId,
        }),
      });
    } catch (err) {
      console.warn('WhatsApp log fallback warning:', err);
    } finally {
      window.open(
        'https://wa.me/' + cleanPhone + '?text=' + encodeURIComponent(draftResult.draftText),
        '_blank'
      );
      setWhatsAppStatus({
        type: 'success',
        text: `تم توثيق الرسالة في مركز واتساب التجاري وفتح محادثة واتساب مع (${cleanPhone}) بنجاح.`,
      });
      setIsSendingWhatsApp(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getCategoryIcon = (cat: ModuleCategory) => {
    switch (cat) {
      case 'CUSTOMER':
        return <Users className="w-4 h-4 text-emerald-400" />;
      case 'SUPPLIER':
        return <Truck className="w-4 h-4 text-blue-400" />;
      case 'INVOICE':
        return <FileText className="w-4 h-4 text-teal-400" />;
      case 'VOUCHER':
        return <Receipt className="w-4 h-4 text-amber-400" />;
      case 'EMPLOYEE':
        return <UserCheck className="w-4 h-4 text-indigo-400" />;
      case 'SALES_REP':
        return <Briefcase className="w-4 h-4 text-cyan-400" />;
      case 'LOW_STOCK':
        return <PackageMinus className="w-4 h-4 text-rose-400" />;
    }
  };

  return (
    <div className="space-y-6 text-right text-slate-100 font-sans" dir="rtl">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-emerald-900/50 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Bot className="w-5 h-5 text-emerald-400" />
            <span>المساعد الذكي للأعمال (AI Business Assistant)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            تحليل مالي فوري مرتبط بجميع قوائم النظام، ومراسل أعمال شامل لصياغة وإرسال رسائل الواتساب الرسمية
          </p>
        </div>

        {/* Sub-tab navigation pill */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl text-xs font-medium border border-slate-800">
          <button
            onClick={() => setActiveSubTab('chat')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'chat'
                ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-950/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            المحادثة والمسودات
          </button>
          <button
            onClick={() => setActiveSubTab('insights')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'insights'
                ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-950/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            الرؤى والتحليلات الذكية
          </button>
          <button
            onClick={() => setActiveSubTab('messaging')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'messaging'
                ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-950/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            مراسل المطالبات والواتساب
          </button>
        </div>
      </div>

      {activeSubTab === 'chat' && (
        <div className="space-y-4">
          {/* Quick Prompts Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 text-xs">
            <span className="text-slate-400 font-medium shrink-0">استعلامات سريعة:</span>
            {QUICK_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSend(undefined, prompt)}
                className="px-3 py-1.5 bg-slate-900 border border-slate-700 hover:border-emerald-600 hover:bg-slate-800 text-slate-300 rounded-full transition-all shrink-0 font-medium cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Chat Container */}
          <div className="bg-slate-900 border border-emerald-900/50 rounded-2xl p-4 h-[520px] flex flex-col justify-between shadow-xl">
            {/* Messages Display */}
            <div className="space-y-4 overflow-y-auto p-2">
              {messages.map((m) => (
                <div key={m.id} className="space-y-2">
                  <div className={`flex items-start gap-2.5 text-xs ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {m.sender === 'assistant' && (
                      <div className="p-1.5 bg-emerald-950 text-emerald-400 rounded-lg shrink-0 border border-emerald-800/80">
                        <Sparkles className="w-4 h-4" />
                      </div>
                    )}
                    <div
                      className={`p-3.5 rounded-2xl max-w-xl leading-relaxed whitespace-pre-wrap ${
                        m.sender === 'user'
                          ? 'bg-emerald-600 text-white font-medium rounded-tl-none shadow-md shadow-emerald-950/40'
                          : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tr-none'
                      }`}
                    >
                      {m.content}

                      {/* Render Executed Tool Badges */}
                      {m.toolCalls && m.toolCalls.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-wrap gap-1.5">
                          {m.toolCalls.map((tc, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono"
                            >
                              ✓ أداة: {tc.toolName}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {isSending && (
                <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium py-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جاري استشارة السجلات المحاسبية والتحليل الفوري...</span>
                </div>
              )}
            </div>

            {/* Proposed Action Confirmation Card overlay */}
            {confirmingAction && (
              <div className="m-2 p-4 bg-slate-950 border border-amber-600/60 rounded-xl text-xs space-y-3 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-amber-400 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                    <span>طلب تأكيد إجراء مالي (تأكيد بشري مطلوب)</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-mono font-bold">
                    PENDING HUMAN APPROVAL
                  </span>
                </div>

                <div className="p-3 bg-slate-900 rounded-lg border border-amber-900/50 text-slate-200 font-mono space-y-1">
                  <p><span className="text-slate-400">نوع الإجراء:</span> {confirmingAction.type}</p>
                  <p><span className="text-slate-400">البيانات:</span> {JSON.stringify(confirmingAction.data)}</p>
                </div>

                {confirmStatus && <p className="font-bold text-emerald-400">{confirmStatus}</p>}

                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setConfirmingAction(null)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleConfirmAction}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-950/50 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>تأكيد واعتماد الإجراء المالي</span>
                  </button>
                </div>
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleSend} className="flex gap-2 pt-3 border-t border-slate-800">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="اسأل المساعد الذكي عن السيولة، المبيعات، العملاء، الموردين، المخزون، أو المناديب..."
                className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <button
                type="submit"
                disabled={isSending}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-950/50 flex items-center gap-1.5 cursor-pointer"
              >
                <span>إرسال</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Smart Insights Subtab */}
      {activeSubTab === 'insights' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              <span>الرؤى والتوصيات الذكية الشاملة (Fact / Calc / Interpretation / Recommendation)</span>
            </h3>
            <button
              onClick={fetchInsights}
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingInsights ? 'animate-spin' : ''}`} />
              <span>تحديث الرؤى</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map((insight) => (
              <div key={insight.id} className="p-4 rounded-2xl bg-slate-900 border border-emerald-900/40 shadow-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                      insight.category === 'FACT'
                        ? 'bg-blue-950 text-blue-300 border border-blue-800'
                        : insight.category === 'CALCULATION'
                        ? 'bg-purple-950 text-purple-300 border border-purple-800'
                        : insight.category === 'INTERPRETATION'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}
                  >
                    {insight.category}
                  </span>
                  <span
                    className={`text-[10px] font-bold ${
                      insight.impact === 'HIGH' ? 'text-rose-400' : 'text-slate-400'
                    }`}
                  >
                    أهمية {insight.impact}
                  </span>
                </div>

                <h4 className="text-xs font-bold text-white">{insight.title}</h4>
                <p className="text-xs text-slate-300 leading-relaxed">{insight.description}</p>

                {insight.actionableStep && (
                  <div className="pt-2 border-t border-slate-800 text-xs font-semibold text-emerald-400 flex items-center gap-1">
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                    <span>التوصية التنفيذية: {insight.actionableStep}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comprehensive Multi-Module Business Messaging Subtab */}
      {activeSubTab === 'messaging' && (
        <div className="bg-slate-900 border border-emerald-900/50 rounded-2xl p-5 space-y-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-emerald-400" />
                <span>مراسل الأعمال الشامل لكل القوائم ومركز واتساب</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                صياغة وإرسال رسائل رسمية مرتبطة مباشرة بالعملاء، الموردين، الفواتير، السندات، الموظفين، المناديب، ونواقص المخزون
              </p>
            </div>
            <button
              onClick={loadAllErpCollections}
              className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-700 text-emerald-400 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCollections ? 'animate-spin' : ''}`} />
              <span>تحديث القوائم</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* 1. Module Category */}
            <div>
              <label className="flex items-center gap-1.5 text-slate-300 font-semibold mb-1.5">
                {getCategoryIcon(selectedCategory)}
                <span>1. اختر القائمة / القسم المرتبط</span>
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  const nextCat = e.target.value as ModuleCategory;
                  setSelectedCategory(nextCat);
                  setDraftResult(null);
                  setWhatsAppStatus(null);
                }}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors"
              >
                {MODULE_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Target Party / Document */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                2. اختر الطرف أو المستند المستهدف ({currentEntities.length})
              </label>
              <select
                value={selectedEntityId}
                onChange={(e) => {
                  setSelectedEntityId(e.target.value);
                  setDraftResult(null);
                  setWhatsAppStatus(null);
                }}
                disabled={currentEntities.length === 0}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-60"
              >
                {currentEntities.length === 0 ? (
                  <option value="">لا توجد سجلات مسجلة في هذا القسم حالياً</option>
                ) : (
                  currentEntities.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* 3. Dynamic Smart Message Type */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                3. نوع الرسالة الذكية
              </label>
              <select
                value={messageType}
                onChange={(e) => {
                  setMessageType(e.target.value);
                  setDraftResult(null);
                }}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors"
              >
                {(MESSAGE_TYPES_BY_CATEGORY[selectedCategory] || []).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Draft Trigger Button */}
            <div className="flex items-end">
              <button
                onClick={handleGenerateDraftMessage}
                disabled={isDrafting || !selectedEntityId}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                {isDrafting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>صياغة الرسالة الذكية</span>
              </button>
            </div>
          </div>

          {draftResult && (
            <div className="p-4 bg-slate-950 border border-emerald-900/50 rounded-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-white">
                    صياغة الرسالة المهنية لـ: {draftResult.entityName}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-slate-400 flex items-center gap-1 shrink-0">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>رقم الواتساب:</span>
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={draftResult.recipientPhone}
                    onChange={(e) =>
                      setDraftResult({ ...draftResult, recipientPhone: e.target.value })
                    }
                    placeholder="مثال: 771234567 أو 967771234567"
                    className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs w-48 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1.5">
                  نص الرسالة (يمكنك التعديل المباشر قبل الإرسال):
                </label>
                <textarea
                  rows={7}
                  value={draftResult.draftText}
                  onChange={(e) =>
                    setDraftResult({ ...draftResult, draftText: e.target.value })
                  }
                  className="w-full p-3.5 bg-slate-900 rounded-xl border border-slate-800 text-xs text-slate-100 font-sans leading-relaxed focus:outline-none focus:border-emerald-500 resize-y"
                />
              </div>

              {whatsAppStatus && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    whatsAppStatus.type === 'success'
                      ? 'bg-emerald-950/70 border border-emerald-700 text-emerald-300'
                      : 'bg-rose-950/70 border border-rose-700 text-rose-300'
                  }`}
                >
                  {whatsAppStatus.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{whatsAppStatus.text}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
                <button
                  onClick={() => copyToClipboard(draftResult.draftText)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-900/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copied ? 'تم النسخ!' : 'نسخ الرسالة'}</span>
                </button>

                <button
                  onClick={handleSendViaWhatsApp}
                  disabled={isSendingWhatsApp}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-950/50 cursor-pointer transition-all"
                >
                  {isSendingWhatsApp ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <MessageCircle className="w-4 h-4" />
                  )}
                  <span>إرسال مباشر عبر واتساب</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
