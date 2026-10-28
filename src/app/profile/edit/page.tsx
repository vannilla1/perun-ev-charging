'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AppLayout, PageHeader } from '@/components/Layout';
import { Card, CardContent, Button } from '@/components/Common';
import { useAuth } from '@/contexts';

export default function EditProfilePage() {
  const t = useTranslations('profile');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/auth/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ firstName, lastName, phone, email: user?.email }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || tErrors('saveFailed'));
      }
      // Update localStorage user data a refreshnúť AuthContext
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsed = JSON.parse(userData);
        parsed.firstName = firstName;
        parsed.lastName = lastName;
        parsed.phone = phone;
        localStorage.setItem('user', JSON.stringify(parsed));
      }
      refreshUser();
      setSaved(true);
      setTimeout(() => router.back(), 1200);
    } catch (err) {
      setError(
        err instanceof Error && !(err instanceof TypeError) && !(err instanceof SyntaxError)
          ? err.message
          : tErrors('saveFailed')
      );
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full px-4 py-3 rounded-xl border border-[var(--border-light)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-colors';

  return (
    <AppLayout header={<PageHeader title={t('personalInfo')} showBack />}>
      <div className="p-4 max-w-lg mx-auto">
        {saved ? (
          <Card className="text-center py-12">
            <CardContent>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-[var(--perun-green)] mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">{t('edit.saved')}</h2>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">{t('edit.email')}</label>
                  <input type="email" value={user?.email || ''} disabled className={`${inputClass} opacity-60 cursor-not-allowed`} />
                  <p className="text-xs text-[var(--text-muted)] mt-1">{t('edit.emailReadonly')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">{t('edit.firstName')}</label>
                  <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} placeholder={t('edit.firstName')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">{t('edit.lastName')}</label>
                  <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} placeholder={t('edit.lastName')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">{t('edit.phone')}</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder={t('edit.phonePlaceholder')} />
                </div>
                {error && (
                  <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
                )}
                <Button fullWidth onClick={handleSave} disabled={saving}>
                  {saving ? tCommon('saving') : tCommon('saveChanges')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
