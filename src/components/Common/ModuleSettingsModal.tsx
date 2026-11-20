import React, { useState } from 'react';
import {
  useModuleSettings,
  BusinessPresetKey,
  PRESET_DEFINITIONS,
  ModuleSettings,
} from '../../context/ModuleSettingsContext';
import {
  Settings,
  X,
  Check,
  Sparkles,
  Layers,
  ShieldCheck,
  CreditCard,
  Building2,
  CheckCircle2,
  Sliders,
  Eye,
  EyeOff,
  RotateCcw,
  Sun,
  Moon,
  Palette,
} from 'lucide-react';

export type SupportedModuleName =
  | 'products'
  | 'inventory'
  | 'invoices'
  | 'pos'
  | 'purchases'
  | 'customers'
  | 'suppliers'
  | 'payments'
  | 'general';

interface ModuleSettingsModalProps {
  moduleName?: SupportedModuleName;
  module?: SupportedModuleName;
  buttonLabel?: string;
  className?: string;
}

const MODULE_TITLES: Record<SupportedModuleName, string> = {
  products: 'إعدادات الأصناف والتسعير والوحدات',
  inventory: 'إعدادات المستودع والجرد والصلاحية',
  invoices: 'إعدادات فواتير المبيعات والضريبة',
  pos: 'إعدادات نقطة البيع (الكاشير السريع)',
  purchases: 'إعدادات فواتير المشتريات والتوريد',
  customers: 'إعدادات العملاء والحدود الائتمانية',
  suppliers: 'إعدادات الموردين والدائنين',
  payments: 'إعدادات الخزينة وسندات القبض والصرف',
  general: 'إعدادات المنظومة الشاملة',
};

