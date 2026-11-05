/**
 * Central Inventory & Multi-Unit Calculation Engine
 * Guarantees synchronized conversion between Base/Sub Units (e.g. كيلو، حبة)
 * and Major Units (e.g. كيس، كرتون), live stock metrics (الوارد / مباع اليوم / إجمالي المباع / المتبقي),
 * and standard formatted stock display badges across the entire ERP system.
 */

export interface ProductStockMetrics {
  currentStock: number;       // المتبقي الفعلي بالوحدة الصغرى
  remainingStock: number;     // نفس المتبقي
  totalSold: number;          // إجمالي المباع بالوحدة الصغرى
  soldToday: number;          // مباع اليوم بالوحدة الصغرى
  totalIncoming: number;      // الوارد الكلي (افتتاحي + مشتريات + تسويات)
  initialStock: number;       // الرصيد الافتتاحي بالوحدة الصغرى
  formattedRemaining: string; // "3 كيس (150 كيلو)" أو "2 كيس و 40 كيلو (140 كيلو)"
  formattedIncoming: string;  // "150 كيلو (3 كيس)"
  majorUnitName: string;
  baseUnitName: string;
  majorFactor: number;
  majorCount: number;
  remainderSub: number;
}

/**
 * Normalizes conversion factor to a safe positive number. Default: 1
 */
export function getProductMajorFactor(product: any): number {
  if (!product) return 1;
  const factor = Number(
    product.majorUnitFactor ??
    product.major_unit_factor ??
    product.conversionFactor ??
    product.conversion_factor ??
    product.unitFactor ??
    product.unit_factor ??
    product.factor ??
    1
  );
  return isNaN(factor) || factor <= 0 ? 1 : factor;
}

/**
 * Returns canonical unit names: majorUnit (e.g. كيس / كرتون) and baseUnit (e.g. كيلو / حبة)
 */
export function getProductUnitNames(product: any): { majorUnit: string; baseUnit: string } {
  const baseUnit = (
    product?.baseUnitName ||
    product?.base_unit_name ||
    product?.unit ||
    product?.subUnitName ||
    product?.sub_unit_name ||
    'حبة'
  ).trim();

  const majorUnit = (
    product?.majorUnitName ||
    product?.major_unit_name ||
    product?.bulkUnit ||
    ''
  ).trim();

  return { majorUnit, baseUnit };
}

/**
 * Converts a given quantity in a specific unit into Canonical Base Units (الوحدة الصغرى/الأساسية).
 * e.g., if item was sold in 'كيس' with factor 50, qty 3 -> 150.
 */
export function toBaseQuantity(qty: number | string, unitName: string | undefined, product: any): number {
  const numQty = Number(qty || 0);
  if (isNaN(numQty) || numQty === 0) return 0;
  if (!product) return numQty;

  const factor = getProductMajorFactor(product);
  const { majorUnit } = getProductUnitNames(product);

  const cleanUnit = (unitName || '').trim().toLowerCase();
  const cleanMajor = majorUnit.toLowerCase();

  // If item's unit matches product's major unit (or contains carton/bag keywords), multiply by factor
  const isMajor =
    (cleanMajor && cleanUnit === cleanMajor) ||
    (factor > 1 && (cleanUnit.includes('كيس') || cleanUnit.includes('كرتون') || cleanUnit.includes('شوال') || cleanUnit.includes('طبلية') || cleanUnit.includes('carton') || cleanUnit.includes('bag')));

  if (isMajor && factor > 1) {
    return Number((numQty * factor).toFixed(3));
  }

  return Number(numQty.toFixed(3));
}

/**
 * Smart Multi-Unit Display Formatter
 * Formats base quantity into human-readable multi-unit string:
 * - baseQty = 150, factor = 50, major = 'كيس', base = 'كيلو':
 *   -> "3 كيس (150 كيلو)"
 * - baseQty = 140:
 *   -> "2 كيس و 40 كيلو (140 كيلو)"
 * - baseQty = 35:
 *   -> "0 كيس و 35 كيلو (35 كيلو)"
 * - If no major unit or factor <= 1:
 *   -> "150 كيلو"
 */
