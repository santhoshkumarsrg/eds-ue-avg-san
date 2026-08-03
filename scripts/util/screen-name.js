/**
 * screen_name builders (AnalyticsUtilImpl.buildScreenName).
 */

import { normalizeVanityPath } from './path.js';

/** Allows `/` and `.` for relative screen paths (AEM screen_name normalization). */
const REGEX_SCREEN_PATH_INVALID_CHARS = /[^\w\d\s\-&./]/g;

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
 * Builds `screen_name` as `locale | path`.
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
