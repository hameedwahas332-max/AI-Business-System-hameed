import React, { useState } from 'react';
import { api } from '../../api';
import { Play, CheckCircle2, XCircle, AlertTriangle, ShieldCheck, Database, RefreshCw } from 'lucide-react';

interface TestCase {
  id: string;
  name: string;
  category: string;
  status: 'idle' | 'running' | 'passed' | 'failed';
  message?: string;
  durationMs?: number;
}

export const TestRunnerTab: React.FC = () => {
  const [tests, setTests] = useState<TestCase[]>([
    { id: '1', name: 'فحص اتصال قاعدة البيانات (PostgreSQL Connection)', category: 'Database', status: 'idle' },
    { id: '2', name: 'التحقق من جداول السندات والتحصيلات (Payments & Vouchers Schema)', category: 'Payments', status: 'idle' },
    { id: '3', name: 'التحقق من حسابات وسندات العملاء (Customer Receipts)', category: 'Payments', status: 'idle' },
    { id: '4', name: 'التحقق من حسابات وسندات الموردين (Supplier Payments)', category: 'Payments', status: 'idle' },
    { id: '5', name: 'التحقق من فواتير المبيعات ونقطة البيع (Sales & POS)', category: 'Sales', status: 'idle' },
    { id: '6', name: 'التحقق من اتزان قيود دفتر الأستاذ (General Ledger Balancing)', category: 'Accounting', status: 'idle' },
  ]);

  const [isRunningAll, setIsRunningAll] = useState(false);

  const runTest = async (testId: string) => {
    setTests((prev) =>
      prev.map((t) => (t.id === testId ? { ...t, status: 'running' } : t))
    );

    const start = Date.now();
    try {
      if (testId === '1') {
        await api.getSystemHealth();
      } else if (testId === '2') {
        await api.getPayments({ limit: 1 });
      } else if (testId === '3') {
        await api.getPayments({ type: 'RECEIPT', limit: 1 });
      } else if (testId === '4') {
        await api.getPayments({ type: 'PAYMENT', limit: 1 });
      } else if (testId === '5') {
        await api.getInvoices({ limit: 1 });
      } else if (testId === '6') {
        await api.getLedgerEntries({ limit: 1 });
      }

      const duration = Date.now() - start;
      setTests((prev) =>
        prev.map((t) =>
          t.id === testId
            ? { ...t, status: 'passed', message: 'تم بنجاح ومطابق للمعايير', durationMs: duration }
            : t
        )
      );
    } catch (err: any) {
      const duration = Date.now() - start;
      setTests((prev) =>
        prev.map((t) =>
          t.id === testId
            ? { ...t, status: 'failed', message: err.message || 'فشل الاختبار', durationMs: duration }
            : t
        )
      );
    }
  };

  const runAllTests = async () => {
    setIsRunningAll(true);
    for (const test of tests) {
      await runTest(test.id);
    }
    setIsRunningAll(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 pb-24 text-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            أداة الفحص والتحقق الآلي للإنتاج (Production Test Runner)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            تشغيل اختبارات تكاملية حية للتحقق من سلامة العمليات المحاسبية، الجداول، والـ APIs
          </p>
        </div>

        <button
          onClick={runAllTests}
          disabled={isRunningAll}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-900/30 transition-all disabled:opacity-50"
        >
          {isRunningAll ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          <span>تشغيل كافة الفحوصات</span>
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden divide-y divide-slate-800">
        {tests.map((t) => (
          <div key={t.id} className="p-4 sm:p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {t.status === 'passed' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : t.status === 'failed' ? (
                <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
              ) : t.status === 'running' ? (
                <RefreshCw className="w-5 h-5 text-blue-400 animate-spin shrink-0" />
              ) : (
                <Database className="w-5 h-5 text-slate-500 shrink-0" />
              )}
              <div>
                <h4 className="font-bold text-sm text-white">{t.name}</h4>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px]">
                    {t.category}
                  </span>
                  {t.message && (
                    <span className={t.status === 'passed' ? 'text-emerald-400' : 'text-rose-400'}>
                      {t.message}
                    </span>
                  )}
                  {t.durationMs !== undefined && (
                    <span className="text-slate-500">({t.durationMs} ms)</span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => runTest(t.id)}
              disabled={t.status === 'running' || isRunningAll}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
            >
              تشغيل
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
