import React, { useState, useEffect } from 'react';
import { safeFetchJson } from '../../lib/safeFetch';
import {
  Heart,
  CheckCircle2,
  Clock,
  Sparkles,
  UserPlus,
  Mail,
  Send,
  Database,
  Trash2,
  Activity,
  AlertTriangle,
  MessageSquare,
  Star,
  Award,
  RefreshCw,
  HelpCircle,
  TrendingUp,
  ShieldCheck,
  ChevronRight,
  Plus,
  FileText,
  UserCheck,
  Zap,
  Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

type SubTab = 'onboarding' | 'invitations' | 'health_activation' | 'sample_data' | 'support_tickets' | 'pilot_program';

interface ChecklistStep {
  id: string;
  step_key?: string;
  step_name?: string;
  title?: string;
  description: string;
  status: 'PENDING' | 'COMPLETED' | 'SKIPPED';
  completed_at?: string;
}

interface TeamInvitation {
  id: string;
  email: string;
  role_ids?: string[];
  is_company_admin?: boolean;
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';
  token?: string;
  created_at: string;
  expires_at?: string;
}

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  created_at: string;
  responses?: Array<{
    id: string;
    user_id: string;
    message: string;
    is_staff: boolean;
    created_at: string;
  }>;
}

interface PilotFeedback {
  id: string;
  rating: number;
  category: string;
  comment: string;
  created_at: string;
}

