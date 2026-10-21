export function toEnglishDigits(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  return str.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
}

export function parseEnglishNumber(val: string | number | null | undefined, fallback: number = 0): number {
  if (val === null || val === undefined || val === '') return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  const cleaned = toEnglishDigits(val).replace(/,/g, '').trim();
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

export function formatDateTime(val: string | Date | null | undefined): string {
  if (!val) return '';
  const date = typeof val === 'string' ? new Date(val) : val;
  if (isNaN(date.getTime())) return '';
  return date.toLocaleString('en-GB');
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

