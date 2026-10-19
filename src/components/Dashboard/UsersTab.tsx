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
    <div className="space-y-6 text-right text-slate-100 font-sans" dir="rtl">
      
      {/* Header Bar */}
      <div className="bg-slate-900 border border-emerald-900/40 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-lg shadow-emerald-950/50 shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>إدارة حسابات المستخدمين وفريق العمل</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                    Team & Users
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 font-medium">
                  تحكم بالمستخدمين المصرح لهم للعمل في المؤسسة مع تفعيل الأدوار والصلاحيات المخصصة
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold text-xs sm:text-sm shadow-lg shadow-emerald-950/60 border border-emerald-500/40 flex items-center gap-2 transition-all active:scale-95 shrink-0 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة مستخدم جديد</span>
          </button>
        </div>
      </div>

      {error ? (
        <div className="p-4 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-xs text-center shadow-lg">
          {error}
        </div>
      ) : isLoading ? (
        <div className="p-8 text-center text-slate-400 text-xs">جاري تحميل مستخدمي المؤسسة...</div>
      ) : (
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">الاسم الكامل</th>
                  <th className="p-3.5">البريد الإلكتروني</th>
                  <th className="p-3.5">رقم الهاتف</th>
                  <th className="p-3.5">النوع / الدور</th>
                  <th className="p-3.5">الحالة</th>
                  <th className="p-3.5 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {users.map((u) => {
                  const isActive = u.isActive ?? u.is_active;
                  const isAdmin = u.isCompanyAdmin ?? u.is_company_admin;
                  const name = u.fullName || u.full_name;
                  return (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-bold text-white flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-xl bg-emerald-950/80 text-emerald-400 font-bold flex items-center justify-center text-xs border border-emerald-800/50 shrink-0">
                          {name ? name.charAt(0) : 'U'}
                        </div>
                        <span>{name}</span>
                      </td>
                      <td className="p-3.5 font-mono text-slate-400">{u.email}</td>
                      <td className="p-3.5 font-mono text-slate-400">{u.phone || '—'}</td>
                      <td className="p-3.5">
                        {isAdmin ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-bold text-[10px]">
                            مدير المؤسسة
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700/60 font-medium text-[10px]">
                            مستخدم عادي
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 text-emerald-300 bg-emerald-950 text-[10px] border border-emerald-800/60 px-2 py-0.5 rounded-full font-semibold">
                            <CheckCircle className="w-3 h-3 text-emerald-400" />
                            <span>نشط</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-300 bg-red-950 text-[10px] border border-red-800/60 px-2 py-0.5 rounded-full font-semibold">
                            <XCircle className="w-3 h-3 text-red-400" />
                            <span>معطل</span>
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setIsRoleModalOpen(true);
                            }}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[11px] border border-slate-700 font-medium transition-colors"
                          >
                            تعديل الصلاحيات
                          </button>
                          <button
                            onClick={() => handleToggleUser(u.id, Boolean(isActive))}
                            className={`px-2.5 py-1 rounded-lg text-[11px] border font-medium transition-colors ${
                              isActive
                                ? 'bg-red-950/60 hover:bg-red-900/60 text-red-300 border-red-800/60'
                                : 'bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border-emerald-800/60'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150" dir="rtl">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="font-bold text-white text-base">إضافة مستخدم جديد لمؤسستك</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">الاسم الكامل *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">البريد الإلكتروني *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">كلمة المرور *</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">رقم الهاتف</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isAdminCheck"
                  checked={isCompanyAdmin}
                  onChange={(e) => setIsCompanyAdmin(e.target.checked)}
                  className="accent-emerald-600 w-4 h-4 rounded"
                />
                <label htmlFor="isAdminCheck" className="text-xs text-slate-300 cursor-pointer">
                  منح صلاحيات مدير الشركة الكاملة
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/60 border border-emerald-500/40 transition-all active:scale-95"
              >
                تأكيد إضافة المستخدم
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Assign Roles Modal */}
      {isRoleModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150" dir="rtl">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="font-bold text-white text-base">تعديل أدوار المستخدم</h3>
              <button onClick={() => setIsRoleModalOpen(false)} className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 mb-6">
              <p className="text-xs text-slate-300">حدد الأدوار التي ترغب بتحديدها للمستخدم ({selectedUser.fullName}):</p>
              {roles.map((r) => (
                <label key={r.id} className="flex items-center gap-3 p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-xs cursor-pointer hover:border-emerald-800/60 transition-colors">
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
                    className="accent-emerald-600 w-4 h-4 rounded"
                  />
                  <div>
                    <div className="font-bold text-white">{r.name}</div>
                    <div className="text-[11px] text-slate-400">{r.description || 'لا يوجد وصف'}</div>
                  </div>
                </label>
              ))}
            </div>

            <button
              onClick={handleSaveUserRoles}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/60 border border-emerald-500/40 transition-all active:scale-95"
            >
              حفظ تغييرات الأدوار
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
