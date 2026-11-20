import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { formatAmount, formatNumber, getActiveCurrencySymbol } from '../../lib/formatters';
import { formatProductStock, computeLiveProductStockMetrics, getProductMajorFactor } from '../../utils/inventoryMath';
import { ModuleSettingsModal } from '../Common/ModuleSettingsModal';
import { ProductActivityType } from '../../types';
import {
  Boxes,
  Search,
  Loader2,
  AlertCircle,
  ArrowDownRight,
  ArrowUpLeft,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  Calendar,
  Layers,
  Sparkles,
  Zap,
  Filter,
  Check,
  PackageCheck,
  History,
  QrCode,
  Tag,
  Phone,
  FileText,
  Building2,
  Truck,
  ArrowLeftRight,
  Plus,
  Printer,
  X,
  Eye,
  MapPin,
  User,
} from 'lucide-react';
import { renderAndPrintDocument } from '../../lib/exportUtils';

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  type: 'CENTRAL' | 'RETAIL' | 'BRANCH' | 'VAN';
  location: string;
  manager: string;
  phone: string;
}

export const PRESET_WAREHOUSES: Warehouse[] = [
  {
    id: 'wh-main',
    name: 'المستودع الرئيسي - الجملة',
    code: 'WH-01-MAIN',
    type: 'CENTRAL',
    location: 'صنعاء - شارع الستين الجنوبي',
    manager: 'م. يحيى الشامي',
    phone: '771234567',
  },
  {
    id: 'wh-retail',
    name: 'معرض البيع المباشر - التجزئة',
    code: 'WH-02-RETAIL',
    type: 'RETAIL',
    location: 'صنعاء - حدة ريفيرا',
    manager: 'أ. طارق عبدالكريم',
    phone: '772345678',
  },
  {
    id: 'wh-battery',
    name: 'فرع البطاريات والزيوت',
    code: 'WH-03-BATTERY',
    type: 'BRANCH',
    location: 'صنعاء - شارع تعز جوار جولة النصر',
    manager: 'م. فؤاد الحرازي',
    phone: '773456789',
  },
  {
    id: 'wh-van',
    name: 'مستودع سيارة التوزيع (مندوب المبيعات)',
    code: 'WH-04-VAN',
    type: 'VAN',
    location: 'خط سير الأمانة والضواحي - سيارة جامبو #5421',
    manager: 'الكابتن صدام الوادعي',
    phone: '774567890',
  },
];

export interface StockTransferItem {
  productId: string;
  productName: string;
  sku: string;
  unit: 'PIECE' | 'CARTON';
  unitName: string;
  factor: number;
  quantity: number;
  totalPieces: number;
  notes?: string;
}

export interface StockTransferVoucher {
  id: string;
  voucherNumber: string;
  date: string;
  fromWarehouseId: string;
  fromWarehouseName: string;
  toWarehouseId: string;
  toWarehouseName: string;
  driverName: string;
  vehicleNumber?: string;
  items: StockTransferItem[];
  totalPieces: number;
  notes: string;
  status: 'COMPLETED' | 'PENDING' | 'CANCELLED';
  createdAt: string;
  createdBy: string;
}

