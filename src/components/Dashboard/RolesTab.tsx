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
    <div className="space-y-6 text-right text-[var(--md-on-surface)] font-sans" dir="rtl">
      <div className="m3-card-elevated p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border border-[var(--md-primary)]/30 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-[var(--md-on-surface)] tracking-tight flex items-center gap-2 flex-wrap">
                  <span>الأدوار والصلاحيات</span>
                  <span className="m3-badge m3-badge-primary font-mono">
                    Roles & RBAC
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-[var(--md-on-surface-variant)] font-medium">
                  إدارة الأدوار الوظيفية، الصلاحيات المخصصة، ومصفوفة السيطرة المالية
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-[var(--md-error-container)] border border-[var(--md-error)]/40 rounded-xl flex items-center gap-3 text-[var(--md-on-error-container)] text-xs sm:text-sm font-semibold">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-[var(--md-error)]" />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--md-primary)]"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.length === 0 ? (
            <div className="m3-card col-span-full text-center py-12 text-[var(--md-on-surface-variant)]">
              لا توجد أدوار مسجلة حالياً
            </div>
          ) : (
            roles.map((role) => (
              <div
                key={role.id}
                className="m3-card p-5 hover:border-[var(--md-primary)]/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-3 gap-2">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-[var(--md-primary-text)] shrink-0" />
                    <h3 className="font-bold text-[var(--md-on-surface)] text-sm sm:text-base">{role.name}</h3>
                  </div>
                  {role.isSystem ? (
                    <span className="m3-badge m3-badge-primary">
                      نظام
                    </span>
                  ) : (
                    <span className="m3-badge bg-[var(--md-surface-container-high)] text-[var(--md-on-surface-variant)] border border-[var(--md-outline-variant)]">
                      مخصص
                    </span>
                  )}
                </div>

                <p className="text-xs text-[var(--md-on-surface-variant)] mb-4 line-clamp-2">
                  {role.description || 'دور مخصص للتحكم بالصلاحيات'}
                </p>

                <div className="border-t border-[var(--md-outline-variant)] pt-3">
                  <div className="text-xs font-semibold text-[var(--md-on-surface)] mb-2">الصلاحيات الممنوحة:</div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {(role.permissions || []).length === 0 ? (
                      <span className="text-xs text-[var(--md-on-surface-variant)]">لا توجد صلاحيات مخصصة</span>
                    ) : (
                      (role.permissions || []).map((perm, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 text-[11px] bg-[var(--md-surface-container-low)] text-[var(--md-on-surface)] rounded-lg border border-[var(--md-outline-variant)] font-mono"
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
