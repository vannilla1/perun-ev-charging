/**
 * Jazyky aplikácie. Nový jazyk = pridať kód sem, priečinok src/locales/<kód>/
 * (kópia src/locales/en) a loader v src/i18n/request.ts — TypeScript a
 * `npm run check:i18n` ohlásia všetko, čo chýba.
 */

export const locales = ['sk', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'sk';

/** Cookie s jazykom (konvencia next-intl). */
export const LOCALE_COOKIE = 'NEXT_LOCALE';

/** Názov jazyka v ňom samom — pre prepínač. */
export const localeNames: Record<Locale, string> = {
  sk: 'Slovenčina',
  en: 'English',
};

/** BCP 47 tag pre Intl (dátumy, čísla, meny, triedenie). */
export const intlLocale: Record<Locale, string> = {
  sk: 'sk-SK',
  en: 'en-GB',
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (locales as readonly string[]).includes(value);
}
