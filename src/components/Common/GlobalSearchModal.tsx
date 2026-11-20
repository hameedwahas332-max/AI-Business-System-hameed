import React, { useState, useEffect } from 'react';
import { Search, X, FileText, Users, Package, CreditCard, ArrowRight } from 'lucide-react';
import { TabType } from '../Sidebar';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: TabType, extra?: any) => void;
}

export function GlobalSearchModal({ isOpen, onClose, onNavigate }: GlobalSearchModalProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const quickNavItems: { title: string; tab: TabType; icon: React.ComponentType<{ className?: string }> }[] = [
    { title: 'العملاء (Customers)', tab: 'customers', icon: Users },
    { title: 'فواتير المبيعات (Sales Invoices)', tab: 'invoices', icon: FileText },
    { title: 'المنتجات والمخزون (Products & Stock)', tab: 'products', icon: Package },
    { title: 'السندات المالية (Payments & Vouchers)', tab: 'payments', icon: CreditCard },
    { title: 'دفتر الأستاذ (General Ledger)', tab: 'ledger', icon: FileText },
  ];

  const filteredItems = query.trim()
    ? quickNavItems.filter((item) => item.title.toLowerCase().includes(query.toLowerCase()))
    : quickNavItems;

  const handleSelect = (tab: TabType) => {
    onNavigate(tab);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 m3-backdrop flex items-start justify-center pt-20 px-4"
      dir="rtl"
    >
      <div className="m3-modal-surface w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center px-4 py-3.5 border-b border-[var(--md-outline-variant)] bg-[var(--md-surface-container-low)]">
          <Search className="w-5 h-5 text-[var(--md-primary-text)] ml-3 shrink-0" />
          <input
            type="text"
            className="flex-1 bg-transparent text-[var(--md-on-surface)] placeholder:text-[var(--md-on-surface-variant)] focus:outline-none text-base"
            placeholder="البحث السريع في النظام (فواتير، عملاء، سندات، تقارير)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] rounded-xl hover:bg-[var(--md-surface-container-high)] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--md-primary)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 max-h-80 overflow-y-auto space-y-1">
          <div className="text-xs font-bold text-[var(--md-on-surface-variant)] px-3 py-1">التنقل السريع</div>
          {filteredItems.length === 0 ? (
            <div className="text-center py-6 text-[var(--md-on-surface-variant)] text-sm">
              لا توجد نتائج مطابقة لبحثك
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelect(item.tab)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-high)] transition-colors text-right group cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--md-primary)]"
                >
                  <div className="flex items-center space-x-3 space-x-reverse">
                    <div className="p-2 rounded-xl bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] group-hover:bg-[var(--md-primary-container)] group-hover:text-[var(--md-on-primary-container)] text-[var(--md-primary-text)] transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-semibold">{item.title}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[var(--md-on-surface-variant)] group-hover:text-[var(--md-primary-text)] transform rotate-180 transition-colors" />
                </button>
              );
            })
          )}
        </div>

        <div className="px-4 py-2.5 bg-[var(--md-surface-container-low)] border-t border-[var(--md-outline-variant)] text-xs text-[var(--md-on-surface-variant)] flex justify-between font-mono tabular-nums">
          <span>اضغط ESC للإغلاق</span>
          <span>Ctrl + K للفتح السريع</span>
        </div>
      </div>
    </div>
  );
}
