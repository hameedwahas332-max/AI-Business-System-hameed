import React, { createContext, useContext, useState, useEffect } from 'react';

export type BusinessPresetKey =
  | 'multi_activity'
  | 'grocery_only'
  | 'food_supermarket'
  | 'fuel_station_only'
  | 'tires_batteries_only'
  | 'batteries_electronics'
  | 'autoparts_oils_only'
  | 'oils_autoparts'
  | 'wholesale_retail_general'
  | 'wholesale_distribution';

export interface ModuleSettings {
  activePreset: BusinessPresetKey;

  // Products & Inventory Settings
  enableMultiUnits: boolean;
  enableTieredPricing: boolean;
  enableExpiryTracking: boolean;
  enableSerialAndWarranty: boolean;
  enableTiresAndSizes: boolean;
  enableOilViscositySpec: boolean;
  defaultCostingMethod: 'weighted_average' | 'fifo';
  lowStockDefaultThreshold: number;
  expiryWarningDays: number;

  // POS & Sales Invoices Settings
  allowNegativeStockSale: boolean;
  allowCashierPriceEdit: boolean;
  enableLineDiscount: boolean;
  enableTaxVat: boolean;
  defaultTaxRate: number;
  enableBatteryScrapTradeIn: boolean;
  printWarrantyOnInvoice: boolean;
  defaultPrintFormat: '80mm' | 'A4';
  enforceCreditLimit: boolean;

  // Customers & Suppliers Settings
  defaultCustomerPriceTier: 'retail' | 'half_wholesale' | 'wholesale' | 'vip';
  autoWhatsAppAfterVoucher: boolean;

  // Currency Settings
  defaultCurrency: string;
  baseCurrency: string;

  // Navigation & Tabs Visibility
  hiddenSidebarTabs: string[];
}

export const PRESET_DEFINITIONS: Record<
  BusinessPresetKey,
  {
    name: string;
    description: string;
    badge: string;
    icon?: string;
    settings: Partial<ModuleSettings>;
  }
