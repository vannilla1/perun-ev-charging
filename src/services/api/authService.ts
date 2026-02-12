import axios from 'axios';
import { API_CONFIG } from './config';
import { setAccessToken, removeAccessToken } from './client';
import type { ECarUpTokenResponse, User } from '@/types';

interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
}

interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

interface RegisterResponse {
  user: User;
  message?: string;
  tokens: AuthTokens | null;
}

// OAuth 2.0 Client Credentials Flow (pre API volania bez používateľa)
export async function getAccessToken(): Promise<AuthTokens> {
  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', API_CONFIG.clientId);
    params.append('client_secret', API_CONFIG.clientSecret);
    params.append('scope', API_CONFIG.scope);

    const response = await axios.post<ECarUpTokenResponse>(
      API_CONFIG.oauthUrl,
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const tokens: AuthTokens = {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in,
      tokenType: response.data.token_type,
    };

    setAccessToken(tokens.accessToken);

    if (tokens.refreshToken && typeof window !== 'undefined') {
      localStorage.setItem('refreshToken', tokens.refreshToken);
    }

    if (typeof window !== 'undefined') {
      const expiresAt = Date.now() + tokens.expiresIn * 1000;
      localStorage.setItem('tokenExpiresAt', expiresAt.toString());
    }

    return tokens;
  } catch (error) {
    console.error('Failed to get access token:', error);
    throw error;
  }
}

// Refresh token
export async function refreshToken(): Promise<AuthTokens | null> {
  if (typeof window === 'undefined') return null;

  const storedRefreshToken = localStorage.getItem('refreshToken');
  if (!storedRefreshToken) return null;

  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken: storedRefreshToken }),
    });

    if (!response.ok) {
      logout();
      return null;
    }

    const data = await response.json();
    const tokens = data.tokens as AuthTokens;

    setAccessToken(tokens.accessToken);

    if (tokens.refreshToken) {
      localStorage.setItem('refreshToken', tokens.refreshToken);
    }

    const expiresAt = Date.now() + tokens.expiresIn * 1000;
    localStorage.setItem('tokenExpiresAt', expiresAt.toString());

    return tokens;
  } catch (error) {
    console.error('Failed to refresh token:', error);
    logout();
    return null;
  }
}

// Kontrola či token expiroval
export function isTokenExpired(): boolean {
  if (typeof window === 'undefined') return true;

  const expiresAt = localStorage.getItem('tokenExpiresAt');
  if (!expiresAt) return true;

  // Pridať 60 sekúnd buffer
  return Date.now() > parseInt(expiresAt) - 60000;
}

// Login používateľa cez API route
export async function login(email: string, password: string): Promise<User> {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Prihlásenie zlyhalo');
    }

    const { user, tokens } = data as LoginResponse;

    // Uloženie tokenov
    if (tokens) {
      setAccessToken(tokens.accessToken);

      if (typeof window !== 'undefined') {
        if (tokens.refreshToken) {
          localStorage.setItem('refreshToken', tokens.refreshToken);
        }
        const expiresAt = Date.now() + tokens.expiresIn * 1000;
        localStorage.setItem('tokenExpiresAt', expiresAt.toString());
      }
    }

    // Uloženie používateľa
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(user));
    }

    return user;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

// Registrácia používateľa
export async function register(
  email: string,
  password: string,
  firstName: string,
  lastName: string
): Promise<User> {
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, firstName, lastName }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Registrácia zlyhala');
    }

    const { user, tokens } = data as RegisterResponse;

    // Uloženie tokenov ak existujú
    if (tokens) {
      setAccessToken(tokens.accessToken);

      if (typeof window !== 'undefined') {
        if (tokens.refreshToken) {
          localStorage.setItem('refreshToken', tokens.refreshToken);
        }
        const expiresAt = Date.now() + tokens.expiresIn * 1000;
        localStorage.setItem('tokenExpiresAt', expiresAt.toString());
      }
    }

    // Uloženie používateľa
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(user));
    }

    return user;
  } catch (error) {
    console.error('Registration failed:', error);
    throw error;
  }
}

// Logout
export function logout(): void {
  removeAccessToken();
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tokenExpiresAt');
  }
}

// Získanie aktuálneho používateľa
export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;

  const userJson = localStorage.getItem('user');
  if (!userJson) return null;

  try {
    return JSON.parse(userJson) as User;
  } catch {
    return null;
  }
}

// Kontrola či je používateľ prihlásený
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;

  const user = localStorage.getItem('user');
  return !!user;
}

// Overenie či má používateľ platný token
export function hasValidToken(): boolean {
  if (typeof window === 'undefined') return false;

  const token = localStorage.getItem('accessToken');
  return !!token && !isTokenExpired();
}

// Automatická obnova tokenu ak je potrebné
export async function ensureValidToken(): Promise<boolean> {
  if (!isAuthenticated()) return false;

  if (isTokenExpired()) {
    const newTokens = await refreshToken();
    return !!newTokens;
  }

  return true;
}
