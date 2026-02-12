import { PaymentMethod } from '@/types';

// Poznámka: eCarUp API neposkytuje platobné endpointy
// Platby by boli riešené cez externú službu (Stripe, PayPal, atď.)
// Tento service používa mock data pre demo účely

// Typy pre platby
export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  clientSecret?: string;
  metadata?: Record<string, unknown>;
}

export interface AddCardRequest {
  cardNumber: string;
  expiryMonth: number;
  expiryYear: number;
  cvc: string;
  cardholderName: string;
  isDefault?: boolean;
}

export interface PaymentTransaction {
  id: string;
  sessionId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethodId: string;
  createdAt: string;
  completedAt?: string;
}

// Mock platobné metódy pre demo
const mockPaymentMethods: PaymentMethod[] = [
  {
    id: 'pm-1',
    type: 'card',
    last4: '4242',
    brand: 'visa',
    expiryMonth: 12,
    expiryYear: 2026,
    isDefault: true,
  },
  {
    id: 'pm-2',
    type: 'card',
    last4: '5555',
    brand: 'mastercard',
    expiryMonth: 6,
    expiryYear: 2025,
    isDefault: false,
  },
];

// Mock transakcie
const mockTransactions: PaymentTransaction[] = [
  {
    id: 'tx-1',
    sessionId: 'session-1',
    amount: 12.5,
    currency: 'EUR',
    status: 'completed',
    paymentMethodId: 'pm-1',
    createdAt: '2024-01-15T10:30:00Z',
    completedAt: '2024-01-15T10:30:05Z',
  },
  {
    id: 'tx-2',
    sessionId: 'session-2',
    amount: 8.75,
    currency: 'EUR',
    status: 'completed',
    paymentMethodId: 'pm-1',
    createdAt: '2024-01-14T14:20:00Z',
    completedAt: '2024-01-14T14:20:03Z',
  },
];

export const paymentService = {
  // Získanie platobných metód (mock)
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockPaymentMethods;
  },

  // Pridanie novej karty (mock)
  async addPaymentMethod(data: AddCardRequest): Promise<PaymentMethod> {
    await new Promise(resolve => setTimeout(resolve, 500));
    const newMethod: PaymentMethod = {
      id: `pm-${Date.now()}`,
      type: 'card',
      last4: data.cardNumber.slice(-4),
      brand: detectCardBrand(data.cardNumber),
      expiryMonth: data.expiryMonth,
      expiryYear: data.expiryYear,
      isDefault: data.isDefault || false,
    };
    return newMethod;
  },

  // Odstránenie platobnej metódy (mock)
  async removePaymentMethod(paymentMethodId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    console.log('Mock: Payment method removed:', paymentMethodId);
  },

  // Nastavenie predvolenej platobnej metódy (mock)
  async setDefaultPaymentMethod(paymentMethodId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    console.log('Mock: Default payment method set:', paymentMethodId);
  },

  // Vytvorenie platobného intentu (mock)
  async createPaymentIntent(sessionId: string, amount: number): Promise<PaymentIntent> {
    await new Promise(resolve => setTimeout(resolve, 400));
    return {
      id: `pi-${Date.now()}`,
      amount,
      currency: 'EUR',
      status: 'pending',
      clientSecret: `mock_secret_${Date.now()}`,
    };
  },

  // Potvrdenie platby (mock)
  async confirmPayment(paymentIntentId: string, _paymentMethodId: string): Promise<PaymentIntent> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      id: paymentIntentId,
      amount: 0,
      currency: 'EUR',
      status: 'succeeded',
    };
  },

  // História transakcií (mock)
  async getTransactions(_limit = 20): Promise<PaymentTransaction[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockTransactions;
  },

  // Detail transakcie (mock)
  async getTransaction(transactionId: string): Promise<PaymentTransaction | null> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return mockTransactions.find((t) => t.id === transactionId) || null;
  },

  // Validácia karty (Luhn algoritmus)
  validateCardNumber(cardNumber: string): boolean {
    const cleaned = cardNumber.replace(/\s/g, '');
    if (!/^\d{13,19}$/.test(cleaned)) return false;

    let sum = 0;
    let isEven = false;

    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned[i], 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  },

  // Validácia expiry
  validateExpiry(month: number, year: number): boolean {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (year < currentYear) return false;
    if (year === currentYear && month < currentMonth) return false;
    if (month < 1 || month > 12) return false;

    return true;
  },

  // Validácia CVC
  validateCVC(cvc: string): boolean {
    return /^\d{3,4}$/.test(cvc);
  },

  // Formátovanie čísla karty
  formatCardNumber(value: string): string {
    const cleaned = value.replace(/\D/g, '');
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(' ') : cleaned;
  },
};

// Helper pre detekciu značky karty
function detectCardBrand(cardNumber: string): string {
  const cleaned = cardNumber.replace(/\s/g, '');

  if (/^4/.test(cleaned)) return 'visa';
  if (/^5[1-5]/.test(cleaned)) return 'mastercard';
  if (/^3[47]/.test(cleaned)) return 'amex';
  if (/^6(?:011|5)/.test(cleaned)) return 'discover';

  return 'unknown';
}

export default paymentService;
