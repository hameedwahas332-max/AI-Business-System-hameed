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
      <div className="m3-card p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border border-[color-mix(in_srgb,var(--md-primary)_25%,transparent)] flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-[var(--md-on-surface)] tracking-tight flex items-center flex-wrap gap-2">
                  <span>إدارة حسابات المستخدمين وفريق العمل</span>
                  <span className="m3-badge m3-badge-primary font-mono">
                    Team & Users
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-[var(--md-on-surface-variant)] font-medium mt-0.5">
                  تحكم بالمستخدمين المصرح لهم للعمل في المؤسسة مع تفعيل الأدوار والصلاحيات المخصصة
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="m3-btn-primary shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة مستخدم جديد</span>
          </button>
        </div>
      </div>

      {error ? (
        <div className="p-4 bg-[var(--md-error-container)] border border-[color-mix(in_srgb,var(--md-error)_30%,transparent)] rounded-2xl text-[var(--md-on-error-container)] text-xs sm:text-sm font-medium text-center">
          {error}
        </div>
      ) : isLoading ? (
        <div className="m3-card p-10 text-center text-[var(--md-on-surface-variant)] text-xs font-medium">
          جاري تحميل مستخدمي المؤسسة...
        </div>
      ) : (
        <div className="m3-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="m3-table text-right">
              <thead>
                <tr>
                  <th>الاسم الكامل</th>
                  <th>البريد الإلكتروني</th>
                  <th>رقم الهاتف</th>
                  <th>النوع / الدور</th>
                  <th>الحالة</th>
                  <th className="text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="font-medium">
                {users.map((u) => {
                  const isActive = u.isActive ?? u.is_active;
                  const isAdmin = u.isCompanyAdmin ?? u.is_company_admin;
                  const name = u.fullName || u.full_name;
                  return (
                    <tr key={u.id}>
                      <td className="font-bold text-[var(--md-on-surface)]">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border border-[color-mix(in_srgb,var(--md-primary)_25%,transparent)] font-bold flex items-center justify-center text-xs shrink-0">
                            {name ? name.charAt(0) : 'U'}
                          </div>
                          <span>{name}</span>
                        </div>
                      </td>
                      <td className="font-mono tabular-nums text-[var(--md-on-surface-variant)]">{u.email}</td>
                      <td className="font-mono tabular-nums text-[var(--md-on-surface-variant)]">{u.phone || '—'}</td>
                      <td>
                        {isAdmin ? (
                          <span className="m3-badge m3-badge-primary">
                            مدير المؤسسة
                          </span>
                        ) : (
                          <span className="m3-badge">
                            مستخدم عادي
                          </span>
                        )}
                      </td>
                      <td>
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
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setIsRoleModalOpen(true);
                            }}
                            className="m3-btn-outlined !min-h-[34px] px-3 text-[11px]"
                          >
                            تعديل الصلاحيات
                          </button>
                          <button
                            onClick={() => handleToggleUser(u.id, Boolean(isActive))}
                            className={
                              isActive
                                ? 'm3-btn-danger !min-h-[34px] px-3 text-[11px]'
                                : 'm3-btn-tonal !min-h-[34px] px-3 text-[11px]'
                            }
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
        <div className="fixed inset-0 z-50 flex items-center justify-center m3-backdrop p-4 animate-in fade-in duration-150" dir="rtl">
          <div className="m3-modal-surface w-full max-w-md p-6 text-[var(--md-on-surface)]">
            <div className="flex items-center justify-between border-b border-[var(--md-outline-variant)] pb-3.5 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] flex items-center justify-center shrink-0">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-[var(--md-on-surface)] text-base">إضافة مستخدم جديد لمؤسستك</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="m3-btn-text !min-h-[34px] p-1.5"
                aria-label="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--md-on-surface-variant)] mb-1.5">الاسم الكامل *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="m3-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--md-on-surface-variant)] mb-1.5">البريد الإلكتروني *</label>
                <input
                  type="email"
                  required
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="m3-input font-mono text-left"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--md-on-surface-variant)] mb-1.5">كلمة المرور *</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="m3-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--md-on-surface-variant)] mb-1.5">رقم الهاتف</label>
                <input
                  type="text"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="m3-input font-mono tabular-nums text-left"
                />
              </div>

              <label
                htmlFor="isAdminCheck"
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  isCompanyAdmin
                    ? 'bg-[var(--md-primary-container)]/40 border-[var(--md-primary)]'
                    : 'bg-[var(--md-surface-container)] border-[var(--md-outline-variant)] hover:border-[var(--md-outline)]'
                }`}
              >
                <input
                  type="checkbox"
                  id="isAdminCheck"
                  checked={isCompanyAdmin}
                  onChange={(e) => setIsCompanyAdmin(e.target.checked)}
                  className="w-4 h-4 rounded cursor-pointer"
                  style={{ accentColor: 'var(--md-primary)' }}
                />
                <span className="text-xs font-semibold text-[var(--md-on-surface)]">
                  منح صلاحيات مدير الشركة الكاملة
                </span>
              </label>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="m3-btn-primary flex-1"
                >
                  تأكيد إضافة المستخدم
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="m3-btn-outlined"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Roles Modal */}
      {isRoleModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center m3-backdrop p-4 animate-in fade-in duration-150" dir="rtl">
          <div className="m3-modal-surface w-full max-w-md p-6 text-[var(--md-on-surface)]">
            <div className="flex items-center justify-between border-b border-[var(--md-outline-variant)] pb-3.5 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-[var(--md-on-surface)] text-base">تعديل أدوار المستخدم</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRoleModalOpen(false)}
                className="m3-btn-text !min-h-[34px] p-1.5"
                aria-label="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 mb-6">
              <p className="text-xs text-[var(--md-on-surface-variant)] leading-relaxed">
                حدد الأدوار التي ترغب بتحديدها للمستخدم (<strong className="text-[var(--md-on-surface)]">{selectedUser.fullName || selectedUser.full_name}</strong>):
              </p>
              <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
                {roles.map((r) => {
                  const isChecked = selectedRoleIds.includes(r.id);
                  return (
                    <label
                      key={r.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-[var(--md-primary-container)]/40 border-[var(--md-primary)]'
                          : 'bg-[var(--md-surface-container)] border-[var(--md-outline-variant)] hover:border-[var(--md-outline)]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRoleIds([...selectedRoleIds, r.id]);
                          } else {
                            setSelectedRoleIds(selectedRoleIds.filter(id => id !== r.id));
                          }
                        }}
                        className="w-4 h-4 rounded mt-0.5 cursor-pointer shrink-0"
                        style={{ accentColor: 'var(--md-primary)' }}
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-[var(--md-on-surface)]">{r.name}</div>
                        <div className="text-[11px] text-[var(--md-on-surface-variant)] mt-0.5">{r.description || 'لا يوجد وصف'}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveUserRoles}
                className="m3-btn-primary flex-1"
              >
                حفظ تغييرات الأدوار
              </button>
              <button
                type="button"
                onClick={() => setIsRoleModalOpen(false)}
                className="m3-btn-outlined"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
