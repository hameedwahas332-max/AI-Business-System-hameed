import { APIResponse, AuthResponse, Company, User, Role, Permission, AuditLog } from '../types';

const API_BASE_URL = '/api/v1';

class APIClient {
  private token: string | null = null;
  private companyId: string | null = null;

  constructor() {
    this.token = this.resolveStoredToken();
    this.companyId = this.resolveStoredCompanyId();
  }

  private resolveStoredToken(): string | null {
    try {
      const candidate =
        localStorage.getItem('ai_biz_jwt_token') ||
        localStorage.getItem('token') ||
        localStorage.getItem('saas_auth_token') ||
        null;
      if (!candidate || candidate === 'undefined' || candidate === 'null' || !candidate.trim()) {
        return null;
      }
      return candidate.trim();
    } catch {
      return null;
    }
  }

  private resolveStoredCompanyId(): string | null {
    try {
      const candidate =
        localStorage.getItem('ai_biz_company_id') ||
        localStorage.getItem('company_id') ||
        null;
      if (!candidate || candidate === 'undefined' || candidate === 'null' || !candidate.trim()) {
        return null;
      }
      return candidate.trim();
    } catch {
      return null;
    }
  }

  public setToken(token: string | null): void {
    this.token = token;
    try {
      if (token) {
        localStorage.setItem('ai_biz_jwt_token', token);
        localStorage.setItem('token', token);
        localStorage.setItem('saas_auth_token', token);
      } else {
        localStorage.removeItem('ai_biz_jwt_token');
        localStorage.removeItem('token');
        localStorage.removeItem('saas_auth_token');
      }
    } catch (e) {
      console.warn('Could not persist token to localStorage', e);
    }
  }

  public setCompanyId(companyId: string | null): void {
    this.companyId = companyId;
    try {
      if (companyId) {
        localStorage.setItem('ai_biz_company_id', companyId);
        localStorage.setItem('company_id', companyId);
      } else {
        localStorage.removeItem('ai_biz_company_id');
        localStorage.removeItem('company_id');
      }
    } catch (e) {
      console.warn('Could not persist companyId to localStorage', e);
    }
  }

  public getToken(): string | null {
    if (!this.token) {
      this.token = this.resolveStoredToken();
    }
    return this.token;
  }

  public getCompanyId(): string | null {
    if (!this.companyId) {
      this.companyId = this.resolveStoredCompanyId();
    }
    return this.companyId;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    const token = this.getToken();
    const companyId = this.getCompanyId();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (companyId) {
      headers['X-Company-ID'] = companyId;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      let response: Response;
      try {
        response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      } catch (fetchErr: any) {
        // Retry once after a brief pause in case of a transient connection hiccup or server reload
        await new Promise((resolve) => setTimeout(resolve, 350));
        try {
          response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        } catch {
          throw new Error('تعذر الاتصال بالخادم، يرجى التحقق من الاتصال والمحاولة مرة أخرى');
        }
      }
      let data: any = null;
      try {
        const text = await response.text();
        if (text && (text.trim().startsWith('{') || text.trim().startsWith('['))) {
          data = JSON.parse(text);
        }
      } catch {
        data = null;
      }

      if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/session-restore')) {
        try {
          let parsedUser = null;
          let parsedCompany = null;
          const sessionRaw = localStorage.getItem('erp_active_session_v1');
          if (sessionRaw) {
            try {
              const s = JSON.parse(sessionRaw);
              parsedUser = s?.user;
              parsedCompany = s?.company;
            } catch {}
          }
          if (!parsedUser) {
            const userRaw = localStorage.getItem('erp_user') || localStorage.getItem('erp_auth_user');
            if (userRaw) {
              try { parsedUser = JSON.parse(userRaw); } catch {}
            }
          }
          if (!parsedCompany) {
            const compRaw = localStorage.getItem('erp_auth_company') || localStorage.getItem('erp_current_company');
            if (compRaw) {
              try { parsedCompany = JSON.parse(compRaw); } catch {}
            }
          }

          if (parsedUser) {
            const restoreRes = await fetch(`${API_BASE_URL}/auth/session-restore`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({
                token: token || this.getToken(),
                user: parsedUser,
                company: parsedCompany,
              }),
            });

            if (restoreRes.ok) {
              const restoreData = await restoreRes.json();
              const newToken = restoreData?.token || restoreData?.data?.token;
              if (newToken) {
                this.setToken(newToken);
                headers['Authorization'] = `Bearer ${newToken}`;
                const retryRes = await fetch(`${API_BASE_URL}${endpoint}`, { ...config, headers });
                if (retryRes.ok) {
                  const retryText = await retryRes.text();
                  if (retryText && (retryText.trim().startsWith('{') || retryText.trim().startsWith('['))) {
                    const retryJson = JSON.parse(retryText);
                    return (typeof retryJson === 'object' && ('data' in retryJson || 'success' in retryJson)) ? retryJson : { success: true, data: retryJson };
                  }
                }
              }
            }
          }
        } catch {
          // Never wipe active credentials on transient glitches
        }
      }

