import React, { useRef } from 'react';
import {
  X,
  Printer,
  Share2,
  CheckCircle2,
  Plus,
  ArrowRight,
  FileText,
  Building,
  Calendar,
  Clock,
  User,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { printInvoiceDocument } from '../../../lib/exportUtils';

interface POSReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNewSale: () => void;
  receiptData: any;
}

export const POSReceiptModal: React.FC<POSReceiptModalProps> = ({
  isOpen,
  onClose,
  onNewSale,
  receiptData,
}) => {
  const { company, user } = useAuth();
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !receiptData) return null;

  const handlePrint = () => {
    printInvoiceDocument({
      companyName: company?.name || 'مؤسسة السحابي للتجارة والتقنية',
      invoiceType: 'SALES',
      invoiceNumber: receiptData.invoiceNumber,
      date: receiptData.invoiceDate,
      partyName: receiptData.customer?.name || 'عميل كاشير نقدي',
      partyPhone: receiptData.customer?.phone,
      paymentMethod: receiptData.paymentMethod || 'نقداً',
      items: (receiptData.items || []).map((it: any) => ({
        name: it.product_name || it.name,
        quantity: it.quantity,
        unitPrice: it.unit_price || it.price,
        total: it.total,
      })),
      subtotal: receiptData.subtotal,
      tax: receiptData.tax,
      total: receiptData.total,
      paidAmount: receiptData.paidAmount,
      remainingAmount: receiptData.remainingAmount,
      notes: 'شكراً لتعاملكم معنا ونسعد بخدمتكم دائماً',
    });
  };

  const handleWhatsAppShare = () => {
    const customerPhone = receiptData.customer?.phone || '';
    const cleanPhone = customerPhone.replace(/\D/g, '');
    const message = `مرحباً بك، فاتورة مشترياتكم من ${company?.name || 'المتجر'}
رقم الفاتورة: #${receiptData.invoiceNumber}
التاريخ: ${receiptData.invoiceDate}
الإجمالي: ${receiptData.total?.toLocaleString()} ${receiptData.currency}
المدفوع: ${receiptData.paidAmount?.toLocaleString()} ${receiptData.currency}
المتبقي: ${receiptData.remainingAmount?.toLocaleString()} ${receiptData.currency}
شكراً لزيارتكم ونسعد بخدمتكم دائماً!`;

    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto" dir="rtl">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header Actions */}
        <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-800 flex items-center justify-between no-print">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-bold">تم إتمام الفاتورة بنجاح</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4" />
              طباعة إيصال (80mm)
            </button>
            <button
              onClick={handleWhatsAppShare}
              className="px-3 py-1.5 bg-emerald-700/20 text-emerald-400 border border-emerald-600/30 hover:bg-emerald-700/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              واتساب
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Thermal Receipt Container */}
        <div className="p-6 bg-slate-950 flex justify-center">
          <div
            ref={receiptRef}
            id="pos-thermal-receipt"
            className="w-full max-w-[320px] bg-white text-slate-900 font-mono text-[11px] p-4 rounded-xl shadow-lg border border-slate-200"
          >
            {/* Store Header */}
            <div className="text-center pb-3 border-b border-dashed border-slate-400 space-y-1">
              <h2 className="text-base font-black text-slate-900 font-sans">{company?.name || 'مؤسسة الأعمال الذكية'}</h2>
              <p className="text-[10px] text-slate-600 font-sans">فاتورة مبيعات ضريبية مبسطة</p>
              {company?.tax_number && (
                <p className="text-[10px] text-slate-600">الرقم الضريبي: {company.tax_number}</p>
              )}
            </div>

            {/* Receipt Meta */}
            <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1 text-[10px]">
              <div className="flex justify-between">
                <span>رقم الفاتورة:</span>
                <span className="font-bold">#{receiptData.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>التاريخ والوقت:</span>
                <span>{receiptData.receipt?.date || receiptData.invoiceDate} {receiptData.receipt?.time}</span>
              </div>
              <div className="flex justify-between">
                <span>الكاشير:</span>
                <span>{user?.fullName || 'كاشير رئيسي'}</span>
              </div>
              <div className="flex justify-between">
                <span>العميل:</span>
                <span className="font-bold">{receiptData.customer?.name || 'عميل نقدي عام'}</span>
              </div>
            </div>

            {/* Items Table */}
            <div className="py-2.5 border-b border-dashed border-slate-400">
              <div className="flex justify-between font-bold pb-1 text-[10px] border-b border-slate-300">
                <span className="w-1/2 text-right">الصنف</span>
                <span className="w-1/6 text-center">الكمية</span>
                <span className="w-1/3 text-left">الإجمالي</span>
              </div>
              <div className="space-y-1.5 pt-1.5">
                {receiptData.items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-start text-[10px]">
                    <div className="w-1/2 text-right font-sans leading-tight">
                      <div>{item.itemName || item.name}</div>
                      <span className="text-[9px] text-slate-500">
                        {item.quantity} × {item.unitPrice?.toLocaleString()} {receiptData.currency}
                      </span>
                    </div>
                    <div className="w-1/6 text-center font-bold">{item.quantity}</div>
                    <div className="w-1/3 text-left font-bold">{item.total?.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary Totals */}
            <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>المجموع الفرعي:</span>
                <span>{receiptData.subtotal?.toLocaleString()} {receiptData.currency}</span>
              </div>
              {Number(receiptData.discount) > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>الخصم:</span>
                  <span>-{receiptData.discount?.toLocaleString()} {receiptData.currency}</span>
                </div>
              )}
              {Number(receiptData.tax) > 0 && (
                <div className="flex justify-between">
                  <span>ضريبة القيمة المضافة:</span>
                  <span>+{receiptData.tax?.toLocaleString()} {receiptData.currency}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black border-t border-slate-400 pt-1.5 mt-1">
                <span>الإجمالي النهائي:</span>
                <span>{receiptData.total?.toLocaleString()} {receiptData.currency}</span>
              </div>
            </div>

            {/* Payment Details */}
            <div className="py-2 space-y-1 text-[10px]">
              <div className="flex justify-between">
                <span>طريقة الدفع:</span>
                <span className="font-bold">{receiptData.paymentMethod || 'نقداً'}</span>
              </div>
              <div className="flex justify-between">
                <span>المدفوع / المقبوض:</span>
                <span className="font-bold">{receiptData.paidAmount?.toLocaleString()} {receiptData.currency}</span>
              </div>
              {Number(receiptData.changeAmount) > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>المتبقي للعميل (فكة):</span>
                  <span>{receiptData.changeAmount?.toLocaleString()} {receiptData.currency}</span>
                </div>
              )}
              {Number(receiptData.remainingAmount) > 0 && (
                <div className="flex justify-between text-amber-700 font-bold">
                  <span>المتبقي على الحساب (آجل):</span>
                  <span>{receiptData.remainingAmount?.toLocaleString()} {receiptData.currency}</span>
                </div>
              )}
            </div>

            {/* Simulated QR Code / Barcode & Footer */}
            <div className="pt-3 border-t border-dashed border-slate-400 text-center space-y-2">
              <div className="flex justify-center">
                <div className="p-1.5 border border-slate-300 rounded bg-slate-50 inline-block">
                  <div className="w-20 h-20 bg-slate-900 flex items-center justify-center text-white text-[8px] text-center p-1 font-sans">
                    رمز التحقق الضريبي والباركود
                  </div>
                </div>
              </div>
              <p className="text-[9px] text-slate-500 font-sans">شكراً لتعاملكم معنا ونسعد بزيارتكم دائماً!</p>
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between no-print">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-400 hover:text-white rounded-xl text-xs font-semibold"
          >
            إغلاق
          </button>
          <button
            onClick={() => {
              onClose();
              onNewSale();
            }}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-950/40 transition-all"
          >
            <Plus className="w-4 h-4" />
            بدء عملية بيع جديدة (F2)
          </button>
        </div>
      </div>
    </div>
  );
};
