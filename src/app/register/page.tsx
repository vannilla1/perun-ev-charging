'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts';
import { UserIcon, EmailIcon, LockIcon, EyeIcon, EyeOffIcon, BackIcon } from '@/components/Common';

export default function RegisterPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const { register, isLoading, isLoggedIn, error, clearError } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Presmerovanie ak je už prihlásený
  useEffect(() => {
    if (isLoggedIn) {
      router.push('/');
    }
  }, [isLoggedIn, router]);

  // Vyčistenie chyby pri zmene inputov
  const clearErrors = () => {
    if (formError) setFormError(null);
    if (error) clearError();
  };

  const validateForm = (): boolean => {
    if (!firstName.trim()) {
      setFormError('Zadajte meno');
      return false;
    }

    if (!lastName.trim()) {
      setFormError('Zadajte priezvisko');
      return false;
    }

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

    if (password !== confirmPassword) {
      setFormError('Heslá sa nezhodujú');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      await register(email, password, firstName, lastName);
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
        <div className="text-center" style={{ marginBottom: '32px' }}>
          <Image
            src="/images/perun-logo.png"
            alt="Perun Electromobility"
            width={200}
            height={83}
            className="h-14 sm:h-16 md:h-20 w-auto mx-auto"
            style={{ marginBottom: '16px' }}
            unoptimized
            priority
          />
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">Vytvoriť účet</h1>
          <p className="text-sm sm:text-base text-[var(--text-secondary)]" style={{ marginTop: '4px' }}>Registrujte sa do aplikácie</p>
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

              {/* Name inputs */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5 sm:mb-2">
                    Meno
                  </label>
                  <div className="relative">
                    <div
                      className="absolute inset-y-0 left-0 flex items-center pointer-events-none"
                      style={{ paddingLeft: '14px' }}
                    >
                      <UserIcon />
                    </div>
                    <input
                      type="text"
                      placeholder="Ján"
                      value={firstName}
                      onChange={(e) => { setFirstName(e.target.value); clearErrors(); }}
                      autoComplete="given-name"
                      disabled={isLoading}
                      className="w-full bg-[var(--surface-secondary)] border border-[var(--border)] rounded-xl sm:rounded-2xl text-sm sm:text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--perun-blue)] focus:border-transparent transition-all disabled:opacity-50"
                      style={{ paddingLeft: '44px', paddingRight: '14px', paddingTop: '12px', paddingBottom: '12px' }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5 sm:mb-2">
                    Priezvisko
                  </label>
                  <input
                    type="text"
                    placeholder="Novák"
                    value={lastName}
                    onChange={(e) => { setLastName(e.target.value); clearErrors(); }}
                    autoComplete="family-name"
                    disabled={isLoading}
                    className="w-full bg-[var(--surface-secondary)] border border-[var(--border)] rounded-xl sm:rounded-2xl text-sm sm:text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--perun-blue)] focus:border-transparent transition-all disabled:opacity-50"
                    style={{ padding: '12px 14px' }}
                  />
                </div>
              </div>

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
                    onChange={(e) => { setEmail(e.target.value); clearErrors(); }}
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
                    placeholder="Min. 6 znakov"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); clearErrors(); }}
                    autoComplete="new-password"
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

              {/* Confirm Password Input */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5 sm:mb-2">
                  {t('confirmPassword')}
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
                    placeholder="Zopakujte heslo"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); clearErrors(); }}
                    autoComplete="new-password"
                    disabled={isLoading}
                    className="w-full bg-[var(--surface-secondary)] border border-[var(--border)] rounded-xl sm:rounded-2xl text-sm sm:text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--perun-blue)] focus:border-transparent transition-all disabled:opacity-50"
                    style={{ paddingLeft: '44px', paddingRight: '14px', paddingTop: '12px', paddingBottom: '12px' }}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 sm:py-4 bg-gradient-to-r from-[var(--perun-green)] to-[var(--perun-green-dark)] text-white rounded-xl sm:rounded-2xl text-sm sm:text-base font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Registrujem...</span>
                  </>
                ) : (
                  t('register')
                )}
              </button>
            </form>

            {/* Terms */}
            <p
              className="text-xs sm:text-sm text-center text-[var(--text-muted)] leading-relaxed"
              style={{ marginTop: '20px' }}
            >
              Registráciou súhlasíte s{' '}
              <Link href="/terms" className="text-[var(--perun-blue)] hover:text-[var(--perun-blue-dark)] font-medium transition-colors">
                podmienkami používania
              </Link>{' '}
              a{' '}
              <Link href="/privacy" className="text-[var(--perun-blue)] hover:text-[var(--perun-blue-dark)] font-medium transition-colors">
                ochranou súkromia
              </Link>
            </p>
          </div>

          {/* Login Link */}
          <p
            className="text-center text-sm sm:text-base text-[var(--text-secondary)]"
            style={{ marginTop: '24px' }}
          >
            {t('hasAccount')}{' '}
            <Link href="/login" className="text-[var(--perun-blue)] font-semibold hover:text-[var(--perun-blue-dark)] transition-colors">
              {t('login')}
            </Link>
          </p>
        </div>
      </div>

      {/* Footer gradient line */}
      <div className="h-1 bg-gradient-to-r from-[var(--perun-blue)] via-[var(--perun-green)] to-[var(--perun-orange)]" />
    </div>
  );
}