export const CustomerSuccessTab: React.FC = () => {
  const { token, user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('onboarding');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 1. Onboarding State
  const [onboardingData, setOnboardingData] = useState<{
    lifecycle?: any;
    checklist?: { steps?: ChecklistStep[]; completedCount?: number; totalCount?: number; progressPercent?: number };
    entitlements?: any;
  } | null>(null);

  // 2. Invitations State
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteIsAdmin, setInviteIsAdmin] = useState(false);

  // 3. Activation & Health State
  const [activationStatus, setActivationStatus] = useState<any>(null);
  const [healthDistribution, setHealthDistribution] = useState<any>(null);

  // 4. Sample Data State
  const [sampleDataStatus, setSampleDataStatus] = useState<{ isSeeded?: boolean; message?: string } | null>(null);

  // 5. Support Tickets State
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketPriority, setTicketPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [ticketResponseMsg, setTicketResponseMsg] = useState('');

  // 6. Pilot Program State
  const [pilotInfo, setPilotInfo] = useState<any>(null);
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackCategory, setFeedbackCategory] = useState<string>('USABILITY');
  const [feedbackComment, setFeedbackComment] = useState<string>('');
  const [pilotFeedbacks, setPilotFeedbacks] = useState<PilotFeedback[]>([]);

  const authHeaders = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  // Load active tab data
  useEffect(() => {
    if (activeSubTab === 'onboarding') fetchOnboardingStatus();
    if (activeSubTab === 'invitations') fetchInvitations();
    if (activeSubTab === 'health_activation') fetchHealthAndActivation();
    if (activeSubTab === 'support_tickets') fetchTickets();
    if (activeSubTab === 'pilot_program') fetchPilotData();
  }, [activeSubTab]);

  // API Call: Fetch Onboarding Status
  const fetchOnboardingStatus = async () => {
    setLoading(true);
    try {
      const res = await safeFetchJson('/api/v1/saas/onboarding/status', { headers: authHeaders });
      if (res.ok && res.data?.success) {
        setOnboardingData({
          lifecycle: res.data.lifecycle,
          checklist: res.data.checklist,
          entitlements: res.data.entitlements
        });
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // API Call: Complete Step
  const handleCompleteStep = async (stepId: string) => {
    try {
      const res = await safeFetchJson(`/api/v1/saas/onboarding/steps/${stepId}/complete`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ metadata: { completed_via_ui: true, timestamp: new Date().toISOString() } })
      });
      if (res.ok && res.data?.success) {
        showNotification('success', 'تم تحديث حالة الخطوة بنجاح');
        fetchOnboardingStatus();
      } else {
        showNotification('error', res.error || res.data?.error || 'فشل إكمال الخطوة');
      }
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  // API Call: Skip Step
  const handleSkipStep = async (stepId: string) => {
    try {
      const res = await safeFetchJson(`/api/v1/saas/onboarding/steps/${stepId}/skip`, {
        method: 'POST',
        headers: authHeaders
      });
      if (res.ok && res.data?.success) {
        showNotification('success', 'تم تخطي الخطوة');
        fetchOnboardingStatus();
      } else {
        showNotification('error', res.error || res.data?.error || 'فشل تخطي الخطوة');
      }
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  // API Call: Invitations
  const fetchInvitations = async () => {
    setLoading(true);
    try {
      const res = await safeFetchJson('/api/v1/saas/invitations', { headers: authHeaders });
      if (res.ok && res.data?.success) {
        setInvitations(res.data.invitations || []);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    try {
      const res = await safeFetchJson('/api/v1/saas/invitations', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ email: inviteEmail, isCompanyAdmin: inviteIsAdmin, roleIds: [] })
      });
      if (res.ok && res.data?.success) {
        showNotification('success', 'تم إرسال دعوة الانضمام بنجاح');
        setInviteEmail('');
        fetchInvitations();
      } else {
        showNotification('error', res.error || res.data?.error || 'فشل إرسال الدعوة');
      }
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  const handleResendInvitation = async (id: string) => {
    try {
      const res = await safeFetchJson(`/api/v1/saas/invitations/${id}/resend`, { method: 'POST', headers: authHeaders });
      if (res.ok && res.data?.success) {
        showNotification('success', 'تمت إعادة إرسال الدعوة');
      } else {
        showNotification('error', res.error || res.data?.error || 'فشل إعادة الإرسال');
      }
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  const handleRevokeInvitation = async (id: string) => {
    try {
      const res = await safeFetchJson(`/api/v1/saas/invitations/${id}/revoke`, { method: 'POST', headers: authHeaders });
      if (res.ok && res.data?.success) {
        showNotification('success', 'تم إلغاء الدعوة بنجاح');
        fetchInvitations();
      } else {
        showNotification('error', res.error || res.data?.error || 'فشل إلغاء الدعوة');
      }
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  // API Call: Health & Activation
  const fetchHealthAndActivation = async () => {
    setLoading(true);
    try {
      const [actRes, healthRes] = await Promise.all([
        safeFetchJson('/api/v1/saas/activation/status', { headers: authHeaders }),
        safeFetchJson('/api/v1/saas/admin/saas/health', { headers: authHeaders })
      ]);
      if (actRes.ok && actRes.data?.success) setActivationStatus(actRes.data.activation);
      if (healthRes.ok && healthRes.data?.success) setHealthDistribution(healthRes.data.health);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // API Call: Sample Data
  const handleSeedSampleData = async () => {
    setLoading(true);
    try {
      const res = await safeFetchJson('/api/v1/sandbox/seed-demo-data', { method: 'POST', headers: authHeaders });
      if (res.ok && res.data?.success) {
        localStorage.setItem('erp_clean_production_mode_v1', 'false');
        localStorage.removeItem('erp_sample_data_cleaned');
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new Event('erp-demo-data-wiped'));
        showNotification('success', 'تم غرس بيانات Sandbox التجريبية بنجاح (عملاء، منتجات، فواتير نموذجية)');
        setSampleDataStatus({ isSeeded: true, message: 'البيانات التجريبية نشطة' });
        setTimeout(() => {
          window.location.reload();
        }, 800);
      } else {
        showNotification('error', res.error || res.data?.error || 'فشل غرس البيانات التجريبية');
      }
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCleanupSampleData = async () => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف وتصفير البيانات التجريبية (Sandbox) لبدء تشغيل النظام ببياناتك الحقيقية الفعلية؟ لن يتم حذف حسابك أو اسم المنشأة أو إعدادات الربط أو أسعار الصرف.')) return;
    setLoading(true);
    try {
      const res = await safeFetchJson('/api/v1/system/wipe-demo-data', { method: 'POST', headers: authHeaders });
      if (res.ok && res.data?.success) {
        // Clear cached demo localStorage items
        const sampleStorageKeys = [
          'erp_fuel_tanks_v1',
          'erp_fuel_meter_records_v1',
          'erp_fuel_tanks_state',
          'erp_fuel_daily_records',
          'erp_pos_held_sales',
          'erp_pos_held_v1',
          'erp_pos_shift_history',
          'erp_pos_shift_history_v1',
          'erp_custom_ledger_entries',
          'erp_sales_reps_v1',
          'erp_battery_warranty_records',
          'erp_tire_dot_records',
        ];
        sampleStorageKeys.forEach((key) => {
          try {
            localStorage.removeItem(key);
          } catch {
            // ignore
          }
        });
        localStorage.setItem('erp_clean_production_mode_v1', 'true');
        localStorage.setItem('erp_sample_data_cleaned', 'true');

        // Update eternal accounts vault snapshot with clean arrays while strictly preserving user and company
        try {
          const vaultRaw = localStorage.getItem('erp_eternal_accounts_vault_v1');
          if (vaultRaw) {
            const vault = JSON.parse(vaultRaw);
            if (vault && vault.dataSnapshot) {
              vault.dataSnapshot.products = [];
              vault.dataSnapshot.customers = [];
              vault.dataSnapshot.suppliers = [];
              vault.dataSnapshot.invoices = [];
              vault.dataSnapshot.purchaseInvoices = [];
              vault.dataSnapshot.payments = [];
              vault.dataSnapshot.accountTransactions = [];
              vault.dataSnapshot.employees = [];
              vault.dataSnapshot.expenses = [];
              vault.cleanProductionMode = true;
              localStorage.setItem('erp_eternal_accounts_vault_v1', JSON.stringify(vault));
            }
          }
        } catch (e) {
          // ignore
        }

        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('erp:data-cleared'));
        window.dispatchEvent(new Event('erp-demo-data-wiped'));

        showNotification('success', 'تم حذف وتصفير جميع البيانات التجريبية بنجاح! أصبح النظام الآن جاهزاً ونظيفاً تماماً لبدء إدخال بياناتك الواقعية.');
        setSampleDataStatus({ isSeeded: false, message: 'تم تنظيف وتصفير البيانات التجريبية' });

        // Reload to let all open tabs and state refresh immediately
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        showNotification('error', res.error || res.data?.error || 'فشل تنظيف البيانات');
      }
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // API Call: Support Tickets
  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await safeFetchJson('/api/v1/saas/support/tickets', { headers: authHeaders });
      if (res.ok && res.data?.success) {
        setTickets(res.data.tickets || []);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject || !ticketDescription) return;
    try {
      const res = await safeFetchJson('/api/v1/saas/support/tickets', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          subject: ticketSubject,
          description: ticketDescription,
          priority: ticketPriority
        })
      });
      if (res.ok && res.data?.success) {
        showNotification('success', 'تم فتح تذكرة الدعم بنجاح وتوجيهها لفريق نجاح العملاء');
        setTicketSubject('');
        setTicketDescription('');
        fetchTickets();
      } else {
        showNotification('error', res.error || res.data?.error || 'فشل إنشاء تذكرة الدعم');
      }
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  const handleSelectTicket = async (ticket: SupportTicket) => {
    try {
      const res = await safeFetchJson(`/api/v1/saas/support/tickets/${ticket.id}`, { headers: authHeaders });
      if (res.ok && res.data?.success) {
        setSelectedTicket(res.data.ticket);
      } else {
        setSelectedTicket(ticket);
      }
    } catch (err) {
      setSelectedTicket(ticket);
    }
  };

  const handleAddResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !ticketResponseMsg) return;
    try {
      const res = await safeFetchJson(`/api/v1/saas/support/tickets/${selectedTicket.id}/responses`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ message: ticketResponseMsg, isStaff: false })
      });
      if (res.ok && res.data?.success) {
        showNotification('success', 'تم إرسال الرد بنجاح');
        setTicketResponseMsg('');
        handleSelectTicket(selectedTicket);
        fetchTickets();
      } else {
        showNotification('error', res.error || res.data?.error || 'فشل إرسال الرد');
      }
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  // API Call: Pilot Program
  const fetchPilotData = async () => {
    setLoading(true);
    try {
      const [infoRes, feedbackRes] = await Promise.all([
        safeFetchJson('/api/v1/saas/pilot/info', { headers: authHeaders }),
        safeFetchJson('/api/v1/saas/pilot/feedback', { headers: authHeaders })
      ]);
      if (infoRes.ok && infoRes.data?.success) setPilotInfo(infoRes.data.pilot);
      if (feedbackRes.ok && feedbackRes.data?.success) setPilotFeedbacks(feedbackRes.data.feedback || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackComment) return;
    try {
      const res = await safeFetchJson('/api/v1/saas/pilot/feedback', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          rating: feedbackRating,
          category: feedbackCategory,
          comment: feedbackComment
        })
      });
      if (res.ok && res.data?.success) {
        showNotification('success', 'شكراً لك! تم استلام تقييمك وملاحظاتك القيمة بنجاح.');
        setFeedbackComment('');
        fetchPilotData();
      } else {
        showNotification('error', res.error || res.data?.error || 'فشل إرسال التقييم');
      }
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-emerald-900/50 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-emerald-950 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
                <Heart className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">نجاح العملاء وتجربة المستخدم (Customer Success & TTFV)</h1>
                <p className="text-sm text-slate-400">
                  إدارة رحلة التهيئة، تسريع الوصول للقيمة الأولى، دعم الفريق، ومراقبة مؤشرات الرضا والاحتفاظ
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (activeSubTab === 'onboarding') fetchOnboardingStatus();
                if (activeSubTab === 'invitations') fetchInvitations();
                if (activeSubTab === 'health_activation') fetchHealthAndActivation();
                if (activeSubTab === 'support_tickets') fetchTickets();
                if (activeSubTab === 'pilot_program') fetchPilotData();
              }}
              disabled={loading}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-emerald-700 rounded-xl text-sm font-medium transition flex items-center gap-2 cursor-pointer text-emerald-400"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              تحديث البيانات
            </button>
          </div>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-sm font-medium flex items-center gap-3 border shadow-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
              : 'bg-rose-950 text-rose-300 border-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* SubTab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'onboarding', label: 'دليل التهيئة والخطوات (Checklist)', icon: CheckCircle2 },
          { id: 'invitations', label: 'دعوات فريق العمل (Invitations)', icon: UserPlus },
          { id: 'health_activation', label: 'مؤشرات التفعيل والرضا (Health & TTFV)', icon: Activity },
          { id: 'sample_data', label: 'بيانات Sandbox التجريبية', icon: Database },
          { id: 'support_tickets', label: 'مركز التذاكر والدعم الفني', icon: MessageSquare },
          { id: 'pilot_program', label: 'برنامج العملاء المميزين (Pilot)', icon: Award },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as SubTab)}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800 hover:border-emerald-900/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: ONBOARDING CHECKLIST */}
      {activeSubTab === 'onboarding' && (
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-2xl p-6 border border-emerald-900/50 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  قائمة خطوات التهيئة السريعة (Time-To-First-Value Checklist)
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  أكمل هذه الخطوات للحصول على القيمة القصوى وبدء دورة الأعمال المحاسبية المتكاملة
                </p>
              </div>
              <div className="bg-emerald-950/80 border border-emerald-800/80 rounded-xl px-4 py-2 text-emerald-300 text-sm font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                نسبة الإنجاز: {onboardingData?.checklist?.progressPercent ?? 0}%
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden mb-6">
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{ width: `${onboardingData?.checklist?.progressPercent ?? 0}%` }}
              />
            </div>

            {/* Checklist Items */}
            <div className="space-y-3">
              {(onboardingData?.checklist?.steps || [
                { id: '1', title: 'إعداد الملف التجاري والضريبي للشركة', description: 'تأكيد بيانات السجل التجاري ورقم تسجيل ضريبة القيمة المضافة', status: 'COMPLETED' },
                { id: '2', title: 'إضافة أول عميل أو حساب تجاري', description: 'تسجيل بطاقة عميل لربطه بفواتير المبيعات والتحصيلات', status: 'COMPLETED' },
                { id: '3', title: 'إضافة منتجات أو خدمات إلى المخزون', description: 'تعريف عناصر الدليل مع أسعار البيع وتكلفة الشراء', status: 'PENDING' },
                { id: '4', title: 'إصدار أول فاتورة مبيعات إلكترونية معتمدة', description: 'تجربة إصدار فاتورة ضريبية متوافقة مع متطلبات الهيئة ZATCA', status: 'PENDING' },
                { id: '5', title: 'دعوة أحد أفراد الفريق المحاسبي', description: 'إضافة محاسب أو مدير مبيعات مع صلاحيات مخصصة', status: 'PENDING' }
              ]).map((step: any, idx: number) => {
                const isDone = step.status === 'COMPLETED';
                const isSkipped = step.status === 'SKIPPED';
                return (
                  <div
                    key={step.id || idx}
                    className={`p-4 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isDone
                        ? 'bg-emerald-950/40 border-emerald-800/50'
                        : isSkipped
                        ? 'bg-slate-950 border-slate-800 text-slate-500'
                        : 'bg-slate-950 border-slate-800 hover:border-emerald-800/80'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                          isDone
                            ? 'bg-emerald-500 text-white'
                            : isSkipped
                            ? 'bg-slate-800 text-slate-400'
                            : 'bg-slate-800 text-emerald-400 border border-emerald-800'
                        }`}
                      >
                        {isDone ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                      </div>
                      <div>
                        <h4 className={`font-semibold text-sm ${isDone ? 'text-emerald-300 line-through' : 'text-slate-200'}`}>
                          {step.title || step.step_name || step.id}
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">{step.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {!isDone && (
                        <>
                          <button
                            onClick={() => handleCompleteStep(step.id || step.step_key)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer"
                          >
                            تعليم كمكتمل
                          </button>
                          {!isSkipped && (
                            <button
                              onClick={() => handleSkipStep(step.id || step.step_key)}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition cursor-pointer"
                            >
                              تخطي
                            </button>
                          )}
                        </>
                      )}
                      {isDone && (
                        <span className="text-xs font-semibold text-emerald-300 bg-emerald-950/90 border border-emerald-800 px-2.5 py-1 rounded-md flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          مكتمل
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INVITATIONS */}
      {activeSubTab === 'invitations' && (
        <div className="space-y-6">
          {/* Invite Box */}
          <div className="bg-slate-900 rounded-2xl p-6 border border-emerald-900/50 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-400" />
              دعوة عضو جديد لفريق العمل (Team Member Invitation)
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              أرسل رابط دعوة آمن للانضمام لشركتك مع تحديد الصلاحيات الإدارية والمحاسبية المناسبة
            </p>

            <form onSubmit={handleCreateInvitation} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
              <div className="sm:col-span-6">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">البريد الإلكتروني للعضو</label>
                <input
                  type="email"
                  required
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="sm:col-span-3 flex items-center gap-2 h-11">
                <input
                  type="checkbox"
                  id="adminCheckbox"
                  checked={inviteIsAdmin}
                  onChange={(e) => setInviteIsAdmin(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-700 bg-slate-950 focus:ring-emerald-500"
                />
                <label htmlFor="adminCheckbox" className="text-xs font-semibold text-slate-300 cursor-pointer">
                  منح صلاحيات مدير شركة (Admin)
                </label>
              </div>

              <div className="sm:col-span-3">
                <button
                  type="submit"
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-950/50 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  إرسال الدعوة
                </button>
              </div>
            </form>
          </div>

          {/* Invitations Table */}
          <div className="bg-slate-900 rounded-2xl p-6 border border-emerald-900/50 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5 text-emerald-400" />
              سجل الدعوات المرسلة
            </h3>

            {invitations.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <UserCheck className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                <p className="text-sm">لا توجد دعوات معلقة حالياً</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">البريد الإلكتروني</th>
                      <th className="py-3 px-4">الصلاحية</th>
                      <th className="py-3 px-4">الحالة</th>
                      <th className="py-3 px-4">تاريخ الإرسال</th>
                      <th className="py-3 px-4 text-left">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {invitations.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-medium text-slate-200">{inv.email}</td>
                        <td className="py-3 px-4">
                          <span className={`text-xs px-2.5 py-1 rounded-md font-semibold ${inv.is_company_admin ? 'bg-purple-950 text-purple-300 border border-purple-800' : 'bg-slate-800 text-slate-300 border border-slate-700'}`}>
                            {inv.is_company_admin ? 'مدير شركة' : 'عضو فريق'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-xs px-2.5 py-1 rounded-md font-semibold ${
                            inv.status === 'ACCEPTED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                            inv.status === 'PENDING' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                            'bg-slate-800 text-slate-300'
                          }`}>
                            {inv.status === 'ACCEPTED' ? 'تم القبول' : inv.status === 'PENDING' ? 'قيد الانتظار' : inv.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-xs">{new Date(inv.created_at).toLocaleDateString('ar-SA')}</td>
                        <td className="py-3 px-4 text-left space-x-2 space-x-reverse">
                          {inv.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleResendInvitation(inv.id)}
                                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold px-2 py-1 bg-slate-800 border border-slate-700 rounded cursor-pointer"
                              >
                                إعادة إرسال
                              </button>
                              <button
                                onClick={() => handleRevokeInvitation(inv.id)}
                                className="text-xs text-rose-400 hover:text-rose-300 font-semibold px-2 py-1 bg-slate-800 border border-slate-700 rounded cursor-pointer"
                              >
                                إلغاء
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: HEALTH & ACTIVATION */}
      {activeSubTab === 'health_activation' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900 rounded-2xl p-6 border border-emerald-900/40 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2.5 py-1 rounded-lg">درجة النشاط</span>
                <Zap className="w-5 h-5 text-amber-400" />
              </div>
              <h4 className="text-2xl font-extrabold text-white">
                {activationStatus?.score ?? 92} / 100
              </h4>
              <p className="text-xs text-slate-400 mt-1">حالة نشاط الحساب ومؤشر استخدام الميزات الأساسية</p>
            </div>

            <div className="bg-slate-900 rounded-2xl p-6 border border-emerald-900/40 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2.5 py-1 rounded-lg">الوقت للقيمة الأولى</span>
                <Clock className="w-5 h-5 text-emerald-400" />
              </div>
              <h4 className="text-2xl font-extrabold text-white">
                {activationStatus?.timeToValueMinutes ?? '4.2'} دقيقة
              </h4>
              <p className="text-xs text-slate-400 mt-1">الزمن المستغرق لإصدار أول فاتورة وتسجيل العمليات</p>
            </div>

            <div className="bg-slate-900 rounded-2xl p-6 border border-emerald-900/40 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-teal-400 bg-teal-950/80 border border-teal-800/80 px-2.5 py-1 rounded-lg">درجة الصحة</span>
                <Heart className="w-5 h-5 text-emerald-400" />
              </div>
              <h4 className="text-2xl font-extrabold text-white">
                {activationStatus?.healthStatus ?? 'ممتاز (Healthy)'}
              </h4>
              <p className="text-xs text-slate-400 mt-1">معدل التفاعل الدوري واستقرار العمليات</p>
            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl p-6 border border-emerald-900/50 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              مؤشرات الاعتماد والتفاعل للميزات (Feature Adoption Milestones)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { title: 'الفواتير الإلكترونية ZATCA', count: '100% نشط', desc: 'متطابق مع المرحلة الثانية للربط' },
                { title: 'الذكاء الاصطناعي والمساعد', count: 'مفعل', desc: 'استفسارات التحليل المالي' },
                { title: 'الفحص الضوئي OCR', count: 'مفعل', desc: 'مسح فواتير المشتريات تلقائياً' },
                { title: 'التنبيهات والواتساب', count: 'متصل', desc: 'إرسال السندات والإشعارات' }
              ].map((item, i) => (
                <div key={i} className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <h4 className="font-semibold text-sm text-slate-200">{item.title}</h4>
                  <div className="text-emerald-400 text-sm font-bold mt-1">{item.count}</div>
                  <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SAMPLE DATA SANDBOX */}
      {activeSubTab === 'sample_data' && (
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-2xl p-6 border border-emerald-900/50 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-emerald-400" />
                  مركز التحكم بالبيانات التجريبية (Sandbox) وتصفير النظام للعمل الحقيقي
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  التحكم الكامل بين وضع العمل الفعلي ببيانات نظيفة ومصفرة 100%، وبين وضع الاستعراض وتجربة ميزات النظام.
                </p>
              </div>

              <div>
                {typeof window !== 'undefined' && localStorage.getItem('erp_clean_production_mode_v1') === 'true' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    وضع العمل الفعلي النظيف مفعل (0 بيانات تجريبية)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    البيانات التجريبية (Sandbox) مفعلة حالياً للعرض
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-xs mb-2">
                  <Trash2 className="w-4 h-4" />
                  ما يتم حذفه وتصفيره عند تفعيل العمل الفعلي:
                </div>
                <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                  <li>كافة فواتير المبيعات ونقاط البيع التجريبية ومحطات الوقود</li>
                  <li>جميع فواتير المشتريات وسندات القبض والصرف النموذجية</li>
                  <li>قوائم العملاء والموردين والأصناف الافتراضية التجريبية</li>
                  <li>سجلات المخازن والجرد ودفتر الأستاذ العام وسجل المحادثات</li>
                </ul>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs mb-2">
                  <ShieldCheck className="w-4 h-4" />
                  ما يتم الحفاظ عليه وثباته دائماً وبأمان تام:
                </div>
                <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                  <li>حسابك المسجل وكلمة المرور وصلاحيات المسؤول الدائمة</li>
                  <li>اسم المنشأة والشعار والبيانات الضريبية المعتمدة</li>
                  <li>إعدادات ربط واتساب وبوابات الإرسال ومفاتيح API الدائمة</li>
                  <li>إعدادات وحدات النظام وموديلات النشاط وأسعار الصرف</li>
                </ul>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={handleCleanupSampleData}
                disabled={loading}
                className="px-6 py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-rose-950/50 transition flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                حذف كافة البيانات التجريبية من جميع القوائم والواجهات (بدء العمل الفعلي)
              </button>

              <button
                onClick={handleSeedSampleData}
                disabled={loading}
                className="px-5 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-sm rounded-xl transition flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                تفعيل بيانات Sandbox التجريبية للعرض
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SUPPORT TICKETS */}
      {activeSubTab === 'support_tickets' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Create & List Tickets */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900 rounded-2xl p-6 border border-emerald-900/50 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                فتح تذكرة دعم فني جديدة
              </h3>
              <form onSubmit={handleCreateTicket} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">عنوان التذكرة / المشكلة</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: استفسار حول الربط مع منصة فاتورة"
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-950 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">الأولوية</label>
                  <select
                    value={ticketPriority}
                    onChange={(e: any) => setTicketPriority(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-950 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    <option value="LOW">منخفضة (Low)</option>
                    <option value="MEDIUM">متوسطة (Medium)</option>
                    <option value="HIGH">عالية (High)</option>
                    <option value="URGENT">حرجة جداً (Urgent)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">تفاصيل الاستفسار أو الدعم المطلوب</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="اشرح المشكلة أو السؤال بالتفصيل لمساعدتك في أسرع وقت..."
                    value={ticketDescription}
                    onChange={(e) => setTicketDescription(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-950 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-950/50 transition cursor-pointer"
                >
                  إرسال التذكرة
                </button>
              </form>
            </div>

            {/* List */}
            <div className="bg-slate-900 rounded-2xl p-6 border border-emerald-900/50 shadow-xl">
              <h4 className="font-bold text-white mb-3 text-sm">تذاكر الدعم السابقة</h4>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {tickets.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">لا توجد تذاكر مسجلة</p>
                ) : (
                  tickets.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => handleSelectTicket(t)}
                      className={`p-3 rounded-xl border cursor-pointer transition ${
                        selectedTicket?.id === t.id
                          ? 'border-emerald-500 bg-emerald-950/40'
                          : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h5 className="font-semibold text-xs text-slate-200 truncate">{t.subject}</h5>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            t.status === 'RESOLVED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}
                        >
                          {t.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{t.description}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Ticket Details & Thread */}
          <div className="lg:col-span-7">
            <div className="bg-slate-900 rounded-2xl p-6 border border-emerald-900/50 shadow-xl h-full flex flex-col justify-between">
              {selectedTicket ? (
                <div>
                  <div className="border-b border-slate-800 pb-4 mb-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-white">{selectedTicket.subject}</h3>
                      <span className="text-xs px-2.5 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">
                        {selectedTicket.priority}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{selectedTicket.description}</p>
                  </div>

                  {/* Message Thread */}
                  <div className="space-y-3 mb-6 max-h-80 overflow-y-auto pr-1">
                    {(selectedTicket.responses || []).map((resp: any, i: number) => (
                      <div
                        key={i}
                        className={`p-3.5 rounded-xl text-xs ${
                          resp.is_staff ? 'bg-emerald-950/40 border border-emerald-800 mr-4 text-emerald-200' : 'bg-slate-950 border border-slate-800 ml-4 text-slate-300'
                        }`}
                      >
                        <div className="font-bold text-slate-200 mb-1 flex items-center justify-between">
                          <span>{resp.is_staff ? 'فريق نجاح العملاء' : 'أنت'}</span>
                          <span className="text-[10px] text-slate-500 font-normal">
                            {new Date(resp.created_at || Date.now()).toLocaleTimeString('ar-SA')}
                          </span>
                        </div>
                        <p className="text-slate-200 leading-relaxed">{resp.message}</p>
                      </div>
                    ))}
                  </div>

                  {/* Reply Box */}
                  <form onSubmit={handleAddResponse} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="اكتب ردك هنا..."
                      value={ticketResponseMsg}
                      onChange={(e) => setTicketResponseMsg(e.target.value)}
                      className="flex-1 px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-950 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl transition cursor-pointer"
                    >
                      إرسال الرد
                    </button>
                  </form>
                </div>
              ) : (
                <div className="text-center py-20 text-slate-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 text-slate-600" />
                  <p className="text-sm">اختر تذكرة من القائمة لعرض المحادثة وتفاصيل المتابعة</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: PILOT PROGRAM */}
      {activeSubTab === 'pilot_program' && (
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-2xl p-6 border border-emerald-900/50 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-400" />
              برنامج العملاء المميزين والوصول المبكر (Pilot Program)
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              بصفتك شريكاً استراتيجياً، يمكنك تجربة الميزات التجريبية ومشاركتنا رأيك لتحسين تجربة النظام.
            </p>

            <form onSubmit={handleSubmitFeedback} className="space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">تقييمك لتجربة النظام (NPS Rating)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setFeedbackRating(star)}
                      className={`p-2 rounded-xl border transition cursor-pointer ${
                        feedbackRating >= star ? 'bg-amber-950/80 border-amber-600 text-amber-400' : 'bg-slate-950 border-slate-800 text-slate-600'
                      }`}
                    >
                      <Star className="w-6 h-6 fill-current" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">مجال الملاحظة</label>
                <select
                  value={feedbackCategory}
                  onChange={(e) => setFeedbackCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  <option value="USABILITY">سهولة الاستخدام وسرعة الواجهة</option>
                  <option value="ZATCA_COMPLIANCE">التوافق الضريبي وفواتير ZATCA</option>
                  <option value="REPORTING">دقة التقارير والقوائم المالية</option>
                  <option value="FEATURE_REQUEST">اقتراح ميزة إضافية</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">ملاحظاتك ومقترحاتك</label>
                <textarea
                  rows={4}
                  required
                  placeholder="ما الذي يعجبك في النظام؟ وما الذي يمكننا تحسينه لمساعدتك أكثر؟"
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-950/50 transition cursor-pointer"
              >
                إرسال الملاحظات
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
