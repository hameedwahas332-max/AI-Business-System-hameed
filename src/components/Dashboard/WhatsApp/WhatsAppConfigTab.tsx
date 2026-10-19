import React, { useState } from 'react';
import {
  Settings,
  ShieldCheck,
  Check,
  RefreshCw,
  AlertCircle,
  Key,
  Globe,
  Send,
} from 'lucide-react';

interface WhatsAppConfigTabProps {
  phoneNumberId?: string;
  displayPhoneNumber?: string;
  onSaveConfig?: (phoneId: string, displayPhone: string) => Promise<boolean>;
  onSendTestMessage?: (phone: string, text: string) => Promise<boolean>;
}

export const WhatsAppConfigTab: React.FC<WhatsAppConfigTabProps> = ({
  phoneNumberId = 'PHONE-966-501234567',
  displayPhoneNumber = '+966 50 123 4567',
  onSaveConfig = async () => true,
  onSendTestMessage = async () => true,
}) => {
  const [phoneId, setPhoneId] = useState(phoneNumberId || '');
  const [displayPhone, setDisplayPhone] = useState(displayPhoneNumber || '');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Test send state
  const [testPhone, setTestPhone] = useState('');
  const [testText, setTestText] = useState('مرحباً، هذه رسالة اختبار للربط مع نظام ERP عبر WhatsApp Cloud API.');
  const [isSendingTest, setIsSendingTest] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneId.trim()) return;

    setIsSaving(true);
    setFeedback(null);
    try {
      const ok = await onSaveConfig(phoneId.trim(), displayPhone.trim());
      if (ok) {
        setFeedback({ type: 'success', msg: 'تم حفظ وتحديث إعدادات ربط WhatsApp بنجاح' });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim() || !testText.trim()) return;

    setIsSendingTest(true);
    setFeedback(null);
    try {
      const ok = await onSendTestMessage(testPhone.trim(), testText.trim());
      if (ok) {
        setFeedback({ type: 'success', msg: `تم إرسال رسالة الاختبار بنجاح إلى ${testPhone}` });
      }
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div id="whatsapp-config-section" className="max-w-3xl mx-auto space-y-6">
      
      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between gap-3 border shadow-xs animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
            <span>{feedback.msg}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-[11px] font-bold underline">
            إغلاق
          </button>
        </div>
      )}

      {/* Meta API Settings Card */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-5">
        <div className="space-y-1 border-b border-slate-800 pb-4">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-400" />
            <span>إعدادات وتكامل Meta WhatsApp Cloud API</span>
          </h2>
          <p className="text-xs text-slate-400">
            قم بربط رقم هاتف واتساب للأعمال ومعرف الحساب الخاص بالشركة لاستقبال وإرسال الرسائل عبر الـ API.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              معرف رقم الهاتف (WhatsApp Phone Number ID) <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              dir="ltr"
              value={phoneId}
              onChange={(e) => setPhoneId(e.target.value)}
              placeholder="مثال: 105829182391029"
              required
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-100 placeholder:text-slate-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              يمكنك الحصول على Phone Number ID من لوحة مطوري Meta (Meta Developers Portal) تحت تطبيق WhatsApp.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              رقم الهاتف المعروض للمشتركين (Display Phone Number)
            </label>
            <input
              type="text"
              dir="ltr"
              value={displayPhone}
              onChange={(e) => setDisplayPhone(e.target.value)}
              placeholder="مثال: +967 77 123 4567"
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-100 placeholder:text-slate-500"
            />
          </div>

          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2">
            <div className="font-bold text-slate-200 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-emerald-400" />
              <span>معلومات الويب هوك لاستقبال الرسائل (Webhook Callback)</span>
            </div>
            <div className="font-mono text-emerald-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[11px]" dir="ltr">
              Callback URL: https://[your-domain]/api/v1/whatsapp/webhook
            </div>
            <p className="text-[11px] text-slate-400">
              يتم التحقق تلقائياً من توقيع HMAC ومطابقة المعرفات لعزل بيانات الشركات المشتركة بأمان تام.
            </p>
          </div>

          <div className="flex items-center justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving || !phoneId.trim()}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition-all shadow-md shadow-emerald-950/40 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>حفظ الإعدادات</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Simulator & Live Test Sandbox */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-4">
        <div className="space-y-1 border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Send className="w-4 h-4 text-emerald-400" />
            <span>محاكي إرسال رسالة اختبارية سريعة</span>
          </h3>
          <p className="text-xs text-slate-400">
            اختبر صحة إعدادات التوصيل عبر إرسال رسالة تجريبية لأي رقم هاتف.
          </p>
        </div>

        <form onSubmit={handleTestSend} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">رقم هاتف المستلم للاختبار *</label>
            <input
              type="text"
              dir="ltr"
              placeholder="+967 770 000 000"
              required
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 placeholder:text-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">نص الرسالة *</label>
            <textarea
              rows={2}
              required
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-500"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSendingTest || !testPhone.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all disabled:opacity-50"
            >
              {isSendingTest ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>إرسال رسالة تجريبية</span>
            </button>
          </div>
        </form>
      </div>

    </div>
  );
};
