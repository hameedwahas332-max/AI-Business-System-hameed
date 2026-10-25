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
  const { login, register, user, company, deleteAccount, isAuthenticated, logout } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset' | 'account'>(() => {
    return isAuthenticated && user ? 'account' : 'login';
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateEmailError, setDuplicateEmailError] = useState(false);

  // Deletion State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  // Switch to account mode when authenticated
  React.useEffect(() => {
    if (isOpen) {
      if (isAuthenticated && user) {
        setMode('account');
      } else {
        setMode('login');
      }
      setError(null);
      setSuccess(null);
      setDuplicateEmailError(false);
      setShowDeleteConfirm(false);
      setDeletePassword('');
    }
  }, [isOpen, isAuthenticated, user]);

  if (!isOpen) return null;

  const handleQuickDemoFill = (type: 'tenantA' | 'tenantB') => {
    setError(null);
    setDuplicateEmailError(false);
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

  const handleSwitchToLoginWithEmail = () => {
    setMode('login');
    setError(null);
    setDuplicateEmailError(false);
    setPassword('');
  };

  const handleDeleteAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError(null);
    if (!deletePassword) {
      setDeleteError('يرجى إدخال كلمة المرور لتأكيد الحذف');
      return;
    }
    setIsDeleting(true);
    try {
      const ok = await deleteAccount(deletePassword);
      if (ok) {
        onClose();
      } else {
        setDeleteError('كلمة المرور غير صحيحة، تعذر حذف الحساب');
      }
    } catch (err: any) {
      setDeleteError(err?.message || 'حدث خطأ أثناء محاولة حذف الحساب');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setDuplicateEmailError(false);
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        await login(email.trim(), password);
        setSuccess('تم تسجيل الدخول واستعادة بيانات المحل بنجاح!');
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
      } else if (mode === 'register') {
        if (!companyName.trim()) {
          throw new Error('يرجى إدخال اسم المحل / المنشأة التجارية');
        }
        if (!fullName.trim()) {
          throw new Error('يرجى إدخال اسم المستخدم / المدير المسؤول');
        }
        if (!password || password.length < 4) {
          throw new Error('يرجى إدخال كلمة مرور قوية (4 أحرف على الأقل)');
        }

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
        setSuccess('تم تسجيل المحل وحساب المدير بنجاح!');
        setTimeout(() => {
          if (typeof onClose === 'function') {
            onClose();
          }
        }, 800);
      }
    } catch (err: any) {
      if (err?.conflict || err?.isDuplicate || err?.message?.includes('هذا الحساب موجود مسبقاً')) {
        setDuplicateEmailError(true);
        setError('هذا الحساب موجود مسبقاً، يرجى عمل تسجيل دخول');
      } else {
        setError(err?.message || 'حدث خطأ أثناء تنفيذ الطلب، يرجى التحقق من صحة البيانات المدخلة');
      }
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
                {mode === 'account' && 'بيانات المحل التجاري وحساب الإدارة'}
                {mode === 'login' && 'تسجيل الدخول للنظام'}
                {mode === 'register' && 'إنشاء وتأكيد حساب محل جديد (Permanent Multi-Tenant)'}
                {mode === 'forgot' && 'استعادة كلمة المرور'}
                {mode === 'reset' && 'تعيين كلمة مرور جديدة'}
              </h2>
              <p className="text-xs text-slate-400">
                {mode === 'account' && 'بيانات المحل الدائمة وإدارة الجلسة وأمان النظام'}
                {mode === 'login' && 'أدخل معلومات حسابك للوصول إلى لوحة التحكم واستعادة متجرك'}
                {mode === 'register' && 'سجل محلك مع الحفظ الدائم في قاعدة البيانات وقرص السيرفر'}
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
        {mode !== 'forgot' && mode !== 'reset' && mode !== 'account' && (
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
        {mode !== 'account' ? (
          <div className="flex border-b border-slate-800 bg-slate-950">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); setSuccess(null); setDuplicateEmailError(false); }}
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
              onClick={() => { setMode('register'); setError(null); setSuccess(null); setDuplicateEmailError(false); }}
              className={`flex-1 py-3 text-xs font-semibold transition-colors border-b-2 ${
                mode === 'register'
                  ? 'border-emerald-500 text-emerald-400 bg-slate-900 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              إنشاء حساب محل جديد
            </button>
          </div>
        ) : (
          <div className="flex border-b border-slate-800 bg-slate-950 px-6 py-2.5 items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-emerald-400">حساب متصل ونشط • حفظ دائم</span>
            </div>
            <button
              type="button"
              onClick={() => {
                logout();
                setMode('login');
              }}
              className="text-xs font-semibold text-rose-400 hover:text-rose-300 hover:underline"
            >
              تسجيل الخروج والتبديل لحساب آخر
            </button>
          </div>
        )}

        {/* Form / Content Body */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* PROMINENT DUPLICATE EMAIL WARNING BANNER WITH 1-CLICK BUTTON */}
          {duplicateEmailError && (
            <div className="p-4 bg-amber-950/90 border-2 border-amber-500 rounded-xl text-amber-200 text-xs space-y-3 shadow-lg">
              <div className="flex items-center gap-2.5 font-bold text-sm text-amber-300">
                <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
                <span>⚠️ هذا الحساب موجود مسبقاً، يرجى عمل تسجيل دخول</span>
              </div>
              <p className="text-[11px] text-amber-200/90 leading-relaxed">
                البريد الإلكتروني <span className="font-mono text-white font-bold bg-slate-900 px-1.5 py-0.5 rounded">{email}</span> مسجل مسبقاً في النظام ومحفوظ في الخادم. اضغط الزر أدناه للانتقال الفوري إلى تسجيل الدخول ومتابعة عملك.
              </p>
              <button
                type="button"
                onClick={handleSwitchToLoginWithEmail}
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <KeyRound className="w-4 h-4 text-slate-950" />
                <span>الانتقال إلى تسجيل الدخول بهذا البريد</span>
              </button>
            </div>
          )}

          {error && !duplicateEmailError && (
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

          {/* ACCOUNT DETAILS & PERMANENT DATA VIEW */}
          {mode === 'account' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-bold">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400">اسم المحل / المنشأة التجارية المسجل:</div>
                      <div className="text-sm font-bold text-white">{company?.name || 'مؤسسة تجارية'}</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold">
                    حساب دائم نشط
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-slate-400">اسم المدير:</span>
                    <div className="font-semibold text-slate-200 mt-0.5">{user?.full_name || 'المدير العام'}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">البريد الإلكتروني:</span>
                    <div className="font-mono text-slate-200 mt-0.5">{user?.email}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">العملة الأساسية:</span>
                    <div className="font-semibold text-slate-200 mt-0.5">{company?.currency || 'SAR'}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">حالة التخزين:</span>
                    <div className="text-emerald-400 font-bold mt-0.5 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>قاعدة البيانات + القرص الدائم</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Deletion Protected Section */}
              <div className="p-4 bg-rose-950/20 border border-rose-900/50 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-rose-300">منطقة الأمان والحذف النهائي</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">الحساب لا يُحذف تلقائياً أبداً إلا بطلب صريح وتأكيد كلمة المرور</p>
                  </div>
                  {!showDeleteConfirm && (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-3 py-1.5 rounded-lg bg-rose-950 border border-rose-800 text-rose-300 hover:bg-rose-900 text-xs font-bold transition-colors cursor-pointer"
                    >
                      حذف الحساب نهائياً
                    </button>
                  )}
                </div>

                {showDeleteConfirm && (
                  <form onSubmit={handleDeleteAccountSubmit} className="pt-2 border-t border-rose-900/40 space-y-3">
                    <p className="text-xs text-rose-200 font-medium leading-relaxed">
                      ⚠️ تحذير: سيتم حذف الحساب وبيانات المحل بشكل نهائي ولا يمكن التراجع. يرجى إدخال كلمة المرور لتأكيد الحذف:
                    </p>
                    {deleteError && (
                      <div className="p-2 bg-rose-950 text-rose-300 text-xs rounded border border-rose-800">
                        {deleteError}
                      </div>
                    )}
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute top-3 right-3" />
                      <input
                        type="password"
                        required
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        placeholder="أدخل كلمة مرور الحساب للتأكيد"
                        className="w-full pr-10 pl-3 py-2 bg-slate-950 border border-rose-800/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                        dir="ltr"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={isDeleting}
                        className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isDeleting ? 'جاري الحذف...' : 'تأكيد الحذف النهائي للحساب'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); setDeleteError(null); }}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                      >
                        إلغاء
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* Form for Login, Register, Forgot, Reset */}
          {mode !== 'account' && (
            <form onSubmit={handleSubmit} className="space-y-4">

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
                  ? 'تسجيل الدخول واستعادة بيانات المحل'
                  : mode === 'forgot'
                  ? 'إرسال رمز إعادة التعيين'
                  : mode === 'reset'
                  ? 'تأكيد وحفظ كلمة المرور الجديدة'
                  : 'إنشاء وتأكيد حساب المحل'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
