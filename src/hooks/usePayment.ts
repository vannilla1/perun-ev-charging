'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentService, PaymentIntent } from '@/services/api/paymentService';

// Hook pre správu platobných metód
export function usePaymentMethods() {
  const queryClient = useQueryClient();

  const {
    data: paymentMethods = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['paymentMethods'],
    queryFn: () => paymentService.getPaymentMethods(),
    staleTime: 5 * 60 * 1000, // 5 minút
  });

  const addMethodMutation = useMutation({
    mutationFn: paymentService.addPaymentMethod,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentMethods'] });
    },
  });

  const removeMethodMutation = useMutation({
    mutationFn: paymentService.removePaymentMethod,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentMethods'] });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: paymentService.setDefaultPaymentMethod,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentMethods'] });
    },
  });

  return {
    paymentMethods,
    isLoading,
    error,
    refetch,
    addMethod: addMethodMutation.mutateAsync,
    removeMethod: removeMethodMutation.mutateAsync,
    setDefault: setDefaultMutation.mutateAsync,
    isAdding: addMethodMutation.isPending,
    isRemoving: removeMethodMutation.isPending,
    isSettingDefault: setDefaultMutation.isPending,
  };
}

// Hook pre platobný proces
export function usePaymentProcess() {
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPaymentIntent = useCallback(async (sessionId: string, amount: number) => {
    setIsProcessing(true);
    setError(null);

    try {
      const intent = await paymentService.createPaymentIntent(sessionId, amount);
      setPaymentIntent(intent);
      return intent;
    } catch (err) {
      setError('Nepodarilo sa vytvoriť platbu');
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const confirmPayment = useCallback(
    async (paymentMethodId: string) => {
      if (!paymentIntent) {
        throw new Error('Platba nie je inicializovaná');
      }

      setIsProcessing(true);
      setError(null);

      try {
        const result = await paymentService.confirmPayment(paymentIntent.id, paymentMethodId);
        setPaymentIntent(result);
        return result;
      } catch (err) {
        setError('Platba zlyhala');
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    [paymentIntent]
  );

  const reset = useCallback(() => {
    setPaymentIntent(null);
    setError(null);
    setIsProcessing(false);
  }, []);

  return {
    paymentIntent,
    isProcessing,
    error,
    createPaymentIntent,
    confirmPayment,
    reset,
  };
}

// Hook pre históriu transakcií
export function useTransactions(limit = 20) {
  const {
    data: transactions = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['transactions', limit],
    queryFn: () => paymentService.getTransactions(limit),
    staleTime: 2 * 60 * 1000, // 2 minúty
  });

  return {
    transactions,
    isLoading,
    error,
    refetch,
  };
}

// Hook pre validáciu karty
export function useCardValidation() {
  const [cardNumber, setCardNumber] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cvc, setCvc] = useState('');

  const [errors, setErrors] = useState<{
    cardNumber?: string;
    expiry?: string;
    cvc?: string;
  }>({});

  const validate = useCallback(() => {
    const newErrors: typeof errors = {};

    const cleanedNumber = cardNumber.replace(/\s/g, '');
    if (!paymentService.validateCardNumber(cleanedNumber)) {
      newErrors.cardNumber = 'Neplatné číslo karty';
    }

    const month = parseInt(expiryMonth, 10);
    const year = parseInt(expiryYear, 10);
    if (!paymentService.validateExpiry(month, year)) {
      newErrors.expiry = 'Neplatná platnosť';
    }

    if (!paymentService.validateCVC(cvc)) {
      newErrors.cvc = 'Neplatný CVC';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [cardNumber, expiryMonth, expiryYear, cvc]);

  const reset = useCallback(() => {
    setCardNumber('');
    setExpiryMonth('');
    setExpiryYear('');
    setCvc('');
    setErrors({});
  }, []);

  return {
    cardNumber,
    setCardNumber: (value: string) => setCardNumber(paymentService.formatCardNumber(value)),
    expiryMonth,
    setExpiryMonth,
    expiryYear,
    setExpiryYear,
    cvc,
    setCvc,
    errors,
    validate,
    reset,
    isValid: Object.keys(errors).length === 0 && cardNumber && expiryMonth && expiryYear && cvc,
  };
}
