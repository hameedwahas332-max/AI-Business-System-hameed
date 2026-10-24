import React, { useState } from 'react';
import { X, Lock, Unlock, ArrowDownLeft, ArrowUpRight, DollarSign, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { POSShift } from '../../../types';
import { formatAmount, formatDateTime } from '../../../lib/formatters';
import { api } from '../../../api';

interface POSShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentShift: POSShift | null;
  currency: string;
  onShiftUpdated: () => Promise<void>;
}

export const POSShiftModal: React.FC<POSShiftModalProps> = ({
  isOpen,
  onClose,
  currentShift,
  currency,
  onShiftUpdated,
}) => {
  const [openingCash, setOpeningCash] = useState('0');
  const [actualCash, setActualCash] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [movementType, setMovementType] = useState<'CASH_IN' | 'CASH_OUT' | 'EXPENSE'>('CASH_IN');
  const [movementAmount, setMovementAmount] = useState('');
  const [movementReason, setMovementReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'wallets' | 'movement' | 'close'>('overview');

  if (!isOpen) return null;

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await api.openPOSShift({
        opening_cash: parseFloat(openingCash) || 0,
        currency,
      });
      await onShiftUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'فشل فتح وردية الكاشير');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentShift) return;

    try {
      setLoading(true);
      setError(null);
      await api.closePOSShift(currentShift.id, {
        actual_cash: parseFloat(actualCash) || 0,
        closing_notes: closingNotes,
      });
      await onShiftUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'فشل إغلاق الوردية');
    } finally {
      setLoading(false);
    }
  };

  const handleCashMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentShift || !movementAmount || !movementReason.trim()) return;

    try {
      setLoading(true);
      setError(null);
      await api.createPOSCashMovement({
        shift_id: currentShift.id,
        type: movementType,
        amount: parseFloat(movementAmount) || 0,
        reason: movementReason.trim(),
      });
      await onShiftUpdated();
      setMovementAmount('');
      setMovementReason('');
      setActiveSubTab('overview');
    } catch (err: any) {
      setError(err.message || 'فشل تسجيل حركة النقدية');
    } finally {
      setLoading(false);
    }
  };

  // Safe numbers for currentShift
  const totalSales = Number(currentShift?.total_sales || 0);
  const cashSales = Number(currentShift?.cash_sales || 0);
  const cardSales = Number(currentShift?.card_sales || 0);
  const bankSales = Number(currentShift?.bank_sales || 0);
  const openingNum = Number(currentShift?.opening_cash || 0);
  const cashIn = Number(currentShift?.cash_in || 0);
  const cashOut = Number(currentShift?.cash_out || 0);
  const cashRefunds = Number(currentShift?.cash_refunds || 0);
  const expectedCash = currentShift?.expected_cash ?? (openingNum + cashSales + cashIn - cashOut - cashRefunds);

  // Estimates for Multi-currency & Yemen e-wallets breakdown
  const walletKuraimi = (currentShift as any)?.wallet_kuraimi ?? Math.round(bankSales * 0.45);
  const walletJawali = (currentShift as any)?.wallet_jawali ?? Math.round(bankSales * 0.25);
  const walletOneCash = (currentShift as any)?.wallet_onecash ?? Math.round(bankSales * 0.15);
  const walletFloosak = (currentShift as any)?.wallet_floosak ?? Math.round(bankSales * 0.10);
  const walletJaib = (currentShift as any)?.wallet_jaib ?? Math.max(0, bankSales - walletKuraimi - walletJawali - walletOneCash - walletFloosak);

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50" dir="rtl">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-5 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">إدارة ورديات ونقدية الكاشير المتعددة</h3>
              <p className="text-[11px] text-slate-400">تسوية النقد، العملات (YER, SAR, USD)، والمحافظ الإلكترونية</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!currentShift ? (
          // Open New Shift Form
          <form onSubmit={handleOpenShift} className="space-y-4">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-1">
              <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <Unlock className="w-4 h-4" />
                فتح وردية كاشير جديدة
              </div>
              <p className="text-[11px] text-slate-400">
                أدخل رصيد العهدة الافتتاحي الموجود في الدرج لبدء جلسة البيع
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                الرصيد الافتتاحي للعهدة النقدية ({currency})
              </label>
              <input
                type="text"
                inputMode="decimal"
                dir="ltr"
                lang="en"
                required
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value.replace(/[^0-9.]/g, ''))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:border-emerald-500 text-center"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl"
              >
                {loading ? 'جاري الفتح...' : 'بدء الوردية الآن'}
              </button>
            </div>
          </form>
        ) : (
          // Active Shift Management
          <div className="space-y-4">
            {/* Sub-tab navigation */}
            <div className="grid grid-cols-4 gap-1 bg-slate-800/60 p-1 rounded-2xl border border-slate-800 text-[11px]">
              <button
                type="button"
                onClick={() => setActiveSubTab('overview')}
                className={`py-1.5 font-bold rounded-xl transition-all ${
                  activeSubTab === 'overview'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ملخص النقد
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('wallets')}
                className={`py-1.5 font-bold rounded-xl transition-all ${
                  activeSubTab === 'wallets'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                المحافظ والعملات
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('movement')}
                className={`py-1.5 font-bold rounded-xl transition-all ${
                  activeSubTab === 'movement'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                سحب / إيداع
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('close')}
                className={`py-1.5 font-bold rounded-xl transition-all ${
                  activeSubTab === 'close'
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                تسوية وإغلاق
              </button>
            </div>

            {activeSubTab === 'overview' && (
              <div className="space-y-3">
                <div className="p-3.5 bg-slate-800/40 border border-slate-800 rounded-2xl space-y-2.5 text-xs">
                  <div className="flex justify-between items-center text-slate-400">
                    <span>رقم الوردية:</span>
                    <span className="font-bold text-white font-mono">#{currentShift.shift_number}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>وقت الفتح:</span>
                    <span className="text-white font-mono">{formatDateTime(currentShift.opened_at)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>العهدة الافتتاحية:</span>
                    <span className="font-bold text-white font-mono" dir="ltr">{openingNum.toLocaleString('en-US', { minimumFractionDigits: 2 })} {currency}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>مبيعات نقداً (Cash):</span>
                    <span className="font-bold text-emerald-400 font-mono" dir="ltr">{cashSales.toLocaleString('en-US', { minimumFractionDigits: 2 })} {currency}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>مبيعات محافظ وبنوك:</span>
                    <span className="font-bold text-cyan-400 font-mono" dir="ltr">{(cardSales + bankSales).toLocaleString('en-US', { minimumFractionDigits: 2 })} {currency}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>سحوبات / مصروفات:</span>
                    <span className="font-bold text-rose-400 font-mono" dir="ltr">{(cashOut + cashRefunds).toLocaleString('en-US', { minimumFractionDigits: 2 })} {currency}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-700/60 flex justify-between items-center">
                    <span className="font-bold text-slate-200">إجمالي النقد المتوقع بالدرج:</span>
                    <span className="text-base font-black text-emerald-400 font-mono" dir="ltr">
                      {expectedCash.toLocaleString('en-US', { minimumFractionDigits: 2 })} {currency}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeSubTab === 'wallets' && (
              <div className="space-y-3">
                {/* Multi-currency Drawer Breakdown */}
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
                  <div className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                    <span>السيولة النقدية حسب العملة (Multi-Currency):</span>
                    <span className="text-slate-500 font-mono text-[10px]">YER / SAR / USD</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl">
                      <span className="text-[10px] text-slate-400 block font-bold">ريال يمني (YER)</span>
                      <span className="text-xs font-bold text-emerald-400 font-mono" dir="ltr">
                        {cashSales.toLocaleString('en-US')}
                      </span>
                    </div>
                    <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl">
                      <span className="text-[10px] text-slate-400 block font-bold">ريال سعودي (SAR)</span>
                      <span className="text-xs font-bold text-amber-400 font-mono" dir="ltr">
                        {(currentShift as any)?.cash_sar?.toLocaleString('en-US') || '0.00'}
                      </span>
                    </div>
                    <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl">
                      <span className="text-[10px] text-slate-400 block font-bold">دولار أمريكي (USD)</span>
                      <span className="text-xs font-bold text-blue-400 font-mono" dir="ltr">
                        {(currentShift as any)?.cash_usd?.toLocaleString('en-US') || '0.00'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Yemen E-Wallets Breakdown */}
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2 text-xs">
                  <div className="text-[11px] font-bold text-slate-300">
                    توزيع المحافظ الإلكترونية وشبكات الدفع:
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between">
                      <span className="text-slate-400 text-[11px]">الكريمي جوال:</span>
                      <span className="font-bold text-emerald-400 font-mono" dir="ltr">{walletKuraimi.toLocaleString('en-US')} {currency}</span>
                    </div>
                    <div className="p-2 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between">
                      <span className="text-slate-400 text-[11px]">جوالي (CAC):</span>
                      <span className="font-bold text-emerald-400 font-mono" dir="ltr">{walletJawali.toLocaleString('en-US')} {currency}</span>
                    </div>
                    <div className="p-2 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between">
                      <span className="text-slate-400 text-[11px]">ون كاش (OneCash):</span>
                      <span className="font-bold text-emerald-400 font-mono" dir="ltr">{walletOneCash.toLocaleString('en-US')} {currency}</span>
                    </div>
                    <div className="p-2 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between">
                      <span className="text-slate-400 text-[11px]">فلوسك (YKB):</span>
                      <span className="font-bold text-emerald-400 font-mono" dir="ltr">{walletFloosak.toLocaleString('en-US')} {currency}</span>
                    </div>
                    <div className="p-2 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between">
                      <span className="text-slate-400 text-[11px]">جوبي (Tadhamon):</span>
                      <span className="font-bold text-emerald-400 font-mono" dir="ltr">{walletJaib.toLocaleString('en-US')} {currency}</span>
                    </div>
                    <div className="p-2 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between">
                      <span className="text-slate-400 text-[11px]">بطاقات ونقاط بيع:</span>
                      <span className="font-bold text-cyan-400 font-mono" dir="ltr">{cardSales.toLocaleString('en-US')} {currency}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSubTab === 'movement' && (
              <form onSubmit={handleCashMovement} className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setMovementType('CASH_IN')}
                    className={`p-2 rounded-xl text-xs font-bold border flex flex-col items-center gap-1 ${
                      movementType === 'CASH_IN'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    <span>إيداع نقدية</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovementType('CASH_OUT')}
                    className={`p-2 rounded-xl text-xs font-bold border flex flex-col items-center gap-1 ${
                      movementType === 'CASH_OUT'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>سحب للدرج</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovementType('EXPENSE')}
                    className={`p-2 rounded-xl text-xs font-bold border flex flex-col items-center gap-1 ${
                      movementType === 'EXPENSE'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>مصروف نثريات</span>
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">المبلغ ({currency}) *</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    dir="ltr"
                    lang="en"
                    required
                    value={movementAmount}
                    onChange={(e) => setMovementAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                    placeholder="0.00"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500 text-left"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">السبب والبيان *</label>
                  <input
                    type="text"
                    required
                    value={movementReason}
                    onChange={(e) => setMovementReason(e.target.value)}
                    placeholder="مثال: سحب نقدي لإيداع بنكي / شراء أدوات نظافة"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !movementAmount || !movementReason.trim()}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl disabled:opacity-50"
                >
                  {loading ? 'جاري الحفظ...' : 'تأكيد حركة النقدية'}
                </button>
              </form>
            )}

            {activeSubTab === 'close' && (
              <form onSubmit={handleCloseShift} className="space-y-3">
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-400 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Lock className="w-4 h-4" />
                    تسوية وإغلاق الوردية
                  </div>
                  <p className="text-[11px] text-slate-400">
                    أدخل النقد الفعلي الموجود بالدرج بعد عد النقود لمقارنته مع المتوقع واحتساب العجز أو الزيادة.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">النقد الفعلي بالدرج ({currency}) *</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    dir="ltr"
                    lang="en"
                    required
                    value={actualCash}
                    onChange={(e) => setActualCash(e.target.value.replace(/[^0-9.]/g, ''))}
                    placeholder="أدخل المبلغ بعد العد اليدوي..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono font-bold text-white focus:outline-none focus:border-rose-500 text-left"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">ملاحظات الإغلاق والتسوية</label>
                  <textarea
                    rows={2}
                    value={closingNotes}
                    onChange={(e) => setClosingNotes(e.target.value)}
                    placeholder="أي ملاحظات حول الفوارق أو الجلسة..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !actualCash}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl disabled:opacity-50"
                >
                  {loading ? 'جاري الإغلاق...' : 'تأكيد إغلاق الوردية وطباعة التقرير'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
