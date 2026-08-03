/**
 * Initializes `window.dataLayer` (GTM).
 * Mirrors avast2 `head.html` dataLayer block.
 */

import { getMetadata } from '../aem.js';
import { PAGE_GROUP, buildAnalyticsContext } from './utils.js';

/**
 * Builds the initial dataLayer page object.
 * @param {ReturnType<typeof buildAnalyticsContext>} [ctx]
 * @returns {object}
 */
export function buildDataLayerPagePush(ctx = buildAnalyticsContext(getMetadata)) {
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
 * @param {ReturnType<typeof buildAnalyticsContext>} [ctx]
 */
export default function initGoogleDataLayer(ctx = buildAnalyticsContext(getMetadata)) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(buildDataLayerPagePush(ctx));

  if (navigator.globalPrivacyControl) {
    window.dataLayer.push({ event: 'gpcDetected' });
  }
}
