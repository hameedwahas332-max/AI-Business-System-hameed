import React from 'react';
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
} from 'lucide-react';

interface CashFlowTreasuryCenterProps {
  stats?: any;
  treasuryData?: any;
  currency?: string;
  onNavigate?: (tab: TabType, extra?: any) => void;
}

export const CashFlowTreasuryCenter: React.FC<CashFlowTreasuryCenterProps> = ({
  stats = {},
  treasuryData = {},
  currency = 'SAR',
  onNavigate,
}) => {
  const totalLiquidity = Number(stats?.balances?.cashAndBankBalance ?? stats?.cashBankBalance ?? 62400);

  // Split balances
  const cashOnHand = Math.round(totalLiquidity * 0.42);
  const bankAccounts = Math.round(totalLiquidity * 0.40);
  const eWallets = Math.max(0, totalLiquidity - cashOnHand - bankAccounts);

  const treasuryItems = [
    {
      id: 'cash-register',
      name: 'الصندوق النقدي الرئيسي',
      subtitle: 'خزينة الكاشير والمكتب',
      balance: cashOnHand,
      type: 'CASH',
      pct: 42,
      color: 'bg-emerald-500',
      textClass: 'text-emerald-400',
      icon: Coins,
      badge: 'فوري',
    },
    {
      id: 'bank-accounts',
      name: 'الحسابات والودائع البنكية',
      subtitle: 'بنك الأهلي • الراجحي • الرياض',
      balance: bankAccounts,
      type: 'BANK',
      pct: 40,
      color: 'bg-blue-500',
      textClass: 'text-blue-400',
      icon: Landmark,
      badge: 'جاري',
    },
    {
      id: 'e-wallets',
      name: 'المحافظ الإلكترونية وSTC Pay',
      subtitle: 'STC Pay • Urpay • محافظ رقمية',
      balance: eWallets,
      type: 'WALLET',
      pct: 18,
      color: 'bg-amber-400',
      textClass: 'text-amber-400',
      icon: Smartphone,
      badge: 'رقمي',
    },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5 text-right flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center justify-center">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">الخزينة والبنوك والمحافظ</h3>
            <p className="text-[11px] text-slate-400">توزيع السيولة النقدية والرقمية</p>
          </div>
        </div>

        <button
          onClick={() => onNavigate && onNavigate('payments')}
          className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
        >
          <span>سندات القبض</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Total Balance Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/90 border border-slate-700/80 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 font-semibold">إجمالي السيولة المتاحة فوراً</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            نشط 100%
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

      {/* Breakdown Items List */}
      <div className="space-y-3">
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

      {/* Quick Action Link to Financial Reports */}
      <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
        <button
          onClick={() => onNavigate && onNavigate('financial_intelligence')}
          className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-slate-200 text-xs font-bold border border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>عرض كشف السيولة والموازنة في التقارير</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-blue-400" />
        </button>
      </div>
    </div>
  );
};
