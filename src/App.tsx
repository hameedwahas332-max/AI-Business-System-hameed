import React, { useState, useEffect } from 'react';
import { Header, ThemeMode, AccentColor } from './components/Header';
import { Sidebar, TabType } from './components/Sidebar';
import { AuthModal } from './components/Auth/AuthModal';
import { GlobalSearchModal } from './components/Common/GlobalSearchModal';
import { ErrorBoundary } from './components/Common/ErrorBoundary';
import { toEnglishDigits } from './lib/formatters';

// 29 Real Enterprise ERP Dashboard Tabs
import { OverviewTab } from './components/Dashboard/OverviewTab';
import { ProductionDataInitializationTab } from './components/Dashboard/ProductionDataInitializationTab';
import { WhatsAppManagerTab } from './components/Dashboard/WhatsAppManagerTab';
import { FinancialReportingHub } from './components/Dashboard/FinancialReportingHub';
import { RealBusinessOperationsTab } from './components/Dashboard/RealBusinessOperationsTab';
import { CustomerSuccessTab } from './components/Dashboard/CustomerSuccessTab';
import { ReportsTab } from './components/Dashboard/ReportsTab';
import { CashFlowForecastTab } from './components/Dashboard/CashFlowForecastTab';
import { NotificationsTab } from './components/Dashboard/NotificationsTab';
import { AIAssistantTab } from './components/Dashboard/AIAssistantTab';
import { OCRTab } from './components/Dashboard/OCRTab';
import { CustomersTab } from './components/Dashboard/CustomersTab';
import { SuppliersTab } from './components/Dashboard/SuppliersTab';
import { ProductsTab } from './components/Dashboard/ProductsTab';
import { InvoicesTab } from './components/Dashboard/InvoicesTab';
import { PurchaseInvoicesTab } from './components/Dashboard/PurchaseInvoicesTab';
import { PaymentsTab } from './components/Dashboard/PaymentsTab';
import { LedgerTab } from './components/Dashboard/LedgerTab';
import { InventoryTab } from './components/Dashboard/InventoryTab';
import { FuelStationTab } from './components/Dashboard/FuelStationTab';
import { UsersTab } from './components/Dashboard/UsersTab';
import { RolesTab } from './components/Dashboard/RolesTab';
import { SubscriptionTab } from './components/Dashboard/SubscriptionTab';
import { EnterpriseControlCenterTab } from './components/Dashboard/EnterpriseControlCenterTab';
import { SystemHealthTab } from './components/Dashboard/SystemHealthTab';
import { BackupRestoreTab } from './components/Dashboard/BackupRestoreTab';
import { AuditTab } from './components/Dashboard/AuditTab';
import { SwaggerTab } from './components/Dashboard/SwaggerTab';
import { ProductionVerificationTab } from './components/Dashboard/ProductionVerificationTab';
import { TestRunnerTab } from './components/Dashboard/TestRunnerTab';

