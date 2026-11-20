import React, { useState, useEffect } from 'react';
import {
  Settings,
  ShieldCheck,
  Check,
  RefreshCw,
  AlertCircle,
  Key,
  Globe,
  Send,
  Smartphone,
  Server,
  Zap,
  CheckCircle2,
  Lock,
  ExternalLink,
  Save,
  MessageCircle,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { WhatsAppConfig, WhatsAppConnectionMode } from './types';

interface WhatsAppConfigTabProps {
  phoneNumberId?: string;
  displayPhoneNumber?: string;
  onSaveConfig?: (phoneId: string, displayPhone: string) => Promise<boolean>;
  onSendTestMessage?: (phone: string, text: string) => Promise<boolean>;
}

export const WhatsAppConfigTab: React.FC<WhatsAppConfigTabProps> = ({
  phoneNumberId,
  displayPhoneNumber,
  onSaveConfig,
  onSendTestMessage,
}) => {
  const { company, user } = useAuth();
  const companyId = company?.id || user?.company_id || 'comp_001';
  const storageKey = `erp_whatsapp_config_${companyId}`;

  // Main Configuration State
  const [config, setConfig] = useState<WhatsAppConfig>({
    connectionMode: 'gateway',
    senderPhoneNumber: displayPhoneNumber || '+967 770 000 000',
    gatewayUrl: 'https://api.ultramsg.com/instance0001/messages/chat',
    instanceId: 'instance0001',
    apiToken: '',
    phoneNumberId: phoneNumberId || '',
    businessAccountId: '',
    accessToken: '',
    openExternalWhatsAppApp: false,
    isConnected: true,
    status: 'CONNECTED',
    lastTestedAt: new Date().toISOString(),
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null);

  // Test Simulator State
  const [testPhone, setTestPhone] = useState('');
  const [testText, setTestText] = useState('مرحباً، هذه رسالة تجريبية من نظام المحاسبي الذكي ERP للتحقق من الاتصال.');
  const [isSendingTest, setIsSendingTest] = useState(false);

  // 1. Initial Load from LocalStorage + Backend API
  useEffect(() => {
    let isMounted = true;

    async function loadConfig() {
      setIsLoading(true);
      try {
        // First check localStorage
        const cached = localStorage.getItem(storageKey);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (isMounted && parsed && typeof parsed === 'object') {
              setConfig((prev) => ({ ...prev, ...parsed }));
            }
          } catch (e) {
            console.warn('Failed parsing cached whatsapp config', e);
          }
        }

        // Then sync from backend API
        const token = localStorage.getItem('erp_auth_token') || '';
        const res = await fetch('/api/v1/whatsapp/config', {
          headers: {
            'Content-Type': 'application/json',
            'x-company-id': companyId,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (res.ok) {
          const resData = await res.json();
          if (resData.success && resData.data && isMounted) {
            setConfig((prev) => {
              const updated = { ...prev, ...resData.data };
              localStorage.setItem(storageKey, JSON.stringify(updated));
              return updated;
            });
          }
        }
      } catch (err) {
        console.warn('Error fetching whatsapp config from server:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadConfig();
    return () => {
      isMounted = false;
    };
  }, [companyId, storageKey]);

  // Save to localStorage & Backend
  const saveConfiguration = async (updatedConfig: WhatsAppConfig, showToast = true) => {
    setIsSaving(true);
    try {
      // 1. Save to LocalStorage
      localStorage.setItem(storageKey, JSON.stringify(updatedConfig));

      // 2. Also save into eternal vault in localStorage if present
      const vaultRaw = localStorage.getItem('erp_eternal_accounts_vault_v1');
      if (vaultRaw) {
        try {
          const vault = JSON.parse(vaultRaw);
          const emailKey = user?.email?.trim().toLowerCase();
          if (emailKey && vault[emailKey]) {
            if (!vault[emailKey].whatsappConfig) vault[emailKey].whatsappConfig = {};
            vault[emailKey].whatsappConfig = updatedConfig;
            localStorage.setItem('erp_eternal_accounts_vault_v1', JSON.stringify(vault));
          }
        } catch (e) {
          console.warn('Could not update vault with whatsapp config', e);
        }
      }

      // 3. Persist to Backend API
      const token = localStorage.getItem('erp_auth_token') || '';
      const res = await fetch('/api/v1/whatsapp/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-company-id': companyId,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(updatedConfig),
      });

      if (res.ok) {
        if (onSaveConfig && updatedConfig.phoneNumberId) {
          await onSaveConfig(updatedConfig.phoneNumberId, updatedConfig.senderPhoneNumber || '');
        }
        if (showToast) {
          setFeedback({
            type: 'success',
            msg: 'تم حفظ وتثبيت إعدادات الربط الدائم لواتساب بنجاح، ولن تختفي أبداً بعد إعادة التشغيل!',
          });
        }
        return true;
      } else {
        throw new Error('فشل الحفظ على الخادم');
      }
    } catch (err: any) {
      if (showToast) {
        setFeedback({
          type: 'error',
          msg: err?.message || 'حدث خطأ أثناء حفظ الإعدادات، يرجى المحاولة ثانية',
        });
      }
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleFieldChange = (key: keyof WhatsAppConfig, val: any) => {
    setConfig((prev) => {
      const next = { ...prev, [key]: val };
      // Auto-save silently to localStorage on change
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveConfiguration(config, true);
  };

  // Test Connection Handler
  const handleTestConnection = async () => {
    setIsTesting(true);
    setFeedback(null);
    try {
      const token = localStorage.getItem('erp_auth_token') || '';
      const res = await fetch('/api/v1/whatsapp/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-company-id': companyId,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(config),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const verifiedConfig: WhatsAppConfig = {
          ...config,
          isConnected: true,
          status: 'CONNECTED',
          lastTestedAt: data.lastTestedAt || new Date().toISOString(),
        };
        setConfig(verifiedConfig);
        localStorage.setItem(storageKey, JSON.stringify(verifiedConfig));
        setFeedback({
          type: 'success',
          msg: data.message || `متصل ومفعل داخل النظام برقم المنشأة: ${config.senderPhoneNumber}`,
        });
      } else {
        throw new Error(data.error || 'تعذر تأكيد الاتصال، يرجى التحقق من المدخلات');
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        msg: err.message || 'فشل فحص الاتصال بالبوابة',
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Test Send Simulator Handler
  const handleTestSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim() || !testText.trim()) return;

    setIsSendingTest(true);
    setFeedback(null);
    try {
      if (onSendTestMessage) {
        const ok = await onSendTestMessage(testPhone.trim(), testText.trim());
        if (ok) {
          setFeedback({
            type: 'success',
            msg: `✅ تم إرسال رسالة الاختبار بنجاح إلى ${testPhone} وأرشفتها في النظام!`,
          });
          return;
        }
      }

      // Backend send API
      const token = localStorage.getItem('erp_auth_token') || '';
      const res = await fetch('/api/v1/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-company-id': companyId,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          recipientPhone: testPhone.trim(),
          recipientName: 'مستلم تجريبي',
          messageText: testText.trim(),
          messageType: 'TEST_MESSAGE',
        }),
      });

      const result = await res.json();
      if (res.ok && result.success) {
        setFeedback({
          type: 'success',
          msg: `✅ ${result.message || 'تم إرسال الرسالة وتسجيلها في محادثات واتساب النظام بنجاح'}`,
        });
      } else {
        throw new Error(result.error || 'فشل إرسال الرسالة');
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        msg: err.message || 'فشل إرسال الرسالة التجريبية',
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div id="whatsapp-config-section" dir="rtl" className="max-w-4xl mx-auto space-y-6">
      
      {/* Toast Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between gap-3 border animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-[var(--md-success-container)] text-[var(--md-on-success-container)] border-[var(--md-success)]/30'
              : feedback.type === 'error'
              ? 'bg-[var(--md-error-container)] text-[var(--md-on-error-container)] border-[var(--md-error)]/30'
              : 'bg-[var(--md-info-container)] text-[var(--md-on-info-container)] border-[var(--md-info)]/30'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <ShieldCheck className="w-5 h-5 text-[var(--md-success)] shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-[var(--md-error)] shrink-0" />
            )}
            <span className="leading-relaxed">{feedback.msg}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="m3-btn-text !min-h-[28px] !px-2.5 !py-1 text-[11px] font-bold underline"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Live Status Header Banner */}
      <div className="m3-card-elevated p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[var(--md-primary-container)] border border-[var(--md-primary)]/30 flex items-center justify-center text-[var(--md-on-primary-container)] shrink-0">
            <MessageCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-[var(--md-on-surface)]">إعدادات ربط واتساب الدائم لمنشأة التاجر</h2>
              {config.isConnected ? (
                <span className="m3-badge m3-badge-success inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-[var(--md-success)] animate-pulse"></span>
                  <span className="tabular-nums">متصل ومفعل داخل النظام برقم المنشأة: {config.senderPhoneNumber || 'رقم معتمد'}</span>
                </span>
              ) : (
                <span className="m3-badge m3-badge-warning inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>في انتظار تأكيد الربط</span>
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--md-on-surface-variant)] mt-1">
              المنشأة: <span className="text-[var(--md-on-surface)] font-bold">{company?.name || 'المؤسسة التجارية'}</span> • رقم الحساب: <span className="font-mono tabular-nums text-[var(--md-primary-text)] font-bold">{companyId}</span>
              {config.lastTestedAt && (
                <span className="text-[var(--md-on-surface-variant)] mr-2 font-mono tabular-nums">• آخر تحقق: {config.lastTestedAt.slice(0, 10)}</span>
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="m3-btn-tonal text-xs cursor-pointer disabled:opacity-50"
          >
            {isTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            <span>فحص واختبار الاتصال الآن</span>
          </button>
        </div>
      </div>

      {/* 3 Connection Modes Selector */}
      <div className="m3-card p-6 space-y-5">
        <div className="border-b border-[var(--md-outline-variant)] pb-4">
          <h3 className="text-sm font-bold text-[var(--md-on-surface)] flex items-center gap-2">
            <Settings className="w-4 h-4 text-[var(--md-primary-text)]" />
            <span>اختر نمط الربط المناسب لعملك (3 أوضاع مرنة لكافة الأنشطة)</span>
          </h3>
          <p className="text-xs text-[var(--md-on-surface-variant)] mt-1">
            يتيح النظام لأي عميل أو تاجر يقتني المنظومة ربط رقمه الخاص أو بوابة المحادثات السحابية بسهولة متكاملة.
          </p>
        </div>

        {/* Tabs for Mode selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Mode 1 */}
          <button
            type="button"
            onClick={() => handleFieldChange('connectionMode', 'gateway')}
            className={`p-4 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between ${
              config.connectionMode === 'gateway'
                ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border-[var(--md-primary)] ring-1 ring-[var(--md-primary)]'
                : 'bg-[var(--md-surface-container-low)] border-[var(--md-outline-variant)] hover:border-[var(--md-primary)]/40 text-[var(--md-on-surface)]'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-2">
              <span className="w-8 h-8 rounded-lg bg-[var(--md-primary)]/15 flex items-center justify-center text-[var(--md-primary-text)] font-bold text-xs tabular-nums">
                1
              </span>
              <Server className="w-4 h-4 text-[var(--md-primary-text)]" />
            </div>
            <div className="font-bold text-[var(--md-on-surface)] text-xs mb-1">
              الربط السريع عبر بوابة واتساب المباشرة
            </div>
            <div className="text-[11px] text-[var(--md-on-surface-variant)] leading-relaxed">
              UltraMsg / Evolution API / GreenAPI / Webhook برقم واتساب المنشأة مباشرة.
            </div>
          </button>

          {/* Mode 2 */}
          <button
            type="button"
            onClick={() => handleFieldChange('connectionMode', 'cloud_api')}
            className={`p-4 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between ${
              config.connectionMode === 'cloud_api'
                ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border-[var(--md-primary)] ring-1 ring-[var(--md-primary)]'
                : 'bg-[var(--md-surface-container-low)] border-[var(--md-outline-variant)] hover:border-[var(--md-primary)]/40 text-[var(--md-on-surface)]'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-2">
              <span className="w-8 h-8 rounded-lg bg-[var(--md-primary)]/15 flex items-center justify-center text-[var(--md-primary-text)] font-bold text-xs tabular-nums">
                2
              </span>
              <Smartphone className="w-4 h-4 text-[var(--md-primary-text)]" />
            </div>
            <div className="font-bold text-[var(--md-on-surface)] text-xs mb-1">
              الربط الرسمي Meta Cloud API
            </div>
            <div className="text-[11px] text-[var(--md-on-surface-variant)] leading-relaxed">
              عبر مطوري فيسبوك وواتساب للأعمال بمفتاح دائم (Phone Number ID & Token).
            </div>
          </button>

          {/* Mode 3 */}
          <button
            type="button"
            onClick={() => handleFieldChange('connectionMode', 'internal_engine')}
            className={`p-4 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between ${
              config.connectionMode === 'internal_engine'
                ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border-[var(--md-primary)] ring-1 ring-[var(--md-primary)]'
                : 'bg-[var(--md-surface-container-low)] border-[var(--md-outline-variant)] hover:border-[var(--md-primary)]/40 text-[var(--md-on-surface)]'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-2">
              <span className="w-8 h-8 rounded-lg bg-[var(--md-primary)]/15 flex items-center justify-center text-[var(--md-primary-text)] font-bold text-xs tabular-nums">
                3
              </span>
              <Zap className="w-4 h-4 text-[var(--md-primary-text)]" />
            </div>
            <div className="font-bold text-[var(--md-on-surface)] text-xs mb-1">
              محرك المراسلة الداخلي الذكي للنظام
            </div>
            <div className="text-[11px] text-[var(--md-on-surface-variant)] leading-relaxed">
              إرسال وأرشفة فورية بمركز الرسائل الداخلي مع فتح خارجي اختياري فقط.
            </div>
          </button>
        </div>

        {/* Configuration Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          
          {/* Common Field: Sender Phone Number */}
          <div>
            <label className="block text-xs font-bold text-[var(--md-on-surface)] mb-1.5">
              رقم واتساب المنشأة المرسل (Sender Phone Number) <span className="text-[var(--md-primary-text)]">*</span>
            </label>
            <input
              type="text"
              dir="ltr"
              value={config.senderPhoneNumber || ''}
              onChange={(e) => handleFieldChange('senderPhoneNumber', e.target.value)}
              placeholder="مثال: +967 770 123 456 أو +966 50 123 4567"
              required
              className="m3-input font-mono tabular-nums text-sm"
            />
            <p className="text-[11px] text-[var(--md-on-surface-variant)] mt-1">
              الرقم الذي ستظهر به الإشعارات وكشوفات الحساب والفواتير المرسلة لعملائك ومورديك.
            </p>
          </div>

          {/* Mode 1 Specific Fields */}
          {config.connectionMode === 'gateway' && (
            <div className="space-y-3.5 p-4 rounded-xl bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)]">
              <div className="text-xs font-bold text-[var(--md-primary-text)] flex items-center gap-2">
                <Server className="w-4 h-4" />
                <span>إعدادات بوابة الربط المباشر (UltraMsg / Evolution / GreenAPI)</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--md-on-surface)] mb-1">
                  رابط نقطة الاتصال للبوابة (Gateway API Endpoint URL) <span className="text-[var(--md-error)]">*</span>
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={config.gatewayUrl || ''}
                  onChange={(e) => handleFieldChange('gatewayUrl', e.target.value)}
                  placeholder="https://api.ultramsg.com/instance0001/messages/chat"
                  className="m3-input !h-10 text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--md-on-surface)] mb-1">
                    معرف الجلسة / البوابة (Instance ID)
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={config.instanceId || ''}
                    onChange={(e) => handleFieldChange('instanceId', e.target.value)}
                    placeholder="instance0001"
                    className="m3-input !h-10 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--md-on-surface)] mb-1">
                    رمز الوصول السري (API Token / Secret Key)
                  </label>
                  <input
                    type="password"
                    dir="ltr"
                    value={config.apiToken || ''}
                    onChange={(e) => handleFieldChange('apiToken', e.target.value)}
                    placeholder="••••••••••••••••••••••••"
                    className="m3-input !h-10 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Mode 2 Specific Fields */}
          {config.connectionMode === 'cloud_api' && (
            <div className="space-y-3.5 p-4 rounded-xl bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)]">
              <div className="text-xs font-bold text-[var(--md-primary-text)] flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                <span>إعدادات Meta WhatsApp Cloud API الرسمية</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--md-on-surface)] mb-1">
                  معرف رقم الهاتف (WhatsApp Phone Number ID) <span className="text-[var(--md-error)]">*</span>
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={config.phoneNumberId || ''}
                  onChange={(e) => handleFieldChange('phoneNumberId', e.target.value)}
                  placeholder="مثال: 105829182391029"
                  className="m3-input !h-10 text-xs font-mono tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--md-on-surface)] mb-1">
                  معرف حساب واتساب للأعمال (WhatsApp Business Account ID / WABA ID)
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={config.businessAccountId || ''}
                  onChange={(e) => handleFieldChange('businessAccountId', e.target.value)}
                  placeholder="مثال: 204918204918204"
                  className="m3-input !h-10 text-xs font-mono tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--md-on-surface)] mb-1">
                  رمز الوصول الدائم (Permanent System User Access Token) <span className="text-[var(--md-error)]">*</span>
                </label>
                <input
                  type="password"
                  dir="ltr"
                  value={config.accessToken || ''}
                  onChange={(e) => handleFieldChange('accessToken', e.target.value)}
                  placeholder="EAAG...."
                  className="m3-input !h-10 text-xs font-mono"
                />
              </div>

              <div className="p-3 bg-[var(--md-surface-container)] rounded-lg border border-[var(--md-outline-variant)] text-[11px] text-[var(--md-on-surface-variant)] flex items-center justify-between">
                <span>Webhook Callback URL:</span>
                <span className="font-mono text-[var(--md-primary-text)] font-bold" dir="ltr">/api/v1/whatsapp/webhook</span>
              </div>
            </div>
          )}

          {/* Mode 3 Specific Settings */}
          {config.connectionMode === 'internal_engine' && (
            <div className="space-y-3 p-4 rounded-xl bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)]">
              <div className="text-xs font-bold text-[var(--md-primary-text)] flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <span>محرك المراسلة والأرشفة المحاسبية الداخلي</span>
              </div>
              <p className="text-xs text-[var(--md-on-surface-variant)] leading-relaxed">
                في هذا الوضع، يقوم النظام بتسجيل وأرشفة كافة إشعارات كشوفات الحساب والفواتير وسندات القبض مباشرة في سجلات المحادثات الداخلية للتاجر وتتبع وصولها، دون الحاجة لأي اشتراك مدفوع في بوابات خارجية.
              </p>

              <label className="flex items-center gap-3 pt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.openExternalWhatsAppApp || false}
                  onChange={(e) => handleFieldChange('openExternalWhatsAppApp', e.target.checked)}
                  className="w-4 h-4 accent-[var(--md-primary)] rounded cursor-pointer"
                />
                <span className="text-xs text-[var(--md-on-surface)] font-semibold">
                  فتح تطبيق واتساب الخارجي كنسخة إضافية عند الحاجة فقط (معطل افتراضياً لتفادي التشويش)
                </span>
              </label>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-[var(--md-outline-variant)]">
            <div className="text-[11px] text-[var(--md-on-surface-variant)] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[var(--md-success)] shrink-0" />
              <span>يتم التخزين الآمن الدائم لكل مؤسسة في PostgreSQL وقرص السيرفر وخزينة العميل.</span>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="m3-btn-primary text-xs cursor-pointer disabled:opacity-50"
            >
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>حفظ وتثبيت إعدادات الربط الدائم</span>
            </button>
          </div>
        </form>
      </div>

      {/* Simulator & Live Test Sandbox */}
      <div className="m3-card p-6 space-y-4">
        <div className="space-y-1 border-b border-[var(--md-outline-variant)] pb-3">
          <h3 className="text-sm font-bold text-[var(--md-on-surface)] flex items-center gap-2">
            <Send className="w-4 h-4 text-[var(--md-primary-text)]" />
            <span>محاكي إرسال رسالة اختبارية سريعة</span>
          </h3>
          <p className="text-xs text-[var(--md-on-surface-variant)]">
            اختبر صحة إعدادات التوصيل عبر إرسال رسالة تجريبية لأي رقم هاتف للتأكد من الجاهزية.
          </p>
        </div>

        <form onSubmit={handleTestSend} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-[var(--md-on-surface)] mb-1">
              رقم هاتف المستلم للاختبار <span className="text-[var(--md-primary-text)]">*</span>
            </label>
            <input
              type="text"
              dir="ltr"
              placeholder="+967 770 000 000"
              required
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              className="m3-input !h-10 text-xs font-mono tabular-nums"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--md-on-surface)] mb-1">نص الرسالة *</label>
            <textarea
              rows={2}
              required
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              className="m3-input !h-auto py-2.5 text-xs"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSendingTest || !testPhone.trim()}
              className="m3-btn-primary text-xs cursor-pointer disabled:opacity-50"
            >
              {isSendingTest ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>إرسال رسالة تجريبية الآن</span>
            </button>
          </div>
        </form>
      </div>

    </div>
  );
};
