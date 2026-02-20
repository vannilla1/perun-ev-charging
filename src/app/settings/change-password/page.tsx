'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout, PageHeader } from '@/components/Layout';
import { useAuth } from '@/contexts';

const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-[var(--perun-green)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default function ChangePasswordPage() {
  const router = useRouter();
  const { isLoggedIn } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Presmerovanie ak nie je prihlásený
  if (!isLoggedIn) {
    router.push('/login');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validácia
    if (!currentPassword) {
      setError('Zadajte aktuálne heslo');
      return;
    }

    if (!newPassword) {
      setError('Zadajte nové heslo');
      return;
    }

    if (newPassword.length < 6) {
      setError('Nové heslo musí mať aspoň 6 znakov');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Nové heslá sa nezhodujú');
      return;
    }

    if (currentPassword === newPassword) {
      setError('Nové heslo musí byť odlišné od aktuálneho');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Nepodarilo sa zmeniť heslo');
      }

      setIsSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodarilo sa zmeniť heslo');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <AppLayout
        header={<PageHeader title="Zmena hesla" showBack />}
      >
        <div
          className="max-w-lg mx-auto"
          style={{ padding: '32px 16px 24px 16px' }}
        >
          <div
            className="auth-card text-center"
            style={{ padding: '48px 24px' }}
          >
            <div className="animate-success-pop" style={{ marginBottom: '24px' }}>
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                style={{
                  background: 'rgba(0, 255, 136, 0.1)',
                  boxShadow: '0 0 30px rgba(0, 255, 136, 0.15)',
                }}
              >
                <CheckIcon />
              </div>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold" style={{ marginBottom: '12px', color: 'var(--text-primary)' }}>
              Heslo zmenené
            </h2>
            <p className="text-sm sm:text-base" style={{ marginBottom: '32px', color: 'var(--text-secondary)' }}>
              Vaše heslo bolo úspešne zmenené.
            </p>
            <button
              onClick={() => router.push('/profile')}
              className="w-full py-3.5 sm:py-4 rounded-[var(--border-radius)] text-sm sm:text-base font-semibold transition-all btn-hover-primary"
              style={{
                background: 'linear-gradient(135deg, #00D4FF 0%, #0088CC 100%)',
                color: '#080C14',
                boxShadow: '0 4px 20px -2px rgba(0, 212, 255, 0.35)',
              }}
            >
              Späť na profil
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      header={<PageHeader title="Zmena hesla" showBack />}
    >
      <div
        className="max-w-lg mx-auto"
        style={{ padding: '32px 16px 24px 16px' }}
      >
        <div
          className="auth-card"
          style={{ padding: '24px' }}
        >
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {error && (
              <div className="auth-error">
                {error}
              </div>
            )}

            {/* Current Password */}
            <div>
              <label className="block text-sm font-medium mb-1.5 sm:mb-2" style={{ color: 'var(--text-secondary)' }}>
                Aktuálne heslo
              </label>
              <div className="relative">
                <div
                  className="absolute inset-y-0 left-0 flex items-center pointer-events-none"
                  style={{ paddingLeft: '14px' }}
                >
                  <LockIcon />
                </div>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  autoComplete="current-password"
                  disabled={isLoading}
                  className="auth-input"
                  style={{ paddingLeft: '44px', paddingRight: '14px', paddingTop: '12px', paddingBottom: '12px' }}
                />
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium mb-1.5 sm:mb-2" style={{ color: 'var(--text-secondary)' }}>
                Nové heslo
              </label>
              <div className="relative">
                <div
                  className="absolute inset-y-0 left-0 flex items-center pointer-events-none"
                  style={{ paddingLeft: '14px' }}
                >
                  <LockIcon />
                </div>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  placeholder="Min. 6 znakov"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  autoComplete="new-password"
                  disabled={isLoading}
                  className="auth-input"
                  style={{ paddingLeft: '44px', paddingRight: '48px', paddingTop: '12px', paddingBottom: '12px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="absolute inset-y-0 right-0 flex items-center text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                  style={{ paddingRight: '14px' }}
                >
                  {showPasswords ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium mb-1.5 sm:mb-2" style={{ color: 'var(--text-secondary)' }}>
                Potvrďte nové heslo
              </label>
              <div className="relative">
                <div
                  className="absolute inset-y-0 left-0 flex items-center pointer-events-none"
                  style={{ paddingLeft: '14px' }}
                >
                  <LockIcon />
                </div>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  placeholder="Zopakujte heslo"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  autoComplete="new-password"
                  disabled={isLoading}
                  className="auth-input"
                  style={{ paddingLeft: '44px', paddingRight: '14px', paddingTop: '12px', paddingBottom: '12px' }}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 sm:py-4 rounded-[var(--border-radius)] text-sm sm:text-base font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 btn-hover-primary"
              style={{
                marginTop: '12px',
                background: 'linear-gradient(135deg, #00D4FF 0%, #0088CC 100%)',
                color: '#080C14',
                boxShadow: '0 4px 20px -2px rgba(0, 212, 255, 0.35)',
              }}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Mením heslo...</span>
                </>
              ) : (
                'Zmeniť heslo'
              )}
            </button>
          </form>
        </div>

        {/* Help text */}
        <p
          className="text-center text-sm text-[var(--text-muted)]"
          style={{ marginTop: '24px' }}
        >
          Heslo musí mať aspoň 6 znakov a odporúčame použiť kombináciu písmen, čísiel a špeciálnych znakov.
        </p>
      </div>
    </AppLayout>
  );
}
