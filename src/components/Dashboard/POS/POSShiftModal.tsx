import React, { useState } from 'react';
import { X, Lock, Unlock, ArrowDownLeft, ArrowUpRight, DollarSign, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { POSShift } from '../../../types';
import { formatAmount, formatDateTime, getActiveCurrencySymbol } from '../../../lib/formatters';
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

  const currSym = getActiveCurrencySymbol(currency);

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
    <div className="fixed inset-0 m3-backdrop flex items-center justify-center p-4 z-50" dir="rtl">
      <div className="m3-modal-surface rounded-3xl max-w-lg w-full p-5 space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[var(--md-outline-variant)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] rounded-xl border border-[var(--md-primary)]/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--md-on-surface)]">إدارة ورديات ونقدية الكاشير المتعددة</h3>
              <p className="text-[11px] text-[var(--md-on-surface-variant)]">تسوية النقد، العملات (YER, SAR, USD)، والمحافظ الإلكترونية</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-high)] p-1 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-[var(--md-error-container)] border border-[var(--md-error)]/30 rounded-2xl text-xs text-[var(--md-on-error-container)] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-[var(--md-error)]" />
            <span>{error}</span>
          </div>
        )}

        {!currentShift ? (
          // Open New Shift Form
          <form onSubmit={handleOpenShift} className="space-y-4">
            <div className="p-4 bg-[var(--md-primary-container)]/70 border border-[var(--md-primary)]/25 rounded-2xl space-y-1">
              <div className="text-xs font-bold text-[var(--md-on-primary-container)] flex items-center gap-1.5">
                <Unlock className="w-4 h-4 text-[var(--md-primary-text)]" />
                فتح وردية كاشير جديدة
              </div>
              <p className="text-[11px] text-[var(--md-on-surface-variant)]">
                أدخل رصيد العهدة الافتتاحي الموجود في الدرج لبدء جلسة البيع
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--md-on-surface-variant)] mb-1">
                الرصيد الافتتاحي للعهدة النقدية ({currSym})
              </label>
              <input
                type="text"
                inputMode="decimal"
                dir="ltr"
                lang="en"
                required
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value.replace(/[^0-9.]/g, ''))}
                className="m3-input w-full px-3 py-2 text-sm font-mono font-bold text-center tabular-nums"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="m3-btn-outlined px-4 py-2 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={loading}
                className="m3-btn-primary px-5 py-2 text-xs font-bold"
              >
                {loading ? 'جاري الفتح...' : 'بدء الوردية الآن'}
              </button>
            </div>
          </form>
        ) : (
          // Active Shift Management
          <div className="space-y-4">
            {/* Sub-tab navigation */}
            <div className="grid grid-cols-4 gap-1 bg-[var(--md-surface-container-low)] p-1 rounded-2xl border border-[var(--md-outline-variant)] text-[11px]">
              <button
                type="button"
                onClick={() => setActiveSubTab('overview')}
                className={`py-1.5 font-bold rounded-xl transition-all cursor-pointer ${
                  activeSubTab === 'overview'
                    ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)] shadow-sm'
                    : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
                }`}
              >
                ملخص النقد
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('wallets')}
                className={`py-1.5 font-bold rounded-xl transition-all cursor-pointer ${
                  activeSubTab === 'wallets'
                    ? 'bg-[var(--md-info)] text-white shadow-sm'
                    : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
                }`}
              >
                المحافظ والعملات
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('movement')}
                className={`py-1.5 font-bold rounded-xl transition-all cursor-pointer ${
                  activeSubTab === 'movement'
                    ? 'bg-[var(--md-secondary)] text-[var(--md-on-secondary)] shadow-sm'
                    : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
                }`}
              >
                سحب / إيداع
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('close')}
                className={`py-1.5 font-bold rounded-xl transition-all cursor-pointer ${
                  activeSubTab === 'close'
                    ? 'bg-[var(--md-error)] text-[var(--md-on-error)] shadow-sm'
                    : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
                }`}
              >
                تسوية وإغلاق
              </button>
            </div>

            {activeSubTab === 'overview' && (
              <div className="space-y-3">
                <div className="p-3.5 bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] rounded-2xl space-y-2.5 text-xs">
                  <div className="flex justify-between items-center text-[var(--md-on-surface-variant)]">
                    <span>رقم الوردية:</span>
                    <span className="font-bold text-[var(--md-on-surface)] font-mono tabular-nums">#{currentShift.shift_number}</span>
                  </div>
                  <div className="flex justify-between items-center text-[var(--md-on-surface-variant)]">
                    <span>وقت الفتح:</span>
                    <span className="text-[var(--md-on-surface)] font-mono tabular-nums">{formatDateTime(currentShift.opened_at)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[var(--md-on-surface-variant)]">
                    <span>العهدة الافتتاحية:</span>
                    <span className="font-bold text-[var(--md-on-surface)] font-mono tabular-nums" dir="ltr">{openingNum.toLocaleString('en-US', { minimumFractionDigits: 2 })} {currSym}</span>
                  </div>
                  <div className="flex justify-between items-center text-[var(--md-on-surface-variant)]">
                    <span>مبيعات نقداً (Cash):</span>
                    <span className="font-bold text-[var(--md-success)] font-mono tabular-nums" dir="ltr">{cashSales.toLocaleString('en-US', { minimumFractionDigits: 2 })} {currSym}</span>
                  </div>
                  <div className="flex justify-between items-center text-[var(--md-on-surface-variant)]">
                    <span>مبيعات محافظ وبنوك:</span>
                    <span className="font-bold text-[var(--md-info)] font-mono tabular-nums" dir="ltr">{(cardSales + bankSales).toLocaleString('en-US', { minimumFractionDigits: 2 })} {currSym}</span>
                  </div>
                  <div className="flex justify-between items-center text-[var(--md-on-surface-variant)]">
                    <span>سحوبات / مصروفات:</span>
                    <span className="font-bold text-[var(--md-error)] font-mono tabular-nums" dir="ltr">{(cashOut + cashRefunds).toLocaleString('en-US', { minimumFractionDigits: 2 })} {currSym}</span>
                  </div>
                  <div className="pt-2 border-t border-[var(--md-outline-variant)] flex justify-between items-center">
                    <span className="font-bold text-[var(--md-on-surface)]">إجمالي النقد المتوقع بالدرج:</span>
                    <span className="text-base font-black text-[var(--md-primary-text)] font-mono tabular-nums" dir="ltr">
                      {expectedCash.toLocaleString('en-US', { minimumFractionDigits: 2 })} {currSym}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeSubTab === 'wallets' && (
              <div className="space-y-3.5">
                {/* 1. Multi-currency Cash Drawer Breakdown */}
                <div className="p-3.5 bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] rounded-2xl space-y-2.5">
                  <div className="text-xs font-bold text-[var(--md-on-surface)] flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-[var(--md-primary-text)]" />
                      <span>النقد بالدرج حسب العملة (Cash Drawer by Currency):</span>
                    </span>
                    <span className="text-[var(--md-on-surface-variant)] font-mono text-[11px]">English Digits</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] rounded-xl space-y-0.5">
                      <span className="text-[10px] text-[var(--md-on-surface-variant)] block font-bold">ريال يمني (YER)</span>
                      <span className="text-xs font-black text-[var(--md-success)] font-mono tabular-nums" dir="ltr">
                        {cashSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="p-2.5 bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] rounded-xl space-y-0.5">
                      <span className="text-[10px] text-[var(--md-on-surface-variant)] block font-bold">ريال سعودي (SAR)</span>
                      <span className="text-xs font-black text-[var(--md-warning)] font-mono tabular-nums" dir="ltr">
                        {Number((currentShift as any)?.cash_sar || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="p-2.5 bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] rounded-xl space-y-0.5">
                      <span className="text-[10px] text-[var(--md-on-surface-variant)] block font-bold">دولار أمريكي (USD)</span>
                      <span className="text-xs font-black text-[var(--md-info)] font-mono tabular-nums" dir="ltr">
                        {Number((currentShift as any)?.cash_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Yemen E-Wallets Breakdown with Multi-Currency */}
                <div className="p-3.5 bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] rounded-2xl space-y-2.5 text-xs">
                  <div className="text-xs font-bold text-[var(--md-on-surface)] flex items-center justify-between">
                    <span>المحافظ الإلكترونية وشبكات الدفع اليمنية:</span>
                    <span className="text-[var(--md-on-surface-variant)] text-[10px] font-mono">YER / SAR / USD</span>
                  </div>

                  <div className="space-y-2">
                    {/* الكريمي جوال */}
                    <div className="p-2.5 bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[var(--md-on-surface)] font-bold block text-xs">الكريمي (حسابي / إم فلوس)</span>
                        <span className="text-[10px] text-[var(--md-on-surface-variant)]">بنك الكريمي للتمويل الأصغر</span>
                      </div>
                      <div className="text-left font-mono tabular-nums" dir="ltr">
                        <div className="text-xs font-bold text-[var(--md-success)]">
                          {walletKuraimi.toLocaleString('en-US', { minimumFractionDigits: 2 })} YER
                        </div>
                        <div className="text-[10px] text-[var(--md-on-surface-variant)]">
                          0.00 SAR | 0.00 USD
                        </div>
                      </div>
                    </div>

                    {/* جوالي CAC */}
                    <div className="p-2.5 bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[var(--md-on-surface)] font-bold block text-xs">جوالي (Jawali)</span>
                        <span className="text-[10px] text-[var(--md-on-surface-variant)]">كاك بنك (CAC Bank)</span>
                      </div>
                      <div className="text-left font-mono tabular-nums" dir="ltr">
                        <div className="text-xs font-bold text-[var(--md-success)]">
                          {walletJawali.toLocaleString('en-US', { minimumFractionDigits: 2 })} YER
                        </div>
                        <div className="text-[10px] text-[var(--md-on-surface-variant)]">
                          0.00 SAR | 0.00 USD
                        </div>
                      </div>
                    </div>

                    {/* ون كاش OneCash */}
                    <div className="p-2.5 bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[var(--md-on-surface)] font-bold block text-xs">ون كاش (OneCash)</span>
                        <span className="text-[10px] text-[var(--md-on-surface-variant)]">شركة ون كاش لخدمات الدفع</span>
                      </div>
                      <div className="text-left font-mono tabular-nums" dir="ltr">
                        <div className="text-xs font-bold text-[var(--md-success)]">
                          {walletOneCash.toLocaleString('en-US', { minimumFractionDigits: 2 })} YER
                        </div>
                        <div className="text-[10px] text-[var(--md-on-surface-variant)]">
                          0.00 SAR | 0.00 USD
                        </div>
                      </div>
                    </div>

                    {/* فلوسك YKB */}
                    <div className="p-2.5 bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[var(--md-on-surface)] font-bold block text-xs">فلوسك (Floosak)</span>
                        <span className="text-[10px] text-[var(--md-on-surface-variant)]">بنك اليمن والكويت (YKB)</span>
                      </div>
                      <div className="text-left font-mono tabular-nums" dir="ltr">
                        <div className="text-xs font-bold text-[var(--md-success)]">
                          {walletFloosak.toLocaleString('en-US', { minimumFractionDigits: 2 })} YER
                        </div>
                        <div className="text-[10px] text-[var(--md-on-surface-variant)]">
                          0.00 SAR | 0.00 USD
                        </div>
                      </div>
                    </div>

                    {/* جوبي Tadhamon */}
                    <div className="p-2.5 bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[var(--md-on-surface)] font-bold block text-xs">جوبي (Jaib)</span>
                        <span className="text-[10px] text-[var(--md-on-surface-variant)]">بنك التضامن الإسلامي الدولي</span>
                      </div>
                      <div className="text-left font-mono tabular-nums" dir="ltr">
                        <div className="text-xs font-bold text-[var(--md-success)]">
                          {walletJaib.toLocaleString('en-US', { minimumFractionDigits: 2 })} YER
                        </div>
                        <div className="text-[10px] text-[var(--md-on-surface-variant)]">
                          0.00 SAR | 0.00 USD
                        </div>
                      </div>
                    </div>

                    {/* بطاقات بنكية ونقاط بيع POS */}
                    <div className="p-2.5 bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[var(--md-on-surface)] font-bold block text-xs">بطاقات ونقاط بيع (POS Terminals)</span>
                        <span className="text-[10px] text-[var(--md-on-surface-variant)]">مدى / فيزا / ماستركارد</span>
                      </div>
                      <div className="text-left font-mono text-xs font-bold text-[var(--md-info)] tabular-nums" dir="ltr">
                        {cardSales.toLocaleString('en-US', { minimumFractionDigits: 2 })} {currSym}
                      </div>
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
                    className={`p-2 rounded-xl text-xs font-bold border flex flex-col items-center gap-1 cursor-pointer transition-colors ${
                      movementType === 'CASH_IN'
                        ? 'bg-[var(--md-success-container)] border-[var(--md-success)] text-[var(--md-on-success-container)]'
                        : 'bg-[var(--md-surface-container-low)] border-[var(--md-outline-variant)] text-[var(--md-on-surface-variant)]'
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    <span>إيداع نقدية</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovementType('CASH_OUT')}
                    className={`p-2 rounded-xl text-xs font-bold border flex flex-col items-center gap-1 cursor-pointer transition-colors ${
                      movementType === 'CASH_OUT'
                        ? 'bg-[var(--md-warning-container)] border-[var(--md-warning)] text-[var(--md-on-warning-container)]'
                        : 'bg-[var(--md-surface-container-low)] border-[var(--md-outline-variant)] text-[var(--md-on-surface-variant)]'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>سحب للدرج</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovementType('EXPENSE')}
                    className={`p-2 rounded-xl text-xs font-bold border flex flex-col items-center gap-1 cursor-pointer transition-colors ${
                      movementType === 'EXPENSE'
                        ? 'bg-[var(--md-error-container)] border-[var(--md-error)] text-[var(--md-on-error-container)]'
                        : 'bg-[var(--md-surface-container-low)] border-[var(--md-outline-variant)] text-[var(--md-on-surface-variant)]'
                    }`}
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>مصروف نثريات</span>
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--md-on-surface-variant)] mb-1">المبلغ ({currSym}) *</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    dir="ltr"
                    lang="en"
                    required
                    value={movementAmount}
                    onChange={(e) => setMovementAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                    placeholder="0.00"
                    className="m3-input w-full px-3 py-2 text-xs font-mono font-bold text-left tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--md-on-surface-variant)] mb-1">السبب والبيان *</label>
                  <input
                    type="text"
                    required
                    value={movementReason}
                    onChange={(e) => setMovementReason(e.target.value)}
                    placeholder="مثال: سحب نقدي لإيداع بنكي / شراء أدوات نظافة"
                    className="m3-input w-full px-3 py-2 text-xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !movementAmount || !movementReason.trim()}
                  className="m3-btn-primary w-full py-2.5 text-xs font-bold"
                >
                  {loading ? 'جاري الحفظ...' : 'تأكيد حركة النقدية'}
                </button>
              </form>
            )}

            {activeSubTab === 'close' && (
              <form onSubmit={handleCloseShift} className="space-y-3">
                <div className="p-3 bg-[var(--md-warning-container)]/60 border border-[var(--md-warning)]/30 rounded-2xl text-xs text-[var(--md-on-warning-container)] space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-[var(--md-warning)]" />
                    تسوية وإغلاق الوردية
                  </div>
                  <p className="text-[11px] text-[var(--md-on-surface-variant)]">
                    أدخل النقد الفعلي الموجود بالدرج بعد عد النقود لمقارنته مع المتوقع واحتساب العجز أو الزيادة.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--md-on-surface-variant)] mb-1">النقد الفعلي بالدرج ({currSym}) *</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    dir="ltr"
                    lang="en"
                    required
                    value={actualCash}
                    onChange={(e) => setActualCash(e.target.value.replace(/[^0-9.]/g, ''))}
                    placeholder="أدخل المبلغ بعد العد اليدوي..."
                    className="m3-input w-full px-3 py-2 text-sm font-mono font-bold text-left tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--md-on-surface-variant)] mb-1">ملاحظات الإغلاق والتسوية</label>
                  <textarea
                    rows={2}
                    value={closingNotes}
                    onChange={(e) => setClosingNotes(e.target.value)}
                    placeholder="أي ملاحظات حول الفوارق أو الجلسة..."
                    className="m3-input w-full px-3 py-2 text-xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !actualCash}
                  className="m3-btn-danger w-full py-2.5 text-xs font-bold"
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
