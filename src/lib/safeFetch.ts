import { handleLocalDesktopApiFallback, isTauriOrDesktopEnvironment } from '../services/localDesktopApiFallback';

export async function safeFetchJson<T = any>(
  url: string,
  options?: RequestInit
): Promise<{ success: boolean; ok: boolean; data?: T; error?: string; status: number }> {
  try {
    const token =
      localStorage.getItem('erp_auth_token') ||
      localStorage.getItem('erp_token') ||
      localStorage.getItem('token') ||
      'mock_token';
    const companyId = localStorage.getItem('erp_company_id');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(companyId ? { 'x-company-id': companyId } : {}),
      ...(options?.headers as Record<string, string>),
    };

    let res: Response;
    const controller = !options?.signal && typeof AbortController !== 'undefined' ? new AbortController() : null;
    let timeoutId: any = null;
    if (controller) {
      timeoutId = setTimeout(() => controller.abort(), 8000);
    }
    try {
      res = await fetch(url, { ...options, headers, signal: options?.signal || controller?.signal });
    } catch (networkErr: any) {
      if (timeoutId) clearTimeout(timeoutId);
      // If network fails (e.g., Tauri offline, server not running locally, timeout), execute fallback
      const fallback = await handleLocalDesktopApiFallback<T>(url, options);
      return {
        success: fallback.success,
        ok: fallback.ok,
        data: fallback.data,
        status: fallback.status || 200,
        error: fallback.error,
      };
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }

    const contentType = res.headers.get('content-type') || '';

    let json: any = {};
    if (contentType.includes('application/json')) {
      json = await res.json().catch(() => ({}));
    } else {
      // In standalone Tauri Desktop, relative /api/... calls hit static file server
      // which serves index.html (text/html). We route immediately to the local fallback DAL!
      const fallback = await handleLocalDesktopApiFallback<T>(url, options);
      if (fallback.ok) {
        return {
          success: fallback.success,
          ok: fallback.ok,
          data: fallback.data,
          status: fallback.status || 200,
        };
      }

      if (!res.ok) {
        return {
          success: false,
          ok: false,
          error: `HTTP Error ${res.status}`,
          status: res.status,
        };
      }
      return {
        success: true,
        ok: true,
        data: fallback.data as any,
        status: 200,
      };
    }

    if (!res.ok) {
      // If 404 or server error in desktop/offline, give fallback a chance
      if (res.status === 404 || isTauriOrDesktopEnvironment()) {
        const fallback = await handleLocalDesktopApiFallback<T>(url, options);
        if (fallback.ok) {
          return {
            success: fallback.success,
            ok: fallback.ok,
            data: fallback.data,
            status: fallback.status || 200,
          };
        }
      }

      return {
        success: false,
        ok: false,
        error: json?.error || json?.message || `HTTP Error ${res.status}`,
        status: res.status,
      };
    }

    return {
      success: true,
      ok: true,
      data: json?.data ?? json,
      status: res.status,
    };
  } catch (err: any) {
    // Ultimate safety fallback
    try {
      const fallback = await handleLocalDesktopApiFallback<T>(url, options);
      return {
        success: fallback.success,
        ok: fallback.ok,
        data: fallback.data,
        status: fallback.status || 200,
        error: fallback.error,
      };
    } catch {
      return {
        success: false,
        ok: false,
        error: err?.message || 'Network communication error',
        status: 0,
      };
    }
  }
}

export default safeFetchJson;
