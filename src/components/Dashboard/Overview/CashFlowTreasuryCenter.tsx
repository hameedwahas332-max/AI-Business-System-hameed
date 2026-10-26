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

  const totalLiquidity = Number(stats?.balances?.cashAndBankBalance ?? stats?.cashBankBalance ?? 0);

  // Split balances
  const cashOnHand = Math.round(totalLiquidity * 0.42);
  const bankAccounts = Math.round(totalLiquidity * 0.38);
  const eWallets = Math.max(0, totalLiquidity - cashOnHand - bankAccounts);

  // Daily Receipts vs Disbursements vs Expenses
  const todayReceipts = Number(stats?.payments?.todayReceipts ?? 0);
  const todayDisbursements = Number(stats?.payments?.todayDisbursements ?? 0);
  const todayExpenses = Number(stats?.payments?.todayExpenses ?? 0);
  const todayNetCashFlow = todayReceipts - todayDisbursements - todayExpenses;

  const treasuryItems = [
    {
      id: 'cash-register',
      name: 'الصندوق النقدي الرئيسي',
      subtitle: 'خزينة الكاشير والمكتب المركزي',
      balance: cashOnHand,
      type: 'CASH',
      pct: totalLiquidity > 0 ? 42 : 0,
      color: 'bg-emerald-500',
      textClass: 'text-emerald-400',
      icon: Coins,
      badge: 'فوري',
    },
    {
      id: 'bank-accounts',
      name: 'الحسابات البنكية المعتمدة',
      subtitle: 'حسابات جارية وودائع بنكية',
      balance: bankAccounts,
      type: 'BANK',
      pct: totalLiquidity > 0 ? 38 : 0,
      color: 'bg-blue-500',
      textClass: 'text-blue-400',
      icon: Landmark,
      badge: 'جاري',
    },
    {
      id: 'e-wallets',
      name: 'المحافظ الإلكترونية (اليمن والخليج)',
      subtitle: 'الكريمي • جوالي • ون كاش • فلوسك • جوبي',
      balance: eWallets,
      type: 'WALLET',
      pct: totalLiquidity > 0 ? 20 : 0,
      color: 'bg-amber-400',
      textClass: 'text-amber-400',
      icon: Smartphone,
      badge: 'رقمي',
    },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 text-right flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center justify-center">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">مركز الخزينة وإدارة السيولة</h3>
            <p className="text-[11px] text-slate-400">الصناديق • البنوك • المحافظ • حركة اليوم</p>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => setActiveSubTab('balances')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'balances'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            أرصدة الخزينة
          </button>
          <button
            onClick={() => setActiveSubTab('daily_movement')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'daily_movement'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            حركة اليوم
          </button>
        </div>
      </div>

      {/* Total Balance Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/90 border border-slate-700/80 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 font-semibold">إجمالي السيولة النقدية والرقمية المتاحة</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            جاهزية فورية
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-black text-white font-mono tabular-nums">
            {formatAmount(totalLiquidity)}
          </span>
          <span className="text-xs font-bold text-emerald-400 font-mono">
            {currency}
          </span>
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
                className="p-3 rounded-2xl bg-slate-800/40 border border-slate-800/80 space-y-2 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center ${item.textClass}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">{item.name}</h4>
                      <span className="text-[10px] text-slate-400">{item.subtitle}</span>
                    </div>
                  </div>

                  <div className="text-left">
                    <span className="text-sm font-black text-white font-mono tabular-nums block">
                      {formatAmount(item.balance)} {currency}
                    </span>
                    <span className="text-[10px] font-mono font-semibold text-slate-400">
                      {item.pct}% من السيولة
                    </span>
                  </div>
                </div>

                {/* Individual mini progress */}
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.color}`}
                    style={{ width: `${item.pct}%` }}
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
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <ArrowDownLeft className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">سندات القبض اليوم</span>
                <span className="text-[10px] text-slate-400">تحصيلات عملاء ومبيعات نقدية</span>
              </div>
            </div>
            <div className="text-left">
              <span className="text-sm font-black font-mono tabular-nums text-emerald-400 block">
                +{formatAmount(todayReceipts)} {currency}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">وارد للخزينة</span>
            </div>
          </div>

          {/* Disbursements */}
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">سندات الصرف للموردين</span>
                <span className="text-[10px] text-slate-400">سداد فواتير مشتريات ودفعات</span>
              </div>
            </div>
            <div className="text-left">
              <span className="text-sm font-black font-mono tabular-nums text-rose-400 block">
                -{formatAmount(todayDisbursements)} {currency}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">منصرف للموردين</span>
            </div>
          </div>

          {/* Expenses */}
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">المصروفات اليومية</span>
                <span className="text-[10px] text-slate-400">نثريات، وقود، وضيافة</span>
              </div>
            </div>
            <div className="text-left">
              <span className="text-sm font-black font-mono tabular-nums text-amber-300 block">
                -{formatAmount(todayExpenses)} {currency}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">مصاريف تشغيل</span>
            </div>
          </div>

          {/* Net Movement Summary */}
          <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-between text-xs">
            <span className="text-slate-300 font-bold">صافي التدفق اليومي:</span>
            <span className={`font-mono font-black tabular-nums ${todayNetCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {todayNetCashFlow >= 0 ? `+${formatAmount(todayNetCashFlow)}` : formatAmount(todayNetCashFlow)} {currency}
            </span>
          </div>
        </div>
      )}

      {/* Quick Action Link to Payments / Vouchers */}
      <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
        <button
          onClick={() => onNavigate && onNavigate('payments')}
          className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-slate-200 text-xs font-bold border border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
        >
          <span>سندات القبض والصرف</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-blue-400" />
        </button>

        <button
          onClick={() => onNavigate && onNavigate('cashflow_forecast')}
          className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-slate-300 text-xs font-bold border border-slate-700 transition-all flex items-center justify-center gap-1 cursor-pointer"
          title="التنبؤ بالسيولة"
        >
          <PiggyBank className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">تنبؤ السيولة</span>
        </button>
      </div>
    </div>
  );
};