> = {
  grocery_only: {
    name: 'وضع البقالة والمواد الغذائية فقط',
    description: 'يعرض فقط قسم المواد الغذائية، رقم الصنف، تاريخ الصلاحية والوحدات؛ ويخفي البطاريات والإطارات والزيوت ومحطة الوقود',
    badge: '🍏 بقالة ومواد غذائية',
    settings: {
      enableMultiUnits: true,
      enableTieredPricing: true,
      enableExpiryTracking: true,
      enableSerialAndWarranty: false,
      enableTiresAndSizes: false,
      enableOilViscositySpec: false,
      enableBatteryScrapTradeIn: false,
      printWarrantyOnInvoice: false,
      defaultCustomerPriceTier: 'retail',
      lowStockDefaultThreshold: 15,
      expiryWarningDays: 45,
      hiddenSidebarTabs: ['fuel_station'],
    },
  },
  food_supermarket: {
    name: 'سوبرماركت ومواد غذائية',
    description: 'تركيز على تاريخ الانتهاء (FEFO)، الباركود، الكراتين، وخصومات الفواتير',
    badge: '🍏 أغذية وتموينات',
    settings: {
      enableMultiUnits: true,
      enableTieredPricing: true,
      enableExpiryTracking: true,
      enableSerialAndWarranty: false,
      enableTiresAndSizes: false,
      enableOilViscositySpec: false,
      enableBatteryScrapTradeIn: false,
      printWarrantyOnInvoice: false,
      defaultCustomerPriceTier: 'retail',
      lowStockDefaultThreshold: 15,
      expiryWarningDays: 45,
      hiddenSidebarTabs: ['fuel_station'],
    },
  },
  fuel_station_only: {
    name: 'وضع محطة تعبئة الغاز والبترول فقط',
    description: 'يعرض شاشة جرد عدادات وخزانات المحطة، المبيعات، العملاء والموردين والسندات؛ ويخفي البقالة والإطارات',
    badge: '⛽ محطة وقود وغاز',
    settings: {
      enableMultiUnits: false,
      enableTieredPricing: false,
      enableExpiryTracking: false,
      enableSerialAndWarranty: false,
      enableTiresAndSizes: false,
      enableOilViscositySpec: false,
      enableBatteryScrapTradeIn: false,
      printWarrantyOnInvoice: false,
      defaultCustomerPriceTier: 'retail',
      defaultPrintFormat: 'A4',
      hiddenSidebarTabs: ['ocr', 'whatsapp'],
    },
  },
  tires_batteries_only: {
    name: 'وضع الإطارات والبطاريات فقط',
    description: 'يعرض مقاس الإطارات، سعة البطاريات، الأرقام التسلسلية، كود DOT، وشهادات الضمان والرجيع؛ ويخفي البقالة ومحطة الوقود',
    badge: '🛞 إطارات وبطاريات',
    settings: {
      enableMultiUnits: true,
      enableTieredPricing: true,
      enableExpiryTracking: false,
      enableSerialAndWarranty: true,
      enableTiresAndSizes: true,
      enableOilViscositySpec: false,
      enableBatteryScrapTradeIn: true,
      printWarrantyOnInvoice: true,
      defaultCustomerPriceTier: 'retail',
      lowStockDefaultThreshold: 8,
      expiryWarningDays: 0,
      hiddenSidebarTabs: ['fuel_station'],
    },
  },
  batteries_electronics: {
    name: 'بطاريات وإلكترونيات',
    description: 'تتبع السيريال نمبر، شهادات الضمان، وخصم استبدال البطاريات القديمة (رجيع)',
    badge: '⚡ ضمان وسيريال',
    settings: {
      enableMultiUnits: true,
      enableTieredPricing: true,
      enableExpiryTracking: false,
      enableSerialAndWarranty: true,
      enableTiresAndSizes: true,
      enableOilViscositySpec: false,
      enableBatteryScrapTradeIn: true,
      printWarrantyOnInvoice: true,
      defaultCustomerPriceTier: 'retail',
      lowStockDefaultThreshold: 8,
      expiryWarningDays: 0,
      hiddenSidebarTabs: ['fuel_station'],
    },
  },
  autoparts_oils_only: {
    name: 'وضع قطع الغيار والزيوت فقط',
    description: 'يعرض رقم القطعة OEM، درجات لزوجة الزيوت، سعة اللتر ومقاسات القطع؛ ويخفي البقالة ومحطة الوقود',
    badge: '🛢️ زيوت وقطع غيار',
    settings: {
      enableMultiUnits: true,
      enableTieredPricing: true,
      enableExpiryTracking: false,
      enableSerialAndWarranty: false,
      enableTiresAndSizes: false,
      enableOilViscositySpec: true,
      enableBatteryScrapTradeIn: false,
      printWarrantyOnInvoice: false,
      defaultCustomerPriceTier: 'half_wholesale',
      lowStockDefaultThreshold: 12,
      expiryWarningDays: 0,
      hiddenSidebarTabs: ['fuel_station'],
    },
  },
  oils_autoparts: {
    name: 'زيوت ومحركات',
    description: 'درجات اللزوجة (20W-50 / 10W-40)، سعة اللتر، وكراتين الزيوت',
    badge: '🛢️ زيوت ومحركات',
    settings: {
      enableMultiUnits: true,
      enableTieredPricing: true,
      enableExpiryTracking: false,
      enableSerialAndWarranty: false,
      enableTiresAndSizes: false,
      enableOilViscositySpec: true,
      enableBatteryScrapTradeIn: false,
      printWarrantyOnInvoice: false,
      defaultCustomerPriceTier: 'half_wholesale',
      lowStockDefaultThreshold: 12,
      expiryWarningDays: 0,
      hiddenSidebarTabs: ['fuel_station'],
    },
  },
  wholesale_retail_general: {
    name: 'وضع التجارة العامة والجملة والتجزئة',
    description: 'يعرض كروت الأصناف العامة، مستويات التسعير والباركود والكراتين وحدود الائتمان',
    badge: '📦 تجارة عامة وجملة',
    settings: {
      enableMultiUnits: true,
      enableTieredPricing: true,
      enableExpiryTracking: true,
      enableSerialAndWarranty: true,
      enableTiresAndSizes: true,
      enableOilViscositySpec: true,
      enableBatteryScrapTradeIn: false,
      printWarrantyOnInvoice: true,
      defaultCustomerPriceTier: 'wholesale',
      defaultPrintFormat: 'A4',
      enforceCreditLimit: true,
      lowStockDefaultThreshold: 20,
      expiryWarningDays: 60,
      hiddenSidebarTabs: ['fuel_station'],
    },
  },
  wholesale_distribution: {
    name: 'تجارة جملة وتوزيع',
    description: 'تعدد أسعار الجملة ونصف الجملة، البيع بالكرتون، وحدود الائتمان',
    badge: '📦 جملة وتوزيع',
    settings: {
      enableMultiUnits: true,
      enableTieredPricing: true,
      enableExpiryTracking: true,
      enableSerialAndWarranty: true,
      enableTiresAndSizes: true,
      enableOilViscositySpec: true,
      enableBatteryScrapTradeIn: true,
      printWarrantyOnInvoice: true,
      defaultCustomerPriceTier: 'wholesale',
      defaultPrintFormat: 'A4',
      enforceCreditLimit: true,
      lowStockDefaultThreshold: 20,
      expiryWarningDays: 60,
      hiddenSidebarTabs: ['fuel_station'],
    },
  },
  multi_activity: {
    name: 'الوضع الشامل المتعدد الأنشطة (الكامل)',
    description: 'يعرض جميع الأقسام والتبويبات: محطة الوقود، البقالة، الإطارات والبطاريات، والزيوت وقطع الغيار دون أي حجب',
    badge: '🌐 نشاط شامل متكامل',
    settings: {
      enableMultiUnits: true,
      enableTieredPricing: true,
      enableExpiryTracking: true,
      enableSerialAndWarranty: true,
      enableTiresAndSizes: true,
      enableOilViscositySpec: true,
      enableBatteryScrapTradeIn: true,
      printWarrantyOnInvoice: true,
      defaultCustomerPriceTier: 'retail',
      lowStockDefaultThreshold: 10,
      expiryWarningDays: 60,
      hiddenSidebarTabs: [],
    },
  },
};

