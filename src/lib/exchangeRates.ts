/**
 * Enterprise Multi-Currency & Daily Exchange Rates Engine
 * Standardized across YER (Base Currency), SAR, and USD.
 * Persisted in localStorage ('erp_exchange_rates_v1') and broadcasts live updates.
 */

import { formatNumber, parseEnglishNumber } from './formatters';

export type SupportedCurrency = 'YER' | 'SAR' | 'USD';

export interface CurrencyRateInfo {
  code: SupportedCurrency;
  nameAr: string;
  nameEn: string;
  symbol: string;
  isBase: boolean;
  buyRate: number; // In YER (e.g., 535)
  sellRate: number; // In YER (e.g., 537)
  accountingRate: number; // In YER (e.g., 535)
  flag: string;
}

export interface ExchangeRateConfig {
  baseCurrency: 'YER';
  lastUpdated: string;
  updatedBy?: string;
  marketNote?: string;
  rates: {
    YER: CurrencyRateInfo;
    SAR: CurrencyRateInfo;
    USD: CurrencyRateInfo;
  };
}

export const STORAGE_KEY_EXCHANGE_RATES = 'erp_exchange_rates_v1';
export const EVENT_EXCHANGE_RATES_CHANGED = 'erp_exchange_rates_changed';

export const DEFAULT_EXCHANGE_RATES: ExchangeRateConfig = {
  baseCurrency: 'YER',
  lastUpdated: new Date().toISOString().split('T')[0],
  updatedBy: 'المدير المالي',
  marketNote: 'أسعار الصرف التأشيرية المعتمدة للعمليات والمعاملات اليومية',
  rates: {
    YER: {
      code: 'YER',
      nameAr: 'ريال يمني (العملة الأساسية)',
      nameEn: 'Yemeni Rial',
      symbol: 'ر.ي',
      isBase: true,
      buyRate: 1.0,
      sellRate: 1.0,
      accountingRate: 1.0,
      flag: '🇾🇪',
    },
    SAR: {
      code: 'SAR',
      nameAr: 'ريال سعودي',
      nameEn: 'Saudi Riyal',
      symbol: 'ر.س',
      isBase: false,
      buyRate: 535.0,
      sellRate: 537.0,
      accountingRate: 535.0,
      flag: '🇸🇦',
    },
    USD: {
      code: 'USD',
      nameAr: 'دولار أمريكي',
      nameEn: 'US Dollar',
      symbol: '$',
      isBase: false,
      buyRate: 2045.0,
      sellRate: 2055.0,
      accountingRate: 2050.0,
      flag: '🇺🇸',
    },
  },
};

/**
 * Retrieve active exchange rates configuration from localStorage or default
 */
export function getStoredExchangeRates(): ExchangeRateConfig {
  if (typeof window === 'undefined') return DEFAULT_EXCHANGE_RATES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_EXCHANGE_RATES);
    if (!raw) return DEFAULT_EXCHANGE_RATES;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_EXCHANGE_RATES,
      ...parsed,
      rates: {
        YER: { ...DEFAULT_EXCHANGE_RATES.rates.YER, ...(parsed.rates?.YER || {}) },
        SAR: { ...DEFAULT_EXCHANGE_RATES.rates.SAR, ...(parsed.rates?.SAR || {}) },
        USD: { ...DEFAULT_EXCHANGE_RATES.rates.USD, ...(parsed.rates?.USD || {}) },
      },
    };
  } catch {
    return DEFAULT_EXCHANGE_RATES;
  }
}

/**
 * Save updated exchange rates and broadcast change event
 */
export function saveStoredExchangeRates(config: ExchangeRateConfig): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY_EXCHANGE_RATES, JSON.stringify(config));
    window.dispatchEvent(new Event(EVENT_EXCHANGE_RATES_CHANGED));
  } catch {
    // Storage quota or error
  }
}

/**
 * Get accounting rate for a currency against base currency (YER)
 */
export function getAccountingRate(currency: string, config?: ExchangeRateConfig): number {
  const cur = (currency || 'YER').toUpperCase() as SupportedCurrency;
  if (cur === 'YER') return 1.0;
  const rates = config || getStoredExchangeRates();
  const rateInfo = rates.rates[cur];
  return rateInfo?.accountingRate || (cur === 'SAR' ? 535.0 : cur === 'USD' ? 2050.0 : 1.0);
}

/**
 * Convert any amount to the base currency (YER)
 */
export function toBaseCurrencyAmount(
  amount: number | string | null | undefined,
  currency: string,
  config?: ExchangeRateConfig
): number {
  const num = parseEnglishNumber(amount, 0);
  const cur = (currency || 'YER').toUpperCase();
  if (cur === 'YER') return num;
  const rate = getAccountingRate(cur, config);
  return num * rate;
}

/**
 * Convert an amount from one currency to another
 */
export function convertCurrency(
  amount: number | string | null | undefined,
  fromCurrency: string,
  toCurrency: string,
  config?: ExchangeRateConfig
): number {
  const num = parseEnglishNumber(amount, 0);
  const from = (fromCurrency || 'YER').toUpperCase() as SupportedCurrency;
  const to = (toCurrency || 'YER').toUpperCase() as SupportedCurrency;

  if (from === to) return num;

  const rates = config || getStoredExchangeRates();
  // Convert from -> YER base first
  const inBase = from === 'YER' ? num : num * (rates.rates[from]?.accountingRate || 1);

  // Convert YER base -> to
  if (to === 'YER') return inBase;
  const toRate = rates.rates[to]?.accountingRate || 1;
  return toRate > 0 ? inBase / toRate : inBase;
}

/**
 * Formatted string showing base equivalent e.g., "535,000 YER"
 */
export function formatBaseEquivalent(
  amount: number | string | null | undefined,
  currency: string,
  config?: ExchangeRateConfig
): string {
  const cur = (currency || 'YER').toUpperCase();
  if (cur === 'YER') return '';
  const baseAmount = toBaseCurrencyAmount(amount, cur, config);
  return `${formatNumber(baseAmount)} YER`;
}
