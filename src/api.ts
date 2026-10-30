/**
 * Comprehensive Frontend API Client for ERP V1 Endpoints
 */

import { escapeHtml, renderAndPrintDocument } from './lib/exportUtils';

const API_BASE = '/api/v1';

type UnauthorizedHandler = () => void;

class ApiClient {
  private token: string | null = null;
  private companyId: string | null = null;
  private unauthorizedHandlers: Set<UnauthorizedHandler> = new Set();

  constructor() {
    this.token = this.getStorageItem('erp_token');
    this.companyId = this.getStorageItem('erp_company_id');
  }

  private getStorageItem(key: string): string | null {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(key);
      }
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // Storage access blocked or unavailable
    }
    return null;
  }

  private setStorageItem(key: string, value: string): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
        return;
      }
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // Storage access blocked or unavailable
    }
  }

  private removeStorageItem(key: string): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
        return;
      }
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Storage access blocked or unavailable
    }
  }

  public onUnauthorized(handler: UnauthorizedHandler): () => void {
    this.unauthorizedHandlers.add(handler);
    return () => {
      this.unauthorizedHandlers.delete(handler);
    };
  }

  private notifyUnauthorized(): void {
    this.unauthorizedHandlers.forEach((handler) => {
      try {
        handler();
      } catch (err) {
        console.error('Error in unauthorized handler:', err);
      }
    });
  }

  public setToken(token: string | null) {
    if (!token || token === 'undefined' || token === 'null') {
      this.clearToken();
      return;
    }
    this.token = token;
    this.setStorageItem('erp_token', token);
    this.setStorageItem('erp_auth_token', token);
  }

  public setCompanyId(companyId: string | null) {
    if (!companyId || companyId === 'undefined' || companyId === 'null') {
      this.companyId = null;
      this.removeStorageItem('erp_company_id');
      return;
    }
    this.companyId = companyId;
    this.setStorageItem('erp_company_id', companyId);
  }

  public clearToken() {
    this.token = null;
    this.companyId = null;
    this.removeStorageItem('erp_token');
    this.removeStorageItem('erp_auth_token');
    this.removeStorageItem('erp_company_id');
  }

  public getToken(): string | null {
    if (!this.token) {
      this.token = this.getStorageItem('erp_auth_token') || this.getStorageItem('erp_token');
    }
    return this.token;
  }

  public getCompanyId(): string | null {
    if (!this.companyId) {
      this.companyId = this.getStorageItem('erp_company_id');
    }
    return this.companyId;
  }

  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = endpoint.startsWith('http')
      ? endpoint
      : endpoint.startsWith('/api/v1')
      ? endpoint
      : endpoint.startsWith('/api/')
      ? `/api/v1${endpoint.slice(4)}`
      : `${API_BASE}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const companyId = this.getCompanyId();
    if (companyId) {
      headers['x-company-id'] = companyId;
    }
    const savedUserEmail = this.getStorageItem('erp_active_user_email');
    if (savedUserEmail) {
      headers['x-user-email'] = savedUserEmail;
    }

    let res: Response;
    try {
      res = await fetch(url, {
        ...options,
        headers,
      });
    } catch (networkErr: any) {
      // Do not wipe session on transient network timeouts or offline states
      throw new Error(networkErr?.message || 'Network communication error');
    }

    let data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const isLoginRequest = url.includes('/auth/login');
      const isRefreshRequest = url.includes('/auth/refresh');
      const isRestoreRequest = url.includes('/auth/session-restore');
      const isLogoutRequest = url.includes('/auth/logout');
      const errorCode = data?.error?.code || data?.code;

      // Transparent Sliding Session Re-sync & Restore on 401
      if (res.status === 401 && !isLoginRequest && !isRefreshRequest && !isRestoreRequest && !isLogoutRequest) {
        try {
          let parsedUser = null;
          let parsedCompany = null;
          const sessionRaw = this.getStorageItem('erp_active_session_v1');
          if (sessionRaw) {
            try {
              const s = JSON.parse(sessionRaw);
              parsedUser = s?.user;
              parsedCompany = s?.company;
            } catch {}
          }
          if (!parsedUser) {
            const userRaw = this.getStorageItem('erp_user') || this.getStorageItem('erp_auth_user');
            if (userRaw) {
              try { parsedUser = JSON.parse(userRaw); } catch {}
            }
          }
          if (!parsedCompany) {
            const compRaw = this.getStorageItem('erp_auth_company') || this.getStorageItem('erp_current_company');
            if (compRaw) {
              try { parsedCompany = JSON.parse(compRaw); } catch {}
            }
          }

          const restoreRes = await fetch(`${API_BASE}/auth/session-restore`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token || ''}`,
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
              const retryRes = await fetch(url, { ...options, headers });
              if (retryRes.ok) {
                return await retryRes.json();
              }
            }
          }
        } catch {
          // Keep existing credentials across network glitches
        }
      }

      // Never wipe active merchant session automatically on network glitches or cold starts
      if (errorCode === 'ACCOUNT_DISABLED') {
        console.warn('[AUTH_WARN] Account status notice received; preserving local session resilience.');
      }

      const errorMessage =
        data?.error?.message ||
        (typeof data?.error === 'string' ? data.error : undefined) ||
        data?.message ||
        `Request failed with status ${res.status}`;

      const error: any = new Error(errorMessage);
      error.status = res.status;
      error.code = errorCode;
      error.response = data;
      throw error;
    }

    return data;
  }

  public toQueryString(params?: any): string {
    if (!params || typeof params !== 'object') return '';
    const cleanParams: Record<string, string> = {};
    for (const [key, val] of Object.entries(params)) {
      if (
        val !== undefined &&
        val !== null &&
        val !== '' &&
        val !== 'undefined' &&
        val !== 'null'
      ) {
        cleanParams[key] = String(val);
      }
    }
    const qs = new URLSearchParams(cleanParams).toString();
    return qs ? `?${qs}` : '';
  }

  // ==================== GENERIC HTTP METHODS ====================
  public async get<T = any>(endpoint: string, options: RequestInit = {}): Promise<{ data: T }> {
    const res = await this.request<T>(endpoint, { ...options, method: 'GET' });
    return { data: res };
  }

  public async post<T = any>(endpoint: string, body?: any, options: RequestInit = {}): Promise<{ data: T }> {
    const res = await this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return { data: res };
  }

  public async put<T = any>(endpoint: string, body?: any, options: RequestInit = {}): Promise<{ data: T }> {
    const res = await this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return { data: res };
  }

  public async delete<T = any>(endpoint: string, options: RequestInit = {}): Promise<{ data: T }> {
    const res = await this.request<T>(endpoint, { ...options, method: 'DELETE' });
    return { data: res };
  }

  // ==================== AUTH & USERS ====================
  async login(credentials: { email: string; password?: string; password_hash?: string; companyCode?: string }) {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    const token = res?.data?.token || res?.token;
    if (token) {
      this.setToken(token);
    }
    const companyId =
      res?.data?.user?.companyId ||
      res?.data?.user?.company_id ||
      res?.data?.company?.id ||
      res?.user?.company_id ||
      res?.user?.companyId;
    if (companyId) {
      this.setCompanyId(companyId);
    }
    return res;
  }

  async register(data: any) {
    const res = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const token = res?.data?.token || res?.token;
    if (token) {
      this.setToken(token);
    }
    const companyId =
      res?.data?.user?.companyId ||
      res?.data?.user?.company_id ||
      res?.data?.company?.id ||
      res?.user?.company_id ||
      res?.user?.companyId;
    if (companyId) {
      this.setCompanyId(companyId);
    }
    return res;
  }

  async forgotPassword(data: { email: string }) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async resetPassword(data: { token: string; newPassword: string }) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getProfile() {
    return this.request('/auth/me');
  }

  async getMe() {
    return this.request('/auth/me');
  }

  async getCurrentCompany() {
    return this.request('/companies/current');
  }

  async updateProfile(data: any) {
    return this.request('/settings/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getUsers(params?: any) {
    return this.request(`/users${this.toQueryString(params)}`);
  }

  async createUser(data: any) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateUser(id: string, data: any) {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async toggleUserStatus(id: string, is_active: boolean) {
    return this.request(`/users/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ isActive: is_active }),
    });
  }

  async assignUserRoles(id: string, roles: string[]) {
    return this.request(`/users/${id}/roles`, {
      method: 'POST',
      body: JSON.stringify({ roleIds: roles }),
    });
  }

  async deleteUser(id: string) {
    return this.request(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  async getRoles() {
    return this.request('/roles');
  }

  async getPermissions() {
    return this.request('/roles/permissions');
  }

  async createRole(data: any) {
    return this.request('/roles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==================== CUSTOMERS ====================
  async getCustomers(params?: any) {
    if (typeof params === 'string') {
      return this.request(`/customers${params ? `?q=${encodeURIComponent(params)}` : ''}`);
    }
    return this.request(`/customers${this.toQueryString(params)}`);
  }

  async getCustomer(id: string) {
    return this.request(`/customers/${id}`);
  }

  async createCustomer(data: any) {
    return this.request('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCustomer(id: string, data: any) {
    return this.request(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCustomer(id: string, reason?: string, forceHardDelete?: boolean) {
    const qs = this.toQueryString({ reason, force_hard_delete: forceHardDelete });
    return this.request(`/customers/${id}${qs}`, {
      method: 'DELETE',
    });
  }

  async deactivateCustomer(id: string, reason?: string) {
    return this.request(`/customers/${id}/deactivate`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async reactivateCustomer(id: string) {
    return this.request(`/customers/${id}/reactivate`, {
      method: 'POST',
    });
  }

  async getCustomerStatement(id: string, params?: any) {
    return this.request(`/customers/${id}/statement${this.toQueryString(params)}`);
  }

  async getCustomerAging(id?: string) {
    return this.request(`/customers/aging${id ? `?customerId=${id}` : ''}`);
  }

  async addCustomerTransaction(customerId: string, data: any) {
    return this.request(`/customers/${customerId}/transactions`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==================== SUPPLIERS ====================
  async getSuppliers(params?: any) {
    return this.request(`/suppliers${this.toQueryString(params)}`);
  }

  async getSupplier(id: string) {
    return this.request(`/suppliers/${id}`);
  }

  async createSupplier(data: any) {
    return this.request('/suppliers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSupplier(id: string, data: any) {
    return this.request(`/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSupplier(id: string) {
    return this.request(`/suppliers/${id}`, {
      method: 'DELETE',
    });
  }

  async getSupplierStatement(id: string, params?: any) {
    return this.request(`/suppliers/${id}/statement${this.toQueryString(params)}`);
  }

  async addSupplierTransaction(supplierId: string, data: any) {
    return this.request(`/suppliers/${supplierId}/transactions`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==================== PRODUCTS & INVENTORY ====================
  async getProducts(paramsOrSearch?: any, category?: string, lowStock?: boolean) {
    let params: Record<string, any> = {};
    if (typeof paramsOrSearch === 'string' || category !== undefined || lowStock !== undefined) {
      if (paramsOrSearch) params.search = paramsOrSearch;
      if (category) params.category = category;
      if (lowStock) params.lowStock = 'true';
    } else if (paramsOrSearch && typeof paramsOrSearch === 'object') {
      params = paramsOrSearch;
    }
    return this.request(`/products${this.toQueryString(params)}`);
  }

  async getProduct(id: string) {
    return this.request(`/products/${id}`);
  }

  async createProduct(data: any) {
    return this.request('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProduct(id: string, data: any) {
    return this.request(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProduct(id: string) {
    return this.request(`/products/${id}`, {
      method: 'DELETE',
    });
  }

  async getCategories() {
    return this.request('/products/categories');
  }

  async adjustStock(productId: string, data: { quantity: number; reason: string; type: string }) {
    return this.request(`/products/${productId}/adjust-stock`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getInventoryMovements(params?: any) {
    return this.request(`/inventory${this.toQueryString(params)}`);
  }

  // ==================== SALES INVOICES ====================
  async getInvoices(params?: any) {
    return this.request(`/invoices${this.toQueryString(params)}`);
  }

  async getInvoice(id: string) {
    return this.request(`/invoices/${id}`);
  }

  async getInvoiceById(id: string) {
    return this.getInvoice(id);
  }

  async createInvoice(data: any) {
    return this.request('/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateInvoice(id: string, data: any) {
    return this.request(`/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteInvoice(id: string) {
    return this.request(`/invoices/${id}`, {
      method: 'DELETE',
    });
  }

  async cancelInvoice(id: string, reason?: string) {
    return this.request(`/invoices/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async addInvoicePayment(id: string, data: any) {
    return this.request(`/invoices/${id}/payments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getInvoiceStats() {
    return this.request('/invoices/stats');
  }

  async createSalesReturn(invoiceIdOrData: any, dataIfId?: any) {
    let payload: any;
    if (typeof invoiceIdOrData === 'string') {
      payload = { invoice_id: invoiceIdOrData, ...dataIfId };
    } else {
      payload = invoiceIdOrData;
    }
    return this.request('/invoices/returns', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async createInvoiceReturn(invoiceIdOrData: any, dataIfId?: any) {
    return this.createSalesReturn(invoiceIdOrData, dataIfId);
  }

  async sendInvoiceEmail(id: string, data?: any) {
    return this.request(`/invoices/${id}/email`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  }

  // ==================== PURCHASE INVOICES ====================
  async getPurchaseInvoices(params?: any) {
    return this.request(`/purchase-invoices${this.toQueryString(params)}`);
  }

  async getPurchaseInvoice(id: string) {
    return this.request(`/purchase-invoices/${id}`);
  }

  async getPurchaseInvoiceById(id: string) {
    return this.getPurchaseInvoice(id);
  }

  async createPurchaseInvoice(data: any) {
    return this.request('/purchase-invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePurchaseInvoice(id: string, data: any) {
    return this.request(`/purchase-invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePurchaseInvoice(id: string) {
    return this.request(`/purchase-invoices/${id}`, {
      method: 'DELETE',
    });
  }

  async cancelPurchaseInvoice(id: string, reason?: string) {
    return this.request(`/purchase-invoices/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async addPurchaseInvoicePayment(id: string, data: any) {
    return this.request(`/purchase-invoices/${id}/payments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createPurchaseReturn(data: any) {
    return this.request('/purchase-invoices/returns', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==================== FINANCIAL PAYMENTS & VOUCHERS ====================
  async getPayments(params?: any) {
    return this.request(`/payments${this.toQueryString(params)}`);
  }

  async getPayment(id: string) {
    return this.request(`/payments/${id}`);
  }

  async getPaymentDetails(id: string) {
    return this.getPayment(id);
  }

  async getPaymentStats() {
    return this.request('/payments/stats');
  }

  async createPayment(data: any) {
    return this.request('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async cancelPayment(id: string, reason?: string) {
    return this.request(`/payments/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // ==================== POS / POINT OF SALE ====================
  async getPOSCurrentShift() {
    return this.request('/pos/shifts/current');
  }

  async posGetCurrentShift() {
    return this.request('/pos/shifts/current');
  }

  async posGetDailySummary() {
    return this.request('/pos/daily-summary');
  }

  async openPOSShift(data: { opening_cash: number; currency?: string; notes?: string }) {
    return this.request('/pos/shifts/open', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async posOpenShift(data: any) {
    return this.openPOSShift(data);
  }

  async closePOSShift(id: string, data: { actual_cash: number; closing_notes?: string }) {
    return this.request(`/pos/shifts/${id}/close`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async posCloseShift(id: string, data: any) {
    return this.closePOSShift(id, data);
  }

  async createPOSCashMovement(data: { shift_id: string; type: 'CASH_IN' | 'CASH_OUT' | 'EXPENSE'; amount: number; reason: string }) {
    return this.request('/pos/shifts/cash-movement', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async posCreateCashMovement(data: any) {
    return this.createPOSCashMovement(data);
  }

  async processPOSSale(saleData: any) {
    return this.request('/pos/checkout', {
      method: 'POST',
      body: JSON.stringify(saleData),
    });
  }

  async posCheckout(saleData: any) {
    return this.processPOSSale(saleData);
  }

  async processPOSReturn(returnData: any) {
    return this.request('/pos/return', {
      method: 'POST',
      body: JSON.stringify(returnData),
    });
  }

  async posProcessReturn(returnData: any) {
    return this.processPOSReturn(returnData);
  }

  async getHeldSales() {
    return this.request('/pos/held-sales');
  }

  async posGetHeldSales() {
    return this.getHeldSales();
  }

  async saveHeldSale(heldData: any) {
    return this.request('/pos/held-sales', {
      method: 'POST',
      body: JSON.stringify(heldData),
    });
  }

  async posSaveHeldSale(heldData: any) {
    return this.saveHeldSale(heldData);
  }

  async deleteHeldSale(id: string) {
    return this.request(`/pos/held-sales/${id}`, {
      method: 'DELETE',
    });
  }

  async posDeleteHeldSale(id: string) {
    return this.deleteHeldSale(id);
  }

  async getExchangeRates() {
    return this.request('/exchange-rates');
  }

  async posGetAIAssistantInsights() {
    return this.request('/pos/ai-insights');
  }

  async posHoldSale(data: any) {
    return this.saveHeldSale(data);
  }

  // ==================== ACCOUNTING LEDGER & REPORTS ====================
  async getLedgerEntries(params?: any) {
    return this.request(`/ledger${this.toQueryString(params)}`);
  }

  async getLedger(params?: any) {
    return this.getLedgerEntries(params);
  }

  async getTrialBalance(params?: any) {
    return this.request(`/reports/trial-balance${this.toQueryString(params)}`);
  }

  async getBalanceSheet(params?: any) {
    return this.request(`/reports/balance-sheet${this.toQueryString(params)}`);
  }

  async getIncomeStatement(params?: any) {
    return this.request(`/reports/income-statement${this.toQueryString(params)}`);
  }

  async getTaxReport(params?: any) {
    return this.request(`/reports/tax${this.toQueryString(params)}`);
  }

  async getExecutiveSummary(params?: any) {
    return this.request(`/reports/executive-summary${this.toQueryString(params)}`);
  }

  async getFinancialHealth(params?: any) {
    return this.request(`/reports/financial-health${this.toQueryString(params)}`);
  }

  async getCashFlowForecast(_params?: any) {
    return this.request(`/ai/cashflow-forecast`);
  }

  async getSalesReport(params?: any) {
    return this.request(`/reports/sales${this.toQueryString(params)}`);
  }

  async getPurchaseReport(params?: any) {
    return this.request(`/reports/purchases${this.toQueryString(params)}`);
  }

  async getProfitLossReport(params?: any) {
    return this.request(`/reports/profit-loss${this.toQueryString(params)}`);
  }

  async getReceivablesReport(params?: any) {
    return this.request(`/reports/receivables${this.toQueryString(params)}`);
  }

  async getPayablesReport(params?: any) {
    return this.request(`/reports/payables${this.toQueryString(params)}`);
  }

  async getCashFlowReport(params?: any) {
    return this.request(`/reports/cash-flow${this.toQueryString(params)}`);
  }

  async getInventoryAnalytics(params?: any) {
    return this.request(`/reports/inventory${this.toQueryString(params)}`);
  }

  async exportReport(type: string, format: string, params?: any) {
    const qs = this.toQueryString(params);
    const connector = qs ? `&${qs.slice(1)}` : '';
    return this.request(`/reports/export/${type}?format=${format}${connector}`);
  }

  triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  generatePrintWrapperHtml(contentHtml: string, title: string = 'تقرير مالي'): string {
    const safeTitle = escapeHtml(title);
    return `
      <html dir="rtl" lang="ar">
        <head>
          <title>${safeTitle}</title>
          <link rel="stylesheet" href="/assets/print.css">
        </head>
        <body>
          <h2>${safeTitle}</h2>
          ${contentHtml}
        </body>
      </html>
    `;
  }

  openPrintWindow(contentHtml: string, title: string = 'تقرير مالي') {
    renderAndPrintDocument(contentHtml, title);
  }

  // ==================== NOTIFICATIONS ====================
  async getNotifications(params?: any) {
    return this.request(`/notifications${this.toQueryString(params)}`);
  }

  async markNotificationAsRead(id: string) {
    return this.request(`/notifications/${id}/read`, {
      method: 'POST',
    });
  }

  async markNotificationRead(id: string) {
    return this.markNotificationAsRead(id);
  }

  async markAllNotificationsAsRead() {
    return this.request('/notifications/mark-all-read', {
      method: 'POST',
    });
  }

  async markAllNotificationsRead() {
    return this.markAllNotificationsAsRead();
  }

  // ==================== AUDIT LOGS ====================
  async getAuditLogs(params?: any) {
    return this.request(`/audit-logs${this.toQueryString(params)}`);
  }

  // ==================== AI ASSISTANT & OCR ====================
  async sendAIMessage(data: { conversation_id?: string; content: string }) {
    return this.request('/ai/chat', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAIConversations() {
    return this.request('/ai/conversations');
  }

  async getAIConversationMessages(conversationId: string) {
    return this.request(`/ai/conversations/${conversationId}/messages`);
  }

  async deleteAIConversation(conversationId: string) {
    return this.request(`/ai/conversations/${conversationId}`, {
      method: 'DELETE',
    });
  }

  async uploadOCRDocument(formData: FormData) {
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/ocr/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return res.json();
  }

  async getOCRDocuments() {
    return this.request('/ocr/documents');
  }

  async commitOCRDocument(id: string, data: any) {
    return this.request(`/ocr/documents/${id}/commit`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==================== WHATSAPP ====================
  async getWhatsAppMessages(params?: any) {
    return this.request(`/whatsapp/messages${this.toQueryString(params)}`);
  }

  async getWhatsAppHistory(params?: any) {
    return this.getWhatsAppMessages(params);
  }

  async sendWhatsAppMessage(dataOrPhone: string | { phone: string; message: string; template_name?: string }, messageText?: string, templateName?: string) {
    let payload: any;
    if (typeof dataOrPhone === 'string') {
      payload = { phone: dataOrPhone, message: messageText || '', template_name: templateName };
    } else {
      payload = dataOrPhone;
    }
    return this.request('/whatsapp/send', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async sendWhatsAppInvoiceReminder(invoiceId: string, data?: any) {
    return this.request(`/whatsapp/remind/invoice/${invoiceId}`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  }

  async sendWhatsAppPaymentReminder(partyId: string, data?: any) {
    return this.request(`/whatsapp/remind/payment/${partyId}`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  }

  async updateWhatsAppConfig(dataOrPhoneId: any, displayPhoneNumber?: string) {
    let payload: any;
    if (typeof dataOrPhoneId === 'string') {
      payload = { phone_number_id: dataOrPhoneId, display_phone_number: displayPhoneNumber };
    } else {
      payload = dataOrPhoneId;
    }
    return this.request('/whatsapp/config', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // ==================== BACKUP & RESTORE ====================
  async getBackups() {
    return this.request('/backups');
  }

  async getBackupStats() {
    return this.request('/backups/stats');
  }

  async createBackup(data?: any) {
    return this.request('/backups/create', {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  }

  async verifyBackup(id: string) {
    return this.request(`/backups/${id}/verify`, {
      method: 'POST',
    });
  }

  async restoreBackup(id: string) {
    return this.request(`/backups/${id}/restore`, {
      method: 'POST',
    });
  }

  async deleteBackup(id: string) {
    return this.request(`/backups/${id}`, {
      method: 'DELETE',
    });
  }

  async downloadBackupUrl(id: string) {
    const token = this.getToken();
    const url = `/api/v1/backups/${id}/download`;
    const res = await fetch(url, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) {
      throw new Error('فشل تنزيل ملف النسخة الاحتياطية');
    }
    const blob = await res.blob();
    return blob;
  }

  // ==================== SYSTEM HEALTH & GOVERNANCE ====================
  async getSystemHealth() {
    return this.request('/health');
  }

  async getDataGovernanceStats() {
    return this.request('/governance/stats');
  }

  async getProductionVerification() {
    return this.request('/verification/status');
  }

  async runProductionVerification() {
    return this.request('/verification/run', {
      method: 'POST',
    });
  }

  async initializeProductionData(data?: any) {
    return this.request('/setup/production-data', {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  }

  // ==================== ENTERPRISE SETTINGS & ADVANCED CONTROL CENTER ====================
  async getControlCenterDefinitions() {
    return this.request('/control-center/definitions');
  }

  async getControlCenterSettings(params?: { branchId?: string; roleId?: string; userId?: string }) {
    return this.request(`/control-center/settings${this.toQueryString(params)}`);
  }

  async getControlCenterSetting(key: string, params?: { branchId?: string; roleId?: string; userId?: string }) {
    return this.request(`/control-center/setting/${encodeURIComponent(key)}${this.toQueryString(params)}`);
  }

  async applyControlCenterSetting(payload: {
    key: string;
    value: any;
    scope?: string;
    scopeId?: string;
    reason?: string;
    bypassApproval?: boolean;
  }) {
    return this.request('/control-center/setting', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getControlCenterGovernance() {
    return this.request('/control-center/governance');
  }

  async setControlCenterSafeMode(enabled: boolean) {
    return this.request('/control-center/governance/safe-mode', {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    });
  }

  async setControlCenterEmergencyLock(active: boolean, reason: string = '') {
    return this.request('/control-center/governance/emergency-lock', {
      method: 'POST',
      body: JSON.stringify({ active, reason }),
    });
  }

  async setControlCenterExpertMode(enabled: boolean) {
    return this.request('/control-center/governance/expert-mode', {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    });
  }

  async getControlCenterChangeRequests(status?: string) {
    return this.request(`/control-center/change-requests${this.toQueryString({ status })}`);
  }

  async approveControlCenterChangeRequest(id: string) {
    return this.request(`/control-center/change-requests/${id}/approve`, {
      method: 'POST',
    });
  }

  async rejectControlCenterChangeRequest(id: string, reason: string) {
    return this.request(`/control-center/change-requests/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async getControlCenterImpactAnalysis(payload: { settingKey: string; newValue: any; scope?: string }) {
    return this.request('/control-center/impact-analysis', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getControlCenterVersions(settingKey?: string) {
    return this.request(`/control-center/versions${this.toQueryString({ settingKey })}`);
  }

  async rollbackControlCenterSetting(payload: { settingKey: string; targetValue: any; reason?: string }) {
    return this.request('/control-center/rollback', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getControlCenterSnapshots() {
    return this.request('/control-center/snapshots');
  }

  async createControlCenterSnapshot(payload: { name?: string; description?: string; isLastKnownGood?: boolean }) {
    return this.request('/control-center/snapshots', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async restoreControlCenterSnapshot(id: string, reason?: string) {
    return this.request(`/control-center/snapshots/${id}/restore`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async scanControlCenterDrift() {
    return this.request('/control-center/drift');
  }

  async reconcileControlCenterDrift(payload: { settingKey: string; scope?: string; scopeId?: string }) {
    return this.request('/control-center/drift/reconcile', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async runControlCenterHealthCheck() {
    return this.request('/control-center/health-check');
  }

  async getControlCenterDiagnostics(settingKey?: string) {
    return this.request(`/control-center/diagnostics${this.toQueryString({ settingKey })}`);
  }

  async getControlCenterPresets() {
    return this.request('/control-center/presets');
  }

  async previewControlCenterPreset(id: string) {
    return this.request(`/control-center/presets/${id}/preview`, {
      method: 'POST',
    });
  }

  async applyControlCenterPreset(id: string) {
    return this.request(`/control-center/presets/${id}/apply`, {
      method: 'POST',
    });
  }

  async consultControlCenterAIAssistant(prompt: string) {
    return this.request('/control-center/ai-assistant', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    });
  }

  async getControlCenterAuditLogs(limit?: number) {
    return this.request(`/control-center/audit-logs${this.toQueryString({ limit })}`);
  }

  // ==========================================
  // Employees & Payroll
  // ==========================================
  async getEmployees() {
    return this.request<{ success: boolean; data: Employee[]; total?: number }>('/employees');
  }

  async createEmployee(data: Partial<Employee>) {
    return this.request<{ success: boolean; data: Employee; message?: string }>('/employees', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEmployee(id: string, data: Partial<Employee>) {
    return this.request<{ success: boolean; data: Employee; message?: string }>(`/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteEmployee(id: string) {
    return this.request<{ success: boolean; message: string }>(`/employees/${id}`, {
      method: 'DELETE',
    });
  }

  async getEmployeeMovements(employeeId?: string) {
    return this.request<{ success: boolean; data: EmployeeMovement[]; total?: number }>(`/employees/movements${this.toQueryString({ employeeId })}`);
  }

  async createEmployeeMovement(data: Partial<EmployeeMovement>) {
    return this.request<{ success: boolean; data: EmployeeMovement; message?: string }>('/employees/movements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPayrollRecords(month?: string) {
    return this.request<{ success: boolean; data: PayrollRecord[]; total?: number }>(`/payroll${this.toQueryString({ month })}`);
  }

  async disbursePayroll(data: {
    employeeId: string;
    employeeName?: string;
    month: string;
    baseSalary: number;
    bonuses?: number;
    advancesDeducted?: number;
    otherDeductions?: number;
    netSalary?: number;
    currency?: string;
    paymentDate?: string;
    treasury?: string;
    notes?: string;
  }) {
    return this.request<{ success: boolean; data: { payrollRecord: PayrollRecord; expenseRecord: Expense }; message?: string }>('/payroll/disburse', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==========================================
  // Operating Expenses
  // ==========================================
  async getExpenses(filters?: {
    category?: string;
    costCenter?: string;
    treasury?: string;
    currency?: string;
    startDate?: string;
    endDate?: string;
  }) {
    return this.request<{ success: boolean; data: Expense[]; total?: number }>(`/expenses${this.toQueryString(filters)}`);
  }

  async createExpense(data: Partial<Expense>) {
    return this.request<{ success: boolean; data: Expense; message?: string }>('/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateExpense(id: string, data: Partial<Expense>) {
    return this.request<{ success: boolean; data: Expense; message?: string }>(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteExpense(id: string) {
    return this.request<{ success: boolean; message: string }>(`/expenses/${id}`, {
      method: 'DELETE',
    });
  }
}

export interface Employee {
  id: string;
  code: string;
  name: string;
  roleTitle: string;
  phone: string;
  branch: string;
  hireDate: string;
  baseSalary: number;
  currency: 'YER' | 'SAR' | 'USD';
  status: 'نشط' | 'في إجازة' | 'موقوف';
  notes?: string;
  created_at?: string;
}

export interface EmployeeMovement {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'advance' | 'bonus' | 'deduction' | 'salary_payment';
  amount: number;
  currency: 'YER' | 'SAR' | 'USD';
  date: string;
  treasury: string;
  description: string;
  attendanceStatus?: 'present' | 'absent' | 'leave' | 'overtime';
  notes?: string;
  created_at?: string;
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  month: string;
  baseSalary: number;
  bonuses: number;
  advancesDeducted: number;
  otherDeductions: number;
  netSalary: number;
  currency: 'YER' | 'SAR' | 'USD';
  paymentDate: string;
  treasury: string;
  status: 'draft' | 'paid';
  referenceVoucher?: string;
  notes?: string;
  created_at?: string;
}

export interface Expense {
  id: string;
  voucherNumber: string;
  date: string;
  category: string;
  costCenter: string;
  beneficiary: string;
  amount: number;
  currency: 'YER' | 'SAR' | 'USD';
  exchangeRate?: number;
  baseCurrencyAmount?: number;
  paymentMethod: string;
  treasury: string;
  referenceNumber?: string;
  description: string;
  notes?: string;
  created_at?: string;
}

export { ApiClient };
export const api = new ApiClient();

