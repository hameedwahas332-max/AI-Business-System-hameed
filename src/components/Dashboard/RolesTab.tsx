import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { Role, Permission } from '../../types';
import { Shield, Plus, CheckCircle, XCircle, AlertCircle, Sparkles } from 'lucide-react';

export const RolesTab: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const rolesRes = await api.getRoles();
      if (rolesRes && rolesRes.data) {
        setRoles(Array.isArray(rolesRes.data) ? rolesRes.data : []);
      } else if (Array.isArray(rolesRes)) {
        setRoles(rolesRes);
      } else {
        setRoles([]);
      }

      const permsRes = await api.getPermissions();
      if (permsRes && permsRes.data) {
        setPermissions(Array.isArray(permsRes.data) ? permsRes.data : []);
      } else if (Array.isArray(permsRes)) {
        setPermissions(permsRes);
      } else {
        setPermissions([]);
      }
    } catch (err: any) {
      setError(err.message || 'فشل في تحميل الأدوار والصلاحيات');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6 text-right text-slate-100 font-sans" dir="rtl">
      <div className="bg-slate-900 border border-emerald-900/40 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-lg shadow-emerald-950/50 shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>الأدوار والصلاحيات</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                    Roles & RBAC
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 font-medium">
                  إدارة الأدوار الوظيفية، الصلاحيات المخصصة، ومصفوفة السيطرة المالية
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-950/40 border border-red-800/60 rounded-xl flex items-center gap-3 text-red-300 text-xs sm:text-sm shadow-lg">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-400">
              لا توجد أدوار مسجلة حالياً
            </div>
          ) : (
            roles.map((role) => (
              <div
                key={role.id}
                className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 hover:border-emerald-700/60 transition-colors shadow-xl"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-emerald-400" />
                    <h3 className="font-bold text-white text-sm sm:text-base">{role.name}</h3>
                  </div>
                  {role.isSystem ? (
                    <span className="px-2.5 py-0.5 text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/60 rounded-full">
                      نظام
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700/60 rounded-full">
                      مخصص
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400 mb-4 line-clamp-2">
                  {role.description || 'دور مخصص للتحكم بالصلاحيات'}
                </p>

                <div className="border-t border-slate-800/80 pt-3">
                  <div className="text-xs font-semibold text-slate-300 mb-2">الصلاحيات الممنوحة:</div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {(role.permissions || []).length === 0 ? (
                      <span className="text-xs text-slate-500">لا توجد صلاحيات مخصصة</span>
                    ) : (
                      (role.permissions || []).map((perm, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 text-[11px] bg-slate-950 text-slate-300 rounded-lg border border-slate-800 font-mono"
                        >
                          {typeof perm === 'string' ? perm : perm.name || perm.code}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
export default RolesTab;
