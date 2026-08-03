/**
 * Shared analytics helpers ported from Avast AnalyticsUtilImpl / AvastAnalytics.
 *
 * Pure functions are safe to unit-test in Node; DOM-dependent helpers read
 * `document` / `window` only when called in the browser.
 */

export const MISSING = 'missing';
export const PAGE_GROUP = 'Homepage';
export const DEFAULT_LOCALE = 'en-ww';

const REGEX_PAGE_NAME_INVALID_CHARS = /[^\w\d\s\-&.]/g;
/** Allows `/` and `.` for relative screen paths (AEM screen_name normalization). */
const REGEX_SCREEN_PATH_INVALID_CHARS = /[^\w\d\s\-&./]/g;
/** Full-segment locale only (e.g. en-ww, en-us). Must not match inside "santhosh-test". */
const REGEX_LOCALE_SEGMENT = /^[a-z]{2}-[a-z]{2,3}$/i;

/**
 * Normalizes a page/segment name the same way AEM does
 * (`toLowerCase().replaceAll("[^\\w\\d\\s-&.]", "")`).
 * @param {string} value
 * @returns {string}
 */
export function normalizeName(value) {
  if (!value) return '';
  return value.toLowerCase().replace(REGEX_PAGE_NAME_INVALID_CHARS, '');
}

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

/**
 * Returns path segments after an optional leading locale (`en-us`, `en-ww`).
 * @param {string} pathname
 * @returns {string[]}
 */
export function getContentSegments(pathname) {
  const segments = (pathname || '').split('/').filter(Boolean);
  if (segments.length && isLocaleSegment(segments[0])) {
    return segments.slice(1);
  }
  return segments;
}

/**
 * Derives site_sub_section / site_sub_sub_section from content path depth.
 *
 * @param {string[]} contentSegments
 * @returns {{ siteSubSection: string, siteSubSubSection: string }}
 */
