import { API_CONFIG } from './config';

// eCarUp OAuth 2.0 Client Credentials Flow
interface TokenCache {
  token: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

// Získanie OAuth tokenu pre eCarUp API
export async function getEcarUpToken(): Promise<string> {
  // Skontroluj cache
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60000) {
    return tokenCache.token;
  }

  if (!API_CONFIG.clientId || !API_CONFIG.clientSecret) {
    throw new Error('eCarUp API credentials nie sú nakonfigurované');
  }

  const response = await fetch(API_CONFIG.oauthUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: API_CONFIG.clientId,
      client_secret: API_CONFIG.clientSecret,
      scope: API_CONFIG.scope,
    }),
  });

  if (!response.ok) {
    throw new Error('Nepodarilo sa získať prístupový token');
  }

  const data = await response.json();
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return data.access_token;
}

// Vyčistenie token cache
export function clearTokenCache(): void {
  tokenCache = null;
}

// Fetch-based eCarUp API helper
async function fetchEcarup<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getEcarUpToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    ...(options.headers as Record<string, string> || {}),
  };

  let response = await fetch(`${API_CONFIG.baseUrl}${url}`, { ...options, headers });

  // Retry pri 401 s novým tokenom
  if (response.status === 401) {
    clearTokenCache();
    const newToken = await getEcarUpToken();
    headers.Authorization = `Bearer ${newToken}`;
    response = await fetch(`${API_CONFIG.baseUrl}${url}`, { ...options, headers });
  }

  if (!response.ok) {
    throw new Error(`eCarUp API error: ${response.status}`);
  }

  return response.json();
}

// Helper pre eCarUp API volania
export const ecarup = {
  get: <T>(url: string, params?: Record<string, unknown>) => {
    const searchParams = params ? '?' + new URLSearchParams(
      Object.entries(params).reduce((acc, [k, v]) => {
        if (v !== undefined && v !== null) acc[k] = String(v);
        return acc;
      }, {} as Record<string, string>)
    ).toString() : '';
    return fetchEcarup<T>(url + searchParams);
  },

  post: <T>(url: string, data?: unknown) =>
    fetchEcarup<T>(url, { method: 'POST', body: data ? JSON.stringify(data) : undefined }),

  put: <T>(url: string, data?: unknown) =>
    fetchEcarup<T>(url, { method: 'PUT', body: data ? JSON.stringify(data) : undefined }),

  delete: <T>(url: string) =>
    fetchEcarup<T>(url, { method: 'DELETE' }),
};
