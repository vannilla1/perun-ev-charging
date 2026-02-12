import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_CONFIG, HTTP_STATUS } from './config';
import { isDemoMode as checkDemoMode, clearTokenCache } from './oauth';

// Rozšírenie AxiosRequestConfig o custom vlastnosti
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _retryCount?: number;
}

// Re-export isDemoMode z oauth modulu
export const isDemoMode = checkDemoMode;

// Vytvorenie Axios instance - používame lokálne API proxy pre CORS
export const apiClient: AxiosInstance = axios.create({
  baseURL: '', // Prázdne = lokálne API routes
  timeout: API_CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

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

// Request interceptor - pre lokálne API routes nepotrebujeme OAuth
// OAuth sa rieši na server-side v API routes
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Pre lokálne API routes nepridávame OAuth token
    // Token sa pridáva na server-side v /api/ecarup/* routes
    const userToken = getUserToken();
    if (userToken) {
      config.headers.Authorization = `Bearer ${userToken}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - error handling a retry logic
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as CustomAxiosRequestConfig;

    // Ak nie je config, rovno reject
    if (!config) {
      return Promise.reject(error);
    }

    // Handle 401 Unauthorized - vyčistiť token cache
    if (error.response?.status === HTTP_STATUS.UNAUTHORIZED) {
      clearTokenCache();
      removeAccessToken();
      return Promise.reject(error);
    }

    // Retry logic pre network errors
    if (!error.response && !config._retry) {
      config._retry = true;
      config._retryCount = (config._retryCount || 0) + 1;

      if (config._retryCount <= API_CONFIG.retryAttempts) {
        // Čakať pred retry
        await new Promise((resolve) => setTimeout(resolve, API_CONFIG.retryDelay));
        return apiClient(config);
      }
    }

    return Promise.reject(error);
  }
);

// Helper funkcie pre API volania
export const api = {
  get: <T>(url: string, params?: Record<string, unknown>) =>
    apiClient.get<T>(url, { params }).then((res) => res.data),

  post: <T>(url: string, data?: unknown) =>
    apiClient.post<T>(url, data).then((res) => res.data),

  put: <T>(url: string, data?: unknown) =>
    apiClient.put<T>(url, data).then((res) => res.data),

  patch: <T>(url: string, data?: unknown) =>
    apiClient.patch<T>(url, data).then((res) => res.data),

  delete: <T>(url: string) =>
    apiClient.delete<T>(url).then((res) => res.data),
};

export { setAccessToken, removeAccessToken, getUserToken as getAccessToken };
