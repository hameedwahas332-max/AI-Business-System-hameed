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
import { executeLocalWipeDemoData } from '../../services/localDesktopApiFallback';

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
      try {
        await executeLocalWipeDemoData();
      } catch (localErr) {
        console.warn('Local wipe fallback warning:', localErr);
      }

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
          'erp_journal_entries_v1',
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
        localStorage.setItem('erp_journal_entries_v1', '[]');
        localStorage.setItem('erp_custom_ledger_entries', '[]');
        localStorage.setItem('erp_sales_reps_v1', '[]');
        localStorage.setItem('erp_sales_reps', '[]');

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
    <div className="space-y-6 text-[var(--md-on-surface)]" dir="rtl">
      {/* Header Banner */}
      <div className="m3-card-elevated p-6 sm:p-8 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-[var(--md-primary-container)] border border-[var(--md-primary)]/20 flex items-center justify-center text-[var(--md-on-primary-container)] shrink-0">
                <Heart className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--md-on-surface)]">نجاح العملاء وتجربة المستخدم (Customer Success & TTFV)</h1>
                <p className="text-sm text-[var(--md-on-surface-variant)]">
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
              className="m3-btn-outlined text-sm cursor-pointer"
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
          className={`p-4 rounded-xl text-sm font-medium flex items-center gap-3 border ${
            feedback.type === 'success'
              ? 'bg-[var(--md-success-container)] text-[var(--md-on-success-container)] border-[var(--md-success)]/30'
              : 'bg-[var(--md-error-container)] text-[var(--md-on-error-container)] border-[var(--md-error)]/30'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-[var(--md-success)] shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-[var(--md-error)] shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* SubTab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-[var(--md-outline-variant)] pb-3">
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
              className={`text-sm cursor-pointer ${
                isActive ? 'm3-btn-primary' : 'm3-btn-outlined'
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
          <div className="m3-card p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-[var(--md-on-surface)] flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[var(--md-primary-text)]" />
                  قائمة خطوات التهيئة السريعة (Time-To-First-Value Checklist)
                </h3>
                <p className="text-sm text-[var(--md-on-surface-variant)] mt-1">
                  أكمل هذه الخطوات للحصول على القيمة القصوى وبدء دورة الأعمال المحاسبية المتكاملة
                </p>
              </div>
              <div className="m3-badge m3-badge-primary px-4 py-2 text-sm font-semibold flex items-center gap-2 tabular-nums">
                <Clock className="w-4 h-4" />
                نسبة الإنجاز: {onboardingData?.checklist?.progressPercent ?? 0}%
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-[var(--md-surface-container-highest)] h-3 rounded-full overflow-hidden mb-6">
              <div
                className="bg-[var(--md-primary)] h-full transition-all duration-500"
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
                        ? 'bg-[var(--md-success-container)]/50 border-[var(--md-success)]/30'
                        : isSkipped
                        ? 'bg-[var(--md-surface-container-low)] border-[var(--md-outline-variant)] opacity-75'
                        : 'bg-[var(--md-surface-container-low)] border-[var(--md-outline-variant)] hover:border-[var(--md-primary)]/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 tabular-nums ${
                          isDone
                            ? 'bg-[var(--md-success)] text-white'
                            : isSkipped
                            ? 'bg-[var(--md-surface-container-highest)] text-[var(--md-on-surface-variant)]'
                            : 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border border-[var(--md-primary)]/30'
                        }`}
                      >
                        {isDone ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                      </div>
                      <div>
                        <h4 className={`font-semibold text-sm ${isDone ? 'text-[var(--md-on-success-container)] line-through' : 'text-[var(--md-on-surface)]'}`}>
                          {step.title || step.step_name || step.id}
                        </h4>
                        <p className="text-xs text-[var(--md-on-surface-variant)] mt-0.5">{step.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {!isDone && (
                        <>
                          <button
                            onClick={() => handleCompleteStep(step.id || step.step_key)}
                            className="m3-btn-primary !min-h-[32px] !px-3 !py-1.5 text-xs cursor-pointer"
                          >
                            تعليم كمكتمل
                          </button>
                          {!isSkipped && (
                            <button
                              onClick={() => handleSkipStep(step.id || step.step_key)}
                              className="m3-btn-outlined !min-h-[32px] !px-3 !py-1.5 text-xs cursor-pointer"
                            >
                              تخطي
                            </button>
                          )}
                        </>
                      )}
                      {isDone && (
                        <span className="m3-badge m3-badge-success text-xs px-2.5 py-1 flex items-center gap-1">
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
          <div className="m3-card p-6">
            <h3 className="text-lg font-bold text-[var(--md-on-surface)] mb-2 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[var(--md-primary-text)]" />
              دعوة عضو جديد لفريق العمل (Team Member Invitation)
            </h3>
            <p className="text-sm text-[var(--md-on-surface-variant)] mb-6">
              أرسل رابط دعوة آمن للانضمام لشركتك مع تحديد الصلاحيات الإدارية والمحاسبية المناسبة
            </p>

            <form onSubmit={handleCreateInvitation} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
              <div className="sm:col-span-6">
                <label className="block text-xs font-semibold text-[var(--md-on-surface-variant)] mb-1.5">البريد الإلكتروني للعضو</label>
                <input
                  type="email"
                  required
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="m3-input text-sm"
                />
              </div>

              <div className="sm:col-span-3 flex items-center gap-2 h-11">
                <input
                  type="checkbox"
                  id="adminCheckbox"
                  checked={inviteIsAdmin}
                  onChange={(e) => setInviteIsAdmin(e.target.checked)}
                  className="w-4 h-4 accent-[var(--md-primary)] rounded border-[var(--md-outline)]"
                />
                <label htmlFor="adminCheckbox" className="text-xs font-semibold text-[var(--md-on-surface)] cursor-pointer">
                  منح صلاحيات مدير شركة (Admin)
                </label>
              </div>

              <div className="sm:col-span-3">
                <button
                  type="submit"
                  className="m3-btn-primary w-full text-sm cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  إرسال الدعوة
                </button>
              </div>
            </form>
          </div>

          {/* Invitations Table */}
          <div className="m3-card p-6">
            <h3 className="text-lg font-bold text-[var(--md-on-surface)] mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5 text-[var(--md-primary-text)]" />
              سجل الدعوات المرسلة
            </h3>

            {invitations.length === 0 ? (
              <div className="text-center py-10 text-[var(--md-on-surface-variant)]">
                <UserCheck className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">لا توجد دعوات معلقة حالياً</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-[var(--md-outline-variant)] rounded-xl">
                <table className="m3-table text-right text-sm" dir="rtl">
                  <thead className="m3-thead">
                    <tr>
                      <th className="m3-th">البريد الإلكتروني</th>
                      <th className="m3-th">الصلاحية</th>
                      <th className="m3-th">الحالة</th>
                      <th className="m3-th">تاريخ الإرسال</th>
                      <th className="m3-th text-left">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--md-outline-variant)]">
                    {invitations.map((inv) => (
                      <tr key={inv.id} className="hover:bg-[var(--md-surface-container-low)] transition-colors">
                        <td className="py-3 px-4 font-medium text-[var(--md-on-surface)]">{inv.email}</td>
                        <td className="py-3 px-4">
                          <span className={`m3-badge text-xs ${inv.is_company_admin ? 'm3-badge-secondary' : 'm3-badge-info'}`}>
                            {inv.is_company_admin ? 'مدير شركة' : 'عضو فريق'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`m3-badge text-xs ${
                            inv.status === 'ACCEPTED' ? 'm3-badge-success' :
                            inv.status === 'PENDING' ? 'm3-badge-warning' :
                            'm3-badge-secondary'
                          }`}>
                            {inv.status === 'ACCEPTED' ? 'تم القبول' : inv.status === 'PENDING' ? 'قيد الانتظار' : inv.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[var(--md-on-surface-variant)] text-xs font-mono tabular-nums">{new Date(inv.created_at).toLocaleDateString('ar-SA')}</td>
                        <td className="py-3 px-4 text-left space-x-2 space-x-reverse">
                          {inv.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleResendInvitation(inv.id)}
                                className="m3-btn-tonal !min-h-[30px] !px-2.5 !py-1 text-xs cursor-pointer"
                              >
                                إعادة إرسال
                              </button>
                              <button
                                onClick={() => handleRevokeInvitation(inv.id)}
                                className="m3-btn-danger !min-h-[30px] !px-2.5 !py-1 text-xs cursor-pointer"
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
            <div className="m3-card p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="m3-badge m3-badge-primary text-xs">درجة النشاط</span>
                <Zap className="w-5 h-5 text-[var(--md-warning)]" />
              </div>
              <h4 className="text-2xl font-extrabold text-[var(--md-on-surface)] font-mono tabular-nums">
                {activationStatus?.score ?? 92} / 100
              </h4>
              <p className="text-xs text-[var(--md-on-surface-variant)] mt-1">حالة نشاط الحساب ومؤشر استخدام الميزات الأساسية</p>
            </div>

            <div className="m3-card p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="m3-badge m3-badge-success text-xs">الوقت للقيمة الأولى</span>
                <Clock className="w-5 h-5 text-[var(--md-primary-text)]" />
              </div>
              <h4 className="text-2xl font-extrabold text-[var(--md-on-surface)] font-mono tabular-nums">
                {activationStatus?.timeToValueMinutes ?? '4.2'} دقيقة
              </h4>
              <p className="text-xs text-[var(--md-on-surface-variant)] mt-1">الزمن المستغرق لإصدار أول فاتورة وتسجيل العمليات</p>
            </div>

            <div className="m3-card p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="m3-badge m3-badge-info text-xs">درجة الصحة</span>
                <Heart className="w-5 h-5 text-[var(--md-success)]" />
              </div>
              <h4 className="text-2xl font-extrabold text-[var(--md-on-surface)]">
                {activationStatus?.healthStatus ?? 'ممتاز (Healthy)'}
              </h4>
              <p className="text-xs text-[var(--md-on-surface-variant)] mt-1">معدل التفاعل الدوري واستقرار العمليات</p>
            </div>
          </div>

          <div className="m3-card p-6">
            <h3 className="text-lg font-bold text-[var(--md-on-surface)] mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[var(--md-primary-text)]" />
              مؤشرات الاعتماد والتفاعل للميزات (Feature Adoption Milestones)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { title: 'الفواتير الإلكترونية ZATCA', count: '100% نشط', desc: 'متطابق مع المرحلة الثانية للربط' },
                { title: 'الذكاء الاصطناعي والمساعد', count: 'مفعل', desc: 'استفسارات التحليل المالي' },
                { title: 'الفحص الضوئي OCR', count: 'مفعل', desc: 'مسح فواتير المشتريات تلقائياً' },
                { title: 'التنبيهات والواتساب', count: 'متصل', desc: 'إرسال السندات والإشعارات' }
              ].map((item, i) => (
                <div key={i} className="p-4 rounded-xl bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)]">
                  <h4 className="font-semibold text-sm text-[var(--md-on-surface)]">{item.title}</h4>
                  <div className="text-[var(--md-success)] text-sm font-bold mt-1">{item.count}</div>
                  <p className="text-xs text-[var(--md-on-surface-variant)] mt-1">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SAMPLE DATA SANDBOX */}
      {activeSubTab === 'sample_data' && (
        <div className="space-y-6">
          <div className="m3-card p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--md-outline-variant)] pb-4">
              <div>
                <h3 className="text-lg font-bold text-[var(--md-on-surface)] flex items-center gap-2">
                  <Database className="w-5 h-5 text-[var(--md-primary-text)]" />
                  مركز التحكم بالبيانات التجريبية (Sandbox) وتصفير النظام للعمل الحقيقي
                </h3>
                <p className="text-sm text-[var(--md-on-surface-variant)] mt-1">
                  التحكم الكامل بين وضع العمل الفعلي ببيانات نظيفة ومصفرة 100%، وبين وضع الاستعراض وتجربة ميزات النظام.
                </p>
              </div>

              <div>
                {typeof window !== 'undefined' && localStorage.getItem('erp_clean_production_mode_v1') === 'true' ? (
                  <span className="m3-badge m3-badge-success px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[var(--md-success)] animate-pulse" />
                    وضع العمل الفعلي النظيف مفعل (0 بيانات تجريبية)
                  </span>
                ) : (
                  <span className="m3-badge m3-badge-warning px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[var(--md-warning)]" />
                    البيانات التجريبية (Sandbox) مفعلة حالياً للعرض
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[var(--md-surface-container-low)] p-4 rounded-xl border border-[var(--md-outline-variant)]">
                <div className="flex items-center gap-2 text-[var(--md-error)] font-bold text-xs mb-2">
                  <Trash2 className="w-4 h-4" />
                  ما يتم حذفه وتصفيره عند تفعيل العمل الفعلي:
                </div>
                <ul className="text-xs text-[var(--md-on-surface-variant)] space-y-1.5 list-disc list-inside">
                  <li>كافة فواتير المبيعات ونقاط البيع التجريبية ومحطات الوقود</li>
                  <li>جميع فواتير المشتريات وسندات القبض والصرف النموذجية</li>
                  <li>قوائم العملاء والموردين والأصناف الافتراضية التجريبية</li>
                  <li>سجلات المخازن والجرد ودفتر الأستاذ العام وسجل المحادثات</li>
                </ul>
              </div>

              <div className="bg-[var(--md-surface-container-low)] p-4 rounded-xl border border-[var(--md-outline-variant)]">
                <div className="flex items-center gap-2 text-[var(--md-success)] font-bold text-xs mb-2">
                  <ShieldCheck className="w-4 h-4" />
                  ما يتم الحفاظ عليه وثباته دائماً وبأمان تام:
                </div>
                <ul className="text-xs text-[var(--md-on-surface-variant)] space-y-1.5 list-disc list-inside">
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
                className="m3-btn-danger px-6 py-3 text-sm cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                حذف كافة البيانات التجريبية من جميع القوائم والواجهات (بدء العمل الفعلي)
              </button>

              <button
                onClick={handleSeedSampleData}
                disabled={loading}
                className="m3-btn-outlined px-5 py-3 text-sm cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[var(--md-warning)]" />
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
            <div className="m3-card p-6">
              <h3 className="text-lg font-bold text-[var(--md-on-surface)] mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-[var(--md-primary-text)]" />
                فتح تذكرة دعم فني جديدة
              </h3>
              <form onSubmit={handleCreateTicket} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--md-on-surface-variant)] mb-1">عنوان التذكرة / المشكلة</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: استفسار حول الربط مع منصة فاتورة"
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    className="m3-input text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--md-on-surface-variant)] mb-1">الأولوية</label>
                  <select
                    value={ticketPriority}
                    onChange={(e: any) => setTicketPriority(e.target.value)}
                    className="m3-select text-sm"
                  >
                    <option value="LOW">منخفضة (Low)</option>
                    <option value="MEDIUM">متوسطة (Medium)</option>
                    <option value="HIGH">عالية (High)</option>
                    <option value="URGENT">حرجة جداً (Urgent)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--md-on-surface-variant)] mb-1">تفاصيل الاستفسار أو الدعم المطلوب</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="اشرح المشكلة أو السؤال بالتفصيل لمساعدتك في أسرع وقت..."
                    value={ticketDescription}
                    onChange={(e) => setTicketDescription(e.target.value)}
                    className="m3-input !h-auto py-2.5 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="m3-btn-primary w-full text-sm cursor-pointer"
                >
                  إرسال التذكرة
                </button>
              </form>
            </div>

            {/* List */}
            <div className="m3-card p-6">
              <h4 className="font-bold text-[var(--md-on-surface)] mb-3 text-sm">تذاكر الدعم السابقة</h4>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {tickets.length === 0 ? (
                  <p className="text-xs text-[var(--md-on-surface-variant)] text-center py-4">لا توجد تذاكر مسجلة</p>
                ) : (
                  tickets.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => handleSelectTicket(t)}
                      className={`p-3 rounded-xl border cursor-pointer transition ${
                        selectedTicket?.id === t.id
                          ? 'border-[var(--md-primary)] bg-[var(--md-primary-container)]/50'
                          : 'border-[var(--md-outline-variant)] bg-[var(--md-surface-container-low)] hover:bg-[var(--md-surface-container-high)]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h5 className="font-semibold text-xs text-[var(--md-on-surface)] truncate">{t.subject}</h5>
                        <span
                          className={`m3-badge text-[10px] ${
                            t.status === 'RESOLVED' ? 'm3-badge-success' : 'm3-badge-warning'
                          }`}
                        >
                          {t.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--md-on-surface-variant)] mt-1 line-clamp-1">{t.description}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Ticket Details & Thread */}
          <div className="lg:col-span-7">
            <div className="m3-card p-6 h-full flex flex-col justify-between">
              {selectedTicket ? (
                <div>
                  <div className="border-b border-[var(--md-outline-variant)] pb-4 mb-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-base font-bold text-[var(--md-on-surface)]">{selectedTicket.subject}</h3>
                      <span className="m3-badge m3-badge-primary text-xs">
                        {selectedTicket.priority}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--md-on-surface-variant)] mt-1">{selectedTicket.description}</p>
                  </div>

                  {/* Message Thread */}
                  <div className="space-y-3 mb-6 max-h-80 overflow-y-auto pr-1">
                    {(selectedTicket.responses || []).map((resp: any, i: number) => (
                      <div
                        key={i}
                        className={`p-3.5 rounded-xl text-xs border ${
                          resp.is_staff
                            ? 'bg-[var(--md-primary-container)] border-[var(--md-primary)]/30 mr-4 text-[var(--md-on-primary-container)]'
                            : 'bg-[var(--md-surface-container-high)] border-[var(--md-outline-variant)] ml-4 text-[var(--md-on-surface)]'
                        }`}
                      >
                        <div className="font-bold mb-1 flex items-center justify-between">
                          <span>{resp.is_staff ? 'فريق نجاح العملاء' : 'أنت'}</span>
                          <span className="text-[10px] opacity-75 font-mono tabular-nums font-normal">
                            {new Date(resp.created_at || Date.now()).toLocaleTimeString('ar-SA')}
                          </span>
                        </div>
                        <p className="leading-relaxed">{resp.message}</p>
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
                      className="m3-input flex-1 text-sm"
                    />
                    <button
                      type="submit"
                      className="m3-btn-primary text-sm cursor-pointer shrink-0"
                    >
                      إرسال الرد
                    </button>
                  </form>
                </div>
              ) : (
                <div className="text-center py-20 text-[var(--md-on-surface-variant)]">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
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
          <div className="m3-card p-6">
            <h3 className="text-lg font-bold text-[var(--md-on-surface)] mb-2 flex items-center gap-2">
              <Award className="w-5 h-5 text-[var(--md-primary-text)]" />
              برنامج العملاء المميزين والوصول المبكر (Pilot Program)
            </h3>
            <p className="text-sm text-[var(--md-on-surface-variant)] mb-6">
              بصفتك شريكاً استراتيجياً، يمكنك تجربة الميزات التجريبية ومشاركتنا رأيك لتحسين تجربة النظام.
            </p>

            <form onSubmit={handleSubmitFeedback} className="space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-semibold text-[var(--md-on-surface-variant)] mb-1.5">تقييمك لتجربة النظام (NPS Rating)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setFeedbackRating(star)}
                      className={`p-2 rounded-xl border transition cursor-pointer ${
                        feedbackRating >= star
                          ? 'bg-[var(--md-warning-container)] border-[var(--md-warning)] text-[var(--md-warning)]'
                          : 'bg-[var(--md-surface-container-low)] border-[var(--md-outline-variant)] text-[var(--md-on-surface-variant)]'
                      }`}
                    >
                      <Star className="w-6 h-6 fill-current" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--md-on-surface-variant)] mb-1.5">مجال الملاحظة</label>
                <select
                  value={feedbackCategory}
                  onChange={(e) => setFeedbackCategory(e.target.value)}
                  className="m3-select text-sm"
                >
                  <option value="USABILITY">سهولة الاستخدام وسرعة الواجهة</option>
                  <option value="ZATCA_COMPLIANCE">التوافق الضريبي وفواتير ZATCA</option>
                  <option value="REPORTING">دقة التقارير والقوائم المالية</option>
                  <option value="FEATURE_REQUEST">اقتراح ميزة إضافية</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--md-on-surface-variant)] mb-1.5">ملاحظاتك ومقترحاتك</label>
                <textarea
                  rows={4}
                  required
                  placeholder="ما الذي يعجبك في النظام؟ وما الذي يمكننا تحسينه لمساعدتك أكثر؟"
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  className="m3-input !h-auto py-2.5 text-sm"
                />
              </div>

              <button
                type="submit"
                className="m3-btn-primary px-6 text-sm cursor-pointer"
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
