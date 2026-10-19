import React, { useState } from 'react';
import { X, Plus, DollarSign, Tag, Hash, Percent } from 'lucide-react';
import { POSCartItem } from '../../../types';

interface POSQuickItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (item: POSCartItem) => void;
  currency: string;
}

export const POSQuickItemModal: React.FC<POSQuickItemModalProps> = ({
  isOpen,
  onClose,
  onAddItem,
  currency,
}) => {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('حبة');
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [tax, setTax] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const total = Math.max(0, quantity * unitPrice - discount + tax);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('يرجى إدخال اسم أو وصف الصنف');
      return;
    }
    if (quantity <= 0) {
      setError('الكمية يجب أن تكون أكبر من الصفر');
      return;
    }
    if (unitPrice <= 0) {
      setError('السعر الإفرادي يجب أن يكون أكبر من الصفر');
      return;
    }

    onAddItem({
      id: 'quick_' + Date.now(),
      productId: null, // Manual unregistered quick item
      name: name.trim(),
      unit,
      quantity,
      unitPrice,
      discount,
      tax,
      total,
      notes: 'صنف يدوي / بيع مباشر',
    });

    // Reset & close
    setName('');
    setQuantity(1);
    setUnitPrice(0);
    setDiscount(0);
    setTax(0);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto" dir="rtl">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 bg-slate-800/60 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">إضافة صنف يدوي / بيع مباشر</h3>
              <p className="text-xs text-slate-400">بيع صنف سريع غير مسجل في دليل المنتجات</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              اسم أو بيان الصنف <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <Tag className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                placeholder="مثال: خدمة صيانة، مادة خاصة، صنف سريع..."
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pr-10 pl-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                autoFocus
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                الكمية <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={quantity || ''}
                  onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pr-10 pl-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">الوحدة</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="حبة">حبة / قطعة</option>
                <option value="كيلو">كيلوغرام (kg)</option>
                <option value="متر">متر (m)</option>
                <option value="لتر">لتر (L)</option>
                <option value="علبة">علبة / باكت</option>
                <option value="كرتون">كرتون</option>
                <option value="خدمة">خدمة / مصنعية</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                سعر الوحدة ({currency}) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={unitPrice || ''}
                  onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pr-9 pl-3 py-2 text-sm text-white font-medium focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                الخصم ({currency})
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={discount || ''}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                الضريبة ({currency})
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={tax || ''}
                onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Item Net Total Summary */}
          <div className="p-4 bg-slate-800/50 border border-slate-700/60 rounded-xl flex items-center justify-between">
            <span className="text-sm text-slate-300 font-medium">إجمالي الصنف الصافي:</span>
            <span className="text-lg font-black text-emerald-400">
              {total.toLocaleString()} {currency}
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-950/40 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              إضافة إلى السلة
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
