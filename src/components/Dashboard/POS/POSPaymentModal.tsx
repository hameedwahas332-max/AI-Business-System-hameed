import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  Banknote,
  Landmark,
  Smartphone,
  Layers,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  DollarSign,
  Plus,
  Trash2,
} from 'lucide-react';
import { POSPaymentSplit } from '../../../types';
import { roundMoney, parseEnglishNumber, toEnglishDigits, getActiveCurrencySymbol } from '../../../lib/formatters';

interface POSPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartTotal: number;
  customer: any | null;
  currency: string;
  exchangeRate?: number;
  onConfirmPayment: (paymentData: {
    paymentMethod: string;
    paidAmount: number;
    remainingAmount: number;
    changeAmount: number;
    payments: POSPaymentSplit[];
    overrideCreditLimit?: boolean;
    notes?: string;
    receivedBy?: string;
  }) => void;
  loading: boolean;
  serverError?: string | null;
}

export const POSPaymentModal: React.FC<POSPaymentModalProps> = ({
  isOpen,
  onClose,
  cartTotal,
  customer,
  currency,
  exchangeRate = 1.0,
  onConfirmPayment,
  loading,
  serverError = null,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'CASH' | 'CARD' | 'BANK' | 'CREDIT' | 'SPLIT' | 'MOBILE'>('CASH');
  const [tenderedAmount, setTenderedAmount] = useState<number>(cartTotal);
  const [splitPayments, setSplitPayments] = useState<POSPaymentSplit[]>([
    { method: 'CASH', amount: Math.round(cartTotal / 2) },
    { method: 'CARD', amount: Math.round(cartTotal - Math.round(cartTotal / 2)) },
  ]);
  const [receivedBy, setReceivedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Sync tendered amount when modal opens or total changes
  useEffect(() => {
    if (isOpen) {
      setTenderedAmount(cartTotal);
      setSplitPayments([
        { method: 'CASH', amount: Math.round(cartTotal / 2) },
        { method: 'CARD', amount: Math.round(cartTotal - Math.round(cartTotal / 2)) },
      ]);
      setReceivedBy('');
      setError(null);
    }
  }, [isOpen, cartTotal]);

  if (!isOpen) return null;

  // Calculations based on method
  let paidAmount = 0;
  let remainingAmount = 0;
  let changeAmount = 0;

  if (selectedMethod === 'CREDIT') {
    paidAmount = 0;
    remainingAmount = cartTotal;
    changeAmount = 0;
  } else if (selectedMethod === 'SPLIT') {
    paidAmount = splitPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    remainingAmount = Math.max(0, cartTotal - paidAmount);
    changeAmount = Math.max(0, paidAmount - cartTotal);
  } else {
    // Single cash/card/bank/mobile
    paidAmount = Math.min(cartTotal, tenderedAmount);
    remainingAmount = Math.max(0, cartTotal - tenderedAmount);
    changeAmount = Math.max(0, tenderedAmount - cartTotal);
  }

  // Credit Limit Check (Matches backend & offline enforcement strictly)
  const currentCustBal = roundMoney(Number(customer?.current_balance ?? customer?.balance ?? 0));
  const creditLimit = roundMoney(Math.max(0, Number(customer?.credit_limit ?? customer?.creditLimit ?? 0)));
  const isCreditEnforced = Boolean(customer && customer.enforce_credit_limit === true && creditLimit > 0);
  const availableCredit = roundMoney(Math.max(0, creditLimit - currentCustBal));
  const potentialDebt = roundMoney(currentCustBal + remainingAmount);
  const isCreditExceeded =
    isCreditEnforced && remainingAmount > 0.001 && potentialDebt > creditLimit + 0.001;
  const additionalCashNeeded = isCreditExceeded
    ? roundMoney(Math.min(remainingAmount, Math.max(0, potentialDebt - creditLimit)))
    : 0;
  const minimumCashToAllow = isCreditExceeded
    ? roundMoney(Math.min(cartTotal, Math.max(0, paidAmount + additionalCashNeeded)))
    : 0;

  // Quick Cash Denominations
  const quickPresets = currency === 'YER'
    ? [1000, 2000, 5000, 10000, 20000, 50000]
    : currency === 'SAR'
    ? [50, 100, 200, 500]
    : [20, 50, 100];

  const handleAddSplitRow = () => {
    const currentSum = splitPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const diff = Math.max(0, cartTotal - currentSum);
    setSplitPayments([...splitPayments, { method: 'CASH', amount: diff }]);
  };

  const handleRemoveSplitRow = (idx: number) => {
    setSplitPayments(splitPayments.filter((_, i) => i !== idx));
  };

  const handleUpdateSplitRow = (idx: number, field: keyof POSPaymentSplit, val: any) => {
    const updated = [...splitPayments];
    updated[idx] = { ...updated[idx], [field]: val };
    setSplitPayments(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreditExceeded) {
      setError(
        `لا يمكن إتمام البيع الآجل لتجاوز السقف الائتماني المفعّل للعميل (${creditLimit.toLocaleString()} ${currSym}). الحد الأدنى المطلوب تحصيله نقداً لإتمام الفاتورة هو ${minimumCashToAllow.toLocaleString()} ${currSym}.`
      );
      return;
    }

    if (selectedMethod === 'CREDIT' && (!customer || !customer.id)) {
      setError('لا يمكن إجراء بيع آجل (على الحساب) لعميل نقدي عام غير محدد');
      return;
    }

    let finalPayments: POSPaymentSplit[] = [];
    if (selectedMethod === 'SPLIT') {
      finalPayments = splitPayments.filter((p) => Number(p.amount) > 0);
    } else if (paidAmount > 0) {
      finalPayments = [{ method: selectedMethod as any, amount: paidAmount }];
    }

    onConfirmPayment({
      paymentMethod: selectedMethod,
      paidAmount,
      remainingAmount,
      changeAmount,
      payments: finalPayments,
      overrideCreditLimit: false,
      notes,
      receivedBy: receivedBy.trim() || undefined,
    });
  };

  const currSym = getActiveCurrencySymbol(currency);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center m3-backdrop p-4 overflow-y-auto" dir="rtl">
      <div className="m3-modal-surface rounded-3xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 bg-[var(--md-surface-container-low)] border-b border-[var(--md-outline-variant)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] rounded-2xl border border-[var(--md-primary)]/20">
              <Banknote className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[var(--md-on-surface)]">إتمام السداد وإصدار الفاتورة</h3>
              <p className="text-xs text-[var(--md-on-surface-variant)]">اختر طريقة الدفع ومبلغ التحصيل</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-high)] rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Total Banner */}
          <div className="p-5 bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] rounded-2xl space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-[var(--md-on-surface-variant)] block mb-1">المبلغ الإجمالي المستحق:</span>
                <div className="text-3xl font-black text-[var(--md-on-surface)] tracking-tight tabular-nums">
                  {cartTotal.toLocaleString()} <span className="text-[var(--md-primary-text)] text-lg font-bold">{currSym}</span>
                </div>
              </div>

              <div className="text-left">
                <span className="text-xs text-[var(--md-on-surface-variant)] block">العميل المفوتر:</span>
                <span className="text-sm font-bold text-[var(--md-on-surface)]">
                  {customer?.name || 'عميل نقدي عام'}
                </span>
                {customer?.id && (
                  <div className="text-[11px] text-[var(--md-on-surface-variant)] mt-0.5 tabular-nums">
                    الرصيد الحالي: {currentCustBal.toLocaleString()} {currSym}
                  </div>
                )}
              </div>
            </div>

            {isCreditEnforced && (
              <div className="pt-2.5 border-t border-[var(--md-outline-variant)] flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums">
                <span className="font-bold text-[var(--md-primary-text)] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>سقف ائتماني مفعّل</span>
                </span>
                <div className="flex flex-wrap items-center gap-3 text-[11px]">
                  <span className="text-[var(--md-on-surface-variant)]">
                    الرصيد: <strong className="font-mono text-[var(--md-on-surface)]">{currentCustBal.toLocaleString()} {currSym}</strong>
                  </span>
                  <span className="text-[var(--md-on-surface-variant)]">
                    السقف: <strong className="font-mono text-[var(--md-on-surface)]">{creditLimit.toLocaleString()} {currSym}</strong>
                  </span>
                  <span className="text-[var(--md-on-surface-variant)]">
                    المتاح: <strong className={`font-mono ${availableCredit <= 0 ? 'text-[var(--md-error)]' : 'text-[var(--md-success)]'}`}>{availableCredit.toLocaleString()} {currSym}</strong>
                  </span>
                </div>
              </div>
            )}
          </div>

          {(error || serverError) && (
            <div className="p-3.5 bg-[var(--md-error-container)] border border-[var(--md-error)]/30 rounded-xl text-[var(--md-on-error-container)] text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-[var(--md-error)]" />
              <span>{error || serverError}</span>
            </div>
          )}

          {/* Payment Method Selector Tabs */}
          <div>
            <label className="block text-xs font-bold text-[var(--md-on-surface-variant)] mb-2">طريقة الدفع:</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[
                { id: 'CASH', label: 'نقداً / كاش', icon: Banknote, color: 'text-[var(--md-primary-text)]' },
                { id: 'CARD', label: 'بطاقة / مدى', icon: CreditCard, color: 'text-[var(--md-info)]' },
                { id: 'BANK', label: 'تحويل بنكي', icon: Landmark, color: 'text-[var(--md-info)]' },
                { id: 'MOBILE', label: 'شبكة / محفظة', icon: Smartphone, color: 'text-[var(--md-secondary)]' },
                { id: 'CREDIT', label: 'آجل / حساب', icon: ArrowRight, color: 'text-[var(--md-warning)]' },
                { id: 'SPLIT', label: 'دفع مجزأ', icon: Layers, color: 'text-[var(--md-primary-text)]' },
              ].map((m) => {
                const isSelected = selectedMethod === m.id;
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setSelectedMethod(m.id as any);
                      setError(null);
                    }}
                    className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--md-primary-container)] border-[var(--md-primary)] ring-2 ring-[var(--md-primary)]/25 text-[var(--md-on-primary-container)] shadow-sm'
                        : 'bg-[var(--md-surface-container-low)] border-[var(--md-outline-variant)] text-[var(--md-on-surface-variant)] hover:bg-[var(--md-surface-container)] hover:text-[var(--md-on-surface)]'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-[var(--md-primary-text)]' : m.color}`} />
                    <span className="text-xs font-bold whitespace-nowrap">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cash Payment Options (Tendered & Change) */}
          {(selectedMethod === 'CASH' || selectedMethod === 'CARD' || selectedMethod === 'BANK' || selectedMethod === 'MOBILE') && (
            <div className="space-y-4 bg-[var(--md-surface-container-low)] p-4 rounded-2xl border border-[var(--md-outline-variant)]">
              <div>
                <label className="block text-xs font-semibold text-[var(--md-on-surface-variant)] mb-1.5">
                  المبلغ المسدد / المقبوض ({currSym}):
                </label>
                <div className="relative">
                  <DollarSign className="w-5 h-5 text-[var(--md-on-surface-variant)] absolute right-3.5 top-3" />
                  <input
                    type="text"
                    inputMode="decimal"
                    dir="ltr"
                    lang="en"
                    value={tenderedAmount || ''}
                    onChange={(e) => setTenderedAmount(parseEnglishNumber(e.target.value, 0))}
                    className="m3-input w-full pr-11 pl-4 py-2.5 text-lg font-black font-mono tabular-nums"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
              </div>

              {/* Quick Cash Presets */}
              {selectedMethod === 'CASH' && (
                <div>
                  <span className="text-[11px] font-medium text-[var(--md-on-surface-variant)] block mb-1.5">أزرار النقد السريع:</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setTenderedAmount(cartTotal)}
                      className="m3-btn-tonal px-3 py-1.5 text-xs font-bold tabular-nums"
                    >
                      المبلغ بالضبط ({cartTotal.toLocaleString()})
                    </button>
                    {quickPresets.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setTenderedAmount(preset)}
                        className="m3-btn-outlined px-3 py-1.5 text-xs font-medium tabular-nums"
                      >
                        +{preset.toLocaleString()} {currSym}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Change / Remaining Details */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-[var(--md-surface-container)] rounded-xl border border-[var(--md-outline-variant)]">
                  <span className="text-xs text-[var(--md-on-surface-variant)] block">المبلغ المتبقي (آجل):</span>
                  <span className={`text-base font-bold tabular-nums ${remainingAmount > 0 ? 'text-[var(--md-warning)]' : 'text-[var(--md-on-surface)]'}`}>
                    {remainingAmount.toLocaleString()} {currSym}
                  </span>
                </div>
                <div className="p-3 bg-[var(--md-success-container)] rounded-xl border border-[var(--md-success)]/30">
                  <span className="text-xs text-[var(--md-on-success-container)] block">الباقي للعميل (فكة):</span>
                  <span className="text-base font-black text-[var(--md-success)] tabular-nums">
                    {changeAmount.toLocaleString()} {currSym}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Split Payment Section */}
          {selectedMethod === 'SPLIT' && (
            <div className="space-y-3 bg-[var(--md-surface-container-low)] p-4 rounded-2xl border border-[var(--md-outline-variant)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[var(--md-on-surface)]">توزيع الدفعات المجزأة:</span>
                <button
                  type="button"
                  onClick={handleAddSplitRow}
                  className="m3-btn-tonal px-2.5 py-1 text-xs font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  إضافة طريقة
                </button>
              </div>

              {splitPayments.map((p, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={p.method}
                    onChange={(e) => handleUpdateSplitRow(idx, 'method', e.target.value)}
                    className="m3-select px-3 py-2 text-xs"
                  >
                    <option value="CASH">نقد / كاش</option>
                    <option value="CARD">بطاقة / مدى</option>
                    <option value="BANK">تحويل بنكي</option>
                    <option value="MOBILE">محفظة / شبكة</option>
                  </select>

                  <input
                    type="text"
                    inputMode="decimal"
                    dir="ltr"
                    lang="en"
                    value={p.amount || ''}
                    onChange={(e) => handleUpdateSplitRow(idx, 'amount', parseEnglishNumber(e.target.value, 0))}
                    placeholder="المبلغ"
                    className="m3-input flex-1 px-3 py-2 text-sm font-bold font-mono tabular-nums"
                  />

                  {splitPayments.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSplitRow(idx)}
                      className="p-2 text-[var(--md-on-surface-variant)] hover:text-[var(--md-error)] rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}

              <div className="flex items-center justify-between text-xs text-[var(--md-on-surface-variant)] pt-2 border-t border-[var(--md-outline-variant)] tabular-nums">
                <span>المسدد في التقسيم: <strong className="text-[var(--md-success)]">{paidAmount.toLocaleString()} {currSym}</strong></span>
                <span>المتبقي آجل: <strong className={remainingAmount > 0 ? 'text-[var(--md-warning)]' : 'text-[var(--md-on-surface-variant)]'}>{remainingAmount.toLocaleString()} {currSym}</strong></span>
              </div>
            </div>
          )}

          {/* Credit Limit Exceeded Alert (Blocks Credit/Partial Sale Until Resolved) */}
          {isCreditExceeded && (
            <div className="p-4 bg-[var(--md-error-container)] border border-[var(--md-error)]/35 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-[var(--md-error)] font-bold text-sm">
                <ShieldAlert className="w-5 h-5 shrink-0" />
                <span>تم منع البيع الآجل: تجاوز السقف الائتماني المفعّل للعميل!</span>
              </div>
              <p className="text-xs text-[var(--md-on-error-container)] leading-relaxed tabular-nums">
                رصيد العميل الحالي (<strong className="font-mono">{currentCustBal.toLocaleString()} {currSym}</strong>) + المتبقي الآجل (<strong className="font-mono">{remainingAmount.toLocaleString()} {currSym}</strong>) ={' '}
                <strong className="font-mono">{potentialDebt.toLocaleString()} {currSym}</strong> وهو أعلى من السقف المصرح به (<strong className="font-mono">{creditLimit.toLocaleString()} {currSym}</strong>).
                الحد الأدنى المطلوب تحصيله نقداً للسماح بإصدار الفاتورة هو{' '}
                <strong className="font-mono underline">{minimumCashToAllow.toLocaleString()} {currSym}</strong>.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMethod('CASH');
                    setTenderedAmount(minimumCashToAllow);
                    setError(null);
                  }}
                  className="m3-btn-tonal !min-h-[34px] px-3 py-1.5 text-xs font-bold tabular-nums cursor-pointer"
                >
                  تحصيل الحد الأدنى نقداً ({minimumCashToAllow.toLocaleString()} {currSym})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMethod('CASH');
                    setTenderedAmount(cartTotal);
                    setError(null);
                  }}
                  className="m3-btn-primary !min-h-[34px] px-3 py-1.5 text-xs font-bold tabular-nums cursor-pointer"
                >
                  تحويل لنقدي كامل ({cartTotal.toLocaleString()} {currSym})
                </button>
              </div>
            </div>
          )}

          {/* Received By */}
          <div>
            <label className="block text-xs font-semibold text-[var(--md-on-surface-variant)] mb-1 flex items-center justify-between">
              <span>المستلم / الساحب:</span>
              <span className="text-[10px] text-[var(--md-info)] font-normal">اختياري (سائق / مندوب / ابن العميل)</span>
            </label>
            <input
              type="text"
              value={receivedBy}
              onChange={(e) => setReceivedBy(e.target.value)}
              placeholder="مثال: ابن العميل / السائق محمد / رقم اللوحة..."
              className="m3-input w-full px-4 py-2 text-xs"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-[var(--md-on-surface-variant)] mb-1">ملاحظات الفاتورة (اختياري):</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي تفاصيل خاصة بالطلب أو التحصيل..."
              className="m3-input w-full px-4 py-2 text-xs"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--md-outline-variant)]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="m3-btn-outlined px-5 py-2.5 text-sm font-semibold"
            >
              رجوع
            </button>
            <button
              type="submit"
              disabled={loading || isCreditExceeded}
              title={isCreditExceeded ? 'لا يمكن الاعتماد الآجل: تم تجاوز السقف الائتماني للعميل' : undefined}
              className="m3-btn-primary px-8 py-2.5 text-base font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <span>جاري إصدار الفاتورة...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  إتمام البيع وطباعة الإيصال (Ctrl+Enter)
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
