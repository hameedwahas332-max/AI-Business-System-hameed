import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  Bell,
  Sun,
  Moon,
  Palette,
  Check,
  Building2,
  User,
  RefreshCw,
  Coins,
  ChevronDown,
  Sparkles,
  Lock,
  LogOut,
  LogIn,
  Menu,
} from 'lucide-react';
import { TabType } from './Sidebar';
import { DailyExchangeRateModal } from './Common/DailyExchangeRateModal';
import { getStoredExchangeRates, EVENT_EXCHANGE_RATES_CHANGED, ExchangeRateConfig } from '../lib/exchangeRates';
import { formatNumber } from '../lib/formatters';
import { useModuleSettings, BusinessPresetKey } from '../context/ModuleSettingsContext';
import { useAuth } from '../context/AuthContext';
import { SyncCenterModal } from './Dashboard/SyncCenterModal';
import { UpdateCenterModal } from './Dashboard/UpdateCenterModal';
import { getAllRecords } from '../services/localSqliteDal';
import { api } from '../api';

export type ThemeMode = 'dark' | 'light';
export type AccentColor = 'indigo' | 'sapphire' | 'emerald' | 'amber';

interface HeaderProps {
  onOpenSearch: () => void;
  onOpenAuth: () => void;
  activeTab: TabType;
  themeMode?: ThemeMode;
  onToggleTheme?: () => void;
  accentColor?: AccentColor;
  onChangeAccent?: (accent: AccentColor) => void;
}

const TAB_TITLES: Record<TabType, string> = {
  overview: 'لوحة التحكم الرئيسية',
  pos: 'نقطة البيع السريع (POS)',
  invoices: 'فواتير المبيعات',
  purchase_invoices: 'فواتير المشتريات',
  customers: 'العملاء والذمم المدينة',
  suppliers: 'الموردون والذمم الدائنة',
  products: 'المنتجات والأصناف',
  inventory: 'المخزون وحركة الأصناف',
  payments: 'السندات والخزينة',
  expenses: 'المصروفات التشغيلية',
  employees: 'الموظفون والرواتب',
  ledger: 'دفتر الأستاذ والقيود',
  fuel_station: 'محطة الوقود والغاز',
  financial_intelligence: 'التقارير المالية الذكية',
  reports: 'التقارير والميزانيات',
  cashflow_forecast: 'توقعات التدفق النقدي',
  real_business: 'العمليات التجارية الواقعية',
  customer_success: 'نجاح العملاء والولاء',
  whatsapp: 'مركز واتساب والأتمتة',
  ai: 'المساعد المحاسبي الذكي',
  ocr: 'المسح الضوئي للفواتير (OCR)',
  notifications: 'مركز التنبيهات المباشر',
  users: 'المستخدمون والحسابات',
  roles: 'الأدوار والصلاحيات',
  control_center: 'مركز التحكم المؤسسي',
  subscription: 'الاشتراك والباقات',
  observability: 'صحة ومراقبة النظام',
  backups: 'النسخ الاحتياطي والاستعادة',
  audit: 'سجل تدقيق الأمان والعمليات',
  production_data_init: 'تهيئة بيانات الإنتاج',
  production_verification: 'التحقق من جاهزية الإنتاج',
  swagger: 'توثيق واجهات البرمجة (API)',
  test: 'فحوصات النظام الذاتية',
};

