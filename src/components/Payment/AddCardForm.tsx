'use client';

import React, { useState } from 'react';
import { Button, Input, Card, CardContent } from '@/components/Common';
import { paymentService, AddCardRequest } from '@/services/api/paymentService';

interface AddCardFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const AddCardForm = ({ onSuccess, onCancel }: AddCardFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvc: '',
    cardholderName: '',
    isDefault: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = paymentService.formatCardNumber(e.target.value);
    if (formatted.replace(/\s/g, '').length <= 16) {
      setFormData((prev) => ({ ...prev, cardNumber: formatted }));
    }
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');

    if (value.length >= 2) {
      const month = value.slice(0, 2);
      const year = value.slice(2, 4);
      setFormData((prev) => ({
        ...prev,
        expiryMonth: month,
        expiryYear: year ? `20${year}` : '',
      }));
    } else {
      setFormData((prev) => ({ ...prev, expiryMonth: value, expiryYear: '' }));
    }
  };

  const getExpiryDisplay = () => {
    if (formData.expiryMonth && formData.expiryYear) {
      return `${formData.expiryMonth}/${formData.expiryYear.slice(-2)}`;
    }
    return formData.expiryMonth;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validácia čísla karty
    const cleanedNumber = formData.cardNumber.replace(/\s/g, '');
    if (!paymentService.validateCardNumber(cleanedNumber)) {
      newErrors.cardNumber = 'Neplatné číslo karty';
    }

    // Validácia platnosti
    const month = parseInt(formData.expiryMonth, 10);
    const year = parseInt(formData.expiryYear, 10);
    if (!paymentService.validateExpiry(month, year)) {
      newErrors.expiry = 'Neplatná platnosť karty';
    }

    // Validácia CVC
    if (!paymentService.validateCVC(formData.cvc)) {
      newErrors.cvc = 'Neplatný CVC kód';
    }

    // Validácia mena držiteľa
    if (formData.cardholderName.trim().length < 3) {
      newErrors.cardholderName = 'Zadajte meno držiteľa karty';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setError(null);

    try {
      const request: AddCardRequest = {
        cardNumber: formData.cardNumber.replace(/\s/g, ''),
        expiryMonth: parseInt(formData.expiryMonth, 10),
        expiryYear: parseInt(formData.expiryYear, 10),
        cvc: formData.cvc,
        cardholderName: formData.cardholderName,
        isDefault: formData.isDefault,
      };

      await paymentService.addPaymentMethod(request);
      onSuccess?.();
    } catch {
      setError('Nepodarilo sa pridať kartu. Skúste to znova.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card padding="none">
      <div className="p-4 border-b border-[var(--border)]">
        <h3 className="font-semibold text-[var(--text-primary)]">Pridať novú kartu</h3>
      </div>
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-[var(--error)] bg-opacity-10 border border-[var(--error)] rounded-[var(--border-radius-sm)] text-[var(--error)] text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
              Číslo karty
            </label>
            <input
              type="text"
              value={formData.cardNumber}
              onChange={handleCardNumberChange}
              placeholder="1234 5678 9012 3456"
              className={`
                w-full px-4 py-3 rounded-[var(--border-radius-sm)] border
                bg-[var(--surface)] text-[var(--text-primary)]
                focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent
                ${errors.cardNumber ? 'border-[var(--error)]' : 'border-[var(--border)]'}
              `}
              disabled={isLoading}
            />
            {errors.cardNumber && (
              <p className="text-xs text-[var(--error)] mt-1">{errors.cardNumber}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                Platnosť
              </label>
              <input
                type="text"
                value={getExpiryDisplay()}
                onChange={handleExpiryChange}
                placeholder="MM/RR"
                maxLength={5}
                className={`
                  w-full px-4 py-3 rounded-[var(--border-radius-sm)] border
                  bg-[var(--surface)] text-[var(--text-primary)]
                  focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent
                  ${errors.expiry ? 'border-[var(--error)]' : 'border-[var(--border)]'}
                `}
                disabled={isLoading}
              />
              {errors.expiry && (
                <p className="text-xs text-[var(--error)] mt-1">{errors.expiry}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                CVC
              </label>
              <input
                type="text"
                value={formData.cvc}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setFormData((prev) => ({ ...prev, cvc: value }));
                }}
                placeholder="123"
                maxLength={4}
                className={`
                  w-full px-4 py-3 rounded-[var(--border-radius-sm)] border
                  bg-[var(--surface)] text-[var(--text-primary)]
                  focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent
                  ${errors.cvc ? 'border-[var(--error)]' : 'border-[var(--border)]'}
                `}
                disabled={isLoading}
              />
              {errors.cvc && <p className="text-xs text-[var(--error)] mt-1">{errors.cvc}</p>}
            </div>
          </div>

          <Input
            label="Meno držiteľa karty"
            value={formData.cardholderName}
            onChange={(e) => setFormData((prev) => ({ ...prev, cardholderName: e.target.value }))}
            placeholder="JÁN NOVÁK"
            error={errors.cardholderName}
            disabled={isLoading}
          />

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isDefault}
              onChange={(e) => setFormData((prev) => ({ ...prev, isDefault: e.target.checked }))}
              className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
              disabled={isLoading}
            />
            <span className="text-sm text-[var(--text-secondary)]">
              Nastaviť ako predvolenú platobnú metódu
            </span>
          </label>

          <div className="flex gap-3 pt-2">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                Zrušiť
              </Button>
            )}
            <Button type="submit" fullWidth loading={isLoading}>
              Pridať kartu
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default AddCardForm;