export function resolveSiteSectionsFromPath(contentSegments) {
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
 * Strips leading/trailing slashes and lowercases (AEM normalizeVanityPath).
 * @param {string} vanityUrl
 * @returns {string}
 */
export function normalizeVanityPath(vanityUrl) {
  if (!vanityUrl) return '';
  let v = vanityUrl.trim();
  while (v.startsWith('/')) v = v.slice(1);
  while (v.endsWith('/')) v = v.slice(0, -1);
  return v.toLowerCase();
}

/**
 * Derives vanity path from the URL: strip locale prefix, keep remaining path.
 * e.g. `/en-us/products/privacy/antitrack` → `products/privacy/antitrack`
 *
 * @param {string} pathname
 * @returns {string}
 */
export function getVanityPathFromUrl(pathname) {
  const contentSegments = getContentSegments(pathname);
  if (!contentSegments.length) return '';
  return normalizeVanityPath(contentSegments.join('/'));
}

/**
 * Builds relative screen path from content segments (normalized).
 * @param {string[]} contentSegments
 * @param {string} fallbackPageName
 * @returns {string}
 */
export function buildRelativeScreenPath(contentSegments, fallbackPageName) {
  if (!contentSegments.length) return fallbackPageName || '';
  return contentSegments
    .map((seg) => normalizeName(seg))
    .filter(Boolean)
    .join('/') || fallbackPageName || '';
}

/**
 * Maps CMS node name `homepage` to `index` for screen_name.
 * @param {string} normalizedSegment
 * @returns {string}
 */
export function homepageToIndex(normalizedSegment) {
  if (normalizedSegment == null) return '';
  return normalizedSegment === 'homepage' ? 'index' : normalizedSegment;
}

/**
 * Builds screen_name right-hand side from a vanity path.
 * @param {string} locale
 * @param {boolean} localeInUrl
 * @param {string} normalizedVanity
 * @returns {string}
 */
export function screenNameFromVanity(locale, localeInUrl, normalizedVanity) {
  let right;
  if (!localeInUrl) {
    right = normalizedVanity;
  } else {
    const localePrefix = `${locale.toLowerCase()}/`;
    if (normalizedVanity.startsWith(localePrefix)) {
      right = normalizedVanity;
    } else {
      right = `${locale}/${normalizedVanity}`;
    }
  }
  return `${locale} | ${right}`;
}

/**
 * Builds `screen_name` as `locale | path` (AnalyticsUtilImpl.buildScreenName).
 *
 * @param {string} siteLanguage
 * @param {string} siteCountry
 * @param {string} pageOrRelativePath relative path or page name when no vanity
 * @param {string} [vanityUrl] vanity path (already URL-derived or empty)
 * @param {boolean} [localeInUrl=true] EDS locale-prefixed URLs default true
 * @returns {string}
 */
export function buildScreenName(
  siteLanguage,
  siteCountry,
  pageOrRelativePath,
  vanityUrl = '',
  localeInUrl = true,
) {
  if (siteLanguage == null || siteCountry == null || pageOrRelativePath == null) {
    return '';
  }
  const locale = `${siteLanguage}-${siteCountry}`;
  const normalizedVanity = normalizeVanityPath(vanityUrl);
  if (normalizedVanity) {
    return screenNameFromVanity(locale, localeInUrl, normalizedVanity);
  }
  const normalizedName = pageOrRelativePath
    .toLowerCase()
    .replace(REGEX_SCREEN_PATH_INVALID_CHARS, '');
  const screenSegment = homepageToIndex(normalizedName);
  const right = localeInUrl ? `${locale}/${screenSegment}` : screenSegment;
  return `${locale} | ${right}`;
}

/**
 * Parses variant-mapping metadata JSON and returns the matching entry for `expid`.
 * @param {string} mappingJson
 * @param {string} expId
 * @returns {{ expIdParam?: string, pageName?: string, contentTitle?: string }|null}
 */
export function findVariantMapping(mappingJson, expId) {
  if (!mappingJson || !expId) return null;
  try {
    const list = JSON.parse(mappingJson);
    if (!Array.isArray(list)) return null;
    return list.find((item) => item && item.expIdParam === expId) || null;
  } catch {
    return null;
  }
}

/**
 * Shared page analytics context used by norton / dataLayer / sdl builders.
 * @param {(name: string) => string} getMetadata
 * @param {{ pathname?: string, search?: string, langHint?: string }} [locationLike]
 * @returns {object}
 */
export function buildAnalyticsContext(getMetadata, locationLike = {}) {
  const pathname = locationLike.pathname
    ?? (typeof window !== 'undefined' ? window.location.pathname : '');
  const search = locationLike.search
    ?? (typeof window !== 'undefined' ? window.location.search : '');
  const langHint = locationLike.langHint
    ?? (typeof document !== 'undefined'
      ? (document.documentElement.lang || getMetadata('lang') || '')
      : (getMetadata('lang') || ''));

  const { siteLanguage, siteCountry } = resolveLocale({ langHint, pathname });
  const contentSegments = getContentSegments(pathname);
  const fromPath = resolveSiteSectionsFromPath(contentSegments);

  const pageNameOverride = getMetadata('page-name');
  const lastSegment = contentSegments[contentSegments.length - 1] || '';
  let pageName = normalizeName(pageNameOverride) || normalizeName(lastSegment) || MISSING;

  const contentTitleMeta = getMetadata('content-title');
  let contentTitle = contentTitleMeta || pageName;

  const siteSection = getMetadata('site-section') || 'avg.com';
  const siteSubSection = getMetadata('site-sub-section') || fromPath.siteSubSection;
  const siteSubSubSection = getMetadata('site-sub-sub-section') || fromPath.siteSubSubSection;

  const pageType = getMetadata('page-type') || MISSING;
  const lineOfBusiness = getMetadata('line-of-business') || MISSING;
  const pageId = getMetadata('page-id') || '';

  const vanityPath = getVanityPathFromUrl(pathname);
  let relativePath = buildRelativeScreenPath(contentSegments, pageName);

  // Variant experiment override via ?expid= (AvastConstants.PARAM_VARIANT).
  const expId = new URLSearchParams(search).get('expid') || '';
  const variant = findVariantMapping(getMetadata('variant-mapping'), expId);
  if (variant) {
    if (variant.contentTitle) {
      contentTitle = variant.contentTitle;
    }
    if (variant.pageName) {
      pageName = normalizeName(variant.pageName) || pageName;
      // Variant overrides page_name; do not use vanity so screen_name matches variant slug.
      relativePath = pageName;
    }
  }

  const screenName = variant?.pageName
    ? buildScreenName(siteLanguage, siteCountry, pageName, null)
    : buildScreenName(siteLanguage, siteCountry, relativePath, vanityPath);

  const locale = `${siteLanguage}-${siteCountry}`;

  return {
    siteLanguage,
    siteCountry,
    locale,
    contentSegments,
    pageName,
    contentTitle,
    siteSection,
    siteSubSection,
    siteSubSubSection,
    pageType,
    lineOfBusiness,
    pageId,
    vanityPath,
    relativePath,
    screenName,
    pageGroup: PAGE_GROUP,
  };
}
