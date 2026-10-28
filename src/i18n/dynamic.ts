/**
 * Preklad kľúča, ktorý vznikne až za behu (stav z API, typ upozornenia).
 * Typované useTranslations/getTranslations prijímajú len známe kľúče —
 * neznámu hodnotu (napr. nový stav z CSMS) vráti ako fallback namiesto chyby.
 */

type Values = Record<string, string | number | Date>;
interface DynamicTranslator {
  (key: never, values?: never): string;
  has(key: never): boolean;
}

export function translateOr(t: DynamicTranslator, key: string, fallback: string, values?: Values): string {
  return t.has(key as never) ? t(key as never, values as never) : fallback;
}

