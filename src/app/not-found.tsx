import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export default async function NotFound() {
  const t = await getTranslations('errors.notFoundPage');
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center bg-[var(--background)]">
      <p className="text-5xl font-bold text-[var(--primary-dark)]">404</p>
      <h1 className="text-xl font-semibold text-[var(--text-primary)]">{t('title')}</h1>
      <p className="text-sm text-[var(--text-secondary)] max-w-sm">{t('description')}</p>
      <Link
        href="/"
        className="mt-2 rounded-xl bg-[var(--primary-dark)] px-5 py-3 text-sm font-semibold text-white"
      >
        {t('home')}
      </Link>
    </main>
  );
}
