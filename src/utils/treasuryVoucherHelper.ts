import { getActiveCurrencyCode } from '../lib/formatters';

export interface AutomaticVoucherParams {
  type: 'CUSTOMER_PAYMENT' | 'SUPPLIER_PAYMENT';
  voucherType?: 'RECEIPT' | 'PAYMENT';
  amount: number;
  currency?: string;
  paymentMethod?: string;
  paymentDate?: string;
  partyId?: string;
  partyName?: string;
  partyPhone?: string;
  referenceId?: string;
  referenceNo?: string;
  referenceType?: 'SALES_INVOICE' | 'PURCHASE_INVOICE' | 'DEBT_COLLECTION' | 'DEBT_PAYMENT';
  notes?: string;
  bankName?: string;
  bankRefNo?: string;
  walletProvider?: string;
  walletTxNo?: string;
  cashierName?: string;
}

/**
 * Automatically records a Receipt Voucher (سند قبض) or Payment Voucher (سند صرف)
 * into localStorage (erp_payments_v1) and synchronizes with backend /api/v1/payments.
 */
export function recordAutomaticTreasuryVoucher(params: AutomaticVoucherParams): any | null {
  const amount = Number(params.amount || 0);
  if (amount <= 0) return null;

  const now = new Date();
  const paymentDate = (params.paymentDate || now.toISOString().split('T')[0]).trim();
  const paymentCreatedAt = now.toISOString();
  const effectiveCurrency = params.currency || getActiveCurrencyCode() || 'YER';
  const isReceipt = params.type === 'CUSTOMER_PAYMENT';
  const prefix = isReceipt ? 'REC' : 'PAY';
  const voucherNumber = `VOUCH-${prefix}-${now.getFullYear().toString().slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

  let effectiveNotes = params.notes || '';
  if (!effectiveNotes) {
    if (params.referenceType === 'SALES_INVOICE') {
      effectiveNotes = `سند قبض آلي عن فاتورة مبيعات رقم ${params.referenceNo || ''} (العميل: ${params.partyName || 'نقدي'})`;
    } else if (params.referenceType === 'PURCHASE_INVOICE') {
      effectiveNotes = `سند صرف آلي عن فاتورة مشتريات رقم ${params.referenceNo || ''} (المورد: ${params.partyName || 'مورد تجاري'})`;
    } else if (params.referenceType === 'DEBT_COLLECTION') {
      effectiveNotes = `سند تحصيل ذمة عميل (العميل: ${params.partyName || ''})`;
    } else if (params.referenceType === 'DEBT_PAYMENT') {
      effectiveNotes = `سند سداد دفعة للمورد (المورد: ${params.partyName || ''})`;
    } else {
      effectiveNotes = isReceipt ? `سند قبض ${voucherNumber}` : `سند صرف ${voucherNumber}`;
    }
  }

  const voucherObj = {
    id: `pmt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    voucher_number: voucherNumber,
    voucherNumber,
    voucher_type: isReceipt ? 'RECEIPT' : 'PAYMENT',
    type: params.type,
    payment_type: isReceipt ? 'IN' : 'OUT',
    party_type: isReceipt ? 'CUSTOMER' : 'SUPPLIER',
    customer_id: isReceipt ? (params.partyId || 'cust-direct') : undefined,
    customer_name: isReceipt ? (params.partyName || 'عميل نقدي') : undefined,
    supplier_id: !isReceipt ? (params.partyId || 'supp-direct') : undefined,
    supplier_name: !isReceipt ? (params.partyName || 'مورد تجاري') : undefined,
    partyName: params.partyName || (isReceipt ? 'عميل نقدي' : 'مورد تجاري'),
    party_name: params.partyName || (isReceipt ? 'عميل نقدي' : 'مورد تجاري'),
    partyPhone: params.partyPhone || '',
    amount,
    currency: effectiveCurrency,
    exchange_rate: 1.0,
    payment_method: params.paymentMethod || 'CASH',
    payment_date: paymentDate,
    date: paymentDate,
    status: 'CONFIRMED',
    notes: effectiveNotes,
    reference: params.referenceNo ? `مرجع: #${params.referenceNo}` : '',
    reference_id: params.referenceId || params.referenceNo,
    reference_no: params.referenceNo,
    reference_type: params.referenceType || (isReceipt ? 'SALES_INVOICE' : 'PURCHASE_INVOICE'),
    bank_name: params.bankName || undefined,
    bank_ref_no: params.bankRefNo || undefined,
    wallet_provider: params.walletProvider || undefined,
    wallet_tx_no: params.walletTxNo || undefined,
    cashier_name: params.cashierName || 'حميد وهاس',
    created_by: params.cashierName || 'حميد وهاس',
    created_at: paymentCreatedAt,
  };

  try {
    const rawStored = localStorage.getItem('erp_payments_v1');
    const existingList: any[] = rawStored ? JSON.parse(rawStored) : [];

    // Duplicate guard: don't insert if same referenceNo, type and amount exists within last 60 seconds
    const alreadyExists = existingList.some((item) => {
      if (item.reference_no && params.referenceNo && item.reference_no === params.referenceNo) {
        if (item.type === params.type && Math.abs(Number(item.amount) - amount) < 0.01) {
          const itemTime = new Date(item.created_at || 0).getTime();
          if (now.getTime() - itemTime < 60000) return true;
        }
      }
      return false;
    });

    if (!alreadyExists) {
      const updatedList = [voucherObj, ...existingList];
      localStorage.setItem('erp_payments_v1', JSON.stringify(updatedList));

      const activeCompanyId = localStorage.getItem('erp_company_id');
      if (activeCompanyId) {
        localStorage.setItem(`erp_payments_v1_${activeCompanyId}`, JSON.stringify(updatedList));
      }

      window.dispatchEvent(new CustomEvent('erp-payments-updated', { detail: voucherObj }));
      window.dispatchEvent(new CustomEvent('erp-data-updated'));
    }
  } catch (err) {
    console.warn('[RECORD_VOUCHER_LOCAL_WARN]', err);
  }

  // Push to server asynchronously
  try {
    fetch('/api/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-company-id': localStorage.getItem('erp_company_id') || 'comp_001',
      },
      body: JSON.stringify(voucherObj),
    }).catch(() => {});
  } catch {}

  return voucherObj;
}
