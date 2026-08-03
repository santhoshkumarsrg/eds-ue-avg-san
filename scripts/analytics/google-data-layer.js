/**
 * Initializes `window.dataLayer` (GTM).
 * Mirrors avast2 `head.html` dataLayer block.
 */

import { PAGE_GROUP } from '../util/constants.js';

/**
 * Builds the initial dataLayer page object.
 * @param {object} ctx analytics context from buildAnalyticsContext()
 * @returns {object}
 */
export function buildDataLayerPagePush(ctx) {
  return {
    contentLocale: ctx.locale,
    pageName: `${ctx.locale} | ${ctx.locale}/${ctx.pageName}`,
    pageId: ctx.pageId,
    contentGroup: ctx.lineOfBusiness,
    pageGroup: PAGE_GROUP,
  };
}

/**
 * Initializes `window.dataLayer` and pushes the page object (+ optional GPC event).
 * @param {object} ctx analytics context from buildAnalyticsContext()
 */
export default function initGoogleDataLayer(ctx) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(buildDataLayerPagePush(ctx));

  if (navigator.globalPrivacyControl) {
    window.dataLayer.push({ event: 'gpcDetected' });
  }
}
