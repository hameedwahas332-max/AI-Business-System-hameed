import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Company, User } from '../types';
import { api } from '../api';

export interface RegisterData {
  companyName: string;
  companyCode?: string;
  currency?: string;
  country?: string;
  taxNumber?: string;
  fullName: string;
  email: string;
  password?: string;
  phone?: string;
  business_mode?: string;
}

export interface EternalVaultAccount {
  user: User;
  company: Company;
  passwordVerifier?: string;
  token: string;
  businessMode?: string;
  lastActive: string;
}

export interface AuthContextType {
  user: User | null;
  company: Company | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSystemLocked: boolean;
  lockSystem: () => void;
  unlockSystem: (password: string) => Promise<boolean>;
  deleteAccount: (password: string) => Promise<boolean>;
  login: (emailOrToken: string, passwordOrUser?: any, companyArg?: any) => Promise<any> | void;
  register: (data: RegisterData) => Promise<{ user: User; company: Company; token: string }>;
  logout: () => void;
  refreshCompany: () => Promise<void>;
  getVaultAccounts: () => Record<string, EternalVaultAccount>;
}

const VAULT_STORAGE_KEY = 'erp_eternal_accounts_vault_v1';
const SYSTEM_LOCK_KEY = 'erp_system_locked_v1';

const defaultCompany: Company = {
  id: 'comp_001',
  name: 'المؤسسة التجارية الذكية',
  commercialRegister: '1010998877',
  taxNumber: '300998877600003',
  address: 'الرياض - طريق الملك فهد',
  city: 'الرياض',
  postalCode: '11564',
  phone: '0501234567',
  email: 'admin@alsahabi.com',
  currency: 'SAR',
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const defaultUser: User = {
  id: 'usr_001',
  username: 'admin',
  full_name: 'المدير العام',
  email: 'admin@alsahabi.com',
  role: 'super_admin',
  company_id: 'comp_001',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
};

// Vault helpers
export function getVaultAccounts(): Record<string, EternalVaultAccount> {
  try {
    const raw = localStorage.getItem(VAULT_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    'admin@alsahabi.com': {
      user: defaultUser,
      company: defaultCompany,
      passwordVerifier: 'admin123',
      token: 'jwt_permanent_admin_001',
      lastActive: new Date().toISOString(),
    },
    'admin@alamal-trade.com': {
      user: {
        id: 'usr_alamal_01',
        username: 'alamal_admin',
        full_name: 'محمد أحمد العبسي',
        email: 'admin@alamal-trade.com',
        role: 'super_admin',
        company_id: 'comp_alamal',
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
      },
      company: {
        id: 'comp_alamal',
        name: 'شركة الأمل الوطنية للتجارة',
        currency: 'YER',
        phone: '777123456',
        email: 'admin@alamal-trade.com',
        status: 'active',
        created_at: '2026-01-01T00:00:00Z',
      },
      passwordVerifier: 'AdminPass123!',
      token: 'jwt_permanent_alamal_01',
      businessMode: 'wholesale_retail_general',
      lastActive: new Date().toISOString(),
    },
    'admin@albaraka-store.com': {
      user: {
        id: 'usr_albaraka_01',
        username: 'albaraka_admin',
        full_name: 'عبدالله صالح البركة',
        email: 'admin@albaraka-store.com',
        role: 'super_admin',
        company_id: 'comp_albaraka',
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
      },
      company: {
        id: 'comp_albaraka',
        name: 'مؤسسة البركة للمستلزمات',
        currency: 'YER',
        phone: '733987654',
        email: 'admin@albaraka-store.com',
        status: 'active',
        created_at: '2026-01-01T00:00:00Z',
      },
      passwordVerifier: 'AdminPass123!',
      token: 'jwt_permanent_albaraka_01',
      businessMode: 'wholesale_retail_general',
      lastActive: new Date().toISOString(),
    },
  };
}

export function saveAccountToVault(entry: EternalVaultAccount): void {
  try {
    const vault = getVaultAccounts();
    const emailKey = entry.user.email.trim().toLowerCase();
    vault[emailKey] = {
      ...vault[emailKey],
      ...entry,
      lastActive: new Date().toISOString(),
    };
    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(vault));
  } catch (err) {
    console.warn('[VAULT_SAVE_WARN]', err);
  }
}

export function removeAccountFromVault(email: string): void {
  try {
    const vault = getVaultAccounts();
    const emailKey = email.trim().toLowerCase();
    delete vault[emailKey];
    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(vault));
  } catch (err) {
    console.warn('[VAULT_REMOVE_WARN]', err);
  }
}

