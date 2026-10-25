export function toEnglishDigits(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '';
  let str = String(val);
  // Arabic-Indic digits ٠-٩ (U+0660 to U+0669)
  str = str.replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 1632));
  // Eastern Arabic-Indic / Persian digits ۰-۹ (U+06F0 to U+06F9)
  str = str.replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 1776));
  // Arabic decimal separator ٫ (U+066B) or Arabic comma ، (U+060C)
  str = str.replace(/[\u066B\u060C]/g, '.');
  return str;
}

export function parseEnglishNumber(val: string | number | null | undefined, fallback: number = 0): number {
  if (val === null || val === undefined || val === '') return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  const cleaned = toEnglishDigits(val)
    .replace(/,/g, '') // remove thousands separators
    .replace(/[^0-9.-]/g, '') // remove non-numeric
    .trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? fallback : num;
}

export function roundMoney(amount: number | string | null | undefined, decimals = 2): number {
  const num = parseEnglishNumber(amount);
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
}

export function formatNumber(
  val: number | string | null | undefined,
  options?: { fixedDecimals?: boolean; decimals?: number }
): string {
  if (val === null || val === undefined || val === '') return '0';
  const num = parseEnglishNumber(val);
  if (num === 0) return '0';

  if (options?.fixedDecimals) {
    const decs = options.decimals ?? 2;
    const parts = num.toFixed(decs).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  }

  const parts = String(num).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

export function formatAmount(
  val: number | string | null | undefined,
  currencyOrOptions?: string | boolean | { fixedDecimals?: boolean; decimals?: number }
): string {
  if (typeof currencyOrOptions === 'string') {
    return `${formatNumber(val)} ${currencyOrOptions}`;
  }
  if (typeof currencyOrOptions === 'boolean') {
    return formatNumber(val, { fixedDecimals: currencyOrOptions });
  }
  return formatNumber(val, currencyOrOptions);
}

export function formatCustomerAmount(val: number | string | null | undefined): string {
  return formatNumber(val);
}

export function formatSupplierAmount(val: number | string | null | undefined): string {
  return formatNumber(val);
}

export function formatCurrencyAmount(val: number | string | null | undefined, currency = 'SAR'): string {
  return `${formatNumber(val)} ${currency}`;
}

/**
 * Format Date strictly as Date-Only YYYY-MM-DD in Western English digits with ZERO timestamps
 */
export function formatDateOnly(val: string | number | Date | null | undefined): string {
  if (!val) return '';
  if (typeof val === 'string') {
    const cleaned = toEnglishDigits(val).trim();
    // Check if starts with YYYY-MM-DD or YYYY/MM/DD
    const match = cleaned.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
    if (match) {
      const y = match[1];
      const m = match[2].padStart(2, '0');
      const d = match[3].padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }
  const d = typeof val === 'object' && val instanceof Date ? val : new Date(val);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return toEnglishDigits(`${year}-${month}-${day}`);
}

export function formatDateTime(val: string | Date | null | undefined): string {
  // Enforce Date-Only YYYY-MM-DD with zero timestamps across the system
  return formatDateOnly(val);
}

/**
 * Multi-Currency Equivalent Formatter
 * Shows base amount and live equivalent in YER when transacting in SAR or USD
 */
export function formatAmountWithEquivalent(
  val: number | string | null | undefined,
  currency: string = 'YER',
  exchangeRate?: number
): { formatted: string; equivalent: string; isBase: boolean } {
  const num = parseEnglishNumber(val, 0);
  const cur = (currency || 'YER').toUpperCase();
  const formatted = `${formatNumber(num)} ${cur}`;

  if (cur === 'YER') {
    return { formatted, equivalent: '', isBase: true };
  }

  const rate = exchangeRate || (cur === 'SAR' ? 535 : cur === 'USD' ? 2050 : 1);
  const baseEquivalent = num * rate;
  const equivalent = `≈ ${formatNumber(baseEquivalent)} YER`;

  return { formatted, equivalent, isBase: false };
}

