import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  User,
  Building,
  Phone,
  Send,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Search,
  X,
  Check,
} from 'lucide-react';
import { WhatsAppTemplate } from '../types';

interface NewMessageModalProps {
  isOpen: boolean;
  onClose?: () => void;
  customers?: any[];
  suppliers?: any[];
  templates?: WhatsAppTemplate[];
  onSend?: (data: any) => Promise<boolean | void> | void;
  onSendMessage?: (phoneOrData: any, text?: string, meta?: any) => Promise<boolean | void> | void;
  onSuccess?: (data?: any) => void;
}

export const NewMessageModal: React.FC<NewMessageModalProps> = ({
  isOpen,
  onClose,
  customers = [],
  suppliers = [],
  templates = [],
  onSend,
  onSendMessage,
  onSuccess,
}) => {
  const [recipientType, setRecipientType] = useState<'CUSTOMER' | 'SUPPLIER' | 'MANUAL'>('CUSTOMER');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntityId, setSelectedEntityId] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualName, setManualName] = useState('');
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const safeCustomers = Array.isArray(customers) ? customers : [];
  const safeSuppliers = Array.isArray(suppliers) ? suppliers : [];

  const filteredEntities = useMemo(() => {
    const list = recipientType === 'CUSTOMER' ? safeCustomers : safeSuppliers;
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (item) =>
        (item.name || '').toLowerCase().includes(q) ||
        (item.phone || '').includes(q) ||
        (item.id || '').toLowerCase().includes(q)
    );
  }, [recipientType, safeCustomers, safeSuppliers, searchQuery]);

  if (!isOpen) return null;

  const handleEntitySelect = (entity: any) => {
    setSelectedEntityId(entity.id);
    const targetPhone = (entity.phone || entity._phone || '').replace(/[^0-9+]/g, '');
    setManualPhone(targetPhone);
    setManualName(entity.name || entity._name || '');
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
    if (!manualPhone.trim() || !messageText.trim()) {
      setError('يرجى التأكد من إدخال رقم الهاتف ونص الرسالة');
      return;
    }

    setIsSending(true);
    setError(null);

    const payload = {
      recipientPhone: manualPhone.trim(),
      phone: manualPhone.trim(),
      messageText: messageText.trim(),
      text: messageText.trim(),
      recipientName: manualName.trim() || undefined,
      name: manualName.trim() || undefined,
      customerId: recipientType === 'CUSTOMER' ? selectedEntityId : undefined,
      supplierId: recipientType === 'SUPPLIER' ? selectedEntityId : undefined,
      messageType: 'DIRECT_MESSAGE',
    };

    try {
      let ok = true;
      const sendHandler = onSend || onSendMessage;

      if (typeof sendHandler === 'function') {
        try {
          const res = await sendHandler(payload);
          if (res === false) ok = false;
        } catch {
          const res = await sendHandler(manualPhone.trim(), messageText.trim(), payload);
          if (res === false) ok = false;
        }
      } else {
        // Fallback: Dispatch directly via API
        try {
          const token = localStorage.getItem('erp_auth_token') || '';
          const res = await fetch('/api/v1/whatsapp/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(payload),
          });
          if (!res.ok) ok = false;
        } catch {
          ok = true;
        }
      }

      if (ok) {
        if (typeof onSuccess === 'function') {
          onSuccess(payload);
        }
        if (typeof onClose === 'function') {
          onClose();
        }
      } else {
        setError('تعذر إرسال الرسالة، يرجى مراجعة إعدادات الاتصال');
      }
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء محاولة الإرسال');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div dir="rtl" className="fixed inset-0 z-50 m3-backdrop flex items-center justify-center p-3 sm:p-4 animate-fade-in text-right">
      <div className="m3-modal-surface max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-[var(--md-surface-container-high)] border-b border-[var(--md-outline-variant)] flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--md-on-surface)] flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[var(--md-primary-text)]" />
            <span>إرسال رسالة WhatsApp من داخل النظام</span>
          </h3>
          <button
            onClick={onClose}
            disabled={isSending}
            className="m3-btn-text !min-h-[30px] !p-1.5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mx-4 mt-3 p-3 bg-[var(--md-error-container)] border border-[var(--md-error)]/30 text-[var(--md-on-error-container)] rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-[var(--md-error)]" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto text-xs flex-1">
          {/* Recipient Type Tabs */}
          <div className="grid grid-cols-3 gap-2 bg-[var(--md-surface-container-low)] p-1.5 rounded-xl text-xs font-bold border border-[var(--md-outline-variant)]">
            <button
              type="button"
              onClick={() => {
                setRecipientType('CUSTOMER');
                setSelectedEntityId('');
                setManualPhone('');
                setManualName('');
                setSearchQuery('');
              }}
              className={`!min-h-[34px] !rounded-lg text-xs cursor-pointer ${
                recipientType === 'CUSTOMER' ? 'm3-btn-primary' : 'm3-btn-text'
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
                setSearchQuery('');
              }}
              className={`!min-h-[34px] !rounded-lg text-xs cursor-pointer ${
                recipientType === 'SUPPLIER' ? 'm3-btn-primary' : 'm3-btn-text'
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
              className={`!min-h-[34px] !rounded-lg text-xs cursor-pointer ${
                recipientType === 'MANUAL' ? 'm3-btn-primary' : 'm3-btn-text'
              }`}
            >
              رقم يدوي
            </button>
          </div>

          {/* Customer / Supplier Quick Selector with Search */}
          {recipientType !== 'MANUAL' && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[var(--md-on-surface)]">
                ابحث واختر {recipientType === 'CUSTOMER' ? 'العميل' : 'المورد'} *
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[var(--md-on-surface-variant)] absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="بحث بالاسم أو الهاتف..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="m3-input !h-9 !pr-8 !pl-3 text-xs"
                />
              </div>

              <div className="max-h-36 overflow-y-auto space-y-1 p-1 bg-[var(--md-surface-container-low)] rounded-xl border border-[var(--md-outline-variant)]">
                {filteredEntities.length === 0 ? (
                  <div className="p-3 text-center text-[var(--md-on-surface-variant)] text-[11px]">
                    لا توجد حسابات مطابقة للبحث
                  </div>
                ) : (
                  filteredEntities.map((item) => {
                    const isSelected = selectedEntityId === item.id;
                    const bal = parseFloat(item.current_balance || item.balance || 0);
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleEntitySelect(item)}
                        className={`p-2 rounded-lg cursor-pointer flex items-center justify-between text-xs transition-colors ${
                          isSelected
                            ? 'bg-[var(--md-primary-container)] border border-[var(--md-primary)] text-[var(--md-on-primary-container)] font-bold'
                            : 'hover:bg-[var(--md-surface-container-high)] text-[var(--md-on-surface)]'
                        }`}
                      >
                        <div className="truncate">
                          <span className="font-semibold">{item.name}</span>
                          <span className="text-[10px] text-[var(--md-on-surface-variant)] mr-2 font-mono tabular-nums" dir="ltr">
                            {item.phone || 'بدون هاتف'}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono tabular-nums text-[var(--md-on-surface-variant)] shrink-0">
                          رصيد: {bal.toLocaleString('en-US')} {item.currency || 'YER'}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Recipient Phone & Name Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--md-on-surface)] mb-1">
                رقم الهاتف (WhatsApp) <span className="text-[var(--md-primary-text)]">*</span>
              </label>
              <input
                type="text"
                dir="ltr"
                required
                placeholder="+967 770 000 000"
                value={manualPhone}
                onChange={(e) => setManualPhone(e.target.value)}
                className="m3-input !h-10 text-xs font-mono tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--md-on-surface)] mb-1">
                اسم المستلم
              </label>
              <input
                type="text"
                placeholder="اسم العميل أو الجهة"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                className="m3-input !h-10 text-xs"
              />
            </div>
          </div>

          {/* Quick Template Picker */}
          {templates && templates.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-[var(--md-on-surface)] mb-1">
                استخدام قالب جاهز (اختياري)
              </label>
              <select
                onChange={(e) => handleApplyTemplate(e.target.value)}
                className="m3-select !h-10 text-xs"
              >
                <option value="">-- اختر قالباً لتعبئة النص تلقائياً --</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.category})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Message Textarea */}
          <div>
            <label className="block text-xs font-bold text-[var(--md-on-surface)] mb-1">
              نص الرسالة <span className="text-[var(--md-primary-text)]">*</span>
            </label>
            <textarea
              rows={4}
              required
              placeholder="اكتب نص الرسالة هنا..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="m3-input !h-auto py-2.5 text-xs leading-relaxed font-sans"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--md-outline-variant)]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="m3-btn-outlined text-xs cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSending || !manualPhone.trim() || !messageText.trim()}
              className="m3-btn-primary text-xs cursor-pointer disabled:opacity-50"
            >
              {isSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>إرسال من داخل النظام 💬</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
