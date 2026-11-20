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
          className="m3-btn-outlined !min-h-[34px] !px-3 !py-1.5 text-xs disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--md-primary)]"
        >
          <Download className="w-3.5 h-3.5 text-[var(--md-primary-text)]" />
          <span>تصدير وطباعة</span>
          <ChevronDown className="w-3 h-3 text-[var(--md-on-surface-variant)]" />
        </button>

        {isDropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsDropdownOpen(false)}
            />
            <div className="m3-modal-surface absolute left-0 mt-1.5 w-48 !rounded-xl py-1.5 z-50 text-xs text-[var(--md-on-surface)]">
              <button
                type="button"
                onClick={handleExportExcel}
                className="w-full text-right px-3 py-2 text-[var(--md-on-surface)] hover:bg-[var(--md-primary-container)] hover:text-[var(--md-on-primary-container)] flex items-center gap-2 font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--md-primary)]"
              >
                <FileSpreadsheet className="w-4 h-4 text-[var(--md-success)]" />
                <span>تصدير Excel (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={handleExportCSV}
                className="w-full text-right px-3 py-2 text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-high)] hover:text-[var(--md-primary-text)] flex items-center gap-2 font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--md-primary)]"
              >
                <FileText className="w-4 h-4 text-[var(--md-primary-text)]" />
                <span>تصدير CSV (.csv)</span>
              </button>
              <div className="border-t border-[var(--md-outline-variant)] my-1" />
              <button
                type="button"
                onClick={handlePrint}
                className="w-full text-right px-3 py-2 text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-high)] hover:text-[var(--md-primary-text)] flex items-center gap-2 font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--md-primary)]"
              >
                <Printer className="w-4 h-4 text-[var(--md-primary-text)]" />
                <span>طباعة / PDF</span>
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 flex-wrap ${className}`}>
      {/* 1. Export Excel (.xlsx) - PRIMARY */}
      <button
        type="button"
        disabled={disabled || isExporting}
        onClick={handleExportExcel}
        className="m3-btn-tonal !min-h-[34px] !px-3 !py-1.5 text-xs disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--md-primary)]"
        title="تصدير جدول البيانات إلى ملف Excel (.xlsx)"
      >
        <FileSpreadsheet className="w-3.5 h-3.5" />
        <span>تصدير Excel</span>
      </button>

      {/* 2. Export CSV (.csv) - SECONDARY */}
      <button
        type="button"
        disabled={disabled || isExporting}
        onClick={handleExportCSV}
        className="m3-btn-outlined !min-h-[34px] !px-3 !py-1.5 text-xs disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--md-primary)]"
        title="تصدير جدول البيانات إلى ملف CSV (.csv)"
      >
        <FileText className="w-3.5 h-3.5 text-[var(--md-on-surface-variant)]" />
        <span>تصدير CSV</span>
      </button>

      {/* 3. Print / PDF - PRINTING */}
      <button
        type="button"
        disabled={disabled || isExporting}
        onClick={handlePrint}
        className="m3-btn-outlined !min-h-[34px] !px-3 !py-1.5 text-xs !border-[var(--md-primary)]/40 !text-[var(--md-primary-text)] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--md-primary)]"
        title="معاينة وطباعة التقرير أو حفظه بصيغة PDF"
      >
        <Printer className="w-3.5 h-3.5" />
        <span>طباعة / PDF</span>
      </button>
    </div>
  );
};