export function formatProductStock(baseQty: number | string, product: any): string {
  const qty = Number(baseQty ?? 0);
  if (isNaN(qty)) return '0';

  const factor = getProductMajorFactor(product);
  const { majorUnit, baseUnit } = getProductUnitNames(product);

  if (!majorUnit || factor <= 1) {
    return `${qty.toLocaleString('en-US')} ${baseUnit}`;
  }

  const majorCount = Math.floor(qty / factor);
  const remainderSub = Number((qty % factor).toFixed(2));

  if (majorCount > 0 && remainderSub === 0) {
    return `${majorCount.toLocaleString('en-US')} ${majorUnit} (${qty.toLocaleString('en-US')} ${baseUnit})`;
  }

  if (majorCount > 0 && remainderSub > 0) {
    return `${majorCount.toLocaleString('en-US')} ${majorUnit} و ${remainderSub.toLocaleString('en-US')} ${baseUnit} (${qty.toLocaleString('en-US')} ${baseUnit})`;
  }

  return `0 ${majorUnit} و ${remainderSub.toLocaleString('en-US')} ${baseUnit} (${qty.toLocaleString('en-US')} ${baseUnit})`;
}

/**
 * Computes live, dynamic stock metrics for a product from the entire system state:
 * - Invoices & POS Sales
 * - Purchase Invoices & Incoming restocks
 * - Inventory Movements
 * - Initial/Opening Stock
 */
