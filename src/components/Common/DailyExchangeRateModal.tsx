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
import { formatNumber, parseEnglishNumber, toEnglishDigits } from '../../lib/formatters';
import { renderAndPrintDocument } from '../../lib/exportUtils';

interface DailyExchangeRateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DailyExchangeRateModal: React.FC<DailyExchangeRateModalProps> = ({ isOpen, onClose }) => {
  const [ratesConfig, setRatesConfig] = useState<ExchangeRateConfig>(getStoredExchangeRates);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Quick Calculator State (string for smooth typing)
  const [calcAmount, setCalcAmount] = useState<string>('100');
  const [calcFromCurrency, setCalcFromCurrency] = useState<SupportedCurrency>('SAR');

  // String input states for English numerals & clean decimal typing
  const [rateInputs, setRateInputs] = useState<{
    sarAccounting: string;
    sarBuy: string;
    sarSell: string;
    usdAccounting: string;
    usdBuy: string;
    usdSell: string;
  }>({
    sarAccounting: '535',
    sarBuy: '535',
    sarSell: '537',
    usdAccounting: '2050',
    usdBuy: '2045',
    usdSell: '2055',
  });

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredExchangeRates();
      setRatesConfig(stored);
      setRateInputs({
        sarAccounting: String(stored.rates?.SAR?.accountingRate ?? 535),
        sarBuy: String(stored.rates?.SAR?.buyRate ?? 535),
        sarSell: String(stored.rates?.SAR?.sellRate ?? 537),
        usdAccounting: String(stored.rates?.USD?.accountingRate ?? 2050),
        usdBuy: String(stored.rates?.USD?.buyRate ?? 2045),
        usdSell: String(stored.rates?.USD?.sellRate ?? 2055),
      });
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRateInputChange = (
    curr: 'SAR' | 'USD',
    field: 'buyRate' | 'sellRate' | 'accountingRate',
    rawVal: string,
    stateKey: keyof typeof rateInputs
  ) => {
    // Convert any Arabic-Indic digits ٠-٩ to English 0-9 and keep only valid decimal characters
    const englishVal = toEnglishDigits(rawVal).replace(/[^0-9.]/g, '');
    setRateInputs((prev) => ({ ...prev, [stateKey]: englishVal }));
    const num = parseEnglishNumber(englishVal, 0);
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
    setRateInputs({
      sarAccounting: String(DEFAULT_EXCHANGE_RATES.rates.SAR.accountingRate),
      sarBuy: String(DEFAULT_EXCHANGE_RATES.rates.SAR.buyRate),
      sarSell: String(DEFAULT_EXCHANGE_RATES.rates.SAR.sellRate),
      usdAccounting: String(DEFAULT_EXCHANGE_RATES.rates.USD.accountingRate),
      usdBuy: String(DEFAULT_EXCHANGE_RATES.rates.USD.buyRate),
      usdSell: String(DEFAULT_EXCHANGE_RATES.rates.USD.sellRate),
    });
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
      className="fixed inset-0 z-50 flex items-center justify-center m3-backdrop p-4 overflow-y-auto animate-in fade-in duration-150"
      dir="rtl"
    >
      <div className="m3-modal-surface w-full max-w-2xl overflow-hidden text-right flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-[var(--md-surface-container)] border-b border-[var(--md-outline-variant)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[var(--md-secondary-container)] border border-[color-mix(in_srgb,var(--md-secondary)_32%,transparent)] flex items-center justify-center text-[var(--md-secondary)] shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-[var(--md-on-surface)] flex items-center flex-wrap gap-2">
                <span>نشرة أسعار الصرف اليومية (Daily Exchange Rate Board)</span>
              </h2>
              <p className="text-xs text-[var(--md-on-surface-variant)] mt-0.5">
                تحديد أسعار الشراء، البيع، والتحويل المحاسبي للعملات الرئيسية مقابل الريال اليمني
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="m3-btn-text !min-h-[36px] p-1.5 shrink-0"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert */}
        {savedSuccess && (
          <div className="mx-6 mt-4 p-3 bg-[var(--md-success-container)] border border-[color-mix(in_srgb,var(--md-success)_32%,transparent)] rounded-xl text-[var(--md-on-success-container)] text-xs font-bold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[var(--md-success)]" />
            <span>تم حفظ أسعار الصرف بنجاح وتحديث كافة المعاملات والحسابات فوراً!</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh] custom-scrollbar">
          {/* Base Currency Banner */}
          <div className="bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl shrink-0">🇾🇪</span>
              <div>
                <div className="text-xs font-bold text-[var(--md-on-surface)] flex items-center flex-wrap gap-2">
                  <span>ريال يمني (YER)</span>
                  <span className="m3-badge m3-badge-primary">
                    العملة الأساسية للنظام (Base Currency)
                  </span>
                </div>
                <div className="text-[11px] text-[var(--md-on-surface-variant)] mt-1 leading-relaxed">
                  جميع القيود المحاسبية، كشوفات الأستاذ العام، والقوائم المالية تُسجل وتُعادل بالريال اليمني
                </div>
              </div>
            </div>
            <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1.5 shrink-0">
              <div className="font-mono tabular-nums text-xs font-black text-[var(--md-on-primary-container)] bg-[var(--md-primary-container)] px-3 py-1.5 rounded-xl border border-[color-mix(in_srgb,var(--md-primary)_30%,transparent)]">
                1.00 YER
              </div>
              {ratesConfig.lastUpdated && (
                <span className="text-[10px] text-[var(--md-on-surface-variant)] font-mono tabular-nums inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{ratesConfig.lastUpdated}</span>
                </span>
              )}
            </div>
          </div>

          {/* Currency Rates Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* SAR Card */}
            <div className="bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2.5 border-b border-[var(--md-outline-variant)]">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🇸🇦</span>
                  <div>
                    <h3 className="text-xs font-bold text-[var(--md-on-surface)]">ريال سعودي (SAR)</h3>
                    <span className="text-[10px] text-[var(--md-on-surface-variant)] font-mono tabular-nums">1 SAR = ... YER</span>
                  </div>
                </div>
                <span className="m3-badge m3-badge-secondary">
                  شائع التداول
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[11px] font-semibold text-[var(--md-on-surface-variant)] mb-1.5 flex items-center justify-between">
                    <span>
                      سعر التحويل المحاسبي والفواتير <span className="text-[var(--md-error)]">*</span>
                    </span>
                    <span className="text-[10px] text-[var(--md-secondary)] font-mono font-bold">0-9 EN</span>
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    dir="ltr"
                    lang="en"
                    value={rateInputs.sarAccounting}
                    onChange={(e) => handleRateInputChange('SAR', 'accountingRate', e.target.value, 'sarAccounting')}
                    placeholder="535.0"
                    className="m3-input font-mono tabular-nums font-bold text-sm text-left"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] font-semibold text-[var(--md-on-surface-variant)] mb-1 flex items-center justify-between">
                      <span>سعر الشراء</span>
                      <span className="text-[9px] text-[var(--md-on-surface-variant)] font-mono">0-9 EN</span>
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      dir="ltr"
                      lang="en"
                      value={rateInputs.sarBuy}
                      onChange={(e) => handleRateInputChange('SAR', 'buyRate', e.target.value, 'sarBuy')}
                      placeholder="535.0"
                      className="m3-input !h-9 px-2.5 text-xs font-mono tabular-nums font-semibold text-left"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-[var(--md-on-surface-variant)] mb-1 flex items-center justify-between">
                      <span>سعر البيع</span>
                      <span className="text-[9px] text-[var(--md-on-surface-variant)] font-mono">0-9 EN</span>
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      dir="ltr"
                      lang="en"
                      value={rateInputs.sarSell}
                      onChange={(e) => handleRateInputChange('SAR', 'sellRate', e.target.value, 'sarSell')}
                      placeholder="537.0"
                      className="m3-input !h-9 px-2.5 text-xs font-mono tabular-nums font-semibold text-left"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* USD Card */}
            <div className="bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2.5 border-b border-[var(--md-outline-variant)]">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🇺🇸</span>
                  <div>
                    <h3 className="text-xs font-bold text-[var(--md-on-surface)]">دولار أمريكي (USD)</h3>
                    <span className="text-[10px] text-[var(--md-on-surface-variant)] font-mono tabular-nums">1 USD = ... YER</span>
                  </div>
                </div>
                <span className="m3-badge m3-badge-info">
                  تجارة واستيراد
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[11px] font-semibold text-[var(--md-on-surface-variant)] mb-1.5 flex items-center justify-between">
                    <span>
                      سعر التحويل المحاسبي والفواتير <span className="text-[var(--md-error)]">*</span>
                    </span>
                    <span className="text-[10px] text-[var(--md-info)] font-mono font-bold">0-9 EN</span>
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    dir="ltr"
                    lang="en"
                    value={rateInputs.usdAccounting}
                    onChange={(e) => handleRateInputChange('USD', 'accountingRate', e.target.value, 'usdAccounting')}
                    placeholder="2050.0"
                    className="m3-input font-mono tabular-nums font-bold text-sm text-left"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] font-semibold text-[var(--md-on-surface-variant)] mb-1 flex items-center justify-between">
                      <span>سعر الشراء</span>
                      <span className="text-[9px] text-[var(--md-on-surface-variant)] font-mono">0-9 EN</span>
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      dir="ltr"
                      lang="en"
                      value={rateInputs.usdBuy}
                      onChange={(e) => handleRateInputChange('USD', 'buyRate', e.target.value, 'usdBuy')}
                      placeholder="2045.0"
                      className="m3-input !h-9 px-2.5 text-xs font-mono tabular-nums font-semibold text-left"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-[var(--md-on-surface-variant)] mb-1 flex items-center justify-between">
                      <span>سعر البيع</span>
                      <span className="text-[9px] text-[var(--md-on-surface-variant)] font-mono">0-9 EN</span>
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      dir="ltr"
                      lang="en"
                      value={rateInputs.usdSell}
                      onChange={(e) => handleRateInputChange('USD', 'sellRate', e.target.value, 'usdSell')}
                      placeholder="2055.0"
                      className="m3-input !h-9 px-2.5 text-xs font-mono tabular-nums font-semibold text-left"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Conversion Calculator Tool */}
          <div className="bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[var(--md-on-surface)] flex items-center gap-1.5">
                <ArrowRightLeft className="w-3.5 h-3.5 text-[var(--md-primary-text)]" />
                <span>حاسبة التحويل السريع المباشرة</span>
              </h4>
              <span className="text-[10px] text-[var(--md-on-surface-variant)] font-mono">حساب فوري للأرصدة</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div className="sm:col-span-1">
                <label className="text-[10px] font-semibold text-[var(--md-on-surface-variant)] mb-1 flex items-center justify-between">
                  <span>المبلغ المراد تحويله</span>
                  <span className="text-[9px] text-[var(--md-primary-text)] font-mono font-bold">0-9 EN</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    inputMode="decimal"
                    dir="ltr"
                    lang="en"
                    value={calcAmount}
                    onChange={(e) => {
                      const english = toEnglishDigits(e.target.value).replace(/[^0-9.]/g, '');
                      setCalcAmount(english);
                    }}
                    placeholder="100"
                    className="m3-input !h-10 px-2.5 text-xs font-mono tabular-nums font-bold text-left"
                  />
                  <select
                    value={calcFromCurrency}
                    onChange={(e) => setCalcFromCurrency(e.target.value as SupportedCurrency)}
                    className="m3-select !h-10 !w-auto min-w-[74px] px-2 text-xs font-bold"
                  >
                    <option value="SAR">SAR</option>
                    <option value="USD">USD</option>
                    <option value="YER">YER</option>
                  </select>
                </div>
              </div>

              <div className="sm:col-span-2 grid grid-cols-3 gap-2 text-center">
                <div className="bg-[var(--md-surface-container-lowest)] p-2.5 rounded-xl border border-[var(--md-outline-variant)]">
                  <div className="text-[10px] font-semibold text-[var(--md-on-surface-variant)]">المعادل باليمني</div>
                  <div className="text-xs font-black font-mono tabular-nums text-[var(--md-primary-text)] mt-1 truncate">
                    {formatNumber(calcInYER)}
                  </div>
                  <div className="text-[9px] text-[var(--md-on-surface-variant)] font-mono">YER</div>
                </div>

                <div className="bg-[var(--md-surface-container-lowest)] p-2.5 rounded-xl border border-[var(--md-outline-variant)]">
                  <div className="text-[10px] font-semibold text-[var(--md-on-surface-variant)]">المعادل بالسعودي</div>
                  <div className="text-xs font-black font-mono tabular-nums text-[var(--md-secondary)] mt-1 truncate">
                    {formatNumber(calcInSAR)}
                  </div>
                  <div className="text-[9px] text-[var(--md-on-surface-variant)] font-mono">SAR</div>
                </div>

                <div className="bg-[var(--md-surface-container-lowest)] p-2.5 rounded-xl border border-[var(--md-outline-variant)]">
                  <div className="text-[10px] font-semibold text-[var(--md-on-surface-variant)]">المعادل بالدولار</div>
                  <div className="text-xs font-black font-mono tabular-nums text-[var(--md-info)] mt-1 truncate">
                    {formatNumber(calcInUSD)}
                  </div>
                  <div className="text-[9px] text-[var(--md-on-surface-variant)] font-mono">USD</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-[var(--md-surface-container)] border-t border-[var(--md-outline-variant)] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="m3-btn-outlined text-xs"
              title="استعادة الأسعار التأشيرية الافتراضية"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>استعادة الافتراضي</span>
            </button>

            <button
              type="button"
              onClick={handlePrintBulletin}
              className="m3-btn-tonal text-xs"
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
              className="m3-btn-text text-xs"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="m3-btn-primary text-xs"
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
