import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { User, Role } from '../../types';
import { Users, UserPlus, Shield, CheckCircle, XCircle, Mail, Phone, Lock, Sparkles, X } from 'lucide-react';

export const UsersTab: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form State
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [isCompanyAdmin, setIsCompanyAdmin] = useState(false);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const usersRes = await api.getUsers();
      if (usersRes && usersRes.data) {
        setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
      } else if (Array.isArray(usersRes)) {
        setUsers(usersRes);
      } else {
        setUsers([]);
      }

      const rolesRes = await api.getRoles();
      if (rolesRes && rolesRes.data) {
        setRoles(Array.isArray(rolesRes.data) ? rolesRes.data : []);
      } else if (Array.isArray(rolesRes)) {
        setRoles(rolesRes);
      } else {
        setRoles([]);
      }
    } catch (err: any) {
      setError(err?.message || 'يتطلب عرض المستخدمين تسجيل الدخول بحساب له صلاحيات (users:read)');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createUser({
        email,
        fullName,
        password,
        phone: phone || undefined,
        isCompanyAdmin,
        roleIds: selectedRoleIds,
      });
      setIsAddModalOpen(false);
      setEmail('');
      setFullName('');
      setPassword('');
      setPhone('');
      setSelectedRoleIds([]);
      loadData();
    } catch (err: any) {
      alert(err?.message || 'فشل إضافة المستخدم');
    }
  };

  const handleToggleUser = async (userId: string, currentStatus: boolean) => {
    try {
      await api.toggleUserStatus(userId, !currentStatus);
      loadData();
    } catch (err: any) {
      alert(err?.message || 'فشل تغيير حالة الحساب');
    }
  };

  const handleSaveUserRoles = async () => {
    if (!selectedUser) return;
    try {
      await api.assignUserRoles(selectedUser.id, selectedRoleIds);
      setIsRoleModalOpen(false);
      setSelectedUser(null);
      loadData();
    } catch (err: any) {
      alert(err?.message || 'فشل تحديث أدوار المستخدم');
    }
  };

  return (
    <div className="space-y-6 text-right text-[var(--md-on-surface)] font-sans" dir="rtl">
      
      {/* Header Bar */}
      <div className="m3-card-elevated p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border border-[var(--md-primary)]/30 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-[var(--md-on-surface)] tracking-tight flex items-center gap-2 flex-wrap">
                  <span>إدارة حسابات المستخدمين وفريق العمل</span>
                  <span className="m3-badge m3-badge-primary font-mono">
                    Team & Users
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-[var(--md-on-surface-variant)] font-medium">
                  تحكم بالمستخدمين المصرح لهم للعمل في المؤسسة مع تفعيل الأدوار والصلاحيات المخصصة
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="m3-btn-primary text-xs sm:text-sm shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--md-primary)]"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة مستخدم جديد</span>
          </button>
        </div>
      </div>

      {error ? (
        <div className="p-4 bg-[var(--md-error-container)] border border-[var(--md-error)]/40 rounded-xl text-[var(--md-on-error-container)] text-xs text-center font-semibold">
          {error}
        </div>
      ) : isLoading ? (
        <div className="m3-card p-8 text-center text-[var(--md-on-surface-variant)] text-xs">جاري تحميل مستخدمي المؤسسة...</div>
      ) : (
        <div className="m3-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="m3-table text-xs">
              <thead className="m3-thead">
                <tr>
                  <th className="m3-th">الاسم الكامل</th>
                  <th className="m3-th">البريد الإلكتروني</th>
                  <th className="m3-th">رقم الهاتف</th>
                  <th className="m3-th">النوع / الدور</th>
                  <th className="m3-th">الحالة</th>
                  <th className="m3-th text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--md-outline-variant)] font-medium">
                {users.map((u) => {
                  const isActive = u.isActive ?? u.is_active;
                  const isAdmin = u.isCompanyAdmin ?? u.is_company_admin;
                  const name = u.fullName || u.full_name;
                  return (
                    <tr key={u.id} className="hover:bg-[var(--md-surface-container-high)]/50 transition-colors">
                      <td className="p-3.5 font-bold text-[var(--md-on-surface)] flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-xl bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] font-bold flex items-center justify-center text-xs border border-[var(--md-primary)]/30 shrink-0">
                          {name ? name.charAt(0) : 'U'}
                        </div>
                        <span>{name}</span>
                      </td>
                      <td className="p-3.5 font-mono text-[var(--md-on-surface-variant)]">{u.email}</td>
                      <td className="p-3.5 font-mono tabular-nums text-[var(--md-on-surface-variant)]">{u.phone || '—'}</td>
                      <td className="p-3.5">
                        {isAdmin ? (
                          <span className="m3-badge m3-badge-primary">
                            مدير المؤسسة
                          </span>
                        ) : (
                          <span className="m3-badge bg-[var(--md-surface-container-high)] text-[var(--md-on-surface-variant)] border border-[var(--md-outline-variant)]">
                            مستخدم عادي
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        {isActive ? (
                          <span className="m3-badge m3-badge-success">
                            <CheckCircle className="w-3 h-3" />
                            <span>نشط</span>
                          </span>
                        ) : (
                          <span className="m3-badge m3-badge-error">
                            <XCircle className="w-3 h-3" />
                            <span>معطل</span>
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUser(u);
                              setIsRoleModalOpen(true);
                            }}
                            className="m3-btn-outlined !min-h-[30px] !px-2.5 !py-1 text-[11px] focus-visible:outline-2 focus-visible:outline-[var(--md-primary)]"
                          >
                            تعديل الصلاحيات
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleUser(u.id, Boolean(isActive))}
                            className={`!min-h-[30px] !px-2.5 !py-1 text-[11px] focus-visible:outline-2 focus-visible:outline-[var(--md-primary)] ${
                              isActive ? 'm3-btn-danger' : 'm3-btn-tonal'
                            }`}
                          >
                            {isActive ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 m3-backdrop flex items-center justify-center p-4 animate-in fade-in duration-150" dir="rtl">
          <div className="m3-modal-surface w-full max-w-md p-6 text-[var(--md-on-surface)]">
            <div className="flex items-center justify-between border-b border-[var(--md-outline-variant)] pb-3 mb-4">
              <h3 className="font-bold text-[var(--md-on-surface)] text-base">إضافة مستخدم جديد لمؤسستك</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] p-1 rounded-lg hover:bg-[var(--md-surface-container-high)] cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--md-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--md-on-surface-variant)] mb-1">الاسم الكامل *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="m3-input !h-10 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--md-on-surface-variant)] mb-1">البريد الإلكتروني *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="m3-input !h-10 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--md-on-surface-variant)] mb-1">كلمة المرور *</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="m3-input !h-10 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--md-on-surface-variant)] mb-1">رقم الهاتف</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="m3-input !h-10 text-xs font-mono tabular-nums"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isAdminCheck"
                  checked={isCompanyAdmin}
                  onChange={(e) => setIsCompanyAdmin(e.target.checked)}
                  className="accent-[var(--md-primary)] w-4 h-4 rounded cursor-pointer"
                />
                <label htmlFor="isAdminCheck" className="text-xs text-[var(--md-on-surface)] cursor-pointer">
                  منح صلاحيات مدير الشركة الكاملة
                </label>
              </div>

              <button
                type="submit"
                className="m3-btn-primary w-full text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--md-primary)]"
              >
                تأكيد إضافة المستخدم
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Assign Roles Modal */}
      {isRoleModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 m3-backdrop flex items-center justify-center p-4 animate-in fade-in duration-150" dir="rtl">
          <div className="m3-modal-surface w-full max-w-md p-6 text-[var(--md-on-surface)]">
            <div className="flex items-center justify-between border-b border-[var(--md-outline-variant)] pb-3 mb-4">
              <h3 className="font-bold text-[var(--md-on-surface)] text-base">تعديل أدوار المستخدم</h3>
              <button
                type="button"
                onClick={() => setIsRoleModalOpen(false)}
                className="text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] p-1 rounded-lg hover:bg-[var(--md-surface-container-high)] cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--md-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 mb-6">
              <p className="text-xs text-[var(--md-on-surface-variant)]">حدد الأدوار التي ترغب بتحديدها للمستخدم ({selectedUser.fullName}):</p>
              {roles.map((r) => (
                <label key={r.id} className="flex items-center gap-3 p-2.5 bg-[var(--md-surface-container-low)] rounded-xl border border-[var(--md-outline-variant)] text-xs cursor-pointer hover:border-[var(--md-primary)]/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedRoleIds.includes(r.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRoleIds([...selectedRoleIds, r.id]);
                      } else {
                        setSelectedRoleIds(selectedRoleIds.filter(id => id !== r.id));
                      }
                    }}
                    className="accent-[var(--md-primary)] w-4 h-4 rounded cursor-pointer"
                  />
                  <div>
                    <div className="font-bold text-[var(--md-on-surface)]">{r.name}</div>
                    <div className="text-[11px] text-[var(--md-on-surface-variant)]">{r.description || 'لا يوجد وصف'}</div>
                  </div>
                </label>
              ))}
            </div>

            <button
              type="button"
              onClick={handleSaveUserRoles}
              className="m3-btn-primary w-full text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--md-primary)]"
            >
              حفظ تغييرات الأدوار
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
