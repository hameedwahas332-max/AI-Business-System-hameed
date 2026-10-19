import React, { useState } from 'react';
import {
  CreditCard,
  FileText,
  User,
  Send,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

interface SendInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: any[];
  customers: any[];
  onSendInvoiceReminder: (invoiceId: string, phone: string) => Promise<boolean>;
}

export const SendInvoiceModal: React.FC<SendInvoiceModalProps> = ({
  isOpen,
  onClose,
  invoices,
  customers,
  onSendInvoiceReminder,
}) => {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [phone, setPhone] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedInvoice = invoices.find((inv) => inv.id === selectedInvoiceId);

  const handleSelectInvoice = (invId: string) => {
    setSelectedInvoiceId(invId);
    const inv = invoices.find((x) => x.id === invId);
    if (inv) {
      const cust = customers.find((c) => c.id === inv.customer_id);
      const targetPhone = inv.customer_phone || cust?.phone || '';
      setPhone(targetPhone);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceId || !phone.trim()) return;

    setIsSending(true);
    setError(null);
    try {
      const ok = await onSendInvoiceReminder(selectedInvoiceId, phone.trim());
      if (ok) {
        onClose();
      } else {
        setError('فشل في إرسال الفاتورة عبر WhatsApp. يرجى التحقق من الرقم.');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ غير متوقع');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-scale-in text-right">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-teal-600" />
            <span>إرسال فاتورة مبيعات وتذكير بالسداد</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg font-bold">
            ✕
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">اختر فاتورة المبيعات *</label>
            <select
              required
              value={selectedInvoiceId}
              onChange={(e) => handleSelectInvoice(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
            >
              <option value="">-- اختر من قائمة الفواتير --</option>
              {invoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  #{inv.invoice_number} - {inv.customer_name || 'عميل'} - إجمالي:{' '}
                  {parseFloat(inv.total || 0).toLocaleString('ar-YE')} ر.ي. (متبقي:{' '}
                  {parseFloat(inv.remaining_amount || inv.total || 0).toLocaleString('ar-YE')})
                </option>
              ))}
            </select>
          </div>

          {selectedInvoice && (
            <div className="p-3 bg-teal-50/60 border border-teal-200 rounded-xl text-xs space-y-1.5">
              <div className="flex items-center justify-between font-bold text-teal-900">
                <span>الفاتورة: #{selectedInvoice.invoice_number}</span>
                <span>الحالة: {selectedInvoice.status || 'معلقة'}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>المبلغ المتبقي للتحصيل:</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {parseFloat(selectedInvoice.remaining_amount || selectedInvoice.total || 0).toLocaleString('ar-YE')} ر.ي.
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف المستلم (WhatsApp) *</label>
            <input
              type="text"
              dir="ltr"
              required
              placeholder="+967 770 000 000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSending || !selectedInvoiceId || !phone.trim()}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-all shadow-md shadow-teal-600/20 disabled:opacity-50"
            >
              {isSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>إرسال الفاتورة الآن</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
