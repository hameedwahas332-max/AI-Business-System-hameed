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
  const [activeTab, setActiveTab] = useState<'module' | 'presets' | 'sidebar'>('module');
  const [savedNotice, setSavedNotice] = useState(false);

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
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-700/80 shadow-sm transition-all cursor-pointer ${className}`}
        title="تخصيص قواعد وتشغيل هذا القسم (Module Engine Settings)"
      >
        <Settings className="w-3.5 h-3.5 text-amber-400 animate-spin-hover" />
        <span>{buttonLabel}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto" dir="rtl">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{MODULE_TITLES[effectiveModule] || 'إعدادات القسم'}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                      LIVE ENGINE
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    البروفايل النشط: <strong className="text-amber-300 font-bold">{PRESET_DEFINITIONS[settings.activePreset]?.name}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {savedNotice && (
                  <span className="text-[11px] text-emerald-400 flex items-center gap-1 bg-emerald-950/60 border border-emerald-800 px-2 py-1 rounded-lg">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    تم الحفظ والتطبيق
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Navigation Tabs inside modal */}
            <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800 bg-slate-900/40 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('module')}
                className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === 'module'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>إعدادات هذا القسم</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('presets')}
                className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === 'presets'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>بروفايل ونشاط المنشأة ({Object.keys(PRESET_DEFINITIONS).length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('sidebar')}
                className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === 'sidebar'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>تخصيص القائمة الجانبية</span>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4 custom-scrollbar text-xs">
              
              {/* TAB 1: MODULE-SPECIFIC TOGGLES */}
              {activeTab === 'module' && (
                <div className="space-y-4">
                  {/* Products & Inventory Settings */}
                  {(effectiveModule === 'products' || effectiveModule === 'inventory' || effectiveModule === 'purchases' || effectiveModule === 'general') && (
                    <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3">
                      <h4 className="font-bold text-slate-200 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-emerald-400" />
                        <span>قواعد الأصناف والوحدات والمخزون</span>
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <label className="flex items-center justify-between p-2.5 bg-slate-900 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700">
                          <div>
                            <span className="font-semibold text-white block">تعدد وحدات القياس (UOM)</span>
                            <span className="text-[11px] text-slate-400">حبة / باكت / كرتون مع معاملات التحويل</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={settings.enableMultiUnits}
                            onChange={(e) => handleToggle('enableMultiUnits', e.target.checked)}
                            className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                          />
                        </label>

                        <label className="flex items-center justify-between p-2.5 bg-slate-900 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700">
                          <div>
                            <span className="font-semibold text-white block">مستويات الأسعار المتعددة</span>
                            <span className="text-[11px] text-slate-400">تجزئة، نصف جملة، جملة، خاص VIP</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={settings.enableTieredPricing}
                            onChange={(e) => handleToggle('enableTieredPricing', e.target.checked)}
                            className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                          />
                        </label>

                        <label className="flex items-center justify-between p-2.5 bg-slate-900 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700">
                          <div>
                            <span className="font-semibold text-white block">تتبع الصلاحية وتواريخ الإنتاج (FEFO)</span>
                            <span className="text-[11px] text-slate-400">رقم التشغيلة (Batch) وتنبيه قرب الانتهاء</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={settings.enableExpiryTracking}
                            onChange={(e) => handleToggle('enableExpiryTracking', e.target.checked)}
                            className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                          />
                        </label>

                        <label className="flex items-center justify-between p-2.5 bg-slate-900 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700">
                          <div>
                            <span className="font-semibold text-white block">سيريال وضمان البطاريات والأجهزة</span>
                            <span className="text-[11px] text-slate-400">شهادة ضمان وسيريال نمبر ورجيع بطاريات</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={settings.enableSerialAndWarranty}
                            onChange={(e) => handleToggle('enableSerialAndWarranty', e.target.checked)}
                            className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                          />
                        </label>

                        <label className="flex items-center justify-between p-2.5 bg-slate-900 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700">
                          <div>
                            <span className="font-semibold text-white block">مواصفات الزيوت والقطع (Viscosity)</span>
                            <span className="text-[11px] text-slate-400">درجة اللزوجة 20W-50، سعة اللتر، كود OEM</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={settings.enableOilViscositySpec}
                            onChange={(e) => handleToggle('enableOilViscositySpec', e.target.checked)}
                            className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                          />
                        </label>

                        <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                          <span className="font-semibold text-slate-300">حد التنبيه الافتراضي للنواقص:</span>
                          <input
                            type="number"
                            value={settings.lowStockDefaultThreshold}
                            onChange={(e) => handleToggle('lowStockDefaultThreshold', Number(e.target.value) || 5)}
                            className="w-20 px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-center font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* POS & Invoices Settings */}
                  {(effectiveModule === 'pos' || effectiveModule === 'invoices' || effectiveModule === 'purchases' || effectiveModule === 'general') && (
                    <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3">
                      <h4 className="font-bold text-slate-200 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-amber-400" />
                        <span>قواعد الكاشير والفواتير والضريبة</span>
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <label className="flex items-center justify-between p-2.5 bg-slate-900 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700">
                          <div>
                            <span className="font-semibold text-white block">السماح بالبيع بالسالب (Negative Stock)</span>
                            <span className="text-[11px] text-slate-400">إتمام البيع حتى لو كان الرصيد غير متوفر</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={settings.allowNegativeStockSale}
                            onChange={(e) => handleToggle('allowNegativeStockSale', e.target.checked)}
                            className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                          />
                        </label>

                        <label className="flex items-center justify-between p-2.5 bg-slate-900 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700">
                          <div>
                            <span className="font-semibold text-white block">تمكين الكاشير من تعديل السعر</span>
                            <span className="text-[11px] text-slate-400">تعديل سعر الوحدة يدوياً أثناء البيع</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={settings.allowCashierPriceEdit}
                            onChange={(e) => handleToggle('allowCashierPriceEdit', e.target.checked)}
                            className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                          />
                        </label>

                        <label className="flex items-center justify-between p-2.5 bg-slate-900 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700">
                          <div>
                            <span className="font-semibold text-white block">خصم استبدال بطارية قديمة (رجيع)</span>
                            <span className="text-[11px] text-slate-400">بند خصم فوري مالي عند شراء بطارية جديدة</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={settings.enableBatteryScrapTradeIn}
                            onChange={(e) => handleToggle('enableBatteryScrapTradeIn', e.target.checked)}
                            className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                          />
                        </label>

                        <label className="flex items-center justify-between p-2.5 bg-slate-900 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700">
                          <div>
                            <span className="font-semibold text-white block">طباعة السيريال والضمان بالفاتورة</span>
                            <span className="text-[11px] text-slate-400">إظهار مدة وتاريخ انتهاء الضمان رسمي بالطباعة</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={settings.printWarrantyOnInvoice}
                            onChange={(e) => handleToggle('printWarrantyOnInvoice', e.target.checked)}
                            className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                          />
                        </label>

                        <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                          <span className="font-semibold text-slate-300">نمط الطباعة الافتراضي:</span>
                          <select
                            value={settings.defaultPrintFormat}
                            onChange={(e) => handleToggle('defaultPrintFormat', e.target.value)}
                            className="px-3 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white font-bold"
                          >
                            <option value="80mm">إيصال حراري (80mm POS)</option>
                            <option value="A4">فاتورة ضريبية كاملة (A4)</option>
                          </select>
                        </div>

                        <label className="flex items-center justify-between p-2.5 bg-slate-900 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700">
                          <div>
                            <span className="font-semibold text-white block">فرض الالتزام بالحد الائتماني</span>
                            <span className="text-[11px] text-slate-400">منع البيع الآجل عند تجاوز سقف الديون</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={settings.enforceCreditLimit}
                            onChange={(e) => handleToggle('enforceCreditLimit', e.target.checked)}
                            className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Customers, Suppliers & Payments Settings */}
                  {(effectiveModule === 'customers' || effectiveModule === 'suppliers' || effectiveModule === 'payments' || effectiveModule === 'general') && (
                    <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3">
                      <h4 className="font-bold text-slate-200 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-sky-400" />
                        <span>قواعد العملاء والموردين والسندات</span>
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                          <span className="font-semibold text-slate-300">مستوى السعر الافتراضي للعميل:</span>
                          <select
                            value={settings.defaultCustomerPriceTier}
                            onChange={(e) => handleToggle('defaultCustomerPriceTier', e.target.value)}
                            className="px-3 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white font-bold"
                          >
                            <option value="retail">سعر التجزئة (Retail)</option>
                            <option value="half_wholesale">نصف جملة (Half-Wholesale)</option>
                            <option value="wholesale">سعر جملة (Wholesale)</option>
                            <option value="vip">سعر خاص (VIP)</option>
                          </select>
                        </div>

                        <label className="flex items-center justify-between p-2.5 bg-slate-900 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700">
                          <div>
                            <span className="font-semibold text-white block">إشعار فوري عبر واتساب بعد السند</span>
                            <span className="text-[11px] text-slate-400">فتح رسالة التحصيل/الصرف الرسمية للعميل أو المورد</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={settings.autoWhatsAppAfterVoucher}
                            onChange={(e) => handleToggle('autoWhatsAppAfterVoucher', e.target.checked)}
                            className="w-4 h-4 accent-sky-500 rounded cursor-pointer"
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
                  <p className="text-slate-400">
                    اختر نشاط منشأتك التجاري ليقوم النظام تلقائياً بتفعيل وتنسيق كافة الحقول والوحدات المناسبة لنشاطك:
                  </p>

                  <div className="grid grid-cols-1 gap-2.5">
                    {(Object.keys(PRESET_DEFINITIONS) as BusinessPresetKey[]).map((key) => {
                      const preset = PRESET_DEFINITIONS[key];
                      const isActive = settings.activePreset === key;

                      return (
                        <div
                          key={key}
                          onClick={() => handleApplyPreset(key)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                            isActive
                              ? 'bg-amber-500/10 border-amber-500 text-white shadow-lg shadow-amber-950/30'
                              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-white">{preset.name}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                isActive ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                              }`}>
                                {preset.badge}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400">{preset.description}</p>
                          </div>

                          <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                            isActive ? 'bg-amber-500 border-amber-400 text-slate-950' : 'border-slate-700'
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
                  <p className="text-slate-400">
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
                              ? 'bg-slate-950/40 border-slate-800/80 text-slate-500'
                              : 'bg-slate-950 border-slate-800 text-slate-200 hover:border-slate-700'
                          }`}
                        >
                          <span className="font-medium">{tab.name}</span>
                          <span className={`flex items-center gap-1 text-[11px] font-bold ${
                            hidden ? 'text-slate-500' : 'text-emerald-400'
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

            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
              <button
                type="button"
                onClick={resetSettings}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                title="استعادة الإعدادات الافتراضية الشاملة"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>استعادة الافتراضي</span>
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-950/50 cursor-pointer"
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
