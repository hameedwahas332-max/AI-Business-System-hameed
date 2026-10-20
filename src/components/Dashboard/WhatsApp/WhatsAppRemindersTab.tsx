import React, { useState } from 'react';
import {
  FileText,
  CreditCard,
  Send,
  CheckCheck,
  AlertCircle,
  Clock,
  DollarSign,
  User,
  RefreshCw,
} from 'lucide-react';

interface WhatsAppRemindersTabProps {
  invoices?: any[];
  payments?: any[];
  customers?: any[];
  onSendInvoiceReminder?: (invoiceId: string, phone: string) => Promise<boolean>;
  onSendPaymentReminder?: (paymentId: string, phone: string) => Promise<boolean>;
}

export const WhatsAppRemindersTab: React.FC<WhatsAppRemindersTabProps> = ({
  invoices = [],
  payments = [],
  customers = [],
  onSendInvoiceReminder = async (_invoiceId?: string, _phone?: string) => true,
  onSendPaymentReminder = async (_paymentId?: string, _phone?: string) => true,
}) => {
  const safeInvoices = Array.isArray(invoices) ? invoices : [];
  const safePayments = Array.isArray(payments) ? payments : [];
  const safeCustomers = Array.isArray(customers) ? customers : [];
  const [sendingInvId, setSendingInvId] = useState<string | null>(null);
  const [sendingPayId, setSendingPayId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Filter pending/unpaid invoices
  const pendingInvoices = invoices.filter(
    (inv) =>
      ['PENDING', 'UNPAID', 'PARTIALLY_PAID', 'OVERDUE'].includes(inv.status) ||
      (parseFloat(inv.remaining_amount || inv.total || 0) > 0 && inv.status !== 'PAID')
  );

  const handleSendInvoice = async (invId: string, phone: string) => {
    if (!phone) {
      setFeedback({ type: 'error', msg: 'لا يوجد رقم هاتف مسجل لهذا العميل لإرسال التذكير' });
      return;
    }
    setSendingInvId(invId);
    setFeedback(null);
    try {
      const ok = await onSendInvoiceReminder(invId, phone);
      if (ok) {
        setFeedback({ type: 'success', msg: `تم إرسال تذكير الفاتورة بنجاح إلى الرقم ${phone}` });
      }
    } finally {
      setSendingInvId(null);
    }
  };

  const handleSendPayment = async (payId: string, phone: string) => {
    setSendingPayId(payId);
    setFeedback(null);
    try {
      const ok = await onSendPaymentReminder(payId, phone || '770000000');
      if (ok) {
        setFeedback({ type: 'success', msg: 'تم إرسال إشعار استلام الدفعة وسند القبض بنجاح' });
      }
    } finally {
      setSendingPayId(null);
    }
  };

  return (
    <div id="whatsapp-reminders-section" className="space-y-6">
      
      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between gap-3 border shadow-md animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCheck className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
            <span>{feedback.msg}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-[11px] font-bold underline">
            إغلاق
          </button>
        </div>
      )}

      {/* 1. Pending Invoices Section */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-400" />
              <span>تذكيرات فواتير المبيعات المستحقة</span>
            </h2>
            <p className="text-xs text-slate-400">
              إرسال تذكير رسمي فوري للعميل يتضمن تفاصيل الفاتورة والمبلغ المتبقي ورقم الحساب.
            </p>
          </div>

          <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 text-xs font-bold border border-amber-500/20 self-start sm:self-auto">
            {pendingInvoices.length} فواتير بانتظار السداد
          </span>
        </div>

        {pendingInvoices.length === 0 ? (
          <div className="p-8 text-center text-slate-500 space-y-2">
            <CheckCheck className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">لا توجد فواتير معلقة حالياً</p>
            <p className="text-xs text-slate-500">جميع فواتير المبيعات مسددة بالكامل.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950/60 text-slate-300 font-bold border-b border-slate-800">
                <tr>
                  <th className="p-3">رقم الفاتورة</th>
                  <th className="p-3">العميل</th>
                  <th className="p-3">إجمالي الفاتورة</th>
                  <th className="p-3">المبلغ المتبقي</th>
                  <th className="p-3">تاريخ الاستحقاق</th>
                  <th className="p-3 text-center">إجراء التذكير عبر واتساب</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {pendingInvoices.map((inv) => {
                  const cust = customers.find((c) => c.id === inv.customer_id);
                  const phone = inv.customer_phone || cust?.phone || '';
                  const isSendingThis = sendingInvId === inv.id;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-100">{inv.invoice_number}</td>
                      <td className="p-3 font-medium text-slate-100">
                        {inv.customer_name || cust?.name || 'عميل'}
                      </td>
                      <td className="p-3 font-mono font-semibold text-slate-200">
                        {parseFloat(inv.total || 0).toLocaleString('en-US')} ر.ي.
                      </td>
                      <td className="p-3 font-mono font-bold text-amber-400">
                        {parseFloat(inv.remaining_amount || inv.total || 0).toLocaleString('en-US')} ر.ي.
                      </td>
                      <td className="p-3 text-slate-400 font-mono">
                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-US') : 'غير محدد'}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleSendInvoice(inv.id, phone)}
                          disabled={isSendingThis || !phone}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/20 text-xs font-semibold transition-all disabled:opacity-40"
                          title={phone ? `إرسال إلى ${phone}` : 'لا يوجد رقم هاتف مسجل'}
                        >
                          {isSendingThis ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Send className="w-3 h-3" />
                          )}
                          <span>{phone ? 'إرسال تذكير' : 'بدون هاتف'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 2. Payment Receipts Section */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
        <div className="space-y-1 border-b border-slate-800 pb-4">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-teal-400" />
            <span>إشعارات سندات القبض والتحصيلات الأخيرة</span>
          </h2>
          <p className="text-xs text-slate-400">
            إرسال إشعار فوري للعميل بتأكيد استلام الدفعة النقدية أو التحويل البنكي وتوثيقها.
          </p>
        </div>

        {payments.length === 0 ? (
          <div className="p-8 text-center text-slate-500 space-y-2">
            <CreditCard className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">لا توجد سندات قبض مسجلة حالياً</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950/60 text-slate-300 font-bold border-b border-slate-800">
                <tr>
                  <th className="p-3">رقم السند</th>
                  <th className="p-3">العميل / الطرف</th>
                  <th className="p-3">المبلغ المستلم</th>
                  <th className="p-3">طريقة الدفع</th>
                  <th className="p-3">تاريخ الدفع</th>
                  <th className="p-3 text-center">إشعار العميل عبر واتساب</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {payments.slice(0, 15).map((pay) => {
                  const phone = pay.customer_phone || '';
                  const isSendingThis = sendingPayId === pay.id;

                  return (
                    <tr key={pay.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-100">
                        {pay.payment_number || `PAY-${pay.id.slice(0, 8)}`}
                      </td>
                      <td className="p-3 font-medium text-slate-100">{pay.customer_name || 'عميل'}</td>
                      <td className="p-3 font-mono font-bold text-emerald-400">
                        {parseFloat(pay.amount || 0).toLocaleString('en-US')} ر.ي.
                      </td>
                      <td className="p-3 text-slate-300">{pay.payment_method || 'نقداً'}</td>
                      <td className="p-3 text-slate-400 font-mono">
                        {pay.payment_date ? new Date(pay.payment_date).toLocaleDateString('en-US') : 'اليوم'}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleSendPayment(pay.id, phone)}
                          disabled={isSendingThis}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-600 text-teal-300 hover:text-white border border-teal-500/20 text-xs font-semibold transition-all disabled:opacity-40"
                        >
                          {isSendingThis ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Send className="w-3 h-3" />
                          )}
                          <span>إرسال إشعار استلام</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
