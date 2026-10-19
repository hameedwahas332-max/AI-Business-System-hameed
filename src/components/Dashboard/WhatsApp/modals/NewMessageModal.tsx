import React, { useState } from 'react';
import {
  MessageSquare,
  User,
  Building,
  Phone,
  Send,
  Sparkles,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { WhatsAppTemplate } from '../types';

interface NewMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: any[];
  suppliers: any[];
  templates: WhatsAppTemplate[];
  onSendMessage: (phone: string, text: string, meta?: any) => Promise<boolean>;
}

export const NewMessageModal: React.FC<NewMessageModalProps> = ({
  isOpen,
  onClose,
  customers,
  suppliers,
  templates,
  onSendMessage,
}) => {
  const [recipientType, setRecipientType] = useState<'CUSTOMER' | 'SUPPLIER' | 'MANUAL'>('CUSTOMER');
  const [selectedEntityId, setSelectedEntityId] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualName, setManualName] = useState('');
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleEntityChange = (id: string) => {
    setSelectedEntityId(id);
    if (recipientType === 'CUSTOMER') {
      const c = customers.find((item) => item.id === id);
      if (c?.phone) setManualPhone(c.phone);
      if (c?.name) setManualName(c.name);
    } else if (recipientType === 'SUPPLIER') {
      const s = suppliers.find((item) => item.id === id);
      if (s?.phone) setManualPhone(s.phone);
      if (s?.name) setManualName(s.name);
    }
  };

  const handleApplyTemplate = (templateId: string) => {
    const tmpl = templates.find((t) => t.id === templateId);
    if (tmpl) {
      let body = tmpl.body;
      if (manualName) {
        body = body.replace(/\{\{\s*customer_name\s*\}\}/g, manualName);
      }
      setMessageText(body);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPhone.trim() || !messageText.trim()) return;

    setIsSending(true);
    setError(null);
    try {
      const ok = await onSendMessage(manualPhone.trim(), messageText.trim(), {
        customerId: recipientType === 'CUSTOMER' ? selectedEntityId : undefined,
        supplierId: recipientType === 'SUPPLIER' ? selectedEntityId : undefined,
      });
      if (ok) {
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء محاولة الإرسال');
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
            <MessageSquare className="w-5 h-5 text-emerald-600" />
            <span>إرسال رسالة WhatsApp جديدة</span>
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
          {/* Recipient Type Tabs */}
          <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setRecipientType('CUSTOMER');
                setSelectedEntityId('');
                setManualPhone('');
                setManualName('');
              }}
              className={`py-1.5 rounded-lg transition-all ${
                recipientType === 'CUSTOMER' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              عميل مسجل
            </button>
            <button
              type="button"
              onClick={() => {
                setRecipientType('SUPPLIER');
                setSelectedEntityId('');
                setManualPhone('');
                setManualName('');
              }}
              className={`py-1.5 rounded-lg transition-all ${
                recipientType === 'SUPPLIER' ? 'bg-white text-blue-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              مورد مسجل
            </button>
            <button
              type="button"
              onClick={() => {
                setRecipientType('MANUAL');
                setSelectedEntityId('');
              }}
              className={`py-1.5 rounded-lg transition-all ${
                recipientType === 'MANUAL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              رقم يدوي
            </button>
          </div>

          {/* Customer / Supplier Dropdown */}
          {recipientType === 'CUSTOMER' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">اختر العميل *</label>
              <select
                required
                value={selectedEntityId}
                onChange={(e) => handleEntityChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
              >
                <option value="">-- اختر من قائمة العملاء --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone || 'بدون هاتف'}) - رصيد: {parseFloat(c.current_balance || 0).toLocaleString('ar-YE')} ر.ي.
                  </option>
                ))}
              </select>
            </div>
          )}

          {recipientType === 'SUPPLIER' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">اختر المورد *</label>
              <select
                required
                value={selectedEntityId}
                onChange={(e) => handleEntityChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
              >
                <option value="">-- اختر من قائمة الموردين --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.phone || 'بدون هاتف'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Phone input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف (WhatsApp) *</label>
            <input
              type="text"
              dir="ltr"
              required
              placeholder="مثال: +967 770 000 000"
              value={manualPhone}
              onChange={(e) => setManualPhone(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900"
            />
          </div>

          {/* Template Quick Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">اختيار قالب جاهز (اختياري)</label>
            <select
              onChange={(e) => handleApplyTemplate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700"
            >
              <option value="">-- اختر قالباً لتعبئة النص تلقائياً --</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.category})
                </option>
              ))}
            </select>
          </div>

          {/* Message Textarea */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">نص الرسالة *</label>
            <textarea
              rows={4}
              required
              placeholder="اكتب نص الرسالة هنا..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 leading-relaxed"
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
              disabled={isSending || !manualPhone.trim() || !messageText.trim()}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
            >
              {isSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>إرسال الرسالة</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
