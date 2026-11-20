import React, { useState } from 'react';
import {
  Search,
  Bell,
  Sun,
  Moon,
  Palette,
  Check,
  Building2,
  User,
  ShieldCheck,
  RefreshCw,
  Coins,
  ChevronDown,
  Sparkles,
  Lock,
  LogOut,
  LogIn,
} from 'lucide-react';
import { TabType } from './Sidebar';
import { DailyExchangeRateModal } from './Common/DailyExchangeRateModal';
import { getStoredExchangeRates, EVENT_EXCHANGE_RATES_CHANGED, ExchangeRateConfig } from '../lib/exchangeRates';
import { formatNumber } from '../lib/formatters';
import { useModuleSettings, PRESET_DEFINITIONS, BusinessPresetKey } from '../context/ModuleSettingsContext';
import { useAuth } from '../context/AuthContext';
import { SyncCenterModal } from './Dashboard/SyncCenterModal';
import { UpdateCenterModal } from './Dashboard/UpdateCenterModal';
import { CURRENT_APP_VERSION } from '../services/updaterService';
import { getAllRecords } from '../services/localSqliteDal';

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
  const [isRatesOpen, setIsRatesOpen] = useState(false);
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [exchangeConfig, setExchangeConfig] = useState<ExchangeRateConfig>(getStoredExchangeRates);

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
  const [hasUpdateAvailable, setHasUpdateAvailable] = useState(false);
  const [availableVersion, setAvailableVersion] = useState('');
  const [currentAppVersion, setCurrentAppVersion] = useState(CURRENT_APP_VERSION);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [conflictCount, setConflictCount] = useState(0);

  React.useEffect(() => {
    const handleUpdateFound = (e: any) => {
      setHasUpdateAvailable(true);
      if (e?.detail?.availableVersion) {
        setAvailableVersion(e.detail.availableVersion);
      }
      if (e?.detail?.currentVersion) {
        setCurrentAppVersion(e.detail.currentVersion);
      }
    };
    const handleStatusChanged = (e: any) => {
      if (e?.detail) {
        setHasUpdateAvailable(Boolean(e.detail.hasUpdate));
        if (e.detail.availableVersion) setAvailableVersion(e.detail.availableVersion);
        if (e.detail.currentVersion) setCurrentAppVersion(e.detail.currentVersion);
      }
    };
    const handleOpenUpdater = () => {
      setIsUpdateCenterOpen(true);
    };

    window.addEventListener('erp:update-available', handleUpdateFound);
    window.addEventListener('erp-update-status-changed', handleStatusChanged);
    window.addEventListener('erp:open-updater-modal', handleOpenUpdater);
    return () => {
      window.removeEventListener('erp:update-available', handleUpdateFound);
      window.removeEventListener('erp-update-status-changed', handleStatusChanged);
      window.removeEventListener('erp:open-updater-modal', handleOpenUpdater);
    };
  }, []);

  const refreshSyncStats = React.useCallback(async () => {
    try {
      const [outbox, confs] = await Promise.all([
        getAllRecords('local_transactional_outbox'),
        getAllRecords('sync_conflict_registry')
      ]);
      const pending = outbox.filter((i: any) => i.syncStatus === 'PENDING_SYNC' || i.syncStatus === 'SYNCING').length;
      const unresolvedConflicts = confs.filter((c: any) => !c.resolvedAt).length;
      setPendingSyncCount(pending);
      setConflictCount(unresolvedConflicts);
    } catch {
      // fallback
    }
  }, []);

  React.useEffect(() => {
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

  React.useEffect(() => {
    const handleRatesChanged = () => {
      setExchangeConfig(getStoredExchangeRates());
    };
    window.addEventListener(EVENT_EXCHANGE_RATES_CHANGED, handleRatesChanged);
    return () => window.removeEventListener(EVENT_EXCHANGE_RATES_CHANGED, handleRatesChanged);
  }, []);

  const colorThemes: { id: AccentColor; name: string; bgClass: string; hex: string }[] = [
    { id: 'indigo', name: 'إنديجو ملكي', bgClass: 'bg-indigo-600', hex: '#6366f1' },
    { id: 'sapphire', name: 'ياقوت أزرق', bgClass: 'bg-blue-600', hex: '#2563eb' },
    { id: 'emerald', name: 'زمرد محاسبي', bgClass: 'bg-emerald-600', hex: '#10b981' },
    { id: 'amber', name: 'عنبر ذهبي', bgClass: 'bg-amber-600', hex: '#f59e0b' },
  ];

  return (
    <>
      <header className="h-16 bg-[var(--md-surface-container-low)] border-b border-[var(--md-outline-variant)] px-4 sm:px-6 flex items-center justify-between gap-4 flex-shrink-0 z-10 select-none">
        {/* Right Zone (RTL Start): Title, Activity Profile, Exchange Rate & Updater */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="hidden xl:flex items-center gap-2 pl-2 border-l border-[var(--md-outline-variant)] shrink-0">
            <span className="text-xs font-bold text-[var(--md-on-surface)] whitespace-nowrap">
              نظام المحاسبي الذكي ERP
            </span>
          </div>

          {/* Business Activity Profile Selector Dropdown */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowPresetMenu((prev) => !prev)}
              className="m3-btn-tonal h-10 px-3 text-xs"
              title="تغيير نشاط المنشأة وتخصيص شاشات النظام فورياً"
            >
              <span>{currentPresetObj.icon}</span>
              <span className="hidden sm:inline font-bold">نشاط: {currentPresetObj.short}</span>
              <span className="sm:hidden font-bold">{currentPresetObj.short}</span>
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

          {/* Daily Exchange Rate Badge Button */}
          <button
            type="button"
            onClick={() => setIsRatesOpen(true)}
            className="m3-btn-outlined h-10 px-3 text-xs shrink-0"
            style={{
              backgroundColor: 'var(--md-secondary-container)',
              borderColor: 'var(--md-outline-variant)',
              color: 'var(--md-on-secondary-container)',
            }}
            title="فتح نشرة أسعار الصرف اليومية وحاسبة العملات"
          >
            <Coins className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--md-secondary)' }} />
            <span className="hidden md:inline font-semibold">الصرف:</span>
            <span className="font-mono tabular-nums text-xs font-bold">
              1 SAR = {formatNumber(exchangeConfig.rates.SAR.accountingRate)}
            </span>
          </button>

          {/* Automatic Enterprise Updater Button */}
          <button
            type="button"
            onClick={() => setIsUpdateCenterOpen(true)}
            className="m3-btn-outlined h-10 px-3 text-xs shrink-0"
            style={
              hasUpdateAvailable
                ? {
                    backgroundColor: 'var(--md-secondary-container)',
                    borderColor: 'var(--md-secondary)',
                    color: 'var(--md-on-secondary-container)',
                  }
                : undefined
            }
            title="مركز التحديثات التلقائية المعتمدة (Tauri Auto-Updater)"
          >
            <Sparkles
              className="w-3.5 h-3.5 shrink-0"
              style={{ color: hasUpdateAvailable ? 'var(--md-secondary)' : 'var(--md-primary)' }}
            />
            <span className="hidden xl:inline font-semibold">التحديثات:</span>
            <span className="font-mono tabular-nums text-xs">v{currentAppVersion}</span>
            {hasUpdateAvailable && (
              <span
                className="m3-badge"
                style={{
                  backgroundColor: 'var(--md-secondary)',
                  color: 'var(--md-on-secondary)',
                  borderColor: 'transparent',
                }}
              >
                تحديث {availableVersion ? `v${availableVersion}` : 'متاح'}
              </span>
            )}
          </button>
        </div>

        {/* Left Zone (RTL End): Search, Theme, Accent, Sync, Account, Lock, Logout */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Search trigger */}
          <button
            type="button"
            onClick={onOpenSearch}
            className="h-10 flex items-center justify-between gap-2 bg-[var(--md-surface-container)] hover:bg-[var(--md-surface-container-high)] text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] px-3.5 rounded-xl border border-[var(--md-outline-variant)] text-xs transition-colors w-44 md:w-60 cursor-pointer shrink-0"
            title="بحث سريع (Ctrl+K)"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Search className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">بحث في النظام (Ctrl+K)...</span>
            </div>
            <kbd className="hidden sm:inline-block bg-[var(--md-surface-container-lowest)] border border-[var(--md-outline-variant)] px-1.5 py-0.5 rounded-md text-[10px] text-[var(--md-on-surface-variant)] font-mono shrink-0">
              ⌘K
            </kbd>
          </button>

          {/* Theme Mode Toggle (Dark / Light) */}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="m3-btn-outlined h-10 px-3 text-xs shrink-0"
              title={themeMode === 'dark' ? 'التحويل إلى الوضع الفاتح (Light Mode)' : 'التحويل إلى الوضع المظلم (Dark Mode)'}
            >
              {themeMode === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 shrink-0" style={{ color: 'var(--md-secondary)' }} />
                  <span className="hidden sm:inline">الوضع الفاتح</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 shrink-0" style={{ color: 'var(--md-primary)' }} />
                  <span className="hidden sm:inline">الوضع المظلم</span>
                </>
              )}
            </button>
          )}

          {/* 4 Accent Colors Palette Switcher */}
          {onChangeAccent && (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowColorPalette((prev) => !prev)}
                className="m3-btn-outlined h-10 px-2.5"
                title="تخصيص لون هوية النظام"
                aria-label="تخصيص لون هوية النظام"
              >
                <Palette className="w-4 h-4 text-[var(--md-on-surface-variant)]" />
                <span className={`w-2.5 h-2.5 rounded-full ${colorThemes.find(c => c.id === accentColor)?.bgClass}`} />
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
                        <span className={`w-3.5 h-3.5 rounded-full ${theme.bgClass}`} />
                        <span>{theme.name}</span>
                      </div>
                      {accentColor === theme.id && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="h-6 w-px bg-[var(--md-outline-variant)] mx-0.5 hidden sm:block shrink-0" />

          {/* CONTROL GROUP: Synchronization Status, Store & Account Badge, Lock System, Logout */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Interactive Synchronization Status */}
            <button
              type="button"
              onClick={() => setIsSyncCenterOpen(true)}
              className="m3-btn-outlined h-10 px-3 text-xs shrink-0"
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
              title="مركز المزامنة السيادية وقاعدة البيانات المحلية (اضغط لفتح المركز)"
            >
              {conflictCount > 0 ? (
                <>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: 'var(--md-error)' }} />
                  <span className="hidden sm:inline">تعارض يتطلب المراجعة:</span>
                  <span className="font-mono tabular-nums font-bold">{conflictCount}</span>
                </>
              ) : !isOnline ? (
                <>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: 'var(--md-warning)' }} />
                  <span className="hidden sm:inline">أوفلاين معلق:</span>
                  <span className="font-mono tabular-nums font-bold">{pendingSyncCount} حركة</span>
                </>
              ) : pendingSyncCount > 0 ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">بانتظار المزامنة:</span>
                  <span className="font-mono tabular-nums font-bold">{pendingSyncCount} حركة</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: 'var(--md-success)' }} />
                  <span className="hidden sm:inline">متصل - متزامن</span>
                </>
              )}
            </button>

            {/* 1. Store Name & Account Badge / Login Button */}
            {isAuthenticated && user ? (
              <button
                onClick={onOpenAuth}
                type="button"
                className="h-10 flex items-center gap-2 px-3 bg-[var(--md-surface-container)] hover:bg-[var(--md-surface-container-high)] border border-[var(--md-outline-variant)] rounded-xl transition-colors text-xs cursor-pointer max-w-[210px] truncate shrink-0"
                title="إدارة بيانات المحل والحساب الدائم"
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: 'var(--md-primary-container)',
                    color: 'var(--md-on-primary-container)',
                  }}
                >
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <div className="text-right truncate hidden sm:block">
                  <div className="font-bold text-[var(--md-on-surface)] text-[11px] truncate leading-tight">
                    {company?.name || 'المؤسسة التجارية'}
                  </div>
                  <div className="text-[10px] text-[var(--md-on-surface-variant)] truncate">
                    {user.full_name || 'المدير العام'}
                  </div>
                </div>
              </button>
            ) : (
              <button
                onClick={onOpenAuth}
                type="button"
                className="m3-btn-primary h-10 px-3 text-xs shrink-0"
                title="تسجيل الدخول أو إنشاء حساب محل تجاري جديد"
              >
                <LogIn className="w-3.5 h-3.5 shrink-0" />
                <span>تسجيل الدخول / إنشاء حساب</span>
              </button>
            )}

            {/* 2. System Lock Button */}
            <button
              onClick={lockSystem}
              type="button"
              className="m3-btn-outlined h-10 px-3 text-xs shrink-0"
              title="🔒 قفل النظام لحماية البيانات والخصوصية"
            >
              <Lock className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--md-secondary)' }} />
              <span className="hidden md:inline">قفل النظام</span>
            </button>

            {/* 3. Logout Button (Semantically separated error styling) */}
            {isAuthenticated && (
              <button
                onClick={logout}
                type="button"
                className="m3-btn-outlined h-10 px-3 text-xs shrink-0"
                style={{
                  backgroundColor: 'var(--md-error-container)',
                  borderColor: 'transparent',
                  color: 'var(--md-on-error-container)',
                }}
                title="🚪 تسجيل الخروج من النظام"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--md-error)' }} />
                <span className="hidden lg:inline">خروج</span>
              </button>
            )}
          </div>
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
