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
      <div className="m3-card p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border border-[color-mix(in_srgb,var(--md-primary)_25%,transparent)] flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-[var(--md-on-surface)] tracking-tight flex items-center flex-wrap gap-2">
                  <span>الأدوار والصلاحيات</span>
                  <span className="m3-badge m3-badge-primary font-mono">
                    Roles & RBAC
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-[var(--md-on-surface-variant)] font-medium mt-0.5">
                  إدارة الأدوار الوظيفية، الصلاحيات المخصصة، ومصفوفة السيطرة المالية
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="m3-badge tabular-nums">
              الأدوار: <strong className="font-mono text-[var(--md-on-surface)]">{roles.length}</strong>
            </span>
            <span className="m3-badge m3-badge-secondary tabular-nums">
              الصلاحيات: <strong className="font-mono">{permissions.length}</strong>
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-[var(--md-error-container)] border border-[color-mix(in_srgb,var(--md-error)_30%,transparent)] rounded-2xl flex items-center gap-3 text-[var(--md-on-error-container)] text-xs sm:text-sm font-medium">
          <AlertCircle className="w-5 h-5 shrink-0 text-[var(--md-error)]" />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="m3-card flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--md-outline-variant)] border-b-[var(--md-primary)]"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {roles.length === 0 ? (
            <div className="m3-card col-span-full text-center py-12 text-xs sm:text-sm text-[var(--md-on-surface-variant)]">
              لا توجد أدوار مسجلة حالياً
            </div>
          ) : (
            roles.map((role) => (
              <div
                key={role.id}
                className="m3-card p-5 hover:border-[var(--md-primary)] transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] flex items-center justify-center shrink-0">
                        <Shield className="w-4 h-4" />
                      </div>
                      <h3 className="font-bold text-[var(--md-on-surface)] text-sm sm:text-base truncate">{role.name}</h3>
                    </div>
                    {role.isSystem ? (
                      <span className="m3-badge m3-badge-primary shrink-0">
                        نظام
                      </span>
                    ) : (
                      <span className="m3-badge shrink-0">
                        مخصص
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[var(--md-on-surface-variant)] mb-4 line-clamp-2 leading-relaxed">
                    {role.description || 'دور مخصص للتحكم بالصلاحيات'}
                  </p>
                </div>

                <div className="border-t border-[var(--md-outline-variant)] pt-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-[var(--md-on-surface)] mb-2">
                    <span>الصلاحيات الممنوحة:</span>
                    <span className="text-[11px] font-mono tabular-nums text-[var(--md-on-surface-variant)]">
                      {(role.permissions || []).length}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto custom-scrollbar">
                    {(role.permissions || []).length === 0 ? (
                      <span className="text-xs text-[var(--md-on-surface-variant)]">لا توجد صلاحيات مخصصة</span>
                    ) : (
                      (role.permissions || []).map((perm, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 text-[11px] bg-[var(--md-surface-container)] text-[var(--md-on-surface)] rounded-lg border border-[var(--md-outline-variant)] font-mono tabular-nums"
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
