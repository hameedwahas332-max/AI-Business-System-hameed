import React, { useState, useEffect } from 'react';
import { Lock, ShieldAlert, LogOut, KeyRound, Building2, Sparkles, ArrowRight, X } from 'lucide-react';
import { Header, ThemeMode, AccentColor } from './components/Header';
import { Sidebar, TabType } from './components/Sidebar';
import { AuthModal } from './components/Auth/AuthModal';
import { GlobalSearchModal } from './components/Common/GlobalSearchModal';
import { ErrorBoundary } from './components/Common/ErrorBoundary';
import { AppIcon } from './components/Common/AppIcon';
import { toEnglishDigits } from './lib/formatters';
import { useAuth } from './context/AuthContext';
import { checkForUpdates, UpdateCheckResult } from './services/updaterService';
import { triggerSyncImmediate, isAutoSyncEnabled } from './services/transactionalOutbox';
import { autoRepairExistingProductStock } from './services/localDesktopApiFallback';

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
import { EmployeesAndExpensesTab } from './components/Dashboard/EmployeesAndExpensesTab';

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Authentication & System Lock State
  const { isSystemLocked, unlockSystem, user, company, logout } = useAuth();
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockError(null);
    if (!unlockPassword.trim()) {
      setUnlockError('يرجى إدخال كلمة المرور لفتح قفل النظام');
      return;
    }
    setIsUnlocking(true);
    try {
      const success = await unlockSystem(unlockPassword.trim());
      if (success) {
        setUnlockPassword('');
        setUnlockError(null);
      } else {
        setUnlockError('كلمة المرور غير صحيحة، يرجى المحاولة مرة أخرى');
      }
    } catch (err: any) {
      setUnlockError(err?.message || 'حدث خطأ أثناء محاولة فتح القفل');
    } finally {
      setIsUnlocking(false);
    }
  };

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
    if (themeMode === 'light') {
      document.documentElement.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
    }
    localStorage.setItem('erp_theme_mode', themeMode);
    window.dispatchEvent(new CustomEvent('erp-theme-changed', { detail: { theme: themeMode } }));
  }, [themeMode]);

  useEffect(() => {
    document.documentElement.setAttribute('data-accent', accentColor);
    localStorage.setItem('erp_accent_color', accentColor);
  }, [accentColor]);

  // Sync external theme changes (e.g. from Sidebar or Settings Modal)
  useEffect(() => {
    const handleThemeChange = (e: any) => {
      const newTheme = e.detail?.theme || e.detail;
      if (newTheme === 'dark' || newTheme === 'light') {
        setThemeMode(newTheme);
      }
    };
    window.addEventListener('erp-theme-changed', handleThemeChange as EventListener);
    return () => window.removeEventListener('erp-theme-changed', handleThemeChange as EventListener);
  }, []);

  // Automatic Background Update Verification (Startup after 5s & every 15 minutes)
  const [pendingUpdate, setPendingUpdate] = useState<UpdateCheckResult | null>(null);
  const [showUpdateToast, setShowUpdateToast] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const executeBackgroundCheck = async () => {
      try {
        const res = await checkForUpdates(false);
        if (isMounted && res.hasUpdate) {
          setPendingUpdate(res);
          setShowUpdateToast(true);
          window.dispatchEvent(new CustomEvent('erp:update-available', { detail: res }));
        }
      } catch (err) {
        console.warn('[App] Background update check warning:', err);
      }
    };

    // Automatic check 5 seconds after startup
    const initialTimer = setTimeout(executeBackgroundCheck, 5000);

    // Periodic check every 15 minutes
    const intervalTimer = setInterval(executeBackgroundCheck, 15 * 60 * 1000);

    // Initial check & auto-repair existing stock records
    try {
      autoRepairExistingProductStock();
    } catch {}

    return () => {
      isMounted = false;
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
    };
  }, []);

  // Instant Automatic Synchronization on Internet Connection Re-establishment
  useEffect(() => {
    let onlineTimer: any = null;
    const handleImmediateAutoSync = () => {
      if (!isAutoSyncEnabled()) return;
      if (onlineTimer) clearTimeout(onlineTimer);
      onlineTimer = setTimeout(() => {
        console.log('[App] Online detected, initiating instant auto-sync');
        triggerSyncImmediate();
      }, 500);
    };

    window.addEventListener('online', handleImmediateAutoSync);
    return () => {
      window.removeEventListener('online', handleImmediateAutoSync);
      if (onlineTimer) clearTimeout(onlineTimer);
    };
  }, []);

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
        return <RealBusinessOperationsTab onNavigate={handleNavigate} />;
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
      case 'expenses':
        return <EmployeesAndExpensesTab initialSubTab="expenses" />;
      case 'employees':
        return <EmployeesAndExpensesTab initialSubTab="employees" />;
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
    <div
      className="flex h-screen bg-[var(--md-surface)] text-[var(--md-on-surface)] font-sans antialiased overflow-hidden"
      dir="rtl"
    >
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
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[var(--md-surface)] custom-scrollbar">
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

      {/* 🔒 FULL-SCREEN SYSTEM LOCK OVERLAY */}
      {isSystemLocked && (
        <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 select-none">
          <div className="m3-modal-surface w-full max-w-md p-6 sm:p-8 text-center space-y-6">
            {/* App Emblem */}
            <div className="flex flex-col items-center justify-center gap-3">
              <AppIcon className="w-16 h-16" />
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-sm font-bold text-[var(--md-secondary)] tracking-wide">
                  نظام المحاسبي الذكي ERP
                </span>
                <span className="text-xs text-[var(--md-on-surface-variant)] font-medium">
                  Smart Accounting & Enterprise ERP
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div
                className="m3-badge mx-auto px-3 py-1"
                style={{
                  backgroundColor: 'var(--md-warning-container)',
                  color: 'var(--md-on-warning-container)',
                  borderColor: 'var(--md-secondary)',
                }}
              >
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>النظام مقفل حالياً لحماية البيانات والخصوصية</span>
              </div>
              <h2 className="text-xl font-bold text-[var(--md-on-surface)]">
                {company?.name || 'المؤسسة التجارية'}
              </h2>
              <p className="text-xs text-[var(--md-on-surface-variant)]">
                المستخدم النشط:{' '}
                <span className="text-[var(--md-on-surface)] font-semibold">
                  {user?.full_name || 'المدير العام'}
                </span>{' '}
                ({user?.email})
              </p>
            </div>

            {unlockError && (
              <div
                className="p-3 rounded-xl text-xs flex items-center gap-2 text-right border"
                style={{
                  backgroundColor: 'var(--md-error-container)',
                  borderColor: 'var(--md-error)',
                  color: 'var(--md-on-error-container)',
                }}
              >
                <ShieldAlert className="w-4 h-4 shrink-0" style={{ color: 'var(--md-error)' }} />
                <span>{unlockError}</span>
              </div>
            )}

            <form onSubmit={handleUnlock} className="space-y-4 text-right">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[var(--md-on-surface-variant)]">
                  أدخل كلمة مرور الحساب لفتح القفل:
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[var(--md-on-surface-variant)] absolute top-1/2 -translate-y-1/2 right-3 pointer-events-none" />
                  <input
                    type="password"
                    required
                    autoFocus
                    value={unlockPassword}
                    onChange={(e) => {
                      setUnlockPassword(e.target.value);
                      if (unlockError) setUnlockError(null);
                    }}
                    placeholder="••••••••"
                    dir="ltr"
                    className="m3-input pr-10 pl-3 font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isUnlocking}
                className="m3-btn-primary w-full"
              >
                <Lock className="w-4 h-4" />
                <span>{isUnlocking ? 'جاري التحقق...' : 'فتح قفل النظام'}</span>
              </button>
            </form>

            <div className="pt-3 border-t border-[var(--md-outline-variant)]">
              <button
                type="button"
                onClick={() => {
                  logout();
                  setUnlockPassword('');
                  setUnlockError(null);
                }}
                className="m3-btn-text mx-auto text-xs"
                style={{ color: 'var(--md-error)' }}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>تسجيل الخروج والانتقال لحساب آخر</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 AUTOMATIC 1-CLICK UPDATE BANNER */}
      {showUpdateToast && pendingUpdate && (
        <div
          dir="rtl"
          className="m3-card-elevated fixed bottom-5 left-5 z-50 max-w-md p-4 flex items-center justify-between gap-4 border-[var(--md-primary)]"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
              style={{
                backgroundColor: 'var(--md-primary-container)',
                borderColor: 'var(--md-primary)',
                color: 'var(--md-on-primary-container)',
              }}
            >
              <Sparkles className="w-5 h-5" style={{ color: 'var(--md-secondary)' }} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-[var(--md-on-surface)]">
                  يتوفر تحديث جديد للنظام
                </span>
                <span
                  className="m3-badge font-mono"
                  style={{
                    backgroundColor: 'var(--md-secondary-container)',
                    color: 'var(--md-on-secondary-container)',
                    borderColor: 'var(--md-secondary)',
                  }}
                >
                  v{pendingUpdate.availableVersion}
                </span>
              </div>
              <p className="text-xs text-[var(--md-on-surface-variant)] mt-1 leading-snug">
                تم بناء وتوقيع إصدار أحدث على GitHub. اضغط للتحديث فوراً.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new Event('erp:open-updater-modal'));
                setShowUpdateToast(false);
              }}
              className="m3-btn-primary text-xs px-3"
            >
              <span>تحديث الآن</span>
              <ArrowRight className="w-3.5 h-3.5 rotate-180" />
            </button>
            <button
              type="button"
              onClick={() => setShowUpdateToast(false)}
              className="m3-btn-text p-2 min-h-[36px]"
              title="تذكيري لاحقاً"
              aria-label="إغلاق إشعار التحديث"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
