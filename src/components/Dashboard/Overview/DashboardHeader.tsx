import React, { useState, useEffect } from 'react';
import { TabType } from '../../Sidebar';
import { Company, User } from '../../../types';
import {
  Sparkles,
  RefreshCw,
  ShoppingCart,
  FileText,
  CreditCard,
  ShieldCheck,
  Database,
  Coins,
  ArrowRightLeft,
  CheckCircle2,
  PackageCheck,
  Layers,
  MessageSquare,
  Wrench,
  TrendingUp,
} from 'lucide-react';
import {
  getStoredExchangeRates,
  EVENT_EXCHANGE_RATES_CHANGED,
  ExchangeRateConfig,
} from '../../../lib/exchangeRates';
import { DailyExchangeRateModal } from '../../Common/DailyExchangeRateModal';
import { useModuleSettings } from '../../../context/ModuleSettingsContext';

interface DashboardHeaderProps {
  user: User | null;
  company: Company | null;
  selectedPeriod?: string;
  setSelectedPeriod?: (p: string) => void;
  isLoading?: boolean;
  loading?: boolean;
  currency?: string;
  onRefresh: () => void;
  onNavigate?: (tab: TabType, extra?: any) => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  user,
  company,
  selectedPeriod = 'month',
  setSelectedPeriod = (_p: string) => {},
  isLoading = false,
  loading,
  currency = 'SAR',
  onRefresh,
  onNavigate,
}) => {
  const isActionLoading = isLoading || Boolean(loading);
  const [isExchangeModalOpen, setIsExchangeModalOpen] = useState(false);
  const [ratesConfig, setRatesConfig] = useState<ExchangeRateConfig>(getStoredExchangeRates);
  const { activePreset, currentPresetInfo } = useModuleSettings();

  useEffect(() => {
    const handleRatesChanged = () => {
      setRatesConfig(getStoredExchangeRates());
    };
    window.addEventListener(EVENT_EXCHANGE_RATES_CHANGED, handleRatesChanged);
    return () => {
      window.removeEventListener(EVENT_EXCHANGE_RATES_CHANGED, handleRatesChanged);
    };
  }, []);

  const sarRate = ratesConfig.rates?.SAR?.accountingRate || 535;
  const usdRate = ratesConfig.rates?.USD?.accountingRate || 2050;

  const periods = [
    { id: 'today', label: 'اليوم' },
    { id: 'week', label: 'هذا الأسبوع' },
    { id: 'month', label: 'هذا الشهر' },
    { id: 'year', label: 'السنة المالية' },
  ];

  const quickActions = [
    {
      id: 'pos',
      label: 'نقطة البيع (POS)',
      sublabel: 'الكاشير السريع',
      icon: ShoppingCart,
      iconTone: 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)]',
      badge: 'سريع',
      tab: 'pos' as TabType,
    },
    {
      id: 'invoices',
      label: 'فاتورة مبيعات',
      sublabel: 'إصدار ضريبي',
      icon: FileText,
      iconTone: 'bg-[var(--md-success-container)] text-[var(--md-on-success-container)]',
      badge: 'ZATCA',
      tab: 'invoices' as TabType,
    },
    {
      id: 'payments',
      label: 'سند قبض / صرف',
      sublabel: 'توريد وصرف الخزينة',
      icon: CreditCard,
      iconTone: 'bg-[var(--md-info-container)] text-[var(--md-on-info-container)]',
      tab: 'payments' as TabType,
    },
    {
      id: 'warranty',
      label: 'فحص ضمان بطارية',
      sublabel: 'سيريال ومطابقة باركود',
      icon: ShieldCheck,
      iconTone: 'bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)]',
      badge: 'ضمان',
      tab: 'real_business' as TabType,
    },
    {
      id: 'transfer',
      label: 'تحويل مخزني',
      sublabel: 'بين الـ 4 مستودعات',
      icon: Layers,
      iconTone: 'bg-[var(--md-surface-container-high)] text-[var(--md-on-surface)]',
      tab: 'inventory' as TabType,
    },
    {
      id: 'whatsapp',
      label: 'تذكير واتساب',
      sublabel: 'مطالبات مالية آلية',
      icon: MessageSquare,
      iconTone: 'bg-[var(--md-success-container)] text-[var(--md-on-success-container)]',
      badge: 'آلي',
      tab: 'whatsapp' as TabType,
    },
  ];

  return (
    <>
      <div className="m3-card relative overflow-hidden p-5 sm:p-6 transition-colors duration-200">
        {/* Live Multi-Currency Ticker & Business Preset Bar */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 mb-4 p-2.5 rounded-xl bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)]">
          {/* Ticker Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-[var(--md-surface-container-low)] text-[var(--md-on-surface)] font-bold flex items-center gap-1.5 border border-[var(--md-outline-variant)]">
              <Coins className="w-3.5 h-3.5 text-[var(--md-secondary)]" />
              <span>أسعار الصرف اليومية:</span>
            </span>

            <span className="m3-badge m3-badge-primary font-mono px-2.5 py-1 text-xs">
              <span>🇸🇦 1 SAR =</span>
              <span className="font-extrabold">{sarRate}</span>
              <span>YER</span>
            </span>

            <span className="m3-badge m3-badge-info font-mono px-2.5 py-1 text-xs">
              <span>🇺🇸 1 USD =</span>
              <span className="font-extrabold">{usdRate}</span>
              <span>YER</span>
            </span>

            <button
              onClick={() => setIsExchangeModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-[var(--md-secondary-container)] hover:opacity-90 text-[var(--md-on-secondary-container)] border border-[color-mix(in_srgb,var(--md-secondary)_35%,transparent)] text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
              title="تعديل وتثبيت أسعار الصرف لليوم"
            >
              <ArrowRightLeft className="w-3 h-3" />
              <span>تعديل الصرف</span>
            </button>
          </div>

          {/* Active Business Profile Badge */}
          <div className="flex items-center gap-2">
            <span className="m3-badge m3-badge-primary px-2.5 py-1 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                {currentPresetInfo?.name || 'نشاط شامل: غذائية + بطاريات + زيوت'}
              </span>
            </span>
            <span className="hidden sm:inline-flex m3-badge font-mono text-[10px]">
              {currentPresetInfo?.badge || 'شامل • افتراضي'}
            </span>
          </div>
        </div>

        {/* Top Meta Bar */}
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-[var(--md-outline-variant)] pb-5">
          {/* Left / Title section */}
          <div className="space-y-1.5 text-right">
            <div className="flex flex-wrap items-center gap-2">
              <span className="m3-badge m3-badge-primary px-2.5 py-1 text-xs">
                <Sparkles className="w-3.5 h-3.5 text-[var(--md-secondary)]" />
                <span>مركز القيادة والذكاء المالي التنفيذي</span>
              </span>

              {/* Live Infrastructure Badges */}
              <div className="hidden sm:flex items-center gap-2">
                <span className="m3-badge text-[11px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--md-success)]" />
                  <span>PostgreSQL سحابية</span>
                </span>
                <span className="m3-badge text-[11px] font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-[var(--md-primary-text)]" />
                  <span>عزل المنشأة نشط</span>
                </span>
                <span className="m3-badge text-[11px] font-semibold font-mono">
                  <Database className="w-3.5 h-3.5 text-[var(--md-info)]" />
                  <span>B2 DR محمي</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <h1 className="text-xl sm:text-2xl font-black text-[var(--md-on-surface)] tracking-tight">
                {company?.name || 'المؤسسة التجارية'}
              </h1>
              <span className="m3-badge m3-badge-primary font-mono text-xs">
                {currency}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-[var(--md-on-surface-variant)]">
              مرحباً بك، <span className="font-bold text-[var(--md-on-surface)]">{user?.full_name || user?.username || 'المدير العام'}</span> • المراقبة اللحظية للسيولة والمبيعات والذمم والمخزون
            </p>
          </div>

          {/* Right / Controls: Period Filters + Refresh */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
            <div className="flex items-center bg-[var(--md-surface-container)] p-1 rounded-xl border border-[var(--md-outline-variant)]">
              {periods.map((p) => {
                const active = selectedPeriod === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPeriod(p.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      active
                        ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)] shadow-sm'
                        : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            <button
              onClick={onRefresh}
              disabled={isActionLoading}
              className="m3-btn-outlined text-xs"
              title="تحديث البيانات الفوري"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[var(--md-primary-text)] ${isActionLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">تحديث</span>
            </button>
          </div>
        </div>

        {/* 1-Click Executive Action Bar */}
        <div className="relative z-10 pt-4">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-[var(--md-on-surface-variant)]">
              شريط الإجراءات والعمليات السريعة (1-Click Actions)
            </span>
            <span className="text-[11px] text-[var(--md-on-surface-variant)] font-medium">الوصول المباشر لكافة الوحدات التشغيلية</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => onNavigate && onNavigate(action.tab)}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[var(--md-surface-container)] hover:bg-[var(--md-surface-container-high)] border border-[var(--md-outline-variant)] hover:border-[var(--md-primary)] transition-all text-right group cursor-pointer"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${action.iconTone}`}>
                    <Icon className="w-4 h-4 transition-transform group-hover:scale-105" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-[var(--md-on-surface)] truncate">{action.label}</span>
                      {action.badge && (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] font-mono shrink-0">
                          {action.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-[var(--md-on-surface-variant)] block truncate">{action.sublabel}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Multi-Currency Daily Exchange Rate Modal */}
      <DailyExchangeRateModal
        isOpen={isExchangeModalOpen}
        onClose={() => setIsExchangeModalOpen(false)}
      />
    </>
  );
};
