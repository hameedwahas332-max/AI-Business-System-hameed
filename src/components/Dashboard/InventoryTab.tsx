import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import {
  Boxes,
  Search,
  Loader2,
  AlertCircle,
  ArrowDownRight,
  ArrowUpLeft,
} from 'lucide-react';

export const InventoryTab: React.FC = () => {
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getInventoryMovements({
        search: searchQuery,
        type: typeFilter,
      });
      setMovements(res?.data || []);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل حركات المخزون');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchQuery, typeFilter]);

  return (
    <div className="space-y-6 text-right text-slate-100 font-sans" dir="rtl">
      {/* Header */}
      <div className="bg-slate-900 border border-emerald-900/40 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-lg shadow-emerald-950/50 shrink-0">
                <Boxes className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>حركات وتتبع المخزون</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                    Inventory Audit Log
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 font-medium">
                  سجل دقيق ومحمي لكافة عمليات الوارد (IN) والصادر (OUT) والتسويات المخزنية مع رصيد المخزون المتبقي
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-xs sm:text-sm flex items-center gap-2.5 shadow-lg">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Movements Table */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="البحث باسم المنتج، الكود SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-9 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="py-2 px-3 text-xs bg-slate-950 border border-slate-700/80 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="">جميع أنواع الحركات</option>
            <option value="IN">وارد للمخزن (IN)</option>
            <option value="OUT">صادر من المخزن (OUT)</option>
            <option value="ADJUSTMENT">تعديل/تسويه (ADJUSTMENT)</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="p-3.5">المنتج / الصنف</th>
                <th className="p-3.5">نوع الحركة</th>
                <th className="p-3.5">الكمية</th>
                <th className="p-3.5">المخزون المتبقي بعد الحركة</th>
                <th className="p-3.5">نوع المرجع</th>
                <th className="p-3.5">التاريخ والوقت</th>
                <th className="p-3.5">ملاحظات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                      <span>جاري تحميل حركات المخزون...</span>
                    </div>
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    لا توجد حركات مخزنية مسجلة حتى الآن.
                  </td>
                </tr>
              ) : (
                movements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-white">{m.product_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">SKU: {m.product_sku || '-'}</div>
                    </td>
                    <td className="p-3.5">
                      {m.type === 'IN' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                          <ArrowDownRight className="w-3 h-3 text-emerald-400" /> توريد (IN)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-950 text-red-300 border border-red-800/60">
                          <ArrowUpLeft className="w-3 h-3 text-red-400" /> صرف (OUT)
                        </span>
                      )}
                    </td>
                    <td className={`p-3.5 font-mono font-bold text-sm ${m.type === 'IN' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {m.type === 'IN' ? `+${m.quantity}` : `-${m.quantity}`} {m.product_unit}
                    </td>
                    <td className="p-3.5 font-mono font-bold text-teal-300 text-sm">
                      {m.remaining_stock} {m.product_unit}
                    </td>
                    <td className="p-3.5 text-slate-300 font-semibold">{m.reference_type}</td>
                    <td className="p-3.5 text-slate-400 font-mono text-[11px]">
                      {new Date(m.created_at).toLocaleString('ar-YE')}
                    </td>
                    <td className="p-3.5 text-slate-400">{m.notes || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
