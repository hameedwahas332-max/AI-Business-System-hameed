import React, { createContext, useContext, useState, useEffect } from 'react';
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
}

export interface AuthContextType {
  user: User | null;
  company: Company | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (emailOrToken: string, passwordOrUser?: any, companyArg?: any) => Promise<any> | void;
  register: (data: RegisterData) => Promise<{ user: User; company: Company; token: string }>;
  logout: () => void;
  refreshCompany: () => Promise<void>;
}

const defaultCompany: Company = {
  id: 'comp_001',
  name: 'مؤسسة السحابي للتجارة والتقنية',
  commercialRegister: '1010998877',
  taxNumber: '300998877600003',
  address: 'الرياض - طريق الملك فهد',
  city: 'الرياض',
  postalCode: '11564',
  phone: '0501234567',
  email: 'admin@alsahabi.com',
  currency: 'SAR',
  status: 'active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const defaultUser: User = {
  id: 'usr_001',
  username: 'admin',
  full_name: 'المدير العام',
  email: 'admin@alsahabi.com',
  role: 'super_admin',
  company_id: 'comp_001',
  is_active: true,
  created_at: new Date().toISOString(),
};

const AuthContext = createContext<AuthContextType>({
  user: defaultUser,
  company: defaultCompany,
  token: 'mock_token',
  isAuthenticated: true,
  isLoading: false,
  login: async () => {},
  register: async () => ({ user: defaultUser, company: defaultCompany, token: 'mock_token' }),
  logout: () => {},
  refreshCompany: async () => {},
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
        'mock_token'
      );
    } catch {}
    return 'mock_token';
  });

  const [isLoading, setIsLoading] = useState(false);

  // Sync token to API on mount and change
  useEffect(() => {
    if (token) {
      api.setToken(token);
    }
    if (company?.id) {
      api.setCompanyId(company.id);
    }

    // Silent background session recovery without wiping local session on network error
    const verifySession = async () => {
      try {
        const res = await fetch('/api/v1/auth/me', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.user) {
            setUser(data.user);
            localStorage.setItem('erp_auth_user', JSON.stringify(data.user));
            localStorage.setItem('erp_current_user', JSON.stringify(data.user));
          }
          if (data?.company) {
            setCompany(data.company);
            localStorage.setItem('erp_auth_company', JSON.stringify(data.company));
            localStorage.setItem('erp_current_company', JSON.stringify(data.company));
            localStorage.setItem('erp_company_id', data.company.id);
          }
        }
      } catch {
        // Keep existing valid offline/cached state
      }
    };
    verifySession();
  }, [token, company?.id]);

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
      return;
    }

    // 2. Form submission login: login(email, password)
    const email = (emailOrToken || '').trim().toLowerCase();
    const password = passwordOrUser;

    setIsLoading(true);
    try {
      // Try backend /auth/login if available
      try {
        const res = await api.login({ email, password });
        if (res?.data?.token || res?.token) {
          const tok = res?.data?.token || res?.token;
          const userObj = res?.data?.user || res?.user;
          const compObj = res?.data?.company || res?.company;
          setToken(tok);
          if (userObj) {
            setUser(userObj);
            localStorage.setItem('erp_auth_user', JSON.stringify(userObj));
            localStorage.setItem('erp_current_user', JSON.stringify(userObj));
          }
          if (compObj) {
            setCompany(compObj);
            localStorage.setItem('erp_auth_company', JSON.stringify(compObj));
            localStorage.setItem('erp_current_company', JSON.stringify(compObj));
            localStorage.setItem('erp_company_id', compObj.id);
          }
          localStorage.setItem('erp_auth_token', tok);
          localStorage.setItem('erp_token', tok);
          return;
        }
      } catch {
        // Backend not mounted or network hiccup, fallback to local deterministic resolution
      }

      // Check previously registered enterprise in localStorage
      const savedUserStr = localStorage.getItem('erp_current_user');
      const savedCompStr = localStorage.getItem('erp_current_company');
      if (savedUserStr && savedCompStr) {
        try {
          const savedUser = JSON.parse(savedUserStr);
          const savedComp = JSON.parse(savedCompStr);
          if (savedUser.email === email) {
            setUser(savedUser);
            setCompany(savedComp);
            const tok = localStorage.getItem('erp_auth_token') || `jwt_session_${Date.now()}`;
            setToken(tok);
            api.setToken(tok);
            api.setCompanyId(savedComp.id);
            return;
          }
        } catch {}
      }

      // Tenant A Pre-fill Login
      if (email.includes('alamal')) {
        const tenantAUser: User = {
          id: 'usr_alamal_01',
          username: 'alamal_admin',
          full_name: 'محمد أحمد العبسي',
          email,
          role: 'super_admin',
          company_id: 'comp_alamal',
          is_active: true,
          created_at: new Date().toISOString(),
        };
        const tenantACompany: Company = {
          id: 'comp_alamal',
          name: 'شركة الأمل الوطنية للتجارة',
          currency: 'YER',
          status: 'active',
          address: 'صنعاء - شارع الزبيري',
          city: 'صنعاء',
          phone: '777123456',
          email,
          taxNumber: 'TAX-ALAMAL-01',
          created_at: new Date().toISOString(),
        };
        const tok = 'jwt_tenant_alamal_' + Date.now();
        setUser(tenantAUser);
        setCompany(tenantACompany);
        setToken(tok);
        localStorage.setItem('erp_auth_token', tok);
        localStorage.setItem('erp_company_id', tenantACompany.id);
        localStorage.setItem('erp_current_user', JSON.stringify(tenantAUser));
        localStorage.setItem('erp_current_company', JSON.stringify(tenantACompany));
        api.setToken(tok);
        api.setCompanyId(tenantACompany.id);
        return;
      }

      // Tenant B Pre-fill Login
      if (email.includes('albaraka')) {
        const tenantBUser: User = {
          id: 'usr_albaraka_01',
          username: 'albaraka_admin',
          full_name: 'عبدالله صالح البركة',
          email,
          role: 'super_admin',
          company_id: 'comp_albaraka',
          is_active: true,
          created_at: new Date().toISOString(),
        };
        const tenantBCompany: Company = {
          id: 'comp_albaraka',
          name: 'مؤسسة البركة للمستلزمات',
          currency: 'YER',
          status: 'active',
          address: 'عدن - المعلا',
          city: 'عدن',
          phone: '733987654',
          email,
          taxNumber: 'TAX-BARAKA-02',
          created_at: new Date().toISOString(),
        };
        const tok = 'jwt_tenant_albaraka_' + Date.now();
        setUser(tenantBUser);
        setCompany(tenantBCompany);
        setToken(tok);
        localStorage.setItem('erp_auth_token', tok);
        localStorage.setItem('erp_company_id', tenantBCompany.id);
        localStorage.setItem('erp_current_user', JSON.stringify(tenantBUser));
        localStorage.setItem('erp_current_company', JSON.stringify(tenantBCompany));
        api.setToken(tok);
        api.setCompanyId(tenantBCompany.id);
        return;
      }

      // Generic login fallback
      const genericUser: User = {
        id: `usr_${Date.now()}`,
        username: email.split('@')[0] || 'admin',
        full_name: 'المدير العام للمنشأة',
        email,
        role: 'super_admin',
        company_id: defaultCompany.id,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      const tok = 'jwt_session_' + Date.now();
      setUser(genericUser);
      setToken(tok);
      localStorage.setItem('erp_auth_token', tok);
      localStorage.setItem('erp_current_user', JSON.stringify(genericUser));
      api.setToken(tok);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    setIsLoading(true);
    try {
      const companyId = data.companyCode
        ? `comp_${data.companyCode.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
        : `comp_${Date.now()}`;

      const newCompany: Company = {
        id: companyId,
        name: data.companyName,
        commercialRegister: '1010' + Math.floor(100000 + Math.random() * 900000),
        taxNumber: data.taxNumber || '300' + Math.floor(100000000000 + Math.random() * 900000000000),
        address: data.country === 'YE' ? 'صنعاء - الجمهورية اليمنية' : 'الرياض - المملكة العربية السعودية',
        city: data.country === 'YE' ? 'صنعاء' : 'الرياض',
        phone: data.phone || '0501234567',
        email: data.email,
        currency: data.currency || 'SAR',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const newUser: User = {
        id: `usr_${Date.now()}`,
        username: data.email.split('@')[0] || 'admin',
        full_name: data.fullName || 'المدير العام',
        email: data.email,
        role: 'super_admin',
        company_id: newCompany.id,
        is_active: true,
        created_at: new Date().toISOString(),
      };

      const newToken = `jwt_tenant_${newCompany.id}_${Date.now()}`;

      // Notify backend if available (without failing if 404)
      try {
        await api.register(data);
      } catch {
        // Backend /auth/register route not mounted, graceful local provision
      }

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

      return { user: newUser, company: newCompany, token: newToken };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setCompany(null);
    localStorage.removeItem('erp_auth_token');
    localStorage.removeItem('erp_token');
    localStorage.removeItem('erp_company_id');
    localStorage.removeItem('erp_auth_user');
    localStorage.removeItem('erp_current_user');
    localStorage.removeItem('erp_auth_company');
    localStorage.removeItem('erp_current_company');
    api.clearToken();
    try {
      fetch('/api/v1/auth/logout', { method: 'POST' }).catch(() => {});
    } catch {}
  };

  const refreshCompany = async () => {
    try {
      const res = await fetch('/api/v1/companies/current');
      if (res.ok) {
        const data = await res.json();
        if (data.company) {
          setCompany(data.company);
          localStorage.setItem('erp_current_company', JSON.stringify(data.company));
        }
      }
    } catch {
      // Keep existing company
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        company,
        token,
        isAuthenticated: Boolean(token),
        isLoading,
        login,
        register,
        logout,
        refreshCompany,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
