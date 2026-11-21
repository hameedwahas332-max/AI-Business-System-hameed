import React, { useState, useEffect } from 'react';
import { X, Plus, DollarSign, Tag, Hash, Percent, Layers, ShieldCheck, Calendar, Droplets, Fuel, Barcode } from 'lucide-react';
import { POSCartItem } from '../../../types';
import { toEnglishDigits, parseEnglishNumber } from '../../../lib/formatters';
import { normalizeScannedBarcode } from '../../../utils/barcodeUtils';
import { useModuleSettings } from '../../../context/ModuleSettingsContext';

interface POSQuickItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (item: POSCartItem) => void;
  currency: string;
  initialBarcode?: string;
}

export const POSQuickItemModal: React.FC<POSQuickItemModalProps> = ({
  isOpen,
  onClose,
  onAddItem,
  currency,
  initialBarcode,
}) => {
  const { settings } = useModuleSettings();
  const businessMode = settings?.activePreset || 'multi_activity';

  const defaultActivity =
    businessMode === 'grocery_only'
      ? 'food'
      : businessMode === 'fuel_station_only'
      ? 'fuel'
      : businessMode === 'tires_batteries_only'
      ? 'tire'
      : businessMode === 'autoparts_oils_only'
      ? 'oil'
      : 'general';

  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState(() => (initialBarcode ? normalizeScannedBarcode(initialBarcode) : ''));
  const [itemCode, setItemCode] = useState(() =>
    initialBarcode ? normalizeScannedBarcode(initialBarcode) : `ITM-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [activityType, setActivityType] = useState<string>(defaultActivity);
  const [unit, setUnit] = useState(() => (defaultActivity === 'fuel' ? 'لتر' : 'حبة'));
  const [quantity, setQuantity] = useState<string>('1');
  const [unitPrice, setUnitPrice] = useState<string>('');
  const [discount, setDiscount] = useState<string>('0');
  const [tax, setTax] = useState<string>('0');
  const [minStockLevel, setMinStockLevel] = useState<string>('');

  useEffect(() => {
    if (isOpen && initialBarcode) {
      const clean = normalizeScannedBarcode(initialBarcode);
      setBarcode(clean);
      setItemCode(clean);
    }
  }, [isOpen, initialBarcode]);

  // Dynamic spec fields
  const [expiryDate, setExpiryDate] = useState('');
  const [batterySpec, setBatterySpec] = useState('');
  const [tireSize, setTireSize] = useState('');
  const [tireProductionDot, setTireProductionDot] = useState('');
  const [viscosityGrade, setViscosityGrade] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [warrantyMonths, setWarrantyMonths] = useState<string>('12');
  const [fuelType, setFuelType] = useState('petrol_91');
  const [pumpNumber, setPumpNumber] = useState('01');

  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const qNum = parseEnglishNumber(quantity, 1);
  const pNum = parseEnglishNumber(unitPrice, 0);
  const dNum = parseEnglishNumber(discount, 0);
  const tNum = parseEnglishNumber(tax, 0);
  const total = Math.max(0, qNum * pNum - dNum + tNum);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('يرجى إدخال اسم أو وصف الصنف');
      return;
    }
    if (qNum <= 0) {
      setError('الكمية يجب أن تكون أكبر من الصفر');
      return;
    }
    if (pNum <= 0) {
      setError('السعر الإفرادي يجب أن يكون أكبر من الصفر');
      return;
    }

    onAddItem({
      id: 'quick_' + Date.now(),
      productId: null,
      name: name.trim(),
      barcode: barcode.trim() || undefined,
      sku: itemCode.trim() || barcode.trim() || partNumber.trim(),
      itemCode: itemCode.trim(),
      partNumber: partNumber.trim(),
      activityType: activityType as any,
      unit,
      quantity: qNum,
      unitPrice: pNum,
      discount: dNum,
      tax: tNum,
      total,
      min_stock_level:
        minStockLevel.trim() === '' ? null : Math.max(0, parseEnglishNumber(minStockLevel, 0)),
      minStockLevel:
        minStockLevel.trim() === '' ? null : Math.max(0, parseEnglishNumber(minStockLevel, 0)),
      notes: `صنف يدوي / باركود: ${barcode || itemCode || '-'}`,
      batterySpec: activityType === 'battery' ? batterySpec : undefined,
      tireSize: activityType === 'tire' ? tireSize : undefined,
      tireProductionDot: activityType === 'tire' ? tireProductionDot : undefined,
      warrantyMonths: activityType === 'tire' || activityType === 'battery' ? parseEnglishNumber(warrantyMonths, 12) : undefined,
      expiryDate: activityType === 'food' ? expiryDate : undefined,
      viscosityGrade: activityType === 'oil' ? viscosityGrade : undefined,
      fuelType: activityType === 'fuel' ? fuelType : undefined,
      pumpNumber: activityType === 'fuel' ? pumpNumber : undefined,
    } as any);

    // Reset & close
    setName('');
    setBarcode('');
    setItemCode(`ITM-${Math.floor(1000 + Math.random() * 9000)}`);
    setQuantity('1');
    setUnitPrice('');
    setDiscount('0');
    setTax('0');
    setMinStockLevel('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center m3-backdrop p-4 overflow-y-auto" dir="rtl">
      <div className="m3-modal-surface rounded-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 bg-[var(--md-surface-container-low)] border-b border-[var(--md-outline-variant)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] rounded-xl border border-[var(--md-primary)]/20">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[var(--md-on-surface)]">إضافة صنف يدوي / بيع مباشر</h3>
              <p className="text-xs text-[var(--md-on-surface-variant)]">بيع صنف سريع غير مسجل في دليل المنتجات</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-high)] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {barcode && (
            <div className="p-3 bg-[var(--md-warning-container)] border border-[var(--md-warning)]/30 rounded-xl text-[var(--md-on-warning-container)] text-xs flex items-center justify-between gap-2 animate-in fade-in">
              <div className="flex items-center gap-2">
                <Barcode className="w-4 h-4 text-[var(--md-warning)] shrink-0" />
                <span>تم التقاط باركود غير مسجل: <strong className="font-mono">{barcode}</strong></span>
              </div>
              <span className="m3-badge-warning text-[10px] shrink-0">تسجيل فوري</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-[var(--md-error-container)] border border-[var(--md-error)]/30 rounded-xl text-[var(--md-on-error-container)] text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--md-on-surface-variant)] mb-1.5">
                اسم أو بيان الصنف <span className="text-[var(--md-error)]">*</span>
              </label>
              <div className="relative">
                <Tag className="w-4 h-4 text-[var(--md-on-surface-variant)] absolute right-3 top-3" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError(null);
                  }}
                  placeholder="مثال: بطارية هانكوك 70 أمبير / أرز الشعلان / خدمة صيانة..."
                  className="m3-input w-full pr-10 pl-3 py-2 text-sm"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--md-on-surface-variant)] mb-1.5 flex items-center justify-between">
                <span>الباركود الممسوح (Barcode)</span>
                <span className="text-[10px] text-[var(--md-primary-text)] font-mono">HID Scanner</span>
              </label>
              <div className="relative">
                <Barcode className="w-4 h-4 text-[var(--md-on-surface-variant)] absolute right-3 top-3" />
                <input
                  type="text"
                  dir="ltr"
                  lang="en"
                  value={barcode}
                  onChange={(e) => {
                    const val = normalizeScannedBarcode(e.target.value);
                    setBarcode(val);
                    if (!itemCode || itemCode.startsWith('ITM-')) {
                      setItemCode(val);
                    }
                  }}
                  placeholder="6291000..."
                  className="m3-input w-full pr-10 pl-3 py-2 text-sm font-mono text-left"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--md-on-surface-variant)] mb-1.5">
                رقم الصنف / كود القطعة (Item Code)
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 text-[var(--md-on-surface-variant)] absolute right-3 top-3" />
                <input
                  type="text"
                  dir="ltr"
                  lang="en"
                  value={itemCode}
                  onChange={(e) => setItemCode(normalizeScannedBarcode(toEnglishDigits(e.target.value)))}
                  placeholder="ITM-1001"
                  className="m3-input w-full pr-10 pl-3 py-2 text-sm font-mono text-left"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--md-on-surface-variant)] mb-1.5">
                رقم القطعة / OEM (اختياري)
              </label>
              <input
                type="text"
                dir="ltr"
                lang="en"
                value={partNumber}
                onChange={(e) => setPartNumber(normalizeScannedBarcode(toEnglishDigits(e.target.value)))}
                placeholder="PART-1001"
                className="m3-input w-full px-3 py-2 text-sm font-mono text-left"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--md-on-surface-variant)] mb-1.5">نوع النشاط / التصنيف</label>
              <div className="relative">
                <Layers className="w-4 h-4 text-[var(--md-on-surface-variant)] absolute right-3 top-3 pointer-events-none" />
                <select
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value)}
                  className="m3-select w-full pr-9 pl-3 py-2 text-xs"
                >
                  <option value="general">عام / تجارة متنوعة</option>
                  <option value="food">مواد غذائية وتموينات</option>
                  <option value="tire">إطارات وجنوط</option>
                  <option value="battery">بطاريات وطاقة</option>
                  <option value="oil">زيوت وسوائل محركات</option>
                  <option value="autopart">قطع غيار سيارات</option>
                  <option value="fuel">محطة وقود وغاز</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--md-on-surface-variant)] mb-1.5">
                الكمية <span className="text-[var(--md-error)]">*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                dir="ltr"
                lang="en"
                value={quantity}
                onChange={(e) => setQuantity(toEnglishDigits(e.target.value))}
                className="m3-input w-full px-3 py-2 text-sm font-mono text-center tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--md-on-surface-variant)] mb-1.5">الوحدة المباعة</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="m3-select w-full px-3 py-2 text-xs"
              >
                <option value="قطعة / حبة">قطعة / حبة</option>
                <option value="باكت / شدة">باكت / شدة</option>
                <option value="كرتون">كرتون</option>
                <option value="قطمة">قطمة</option>
                <option value="كيس / شوال">كيس / شوال</option>
                <option value="دبة / جالون">دبة / جالون</option>
                <option value="برميل">برميل</option>
                <option value="درزن">درزن</option>
                <option value="طقم">طقم</option>
                <option value="طبق / طبقة">طبق / طبقة</option>
                <option value="كيلوجرام">كيلوجرام</option>
                <option value="جرام">جرام</option>
                <option value="أوقية">أوقية</option>
                <option value="لتر">لتر</option>
                <option value="متر">متر</option>
                <option value="خدمة / مصنعية">خدمة / مصنعية</option>
              </select>
            </div>
          </div>

          {/* Custom Low-Stock Alert Threshold */}
          <div className="p-3 rounded-xl bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] space-y-1.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label className="text-xs font-semibold text-[var(--md-on-surface-variant)]">
                حد التنبيه قبل النفاذ (الكمية المتبقية)
              </label>
              <span className="m3-badge text-[10px]">
                الوحدة الأساسية: {unit}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="decimal"
                dir="ltr"
                lang="en"
                value={minStockLevel}
                onChange={(e) => setMinStockLevel(toEnglishDigits(e.target.value).replace(/[^0-9.]/g, ''))}
                placeholder="اختياري — افتراضي 5"
                className="m3-input flex-1 px-3 py-2 text-xs font-mono text-left tabular-nums"
              />
              <span className="px-3 py-2 rounded-xl bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] text-xs font-semibold text-[var(--md-on-surface-variant)] shrink-0">
                {unit}
              </span>
            </div>
            <p className="text-[10px] text-[var(--md-on-surface-variant)]">
              في حال تركه فارغاً يُستخدم الحد العام الافتراضي للنظام (5 {unit}).
            </p>
          </div>

          {/* Dynamic spec fields depending on activityType */}
          {activityType === 'food' && (
            <div className="p-3 bg-[var(--md-success-container)]/50 border border-[var(--md-success)]/30 rounded-xl">
              <label className="block text-xs font-semibold text-[var(--md-on-success-container)] mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> تاريخ الانتهاء (FEFO)
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="m3-input w-full px-3 py-1.5 text-xs"
              />
            </div>
          )}

          {activityType === 'battery' && (
            <div className="p-3 bg-[var(--md-warning-container)]/50 border border-[var(--md-warning)]/30 rounded-xl grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--md-on-warning-container)] mb-1 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> سعة البطارية (Ah) / الموديل
                </label>
                <input
                  type="text"
                  value={batterySpec}
                  onChange={(e) => setBatterySpec(e.target.value)}
                  placeholder="مثال: 70Ah 12V 550CCA"
                  className="m3-input w-full px-3 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--md-on-warning-container)] mb-1">مدة الضمان (بالأشهر)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  dir="ltr"
                  lang="en"
                  value={warrantyMonths}
                  onChange={(e) => setWarrantyMonths(toEnglishDigits(e.target.value))}
                  placeholder="12"
                  className="m3-input w-full px-3 py-1.5 text-xs font-mono text-center tabular-nums"
                />
              </div>
            </div>
          )}

          {activityType === 'tire' && (
            <div className="p-3 bg-[var(--md-info-container)]/50 border border-[var(--md-info)]/30 rounded-xl space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--md-on-info-container)] mb-1">مقاس الإطار</label>
                  <input
                    type="text"
                    dir="ltr"
                    lang="en"
                    value={tireSize}
                    onChange={(e) => setTireSize(toEnglishDigits(e.target.value))}
                    placeholder="265/65R17"
                    className="m3-input w-full px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--md-on-info-container)] mb-1">تاريخ الإنتاج DOT</label>
                  <input
                    type="text"
                    dir="ltr"
                    lang="en"
                    value={tireProductionDot}
                    onChange={(e) => setTireProductionDot(toEnglishDigits(e.target.value))}
                    placeholder="2425"
                    className="m3-input w-full px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--md-on-info-container)] mb-1">الضمان (شهر)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    dir="ltr"
                    lang="en"
                    value={warrantyMonths}
                    onChange={(e) => setWarrantyMonths(toEnglishDigits(e.target.value))}
                    className="m3-input w-full px-2.5 py-1.5 text-xs font-mono text-center tabular-nums"
                  />
                </div>
              </div>
            </div>
          )}

          {(activityType === 'oil' || activityType === 'autopart') && (
            <div className="p-3 bg-[var(--md-info-container)]/50 border border-[var(--md-info)]/30 rounded-xl grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--md-on-info-container)] mb-1 flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5" /> درجة اللزوجة / المواصفة
                </label>
                <input
                  type="text"
                  dir="ltr"
                  lang="en"
                  value={viscosityGrade}
                  onChange={(e) => setViscosityGrade(toEnglishDigits(e.target.value))}
                  placeholder="5W-30 SN/CF"
                  className="m3-input w-full px-3 py-1.5 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--md-on-info-container)] mb-1">رقم القطعة OEM / البارت</label>
                <input
                  type="text"
                  dir="ltr"
                  lang="en"
                  value={partNumber}
                  onChange={(e) => setPartNumber(toEnglishDigits(e.target.value))}
                  placeholder="OEM-90915-YZZD2"
                  className="m3-input w-full px-3 py-1.5 text-xs font-mono"
                />
              </div>
            </div>
          )}

          {activityType === 'fuel' && (
            <div className="p-3 bg-[var(--md-warning-container)]/50 border border-[var(--md-warning)]/30 rounded-xl grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--md-on-warning-container)] mb-1 flex items-center gap-1">
                  <Fuel className="w-3.5 h-3.5" /> نوع المشتق النفطي / الوقود
                </label>
                <select
                  value={fuelType}
                  onChange={(e) => setFuelType(e.target.value)}
                  className="m3-select w-full px-2.5 py-1.5 text-xs"
                >
                  <option value="petrol_91">بنزين 91 ممتاز</option>
                  <option value="petrol_95">بنزين 95 سوبر</option>
                  <option value="diesel">ديزل عالي الكفاءة</option>
                  <option value="gas">غاز مركزي LPG</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--md-on-warning-container)] mb-1">رقم الطرمبة / العداد</label>
                <input
                  type="text"
                  dir="ltr"
                  lang="en"
                  value={pumpNumber}
                  onChange={(e) => setPumpNumber(toEnglishDigits(e.target.value))}
                  placeholder="01"
                  className="m3-input w-full px-3 py-1.5 text-xs font-mono"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--md-on-surface-variant)] mb-1.5">
                سعر الوحدة ({currency}) <span className="text-[var(--md-error)]">*</span>
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-[var(--md-on-surface-variant)] absolute right-3 top-3" />
                <input
                  type="text"
                  inputMode="decimal"
                  dir="ltr"
                  lang="en"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(toEnglishDigits(e.target.value))}
                  placeholder="0.00"
                  className="m3-input w-full pr-9 pl-3 py-2 text-sm font-mono font-medium text-left tabular-nums"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--md-on-surface-variant)] mb-1.5">
                الخصم ({currency})
              </label>
              <input
                type="text"
                inputMode="decimal"
                dir="ltr"
                lang="en"
                value={discount}
                onChange={(e) => setDiscount(toEnglishDigits(e.target.value))}
                placeholder="0"
                className="m3-input w-full px-3 py-2 text-sm font-mono text-left tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--md-on-surface-variant)] mb-1.5">
                الضريبة ({currency})
              </label>
              <input
                type="text"
                inputMode="decimal"
                dir="ltr"
                lang="en"
                value={tax}
                onChange={(e) => setTax(toEnglishDigits(e.target.value))}
                placeholder="0"
                className="m3-input w-full px-3 py-2 text-sm font-mono text-left tabular-nums"
              />
            </div>
          </div>

          {/* Item Net Total Summary */}
          <div className="p-4 bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] rounded-xl flex items-center justify-between">
            <span className="text-sm text-[var(--md-on-surface-variant)] font-medium">إجمالي الصنف الصافي:</span>
            <span className="text-lg font-black text-[var(--md-primary-text)] font-mono tabular-nums" dir="ltr">
              {total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="m3-btn-outlined px-4 py-2.5 text-sm font-medium"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="m3-btn-primary px-6 py-2.5 text-sm font-bold flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              إضافة إلى السلة
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
