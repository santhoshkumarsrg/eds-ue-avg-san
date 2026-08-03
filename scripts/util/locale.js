/**
 * Locale resolution helpers (lang / country from meta, URL, defaults).
 */

import { DEFAULT_LOCALE } from './constants.js';

/** Full-segment locale only (e.g. en-ww, en-us). Must not match inside "santhosh-test". */
const REGEX_LOCALE_SEGMENT = /^[a-z]{2}-[a-z]{2,3}$/i;

/**
 * Returns true when value is a full locale token like `en-ww` / `en-us`.
 * @param {string} value
 * @returns {boolean}
 */
export function isLocaleSegment(value) {
  return REGEX_LOCALE_SEGMENT.test(value || '');
}

/**
 * Extracts a locale from the first path segment when it is a real locale token.
 * @param {string} pathname
 * @returns {string} locale or empty string when the path has no locale prefix
 */
export function getLocaleFromPath(pathname) {
  const first = (pathname || '').split('/').filter(Boolean)[0] || '';
  return isLocaleSegment(first) ? first.toLowerCase() : '';
}

/**
 * Parses `lang-country` into language + country parts.
 * @param {string} locale
 * @returns {{ siteLanguage: string, siteCountry: string }}
 */
export function splitLocale(locale) {
  if (!locale || !locale.includes('-')) {
    return { siteLanguage: (locale || '').toLowerCase(), siteCountry: '' };
  }
  const [lang, country] = locale.toLowerCase().split('-');
  return { siteLanguage: lang || '', siteCountry: country || '' };
}

/**
 * Applies Avast country remaps: lm+es → lam, uk+en → gb.
 * @param {string} siteLanguage
 * @param {string} siteCountry
 * @returns {{ siteLanguage: string, siteCountry: string }}
 */
export function remapCountry(siteLanguage, siteCountry) {
  let country = siteCountry;
  if (country === 'lm' && siteLanguage === 'es') {
    country = 'lam';
  } else if (country === 'uk' && siteLanguage === 'en') {
    country = 'gb';
  }
  return { siteLanguage, siteCountry: country };
}

/**
 * Parses site language and country from lang meta / `<html lang>` (authoritative),
 * then URL locale prefix, then `en-ww`.
 *
 * @param {{ langHint?: string, pathname?: string }} [opts]
 * @returns {{ siteLanguage: string, siteCountry: string }}
 */
export function resolveLocale(opts = {}) {
  const langHint = opts.langHint
    ?? (typeof document !== 'undefined'
      ? (document.documentElement.lang || '')
      : '');
  const pathname = opts.pathname
    ?? (typeof window !== 'undefined' ? window.location.pathname : '');

  let { siteLanguage, siteCountry } = isLocaleSegment(langHint)
    ? splitLocale(langHint)
    : { siteLanguage: '', siteCountry: '' };

  if (!siteLanguage || !siteCountry) {
    const localeFromPath = getLocaleFromPath(pathname);
    if (localeFromPath) {
      ({ siteLanguage, siteCountry } = splitLocale(localeFromPath));
    }
  }

  if (!siteLanguage || !siteCountry) {
    ({ siteLanguage, siteCountry } = splitLocale(DEFAULT_LOCALE));
  }

  return remapCountry(siteLanguage, siteCountry);
}
