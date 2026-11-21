import React from 'react';
import {
  Activity,
  Server,
  Cpu,
  HardDrive,
  CheckCircle2,
  Layers,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export const EnterpriseObservabilityDashboard: React.FC = () => {
  const traces = [
    { id: 'tr-9941', service: 'api.invoices.create', method: 'POST', duration: '28ms', status: '200 OK', time: 'منذ دقيقة' },
    { id: 'tr-9940', service: 'db.postgres.query', method: 'SELECT', duration: '11ms', status: '200 OK', time: 'منذ دقيقتين' },
    { id: 'tr-9939', service: 'storage.b2.sync', method: 'PUT', duration: '84ms', status: '200 OK', time: 'منذ 5 دقائق' },
    { id: 'tr-9938', service: 'api.payments.collect', method: 'POST', duration: '32ms', status: '200 OK', time: 'منذ 7 دقائق' },
    { id: 'tr-9937', service: 'ai.gemini.summary', method: 'GENERATE', duration: '120ms', status: '200 OK', time: 'منذ 10 دقائق' },
  ];

  return (
    <div className="space-y-6 text-right text-[var(--md-on-surface)] font-sans" dir="rtl">
      {/* Top Header Card */}
      <div className="m3-card p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
            style={{
              backgroundColor: 'var(--md-primary-container)',
              color: 'var(--md-on-primary-container)',
            }}
          >
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center flex-wrap gap-2">
              <h2 className="text-base sm:text-lg font-bold text-[var(--md-on-surface)]">
                منصة المراقبة الشاملة والتتبع الموزع (Enterprise Observability)
              </h2>
              <span
                className="m3-badge font-mono"
                style={{
                  backgroundColor: 'var(--md-primary-container)',
                  color: 'var(--md-on-primary-container)',
                  borderColor: 'transparent',
                }}
              >
                OpenTelemetry Active
              </span>
            </div>
            <p className="text-xs text-[var(--md-on-surface-variant)] mt-0.5">
              تتبع الحزم البرمجية، تحليل الاختناقات، قياس الأداء اللحظي وكشف الحوادث بالذكاء الاصطناعي
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className="m3-badge px-3 py-1.5 font-mono tabular-nums"
            style={{
              backgroundColor: 'var(--md-success-container)',
              color: 'var(--md-on-success-container)',
              borderColor: 'transparent',
            }}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: 'var(--md-success)' }}
            />
            <span>SLA 99.98%</span>
          </span>
        </div>
      </div>

      {/* 4 Core Performance KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="m3-card p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-[var(--md-on-surface-variant)]">
            <span>زمن الاستجابة (P95 Latency)</span>
            <Activity className="w-4 h-4" style={{ color: 'var(--md-success)' }} />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-[var(--md-on-surface)]">38 ms</div>
          <div className="text-[11px] font-semibold flex items-center gap-1" style={{ color: 'var(--md-success)' }}>
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>ضمن النطاق الأمثل (الهدف: &lt;100ms)</span>
          </div>
        </div>

        <div className="m3-card p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-[var(--md-on-surface-variant)]">
            <span>نسبة توفر الخدمات (Availability)</span>
            <Server className="w-4 h-4" style={{ color: 'var(--md-primary)' }} />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-[var(--md-on-surface)]">99.98%</div>
          <div className="text-[11px] font-semibold flex items-center gap-1" style={{ color: 'var(--md-success)' }}>
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>خوادم Cloud Run متوازنة</span>
          </div>
        </div>

        <div className="m3-card p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-[var(--md-on-surface-variant)]">
            <span>استهلاك المعالج (CPU Load)</span>
            <Cpu className="w-4 h-4" style={{ color: 'var(--md-info)' }} />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-[var(--md-on-surface)]">16%</div>
          <div className="text-[11px] text-[var(--md-on-surface-variant)] font-medium">
            حمل تشغيلي مستقر جداً
          </div>
        </div>

        <div className="m3-card p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-[var(--md-on-surface-variant)]">
            <span>استهلاك الذاكرة (Memory Heap)</span>
            <HardDrive className="w-4 h-4" style={{ color: 'var(--md-secondary)' }} />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-[var(--md-on-surface)]">68 MB</div>
          <div className="text-[11px] text-[var(--md-on-surface-variant)] font-mono tabular-nums">
            Heap 68MB / Total 142MB
          </div>
        </div>
      </div>

      {/* AI Incident Detection & Distributed Tracing */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Distributed Traces (7 cols) */}
        <div className="lg:col-span-7 m3-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--md-outline-variant)] pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4" style={{ color: 'var(--md-primary)' }} />
              <h3 className="text-sm font-bold text-[var(--md-on-surface)]">
                سجل التتبع الموزع للطلبات (Distributed Tracing)
              </h3>
            </div>
            <span className="text-[11px] text-[var(--md-on-surface-variant)] font-mono">OpenTelemetry Spans</span>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="m3-table text-xs">
              <thead className="m3-thead">
                <tr>
                  <th className="m3-th">معرف التتبع</th>
                  <th className="m3-th">الخدمة</th>
                  <th className="m3-th">الطريقة</th>
                  <th className="m3-th">المدة</th>
                  <th className="m3-th">الحالة</th>
                  <th className="m3-th text-left">الوقت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--md-outline-variant)] font-mono">
                {traces.map((tr) => (
                  <tr key={tr.id} className="hover:bg-[var(--md-surface-container-high)]/60 transition-colors">
                    <td className="py-2.5 px-3 font-bold tabular-nums" style={{ color: 'var(--md-primary-text)' }}>
                      {tr.id}
                    </td>
                    <td className="py-2.5 px-3 text-[var(--md-on-surface)]">{tr.service}</td>
                    <td className="py-2.5 px-3 text-[var(--md-on-surface-variant)]">{tr.method}</td>
                    <td className="py-2.5 px-3 font-bold tabular-nums" style={{ color: 'var(--md-success)' }}>
                      {tr.duration}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className="m3-badge font-mono tabular-nums"
                        style={{
                          backgroundColor: 'var(--md-success-container)',
                          color: 'var(--md-on-success-container)',
                          borderColor: 'transparent',
                        }}
                      >
                        {tr.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-left font-sans text-[var(--md-on-surface-variant)]">{tr.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Root Cause Analysis (5 cols) */}
        <div className="lg:col-span-5 m3-card p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--md-outline-variant)] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" style={{ color: 'var(--md-secondary)' }} />
                <h3 className="text-sm font-bold text-[var(--md-on-surface)]">الذكاء الاصطناعي لكشف الحوادث</h3>
              </div>
              <span
                className="m3-badge tabular-nums"
                style={{
                  backgroundColor: 'var(--md-success-container)',
                  color: 'var(--md-on-success-container)',
                  borderColor: 'transparent',
                }}
              >
                0 أعطال
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs" style={{ color: 'var(--md-success)' }}>
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>جميع الأنظمة تعمل بكفاءة 100%</span>
              </div>
              <p className="text-xs text-[var(--md-on-surface-variant)] leading-relaxed">
                لم يتم رصد أي تسريب للذاكرة، أو بطء في استعلامات قواعد البيانات، أو أخطاء استجابة غير معالجة خلال آخر 24 ساعة.
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center p-3 rounded-xl bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] font-mono">
                <span className="text-[var(--md-on-surface-variant)]">Database Query Pool:</span>
                <span className="font-bold tabular-nums" style={{ color: 'var(--md-success)' }}>
                  14ms Average
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] font-mono">
                <span className="text-[var(--md-on-surface-variant)]">Cache Hit Ratio:</span>
                <span className="font-bold tabular-nums" style={{ color: 'var(--md-primary-text)' }}>
                  96.4%
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] font-mono">
                <span className="text-[var(--md-on-surface-variant)]">Error Budget Burn Rate:</span>
                <span className="font-bold tabular-nums" style={{ color: 'var(--md-success)' }}>
                  0.00%
                </span>
              </div>
            </div>
          </div>

          <div
            className="p-3 rounded-2xl text-xs font-medium flex items-center justify-between gap-2"
            style={{
              backgroundColor: 'var(--md-primary-container)',
              color: 'var(--md-on-primary-container)',
            }}
          >
            <span>التنبيهات التلقائية متصلة بمركز الإشعارات</span>
            <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: 'var(--md-success)' }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnterpriseObservabilityDashboard;
