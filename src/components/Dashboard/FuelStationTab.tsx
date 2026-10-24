import React, { useState, useEffect } from 'react';
import {
  Fuel,
  Droplets,
  Gauge,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Printer,
  History,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  Search,
  Filter,
  DollarSign,
  User,
  Calendar,
  Layers,
  FileSpreadsheet,
  Zap,
  Info,
} from 'lucide-react';
import { toEnglishDigits, parseEnglishNumber, formatNumber, formatAmount } from '../../lib/formatters';
import { ExportActions } from '../Common/ExportActions';

export interface FuelTankItem {
  id: string;
  tankNumber: string;
  name: string;
  fuelType: 'petrol_91' | 'petrol_95' | 'diesel' | 'gas';
  capacityLiters: number;
  currentStockLiters: number;
  previousBalanceLiters: number;
  todayRefillLiters: number;
  actualDipReadingLiters: number;
  unitPrice: number;
  currency: string;
  lastUpdated: string;
}

export interface PumpMeterRecord {
  id: string;
  pumpNumber: string;
  nozzleLabel: string;
  tankId: string;
  fuelType: 'petrol_91' | 'petrol_95' | 'diesel' | 'gas';
  operatorName: string;
  shift: 'MORNING' | 'EVENING' | 'FULL_DAY';
  date: string;
  previousMeter: number;
  currentMeter: number;
  calibrationLiters: number;
  dispensedLiters: number;
  pricePerLiter: number;
  expectedRevenue: number;
  actualCashReceived: number;
  actualElectronicReceived: number;
  actualCreditSales: number;
  varianceAmount: number; // actual total - expected
  status: 'DRAFT' | 'CONFIRMED';
}

const INITIAL_TANKS: FuelTankItem[] = [
  {
    id: 'tank-1',
    tankNumber: 'خزان T-01',
    name: 'خزان بترول ممتاز (بنزين 91)',
    fuelType: 'petrol_91',
    capacityLiters: 35000,
    currentStockLiters: 24200,
    previousBalanceLiters: 22000,
    todayRefillLiters: 5000,
    actualDipReadingLiters: 24150,
    unitPrice: 850,
    currency: 'YER',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'tank-2',
    tankNumber: 'خزان T-02',
    name: 'خزان بترول سوبر (بنزين 95)',
    fuelType: 'petrol_95',
    capacityLiters: 25000,
    currentStockLiters: 16800,
    previousBalanceLiters: 18000,
    todayRefillLiters: 0,
    actualDipReadingLiters: 16780,
    unitPrice: 980,
    currency: 'YER',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'tank-3',
    tankNumber: 'خزان T-03',
    name: 'خزان ديزل شاحنات ومعدات',
    fuelType: 'diesel',
    capacityLiters: 45000,
    currentStockLiters: 31500,
    previousBalanceLiters: 35000,
    todayRefillLiters: 0,
    actualDipReadingLiters: 31400,
    unitPrice: 750,
    currency: 'YER',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'tank-4',
    tankNumber: 'خزان G-01',
    name: 'خزان الغاز المنزلي والسيارات المركزي',
    fuelType: 'gas',
    capacityLiters: 20000,
    currentStockLiters: 12400,
    previousBalanceLiters: 14000,
    todayRefillLiters: 0,
    actualDipReadingLiters: 12380,
    unitPrice: 420,
    currency: 'YER',
    lastUpdated: new Date().toISOString(),
  },
];

