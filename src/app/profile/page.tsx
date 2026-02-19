'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AppLayout, PageHeader } from '@/components/Layout';
import { Button } from '@/components/Common';
import { useAuth } from '@/contexts';

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onClick?: () => void;
  danger?: boolean;
  href?: string;
  accent?: string;
}

const MenuItem = ({ icon, label, value, onClick, danger, href, accent }: MenuItemProps) => {
  const content = (
    <>
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: danger ? 'rgba(255, 61, 113, 0.1)' : 'rgba(122, 156, 192, 0.08)',
            color: danger ? '#FF3D71' : accent || 'var(--text-secondary)',
          }}
        >
          {icon}
        </div>
        <span
          className="font-medium text-sm"
          style={{ color: danger ? '#FF3D71' : 'var(--text-primary)' }}
        >
          {label}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {value && (
          <span className="text-xs px-2 py-1 rounded-md" style={{ color: 'var(--text-muted)', background: 'rgba(0,212,255,0.06)' }}>
            {value}
          </span>
        )}
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: 'var(--text-muted)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </>
  );

  const baseClass = "w-full flex items-center justify-between p-3.5 transition-all duration-200";

  const handleHover = (e: React.MouseEvent<HTMLElement>, entering: boolean) => {
    (e.currentTarget as HTMLElement).style.background = entering
      ? danger ? 'rgba(255, 61, 113, 0.05)' : 'rgba(0, 212, 255, 0.04)'
      : 'transparent';
  };

  if (href) {
    return (
      <Link href={href} className={baseClass} onMouseEnter={(e) => handleHover(e, true)} onMouseLeave={(e) => handleHover(e, false)}>
        {content}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={baseClass} onMouseEnter={(e) => handleHover(e, true)} onMouseLeave={(e) => handleHover(e, false)}>
      {content}
    </button>
  );
};

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const CreditCardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

const BellIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

const CogIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const QuestionIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const LogoutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

const BoltIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const LoginIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
  </svg>
);

const TrendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const EuroIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const menuDivider = (
  <div style={{ height: '1px', background: 'rgba(0, 212, 255, 0.06)', margin: '0 16px' }} />
);

export default function ProfilePage() {
  const t = useTranslations('profile');
  const router = useRouter();
  const { user, isLoggedIn, isLoading, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const mockStats = {
    totalCharges: 23,
    totalEnergy: 428,
    totalSpent: 85,
  };

  if (isLoading) {
    return (
      <AppLayout header={<PageHeader title={t('title')} />}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div
              className="rounded-full flex items-center justify-center animate-electric"
              style={{
                width: '64px', height: '64px',
                background: 'linear-gradient(135deg, #00D4FF, #00FF88)',
                margin: '0 auto 16px',
              }}
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#080C14' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: "'Space Mono', monospace", letterSpacing: '0.05em' }}>
              NAČÍTAVAM...
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!isLoggedIn) {
    return (
      <AppLayout header={<PageHeader title={t('title')} />}>
        <div className="p-4 max-w-lg mx-auto">
          <div
            className="text-center py-14 px-6 rounded-2xl"
            style={{
              background: 'var(--surface-card)',
              border: '1px solid var(--border)',
            }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{
                background: 'rgba(0, 212, 255, 0.08)',
                border: '1px solid rgba(0, 212, 255, 0.15)',
                color: '#00D4FF',
              }}
            >
              <LoginIcon />
            </div>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Prihláste sa
            </h2>
            <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
              Pre zobrazenie profilu a histórie nabíjaní sa musíte prihlásiť
            </p>
            <div className="space-y-3">
              <Button fullWidth onClick={() => router.push('/login')} size="lg">
                Prihlásiť sa
              </Button>
              <Button variant="outline" fullWidth onClick={() => router.push('/register')}>
                Vytvoriť účet
              </Button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  const getInitials = () => {
    if (!user) return '?';
    return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`;
  };

  return (
    <AppLayout header={<PageHeader title={t('title')} />}>
      <div className="max-w-lg mx-auto px-4 pt-5 pb-6">

        {/* Profilová karta */}
        <div
          className="rounded-2xl overflow-hidden mb-5"
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ height: '2px', background: 'linear-gradient(90deg, #00D4FF, #00FF88)' }} />
          <div className="p-4 flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold shrink-0"
              style={{
                background: 'linear-gradient(135deg, #00D4FF, #00FF88)',
                color: '#080C14',
                fontFamily: "'Space Mono', monospace",
                boxShadow: '0 4px 20px rgba(0,212,255,0.3)',
              }}
            >
              {getInitials()}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-base truncate" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                {user?.firstName} {user?.lastName}
              </h2>
              <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {user?.email}
              </p>
            </div>
            <button
              className="p-2 rounded-xl shrink-0"
              style={{ color: 'var(--text-muted)', background: 'rgba(0,212,255,0.06)' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Štatistiky */}
        <div
          className="rounded-2xl p-4 mb-5"
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border)',
          }}
        >
          <p className="text-xs font-semibold mb-4 uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
            {t('statistics')}
          </p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: mockStats.totalCharges, label: t('totalCharges'), unit: '', color: '#00FF88', glow: 'rgba(0,255,136,0.12)', Icon: BoltIcon },
              { value: mockStats.totalEnergy, label: 'Energia', unit: 'kWh', color: '#00D4FF', glow: 'rgba(0,212,255,0.12)', Icon: TrendIcon },
              { value: mockStats.totalSpent, label: t('totalSpent'), unit: '€', color: '#FF8C00', glow: 'rgba(255,140,0,0.12)', Icon: EuroIcon },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2"
                  style={{ background: stat.glow, color: stat.color }}
                >
                  <stat.Icon />
                </div>
                <p
                  className="text-xl font-bold leading-none mb-1"
                  style={{ color: stat.color, fontFamily: "'Space Mono', monospace" }}
                >
                  {stat.value}{stat.unit}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Menu 1 */}
        <div
          className="rounded-2xl overflow-hidden mb-3"
          style={{ background: 'var(--surface-card)', border: '1px solid var(--border)' }}
        >
          <MenuItem icon={<UserIcon />} label={t('personalInfo')} />
          {menuDivider}
          <MenuItem icon={<CreditCardIcon />} label={t('paymentMethods')} value="Visa ···· 1234" accent="#00D4FF" />
          {menuDivider}
          <MenuItem icon={<BellIcon />} label={t('notifications')} />
          {menuDivider}
          <MenuItem icon={<CogIcon />} label={t('settings')} />
        </div>

        {/* Menu 2 */}
        <div
          className="rounded-2xl overflow-hidden mb-6"
          style={{ background: 'var(--surface-card)', border: '1px solid var(--border)' }}
        >
          <MenuItem icon={<QuestionIcon />} label={t('help')} />
          {menuDivider}
          <MenuItem icon={<LogoutIcon />} label={t('logout')} danger onClick={handleLogout} />
        </div>

        <p
          className="text-center text-xs"
          style={{ color: 'var(--text-muted)', fontFamily: "'Space Mono', monospace", letterSpacing: '0.05em' }}
        >
          PERUN ELECTROMOBILITY v1.0.0
        </p>
      </div>
    </AppLayout>
  );
}
