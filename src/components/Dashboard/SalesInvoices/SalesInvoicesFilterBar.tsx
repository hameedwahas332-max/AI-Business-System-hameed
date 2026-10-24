import React from 'react';
import { Search, Filter, Calendar, RotateCcw, DollarSign, User, AlertCircle } from 'lucide-react';
import { Customer } from '../../../types';

interface SalesInvoicesFilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: string;
  onStatusChange: (status: string) => void;
  selectedCustomerId: string;
  onCustomerChange: (id: string) => void;
  selectedCurrency: string;
  onCurrencyChange: (curr: string) => void;
  selectedPriceTier?: string;
  onPriceTierChange?: (tier: string) => void;
  startDate: string;
  onStartDateChange: (d: string) => void;
  endDate: string;
  onEndDateChange: (d: string) => void;
  isOverdueOnly: boolean;
  onOverdueToggle: (val: boolean) => void;
  customers: Customer[];
  onReset: () => void;
}

export const SalesInvoicesFilterBar: React.FC<SalesInvoicesFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  selectedCustomerId,
  onCustomerChange,
  selectedCurrency,
  onCurrencyChange,
  selectedPriceTier = '',
  onPriceTierChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  isOverdueOnly,
  onOverdueToggle,
  customers,
  onReset,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Search */}
        <div className="relative lg:col-span-1">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="بحث برقم الفاتورة، العميل، رقم الصنف/القطعة، أو السيريال..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-sans"
          />
        </div>

        {/* Status */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">جميع الحالات (All Statuses)</option>
            <option value="PAID">مدفوعة بالكامل (PAID)</option>
            <option value="PARTIALLY_PAID">مدفوعة جزئياً (PARTIAL)</option>
            <option value="PENDING">مستحقة السداد (PENDING)</option>
            <option value="OVERDUE">متأخرة السداد (OVERDUE)</option>
            <option value="CANCELLED">ملغاة (CANCELLED)</option>
          </select>
        </div>

        {/* Customer */}
        <div>
          <select
            value={selectedCustomerId}
            onChange={(e) => onCustomerChange(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">جميع العملاء (All Customers)</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Currency Filter */}
        <div>
          <select
            value={selectedCurrency}
            onChange={(e) => onCurrencyChange(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">جميع العملات (YER / SAR / USD)</option>
            <option value="YER">ريال يمني (YER)</option>
            <option value="SAR">ريال سعودي (SAR)</option>
            <option value="USD">دولار أمريكي (USD)</option>
          </select>
        </div>

        {/* Price Tier Filter */}
        <div>
          <select
            value={selectedPriceTier}
            onChange={(e) => onPriceTierChange && onPriceTierChange(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">جميع فئات التسعير (All Tiers)</option>
            <option value="retail">تجزئة (Retail)</option>
            <option value="half_wholesale">نصف جملة (Half-Wholesale)</option>
            <option value="wholesale">جملة (Wholesale)</option>
            <option value="vip">خاص / VIP</option>
          </select>
        </div>
      </div>

      {/* Date Ranges & Quick Filter Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/80 rounded-xl px-2.5 py-1.5">
            <span className="text-[11px] text-slate-400">من:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="bg-transparent text-white text-xs focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/80 rounded-xl px-2.5 py-1.5">
            <span className="text-[11px] text-slate-400">إلى:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="bg-transparent text-white text-xs focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => onOverdueToggle(!isOverdueOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold transition-all ${
              isOverdueOnly
                ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>فواتير متأخرة السداد فقط</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1 text-slate-400 hover:text-white px-2.5 py-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>إعادة ضبط الفلاتر</span>
        </button>
      </div>
    </div>
  );
};