      if (!response.ok) {
        // Extract the exact error message safely without leaking secrets or falling back to generic network errors
        let serverErrorMessage = '';

        if (typeof data?.error === 'string' && data.error.trim()) {
          serverErrorMessage = data.error.trim();
        } else if (data?.error && typeof data.error === 'object') {
          if (typeof data.error.message === 'string' && data.error.message.trim()) {
            serverErrorMessage = data.error.message.trim();
          } else if (typeof data.error.msg === 'string' && data.error.msg.trim()) {
            serverErrorMessage = data.error.msg.trim();
          } else if (Array.isArray(data.error.errors) && data.error.errors.length > 0) {
            const first = data.error.errors[0];
            serverErrorMessage = typeof first === 'string' ? first : (first?.message || '');
          }
        }

        if (!serverErrorMessage && typeof data?.message === 'string' && data.message.trim()) {
          serverErrorMessage = data.message.trim();
        }

        if (!serverErrorMessage && typeof data?.msg === 'string' && data.msg.trim()) {
          serverErrorMessage = data.msg.trim();
        }

        if (!serverErrorMessage && typeof data?.detail === 'string' && data.detail.trim()) {
          serverErrorMessage = data.detail.trim();
        }

        if (!serverErrorMessage && Array.isArray(data?.errors) && data.errors.length > 0) {
          const first = data.errors[0];
          serverErrorMessage = typeof first === 'string' ? first : (first?.message || '');
        }

        if (!serverErrorMessage) {
          if (response.status === 400) {
            serverErrorMessage = 'البيانات المدخلة غير صالحة، يرجى مراجعة الحقول المطلوبة والمحاولة مرة أخرى';
          } else if (response.status === 401) {
            serverErrorMessage = 'بيانات الدخول غير صحيحة أو انتهت صلاحية الجلسة';
          } else if (response.status === 403) {
            serverErrorMessage = 'ليس لديك الصلاحية لتنفيذ هذه العملية';
          } else if (response.status === 404) {
            serverErrorMessage = 'المورد المطلوب غير موجود';
          } else if (response.status === 409) {
            serverErrorMessage = 'يوجد تعارض مع بيانات مسجلة مسبقاً';
          } else if (response.status >= 500) {
            serverErrorMessage = 'حدث خطأ داخلي في الخادم، يرجى المحاولة لاحقاً';
          } else {
            serverErrorMessage = response.statusText || 'حدث خطأ أثناء معالجة الطلب';
          }
        }
        
        const error: any = new Error(serverErrorMessage);
        error.status = response.status;
        error.code = data?.error?.code || data?.code || (response.status === 400 ? 'VALIDATION_ERROR' : 'API_ERROR');
        error.details = data?.details || data?.errors || null;
        throw error;
      }

      if (data === null || data === undefined) {
        return {
          success: true,
          data: null as unknown as T,
        };
      }

      if (typeof data === 'object' && ('data' in data || 'success' in data)) {
        return data as APIResponse<T>;
      }

