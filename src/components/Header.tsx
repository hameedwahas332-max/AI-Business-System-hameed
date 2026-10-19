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
} from 'lucide-react';
import { TabType } from './Sidebar';

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

  const colorThemes: { id: AccentColor; name: string; bgClass: string; hex: string }[] = [
    { id: 'indigo', name: 'إنديجو ملكي', bgClass: 'bg-indigo-600', hex: '#6366f1' },
    { id: 'sapphire', name: 'ياقوت أزرق', bgClass: 'bg-blue-600', hex: '#2563eb' },
    { id: 'emerald', name: 'زمرد محاسبي', bgClass: 'bg-emerald-600', hex: '#10b981' },
    { id: 'amber', name: 'عنبر ذهبي', bgClass: 'bg-amber-600', hex: '#f59e0b' },
  ];

  return (
    <header className="h-16 bg-slate-900/85 backdrop-blur-md border-b border-slate-800 px-6 flex items-center justify-between flex-shrink-0 z-10 select-none">
      {/* Title / Current Tab Indicator */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-slate-400">نظام ERP السحابي المعتمد</span>
        </div>
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

        {/* User Account / Profile */}
        <button
          onClick={onOpenAuth}
          className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl transition-all text-xs"
        >
          <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-400">
            م.ع
          </div>
          <div className="text-right hidden sm:block">
            <div className="font-semibold text-slate-200 leading-tight">المدير العام</div>
            <div className="text-[10px] text-emerald-400 font-mono">سحابي • متصل</div>
          </div>
        </button>
      </div>
    </header>
  );
};
