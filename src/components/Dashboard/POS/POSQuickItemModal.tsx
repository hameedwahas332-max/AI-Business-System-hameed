import React, { useState } from 'react';
import { X, Plus, DollarSign, Tag, Hash, Percent, Layers, ShieldCheck, Calendar, Droplets, Fuel } from 'lucide-react';
import { POSCartItem } from '../../../types';
import { toEnglishDigits, parseEnglishNumber } from '../../../lib/formatters';
import { useModuleSettings } from '../../../context/ModuleSettingsContext';

interface POSQuickItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (item: POSCartItem) => void;
  currency: string;
}

export const POSQuickItemModal: React.FC<POSQuickItemModalProps> = ({
  isOpen,
  onClose,
  onAddItem,
  currency,
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
  const [itemCode, setItemCode] = useState(() => `ITM-${Math.floor(1000 + Math.random() * 9000)}`);
  const [activityType, setActivityType] = useState<string>(defaultActivity);
  const [unit, setUnit] = useState(() => (defaultActivity === 'fuel' ? 'لتر' : 'حبة'));
  const [quantity, setQuantity] = useState<string>('1');
  const [unitPrice, setUnitPrice] = useState<string>('');
  const [discount, setDiscount] = useState<string>('0');
  const [tax, setTax] = useState<string>('0');

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
      sku: itemCode.trim() || partNumber.trim(),
      itemCode: itemCode.trim(),
      partNumber: partNumber.trim(),
      activityType: activityType as any,
      unit,
      quantity: qNum,
      unitPrice: pNum,
      discount: dNum,
      tax: tNum,
      total,
      notes: `صنف يدوي / كود: ${itemCode || partNumber || '-'}`,
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
    setItemCode(`ITM-${Math.floor(1000 + Math.random() * 9000)}`);
    setQuantity('1');
    setUnitPrice('');
    setDiscount('0');
    setTax('0');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto" dir="rtl">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 bg-slate-800/60 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">إضافة صنف يدوي / بيع مباشر</h3>
              <p className="text-xs text-slate-400">بيع صنف سريع غير مسجل في دليل المنتجات</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                اسم أو بيان الصنف <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Tag className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError(null);
                  }}
                  placeholder="مثال: بطارية هانكوك 70 أمبير / أرز الشعلان / خدمة صيانة..."
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pr-10 pl-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                رقم الصنف / كود القطعة (Item Code)
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
                <input
                  type="text"
                  dir="ltr"
                  lang="en"
                  value={itemCode}
                  onChange={(e) => setItemCode(toEnglishDigits(e.target.value))}
                  placeholder="ITM-1001"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pr-10 pl-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500 text-left"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">نوع النشاط / التصنيف</label>
              <div className="relative">
                <Layers className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
                <select
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pr-9 pl-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
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
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                الكمية <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                dir="ltr"
                lang="en"
                value={quantity}
                onChange={(e) => setQuantity(toEnglishDigits(e.target.value))}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500 text-center"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">الوحدة المباعة</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
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

          {/* Dynamic spec fields depending on activityType */}
          {activityType === 'food' && (
            <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl">
              <label className="block text-xs font-semibold text-emerald-300 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> تاريخ الانتهاء (FEFO)
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          {activityType === 'battery' && (
            <div className="p-3 bg-amber-950/20 border border-amber-500/20 rounded-xl grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-amber-300 mb-1 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> سعة البطارية (Ah) / الموديل
                </label>
                <input
                  type="text"
                  value={batterySpec}
                  onChange={(e) => setBatterySpec(e.target.value)}
                  placeholder="مثال: 70Ah 12V 550CCA"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-amber-300 mb-1">مدة الضمان (بالأشهر)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  dir="ltr"
                  lang="en"
                  value={warrantyMonths}
                  onChange={(e) => setWarrantyMonths(toEnglishDigits(e.target.value))}
                  placeholder="12"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono text-center focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          {activityType === 'tire' && (
            <div className="p-3 bg-cyan-950/20 border border-cyan-500/20 rounded-xl space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-cyan-300 mb-1">مقاس الإطار</label>
                  <input
                    type="text"
                    dir="ltr"
                    lang="en"
                    value={tireSize}
                    onChange={(e) => setTireSize(toEnglishDigits(e.target.value))}
                    placeholder="265/65R17"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-cyan-300 mb-1">تاريخ الإنتاج DOT</label>
                  <input
                    type="text"
                    dir="ltr"
                    lang="en"
                    value={tireProductionDot}
                    onChange={(e) => setTireProductionDot(toEnglishDigits(e.target.value))}
                    placeholder="2425"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-cyan-300 mb-1">الضمان (شهر)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    dir="ltr"
                    lang="en"
                    value={warrantyMonths}
                    onChange={(e) => setWarrantyMonths(toEnglishDigits(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono text-center focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>
          )}

          {(activityType === 'oil' || activityType === 'autopart') && (
            <div className="p-3 bg-blue-950/20 border border-blue-500/20 rounded-xl grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-blue-300 mb-1 flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5" /> درجة اللزوجة / المواصفة
                </label>
                <input
                  type="text"
                  dir="ltr"
                  lang="en"
                  value={viscosityGrade}
                  onChange={(e) => setViscosityGrade(toEnglishDigits(e.target.value))}
                  placeholder="5W-30 SN/CF"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-blue-300 mb-1">رقم القطعة OEM / البارت</label>
                <input
                  type="text"
                  dir="ltr"
                  lang="en"
                  value={partNumber}
                  onChange={(e) => setPartNumber(toEnglishDigits(e.target.value))}
                  placeholder="OEM-90915-YZZD2"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {activityType === 'fuel' && (
            <div className="p-3 bg-amber-950/20 border border-amber-500/20 rounded-xl grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-amber-300 mb-1 flex items-center gap-1">
                  <Fuel className="w-3.5 h-3.5" /> نوع المشتق النفطي / الوقود
                </label>
                <select
                  value={fuelType}
                  onChange={(e) => setFuelType(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="petrol_91">بنزين 91 ممتاز</option>
                  <option value="petrol_95">بنزين 95 سوبر</option>
                  <option value="diesel">ديزل عالي الكفاءة</option>
                  <option value="gas">غاز مركزي LPG</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-amber-300 mb-1">رقم الطرمبة / العداد</label>
                <input
                  type="text"
                  dir="ltr"
                  lang="en"
                  value={pumpNumber}
                  onChange={(e) => setPumpNumber(toEnglishDigits(e.target.value))}
                  placeholder="01"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                سعر الوحدة ({currency}) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
                <input
                  type="text"
                  inputMode="decimal"
                  dir="ltr"
                  lang="en"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(toEnglishDigits(e.target.value))}
                  placeholder="0.00"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pr-9 pl-3 py-2 text-sm text-white font-mono font-medium focus:outline-none focus:border-emerald-500 text-left"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
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
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500 text-left"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
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
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500 text-left"
              />
            </div>
          </div>

          {/* Item Net Total Summary */}
          <div className="p-4 bg-slate-800/50 border border-slate-700/60 rounded-xl flex items-center justify-between">
            <span className="text-sm text-slate-300 font-medium">إجمالي الصنف الصافي:</span>
            <span className="text-lg font-black text-emerald-400 font-mono" dir="ltr">
              {total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-950/40 transition-all flex items-center gap-2"
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
