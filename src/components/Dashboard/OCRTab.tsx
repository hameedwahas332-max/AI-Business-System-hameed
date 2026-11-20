import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { safeFetchJson } from '../../lib/safeFetch';
import { formatAmount } from '../../lib/formatters';
import { ScrollText, Upload, CheckCircle2, AlertTriangle, FileText, RefreshCw, ArrowLeftRight, Check, FileCheck, Eye } from 'lucide-react';

export const OCRTab: React.FC = () => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitSuccess, setCommitSuccess] = useState<string | null>(null);

  // Form edit states for reviewed data
  const [partyType, setPartyType] = useState<'CUSTOMER' | 'SUPPLIER'>('CUSTOMER');
  const [partyName, setPartyName] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [items, setItems] = useState<Array<{ productName: string; quantity: number; unitPrice: number; total: number }>>([]);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const token = api.getToken();
      const res = await safeFetchJson('/api/v1/ocr/documents', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok && res.data?.data) {
        setDocuments(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch OCR docs', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    setCommitSuccess(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        const token = api.getToken();

        const res = await safeFetchJson('/api/v1/ocr/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            fileData: base64Data
          })
        });

        if (!res.ok || !res.data) {
          throw new Error(res.error || res.data?.error?.message || 'فشل معالجة الفحص الضوئي');
        }

        const data = res.data;
        setIsUploading(false);
        await fetchDocuments();
        if (data.data?.documentId) {
          fetchDocDetails(data.data.documentId);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setIsUploading(false);
      setUploadError(err.message || 'فشل تحميل الملف وتمريره عبر المحرك الضوئي');
    }
  };

  const fetchDocDetails = async (docId: string) => {
    try {
      const token = api.getToken();
      const res = await safeFetchJson(`/api/v1/ocr/documents/${docId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok && res.data?.data) {
        const doc = res.data.data;
        setSelectedDoc(doc);

        const ext = doc.extractedData || {};
        setPartyType(ext.partyType?.value || ext.partyType || 'CUSTOMER');
        setPartyName(ext.partyName?.value || ext.partyName || '');
        setInvoiceDate(ext.invoiceDate?.value || ext.invoiceDate || new Date().toISOString().split('T')[0]);

        const extItems = ext.items || [];
        setItems(
          extItems.map((it: any) => ({
            productName: it.productName?.value || it.productName || 'صنف مفهرس',
            quantity: parseFloat(it.quantity?.value || it.quantity || 1),
            unitPrice: parseFloat(it.unitPrice?.value || it.unitPrice || 100),
            total: parseFloat(it.total?.value || it.total || 100)
          }))
        );
      }
    } catch (err) {
      console.error('Failed to fetch doc details', err);
    }
  };

  const handleCommit = async () => {
    if (!selectedDoc) return;
    setIsCommitting(true);
    setCommitSuccess(null);
    setUploadError(null);

    try {
      const token = api.getToken();

      const reviewedData = {
        partyType,
        partyName,
        invoiceDate,
        items
      };

      const res = await safeFetchJson(`/api/v1/ocr/documents/${selectedDoc.id}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ reviewedData })
      });

      if (!res.ok || !res.data) {
        throw new Error(res.error || res.data?.error?.message || 'فشل اعتماد المستند المحاسبي');
      }

      const data = res.data;
      setIsCommitting(false);
      setCommitSuccess(`تم اعتماد الفاتورة المحاسبية بنجاح برقم مرجعي: ${data.data.invoiceNumber}`);
      await fetchDocuments();
      setSelectedDoc(null);
    } catch (err: any) {
      setIsCommitting(false);
      setUploadError(err.message || 'فشل اعتماد المستند المحاسبي');
    }
  };

  return (
    <div className="space-y-6 text-right text-[var(--md-on-surface)] font-sans" dir="rtl">

      {/* Header Banner */}
      <div className="m3-card-elevated p-5 sm:p-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border border-[var(--md-primary)]/20 flex items-center justify-center shrink-0">
                <ScrollText className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-[var(--md-on-surface)] tracking-tight flex flex-wrap items-center gap-2">
                  <span>نظام الفحص الضوئي الهيكلي للفواتير</span>
                  <span className="m3-badge m3-badge-primary font-mono text-[10px]">
                    OCR & Ingestion
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-[var(--md-on-surface-variant)] font-medium">
                  استخراج تلقائي لهيكل الفواتير والأسعار وحساب نسب الثقة قبل الاعتماد المالي المزدوج
                </p>
              </div>
            </div>
          </div>

          <span className="m3-badge m3-badge-primary font-mono text-xs px-3 py-1.5 shrink-0">
            AI Vision Powered
          </span>
        </div>
      </div>

      {commitSuccess && (
        <div className="p-4 rounded-xl bg-[var(--md-success-container)] border border-[var(--md-success)]/30 text-[var(--md-on-success-container)] text-xs sm:text-sm flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-[var(--md-success)] shrink-0" />
          <span>{commitSuccess}</span>
        </div>
      )}

      {uploadError && (
        <div className="p-4 rounded-xl bg-[var(--md-error-container)] border border-[var(--md-error)]/30 text-[var(--md-on-error-container)] text-xs sm:text-sm flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-[var(--md-error)] shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Upload & List Column */}
        <div className="space-y-4">

          {/* File Drag and Drop Box */}
          <div className="m3-card p-6 border-2 border-dashed border-[var(--md-outline-variant)] hover:border-[var(--md-primary)] transition-all text-center flex flex-col items-center justify-center gap-3">
            <div className="p-3 bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border border-[var(--md-primary)]/20 rounded-2xl">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-[var(--md-on-surface)]">ارفع صورة أو ملف PDF للفاتورة</p>
              <p className="text-[11px] text-[var(--md-on-surface-variant)] mt-0.5">يدعم فواتير المبيعات والمشتريات الصادرة والواردة</p>
            </div>
            <label className="m3-btn-primary !min-h-[38px] !px-4 !py-2 text-xs cursor-pointer flex items-center gap-1.5">
              <span>اختر ملف من جهازك</span>
              <input type="file" accept="image/*,application/pdf" onChange={handleFileUpload} className="hidden" />
            </label>
            {isUploading && (
              <div className="flex items-center gap-2 text-xs text-[var(--md-primary-text)] font-medium">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>جاري معالجة الفحص الضوئي وحساب الثقة...</span>
              </div>
            )}
          </div>

          {/* List of Previous Documents */}
          <div className="m3-card p-4 space-y-3">
            <h3 className="text-xs font-bold text-[var(--md-on-surface)] flex items-center justify-between">
              <span>سجل المستندات المفحوصة ضوئياً</span>
              <button onClick={fetchDocuments} className="text-[var(--md-primary-text)] hover:underline text-[11px] cursor-pointer">تحديث</button>
            </h3>

            {documents.length === 0 ? (
              <p className="text-xs text-[var(--md-on-surface-variant)] text-center py-6">لا توجد مستندات مسجلة حالياً</p>
            ) : (
              <div className="space-y-2 max-h-[350px] overflow-y-auto">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => fetchDocDetails(doc.id)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                      selectedDoc?.id === doc.id
                        ? 'border-[var(--md-primary)] bg-[var(--md-primary-container)]/50 font-medium'
                        : 'border-[var(--md-outline-variant)] bg-[var(--md-surface-container-low)] hover:bg-[var(--md-surface-container-high)]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-[var(--md-on-surface-variant)] shrink-0" />
                      <div>
                        <p className="font-semibold text-[var(--md-on-surface)] truncate max-w-[120px]">{doc.fileName}</p>
                        <p className="text-[10px] text-[var(--md-on-surface-variant)] font-mono tabular-nums">{new Date(doc.createdAt).toLocaleDateString('ar-YE')}</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <span className={`m3-badge font-mono tabular-nums text-[10px] ${
                        doc.status === 'COMMITTED'
                          ? 'm3-badge-success'
                          : doc.confidenceScore >= 85
                          ? 'm3-badge-primary'
                          : 'm3-badge-warning'
                      }`}>
                        {doc.status === 'COMMITTED' ? 'معتمدة' : `${doc.confidenceScore}% ثقة`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Document Review & Editing Workspace */}
        <div className="lg:col-span-2 space-y-4">
          {selectedDoc ? (
            <div className="m3-card p-5 space-y-5">

              {/* Document Status Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[var(--md-outline-variant)]">
                <div>
                  <h3 className="text-sm font-bold text-[var(--md-on-surface)] flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-[var(--md-primary-text)]" />
                    <span>مراجعة المستند: {selectedDoc.fileName}</span>
                  </h3>
                  <p className="text-xs text-[var(--md-on-surface-variant)] mt-0.5">
                    تأكيد وتدقيق البيانات الاستخراجية قبل التدوير إلى سجلات المحاسبة المعتمدة
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`m3-badge font-mono tabular-nums text-xs px-3 py-1 ${
                    selectedDoc.confidenceScore >= 85
                      ? 'm3-badge-success'
                      : 'm3-badge-warning'
                  }`}>
                    نسبة الثقة الكلية: {selectedDoc.confidenceScore}%
                  </span>
                </div>
              </div>

              {/* Validation Errors Notice */}
              {selectedDoc.validationErrors && selectedDoc.validationErrors.length > 0 && (
                <div className="p-3.5 bg-[var(--md-warning-container)] border border-[var(--md-warning)]/30 rounded-xl text-[var(--md-on-warning-container)] text-xs space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-[var(--md-warning)]" />
                    <span>تنبيهات المراجعة الدقيقة:</span>
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                    {selectedDoc.validationErrors.map((err: string, i: number) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Edit Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-[var(--md-on-surface-variant)] font-semibold mb-1.5">نوع المعاملة</label>
                  <select
                    value={partyType}
                    onChange={(e) => setPartyType(e.target.value as any)}
                    className="m3-select !h-10 text-xs"
                  >
                    <option value="CUSTOMER">فاتورة مبيعات (عميل)</option>
                    <option value="SUPPLIER">فاتورة مشتريات (مورد)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[var(--md-on-surface-variant)] font-semibold mb-1.5">اسم الجهة (العميل / المورد)</label>
                  <input
                    type="text"
                    value={partyName}
                    onChange={(e) => setPartyName(e.target.value)}
                    className="m3-input !h-10 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[var(--md-on-surface-variant)] font-semibold mb-1.5">تاريخ الفاتورة</label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="m3-input !h-10 text-xs font-mono tabular-nums"
                  />
                </div>
              </div>

              {/* Items Table Review */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-[var(--md-on-surface)]">بنود الفاتورة المستخرجة:</h4>
                <div className="overflow-x-auto border border-[var(--md-outline-variant)] rounded-xl">
                  <table className="m3-table text-xs text-right" dir="rtl">
                    <thead className="m3-thead">
                      <tr>
                        <th className="m3-th">اسم المنتج</th>
                        <th className="m3-th">الكمية</th>
                        <th className="m3-th">سعر الوحدة</th>
                        <th className="m3-th">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--md-outline-variant)]">
                      {items.map((it, idx) => (
                        <tr key={idx} className="hover:bg-[var(--md-surface-container-low)] transition-colors">
                          <td className="p-2.5">
                            <input
                              type="text"
                              value={it.productName}
                              onChange={(e) => {
                                const newItems = [...items];
                                newItems[idx].productName = e.target.value;
                                setItems(newItems);
                              }}
                              className="m3-input !h-9 !px-2.5 text-xs"
                            />
                          </td>
                          <td className="p-2.5 w-24">
                            <input
                              type="number"
                              value={it.quantity}
                              onChange={(e) => {
                                const newItems = [...items];
                                newItems[idx].quantity = parseFloat(e.target.value) || 0;
                                newItems[idx].total = newItems[idx].quantity * newItems[idx].unitPrice;
                                setItems(newItems);
                              }}
                              className="m3-input !h-9 !px-2.5 text-xs font-mono tabular-nums"
                            />
                          </td>
                          <td className="p-2.5 w-32">
                            <input
                              type="number"
                              value={it.unitPrice}
                              onChange={(e) => {
                                const newItems = [...items];
                                newItems[idx].unitPrice = parseFloat(e.target.value) || 0;
                                newItems[idx].total = newItems[idx].quantity * newItems[idx].unitPrice;
                                setItems(newItems);
                              }}
                              className="m3-input !h-9 !px-2.5 text-xs font-mono tabular-nums"
                            />
                          </td>
                          <td className="p-2.5 font-bold font-mono tabular-nums text-[var(--md-success)]">
                            {formatAmount(it.quantity * it.unitPrice)} ريال
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Actions Box */}
              <div className="pt-4 border-t border-[var(--md-outline-variant)] flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-[11px] text-[var(--md-on-surface-variant)]">
                  عند النقر على تأكيد الاعتماد، سيتم توليد الفاتورة المعتمدة وتحديث دفتر الأستاذ العام والمخزون أوتوماتيكياً.
                </p>
                <button
                  onClick={handleCommit}
                  disabled={isCommitting || selectedDoc.status === 'COMMITTED'}
                  className="m3-btn-primary text-xs shrink-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isCommitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>جاري الاعتماد المحاسبي...</span>
                    </>
                  ) : selectedDoc.status === 'COMMITTED' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>معتمدة محاسبياً بالكامل</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>تأكيد واعتماد الفاتورة المحاسبية</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          ) : (
            <div className="m3-card p-12 text-center text-[var(--md-on-surface-variant)] text-xs">
              الرجاء رفع مستند جديد أو اختيار مستند من القائمة الجانبية لمراجعته وتدقيقه
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
