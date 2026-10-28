'use client';

import React, { useState, useEffect } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
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
import { stripeErrorMessage } from './StripeProvider';

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

export function GuestPaymentForm({
  clientSecret,
  preAuthAmount,
  stationInfo,
  onPaymentConfirmed,
  onCancel,
}: GuestPaymentFormProps) {
  const t = useTranslations('guest');
  const tPayment = useTranslations('payment');
  const tCommon = useTranslations('common');
  const format = useFormatter();
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [canMakePayment, setCanMakePayment] = useState(false);
  const formattedPreAuth = format.number(preAuthAmount, { style: 'currency', currency: 'EUR' });

  // Initialize Apple Pay / Google Pay
  useEffect(() => {
    if (!stripe) return;

    const pr = stripe.paymentRequest({
      country: 'SK',
      currency: 'eur',
      total: {
        label: t('paymentForm.walletLabel', { station: stationInfo.name }),
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
        setError(stripeErrorMessage(confirmError, t('errors.paymentFailed')));
        return;
      }

      ev.complete('success');

      if (paymentIntent?.status === 'requires_capture') {
        onPaymentConfirmed(paymentIntent.id, ev.payerEmail || '');
      } else if (paymentIntent?.status === 'requires_action') {
        const { error: actionError } = await stripe.confirmCardPayment(clientSecret);
        if (actionError) {
          setError(stripeErrorMessage(actionError, t('errors.verificationFailed')));
        } else {
          onPaymentConfirmed(paymentIntent.id, ev.payerEmail || '');
        }
      }
    });
  }, [stripe, clientSecret, preAuthAmount, stationInfo.name, onPaymentConfirmed, t]);

  const validateEmail = (emailValue: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailValue) {
      setEmailError(t('validation.emailRequired'));
      return false;
    }
    if (!emailRegex.test(emailValue)) {
      setEmailError(t('validation.emailInvalid'));
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
      setError(t('errors.formLoadError'));
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
      setError(stripeErrorMessage(stripeError, t('errors.generic')));
      setIsProcessing(false);
      return;
    }

    if (paymentIntent?.status === 'requires_capture') {
      // Predautorizácia úspešná
      onPaymentConfirmed(paymentIntent.id, email);
    } else {
      setError(t('errors.authorizationFailed'));
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
          <span className="text-sm text-[var(--text-secondary)]">{t('paymentForm.pricePerKwh')}</span>
          <span className="font-semibold text-[var(--text-primary)]">
            {format.number(stationInfo.pricePerKwh, { style: 'currency', currency: 'EUR' })}
          </span>
        </div>
      </div>

      {/* Pre-authorization Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">💳</div>
          <div>
            <h4 className="font-semibold text-blue-900">{t('paymentForm.preAuthTitle')}</h4>
            <p className="text-sm text-blue-700 mt-1">
              {t.rich('paymentForm.preAuthInfo', {
                amount: formattedPreAuth,
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
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
            <span className="text-sm text-[var(--text-muted)]">{t('paymentForm.orPayByCard')}</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>
        </div>
      )}

      {/* Card Form */}
      <form onSubmit={handleSubmit}>
        {/* Email */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            {t('paymentForm.email')}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) validateEmail(e.target.value);
            }}
            onBlur={() => validateEmail(email)}
            placeholder={t('paymentForm.emailPlaceholder')}
            className={`w-full p-3 border rounded-xl bg-white focus:outline-none focus:ring-2 transition-all ${
              emailError
                ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                : 'border-[var(--border)] focus:border-[var(--perun-blue)] focus:ring-[var(--perun-blue)]/20'
            }`}
          />
          {emailError && (
            <p className="text-sm text-red-600 mt-1">{emailError}</p>
          )}
        </div>

        {/* Card Number */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            {tPayment('card.number')}
          </label>
          <div className="p-3 border border-[var(--border)] rounded-xl bg-white focus-within:border-[var(--perun-blue)] focus-within:ring-2 focus-within:ring-[var(--perun-blue)]/20 transition-all">
            <CardNumberElement options={CARD_ELEMENT_OPTIONS} />
          </div>
        </div>

        {/* Expiry and CVC */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              {tPayment('card.expiry')}
            </label>
            <div className="p-3 border border-[var(--border)] rounded-xl bg-white focus-within:border-[var(--perun-blue)] focus-within:ring-2 focus-within:ring-[var(--perun-blue)]/20 transition-all">
              <CardExpiryElement options={CARD_ELEMENT_OPTIONS} />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              {tPayment('card.cvc')}
            </label>
            <div className="p-3 border border-[var(--border)] rounded-xl bg-white focus-within:border-[var(--perun-blue)] focus-within:ring-2 focus-within:ring-[var(--perun-blue)]/20 transition-all">
              <CardCvcElement options={CARD_ELEMENT_OPTIONS} />
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl mb-4">
            <p className="text-sm text-red-600">{error}</p>
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
            {tCommon('cancel')}
          </Button>
          <Button
            type="submit"
            fullWidth
            disabled={!stripe || isProcessing}
          >
            {isProcessing ? (
              t('paymentForm.processing')
            ) : (
              t('paymentForm.authorize', { amount: formattedPreAuth })
            )}
          </Button>
        </div>

        <p className="text-xs text-center text-[var(--text-muted)] mt-4">
          🔒 {tPayment('securedByStripe')}
        </p>
      </form>
    </div>
  );
}
