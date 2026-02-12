'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout, PageHeader } from '@/components/Layout';
import { Card, CardContent, Button } from '@/components/Common';
import { useAuth } from '@/contexts';

const CreditCardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

const VisaIcon = () => (
  <svg className="h-8 w-12" viewBox="0 0 48 32" fill="none">
    <rect width="48" height="32" rx="4" fill="#1A1F71"/>
    <path d="M19.5 21.5L21.5 10.5H24.5L22.5 21.5H19.5Z" fill="white"/>
    <path d="M31 10.5L28.5 18L28 15.5L27 11.5C27 11.5 26.9 10.5 25.5 10.5H21L21 10.7C21 10.7 22.5 11 24 12L26.5 21.5H29.5L34 10.5H31Z" fill="white"/>
    <path d="M15 10.5L12 18.5L11.7 17C11 15 9 12.5 9 12.5L11.5 21.5H14.5L18.5 10.5H15Z" fill="white"/>
    <path d="M9 10.5H4.5L4.5 10.7C4.5 10.7 7.5 11.5 9.5 14C11.3 16.3 12 21.5 12 21.5L9.5 12C9.5 12 9.3 10.5 8 10.5H9Z" fill="white"/>
  </svg>
);

const MastercardIcon = () => (
  <svg className="h-8 w-12" viewBox="0 0 48 32" fill="none">
    <rect width="48" height="32" rx="4" fill="#F5F5F5"/>
    <circle cx="19" cy="16" r="10" fill="#EB001B"/>
    <circle cx="29" cy="16" r="10" fill="#F79E1B"/>
    <path d="M24 8.5C26.5 10.5 28 13 28 16C28 19 26.5 21.5 24 23.5C21.5 21.5 20 19 20 16C20 13 21.5 10.5 24 8.5Z" fill="#FF5F00"/>
  </svg>
);

const AmexIcon = () => (
  <svg className="h-8 w-12" viewBox="0 0 48 32" fill="none">
    <rect width="48" height="32" rx="4" fill="#006FCF"/>
    <path d="M8 16L10 12H12L14 16L12 20H10L8 16Z" fill="white"/>
    <text x="20" y="18" fill="white" fontSize="8" fontWeight="bold">AMEX</text>
  </svg>
);

const ApplePayIcon = () => (
  <svg className="h-8 w-12" viewBox="0 0 48 32" fill="none">
    <rect width="48" height="32" rx="4" fill="#000"/>
    <path d="M14 12C14.5 11.3 15.3 10.8 16 10.8C16.1 11.6 15.8 12.4 15.3 13C14.8 13.7 14 14.2 13.3 14.1C13.2 13.4 13.5 12.6 14 12Z" fill="white"/>
    <path d="M15.9 14.3C14.9 14.2 14 14.9 13.5 14.9C13 14.9 12.2 14.3 11.4 14.3C10.3 14.4 9.3 15 8.7 16C7.5 18 8.4 20.9 9.6 22.6C10.2 23.4 10.9 24.4 11.8 24.3C12.6 24.3 12.9 23.8 13.9 23.8C14.9 23.8 15.2 24.3 16 24.3C16.9 24.3 17.5 23.4 18.1 22.6C18.5 22 18.8 21.4 19 20.8C18 20.4 17.4 19.4 17.4 18.3C17.4 17.3 17.9 16.4 18.8 15.9C18.3 15.2 17.4 14.4 16.3 14.3H15.9Z" fill="white"/>
    <path d="M23 15.3H24.5C25.4 15.3 26 15.8 26 16.5C26 17.2 25.4 17.7 24.5 17.7H23V15.3ZM21.5 14.2V21.5H23V18.7H24.6C26.2 18.7 27.5 17.8 27.5 16.5C27.5 15.2 26.2 14.2 24.6 14.2H21.5Z" fill="white"/>
    <path d="M31 19.2C30.5 19.2 30.1 18.9 30.1 18.4C30.1 18 30.4 17.7 31 17.5L32.5 17.2V17.6C32.5 18.5 31.9 19.2 31 19.2ZM30.7 20.2C31.3 20.2 31.9 19.9 32.4 19.4V20H33.8V16.3C33.8 15.2 32.9 14.3 31.4 14.3C30.1 14.3 29.1 15 28.9 16H30.4C30.5 15.6 30.9 15.3 31.4 15.3C32 15.3 32.4 15.6 32.4 16.2V16.5L30.7 16.8C29.4 17 28.6 17.6 28.6 18.5C28.6 19.5 29.5 20.2 30.7 20.2Z" fill="white"/>
    <path d="M36.5 21.5L35 21.1C35.1 21.2 35.3 21.3 35.6 21.3C36.1 21.3 36.4 21.1 36.6 20.6L36.8 20L34.5 14.4H36.1L37.6 18.7L39 14.4H40.5L38.1 20.8C37.6 22 37 22.4 35.8 22.4C35.5 22.4 35.2 22.4 35 22.3L35.1 21.3L36.5 21.5Z" fill="white"/>
  </svg>
);

