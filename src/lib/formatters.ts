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

export function formatCurrencyAmount(val: number | string | null | undefined, currency?: string): string {
  const sym = getActiveCurrencySymbol(currency);
  return `${formatNumber(val)} ${sym}`;
}

/**
 * Universal Central Currency Engine
 * Standardized on Yemeni Rial ('YER' / 'ر.ي') as base system currency,
 * reading directly from ModuleSettings and ExchangeRates with fallback to 'ر.ي'.
 */
export function getActiveCurrencyCode(): string {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedSettings = window.localStorage.getItem('erp_module_settings_v1');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed.defaultCurrency || parsed.baseCurrency || parsed.currency) {
          return String(parsed.defaultCurrency || parsed.baseCurrency || parsed.currency).toUpperCase().trim();
        }
      }
      const savedRates = window.localStorage.getItem('erp_exchange_rates_v1');
      if (savedRates) {
        const parsed = JSON.parse(savedRates);
        if (parsed.baseCurrency) return String(parsed.baseCurrency).toUpperCase().trim();
      }
    }
  } catch {}
  return 'YER';
}

export function getActiveCurrencySymbol(overrideCurrency?: string): string {
  const code = (overrideCurrency || getActiveCurrencyCode()).toUpperCase().trim();
  if (code === 'YER' || code === 'ريال يمني' || code === 'ر.ي') return 'ر.ي';
  if (code === 'SAR' || code === 'ريال سعودي' || code === 'ر.س') return 'ر.س';
  if (code === 'USD' || code === 'دولار' || code === '$') return '$';
  return code || 'ر.ي';
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
  const formatted = `${formatNumber(num)} ${getActiveCurrencySymbol(cur)}`;

  if (cur === 'YER') {
    return { formatted, equivalent: '', isBase: true };
  }

  const rate = exchangeRate || (cur === 'SAR' ? 535 : cur === 'USD' ? 2050 : 1);
  const baseEquivalent = num * rate;
  const equivalent = `≈ ${formatNumber(baseEquivalent)} ${getActiveCurrencySymbol('YER')}`;

  return { formatted, equivalent, isBase: false };
}

/**
 * Real-Time Unified Stock & Movement Synchronization Engine
 * Automatically deducts stock from product.stock, product.quantity, and product.current_stock,
 * logs stock movements, tracks soldToday and totalSold, and notifies all listening tabs.
 */
export interface StockDeductionItem {
  productId: string;
  quantity: number;
  unitFactor?: number;
  unitName?: string;
  price?: number;
  total?: number;
}

export interface StockDeductionOptions {
  type: 'sale' | 'pos_sale' | 'purchase' | 'return';
  referenceNumber: string;
  referenceId?: string;
  customerName?: string;
  customerOrSupplierName?: string;
  paymentMethod?: string;
  total?: number;
  currency?: string;
  date?: string;
  notes?: string;
}

export function applyStockMovementSync(items: StockDeductionItem[], options: StockDeductionOptions): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const today = options.date || new Date().toISOString().split('T')[0];
    const rawProducts = localStorage.getItem('erp_products_v1');
    let products: any[] = rawProducts ? JSON.parse(rawProducts) : [];
    const rawMovements = localStorage.getItem('erp_inventory_movements_v1');
    let movements: any[] = rawMovements ? JSON.parse(rawMovements) : [];

    const isStockDecrease = options.type === 'sale' || options.type === 'pos_sale';
    const isStockIncrease = options.type === 'purchase' || options.type === 'return';

    items.forEach((item) => {
      const pIdx = products.findIndex((p) => p.id === item.productId || p.itemCode === item.productId || p.sku === item.productId);
      const factor = Number(item.unitFactor || 1);
      const baseQty = Number(item.quantity || 0) * factor;

      let stockBefore = 0;
      let stockAfter = 0;
      let prodName = 'صنف تجاري';
      let prodCode = '';

      if (pIdx !== -1) {
        const p = products[pIdx];
        stockBefore = Number(p.current_stock !== undefined ? p.current_stock : (p.stock !== undefined ? p.stock : (p.quantity || 0)));
        prodName = p.name || prodName;
        prodCode = p.itemCode || p.sku || p.barcode || '';

        if (isStockDecrease) {
          stockAfter = Math.max(0, stockBefore - baseQty);
          p.totalSold = Number(p.totalSold || 0) + baseQty;
          const lastSoldDate = p.lastSoldDate || '';
          if (lastSoldDate === today) {
            p.soldToday = Number(p.soldToday || 0) + baseQty;
          } else {
            p.soldToday = baseQty;
            p.lastSoldDate = today;
          }
        } else if (isStockIncrease) {
          stockAfter = stockBefore + baseQty;
          if (options.type === 'return') {
            p.totalSold = Math.max(0, Number(p.totalSold || 0) - baseQty);
            if (p.lastSoldDate === today) {
              p.soldToday = Math.max(0, Number(p.soldToday || 0) - baseQty);
            }
          }
        } else {
          stockAfter = stockBefore;
        }

        p.current_stock = stockAfter;
        p.stock = stockAfter;
        p.quantity = stockAfter;
        p.qty = stockAfter;
        p.updated_at = new Date().toISOString();
        products[pIdx] = p;
      }

      movements.unshift({
        id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        date: today,
        timestamp: new Date().toISOString(),
        productId: item.productId,
        productCode: prodCode,
        productName: prodName,
        type: options.type,
        unitName: item.unitName || 'حبة',
        quantity: Number(item.quantity || 0),
        baseQuantity: baseQty,
        stockBefore,
        stockAfter,
        referenceNumber: options.referenceNumber,
        customerOrSupplierName: options.customerOrSupplierName || 'العميل النقدي',
        totalAmount: Number(item.total || 0),
      });
    });

    localStorage.setItem('erp_products_v1', JSON.stringify(products));
    localStorage.setItem('erp_inventory_movements_v1', JSON.stringify(movements.slice(0, 500)));

    // Save to company specific key if present
    const authData = localStorage.getItem('erp_auth_company_v1');
    if (authData) {
      try {
        const comp = JSON.parse(authData);
        if (comp?.id) {
          localStorage.setItem(`erp_products_v1_${comp.id}`, JSON.stringify(products));
        }
      } catch {}
    }

    // Broadcast global event
    window.dispatchEvent(new CustomEvent('erp-inventory-updated', { detail: { items, options } }));
    window.dispatchEvent(new Event('erp-inventory-updated'));
  } catch (err) {
    console.warn('Stock sync error:', err);
  }
}

