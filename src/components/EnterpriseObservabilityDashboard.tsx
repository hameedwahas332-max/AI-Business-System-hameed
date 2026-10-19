import React from 'react';
import {
  Activity,
  Server,
  Cpu,
  HardDrive,
  Clock,
  CheckCircle2,
  Layers,
  ShieldCheck,
  AlertCircle,
  Database,
  ArrowUpRight,
  TrendingDown,
  Sparkles,
  Zap,
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
    <div className="space-y-6 text-slate-100">
      {/* Top Header Card */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white">
                منصة المراقبة الشاملة والتتبع الموزع (Enterprise Observability)
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 font-mono">
                OpenTelemetry Active
              </span>
            </div>
            <p className="text-xs text-slate-400">
              تتبع الحزم البرمجية، تحليل الاختناقات، قياس الأداء اللحظي وكشف الحوادث بالذكاء الاصطناعي
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center gap-1.5 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>SLA 99.98%</span>
          </span>
        </div>
      </div>

      {/* 4 Core Performance KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>زمن الاستجابة (P95 Latency)</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black font-mono tabular-nums text-white">38 ms</div>
          <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>ضمن النطاق الأمثل (الهدف: &lt;100ms)</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>نسبة توفر الخدمات (Availability)</span>
            <Server className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black font-mono tabular-nums text-white">99.98%</div>
          <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>خوادم Cloud Run متوازنة</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>استهلاك المعالج (CPU Load)</span>
            <Cpu className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black font-mono tabular-nums text-white">16%</div>
          <div className="text-[10px] text-slate-400 font-semibold">
            حمل تشغيلي مستقر جداً
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>استهلاك الذاكرة (Memory Heap)</span>
            <HardDrive className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black font-mono tabular-nums text-white">68 MB</div>
          <div className="text-[10px] text-slate-400 font-semibold font-mono">
            Heap 68MB / Total 142MB
          </div>
        </div>
      </div>

      {/* AI Incident Detection & Distributed Tracing */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Distributed Traces (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">سجل التتبع الموزع للطلبات (Distributed Tracing)</h3>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">OpenTelemetry Spans</span>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                  <th className="pb-2">معرف التتبع</th>
                  <th className="pb-2 px-2">الخدمة</th>
                  <th className="pb-2 px-2">الطريقة</th>
                  <th className="pb-2 px-2">المدة</th>
                  <th className="pb-2 px-2">الحالة</th>
                  <th className="pb-2 text-left">الوقت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {traces.map((tr) => (
                  <tr key={tr.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 font-bold text-indigo-400">{tr.id}</td>
                    <td className="py-2.5 px-2 text-slate-200">{tr.service}</td>
                    <td className="py-2.5 px-2 text-slate-400">{tr.method}</td>
                    <td className="py-2.5 px-2 font-bold text-emerald-400">{tr.duration}</td>
                    <td className="py-2.5 px-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {tr.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-left text-slate-500">{tr.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: AI Root Cause Analysis (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">الذكاء الاصطناعي لكشف الحوادث</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                0 أعطال
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>جميع الأنظمة تعمل بكفاءة 100%</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                لم يتم رصد أي تسريب للذاكرة، أو بطء في استعلامات قواعد البيانات، أو أخطاء استجابة غير معالجة خلال آخر 24 ساعة.
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-800/30 border border-slate-800/60 font-mono">
                <span className="text-slate-400">Database Query Pool:</span>
                <span className="text-emerald-400 font-bold">14ms Average</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-800/30 border border-slate-800/60 font-mono">
                <span className="text-slate-400">Cache Hit Ratio:</span>
                <span className="text-indigo-400 font-bold">96.4%</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-800/30 border border-slate-800/60 font-mono">
                <span className="text-slate-400">Error Budget Burn Rate:</span>
                <span className="text-emerald-400 font-bold">0.00%</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] flex items-center justify-between">
            <span>التنبيهات التلقائية متصلة بمركز الإشعارات</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnterpriseObservabilityDashboard;
