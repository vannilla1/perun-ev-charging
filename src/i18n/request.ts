import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from './config';
import type { Messages } from './messages';

const loaders: Record<Locale, () => Promise<{ default: Messages }>> = {
  sk: () => import('../locales/sk'),
  en: () => import('../locales/en'),
};

export default getRequestConfig(async () => {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(value) ? value : defaultLocale;
  return {
    locale,
    messages: (await loaders[locale]()).default,
    timeZone: 'Europe/Bratislava',
  };
});
