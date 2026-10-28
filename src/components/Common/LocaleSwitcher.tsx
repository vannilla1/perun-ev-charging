'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { locales, localeNames } from '@/i18n/config';
import { setLocale } from '@/i18n/actions';

/** Prepínač jazyka (nastavenia, prihlásenie). */
export function LocaleSwitcher({ className = '' }: { className?: string }) {
  const locale = useLocale();
  const t = useTranslations('common.language');
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <select
      aria-label={t('change')}
      value={locale}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        startTransition(async () => {
          await setLocale(next);
          router.refresh();
        });
      }}
      className={`h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium text-[var(--text-primary)] ${pending ? 'cursor-wait' : 'cursor-pointer'} ${className}`}
    >
      {locales.map((l) => (
        <option key={l} value={l} lang={l}>
          {localeNames[l]}
        </option>
      ))}
    </select>
  );
}
