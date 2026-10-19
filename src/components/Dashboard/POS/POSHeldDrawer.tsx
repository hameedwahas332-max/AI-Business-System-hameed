import React from 'react';
import { X, Play, Trash2, Clock, ShoppingBag, User } from 'lucide-react';
import { POSHeldSale } from '../../../types';
import { formatAmount } from '../../../lib/formatters';

interface POSHeldDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  heldSales: POSHeldSale[];
  onResumeSale: (heldSale: POSHeldSale) => void;
  onDeleteHeldSale: (id: string) => void;
  currency: string;
}

export const POSHeldDrawer: React.FC<POSHeldDrawerProps> = ({
  isOpen,
  onClose,
  heldSales,
  onResumeSale,
  onDeleteHeldSale,
  currency,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-end z-50">
      <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full flex flex-col p-5 space-y-4 shadow-2xl animate-in slide-in-from-left duration-200">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white">
              الفواتير المعلقة والمؤجلة ({heldSales.length})
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
          {heldSales.length === 0 ? (
            <div className="text-center py-20 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <p className="text-xs text-slate-400 font-bold">لا توجد فواتير معلقة حالياً</p>
              <p className="text-[11px] text-slate-500">
                يمكنك تعليق أي سلة مبيعات بالضغط على زر تعليق (F6)
              </p>
            </div>
          ) : (
            heldSales.map((sale) => (
              <div
                key={sale.id}
                className="p-3.5 bg-slate-800/40 border border-slate-800 rounded-2xl space-y-3 hover:border-slate-700 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {sale.customer ? sale.customer.name : 'عميل عام (Cash Customer)'}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(sale.heldAt).toLocaleTimeString('ar-YE', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                  <div className="text-sm font-black text-emerald-400">
                    {formatAmount(sale.total, currency)}
                  </div>
                </div>

                {sale.note && (
                  <div className="text-[11px] text-amber-300/90 bg-amber-500/10 px-2.5 py-1 rounded-lg">
                    {sale.note}
                  </div>
                )}

                <div className="text-[11px] text-slate-400 bg-slate-800/60 p-2 rounded-xl">
                  {sale.items.length} أصناف: {sale.items.map((i) => `${i.name} (x${i.quantity})`).join('، ')}
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onDeleteHeldSale(sale.id)}
                    className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-xs font-bold transition-all"
                    title="حذف الفاتورة المعلقة"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onResumeSale(sale);
                      onClose();
                    }}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>استئناف الفاتورة</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
