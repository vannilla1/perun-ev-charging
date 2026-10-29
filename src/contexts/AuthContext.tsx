'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { login as apiLogin, register as apiRegister, logout as apiLogout, getCurrentUser, isAuthenticated, AuthApiError } from '@/services/api/authService';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  /** Prihlásenie už bolo načítané z localStorage (po hydratácii). */
  isReady: boolean;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => void;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations('auth');
  // localStorage sa číta až po hydratácii — server ho nevidí, inak by sa
  // HTML zo servera nezhodovalo s prvým vykreslením v prehliadači
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Inicializácia - kontrola či je používateľ prihlásený
  useEffect(() => {
    if (!isInitialized) {
      const currentUser = getCurrentUser();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage je dostupný až po hydratácii (inak nezhoda servera a prehliadača)
      setUser(currentUser);
      setIsInitialized(true);
    }
  }, [isInitialized]);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const loggedInUser = await apiLogin(email, password);
      setUser(loggedInUser);
    } catch (err) {
      const message = err instanceof AuthApiError ? err.message : t('loginFailed');
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  const register = useCallback(async (email: string, password: string, firstName: string, lastName: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const newUser = await apiRegister(email, password, firstName, lastName);
      setUser(newUser);
    } catch (err) {
      const message = err instanceof AuthApiError ? err.message : t('registerFailed');
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  const logout = useCallback(() => {
    apiLogout();
    setUser(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Refresh user state z localStorage (po profile update, atď.)
  const refreshUser = useCallback(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isReady: isInitialized,
    isLoggedIn: !!user,
    login,
    register,
    logout,
    refreshUser,
    error,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
