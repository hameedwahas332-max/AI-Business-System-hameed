import React, { useState } from 'react';
import { ReportsTab } from './ReportsTab';
import { CashFlowForecastTab } from './CashFlowForecastTab';
import { TrendingUp, BarChart3, DollarSign, Calendar, FileSpreadsheet } from 'lucide-react';

export const FinancialReportingHub: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'reports' | 'forecast'>('reports');

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-cyan-400" />
            مركز التقارير والذكاء المالي (Financial Intelligence Hub)
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            التقارير المحاسبية الرسمية، قائمة الدخل، ميزان المراجعة، والتوقعات المالية المستقبلية.
          </p>
        </div>

        <div className="flex bg-slate-800/80 p-1 rounded-lg border border-slate-700">
          <button
            onClick={() => setActiveSection('reports')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              activeSection === 'reports'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            التقارير المحاسبية
          </button>
          <button
            onClick={() => setActiveSection('forecast')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              activeSection === 'forecast'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            توقعات التدفقات النقدية
          </button>
        </div>
      </div>

      {activeSection === 'reports' ? <ReportsTab /> : <CashFlowForecastTab />}
    </div>
  );
};
export default FinancialReportingHub;
