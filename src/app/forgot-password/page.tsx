'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

const EmailIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const BackIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-[var(--perun-green)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Zadajte e-mailovú adresu');
      return;
    }

    if (!email.includes('@')) {
      setError('Neplatná e-mailová adresa');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Nepodarilo sa odoslať žiadosť');
      }

      setIsSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodarilo sa odoslať žiadosť');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-[var(--surface-secondary)] flex flex-col">
        <div style={{ padding: '24px 16px 0 16px' }}>
          <button
            onClick={() => router.push('/login')}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-full hover:bg-[var(--surface-secondary)] transition-colors flex items-center justify-center"
            style={{ width: '44px', height: '44px' }}
          >
            <BackIcon />
          </button>
        </div>

        <div
          className="flex-1 flex flex-col items-center justify-center"
          style={{ padding: '16px 16px 32px 16px' }}
        >
          <div className="w-full max-w-sm sm:max-w-md text-center">
            <div
              className="bg-white rounded-2xl sm:rounded-3xl shadow-lg border border-[var(--border-light)]"
              style={{ padding: '48px 24px' }}
            >
              <div style={{ marginBottom: '24px' }}>
                <CheckIcon />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]" style={{ marginBottom: '12px' }}>
                Email odoslaný
              </h1>
              <p className="text-sm sm:text-base text-[var(--text-secondary)]" style={{ marginBottom: '32px' }}>
                Ak existuje účet s emailom <strong>{email}</strong>, poslali sme vám inštrukcie na obnovenie hesla.
              </p>
              <button
                onClick={() => router.push('/login')}
                className="w-full py-3.5 sm:py-4 bg-gradient-to-r from-[var(--perun-blue)] to-[var(--perun-blue-dark)] text-white rounded-xl sm:rounded-2xl text-sm sm:text-base font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                Späť na prihlásenie
              </button>
            </div>

            <p
              className="text-sm text-[var(--text-muted)]"
              style={{ marginTop: '24px' }}
            >
              Neprišiel email? Skontrolujte spam alebo{' '}
              <button
                onClick={() => setIsSubmitted(false)}
                className="text-[var(--perun-blue)] font-medium hover:text-[var(--perun-blue-dark)] transition-colors"
              >
                skúste znova
              </button>
            </p>
          </div>
        </div>

        <div className="h-1 bg-gradient-to-r from-[var(--perun-blue)] via-[var(--perun-green)] to-[var(--perun-orange)]" />
      </div>
    );
  }

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
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]" style={{ marginBottom: '8px' }}>
            Zabudnuté heslo
          </h1>
          <p className="text-sm sm:text-base text-[var(--text-secondary)]">
            Zadajte email a pošleme vám inštrukcie
          </p>
        </div>

        {/* Form Card */}
        <div className="w-full max-w-sm sm:max-w-md">
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

              {/* Email Input */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5 sm:mb-2">
                  E-mailová adresa
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
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    autoComplete="email"
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
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Odosielam...</span>
                  </>
                ) : (
                  'Obnoviť heslo'
                )}
              </button>
            </form>
          </div>

          {/* Back to Login */}
          <p
            className="text-center text-sm sm:text-base text-[var(--text-secondary)]"
            style={{ marginTop: '32px' }}
          >
            Spomenuli ste si?{' '}
            <Link href="/login" className="text-[var(--perun-blue)] font-semibold hover:text-[var(--perun-blue-dark)] transition-colors">
              Prihlásiť sa
            </Link>
          </p>
        </div>
      </div>

      {/* Footer gradient line */}
      <div className="h-1 bg-gradient-to-r from-[var(--perun-blue)] via-[var(--perun-green)] to-[var(--perun-orange)]" />
    </div>
  );
}