const GooglePayIcon = () => (
  <svg className="h-8 w-12" viewBox="0 0 48 32" fill="none">
    <rect width="48" height="32" rx="4" fill="#F5F5F5"/>
    <path d="M22.5 16.8V20H21V12H24.3C25 12 25.6 12.2 26.1 12.7C26.6 13.2 26.8 13.8 26.8 14.4C26.8 15.1 26.6 15.7 26.1 16.1C25.6 16.6 25 16.8 24.3 16.8H22.5ZM22.5 13.4V15.4H24.3C24.6 15.4 24.9 15.3 25.1 15.1C25.3 14.9 25.4 14.7 25.4 14.4C25.4 14.1 25.3 13.9 25.1 13.7C24.9 13.5 24.6 13.4 24.3 13.4H22.5Z" fill="#4285F4"/>
    <path d="M30.6 14.8C31.4 14.8 32 15 32.5 15.5C33 16 33.2 16.6 33.2 17.3V20H31.8V19.2H31.7C31.3 19.8 30.7 20.1 30 20.1C29.4 20.1 28.9 19.9 28.5 19.5C28.1 19.1 27.9 18.7 27.9 18.1C27.9 17.5 28.1 17 28.6 16.7C29 16.3 29.6 16.1 30.4 16.1C31 16.1 31.5 16.2 31.8 16.4V16.2C31.8 15.9 31.7 15.6 31.4 15.4C31.2 15.2 30.9 15.1 30.5 15.1C29.9 15.1 29.5 15.3 29.2 15.8L27.9 15.1C28.4 14.3 29.3 14.8 30.6 14.8ZM29.3 18.1C29.3 18.3 29.4 18.5 29.6 18.7C29.8 18.9 30 19 30.3 19C30.7 19 31 18.8 31.3 18.5C31.6 18.2 31.8 17.9 31.8 17.5C31.5 17.3 31.1 17.2 30.5 17.2C30.1 17.2 29.8 17.3 29.5 17.5C29.4 17.7 29.3 17.9 29.3 18.1Z" fill="#4285F4"/>
    <path d="M38.5 14.9L35.3 22H33.8L35 19.2L32.7 14.9H34.3L35.8 18L37.2 14.9H38.5Z" fill="#4285F4"/>
    <path d="M17.7 16C17.7 15.7 17.7 15.4 17.6 15.1H13V16.7H15.6C15.5 17.3 15.2 17.8 14.7 18.1V19.3H16.2C17.1 18.5 17.7 17.3 17.7 16Z" fill="#4285F4"/>
    <path d="M13 20.4C14.2 20.4 15.2 20 16 19.3L14.5 18.1C14.1 18.4 13.6 18.6 13 18.6C11.9 18.6 11 17.9 10.7 17H9.1V18.2C9.9 19.6 11.4 20.4 13 20.4Z" fill="#34A853"/>
    <path d="M10.7 17C10.6 16.7 10.5 16.4 10.5 16C10.5 15.6 10.6 15.3 10.7 15V13.8H9.1C8.7 14.6 8.5 15.3 8.5 16C8.5 16.7 8.7 17.4 9.1 18.2L10.7 17Z" fill="#FBBC04"/>
    <path d="M13 13.4C13.7 13.4 14.3 13.6 14.8 14.1L16 12.9C15.2 12.2 14.2 11.7 13 11.7C11.4 11.7 9.9 12.5 9.1 13.9L10.7 15.1C11 14.1 11.9 13.4 13 13.4Z" fill="#EA4335"/>
  </svg>
);

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const LoadingSpinner = () => (
  <div className="flex justify-center py-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--perun-blue)]"></div>
  </div>
);

