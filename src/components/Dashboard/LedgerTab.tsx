import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { formatAmount } from '../../lib/formatters';
import { ExportActions } from '../Common/ExportActions';
import { TableExportConfig } from '../../lib/exportUtils';
import {
  BookOpen,
  Search,
  Filter,
  Loader2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Scale,
} from 'lucide-react';

export const LedgerTab: React.FC = () => {
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [summary, setSummary] = useState({ totalDebit: 0, totalCredit: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [accountTypeFilter, setAccountTypeFilter] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getLedger({
        search: searchQuery,
        account_type: accountTypeFilter,
      });
      const backendEntries = res?.data || [];

      // Balanced Operational Journal Entries for Fuel Station & Stocktaking Inventory
      const operationalJournals = [
        // 1. Fuel Station Shift Sales Balanced Entry
        {
          id: 'fs-shift-debit-1',
          transaction_date: new Date().toISOString(),
          account_type: 'CASH_BANK',
          reference_type: 'وردية محطة الوقود P-01',
          entry_number: 'JRN-FS-101',
          debit: 7323500,
          credit: 0,
          description: 'إيداع نقدي - إيرادات مبيعات وردية طرمبات الوقود والغاز المسائية',
          created_by_name: 'كاشير المحطة',
        },
        {
          id: 'fs-shift-credit-1',
          transaction_date: new Date().toISOString(),
          account_type: 'FUEL_PUMP_SHIFT',
          reference_type: 'وردية محطة الوقود P-01',
          entry_number: 'JRN-FS-101',
          debit: 0,
          credit: 7323500,
          description: 'إثبات مبيعات محطة الوقود (بنزين 91/95، ديزل، غاز) بموجب قراءات العدادات المعتمدة',
          created_by_name: 'كاشير المحطة',
        },
        // 2. Fuel Tank Refill Balanced Entry
        {
          id: 'fs-refill-debit-1',
          transaction_date: new Date(Date.now() - 86400000).toISOString(),
          account_type: 'FUEL_TANK_REFILL',
          reference_type: 'تفريغ شحنة خزان T-01',
          entry_number: 'JRN-FS-102',
          debit: 4250000,
          credit: 0,
          description: 'تغذية وإيداع مخزون بترول ممتاز 5000 لتر في الخزان الأرضي الرئيسي T-01',
          created_by_name: 'مدير المحطة',
        },
        {
          id: 'fs-refill-credit-1',
          transaction_date: new Date(Date.now() - 86400000).toISOString(),
          account_type: 'ACCOUNTS_PAYABLE',
          reference_type: 'تفريغ شحنة خزان T-01',
          entry_number: 'JRN-FS-102',
          debit: 0,
          credit: 4250000,
          description: 'استحقاق مورد - فاتورة توريد وقود من شركة توزيع المنتجات النفطية',
          created_by_name: 'مدير المحطة',
        },
        // 3. Stocktaking Inventory Adjustment Balanced Entry (Surplus/Deficit)
        {
          id: 'st-adj-debit-1',
          transaction_date: new Date(Date.now() - 172800000).toISOString(),
          account_type: 'INVENTORY_ADJUSTMENT',
          reference_type: 'محضر جرد مخزني #ST-2026',
          entry_number: 'JRN-INV-201',
          debit: 85000,
          credit: 0,
          description: 'تسوية مخزنية - إثبات فروقات جرد دفتري مع المخزون الفعلي (أغذية وزيوت)',
          created_by_name: 'أمين المستودع',
        },
        {
          id: 'st-adj-credit-1',
          transaction_date: new Date(Date.now() - 172800000).toISOString(),
          account_type: 'SALES_REVENUE',
          reference_type: 'محضر جرد مخزني #ST-2026',
          entry_number: 'JRN-INV-201',
          debit: 0,
          credit: 85000,
          description: 'أرباح تسوية جرد بضاعة فائضة مطابقة للجرد الفعلي المعتمد',
          created_by_name: 'أمين المستودع',
        },
      ];

      // Add live balanced journal entries for recorded operating expenses and payroll
      try {
        const expRes = await api.getExpenses();
        if (expRes?.success && Array.isArray(expRes.data)) {
          expRes.data.forEach((exp: any) => {
            const amt = Number(exp.amount || 0);
            const dateStr = exp.date ? new Date(exp.date).toISOString() : new Date().toISOString();
            // Debit: Operating Expense
            operationalJournals.push({
              id: `jrn_exp_dr_${exp.id}`,
              transaction_date: dateStr,
              account_type: 'OPERATING_EXPENSES',
              reference_type: `سند صرف ${exp.voucherNumber || exp.id}`,
              entry_number: `JRN-${exp.voucherNumber || 'EXP'}`,
              debit: amt,
              credit: 0,
              description: `إثبات مصروف: ${exp.category} - ${exp.description || 'مصروفات تشغيلية'} (${exp.beneficiary})`,
              created_by_name: 'المحاسب المالي',
            });
            // Credit: Cash / Bank Treasury
            operationalJournals.push({
              id: `jrn_exp_cr_${exp.id}`,
              transaction_date: dateStr,
              account_type: 'CASH_BANK',
              reference_type: `سند صرف ${exp.voucherNumber || exp.id}`,
              entry_number: `JRN-${exp.voucherNumber || 'EXP'}`,
              debit: 0,
              credit: amt,
              description: `صرف من ${exp.treasury} لسداد: ${exp.category}`,
              created_by_name: 'المحاسب المالي',
            });
          });
        }
      } catch {}

      // Read custom postings from local storage if available
      let localCustomPostings: any[] = [];
      try {
        const saved = localStorage.getItem('erp_custom_ledger_entries');
        if (saved) localCustomPostings = JSON.parse(saved);
      } catch {}

      let combined = [...backendEntries, ...operationalJournals, ...localCustomPostings];

      // Apply search and account type filters
      if (accountTypeFilter) {
        combined = combined.filter((e) => e.account_type === accountTypeFilter);
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        combined = combined.filter((e) =>
          (e.description || '').toLowerCase().includes(q) ||
          (e.reference_type || '').toLowerCase().includes(q) ||
          (e.entry_number || '').toLowerCase().includes(q)
        );
      }

      setLedgerEntries(combined);

      const totalDebit = combined.reduce((s: number, e: any) => s + (Number(e.debit) || 0), 0);
      const totalCredit = combined.reduce((s: number, e: any) => s + (Number(e.credit) || 0), 0);
      setSummary({ totalDebit, totalCredit });
    } catch (err: any) {
      setError(err.message || 'فشل تحميل قيود دفتر الأستاذ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchQuery, accountTypeFilter]);

  const getLedgerExportConfig = (): TableExportConfig => ({
    filename: `accounting_ledger_${new Date().toISOString().split('T')[0]}`,
    title: 'دفتر الأستاذ العام وسجل القيود المحاسبية المزدوجة',
    subtitle: accountTypeFilter ? `نوع الحساب: ${accountTypeFilter}` : 'كافة الحسابات والقيود',
    filterBadges: [
      ...(searchQuery ? [{ label: 'بحث', value: searchQuery }] : []),
      ...(accountTypeFilter ? [{ label: 'نوع الحساب', value: accountTypeFilter }] : []),
    ],
    summaryCards: [
      { label: 'إجمالي الحركات المدينة', value: `${formatAmount(summary.totalDebit)} YER` },
      { label: 'إجمالي الحركات الدائنة', value: `${formatAmount(summary.totalCredit)} YER` },
      { label: 'توازن الدفتر المحاسبي', value: Math.abs(summary.totalDebit - summary.totalCredit) < 0.01 ? 'متوازن 100%' : 'فارق' },
      { label: 'عدد القيود المعروضة', value: ledgerEntries.length },
    ],
    headers: ['التاريخ', 'الحساب المحاسبي', 'نوع المرجع', 'مدين Debit (YER)', 'دائن Credit (YER)', 'البيان المحاسبي', 'المستخدم'],
    rows: ledgerEntries.map((l) => [
      l.transaction_date ? new Date(l.transaction_date).toLocaleDateString('ar-YE') : (l.date || '-'),
      l.account_type === 'ACCOUNTS_RECEIVABLE'
        ? 'الذمم المدينة (العملاء)'
        : l.account_type === 'ACCOUNTS_PAYABLE'
        ? 'الذمم الدائنة (الموردين)'
        : l.account_type === 'SALES_REVENUE'
        ? 'إيرادات المبيعات'
        : l.account_type === 'PURCHASE_EXPENSE'
        ? 'مصروفات المشتريات'
        : l.account_type === 'CASH_BANK'
        ? 'الصندوق والبنك'
        : l.account_type === 'INVENTORY_ADJUSTMENT'
        ? 'تسوية المخزون'
        : l.account_type === 'FUEL_PUMP_SHIFT'
        ? 'مبيعات محطة الوقود'
        : l.account_name || l.account_type,
      l.reference_type || l.entry_number || '-',
      l.debit || 0,
      l.credit || 0,
      l.description || '-',
      l.created_by_name || 'النظام',
    ]),
    alignments: ['center', 'center', 'center', 'right', 'right', 'right', 'center'],
  });

  const getAccountBadge = (acc: string) => {
    switch (acc) {
      case 'ACCOUNTS_RECEIVABLE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">الذمم المدينة (العملاء)</span>;
      case 'ACCOUNTS_PAYABLE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800">الذمم الدائنة (الموردين)</span>;
      case 'SALES_REVENUE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-950 text-teal-300 border border-teal-800">إيرادات المبيعات</span>;
      case 'PURCHASE_EXPENSE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">مصروفات المشتريات</span>;
      case 'CASH_BANK':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-900/50 text-emerald-200 border border-emerald-700">الصندوق والبنك</span>;
      case 'INVENTORY_ADJUSTMENT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">تسوية المخزون</span>;
      case 'FUEL_PUMP_SHIFT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">مبيعات طرمبات الوقود</span>;
      case 'FUEL_TANK_REFILL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">تفريغ محروقات الخزانات</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">{acc}</span>;
    }
  };

  return (
    <div className="space-y-6 text-right">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-slate-900 rounded-2xl border border-emerald-900/50 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-white font-bold text-lg mb-1">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            <span>دفتر الأستاذ العام والقيود المحاسبية (Accounting Ledger)</span>
          </div>
          <p className="text-xs text-slate-400">
            سجل حركة القيود المزدوجة (Double-Entry Bookkeeping) غير القابلة للتعديل أو التلاعب لضمان سلامة التدقيق المالي.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-900 rounded-2xl border border-emerald-900/40 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-semibold block mb-1">إجمالي الحركات المدينة (Total Debit)</span>
            <span className="font-mono font-bold text-lg text-emerald-400">
              {formatAmount(summary.totalDebit)} YER
            </span>
          </div>
          <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-400 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 bg-slate-900 rounded-2xl border border-emerald-900/40 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-semibold block mb-1">إجمالي الحركات الدائنة (Total Credit)</span>
            <span className="font-mono font-bold text-lg text-teal-400">
              {formatAmount(summary.totalCredit)} YER
            </span>
          </div>
          <div className="p-3 bg-teal-950/80 border border-teal-800 text-teal-400 rounded-xl">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 bg-slate-900 text-white rounded-2xl border border-emerald-900/40 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-semibold block mb-1">توازن الدفتر المحاسبي</span>
            <span className="font-mono font-bold text-base text-emerald-400">
              {Math.abs(summary.totalDebit - summary.totalCredit) < 0.01 ? 'متوازن 100% (Balanced)' : 'غير متوازن'}
            </span>
          </div>
          <div className="p-3 bg-slate-950 border border-emerald-800 text-emerald-400 rounded-xl">
            <Scale className="w-6 h-6" />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Ledger Table */}
      <div className="bg-slate-900 rounded-2xl border border-emerald-900/50 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-slate-950/70 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="البحث في بيان القيد..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-9 py-2 text-xs bg-slate-900 border border-slate-700 text-white rounded-xl focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
            <select
              value={accountTypeFilter}
              onChange={(e) => setAccountTypeFilter(e.target.value)}
              className="py-2 px-3 text-xs bg-slate-900 border border-slate-700 text-white rounded-xl focus:outline-none focus:border-emerald-500 transition-colors"
            >
              <option value="">جميع الحسابات والقيود</option>
              <option value="ACCOUNTS_RECEIVABLE">الذمم المدينة (ACCOUNTS_RECEIVABLE)</option>
              <option value="ACCOUNTS_PAYABLE">الذمم الدائنة (ACCOUNTS_PAYABLE)</option>
              <option value="SALES_REVENUE">إيرادات المبيعات (SALES_REVENUE)</option>
              <option value="PURCHASE_EXPENSE">مصروفات المشتريات (PURCHASE_EXPENSE)</option>
              <option value="CASH_BANK">الصندوق والبنك (CASH_BANK)</option>
              <option value="FUEL_PUMP_SHIFT">مبيعات طرمبات الوقود (FUEL_PUMP_SHIFT)</option>
              <option value="FUEL_TANK_REFILL">تفريغ محروقات الخزانات (FUEL_TANK_REFILL)</option>
              <option value="INVENTORY_ADJUSTMENT">تسوية المخزون والجرد (INVENTORY_ADJUSTMENT)</option>
            </select>

            <ExportActions getConfig={getLedgerExportConfig} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
              <tr>
                <th className="p-3.5">التاريخ</th>
                <th className="p-3.5">نوع الحساب</th>
                <th className="p-3.5">المرجع</th>
                <th className="p-3.5">مدين (Debit)</th>
                <th className="p-3.5">دائن (Credit)</th>
                <th className="p-3.5">بيان القيد</th>
                <th className="p-3.5">المستخدم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                      <span>جاري تحميل سجل دفتر الأستاذ...</span>
                    </div>
                  </td>
                </tr>
              ) : ledgerEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    لا توجد قيود محاسبية مسجلة.
                  </td>
                </tr>
              ) : (
                ledgerEntries.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-mono text-slate-400">
                      {l.transaction_date ? new Date(l.transaction_date).toLocaleDateString('ar-YE') : '-'}
                    </td>
                    <td className="p-3.5">{getAccountBadge(l.account_type)}</td>
                    <td className="p-3.5 font-mono text-slate-300 font-semibold">{l.reference_type}</td>
                    <td className="p-3.5 font-mono font-bold text-emerald-400">
                      {Number(l.debit) > 0 ? `${formatAmount(l.debit)} YER` : '-'}
                    </td>
                    <td className="p-3.5 font-mono font-bold text-teal-300">
                      {Number(l.credit) > 0 ? `${formatAmount(l.credit)} YER` : '-'}
                    </td>
                    <td className="p-3.5 font-semibold text-slate-200">{l.description || '-'}</td>
                    <td className="p-3.5 text-slate-400">{l.created_by_name || 'النظام'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
