import React from 'react';
import { formatAmount } from '../../../lib/formatters';
import { getStoredExchangeRates } from '../../../lib/exchangeRates';
import { DollarSign, CheckCircle2, Clock, AlertTriangle, FileText } from 'lucide-react';

interface SalesInvoicesKPIsProps {
  invoices: any[];
  currency?: string;
}

export const SalesInvoicesKPIs: React.FC<SalesInvoicesKPIsProps> = ({ invoices, currency = 'YER' }) => {
  const config = getStoredExchangeRates();

  // Aggregate KPIs in Base Currency (YER)
  let totalSalesBase = 0;
  let totalPaidBase = 0;
  let totalRemainingBase = 0;
  let overdueAmountBase = 0;
  let overdueCount = 0;
  let paidCount = 0;
  let partialCount = 0;
  let pendingCount = 0;

  const todayStr = new Date().toISOString().split('T')[0];

  invoices.forEach((inv) => {
    const total = parseFloat(inv.total || '0') || 0;
    const paid = parseFloat(inv.paid_amount || '0') || 0;
    const remaining = parseFloat(inv.remaining_amount || `${total - paid}`) || 0;

    const cur = (inv.currency || 'YER').toUpperCase();
    const rate = cur === 'SAR' ? config.rates.SAR.accountingRate : cur === 'USD' ? config.rates.USD.accountingRate : 1;

    if (inv.status !== 'CANCELLED') {
      totalSalesBase += total * rate;
      totalPaidBase += paid * rate;
      totalRemainingBase += remaining * rate;

      if (remaining > 0.01 && inv.due_date && inv.due_date < todayStr && inv.status !== 'DRAFT') {
        overdueAmountBase += remaining * rate;
        overdueCount++;
      }

      if (inv.status === 'PAID' || remaining <= 0.01) {
        paidCount++;
      } else if (inv.status === 'PARTIALLY_PAID' || (paid > 0 && remaining > 0.01)) {
        partialCount++;
      } else if (inv.status === 'PENDING' || inv.status === 'DRAFT') {
        pendingCount++;
      }
    }
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6" id="sales-invoices-kpi-grid">
      {/* 1. Total Sales */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <p className="text-xs font-medium text-slate-400">إجمالي المبيعات المجمعة</p>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">YER أساس</span>
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight font-mono">
            {formatAmount(totalSalesBase, 'YER')}
          </h3>
          <p className="text-xs text-slate-500 mt-1 font-mono">
            {invoices.length} فاتورة مسجلة
          </p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
          <FileText className="w-6 h-6" />
        </div>
      </div>

      {/* 2. Collected Amount */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <p className="text-xs font-medium text-emerald-400">إجمالي المحصل الفعلي</p>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 font-mono">YER أساس</span>
          </div>
          <h3 className="text-xl font-bold text-emerald-400 tracking-tight font-mono">
            {formatAmount(totalPaidBase, 'YER')}
          </h3>
          <p className="text-xs text-slate-500 mt-1 font-mono">
            {paidCount} مسددة بالكامل | {partialCount} جزئي
          </p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
          <CheckCircle2 className="w-6 h-6" />
        </div>
      </div>

      {/* 3. Remaining Receivables */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <p className="text-xs font-medium text-amber-400">المتبقي (الذمم المدينة)</p>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 font-mono">YER أساس</span>
          </div>
          <h3 className="text-xl font-bold text-amber-400 tracking-tight font-mono">
            {formatAmount(totalRemainingBase, 'YER')}
          </h3>
          <p className="text-xs text-slate-500 mt-1 font-mono">
            {pendingCount + partialCount} فواتير غير مسددة
          </p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
          <Clock className="w-6 h-6" />
        </div>
      </div>

      {/* 4. Overdue Invoices */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <p className="text-xs font-medium text-rose-400">مستحقات متأخرة</p>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-950 text-rose-400 font-mono">YER أساس</span>
          </div>
          <h3 className="text-xl font-bold text-rose-400 tracking-tight font-mono">
            {formatAmount(overdueAmountBase, 'YER')}
          </h3>
          <p className="text-xs text-rose-400/80 mt-1 font-mono">
            {overdueCount} فاتورة تجاوزت تاريخ الاستحقاق
          </p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
          <AlertTriangle className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};
