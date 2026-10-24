import React from 'react';
import { formatAmount } from '../../../lib/formatters';
import { DollarSign, CheckCircle2, Clock, AlertTriangle, FileText } from 'lucide-react';

interface SalesInvoicesKPIsProps {
  invoices: any[];
  currency?: string;
}

export const SalesInvoicesKPIs: React.FC<SalesInvoicesKPIsProps> = ({ invoices, currency = 'YER' }) => {
  // Aggregate KPIs from real data
  let totalSales = 0;
  let totalPaid = 0;
  let totalRemaining = 0;
  let overdueAmount = 0;
  let overdueCount = 0;
  let paidCount = 0;
  let partialCount = 0;
  let pendingCount = 0;

  const todayStr = new Date().toISOString().split('T')[0];

  invoices.forEach((inv) => {
    const total = parseFloat(inv.total || '0') || 0;
    const paid = parseFloat(inv.paid_amount || '0') || 0;
    const remaining = parseFloat(inv.remaining_amount || `${total - paid}`) || 0;

    if (inv.status !== 'CANCELLED') {
      totalSales += total;
      totalPaid += paid;
      totalRemaining += remaining;

      if (remaining > 0.01 && inv.due_date && inv.due_date < todayStr && inv.status !== 'DRAFT') {
        overdueAmount += remaining;
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
          <p className="text-xs font-medium text-slate-400 mb-1">إجمالي المبيعات</p>
          <h3 className="text-xl font-bold text-white tracking-tight">
            {formatAmount(totalSales, currency)}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
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
          <p className="text-xs font-medium text-emerald-400 mb-1">إجمالي المحصل</p>
          <h3 className="text-xl font-bold text-emerald-400 tracking-tight">
            {formatAmount(totalPaid, currency)}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
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
          <p className="text-xs font-medium text-amber-400 mb-1">المتبقي (الذمم المدينة)</p>
          <h3 className="text-xl font-bold text-amber-400 tracking-tight">
            {formatAmount(totalRemaining, currency)}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
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
          <p className="text-xs font-medium text-rose-400 mb-1">مستحقات متأخرة</p>
          <h3 className="text-xl font-bold text-rose-400 tracking-tight">
            {formatAmount(overdueAmount, currency)}
          </h3>
          <p className="text-xs text-rose-400/80 mt-1">
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
