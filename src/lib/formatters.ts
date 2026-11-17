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
  unit?: string;
  name?: string;
  sku?: string;
  itemCode?: string;
  barcode?: string;
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
    const authData = localStorage.getItem('erp_auth_company_v1');
    let activeCompanyId = '';
    if (authData) {
      try {
        const comp = JSON.parse(authData);
        if (comp?.id) activeCompanyId = String(comp.id);
      } catch {}
    }

    const rawProducts = localStorage.getItem('erp_products_v1');
    let products: any[] = rawProducts ? JSON.parse(rawProducts) : [];
    if ((!Array.isArray(products) || products.length === 0) && activeCompanyId) {
      const compProducts = localStorage.getItem(`erp_products_v1_${activeCompanyId}`);
      if (compProducts) {
        try {
          products = JSON.parse(compProducts);
        } catch {}
      }
    }
    if (!Array.isArray(products)) products = [];

    const rawMovements = localStorage.getItem('erp_inventory_movements_v1');
    let movements: any[] = rawMovements ? JSON.parse(rawMovements) : [];
    if (!Array.isArray(movements)) movements = [];

    const isStockDecrease = options.type === 'sale' || options.type === 'pos_sale';
    const isStockIncrease = options.type === 'purchase' || options.type === 'return';

    items.forEach((item) => {
      const targetProdId = item.productId || (item as any).product_id || (item as any).id || '';
      const targetSku = item.sku || item.itemCode || '';
      const targetBarcode = item.barcode || '';
      const targetName = item.name || (item as any).productName || (item as any).product_name || '';

      const pIdx = products.findIndex((p) =>
        (targetProdId && (String(p.id) === String(targetProdId) || String(p.itemCode) === String(targetProdId) || String(p.sku) === String(targetProdId))) ||
        (targetSku && (String(p.sku) === String(targetSku) || String(p.itemCode) === String(targetSku))) ||
        (targetBarcode && String(p.barcode) === String(targetBarcode)) ||
        (targetName && String(p.name || p.productName || p.product_name || '').trim().toLowerCase() === String(targetName).trim().toLowerCase())
      );

      const matchedProd = pIdx !== -1 ? products[pIdx] : null;
      let stockBefore = matchedProd
        ? Number(matchedProd.current_stock ?? matchedProd.qty ?? matchedProd.stock ?? matchedProd.quantity ?? 0)
        : Number((item as any).stockBefore ?? (item as any).current_stock ?? (item as any).qty ?? (item as any).stock ?? 0);
      let prodName = (matchedProd && (matchedProd.name || matchedProd.productName || matchedProd.product_name)) || targetName || 'صنف تجاري';
      let prodCode = (matchedProd && (matchedProd.itemCode || matchedProd.sku || matchedProd.barcode)) || targetSku || targetBarcode || '';
      const rawQty = Number(item.quantity ?? (item as any).qty ?? 0);
      let baseQty = rawQty * Number(item.unitFactor || 1);
      let stockAfter = stockBefore;

      if (matchedProd) {
        const p = matchedProd;
        const pFactor = Number(p.majorUnitFactor || p.conversionFactor || 1);
        const itemFactor = Number(item.unitFactor || 1);
        const itemUnit = (item.unit || item.unitName || '').trim().toLowerCase();
        const pMajorUnit = (p.majorUnitName || '').trim().toLowerCase();

        baseQty = rawQty;
        if (itemFactor > 1) {
          baseQty = baseQty * itemFactor;
        } else if (pFactor > 1 && pMajorUnit && itemUnit === pMajorUnit) {
          baseQty = baseQty * pFactor;
        } else if (pFactor > 1 && (itemUnit.includes('كيس') || itemUnit.includes('كرتون') || itemUnit.includes('شوال'))) {
          baseQty = baseQty * pFactor;
        }

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
          } else if (options.type === 'purchase') {
            p.incomingStock = Number(p.incomingStock || p.initialStock || stockBefore) + baseQty;
          }
        } else {
          stockAfter = stockBefore;
        }

        // Initialize incomingStock if unset
        if (p.incomingStock === undefined || Number(p.incomingStock) <= 0) {
          p.incomingStock = stockAfter + Number(p.totalSold || 0);
        }

        const minLevel = Number(p.min_stock_level ?? p.minStock ?? 5);
        p.current_stock = stockAfter;
        p.stock = stockAfter;
        p.quantity = stockAfter;
        p.qty = stockAfter;
        p.status = stockAfter <= 0 ? 'نفد' : stockAfter <= minLevel ? 'قريب من النفاذ' : 'متوفر';
        p.updated_at = new Date().toISOString();
        products[pIdx] = p;
      } else {
        if (isStockDecrease) {
          stockAfter = Math.max(0, stockBefore - baseQty);
        } else if (isStockIncrease) {
          stockAfter = stockBefore + baseQty;
        }
      }

      movements.unshift({
        id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        date: today,
        timestamp: new Date().toISOString(),
        productId: matchedProd?.id || targetProdId,
        product_id: matchedProd?.id || targetProdId,
        productCode: prodCode,
        productName: prodName,
        product_name: prodName,
        type: options.type,
        unitName: item.unitName || item.unit || matchedProd?.unit || matchedProd?.baseUnitName || 'حبة',
        quantity: rawQty,
        baseQuantity: baseQty,
        stockBefore,
        stock_before: stockBefore,
        stockAfter,
        stock_after: stockAfter,
        remaining_stock: stockAfter,
        referenceNumber: options.referenceNumber,
        customerOrSupplierName: options.customerOrSupplierName || 'العميل النقدي',
        totalAmount: Number(item.total || 0),
      });
    });

    localStorage.setItem('erp_products_v1', JSON.stringify(products));
    localStorage.setItem('erp_inventory_movements_v1', JSON.stringify(movements.slice(0, 500)));

    // Save to company specific key if present
    if (activeCompanyId) {
      localStorage.setItem(`erp_products_v1_${activeCompanyId}`, JSON.stringify(products));
    }

    // Broadcast global event
    window.dispatchEvent(new CustomEvent('erp-inventory-updated', { detail: { items, options } }));
    window.dispatchEvent(new Event('erp-inventory-updated'));
  } catch (err) {
    console.warn('Stock sync error:', err);
  }
}

