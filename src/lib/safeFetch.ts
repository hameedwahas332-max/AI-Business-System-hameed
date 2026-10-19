export async function safeFetchJson<T = any>(
  url: string,
  options?: RequestInit
): Promise<{ success: boolean; data?: T; error?: string; status: number }> {
  try {
    const token = localStorage.getItem('erp_auth_token') || 'mock_token';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options?.headers as Record<string, string>),
    };

    const res = await fetch(url, { ...options, headers });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        success: false,
        error: json?.error || json?.message || `HTTP Error ${res.status}`,
        status: res.status,
      };
    }

    return {
      success: true,
      data: json?.data ?? json,
      status: res.status,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network communication error',
      status: 0,
    };
  }
}

export default safeFetchJson;
