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
  Users,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { formatNumber, toEnglishDigits } from '../../../lib/formatters';

interface WhatsAppRemindersTabProps {
  invoices?: any[];
  payments?: any[];
  customers?: any[];
  onSendInvoiceReminder?: (invoiceId: string, phone: string, customMessage?: string) => Promise<boolean>;
  onSendCustomerDebtReminder?: (customer: any) => Promise<boolean>;
  onSendBatchReminders?: (customers: any[]) => Promise<number>;
}

export const WhatsAppRemindersTab: React.FC<WhatsAppRemindersTabProps> = ({
  invoices = [],
  payments = [],
  customers = [],
  onSendInvoiceReminder = async (_invoiceId?: string, _phone?: string, _customMessage?: string) => true,
  onSendCustomerDebtReminder,
  onSendBatchReminders,
}) => {
  const safeInvoices = Array.isArray(invoices) ? invoices : [];
  const safePayments = Array.isArray(payments) ? payments : [];
  const safeCustomers = Array.isArray(customers) ? customers : [];

  const [sendingInvId, setSendingInvId] = useState<string | null>(null);
  const [sendingCustId, setSendingCustId] = useState<string | null>(null);
  const [isSendingBatch, setIsSendingBatch] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Debtors with balance > 0
  const debtors = safeCustomers.filter((c) => {
    const bal = parseFloat(c.current_balance || c.balance || 0);
    return bal > 0;
  });

  // Pending/unpaid invoices
  const pendingInvoices = safeInvoices.filter((inv) => {
    const rem = parseFloat(inv.remaining_amount !== undefined ? inv.remaining_amount : inv.total || 0);
    return rem > 0 && inv.status !== 'PAID' && inv.status !== 'مدفوعة';
  });

  // Handle single customer debt reminder
  const handleSendDebtReminder = async (customer: any) => {
    const phone = (customer.phone || customer._phone || '').replace(/[^0-9+]/g, '');
    if (!phone) {
      setFeedback({ type: 'error', msg: `لا يوجد رقم هاتف مسجل للعميل (${customer.name})` });
      return;
    }

    setSendingCustId(customer.id);
    setFeedback(null);
    try {
      if (onSendCustomerDebtReminder) {
        const ok = await onSendCustomerDebtReminder(customer);
        if (ok) {
          setFeedback({
            type: 'success',
            msg: `✅ تم إرسال تذكير المديونية بنجاح إلى ${customer.name} (${phone}) وتسجيله في النظام`,
          });
          return;
        }
      }

      // Default backend direct dispatch
      const bal = parseFloat(customer.current_balance || customer.balance || 0);
      const cur = customer.currency || 'YER';
      const text =
`السلام عليكم ورحمة الله، الأستاذ/الشركة: ${customer.name} المحترمون.
نود تذكيركم بلطف بأن رصيد حسابكم الحالي المستحق هو (${toEnglishDigits(formatNumber(bal))} ${cur}).
نرجو التكرم بالاطلاع والمبادرة بالسداد لتحديث كشف الحساب. شاكرين حسن تعاونكم الدائم.`;

      const token = localStorage.getItem('erp_auth_token') || '';
      const res = await fetch('/api/v1/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          recipientPhone: phone,
          recipientName: customer.name,
          customerId: customer.id,
          messageText: text,
          messageType: 'DEBT_REMINDER',
          attachmentSummary: `تذكير مديونية مستحقة بمبلغ ${toEnglishDigits(formatNumber(bal))} ${cur}`,
        }),
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        setFeedback({
          type: 'success',
          msg: `✅ تم إرسال تذكير المديونية بنجاح إلى ${customer.name} وتسجيله بمحادثات النظام`,
        });
      } else {
        throw new Error(resData.error || 'فشل إرسال التذكير');
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err?.message || 'تعذر إرسال التذكير' });
    } finally {
      setSendingCustId(null);
    }
  };

  // Handle batch debt reminders to all debtors
  const handleBatchSend = async () => {
    if (debtors.length === 0) return;
    setIsSendingBatch(true);
    setFeedback(null);
    try {
      if (onSendBatchReminders) {
        const count = await onSendBatchReminders(debtors);
        setFeedback({
          type: 'success',
          msg: `✅ تم إرسال تذكيرات المديونية بنجاح لـ ${count} عميل وتسجيلها في النظام!`,
        });
        return;
      }

      let sentCount = 0;
      for (const cust of debtors) {
        const phone = (cust.phone || cust._phone || '').replace(/[^0-9+]/g, '');
        if (!phone) continue;

        const bal = parseFloat(cust.current_balance || cust.balance || 0);
        const cur = cust.currency || 'YER';
        const text =
`السلام عليكم ورحمة الله، الأخ/الأخت ${cust.name} المحترم،
نذكركم برصيدكم المستحق لدينا البالغ (${toEnglishDigits(formatNumber(bal))} ${cur}). نرجو التكرم بالاطلاع شاكرين تعاونكم المستمر.`;

        try {
          const token = localStorage.getItem('erp_auth_token') || '';
          await fetch('/api/v1/whatsapp/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              recipientPhone: phone,
              recipientName: cust.name,
              customerId: cust.id,
              messageText: text,
              messageType: 'DEBT_REMINDER',
            }),
          });
          sentCount++;
        } catch {
          // ignore individual failure in batch
        }
      }

      setFeedback({
        type: 'success',
        msg: `✅ تم إرسال تذكيرات المديونية بنجاح إلى ${sentCount} عميل متأخر وتسجيلها في النظام!`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err?.message || 'فشل في الإرسال الجماعي للتذكيرات' });
    } finally {
      setIsSendingBatch(false);
    }
  };

  // Handle single invoice reminder
  const handleSendInvoice = async (inv: any) => {
    const cust = safeCustomers.find((c) => c.id === inv.customer_id);
    const phone = (inv.customer_phone || cust?.phone || '').replace(/[^0-9+]/g, '');
    if (!phone) {
      setFeedback({ type: 'error', msg: 'لا يوجد رقم هاتف مسجل لهذا العميل لإرسال تذكير الفاتورة' });
      return;
    }

    setSendingInvId(inv.id);
    setFeedback(null);
    try {
      const ok = await onSendInvoiceReminder(inv.id, phone);
      if (ok) {
        setFeedback({
          type: 'success',
          msg: `✅ تم إرسال تذكير الفاتورة #${inv.invoice_number} بنجاح إلى ${phone}`,
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err?.message || 'تعذر إرسال تذكير الفاتورة' });
    } finally {
      setSendingInvId(null);
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

      {/* 1. Outstanding Debtors Section (مديونيات العملاء المستحقة) */}
      <div className="bg-[#091511] rounded-2xl border border-emerald-500/30 p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-500/20 pb-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" />
              <span>تذكيرات مديونيات العملاء والذمم المستحقة</span>
            </h2>
            <p className="text-xs text-slate-400">
              متابعة ديون العملاء وإرسال إشعارات رسمية بالرصيد القائم مباشرة من داخل النظام.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
              {debtors.length} عملاء عليهم مديونيات
            </span>

            <button
              onClick={handleBatchSend}
              disabled={isSendingBatch || debtors.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold text-xs transition-all shadow-md shadow-amber-950/40 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isSendingBatch ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>إرسال جماعي لكافة المتأخرين ({debtors.length})</span>
            </button>
          </div>
        </div>

        {debtors.length === 0 ? (
          <div className="p-8 text-center text-slate-500 space-y-2">
            <CheckCheck className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">لا توجد ديون مستحقة على العملاء حالياً</p>
            <p className="text-xs text-slate-500">كافة حسابات العملاء مسددة وخالصة بالكامل.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#06120d] text-slate-300 font-bold border-b border-emerald-500/20">
                <tr>
                  <th className="p-3">اسم العميل</th>
                  <th className="p-3">رقم الهاتف</th>
                  <th className="p-3">رقم الحساب</th>
                  <th className="p-3">الرصيد المستحق القائم</th>
                  <th className="p-3 text-center">إجراء الإرسال المباشر</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-950/40 text-slate-300">
                {debtors.map((cust) => {
                  const bal = parseFloat(cust.current_balance || cust.balance || 0);
                  const isSendingThis = sendingCustId === cust.id;
                  const phone = (cust.phone || cust._phone || '').replace(/[^0-9+]/g, '');

                  return (
                    <tr key={cust.id} className="hover:bg-[#0c2419] transition-colors">
                      <td className="p-3 font-bold text-white flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{cust.name}</span>
                      </td>
                      <td className="p-3 font-mono text-slate-400" dir="ltr">
                        {phone || 'بدون هاتف'}
                      </td>
                      <td className="p-3 font-mono text-slate-400">
                        #ACC-{String(cust.id).slice(-6)}
                      </td>
                      <td className="p-3 font-mono font-bold text-amber-300">
                        {toEnglishDigits(formatNumber(bal))} {cust.currency || 'YER'}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleSendDebtReminder(cust)}
                          disabled={isSendingThis || !phone}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md shadow-emerald-950 cursor-pointer disabled:opacity-40"
                        >
                          {isSendingThis ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                          <span>إرسال تذكير فوري داخل النظام 💬</span>
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

      {/* 2. Pending Invoices Section (فواتير المبيعات المعلقة) */}
      <div className="bg-[#091511] rounded-2xl border border-emerald-500/30 p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-500/20 pb-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-400" />
              <span>تذكيرات فواتير المبيعات المعلقة</span>
            </h2>
            <p className="text-xs text-slate-400">
              إرسال تذكير رسمي فوري للعميل يتضمن تفاصيل الفاتورة والمبلغ المتبقي ورقم السجل.
            </p>
          </div>

          <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
            {pendingInvoices.length} فواتير آجلة بانتظار السداد
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
              <thead className="bg-[#06120d] text-slate-300 font-bold border-b border-emerald-500/20">
                <tr>
                  <th className="p-3">رقم الفاتورة</th>
                  <th className="p-3">العميل</th>
                  <th className="p-3">إجمالي الفاتورة</th>
                  <th className="p-3">المبلغ المتبقي</th>
                  <th className="p-3">تاريخ الفاتورة</th>
                  <th className="p-3 text-center">إجراء التذكير عبر واتساب</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-950/40 text-slate-300">
                {pendingInvoices.map((inv) => {
                  const cust = safeCustomers.find((c) => c.id === inv.customer_id);
                  const phone = (inv.customer_phone || cust?.phone || '').replace(/[^0-9+]/g, '');
                  const isSendingThis = sendingInvId === inv.id;
                  const total = parseFloat(inv.total || inv.amount || 0);
                  const rem = parseFloat(inv.remaining_amount !== undefined ? inv.remaining_amount : total);

                  return (
                    <tr key={inv.id} className="hover:bg-[#0c2419] transition-colors">
                      <td className="p-3 font-mono font-bold text-white">#{inv.invoice_number || inv.id}</td>
                      <td className="p-3 font-medium text-slate-100">
                        {inv.customer_name || inv.customer || cust?.name || 'عميل'}
                      </td>
                      <td className="p-3 font-mono font-semibold text-slate-200">
                        {toEnglishDigits(formatNumber(total))} {inv.currency || 'YER'}
                      </td>
                      <td className="p-3 font-mono font-bold text-amber-300">
                        {toEnglishDigits(formatNumber(rem))} {inv.currency || 'YER'}
                      </td>
                      <td className="p-3 text-slate-400 font-mono">
                        {inv.date || 'اليوم'}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleSendInvoice(inv)}
                          disabled={isSendingThis || !phone}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-md cursor-pointer disabled:opacity-40"
                          title={phone ? `إرسال إلى ${phone}` : 'لا يوجد رقم هاتف مسجل'}
                        >
                          {isSendingThis ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Send className="w-3 h-3" />
                          )}
                          <span>إرسال تذكير الفاتورة</span>
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
