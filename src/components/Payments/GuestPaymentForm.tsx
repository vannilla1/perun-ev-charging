'use client';

import React, { useState, useEffect } from 'react';
import {
  useStripe,
  useElements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  PaymentRequestButtonElement,
} from '@stripe/react-stripe-js';
import { PaymentRequest } from '@stripe/stripe-js';
import { Button } from '@/components/Common';

interface StationInfo {
  name: string;
  address: string;
  pricePerKwh: number;
}

interface GuestPaymentFormProps {
  clientSecret: string;
  preAuthAmount: number;
  stationInfo: StationInfo;
  onPaymentConfirmed: (paymentIntentId: string, email: string) => void;
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

export function GuestPaymentForm({
  clientSecret,
  preAuthAmount,
  stationInfo,
  onPaymentConfirmed,
  onCancel,
}: GuestPaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [canMakePayment, setCanMakePayment] = useState(false);

  // Initialize Apple Pay / Google Pay
  useEffect(() => {
    if (!stripe) return;

    const pr = stripe.paymentRequest({
      country: 'SK',
      currency: 'eur',
      total: {
        label: `Nabíjanie - ${stationInfo.name}`,
        amount: Math.round(preAuthAmount * 100),
      },
      requestPayerEmail: true,
    });

    pr.canMakePayment().then((result) => {
      if (result) {
        setPaymentRequest(pr);
        setCanMakePayment(true);
      }
    });

    pr.on('paymentmethod', async (ev) => {
      if (!stripe) {
        ev.complete('fail');
        return;
      }

      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        { payment_method: ev.paymentMethod.id },
        { handleActions: false }
      );

      if (confirmError) {
        ev.complete('fail');
        setError(confirmError.message || 'Platba zlyhala');
        return;
      }

      ev.complete('success');

      if (paymentIntent?.status === 'requires_capture') {
        onPaymentConfirmed(paymentIntent.id, ev.payerEmail || '');
      } else if (paymentIntent?.status === 'requires_action') {
        const { error: actionError } = await stripe.confirmCardPayment(clientSecret);
        if (actionError) {
          setError(actionError.message || 'Overenie zlyhalo');
        } else {
          onPaymentConfirmed(paymentIntent.id, ev.payerEmail || '');
        }
      }
    });
  }, [stripe, clientSecret, preAuthAmount, stationInfo.name, onPaymentConfirmed]);

  const validateEmail = (emailValue: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailValue) {
      setEmailError('Email je povinný');
      return false;
    }
    if (!emailRegex.test(emailValue)) {
      setEmailError('Neplatný formát emailu');
      return false;
    }
    setEmailError(null);
    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    if (!validateEmail(email)) {
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

    const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
      clientSecret,
      {
        payment_method: {
          card: cardNumberElement,
          billing_details: {
            email,
          },
        },
        receipt_email: email,
      }
    );

    if (stripeError) {
      setError(stripeError.message || 'Nastala chyba pri platbe');
      setIsProcessing(false);
      return;
    }

    if (paymentIntent?.status === 'requires_capture') {
      // Predautorizácia úspešná
      onPaymentConfirmed(paymentIntent.id, email);
    } else {
      setError('Nepodarilo sa autorizovať platbu. Skúste to znova.');
    }

    setIsProcessing(false);
  };

  return (
    <div className="space-y-6">
      {/* Station Info Summary */}
      <div className="bg-[var(--card-alt)] rounded-2xl p-4">
        <h3 className="font-semibold text-[var(--text-primary)] mb-2">
          {stationInfo.name}
        </h3>
        <p className="text-sm text-[var(--text-secondary)] mb-3">
          {stationInfo.address}
        </p>
        <div className="flex justify-between items-center pt-3 border-t border-[var(--border)]">
          <span className="text-sm text-[var(--text-secondary)]">Cena za kWh</span>
          <span className="font-semibold text-[var(--text-primary)]">
            {stationInfo.pricePerKwh.toFixed(2)} EUR
          </span>
        </div>
      </div>

      {/* Pre-authorization Info */}
      <div className="info-box-blue rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0, 212, 255, 0.15)', color: '#00D4FF' }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div>
            <h4 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Predautorizácia</h4>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Na vašej karte bude dočasne zablokovaná suma{' '}
              <strong style={{ color: 'var(--primary)' }}>{preAuthAmount.toFixed(2)} EUR</strong>.
              Po ukončení nabíjania bude strhnutá len skutočná suma.
            </p>
          </div>
        </div>
      </div>

      {/* Apple Pay / Google Pay */}
      {canMakePayment && paymentRequest && (
        <div className="space-y-3">
          <PaymentRequestButtonElement
            options={{
              paymentRequest,
              style: {
                paymentRequestButton: {
                  type: 'default',
                  theme: 'dark',
                  height: '48px',
                },
              },
            }}
          />
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-sm text-[var(--text-muted)]">alebo platobnou kartou</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>
        </div>
      )}

      {/* Card Form */}
      <form onSubmit={handleSubmit}>
        {/* Email */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Email (pre potvrdenie)
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) validateEmail(e.target.value);
            }}
            onBlur={() => validateEmail(email)}
            placeholder="vas@email.sk"
            className="auth-input"
            style={{
              padding: '12px 14px',
              ...(emailError ? { borderColor: 'rgba(255, 61, 113, 0.4)' } : {}),
            }}
          />
          {emailError && (
            <p className="text-sm mt-1" style={{ color: '#FF3D71' }}>{emailError}</p>
          )}
        </div>

        {/* Card Number */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Číslo karty
          </label>
          <div className="stripe-element-dark">
            <CardNumberElement options={CARD_ELEMENT_OPTIONS} />
          </div>
        </div>

        {/* Expiry and CVC */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Platnosť
            </label>
            <div className="stripe-element-dark">
              <CardExpiryElement options={CARD_ELEMENT_OPTIONS} />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              CVC
            </label>
            <div className="stripe-element-dark">
              <CardCvcElement options={CARD_ELEMENT_OPTIONS} />
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="auth-error" style={{ marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
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
            {isProcessing ? (
              'Spracovávam...'
            ) : (
              `Autorizovať ${preAuthAmount.toFixed(2)} EUR`
            )}
          </Button>
        </div>

        <p className="text-xs text-center text-[var(--text-muted)] mt-4">
          🔒 Platobné údaje sú spracované bezpečne cez Stripe
        </p>
      </form>
    </div>
  );
}
