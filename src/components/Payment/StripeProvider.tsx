'use client';

import React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { Locale } from '@/i18n/config';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe, Stripe, StripeError } from '@stripe/stripe-js';

// Lazy load Stripe — jedna inštancia na jazyk, aby texty Stripe nasledovali prepínač jazyka
const stripePromises: Partial<Record<Locale, Promise<Stripe | null>>> = {};

const getStripe = (locale: Locale) => {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey) {
    console.error('Stripe publishable key is not set');
    return null;
  }
  return (stripePromises[locale] ??= loadStripe(publishableKey, { locale }));
};

export const stripeErrorMessage = (error: StripeError, fallback: string): string =>
  (error.type === 'card_error' || error.type === 'validation_error') && error.message ? error.message : fallback;

interface StripeProviderProps {
  children: React.ReactNode;
  clientSecret?: string;
}

export function StripeProvider({ children, clientSecret }: StripeProviderProps) {
  const t = useTranslations('payment');
  const locale = useLocale();
  const stripe = getStripe(locale);

  if (!stripe) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
        <p className="text-sm text-yellow-700">
          {t('notConfigured')}
        </p>
      </div>
    );
  }

  const options = clientSecret
    ? {
        clientSecret,
        locale,
        appearance: {
          theme: 'stripe' as const,
          variables: {
            colorPrimary: '#0099D8',
            colorText: '#1a1a1a',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            borderRadius: '12px',
          },
        },
      }
    : { locale };

  return (
    <Elements stripe={stripe} options={options}>
      {children}
    </Elements>
  );
}
