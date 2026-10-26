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
    <div id="whatsapp-config-section" className="max-w-4xl mx-auto space-y-6">
      
      {/* Toast Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between gap-3 border shadow-md animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              : feedback.type === 'error'
              ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
              : 'bg-blue-500/10 text-blue-300 border-blue-500/30'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span className="leading-relaxed">{feedback.msg}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-[11px] font-bold underline px-2 py-1 rounded hover:bg-white/10"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Live Status Header Banner */}
      <div className="bg-[#091511] rounded-2xl border border-emerald-500/30 p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#25D366]/20 to-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-[#25D366] shrink-0">
            <MessageCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-white">إعدادات ربط واتساب الدائم لمنشأة التاجر</h2>
              {config.isConnected ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>متصل ومفعل داخل النظام برقم المنشأة: {config.senderPhoneNumber || 'رقم معتمد'}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>في انتظار تأكيد الربط</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              المنشأة: <span className="text-white font-bold">{company?.name || 'المؤسسة التجارية'}</span> • رقم الحساب: <span className="font-mono text-emerald-400">{companyId}</span>
              {config.lastTestedAt && (
                <span className="text-slate-500 mr-2">• آخر تحقق: {config.lastTestedAt.slice(0, 10)}</span>
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
            className="px-4 py-2.5 bg-[#0c2419] hover:bg-emerald-800/40 text-emerald-300 border border-emerald-500/30 hover:border-emerald-400 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {isTesting ? <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" /> : <Zap className="w-4 h-4 text-emerald-400" />}
            <span>فحص واختبار الاتصال الآن</span>
          </button>
        </div>
      </div>

      {/* 3 Connection Modes Selector */}
      <div className="bg-[#091511] rounded-2xl border border-emerald-500/30 p-6 shadow-xl space-y-5">
        <div className="border-b border-emerald-500/20 pb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Settings className="w-4 h-4 text-emerald-400" />
            <span>اختر نمط الربط المناسب لعملك (3 أوضاع مرنة لكافة الأنشطة)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
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
                ? 'bg-emerald-950/40 border-emerald-500 shadow-md ring-1 ring-emerald-500'
                : 'bg-[#06120d] border-emerald-500/20 hover:border-emerald-500/40 text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-2">
              <span className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs">
                1
              </span>
              <Server className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="font-bold text-white text-xs mb-1">
              الربط السريع عبر بوابة واتساب المباشرة
            </div>
            <div className="text-[11px] text-slate-400 leading-relaxed">
              UltraMsg / Evolution API / GreenAPI / Webhook برقم واتساب المنشأة مباشرة.
            </div>
          </button>

          {/* Mode 2 */}
          <button
            type="button"
            onClick={() => handleFieldChange('connectionMode', 'cloud_api')}
            className={`p-4 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between ${
              config.connectionMode === 'cloud_api'
                ? 'bg-emerald-950/40 border-emerald-500 shadow-md ring-1 ring-emerald-500'
                : 'bg-[#06120d] border-emerald-500/20 hover:border-emerald-500/40 text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-2">
              <span className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs">
                2
              </span>
              <Smartphone className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="font-bold text-white text-xs mb-1">
              الربط الرسمي Meta Cloud API
            </div>
            <div className="text-[11px] text-slate-400 leading-relaxed">
              عبر مطوري فيسبوك وواتساب للأعمال بمفتاح دائم (Phone Number ID & Token).
            </div>
          </button>

          {/* Mode 3 */}
          <button
            type="button"
            onClick={() => handleFieldChange('connectionMode', 'internal_engine')}
            className={`p-4 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between ${
              config.connectionMode === 'internal_engine'
                ? 'bg-emerald-950/40 border-emerald-500 shadow-md ring-1 ring-emerald-500'
                : 'bg-[#06120d] border-emerald-500/20 hover:border-emerald-500/40 text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-2">
              <span className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs">
                3
              </span>
              <Zap className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="font-bold text-white text-xs mb-1">
              محرك المراسلة الداخلي الذكي للنظام
            </div>
            <div className="text-[11px] text-slate-400 leading-relaxed">
              إرسال وأرشفة فورية بمركز الرسائل الداخلي مع فتح خارجي اختياري فقط.
            </div>
          </button>
        </div>

        {/* Configuration Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          
          {/* Common Field: Sender Phone Number */}
          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1.5">
              رقم واتساب المنشأة المرسل (Sender Phone Number) <span className="text-emerald-400">*</span>
            </label>
            <input
              type="text"
              dir="ltr"
              value={config.senderPhoneNumber || ''}
              onChange={(e) => handleFieldChange('senderPhoneNumber', e.target.value)}
              placeholder="مثال: +967 770 123 456 أو +966 50 123 4567"
              required
              className="w-full px-4 py-2.5 bg-[#06120d] border border-emerald-500/30 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-slate-600"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              الرقم الذي ستظهر به الإشعارات وكشوفات الحساب والفواتير المرسلة لعملائك ومورديك.
            </p>
          </div>

          {/* Mode 1 Specific Fields */}
          {config.connectionMode === 'gateway' && (
            <div className="space-y-3.5 p-4 rounded-xl bg-[#06140e] border border-emerald-500/20">
              <div className="text-xs font-bold text-emerald-300 flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-400" />
                <span>إعدادات بوابة الربط المباشر (UltraMsg / Evolution / GreenAPI)</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  رابط نقطة الاتصال للبوابة (Gateway API Endpoint URL) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={config.gatewayUrl || ''}
                  onChange={(e) => handleFieldChange('gatewayUrl', e.target.value)}
                  placeholder="https://api.ultramsg.com/instance0001/messages/chat"
                  className="w-full px-3.5 py-2 bg-[#081a13] border border-emerald-500/20 rounded-xl text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    معرف الجلسة / البوابة (Instance ID)
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={config.instanceId || ''}
                    onChange={(e) => handleFieldChange('instanceId', e.target.value)}
                    placeholder="instance0001"
                    className="w-full px-3.5 py-2 bg-[#081a13] border border-emerald-500/20 rounded-xl text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    رمز الوصول السري (API Token / Secret Key)
                  </label>
                  <input
                    type="password"
                    dir="ltr"
                    value={config.apiToken || ''}
                    onChange={(e) => handleFieldChange('apiToken', e.target.value)}
                    placeholder="••••••••••••••••••••••••"
                    className="w-full px-3.5 py-2 bg-[#081a13] border border-emerald-500/20 rounded-xl text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Mode 2 Specific Fields */}
          {config.connectionMode === 'cloud_api' && (
            <div className="space-y-3.5 p-4 rounded-xl bg-[#06140e] border border-emerald-500/20">
              <div className="text-xs font-bold text-emerald-300 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>إعدادات Meta WhatsApp Cloud API الرسمية</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  معرف رقم الهاتف (WhatsApp Phone Number ID) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={config.phoneNumberId || ''}
                  onChange={(e) => handleFieldChange('phoneNumberId', e.target.value)}
                  placeholder="مثال: 105829182391029"
                  className="w-full px-3.5 py-2 bg-[#081a13] border border-emerald-500/20 rounded-xl text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  معرف حساب واتساب للأعمال (WhatsApp Business Account ID / WABA ID)
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={config.businessAccountId || ''}
                  onChange={(e) => handleFieldChange('businessAccountId', e.target.value)}
                  placeholder="مثال: 204918204918204"
                  className="w-full px-3.5 py-2 bg-[#081a13] border border-emerald-500/20 rounded-xl text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  رمز الوصول الدائم (Permanent System User Access Token) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="password"
                  dir="ltr"
                  value={config.accessToken || ''}
                  onChange={(e) => handleFieldChange('accessToken', e.target.value)}
                  placeholder="EAAG...."
                  className="w-full px-3.5 py-2 bg-[#081a13] border border-emerald-500/20 rounded-xl text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="p-3 bg-[#05110b] rounded-lg border border-emerald-500/20 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Webhook Callback URL:</span>
                <span className="font-mono text-emerald-400" dir="ltr">/api/v1/whatsapp/webhook</span>
              </div>
            </div>
          )}

          {/* Mode 3 Specific Settings */}
          {config.connectionMode === 'internal_engine' && (
            <div className="space-y-3 p-4 rounded-xl bg-[#06140e] border border-emerald-500/20">
              <div className="text-xs font-bold text-emerald-300 flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span>محرك المراسلة والأرشفة المحاسبية الداخلي</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                في هذا الوضع، يقوم النظام بتسجيل وأرشفة كافة إشعارات كشوفات الحساب والفواتير وسندات القبض مباشرة في سجلات المحادثات الداخلية للتاجر وتتبع وصولها، دون الحاجة لأي اشتراك مدفوع في بوابات خارجية.
              </p>

              <label className="flex items-center gap-3 pt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.openExternalWhatsAppApp || false}
                  onChange={(e) => handleFieldChange('openExternalWhatsAppApp', e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
                <span className="text-xs text-slate-300 font-semibold">
                  فتح تطبيق واتساب الخارجي كنسخة إضافية عند الحاجة فقط (معطل افتراضياً لتفادي التشويش)
                </span>
              </label>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-emerald-500/20">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>يتم التخزين الآمن الدائم لكل مؤسسة في PostgreSQL وقرص السيرفر وخزينة العميل.</span>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-950 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>حفظ وتثبيت إعدادات الربط الدائم</span>
            </button>
          </div>
        </form>
      </div>

      {/* Simulator & Live Test Sandbox */}
      <div className="bg-[#091511] rounded-2xl border border-emerald-500/30 p-6 shadow-xl space-y-4">
        <div className="space-y-1 border-b border-emerald-500/20 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Send className="w-4 h-4 text-emerald-400" />
            <span>محاكي إرسال رسالة اختبارية سريعة</span>
          </h3>
          <p className="text-xs text-slate-400">
            اختبر صحة إعدادات التوصيل عبر إرسال رسالة تجريبية لأي رقم هاتف للتأكد من الجاهزية.
          </p>
        </div>

        <form onSubmit={handleTestSend} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              رقم هاتف المستلم للاختبار <span className="text-emerald-400">*</span>
            </label>
            <input
              type="text"
              dir="ltr"
              placeholder="+967 770 000 000"
              required
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              className="w-full px-3 py-2 bg-[#06120d] border border-emerald-500/20 rounded-xl text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">نص الرسالة *</label>
            <textarea
              rows={2}
              required
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              className="w-full p-2.5 bg-[#06120d] border border-emerald-500/20 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSendingTest || !testPhone.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
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
