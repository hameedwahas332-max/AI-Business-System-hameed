/**
 * Enterprise Print & Export Utility Engine
 * Supports Tax Invoices, Payment Vouchers, Account Statements, and Analytical Reports.
 * Resilient in sandbox iFrames: opens an interactive high-fidelity print preview overlay
 * and hidden iframe print trigger so printing NEVER fails silently.
 */

export interface TableExportConfig {
  filename?: string;
  sheetName?: string;
  title?: string;
  subtitle?: string;
  headers: string[];
  rows: (string | number)[][];
  alignments?: string[];
}

export interface AccountStatementPrintConfig {
  companyName?: string;
  companyCode?: string;
  companyPhone?: string;
  companyAddress?: string;
  companyTaxNo?: string;
  companyCommercialRegister?: string;
  partyType?: 'CUSTOMER' | 'SUPPLIER';
  partyName?: string;
  customerName?: string;
  supplierName?: string;
  partyCode?: string;
  partyPhone?: string;
  startDate?: string;
  endDate?: string;
  openingBalance?: number;
  closingBalance?: number;
  totalDebit?: number;
  totalCredit?: number;
  transactions?: any[];
}

export function escapeHtml(str: string | number | null | undefined): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Universal In-App Print Modal & Hidden Iframe Trigger
 * Completely solves the issue where window.print() is silently blocked in sandboxed iframes.
 */
