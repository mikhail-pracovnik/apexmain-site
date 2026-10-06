import ru from './ru.json';
import kk from './kk.json';
import en from './en.json';
import { site } from '../config/site';

export const locales = ['ru', 'kk', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'ru';

export type Dict = typeof ru;
const dicts: Record<Locale, Dict> = { ru, kk: kk as Dict, en: en as Dict };

/** BCP 47 tags for <html lang>, hreflang and og:locale. */
export const htmlLang: Record<Locale, string> = { ru: 'ru', kk: 'kk', en: 'en' };
export const ogLocale: Record<Locale, string> = { ru: 'ru_RU', kk: 'kk_KZ', en: 'en_US' };

export function t(locale: Locale): Dict {
  return dicts[locale];
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (locales as readonly string[]).includes(value);
}

/** Static paths for `[...locale]` routes: `undefined` renders the default locale at the root. */
export function localeStaticPaths() {
  return locales.map((locale) => ({
    params: { locale: locale === defaultLocale ? undefined : locale },
    props: { locale },
  }));
}

const base = site.base.replace(/\/$/, '');

/** Site-relative URL for a page in a locale, e.g. url('kk', 'examples') → /apexmain-site/kk/examples/ */
export function url(locale: Locale, path = ''): string {
  const clean = path.replace(/^\/|\/$/g, '');
  const parts = [base, locale === defaultLocale ? '' : locale, clean].filter(Boolean);
  return `/${parts.join('/').replace(/^\//, '')}/`.replace(/\/{2,}/g, '/');
}

/** Absolute URL (for canonical, hreflang, Open Graph). */
export function absoluteUrl(locale: Locale, path = ''): string {
  return new URL(url(locale, path), site.origin).href;
}

/** URL of a file in /public, respecting the base path. */
export function asset(path: string): string {
  return `${base}/${path.replace(/^\//, '')}`;
}

/** Replace {placeholders} in a template string. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? `{${key}}`));
}
