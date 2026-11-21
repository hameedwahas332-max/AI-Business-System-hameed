import React, { useState } from 'react';
import { User, UserPlus, Search, Check, X, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Customer } from '../../../types';
import { formatAmount, toEnglishDigits } from '../../../lib/formatters';
import { api } from '../../../api';

interface POSCustomerSelectorProps {
  customers: Customer[];
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer | null) => void;
  currency: string;
  cartTotal: number;
  onCustomerCreated: (customer: Customer) => void;
}

export const POSCustomerSelector: React.FC<POSCustomerSelectorProps> = ({
  customers,
  selectedCustomer,
  onSelectCustomer,
  currency,
  cartTotal,
  onCustomerCreated,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [creditLimit, setCreditLimit] = useState('0');
  const [enforceCreditLimit, setEnforceCreditLimit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone && c.phone.includes(search))
  );

  // Selected customer credit limit status
  const selectedBalance = Number(selectedCustomer?.current_balance ?? (selectedCustomer as any)?.balance ?? 0);
  const selectedCreditLimit = Math.max(0, Number(selectedCustomer?.credit_limit ?? (selectedCustomer as any)?.creditLimit ?? 0));
  const isSelectedCreditEnforced = Boolean(
    selectedCustomer && selectedCustomer.enforce_credit_limit === true && selectedCreditLimit > 0
  );
  const selectedAvailableCredit = Math.max(0, Number((selectedCreditLimit - selectedBalance).toFixed(2)));
  const selectedCreditUsagePct = selectedCreditLimit > 0
    ? Math.round((Math.max(0, selectedBalance) / selectedCreditLimit) * 100)
    : 0;
  const wouldCartExceedCredit =
    isSelectedCreditEnforced && cartTotal > 0 && selectedBalance + cartTotal > selectedCreditLimit + 0.001;

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      setLoading(true);
      setError(null);
      const parsedLimit = Math.max(0, parseFloat(creditLimit) || 0);
      const res = await api.createCustomer({
        name: newName.trim(),
        phone: newPhone.trim() || undefined,
        credit_limit: parsedLimit,
        creditLimit: parsedLimit,
        enforce_credit_limit: enforceCreditLimit,
        currency,
        opening_balance: 0,
      });

      if (res.data) {
        const created = {
          ...res.data,
          credit_limit: res.data.credit_limit ?? parsedLimit,
          enforce_credit_limit: res.data.enforce_credit_limit ?? enforceCreditLimit,
        };
        onCustomerCreated(created);
        onSelectCustomer(created);
        setIsAddModalOpen(false);
        setNewName('');
        setNewPhone('');
        setCreditLimit('0');
        setEnforceCreditLimit(false);
      }
    } catch (err: any) {
      setError(err.message || 'فشل إضافة العميل');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex-1 flex items-center justify-between p-2.5 rounded-xl border transition-all text-right cursor-pointer ${
            selectedCustomer
              ? 'bg-[var(--md-primary-container)] border-[var(--md-primary)]/40 text-[var(--md-on-primary-container)]'
              : 'bg-[var(--md-surface-container-low)] border-[var(--md-outline-variant)] text-[var(--md-on-surface)] hover:border-[var(--md-outline)]'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                selectedCustomer
                  ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)]'
                  : 'bg-[var(--md-surface-container-high)] text-[var(--md-on-surface-variant)]'
              }`}
            >
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold truncate">
                {selectedCustomer ? selectedCustomer.name : 'عميل عام / نقدي (Cash Customer)'}
              </div>
              {selectedCustomer && (
                <div className="text-[10px] text-[var(--md-on-surface-variant)] tabular-nums">
                  الرصيد: {formatAmount(selectedBalance, selectedCustomer.currency || currency)}
                </div>
              )}
            </div>
          </div>
          {selectedCustomer && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onSelectCustomer(null);
              }}
              className="p-1 hover:bg-[var(--md-surface-container-high)] rounded text-[var(--md-on-surface-variant)] hover:text-[var(--md-error)]"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="m3-btn-outlined p-2.5 shrink-0"
          title="إضافة عميل جديد"
        >
          <UserPlus className="w-4 h-4" />
        </button>
      </div>

      {/* Compact M3 Credit Limit Indicator when customer has enforced credit limit */}
      {selectedCustomer && isSelectedCreditEnforced && (
        <div
          className={`mt-2 p-2.5 rounded-xl border text-[11px] space-y-1.5 transition-colors ${
            wouldCartExceedCredit
              ? 'bg-[var(--md-error-container)] border-[var(--md-error)]/30 text-[var(--md-on-error-container)]'
              : selectedCreditUsagePct >= 80
              ? 'bg-[var(--md-warning-container)] border-[var(--md-warning)]/30 text-[var(--md-on-warning-container)]'
              : 'bg-[var(--md-surface-container)] border-[var(--md-outline-variant)] text-[var(--md-on-surface)]'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold flex items-center gap-1.5">
              {wouldCartExceedCredit ? (
                <ShieldAlert className="w-3.5 h-3.5 text-[var(--md-error)] shrink-0" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5 text-[var(--md-primary-text)] shrink-0" />
              )}
              <span>السقف الائتماني المفعّل</span>
            </span>
            <span className="font-mono font-bold tabular-nums text-[10px]">
              {selectedCreditUsagePct}%
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-[10px] tabular-nums">
            <div>
              <span className="opacity-80 block">الرصيد</span>
              <strong className="font-mono">{formatAmount(selectedBalance, selectedCustomer.currency || currency)}</strong>
            </div>
            <div>
              <span className="opacity-80 block">السقف</span>
              <strong className="font-mono">{formatAmount(selectedCreditLimit, selectedCustomer.currency || currency)}</strong>
            </div>
            <div>
              <span className="opacity-80 block">المتاح</span>
              <strong className="font-mono">{formatAmount(selectedAvailableCredit, selectedCustomer.currency || currency)}</strong>
            </div>
          </div>
          <div className="h-1.5 w-full rounded-full bg-[var(--md-surface-container-highest)] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                selectedCreditUsagePct >= 100 || wouldCartExceedCredit
                  ? 'bg-[var(--md-error)]'
                  : selectedCreditUsagePct >= 80
                  ? 'bg-[var(--md-warning)]'
                  : 'bg-[var(--md-primary)]'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, selectedCreditUsagePct))}%` }}
            />
          </div>
          {wouldCartExceedCredit && (
            <div className="text-[10px] font-semibold leading-snug">
              قيمة السلة تتجاوز الرصيد المتاح للآجل — يُسمح بالدفع النقدي الكامل أو سداد الفرق نقداً.
            </div>
          )}
        </div>
      )}

      {isOpen && (
        <div className="absolute top-full right-0 left-0 mt-1.5 m3-modal-surface rounded-2xl z-50 p-2 space-y-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--md-on-surface-variant)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم أو الهاتف..."
              className="m3-input w-full pr-8 pl-3 py-1.5 text-xs"
              autoFocus
            />
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1">
            <button
              type="button"
              onClick={() => {
                onSelectCustomer(null);
                setIsOpen(false);
              }}
              className={`w-full text-right p-2 rounded-xl text-xs flex items-center justify-between hover:bg-[var(--md-surface-container-high)] cursor-pointer ${
                !selectedCustomer ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] font-bold' : 'text-[var(--md-on-surface)]'
              }`}
            >
              <span>عميل عام نقدي (افتراضي)</span>
              {!selectedCustomer && <Check className="w-3.5 h-3.5" />}
            </button>

            {filtered.map((cust) => {
              const cBal = Number(cust.current_balance ?? (cust as any).balance ?? 0);
              const cLim = Math.max(0, Number(cust.credit_limit ?? (cust as any).creditLimit ?? 0));
              const cEnf = Boolean(cust.enforce_credit_limit === true && cLim > 0);
              return (
                <button
                  key={cust.id}
                  type="button"
                  onClick={() => {
                    onSelectCustomer(cust);
                    setIsOpen(false);
                  }}
                  className={`w-full text-right p-2 rounded-xl text-xs flex items-center justify-between hover:bg-[var(--md-surface-container-high)] cursor-pointer ${
                    selectedCustomer?.id === cust.id
                      ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] font-bold'
                      : 'text-[var(--md-on-surface)]'
                  }`}
                >
                  <div>
                    <div className="font-bold flex items-center gap-1.5">
                      <span>{cust.name}</span>
                      {cEnf && (
                        <span className="m3-badge m3-badge-primary text-[9px]">سقف مفعّل</span>
                      )}
                    </div>
                    {cust.phone && <div className="text-[10px] text-[var(--md-on-surface-variant)]">{cust.phone}</div>}
                  </div>
                  <div className="text-left text-[11px] text-[var(--md-on-surface-variant)] tabular-nums">
                    <div className="font-mono font-semibold text-[var(--md-on-surface)]">
                      {formatAmount(cBal, cust.currency || currency)}
                    </div>
                    {cLim > 0 && (
                      <div className="text-[9px] font-mono">
                        سقف: {formatAmount(cLim, cust.currency || currency)}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 m3-backdrop flex items-center justify-center p-4 z-50">
          <div className="m3-modal-surface rounded-3xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--md-outline-variant)] pb-3">
              <h3 className="text-sm font-bold text-[var(--md-on-surface)] flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[var(--md-primary-text)]" />
                إضافة عميل سريع لنقطة البيع
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-2.5 bg-[var(--md-error-container)] border border-[var(--md-error)]/30 rounded-xl text-xs text-[var(--md-on-error-container)]">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateCustomer} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-[var(--md-on-surface-variant)] mb-1">اسم العميل *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="مثال: شركة البركة / أحمد علي"
                  className="m3-input w-full px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--md-on-surface-variant)] mb-1">رقم الهاتف</label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="770000000"
                  className="m3-input w-full px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--md-on-surface-variant)] mb-1">
                  سقف المديونية المسموح ({currency})
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  dir="ltr"
                  lang="en"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(toEnglishDigits(e.target.value).replace(/[^0-9.]/g, ''))}
                  placeholder="0.00"
                  className="m3-input w-full px-3 py-2 text-xs font-mono tabular-nums text-left"
                />
              </div>

              <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)]">
                <span className="text-[11px] font-bold text-[var(--md-on-surface)]">
                  تفعيل منع تجاوز السقف الائتماني
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enforceCreditLimit}
                  aria-label="تفعيل منع تجاوز السقف الائتماني"
                  onClick={() => setEnforceCreditLimit((prev) => !prev)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer border ${
                    enforceCreditLimit
                      ? 'bg-[var(--md-primary)] border-[var(--md-primary)]'
                      : 'bg-[var(--md-surface-container-highest)] border-[var(--md-outline)]'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full transition-transform ${
                      enforceCreditLimit
                        ? '-translate-x-5 bg-[var(--md-on-primary)]'
                        : '-translate-x-1 bg-[var(--md-outline)]'
                    }`}
                  />
                </button>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="m3-btn-outlined px-3 py-2 text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading || !newName.trim()}
                  className="m3-btn-primary px-4 py-2 text-xs font-bold"
                >
                  {loading ? 'جاري الحفظ...' : 'حفظ العميل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