export const Header: React.FC<HeaderProps> = ({
  onOpenSearch,
  onOpenAuth,
  activeTab,
  themeMode = 'dark',
  onToggleTheme,
  accentColor = 'indigo',
  onChangeAccent,
}) => {
  const [showColorPalette, setShowColorPalette] = useState(false);
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isRatesOpen, setIsRatesOpen] = useState(false);
  const [exchangeConfig, setExchangeConfig] = useState<ExchangeRateConfig>(getStoredExchangeRates);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const headerRef = useRef<HTMLElement>(null);

  const { settings, applyPreset } = useModuleSettings();
  const { user, company, isAuthenticated, lockSystem, logout } = useAuth();

  const PRIMARY_PRESETS: { key: BusinessPresetKey; label: string; icon: string; short: string }[] = [
    { key: 'multi_activity', label: 'الوضع الشامل (متعدد الأنشطة)', icon: '🌐', short: 'شامل' },
    { key: 'grocery_only', label: 'وضع البقالة والمواد الغذائية فقط', icon: '🍏', short: 'بقالة' },
    { key: 'fuel_station_only', label: 'وضع محطة تعبئة الغاز والبترول فقط', icon: '⛽', short: 'محطة وقود' },
    { key: 'tires_batteries_only', label: 'وضع الإطارات والبطاريات فقط', icon: '🛞', short: 'إطارات وبطاريات' },
    { key: 'autoparts_oils_only', label: 'وضع قطع الغيار والزيوت فقط', icon: '🛢️', short: 'قطع وزيوت' },
    { key: 'wholesale_retail_general', label: 'وضع التجارة العامة والجملة والتجزئة', icon: '📦', short: 'تجارة عامة' },
  ];

  const currentPresetObj = PRIMARY_PRESETS.find((p) => p.key === settings.activePreset) || PRIMARY_PRESETS[0];

  const [isSyncCenterOpen, setIsSyncCenterOpen] = useState(false);
  const [isUpdateCenterOpen, setIsUpdateCenterOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [conflictCount, setConflictCount] = useState(0);

  // Close dropdown menus when clicking outside the header
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setShowPresetMenu(false);
        setShowColorPalette(false);
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keep listening to Sidebar's Update Center trigger so Sidebar's Update button opens the modal
  useEffect(() => {
    const handleOpenUpdater = () => {
      setIsUpdateCenterOpen(true);
    };
    window.addEventListener('erp:open-updater-modal', handleOpenUpdater);
    return () => {
      window.removeEventListener('erp:open-updater-modal', handleOpenUpdater);
    };
  }, []);

  const refreshSyncStats = useCallback(async () => {
    try {
      const [outbox, confs] = await Promise.all([
        getAllRecords('local_transactional_outbox'),
        getAllRecords('sync_conflict_registry'),
      ]);
      const pending = outbox.filter((i: any) => i.syncStatus === 'PENDING_SYNC' || i.syncStatus === 'SYNCING').length;
      const unresolvedConflicts = confs.filter((c: any) => !c.resolvedAt).length;
      setPendingSyncCount(pending);
      setConflictCount(unresolvedConflicts);
    } catch {
      // fallback
    }
  }, []);

  useEffect(() => {
    refreshSyncStats();

    const handleOnline = () => {
      setIsOnline(true);
      refreshSyncStats();
    };
    const handleOffline = () => {
      setIsOnline(false);
      refreshSyncStats();
    };
    const handleUpdate = () => refreshSyncStats();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('erp-outbox-updated', handleUpdate);
    window.addEventListener('erp-sync-state-changed', handleUpdate);
    window.addEventListener('erp-sync-status-changed', handleUpdate);
    window.addEventListener('erp-remote-data-updated', handleUpdate);

    const interval = setInterval(refreshSyncStats, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('erp-outbox-updated', handleUpdate);
      window.removeEventListener('erp-sync-state-changed', handleUpdate);
      window.removeEventListener('erp-sync-status-changed', handleUpdate);
      window.removeEventListener('erp-remote-data-updated', handleUpdate);
      clearInterval(interval);
    };
  }, [refreshSyncStats]);

  // Unread notifications badge count
  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadNotifications(0);
      return;
    }
    try {
      const res = await api.getNotifications(true);
      setUnreadNotifications(res?.data?.unreadCount || 0);
    } catch {
      // non-blocking
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchUnreadCount();
    const handleNotificationsUpdated = () => fetchUnreadCount();
    window.addEventListener('erp-notifications-updated', handleNotificationsUpdated);
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => {
      window.removeEventListener('erp-notifications-updated', handleNotificationsUpdated);
      clearInterval(interval);
    };
  }, [fetchUnreadCount]);

  useEffect(() => {
    const handleRatesChanged = () => {
      setExchangeConfig(getStoredExchangeRates());
    };
    window.addEventListener(EVENT_EXCHANGE_RATES_CHANGED, handleRatesChanged);
    return () => window.removeEventListener(EVENT_EXCHANGE_RATES_CHANGED, handleRatesChanged);
  }, []);

  const colorThemes: { id: AccentColor; name: string; dotColor: string }[] = [
    { id: 'indigo', name: 'إنديجو ملكي', dotColor: '#6366f1' },
    { id: 'sapphire', name: 'ياقوت أزرق', dotColor: '#2563eb' },
    { id: 'emerald', name: 'زمرد محاسبي', dotColor: '#0F766E' },
    { id: 'amber', name: 'عنبر ذهبي', dotColor: '#D4AF37' },
  ];

  const activeTitle = TAB_TITLES[activeTab] || 'لوحة التحكم الرئيسية';
  const activeColorDot = colorThemes.find((c) => c.id === accentColor)?.dotColor || '#0F766E';

  return (
    <>
      <header
        ref={headerRef}
        className="h-16 bg-[var(--md-surface-container-low)] border-b border-[var(--md-outline-variant)] px-3 sm:px-5 flex items-center justify-between gap-3 flex-shrink-0 z-20 select-none"
        dir="rtl"
      >
        {/* Right Zone (RTL Start): Mobile Menu Toggle + Active Screen Title & Company + Activity Profile */}
        <div className="flex items-center gap-2.5 min-w-0 shrink-0">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('erp:toggle-sidebar'))}
            className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] hover:bg-[var(--md-surface-container-high)] text-[var(--md-on-surface)] transition-colors cursor-pointer shrink-0"
            title="فتح أو طي القائمة الجانبية"
            aria-label="فتح أو طي القائمة الجانبية"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="min-w-0 hidden sm:block max-w-[200px] xl:max-w-[240px]">
            <h1 className="text-sm font-bold text-[var(--md-on-surface)] truncate leading-tight">
              {activeTitle}
            </h1>
            <p className="text-[11px] text-[var(--md-on-surface-variant)] truncate leading-tight mt-0.5">
              {company?.name || 'نظام المحاسبي الذكي ERP'}
            </p>
          </div>

          <div className="hidden xl:block h-6 w-px bg-[var(--md-outline-variant)] shrink-0" />

          {/* Business Activity Profile Selector Dropdown */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => {
                setShowPresetMenu((prev) => !prev);
                setShowColorPalette(false);
                setShowUserMenu(false);
              }}
              className="m3-btn-tonal h-10 px-3 text-xs"
              title="تغيير نشاط المنشأة وتخصيص شاشات النظام فورياً"
            >
              <span>{currentPresetObj.icon}</span>
              <span className="hidden 2xl:inline font-bold">نشاط: {currentPresetObj.short}</span>
              <span className="2xl:hidden font-bold">{currentPresetObj.short}</span>
              <ChevronDown className="w-3.5 h-3.5 shrink-0" />
            </button>

            {showPresetMenu && (
              <div className="m3-card-elevated absolute right-0 mt-2 w-72 p-2 z-50 space-y-1 text-right">
                <div className="text-[11px] font-bold text-[var(--md-on-surface-variant)] px-3 py-2 border-b border-[var(--md-outline-variant)] flex items-center justify-between">
                  <span>تخصيص النظام حسب نشاط المنشأة:</span>
                  <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--md-secondary)' }} />
                </div>
                {PRIMARY_PRESETS.map((preset) => {
                  const isSelected = settings.activePreset === preset.key;
                  return (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => {
                        applyPreset(preset.key);
                        setShowPresetMenu(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors text-right cursor-pointer ${
                        isSelected
                          ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] font-bold'
                          : 'text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-high)]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base shrink-0">{preset.icon}</span>
                        <span className="truncate text-xs">{preset.label}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Center Zone: Capsule Global Search Bar */}
        <div className="flex-1 flex justify-center max-w-md mx-auto min-w-0">
          <button
            type="button"
            onClick={onOpenSearch}
            className="w-full h-10 flex items-center justify-between gap-2 bg-[var(--md-surface-container)] hover:bg-[var(--md-surface-container-high)] text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] px-3.5 sm:px-4 rounded-full border border-[var(--md-outline-variant)] text-xs transition-colors cursor-pointer min-w-0"
            title="بحث شامل في الفواتير والعملاء والمنتجات (Ctrl+K)"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Search className="w-4 h-4 shrink-0" />
              <span className="truncate hidden sm:inline">بحث شامل في النظام...</span>
              <span className="truncate sm:hidden">بحث...</span>
            </div>
            <kbd className="hidden md:inline-flex items-center bg-[var(--md-surface-container-lowest)] border border-[var(--md-outline-variant)] px-2 py-0.5 rounded-full text-[10px] text-[var(--md-on-surface-variant)] font-mono shrink-0">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Left Zone (RTL End): Grouped Quick Ops | Interface Tools | Compact User Card */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Group 1: Quick Operations (Exchange Rate & Sync Status) */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Daily Exchange Rate */}
            <button
              type="button"
              onClick={() => setIsRatesOpen(true)}
              className="m3-btn-outlined h-10 px-2.5 sm:px-3 text-xs shrink-0"
              style={{
                backgroundColor: 'var(--md-secondary-container)',
                borderColor: 'var(--md-outline-variant)',
                color: 'var(--md-on-secondary-container)',
              }}
              title="نشرة أسعار الصرف اليومية وحاسبة العملات"
            >
              <Coins className="w-4 h-4 shrink-0" style={{ color: 'var(--md-secondary)' }} />
              <span className="hidden 2xl:inline font-semibold">الصرف:</span>
              <span className="hidden md:inline font-mono tabular-nums text-xs font-bold">
                1 SAR = {formatNumber(exchangeConfig.rates.SAR.accountingRate)}
              </span>
            </button>

            {/* Synchronization Status */}
            <button
              type="button"
              onClick={() => setIsSyncCenterOpen(true)}
              className="m3-btn-outlined h-10 px-2.5 sm:px-3 text-xs shrink-0"
              style={
                conflictCount > 0
                  ? {
                      backgroundColor: 'var(--md-error-container)',
                      borderColor: 'var(--md-error)',
                      color: 'var(--md-on-error-container)',
                    }
                  : !isOnline || pendingSyncCount > 0
                  ? {
                      backgroundColor: 'var(--md-warning-container)',
                      borderColor: 'var(--md-warning)',
                      color: 'var(--md-on-warning-container)',
                    }
                  : {
                      backgroundColor: 'var(--md-success-container)',
                      borderColor: 'var(--md-outline-variant)',
                      color: 'var(--md-on-success-container)',
                    }
              }
              title="مركز المزامنة السيادية وقاعدة البيانات المحلية"
            >
              {conflictCount > 0 ? (
                <>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: 'var(--md-error)' }} />
                  <span className="hidden xl:inline">تعارض:</span>
                  <span className="font-mono tabular-nums font-bold">{conflictCount}</span>
                </>
              ) : !isOnline ? (
                <>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: 'var(--md-warning)' }} />
                  <span className="hidden xl:inline">أوفلاين:</span>
                  <span className="font-mono tabular-nums font-bold">{pendingSyncCount}</span>
                </>
              ) : pendingSyncCount > 0 ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden xl:inline">معلق:</span>
                  <span className="font-mono tabular-nums font-bold">{pendingSyncCount}</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: 'var(--md-success)' }} />
                  <span className="hidden xl:inline">متزامن</span>
                </>
              )}
            </button>
          </div>

          <div className="hidden sm:block h-6 w-px bg-[var(--md-outline-variant)] shrink-0" />

          {/* Group 2: Interface Tools (Notifications, Theme Mode, Accent Palette) */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Notifications Bell */}
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('erp:navigate-tab', { detail: { tab: 'notifications' } }))}
              className="m3-btn-outlined w-10 h-10 p-0 justify-center relative shrink-0"
              style={
                activeTab === 'notifications'
                  ? {
                      backgroundColor: 'var(--md-primary-container)',
                      borderColor: 'var(--md-primary)',
                      color: 'var(--md-on-primary-container)',
                    }
                  : undefined
              }
              title="مركز التنبيهات والإشعارات"
              aria-label="مركز التنبيهات والإشعارات"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifications > 0 && (
                <span
                  className="absolute -top-1 -left-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold font-mono tabular-nums flex items-center justify-center"
                  style={{
                    backgroundColor: 'var(--md-error)',
                    color: 'var(--md-on-error)',
                  }}
                >
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </span>
              )}
            </button>

            {/* Theme Mode Toggle (Dark / Light) */}
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className="m3-btn-outlined w-10 h-10 p-0 justify-center shrink-0"
                title={themeMode === 'dark' ? 'التحويل إلى الوضع الفاتح (Light Mode)' : 'التحويل إلى الوضع المظلم (Dark Mode)'}
                aria-label={themeMode === 'dark' ? 'التحويل إلى الوضع الفاتح' : 'التحويل إلى الوضع المظلم'}
              >
                {themeMode === 'dark' ? (
                  <Sun className="w-4 h-4 shrink-0" style={{ color: 'var(--md-secondary)' }} />
                ) : (
                  <Moon className="w-4 h-4 shrink-0" style={{ color: 'var(--md-primary)' }} />
                )}
              </button>
            )}

            {/* Accent Color Palette Switcher */}
            {onChangeAccent && (
              <div className="relative shrink-0 hidden sm:block">
                <button
                  type="button"
                  onClick={() => {
                    setShowColorPalette((prev) => !prev);
                    setShowPresetMenu(false);
                    setShowUserMenu(false);
                  }}
                  className="m3-btn-outlined h-10 px-2.5"
                  title="تخصيص لون هوية النظام"
                  aria-label="تخصيص لون هوية النظام"
                >
                  <Palette className="w-4 h-4 text-[var(--md-on-surface-variant)]" />
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: activeColorDot }}
                  />
                </button>

                {showColorPalette && (
                  <div className="m3-card-elevated absolute left-0 mt-2 w-48 p-2 z-50 space-y-1 text-right">
                    <div className="text-[11px] font-semibold text-[var(--md-on-surface-variant)] px-2.5 py-1.5 border-b border-[var(--md-outline-variant)] mb-1">
                      اختر لون هوية المنشأة:
                    </div>
                    {colorThemes.map((theme) => (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => {
                          onChangeAccent(theme.id);
                          setShowColorPalette(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                          accentColor === theme.id
                            ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] font-bold'
                            : 'text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-high)]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0"
                            style={{ backgroundColor: theme.dotColor }}
                          />
                          <span>{theme.name}</span>
                        </div>
                        {accentColor === theme.id && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="hidden sm:block h-6 w-px bg-[var(--md-outline-variant)] shrink-0" />

          {/* Group 3: Compact User Card & Account/Lock/Logout Menu */}
          {isAuthenticated && user ? (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowUserMenu((prev) => !prev);
                  setShowPresetMenu(false);
                  setShowColorPalette(false);
                }}
                className="h-10 flex items-center gap-2 px-2 sm:px-2.5 bg-[var(--md-surface-container)] hover:bg-[var(--md-surface-container-high)] border border-[var(--md-outline-variant)] rounded-xl transition-colors text-xs cursor-pointer max-w-[190px] shrink-0"
                title="حساب المستخدم، قفل النظام، وتسجيل الخروج"
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: 'var(--md-primary-container)',
                    color: 'var(--md-on-primary-container)',
                  }}
                >
                  <User className="w-3.5 h-3.5" />
                </div>
                <div className="text-right truncate hidden lg:block">
                  <div className="font-bold text-[var(--md-on-surface)] text-[11px] truncate leading-tight">
                    {user.full_name || 'المدير العام'}
                  </div>
                  <div className="text-[10px] text-[var(--md-on-surface-variant)] truncate leading-tight">
                    {company?.name || 'المؤسسة التجارية'}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[var(--md-on-surface-variant)] shrink-0 hidden sm:block" />
              </button>

              {showUserMenu && (
                <div className="m3-card-elevated absolute left-0 mt-2 w-60 p-2 z-50 space-y-1 text-right">
                  <div className="px-3 py-2 border-b border-[var(--md-outline-variant)] mb-1">
                    <div className="text-xs font-bold text-[var(--md-on-surface)] truncate">
                      {user.full_name || 'المدير العام'}
                    </div>
                    <div className="text-[11px] text-[var(--md-on-surface-variant)] truncate mt-0.5">
                      {company?.name || 'المؤسسة التجارية'}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      onOpenAuth();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-high)] transition-colors cursor-pointer"
                  >
                    <Building2 className="w-4 h-4 shrink-0" style={{ color: 'var(--md-primary)' }} />
                    <span>إدارة بيانات المحل والحساب</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      lockSystem();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-high)] transition-colors cursor-pointer"
                  >
                    <Lock className="w-4 h-4 shrink-0" style={{ color: 'var(--md-secondary)' }} />
                    <span>قفل النظام لحماية البيانات</span>
                  </button>

                  <div className="h-px bg-[var(--md-outline-variant)] my-1" />

                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    style={{
                      backgroundColor: 'var(--md-error-container)',
                      color: 'var(--md-on-error-container)',
                    }}
                  >
                    <LogOut className="w-4 h-4 shrink-0" style={{ color: 'var(--md-error)' }} />
                    <span>تسجيل الخروج</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={onOpenAuth}
                type="button"
                className="m3-btn-primary h-10 px-3 text-xs shrink-0"
                title="تسجيل الدخول أو إنشاء حساب محل تجاري جديد"
              >
                <LogIn className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden md:inline">تسجيل الدخول</span>
              </button>
              <button
                onClick={lockSystem}
                type="button"
                className="m3-btn-outlined w-10 h-10 p-0 justify-center shrink-0"
                title="قفل النظام لحماية البيانات والخصوصية"
                aria-label="قفل النظام"
              >
                <Lock className="w-4 h-4 shrink-0" style={{ color: 'var(--md-secondary)' }} />
              </button>
            </div>
          )}
        </div>
      </header>

      <DailyExchangeRateModal
        isOpen={isRatesOpen}
        onClose={() => setIsRatesOpen(false)}
      />

      <SyncCenterModal
        isOpen={isSyncCenterOpen}
        onClose={() => {
          setIsSyncCenterOpen(false);
          refreshSyncStats();
        }}
      />

      <UpdateCenterModal
        isOpen={isUpdateCenterOpen}
        onClose={() => setIsUpdateCenterOpen(false)}
      />
    </>
  );
};
