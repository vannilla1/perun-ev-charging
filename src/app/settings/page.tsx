'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AppLayout, PageHeader } from '@/components/Layout';
import { Card, LocaleSwitcher } from '@/components/Common';

interface SettingsItemProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  href?: string;
  action?: React.ReactNode;
}

const SettingsItem = ({ icon, label, description, href, action }: SettingsItemProps) => {
  const content = (
    <>
      <div className="flex items-center gap-3 flex-1">
        <span className="text-[var(--text-secondary)]">{icon}</span>
        <div>
          <span className="font-medium text-[var(--text-primary)]">{label}</span>
          {description && <p className="text-xs text-[var(--text-muted)]">{description}</p>}
        </div>
      </div>
      {action ?? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className="w-full flex items-center justify-between p-4 hover:bg-[var(--surface-secondary)] transition-colors">
        {content}
      </Link>
    );
  }
  if (action) {
    return <div className="w-full flex items-center justify-between gap-3 p-4">{content}</div>;
  }
  return (
    <div className="w-full flex items-center justify-between p-4 text-[var(--text-muted)]">
      {content}
    </div>
  );
};

const Divider = () => <div className="border-t border-[var(--border-light)]" />;

export default function SettingsPage() {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');

  return (
    <AppLayout header={<PageHeader title={t('title')} showBack />}>
      <div className="p-4 max-w-lg mx-auto">
        <Card className="overflow-hidden" padding="none" style={{ marginBottom: '16px' }}>
          <SettingsItem
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>}
            label={t('items.changePassword.label')}
            description={t('items.changePassword.description')}
            href="/settings/change-password"
          />
          <Divider />
          <SettingsItem
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>}
            label={tCommon('language.label')}
            action={<LocaleSwitcher />}
          />
        </Card>

        <Card className="overflow-hidden" padding="none">
          <SettingsItem
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            label={t('items.about.label')}
            description="Perun Electromobility v1.0.0"
          />
        </Card>
      </div>
    </AppLayout>
  );
}
