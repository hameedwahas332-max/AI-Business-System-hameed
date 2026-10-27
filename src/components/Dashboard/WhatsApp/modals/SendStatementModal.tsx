import React, { useState, useMemo } from 'react';
import {
  FileText,
  User,
  Building,
  DollarSign,
  Send,
  RefreshCw,
  AlertCircle,
  Calendar,
  Search,
  X,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import { formatNumber, toEnglishDigits } from '../../../../lib/formatters';

interface SendStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers?: any[];
  suppliers?: any[];
  companyName?: string;
  onSendStatement?: (entityId: string, type: 'CUSTOMER' | 'SUPPLIER', phone: string, customMessage?: string) => Promise<boolean | void> | boolean | void;
  onSend?: (data: {
    entityId: string;
    entityType: 'CUSTOMER' | 'SUPPLIER';
    recipientPhone: string;
    recipientName: string;
    messageText: string;
    statementSummary?: any;
  }) => Promise<boolean | void> | boolean | void;
}

export const SendStatementModal: React.FC<SendStatementModalProps> = ({
  isOpen,
  onClose,
  customers = [],
  suppliers = [],
  companyName = 'نظام المحاسبي الذكي ERP',
  onSendStatement,
  onSend,
}) => {
  const [type, setType] = useState<'CUSTOMER' | 'SUPPLIER'>('CUSTOMER');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [phone, setPhone] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const safeList = type === 'CUSTOMER' ? (Array.isArray(customers) ? customers : []) : (Array.isArray(suppliers) ? suppliers : []);

  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return safeList;
    const q = searchQuery.toLowerCase().trim();
    return safeList.filter(
      (item) =>
        (item.name || '').toLowerCase().includes(q) ||
        (item.phone || '').includes(q) ||
        (item.id || '').toLowerCase().includes(q)
    );
  }, [safeList, searchQuery]);

  const selectedEntity = safeList.find((item) => item.id === selectedId);

  if (!isOpen) return null;

  const handleSelectEntity = (item: any) => {
    setSelectedId(item.id);
    const cleanPhone = (item.phone || item._phone || '').replace(/[^0-9+]/g, '');
    setPhone(cleanPhone);

    const bal = parseFloat(item.current_balance || item.balance || 0);
    const cur = item.currency || item._currency || 'YER';
    const accCode = `ACC-${String(item.id).slice(-6)}`;
    const todayStr = new Date().toISOString().slice(0, 10);

    const msg =
`📄 كشف حساب معتمد — ${companyName}
═════════════════════════════
👤 ${type === 'CUSTOMER' ? 'العميل' : 'المورد'}: ${item.name || item._name}
🔢 رقم الحساب: ${accCode}
📅 تاريخ الكشف: ${todayStr}
═════════════════════════════
• الرصيد المستحق الحالي: ${toEnglishDigits(formatNumber(bal))} ${cur} (${bal > 0 ? (type === 'CUSTOMER' ? 'مدين مستحق عليكم' : 'دائن مستحق لكم') : (bal < 0 ? 'رصيد دائن' : 'حساب مسدد بالكامل')})
═════════════════════════════
شاكرين ومقدرين حسن تعاملكم معنا.`;

    setCustomMessage(msg);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !phone.trim()) {
      setError('يرجى تحديد الحساب ورقم الهاتف');
      return;
    }

    setIsSending(true);
    setError(null);
    try {
      let isSuccess = false;
      const entityName = selectedEntity?.name || selectedEntity?._name || 'جهة اتصال';

      if (typeof onSendStatement === 'function') {
        const result = await onSendStatement(selectedId, type, phone.trim(), customMessage.trim());
        isSuccess = result !== false;
      } else if (typeof onSend === 'function') {
        const result = await onSend({
          entityId: selectedId,
          entityType: type,
          recipientPhone: phone.trim(),
          recipientName: entityName,
          messageText: customMessage.trim(),
          statementSummary: {
            entityId: selectedId,
            entityName,
            balance: selectedEntity?.current_balance || selectedEntity?.balance || 0,
            currency: selectedEntity?.currency || 'YER',
          },
        });
        isSuccess = result !== false;
      } else {
        // Direct API fallback
        const res = await fetch('/api/v1/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientPhone: phone.trim(),
            recipientName: entityName,
            messageText: customMessage.trim(),
            messageType: 'STATEMENT',
            customerId: type === 'CUSTOMER' ? selectedId : undefined,
            supplierId: type === 'SUPPLIER' ? selectedId : undefined,
          }),
        });
        isSuccess = res.ok;
      }

      if (isSuccess) {
        if (typeof onClose === 'function') {
          onClose();
        }
      } else {
        setError('فشل في إرسال كشف الحساب. يرجى التحقق من الرقم والاتصال.');
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
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>إرسال كشف حساب رسمي عبر WhatsApp داخل النظام</span>
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
          {/* Toggle Type */}
          <div className="grid grid-cols-2 gap-2 bg-[#06120d] p-1.5 rounded-xl text-xs font-bold border border-emerald-500/20">
            <button
              type="button"
              onClick={() => {
                setType('CUSTOMER');
                setSelectedId('');
                setPhone('');
                setCustomMessage('');
                setSearchQuery('');
              }}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                type === 'CUSTOMER' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              كشف حساب عميل
            </button>
            <button
              type="button"
              onClick={() => {
                setType('SUPPLIER');
                setSelectedId('');
                setPhone('');
                setCustomMessage('');
                setSearchQuery('');
              }}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                type === 'SUPPLIER' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              كشف حساب مورد
            </button>
          </div>

          {/* Search & Pick Entity */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-200">
              اختر {type === 'CUSTOMER' ? 'العميل' : 'المورد'} *
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ابحث بالاسم أو الهاتف..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-8 py-2 bg-[#06120d] border border-emerald-500/20 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-400 placeholder:text-slate-600"
              />
            </div>

            <div className="max-h-36 overflow-y-auto space-y-1 p-1 bg-[#06120d] rounded-xl border border-emerald-500/20">
              {filteredList.length === 0 ? (
                <div className="p-3 text-center text-slate-500 text-[11px]">لا توجد نتائج مطابقة</div>
              ) : (
                filteredList.map((item) => {
                  const isSelected = selectedId === item.id;
                  const bal = parseFloat(item.current_balance || item.balance || 0);
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectEntity(item)}
                      className={`p-2 rounded-lg cursor-pointer flex items-center justify-between text-xs transition-colors ${
                        isSelected
                          ? 'bg-emerald-950/60 border border-emerald-500 text-emerald-300 font-bold'
                          : 'hover:bg-[#0c2419] text-slate-300'
                      }`}
                    >
                      <div className="truncate">
                        <span className="font-semibold">{item.name}</span>
                        <span className="text-[10px] text-slate-500 mr-2 font-mono" dir="ltr">
                          {item.phone || 'بدون هاتف'}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-emerald-400 shrink-0">
                        {toEnglishDigits(formatNumber(bal))} {item.currency || 'YER'}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Selected Entity Card */}
          {selectedEntity && (
            <div className="p-3 bg-[#06140e] border border-emerald-500/30 rounded-xl text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">{selectedEntity.name}</span>
                <span className="font-mono text-emerald-400 font-bold">
                  #ACC-{String(selectedEntity.id).slice(-6)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>الرصيد المالي المعتمد في الـ ERP:</span>
                <span className="font-mono font-black text-emerald-300 text-xs">
                  {toEnglishDigits(formatNumber(parseFloat(selectedEntity.current_balance || selectedEntity.balance || 0)))}{' '}
                  {selectedEntity.currency || 'YER'}
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

          {/* Custom Message Body */}
          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1">
              نص رسالة كشف الحساب
            </label>
            <textarea
              rows={5}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="سيتم توليد نص كشف الحساب تلقائياً..."
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
              disabled={isSending || !selectedId || !phone.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-950 cursor-pointer disabled:opacity-50"
            >
              {isSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>إرسال كشف الحساب فوراً 💬</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