export function computeLiveProductStockMetrics(
  product: any,
  systemData?: {
    invoices?: any[];
    salesInvoices?: any[];
    purchaseInvoices?: any[];
    inventoryMovements?: any[];
  }
): ProductStockMetrics {
  const factor = getProductMajorFactor(product);
  const { majorUnit, baseUnit } = getProductUnitNames(product);

  // Load from localStorage if not passed
  let invoices: any[] = systemData?.invoices ?? [];
  let purchases: any[] = systemData?.purchaseInvoices ?? [];
  let movements: any[] = systemData?.inventoryMovements ?? [];

  if (typeof window !== 'undefined' && (!systemData || (!systemData.invoices && !systemData.purchaseInvoices))) {
    try {
      if (!systemData?.invoices) {
        const rawInv = localStorage.getItem('erp_invoices_v1');
        invoices = rawInv ? JSON.parse(rawInv) : [];
      }
      if (!systemData?.purchaseInvoices) {
        const rawPur = localStorage.getItem('erp_purchase_invoices_v1');
        purchases = rawPur ? JSON.parse(rawPur) : [];
      }
      if (!systemData?.inventoryMovements) {
        const rawMov = localStorage.getItem('erp_inventory_movements_v1');
        movements = rawMov ? JSON.parse(rawMov) : [];
      }
    } catch {}
  }

  const pId = String(product?.id || '').trim();
  const pCode = String(product?.itemCode || product?.sku || product?.barcode || '').trim().toLowerCase();
  const pName = String(product?.name || '').trim().toLowerCase();

  const isMatch = (item: any): boolean => {
    if (!item) return false;
    const itId = String(item.productId || item.product_id || item.id || '').trim();
    if (pId && itId && pId === itId) return true;
    const itCode = String(item.productCode || item.itemCode || item.sku || item.barcode || '').trim().toLowerCase();
    if (pCode && itCode && pCode === itCode) return true;
    const itName = String(item.productName || item.name || '').trim().toLowerCase();
    if (pName && itName && pName === itName) return true;
    return false;
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Calculate Total Sold & Sold Today from all non-cancelled sales invoices and POS receipts
  let computedSoldTotal = 0;
  let computedSoldToday = 0;

  for (const inv of invoices) {
    if (inv.status === 'CANCELLED' || inv.status === 'VOID') continue;
    const invDate = String(inv.invoice_date || inv.date || inv.created_at || '').split('T')[0];
    const items = inv.items || inv.cart_data || inv.cartData || [];
    for (const it of items) {
      if (isMatch(it)) {
        const itemUnit = it.unit || it.unitName || it.packagingUnit;
        const itQty = Number(it.quantity || it.qty || 0);
        const itemFactor = Number(it.unitFactor || 0);
        let baseSold = 0;
        if (itemFactor > 1) {
          baseSold = itQty * itemFactor;
        } else {
          baseSold = toBaseQuantity(itQty, itemUnit, product);
        }
        computedSoldTotal += baseSold;
        if (invDate === todayStr) {
          computedSoldToday += baseSold;
        }
      }
    }
  }

  // Deduct returned sales from inventory movements or returns
  for (const m of movements) {
    if ((m.type === 'return' || m.type === 'sales_return') && isMatch(m)) {
      const retQty = Number(m.baseQuantity ?? m.quantity ?? 0);
      computedSoldTotal = Math.max(0, computedSoldTotal - retQty);
      if (String(m.date || m.timestamp || '').split('T')[0] === todayStr) {
        computedSoldToday = Math.max(0, computedSoldToday - retQty);
      }
    }
  }

  // Fallback to product.totalSold / soldToday if computed is 0 but product recorded it
  const totalSold = Math.max(computedSoldTotal, Number(product?.totalSold || 0));
  const soldToday = Math.max(computedSoldToday, Number(product?.soldToday || 0));

  // 2. Calculate Incoming Stock: Opening Stock + Purchase Invoices + Restock Movements
  // Initial / Opening Stock
  let rawInitial = Number(
    product?.initialStock ??
    product?.initial_stock ??
    product?.openingStock ??
    product?.opening_stock ??
    0
  );

  // If opening stock was saved in major units (e.g. initialStock = 3 when factor = 50), normalize
  if (rawInitial > 0 && factor > 1 && rawInitial < factor && Number(product?.current_stock ?? product?.stock ?? 0) >= factor) {
    rawInitial = rawInitial * factor;
  }

  // Purchases
  let computedPurchased = 0;
  for (const pur of purchases) {
    if (pur.status === 'CANCELLED' || pur.status === 'VOID') continue;
    const items = pur.items || [];
    for (const it of items) {
      if (isMatch(it)) {
        const itQty = Number(it.totalReceivedBaseUnits ?? it.quantity ?? 0);
        const itFactor = Number(it.unitFactor || 1);
        computedPurchased += itQty * (it.totalReceivedBaseUnits ? 1 : itFactor);
      }
    }
  }

  // Restock movements
  let computedRestocks = 0;
  for (const m of movements) {
    if ((m.type === 'purchase' || m.type === 'restock' || m.type === 'adjustment_in') && isMatch(m)) {
      computedRestocks += Number(m.baseQuantity ?? m.quantity ?? 0);
    }
  }

  let totalIncoming = rawInitial + Math.max(computedPurchased, computedRestocks);

  // Current stock on product
  const storedStock = Number(
    product?.current_stock ??
    product?.stock ??
    product?.quantity ??
    product?.qty ??
    0
  );

  // CRITICAL AUDIT & REPAIR:
  // If totalIncoming is 0 or less than (currentStock + totalSold), automatically set
  // totalIncoming = currentStock + totalSold (which equals opening baseline)
  if (totalIncoming <= 0 || totalIncoming < (storedStock + totalSold)) {
    totalIncoming = storedStock + totalSold;
  }

  // If rawInitial is 0, initialize it to totalIncoming - purchased
  const initialStock = rawInitial > 0 ? rawInitial : Math.max(0, totalIncoming - computedPurchased);

  // Final remaining stock
  const remainingStock = Math.max(0, storedStock > 0 ? storedStock : (totalIncoming - totalSold));

  const majorCount = factor > 1 ? Math.floor(remainingStock / factor) : remainingStock;
  const remainderSub = factor > 1 ? Number((remainingStock % factor).toFixed(2)) : 0;

  return {
    currentStock: remainingStock,
    remainingStock,
    totalSold,
    soldToday,
    totalIncoming,
    initialStock,
    formattedRemaining: formatProductStock(remainingStock, product),
    formattedIncoming: formatProductStock(totalIncoming, product),
    majorUnitName: majorUnit,
    baseUnitName: baseUnit,
    majorFactor: factor,
    majorCount,
    remainderSub,
  };
}
