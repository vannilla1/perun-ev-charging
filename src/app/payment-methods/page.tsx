'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AppLayout, PageHeader } from '@/components/Layout';
import { Card, CardContent, Button, Loading } from '@/components/Common';
import { PaymentMethodCard, AddCardForm } from '@/components/Payment';
import { useAuth } from '@/contexts';
import { paymentService } from '@/services/api/paymentService';
import { PaymentMethod } from '@/types';

const PlusIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);

const CreditCardIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-12 w-12"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
    />
  </svg>
);

export default function PaymentMethodsPage() {
  const t = useTranslations('profile');
  const router = useRouter();
  const { isLoggedIn, isLoading: authLoading } = useAuth();

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.push('/login');
    }
  }, [authLoading, isLoggedIn, router]);

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      const methods = await paymentService.getPaymentMethods();
      setPaymentMethods(methods);
    } catch (error) {
      console.error('Chyba pri načítaní platobných metód:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetDefault = async (methodId: string) => {
    setActionLoading(methodId);
    try {
      await paymentService.setDefaultPaymentMethod(methodId);
      // Aktualizuj lokálny stav
      setPaymentMethods((prev) =>
        prev.map((m) => ({
          ...m,
          isDefault: m.id === methodId,
        }))
      );
    } catch (error) {
      console.error('Chyba pri nastavení predvolenej metódy:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async (methodId: string) => {
    if (!confirm('Naozaj chcete odstrániť túto platobnú metódu?')) return;

    setActionLoading(methodId);
    try {
      await paymentService.removePaymentMethod(methodId);
      setPaymentMethods((prev) => prev.filter((m) => m.id !== methodId));
    } catch (error) {
      console.error('Chyba pri odstraňovaní metódy:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddSuccess = () => {
    setShowAddForm(false);
    loadPaymentMethods();
  };

  if (authLoading || !isLoggedIn) {
    return (
      <AppLayout header={<PageHeader title={t('paymentMethods')} showBack />}>
        <div className="flex items-center justify-center h-64">
          <Loading size="lg" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout header={<PageHeader title={t('paymentMethods')} showBack />}>
      <div className="p-4 max-w-lg mx-auto">
        {showAddForm ? (
          <AddCardForm onSuccess={handleAddSuccess} onCancel={() => setShowAddForm(false)} />
        ) : (
          <>
            {/* Tlačidlo pridať */}
            <Button
              variant="outline"
              fullWidth
              leftIcon={<PlusIcon />}
              onClick={() => setShowAddForm(true)}
              className="mb-6"
            >
              Pridať novú kartu
            </Button>

            {/* Zoznam kariet */}
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loading size="lg" />
              </div>
            ) : paymentMethods.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <div className="text-[var(--text-muted)] mb-4 flex justify-center">
                    <CreditCardIcon />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                    Žiadne platobné metódy
                  </h3>
                  <p className="text-[var(--text-secondary)] mb-4">
                    Pridajte kartu pre rýchle a pohodlné platby za nabíjanie.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {paymentMethods.map((method) => (
                  <PaymentMethodCard
                    key={method.id}
                    method={method}
                    onSetDefault={() => handleSetDefault(method.id)}
                    onRemove={() => handleRemove(method.id)}
                    isLoading={actionLoading === method.id}
                  />
                ))}
              </div>
            )}

            {/* Info */}
            <div className="mt-8 p-4 bg-[var(--surface-secondary)] rounded-[var(--border-radius)] text-sm text-[var(--text-secondary)]">
              <p className="flex items-start gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 flex-shrink-0 text-[var(--primary)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>
                  Vaše platobné údaje sú bezpečne uložené a šifrované. Nikdy neukladáme
                  kompletné číslo karty.
                </span>
              </p>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
