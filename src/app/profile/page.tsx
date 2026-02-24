'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AppLayout, PageHeader } from '@/components/Layout';
import { Card, CardContent, Button } from '@/components/Common';
import { useAuth } from '@/contexts';

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onClick?: () => void;
  danger?: boolean;
  href?: string;
}

const MenuItem = ({ icon, label, value, onClick, danger, href }: MenuItemProps) => {
  const content = (
    <>
      <div className="flex items-center gap-3">
        <span className={danger ? 'text-[var(--error)]' : 'text-[var(--text-secondary)]'}>
          {icon}
        </span>
        <span className="font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {value && <span className="text-[var(--text-secondary)] text-sm">{value}</span>}
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </>
  );

  const className = `
    w-full flex items-center justify-between p-4 hover:bg-[var(--surface-secondary)] transition-colors
    ${danger ? 'text-[var(--error)]' : 'text-[var(--text-primary)]'}
  `;

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={className}>
      {content}
    </button>
  );
};

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const CreditCardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

const BellIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

const CogIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const QuestionIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const LogoutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

const BoltIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const LoginIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
  </svg>
);

export default function ProfilePage() {
  const t = useTranslations('profile');
  const router = useRouter();
  const { user, isLoggedIn, isLoading, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  // TODO: načítať reálne štatistiky z API
  const mockStats = {
    totalCharges: 0,
    totalEnergy: 0,
    totalSpent: 0,
  };

  // Loading stav počas inicializácie autentifikácie
  if (isLoading) {
    return (
      <AppLayout
        header={
          <PageHeader title={t('title')} />
        }
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              className="rounded-full bg-gradient-to-br from-[var(--perun-blue)] to-[var(--perun-green)] flex items-center justify-center animate-pulse"
              style={{ width: '64px', height: '64px', margin: '0 auto 16px auto' }}
            >
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <p className="text-base text-[var(--text-secondary)]">Načítavam profil...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Ak nie je prihlásený, zobraz výzvu na prihlásenie
  if (!isLoggedIn) {
    return (
      <AppLayout
        header={
          <PageHeader title={t('title')} />
        }
      >
        <div className="p-4 max-w-lg mx-auto">
          <Card className="text-center py-12">
            <CardContent>
              <div className="text-[var(--primary)] mb-4 flex justify-center">
                <LoginIcon />
              </div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                Prihláste sa
              </h2>
              <p className="text-[var(--text-secondary)] mb-6">
                Pre zobrazenie profilu a histórie nabíjaní sa musíte prihlásiť
              </p>
              <div className="space-y-3">
                <Button fullWidth onClick={() => router.push('/login')}>
                  Prihlásiť sa
                </Button>
                <Button variant="outline" fullWidth onClick={() => router.push('/register')}>
                  Vytvoriť účet
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const getInitials = () => {
    if (!user) return '?';
    return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`;
  };

  return (
    <AppLayout
      header={
        <PageHeader title={t('title')} />
      }
    >
      <div
        className="max-w-lg mx-auto"
        style={{ padding: '32px 16px 24px 16px' }}
      >
        {/* Profilová karta */}
        <Card style={{ marginBottom: '32px' }}>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-xl font-bold">
                {getInitials()}
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  {user?.firstName} {user?.lastName}
                </h2>
                <p className="text-sm text-[var(--text-secondary)]">{user?.email}</p>
              </div>
              <button className="p-2 hover:bg-[var(--surface-secondary)] rounded-full transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Štatistiky */}
        <Card style={{ marginBottom: '32px' }}>
          <CardContent>
            <h3 className="font-medium text-[var(--text-primary)]" style={{ marginBottom: '20px' }}>{t('statistics')}</h3>
            <div className="grid grid-cols-3" style={{ gap: '20px' }}>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-[var(--secondary)] bg-opacity-10 flex items-center justify-center mx-auto text-[var(--secondary)]" style={{ marginBottom: '12px' }}>
                  <BoltIcon />
                </div>
                <p className="text-xl font-bold text-[var(--text-primary)]" style={{ marginBottom: '4px' }}>{mockStats.totalCharges}</p>
                <p className="text-xs text-[var(--text-secondary)]">{t('totalCharges')}</p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-[var(--primary)] bg-opacity-10 flex items-center justify-center mx-auto text-[var(--primary)]" style={{ marginBottom: '12px' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <p className="text-xl font-bold text-[var(--text-primary)]" style={{ marginBottom: '4px' }}>{mockStats.totalEnergy}</p>
                <p className="text-xs text-[var(--text-secondary)]">kWh</p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-[var(--accent)] bg-opacity-10 flex items-center justify-center mx-auto text-[var(--accent)]" style={{ marginBottom: '12px' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-xl font-bold text-[var(--text-primary)]" style={{ marginBottom: '4px' }}>{mockStats.totalSpent}€</p>
                <p className="text-xs text-[var(--text-secondary)]">{t('totalSpent')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Menu */}
        <Card className="overflow-hidden" padding="none" style={{ marginBottom: '20px' }}>
          <MenuItem icon={<UserIcon />} label={t('personalInfo')} />
          <div className="border-t border-[var(--border-light)]" />
          <MenuItem icon={<CreditCardIcon />} label={t('paymentMethods')} />
          <div className="border-t border-[var(--border-light)]" />
          <MenuItem icon={<BellIcon />} label={t('notifications')} />
          <div className="border-t border-[var(--border-light)]" />
          <MenuItem icon={<CogIcon />} label={t('settings')} />
        </Card>

        <Card className="overflow-hidden" padding="none">
          <MenuItem icon={<QuestionIcon />} label={t('help')} />
          <div className="border-t border-[var(--border-light)]" />
          <MenuItem
            icon={<LogoutIcon />}
            label={t('logout')}
            danger
            onClick={handleLogout}
          />
        </Card>

        {/* Verzia */}
        <p className="text-center text-sm text-[var(--text-muted)]" style={{ marginTop: '32px', marginBottom: '16px' }}>
          Perun Electromobility v1.0.0
        </p>
      </div>
    </AppLayout>
  );
}
