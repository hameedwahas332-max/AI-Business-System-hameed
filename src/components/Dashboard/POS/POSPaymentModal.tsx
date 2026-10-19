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
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  DollarSign,
  Plus,
  Trash2,
} from 'lucide-react';
import { POSPaymentSplit } from '../../../types';
import { roundMoney } from '../../../lib/formatters';

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
  }) => void;
  loading: boolean;
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
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'CASH' | 'CARD' | 'BANK' | 'CREDIT' | 'SPLIT' | 'MOBILE'>('CASH');
  const [tenderedAmount, setTenderedAmount] = useState<number>(cartTotal);
  const [splitPayments, setSplitPayments] = useState<POSPaymentSplit[]>([
    { method: 'CASH', amount: Math.round(cartTotal / 2) },
    { method: 'CARD', amount: Math.round(cartTotal - Math.round(cartTotal / 2)) },
  ]);
  const [overrideCredit, setOverrideCredit] = useState(false);
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
      setOverrideCredit(false);
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

  // Credit Limit Check
  const currentCustBal = Number(customer?.current_balance || 0);
  const creditLimit = Number(customer?.credit_limit || 0);
  const potentialDebt = currentCustBal + remainingAmount;
  const isCreditExceeded = creditLimit > 0 && remainingAmount > 0 && potentialDebt > creditLimit;

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
    if (isCreditExceeded && !overrideCredit) {
      setError('لا يمكن إتمام البيع الآجل لتجاوز الحد الائتماني للعميل بدون تفعيل إذن التجاوز');
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
      overrideCreditLimit: overrideCredit,
      notes,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto" dir="rtl">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 bg-slate-800/70 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
              <Banknote className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">إتمام السداد وإصدار الفاتورة</h3>
              <p className="text-xs text-slate-400">اختر طريقة الدفع ومبلغ التحصيل</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Total Banner */}
          <div className="p-5 bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-xs font-semibold text-slate-400 block mb-1">المبلغ الإجمالي المستحق:</span>
              <div className="text-3xl font-black text-white tracking-tight">
                {cartTotal.toLocaleString()} <span className="text-emerald-400 text-lg font-bold">{currency}</span>
              </div>
            </div>

            <div className="text-left">
              <span className="text-xs text-slate-400 block">العميل المفوتر:</span>
              <span className="text-sm font-bold text-slate-200">
                {customer?.name || 'عميل نقدي عام'}
              </span>
              {customer?.id && (
                <div className="text-[11px] text-slate-400 mt-0.5">
                  الرصيد السابق: {currentCustBal.toLocaleString()} {currency}
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Payment Method Selector Tabs */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2">طريقة الدفع:</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[
                { id: 'CASH', label: 'نقداً / كاش', icon: Banknote, color: 'text-emerald-400 border-emerald-500/30' },
                { id: 'CARD', label: 'بطاقة / مدى', icon: CreditCard, color: 'text-blue-400 border-blue-500/30' },
                { id: 'BANK', label: 'تحويل بنكي', icon: Landmark, color: 'text-cyan-400 border-cyan-500/30' },
                { id: 'MOBILE', label: 'شبكة / محفظة', icon: Smartphone, color: 'text-purple-400 border-purple-500/30' },
                { id: 'CREDIT', label: 'آجل / حساب', icon: ArrowRight, color: 'text-amber-400 border-amber-500/30' },
                { id: 'SPLIT', label: 'دفع مجزأ', icon: Layers, color: 'text-indigo-400 border-indigo-500/30' },
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
                    className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                      isSelected
                        ? 'bg-slate-800 border-emerald-500 ring-2 ring-emerald-500/30 text-white shadow-lg'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span className="text-xs font-bold whitespace-nowrap">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cash Payment Options (Tendered & Change) */}
          {(selectedMethod === 'CASH' || selectedMethod === 'CARD' || selectedMethod === 'BANK' || selectedMethod === 'MOBILE') && (
            <div className="space-y-4 bg-slate-950/40 p-4 rounded-2xl border border-slate-800/80">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  المبلغ المسدد / المقبوض ({currency}):
                </label>
                <div className="relative">
                  <DollarSign className="w-5 h-5 text-slate-500 absolute right-3.5 top-3" />
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={tenderedAmount || ''}
                    onChange={(e) => setTenderedAmount(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pr-11 pl-4 py-2.5 text-lg font-black text-white focus:outline-none focus:border-emerald-500"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
              </div>

              {/* Quick Cash Presets */}
              {selectedMethod === 'CASH' && (
                <div>
                  <span className="text-[11px] font-medium text-slate-400 block mb-1.5">أزرار النقد السريع:</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setTenderedAmount(cartTotal)}
                      className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all"
                    >
                      المبلغ بالضبط ({cartTotal.toLocaleString()})
                    </button>
                    {quickPresets.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setTenderedAmount(preset)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-medium transition-all"
                      >
                        +{preset.toLocaleString()} {currency}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Change / Remaining Details */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 block">المبلغ المتبقي (آجل):</span>
                  <span className={`text-base font-bold ${remainingAmount > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                    {remainingAmount.toLocaleString()} {currency}
                  </span>
                </div>
                <div className="p-3 bg-emerald-950/30 rounded-xl border border-emerald-800/40">
                  <span className="text-xs text-emerald-300 block">الباقي للعميل (فكة):</span>
                  <span className="text-base font-black text-emerald-400">
                    {changeAmount.toLocaleString()} {currency}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Split Payment Section */}
          {selectedMethod === 'SPLIT' && (
            <div className="space-y-3 bg-slate-950/40 p-4 rounded-2xl border border-slate-800/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300">توزيع الدفعات المجزأة:</span>
                <button
                  type="button"
                  onClick={handleAddSplitRow}
                  className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 rounded-lg text-xs font-bold flex items-center gap-1"
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
                    className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="CASH">نقد / كاش</option>
                    <option value="CARD">بطاقة / مدى</option>
                    <option value="BANK">تحويل بنكي</option>
                    <option value="MOBILE">محفظة / شبكة</option>
                  </select>

                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={p.amount || ''}
                    onChange={(e) => handleUpdateSplitRow(idx, 'amount', parseFloat(e.target.value) || 0)}
                    placeholder="المبلغ"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-bold focus:outline-none focus:border-indigo-500"
                  />

                  {splitPayments.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSplitRow(idx)}
                      className="p-2 text-slate-500 hover:text-rose-400 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}

              <div className="flex items-center justify-between text-xs text-slate-300 pt-2 border-t border-slate-800">
                <span>المسدد في التقسيم: <strong className="text-emerald-400">{paidAmount.toLocaleString()} {currency}</strong></span>
                <span>المتبقي آجل: <strong className={remainingAmount > 0 ? 'text-amber-400' : 'text-slate-400'}>{remainingAmount.toLocaleString()} {currency}</strong></span>
              </div>
            </div>
          )}

          {/* Credit Limit Alert & Override */}
          {isCreditExceeded && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <ShieldAlert className="w-5 h-5" />
                <span>تنبيه: تجاوز سقف الائتمان للعميل!</span>
              </div>
              <p className="text-xs text-slate-300">
                رصيد العميل الحالي ({currentCustBal.toLocaleString()} {currency}) + المستحق الجديد ({remainingAmount.toLocaleString()} {currency}) = <strong>{potentialDebt.toLocaleString()} {currency}</strong> وهو أعلى من الحد المصرح به ({creditLimit.toLocaleString()} {currency}).
              </p>
              <label className="flex items-center gap-2 text-xs font-bold text-amber-300 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={overrideCredit}
                  onChange={(e) => setOverrideCredit(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-500"
                />
                السماح بالتجاوز وإتمام البيع الآجل (صلاحية مدير نقطة البيع)
              </label>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">ملاحظات الفاتورة (اختياري):</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي تفاصيل خاصة بالطلب أو التحصيل..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-sm font-semibold transition-colors"
            >
              رجوع
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-base font-bold shadow-xl shadow-emerald-950/40 transition-all flex items-center gap-2"
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
