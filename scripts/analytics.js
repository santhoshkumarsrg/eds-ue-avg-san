/**
 * Builds the `window.nortonAnalytics` data layer for every page.
 *
 * Mirrors Avast AEM logic from:
 * - AvastAnalytics.java
 * - AnalyticsUtilImpl.generateDataLayerValues()
 *
 * In EDS, JCR inheritance / page properties become metadata + URL path segments,
 * and OSGi run modes become `env.js`.
 */

import { getMetadata } from './aem.js';
import env from './env.js';

const MISSING = 'missing';
const REGEX_PAGE_NAME_INVALID_CHARS = /[^\w\d\s\-&.]/g;
/** Full-segment locale only (e.g. en-ww, en-us). Must not match inside "santhosh-test". */
const REGEX_LOCALE_SEGMENT = /^[a-z]{2}-[a-z]{2,3}$/i;
const DEFAULT_LOCALE = 'en-ww';

/**
 * Normalizes a page/segment name the same way AEM does
 * (`toLowerCase().replaceAll("[^\\w\\d\\s-&.]", "")`).
 * @param {string} value
 * @returns {string}
 */
function normalizeName(value) {
  if (!value) return '';
  return value.toLowerCase().replace(REGEX_PAGE_NAME_INVALID_CHARS, '');
}

/**
 * Returns true when value is a full locale token like `en-ww` / `en-us`.
 * @param {string} value
 * @returns {boolean}
 */
function isLocaleSegment(value) {
  return REGEX_LOCALE_SEGMENT.test(value || '');
}

/**
 * Extracts a locale from the first path segment when it is a real locale token.
 * @param {string} pathname
 * @returns {string} locale or empty string when the path has no locale prefix
 */
function getLocaleFromPath(pathname) {
  const first = pathname.split('/').filter(Boolean)[0] || '';
  return isLocaleSegment(first) ? first.toLowerCase() : '';
}

/**
 * Parses `lang-country` into language + country parts.
 * @param {string} locale
 * @returns {{ siteLanguage: string, siteCountry: string }}
 */
function splitLocale(locale) {
  if (!locale || !locale.includes('-')) {
    return { siteLanguage: (locale || '').toLowerCase(), siteCountry: '' };
  }
  const [lang, country] = locale.toLowerCase().split('-');
  return { siteLanguage: lang || '', siteCountry: country || '' };
}

/**
 * Parses site language and country from lang meta / `<html lang>` (authoritative),
 * then URL locale prefix, then `en-ww`.
 *
 * Lang meta is the true source: a `/fr-fr/...` URL with meta `en-ww` resolves to
 * `en` / `ww`. `scripts.js` removes `<meta name="lang">` after copying it to
 * `document.documentElement.lang`, so delayed analytics reads that first.
 *
 * Applies Avast country remaps: lm+es → lam, uk+en → gb.
 *
 * @returns {{ siteLanguage: string, siteCountry: string }}
 */
function resolveLocale() {
  // Prefer <html lang> (set in eager); meta[name=lang] is removed by then.
  const langHint = document.documentElement.lang || getMetadata('lang') || '';
  let { siteLanguage, siteCountry } = isLocaleSegment(langHint)
    ? splitLocale(langHint)
    : { siteLanguage: '', siteCountry: '' };

  if (!siteLanguage || !siteCountry) {
    const localeFromPath = getLocaleFromPath(window.location.pathname);
    if (localeFromPath) {
      ({ siteLanguage, siteCountry } = splitLocale(localeFromPath));
    }
  }

  if (!siteLanguage || !siteCountry) {
    ({ siteLanguage, siteCountry } = splitLocale(DEFAULT_LOCALE));
  }

  if (siteCountry === 'lm' && siteLanguage === 'es') {
    siteCountry = 'lam';
  } else if (siteCountry === 'uk' && siteLanguage === 'en') {
    siteCountry = 'gb';
  }

  return { siteLanguage, siteCountry };
}

/**
 * Returns path segments after an optional leading locale (`en-us`, `en-ww`).
 * @param {string} pathname
 * @returns {string[]}
 */
function getContentSegments(pathname) {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length && isLocaleSegment(segments[0])) {
    return segments.slice(1);
  }
  return segments;
}

/**
 * Derives site_sub_section / site_sub_sub_section from content path depth,
 * matching AnalyticsUtilImpl absoluteParent(4/5) behaviour for EDS paths.
 *
 * Examples (after locale):
 * - products/privacy/antitrack → products / privacy
 * - products/premium-security  → products / missing
 * - products                   → na / missing
 *
 * @param {string[]} contentSegments
 * @returns {{ siteSubSection: string, siteSubSubSection: string }}
 */
function resolveSiteSectionsFromPath(contentSegments) {
  if (contentSegments.length >= 3) {
    return {
      siteSubSection: normalizeName(contentSegments[0]) || 'na',
      siteSubSubSection: normalizeName(contentSegments[1]) || MISSING,
    };
  }
  if (contentSegments.length === 2) {
    return {
      siteSubSection: normalizeName(contentSegments[0]) || 'na',
      siteSubSubSection: MISSING,
    };
  }
  return {
    siteSubSection: 'na',
    siteSubSubSection: MISSING,
  };
}

/**
 * Builds the nortonAnalytics payload for the current page.
 * @returns {object}
 */
export function buildNortonAnalytics() {
  const { siteLanguage, siteCountry } = resolveLocale();
  const contentSegments = getContentSegments(window.location.pathname);
  const fromPath = resolveSiteSectionsFromPath(contentSegments);

  const pageNameOverride = getMetadata('page-name');
  const lastSegment = contentSegments[contentSegments.length - 1] || '';
  const pageName = normalizeName(pageNameOverride) || normalizeName(lastSegment) || MISSING;

  const contentTitle = getMetadata('title') || document.title || pageName;

  const siteSection = getMetadata('site-section') || 'avg.com';
  const siteSubSection = getMetadata('site-sub-section') || fromPath.siteSubSection;
  const siteSubSubSection = getMetadata('site-sub-sub-section') || fromPath.siteSubSubSection;

  // Limited-locale prepend code (Avast LanguageCountryMapping); empty for most pages.
  const langCtryCode = getMetadata('lang') || '';

  return {
    account: env.analyticsAccount,
    site_country: siteCountry,
    site_language: siteLanguage,
    content_title: contentTitle,
    content_format: 'html',
    content_type: 'page',
    site_section: siteSection,
    site_sub_section: siteSubSection,
    site_sub_sub_section: siteSubSubSection,
    page_name: pageName,
    lang_ctry_code: langCtryCode,
    environment: env.analyticsEnvironment,
  };
}

/**
 * Initializes `window.nortonAnalytics` for the current page.
 * Also copies `inid` from localStorage when present (same as Avast analytics.html).
 */
export default function initNortonAnalytics() {
  window.nortonAnalytics = buildNortonAnalytics();

  try {
    const inid = localStorage.getItem('inid');
    if (inid) {
      window.nortonAnalytics.inid = inid;
      localStorage.removeItem('inid');
    }
  } catch {
    // localStorage may be unavailable
  }
}
