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
    <div id="whatsapp-reminders-section" dir="rtl" className="space-y-6">
      
      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between gap-3 border animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-[var(--md-success-container)] text-[var(--md-on-success-container)] border-[var(--md-success)]/30'
              : 'bg-[var(--md-error-container)] text-[var(--md-on-error-container)] border-[var(--md-error)]/30'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCheck className="w-4 h-4 text-[var(--md-success)]" />
            ) : (
              <AlertCircle className="w-4 h-4 text-[var(--md-error)]" />
            )}
            <span>{feedback.msg}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="m3-btn-text !min-h-[28px] !px-2 !py-1 text-[11px] font-bold underline">
            إغلاق
          </button>
        </div>
      )}

      {/* 1. Outstanding Debtors Section (مديونيات العملاء المستحقة) */}
      <div className="m3-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--md-outline-variant)] pb-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-[var(--md-on-surface)] flex items-center gap-2">
              <Users className="w-5 h-5 text-[var(--md-warning)]" />
              <span>تذكيرات مديونيات العملاء والذمم المستحقة</span>
            </h2>
            <p className="text-xs text-[var(--md-on-surface-variant)]">
              متابعة ديون العملاء وإرسال إشعارات رسمية بالرصيد القائم مباشرة من داخل النظام.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="m3-badge m3-badge-warning px-3 py-1 text-xs font-bold tabular-nums">
              {debtors.length} عملاء عليهم مديونيات
            </span>

            <button
              onClick={handleBatchSend}
              disabled={isSendingBatch || debtors.length === 0}
              className="m3-btn-tonal !bg-[var(--md-warning-container)] !text-[var(--md-on-warning-container)] border border-[var(--md-warning)]/30 text-xs cursor-pointer disabled:opacity-50"
            >
              {isSendingBatch ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span className="tabular-nums">إرسال جماعي لكافة المتأخرين ({debtors.length})</span>
            </button>
          </div>
        </div>

        {debtors.length === 0 ? (
          <div className="p-8 text-center text-[var(--md-on-surface-variant)] space-y-2">
            <CheckCheck className="w-8 h-8 text-[var(--md-success)] mx-auto" />
            <p className="text-sm font-semibold text-[var(--md-on-surface)]">لا توجد ديون مستحقة على العملاء حالياً</p>
            <p className="text-xs text-[var(--md-on-surface-variant)]">كافة حسابات العملاء مسددة وخالصة بالكامل.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--md-outline-variant)]">
            <table className="m3-table w-full text-right text-xs">
              <thead className="m3-thead">
                <tr>
                  <th className="m3-th">اسم العميل</th>
                  <th className="m3-th">رقم الهاتف</th>
                  <th className="m3-th">رقم الحساب</th>
                  <th className="m3-th">الرصيد المستحق القائم</th>
                  <th className="m3-th text-center">إجراء الإرسال المباشر</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--md-outline-variant)] text-[var(--md-on-surface)]">
                {debtors.map((cust) => {
                  const bal = parseFloat(cust.current_balance || cust.balance || 0);
                  const isSendingThis = sendingCustId === cust.id;
                  const phone = (cust.phone || cust._phone || '').replace(/[^0-9+]/g, '');

                  return (
                    <tr key={cust.id} className="hover:bg-[var(--md-surface-container-high)]/60 transition-colors">
                      <td className="p-3 font-bold text-[var(--md-on-surface)] flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-[var(--md-primary-text)] shrink-0" />
                        <span>{cust.name}</span>
                      </td>
                      <td className="p-3 font-mono tabular-nums text-[var(--md-on-surface-variant)]" dir="ltr">
                        {phone || 'بدون هاتف'}
                      </td>
                      <td className="p-3 font-mono tabular-nums text-[var(--md-on-surface-variant)]">
                        #ACC-{String(cust.id).slice(-6)}
                      </td>
                      <td className="p-3 font-mono tabular-nums font-bold text-[var(--md-warning)]">
                        {toEnglishDigits(formatNumber(bal))} {cust.currency || 'YER'}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleSendDebtReminder(cust)}
                          disabled={isSendingThis || !phone}
                          className="m3-btn-primary !min-h-[32px] !px-3.5 !py-1.5 text-xs cursor-pointer disabled:opacity-40"
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
      <div className="m3-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--md-outline-variant)] pb-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-[var(--md-on-surface)] flex items-center gap-2">
              <FileText className="w-5 h-5 text-[var(--md-primary-text)]" />
              <span>تذكيرات فواتير المبيعات المعلقة</span>
            </h2>
            <p className="text-xs text-[var(--md-on-surface-variant)]">
              إرسال تذكير رسمي فوري للعميل يتضمن تفاصيل الفاتورة والمبلغ المتبقي ورقم السجل.
            </p>
          </div>

          <span className="m3-badge m3-badge-primary px-3 py-1 text-xs font-bold tabular-nums">
            {pendingInvoices.length} فواتير آجلة بانتظار السداد
          </span>
        </div>

        {pendingInvoices.length === 0 ? (
          <div className="p-8 text-center text-[var(--md-on-surface-variant)] space-y-2">
            <CheckCheck className="w-8 h-8 text-[var(--md-success)] mx-auto" />
            <p className="text-sm font-semibold text-[var(--md-on-surface)]">لا توجد فواتير معلقة حالياً</p>
            <p className="text-xs text-[var(--md-on-surface-variant)]">جميع فواتير المبيعات مسددة بالكامل.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--md-outline-variant)]">
            <table className="m3-table w-full text-right text-xs">
              <thead className="m3-thead">
                <tr>
                  <th className="m3-th">رقم الفاتورة</th>
                  <th className="m3-th">العميل</th>
                  <th className="m3-th">إجمالي الفاتورة</th>
                  <th className="m3-th">المبلغ المتبقي</th>
                  <th className="m3-th">تاريخ الفاتورة</th>
                  <th className="m3-th text-center">إجراء التذكير عبر واتساب</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--md-outline-variant)] text-[var(--md-on-surface)]">
                {pendingInvoices.map((inv) => {
                  const cust = safeCustomers.find((c) => c.id === inv.customer_id);
                  const phone = (inv.customer_phone || cust?.phone || '').replace(/[^0-9+]/g, '');
                  const isSendingThis = sendingInvId === inv.id;
                  const total = parseFloat(inv.total || inv.amount || 0);
                  const rem = parseFloat(inv.remaining_amount !== undefined ? inv.remaining_amount : total);

                  return (
                    <tr key={inv.id} className="hover:bg-[var(--md-surface-container-high)]/60 transition-colors">
                      <td className="p-3 font-mono tabular-nums font-bold text-[var(--md-on-surface)]">#{inv.invoice_number || inv.id}</td>
                      <td className="p-3 font-medium text-[var(--md-on-surface)]">
                        {inv.customer_name || inv.customer || cust?.name || 'عميل'}
                      </td>
                      <td className="p-3 font-mono tabular-nums font-semibold text-[var(--md-on-surface)]">
                        {toEnglishDigits(formatNumber(total))} {inv.currency || 'YER'}
                      </td>
                      <td className="p-3 font-mono tabular-nums font-bold text-[var(--md-warning)]">
                        {toEnglishDigits(formatNumber(rem))} {inv.currency || 'YER'}
                      </td>
                      <td className="p-3 text-[var(--md-on-surface-variant)] font-mono tabular-nums">
                        {inv.date || 'اليوم'}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleSendInvoice(inv)}
                          disabled={isSendingThis || !phone}
                          className="m3-btn-primary !min-h-[32px] !px-3 !py-1.5 text-xs cursor-pointer disabled:opacity-40"
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
