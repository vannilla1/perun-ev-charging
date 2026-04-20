import { isDemoMode as checkDemoMode, clearTokenCache } from './oauth';

// Re-export isDemoMode z oauth modulu
export const isDemoMode = checkDemoMode;

// Token management pre používateľské sessions (localStorage)
const getUserToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
};

const setAccessToken = (token: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('accessToken', token);
};

const removeAccessToken = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  clearTokenCache();
};

// Fetch-based API helper s automatickým pridaním tokenu
async function fetchWithAuth<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const userToken = getUserToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (userToken) {
    headers.Authorization = `Bearer ${userToken}`;
  }

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    clearTokenCache();
    removeAccessToken();
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Helper funkcie pre API volania
export const api = {
  get: <T>(url: string, params?: Record<string, unknown>) => {
    const searchParams = params ? '?' + new URLSearchParams(
      Object.entries(params).reduce((acc, [k, v]) => {
        if (v !== undefined && v !== null) acc[k] = String(v);
        return acc;
      }, {} as Record<string, string>)
    ).toString() : '';
    return fetchWithAuth<T>(url + searchParams);
  },

  post: <T>(url: string, data?: unknown) =>
    fetchWithAuth<T>(url, { method: 'POST', body: data ? JSON.stringify(data) : undefined }),

  put: <T>(url: string, data?: unknown) =>
    fetchWithAuth<T>(url, { method: 'PUT', body: data ? JSON.stringify(data) : undefined }),

  patch: <T>(url: string, data?: unknown) =>
    fetchWithAuth<T>(url, { method: 'PATCH', body: data ? JSON.stringify(data) : undefined }),

  delete: <T>(url: string) =>
    fetchWithAuth<T>(url, { method: 'DELETE' }),
};

// Pre spätnú kompatibilitu - apiClient je teraz len alias
export const apiClient = api;

export { setAccessToken, removeAccessToken, getUserToken as getAccessToken };