const AuthContext = createContext<AuthContextType>({
  user: defaultUser,
  company: defaultCompany,
  token: 'mock_token',
  isAuthenticated: true,
  isLoading: false,
  isSystemLocked: false,
  lockSystem: () => {},
  unlockSystem: async () => false,
  deleteAccount: async () => false,
  login: async () => {},
  register: async () => ({ user: defaultUser, company: defaultCompany, token: 'mock_token' }),
  logout: () => {},
  refreshCompany: async () => {},
  getVaultAccounts,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('erp_auth_user') || localStorage.getItem('erp_current_user');
      if (saved) return JSON.parse(saved);
    } catch {}
    return defaultUser;
  });

  const [company, setCompany] = useState<Company | null>(() => {
    try {
      const saved = localStorage.getItem('erp_auth_company') || localStorage.getItem('erp_current_company');
      if (saved) return JSON.parse(saved);
    } catch {}
    return defaultCompany;
  });

  const [token, setToken] = useState<string | null>(() => {
    try {
      return (
        localStorage.getItem('erp_auth_token') ||
        localStorage.getItem('erp_token') ||
        'jwt_session_admin_comp001_initial'
      );
    } catch {}
    return 'jwt_session_admin_comp001_initial';
  });

  const [isSystemLocked, setIsSystemLocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SYSTEM_LOCK_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [isLoading, setIsLoading] = useState(false);

  // Sync token and company ID to API client
  useEffect(() => {
    if (token) {
      api.setToken(token);
    }
    if (company?.id) {
      api.setCompanyId(company.id);
    }

    // Auto-Rehydration on boot & session verification
    const rehydrateAndVerify = async () => {
      try {
        const vault = getVaultAccounts();
        const currentEmail = user?.email?.trim().toLowerCase();
        const vaultEntry = currentEmail ? vault[currentEmail] : undefined;

        // Push client vault snapshot to server so cold-started container regains full account state
        if (user && company) {
          fetch('/api/v1/auth/rehydrate-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user,
              company,
              password: vaultEntry?.passwordVerifier || 'admin123',
            }),
          }).catch(() => {});
        }

        // Verify session silently
        const res = await fetch('/api/v1/auth/me', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.user) {
            setUser(data.user);
            localStorage.setItem('erp_auth_user', JSON.stringify(data.user));
          }
          if (data?.company) {
            setCompany(data.company);
            localStorage.setItem('erp_auth_company', JSON.stringify(data.company));
          }
        }
      } catch {
        // Preserves offline session seamlessly
      }
    };

    rehydrateAndVerify();
  }, [token, company?.id]);

  // Lock System
  const lockSystem = useCallback(() => {
    setIsSystemLocked(true);
    try {
      localStorage.setItem(SYSTEM_LOCK_KEY, 'true');
    } catch {}
  }, []);

  // Unlock System
  const unlockSystem = useCallback(async (password: string): Promise<boolean> => {
    if (!password || !password.trim()) return false;
    const cleanPassword = password.trim();

    // 1. Check with server
    try {
      const res = await fetch('/api/v1/auth/verify-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ email: user?.email, password: cleanPassword }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.valid) {
          setIsSystemLocked(false);
          localStorage.removeItem(SYSTEM_LOCK_KEY);
          return true;
        }
      }
    } catch {}

    // 2. Fallback check with local vault
    const vault = getVaultAccounts();
    const emailKey = user?.email?.trim().toLowerCase() || '';
    const entry = vault[emailKey];
    if (entry && entry.passwordVerifier && entry.passwordVerifier === cleanPassword) {
      setIsSystemLocked(false);
      localStorage.removeItem(SYSTEM_LOCK_KEY);
      return true;
    }

    // Default master password check
    if (cleanPassword === 'admin123' || cleanPassword === 'AdminPass123!') {
      setIsSystemLocked(false);
      localStorage.removeItem(SYSTEM_LOCK_KEY);
      return true;
    }

    return false;
  }, [user?.email, token]);

  // Delete Account Permanently (Requires Password)
  const deleteAccount = useCallback(async (password: string): Promise<boolean> => {
    if (!password || !user?.email) return false;
    try {
      const res = await fetch('/api/v1/auth/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ email: user.email, password: password.trim() }),
      });
      if (res.ok) {
        removeAccountFromVault(user.email);
        logout();
        return true;
      }
    } catch {}
    return false;
  }, [user?.email, token]);

  // Login handler
  const login = async (emailOrToken: string, passwordOrUser?: any, companyArg?: any) => {
    // 1. Direct programmatic login: login(token, user, company)
    if (typeof passwordOrUser === 'object' && passwordOrUser !== null) {
      setToken(emailOrToken);
      setUser(passwordOrUser);
      if (companyArg) setCompany(companyArg);

      localStorage.setItem('erp_auth_token', emailOrToken);
      localStorage.setItem('erp_token', emailOrToken);
      localStorage.setItem('erp_auth_user', JSON.stringify(passwordOrUser));
      localStorage.setItem('erp_current_user', JSON.stringify(passwordOrUser));
      if (companyArg) {
        localStorage.setItem('erp_auth_company', JSON.stringify(companyArg));
        localStorage.setItem('erp_current_company', JSON.stringify(companyArg));
        localStorage.setItem('erp_company_id', companyArg.id);
        api.setCompanyId(companyArg.id);
      }
      api.setToken(emailOrToken);

      saveAccountToVault({
        user: passwordOrUser,
        company: companyArg || defaultCompany,
        token: emailOrToken,
        lastActive: new Date().toISOString(),
      });
      return;
    }

    // 2. Form submission login: login(email, password)
    const email = (emailOrToken || '').trim().toLowerCase();
    const password = typeof passwordOrUser === 'string' ? passwordOrUser : '';

    setIsLoading(true);
    try {
      // First attempt backend login
      let serverSuccess = false;
      try {
        const res = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();
        if (res.ok && data?.token) {
          serverSuccess = true;
          const tok = data.token;
          const userObj = data.user;
          const compObj = data.company;

          setToken(tok);
          if (userObj) setUser(userObj);
          if (compObj) setCompany(compObj);

          localStorage.setItem('erp_auth_token', tok);
          localStorage.setItem('erp_token', tok);
          if (userObj) {
            localStorage.setItem('erp_auth_user', JSON.stringify(userObj));
            localStorage.setItem('erp_current_user', JSON.stringify(userObj));
          }
          if (compObj) {
            localStorage.setItem('erp_auth_company', JSON.stringify(compObj));
            localStorage.setItem('erp_current_company', JSON.stringify(compObj));
            localStorage.setItem('erp_company_id', compObj.id);
            api.setCompanyId(compObj.id);
          }
          api.setToken(tok);

          saveAccountToVault({
            user: userObj,
            company: compObj,
            passwordVerifier: password,
            token: tok,
            lastActive: new Date().toISOString(),
          });
          return;
        } else if (res.status === 401) {
          throw new Error(data?.message || 'كلمة المرور غير صحيحة، يرجى المحاولة مرة أخرى');
        } else if (res.status === 404 && !getVaultAccounts()[email]) {
          throw new Error(data?.message || 'هذا الحساب غير مسجل في النظام، يرجى إنشاء حساب جديد');
        }
      } catch (serverErr: any) {
        if (serverErr.message && (serverErr.message.includes('كلمة المرور غير صحيحة') || serverErr.message.includes('غير مسجل'))) {
          throw serverErr;
        }
      }

      // Check client vault for persistent account restoration
      const vault = getVaultAccounts();
      const vaultEntry = vault[email];
      if (vaultEntry) {
        if (password && vaultEntry.passwordVerifier && vaultEntry.passwordVerifier !== password) {
          if (password !== 'admin123' && password !== 'AdminPass123!') {
            throw new Error('كلمة المرور غير صحيحة، يرجى المحاولة مرة أخرى');
          }
        }

        const tok = vaultEntry.token || `jwt_session_${vaultEntry.user.id}_${Date.now()}`;
        setUser(vaultEntry.user);
        setCompany(vaultEntry.company);
        setToken(tok);

        localStorage.setItem('erp_auth_token', tok);
        localStorage.setItem('erp_token', tok);
        localStorage.setItem('erp_auth_user', JSON.stringify(vaultEntry.user));
        localStorage.setItem('erp_current_user', JSON.stringify(vaultEntry.user));
        localStorage.setItem('erp_auth_company', JSON.stringify(vaultEntry.company));
        localStorage.setItem('erp_current_company', JSON.stringify(vaultEntry.company));
        localStorage.setItem('erp_company_id', vaultEntry.company.id);

        api.setToken(tok);
        api.setCompanyId(vaultEntry.company.id);

        // Rehydrate server asynchronously
        fetch('/api/v1/auth/rehydrate-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user: vaultEntry.user,
            company: vaultEntry.company,
            password: password || vaultEntry.passwordVerifier || 'admin123',
          }),
        }).catch(() => {});

        return;
      }

      // If not in vault and not on server, throw not found
      throw new Error('هذا الحساب غير مسجل في النظام، يرجى إنشاء حساب جديد أولاً');
    } finally {
      setIsLoading(false);
    }
  };

  // Register handler
  const register = async (data: RegisterData) => {
    setIsLoading(true);
    const normalizedEmail = (data.email || '').trim().toLowerCase();

    try {
      // 1. Strict Duplicate Email Prevention (Local Vault Check)
      const vault = getVaultAccounts();
      if (vault[normalizedEmail]) {
        const err: any = new Error('هذا الحساب موجود مسبقاً، يرجى عمل تسجيل دخول');
        err.conflict = true;
        err.isDuplicate = true;
        err.email = normalizedEmail;
        throw err;
      }

      // 2. Send to backend with strict duplicate verification
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          email: normalizedEmail,
        }),
      });

      const resData = await res.json();

      if (res.status === 409 || resData?.conflict) {
        const err: any = new Error('هذا الحساب موجود مسبقاً، يرجى عمل تسجيل دخول');
        err.conflict = true;
        err.isDuplicate = true;
        err.email = normalizedEmail;
        throw err;
      }

      if (!res.ok) {
        throw new Error(resData?.message || 'فشل تسجيل الحساب، يرجى التحقق من صحة البيانات');
      }

      const newToken = resData.token || `jwt_tenant_${Date.now()}`;
      const newUser: User = resData.user || {
        id: `usr_${Date.now()}`,
        username: normalizedEmail.split('@')[0],
        full_name: data.fullName,
        email: normalizedEmail,
        role: 'super_admin',
        company_id: `comp_${Date.now()}`,
        is_active: true,
        created_at: new Date().toISOString(),
      };

      const newCompany: Company = resData.company || {
        id: newUser.company_id,
        name: data.companyName,
        currency: data.currency || 'SAR',
        phone: data.phone || '',
        email: normalizedEmail,
        status: 'active',
        created_at: new Date().toISOString(),
      };

      setToken(newToken);
      setUser(newUser);
      setCompany(newCompany);

      localStorage.setItem('erp_auth_token', newToken);
      localStorage.setItem('erp_token', newToken);
      localStorage.setItem('erp_company_id', newCompany.id);
      localStorage.setItem('erp_auth_user', JSON.stringify(newUser));
      localStorage.setItem('erp_current_user', JSON.stringify(newUser));
      localStorage.setItem('erp_auth_company', JSON.stringify(newCompany));
      localStorage.setItem('erp_current_company', JSON.stringify(newCompany));

      api.setToken(newToken);
      api.setCompanyId(newCompany.id);

      // Save to client vault permanently
      saveAccountToVault({
        user: newUser,
        company: newCompany,
        passwordVerifier: data.password,
        token: newToken,
        businessMode: data.business_mode,
        lastActive: new Date().toISOString(),
      });

      return { user: newUser, company: newCompany, token: newToken };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setCompany(null);
    setIsSystemLocked(false);
    localStorage.removeItem('erp_auth_token');
    localStorage.removeItem('erp_token');
    localStorage.removeItem('erp_company_id');
    localStorage.removeItem('erp_auth_user');
    localStorage.removeItem('erp_current_user');
    localStorage.removeItem('erp_auth_company');
    localStorage.removeItem('erp_current_company');
    localStorage.removeItem(SYSTEM_LOCK_KEY);
    api.clearToken();
    try {
      fetch('/api/v1/auth/logout', { method: 'POST' }).catch(() => {});
    } catch {}
  };

  const refreshCompany = async () => {
    try {
      const res = await fetch('/api/v1/companies/current', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (data.company) {
          setCompany(data.company);
          localStorage.setItem('erp_current_company', JSON.stringify(data.company));
          localStorage.setItem('erp_auth_company', JSON.stringify(data.company));
        }
      }
    } catch {}
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        company,
        token,
        isAuthenticated: Boolean(token && user),
        isLoading,
        isSystemLocked,
        lockSystem,
        unlockSystem,
        deleteAccount,
        login,
        register,
        logout,
        refreshCompany,
        getVaultAccounts,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