export const InventoryTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'movements_balances' | 'physical_audit' | 'expiry_warranty_radar' | 'stock_transfers'>('movements_balances');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('ALL');

  const [warehouses, setWarehouses] = useState<Warehouse[]>(() => {
    try {
      const saved = localStorage.getItem('erp_warehouses_v1');
      return saved ? JSON.parse(saved) : PRESET_WAREHOUSES;
    } catch {
      return PRESET_WAREHOUSES;
    }
  });

  // Stock Transfers State
  const [transfers, setTransfers] = useState<StockTransferVoucher[]>(() => {
    try {
      const isClean =
        typeof window !== 'undefined' &&
        (localStorage.getItem('erp_clean_production_mode_v1') === 'true' ||
          localStorage.getItem('erp_sample_data_cleaned') === 'true');
      if (isClean) {
        const saved = localStorage.getItem('erp_stock_transfers_v1');
        return saved ? JSON.parse(saved) : [];
      }
      const saved = localStorage.getItem('erp_stock_transfers_v1');
      if (saved) return JSON.parse(saved);
    } catch {}
    const isClean =
      typeof window !== 'undefined' &&
      (localStorage.getItem('erp_clean_production_mode_v1') === 'true' ||
        localStorage.getItem('erp_sample_data_cleaned') === 'true');
    if (isClean) return [];
    return [
      {
        id: 'tr-001',
        voucherNumber: 'TR-2026-0001',
        date: new Date().toISOString().split('T')[0],
        fromWarehouseId: 'wh-main',
        fromWarehouseName: 'المستودع الرئيسي - الجملة',
        toWarehouseId: 'wh-retail',
        toWarehouseName: 'معرض البيع المباشر - التجزئة',
        driverName: 'صادق المريسي',
        vehicleNumber: 'نقل 10294',
        items: [
          {
            productId: 'p1',
            productName: 'حليب نيدو مجفف 2.5 كجم',
            sku: 'FOOD-NID-001',
            unit: 'CARTON',
            unitName: 'كرتون',
            factor: 6,
            quantity: 10,
            totalPieces: 60,
            notes: 'تغذية أرفف المعرض',
          },
        ],
        totalPieces: 60,
        notes: 'تغذية صباحية لمعرض التجزئة',
        status: 'COMPLETED',
        createdAt: new Date().toISOString(),
        createdBy: 'أمين المستودع الرئيسي',
      },
      {
        id: 'tr-002',
        voucherNumber: 'TR-2026-0002',
        date: new Date().toISOString().split('T')[0],
        fromWarehouseId: 'wh-battery',
        fromWarehouseName: 'فرع البطاريات والزيوت',
        toWarehouseId: 'wh-van',
        toWarehouseName: 'مستودع سيارة التوزيع (مندوب المبيعات)',
        driverName: 'صدام الوادعي',
        vehicleNumber: 'جامبو #5421',
        items: [
          {
            productId: 'p2',
            productName: 'بطارية هانكوك 70 أمبير جافة',
            sku: 'BAT-HK-70',
            unit: 'PIECE',
            unitName: 'حبة',
            factor: 1,
            quantity: 15,
            totalPieces: 15,
            notes: 'شحنة خط سير اليوم',
          },
        ],
        totalPieces: 15,
        notes: 'تحميل خط سير مندوب التوزيع الأمانة',
        status: 'COMPLETED',
        createdAt: new Date().toISOString(),
        createdBy: 'مسؤول فرع البطاريات',
      },
    ];
  });

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedTransferForView, setSelectedTransferForView] = useState<StockTransferVoucher | null>(null);

  // New Transfer Form State
  const [newTransfer, setNewTransfer] = useState<{
    fromWarehouseId: string;
    toWarehouseId: string;
    driverName: string;
    vehicleNumber: string;
    notes: string;
    items: {
      productId: string;
      unit: 'PIECE' | 'CARTON';
      quantity: string;
      notes: string;
    }[];
  }>({
    fromWarehouseId: 'wh-main',
    toWarehouseId: 'wh-retail',
    driverName: '',
    vehicleNumber: '',
    notes: '',
    items: [
      {
        productId: '',
        unit: 'CARTON',
        quantity: '1',
        notes: '',
      },
    ],
  });

  // Products and movements data
  const [products, setProducts] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [activityFilter, setActivityFilter] = useState<ProductActivityType | 'ALL'>('ALL');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Sub-tab 2: Physical Audit state (counts keyed by productId)
  const [physicalCounts, setPhysicalCounts] = useState<Record<string, number>>({});
  const [auditNotes, setAuditNotes] = useState<Record<string, string>>({});
  const [isApplyingAudit, setIsApplyingAudit] = useState(false);

  // Sub-tab 3: Battery Warranty search query & result
  const [warrantySearch, setWarrantySearch] = useState('');
  const [warrantyResult, setWarrantyResult] = useState<any | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [movRes, prodRes] = await Promise.all([
        api.getInventoryMovements({
          search: searchQuery,
          type: typeFilter,
        }),
        api.getProducts(),
      ]);

      const prods = Array.isArray(prodRes) ? prodRes : (prodRes?.data || prodRes?.items || []);
      const localMovs = (() => {
        try {
          return JSON.parse(localStorage.getItem('erp_inventory_movements_v1') || '[]');
        } catch {
          return [];
        }
      })();
      const serverMovs = Array.isArray(movRes) ? movRes : (movRes?.data || movRes?.items || []);
      const mergedMovs = [...localMovs];
      serverMovs.forEach((sm: any) => {
        if (!mergedMovs.some((m) => m.id === sm.id || (m.referenceNumber && m.referenceNumber === sm.reference_number))) {
          mergedMovs.push(sm);
        }
      });

      setMovements(mergedMovs);
      setProducts(prods);

      // Initialize physical counts with current book stock
      const initialCounts: Record<string, number> = {};
      prods.forEach((p: any) => {
        initialCounts[p.id] = Number(p.current_stock ?? p.qty ?? 0);
      });
      setPhysicalCounts(initialCounts);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل بيانات المخزون والجرد');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const handleWiped = () => {
      setTransfers([]);
      setPhysicalCounts({});
      setAuditNotes({});
      fetchData();
    };
    const handleInvUpdated = () => {
      fetchData();
    };
    window.addEventListener('erp-demo-data-wiped', handleWiped);
    window.addEventListener('erp-inventory-updated', handleInvUpdated);
    window.addEventListener('erp-data-updated', handleInvUpdated);
    window.addEventListener('storage', handleInvUpdated);
    return () => {
      window.removeEventListener('erp-demo-data-wiped', handleWiped);
      window.removeEventListener('erp-inventory-updated', handleInvUpdated);
      window.removeEventListener('erp-data-updated', handleInvUpdated);
      window.removeEventListener('storage', handleInvUpdated);
    };
  }, [typeFilter]);

  // Stock breakdown helper (Cartons + Pieces + Remainder)
  const getStockBreakdown = (prod: any) => {
    const metrics = computeLiveProductStockMetrics(prod);
    const { majorCount, remainderSub, majorFactor, majorUnitName, baseUnitName } = metrics;
    if (majorFactor > 1 && majorUnitName) {
      return remainderSub > 0
        ? `${majorCount} ${majorUnitName} + ${remainderSub} ${baseUnitName}`
        : `${majorCount} ${majorUnitName}`;
    }
    return `${metrics.currentStock} ${baseUnitName}`;
  };

  // Filtered products list
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      !searchQuery.trim() ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.barcode && p.barcode.includes(searchQuery));
    const matchesActivity = activityFilter === 'ALL' || p.activityType === activityFilter;
    return matchesSearch && matchesActivity;
  });

  // Handle Physical Audit Input Change
  const handlePhysicalCountChange = (productId: string, val: number) => {
    setPhysicalCounts((prev) => ({
      ...prev,
      [productId]: Math.max(0, val),
    }));
  };

  // Commit and apply physical inventory adjustments
  const handleApplyInventoryAudit = async () => {
    try {
      setIsApplyingAudit(true);
      setError(null);

      // Find items with variances
      const itemsToAdjust = products.filter((p) => {
        const bookStock = Number(p.current_stock ?? p.qty ?? 0);
        const actualCount = physicalCounts[p.id] !== undefined ? physicalCounts[p.id] : bookStock;
        return actualCount !== bookStock;
      });

      if (itemsToAdjust.length === 0) {
        setSuccess('كافة الأرصدة الفعلية متطابقة تماماً مع الرصيد الدفتري، لا توجد فروقات للتسوية.');
        setTimeout(() => setSuccess(null), 4000);
        return;
      }

      // Process adjustments and calculate total variance value
      let totalVarianceValue = 0;
      for (const item of itemsToAdjust) {
        const bookStock = Number(item.current_stock ?? item.qty ?? 0);
        const actualCount = physicalCounts[item.id];
        const diff = actualCount - bookStock;
        const costPrice = Number(item.purchase_price ?? item.cost_price ?? 0);
        totalVarianceValue += Math.abs(diff * costPrice);
        const reason = auditNotes[item.id] || `تسوية جرد فعلي معتمد (فارق: ${diff > 0 ? '+' : ''}${diff})`;

        await api.adjustStock(item.id, {
          quantity: diff,
          reason,
          type: diff >= 0 ? 'IN' : 'ADJUSTMENT',
        });
      }

      // Post balanced accounting entry to General Ledger
      fetch('/api/v1/ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_date: new Date().toISOString().split('T')[0],
          date: new Date().toISOString().split('T')[0],
          account_type: 'INVENTORY_ADJUSTMENT',
          account_name: 'تسوية الجرد المخزني وفروقات الأرصدة',
          reference_type: 'STOCKTAKE_AUDIT',
          reference_id: `AUDIT-${Date.now()}`,
          debit: totalVarianceValue,
          credit: totalVarianceValue,
          description: `اعتماد وتسوية جردية معتمدة لـ ${itemsToAdjust.length} أصناف بالمستودع`,
          created_by_name: 'مسؤول الجرد والمستودعات',
        }),
      }).catch((err) => console.warn('Ledger audit post sync failed:', err));

      setSuccess(`تم بنجاح اعتماد الجرد المخزني وتسوية فروقات ${itemsToAdjust.length} صنف وتحديث الأرصدة وقيود دفتر الأستاذ!`);
      await fetchData();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء اعتماد وتسوية الجرد');
    } finally {
      setIsApplyingAudit(false);
    }
  };

  // Warranty Checker Search Action
  const handleWarrantySearch = (term?: string) => {
    const query = (term || warrantySearch).trim().toLowerCase();
    if (!query) {
      setWarrantyResult(null);
      return;
    }

    const isClean =
      typeof window !== 'undefined' &&
      (localStorage.getItem('erp_clean_production_mode_v1') === 'true' ||
        localStorage.getItem('erp_sample_data_cleaned') === 'true');

    // Battery Serial lookup database (empty in clean production mode)
    const sampleWarrantyDb = isClean
      ? []
      : [
      {
        serialNumber: 'SN-BAT-70-2026',
        productName: 'بطارية هانكوك 70 أمبير جافة',
        batterySpec: '70Ah - 12V SMF',
        warrantyMonths: 12,
        purchaseDate: '2026-03-10',
        warrantyEndDate: '2027-03-10',
        customerName: 'مؤسسة الأفق للتجارة والتوكيلات',
        customerPhone: '967771234567',
        invoiceNumber: 'INV-2026-0042',
        scrapDiscountValue: 50,
      },
      {
        serialNumber: 'SN-BAT-100-2025',
        productName: 'بطارية إيه سي ديلكو 100 أمبير ياباني',
        batterySpec: '100Ah - 12V Heavy Duty',
        warrantyMonths: 12,
        purchaseDate: '2025-05-15',
        warrantyEndDate: '2026-05-15',
        customerName: 'شركة الوفاق للنقليات',
        customerPhone: '967733445566',
        invoiceNumber: 'INV-2025-0819',
        scrapDiscountValue: 70,
      },
      {
        serialNumber: 'SN-BAT-55-2026',
        productName: 'بطارية كلورايد ذهبية 55 أمبير',
        batterySpec: '55Ah - 12V Sealed',
        warrantyMonths: 6,
        purchaseDate: '2026-08-01',
        warrantyEndDate: '2027-02-01',
        customerName: 'علي بن أحمد الكاف',
        customerPhone: '966501234567',
        invoiceNumber: 'INV-2026-0040',
        scrapDiscountValue: 40,
      },
      {
        serialNumber: 'DOT-TIRE-205-55-R16',
        productName: 'إطار يوكوهاما ياباني 205/55 R16',
        batterySpec: 'مقاس: 205/55 R16 | DOT: الأسبوع 40 - 2025 | ياباني 8 غاط',
        warrantyMonths: 12,
        purchaseDate: '2026-02-10',
        warrantyEndDate: '2027-02-10',
        customerName: 'مؤسسة السلام للمقاولات',
        customerPhone: '967770001122',
        invoiceNumber: 'INV-2026-0095',
        scrapDiscountValue: 0,
      },
      {
        serialNumber: 'DOT-TIRE-265-65-R17',
        productName: 'إطار بريدجستون هانكوك 265/65 R17',
        batterySpec: 'مقاس: 265/65 R17 | DOT: الأسبوع 12 - 2026 | كوري أصلي',
        warrantyMonths: 18,
        purchaseDate: '2026-03-01',
        warrantyEndDate: '2027-09-01',
        customerName: 'مجموعة المجد للنقل السريع',
        customerPhone: '967733998877',
        invoiceNumber: 'INV-2026-0112',
        scrapDiscountValue: 0,
      },
    ];

    const found = sampleWarrantyDb.find(
      (item) =>
        item.serialNumber.toLowerCase().includes(query) ||
        item.invoiceNumber.toLowerCase().includes(query) ||
        item.customerPhone.includes(query) ||
        item.customerName.toLowerCase().includes(query)
    );

    if (found) {
      const now = new Date();
      const end = new Date(found.warrantyEndDate);
      const isUnderWarranty = end.getTime() >= now.getTime();
      const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      setWarrantyResult({
        ...found,
        isUnderWarranty,
        diffDays,
      });
    } else {
      setWarrantyResult({ notFound: true, query });
    }
  };

  // Expirations Radar items (Products with activityType food or having expiryDate)
  const expiringFoodItems = products
    .filter((p) => p.activityType === 'food' || p.expiryDate)
    .map((p) => {
      const now = new Date();
      const expDate = p.expiryDate ? new Date(p.expiryDate) : null;
      const daysLeft = expDate ? Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 999;
      return {
        ...p,
        daysLeft,
      };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft);

  // Add item row to new transfer
  const handleAddTransferItemRow = () => {
    setNewTransfer((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { productId: '', unit: 'CARTON', quantity: '1', notes: '' },
      ],
    }));
  };

  // Remove item row from new transfer
  const handleRemoveTransferItemRow = (index: number) => {
    setNewTransfer((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  // Update item row in new transfer
  const handleUpdateTransferItemRow = (index: number, field: string, val: any) => {
    setNewTransfer((prev) => {
      const updated = [...prev.items];
      updated[index] = { ...updated[index], [field]: val };
      return { ...prev, items: updated };
    });
  };

  // Save and post Stock Transfer Voucher
  const handleSaveTransferVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newTransfer.fromWarehouseId === newTransfer.toWarehouseId) {
      setError('لا يمكن التحويل من وإلى نفس المستودع، يرجى اختيار مستودعين مختلفين');
      return;
    }

    const validItems = newTransfer.items.filter((it) => it.productId && Number(it.quantity) > 0);
    if (validItems.length === 0) {
      setError('يرجى اختيار صنف واحد على الأقل وتحديد كمية أكبر من صفر للتحويل');
      return;
    }

    try {
      const fromWh = warehouses.find((w) => w.id === newTransfer.fromWarehouseId);
      const toWh = warehouses.find((w) => w.id === newTransfer.toWarehouseId);

      const voucherNumber = `TR-${new Date().getFullYear()}-${String(transfers.length + 1).padStart(4, '0')}`;
      let totalPiecesCalculated = 0;

      const preparedItems: StockTransferItem[] = validItems.map((it) => {
        const prod = products.find((p) => p.id === it.productId);
        const factor = Number(prod?.majorUnitFactor ?? prod?.major_unit_factor ?? 1);
        const qty = Number(it.quantity);
        const totalPieces = it.unit === 'CARTON' ? qty * factor : qty;
        totalPiecesCalculated += totalPieces;

        return {
          productId: it.productId,
          productName: prod?.name || 'صنف غير محدد',
          sku: prod?.sku || '',
          unit: it.unit,
          unitName: it.unit === 'CARTON' ? (prod?.majorUnitName || 'كرتون') : (prod?.baseUnitName || 'حبة'),
          factor,
          quantity: qty,
          totalPieces,
          notes: it.notes,
        };
      });

      const newVoucher: StockTransferVoucher = {
        id: `tr_${Date.now()}`,
        voucherNumber,
        date: new Date().toISOString().split('T')[0],
        fromWarehouseId: newTransfer.fromWarehouseId,
        fromWarehouseName: fromWh?.name || 'مستودع المصدر',
        toWarehouseId: newTransfer.toWarehouseId,
        toWarehouseName: toWh?.name || 'مستودع الوجهة',
        driverName: newTransfer.driverName || 'المندوب / السائق المعتمد',
        vehicleNumber: newTransfer.vehicleNumber,
        items: preparedItems,
        totalPieces: totalPiecesCalculated,
        notes: newTransfer.notes,
        status: 'COMPLETED',
        createdAt: new Date().toISOString(),
        createdBy: 'مدير العمليات المخزنية',
      };

      const updatedTransfers = [newVoucher, ...transfers];
      setTransfers(updatedTransfers);
      localStorage.setItem('erp_stock_transfers_v1', JSON.stringify(updatedTransfers));

      // Attempt to record adjustment stock movements
      for (const item of preparedItems) {
        try {
          await api.adjustStock(item.productId, {
            quantity: item.totalPieces,
            reason: `تحويل مخزني (${voucherNumber}): من ${fromWh?.name} إلى ${toWh?.name}`,
            type: 'TRANSFER' as any,
          });
        } catch {}
      }

      setSuccess(`تم بنجاح تسجيل وترحيل سند التحويل المخزني (${voucherNumber}) وتحديث الأرصدة!`);
      setIsTransferModalOpen(false);
      setNewTransfer({
        fromWarehouseId: 'wh-main',
        toWarehouseId: 'wh-retail',
        driverName: '',
        vehicleNumber: '',
        notes: '',
        items: [{ productId: '', unit: 'CARTON', quantity: '1', notes: '' }],
      });
      fetchData();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message || 'فشل حفظ سند التحويل المخزني');
    }
  };

  // Printable Official Stock Transfer Slip
  const handlePrintTransferSlip = (voucher: StockTransferVoucher) => {
    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; color: #1e293b; padding: 24px; max-width: 800px; margin: auto;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f766e; padding-bottom: 14px; margin-bottom: 16px;">
          <div>
            <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #0f766e;">إذن ومستند تحويل مخزني رسمي</h1>
            <p style="margin: 4px 0 0; font-size: 12px; color: #64748b;">نظام إدارة المستودعات والتحويلات البينية (Inter-Warehouse Stock Transfer)</p>
          </div>
          <div style="text-align: left; font-family: monospace;">
            <div style="font-size: 15px; font-weight: bold; color: #0f172a;">${voucher.voucherNumber}</div>
            <div style="font-size: 11px; color: #64748b;">التاريخ: ${voucher.date}</div>
            <div style="display: inline-block; background: #ecfdf5; color: #065f46; font-size: 10px; font-weight: bold; padding: 2px 8px; border-radius: 9999px; margin-top: 4px; border: 1px solid #a7f3d0;">
              معتمد ومرحل مخزنياً ✅
            </div>
          </div>
        </div>

        <!-- Routing Info Cards -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; font-size: 12px;">
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
            <div style="font-weight: bold; color: #dc2626; margin-bottom: 4px;">🔻 من مستودع (المصدر):</div>
            <div style="font-weight: bold; font-size: 13px; color: #0f172a;">${voucher.fromWarehouseName}</div>
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
            <div style="font-weight: bold; color: #16a34a; margin-bottom: 4px;">🟢 إلى مستودع (الوجهة):</div>
            <div style="font-weight: bold; font-size: 13px; color: #0f172a;">${voucher.toWarehouseName}</div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; font-size: 11px; background: #f1f5f9; padding: 10px 14px; border-radius: 8px; margin-bottom: 16px;">
          <div><strong>السائق / الناقل:</strong> ${voucher.driverName || 'المندوب المعتمد'}</div>
          ${voucher.vehicleNumber ? `<div><strong>رقم وسيلة النقل / السيارة:</strong> <span style="font-family: monospace;">${voucher.vehicleNumber}</span></div>` : ''}
          <div><strong>بيان التحويل:</strong> ${voucher.notes || 'تحويل مخزني لتغذية المخزون'}</div>
        </div>

        <!-- Table of items -->
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px;">
          <thead>
            <tr style="background: #0f766e; color: #ffffff;">
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; width: 35px;">#</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">الصنف والبيان</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">رمز الصنف SKU</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">الوحدة المحولة</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">الكمية بالوحدة</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">معامل الكرتون</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">إجمالي الحبات</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            ${voucher.items.map((it, idx) => `
              <tr style="border-bottom: 1px solid #e2e8f0; background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                <td style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: center; font-family: monospace;">${idx + 1}</td>
                <td style="padding: 6px 8px; border: 1px solid #e2e8f0; font-weight: bold;">${it.productName}</td>
                <td style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: center; font-family: monospace;">${it.sku || '-'}</td>
                <td style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: center;">${it.unit === 'CARTON' ? 'كرتون (جملة)' : 'حبة (مفرد)'}</td>
                <td style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: center; font-family: monospace; font-weight: bold;">${it.quantity}</td>
                <td style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: center; font-family: monospace;">${it.factor > 1 ? `1 = ${it.factor}` : '1'}</td>
                <td style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: center; font-family: monospace; font-weight: bold; color: #0f766e;">${it.totalPieces}</td>
                <td style="padding: 6px 8px; border: 1px solid #e2e8f0;">${it.notes || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background: #e6fffa; font-weight: bold; border-top: 2px solid #0f766e;">
              <td colspan="4" style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">إجمالي الأصناف والكمية المحولة:</td>
              <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; font-family: monospace;">${voucher.items.reduce((s, i) => s + i.quantity, 0)}</td>
              <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">—</td>
              <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; font-family: monospace; font-size: 13px; color: #0f766e;">${voucher.totalPieces} حبة</td>
              <td style="padding: 8px; border: 1px solid #cbd5e1;"></td>
            </tr>
          </tfoot>
        </table>

        <!-- Signatures Grid -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 35px; text-align: center; font-size: 11px;">
          <div style="border-top: 1px dashed #94a3b8; padding-top: 8px;">
            <div style="font-weight: bold; color: #0f172a;">أمين مستودع المصدر</div>
            <div style="color: #64748b; margin-top: 25px;">التوقيع: ....................</div>
          </div>
          <div style="border-top: 1px dashed #94a3b8; padding-top: 8px;">
            <div style="font-weight: bold; color: #0f172a;">السائق / المندوب الناقل</div>
            <div style="color: #64748b; margin-top: 25px;">التوقيع: ....................</div>
          </div>
          <div style="border-top: 1px dashed #94a3b8; padding-top: 8px;">
            <div style="font-weight: bold; color: #0f172a;">أمين مستودع المستلم</div>
            <div style="color: #64748b; margin-top: 25px;">التوقيع: ....................</div>
          </div>
          <div style="border-top: 1px dashed #94a3b8; padding-top: 8px;">
            <div style="font-weight: bold; color: #0f172a;">الاعتماد الإداري / المالي</div>
            <div style="color: #64748b; margin-top: 25px;">الختم والتوقيع</div>
          </div>
        </div>
      </div>
    `;

    renderAndPrintDocument(html, {
      documentTitle: `سند_تحويل_مخزني_${voucher.voucherNumber}`,
      pageSize: 'A4',
    });
  };

  return (
    <div className="space-y-6 text-right text-[var(--md-on-surface)] font-sans" dir="rtl">

      {/* Header */}
      <div className="m3-card p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-[var(--md-radius-md)] bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border border-[var(--md-outline-variant)] flex items-center justify-center shrink-0">
                <Boxes className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-[var(--md-on-surface)] tracking-tight flex items-center gap-2 flex-wrap">
                  <span>إدارة المستودع والجرد الذكي</span>
                  <span className="m3-badge m3-badge-primary text-[10px] font-mono">
                    Warehouse & Inventory Suite
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-[var(--md-on-surface-variant)] font-medium mt-0.5">
                  متابعة الأرصدة بالكرتون والقطعة، الجرد الفعلي وتسوية العجز والفائض، ورادار تواريخ الصلاحية وفحص ضمان وسيريال البطاريات
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Module Settings Modal Button */}
            <ModuleSettingsModal module="inventory" buttonLabel="⚙️ إعدادات القسم" />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MULTI-WAREHOUSE & BRANCH BAR (إدارة المستودعات والفروع وسندات التحويل)   */}
      {/* ========================================================================= */}
      <div className="m3-card p-4 border-[var(--md-primary)]/30 bg-[var(--md-primary-container)]/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[var(--md-radius-md)] bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-[var(--md-on-surface)]">إدارة المستودعات والفروع وتوزيع المخزون</h3>
              <span className="m3-badge m3-badge-primary text-[10px] font-mono tabular-nums">
                {warehouses.length} مستودعات وفروع
              </span>
            </div>
            <p className="text-[11px] text-[var(--md-on-surface-variant)] mt-0.5">
              {selectedWarehouseId === 'ALL'
                ? 'عرض المخزون المجمّع لكافة المستودعات والفروع ومستودعات سيارات التوزيع'
                : `المستودع المحدد: ${warehouses.find((w) => w.id === selectedWarehouseId)?.name} • المسؤول: ${warehouses.find((w) => w.id === selectedWarehouseId)?.manager}`}
            </p>
          </div>
        </div>

        {/* Warehouse Selector & New Transfer Button */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-1 bg-[var(--md-surface-container-low)] p-1 rounded-[var(--md-radius-md)] border border-[var(--md-outline-variant)] text-xs overflow-x-auto">
            <button
              onClick={() => setSelectedWarehouseId('ALL')}
              className={`px-3 py-1.5 rounded-[var(--md-radius-sm)] font-bold text-xs transition-all cursor-pointer whitespace-nowrap ${
                selectedWarehouseId === 'ALL'
                  ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)] shadow-sm'
                  : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-high)]'
              }`}
            >
              كافة المستودعات
            </button>
            {warehouses.map((wh) => (
              <button
                key={wh.id}
                onClick={() => setSelectedWarehouseId(wh.id)}
                className={`px-2.5 py-1.5 rounded-[var(--md-radius-sm)] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  selectedWarehouseId === wh.id
                    ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)] shadow-sm'
                    : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-high)]'
                }`}
              >
                {wh.type === 'VAN' ? (
                  <Truck className={`w-3.5 h-3.5 ${selectedWarehouseId === wh.id ? '' : 'text-[var(--md-warning)]'}`} />
                ) : (
                  <Building2 className={`w-3.5 h-3.5 ${selectedWarehouseId === wh.id ? '' : 'text-[var(--md-primary-text)]'}`} />
                )}
                <span className="max-w-[120px] truncate">{wh.name.split(' - ')[0]}</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsTransferModalOpen(true)}
            className="m3-btn-tonal text-xs shrink-0"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>+ سند تحويل مخزني</span>
          </button>
        </div>
      </div>

      {/* 4 Main Sub-Tabs Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-[var(--md-outline-variant)] pb-2.5 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSubTab('movements_balances')}
          className={`px-4 py-2.5 rounded-[var(--md-radius-md)] font-bold text-xs sm:text-sm flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer border ${
            activeSubTab === 'movements_balances'
              ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)] border-[var(--md-primary)] shadow-sm'
              : 'bg-[var(--md-surface-container)] border-[var(--md-outline-variant)] text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-high)]'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>حركة وأرصدة المستودع</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono tabular-nums ${
            activeSubTab === 'movements_balances'
              ? 'bg-white/20 text-[var(--md-on-primary)]'
              : 'bg-[var(--md-surface-container-high)] text-[var(--md-on-surface-variant)]'
          }`}>
            {products.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('physical_audit')}
          className={`px-4 py-2.5 rounded-[var(--md-radius-md)] font-bold text-xs sm:text-sm flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer border ${
            activeSubTab === 'physical_audit'
              ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)] border-[var(--md-primary)] shadow-sm'
              : 'bg-[var(--md-surface-container)] border-[var(--md-outline-variant)] text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-high)]'
          }`}
        >
          <PackageCheck className="w-4 h-4" />
          <span>الجرد المخزني الفعلي وتسوية الفروقات</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
            activeSubTab === 'physical_audit'
              ? 'bg-white/20 text-[var(--md-on-primary)]'
              : 'bg-[var(--md-info-container)] text-[var(--md-on-info-container)]'
          }`}>
            تسوية بنقرة واحدة
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('expiry_warranty_radar')}
          className={`px-4 py-2.5 rounded-[var(--md-radius-md)] font-bold text-xs sm:text-sm flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer border ${
            activeSubTab === 'expiry_warranty_radar'
              ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)] border-[var(--md-primary)] shadow-sm'
              : 'bg-[var(--md-surface-container)] border-[var(--md-outline-variant)] text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-high)]'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>رادار الصلاحية وفاحص ضمان البطاريات والإطارات</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
            activeSubTab === 'expiry_warranty_radar'
              ? 'bg-white/20 text-[var(--md-on-primary)]'
              : 'bg-[var(--md-warning-container)] text-[var(--md-on-warning-container)]'
          }`}>
            FEFO + كود DOT
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('stock_transfers')}
          className={`px-4 py-2.5 rounded-[var(--md-radius-md)] font-bold text-xs sm:text-sm flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer border ${
            activeSubTab === 'stock_transfers'
              ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)] border-[var(--md-primary)] shadow-sm'
              : 'bg-[var(--md-surface-container)] border-[var(--md-outline-variant)] text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-high)]'
          }`}
        >
          <ArrowLeftRight className="w-4 h-4" />
          <span>سندات التحويل بين الفروع والمستودعات</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold tabular-nums ${
            activeSubTab === 'stock_transfers'
              ? 'bg-white/20 text-[var(--md-on-primary)]'
              : 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)]'
          }`}>
            {transfers.length}
          </span>
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-[var(--md-error-container)] border border-[var(--md-error)]/30 rounded-[var(--md-radius-md)] text-[var(--md-on-error-container)] text-xs sm:text-sm flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-[var(--md-success-container)] border border-[var(--md-success)]/30 rounded-[var(--md-radius-md)] text-[var(--md-on-success-container)] text-xs sm:text-sm flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="font-semibold">{success}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 1: حركة وأرصدة المستودع (Carton + Piece Stock Breakdown) */}
      {/* ========================================================================= */}
      {activeSubTab === 'movements_balances' && (
        <div className="space-y-6">
          {/* Summary KPI Cards for Inventory */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="m3-card p-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-[var(--md-on-surface-variant)] block mb-1">إجمالي الأصناف المسجلة</span>
                <span className="text-xl font-bold font-mono text-[var(--md-on-surface)] tabular-nums">{products.length} صنف</span>
              </div>
              <div className="w-10 h-10 rounded-[var(--md-radius-md)] bg-[var(--md-info-container)] text-[var(--md-on-info-container)] flex items-center justify-center shrink-0">
                <Boxes className="w-5 h-5" />
              </div>
            </div>

            <div className="m3-card p-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-[var(--md-on-surface-variant)] block mb-1">مبيعات المخزون اليوم</span>
                <span className="text-xl font-bold font-mono text-[var(--md-info)] tabular-nums">
                  {formatNumber(products.reduce((acc, p) => acc + Number(p.soldToday || 0), 0))} قطعة
                </span>
              </div>
              <div className="w-10 h-10 rounded-[var(--md-radius-md)] bg-[var(--md-info-container)] text-[var(--md-on-info-container)] flex items-center justify-center shrink-0">
                <ArrowUpLeft className="w-5 h-5" />
              </div>
            </div>

            <div className="m3-card p-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-[var(--md-on-surface-variant)] block mb-1">البضاعة المتبقية بالمستودع</span>
                <span className="text-xl font-bold font-mono text-[var(--md-success)] tabular-nums">
                  {formatNumber(products.reduce((acc, p) => acc + Number(p.current_stock ?? p.qty ?? 0), 0))} قطعة
                </span>
              </div>
              <div className="w-10 h-10 rounded-[var(--md-radius-md)] bg-[var(--md-success-container)] text-[var(--md-on-success-container)] flex items-center justify-center shrink-0">
                <PackageCheck className="w-5 h-5" />
              </div>
            </div>

            <div className="m3-card p-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-[var(--md-on-surface-variant)] block mb-1">حركات المخزون المسجلة</span>
                <span className="text-xl font-bold font-mono text-[var(--md-warning)] tabular-nums">{movements.length} حركة</span>
              </div>
              <div className="w-10 h-10 rounded-[var(--md-radius-md)] bg-[var(--md-warning-container)] text-[var(--md-on-warning-container)] flex items-center justify-center shrink-0">
                <History className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Activity Filter & Search Bar */}
          <div className="m3-card p-4 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full max-w-md">
              <Search className="w-4 h-4 text-[var(--md-on-surface-variant)] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="البحث باسم المنتج، SKU، أو الباركود..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="m3-input !h-10 !pr-9 text-xs"
              />
            </div>

            {/* Activity Type Filter Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
              {[
                { id: 'ALL', label: 'كافة الأنشطة' },
                { id: 'food', label: '🍏 أغذية' },
                { id: 'battery', label: '⚡ بطاريات' },
                { id: 'oil', label: '🛢️ زيوت' },
                { id: 'general', label: '📦 عام' },
              ].map((act) => (
                <button
                  key={act.id}
                  type="button"
                  onClick={() => setActivityFilter(act.id as any)}
                  className={`px-3 py-1.5 rounded-[var(--md-radius-md)] text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
                    activityFilter === act.id
                      ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)] border-[var(--md-primary)]'
                      : 'bg-[var(--md-surface-container-low)] hover:bg-[var(--md-surface-container-high)] text-[var(--md-on-surface-variant)] border-[var(--md-outline-variant)]'
                  }`}
                >
                  {act.label}
                </button>
              ))}
            </div>
          </div>

          {/* Stock Balances Table with Carton + Piece breakdown */}
          <div className="m3-card overflow-hidden">
            <div className="p-4 border-b border-[var(--md-outline-variant)] bg-[var(--md-surface-container-low)] flex items-center justify-between">
              <h3 className="font-bold text-[var(--md-on-surface)] text-sm flex items-center gap-2">
                <Boxes className="w-4 h-4 text-[var(--md-primary-text)]" />
                <span>أرصدة المستودع مع تفصيل الكراتين والقطع</span>
              </h3>
              <span className="text-xs text-[var(--md-on-surface-variant)] tabular-nums">
                إجمالي الأصناف: <strong className="text-[var(--md-primary-text)] font-mono">{filteredProducts.length}</strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="m3-table text-right text-xs">
                <thead className="m3-thead">
                  <tr>
                    <th className="m3-th">الصنف / النشاط</th>
                    <th className="m3-th">الرمز SKU</th>
                    <th className="m3-th">الوارد / الافتتاحي</th>
                    <th className="m3-th !text-[var(--md-info)]">المباع اليوم</th>
                    <th className="m3-th !text-[var(--md-secondary)]">إجمالي المباع</th>
                    <th className="m3-th !text-[var(--md-success)]">الرصيد المتبقي الفعلي</th>
                    <th className="m3-th !text-[var(--md-primary-text)]">التفصيل بالكرتون والوحدة</th>
                    <th className="m3-th">حد الأمان</th>
                    <th className="m3-th">حالة التوفر</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--md-outline-variant)] font-medium">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-[var(--md-on-surface-variant)]">
                        <Loader2 className="w-6 h-6 animate-spin text-[var(--md-primary-text)] mx-auto" />
                      </td>
                    </tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-[var(--md-on-surface-variant)]">
                        لا توجد أصناف مطابقة للبحث أو الفلتر.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((prod) => {
                      const m = computeLiveProductStockMetrics(prod);
                      const stock = m.remainingStock;
                      const totalSold = m.totalSold;
                      const soldToday = m.soldToday;
                      const incomingTotal = m.totalIncoming;
                      const minStock = Number(prod.min_stock_level ?? 5);
                      const isLow = stock <= minStock;

                      return (
                        <tr key={prod.id} className="hover:bg-[var(--md-surface-container-low)] transition-colors">
                          <td className="p-3.5 font-bold text-[var(--md-on-surface)]">
                            <div>{prod.name}</div>
                            <div className="text-[10px] text-[var(--md-on-surface-variant)] font-normal mt-0.5">
                              {prod.activityType === 'food'
                                ? '🍏 مواد غذائية'
                                : prod.activityType === 'battery'
                                ? '⚡ بطاريات وأجهزة'
                                : prod.activityType === 'oil'
                                ? '🛢️ زيوت وقطع غيار'
                                : '📦 عام'}
                              {prod.category ? ` • ${prod.category}` : ''}
                            </div>
                          </td>
                          <td className="p-3.5 font-mono text-[var(--md-on-surface-variant)] tabular-nums">{prod.sku || '-'}</td>
                          <td className="p-3.5 font-mono font-bold text-[var(--md-on-surface)] tabular-nums" title={m.formattedIncoming}>
                            {formatNumber(incomingTotal)} {m.baseUnitName}
                          </td>
                          <td className="p-3.5 font-mono font-bold text-[var(--md-info)] tabular-nums">
                            {formatNumber(soldToday)}
                          </td>
                          <td className="p-3.5 font-mono font-bold text-[var(--md-secondary)] tabular-nums">
                            {formatNumber(totalSold)}
                          </td>
                          <td className="p-3.5 font-mono font-bold text-[var(--md-success)] tabular-nums" title={m.formattedRemaining}>
                            {formatNumber(stock)} {m.baseUnitName}
                          </td>
                          <td className="p-3.5 font-bold">
                            <span className="m3-badge m3-badge-primary font-mono text-[11px] tabular-nums">
                              {getStockBreakdown(prod)}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono text-[var(--md-on-surface-variant)] tabular-nums">{minStock}</td>
                          <td className="p-3.5">
                            <span
                              className={`m3-badge text-[10px] ${
                                stock <= 0
                                  ? 'm3-badge-error'
                                  : isLow
                                  ? 'm3-badge-warning'
                                  : 'm3-badge-success'
                              }`}
                            >
                              {stock <= 0 ? 'نفد من المخزن' : isLow ? 'قريب من النفاذ' : 'متوفر بالمخزن'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Movements Log Table */}
          <div className="m3-card overflow-hidden">
            <div className="p-4 border-b border-[var(--md-outline-variant)] bg-[var(--md-surface-container-low)] flex flex-col sm:flex-row items-center justify-between gap-3">
              <h3 className="font-bold text-[var(--md-on-surface)] text-sm flex items-center gap-2">
                <History className="w-4 h-4 text-[var(--md-primary-text)]" />
                <span>سجل حركات المخزون والوارد والمنصرف (Audit Log)</span>
              </h3>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="m3-select !h-9 !w-auto min-w-[180px] text-xs"
              >
                <option value="">كافة أنواع الحركات</option>
                <option value="IN">وارد للمخزن (IN)</option>
                <option value="OUT">صادر من المخزن (OUT)</option>
                <option value="ADJUSTMENT">تسوية جردية (ADJUSTMENT)</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="m3-table text-right text-xs">
                <thead className="m3-thead">
                  <tr>
                    <th className="m3-th">المنتج / الصنف</th>
                    <th className="m3-th">نوع الحركة</th>
                    <th className="m3-th">الكمية</th>
                    <th className="m3-th">الرصيد بعد الحركة</th>
                    <th className="m3-th">نوع المرجع</th>
                    <th className="m3-th">التاريخ والوقت</th>
                    <th className="m3-th">البيان والملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--md-outline-variant)] font-medium">
                  {movements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-[var(--md-on-surface-variant)]">
                        لا توجد حركات مخزنية مسجلة حالياً.
                      </td>
                    </tr>
                  ) : (
                    movements.map((mov) => {
                      const isPositive = mov.type === 'IN';
                      const isAdjustment = mov.type === 'ADJUSTMENT';

                        const prodName = mov.product_name || mov.productName || 'صنف غير محدد';
                        const remaining = mov.remaining_stock ?? mov.remainingStock ?? mov.afterStock ?? '-';
                        const refInfo = mov.reference_type || mov.referenceType || (mov.referenceNumber ? `مرجع: ${mov.referenceNumber}` : '-');
                        const movDate = mov.date || mov.createdAt || '';
                        const movNotes = mov.notes || mov.reason || '-';

                        return (
                          <tr key={mov.id} className="hover:bg-[var(--md-surface-container-low)] transition-colors">
                            <td className="p-3.5 font-bold text-[var(--md-on-surface)]">{prodName}</td>
                            <td className="p-3.5">
                              <span
                                className={`m3-badge text-[10px] ${
                                  isPositive
                                    ? 'm3-badge-success'
                                    : isAdjustment
                                    ? 'm3-badge-warning'
                                    : 'm3-badge-error'
                                }`}
                              >
                                {isPositive ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpLeft className="w-3 h-3" />}
                                <span>{isPositive ? 'وارد (IN)' : isAdjustment ? 'تسوية (ADJ)' : 'صادر (OUT)'}</span>
                              </span>
                            </td>
                            <td className="p-3.5 font-mono font-bold tabular-nums">
                              <span className={isPositive ? 'text-[var(--md-success)]' : 'text-[var(--md-error)]'}>
                                {isPositive ? `+${mov.quantity}` : `-${Math.abs(mov.quantity)}`}
                              </span>
                            </td>
                            <td className="p-3.5 font-mono text-[var(--md-on-surface)] font-bold tabular-nums">{remaining}</td>
                            <td className="p-3.5 text-[var(--md-on-surface-variant)] font-mono text-[11px]">{refInfo}</td>
                            <td className="p-3.5 text-[var(--md-on-surface-variant)] font-mono text-[11px] tabular-nums">
                              {movDate ? new Date(movDate).toLocaleString('ar-SA') : '-'}
                            </td>
                            <td className="p-3.5 text-[var(--md-on-surface-variant)] max-w-[200px] truncate">{movNotes}</td>
                          </tr>
                        );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: الجرد المخزني الفعلي وتسوية الفروقات (Physical Inventory Audit) */}
      {/* ========================================================================= */}
      {activeSubTab === 'physical_audit' && (
        <div className="space-y-6">
          {/* Top Audit Instructions & Summary Banner */}
          <div className="m3-card p-5 border-[var(--md-info)]/30 bg-[var(--md-info-container)]/25 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[var(--md-on-surface)] flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-[var(--md-info)]" />
                <span>منصة الجرد المخزني الفعلي ومطابقة الفروقات</span>
              </h3>
              <p className="text-xs text-[var(--md-on-surface-variant)]">
                أدخل الكميات الفعلية الموجودة على أرفف المستودع. يتم حساب الفارق المالي تلقائياً، وبنقرة واحدة يتم اعتماد الجرد وتوليد قيود التسوية.
              </p>
            </div>

            <button
              type="button"
              onClick={handleApplyInventoryAudit}
              disabled={isApplyingAudit}
              className="m3-btn-primary text-xs sm:text-sm shrink-0 disabled:opacity-50"
            >
              {isApplyingAudit ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري اعتماد وتسوية المخزون...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>اعتماد الجرد وتسوية المخزون فورياً</span>
                </>
              )}
            </button>
          </div>

          {/* Interactive Physical Audit Table */}
          <div className="m3-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="m3-table text-right text-xs">
                <thead className="m3-thead">
                  <tr>
                    <th className="m3-th">اسم الصنف / الكود</th>
                    <th className="m3-th">الرصيد الدفتري المسجل</th>
                    <th className="m3-th !text-[var(--md-info)]">الكمية الفعلية بالجرد (الواقع)</th>
                    <th className="m3-th">الفارق بالكمية</th>
                    <th className="m3-th">تكلفة الوحدة</th>
                    <th className="m3-th">قيمة الفارق المالي</th>
                    <th className="m3-th">حالة المطابقة</th>
                    <th className="m3-th">ملاحظات وسبب الفارق</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--md-outline-variant)] font-medium">
                  {products.map((prod) => {
                    const bookStock = Number(prod.current_stock ?? prod.qty ?? 0);
                    const physicalCount =
                      physicalCounts[prod.id] !== undefined ? physicalCounts[prod.id] : bookStock;
                    const diffQty = physicalCount - bookStock;
                    const costPrice = Number(prod.purchase_price ?? prod.cost_price ?? 0);
                    const diffValue = diffQty * costPrice;

                    return (
                      <tr key={prod.id} className="hover:bg-[var(--md-surface-container-low)] transition-colors">
                        <td className="p-3.5 font-bold text-[var(--md-on-surface)] max-w-[200px]">
                          <div className="truncate">{prod.name}</div>
                          <div className="text-[10px] text-[var(--md-on-surface-variant)] font-mono mt-0.5">{prod.sku || '-'}</div>
                        </td>

                        {/* Book Stock */}
                        <td className="p-3.5 font-mono font-bold text-[var(--md-on-surface)] tabular-nums">
                          {formatNumber(bookStock)} {prod.baseUnitName || prod.unit || 'حبة'}
                        </td>

                        {/* Physical Count Input */}
                        <td className="p-3.5">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={physicalCount}
                            onChange={(e) =>
                              handlePhysicalCountChange(prod.id, parseFloat(e.target.value) || 0)
                            }
                            className="m3-input !h-9 !w-24 font-mono font-bold text-center tabular-nums"
                          />
                        </td>

                        {/* Variance Qty */}
                        <td className="p-3.5 font-mono font-bold tabular-nums">
                          <span
                            className={
                              diffQty === 0
                                ? 'text-[var(--md-on-surface-variant)]'
                                : diffQty > 0
                                ? 'text-[var(--md-success)]'
                                : 'text-[var(--md-error)]'
                            }
                          >
                            {diffQty > 0 ? `+${diffQty}` : diffQty}
                          </span>
                        </td>

                        {/* Cost Price */}
                        <td className="p-3.5 font-mono text-[var(--md-on-surface-variant)] tabular-nums">{formatAmount(costPrice)}</td>

                        {/* Variance Value */}
                        <td className="p-3.5 font-mono font-bold tabular-nums">
                          <span
                            className={
                              diffValue === 0
                                ? 'text-[var(--md-on-surface-variant)]'
                                : diffValue > 0
                                ? 'text-[var(--md-success)]'
                                : 'text-[var(--md-error)]'
                            }
                          >
                            {formatAmount(diffValue)} YER
                          </span>
                        </td>

                        {/* Match Status Badge */}
                        <td className="p-3.5">
                          {diffQty === 0 ? (
                            <span className="m3-badge m3-badge-success text-[10px] w-max">
                              <CheckCircle2 className="w-3 h-3" />
                              مطابق تماماً
                            </span>
                          ) : diffQty > 0 ? (
                            <span className="m3-badge m3-badge-info text-[10px] w-max tabular-nums">
                              <ArrowDownRight className="w-3 h-3" />
                              فائض مخزني (+{diffQty})
                            </span>
                          ) : (
                            <span className="m3-badge m3-badge-error text-[10px] w-max tabular-nums">
                              <AlertTriangle className="w-3 h-3" />
                              عجز مخزني ({diffQty})
                            </span>
                          )}
                        </td>

                        {/* Notes input */}
                        <td className="p-3.5">
                          <input
                            type="text"
                            placeholder="سبب الفارق..."
                            value={auditNotes[prod.id] || ''}
                            onChange={(e) =>
                              setAuditNotes({ ...auditNotes, [prod.id]: e.target.value })
                            }
                            className="m3-input !h-9 min-w-[140px] text-xs"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: رادار الصلاحية وفاحص ضمان البطاريات (Expiry Radar & Battery Warranty) */}
      {/* ========================================================================= */}
      {activeSubTab === 'expiry_warranty_radar' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* PANEL 1: رادار صلاحية المواد الغذائية (FEFO Radar) */}
          <div className="m3-card p-5 space-y-4 flex flex-col">
            <div className="flex items-center justify-between border-b border-[var(--md-outline-variant)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-[var(--md-radius-md)] bg-[var(--md-warning-container)] text-[var(--md-on-warning-container)] flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[var(--md-on-surface)] text-sm">رادار تواريخ الصلاحية (FEFO Radar)</h3>
                  <p className="text-[11px] text-[var(--md-on-surface-variant)]">تنبيهات استباقية للأصناف القريبة من الانتهاء</p>
                </div>
              </div>
              <span className="m3-badge m3-badge-warning text-xs tabular-nums">
                {expiringFoodItems.length} صنف غذائي
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[500px] custom-scrollbar">
              {expiringFoodItems.length === 0 ? (
                <div className="text-center py-12 text-[var(--md-on-surface-variant)] text-xs">
                  لا توجد أصناف مسجلة بتاريخ صلاحية حالياً.
                </div>
              ) : (
                expiringFoodItems.map((item) => {
                  const isExpired = item.daysLeft <= 0;
                  const isCritical = item.daysLeft > 0 && item.daysLeft <= 30;
                  const isWarning = item.daysLeft > 30 && item.daysLeft <= 60;

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-[var(--md-radius-md)] border transition-all ${
                        isExpired
                          ? 'bg-[var(--md-error-container)]/40 border-[var(--md-error)]/40'
                          : isCritical
                          ? 'bg-[var(--md-warning-container)]/45 border-[var(--md-warning)]/45'
                          : isWarning
                          ? 'bg-[var(--md-warning-container)]/25 border-[var(--md-warning)]/30'
                          : 'bg-[var(--md-surface-container-low)] border-[var(--md-outline-variant)]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-[var(--md-on-surface)] text-xs">{item.name}</h4>
                          <div className="text-[10px] text-[var(--md-on-surface-variant)] font-mono mt-0.5 tabular-nums">
                            دفعة: {item.batchNumber || 'B-GEN'} • المخزون: {item.current_stock ?? item.qty ?? 0}{' '}
                            {item.baseUnitName || item.unit || 'حبة'}
                          </div>
                        </div>

                        <span
                          className={`m3-badge text-[10px] tabular-nums ${
                            isExpired
                              ? 'm3-badge-error'
                              : isCritical
                              ? 'm3-badge-warning'
                              : 'm3-badge-success'
                          }`}
                        >
                          {isExpired
                            ? 'منتهي الصلاحية'
                            : isCritical
                            ? `حرج: ${item.daysLeft} يوم متبقي`
                            : `متبقي ${item.daysLeft} يوم`}
                        </span>
                      </div>

                      <div className="mt-2 pt-2 border-t border-[var(--md-outline-variant)] flex items-center justify-between text-[11px] text-[var(--md-on-surface-variant)] tabular-nums">
                        <span>تاريخ الانتهاء: <strong className="text-[var(--md-on-surface)] font-mono">{item.expiryDate || '-'}</strong></span>
                        <span>الإنتاج: <span className="font-mono">{item.productionDate || '-'}</span></span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* PANEL 2: فاحص ضمان البطاريات والسيريال الفوري */}
          <div className="m3-card p-5 space-y-4 flex flex-col">
            <div className="flex items-center justify-between border-b border-[var(--md-outline-variant)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-[var(--md-radius-md)] bg-[var(--md-info-container)] text-[var(--md-on-info-container)] flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[var(--md-on-surface)] text-sm">فاحص ضمان وسيريال البطاريات والإطارات الفوري</h3>
                  <p className="text-[11px] text-[var(--md-on-surface-variant)]">التحقق بالرقم التسلسلي للبطارية (Serial No) أو كود DOT للإطار أو رقم الفاتورة</p>
                </div>
              </div>
            </div>

            {/* Search Input Bar */}
            <div className="space-y-2.5">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <QrCode className="w-4 h-4 text-[var(--md-on-surface-variant)] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="اكتب السيريال أو كود DOT أو رقم الفاتورة... (مثال: DOT-TIRE-205-55-R16)"
                    value={warrantySearch}
                    onChange={(e) => setWarrantySearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleWarrantySearch()}
                    className="m3-input !pr-9 text-xs font-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleWarrantySearch()}
                  className="m3-btn-primary text-xs shrink-0"
                >
                  فحص الضمان
                </button>
              </div>

              {/* Sample Quick Test Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                <span className="text-[var(--md-on-surface-variant)]">نماذج سريعة:</span>
                {['SN-BAT-70-2026', 'DOT-TIRE-205-55-R16', 'DOT-TIRE-265-65-R17', 'INV-2026-0042'].map((sn) => (
                  <button
                    key={sn}
                    type="button"
                    onClick={() => {
                      setWarrantySearch(sn);
                      handleWarrantySearch(sn);
                    }}
                    className="px-2 py-0.5 bg-[var(--md-surface-container-low)] hover:bg-[var(--md-surface-container-high)] text-[var(--md-info)] rounded-[var(--md-radius-sm)] font-mono border border-[var(--md-outline-variant)] cursor-pointer transition-colors"
                  >
                    {sn}
                  </button>
                ))}
              </div>
            </div>

            {/* Warranty Result Card */}
            {warrantyResult && (
              <div className="mt-2 flex-1">
                {warrantyResult.notFound ? (
                  <div className="p-4 bg-[var(--md-surface-container-low)] rounded-[var(--md-radius-md)] border border-[var(--md-outline-variant)] text-center space-y-2">
                    <AlertCircle className="w-8 h-8 text-[var(--md-on-surface-variant)] mx-auto" />
                    <p className="text-xs text-[var(--md-on-surface-variant)]">
                      لم يتم العثور على شهادة ضمان مسجلة لـ "{warrantyResult.query}".
                    </p>
                  </div>
                ) : (
                  <div
                    className={`p-5 rounded-[var(--md-radius-lg)] border space-y-4 ${
                      warrantyResult.isUnderWarranty
                        ? 'bg-[var(--md-success-container)]/25 border-[var(--md-success)]/40'
                        : 'bg-[var(--md-error-container)]/25 border-[var(--md-error)]/40'
                    }`}
                  >
                    {/* Status Badge */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span
                        className={`m3-badge text-xs ${
                          warrantyResult.isUnderWarranty
                            ? 'm3-badge-success'
                            : 'm3-badge-error'
                        }`}
                      >
                        {warrantyResult.isUnderWarranty ? (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>تحت الضمان المعتمد ساري ✅</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4" />
                            <span>منتهي فترة الضمان ❌</span>
                          </>
                        )}
                      </span>

                      <span className="text-xs font-mono font-bold text-[var(--md-on-surface)] tabular-nums">
                        {warrantyResult.diffDays > 0
                          ? `متبقي ${warrantyResult.diffDays} يوم`
                          : `منتهي منذ ${Math.abs(warrantyResult.diffDays)} يوم`}
                      </span>
                    </div>

                    {/* Battery Details */}
                    <div className="space-y-2 text-xs">
                      <div className="font-bold text-[var(--md-on-surface)] text-sm">{warrantyResult.productName}</div>
                      <div className="grid grid-cols-2 gap-2 text-[var(--md-on-surface)]">
                        <div>
                          <span className="text-[var(--md-on-surface-variant)]">المواصفات:</span>{' '}
                          <strong className="text-[var(--md-warning)]">{warrantyResult.batterySpec}</strong>
                        </div>
                        <div>
                          <span className="text-[var(--md-on-surface-variant)]">السيريال:</span>{' '}
                          <strong className="font-mono">{warrantyResult.serialNumber}</strong>
                        </div>
                        <div>
                          <span className="text-[var(--md-on-surface-variant)]">العميل:</span> {warrantyResult.customerName}
                        </div>
                        <div>
                          <span className="text-[var(--md-on-surface-variant)]">الهاتف:</span>{' '}
                          <strong className="font-mono">{warrantyResult.customerPhone}</strong>
                        </div>
                        <div>
                          <span className="text-[var(--md-on-surface-variant)]">تاريخ الشراء:</span>{' '}
                          <span className="font-mono tabular-nums">{warrantyResult.purchaseDate}</span>
                        </div>
                        <div>
                          <span className="text-[var(--md-on-surface-variant)]">نهاية الضمان:</span>{' '}
                          <strong className="font-mono text-[var(--md-success)] tabular-nums">
                            {warrantyResult.warrantyEndDate}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Scrap Trade-In Eligibility */}
                    <div className="p-3 bg-[var(--md-surface-container-low)] rounded-[var(--md-radius-md)] border border-[var(--md-outline-variant)] text-xs flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 text-[var(--md-on-surface)]">
                        <Zap className="w-4 h-4 text-[var(--md-warning)]" />
                        <span>أهلية استبدال ورجيع البطارية التالفة:</span>
                      </div>
                      <span className="font-bold text-[var(--md-success)] font-mono tabular-nums">
                        مستحق خصم {warrantyResult.scrapDiscountValue} YER
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 4: سندات التحويل بين الفروع والمستودعات (Inter-Warehouse Transfers) */}
      {/* ========================================================================= */}
      {activeSubTab === 'stock_transfers' && (
        <div className="space-y-6">
          {/* Top Control & KPI Header */}
          <div className="m3-card p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-[var(--md-on-surface)] flex items-center gap-2 flex-wrap">
                <ArrowLeftRight className="w-5 h-5 text-[var(--md-primary-text)]" />
                <span>سجل أذونات وسندات التحويل المخزني بين الفروع</span>
                <span className="m3-badge m3-badge-primary text-[10px] font-mono tabular-nums">
                  {transfers.length} سندات
                </span>
              </h2>
              <p className="text-xs text-[var(--md-on-surface-variant)] mt-1">
                نقل البضائع والمنتجات بين المستودع الرئيسي ومعارض التجزئة وفروع البطاريات وسيارات المناديب مع الترحيل الفوري للأرصدة
              </p>
            </div>

            <button
              onClick={() => setIsTransferModalOpen(true)}
              className="m3-btn-primary text-xs shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ إنشاء سند تحويل مخزني جديد</span>
            </button>
          </div>

          {/* Transfers Table */}
          <div className="m3-card overflow-hidden">
            <div className="p-4 border-b border-[var(--md-outline-variant)] bg-[var(--md-surface-container-low)] flex items-center justify-between gap-3 flex-wrap">
              <span className="text-xs font-bold text-[var(--md-on-surface)]">سندات التحويل المعتمدة:</span>
              <span className="text-[11px] text-[var(--md-on-surface-variant)] tabular-nums">
                إجمالي القطع المحولة بالكامل:{' '}
                <strong className="text-[var(--md-primary-text)] font-mono">
                  {formatNumber(transfers.reduce((s, t) => s + t.totalPieces, 0))} حبة
                </strong>
              </span>
            </div>

            {transfers.length === 0 ? (
              <div className="p-12 text-center text-[var(--md-on-surface-variant)] space-y-3">
                <ArrowLeftRight className="w-12 h-12 mx-auto opacity-50" />
                <p className="text-sm font-semibold">لا توجد سندات تحويل مخزني مسجلة حتى الآن</p>
                <button
                  onClick={() => setIsTransferModalOpen(true)}
                  className="m3-btn-primary text-xs"
                >
                  + إنشاء أول سند تحويل
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="m3-table text-xs text-right">
                  <thead className="m3-thead">
                    <tr>
                      <th className="m3-th">رقم السند</th>
                      <th className="m3-th">التاريخ</th>
                      <th className="m3-th">من مستودع (المصدر)</th>
                      <th className="m3-th">إلى مستودع (الوجهة)</th>
                      <th className="m3-th">السائق / المندوب الناقل</th>
                      <th className="m3-th text-center">عدد الأصناف</th>
                      <th className="m3-th text-center">إجمالي الحبات</th>
                      <th className="m3-th text-center">الحالة</th>
                      <th className="m3-th text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--md-outline-variant)] font-mono">
                    {transfers.map((voucher) => (
                      <tr key={voucher.id} className="hover:bg-[var(--md-surface-container-low)] transition-colors">
                        <td className="py-3.5 px-4 font-bold text-[var(--md-primary-text)]">
                          {voucher.voucherNumber}
                        </td>
                        <td className="py-3.5 px-4 text-[var(--md-on-surface-variant)] tabular-nums">
                          {voucher.date}
                        </td>
                        <td className="py-3.5 px-4 font-sans font-medium">
                          <span className="m3-badge m3-badge-error text-[11px]">
                            🔻 {voucher.fromWarehouseName}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-sans font-medium">
                          <span className="m3-badge m3-badge-success text-[11px]">
                            🟢 {voucher.toWarehouseName}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-sans text-[var(--md-on-surface)]">
                          <div>{voucher.driverName}</div>
                          {voucher.vehicleNumber && (
                            <span className="text-[10px] text-[var(--md-on-surface-variant)] font-mono">{voucher.vehicleNumber}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center text-[var(--md-on-surface)] tabular-nums">
                          {voucher.items.length} صنف
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-[var(--md-primary-text)] tabular-nums">
                          {formatNumber(voucher.totalPieces)}
                        </td>
                        <td className="py-3.5 px-4 text-center font-sans">
                          <span className="m3-badge m3-badge-success text-[10px]">
                            مرحل ومطابق ✅
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-sans">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedTransferForView(voucher)}
                              title="عرض تفاصيل السند"
                              className="m3-btn-outlined !min-h-[32px] !px-2 !py-1.5"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handlePrintTransferSlip(voucher)}
                              title="طباعة إذن التحويل المخزني الرسمي"
                              className="m3-btn-tonal !min-h-[32px] !px-2 !py-1.5"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: إنشاء سند تحويل مخزني جديد (Create Stock Transfer Modal)       */}
      {/* ========================================================================= */}
      {isTransferModalOpen && (
        <div className="m3-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
          <div className="m3-modal-surface w-full max-w-3xl overflow-hidden my-6 text-right text-[var(--md-on-surface)]">
            <div className="p-4 sm:p-5 bg-[var(--md-surface-container-low)] border-b border-[var(--md-outline-variant)] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-[var(--md-radius-md)] bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] flex items-center justify-center shrink-0">
                  <ArrowLeftRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[var(--md-on-surface)]">
                    إنشاء سند تحويل مخزني بين المستودعات والفروع
                  </h3>
                  <p className="text-[11px] text-[var(--md-on-surface-variant)]">
                    نقل الأصناف والكميات بالكرتون أو الحبة مع خصم المصدر وتغذية الوجهة
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] p-1.5 rounded-[var(--md-radius-sm)] hover:bg-[var(--md-surface-container-high)] cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTransferVoucher} className="p-5 space-y-4 text-xs">
              {/* Routing: From -> To */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-[var(--md-surface-container-low)] rounded-[var(--md-radius-md)] border border-[var(--md-outline-variant)]">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--md-error)] mb-1">
                    🔻 من مستودع (المصدر الخارق/المخصوم منه):
                  </label>
                  <select
                    value={newTransfer.fromWarehouseId}
                    onChange={(e) => setNewTransfer({ ...newTransfer, fromWarehouseId: e.target.value })}
                    className="m3-select !h-10 text-xs"
                  >
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>
                        {wh.name} ({wh.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--md-success)] mb-1">
                    🟢 إلى مستودع (الوجهة / المستلم):
                  </label>
                  <select
                    value={newTransfer.toWarehouseId}
                    onChange={(e) => setNewTransfer({ ...newTransfer, toWarehouseId: e.target.value })}
                    className="m3-select !h-10 text-xs"
                  >
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>
                        {wh.name} ({wh.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Driver and Vehicle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--md-on-surface-variant)] mb-1">
                    اسم السائق / المندوب الناقل:
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: صادق المريسي"
                    value={newTransfer.driverName}
                    onChange={(e) => setNewTransfer({ ...newTransfer, driverName: e.target.value })}
                    className="m3-input !h-10 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--md-on-surface-variant)] mb-1">
                    رقم السيارة / وسيلة النقل (اختياري):
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: سيارة جامبو #5421"
                    value={newTransfer.vehicleNumber}
                    onChange={(e) => setNewTransfer({ ...newTransfer, vehicleNumber: e.target.value })}
                    className="m3-input !h-10 text-xs"
                  />
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--md-on-surface)] text-xs">الأصناف المراد تحويلها:</span>
                  <button
                    type="button"
                    onClick={handleAddTransferItemRow}
                    className="m3-btn-tonal !min-h-[32px] !px-2.5 text-[11px]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ إضافة صنف</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto p-1">
                  {newTransfer.items.map((it, idx) => {
                    const prod = products.find((p) => p.id === it.productId);
                    const factor = Number(prod?.majorUnitFactor ?? prod?.major_unit_factor ?? 1);
                    const pieces = it.unit === 'CARTON' ? Number(it.quantity || 0) * factor : Number(it.quantity || 0);

                    return (
                      <div
                        key={idx}
                        className="p-3 bg-[var(--md-surface-container-low)] rounded-[var(--md-radius-md)] border border-[var(--md-outline-variant)] flex flex-col sm:flex-row items-start sm:items-center gap-2"
                      >
                        {/* Product Select */}
                        <div className="flex-1 w-full">
                          <select
                            value={it.productId}
                            onChange={(e) => handleUpdateTransferItemRow(idx, 'productId', e.target.value)}
                            className="m3-select !h-9 text-xs"
                            required
                          >
                            <option value="">-- اختر الصنف --</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} {p.sku ? `(${p.sku})` : ''} - متوفر: {p.current_stock ?? p.qty ?? 0}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Unit Toggle */}
                        <div className="w-full sm:w-28">
                          <select
                            value={it.unit}
                            onChange={(e) => handleUpdateTransferItemRow(idx, 'unit', e.target.value)}
                            className="m3-select !h-9 text-xs"
                          >
                            <option value="CARTON">
                              كرتون {factor > 1 ? `(${factor})` : ''}
                            </option>
                            <option value="PIECE">حبة (مفرد)</option>
                          </select>
                        </div>

                        {/* Quantity */}
                        <div className="w-full sm:w-24">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            placeholder="الكمية"
                            value={it.quantity}
                            onChange={(e) => handleUpdateTransferItemRow(idx, 'quantity', e.target.value)}
                            className="m3-input !h-9 font-mono text-xs text-center tabular-nums"
                            required
                          />
                        </div>

                        {/* Pieces Equiv Badge */}
                        <div className="w-24 text-center font-mono text-[var(--md-primary-text)] font-bold text-[11px] tabular-nums">
                          = {pieces} حبة
                        </div>

                        {/* Delete Row Button */}
                        {newTransfer.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTransferItemRow(idx)}
                            className="m3-btn-danger !min-h-[32px] !px-2 !py-1.5"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-semibold text-[var(--md-on-surface-variant)] mb-1">
                  ملاحظات وبيان التحويل (سبب النقل):
                </label>
                <input
                  type="text"
                  placeholder="مثال: تغذية يومية لمعرض التجزئة / شحنة مندوب المبيعات"
                  value={newTransfer.notes}
                  onChange={(e) => setNewTransfer({ ...newTransfer, notes: e.target.value })}
                  className="m3-input !h-10 text-xs"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--md-outline-variant)]">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="m3-btn-outlined text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="m3-btn-primary text-xs"
                >
                  اعتماد وترحيل سند التحويل المخزني ✅
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: عرض تفاصيل سند التحويل (View Transfer Modal)                     */}
      {/* ========================================================================= */}
      {selectedTransferForView && (
        <div className="m3-backdrop fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="m3-modal-surface w-full max-w-2xl overflow-hidden text-right text-[var(--md-on-surface)]">
            <div className="p-4 bg-[var(--md-surface-container-low)] border-b border-[var(--md-outline-variant)] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[var(--md-on-surface)] flex items-center gap-2">
                  <span>سند تحويل مخزني: {selectedTransferForView.voucherNumber}</span>
                  <span className="m3-badge m3-badge-success text-[10px]">
                    معتمد
                  </span>
                </h3>
                <p className="text-[11px] text-[var(--md-on-surface-variant)] tabular-nums">التاريخ: {selectedTransferForView.date}</p>
              </div>
              <button
                onClick={() => setSelectedTransferForView(null)}
                className="text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] p-1.5 rounded-[var(--md-radius-sm)] hover:bg-[var(--md-surface-container-high)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-[var(--md-surface-container-low)] rounded-[var(--md-radius-md)] border border-[var(--md-outline-variant)] text-[11px]">
                <div>
                  <span className="text-[var(--md-error)] font-bold block">🔻 من مستودع:</span>
                  <strong className="text-[var(--md-on-surface)] text-xs">{selectedTransferForView.fromWarehouseName}</strong>
                </div>
                <div>
                  <span className="text-[var(--md-success)] font-bold block">🟢 إلى مستودع:</span>
                  <strong className="text-[var(--md-on-surface)] text-xs">{selectedTransferForView.toWarehouseName}</strong>
                </div>
                <div>
                  <span className="text-[var(--md-on-surface-variant)] block">السائق / الناقل:</span>
                  <span className="text-[var(--md-on-surface)] font-medium">{selectedTransferForView.driverName}</span>
                </div>
                <div>
                  <span className="text-[var(--md-on-surface-variant)] block">بيان التحويل:</span>
                  <span className="text-[var(--md-on-surface)] font-medium">{selectedTransferForView.notes || '-'}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="border border-[var(--md-outline-variant)] rounded-[var(--md-radius-md)] overflow-hidden">
                <table className="m3-table text-xs text-right">
                  <thead className="m3-thead">
                    <tr>
                      <th className="m3-th">الصنف</th>
                      <th className="m3-th text-center">الوحدة المحولة</th>
                      <th className="m3-th text-center">الكمية</th>
                      <th className="m3-th text-center">إجمالي الحبات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--md-outline-variant)] font-mono">
                    {selectedTransferForView.items.map((it, i) => (
                      <tr key={i}>
                        <td className="py-2.5 px-3 font-sans font-semibold text-[var(--md-on-surface)]">{it.productName}</td>
                        <td className="py-2.5 px-3 text-center font-sans text-[var(--md-on-surface-variant)]">
                          {it.unit === 'CARTON' ? 'كرتون' : 'حبة'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-[var(--md-on-surface)] tabular-nums">{it.quantity}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-[var(--md-primary-text)] tabular-nums">{it.totalPieces}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[var(--md-surface-container-low)] font-bold border-t border-[var(--md-outline-variant)]">
                      <td colSpan={3} className="py-2.5 px-3 text-right text-[var(--md-on-surface)]">
                        إجمالي الحبات:
                      </td>
                      <td className="py-2.5 px-3 text-center text-[var(--md-primary-text)] font-mono tabular-nums">
                        {selectedTransferForView.totalPieces} حبة
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[var(--md-outline-variant)]">
                <button
                  onClick={() => handlePrintTransferSlip(selectedTransferForView)}
                  className="m3-btn-primary text-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة إذن التحويل الرسمي</span>
                </button>
                <button
                  onClick={() => setSelectedTransferForView(null)}
                  className="m3-btn-outlined text-xs"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
