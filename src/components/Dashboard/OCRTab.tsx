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
    <div className="space-y-6 text-right text-slate-100 font-sans" dir="rtl">
      
      {/* Header Banner */}
      <div className="bg-slate-900 border border-emerald-900/40 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-lg shadow-emerald-950/50 shrink-0">
                <ScrollText className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>نظام الفحص الضوئي الهيكلي للفواتير</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                    OCR & Ingestion
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 font-medium">
                  استخراج تلقائي لهيكل الفواتير والأسعار وحساب نسب الثقة قبل الاعتماد المالي المزدوج
                </p>
              </div>
            </div>
          </div>

          <span className="text-xs px-3 py-1.5 rounded-xl bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-semibold font-mono shrink-0">
            AI Vision Powered
          </span>
        </div>
      </div>

      {commitSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs sm:text-sm flex items-center gap-2.5 shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{commitSuccess}</span>
        </div>
      )}

      {uploadError && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs sm:text-sm flex items-center gap-2.5 shadow-lg">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Upload & List Column */}
        <div className="space-y-4">
          
          {/* File Drag and Drop Box */}
          <div className="p-6 rounded-2xl bg-slate-900 border-2 border-dashed border-slate-700/80 hover:border-emerald-500 transition-all text-center flex flex-col items-center justify-center gap-3 shadow-xl">
            <div className="p-3 bg-emerald-950 text-emerald-400 border border-emerald-800/50 rounded-2xl">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-white">ارفع صورة أو ملف PDF للفاتورة</p>
              <p className="text-[11px] text-slate-400 mt-0.5">يدعم فواتير المبيعات والمشتريات الصادرة والواردة</p>
            </div>
            <label className="cursor-pointer px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-950/60 border border-emerald-500/40 transition-all flex items-center gap-1.5 active:scale-95">
              <span>اختر ملف من جهازك</span>
              <input type="file" accept="image/*,application/pdf" onChange={handleFileUpload} className="hidden" />
            </label>
            {isUploading && (
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>جاري معالجة الفحص الضوئي وحساب الثقة...</span>
              </div>
            )}
          </div>

          {/* List of Previous Documents */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 space-y-3 shadow-xl">
            <h3 className="text-xs font-bold text-white flex items-center justify-between">
              <span>سجل المستندات المفحوصة ضوئياً</span>
              <button onClick={fetchDocuments} className="text-emerald-400 hover:underline text-[11px] cursor-pointer">تحديث</button>
            </h3>

            {documents.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">لا توجد مستندات مسجلة حالياً</p>
            ) : (
              <div className="space-y-2 max-h-[350px] overflow-y-auto">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => fetchDocDetails(doc.id)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                      selectedDoc?.id === doc.id
                        ? 'border-emerald-500 bg-emerald-950/30 font-medium'
                        : 'border-slate-800 bg-slate-950/50 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="font-semibold text-white truncate max-w-[120px]">{doc.fileName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{new Date(doc.createdAt).toLocaleDateString('ar-YE')}</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                        doc.status === 'COMMITTED'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                          : doc.confidenceScore >= 85
                          ? 'bg-teal-950 text-teal-300 border border-teal-800/60'
                          : 'bg-amber-950 text-amber-300 border border-amber-800/60'
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
            <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 space-y-5 shadow-xl">
              
              {/* Document Status Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-emerald-400" />
                    <span>مراجعة المستند: {selectedDoc.fileName}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    تأكيد وتدقيق البيانات الاستخراجية قبل التدوير إلى سجلات المحاسبة المعتمدة
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-3 py-1 rounded-xl font-mono font-bold ${
                    selectedDoc.confidenceScore >= 85
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                      : 'bg-amber-950 text-amber-300 border border-amber-800/60'
                  }`}>
                    نسبة الثقة الكلية: {selectedDoc.confidenceScore}%
                  </span>
                </div>
              </div>

              {/* Validation Errors Notice */}
              {selectedDoc.validationErrors && selectedDoc.validationErrors.length > 0 && (
                <div className="p-3.5 bg-amber-950/40 border border-amber-800/60 rounded-xl text-amber-300 text-xs space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>تنبيهات المراجعة الدقيقة:</span>
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-200/90">
                    {selectedDoc.validationErrors.map((err: string, i: number) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Edit Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">نوع المعاملة</label>
                  <select
                    value={partyType}
                    onChange={(e) => setPartyType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="CUSTOMER">فاتورة مبيعات (عميل)</option>
                    <option value="SUPPLIER">فاتورة مشتريات (مورد)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">اسم الجهة (العميل / المورد)</label>
                  <input
                    type="text"
                    value={partyName}
                    onChange={(e) => setPartyName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">تاريخ الفاتورة</label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Items Table Review */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-200">بنود الفاتورة المستخرجة:</h4>
                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-xs text-right text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">اسم المنتج</th>
                        <th className="p-2.5">الكمية</th>
                        <th className="p-2.5">سعر الوحدة</th>
                        <th className="p-2.5">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {items.map((it, idx) => (
                        <tr key={idx}>
                          <td className="p-2.5">
                            <input
                              type="text"
                              value={it.productName}
                              onChange={(e) => {
                                const newItems = [...items];
                                newItems[idx].productName = e.target.value;
                                setItems(newItems);
                              }}
                              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100 focus:border-emerald-500"
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
                              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100 font-mono focus:border-emerald-500"
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
                              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100 font-mono focus:border-emerald-500"
                            />
                          </td>
                          <td className="p-2.5 font-bold font-mono text-emerald-400">
                            {formatAmount(it.quantity * it.unitPrice)} ريال
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Actions Box */}
              <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-[11px] text-slate-400">
                  عند النقر على تأكيد الاعتماد، سيتم توليد الفاتورة المعتمدة وتحديث دفتر الأستاذ العام والمخزون أوتوماتيكياً.
                </p>
                <button
                  onClick={handleCommit}
                  disabled={isCommitting || selectedDoc.status === 'COMMITTED'}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-950/60 border border-emerald-500/40 flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
                >
                  {isCommitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>جاري الاعتماد المحاسبي...</span>
                    </>
                  ) : selectedDoc.status === 'COMMITTED' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
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
            <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-12 text-center text-slate-400 text-xs shadow-xl">
              الرجاء رفع مستند جديد أو اختيار مستند من القائمة الجانبية لمراجعته وتدقيقه
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
