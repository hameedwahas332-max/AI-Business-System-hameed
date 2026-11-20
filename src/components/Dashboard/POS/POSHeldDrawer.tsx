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
    <div className="fixed inset-0 m3-backdrop flex justify-end z-50 animate-in fade-in duration-150" dir="rtl">
      <div className="m3-modal-surface border-l border-[var(--md-outline-variant)] w-full max-w-lg h-full flex flex-col animate-in slide-in-from-left duration-200">
        {/* Drawer Header */}
        <div className="p-4 border-b border-[var(--md-outline-variant)] bg-[var(--md-surface-container-low)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--md-warning-container)] border border-[var(--md-warning)]/30 flex items-center justify-center text-[var(--md-warning)]">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--md-on-surface)] flex items-center gap-2">
                <span>الفواتير المعلقة والمؤجلة</span>
                <span className="m3-badge-warning font-mono tabular-nums">
                  {heldSales.length}
                </span>
              </h3>
              <p className="text-[11px] text-[var(--md-on-surface-variant)]">إدارة فواتير التعليق العادي والتعليق الآجل لحساب العملاء</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] p-1.5 rounded-xl hover:bg-[var(--md-surface-container-high)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Tabs: الكل | تعليق آجل | تعليق عادي */}
        <div className="p-3 bg-[var(--md-surface-container-lowest)] border-b border-[var(--md-outline-variant)] flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterType('ALL')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
              filterType === 'ALL'
                ? 'bg-[var(--md-surface-container-high)] text-[var(--md-on-surface)] border-[var(--md-outline)] shadow-sm'
                : 'border-transparent text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container)]'
            }`}
          >
            <span>الكل</span>
            <span className="px-1.5 py-0.2 rounded-md bg-[var(--md-surface-container)] text-[10px] font-mono tabular-nums">
              {heldSales.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterType('CREDIT')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
              filterType === 'CREDIT'
                ? 'bg-[var(--md-warning-container)] text-[var(--md-on-warning-container)] border-[var(--md-warning)]/40 shadow-sm'
                : 'border-transparent text-[var(--md-on-surface-variant)] hover:text-[var(--md-warning)] hover:bg-[var(--md-warning-container)]/50'
            }`}
          >
            <span>🏷️ تعليق آجل</span>
            <span className="px-1.5 py-0.2 rounded-md bg-[var(--md-warning-container)] text-[var(--md-on-warning-container)] text-[10px] font-mono tabular-nums">
              {creditCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterType('NORMAL')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
              filterType === 'NORMAL'
                ? 'bg-[var(--md-info-container)] text-[var(--md-on-info-container)] border-[var(--md-info)]/40 shadow-sm'
                : 'border-transparent text-[var(--md-on-surface-variant)] hover:text-[var(--md-info)] hover:bg-[var(--md-info-container)]/50'
            }`}
          >
            <span>⏸️ تعليق عادي</span>
            <span className="px-1.5 py-0.2 rounded-md bg-[var(--md-info-container)] text-[var(--md-on-info-container)] text-[10px] font-mono tabular-nums">
              {normalCount}
            </span>
          </button>
        </div>

        {/* Orders List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar">
          {filteredSales.length === 0 ? (
            <div className="text-center py-20 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[var(--md-surface-container-high)] text-[var(--md-on-surface-variant)] flex items-center justify-center mx-auto">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <p className="text-xs text-[var(--md-on-surface)] font-bold">لا توجد فواتير معلقة تطابق الفلتر</p>
              <p className="text-[11px] text-[var(--md-on-surface-variant)]">
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
                      ? 'bg-[var(--md-warning-container)]/35 border-[var(--md-warning)]/35 hover:border-[var(--md-warning)]/60'
                      : 'bg-[var(--md-surface-container-low)] border-[var(--md-outline-variant)] hover:border-[var(--md-outline)]'
                  }`}
                >
                  {/* Top Header: Badge & Amount */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      {isCredit ? (
                        <div className="m3-badge-warning text-[11px]">
                          <span>🏷️ تعليق آجل - لحساب العميل:</span>
                          <span className="underline underline-offset-2">{custName}</span>
                        </div>
                      ) : (
                        <div className="m3-badge-info text-[11px]">
                          <span>⏸️ تعليق عادي</span>
                          <span>({custName})</span>
                        </div>
                      )}

                      <div className="text-[10px] text-[var(--md-on-surface-variant)] flex items-center gap-2 flex-wrap">
                        {sale.reference_no && (
                          <span className="font-mono text-[var(--md-on-surface)] font-bold tabular-nums">#{sale.reference_no}</span>
                        )}
                        {timeString && <span>⏰ {timeString}</span>}
                        {sale.customerPhone && (
                          <span>📞 {sale.customerPhone}</span>
                        )}
                        {(sale.receivedBy || (sale as any).received_by) && (
                          <span className="m3-badge-info text-[10px]">
                            👤 المستلم: {sale.receivedBy || (sale as any).received_by}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-left shrink-0">
                      <div className="text-base font-black text-[var(--md-primary-text)] font-mono tabular-nums">
                        {formatAmount(sale.total || sale.totalAmount || 0, currency)}
                      </div>
                    </div>
                  </div>

                  {/* Note */}
                  {sale.note && (
                    <div className="text-[11px] text-[var(--md-on-surface)] bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] px-2.5 py-1 rounded-xl">
                      💬 {sale.note}
                    </div>
                  )}

                  {/* Items Preview */}
                  <div className="text-[11px] text-[var(--md-on-surface)] bg-[var(--md-surface-container)] p-2.5 rounded-xl border border-[var(--md-outline-variant)]">
                    <span className="font-bold text-[var(--md-on-surface-variant)]">({itemsList.length} أصناف): </span>
                    <span>
                      {itemsList.map((i: any) => `${i.name || i.item_name} (x${i.quantity})`).join('، ')}
                    </span>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--md-outline-variant)]">
                    <button
                      type="button"
                      onClick={() => onDeleteHeldSale(sale.id)}
                      className="p-2 bg-[var(--md-error-container)] hover:bg-[var(--md-error)] text-[var(--md-on-error-container)] hover:text-[var(--md-on-error)] rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
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
                            className="m3-btn-outlined px-3 py-1.5 text-xs font-bold flex items-center gap-1.5"
                            title="استرجاع السلة لفتحها في الكاشير وإضافة أصناف جديدة"
                          >
                            <Play className="w-3.5 h-3.5 text-[var(--md-info)]" />
                            <span>استرجاع للكاشير (إضافة أصناف)</span>
                          </button>

                          <button
                            type="button"
                            disabled={postingId === sale.id}
                            onClick={() => handlePostDirectly(sale)}
                            className="px-3.5 py-1.5 bg-[var(--md-secondary)] hover:opacity-90 text-[var(--md-on-secondary)] rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
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
                          className="m3-btn-primary px-4 py-1.5 text-xs font-bold flex items-center gap-1.5"
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
