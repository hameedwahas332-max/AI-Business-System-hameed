import React, { useState, useEffect } from 'react';
import {
  X,
  Coins,
  TrendingUp,
  RotateCcw,
  Save,
  CheckCircle2,
  Printer,
  Calendar,
  AlertCircle,
  ArrowRightLeft,
  Sparkles,
} from 'lucide-react';
import {
  getStoredExchangeRates,
  saveStoredExchangeRates,
  ExchangeRateConfig,
  DEFAULT_EXCHANGE_RATES,
  SupportedCurrency,
  convertCurrency,
} from '../../lib/exchangeRates';
import { formatNumber, parseEnglishNumber } from '../../lib/formatters';
import { renderAndPrintDocument } from '../../lib/exportUtils';

interface DailyExchangeRateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DailyExchangeRateModal: React.FC<DailyExchangeRateModalProps> = ({ isOpen, onClose }) => {
  const [ratesConfig, setRatesConfig] = useState<ExchangeRateConfig>(getStoredExchangeRates);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Quick Calculator State
  const [calcAmount, setCalcAmount] = useState<string>('100');
  const [calcFromCurrency, setCalcFromCurrency] = useState<SupportedCurrency>('SAR');

  useEffect(() => {
    if (isOpen) {
      setRatesConfig(getStoredExchangeRates());
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRateChange = (
    curr: 'SAR' | 'USD',
    field: 'buyRate' | 'sellRate' | 'accountingRate',
    value: string
  ) => {
    const num = parseEnglishNumber(value, 0);
    setRatesConfig((prev) => ({
      ...prev,
      lastUpdated: new Date().toISOString().split('T')[0],
      rates: {
        ...prev.rates,
        [curr]: {
          ...prev.rates[curr],
          [field]: num,
        },
      },
    }));
  };

  const handleSave = () => {
    saveStoredExchangeRates(ratesConfig);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleResetDefaults = () => {
    setRatesConfig(DEFAULT_EXCHANGE_RATES);
    saveStoredExchangeRates(DEFAULT_EXCHANGE_RATES);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handlePrintBulletin = () => {
    const dateStr = ratesConfig.lastUpdated || new Date().toISOString().split('T')[0];
    const sar = ratesConfig.rates.SAR;
    const usd = ratesConfig.rates.USD;

    const html = `
      <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 18px;">
        <h1 style="margin: 0; font-size: 20px; font-weight: 900; color: #0f172a;">نشرة أسعار الصرف الرسمية المعتمدة</h1>
        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
          تاريخ الاعتماد: <span class="font-mono">${dateStr}</span> | العملة الأساسية: <strong>ريال يمني (YER)</strong>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background: #f1f5f9; text-align: right;">
            <th style="padding: 10px; border: 1px solid #cbd5e1;">العملة</th>
            <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: center;">الرمز</th>
            <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: left;">سعر الشراء (YER)</th>
            <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: left;">سعر البيع (YER)</th>
            <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: left;">سعر التحويل المحاسبي</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold;">🇸🇦 ريال سعودي (SAR)</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: center; font-family: monospace;">SAR</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: left; font-family: monospace;">${formatNumber(sar.buyRate)} YER</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: left; font-family: monospace;">${formatNumber(sar.sellRate)} YER</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: left; font-family: monospace; font-weight: bold; color: #0f172a;">${formatNumber(sar.accountingRate)} YER</td>
          </tr>
          <tr style="background: #f8fafc;">
            <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold;">🇺🇸 دولار أمريكي (USD)</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: center; font-family: monospace;">USD</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: left; font-family: monospace;">${formatNumber(usd.buyRate)} YER</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: left; font-family: monospace;">${formatNumber(usd.sellRate)} YER</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: left; font-family: monospace; font-weight: bold; color: #0f172a;">${formatNumber(usd.accountingRate)} YER</td>
          </tr>
        </tbody>
      </table>

      <div style="border: 1px dashed #94a3b8; border-radius: 8px; padding: 12px; font-size: 11px; color: #475569; background: #fafafa;">
        <strong>ملاحظة الاعتماد:</strong> تُطبق هذه الأسعار على كافة فواتير المبيعات، سندات القبض والصرف، وفواتير المشتريات حتى إصدار النشرة التالية.
      </div>
    `;

    renderAndPrintDocument(html, `نشرة_أسعار_الصرف_${dateStr}`);
  };

  // Live calculator calculation
  const calcNum = parseEnglishNumber(calcAmount, 0);
  const calcInYER = convertCurrency(calcNum, calcFromCurrency, 'YER', ratesConfig);
  const calcInSAR = convertCurrency(calcNum, calcFromCurrency, 'SAR', ratesConfig);
  const calcInUSD = convertCurrency(calcNum, calcFromCurrency, 'USD', ratesConfig);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-150"
      dir="rtl"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden text-right flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                نشرة أسعار الصرف اليومية (Daily Exchange Rate Board)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                تحديد أسعار الشراء، البيع، والتحويل المحاسبي للعملات الرئيسية مقابل الريال اليمني
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert */}
        {savedSuccess && (
          <div className="mx-6 mt-4 p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-bold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>تم حفظ أسعار الصرف بنجاح وتحديث كافة المعاملات والحسابات فوراً!</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {/* Base Currency Banner */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🇾🇪</span>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>ريال يمني (YER)</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold border border-emerald-500/30">
                    العملة الأساسية للنظام (Base Currency)
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  جميع القيود المحاسبية، كشوفات الأستاذ العام، والقوائم المالية تُسجل وتُعادل بالريال اليمني
                </div>
              </div>
            </div>
            <div className="font-mono text-xs font-black text-emerald-400 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
              1.00 YER
            </div>
          </div>

          {/* Currency Rates Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* SAR Card */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🇸🇦</span>
                  <div>
                    <h3 className="text-xs font-bold text-white">ريال سعودي (SAR)</h3>
                    <span className="text-[10px] text-slate-400 font-mono">1 SAR = ... YER</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                  شائع التداول
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    سعر التحويل المحاسبي والفواتير <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={ratesConfig.rates.SAR.accountingRate}
                    onChange={(e) => handleRateChange('SAR', 'accountingRate', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">سعر الشراء (شراء من العميل)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={ratesConfig.rates.SAR.buyRate}
                      onChange={(e) => handleRateChange('SAR', 'buyRate', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-slate-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">سعر البيع (صرف للمورد)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={ratesConfig.rates.SAR.sellRate}
                      onChange={(e) => handleRateChange('SAR', 'sellRate', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-slate-600"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* USD Card */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🇺🇸</span>
                  <div>
                    <h3 className="text-xs font-bold text-white">دولار أمريكي (USD)</h3>
                    <span className="text-[10px] text-slate-400 font-mono">1 USD = ... YER</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20">
                  تجارة واستيراد
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    سعر التحويل المحاسبي والفواتير <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={ratesConfig.rates.USD.accountingRate}
                    onChange={(e) => handleRateChange('USD', 'accountingRate', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold text-sm focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">سعر الشراء (شراء من العميل)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={ratesConfig.rates.USD.buyRate}
                      onChange={(e) => handleRateChange('USD', 'buyRate', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-slate-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">سعر البيع (صرف للمورد)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={ratesConfig.rates.USD.sellRate}
                      onChange={(e) => handleRateChange('USD', 'sellRate', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-slate-600"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Conversion Calculator Tool */}
          <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <ArrowRightLeft className="w-3.5 h-3.5 text-cyan-400" />
                <span>حاسبة التحويل السريع المباشرة</span>
              </h4>
              <span className="text-[10px] text-slate-500 font-mono">حساب فوري للأرصدة</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-[10px] text-slate-400 mb-1">المبلغ المراد تحويله</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={calcAmount}
                    onChange={(e) => setCalcAmount(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-cyan-400"
                  />
                  <select
                    value={calcFromCurrency}
                    onChange={(e) => setCalcFromCurrency(e.target.value as SupportedCurrency)}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-2 py-1.5 text-xs text-white font-bold focus:outline-none"
                  >
                    <option value="SAR">SAR</option>
                    <option value="USD">USD</option>
                    <option value="YER">YER</option>
                  </select>
                </div>
              </div>

              <div className="sm:col-span-2 grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                  <div className="text-[9px] text-slate-400">المعادل باليمني</div>
                  <div className="text-xs font-black font-mono text-emerald-400 mt-1 truncate">
                    {formatNumber(calcInYER)}
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono">YER</div>
                </div>

                <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                  <div className="text-[9px] text-slate-400">المعادل بالسعودي</div>
                  <div className="text-xs font-black font-mono text-amber-400 mt-1 truncate">
                    {formatNumber(calcInSAR)}
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono">SAR</div>
                </div>

                <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                  <div className="text-[9px] text-slate-400">المعادل بالدولار</div>
                  <div className="text-xs font-black font-mono text-blue-400 mt-1 truncate">
                    {formatNumber(calcInUSD)}
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono">USD</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
              title="استعادة الأسعار التأشيرية الافتراضية"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>استعادة الافتراضي</span>
            </button>

            <button
              type="button"
              onClick={handlePrintBulletin}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
              title="طباعة النشرة الرسمية اليومية"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة النشرة الرسمية</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white text-xs font-semibold"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>حفظ وتطبيق الأسعار</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
