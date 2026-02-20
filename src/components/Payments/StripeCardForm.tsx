'use client';

import React, { useState } from 'react';
import {
  useStripe,
  useElements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
} from '@stripe/react-stripe-js';
import { Button } from '@/components/Common';

interface StripeCardFormProps {
  clientSecret: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: '#E8EDF5',
      fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      fontSmoothing: 'antialiased',
      fontSize: '16px',
      '::placeholder': {
        color: '#4A5E7A',
      },
    },
    invalid: {
      color: '#FF3D71',
      iconColor: '#FF3D71',
    },
  },
};

export function StripeCardForm({ clientSecret, onSuccess, onCancel }: StripeCardFormProps) {
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
      setError('Chyba pri načítaní formulára');
      setIsProcessing(false);
      return;
    }

    const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
      payment_method: {
        card: cardNumberElement,
      },
    });

    if (stripeError) {
      setError(stripeError.message || 'Nastala chyba pri ukladaní karty');
      setIsProcessing(false);
      return;
    }

    if (setupIntent?.status === 'succeeded') {
      onSuccess();
    } else {
      setError('Nepodarilo sa uložiť kartu. Skúste to znova.');
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: '20px' }}>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          Číslo karty
        </label>
        <div className="stripe-element-dark">
          <CardNumberElement options={CARD_ELEMENT_OPTIONS} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
        <div style={{ flex: 1 }}>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Platnosť
          </label>
          <div className="stripe-element-dark">
            <CardExpiryElement options={CARD_ELEMENT_OPTIONS} />
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            CVC
          </label>
          <div className="stripe-element-dark">
            <CardCvcElement options={CARD_ELEMENT_OPTIONS} />
          </div>
        </div>
      </div>

      {error && (
        <div className="auth-error" style={{ marginBottom: '16px' }}>
          {error}
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
          Zrušiť
        </Button>
        <Button
          type="submit"
          fullWidth
          disabled={!stripe || isProcessing}
        >
          {isProcessing ? 'Ukladám...' : 'Uložiť kartu'}
        </Button>
      </div>

      <p className="text-xs text-center text-[var(--text-muted)] mt-4">
        🔒 Platobné údaje sú spracované bezpečne cez Stripe
      </p>
    </form>
  );
}