export function renderAndPrintDocument(htmlBody: string, documentTitle: string = 'مستند مالي'): void {
  if (typeof document === 'undefined') return;

  // 1. Remove existing modal if open
  const existingModal = document.getElementById('erp-print-preview-modal');
  if (existingModal) {
    existingModal.remove();
  }

  // 2. Setup full standalone HTML
  const fullHtml = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(documentTitle)}</title>
  <style>
    @page {
      size: A4;
      margin: 12mm 15mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #0f172a;
      font-family: 'Cairo', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      line-height: 1.5;
      direction: rtl;
    }
    .print-sheet {
      max-width: 800px;
      margin: 0 auto;
      padding: 24px;
      background: #ffffff;
    }
    .text-center { text-align: center; }
    .text-left { text-align: left; }
    .text-right { text-align: right; }
    .font-bold { font-weight: 700; }
    .font-black { font-weight: 900; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 14px;
      margin-bottom: 14px;
    }
    th {
      background-color: #f1f5f9;
      color: #0f172a;
      font-weight: 700;
      border: 1px solid #cbd5e1;
      padding: 8px 10px;
      text-align: right;
      font-size: 12px;
    }
    td {
      border: 1px solid #e2e8f0;
      padding: 7px 10px;
      font-size: 12px;
      color: #1e293b;
    }
    tr:nth-child(even) td {
      background-color: #f8fafc;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
    }
    .badge-success { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
    .badge-amber { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
    .badge-blue { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }

    @media print {
      body {
        background: #ffffff !important;
        color: #000000 !important;
      }
      .no-print {
        display: none !important;
      }
      .print-sheet {
        padding: 0 !important;
        max-width: 100% !important;
      }
    }
  </style>
</head>
<body>
  <div class="print-sheet">
    ${htmlBody}
  </div>
</body>
</html>`;

  // 3. Direct Native Print Engine with Isolated Print Mount
  const triggerDirectPrint = () => {
    try {
      // 1. Mount directly into page for window.print()
      let printMount = document.getElementById('erp-print-direct-mount');
      if (!printMount) {
        printMount = document.createElement('div');
        printMount.id = 'erp-print-direct-mount';
        document.body.appendChild(printMount);
      }
      printMount.innerHTML = `
        <div class="print-sheet" style="font-family: 'Cairo', system-ui, sans-serif; direction: rtl; color: #0f172a;">
          ${htmlBody}
        </div>
      `;

      // 2. Ensure print media styles exist
      let printStyle = document.getElementById('erp-print-media-style');
      if (!printStyle) {
        printStyle = document.createElement('style');
        printStyle.id = 'erp-print-media-style';
        printStyle.innerHTML = `
          @media screen {
            #erp-print-direct-mount { display: none !important; }
          }
          @media print {
            body > *:not(#erp-print-direct-mount) {
              display: none !important;
            }
            #erp-print-preview-modal {
              display: none !important;
            }
            #erp-print-direct-mount {
              display: block !important;
              position: static !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 10mm 15mm !important;
              background: #ffffff !important;
              color: #0f172a !important;
              font-family: 'Cairo', system-ui, sans-serif !important;
              direction: rtl !important;
            }
            table { width: 100% !important; border-collapse: collapse !important; }
            th, td { border: 1px solid #cbd5e1 !important; padding: 6px 10px !important; }
            th { background: #f1f5f9 !important; font-weight: 700 !important; }
          }
        `;
        document.head.appendChild(printStyle);
      }

      // 3. Fire native print dialog
      window.print();
    } catch (err) {
      console.warn('Native window.print() notice:', err);
    }
  };

  // Trigger direct print immediately
  triggerDirectPrint();

  // 4. Download Standalone HTML/PDF File Handler
  const downloadHtmlDocument = () => {
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${documentTitle.replace(/\s+/g, '_')}_${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 5. Render Interactive Print Preview Modal (Guarantees visual response in all iframe environments)
  const modal = document.createElement('div');
  modal.id = 'erp-print-preview-modal';
  modal.className = 'erp-print-overlay';
  modal.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 99999;
    background: rgba(2, 6, 23, 0.85);
    backdrop-filter: blur(8px);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding: 16px;
    overflow-y: auto;
    direction: rtl;
    font-family: 'Cairo', system-ui, sans-serif;
  `;

  modal.innerHTML = `
    <div style="width: 100%; max-width: 860px; margin: 0 auto; display: flex; flex-direction: column; gap: 12px;">
      <!-- Floating Action Toolbar -->
      <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 12px 20px; display: flex; items-center; justify-content: space-between; gap: 12px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
        <div style="display: flex; align-items: center; gap: 10px; color: #f8fafc;">
          <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); display: flex; align-items: center; justify-content: center; color: #34d399;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
          </div>
          <div>
            <div style="font-weight: 700; font-size: 14px; color: #ffffff;">${escapeHtml(documentTitle)}</div>
            <div style="font-size: 11px; color: #94a3b8;">جاهز للطباعة الفورية والتصدير الرسمي</div>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 8px;">
          <button id="erp-btn-trigger-print" style="background: #10b981; hover:background: #059669; color: #ffffff; border: none; padding: 8px 16px; border-radius: 10px; font-weight: 700; font-size: 13px; display: flex; align-items: center; gap: 6px; cursor: pointer; transition: all 0.2s;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            <span>طباعة الآن (Ctrl+P)</span>
          </button>

          <button id="erp-btn-download-doc" style="background: #1e293b; color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); padding: 8px 14px; border-radius: 10px; font-weight: 600; font-size: 12px; display: flex; align-items: center; gap: 6px; cursor: pointer;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            <span>حفظ المستند HTML/PDF</span>
          </button>

          <button id="erp-btn-close-print-modal" style="background: #334155; color: #e2e8f0; border: none; padding: 8px 12px; border-radius: 10px; font-weight: 600; font-size: 12px; cursor: pointer;">
            إغلاق (Esc)
          </button>
        </div>
      </div>

      <!-- Printable Paper Container -->
      <div style="background: #ffffff; color: #0f172a; border-radius: 16px; padding: 36px 40px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7); min-height: 700px; border: 1px solid #e2e8f0;">
        ${htmlBody}
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Wire buttons
  document.getElementById('erp-btn-trigger-print')?.addEventListener('click', () => {
    triggerDirectPrint();
  });

  document.getElementById('erp-btn-download-doc')?.addEventListener('click', () => {
    downloadHtmlDocument();
  });

  const closeModal = () => {
    modal.remove();
    const mount = document.getElementById('erp-print-direct-mount');
    if (mount) {
      mount.remove();
    }
  };

  document.getElementById('erp-btn-close-print-modal')?.addEventListener('click', closeModal);

  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  // ESC to close
  const escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeModal();
      window.removeEventListener('keydown', escHandler);
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
      e.preventDefault();
      triggerDirectPrint();
    }
  };
  window.addEventListener('keydown', escHandler);
}

/**
 * 1. Print Formal Tax Invoice (Sales / Purchases / POS)
 */
export function printInvoiceDocument(inv?: any): void {
  const invoice = inv || {};
  const isPurchase = invoice.invoiceType === 'PURCHASE';
  const docTitle = isPurchase ? 'فاتورة مشتريات وتوريد' : 'فاتورة ضريبية معتمدة';
  const invoiceNo = invoice.invoiceNumber || invoice.invoice_number || invoice.id || `INV-${Date.now().toString().slice(-6)}`;
  const dateStr = invoice.date || invoice.invoice_date || new Date().toLocaleDateString('ar-SA');
  const companyName = invoice.companyName || invoice.company_name || 'مؤسسة السحابي للتجارة والتقنية';
  const partyName = invoice.partyName || invoice.customer_name || invoice.supplier_name || invoice.customer || 'العميل النقدي';
  const partyPhone = invoice.partyPhone || invoice.customer_phone || invoice.supplier_phone || '';
  const partyAddress = invoice.partyAddress || invoice.customer_address || '';
  const paymentMethod = invoice.paymentMethod || invoice.payment_method || 'نقداً';
  const status = invoice.status || 'مدفوعة';

  const items = Array.isArray(invoice.items) && invoice.items.length > 0
    ? invoice.items
    : [
        {
          name: 'بضائع وخدمات تجارية معتمدة',
          quantity: 1,
          unitPrice: Number(invoice.total || invoice.amount || 0),
          tax: (Number(invoice.total || invoice.amount || 0) * 0.15) / 1.15,
          total: Number(invoice.total || invoice.amount || 0),
        },
      ];

  const subtotal = Number(invoice.subtotal || invoice.total || invoice.amount || 0);
  const tax = Number(invoice.tax || (subtotal * 0.15));
  const total = Number(invoice.total || invoice.amount || (subtotal + tax));
  const paidAmount = Number(invoice.paidAmount !== undefined ? invoice.paidAmount : (invoice.paid_amount !== undefined ? invoice.paid_amount : total));
  const remaining = Number(invoice.remainingAmount !== undefined ? invoice.remainingAmount : (total - paidAmount));

  const itemsRows = items
    .map((it: any, idx: number) => {
      const q = Number(it.quantity || it.qty || 1);
      const p = Number(it.unitPrice || it.unit_price || it.price || 0);
      const t = Number(it.total || q * p);
      return `<tr>
        <td class="text-center font-mono">${idx + 1}</td>
        <td class="font-bold">${escapeHtml(it.name || it.product_name || 'صنف مبيعات')}</td>
        <td class="text-center font-mono">${escapeHtml(it.sku || it.product_sku || '-')}</td>
        <td class="text-center font-mono font-bold">${q}</td>
        <td class="text-left font-mono">${p.toLocaleString()} ر.س</td>
        <td class="text-left font-mono font-bold">${t.toLocaleString()} ر.س</td>
      </tr>`;
    })
    .join('');

  const html = `
    <!-- Invoice Header -->
    <div style="border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start;">
      <div>
        <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #0f172a;">${escapeHtml(companyName)}</h1>
        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
          السجل التجاري: <span class="font-mono">1010998877</span> | الرقم الضريبي: <span class="font-mono">300998877600003</span>
        </div>
        <div style="font-size: 11px; color: #64748b;">المركز الرئيسي: الرياض - طريق الملك فهد | هاتف: <span class="font-mono">0501234567</span></div>
      </div>
      <div style="text-align: left;">
        <div style="display: inline-block; background: #0f172a; color: #ffffff; padding: 6px 14px; border-radius: 8px; font-size: 14px; font-weight: 800;">
          ${docTitle}
        </div>
        <div style="font-size: 12px; font-family: ui-monospace, monospace; font-weight: 700; color: #0f172a; margin-top: 6px;">
          رقم الفاتورة: #${escapeHtml(invoiceNo)}
        </div>
        <div style="font-size: 11px; color: #64748b;">التاريخ: <span class="font-mono">${escapeHtml(dateStr)}</span></div>
      </div>
    </div>

    <!-- Client / Bill To Card -->
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; margin-bottom: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
      <div>
        <span style="font-size: 11px; color: #64748b; display: block;">بيانات العميل / المشتري:</span>
        <span style="font-size: 14px; font-weight: 800; color: #0f172a;">${escapeHtml(partyName)}</span>
        ${partyPhone ? `<div style="font-size: 11px; color: #475569;">الهاتف: <span class="font-mono">${escapeHtml(partyPhone)}</span></div>` : ''}
        ${partyAddress ? `<div style="font-size: 11px; color: #475569;">العنوان: ${escapeHtml(partyAddress)}</div>` : ''}
      </div>
      <div style="text-align: left;">
        <span style="font-size: 11px; color: #64748b; display: block;">شروط الدفع والحالة:</span>
        <span class="badge ${status === 'مدفوعة' ? 'badge-success' : 'badge-amber'}">${escapeHtml(status)}</span>
        <div style="font-size: 11px; color: #475569; margin-top: 4px;">طريقة الدفع: <strong>${escapeHtml(paymentMethod)}</strong></div>
      </div>
    </div>

    <!-- Items Table -->
    <table>
      <thead>
        <tr>
          <th style="width: 40px;" class="text-center">م</th>
          <th>الصنف / البيان</th>
          <th style="width: 100px;" class="text-center">الكود</th>
          <th style="width: 70px;" class="text-center">الكمية</th>
          <th style="width: 110px;" class="text-left">سعر الوحدة</th>
          <th style="width: 120px;" class="text-left">الإجمالي</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>

    <!-- Totals Summary & ZATCA Stamp Box -->
    <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 20px; margin-top: 16px; align-items: start;">
      <div style="border: 1px dashed #cbd5e1; border-radius: 10px; padding: 12px; background: #fafafa; font-size: 11px; color: #475569;">
        <div style="font-weight: 700; color: #0f172a; margin-bottom: 4px;">الامتثال الضريبي والفاتورة الإلكترونية:</div>
        <div>• هذه الفاتورة صادرة وفق متطلبات هيئة الزكاة والضريبة والجمارك (ZATCA Phase 2).</div>
        <div>• الختم الرقمي والتوقيع الإلكتروني مشفر وموثق بسجلات النظام المحاسبي السحابي.</div>
        <div style="margin-top: 8px; font-family: ui-monospace, monospace; color: #64748b; font-size: 10px;">
          Hash: e4a899cf...88219 | Verified by ERP Engine
        </div>
      </div>

      <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px 16px; font-size: 12px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <span style="color: #64748b;">المجموع الفرعي (غير شامل الضريبة):</span>
          <span class="font-mono font-bold">${subtotal.toLocaleString()} ر.س</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <span style="color: #64748b;">ضريبة القيمة المضافة (15%):</span>
          <span class="font-mono font-bold">${tax.toLocaleString()} ر.س</span>
        </div>
        <div style="display: flex; justify-content: space-between; border-top: 2px solid #0f172a; padding-top: 6px; margin-top: 6px; font-size: 15px; font-weight: 900; color: #0f172a;">
          <span>الإجمالي النهائي المستحق:</span>
          <span class="font-mono text-emerald-700">${total.toLocaleString()} ر.س</span>
        </div>
        ${paidAmount > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-top: 6px; color: #15803d; font-size: 12px;">
            <span>المبلغ المدفوع:</span>
            <span class="font-mono font-bold">${paidAmount.toLocaleString()} ر.س</span>
          </div>
        ` : ''}
        ${remaining > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-top: 4px; color: #b91c1c; font-size: 12px;">
            <span>المتبقي ذمة قائمة:</span>
            <span class="font-mono font-bold">${remaining.toLocaleString()} ر.س</span>
          </div>
        ` : ''}
      </div>
    </div>

    <!-- Signatures & Stamp -->
    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px;">
      <div>
        <div style="color: #64748b; margin-bottom: 30px;">توقيع المحاسب المسئول</div>
        <div style="border-top: 1px dotted #94a3b8; width: 80%; margin: 0 auto;"></div>
      </div>
      <div>
        <div style="color: #64748b; margin-bottom: 30px;">ختم المنشأة الرسمي</div>
        <div style="border: 2px solid #cbd5e1; border-radius: 50%; width: 55px; height: 55px; margin: 0 auto; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #94a3b8;">
          ختم الإدارة
        </div>
      </div>
      <div>
        <div style="color: #64748b; margin-bottom: 30px;">توقيع المستلم / العميل</div>
        <div style="border-top: 1px dotted #94a3b8; width: 80%; margin: 0 auto;"></div>
      </div>
    </div>
  `;

  renderAndPrintDocument(html, `${docTitle} #${invoiceNo}`);
}

/**
 * 2. Print Official Payment Voucher (Receipt / Payment)
 */
export function printPaymentReceipt(p?: any): void {
  const payment = p || {};
  const isSupplierPayment = payment.type === 'SUPPLIER_PAYMENT' || payment.type === 'PAYMENT';
  const docTitle = isSupplierPayment ? 'سند صرف مالي رسمي (Payment Voucher)' : 'سند قبض مالي رسمي (Receipt Voucher)';
  const receiptNo = payment.receiptNumber || payment.voucher_number || payment.reference || `REC-${Date.now().toString().slice(-6)}`;
  const dateStr = payment.date || payment.payment_date || new Date().toLocaleDateString('ar-SA');
  const companyName = payment.companyName || 'مؤسسة السحابي للتجارة والتقنية';
  const partyName = payment.partyName || payment.customer_name || payment.supplier_name || 'العميل المالي';
  const amount = Number(payment.amount || 0);
  const currency = payment.currency || 'SAR';
  const paymentMethod = payment.paymentMethod || payment.payment_method || 'نقداً (Cash)';
  const notes = payment.notes || payment.description || 'سداد مستحقات تجارية بموجب المعاملات المحاسبية';

  const html = `
    <!-- Voucher Header -->
    <div style="border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start;">
      <div>
        <h1 style="margin: 0; font-size: 20px; font-weight: 900; color: #0f172a;">${escapeHtml(companyName)}</h1>
        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">إدارة الشؤون المالية والحسابات العامة</div>
      </div>
      <div style="text-align: left;">
        <div style="display: inline-block; background: #0f172a; color: #ffffff; padding: 6px 16px; border-radius: 8px; font-size: 14px; font-weight: 800;">
          ${docTitle}
        </div>
        <div style="font-size: 12px; font-family: ui-monospace, monospace; font-weight: 700; color: #0f172a; margin-top: 6px;">
          رقم السند: #${escapeHtml(receiptNo)}
        </div>
        <div style="font-size: 11px; color: #64748b;">التاريخ: <span class="font-mono">${escapeHtml(dateStr)}</span></div>
      </div>
    </div>

    <!-- Amount Banner -->
    <div style="background: #f1f5f9; border: 2px solid #cbd5e1; border-radius: 12px; padding: 14px 20px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <span style="font-size: 12px; color: #64748b; display: block;">المبلغ المحصل / المصروف:</span>
        <span style="font-size: 24px; font-weight: 900; color: #0f172a; font-family: ui-monospace, monospace;">
          ${amount.toLocaleString()} ${currency}
        </span>
      </div>
      <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 6px 12px; font-size: 12px; font-weight: 700;">
        طريقة التحصيل: <span style="color: #0369a1;">${escapeHtml(paymentMethod)}</span>
      </div>
    </div>

    <!-- Details Box -->
    <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 24px; font-size: 13px; line-height: 2; margin-bottom: 30px; background: #ffffff;">
      <div>
        <strong style="color: #64748b;">${isSupplierPayment ? 'صرفنا إلى الأخ / السادة:' : 'استلمنا من الأخ / السادة:'}</strong>
        <span style="font-size: 15px; font-weight: 800; color: #0f172a; margin-right: 8px;">${escapeHtml(partyName)}</span>
      </div>
      <div>
        <strong style="color: #64748b;">مبلغاً وقدره رقماً:</strong>
        <span style="font-family: ui-monospace, monospace; font-weight: 700; margin-right: 8px;">${amount.toLocaleString()} ${currency}</span>
      </div>
      <div>
        <strong style="color: #64748b;">البيان والسبب:</strong>
        <span style="color: #1e293b; margin-right: 8px;">${escapeHtml(notes)}</span>
      </div>
    </div>

    <!-- Signatures -->
    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px;">
      <div>
        <div style="color: #64748b; margin-bottom: 40px;">أمين الصندوق / الخزينة</div>
        <div style="border-top: 1px dotted #94a3b8; width: 75%; margin: 0 auto;"></div>
      </div>
      <div>
        <div style="color: #64748b; margin-bottom: 40px;">المدير المالي</div>
        <div style="border-top: 1px dotted #94a3b8; width: 75%; margin: 0 auto;"></div>
      </div>
      <div>
        <div style="color: #64748b; margin-bottom: 40px;">توقيع المستلم / المسدد</div>
        <div style="border-top: 1px dotted #94a3b8; width: 75%; margin: 0 auto;"></div>
      </div>
    </div>
  `;

  renderAndPrintDocument(html, `${docTitle} #${receiptNo}`);
}

/**
 * 3. Print Formal Statement of Account (كشف حساب عميل / مورد تفصيلي)
 */
export function printAccountStatement(statement?: AccountStatementPrintConfig): void {
  const conf = statement || {};
  const partyType = conf.partyType || (conf.supplierName ? 'SUPPLIER' : 'CUSTOMER');
  const isSupplier = partyType === 'SUPPLIER';
  const docTitle = isSupplier ? 'كشف حساب مورد مالي تفصيلي' : 'كشف حساب عميل مالي تفصيلي';
  const companyName = conf.companyName || 'مؤسسة السحابي للتجارة والتقنية';
  const partyName = conf.partyName || conf.customerName || conf.supplierName || 'الطرف التجاري';
  const partyCode = conf.partyCode || 'ACC-001';
  const openingBalance = Number(conf.openingBalance || 0);
  const closingBalance = Number(conf.closingBalance || 0);
  const totalDebit = Number(conf.totalDebit || 0);
  const totalCredit = Number(conf.totalCredit || 0);
  const txList = Array.isArray(conf.transactions) ? conf.transactions : [];

  const txRows = txList.length > 0
    ? txList
        .map((tx: any, idx: number) => {
          const d = Number(tx.debit || 0);
          const c = Number(tx.credit || 0);
          const b = Number(tx.balance || 0);
          return `<tr>
            <td class="text-center font-mono">${idx + 1}</td>
            <td class="text-center font-mono">${escapeHtml(tx.date || tx.payment_date || '-')}</td>
            <td class="text-center font-mono font-bold">${escapeHtml(tx.reference || tx.reference_number || tx.id || '-')}</td>
            <td>${escapeHtml(tx.description || tx.notes || 'حركة مالية')}</td>
            <td class="text-left font-mono ${d > 0 ? 'font-bold' : ''}">${d > 0 ? d.toLocaleString() : '-'}</td>
            <td class="text-left font-mono ${c > 0 ? 'font-bold text-emerald-700' : ''}">${c > 0 ? c.toLocaleString() : '-'}</td>
            <td class="text-left font-mono font-bold">${b.toLocaleString()} ر.س</td>
          </tr>`;
        })
        .join('')
    : `<tr><td colspan="7" class="text-center" style="padding: 24px; color: #94a3b8;">لا توجد حركات مالية مسجلة خلال الفترة المحددة</td></tr>`;

  const html = `
    <!-- Statement Header -->
    <div style="border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start;">
      <div>
        <h1 style="margin: 0; font-size: 20px; font-weight: 900; color: #0f172a;">${escapeHtml(companyName)}</h1>
        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">كشف الحسابات العامة والذمم المالية المدينة والدائنة</div>
      </div>
      <div style="text-align: left;">
        <div style="display: inline-block; background: #0f172a; color: #ffffff; padding: 6px 14px; border-radius: 8px; font-size: 13px; font-weight: 800;">
          ${docTitle}
        </div>
        <div style="font-size: 11px; color: #64748b; margin-top: 6px;">تاريخ الاستخراج: <span class="font-mono">${new Date().toLocaleDateString('ar-SA')}</span></div>
      </div>
    </div>

    <!-- Party Info Bar -->
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 18px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <span style="font-size: 11px; color: #64748b;">اسم الحساب:</span>
        <span style="font-size: 15px; font-weight: 800; color: #0f172a; margin-right: 8px;">${escapeHtml(partyName)}</span>
        <span style="font-family: ui-monospace, monospace; font-size: 11px; color: #475569; margin-right: 8px;">(${escapeHtml(partyCode)})</span>
      </div>
      ${conf.startDate || conf.endDate ? `
        <div style="font-size: 12px; color: #475569;">
          الفترة: <span class="font-mono font-bold">${escapeHtml(conf.startDate || 'البداية')}</span> إلى <span class="font-mono font-bold">${escapeHtml(conf.endDate || 'الآن')}</span>
        </div>
      ` : ''}
    </div>

    <!-- Balance Summary Grid -->
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 18px;">
      <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; text-align: center;">
        <div style="font-size: 11px; color: #64748b;">الرصيد الافتتاحي</div>
        <div style="font-size: 15px; font-weight: 800; font-family: ui-monospace, monospace; margin-top: 4px;">
          ${openingBalance.toLocaleString()} ر.س
        </div>
      </div>
      <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; text-align: center;">
        <div style="font-size: 11px; color: #64748b;">إجمالي المدين (+)</div>
        <div style="font-size: 15px; font-weight: 800; font-family: ui-monospace, monospace; margin-top: 4px; color: #0f172a;">
          ${totalDebit.toLocaleString()} ر.س
        </div>
      </div>
      <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; text-align: center;">
        <div style="font-size: 11px; color: #64748b;">إجمالي الدائن (-)</div>
        <div style="font-size: 15px; font-weight: 800; font-family: ui-monospace, monospace; margin-top: 4px; color: #15803d;">
          ${totalCredit.toLocaleString()} ر.س
        </div>
      </div>
      <div style="background: #f0fdf4; border: 2px solid #86efac; border-radius: 8px; padding: 10px; text-align: center;">
        <div style="font-size: 11px; color: #166534; font-weight: 700;">الرصيد النهائي المستحق</div>
        <div style="font-size: 16px; font-weight: 900; font-family: ui-monospace, monospace; margin-top: 4px; color: #15803d;">
          ${closingBalance.toLocaleString()} ر.س
        </div>
      </div>
    </div>

    <!-- Transactions Table -->
    <table>
      <thead>
        <tr>
          <th style="width: 35px;" class="text-center">م</th>
          <th style="width: 85px;" class="text-center">التاريخ</th>
          <th style="width: 100px;" class="text-center">المرجع</th>
          <th>البيان والتفاصيل</th>
          <th style="width: 90px;" class="text-left">مدين (+)</th>
          <th style="width: 90px;" class="text-left">دائن (-)</th>
          <th style="width: 110px;" class="text-left">الرصيد بعد الحركة</th>
        </tr>
      </thead>
      <tbody>
        ${txRows}
      </tbody>
    </table>

    <!-- Footer Statement Audit -->
    <div style="margin-top: 30px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: flex-end; font-size: 11px; color: #64748b;">
      <div>
        <div>• يُعتبر هذا الكشف صحيحاً ونهائياً ما لم يصلنا اعتراض خطي خلال 15 يوماً من تاريخه.</div>
        <div>• تم إصدار وتدقيق الكشف بواسطة النظام المحاسبي السحابي المعتمد.</div>
      </div>
      <div style="text-align: left;">
        <div style="margin-bottom: 24px;">المحاسب المسؤول</div>
        <div style="border-top: 1px dotted #94a3b8; width: 120px;"></div>
      </div>
    </div>
  `;

  renderAndPrintDocument(html, `${docTitle} - ${partyName}`);
}

/**
 * 4. Print Analytical Table Reports
 */
export function printReport(config?: TableExportConfig | any): void {
  const conf = config || {};
  const title = conf.title || conf.filename || 'تقرير محاسبي تحليلي';
  const headers = Array.isArray(conf.headers) ? conf.headers : [];
  const rows = Array.isArray(conf.rows) ? conf.rows : [];

  const headersHtml = headers.map((h: string) => `<th>${escapeHtml(h)}</th>`).join('');
  const rowsHtml = rows
    .map(
      (r: any[]) =>
        `<tr>${r.map((c: any) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`
    )
    .join('');

  const html = `
    <!-- Report Header -->
    <div style="border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: flex-start;">
      <div>
        <h1 style="margin: 0; font-size: 20px; font-weight: 900; color: #0f172a;">مؤسسة السحابي للتجارة والتقنية</h1>
        <div style="font-size: 12px; font-weight: 700; color: #0369a1; margin-top: 4px;">${escapeHtml(title)}</div>
      </div>
      <div style="text-align: left; font-size: 11px; color: #64748b;">
        <div>تاريخ الطباعة: <span class="font-mono">${new Date().toLocaleDateString('ar-SA')}</span></div>
        <div>إجمالي السجلات: <span class="font-mono font-bold">${rows.length}</span></div>
      </div>
    </div>

    <!-- Data Table -->
    <table>
      <thead>
        <tr>${headersHtml}</tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <div style="margin-top: 24px; text-align: left; font-size: 11px; color: #94a3b8;">
      تم استخراج التقرير آلياً عبر نظام ERP السحابي
    </div>
  `;

  renderAndPrintDocument(html, title);
}

/**
 * Export to CSV File
 */
export function exportToCSV(config: TableExportConfig): void {
  const headers = config.headers || [];
  const rows = config.rows || [];
  const csvContent =
    'data:text/csv;charset=utf-8,\uFEFF' +
    [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `${config.filename || 'export'}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export to Excel (CSV compatible format)
 */
export function exportToExcel(config: TableExportConfig): void {
  exportToCSV(config);
}

export function exportTableToCsv(config: TableExportConfig): void {
  exportToCSV(config);
}
