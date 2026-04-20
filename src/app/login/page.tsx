'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts';
import { EmailIcon, LockIcon, EyeIcon, EyeOffIcon, GoogleIcon, AppleIcon, BackIcon } from '@/components/Common';

export default function LoginPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const { login, isLoading, isLoggedIn, error, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Presmerovanie ak je už prihlásený
  useEffect(() => {
    if (isLoggedIn) {
      router.push('/');
    }
  }, [isLoggedIn, router]);

  // Vyčistenie chyby pri zmene inputov
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (formError) setFormError(null);
    if (error) clearError();
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (formError) setFormError(null);
    if (error) clearError();
  };

  const validateForm = (): boolean => {
    if (!email.trim()) {
      setFormError('Zadajte e-mailovú adresu');
      return false;
    }

    if (!email.includes('@')) {
      setFormError('Neplatná e-mailová adresa');
      return false;
    }

    if (!password) {
      setFormError('Zadajte heslo');
      return false;
    }

    if (password.length < 6) {
      setFormError('Heslo musí mať aspoň 6 znakov');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      await login(email, password);
      router.push('/');
    } catch {
      // Chyba je spracovaná v AuthContext
    }
  };

  const displayError = formError || error;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-[var(--surface-secondary)] flex flex-col">
      {/* Header s back button */}
      <div style={{ padding: '24px 16px 0 16px' }}>
        <button
          onClick={() => router.back()}
          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-full hover:bg-[var(--surface-secondary)] transition-colors flex items-center justify-center"
          style={{ width: '44px', height: '44px' }}
        >
          <BackIcon />
        </button>
      </div>

      {/* Content */}
      <div
        className="flex-1 flex flex-col items-center justify-center"
        style={{ padding: '16px 16px 32px 16px' }}
      >
        {/* Logo */}
        <div className="text-center" style={{ marginBottom: '40px' }}>
          <Image
            src="/images/perun-logo.png"
            alt="Perun Electromobility"
            width={220}
            height={91}
            className="h-16 sm:h-20 md:h-24 w-auto mx-auto"
            style={{ marginBottom: '24px' }}
            unoptimized
            priority
          />
          <p className="text-sm sm:text-base text-[var(--text-secondary)]">Prihláste sa do aplikácie</p>
        </div>

        {/* Form Card */}
        <div className="w-full max-w-sm sm:max-w-md">
          <div
            className="bg-white rounded-2xl sm:rounded-3xl shadow-lg border border-[var(--border-light)]"
            style={{ padding: '24px' }}
          >
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {displayError && (
                <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                  {displayError}
                </div>
              )}

              {/* Email Input */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5 sm:mb-2">
                  {t('email')}
                </label>
                <div className="relative">
                  <div
                    className="absolute inset-y-0 left-0 flex items-center pointer-events-none"
                    style={{ paddingLeft: '14px' }}
                  >
                    <EmailIcon />
                  </div>
                  <input
                    type="email"
                    placeholder="vas@email.sk"
                    value={email}
                    onChange={handleEmailChange}
                    autoComplete="email"
                    disabled={isLoading}
                    className="w-full bg-[var(--surface-secondary)] border border-[var(--border)] rounded-xl sm:rounded-2xl text-sm sm:text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--perun-blue)] focus:border-transparent transition-all disabled:opacity-50"
                    style={{ paddingLeft: '44px', paddingRight: '14px', paddingTop: '12px', paddingBottom: '12px' }}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5 sm:mb-2">
                  {t('password')}
                </label>
                <div className="relative">
                  <div
                    className="absolute inset-y-0 left-0 flex items-center pointer-events-none"
                    style={{ paddingLeft: '14px' }}
                  >
                    <LockIcon />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={handlePasswordChange}
                    autoComplete="current-password"
                    disabled={isLoading}
                    className="w-full bg-[var(--surface-secondary)] border border-[var(--border)] rounded-xl sm:rounded-2xl text-sm sm:text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--perun-blue)] focus:border-transparent transition-all disabled:opacity-50"
                    style={{ paddingLeft: '44px', paddingRight: '48px', paddingTop: '12px', paddingBottom: '12px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                    style={{ paddingRight: '14px' }}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              {/* Forgot Password */}
              <div className="text-right">
                <Link
                  href="/forgot-password"
                  className="text-sm text-[var(--perun-blue)] hover:text-[var(--perun-blue-dark)] font-medium transition-colors"
                >
                  {t('forgotPassword')}
                </Link>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 sm:py-4 bg-gradient-to-r from-[var(--perun-blue)] to-[var(--perun-blue-dark)] text-white rounded-xl sm:rounded-2xl text-sm sm:text-base font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Prihlasujem...</span>
                  </>
                ) : (
                  t('login')
                )}
              </button>
            </form>

            {/* Divider */}
            <div
              className="flex items-center"
              style={{ margin: '24px 0', gap: '16px' }}
            >
              <div className="flex-1 h-px bg-[var(--border)]" />
              <span className="text-xs sm:text-sm text-[var(--text-muted)]">alebo</span>
              <div className="flex-1 h-px bg-[var(--border)]" />
            </div>

            {/* Social Login */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                type="button"
                className="w-full py-3 sm:py-3.5 bg-white border-2 border-[var(--border)] hover:border-[var(--perun-blue)] rounded-xl sm:rounded-2xl text-sm sm:text-base font-medium text-[var(--text-primary)] transition-all flex items-center justify-center gap-2 sm:gap-3"
              >
                <GoogleIcon />
                {t('loginWithGoogle')}
              </button>

              <button
                type="button"
                className="w-full py-3 sm:py-3.5 bg-white border-2 border-[var(--border)] hover:border-[var(--perun-blue)] rounded-xl sm:rounded-2xl text-sm sm:text-base font-medium text-[var(--text-primary)] transition-all flex items-center justify-center gap-2 sm:gap-3"
              >
                <AppleIcon />
                {t('loginWithApple')}
              </button>
            </div>
          </div>

          {/* Register Link */}
          <p
            className="text-center text-sm sm:text-base text-[var(--text-secondary)]"
            style={{ marginTop: '32px' }}
          >
            {t('noAccount')}{' '}
            <Link href="/register" className="text-[var(--perun-blue)] font-semibold hover:text-[var(--perun-blue-dark)] transition-colors">
              {t('register')}
            </Link>
          </p>
        </div>
      </div>

      {/* Footer gradient line */}
      <div className="h-1 bg-gradient-to-r from-[var(--perun-blue)] via-[var(--perun-green)] to-[var(--perun-orange)]" />
    </div>
  );
}
