import React, { useState } from 'react';
import { FileSpreadsheet, FileText, Printer, Download, ChevronDown, Check } from 'lucide-react';
import { exportToExcel, exportToCSV, printReport, TableExportConfig } from '../../lib/exportUtils';
import { useAuth } from '../../context/AuthContext';

export interface ExportActionsProps {
  getConfig?: () => TableExportConfig;
  getExportConfig?: () => TableExportConfig;
  variant?: 'buttons' | 'dropdown' | 'compact';
  disabled?: boolean;
  className?: string;
  customPrint?: () => void;
}

export const ExportActions: React.FC<ExportActionsProps> = ({
  getConfig,
  getExportConfig,
  variant = 'buttons',
  disabled = false,
  className = '',
  customPrint,
}) => {
  const { company } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const enrichConfig = (): TableExportConfig => {
    const fn = getConfig || getExportConfig;
    const base = typeof fn === 'function' ? fn() : { headers: [], rows: [] };
    return {
      ...base,
      companyName: base.companyName || company?.name || 'المؤسسة التجارية',
      companyCode: base.companyCode || company?.code || '',
    };
  };

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const conf = enrichConfig();
      await exportToExcel(conf);
    } catch (err) {
      console.error('Excel export failed', err);
      alert('فشل تصدير ملف Excel');
    } finally {
      setIsExporting(false);
      setIsDropdownOpen(false);
    }
  };

  const handleExportCSV = () => {
    try {
      const conf = enrichConfig();
      exportToCSV(conf);
    } catch (err) {
      console.error('CSV export failed', err);
      alert('فشل تصدير ملف CSV');
    } finally {
      setIsDropdownOpen(false);
    }
  };

  const handlePrint = () => {
    if (customPrint) {
      customPrint();
      setIsDropdownOpen(false);
      return;
    }
    try {
      const conf = enrichConfig();
      printReport(conf);
    } catch (err) {
      console.error('Print report failed', err);
      alert('فشل تجهيز التقرير للطباعة');
    } finally {
      setIsDropdownOpen(false);
    }
  };

  if (variant === 'dropdown') {
    return (
      <div className={`relative inline-block text-right ${className}`}>
        <button
          type="button"
          disabled={disabled || isExporting}
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-emerald-800 rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span>تصدير وطباعة</span>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </button>

        {isDropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsDropdownOpen(false)}
            />
            <div className="absolute left-0 mt-1.5 w-48 bg-slate-900 rounded-xl shadow-2xl border border-emerald-900/60 py-1.5 z-50 text-xs text-slate-200">
              <button
                type="button"
                onClick={handleExportExcel}
                className="w-full text-right px-3 py-2 text-slate-200 hover:bg-emerald-950 hover:text-emerald-300 flex items-center gap-2 font-medium transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>تصدير Excel (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={handleExportCSV}
                className="w-full text-right px-3 py-2 text-slate-200 hover:bg-slate-800 hover:text-emerald-300 flex items-center gap-2 font-medium transition-colors"
              >
                <FileText className="w-4 h-4 text-teal-400" />
                <span>تصدير CSV (.csv)</span>
              </button>
              <div className="border-t border-slate-800 my-1" />
              <button
                type="button"
                onClick={handlePrint}
                className="w-full text-right px-3 py-2 text-slate-200 hover:bg-slate-800 hover:text-emerald-300 flex items-center gap-2 font-medium transition-colors"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>طباعة / PDF</span>
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      {/* 1. Export Excel (.xlsx) - PRIMARY */}
      <button
        type="button"
        disabled={disabled || isExporting}
        onClick={handleExportExcel}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/80 rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
        title="تصدير جدول البيانات إلى ملف Excel (.xlsx)"
      >
        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
        <span>تصدير Excel</span>
      </button>

      {/* 2. Export CSV (.csv) - SECONDARY */}
      <button
        type="button"
        disabled={disabled || isExporting}
        onClick={handleExportCSV}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
        title="تصدير جدول البيانات إلى ملف CSV (.csv)"
      >
        <FileText className="w-3.5 h-3.5 text-slate-400" />
        <span>تصدير CSV</span>
      </button>

      {/* 3. Print / PDF - PRINTING */}
      <button
        type="button"
        disabled={disabled || isExporting}
        onClick={handlePrint}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-800/50 rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
        title="معاينة وطباعة التقرير أو حفظه بصيغة PDF"
      >
        <Printer className="w-3.5 h-3.5 text-teal-400" />
        <span>طباعة / PDF</span>
      </button>
    </div>
  );
};
