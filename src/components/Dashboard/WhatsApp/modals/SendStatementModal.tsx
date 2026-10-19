import React, { useState } from 'react';
import {
  FileText,
  User,
  Building,
  DollarSign,
  Send,
  RefreshCw,
  AlertCircle,
  Calendar,
} from 'lucide-react';

interface SendStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: any[];
  suppliers: any[];
  onSendStatement: (entityId: string, type: 'CUSTOMER' | 'SUPPLIER', phone: string) => Promise<boolean>;
}

export const SendStatementModal: React.FC<SendStatementModalProps> = ({
  isOpen,
  onClose,
  customers,
  suppliers,
  onSendStatement,
}) => {
  const [type, setType] = useState<'CUSTOMER' | 'SUPPLIER'>('CUSTOMER');
  const [selectedId, setSelectedId] = useState('');
  const [phone, setPhone] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentList = type === 'CUSTOMER' ? customers : suppliers;
  const selectedEntity = currentList.find((item) => item.id === selectedId);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    const item = currentList.find((x) => x.id === id);
    if (item?.phone) {
      setPhone(item.phone);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !phone.trim()) return;

    setIsSending(true);
    setError(null);
    try {
      const ok = await onSendStatement(selectedId, type, phone.trim());
      if (ok) {
        onClose();
      } else {
        setError('فشل في إرسال كشف الحساب. يرجى التحقق من الرقم والاتصال.');
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
            <FileText className="w-5 h-5 text-emerald-600" />
            <span>إرسال كشف حساب مالي رسمي عبر WhatsApp</span>
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
          {/* Toggle Type */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setType('CUSTOMER');
                setSelectedId('');
                setPhone('');
              }}
              className={`py-1.5 rounded-lg transition-all ${
                type === 'CUSTOMER' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
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
              }}
              className={`py-1.5 rounded-lg transition-all ${
                type === 'SUPPLIER' ? 'bg-white text-blue-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              كشف حساب مورد
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              اختر {type === 'CUSTOMER' ? 'العميل' : 'المورد'} *
            </label>
            <select
              required
              value={selectedId}
              onChange={(e) => handleSelect(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
            >
              <option value="">-- اختر من القائمة --</option>
              {currentList.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.phone || 'بدون هاتف'}) - رصيد: {parseFloat(item.current_balance || 0).toLocaleString('ar-YE')} ر.ي.
                </option>
              ))}
            </select>
          </div>

          {selectedEntity && (
            <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-900">{selectedEntity.name}</span>
                <span className="font-mono text-emerald-800 font-bold">
                  #{selectedEntity.account_number || 'ACC-001'}
                </span>
              </div>
              <p className="text-slate-600 flex items-center justify-between">
                <span>الرصيد المالي الحالي المسجل بالـ ERP:</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {parseFloat(selectedEntity.current_balance || 0).toLocaleString('ar-YE')} ر.ي.
                </span>
              </p>
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

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1">
            <p className="font-bold text-slate-800">📄 محتوى كشف الحساب المرسل:</p>
            <p>
              سيتم توليد ملخص مالي احترافي يتضمن الرصيد الختامي، وإجمالي الفواتير، والمدفوعات المسددة مع دعوة للمطابقة.
            </p>
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
              disabled={isSending || !selectedId || !phone.trim()}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
            >
              {isSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>إرسال كشف الحساب فوراً</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
