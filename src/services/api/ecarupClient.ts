import axios, { AxiosInstance, AxiosError } from 'axios';
import { API_CONFIG } from './config';

// eCarUp OAuth 2.0 Client Credentials Flow
interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

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

  // Skontroluj credentials
  if (!API_CONFIG.clientId || !API_CONFIG.clientSecret) {
    throw new Error('eCarUp API credentials nie sú nakonfigurované');
  }

  try {
    const response = await axios.post<OAuthTokenResponse>(
      API_CONFIG.oauthUrl,
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: API_CONFIG.clientId,
        client_secret: API_CONFIG.clientSecret,
        scope: API_CONFIG.scope,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, expires_in } = response.data;

    // Cache token
    tokenCache = {
      token: access_token,
      expiresAt: Date.now() + expires_in * 1000,
    };

    return access_token;
  } catch (error) {
    console.error('eCarUp OAuth chyba:', error);
    throw new Error('Nepodarilo sa získať prístupový token');
  }
}

// Vyčistenie token cache
export function clearTokenCache(): void {
  tokenCache = null;
}

// eCarUp API klient s automatickou autentifikáciou
export const ecarupClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.baseUrl,
  timeout: API_CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request interceptor - automatické pridanie tokenu
ecarupClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await getEcarUpToken();
      config.headers.Authorization = `Bearer ${token}`;
    } catch {
      // Ak nemáme token, pokračujeme bez neho (pre public endpointy)
      console.warn('Nepodarilo sa získať eCarUp token');
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - retry pri 401
ecarupClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config;

    if (error.response?.status === 401 && config && !config.headers['X-Retry']) {
      // Vyčisti cache a skús znova
      clearTokenCache();
      config.headers['X-Retry'] = 'true';

      try {
        const token = await getEcarUpToken();
        config.headers.Authorization = `Bearer ${token}`;
        return ecarupClient(config);
      } catch {
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

// Helper pre eCarUp API volania
export const ecarup = {
  get: <T>(url: string, params?: Record<string, unknown>) =>
    ecarupClient.get<T>(url, { params }).then((res) => res.data),

  post: <T>(url: string, data?: unknown) =>
    ecarupClient.post<T>(url, data).then((res) => res.data),

  put: <T>(url: string, data?: unknown) =>
    ecarupClient.put<T>(url, data).then((res) => res.data),

  delete: <T>(url: string) =>
    ecarupClient.delete<T>(url).then((res) => res.data),
};
