'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  useStripe,
  useElements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
} from '@stripe/react-stripe-js';
import { Button } from '@/components/Common';
import { stripeErrorMessage } from './StripeProvider';

interface StripeCardFormProps {
  clientSecret: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: '#1a1a1a',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      fontSmoothing: 'antialiased',
      fontSize: '16px',
      '::placeholder': {
        color: '#9ca3af',
      },
    },
    invalid: {
      color: '#ef4444',
      iconColor: '#ef4444',
    },
  },
};

export function StripeCardForm({ clientSecret, onSuccess, onCancel }: StripeCardFormProps) {
  const t = useTranslations('payment');
  const tCommon = useTranslations('common');
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    const cardNumberElement = elements.getElement(CardNumberElement);

    if (!cardNumberElement) {
      setError(t('stripeForm.formLoadError'));
      setIsProcessing(false);
      return;
    }

    const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
      payment_method: {
        card: cardNumberElement,
      },
    });

    if (stripeError) {
      setError(stripeErrorMessage(stripeError, t('stripeForm.saveError')));
      setIsProcessing(false);
      return;
    }

    if (setupIntent?.status === 'succeeded') {
      onSuccess();
    } else {
      setError(t('stripeForm.saveFailed'));
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: '20px' }}>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          {t('card.number')}
        </label>
        <div className="p-3 border border-[var(--border)] rounded-xl bg-white focus-within:border-[var(--perun-blue)] focus-within:ring-2 focus-within:ring-[var(--perun-blue)]/20 transition-all">
          <CardNumberElement options={CARD_ELEMENT_OPTIONS} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
        <div style={{ flex: 1 }}>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            {t('card.expiry')}
          </label>
          <div className="p-3 border border-[var(--border)] rounded-xl bg-white focus-within:border-[var(--perun-blue)] focus-within:ring-2 focus-within:ring-[var(--perun-blue)]/20 transition-all">
            <CardExpiryElement options={CARD_ELEMENT_OPTIONS} />
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            {t('card.cvc')}
          </label>
          <div className="p-3 border border-[var(--border)] rounded-xl bg-white focus-within:border-[var(--perun-blue)] focus-within:ring-2 focus-within:ring-[var(--perun-blue)]/20 transition-all">
            <CardCvcElement options={CARD_ELEMENT_OPTIONS} />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl mb-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px' }}>
        <Button
          type="button"
          variant="outline"
          fullWidth
          onClick={onCancel}
          disabled={isProcessing}
        >
          {tCommon('cancel')}
        </Button>
        <Button
          type="submit"
          fullWidth
          disabled={!stripe || isProcessing}
        >
          {isProcessing ? t('stripeForm.saving') : t('stripeForm.save')}
        </Button>
      </div>

      <p className="text-xs text-center text-[var(--text-muted)] mt-4">
        🔒 {t('securedByStripe')}
      </p>
    </form>
  );
}
