import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';
import { AppIcon } from '../Common/AppIcon';
import { Building2, User, Lock, Mail, Phone, Globe, ShieldAlert, CheckCircle2, Sparkles, X, KeyRound } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [currency, setCurrency] = useState('YER');
  const [country, setCountry] = useState('YE');
  const [taxNumber, setTaxNumber] = useState('');

  if (!isOpen) return null;

  const handleQuickDemoFill = (type: 'tenantA' | 'tenantB') => {
    setError(null);
    if (type === 'tenantA') {
      setEmail('admin@alamal-trade.com');
      setPassword('AdminPass123!');
      setFullName('محمد أحمد العبسي');
      setCompanyName('شركة الأمل الوطنية للتجارة');
      setCompanyCode('alamal-trade');
      setCurrency('YER');
      setCountry('YE');
    } else {
      setEmail('admin@albaraka-store.com');
      setPassword('AdminPass123!');
      setFullName('عبدالله صالح البركة');
      setCompanyName('مؤسسة البركة للمستلزمات');
      setCompanyCode('albaraka-store');
      setCurrency('YER');
      setCountry('YE');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        await login(email.trim(), password);
        setSuccess('تم تسجيل الدخول بنجاح!');
        setTimeout(() => onClose(), 800);
      } else if (mode === 'forgot') {
        const res: any = await api.forgotPassword({ email: email.trim() });
        setSuccess(res.message || 'إذا كان هذا البريد مسجلاً، تم إرسال تعليمات إعادة تعيين كلمة المرور');
        setTimeout(() => {
          setMode('reset');
          setSuccess(null);
        }, 1500);
      } else if (mode === 'reset') {
        const res: any = await api.resetPassword({
          token: resetToken.trim(),
          newPassword: newPassword,
        });
        setSuccess(res.message || 'تم إعادة تعيين كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول.');
        setTimeout(() => {
          setMode('login');
          setPassword('');
          setResetToken('');
          setNewPassword('');
          setSuccess(null);
        }, 1500);
      } else {
        if (typeof register === 'function') {
          await register({
            companyName: companyName.trim(),
            companyCode: companyCode.trim() || undefined,
            currency,
            country: country.trim() || undefined,
            taxNumber: taxNumber.trim() || undefined,
            fullName: fullName.trim(),
            email: email.trim(),
            password,
            phone: phone.trim() || undefined,
          });
        }
        setSuccess('تم تسجيل المؤسسة وحساب الأدمن بنجاح!');
        setTimeout(() => {
          if (typeof onClose === 'function') {
            onClose();
          }
        }, 800);
      }
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء تنفيذ الطلب، يرجى التحقق من صحة البيانات المدخلة');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-emerald-900/50 rounded-2xl w-full max-w-lg shadow-2xl text-slate-100 overflow-hidden relative my-8">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AppIcon className="w-10 h-10 drop-shadow-md" />
            <div>
              <h2 className="text-base font-bold text-white">
                {mode === 'login' && 'تسجيل الدخول للنظام'}
                {mode === 'register' && 'إنشاء حساب مؤسسة جديدة (Multi-Tenant SaaS)'}
                {mode === 'forgot' && 'استعادة كلمة المرور'}
                {mode === 'reset' && 'تعيين كلمة مرور جديدة'}
              </h2>
              <p className="text-xs text-slate-400">
                {mode === 'login' && 'أدخل معلومات حسابك للوصول إلى لوحة التحكم'}
                {mode === 'register' && 'أنشئ مستأجراً جديداً مع بيانات الدفع والأمان'}
                {mode === 'forgot' && 'أدخل بريدك الإلكتروني المسجل لطلب رمز إعادة التعيين'}
                {mode === 'reset' && 'أدخل رمز التحقق وكلمة المرور الجديدة لاستعادة الدخول'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Demo Pre-fill Banner */}
        {mode !== 'forgot' && mode !== 'reset' && (
          <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">تعبئة سريعة لاختبار العزل:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoFill('tenantA')}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-800/60 font-mono text-[11px] font-bold shadow-sm transition-colors"
              >
                شركة الأمل (A)
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoFill('tenantB')}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-800/60 font-mono text-[11px] font-bold shadow-sm transition-colors"
              >
                مؤسسة البركة (B)
              </button>
            </div>
          </div>
        )}

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); setSuccess(null); }}
            className={`flex-1 py-3 text-xs font-semibold transition-colors border-b-2 ${
              mode === 'login'
                ? 'border-emerald-500 text-emerald-400 bg-slate-900 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            تسجيل دخول مستخدم
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(null); setSuccess(null); }}
            className={`flex-1 py-3 text-xs font-semibold transition-colors border-b-2 ${
              mode === 'register'
                ? 'border-emerald-500 text-emerald-400 bg-slate-900 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            تسجيل مؤسسة جديدة (Tenant Registration)
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{success}</span>
            </div>
          )}

          {/* FORGOT PASSWORD FORM */}
          {mode === 'forgot' && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-950 border border-emerald-900/50 rounded-xl text-slate-300 text-xs leading-relaxed">
                أدخل بريدك الإلكتروني المسجل في النظام وسنقوم بتوليد وإرسال رمز التحقق لإعادة تعيين كلمة المرور بشكل آمن ومحمي.
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">البريد الإلكتروني المسجل *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute top-3 right-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@alamal-trade.com"
                    className="w-full pr-10 pl-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null); setSuccess(null); }}
                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  العودة لتسجيل الدخول
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('reset'); setError(null); setSuccess(null); }}
                  className="text-xs text-emerald-400 hover:text-emerald-300 hover:underline"
                >
                  لديك رمز بالفعل؟
                </button>
              </div>
            </div>
          )}

          {/* RESET PASSWORD FORM */}
          {mode === 'reset' && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-950 border border-amber-800/60 rounded-xl text-amber-300 text-xs leading-relaxed">
                أدخل رمز إعادة التعيين (Reset Token) المرسل إليك مع كلمة المرور الجديدة لتحديث حسابك.
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">رمز إعادة التعيين (Reset Token) *</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute top-3 right-3" />
                  <input
                    type="text"
                    required
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    placeholder="أدخل رمز التحقق (Hex Token)"
                    className="w-full pr-10 pl-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">كلمة المرور الجديدة *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute top-3 right-3" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="كلمة مرور قوية جديدة (6 أحرف على الأقل)"
                    className="w-full pr-10 pl-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null); setSuccess(null); }}
                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  العودة لتسجيل الدخول
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setError(null); setSuccess(null); }}
                  className="text-xs text-emerald-400 hover:text-emerald-300 hover:underline"
                >
                  طلب رمز جديد
                </button>
              </div>
            </div>
          )}

          {/* REGISTER EXTRA FIELDS */}
          {mode === 'register' && (
            <div className="space-y-4 border-b border-slate-800 pb-4">
              <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                1. بيانات المؤسسة والشركة (Tenant Info)
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">اسم الشركة / المؤسسة *</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-500 absolute top-3 right-3" />
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="مثال: شركة الأمل لتجارة الأغذية"
                    className="w-full pr-10 pl-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">رمز المؤسسة (Code)</label>
                  <input
                    type="text"
                    value={companyCode}
                    onChange={(e) => setCompanyCode(e.target.value)}
                    placeholder="alamal-trade"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">العملة الأساسية</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    <option value="YER">ريال يمني (YER)</option>
                    <option value="SAR">ريال سعودي (SAR)</option>
                    <option value="USD">دولار أمريكي (USD)</option>
                    <option value="AED">درهم إماراتي (AED)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">الرقم الضريبي (إن وجد)</label>
                  <input
                    type="text"
                    value={taxNumber}
                    onChange={(e) => setTaxNumber(e.target.value)}
                    placeholder="TAX-339900"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">الدولة</label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="YE"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {/* COMMON LOGIN / REGISTER USER FIELDS */}
          {(mode === 'login' || mode === 'register') && (
            <div className="space-y-4">
              {mode === 'register' && (
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  2. حساب المدير المسؤول (Company Admin)
                </div>
              )}

              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">الاسم الكامل *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute top-3 right-3" />
                    <input
                      type="text"
                      required={mode === 'register'}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="محمد أحمد العبسي"
                      className="w-full pr-10 pl-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">البريد الإلكتروني *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute top-3 right-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@alamal-trade.com"
                    className="w-full pr-10 pl-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-300">كلمة المرور *</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); setError(null); setSuccess(null); }}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 hover:underline"
                    >
                      نسيت كلمة المرور؟
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute top-3 right-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pr-10 pl-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">رقم الهاتف / الجوال</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute top-3 right-3" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+967 770 000 000"
                      className="w-full pr-10 pl-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-950/50 disabled:opacity-50 mt-2 cursor-pointer"
          >
            {isSubmitting
              ? 'جاري التنفيذ...'
              : mode === 'login'
              ? 'تسجيل الدخول'
              : mode === 'forgot'
              ? 'إرسال رمز إعادة التعيين'
              : mode === 'reset'
              ? 'تأكيد وحفظ كلمة المرور الجديدة'
              : 'إنشاء وتأكيد حساب المؤسسة'}
          </button>
        </form>
      </div>
    </div>
  );
};