const INITIAL_METER_RECORDS: PumpMeterRecord[] = [
  {
    id: 'pm-001',
    pumpNumber: 'طرمبة 1',
    nozzleLabel: 'مسدس A (بنزين 91)',
    tankId: 'tank-1',
    fuelType: 'petrol_91',
    operatorName: 'صالح العولقي',
    shift: 'MORNING',
    date: new Date().toISOString().split('T')[0],
    previousMeter: 124500.5,
    currentMeter: 125920.0,
    calibrationLiters: 10,
    dispensedLiters: 1409.5,
    pricePerLiter: 850,
    expectedRevenue: 1198075,
    actualCashReceived: 1150000,
    actualElectronicReceived: 48075,
    actualCreditSales: 0,
    varianceAmount: 0,
    status: 'CONFIRMED',
  },
  {
    id: 'pm-002',
    pumpNumber: 'طرمبة 2',
    nozzleLabel: 'مسدس B (ديزل شاحنات)',
    tankId: 'tank-3',
    fuelType: 'diesel',
    operatorName: 'عمار الحميري',
    shift: 'MORNING',
    date: new Date().toISOString().split('T')[0],
    previousMeter: 98400.0,
    currentMeter: 100450.0,
    calibrationLiters: 0,
    dispensedLiters: 2050.0,
    pricePerLiter: 750,
    expectedRevenue: 1537500,
    actualCashReceived: 1400000,
    actualElectronicReceived: 137500,
    actualCreditSales: 0,
    varianceAmount: 0,
    status: 'CONFIRMED',
  },
];

