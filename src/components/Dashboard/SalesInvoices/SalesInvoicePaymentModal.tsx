import React, { useState } from 'react';
import { api } from '../../../api';
import { formatAmount } from '../../../lib/formatters';
import { X, DollarSign, AlertCircle, Loader2 } from 'lucide-react';

interface SalesInvoicePaymentModalProps {
  invoice: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SalesInvoicePaymentModal: React.FC<SalesInvoicePaymentModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onSuccess,
}) => {
  if (!isOpen || !invoice) return null;

  const total = parseFloat(invoice.total || '0') || 0;
  const paid = parseFloat(invoice.paid_amount || '0') || 0;
  const remaining = Math.max(0, parseFloat(invoice.remaining_amount || `${total - paid}`) || 0);

  const [amount, setAmount] = useState<number>(remaining);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK' | 'CHEQUE' | 'ONLINE'>('CASH');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState(`سند قبض للفاتورة #${invoice.invoice_number}`);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setError('مبلغ السداد يجب أن يكون أكبر من الصفر');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Record Customer Receipt / Payment
      const res = await api.createPayment({
        type: 'CUSTOMER_PAYMENT',
        customer_id: invoice.customer_id,
        invoice_id: invoice.id,
        amount: Number(amount),
        currency: invoice.currency || 'YER',
        exchange_rate: invoice.exchange_rate || 1.0,
        payment_method: paymentMethod,
        payment_date: paymentDate,
        reference,
        notes,
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error?.message || 'فشل تسجيل عملية السداد');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حفظ السداد');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">تسجيل سند قبض / دفعة نقدية</h2>
              <p className="text-xs text-slate-400">
                الفاتورة: <span className="text-blue-400 font-mono font-bold">#{invoice.invoice_number}</span> | العميل: {invoice.customer_name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Invoice Balances Glance */}
          <div className="grid grid-cols-3 gap-2 p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-center">
            <div>
              <span className="block text-[11px] text-slate-400">إجمالي الفاتورة</span>
              <span className="text-xs font-bold text-white">{formatAmount(total, invoice.currency || 'YER')}</span>
            </div>
            <div>
              <span className="block text-[11px] text-emerald-400">المسدد سابقاً</span>
              <span className="text-xs font-bold text-emerald-400">{formatAmount(paid, invoice.currency || 'YER')}</span>
            </div>
            <div>
              <span className="block text-[11px] text-amber-400">المتبقي المطلوب</span>
              <span className="text-xs font-bold text-amber-400">{formatAmount(remaining, invoice.currency || 'YER')}</span>
            </div>
          </div>

          {/* Amount input */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">المبلغ المراد تحصيله الآن</label>
            <div className="relative">
              <input
                type="number"
                step="any"
                min="0.01"
                max={remaining > 0 ? remaining * 2 : 100000000}
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-base font-bold text-emerald-400 focus:outline-none focus:border-emerald-500 font-mono"
                required
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                {invoice.currency || 'YER'}
              </span>
            </div>
          </div>

          {/* Payment Method & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">طريقة القبض</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="CASH">نقداً (الصندوق / الخزينة)</option>
                <option value="BANK">تحويل بنكي / شيك</option>
                <option value="ONLINE">دفع إلكتروني / شبكة</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">تاريخ القبض</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Reference & Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">المرجع / رقم الإشعار</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">ملاحظات السند</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي تفاصيل إضافية..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading || amount <= 0}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري تسجيل السند...
                </>
              ) : (
                <>
                  <DollarSign className="w-4 h-4" />
                  حفظ وقيد سند القبض
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
