'use client';

import React from 'react';
import { PaymentMethod } from '@/types';

interface PaymentMethodCardProps {
  method: PaymentMethod;
  onSetDefault?: () => void;
  onRemove?: () => void;
  isLoading?: boolean;
}

// Ikony pre kartové značky
const CardBrandIcon = ({ brand }: { brand: string }) => {
  switch (brand) {
    case 'visa':
      return (
        <svg viewBox="0 0 48 32" className="h-8 w-12">
          <rect fill="#1a1f71" width="48" height="32" rx="4" />
          <text x="24" y="20" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
            VISA
          </text>
        </svg>
      );
    case 'mastercard':
      return (
        <svg viewBox="0 0 48 32" className="h-8 w-12">
          <rect fill="#1a1a1a" width="48" height="32" rx="4" />
          <circle cx="18" cy="16" r="10" fill="#eb001b" />
          <circle cx="30" cy="16" r="10" fill="#f79e1b" />
          <path d="M24 8a10 10 0 010 16 10 10 0 000-16z" fill="#ff5f00" />
        </svg>
      );
    case 'amex':
      return (
        <svg viewBox="0 0 48 32" className="h-8 w-12">
          <rect fill="#006fcf" width="48" height="32" rx="4" />
          <text x="24" y="20" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">
            AMEX
          </text>
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 48 32" className="h-8 w-12">
          <rect fill="#6b7280" width="48" height="32" rx="4" />
          <text x="24" y="20" textAnchor="middle" fill="white" fontSize="10">
            CARD
          </text>
        </svg>
      );
  }
};

export const PaymentMethodCard = ({
  method,
  onSetDefault,
  onRemove,
  isLoading,
}: PaymentMethodCardProps) => {
  return (
    <div
      className={`
        bg-[var(--surface)] rounded-[var(--border-radius)] p-4 border
        ${method.isDefault ? 'border-[var(--primary)]' : 'border-[var(--border)]'}
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CardBrandIcon brand={method.brand || 'unknown'} />
          <div>
            <p className="font-medium text-[var(--text-primary)]">
              •••• •••• •••• {method.last4}
            </p>
            <p className="text-sm text-[var(--text-secondary)]">
              Platnosť do {method.expiryMonth?.toString().padStart(2, '0')}/{method.expiryYear}
            </p>
          </div>
        </div>

        {method.isDefault && (
          <span className="px-2 py-1 bg-[var(--primary)] bg-opacity-10 text-[var(--primary)] text-xs font-medium rounded-full">
            Predvolená
          </span>
        )}
      </div>

      {(onSetDefault || onRemove) && (
        <div className="flex gap-2 mt-4 pt-4 border-t border-[var(--border)]">
          {!method.isDefault && onSetDefault && (
            <button
              onClick={onSetDefault}
              disabled={isLoading}
              className="flex-1 py-2 px-3 text-sm font-medium text-[var(--primary)] bg-[var(--primary)] bg-opacity-10 rounded-[var(--border-radius-sm)] hover:bg-opacity-20 transition-colors disabled:opacity-50"
            >
              Nastaviť ako predvolenú
            </button>
          )}
          {onRemove && (
            <button
              onClick={onRemove}
              disabled={isLoading}
              className="py-2 px-3 text-sm font-medium text-[var(--error)] bg-[var(--error)] bg-opacity-10 rounded-[var(--border-radius-sm)] hover:bg-opacity-20 transition-colors disabled:opacity-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PaymentMethodCard;
