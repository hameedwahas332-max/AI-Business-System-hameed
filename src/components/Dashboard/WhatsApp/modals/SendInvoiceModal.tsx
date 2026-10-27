import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  FileText,
  User,
  Send,
  RefreshCw,
  AlertCircle,
  Search,
  X,
  Phone,
} from 'lucide-react';
import { formatNumber, toEnglishDigits } from '../../../../lib/formatters';

interface SendInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices?: any[];
  customers?: any[];
  companyName?: string;
  onSendInvoiceReminder?: (invoiceId: string, phone: string, customMessage?: string) => Promise<boolean | void> | boolean | void;
  onSend?: (data: {
    invoiceId: string;
    invoiceNumber?: string;
    totalAmount?: number;
    recipientPhone: string;
    recipientName: string;
    messageText: string;
  }) => Promise<boolean | void> | boolean | void;
}

export const SendInvoiceModal: React.FC<SendInvoiceModalProps> = ({
  isOpen,
  onClose,
  invoices = [],
  customers = [],
  companyName = 'نظام المحاسبي الذكي ERP',
  onSendInvoiceReminder,
  onSend,
}) => {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [phone, setPhone] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const safeInvoices = Array.isArray(invoices) ? invoices : [];

  const filteredInvoices = useMemo(() => {
    if (!searchQuery.trim()) return safeInvoices;
    const q = searchQuery.toLowerCase().trim();
    return safeInvoices.filter(
      (inv) =>
        (inv.invoice_number || '').toLowerCase().includes(q) ||
        (inv.customer || inv.customer_name || '').toLowerCase().includes(q) ||
        (inv.id || '').toLowerCase().includes(q)
    );
  }, [safeInvoices, searchQuery]);

  const selectedInvoice = safeInvoices.find((inv) => inv.id === selectedInvoiceId);

  if (!isOpen) return null;

  const handleSelectInvoice = (inv: any) => {
    setSelectedInvoiceId(inv.id);
    const cust = customers.find((c) => c.id === inv.customer_id || c.name === (inv.customer || inv.customer_name));
    const targetPhone = (inv.customer_phone || cust?.phone || '').replace(/[^0-9+]/g, '');
    setPhone(targetPhone);

    const total = parseFloat(inv.total || inv.amount || 0);
    const rem = parseFloat(inv.remaining_amount !== undefined ? inv.remaining_amount : total);
    const invNum = inv.invoice_number || inv.id;
    const custName = inv.customer || inv.customer_name || cust?.name || 'العميل الكريم';
    const cur = inv.currency || 'YER';

    const msg =
`📄 إشعار فاتورة مبيعات — ${companyName}
═════════════════════════════
👤 العميل: ${custName}
🔢 رقم الفاتورة: #${invNum}
📅 التاريخ: ${inv.date || new Date().toISOString().slice(0, 10)}
═════════════════════════════
• إجمالي الفاتورة: ${toEnglishDigits(formatNumber(total))} ${cur}
• المبلغ المتبقي للسداد: ${toEnglishDigits(formatNumber(rem))} ${cur}
• الحالة: ${inv.status || (rem <= 0 ? 'مدفوعة' : 'آجلة')}
═════════════════════════════
شاكرين حسن تعاملكم معنا.`;

    setCustomMessage(msg);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceId || !phone.trim()) {
      setError('يرجى تحديد الفاتورة ورقم هاتف المستلم');
      return;
    }

    setIsSending(true);
    setError(null);
    try {
      let isSuccess = false;
      const invNum = selectedInvoice?.invoice_number || selectedInvoiceId;
      const custName = selectedInvoice?.customer || selectedInvoice?.customer_name || 'العميل الكريم';
      const totalAmt = parseFloat(selectedInvoice?.total || selectedInvoice?.amount || 0);

      if (typeof onSendInvoiceReminder === 'function') {
        const result = await onSendInvoiceReminder(selectedInvoiceId, phone.trim(), customMessage.trim());
        isSuccess = result !== false;
      } else if (typeof onSend === 'function') {
        const result = await onSend({
          invoiceId: selectedInvoiceId,
          invoiceNumber: invNum,
          totalAmount: totalAmt,
          recipientPhone: phone.trim(),
          recipientName: custName,
          messageText: customMessage.trim(),
        });
        isSuccess = result !== false;
      } else {
        // Direct API fallback
        const res = await fetch('/api/v1/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientPhone: phone.trim(),
            recipientName: custName,
            messageText: customMessage.trim(),
            messageType: 'INVOICE_REMINDER',
            attachmentSummary: `فاتورة #${invNum} بقيمة ${totalAmt}`,
          }),
        });
        isSuccess = res.ok;
      }

      if (isSuccess) {
        if (typeof onClose === 'function') {
          onClose();
        }
      } else {
        setError('فشل في إرسال الفاتورة عبر WhatsApp. يرجى التحقق من الرقم.');
      }
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ غير متوقع');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in text-right">
      <div className="bg-[#091511] rounded-2xl border border-emerald-500/30 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-[#061a14] to-[#0c2e1f] border-b border-emerald-500/20 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-teal-400" />
            <span>إرسال فاتورة مبيعات وتذكير بالسداد عبر WhatsApp</span>
          </h3>
          <button
            onClick={onClose}
            disabled={isSending}
            className="text-slate-400 hover:text-white p-1 rounded-lg bg-[#06120d] border border-emerald-500/20 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mx-4 mt-3 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto text-xs flex-1">
          {/* Search & Pick Invoice */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-200">
              ابحث واختر فاتورة المبيعات *
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ابحث برقم الفاتورة أو اسم العميل..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-8 py-2 bg-[#06120d] border border-emerald-500/20 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-400 placeholder:text-slate-600"
              />
            </div>

            <div className="max-h-36 overflow-y-auto space-y-1 p-1 bg-[#06120d] rounded-xl border border-emerald-500/20">
              {filteredInvoices.length === 0 ? (
                <div className="p-3 text-center text-slate-500 text-[11px]">
                  لا توجد فواتير مسجلة مطابقة للبحث
                </div>
              ) : (
                filteredInvoices.map((inv) => {
                  const isSelected = selectedInvoiceId === inv.id;
                  const total = parseFloat(inv.total || inv.amount || 0);
                  const rem = parseFloat(inv.remaining_amount !== undefined ? inv.remaining_amount : total);
                  return (
                    <div
                      key={inv.id}
                      onClick={() => handleSelectInvoice(inv)}
                      className={`p-2 rounded-lg cursor-pointer flex items-center justify-between text-xs transition-colors ${
                        isSelected
                          ? 'bg-emerald-950/60 border border-emerald-500 text-emerald-300 font-bold'
                          : 'hover:bg-[#0c2419] text-slate-300'
                      }`}
                    >
                      <div className="truncate">
                        <span className="font-mono text-emerald-400 font-bold">#{inv.invoice_number || inv.id}</span>
                        <span className="mr-2 text-white">{inv.customer || inv.customer_name || 'عميل'}</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 shrink-0">
                        متبقي: {toEnglishDigits(formatNumber(rem))} {inv.currency || 'YER'}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Selected Invoice Card */}
          {selectedInvoice && (
            <div className="p-3 bg-[#06140e] border border-emerald-500/30 rounded-xl text-xs space-y-1.5">
              <div className="flex items-center justify-between font-bold text-white">
                <span>الفاتورة: #{selectedInvoice.invoice_number || selectedInvoice.id}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {selectedInvoice.status || 'معلقة'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>المبلغ المتبقي للتحصيل:</span>
                <span className="font-mono font-black text-amber-300 text-xs">
                  {toEnglishDigits(
                    formatNumber(parseFloat(selectedInvoice.remaining_amount !== undefined ? selectedInvoice.remaining_amount : selectedInvoice.total || 0))
                  )}{' '}
                  {selectedInvoice.currency || 'YER'}
                </span>
              </div>
            </div>
          )}

          {/* Recipient Phone */}
          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1">
              رقم الهاتف المستلم (WhatsApp) <span className="text-emerald-400">*</span>
            </label>
            <input
              type="text"
              dir="ltr"
              required
              placeholder="+967 770 000 000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#06120d] border border-emerald-500/20 rounded-xl text-xs font-mono text-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-400 placeholder:text-slate-600"
            />
          </div>

          {/* Custom Message */}
          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1">
              نص رسالة الفاتورة
            </label>
            <textarea
              rows={5}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="سيتم توليد تفاصيل الفاتورة تلقائياً..."
              className="w-full p-3 bg-[#06120d] border border-emerald-500/20 rounded-xl text-xs font-mono text-slate-200 leading-relaxed focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-emerald-500/20">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800 cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSending || !selectedInvoiceId || !phone.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-950 cursor-pointer disabled:opacity-50"
            >
              {isSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>إرسال الفاتورة الآن 💬</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
