import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';
import { AppIcon } from '../Common/AppIcon';
import { Building2, User, Lock, Mail, Phone, ShieldAlert, CheckCircle2, X, KeyRound } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="m3-modal-surface w-full max-w-lg overflow-hidden relative my-8">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <AppIcon className="w-10 h-10 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-base font-bold text-[var(--md-on-surface)] truncate">
                {mode === 'account' && 'بيانات المحل التجاري وحساب الإدارة'}
                {mode === 'login' && 'تسجيل الدخول - نظام المحاسبي الذكي ERP'}
                {mode === 'register' && 'إنشاء حساب جديد - نظام المحاسبي الذكي ERP'}
                {mode === 'forgot' && 'استعادة كلمة المرور'}
                {mode === 'reset' && 'تعيين كلمة مرور جديدة'}
              </h2>
              <p className="text-xs text-[var(--md-on-surface-variant)] mt-0.5 leading-snug">
                {mode === 'account' && 'بيانات المحل الدائمة وإدارة الجلسة وأمان النظام'}
                {mode === 'login' && 'أدخل معلومات حسابك للوصول إلى لوحة التحكم واستعادة متجرك'}
                {mode === 'register' && 'سجل محلك مع الحفظ الدائم في قاعدة البيانات وقرص السيرفر'}
                {mode === 'forgot' && 'أدخل بريدك الإلكتروني المسجل لطلب رمز إعادة التعيين'}
                {mode === 'reset' && 'أدخل رمز التحقق وكلمة المرور الجديدة لاستعادة الدخول'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="m3-btn-text p-2 min-h-[36px] shrink-0"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        {mode !== 'account' ? (
          <div className="flex border-b border-[var(--md-outline-variant)] bg-[var(--md-surface-container-low)]">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); setSuccess(null); setDuplicateEmailError(false); }}
              className={`flex-1 py-3 text-xs font-semibold transition-colors border-b-2 cursor-pointer ${
                mode === 'login'
                  ? 'border-[var(--md-primary)] text-[var(--md-primary)] bg-[var(--md-surface-container)] font-bold'
                  : 'border-transparent text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
              }`}
            >
              تسجيل دخول مستخدم
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(null); setSuccess(null); setDuplicateEmailError(false); }}
              className={`flex-1 py-3 text-xs font-semibold transition-colors border-b-2 cursor-pointer ${
                mode === 'register'
                  ? 'border-[var(--md-primary)] text-[var(--md-primary)] bg-[var(--md-surface-container)] font-bold'
                  : 'border-transparent text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
              }`}
            >
              إنشاء حساب محل جديد
            </button>
          </div>
        ) : (
          <div className="flex border-b border-[var(--md-outline-variant)] bg-[var(--md-surface-container-low)] px-6 py-3 items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: 'var(--md-success)' }}
              />
              <span className="text-xs font-bold" style={{ color: 'var(--md-success)' }}>
                حساب متصل ونشط • حفظ دائم
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                logout();
                setMode('login');
              }}
              className="m3-btn-text text-xs px-2"
              style={{ color: 'var(--md-error)' }}
            >
              تسجيل الخروج والتبديل لحساب آخر
            </button>
          </div>
        )}

        {/* Form / Content Body */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* PROMINENT DUPLICATE EMAIL WARNING BANNER WITH 1-CLICK BUTTON */}
          {duplicateEmailError && (
            <div
              className="p-4 rounded-2xl text-xs space-y-3 border"
              style={{
                backgroundColor: 'var(--md-warning-container)',
                borderColor: 'var(--md-secondary)',
                color: 'var(--md-on-warning-container)',
              }}
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                <ShieldAlert className="w-5 h-5 shrink-0" style={{ color: 'var(--md-secondary)' }} />
                <span>هذا الحساب موجود مسبقاً، يرجى عمل تسجيل دخول</span>
              </div>
              <p className="text-xs leading-relaxed opacity-90">
                البريد الإلكتروني{' '}
                <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-[var(--md-surface-container-lowest)] text-[var(--md-on-surface)]">
                  {email}
                </span>{' '}
                مسجل مسبقاً في النظام ومحفوظ في الخادم. اضغط الزر أدناه للانتقال الفوري إلى تسجيل الدخول ومتابعة عملك.
              </p>
              <button
                type="button"
                onClick={handleSwitchToLoginWithEmail}
                className="m3-btn-primary w-full"
              >
                <KeyRound className="w-4 h-4" />
                <span>الانتقال إلى تسجيل الدخول بهذا البريد</span>
              </button>
            </div>
          )}

          {error && !duplicateEmailError && (
            <div
              className="p-3 rounded-xl text-xs flex items-center gap-2 border"
              style={{
                backgroundColor: 'var(--md-error-container)',
                borderColor: 'var(--md-error)',
                color: 'var(--md-on-error-container)',
              }}
            >
              <ShieldAlert className="w-4 h-4 shrink-0" style={{ color: 'var(--md-error)' }} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div
              className="p-3 rounded-xl text-xs flex items-center gap-2 border"
              style={{
                backgroundColor: 'var(--md-success-container)',
                borderColor: 'var(--md-success)',
                color: 'var(--md-on-success-container)',
              }}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: 'var(--md-success)' }} />
              <span>{success}</span>
            </div>
          )}

          {/* ACCOUNT DETAILS & PERMANENT DATA VIEW */}
          {mode === 'account' && (
            <div className="space-y-4">
              <div className="m3-card p-4 space-y-4">
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-[var(--md-outline-variant)]">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: 'var(--md-primary-container)',
                        color: 'var(--md-on-primary-container)',
                      }}
                    >
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] text-[var(--md-on-surface-variant)]">
                        اسم المحل / المنشأة التجارية المسجل:
                      </div>
                      <div className="text-sm font-bold text-[var(--md-on-surface)] truncate">
                        {company?.name || 'مؤسسة تجارية'}
                      </div>
                    </div>
                  </div>
                  <span
                    className="m3-badge shrink-0"
                    style={{
                      backgroundColor: 'var(--md-success-container)',
                      color: 'var(--md-on-success-container)',
                      borderColor: 'transparent',
                    }}
                  >
                    حساب دائم نشط
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[var(--md-on-surface-variant)]">اسم المدير:</span>
                    <div className="font-semibold text-[var(--md-on-surface)] mt-1">
                      {user?.full_name || 'المدير العام'}
                    </div>
                  </div>
                  <div>
                    <span className="text-[var(--md-on-surface-variant)]">البريد الإلكتروني:</span>
                    <div className="font-mono text-[var(--md-on-surface)] mt-1 truncate">
                      {user?.email}
                    </div>
                  </div>
                  <div>
                    <span className="text-[var(--md-on-surface-variant)]">العملة الأساسية:</span>
                    <div className="font-semibold font-mono text-[var(--md-on-surface)] mt-1">
                      {company?.currency || 'SAR'}
                    </div>
                  </div>
                  <div>
                    <span className="text-[var(--md-on-surface-variant)]">حالة التخزين:</span>
                    <div
                      className="font-bold mt-1 flex items-center gap-1"
                      style={{ color: 'var(--md-success)' }}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>قاعدة البيانات + القرص الدائم</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Deletion Protected Section */}
              <div
                className="p-4 rounded-2xl border space-y-3"
                style={{
                  backgroundColor: 'var(--md-error-container)',
                  borderColor: 'var(--md-error)',
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold" style={{ color: 'var(--md-on-error-container)' }}>
                      منطقة الأمان والحذف النهائي
                    </h4>
                    <p className="text-[11px] text-[var(--md-on-surface-variant)] mt-0.5">
                      الحساب لا يُحذف تلقائياً أبداً إلا بطلب صريح وتأكيد كلمة المرور
                    </p>
                  </div>
                  {!showDeleteConfirm && (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="m3-btn-outlined text-xs px-3 shrink-0"
                      style={{
                        borderColor: 'var(--md-error)',
                        color: 'var(--md-on-error-container)',
                      }}
                    >
                      حذف الحساب نهائياً
                    </button>
                  )}
                </div>

                {showDeleteConfirm && (
                  <form onSubmit={handleDeleteAccountSubmit} className="pt-3 border-t border-[var(--md-outline-variant)] space-y-3">
                    <p className="text-xs font-medium leading-relaxed" style={{ color: 'var(--md-on-error-container)' }}>
                      تحذير: سيتم حذف الحساب وبيانات المحل بشكل نهائي ولا يمكن التراجع. يرجى إدخال كلمة المرور لتأكيد الحذف:
                    </p>
                    {deleteError && (
                      <div
                        className="p-2.5 text-xs rounded-xl border"
                        style={{
                          backgroundColor: 'var(--md-surface-container-lowest)',
                          borderColor: 'var(--md-error)',
                          color: 'var(--md-error)',
                        }}
                      >
                        {deleteError}
                      </div>
                    )}
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[var(--md-on-surface-variant)] absolute top-1/2 -translate-y-1/2 right-3 pointer-events-none" />
                      <input
                        type="password"
                        required
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        placeholder="أدخل كلمة مرور الحساب للتأكيد"
                        className="m3-input pr-10 pl-3"
                        dir="ltr"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={isDeleting}
                        className="m3-btn-primary flex-1 text-xs"
                        style={{
                          backgroundColor: 'var(--md-error)',
                          color: '#FFFFFF',
                        }}
                      >
                        {isDeleting ? 'جاري الحذف...' : 'تأكيد الحذف النهائي للحساب'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); setDeleteError(null); }}
                        className="m3-btn-outlined px-4 text-xs"
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
                  <div className="m3-card p-3.5 text-[var(--md-on-surface-variant)] text-xs leading-relaxed">
                    أدخل بريدك الإلكتروني المسجل في النظام وسنقوم بتوليد وإرسال رمز التحقق لإعادة تعيين كلمة المرور بشكل آمن ومحمي.
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[var(--md-on-surface-variant)]">
                      البريد الإلكتروني المسجل *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[var(--md-on-surface-variant)] absolute top-1/2 -translate-y-1/2 right-3 pointer-events-none" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@company.com"
                        className="m3-input pr-10 pl-3"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => { setMode('login'); setError(null); setSuccess(null); }}
                      className="m3-btn-text text-xs px-2"
                    >
                      العودة لتسجيل الدخول
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMode('reset'); setError(null); setSuccess(null); }}
                      className="m3-btn-text text-xs px-2"
                      style={{ color: 'var(--md-primary)' }}
                    >
                      لديك رمز بالفعل؟
                    </button>
                  </div>
                </div>
              )}

              {/* RESET PASSWORD FORM */}
              {mode === 'reset' && (
                <div className="space-y-4">
                  <div
                    className="p-3.5 rounded-xl border text-xs leading-relaxed"
                    style={{
                      backgroundColor: 'var(--md-warning-container)',
                      borderColor: 'var(--md-secondary)',
                      color: 'var(--md-on-warning-container)',
                    }}
                  >
                    أدخل رمز إعادة التعيين (Reset Token) المرسل إليك مع كلمة المرور الجديدة لتحديث حسابك.
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[var(--md-on-surface-variant)]">
                      رمز إعادة التعيين (Reset Token) *
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-[var(--md-on-surface-variant)] absolute top-1/2 -translate-y-1/2 right-3 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={resetToken}
                        onChange={(e) => setResetToken(e.target.value)}
                        placeholder="أدخل رمز التحقق (Hex Token)"
                        className="m3-input pr-10 pl-3 font-mono"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[var(--md-on-surface-variant)]">
                      كلمة المرور الجديدة *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[var(--md-on-surface-variant)] absolute top-1/2 -translate-y-1/2 right-3 pointer-events-none" />
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="كلمة مرور قوية جديدة (6 أحرف على الأقل)"
                        className="m3-input pr-10 pl-3"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => { setMode('login'); setError(null); setSuccess(null); }}
                      className="m3-btn-text text-xs px-2"
                    >
                      العودة لتسجيل الدخول
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); setError(null); setSuccess(null); }}
                      className="m3-btn-text text-xs px-2"
                      style={{ color: 'var(--md-primary)' }}
                    >
                      طلب رمز جديد
                    </button>
                  </div>
                </div>
              )}

              {/* REGISTER EXTRA FIELDS */}
              {mode === 'register' && (
                <div className="space-y-4 border-b border-[var(--md-outline-variant)] pb-4">
                  <div className="text-xs font-bold text-[var(--md-primary)]">
                    1. بيانات المؤسسة والشركة (Tenant Info)
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[var(--md-on-surface-variant)]">
                      اسم الشركة / المؤسسة *
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-[var(--md-on-surface-variant)] absolute top-1/2 -translate-y-1/2 right-3 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="مثال: شركة الأمل لتجارة الأغذية"
                        className="m3-input pr-10 pl-3"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-[var(--md-on-surface-variant)]">
                        رمز المؤسسة (Code)
                      </label>
                      <input
                        type="text"
                        value={companyCode}
                        onChange={(e) => setCompanyCode(e.target.value)}
                        placeholder="alamal-trade"
                        className="m3-input font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-[var(--md-on-surface-variant)]">
                        العملة الأساسية
                      </label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="m3-select"
                      >
                        <option value="YER">ريال يمني (YER)</option>
                        <option value="SAR">ريال سعودي (SAR)</option>
                        <option value="USD">دولار أمريكي (USD)</option>
                        <option value="AED">درهم إماراتي (AED)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-[var(--md-on-surface-variant)]">
                        الرقم الضريبي (إن وجد)
                      </label>
                      <input
                        type="text"
                        value={taxNumber}
                        onChange={(e) => setTaxNumber(e.target.value)}
                        placeholder="TAX-339900"
                        className="m3-input font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-[var(--md-on-surface-variant)]">
                        الدولة
                      </label>
                      <input
                        type="text"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        placeholder="YE"
                        className="m3-input"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* COMMON LOGIN / REGISTER USER FIELDS */}
              {(mode === 'login' || mode === 'register') && (
                <div className="space-y-4">
                  {mode === 'register' && (
                    <div className="text-xs font-bold text-[var(--md-primary)]">
                      2. حساب المدير المسؤول (Company Admin)
                    </div>
                  )}

                  {mode === 'register' && (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-[var(--md-on-surface-variant)]">
                        الاسم الكامل *
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-[var(--md-on-surface-variant)] absolute top-1/2 -translate-y-1/2 right-3 pointer-events-none" />
                        <input
                          type="text"
                          required={mode === 'register'}
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="محمد أحمد العبسي"
                          className="m3-input pr-10 pl-3"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[var(--md-on-surface-variant)]">
                      البريد الإلكتروني *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[var(--md-on-surface-variant)] absolute top-1/2 -translate-y-1/2 right-3 pointer-events-none" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@company.com"
                        className="m3-input pr-10 pl-3"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-[var(--md-on-surface-variant)]">
                        كلمة المرور *
                      </label>
                      {mode === 'login' && (
                        <button
                          type="button"
                          onClick={() => { setMode('forgot'); setError(null); setSuccess(null); }}
                          className="text-xs font-semibold hover:underline cursor-pointer"
                          style={{ color: 'var(--md-primary)' }}
                        >
                          نسيت كلمة المرور؟
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[var(--md-on-surface-variant)] absolute top-1/2 -translate-y-1/2 right-3 pointer-events-none" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="m3-input pr-10 pl-3"
                      />
                    </div>
                  </div>

                  {mode === 'register' && (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-[var(--md-on-surface-variant)]">
                        رقم الهاتف / الجوال
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-[var(--md-on-surface-variant)] absolute top-1/2 -translate-y-1/2 right-3 pointer-events-none" />
                        <input
                          type="text"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+967 770 000 000"
                          className="m3-input pr-10 pl-3 font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="m3-btn-primary w-full mt-2"
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