interface PaymentMethod {
  id: string;
  type: 'visa' | 'mastercard' | 'amex' | 'apple_pay' | 'google_pay' | string;
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}

// Mock dáta - v produkcii by sa načítali z eCarUp API (v pozadí)
const mockPaymentMethods: PaymentMethod[] = [];

export default function PaymentMethodsPage() {
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(mockPaymentMethods);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Simulácia načítania platobných metód
  useEffect(() => {
    const loadPaymentMethods = async () => {
      // V produkcii: fetch z eCarUp API cez náš backend
      // const response = await fetch('/api/payments/methods');
      // const data = await response.json();
      // setPaymentMethods(data.methods);

      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    };

    loadPaymentMethods();
  }, []);

  // Redirect ak nie je prihlásený
  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/login');
    }
  }, [isLoggedIn, router]);

  const getCardIcon = (type: PaymentMethod['type']) => {
    switch (type.toLowerCase()) {
      case 'visa':
        return <VisaIcon />;
      case 'mastercard':
        return <MastercardIcon />;
      case 'amex':
      case 'american express':
        return <AmexIcon />;
      case 'apple_pay':
        return <ApplePayIcon />;
      case 'google_pay':
        return <GooglePayIcon />;
      default:
        return <CreditCardIcon />;
    }
  };

  const getCardName = (type: PaymentMethod['type']) => {
    switch (type.toLowerCase()) {
      case 'visa':
        return 'Visa';
      case 'mastercard':
        return 'Mastercard';
      case 'amex':
      case 'american express':
        return 'American Express';
      case 'apple_pay':
        return 'Apple Pay';
      case 'google_pay':
        return 'Google Pay';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  const handleSetDefault = async (id: string) => {
    // V produkcii: API volanie na eCarUp cez náš backend
    setPaymentMethods(methods =>
      methods.map(m => ({ ...m, isDefault: m.id === id }))
    );
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(id);

    // V produkcii: API volanie na eCarUp cez náš backend
    setTimeout(() => {
      setPaymentMethods(methods => methods.filter(m => m.id !== id));
      setIsDeleting(null);
    }, 500);
  };

  const handleAddCard = () => {
    setShowAddModal(true);
  };

  const handleAddCardConfirm = () => {
    // V produkcii: Otvorí sa eCarUp platobný formulár v iframe alebo redirect
    // Pre používateľa to bude vyzerať ako Perun formulár

    // Simulácia pridania karty
    const newCard: PaymentMethod = {
      id: Date.now().toString(),
      type: 'visa',
      last4: '4242',
      expiryMonth: 12,
      expiryYear: 2027,
      isDefault: paymentMethods.length === 0,
    };

    setPaymentMethods([...paymentMethods, newCard]);
    setShowAddModal(false);
  };

  if (!isLoggedIn) {
    return null;
  }

  return (
    <AppLayout
      header={<PageHeader title="Platobné metódy" showBack />}
    >
      <div
        className="max-w-lg mx-auto"
        style={{ padding: '32px 16px 24px 16px' }}
      >
        {/* Loading */}
        {isLoading && <LoadingSpinner />}

        {/* Existujúce platobné metódy */}
        {!isLoading && paymentMethods.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h2 className="text-sm font-medium text-[var(--text-secondary)]" style={{ marginBottom: '12px' }}>
              Uložené platobné metódy
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {paymentMethods.map(method => (
                <Card key={method.id} className="overflow-hidden">
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {getCardIcon(method.type)}
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">
                            {getCardName(method.type)}
                            {method.last4 && ` •••• ${method.last4}`}
                          </p>
                          {method.expiryMonth && method.expiryYear && (
                            <p className="text-sm text-[var(--text-secondary)]">
                              Platná do {method.expiryMonth.toString().padStart(2, '0')}/{method.expiryYear}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {method.isDefault && (
                          <span className="text-xs bg-[var(--perun-green)] text-white px-2 py-1 rounded-full">
                            Predvolená
                          </span>
                        )}
                        {!method.isDefault && (
                          <button
                            onClick={() => handleSetDefault(method.id)}
                            className="text-sm text-[var(--perun-blue)] hover:underline"
                          >
                            Nastaviť
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(method.id)}
                          disabled={isDeleting === method.id}
                          className="p-2 text-[var(--text-muted)] hover:text-[var(--error)] transition-colors disabled:opacity-50"
                        >
                          {isDeleting === method.id ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
                          ) : (
                            <TrashIcon />
                          )}
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Prázdny stav */}
        {!isLoading && paymentMethods.length === 0 && (
          <div className="text-center py-8 mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-[var(--surface-secondary)] rounded-full flex items-center justify-center text-[var(--text-muted)]">
              <CreditCardIcon />
            </div>
            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
              Žiadne platobné metódy
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Pridajte platobnú metódu pre rýchle a bezpečné platby za nabíjanie.
            </p>
          </div>
        )}

        {/* Pridať novú metódu */}
        {!isLoading && (
          <div style={{ marginBottom: '32px' }}>
            <h2 className="text-sm font-medium text-[var(--text-secondary)]" style={{ marginBottom: '12px' }}>
              Pridať platobnú metódu
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={handleAddCard}
                className="flex items-center justify-between p-4 bg-white border-2 border-dashed border-[var(--border)] rounded-xl hover:border-[var(--perun-blue)] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-8 rounded bg-[var(--surface-secondary)] flex items-center justify-center text-[var(--text-muted)]">
                    <CreditCardIcon />
                  </div>
                  <span className="font-medium text-[var(--text-primary)]">Kreditná/Debetná karta</span>
                </div>
                <PlusIcon />
              </button>

              <button
                onClick={() => alert('Apple Pay bude čoskoro dostupný')}
                className="flex items-center justify-between p-4 bg-white border-2 border-[var(--border)] rounded-xl hover:border-[var(--perun-blue)] transition-colors opacity-50"
                disabled
              >
                <div className="flex items-center gap-4">
                  <ApplePayIcon />
                  <div className="text-left">
                    <span className="font-medium text-[var(--text-primary)]">Apple Pay</span>
                    <p className="text-xs text-[var(--text-muted)]">Čoskoro</p>
                  </div>
                </div>
                <PlusIcon />
              </button>

              <button
                onClick={() => alert('Google Pay bude čoskoro dostupný')}
                className="flex items-center justify-between p-4 bg-white border-2 border-[var(--border)] rounded-xl hover:border-[var(--perun-blue)] transition-colors opacity-50"
                disabled
              >
                <div className="flex items-center gap-4">
                  <GooglePayIcon />
                  <div className="text-left">
                    <span className="font-medium text-[var(--text-primary)]">Google Pay</span>
                    <p className="text-xs text-[var(--text-muted)]">Čoskoro</p>
                  </div>
                </div>
                <PlusIcon />
              </button>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="p-4 bg-[var(--surface-secondary)] rounded-xl">
          <p className="text-sm text-[var(--text-secondary)]">
            🔒 Vaše platobné údaje sú bezpečne šifrované. Kompletné čísla kariet nikdy neukladáme na našich serveroch.
          </p>
        </div>

        {/* Ako to funguje */}
        <div style={{ marginTop: '24px' }}>
          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3">
            Ako platby fungujú
          </h3>
          <div className="p-4 bg-white rounded-xl border border-[var(--border)]">
            <ul className="text-sm text-[var(--text-secondary)] space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-[var(--perun-green)]">✓</span>
                Po dokončení nabíjania sa suma automaticky stiahne z vašej karty
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--perun-green)]">✓</span>
                Platobné údaje sú spracované certifikovaným poskytovateľom
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--perun-green)]">✓</span>
                Históriu platieb nájdete v sekcii &quot;História&quot;
              </li>
            </ul>
          </div>
        </div>

        {/* Modal pre pridanie karty */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6">
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                Pridať platobnú kartu
              </h3>
              <p className="text-[var(--text-secondary)] mb-6">
                Budete presmerovaný na zabezpečený platobný formulár.
              </p>

              {/* Info o bezpečnosti */}
              <div className="p-4 bg-[var(--surface-secondary)] rounded-xl mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[var(--perun-green)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="font-medium text-[var(--text-primary)]">Bezpečná platba</span>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">
                  Vaše údaje sú šifrované 256-bitovým SSL šifrovaním.
                </p>
              </div>

              {/* Podporované karty */}
              <div className="flex items-center justify-center gap-4 mb-6">
                <VisaIcon />
                <MastercardIcon />
                <AmexIcon />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => setShowAddModal(false)}
                >
                  Zrušiť
                </Button>
                <Button
                  fullWidth
                  onClick={handleAddCardConfirm}
                >
                  Pokračovať
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
