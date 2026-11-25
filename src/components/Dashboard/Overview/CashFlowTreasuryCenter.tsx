import React, { useState } from 'react';
import { formatAmount } from '../../../lib/formatters';
import { TabType } from '../../Sidebar';
import {
  Landmark,
  Wallet,
  Coins,
  ArrowUpRight,
  CreditCard,
  Building2,
  CheckCircle2,
  Smartphone,
  ArrowDownLeft,
  ArrowUp,
  Receipt,
  PiggyBank,
} from 'lucide-react';

interface CashFlowTreasuryCenterProps {
  stats?: any;
  treasuryData?: any;
  currency?: string;
  onNavigate?: (tab: TabType, extra?: any) => void;
}

export const CashFlowTreasuryCenter: React.FC<CashFlowTreasuryCenterProps> = ({
  stats = {} as any,
  treasuryData = {} as any,
  currency = 'SAR',
  onNavigate,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'balances' | 'daily_movement'>('balances');

  const isClean = typeof window !== 'undefined' && (
    localStorage.getItem('erp_clean_production_mode_v1') === 'true' ||
    localStorage.getItem('erp_sample_data_cleaned') === 'true'
  );

  const totalLiquidity = Number(stats?.balances?.cashAndBankBalance ?? stats?.cashBankBalance ?? (
    Number(stats?.balances?.cashBalance ?? 0) + Number(stats?.balances?.bankBalance ?? 0) + Number(stats?.balances?.walletBalance ?? 0)
  ) ?? 0);

  // Split balances from real accounting data
  const rawCash = Number(stats?.balances?.cashBalance ?? stats?.cashBalance ?? stats?.treasuryBreakdown?.cash ?? 0);
  const rawBank = Number(stats?.balances?.bankBalance ?? stats?.bankBalance ?? stats?.treasuryBreakdown?.bank ?? 0);
  const rawWallet = Number(stats?.balances?.walletBalance ?? stats?.walletBalance ?? stats?.treasuryBreakdown?.wallet ?? 0);

  let cashOnHand = rawCash;
  let bankAccounts = rawBank;
  let eWallets = rawWallet;

  // Fallback split only if all three are zero and totalLiquidity > 0
  if (cashOnHand === 0 && bankAccounts === 0 && eWallets === 0 && totalLiquidity > 0) {
    cashOnHand = Math.round(totalLiquidity * 0.45);
    bankAccounts = Math.round(totalLiquidity * 0.40);
    eWallets = Math.max(0, totalLiquidity - cashOnHand - bankAccounts);
  }

  const effectiveTotal = (cashOnHand + bankAccounts + eWallets) || totalLiquidity || 1;
  const cashPct = Math.round((cashOnHand / effectiveTotal) * 100);
  const bankPct = Math.round((bankAccounts / effectiveTotal) * 100);
  const walletPct = Math.max(0, 100 - cashPct - bankPct);

  // Daily Receipts vs Disbursements vs Expenses
  const todayReceipts = Number(stats?.payments?.todayReceipts ?? 0);
  const todayDisbursements = Number(stats?.payments?.todayDisbursements ?? 0);
  const todayExpenses = Number(stats?.payments?.todayExpenses ?? 0);
  const todayNetCashFlow = todayReceipts - todayDisbursements - todayExpenses;

  const treasuryItems = [
    {
      id: 'cash-register',
      name: 'الصندوق النقدي الرئيسي',
      subtitle: 'حساب 1101 • خزينة الكاشير والمكتب',
      balance: cashOnHand,
      type: 'CASH',
      pct: cashPct,
      color: 'bg-[var(--md-primary)]',
      iconTone: 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)]',
      icon: Coins,
      badge: 'فوري',
    },
    {
      id: 'bank-accounts',
      name: 'الحسابات البنكية المعتمدة',
      subtitle: 'حساب 1102 • حسابات جارية وودائع بنكية',
      balance: bankAccounts,
      type: 'BANK',
      pct: bankPct,
      color: 'bg-[var(--md-info)]',
      iconTone: 'bg-[var(--md-info-container)] text-[var(--md-on-info-container)]',
      icon: Landmark,
      badge: 'جاري',
    },
    {
      id: 'e-wallets',
      name: 'المحافظ الإلكترونية (اليمن والخليج)',
      subtitle: 'حساب 1107 • الكريمي • جوالي • ون كاش • فلوسك',
      balance: eWallets,
      type: 'WALLET',
      pct: walletPct,
      color: 'bg-[var(--md-secondary)]',
      iconTone: 'bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)]',
      icon: Smartphone,
      badge: 'رقمي',
    },
  ];

  return (
    <div className="m3-card p-5 sm:p-6 space-y-4 text-right flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--md-outline-variant)] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[var(--md-info-container)] text-[var(--md-on-info-container)] flex items-center justify-center shrink-0">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--md-on-surface)]">مركز الخزينة وإدارة السيولة</h3>
            <p className="text-[11px] text-[var(--md-on-surface-variant)]">الصناديق • البنوك • المحافظ • حركة اليوم</p>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex items-center bg-[var(--md-surface-container)] p-1 rounded-xl border border-[var(--md-outline-variant)]">
          <button
            onClick={() => setActiveSubTab('balances')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'balances'
                ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)] shadow-sm'
                : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
            }`}
          >
            أرصدة الخزينة
          </button>
          <button
            onClick={() => setActiveSubTab('daily_movement')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'daily_movement'
                ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)] shadow-sm'
                : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
            }`}
          >
            حركة اليوم
          </button>
        </div>
      </div>

      {/* Total Balance Card */}
      <div className="p-4 rounded-2xl bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--md-on-surface-variant)] font-semibold">إجمالي السيولة النقدية والبنكية المتاحة</span>
          <span className="m3-badge m3-badge-success">
            جاهزية فورية
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-black text-[var(--md-on-surface)] font-mono tabular-nums">
            {formatAmount(totalLiquidity > 0 ? totalLiquidity : (cashOnHand + bankAccounts + eWallets))}
          </span>
          <span className="text-xs font-bold text-[var(--md-primary-text)] font-mono">
            {currency}
          </span>
        </div>
        <div className="pt-1.5 border-t border-[var(--md-outline-variant)] text-[11px] text-[var(--md-on-surface-variant)] flex flex-wrap items-center gap-x-2 gap-y-1 font-mono tabular-nums">
          <span>نقد بالصندوق: <strong className="text-[var(--md-primary-text)] font-bold">{formatAmount(cashOnHand)}</strong> ({cashPct}%)</span>
          <span>•</span>
          <span>البنوك: <strong className="text-[var(--md-info)] font-bold">{formatAmount(bankAccounts)}</strong> ({bankPct}%)</span>
          <span>•</span>
          <span>المحافظ: <strong className="text-[var(--md-secondary)] font-bold">{formatAmount(eWallets)}</strong> ({walletPct}%)</span>
        </div>
      </div>

      {/* Conditional Sub-View */}
      {activeSubTab === 'balances' ? (
        /* Breakdown Items List */
        <div className="space-y-3 flex-1">
          {treasuryItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] space-y-2 hover:border-[var(--md-outline)] transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${item.iconTone}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-[var(--md-on-surface)] truncate">{item.name}</h4>
                      <span className="text-[10px] text-[var(--md-on-surface-variant)] block truncate">{item.subtitle}</span>
                    </div>
                  </div>

                  <div className="text-left shrink-0">
                    <span className="text-sm font-black text-[var(--md-on-surface)] font-mono tabular-nums block">
                      {formatAmount(item.balance)} {currency}
                    </span>
                    <span className="text-[10px] font-mono font-semibold text-[var(--md-on-surface-variant)] tabular-nums">
                      {Number(item?.pct ?? 0)}% من السيولة
                    </span>
                  </div>
                </div>

                {/* Individual mini progress */}
                <div className="w-full h-1.5 bg-[var(--md-surface-container-high)] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.color}`}
                    style={{ width: `${Math.min(100, Math.max(0, Number(item?.pct ?? 0)))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Daily Receipts vs Disbursements vs Expenses */
        <div className="space-y-3 flex-1">
          {/* Receipts */}
          <div className="p-3 rounded-xl bg-[var(--md-success-container)] border border-[color-mix(in_srgb,var(--md-success)_30%,transparent)] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[var(--md-surface-container-lowest)] text-[var(--md-success)] flex items-center justify-center">
                <ArrowDownLeft className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-[var(--md-on-success-container)] block">سندات القبض اليوم</span>
                <span className="text-[10px] text-[var(--md-on-success-container)] opacity-80">تحصيلات عملاء ومبيعات نقدية</span>
              </div>
            </div>
            <div className="text-left">
              <span className="text-sm font-black font-mono tabular-nums text-[var(--md-on-success-container)] block">
                +{formatAmount(todayReceipts)} {currency}
              </span>
              <span className="text-[10px] text-[var(--md-on-success-container)] opacity-80 font-mono">وارد للخزينة</span>
            </div>
          </div>

          {/* Disbursements */}
          <div className="p-3 rounded-xl bg-[var(--md-error-container)] border border-[color-mix(in_srgb,var(--md-error)_30%,transparent)] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[var(--md-surface-container-lowest)] text-[var(--md-error)] flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-[var(--md-on-error-container)] block">سندات الصرف للموردين</span>
                <span className="text-[10px] text-[var(--md-on-error-container)] opacity-80">سداد فواتير مشتريات ودفعات</span>
              </div>
            </div>
            <div className="text-left">
              <span className="text-sm font-black font-mono tabular-nums text-[var(--md-on-error-container)] block">
                -{formatAmount(todayDisbursements)} {currency}
              </span>
              <span className="text-[10px] text-[var(--md-on-error-container)] opacity-80 font-mono">منصرف للموردين</span>
            </div>
          </div>

          {/* Expenses */}
          <div className="p-3 rounded-xl bg-[var(--md-warning-container)] border border-[color-mix(in_srgb,var(--md-warning)_30%,transparent)] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[var(--md-surface-container-lowest)] text-[var(--md-warning)] flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-[var(--md-on-warning-container)] block">المصروفات اليومية</span>
                <span className="text-[10px] text-[var(--md-on-warning-container)] opacity-80">نثريات، وقود، وضيافة</span>
              </div>
            </div>
            <div className="text-left">
              <span className="text-sm font-black font-mono tabular-nums text-[var(--md-on-warning-container)] block">
                -{formatAmount(todayExpenses)} {currency}
              </span>
              <span className="text-[10px] text-[var(--md-on-warning-container)] opacity-80 font-mono">مصاريف تشغيل</span>
            </div>
          </div>

          {/* Net Movement Summary */}
          <div className="p-2.5 rounded-xl bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] flex items-center justify-between text-xs">
            <span className="text-[var(--md-on-surface)] font-bold">صافي التدفق اليومي:</span>
            <span className={`font-mono font-black tabular-nums ${todayNetCashFlow >= 0 ? 'text-[var(--md-success)]' : 'text-[var(--md-error)]'}`}>
              {todayNetCashFlow >= 0 ? `+${formatAmount(todayNetCashFlow)}` : formatAmount(todayNetCashFlow)} {currency}
            </span>
          </div>
        </div>
      )}

      {/* Quick Action Link to Payments / Vouchers */}
      <div className="pt-2 border-t border-[var(--md-outline-variant)] flex items-center justify-between gap-2">
        <button
          onClick={() => onNavigate && onNavigate('payments')}
          className="m3-btn-outlined flex-1 text-xs"
        >
          <span>سندات القبض والصرف</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-[var(--md-primary-text)]" />
        </button>

        <button
          onClick={() => onNavigate && onNavigate('cashflow_forecast')}
          className="m3-btn-tonal text-xs"
          title="التنبؤ بالسيولة"
        >
          <PiggyBank className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">تنبؤ السيولة</span>
        </button>
      </div>
    </div>
  );
};
