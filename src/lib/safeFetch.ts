export async function safeFetchJson<T = any>(
  url: string,
  options?: RequestInit
): Promise<{ success: boolean; ok: boolean; data?: T; error?: string; status: number }> {
  try {
    const token = localStorage.getItem('erp_auth_token') || 'mock_token';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options?.headers as Record<string, string>),
    };

    const res = await fetch(url, { ...options, headers });
    const contentType = res.headers.get('content-type') || '';

    let json: any = {};
    if (contentType.includes('application/json')) {
      json = await res.json().catch(() => ({}));
    } else {
      // Endpoint returned HTML or non-JSON (e.g. 404 fallback or static index.html)
      if (!res.ok) {
        return {
          success: false,
          ok: false,
          error: `HTTP Error ${res.status}`,
          status: res.status,
        };
      }
      return {
        success: false,
        ok: false,
        error: 'Non-JSON response received from server',
        status: res.status,
      };
    }

    if (!res.ok) {
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
    return {
      success: false,
      ok: false,
      error: err?.message || 'Network communication error',
      status: 0,
    };
  }
}

export default safeFetchJson;
