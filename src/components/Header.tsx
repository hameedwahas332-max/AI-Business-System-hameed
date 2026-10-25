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
      <header className="h-16 bg-slate-900/85 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between flex-shrink-0 z-10 select-none">
        {/* Title / Current Tab Indicator & Profile Switcher */}
        <div className="flex items-center gap-2.5">
          <div className="hidden lg:flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-slate-400">ERP سحابي</span>
          </div>

          {/* Business Activity Profile Selector Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPresetMenu((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
              title="تغيير نشاط المنشأة وتخصيص شاشات النظام فورياً"
            >
              <span>{currentPresetObj.icon}</span>
              <span className="hidden sm:inline font-bold">نشاط: {currentPresetObj.short}</span>
              <span className="sm:hidden font-bold">{currentPresetObj.short}</span>
              <ChevronDown className="w-3.5 h-3.5 text-indigo-400" />
            </button>

            {showPresetMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 space-y-1 text-right">
                <div className="text-[11px] font-bold text-slate-400 px-3 py-1.5 border-b border-slate-800 flex items-center justify-between">
                  <span>تخصيص النظام حسب نشاط المنشأة:</span>
                  <Sparkles className="w-3 h-3 text-amber-400" />
                </div>
                {PRIMARY_PRESETS.map((preset) => {
                  const isSelected = settings.activePreset === preset.key;
                  return (
                    <button
                      key={preset.key}
                      onClick={() => {
                        applyPreset(preset.key);
                        setShowPresetMenu(false);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-medium transition-all text-right cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600/20 text-indigo-200 border border-indigo-500/40 font-bold'
                          : 'text-slate-300 hover:bg-slate-800/70'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{preset.icon}</span>
                        <div className="text-right">
                          <div className="font-bold text-white text-[11px]">{preset.label}</div>
                        </div>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
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
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
            title="فتح نشرة أسعار الصرف اليومية وحاسبة العملات"
          >
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">الصرف:</span>
            <span className="font-mono text-[11px] text-amber-200">
              1 SAR = {formatNumber(exchangeConfig.rates.SAR.accountingRate)}
            </span>
          </button>
        </div>

      {/* Quick Search & Switchers */}
      <div className="flex items-center gap-3">
        {/* Search trigger */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-800 text-slate-300 px-3.5 py-1.5 rounded-xl border border-slate-700/60 text-xs transition-all w-52 md:w-64 justify-between"
          title="بحث سريع (Ctrl+K)"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span>بحث في النظام (Ctrl+K)...</span>
          </div>
          <kbd className="hidden sm:inline-block bg-slate-700/60 px-1.5 py-0.5 rounded text-[10px] text-slate-400 font-mono">
            ⌘K
          </kbd>
        </button>

        {/* Theme Mode Toggle (Dark / Light) */}
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors border border-slate-700/60 relative"
            title={themeMode === 'dark' ? 'التحويل إلى الوضع النهاري (Light Mode)' : 'التحويل إلى الوضع الليلي (Dark Mode)'}
          >
            {themeMode === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-400" />
            )}
          </button>
        )}

        {/* 4 Accent Colors Palette Switcher */}
        {onChangeAccent && (
          <div className="relative">
            <button
              onClick={() => setShowColorPalette((prev) => !prev)}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors border border-slate-700/60 flex items-center gap-1.5"
              title="تخصيص لون هوية النظام"
            >
              <Palette className="w-4 h-4" />
              <span className={`w-2.5 h-2.5 rounded-full ${colorThemes.find(c => c.id === accentColor)?.bgClass}`} />
            </button>

            {showColorPalette && (
              <div className="absolute left-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 z-50 space-y-1">
                <div className="text-[11px] font-semibold text-slate-400 px-2 py-1 border-b border-slate-800 mb-1">
                  اختر لون هوية المنشأة:
                </div>
                {colorThemes.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => {
                      onChangeAccent(theme.id);
                      setShowColorPalette(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      accentColor === theme.id ? 'bg-slate-800 text-white font-bold' : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-3.5 h-3.5 rounded-full ${theme.bgClass}`} />
                      <span>{theme.name}</span>
                    </div>
                    {accentColor === theme.id && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="h-6 w-px bg-slate-800 mx-1 hidden sm:block" />

        {/* CONTROL GROUP: Store & Account Badge, Lock System, Logout */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* 1. Store Name & Account Badge / Login Button */}
          {isAuthenticated && user ? (
            <button
              onClick={onOpenAuth}
              type="button"
              className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-800 border border-indigo-500/30 rounded-xl transition-all text-xs cursor-pointer max-w-[210px] truncate"
              title="إدارة بيانات المحل والحساب الدائم"
            >
              <div className="w-6 h-6 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-[10px] font-bold text-indigo-300 shrink-0">
                <Building2 className="w-3.5 h-3.5" />
              </div>
              <div className="text-right truncate hidden sm:block">
                <div className="font-bold text-white text-[11px] truncate leading-tight">
                  {company?.name || 'المؤسسة التجارية'}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {user.full_name || 'المدير العام'}
                </div>
              </div>
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-xl transition-all text-xs font-bold cursor-pointer"
              title="تسجيل الدخول أو إنشاء حساب محل تجاري جديد"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>تسجيل الدخول / إنشاء حساب</span>
            </button>
          )}

          {/* 2. System Lock Button (🔒 قفل النظام) */}
          <button
            onClick={lockSystem}
            type="button"
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl transition-all text-xs font-bold cursor-pointer shadow-sm"
            title="🔒 قفل النظام لحماية البيانات والخصوصية"
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">قفل النظام</span>
          </button>

          {/* 3. Logout Button (🚪 تسجيل الخروج) */}
          {isAuthenticated && (
            <button
              onClick={logout}
              type="button"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl transition-all text-xs font-bold cursor-pointer shadow-sm"
              title="🚪 تسجيل الخروج من النظام"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
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
  </>
);
};
