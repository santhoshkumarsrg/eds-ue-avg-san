/**
 * Shared page analytics context used by norton / dataLayer / sdl builders.
 */

import { MISSING, PAGE_GROUP } from './constants.js';
import { resolveLocale } from './locale.js';
import {
  buildRelativeScreenPath,
  getContentSegments,
  getVanityPathFromUrl,
  normalizeName,
  resolveSiteSectionsFromPath,
} from './path.js';
import { uuidFromPath } from './page-id.js';
import { buildScreenName } from './screen-name.js';
import findVariantMapping from './variant.js';

/**
 * Builds the shared analytics context for the current page.
 * @param {(name: string) => string} getMetadata
 * @param {{ pathname?: string, search?: string, langHint?: string }} [locationLike]
 * @returns {Promise<object>}
 */
export default async function buildAnalyticsContext(getMetadata, locationLike = {}) {
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

  // avast2 puts pageType/lineOfBusiness as authored (blank when unset).
  // Line of business dialog default in AEM is "consumer".
  const pageType = getMetadata('page-type') || '';
  const lineOfBusiness = getMetadata('line-of-business') || 'consumer';
  // Deterministic UUID from path (replaces AEM jcr:uuid / page-id metadata).
  const pageId = await uuidFromPath(pathname);

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
