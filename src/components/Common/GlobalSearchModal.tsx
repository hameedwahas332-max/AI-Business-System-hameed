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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center px-4 py-3 border-b border-slate-800">
          <Search className="w-5 h-5 text-slate-400 ml-3" />
          <input
            type="text"
            className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 focus:outline-none text-base"
            placeholder="البحث السريع في النظام (فواتير، عملاء، سندات، تقارير)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 max-h-80 overflow-y-auto space-y-1">
          <div className="text-xs font-semibold text-slate-400 px-3 py-1">التنقل السريع</div>
          {filteredItems.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-sm">
              لا توجد نتائج مطابقة لبحثك
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelect(item.tab)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-slate-200 hover:bg-slate-800/80 transition-colors text-right group"
                >
                  <div className="flex items-center space-x-3 space-x-reverse">
                    <div className="p-2 rounded-lg bg-slate-800 group-hover:bg-cyan-500/10 text-cyan-400">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium">{item.title}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transform rotate-180" />
                </button>
              );
            })
          )}
        </div>

        <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 text-xs text-slate-500 flex justify-between">
          <span>اضغط ESC للإغلاق</span>
          <span>Ctrl + K للفتح السريع</span>
        </div>
      </div>
    </div>
  );
}
