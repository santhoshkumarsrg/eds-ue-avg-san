/**
 * Builds and initializes `window.nortonAnalytics`.
 * Mirrors avast2 `analytics.html` nortonAnalytics block.
 */

import { getMetadata } from '../aem.js';
import env from '../env.js';

const SKU_PAGE_TYPES = new Set(['onboarding', 'Benefits', '75D']);

/**
 * Builds the nortonAnalytics payload for the current page.
 * @param {object} ctx analytics context from buildAnalyticsContext()
 * @returns {object}
 */
export function buildNortonAnalytics(ctx) {
  return {
    account: env.analyticsAccount,
    site_country: ctx.siteCountry,
    site_language: ctx.siteLanguage,
    content_title: ctx.contentTitle,
    content_format: 'html',
    content_type: 'page',
    site_section: ctx.siteSection,
    site_sub_section: ctx.siteSubSection,
    site_sub_sub_section: ctx.siteSubSubSection,
    page_name: ctx.pageName,
    // Limited-locale prepend code (Avast LanguageCountryMapping); empty for most pages.
    lang_ctry_code: '',
    environment: env.analyticsEnvironment,
  };
}

/**
 * Initializes `window.nortonAnalytics` for the current page.
 * Also copies `inid` from localStorage and applies spa / avast-sku when applicable.
 * @param {object} ctx analytics context from buildAnalyticsContext()
 */
export default function initNortonAnalytics(ctx) {
  window.nortonAnalytics = buildNortonAnalytics(ctx);

  try {
    const inid = localStorage.getItem('inid');
    if (inid) {
      window.nortonAnalytics.inid = inid;
      localStorage.removeItem('inid');
    }
  } catch {
    // localStorage may be unavailable
  }

  const pageType = getMetadata('page-type');
  if (pageType === 'onboarding') {
    window.nortonAnalytics.spa = true;
  }

  if (SKU_PAGE_TYPES.has(pageType)) {
    const sku = window.location.search.match(/(?<=sku=)[^&]+/);
    if (sku) {
      window.nortonAnalytics['avast-sku'] = sku[0].toUpperCase();
    }
  }
}
