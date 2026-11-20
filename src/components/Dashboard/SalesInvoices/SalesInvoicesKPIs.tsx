import React from 'react';
import { formatAmount, getActiveCurrencySymbol } from '../../../lib/formatters';
import { DollarSign, CheckCircle2, Clock, AlertTriangle, FileText } from 'lucide-react';

interface SalesInvoicesKPIsProps {
  invoices: any[];
  currency?: string;
}

export const SalesInvoicesKPIs: React.FC<SalesInvoicesKPIsProps> = ({ invoices, currency = 'YER' }) => {
  // Aggregate KPIs from real data in English digits
  let totalSales = 0;
  let totalPaid = 0;
  let totalRemaining = 0;
  let overdueAmount = 0;
  let overdueCount = 0;
  let paidCount = 0;
  let partialCount = 0;
  let pendingCount = 0;

  // Currency specific aggregations
  const currencyTotals: Record<string, { sales: number; paid: number; remaining: number }> = {
    YER: { sales: 0, paid: 0, remaining: 0 },
    SAR: { sales: 0, paid: 0, remaining: 0 },
    USD: { sales: 0, paid: 0, remaining: 0 },
  };

  const todayStr = new Date().toISOString().split('T')[0];

  invoices.forEach((inv) => {
    const rawTotal = Number(inv.total ?? inv.totalAmount ?? inv.grandTotal ?? inv.netTotal ?? inv.total_amount ?? inv.amount ?? 0);
    const itemsSum = Array.isArray(inv.items) && inv.items.length > 0
      ? inv.items.reduce((acc: number, it: any) => acc + Number(it.total || (Number(it.quantity || 1) * Number(it.unit_price || it.price || 0) - Number(it.discount || 0))), 0)
      : 0;
    const total = rawTotal > 0 ? rawTotal : itemsSum;

    const paid = Number(
      inv.paid_amount ?? inv.paidAmount ?? inv.amountPaid ?? inv.paid ?? (inv.status === 'PAID' || inv.status === 'paid' ? total : 0)
    );

    const remaining = Math.max(
      0,
      Number(
        inv.remaining_amount ?? inv.remainingAmount ?? inv.remainingBalance ?? inv.remaining ?? inv.balanceDue ?? (total - paid)
      )
    );

    const curr = inv.currency || 'YER';

    if (currencyTotals[curr]) {
      currencyTotals[curr].sales += total;
      currencyTotals[curr].paid += paid;
      currencyTotals[curr].remaining += remaining;
    }

    const st = String(inv.status || '').toUpperCase();

    if (st !== 'CANCELLED') {
      totalSales += total;
      totalPaid += paid;
      totalRemaining += remaining;

      if (remaining > 0.01 && inv.due_date && inv.due_date < todayStr && st !== 'DRAFT') {
        overdueAmount += remaining;
        overdueCount++;
      }

      if (st === 'PAID' || remaining <= 0.01) {
        paidCount++;
      } else if (st === 'PARTIALLY_PAID' || st === 'PARTIAL' || (paid > 0 && remaining > 0.01)) {
        partialCount++;
      } else {
        pendingCount++;
      }
    }
  });

  const formatEnglishNum = (val: number) => {
    return val.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const currSymbol = getActiveCurrencySymbol(currency);

  return (
    <div className="space-y-3 mb-6" id="sales-invoices-kpi-grid">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Sales */}
        <div className="m3-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[var(--md-on-surface-variant)] mb-1">إجمالي المبيعات المعتمدة</p>
            <h3 className="text-xl font-black text-[var(--md-on-surface)] tracking-tight font-mono tabular-nums" dir="ltr">
              {formatEnglishNum(totalSales)} <span className="text-xs font-bold text-[var(--md-info)]">{currSymbol}</span>
            </h3>
            <p className="text-xs text-[var(--md-on-surface-variant)] mt-1 font-mono tabular-nums">
              {invoices.length} فواتير مسجلة
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[var(--md-info-container)] border border-[var(--md-info)]/25 flex items-center justify-center text-[var(--md-info)]">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        {/* 2. Collected Amount */}
        <div className="m3-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[var(--md-success)] mb-1">إجمالي المحصل (النقد والبنك)</p>
            <h3 className="text-xl font-black text-[var(--md-success)] tracking-tight font-mono tabular-nums" dir="ltr">
              {formatEnglishNum(totalPaid)} <span className="text-xs font-bold text-[var(--md-success)]">{currSymbol}</span>
            </h3>
            <p className="text-xs text-[var(--md-on-surface-variant)] mt-1 font-mono tabular-nums">
              {paidCount} مسددة | {partialCount} جزئي
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[var(--md-success-container)] border border-[var(--md-success)]/25 flex items-center justify-center text-[var(--md-success)]">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* 3. Remaining Receivables */}
        <div className="m3-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[var(--md-warning)] mb-1">المتبقي (الذمم المدينة على العملاء)</p>
            <h3 className="text-xl font-black text-[var(--md-warning)] tracking-tight font-mono tabular-nums" dir="ltr">
              {formatEnglishNum(totalRemaining)} <span className="text-xs font-bold text-[var(--md-warning)]">{currSymbol}</span>
            </h3>
            <p className="text-xs text-[var(--md-on-surface-variant)] mt-1 font-mono tabular-nums">
              {pendingCount + partialCount} فواتير آجلة
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[var(--md-warning-container)] border border-[var(--md-warning)]/25 flex items-center justify-center text-[var(--md-warning)]">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* 4. Overdue Invoices */}
        <div className="m3-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[var(--md-error)] mb-1">مستحقات متجاوزة تاريخ الاستحقاق</p>
            <h3 className="text-xl font-black text-[var(--md-error)] tracking-tight font-mono tabular-nums" dir="ltr">
              {formatEnglishNum(overdueAmount)} <span className="text-xs font-bold text-[var(--md-error)]">{currSymbol}</span>
            </h3>
            <p className="text-xs text-[var(--md-error)]/80 mt-1 font-mono tabular-nums">
              {overdueCount} فواتير متأخرة
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[var(--md-error-container)] border border-[var(--md-error)]/25 flex items-center justify-center text-[var(--md-error)]">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Multi-Currency Consolidated Bar */}
      <div className="bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] rounded-xl px-4 py-2 flex flex-wrap items-center justify-between text-xs text-[var(--md-on-surface-variant)] gap-2">
        <span className="font-semibold text-[var(--md-on-surface)]">إجمالي المبيعات حسب العملة (English Digits):</span>
        <div className="flex items-center gap-4 flex-wrap font-mono tabular-nums" dir="ltr">
          <span className="text-[var(--md-primary-text)]">
            <strong>{getActiveCurrencySymbol('YER')} (YER):</strong> {formatEnglishNum(currencyTotals.YER.sales)}
          </span>
          <span className="text-[var(--md-outline)]">|</span>
          <span className="text-[var(--md-warning)]">
            <strong>{getActiveCurrencySymbol('SAR')} (SAR):</strong> {formatEnglishNum(currencyTotals.SAR.sales)}
          </span>
          <span className="text-[var(--md-outline)]">|</span>
          <span className="text-[var(--md-info)]">
            <strong>{getActiveCurrencySymbol('USD')} (USD):</strong> {formatEnglishNum(currencyTotals.USD.sales)}
          </span>
        </div>
      </div>
    </div>
  );
};