export const DEFAULT_MODULE_SETTINGS: ModuleSettings = {
  activePreset: 'multi_activity',

  enableMultiUnits: true,
  enableTieredPricing: true,
  enableExpiryTracking: true,
  enableSerialAndWarranty: true,
  enableTiresAndSizes: true,
  enableOilViscositySpec: true,
  defaultCostingMethod: 'weighted_average',
  lowStockDefaultThreshold: 10,
  expiryWarningDays: 60,

  allowNegativeStockSale: false,
  allowCashierPriceEdit: true,
  enableLineDiscount: true,
  enableTaxVat: true,
  defaultTaxRate: 15,
  enableBatteryScrapTradeIn: true,
  printWarrantyOnInvoice: true,
  defaultPrintFormat: '80mm',
  enforceCreditLimit: true,

  defaultCustomerPriceTier: 'retail',
  autoWhatsAppAfterVoucher: true,

  defaultCurrency: 'YER',
  baseCurrency: 'YER',

  hiddenSidebarTabs: [],
};

interface ModuleSettingsContextType {
  settings: ModuleSettings;
  updateSettings: (partial: Partial<ModuleSettings>) => void;
  applyPreset: (presetKey: BusinessPresetKey) => void;
  resetSettings: () => void;
  isTabHidden: (tabId: string) => boolean;
  toggleTabVisibility: (tabId: string) => void;
}

const STORAGE_KEY = 'erp_module_settings_v1';

const ModuleSettingsContext = createContext<ModuleSettingsContextType>({
  settings: DEFAULT_MODULE_SETTINGS,
  updateSettings: () => {},
  applyPreset: () => {},
  resetSettings: () => {},
  isTabHidden: () => false,
  toggleTabVisibility: () => {},
});

export const ModuleSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<ModuleSettings>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          return { ...DEFAULT_MODULE_SETTINGS, ...parsed };
        }
      }
    } catch {
      // Fallback to default
    }
    return DEFAULT_MODULE_SETTINGS;
  });

  // Sync to localStorage
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      }
    } catch {
      // Storage unavailable
    }
  }, [settings]);

  const updateSettings = (partial: Partial<ModuleSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  const applyPreset = (presetKey: BusinessPresetKey) => {
    const preset = PRESET_DEFINITIONS[presetKey];
    if (preset) {
      setSettings((prev) => ({
        ...prev,
        ...preset.settings,
        activePreset: presetKey,
      }));
    }
  };

  const resetSettings = () => {
    setSettings(DEFAULT_MODULE_SETTINGS);
  };

  const isTabHidden = (tabId: string): boolean => {
    return settings.hiddenSidebarTabs.includes(tabId);
  };

  const toggleTabVisibility = (tabId: string) => {
    setSettings((prev) => {
      const isHidden = prev.hiddenSidebarTabs.includes(tabId);
      const nextTabs = isHidden
        ? prev.hiddenSidebarTabs.filter((id) => id !== tabId)
        : [...prev.hiddenSidebarTabs, tabId];
      return { ...prev, hiddenSidebarTabs: nextTabs };
    });
  };

  return (
    <ModuleSettingsContext.Provider
      value={{
        settings,
        updateSettings,
        applyPreset,
        resetSettings,
        isTabHidden,
        toggleTabVisibility,
      }}
    >
      {children}
    </ModuleSettingsContext.Provider>
  );
};

export const useModuleSettings = () => useContext(ModuleSettingsContext);
