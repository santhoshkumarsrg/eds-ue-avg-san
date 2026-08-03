/**
 * URL path helpers: content segments, site sections, vanity path.
 */

import { MISSING } from './constants.js';
import { isLocaleSegment } from './locale.js';

const REGEX_PAGE_NAME_INVALID_CHARS = /[^\w\d\s\-&.]/g;

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