export const FuelStationTab: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'meters' | 'tanks' | 'reconciliation_history'>('meters');
  
  // Tanks State
  const [tanks, setTanks] = useState<FuelTankItem[]>(() => {
    try {
      const saved = localStorage.getItem('erp_fuel_tanks_v1');
      return saved ? JSON.parse(saved) : INITIAL_TANKS;
    } catch {
      return INITIAL_TANKS;
    }
  });

  // Shift & Meter Records State
  const [records, setRecords] = useState<PumpMeterRecord[]>(() => {
    try {
      const saved = localStorage.getItem('erp_fuel_meter_records_v1');
      return saved ? JSON.parse(saved) : INITIAL_METER_RECORDS;
    } catch {
      return INITIAL_METER_RECORDS;
    }
  });

  // Current Working Shift State
  const [selectedShift, setSelectedShift] = useState<'MORNING' | 'EVENING' | 'FULL_DAY'>('MORNING');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // New Meter Entry Form State
  const [isNewEntryOpen, setIsNewEntryOpen] = useState(false);
  const [entryTankId, setEntryTankId] = useState<string>('tank-1');
  const [entryPump, setEntryPump] = useState<string>('طرمبة 1 - مسدس A');
  const [entryOperator, setEntryOperator] = useState<string>('صالح العولقي');
  const [entryPrevMeter, setEntryPrevMeter] = useState<string>('125920.0');
  const [entryCurrMeter, setEntryCurrMeter] = useState<string>('');
  const [entryCalibration, setEntryCalibration] = useState<string>('0');
  const [entryCashReceived, setEntryCashReceived] = useState<string>('');
  const [entryElectronicReceived, setEntryElectronicReceived] = useState<string>('0');
  const [entryCreditSales, setEntryCreditSales] = useState<string>('0');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // New Tank Refill Modal State
  const [isRefillModalOpen, setIsRefillModalOpen] = useState(false);
  const [refillTankId, setRefillTankId] = useState<string>('tank-1');
  const [refillLiters, setRefillLiters] = useState<string>('');
  const [refillSupplier, setRefillSupplier] = useState<string>('شركة النفط الوطنية - ناقلة 441');

  // Save to LocalStorage & Backend PostgreSQL Sync
  useEffect(() => {
    try {
      localStorage.setItem('erp_fuel_tanks_v1', JSON.stringify(tanks));
      fetch('/api/v1/fuel-station/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tanks, records }),
      }).catch(() => {});
    } catch (e) {
      console.error('Failed to save tanks:', e);
    }
  }, [tanks]);

  useEffect(() => {
    try {
      localStorage.setItem('erp_fuel_meter_records_v1', JSON.stringify(records));
      fetch('/api/v1/fuel-station/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tanks, records }),
      }).catch(() => {});
    } catch (e) {
      console.error('Failed to save meter records:', e);
    }
  }, [records]);

  // Helper calculations for active entry
  const selectedTank = tanks.find((t) => t.id === entryTankId) || tanks[0];
  const prevMeterNum = parseEnglishNumber(entryPrevMeter);
  const currMeterNum = parseEnglishNumber(entryCurrMeter);
  const calibrationNum = parseEnglishNumber(entryCalibration);
  const netDispensed = Math.max(0, currMeterNum - prevMeterNum - calibrationNum);
  const expectedTotal = netDispensed * (selectedTank?.unitPrice || 0);

  const cashNum = parseEnglishNumber(entryCashReceived);
  const electNum = parseEnglishNumber(entryElectronicReceived);
  const creditNum = parseEnglishNumber(entryCreditSales);
  const totalActual = cashNum + electNum + creditNum;
  const cashVariance = totalActual - expectedTotal;

  // Handle Tank selection change: auto-fill previous closing meter from last record
  const handleTankChange = (tankId: string) => {
    setEntryTankId(tankId);
    const lastRec = records
      .filter((r) => r.tankId === tankId)
      .sort((a, b) => b.currentMeter - a.currentMeter)[0];
    if (lastRec) {
      setEntryPrevMeter(String(lastRec.currentMeter));
    } else {
      setEntryPrevMeter('100000.0');
    }
  };

  // Submit New Daily Meter Entry
  const handleSaveMeterRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (currMeterNum <= prevMeterNum && currMeterNum > 0) {
      alert('قراءة العداد الحالي يجب أن تكون أكبر من قراءة العداد السابق!');
      return;
    }

    const newRecord: PumpMeterRecord = {
      id: `pm-${Date.now()}`,
      pumpNumber: entryPump.split('-')[0].trim(),
      nozzleLabel: entryPump,
      tankId: entryTankId,
      fuelType: selectedTank.fuelType,
      operatorName: entryOperator,
      shift: selectedShift,
      date: selectedDate,
      previousMeter: prevMeterNum,
      currentMeter: currMeterNum,
      calibrationLiters: calibrationNum,
      dispensedLiters: netDispensed,
      pricePerLiter: selectedTank.unitPrice,
      expectedRevenue: expectedTotal,
      actualCashReceived: cashNum,
      actualElectronicReceived: electNum,
      actualCreditSales: creditNum,
      varianceAmount: cashVariance,
      status: 'CONFIRMED',
    };

    // Update tank current stock: subtract net dispensed liters
    setTanks((prev) =>
      prev.map((t) => {
        if (t.id === entryTankId) {
          const newStock = Math.max(0, t.currentStockLiters - netDispensed);
          return {
            ...t,
            currentStockLiters: newStock,
            actualDipReadingLiters: newStock,
            lastUpdated: new Date().toISOString(),
          };
        }
        return t;
      })
    );

    setRecords((prev) => [newRecord, ...prev]);
    setIsNewEntryOpen(false);
    setEntryCurrMeter('');
    setEntryCashReceived('');

    // Automatically post balanced accounting entry to General Ledger
    fetch('/api/v1/ledger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transaction_date: selectedDate,
        date: selectedDate,
        account_type: 'SALES_REVENUE',
        account_name: 'إيرادات مبيعات الوقود والغاز',
        reference_type: 'FUEL_PUMP_SHIFT',
        reference_id: newRecord.id,
        debit: totalActual,
        credit: expectedTotal,
        description: `إثبات مبيعات محطة الوقود - ${entryPump} (${selectedTank.name}) - عداد: ${prevMeterNum} إلى ${currMeterNum} (${netDispensed} لتر) - المسؤول: ${entryOperator}`,
        created_by_name: entryOperator,
      }),
    }).catch((err) => console.warn('Ledger sync failed:', err));

    setSuccessMessage('تم اعتماد وترحيل قراءة العداد وخصم الكمية من الخزان وقيدها محاسبياً بنجاح!');
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Submit Tank Refill
  const handleSaveRefill = (e: React.FormEvent) => {
    e.preventDefault();
    const refillL = parseEnglishNumber(refillLiters);
    if (refillL <= 0) return;

    const targetTank = tanks.find((t) => t.id === refillTankId);
    const refillCost = refillL * (targetTank?.unitPrice || 0);

    setTanks((prev) =>
      prev.map((t) => {
        if (t.id === refillTankId) {
          const updatedStock = Math.min(t.capacityLiters, t.currentStockLiters + refillL);
          return {
            ...t,
            currentStockLiters: updatedStock,
            todayRefillLiters: (t.todayRefillLiters || 0) + refillL,
            actualDipReadingLiters: updatedStock,
            lastUpdated: new Date().toISOString(),
          };
        }
        return t;
      })
    );

    // Automatically post balanced accounting entry for fuel inventory purchase
    fetch('/api/v1/ledger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transaction_date: new Date().toISOString().split('T')[0],
        date: new Date().toISOString().split('T')[0],
        account_type: 'PURCHASE_EXPENSE',
        account_name: 'مشتريات وتفريغ محروقات الخزانات',
        reference_type: 'FUEL_TANK_REFILL',
        reference_id: `refill-${Date.now()}`,
        debit: refillCost,
        credit: refillCost,
        description: `تفريغ شحنة محروقات (ناقلة) في ${targetTank?.name || 'خزان الوقود'} - ${refillL} لتر من ${refillSupplier}`,
        created_by_name: 'مدير المحطة',
      }),
    }).catch((err) => console.warn('Ledger sync failed:', err));

    setIsRefillModalOpen(false);
    setRefillLiters('');
    setSuccessMessage(`تم بنجاح تسجيل تفريغ شحنة وقود (${formatNumber(refillL)} لتر) وقيدها في دفتر الأستاذ!`);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Printable A4 Daily Reconciliation Report
  const handlePrintDailyReport = () => {
    window.print();
  };

  // Export Config
  const getFuelExportConfig = () => ({
    title: `تقرير الجرد اليومي لمحطة الوقود والغاز - ${selectedDate}`,
    filename: `Fuel_Station_Report_${selectedDate}`,
    headers: ['الطرمبة / المسدس', 'الوقود', 'العامل', 'الوردية', 'العداد السابق', 'العداد الحالي', 'المعايرة', 'المعبأ (لتر)', 'سعر اللتر', 'المطلوب دفترياً', 'المسلم فعلياً', 'الفارق'],
    rows: records.map((r) => [
      r.nozzleLabel,
      r.fuelType === 'petrol_91' ? 'بنزين 91' : r.fuelType === 'petrol_95' ? 'بنزين 95' : r.fuelType === 'diesel' ? 'ديزل' : 'غاز',
      r.operatorName,
      r.shift === 'MORNING' ? 'صباحية' : r.shift === 'EVENING' ? 'مسائية' : 'يوم كامل',
      formatNumber(r.previousMeter),
      formatNumber(r.currentMeter),
      formatNumber(r.calibrationLiters),
      formatNumber(r.dispensedLiters),
      formatAmount(r.pricePerLiter),
      formatAmount(r.expectedRevenue),
      formatAmount(r.actualCashReceived + r.actualElectronicReceived + r.actualCreditSales),
      formatAmount(r.varianceAmount),
    ]),
  });

  // Shift Totals
  const shiftRecords = records.filter((r) => r.date === selectedDate);
  const totalLitersDispensed = shiftRecords.reduce((sum, r) => sum + r.dispensedLiters, 0);
  const totalExpectedRevenue = shiftRecords.reduce((sum, r) => sum + r.expectedRevenue, 0);
  const totalActualReceived = shiftRecords.reduce((sum, r) => sum + (r.actualCashReceived + r.actualElectronicReceived + r.actualCreditSales), 0);
  const totalVariance = totalActualReceived - totalExpectedRevenue;

  return (
    <div className="space-y-6">
      {/* Top Banner & Station Stats */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Fuel className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">محطة الوقود والغاز المركزية</h1>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  إدارة العدادات والخزانات
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                سجل الجرد اليومي لعدادات الطرمبات، متابعة منسوب الخزانات الأرضية، ومطابقة عهدة العمال اليومية
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setIsRefillModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded-xl text-xs font-bold border border-teal-500/30 transition-all cursor-pointer shadow-sm"
            >
              <Droplets className="w-4 h-4 text-teal-400" />
              <span>تفريغ ناقلة وقود (وايت)</span>
            </button>

            <button
              type="button"
              onClick={() => setIsNewEntryOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-md shadow-amber-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>تسجيل قراءة عداد طرمبة</span>
            </button>

            <button
              type="button"
              onClick={handlePrintDailyReport}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الجرد A4</span>
            </button>

            <ExportActions getConfig={getFuelExportConfig} />
          </div>
        </div>

        {/* Global Station Metrics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
            <span className="text-[11px] text-slate-400">إجمالي المعبأ لليوم (لتر)</span>
            <div className="text-lg font-bold text-white font-mono flex items-center justify-between">
              <span>{formatNumber(totalLitersDispensed)} لتر</span>
              <Gauge className="w-4 h-4 text-amber-400" />
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
            <span className="text-[11px] text-slate-400">الإيراد الدفتري المطلوب</span>
            <div className="text-lg font-bold text-emerald-400 font-mono">
              {formatAmount(totalExpectedRevenue, 'YER')}
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
            <span className="text-[11px] text-slate-400">المبلغ المسلم فعلياً (نقد وشبكة)</span>
            <div className="text-lg font-bold text-blue-400 font-mono">
              {formatAmount(totalActualReceived, 'YER')}
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
            <span className="text-[11px] text-slate-400">الفارق المالي لعمال الوردية</span>
            <div className={`text-lg font-bold font-mono flex items-center gap-1 ${
              totalVariance >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {totalVariance === 0 ? (
                <span className="text-emerald-400">مطابق تماماً (0)</span>
              ) : totalVariance > 0 ? (
                <span>+{formatNumber(totalVariance)} YER (فائض)</span>
              ) : (
                <span>{formatNumber(totalVariance)} YER (عجز)</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-950/80 border border-emerald-700/60 rounded-xl text-xs text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Section Sub-Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('meters')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'meters'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Gauge className="w-4 h-4" />
          <span>جرد عدادات الطرمبات اليومي ({shiftRecords.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tanks')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'tanks'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Fuel className="w-4 h-4" />
          <span>خزانات الوقود والغاز الأرضية ({tanks.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: جرد عدادات الطرمبات اليومي (Daily Pump Meters & Shift Reconciliation) */}
      {/* ========================================================================= */}
      {activeTab === 'meters' && (
        <div className="space-y-4">
          {/* Shift Filter Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3.5 rounded-xl text-xs">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-slate-400">تاريخ الجرد:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs font-mono"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400">الوردية:</span>
                <select
                  value={selectedShift}
                  onChange={(e) => setSelectedShift(e.target.value as any)}
                  className="bg-slate-950 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs"
                >
                  <option value="MORNING">الوردية الصباحية</option>
                  <option value="EVENING">الوردية المسائية</option>
                  <option value="FULL_DAY">اليوم الكامل</option>
                </select>
              </div>
            </div>

            <div className="text-[11px] text-slate-400">
              يتم ترحيل الكميات فورياً لتحديث أرصدة الخزانات الأرضية والدفتر المالي
            </div>
          </div>

          {/* Meter Records Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">الطرمبة / المسدس</th>
                    <th className="p-3.5">العامل والوردية</th>
                    <th className="p-3.5 font-mono text-center">العداد السابق</th>
                    <th className="p-3.5 font-mono text-center">العداد الحالي</th>
                    <th className="p-3.5 font-mono text-center">المعايرة</th>
                    <th className="p-3.5 font-mono text-center text-amber-400">المعبأ اليوم (لتر)</th>
                    <th className="p-3.5 font-mono text-left">سعر اللتر</th>
                    <th className="p-3.5 font-mono text-left">المطلوب دفترياً</th>
                    <th className="p-3.5 font-mono text-left">المسلم فعلياً</th>
                    <th className="p-3.5 text-center">الفارق المالي</th>
                    <th className="p-3.5 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-slate-500">
                        لا توجد قراءات عدادات مسجلة لهذا التاريخ. اضغط على زر "تسجيل قراءة عداد طرمبة" للبدء.
                      </td>
                    </tr>
                  ) : (
                    records.map((rec) => {
                      const totalActualTendered = rec.actualCashReceived + rec.actualElectronicReceived + rec.actualCreditSales;
                      return (
                        <tr key={rec.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3.5">
                            <div className="font-bold text-white">{rec.nozzleLabel}</div>
                            <div className="text-[10px] text-amber-400/90 font-medium mt-0.5">
                              {rec.fuelType === 'petrol_91' && 'بنزين ممتاز 91'}
                              {rec.fuelType === 'petrol_95' && 'بنزين سوبر 95'}
                              {rec.fuelType === 'diesel' && 'ديزل سولار'}
                              {rec.fuelType === 'gas' && 'غاز مسال مركزي'}
                            </div>
                          </td>

                          <td className="p-3.5">
                            <div className="font-semibold text-slate-200">{rec.operatorName}</div>
                            <div className="text-[10px] text-slate-400">
                              {rec.shift === 'MORNING' ? 'وردية صباحية' : rec.shift === 'EVENING' ? 'وردية مسائية' : 'يوم كامل'}
                            </div>
                          </td>

                          <td className="p-3.5 font-mono text-center text-slate-400">
                            {formatNumber(rec.previousMeter)}
                          </td>

                          <td className="p-3.5 font-mono text-center text-slate-200 font-bold">
                            {formatNumber(rec.currentMeter)}
                          </td>

                          <td className="p-3.5 font-mono text-center text-slate-400">
                            {formatNumber(rec.calibrationLiters)}
                          </td>

                          <td className="p-3.5 font-mono text-center font-bold text-amber-400 text-sm bg-amber-500/5">
                            {formatNumber(rec.dispensedLiters)} لتر
                          </td>

                          <td className="p-3.5 font-mono text-left text-slate-400">
                            {formatAmount(rec.pricePerLiter, 'YER')}
                          </td>

                          <td className="p-3.5 font-mono text-left font-bold text-emerald-400">
                            {formatAmount(rec.expectedRevenue, 'YER')}
                          </td>

                          <td className="p-3.5 font-mono text-left text-blue-300">
                            {formatAmount(totalActualTendered, 'YER')}
                            <div className="text-[9px] text-slate-500">
                              نقد: {formatNumber(rec.actualCashReceived)} | شبكة: {formatNumber(rec.actualElectronicReceived)}
                            </div>
                          </td>

                          <td className="p-3.5 text-center">
                            {rec.varianceAmount === 0 ? (
                              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/50">
                                مطابق (0)
                              </span>
                            ) : rec.varianceAmount > 0 ? (
                              <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/50">
                                +{formatNumber(rec.varianceAmount)} فائض
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800/50">
                                {formatNumber(rec.varianceAmount)} عجز
                              </span>
                            )}
                          </td>

                          <td className="p-3.5 text-center">
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              معتمد ومرحل
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: خزانات الوقود والغاز الأرضية (Underground Tanks & Storage Levels)   */}
      {/* ========================================================================= */}
      {activeTab === 'tanks' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tanks.map((tank) => {
            const fillPercentage = Math.round((tank.currentStockLiters / tank.capacityLiters) * 100);
            const isLow = fillPercentage < 25;
            const variance = tank.actualDipReadingLiters - tank.currentStockLiters;

            return (
              <div
                key={tank.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 relative overflow-hidden"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                      <Fuel className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">{tank.name}</h3>
                      <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                        <span>{tank.tankNumber}</span>
                        <span>•</span>
                        <span className="text-emerald-400 font-bold">
                          سعر البيع: {formatAmount(tank.unitPrice, tank.currency)} / لتر
                        </span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                      isLow
                        ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                        : fillPercentage > 75
                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    {fillPercentage}% من السعة
                  </span>
                </div>

                {/* Visual Gauge Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                    <span>الرصيد الفعلي: <strong className="text-white">{formatNumber(tank.currentStockLiters)}</strong> لتر</span>
                    <span>السعة الكلية: {formatNumber(tank.capacityLiters)} لتر</span>
                  </div>
                  <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isLow ? 'bg-rose-500' : fillPercentage > 75 ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(2, fillPercentage))}%` }}
                    />
                  </div>
                </div>

                {/* Tank Metrics Details */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-[11px]">
                  <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                    <span className="text-slate-400 block">رصيد الأمس</span>
                    <strong className="text-white font-mono">{formatNumber(tank.previousBalanceLiters)} لتر</strong>
                  </div>

                  <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                    <span className="text-slate-400 block">تفريغ اليوم</span>
                    <strong className="text-teal-400 font-mono">+{formatNumber(tank.todayRefillLiters)} لتر</strong>
                  </div>

                  <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                    <span className="text-slate-400 block">قياس المسطرة (Dip)</span>
                    <strong className="text-slate-200 font-mono">{formatNumber(tank.actualDipReadingLiters)} لتر</strong>
                  </div>
                </div>

                {/* Evaporation & Dip Variance */}
                <div className="flex items-center justify-between text-[11px] bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-blue-400" />
                    <span>فارق القياس والتبخر اليومي:</span>
                  </span>
                  <span className={`font-bold font-mono ${variance === 0 ? 'text-emerald-400' : variance > 0 ? 'text-emerald-300' : 'text-rose-400'}`}>
                    {variance === 0 ? 'مطابق دفترياً (0)' : `${variance > 0 ? '+' : ''}${formatNumber(variance)} لتر`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: تسجيل قراءة عداد طرمبة جديدة (New Pump Meter Reading Modal)       */}
      {/* ========================================================================= */}
      {isNewEntryOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-2">
                <Gauge className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-sm">تسجيل قراءة عداد طرمبة الوقود والغاز</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewEntryOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMeterRecord} className="p-5 space-y-4 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    الخزان المصدر المرتبط
                  </label>
                  <select
                    value={entryTankId}
                    onChange={(e) => handleTankChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    {tanks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({formatAmount(t.unitPrice, t.currency)}/لتر)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    الطرمبة / المسدس
                  </label>
                  <input
                    type="text"
                    value={entryPump}
                    onChange={(e) => setEntryPump(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    placeholder="طرمبة 1 - مسدس A"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    اسم عامل الطرمبة
                  </label>
                  <input
                    type="text"
                    value={entryOperator}
                    onChange={(e) => setEntryOperator(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    placeholder="اسم العامل المسؤول"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    الوردية
                  </label>
                  <select
                    value={selectedShift}
                    onChange={(e) => setSelectedShift(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="MORNING">الوردية الصباحية</option>
                    <option value="EVENING">الوردية المسائية</option>
                    <option value="FULL_DAY">اليوم الكامل</option>
                  </select>
                </div>
              </div>

              {/* Meter Readings Row */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Gauge className="w-4 h-4" />
                  <span>قراءات العدادات بالأرقام الإنجليزية (0-9)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      العداد السابق (الإغلاق)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      dir="ltr"
                      lang="en"
                      value={entryPrevMeter}
                      onChange={(e) => setEntryPrevMeter(toEnglishDigits(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono font-bold focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-amber-300 font-bold mb-1">
                      العداد الحالي الآن *
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      dir="ltr"
                      lang="en"
                      value={entryCurrMeter}
                      onChange={(e) => setEntryCurrMeter(toEnglishDigits(e.target.value))}
                      className="w-full bg-slate-900 border border-amber-500 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
                      placeholder="0.0"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      لترات الفحص والمعايرة
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      dir="ltr"
                      lang="en"
                      value={entryCalibration}
                      onChange={(e) => setEntryCalibration(toEnglishDigits(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Live Computed Liters & Revenue */}
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400">كم لتر عبأ اليوم: </span>
                    <strong className="text-amber-400 font-mono text-sm">{formatNumber(netDispensed)} لتر</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">إجمالي المبلغ المطلوب دفترياً: </span>
                    <strong className="text-emerald-400 font-mono text-sm">{formatAmount(expectedTotal, 'YER')}</strong>
                  </div>
                </div>
              </div>

              {/* Cash Reconciliation Breakdown */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4" />
                  <span>المطابقة المالية لعهدة عامل الطرمبة</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">النقد المسلم فعلياً (Cash)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      dir="ltr"
                      lang="en"
                      value={entryCashReceived}
                      onChange={(e) => setEntryCashReceived(toEnglishDigits(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">مدفوعات شبكة ومحافظ (POS/Wallets)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      dir="ltr"
                      lang="en"
                      value={entryElectronicReceived}
                      onChange={(e) => setEntryElectronicReceived(toEnglishDigits(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">مبيعات آجلة (فواتير معتمدة)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      dir="ltr"
                      lang="en"
                      value={entryCreditSales}
                      onChange={(e) => setEntryCreditSales(toEnglishDigits(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Variance Live Badge */}
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400">إجمالي المسلم من العامل: </span>
                    <strong className="text-white font-mono">{formatAmount(totalActual, 'YER')}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">الفارق المالي: </span>
                    <strong className={`font-mono text-sm ${
                      cashVariance === 0 ? 'text-emerald-400' : cashVariance > 0 ? 'text-emerald-300' : 'text-rose-400'
                    }`}>
                      {cashVariance === 0 ? 'مطابق تماماً (0)' : `${cashVariance > 0 ? '+' : ''}${formatNumber(cashVariance)} YER`}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewEntryOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md shadow-amber-500/20"
                >
                  اعتماد جرد الطرمبة وترحيل المخزون
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: تفريغ شحنة وقود في الخزان (Tank Refill Modal)                    */}
      {/* ========================================================================= */}
      {isRefillModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-2">
                <Droplets className="w-5 h-5 text-teal-400" />
                <h3 className="font-bold text-white text-sm">تسجيل تفريغ شحنة وقود (وايت / ناقلة)</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRefillModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRefill} className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  الخزان المستلم للشحنة *
                </label>
                <select
                  value={refillTankId}
                  onChange={(e) => setRefillTankId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  {tanks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (المتاح للتعبئة: {formatNumber(t.capacityLiters - t.currentStockLiters)} لتر)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  الكمية المفرغة باللتر *
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  dir="ltr"
                  lang="en"
                  value={refillLiters}
                  onChange={(e) => setRefillLiters(toEnglishDigits(e.target.value))}
                  className="w-full bg-slate-950 border border-teal-500 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold"
                  placeholder="مثال: 10000"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  المورد / بيانات الناقلة أو السائق
                </label>
                <input
                  type="text"
                  value={refillSupplier}
                  onChange={(e) => setRefillSupplier(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRefillModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md shadow-teal-500/20"
                >
                  تأكيد التوريد وتحديث الرصيد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
