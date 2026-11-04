import React, { useState } from 'react';
import {
  X,
  Play,
  Trash2,
  Clock,
  ShoppingBag,
  User,
  CheckCircle2,
  DollarSign,
  Layers,
  ArrowRight,
  ShieldCheck,
  Send,
  Loader2,
} from 'lucide-react';
import { POSHeldSale } from '../../../types';
import { formatAmount } from '../../../lib/formatters';

interface POSHeldDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  heldSales: POSHeldSale[];
  onResumeSale: (heldSale: POSHeldSale) => void;
  onDeleteHeldSale: (id: string) => void;
  onPostCreditHeldSale?: (heldSale: POSHeldSale) => Promise<void> | void;
  currency: string;
}

export const POSHeldDrawer: React.FC<POSHeldDrawerProps> = ({
  isOpen,
  onClose,
  heldSales,
  onResumeSale,
  onDeleteHeldSale,
  onPostCreditHeldSale,
  currency,
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'CREDIT' | 'NORMAL'>('ALL');
  const [postingId, setPostingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredSales = heldSales.filter((sale) => {
    const isCredit = sale.holdType === 'CREDIT' || sale.paymentMethod === 'CREDIT' || (sale.note && sale.note.includes('آجل'));
    if (filterType === 'CREDIT') return isCredit;
    if (filterType === 'NORMAL') return !isCredit;
    return true;
  });

  const creditCount = heldSales.filter(
    (s) => s.holdType === 'CREDIT' || s.paymentMethod === 'CREDIT' || (s.note && s.note.includes('آجل'))
  ).length;
  const normalCount = heldSales.length - creditCount;

  const handlePostDirectly = async (sale: POSHeldSale) => {
    if (!onPostCreditHeldSale) return;
    try {
      setPostingId(sale.id);
      await onPostCreditHeldSale(sale);
    } finally {
      setPostingId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex justify-end z-50 animate-in fade-in duration-150" dir="rtl">
      <div className="bg-slate-900 border-l border-slate-800 w-full max-w-lg h-full flex flex-col shadow-2xl animate-in slide-in-from-left duration-200">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>الفواتير المعلقة والمؤجلة</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 text-xs font-mono font-bold border border-slate-700">
                  {heldSales.length}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">إدارة فواتير التعليق العادي والتعليق الآجل لحساب العملاء</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Tabs: الكل | تعليق آجل | تعليق عادي */}
        <div className="p-3 bg-slate-950/40 border-b border-slate-800 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterType('ALL')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              filterType === 'ALL'
                ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <span>الكل</span>
            <span className="px-1.5 py-0.2 rounded-md bg-slate-700/60 text-[10px] font-mono">
              {heldSales.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterType('CREDIT')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              filterType === 'CREDIT'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-amber-400 hover:bg-amber-500/10'
            }`}
          >
            <span>🏷️ تعليق آجل</span>
            <span className="px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-mono">
              {creditCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterType('NORMAL')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              filterType === 'NORMAL'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm'
                : 'text-slate-400 hover:text-blue-400 hover:bg-blue-500/10'
            }`}
          >
            <span>⏸️ تعليق عادي</span>
            <span className="px-1.5 py-0.2 rounded-md bg-blue-500/20 text-blue-300 text-[10px] font-mono">
              {normalCount}
            </span>
          </button>
        </div>

        {/* Orders List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar">
          {filteredSales.length === 0 ? (
            <div className="text-center py-20 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <p className="text-xs text-slate-400 font-bold">لا توجد فواتير معلقة تطابق الفلتر</p>
              <p className="text-[11px] text-slate-500">
                يمكنك تعليق أي طلب نقدي أو آجل من واجهة الكاشير بالضغط على زر تعليق أو تعليق آجل
              </p>
            </div>
          ) : (
            filteredSales.map((sale) => {
              const isCredit = sale.holdType === 'CREDIT' || sale.paymentMethod === 'CREDIT' || (sale.note && sale.note.includes('آجل'));
              const itemsList = sale.items || sale.cart_data || sale.cartData || [];
              const custName = sale.customer?.name || sale.customer_name || sale.customerName || (isCredit ? 'عميل آجل' : 'عميل نقدي');
              const timeString = (() => {
                try {
                  const d = new Date(sale.held_at || sale.heldAt || Date.now());
                  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' });
                } catch {
                  return '';
                }
              })();

              return (
                <div
                  key={sale.id}
                  className={`p-4 rounded-2xl border transition-all space-y-3 ${
                    isCredit
                      ? 'bg-amber-950/15 border-amber-500/30 hover:border-amber-500/50'
                      : 'bg-slate-800/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Top Header: Badge & Amount */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      {isCredit ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold">
                          <span>🏷️ تعليق آجل - لحساب العميل:</span>
                          <span className="text-white underline underline-offset-2">{custName}</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-blue-500/15 text-blue-300 border border-blue-500/30 text-[11px] font-bold">
                          <span>⏸️ تعليق عادي</span>
                          <span className="text-slate-300">({custName})</span>
                        </div>
                      )}

                      <div className="text-[10px] text-slate-400 flex items-center gap-2 flex-wrap">
                        {sale.reference_no && (
                          <span className="font-mono text-slate-300 font-bold">#{sale.reference_no}</span>
                        )}
                        {timeString && <span>⏰ {timeString}</span>}
                        {sale.customerPhone && (
                          <span>📞 {sale.customerPhone}</span>
                        )}
                        {(sale.receivedBy || (sale as any).received_by) && (
                          <span className="text-sky-300 bg-sky-950/60 border border-sky-500/30 px-1.5 py-0.5 rounded font-bold">
                            👤 المستلم: {sale.receivedBy || (sale as any).received_by}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-left shrink-0">
                      <div className="text-base font-black text-emerald-400 font-mono">
                        {formatAmount(sale.total || sale.totalAmount || 0, currency)}
                      </div>
                    </div>
                  </div>

                  {/* Note */}
                  {sale.note && (
                    <div className="text-[11px] text-slate-300 bg-slate-900/60 border border-slate-800 px-2.5 py-1 rounded-xl">
                      💬 {sale.note}
                    </div>
                  )}

                  {/* Items Preview */}
                  <div className="text-[11px] text-slate-300 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/60">
                    <span className="font-bold text-slate-400">({itemsList.length} أصناف): </span>
                    <span>
                      {itemsList.map((i: any) => `${i.name || i.item_name} (x${i.quantity})`).join('، ')}
                    </span>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
                    <button
                      type="button"
                      onClick={() => onDeleteHeldSale(sale.id)}
                      className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                      title="حذف الفاتورة المعلقة نهائياً"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="text-[10px] hidden sm:inline">حذف</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {/* For CREDIT hold: Two action buttons */}
                      {isCredit && onPostCreditHeldSale ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              onResumeSale(sale);
                              onClose();
                            }}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                            title="استرجاع السلة لفتحها في الكاشير وإضافة أصناف جديدة"
                          >
                            <Play className="w-3.5 h-3.5 text-blue-400" />
                            <span>استرجاع للكاشير (إضافة أصناف)</span>
                          </button>

                          <button
                            type="button"
                            disabled={postingId === sale.id}
                            onClick={() => handlePostDirectly(sale)}
                            className="px-3.5 py-1.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md shadow-amber-950/40 cursor-pointer disabled:opacity-50"
                            title="اعتماد وترحيل الفاتورة فوراً لحساب العميل كفاتورة مبيعات آجلة وخصم المخزون"
                          >
                            {postingId === sale.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            <span>ترحيل لحساب العميل (اعتماد آجل)</span>
                          </button>
                        </>
                      ) : (
                        /* Normal Hold: Standard Resume */
                        <button
                          type="button"
                          onClick={() => {
                            onResumeSale(sale);
                            onClose();
                          }}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950/30"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>استئناف الفاتورة للكاشير</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