export const ModuleSettingsModal: React.FC<ModuleSettingsModalProps> = ({
  moduleName,
  module,
  buttonLabel = '⚙️ إعدادات القسم',
  className = '',
}) => {
  const effectiveModule: SupportedModuleName = module || moduleName || 'general';
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'module' | 'presets' | 'sidebar' | 'appearance'>('module');
  const [savedNotice, setSavedNotice] = useState(false);

  const [currentTheme, setCurrentTheme] = useState<'dark' | 'light'>(() => {
    try {
      return (localStorage.getItem('erp_theme_mode') as 'dark' | 'light') || 'dark';
    } catch {
      return 'dark';
    }
  });

  const handleSelectTheme = (theme: 'dark' | 'light') => {
    setCurrentTheme(theme);
    localStorage.setItem('erp_theme_mode', theme);
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'light') {
      document.documentElement.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
    }
    window.dispatchEvent(new CustomEvent('erp-theme-changed', { detail: { theme } }));
    showSavedNotification();
  };

  const {
    settings,
    updateSettings,
    applyPreset,
    resetSettings,
    isTabHidden,
    toggleTabVisibility,
  } = useModuleSettings();

  const handleToggle = (key: keyof ModuleSettings, val: any) => {
    updateSettings({ [key]: val });
    showSavedNotification();
  };

  const handleApplyPreset = (presetKey: BusinessPresetKey) => {
    applyPreset(presetKey);
    showSavedNotification();
  };

  const showSavedNotification = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  // List of sidebar tabs that can be hidden/shown
  const SIDEBAR_TAB_OPTIONS = [
    { id: 'pos', name: 'الكاشير السريع (POS)' },
    { id: 'invoices', name: 'فواتير المبيعات' },
    { id: 'purchase_invoices', name: 'فواتير المشتريات' },
    { id: 'inventory', name: 'حركة المخزون والجرد' },
    { id: 'payments', name: 'سندات القبض والصرف والمصروفات' },
    { id: 'ledger', name: 'دفتر الأستاذ والقيود' },
    { id: 'reports', name: 'الضرائب والتقارير المالية' },
    { id: 'financial_intelligence', name: 'القوائم المالية والذكاء المحاسبي' },
    { id: 'cashflow_forecast', name: 'التنبؤ الذكي بالسيولة' },
    { id: 'whatsapp', name: 'مركز واتساب التجاري' },
    { id: 'ai', name: 'المساعد المالي الذكي (Gemini)' },
    { id: 'ocr', name: 'المسح الضوئي للفواتير (OCR)' },
    { id: 'real_business', name: 'العمليات التشغيلية والمطابقة' },
    { id: 'customer_success', name: 'خدمة ورضا العملاء' },
    { id: 'users', name: 'المستخدمين وفريق العمل' },
    { id: 'roles', name: 'الصلاحيات والأدوار' },
    { id: 'control_center', name: 'مركز تحكم المنشأة' },
    { id: 'observability', name: 'صحة ومراقبة النظام' },
    { id: 'backups', name: 'النسخ الاحتياطي (B2)' },
    { id: 'swagger', name: 'واجهات برمجة API (Swagger)' },
    { id: 'test', name: 'منصة الاختبارات' },
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`m3-btn-outlined !min-h-[34px] !px-3 !py-1.5 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--md-primary)] ${className}`}
        title="تخصيص قواعد وتشغيل هذا القسم (Module Engine Settings)"
      >
        <Settings className="w-3.5 h-3.5 text-[var(--md-secondary)] animate-spin-hover" />
        <span>{buttonLabel}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 m3-backdrop flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
          <div className="m3-modal-surface w-full max-w-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[var(--md-outline-variant)] bg-[var(--md-surface-container-low)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[var(--md-secondary-container)] border border-[var(--md-secondary)]/30 flex items-center justify-center text-[var(--md-on-secondary-container)]">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--md-on-surface)] flex items-center gap-2 flex-wrap">
                    <span>{MODULE_TITLES[effectiveModule] || 'إعدادات القسم'}</span>
                    <span className="m3-badge m3-badge-success font-mono">
                      LIVE ENGINE
                    </span>
                  </h3>
                  <p className="text-xs text-[var(--md-on-surface-variant)] mt-0.5">
                    البروفايل النشط: <strong className="text-[var(--md-secondary)] font-bold">{PRESET_DEFINITIONS[settings.activePreset]?.name}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {savedNotice && (
                  <span className="m3-badge m3-badge-success">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    تم الحفظ والتطبيق
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-high)] rounded-xl transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--md-primary)]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Navigation Tabs inside modal */}
            <div className="flex items-center gap-2 px-6 pt-3 border-b border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] text-xs font-semibold overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('module')}
                className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--md-primary)] ${
                  activeTab === 'module'
                    ? 'border-[var(--md-primary)] text-[var(--md-primary-text)] font-bold'
                    : 'border-transparent text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>إعدادات هذا القسم</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('presets')}
                className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--md-primary)] ${
                  activeTab === 'presets'
                    ? 'border-[var(--md-secondary)] text-[var(--md-secondary)] font-bold'
                    : 'border-transparent text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="tabular-nums">بروفايل ونشاط المنشأة ({Object.keys(PRESET_DEFINITIONS).length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('sidebar')}
                className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--md-primary)] ${
                  activeTab === 'sidebar'
                    ? 'border-[var(--md-info)] text-[var(--md-info)] font-bold'
                    : 'border-transparent text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>تخصيص القائمة الجانبية</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('appearance')}
                className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--md-primary)] ${
                  activeTab === 'appearance'
                    ? 'border-[var(--md-secondary)] text-[var(--md-secondary)] font-bold'
                    : 'border-transparent text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>المظهر والسمة (Dark / Light)</span>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4 custom-scrollbar text-xs">
              
              {/* TAB 1: MODULE-SPECIFIC TOGGLES */}
              {activeTab === 'module' && (
                <div className="space-y-4">
                  {/* Products & Inventory Settings */}
                  {(effectiveModule === 'products' || effectiveModule === 'inventory' || effectiveModule === 'purchases' || effectiveModule === 'general') && (
                    <div className="m3-card p-4 space-y-3">
                      <h4 className="font-bold text-[var(--md-on-surface)] flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[var(--md-primary-text)]" />
                        <span>قواعد الأصناف والوحدات والمخزون</span>
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <label className="flex items-center justify-between gap-2 p-3 bg-[var(--md-surface-container-low)] rounded-xl border border-[var(--md-outline-variant)] cursor-pointer hover:border-[var(--md-primary)]/50 transition-colors">
                          <div>
                            <span className="font-semibold text-[var(--md-on-surface)] block">تعدد وحدات القياس (UOM)</span>
                            <span className="text-[11px] text-[var(--md-on-surface-variant)]">حبة / باكت / كرتون مع معاملات التحويل</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={settings.enableMultiUnits}
                            onChange={(e) => handleToggle('enableMultiUnits', e.target.checked)}
                            className="w-4 h-4 accent-[var(--md-primary)] rounded cursor-pointer shrink-0"
                          />
                        </label>

                        <label className="flex items-center justify-between gap-2 p-3 bg-[var(--md-surface-container-low)] rounded-xl border border-[var(--md-outline-variant)] cursor-pointer hover:border-[var(--md-primary)]/50 transition-colors">
                          <div>
                            <span className="font-semibold text-[var(--md-on-surface)] block">مستويات الأسعار المتعددة</span>
                            <span className="text-[11px] text-[var(--md-on-surface-variant)]">تجزئة، نصف جملة، جملة، خاص VIP</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={settings.enableTieredPricing}
                            onChange={(e) => handleToggle('enableTieredPricing', e.target.checked)}
                            className="w-4 h-4 accent-[var(--md-primary)] rounded cursor-pointer shrink-0"
                          />
                        </label>

                        <label className="flex items-center justify-between gap-2 p-3 bg-[var(--md-surface-container-low)] rounded-xl border border-[var(--md-outline-variant)] cursor-pointer hover:border-[var(--md-primary)]/50 transition-colors">
                          <div>
                            <span className="font-semibold text-[var(--md-on-surface)] block">تتبع الصلاحية وتواريخ الإنتاج (FEFO)</span>
                            <span className="text-[11px] text-[var(--md-on-surface-variant)]">رقم التشغيلة (Batch) وتنبيه قرب الانتهاء</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={settings.enableExpiryTracking}
                            onChange={(e) => handleToggle('enableExpiryTracking', e.target.checked)}
                            className="w-4 h-4 accent-[var(--md-primary)] rounded cursor-pointer shrink-0"
                          />
                        </label>

                        <label className="flex items-center justify-between gap-2 p-3 bg-[var(--md-surface-container-low)] rounded-xl border border-[var(--md-outline-variant)] cursor-pointer hover:border-[var(--md-primary)]/50 transition-colors">
                          <div>
                            <span className="font-semibold text-[var(--md-on-surface)] block">سيريال وضمان البطاريات والأجهزة</span>
                            <span className="text-[11px] text-[var(--md-on-surface-variant)]">شهادة ضمان وسيريال نمبر ورجيع بطاريات</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={settings.enableSerialAndWarranty}
                            onChange={(e) => handleToggle('enableSerialAndWarranty', e.target.checked)}
                            className="w-4 h-4 accent-[var(--md-primary)] rounded cursor-pointer shrink-0"
                          />
                        </label>

                        <label className="flex items-center justify-between gap-2 p-3 bg-[var(--md-surface-container-low)] rounded-xl border border-[var(--md-outline-variant)] cursor-pointer hover:border-[var(--md-primary)]/50 transition-colors">
                          <div>
                            <span className="font-semibold text-[var(--md-on-surface)] block">مواصفات الزيوت والقطع (Viscosity)</span>
                            <span className="text-[11px] text-[var(--md-on-surface-variant)]">درجة اللزوجة 20W-50، سعة اللتر، كود OEM</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={settings.enableOilViscositySpec}
                            onChange={(e) => handleToggle('enableOilViscositySpec', e.target.checked)}
                            className="w-4 h-4 accent-[var(--md-primary)] rounded cursor-pointer shrink-0"
                          />
                        </label>

                        <div className="p-3 bg-[var(--md-surface-container-low)] rounded-xl border border-[var(--md-outline-variant)] flex items-center justify-between gap-2">
                          <span className="font-semibold text-[var(--md-on-surface)]">حد التنبيه الافتراضي للنواقص:</span>
                          <input
                            type="number"
                            value={settings.lowStockDefaultThreshold}
                            onChange={(e) => handleToggle('lowStockDefaultThreshold', Number(e.target.value) || 5)}
                            className="m3-input !h-8 !w-20 !px-2 font-mono tabular-nums text-center font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* POS & Invoices Settings */}
                  {(effectiveModule === 'pos' || effectiveModule === 'invoices' || effectiveModule === 'purchases' || effectiveModule === 'general') && (
                    <div className="m3-card p-4 space-y-3">
                      <h4 className="font-bold text-[var(--md-on-surface)] flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-[var(--md-secondary)]" />
                        <span>قواعد الكاشير والفواتير والضريبة</span>
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <label className="flex items-center justify-between gap-2 p-3 bg-[var(--md-surface-container-low)] rounded-xl border border-[var(--md-outline-variant)] cursor-pointer hover:border-[var(--md-primary)]/50 transition-colors">
                          <div>
                            <span className="font-semibold text-[var(--md-on-surface)] block">السماح بالبيع بالسالب (Negative Stock)</span>
                            <span className="text-[11px] text-[var(--md-on-surface-variant)]">إتمام البيع حتى لو كان الرصيد غير متوفر</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={settings.allowNegativeStockSale}
                            onChange={(e) => handleToggle('allowNegativeStockSale', e.target.checked)}
                            className="w-4 h-4 accent-[var(--md-primary)] rounded cursor-pointer shrink-0"
                          />
                        </label>

                        <label className="flex items-center justify-between gap-2 p-3 bg-[var(--md-surface-container-low)] rounded-xl border border-[var(--md-outline-variant)] cursor-pointer hover:border-[var(--md-primary)]/50 transition-colors">
                          <div>
                            <span className="font-semibold text-[var(--md-on-surface)] block">تمكين الكاشير من تعديل السعر</span>
                            <span className="text-[11px] text-[var(--md-on-surface-variant)]">تعديل سعر الوحدة يدوياً أثناء البيع</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={settings.allowCashierPriceEdit}
                            onChange={(e) => handleToggle('allowCashierPriceEdit', e.target.checked)}
                            className="w-4 h-4 accent-[var(--md-primary)] rounded cursor-pointer shrink-0"
                          />
                        </label>

                        <label className="flex items-center justify-between gap-2 p-3 bg-[var(--md-surface-container-low)] rounded-xl border border-[var(--md-outline-variant)] cursor-pointer hover:border-[var(--md-primary)]/50 transition-colors">
                          <div>
                            <span className="font-semibold text-[var(--md-on-surface)] block">خصم استبدال بطارية قديمة (رجيع)</span>
                            <span className="text-[11px] text-[var(--md-on-surface-variant)]">بند خصم فوري مالي عند شراء بطارية جديدة</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={settings.enableBatteryScrapTradeIn}
                            onChange={(e) => handleToggle('enableBatteryScrapTradeIn', e.target.checked)}
                            className="w-4 h-4 accent-[var(--md-primary)] rounded cursor-pointer shrink-0"
                          />
                        </label>

                        <label className="flex items-center justify-between gap-2 p-3 bg-[var(--md-surface-container-low)] rounded-xl border border-[var(--md-outline-variant)] cursor-pointer hover:border-[var(--md-primary)]/50 transition-colors">
                          <div>
                            <span className="font-semibold text-[var(--md-on-surface)] block">طباعة السيريال والضمان بالفاتورة</span>
                            <span className="text-[11px] text-[var(--md-on-surface-variant)]">إظهار مدة وتاريخ انتهاء الضمان رسمي بالطباعة</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={settings.printWarrantyOnInvoice}
                            onChange={(e) => handleToggle('printWarrantyOnInvoice', e.target.checked)}
                            className="w-4 h-4 accent-[var(--md-primary)] rounded cursor-pointer shrink-0"
                          />
                        </label>

                        <div className="p-3 bg-[var(--md-surface-container-low)] rounded-xl border border-[var(--md-outline-variant)] flex items-center justify-between gap-2">
                          <span className="font-semibold text-[var(--md-on-surface)]">نمط الطباعة الافتراضي:</span>
                          <select
                            value={settings.defaultPrintFormat}
                            onChange={(e) => handleToggle('defaultPrintFormat', e.target.value)}
                            className="m3-select !h-8 !w-auto !px-2.5 text-xs font-bold"
                          >
                            <option value="80mm">إيصال حراري (80mm POS)</option>
                            <option value="A4">فاتورة ضريبية كاملة (A4)</option>
                          </select>
                        </div>

                        <label className="flex items-center justify-between gap-2 p-3 bg-[var(--md-surface-container-low)] rounded-xl border border-[var(--md-outline-variant)] cursor-pointer hover:border-[var(--md-primary)]/50 transition-colors">
                          <div>
                            <span className="font-semibold text-[var(--md-on-surface)] block">فرض الالتزام بالحد الائتماني</span>
                            <span className="text-[11px] text-[var(--md-on-surface-variant)]">منع البيع الآجل عند تجاوز سقف الديون</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={settings.enforceCreditLimit}
                            onChange={(e) => handleToggle('enforceCreditLimit', e.target.checked)}
                            className="w-4 h-4 accent-[var(--md-primary)] rounded cursor-pointer shrink-0"
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Customers, Suppliers & Payments Settings */}
                  {(effectiveModule === 'customers' || effectiveModule === 'suppliers' || effectiveModule === 'payments' || effectiveModule === 'general') && (
                    <div className="m3-card p-4 space-y-3">
                      <h4 className="font-bold text-[var(--md-on-surface)] flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[var(--md-info)]" />
                        <span>قواعد العملاء والموردين والسندات</span>
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div className="p-3 bg-[var(--md-surface-container-low)] rounded-xl border border-[var(--md-outline-variant)] flex items-center justify-between gap-2">
                          <span className="font-semibold text-[var(--md-on-surface)]">مستوى السعر الافتراضي للعميل:</span>
                          <select
                            value={settings.defaultCustomerPriceTier}
                            onChange={(e) => handleToggle('defaultCustomerPriceTier', e.target.value)}
                            className="m3-select !h-8 !w-auto !px-2.5 text-xs font-bold"
                          >
                            <option value="retail">سعر التجزئة (Retail)</option>
                            <option value="half_wholesale">نصف جملة (Half-Wholesale)</option>
                            <option value="wholesale">سعر جملة (Wholesale)</option>
                            <option value="vip">سعر خاص (VIP)</option>
                          </select>
                        </div>

                        <label className="flex items-center justify-between gap-2 p-3 bg-[var(--md-surface-container-low)] rounded-xl border border-[var(--md-outline-variant)] cursor-pointer hover:border-[var(--md-primary)]/50 transition-colors">
                          <div>
                            <span className="font-semibold text-[var(--md-on-surface)] block">إشعار فوري عبر واتساب بعد السند</span>
                            <span className="text-[11px] text-[var(--md-on-surface-variant)]">فتح رسالة التحصيل/الصرف الرسمية للعميل أو المورد</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={settings.autoWhatsAppAfterVoucher}
                            onChange={(e) => handleToggle('autoWhatsAppAfterVoucher', e.target.checked)}
                            className="w-4 h-4 accent-[var(--md-primary)] rounded cursor-pointer shrink-0"
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: BUSINESS PROFILE PRESETS */}
              {activeTab === 'presets' && (
                <div className="space-y-3">
                  <p className="text-[var(--md-on-surface-variant)]">
                    اختر نشاط منشأتك التجاري ليقوم النظام تلقائياً بتفعيل وتنسيق كافة الحقول والوحدات المناسبة لنشاطك:
                  </p>

                  <div className="grid grid-cols-1 gap-2.5">
                    {(
                      [
                        'multi_activity',
                        'grocery_only',
                        'fuel_station_only',
                        'tires_batteries_only',
                        'autoparts_oils_only',
                        'wholesale_retail_general',
                      ] as BusinessPresetKey[]
                    ).map((key) => {
                      const preset = PRESET_DEFINITIONS[key];
                      const isActive = settings.activePreset === key;

                      return (
                        <div
                          key={key}
                          onClick={() => handleApplyPreset(key)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isActive
                              ? 'bg-[var(--md-secondary-container)] border-[var(--md-secondary)] text-[var(--md-on-secondary-container)]'
                              : 'bg-[var(--md-surface-container-low)] border-[var(--md-outline-variant)] hover:border-[var(--md-outline)] text-[var(--md-on-surface)]'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-[var(--md-on-surface)]">{preset.name}</span>
                              <span className={`m3-badge ${isActive ? 'm3-badge-secondary' : 'm3-badge-primary'}`}>
                                {preset.badge}
                              </span>
                            </div>
                            <p className="text-xs text-[var(--md-on-surface-variant)]">{preset.description}</p>
                          </div>

                          <div className={`w-6 h-6 rounded-full flex items-center justify-center border shrink-0 ${
                            isActive
                              ? 'bg-[var(--md-primary)] border-[var(--md-primary)] text-[var(--md-on-primary)]'
                              : 'border-[var(--md-outline)]'
                          }`}>
                            {isActive && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: SIDEBAR VISIBILITY */}
              {activeTab === 'sidebar' && (
                <div className="space-y-3">
                  <p className="text-[var(--md-on-surface-variant)]">
                    يمكنك إخفاء الشاشات أو الأدوات غير المستخدمة لتبسيط القائمة الجانبية للشاشات الرئيسية:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {SIDEBAR_TAB_OPTIONS.map((tab) => {
                      const hidden = isTabHidden(tab.id);
                      return (
                        <div
                          key={tab.id}
                          onClick={() => toggleTabVisibility(tab.id)}
                          className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                            hidden
                              ? 'bg-[var(--md-surface-container-lowest)] border-[var(--md-outline-variant)] text-[var(--md-on-surface-variant)] opacity-75'
                              : 'bg-[var(--md-surface-container-low)] border-[var(--md-outline-variant)] text-[var(--md-on-surface)] hover:border-[var(--md-primary)]/50'
                          }`}
                        >
                          <span className="font-medium">{tab.name}</span>
                          <span className={`flex items-center gap-1 text-[11px] font-bold ${
                            hidden ? 'text-[var(--md-on-surface-variant)]' : 'text-[var(--md-primary-text)]'
                          }`}>
                            {hidden ? (
                              <>
                                <EyeOff className="w-3.5 h-3.5" />
                                <span>مخفية</span>
                              </>
                            ) : (
                              <>
                                <Eye className="w-3.5 h-3.5" />
                                <span>ظاهرة</span>
                              </>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 4: APPEARANCE & THEME (DARK / LIGHT) */}
              {activeTab === 'appearance' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-bold text-[var(--md-on-surface)] text-sm mb-1">سمة ومظهر المنظومة (Theme Engine)</h4>
                    <p className="text-[var(--md-on-surface-variant)] text-xs">
                      اختر نمط الإضاءة والألوان المفضل للعمل على النظام. التغيير فوري ويبقى محفوظاً في جهازك:
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Dark Mode Card */}
                    <div
                      onClick={() => handleSelectTheme('dark')}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                        currentTheme === 'dark'
                          ? 'bg-[var(--md-primary-container)]/35 border-[var(--md-primary)]'
                          : 'bg-[var(--md-surface-container-low)] border-[var(--md-outline-variant)] hover:border-[var(--md-outline)]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-[var(--md-secondary-container)] flex items-center justify-center text-[var(--md-on-secondary-container)]">
                              <Moon className="w-4 h-4" />
                            </div>
                            <span className="font-bold text-[var(--md-on-surface)] text-sm">الوضع الليلي الكلاسيكي</span>
                          </div>
                          {currentTheme === 'dark' && (
                            <span className="w-6 h-6 rounded-full bg-[var(--md-primary)] text-[var(--md-on-primary)] flex items-center justify-center">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--md-on-surface-variant)] leading-relaxed">
                          الوضع الافتراضي الأصلي للنظام بدرجات الرمادي الداكن والأسود المريح للعين في بيئات الإضاءة الخافتة ونقاط البيع السريعة.
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[var(--md-outline-variant)] flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-[#0D0D0D] border border-[var(--md-outline)]" />
                        <span className="w-3 h-3 rounded-full bg-[#1B2220] border border-[var(--md-outline)]" />
                        <span className="w-3 h-3 rounded-full bg-[#14B8A6]" />
                        <span className="w-3 h-3 rounded-full bg-[#D4AF37]" />
                        <span className="text-[10px] text-[var(--md-on-surface-variant)] font-mono mr-auto">Dark #0D0D0D</span>
                      </div>
                    </div>

                    {/* Royal Emerald & Gold Light Mode Card */}
                    <div
                      onClick={() => handleSelectTheme('light')}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                        currentTheme === 'light'
                          ? 'bg-[var(--md-primary-container)]/35 border-[var(--md-primary)]'
                          : 'bg-[var(--md-surface-container-low)] border-[var(--md-outline-variant)] hover:border-[var(--md-outline)]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-[var(--md-secondary-container)] flex items-center justify-center text-[var(--md-on-secondary-container)]">
                              <Sun className="w-4 h-4" />
                            </div>
                            <span className="font-bold text-[var(--md-on-surface)] text-sm">الوضع الفاتح الملكي (Royal Emerald)</span>
                          </div>
                          {currentTheme === 'light' && (
                            <span className="w-6 h-6 rounded-full bg-[var(--md-primary)] text-[var(--md-on-primary)] flex items-center justify-center">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--md-on-surface-variant)] leading-relaxed">
                          مظهر فائق النقاء بخلفيات مرمرية مريحة وتباين عالي بنمط الزمرد الأخضر والذهب الملكي للطباعة والمكاتب النهارية.
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[var(--md-outline-variant)] flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-[#F4F7F6] border border-[var(--md-outline)]" />
                        <span className="w-3 h-3 rounded-full bg-[#FFFFFF] border border-[var(--md-outline)]" />
                        <span className="w-3 h-3 rounded-full bg-[#0F766E]" />
                        <span className="w-3 h-3 rounded-full bg-[#C9A227]" />
                        <span className="text-[10px] text-[var(--md-on-surface-variant)] font-mono mr-auto">Light #0F766E</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 border-t border-[var(--md-outline-variant)] bg-[var(--md-surface-container-low)] flex items-center justify-between">
              <button
                type="button"
                onClick={resetSettings}
                className="m3-btn-text !min-h-[34px] !px-2.5 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--md-primary)]"
                title="استعادة الإعدادات الافتراضية الشاملة"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>استعادة الافتراضي</span>
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="m3-btn-primary !min-h-[36px] !px-5 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--md-primary)]"
              >
                تطبيق وإغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