      return {
        success: true,
        data: data as T,
      };
    } catch (err: any) {
      throw err;
    }
  }

  async requestFile(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ blob: Blob; filename: string; contentType: string }> {
    const token = this.getToken();
    const companyId = this.getCompanyId();

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (companyId) {
      headers['X-Company-ID'] = companyId;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    } catch (fetchErr: any) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      try {
        response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      } catch {
        throw new Error('تعذر تحميل الملف من الخادم، يرجى التحقق من الاتصال والمحاولة مرة أخرى');
      }
    }

    if (!response.ok) {
      let serverErrorMessage = `HTTP ${response.status}`;
      try {
        const text = await response.text();
        if (text) {
          try {
            const json = JSON.parse(text);
            serverErrorMessage = json?.error?.message || json?.message || json?.msg || text;
          } catch {
            serverErrorMessage = text;
          }
        }
      } catch {
        // ignore
      }
      throw new Error(serverErrorMessage);
    }

    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition') || '';
    let filename = '';
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) filename = match[1].trim();
    }
    const contentType = response.headers.get('Content-Type') || '';

    return { blob, filename, contentType };
  }

  triggerDownload(blob: Blob, defaultFilename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  openPrintWindow(blob: Blob, contentType = 'text/html'): void {
    const blobUrl = window.URL.createObjectURL(new Blob([blob], { type: contentType }));
    const printWindow = window.open(blobUrl, '_blank');
    if (printWindow) {
      printWindow.focus();
    }
  }

  // Auth Endpoints
  async register(body: any): Promise<APIResponse<AuthResponse>> {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async login(body: any): Promise<APIResponse<AuthResponse>> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async getMe(): Promise<APIResponse<{ user: User; tenantId: string }>> {
    return this.request('/auth/me');
  }

  // Company Tenant Endpoints
  async getCurrentCompany(): Promise<APIResponse<Company>> {
    return this.request<Company>('/companies/current');
  }

  async updateCurrentCompany(body: any): Promise<APIResponse<Company>> {
    return this.request<Company>('/companies/current', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  // Users Endpoints
  async getUsers(): Promise<APIResponse<User[]>> {
    return this.request<User[]>('/users');
  }

  async createUser(body: any): Promise<APIResponse<User>> {
    return this.request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async toggleUserStatus(userId: string, isActive: boolean): Promise<APIResponse<any>> {
    return this.request(`/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ isActive }),
    });
  }

  async assignUserRoles(userId: string, roleIds: string[]): Promise<APIResponse<any>> {
    return this.request(`/users/${userId}/roles`, {
      method: 'POST',
      body: JSON.stringify({ roleIds }),
    });
  }

  // Roles & Permissions Endpoints
  async getRoles(): Promise<APIResponse<Role[]>> {
    return this.request<Role[]>('/roles');
  }

  async getPermissions(): Promise<APIResponse<Permission[]>> {
    return this.request<Permission[]>('/roles/permissions');
  }

  async createRole(body: any): Promise<APIResponse<Role>> {
    return this.request<Role>('/roles', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // Audit Logs
  async getAuditLogs(limit = 50, offset = 0): Promise<APIResponse<AuditLog[]>> {
    return this.request<AuditLog[]>(`/audit-logs?limit=${limit}&offset=${offset}`);
  }

  // Customers Endpoints
  async getCustomers(q = ''): Promise<APIResponse<any[]>> {
    const query = q ? `?q=${encodeURIComponent(q)}` : '';
    return this.request<any[]>(`/customers${query}`);
  }

  async createCustomer(body: any): Promise<APIResponse<any>> {
    return this.request('/customers', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async updateCustomer(id: string, body: any): Promise<APIResponse<any>> {
    return this.request(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async deleteCustomer(id: string): Promise<APIResponse<any>> {
    return this.request(`/customers/${id}`, {
      method: 'DELETE',
    });
  }

  async getCustomerStatement(id: string, params?: { from_date?: string; to_date?: string; page?: number; limit?: number }): Promise<APIResponse<any>> {
    let url = `/customers/${id}/statement`;
    if (params) {
      const q = new URLSearchParams();
      if (params.from_date) q.append('from_date', params.from_date);
      if (params.to_date) q.append('to_date', params.to_date);
      if (params.page !== undefined) q.append('page', String(params.page));
      if (params.limit !== undefined) q.append('limit', String(params.limit));
      const qs = q.toString();
      if (qs) url += `?${qs}`;
    }
    return this.request(url);
  }

  async addCustomerTransaction(id: string, body: any): Promise<APIResponse<any>> {
    return this.request(`/customers/${id}/transactions`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // Suppliers Endpoints
  async getSuppliers(q = ''): Promise<APIResponse<any[]>> {
    const query = q ? `?q=${encodeURIComponent(q)}` : '';
    return this.request<any[]>(`/suppliers${query}`);
  }

  async createSupplier(body: any): Promise<APIResponse<any>> {
    return this.request('/suppliers', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async updateSupplier(id: string, body: any): Promise<APIResponse<any>> {
    return this.request(`/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async deleteSupplier(id: string): Promise<APIResponse<any>> {
    return this.request(`/suppliers/${id}`, {
      method: 'DELETE',
    });
  }

  async getSupplierStatement(id: string): Promise<APIResponse<any>> {
    return this.request(`/suppliers/${id}/statement`);
  }

  async addSupplierTransaction(id: string, body: any): Promise<APIResponse<any>> {
    return this.request(`/suppliers/${id}/transactions`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // Products Endpoints
  async getProducts(q = '', category = '', lowStock = false): Promise<APIResponse<any[]>> {
    const params = new URLSearchParams();
    if (q) params.append('q', q);
    if (category) params.append('category', category);
    if (lowStock) params.append('lowStock', 'true');
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return this.request<any[]>(`/products${queryString}`);
  }

  async createProduct(body: any): Promise<APIResponse<any>> {
    return this.request('/products', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async updateProduct(id: string, body: any): Promise<APIResponse<any>> {
    return this.request(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async deleteProduct(id: string): Promise<APIResponse<any>> {
    return this.request(`/products/${id}`, {
      method: 'DELETE',
    });
  }

  // Sales Invoices Endpoints
  async getInvoices(params: {
    search?: string;
    status?: string;
    customer_id?: string;
    currency?: string;
    payment_status?: string;
    min_amount?: number;
    max_amount?: number;
    is_overdue?: boolean;
    start_date?: string;
    end_date?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<APIResponse<any[]>> {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.status) query.append('status', params.status);
    if (params.customer_id) query.append('customer_id', params.customer_id);
    if (params.currency) query.append('currency', params.currency);
    if (params.payment_status) query.append('payment_status', params.payment_status);
    if (params.min_amount !== undefined) query.append('min_amount', String(params.min_amount));
    if (params.max_amount !== undefined) query.append('max_amount', String(params.max_amount));
    if (params.is_overdue) query.append('is_overdue', 'true');
    if (params.start_date) query.append('start_date', params.start_date);
    if (params.end_date) query.append('end_date', params.end_date);
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<any[]>(`/invoices${qs}`);
  }

  async getInvoiceById(id: string): Promise<APIResponse<any>> {
    return this.request(`/invoices/${id}`);
  }

  async createInvoice(body: any): Promise<APIResponse<any>> {
    return this.request('/invoices', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async createInvoiceReturn(id: string, body: any): Promise<APIResponse<any>> {
    return this.request(`/invoices/${id}/return`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async updateInvoice(id: string, body: any): Promise<APIResponse<any>> {
    return this.request(`/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async deleteInvoice(id: string): Promise<APIResponse<any>> {
    return this.request(`/invoices/${id}`, {
      method: 'DELETE',
    });
  }

  async sendInvoiceEmail(id: string, recipientEmail?: string): Promise<APIResponse<any>> {
    return this.request(`/invoices/${id}/send-email`, {
      method: 'POST',
      body: JSON.stringify({ recipientEmail }),
    });
  }

  // Purchase Invoices Endpoints
  async getPurchaseInvoices(params: { search?: string; status?: string; supplier_id?: string; page?: number; limit?: number } = {}): Promise<APIResponse<any[]>> {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.status) query.append('status', params.status);
    if (params.supplier_id) query.append('supplier_id', params.supplier_id);
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<any[]>(`/purchase-invoices${qs}`);
  }

  async getPurchaseInvoiceById(id: string): Promise<APIResponse<any>> {
    return this.request(`/purchase-invoices/${id}`);
  }

  async createPurchaseInvoice(body: any): Promise<APIResponse<any>> {
    return this.request('/purchase-invoices', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async deletePurchaseInvoice(id: string): Promise<APIResponse<any>> {
    return this.request(`/purchase-invoices/${id}`, {
      method: 'DELETE',
    });
  }

  // Payments Endpoints
  async getPayments(params: {
    type?: string;
    customer_id?: string;
    supplier_id?: string;
    invoice_id?: string;
    payment_method?: string;
    status?: string;
    currency?: string;
    payment_account_id?: string;
    start_date?: string;
    end_date?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<APIResponse<any[]>> {
    const query = new URLSearchParams();
    if (params.type) query.append('type', params.type);
    if (params.customer_id) query.append('customer_id', params.customer_id);
    if (params.supplier_id) query.append('supplier_id', params.supplier_id);
    if (params.invoice_id) query.append('invoice_id', params.invoice_id);
    if (params.payment_method) query.append('payment_method', params.payment_method);
    if (params.status) query.append('status', params.status);
    if (params.currency) query.append('currency', params.currency);
    if (params.payment_account_id) query.append('payment_account_id', params.payment_account_id);
    if (params.start_date) query.append('start_date', params.start_date);
    if (params.end_date) query.append('end_date', params.end_date);
    if (params.search) query.append('search', params.search);
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<any[]>(`/payments${qs}`);
  }

  async getPaymentStats(): Promise<APIResponse<any>> {
    return this.request('/payments/stats');
  }

  async getPaymentDetails(id: string): Promise<APIResponse<any>> {
    return this.request(`/payments/${id}`);
  }

  async createPayment(body: any): Promise<APIResponse<any>> {
    return this.request('/payments', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async cancelPayment(id: string, reason?: string): Promise<APIResponse<any>> {
    return this.request(`/payments/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // Ledger Endpoints
  async getLedger(params: { account_type?: string; reference_type?: string; search?: string } = {}): Promise<APIResponse<any[]>> {
    const query = new URLSearchParams();
    if (params.account_type) query.append('account_type', params.account_type);
    if (params.reference_type) query.append('reference_type', params.reference_type);
    if (params.search) query.append('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<any[]>(`/ledger${qs}`);
  }

  // Inventory Movements Endpoints
  async getInventoryMovements(params: { product_id?: string; type?: string; search?: string } = {}): Promise<APIResponse<any[]>> {
    const query = new URLSearchParams();
    if (params.product_id) query.append('product_id', params.product_id);
    if (params.type) query.append('type', params.type);
    if (params.search) query.append('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<any[]>(`/inventory${qs}`);
  }

  // Reports & Analytics Endpoints
  async getDashboardStats(params: { start_date?: string; end_date?: string } = {}): Promise<APIResponse<any>> {
    const query = new URLSearchParams();
    if (params.start_date) query.append('start_date', params.start_date);
    if (params.end_date) query.append('end_date', params.end_date);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/reports/dashboard${qs}`);
  }

  async getSalesReport(params: { start_date?: string; end_date?: string; customer_id?: string; product_id?: string; status?: string; group_by?: string } = {}): Promise<APIResponse<any>> {
    const query = new URLSearchParams();
    if (params.start_date) query.append('start_date', params.start_date);
    if (params.end_date) query.append('end_date', params.end_date);
    if (params.customer_id) query.append('customer_id', params.customer_id);
    if (params.product_id) query.append('product_id', params.product_id);
    if (params.status) query.append('status', params.status);
    if (params.group_by) query.append('group_by', params.group_by);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/reports/sales${qs}`);
  }

  async getPurchaseReport(params: { start_date?: string; end_date?: string; supplier_id?: string; product_id?: string; status?: string; group_by?: string } = {}): Promise<APIResponse<any>> {
    const query = new URLSearchParams();
    if (params.start_date) query.append('start_date', params.start_date);
    if (params.end_date) query.append('end_date', params.end_date);
    if (params.supplier_id) query.append('supplier_id', params.supplier_id);
    if (params.product_id) query.append('product_id', params.product_id);
    if (params.status) query.append('status', params.status);
    if (params.group_by) query.append('group_by', params.group_by);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/reports/purchases${qs}`);
  }

  async getProfitLossReport(params: { start_date?: string; end_date?: string } = {}): Promise<APIResponse<any>> {
    const query = new URLSearchParams();
    if (params.start_date) query.append('start_date', params.start_date);
    if (params.end_date) query.append('end_date', params.end_date);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/reports/profit-loss${qs}`);
  }

  async getReceivablesReport(): Promise<APIResponse<any>> {
    return this.request('/reports/receivables');
  }

  async getPayablesReport(): Promise<APIResponse<any>> {
    return this.request('/reports/payables');
  }

  async getCashFlowReport(params: { start_date?: string; end_date?: string } = {}): Promise<APIResponse<any>> {
    const query = new URLSearchParams();
    if (params.start_date) query.append('start_date', params.start_date);
    if (params.end_date) query.append('end_date', params.end_date);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/reports/cash-flow${qs}`);
  }

  async getInventoryAnalytics(): Promise<APIResponse<any>> {
    return this.request('/reports/inventory');
  }

  async getTopPerformance(limit = 5): Promise<APIResponse<any>> {
    return this.request(`/reports/top-performance?limit=${limit}`);
  }

  async exportReport(
    report_type: string,
    format: 'csv' | 'pdf' | 'html' = 'csv',
    params: { start_date?: string; end_date?: string } = {}
  ): Promise<{ blob: Blob; filename: string; contentType: string }> {
    const query = new URLSearchParams();
    query.append('report_type', report_type);
    query.append('format', format);
    if (params.start_date) query.append('start_date', params.start_date);
    if (params.end_date) query.append('end_date', params.end_date);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.requestFile(`/reports/export${qs}`);
  }

  getExportUrl(report_type: string, format = 'csv', params: { start_date?: string; end_date?: string } = {}): string {
    const query = new URLSearchParams();
    query.append('report_type', report_type);
    query.append('format', format);
    if (params.start_date) query.append('start_date', params.start_date);
    if (params.end_date) query.append('end_date', params.end_date);
    return `${API_BASE_URL}/reports/export?${query.toString()}`;
  }

  // Notifications Endpoints
  async getNotifications(unreadOnly = false): Promise<APIResponse<any>> {
    return this.request(`/notifications${unreadOnly ? '?unread_only=true' : ''}`);
  }

  async markNotificationRead(id: string): Promise<APIResponse<any>> {
    return this.request(`/notifications/${id}/read`, {
      method: 'PUT',
    });
  }

  async markAllNotificationsRead(): Promise<APIResponse<any>> {
    return this.request('/notifications/read-all', {
      method: 'PUT',
    });
  }

  // WhatsApp Endpoints
  async getWhatsAppHistory(): Promise<APIResponse<any[]>> {
    return this.request<any[]>('/whatsapp/history');
  }

  async sendWhatsAppMessage(toPhone: string, messageBody: string): Promise<APIResponse<any>> {
    return this.request('/whatsapp/send', {
      method: 'POST',
      body: JSON.stringify({ toPhone, messageBody }),
    });
  }

  async sendWhatsAppInvoiceReminder(invoiceId: string, toPhone: string): Promise<APIResponse<any>> {
    return this.request('/whatsapp/send-reminder/invoice', {
      method: 'POST',
      body: JSON.stringify({ invoiceId, toPhone }),
    });
  }

  async sendWhatsAppPaymentReminder(paymentId: string, toPhone: string): Promise<APIResponse<any>> {
    return this.request('/whatsapp/send-reminder/payment', {
      method: 'POST',
      body: JSON.stringify({ paymentId, toPhone }),
    });
  }

  async updateWhatsAppConfig(phoneNumberId: string, displayPhoneNumber?: string): Promise<APIResponse<any>> {
    return this.request('/whatsapp/config', {
      method: 'POST',
      body: JSON.stringify({ phoneNumberId, displayPhoneNumber }),
    });
  }

  // AI Endpoints
  async getCashFlowForecast(): Promise<APIResponse<any>> {
    return this.request('/ai/cashflow-forecast');
  }

  // ==========================================
  // Phase 9.5: Financial Reporting & Intelligence
  // ==========================================
  async getTrialBalance(params: { start_date?: string; end_date?: string } = {}): Promise<APIResponse<any>> {
    const query = new URLSearchParams();
    if (params.start_date) query.append('start_date', params.start_date);
    if (params.end_date) query.append('end_date', params.end_date);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/financial-reports/trial-balance${qs}`);
  }

  async getGeneralLedger(params: {
    account_type?: string;
    account_id?: string;
    start_date?: string;
    end_date?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<APIResponse<any>> {
    const query = new URLSearchParams();
    if (params.account_type) query.append('account_type', params.account_type);
    if (params.account_id) query.append('account_id', params.account_id);
    if (params.start_date) query.append('start_date', params.start_date);
    if (params.end_date) query.append('end_date', params.end_date);
    if (params.search) query.append('search', params.search);
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/financial-reports/general-ledger${qs}`);
  }

  async getBalanceSheet(params: { as_of_date?: string; end_date?: string } = {}): Promise<APIResponse<any>> {
    const query = new URLSearchParams();
    if (params.as_of_date) query.append('as_of_date', params.as_of_date);
    if (params.end_date) query.append('end_date', params.end_date);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/financial-reports/balance-sheet${qs}`);
  }

  async getIncomeStatement(params: { start_date?: string; end_date?: string } = {}): Promise<APIResponse<any>> {
    const query = new URLSearchParams();
    if (params.start_date) query.append('start_date', params.start_date);
    if (params.end_date) query.append('end_date', params.end_date);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/financial-reports/income-statement${qs}`);
  }

  async getCashFlowStatement(params: { start_date?: string; end_date?: string } = {}): Promise<APIResponse<any>> {
    const query = new URLSearchParams();
    if (params.start_date) query.append('start_date', params.start_date);
    if (params.end_date) query.append('end_date', params.end_date);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/financial-reports/cash-flow${qs}`);
  }

  async getARAging(): Promise<APIResponse<any>> {
    return this.request('/financial-reports/ar-aging');
  }

  async getAPAging(): Promise<APIResponse<any>> {
    return this.request('/financial-reports/ap-aging');
  }

  async getInventoryValuation(): Promise<APIResponse<any>> {
    return this.request('/financial-reports/inventory-valuation');
  }

  async getTaxSummary(params: { start_date?: string; end_date?: string } = {}): Promise<APIResponse<any>> {
    const query = new URLSearchParams();
    if (params.start_date) query.append('start_date', params.start_date);
    if (params.end_date) query.append('end_date', params.end_date);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/financial-reports/tax-summary${qs}`);
  }

  async getTaxPeriods(): Promise<APIResponse<any[]>> {
    return this.request<any[]>('/financial-reports/tax-periods');
  }

  async closeTaxPeriod(body: {
    period_code: string;
    name?: string;
    start_date: string;
    end_date: string;
    notes?: string;
  }): Promise<APIResponse<any>> {
    return this.request('/financial-reports/tax-periods/close', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async addTaxAdjustment(body: {
    tax_period_id?: string;
    adjustment_type?: string;
    amount: number;
    impact?: string;
    reason: string;
  }): Promise<APIResponse<any>> {
    return this.request('/financial-reports/tax-adjustments', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async getTreasuryDashboard(): Promise<APIResponse<any>> {
    return this.request('/financial-reports/treasury-dashboard');
  }

  async executeTreasuryTransfer(body: {
    from_account_type: 'CASH' | 'BANK';
    from_account_id: string;
    to_account_type: 'CASH' | 'BANK';
    to_account_id: string;
    amount: number;
    fee_amount?: number;
    transfer_date?: string;
    reference?: string;
    notes?: string;
  }): Promise<APIResponse<any>> {
    return this.request('/financial-reports/treasury-transfer', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async getFinancialKPIs(): Promise<APIResponse<any>> {
    return this.request('/financial-reports/kpis');
  }

  async getFinancialAlerts(): Promise<APIResponse<any[]>> {
    return this.request<any[]>('/financial-reports/alerts');
  }

  async exportFinancialReport(
    reportType: string,
    params: { start_date?: string; end_date?: string } = {}
  ): Promise<{ blob: Blob; filename: string; contentType: string }> {
    const query = new URLSearchParams();
    if (params.start_date) query.append('start_date', params.start_date);
    if (params.end_date) query.append('end_date', params.end_date);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.requestFile(`/financial-reports/export/${reportType.toUpperCase()}${qs}`);
  }

  async exportEntity(
    entity: string,
    format = 'csv'
  ): Promise<{ blob: Blob; filename: string; contentType: string }> {
    const query = new URLSearchParams();
    query.append('format', format);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.requestFile(`/export/${entity}${qs}`);
  }

  getFinancialReportExportUrl(reportType: string, params: { start_date?: string; end_date?: string } = {}): string {
    const query = new URLSearchParams();
    if (params.start_date) query.append('start_date', params.start_date);
    if (params.end_date) query.append('end_date', params.end_date);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return `${API_BASE_URL}/financial-reports/export/${reportType.toUpperCase()}${qs}`;
  }

  // POS (Point of Sale) Endpoints
  async posCheckout(body: any): Promise<APIResponse<any>> {
    return this.request('/pos/checkout', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async posHoldSale(body: any): Promise<APIResponse<any>> {
    return this.request('/pos/hold', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async posGetHeldSales(): Promise<APIResponse<any[]>> {
    return this.request<any[]>('/pos/held');
  }

  async posDeleteHeldSale(id: string): Promise<APIResponse<any>> {
    return this.request(`/pos/held/${id}`, {
      method: 'DELETE',
    });
  }

  async posProcessReturn(body: any): Promise<APIResponse<any>> {
    return this.request('/pos/returns', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async posGetCurrentShift(): Promise<APIResponse<any>> {
    return this.request('/pos/shifts/current');
  }

  async posOpenShift(body: { openingCash: number; currency?: string; notes?: string }): Promise<APIResponse<any>> {
    return this.request('/pos/shifts/open', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async posRecordCashMovement(body: { shiftId: string; type: string; amount: number; reason: string }): Promise<APIResponse<any>> {
    return this.request('/pos/shifts/cash-movement', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async posCloseShift(body: { shiftId: string; actualCash: number; closingNotes?: string }): Promise<APIResponse<any>> {
    return this.request('/pos/shifts/close', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async posGetShiftHistory(limit = 50, offset = 0): Promise<APIResponse<any[]>> {
    return this.request<any[]>(`/pos/shifts/history?limit=${limit}&offset=${offset}`);
  }

  async posGetDailySummary(date?: string): Promise<APIResponse<any>> {
    const qs = date ? `?date=${encodeURIComponent(date)}` : '';
    return this.request(`/pos/summary/daily${qs}`);
  }

  async posGetAIAssistantInsights(): Promise<APIResponse<any>> {
    return this.request('/pos/ai-assistant');
  }

  async getExchangeRates(): Promise<APIResponse<any[]>> {
    return this.request<any[]>('/currency-rates');
  }

  // System & Isolation Testing
  async getHealth(): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/health`);
    return await res.json();
  }

  async testTenantIsolation(targetCompanyId?: string): Promise<APIResponse<any>> {
    return this.request('/test/tenant-isolation', {
      method: 'POST',
      body: JSON.stringify({ targetCompanyId }),
    });
  }

  async runProductionVerification(): Promise<APIResponse<any>> {
    return this.request('/test/production-verification', {
      method: 'POST',
    });
  }
}

export const api = new APIClient();