// Real Dedicated POS Module
import { POSMain } from './components/Dashboard/POS/POSMain';

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Theme & Accent State
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    return (localStorage.getItem('erp_theme_mode') as ThemeMode) || 'dark';
  });
  const [accentColor, setAccentColor] = useState<AccentColor>(() => {
    return (localStorage.getItem('erp_accent_color') as AccentColor) || 'indigo';
  });

  // Apply Theme & Accent to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
    localStorage.setItem('erp_theme_mode', themeMode);
  }, [themeMode]);

  useEffect(() => {
    document.documentElement.setAttribute('data-accent', accentColor);
    localStorage.setItem('erp_accent_color', accentColor);
  }, [accentColor]);

  // Global Input & Keydown Listeners: Convert typed/pasted Arabic-Indic digits (٠-٩) and Persian digits (۰-۹) to English digits (0-9)
  useEffect(() => {
    // 1. Intercept beforeinput to cleanly insert English digits even before browser number validation
    const handleBeforeInput = (e: any) => {
      if (e.data && /[٠-٩۰-۹٫،]/.test(e.data)) {
        const target = e.target as HTMLInputElement | HTMLTextAreaElement;
        if (!target || !target.value !== undefined) return;
        // If it's a number/decimal/text input, replace Arabic digits with English
        const isNumericTarget =
          target.type === 'number' ||
          target.inputMode === 'decimal' ||
          target.inputMode === 'numeric' ||
          target.getAttribute('dir') === 'ltr' ||
          target.classList.contains('font-mono');

        if (isNumericTarget) {
          e.preventDefault();
          const converted = toEnglishDigits(e.data);
          const start = target.selectionStart ?? target.value.length;
          const end = target.selectionEnd ?? target.value.length;
          const currentVal = target.value;
          const newVal = currentVal.substring(0, start) + converted + currentVal.substring(end);
          target.value = newVal;
          if (target.setSelectionRange) {
            target.setSelectionRange(start + converted.length, start + converted.length);
          }
          target.dispatchEvent(new Event('input', { bubbles: true }));
          target.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    };

    // 2. Intercept paste to normalize Arabic numerals to English 0-9
    const handlePaste = (e: ClipboardEvent) => {
      const pasteText = e.clipboardData?.getData('text');
      if (pasteText && /[٠-٩۰-۹٫،]/.test(pasteText)) {
        const target = e.target as HTMLInputElement | HTMLTextAreaElement;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
          const isNumericTarget =
            target.type === 'number' ||
            target.inputMode === 'decimal' ||
            target.inputMode === 'numeric' ||
            target.getAttribute('dir') === 'ltr' ||
            target.classList.contains('font-mono');

          if (isNumericTarget) {
            e.preventDefault();
            const converted = toEnglishDigits(pasteText);
            const start = target.selectionStart ?? target.value.length;
            const end = target.selectionEnd ?? target.value.length;
            const currentVal = target.value;
            const newVal = currentVal.substring(0, start) + converted + currentVal.substring(end);
            target.value = newVal;
            if (target.setSelectionRange) {
              target.setSelectionRange(start + converted.length, start + converted.length);
            }
            target.dispatchEvent(new Event('input', { bubbles: true }));
            target.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      }
    };

    // 3. Fallback on input event
    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        const val = target.value;
        if (/[٠-٩۰-۹]/.test(val)) {
          const converted = toEnglishDigits(val);
          target.value = converted;
          target.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    };

    window.addEventListener('beforeinput', handleBeforeInput as EventListener, true);
    window.addEventListener('paste', handlePaste as EventListener, true);
    window.addEventListener('input', handleInput, true);

    return () => {
      window.removeEventListener('beforeinput', handleBeforeInput as EventListener, true);
      window.removeEventListener('paste', handlePaste as EventListener, true);
      window.removeEventListener('input', handleInput, true);
    };
  }, []);

  // Global keyboard shortcut: Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNavigate = (tab: TabType, extra?: any) => {
    setActiveTab(tab);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab onNavigate={handleNavigate} />;
      case 'pos':
        return <POSMain onNavigateToInvoices={() => setActiveTab('invoices')} />;
      case 'production_data_init':
        return <ProductionDataInitializationTab />;
      case 'whatsapp':
        return <WhatsAppManagerTab />;
      case 'financial_intelligence':
        return <FinancialReportingHub />;
      case 'real_business':
        return <RealBusinessOperationsTab />;
      case 'customer_success':
        return <CustomerSuccessTab />;
      case 'reports':
        return <ReportsTab />;
      case 'cashflow_forecast':
        return <CashFlowForecastTab />;
      case 'notifications':
        return <NotificationsTab />;
      case 'ai':
        return <AIAssistantTab />;
      case 'ocr':
        return <OCRTab />;
      case 'customers':
        return <CustomersTab />;
      case 'suppliers':
        return <SuppliersTab />;
      case 'products':
        return <ProductsTab />;
      case 'invoices':
        return <InvoicesTab />;
      case 'purchase_invoices':
        return <PurchaseInvoicesTab />;
      case 'payments':
        return <PaymentsTab />;
      case 'ledger':
        return <LedgerTab />;
      case 'inventory':
        return <InventoryTab />;
      case 'fuel_station':
        return <FuelStationTab />;
      case 'users':
        return <UsersTab />;
      case 'roles':
        return <RolesTab />;
      case 'control_center':
        return <EnterpriseControlCenterTab />;
      case 'subscription':
        return <SubscriptionTab />;
      case 'observability':
        return <SystemHealthTab />;
      case 'backups':
        return <BackupRestoreTab />;
      case 'audit':
        return <AuditTab />;
      case 'swagger':
        return <SwaggerTab />;
      case 'production_verification':
        return <ProductionVerificationTab />;
      case 'test':
        return <TestRunnerTab />;
      default:
        return <OverviewTab onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans antialiased overflow-hidden" dir="rtl">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          activeTab={activeTab}
          themeMode={themeMode}
          onToggleTheme={() => setThemeMode(prev => prev === 'dark' ? 'light' : 'dark')}
          accentColor={accentColor}
          onChangeAccent={(color) => setAccentColor(color)}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-900/50 custom-scrollbar">
          <ErrorBoundary key={activeTab}>
            {renderContent()}
          </ErrorBoundary>
        </main>
      </div>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={handleNavigate}
      />
    </div>
  );
}

export default App;
