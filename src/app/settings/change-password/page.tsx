'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout, PageHeader } from '@/components/Layout';
import { LockIcon, EyeIcon, EyeOffIcon, CheckIcon } from '@/components/Common';
import { useAuth } from '@/contexts';

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
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
            className="bg-white rounded-2xl sm:rounded-3xl shadow-lg border border-[var(--border-light)] text-center"
            style={{ padding: '48px 24px' }}
          >
            <div style={{ marginBottom: '24px' }} className="flex justify-center">
              <CheckIcon />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]" style={{ marginBottom: '12px' }}>
              Heslo zmenené
            </h2>
            <p className="text-sm sm:text-base text-[var(--text-secondary)]" style={{ marginBottom: '32px' }}>
              Vaše heslo bolo úspešne zmenené.
            </p>
            <button
              onClick={() => router.push('/profile')}
              className="w-full py-3.5 sm:py-4 bg-gradient-to-r from-[var(--perun-blue)] to-[var(--perun-blue-dark)] text-white rounded-xl sm:rounded-2xl text-sm sm:text-base font-semibold shadow-lg hover:shadow-xl transition-all"
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
          className="bg-white rounded-2xl sm:rounded-3xl shadow-lg border border-[var(--border-light)]"
          style={{ padding: '24px' }}
        >
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {error && (
              <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                {error}
              </div>
            )}

            {/* Current Password */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5 sm:mb-2">
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
                  className="w-full bg-[var(--surface-secondary)] border border-[var(--border)] rounded-xl sm:rounded-2xl text-sm sm:text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--perun-blue)] focus:border-transparent transition-all disabled:opacity-50"
                  style={{ paddingLeft: '44px', paddingRight: '14px', paddingTop: '12px', paddingBottom: '12px' }}
                />
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5 sm:mb-2">
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
                  className="w-full bg-[var(--surface-secondary)] border border-[var(--border)] rounded-xl sm:rounded-2xl text-sm sm:text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--perun-blue)] focus:border-transparent transition-all disabled:opacity-50"
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
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5 sm:mb-2">
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
                  className="w-full bg-[var(--surface-secondary)] border border-[var(--border)] rounded-xl sm:rounded-2xl text-sm sm:text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--perun-blue)] focus:border-transparent transition-all disabled:opacity-50"
                  style={{ paddingLeft: '44px', paddingRight: '14px', paddingTop: '12px', paddingBottom: '12px' }}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 sm:py-4 bg-gradient-to-r from-[var(--perun-blue)] to-[var(--perun-blue-dark)] text-white rounded-xl sm:rounded-2xl text-sm sm:text-base font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ marginTop: '12px' }}
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
