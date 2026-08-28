/**
 * Analytics orchestrator — builds data layers then loads vendor tags.
 *
 * Mirrors avast2 `head.html` + `analytics.html` load order:
 * 1. dataLayer / nortonAnalytics / sdl / sdlObj / client-info
 * 2. Declarative link tracking: inid, campaign marker, `s.tl`
 * 3. SDL page-load events (`server` / `session` / `screen`)
 * 4. Target pre-hiding (if enabled)
 * 5. GTM (feature-flag gated)
 * 6. Adobe Launch
 */

import { getMetadata } from '../aem.js';
import env from '../env.js';
import buildAnalyticsContext from '../util/context.js';
import initGlobalCampaignMarker from './global-campaign-marker.js';
import initGlobalInidLink from './global-inid-link.js';
import initGlobalStl from './global-stl.js';
import initGoogleDataLayer from './google-data-layer.js';
import initNortonAnalytics from './norton-analytics.js';
import pushSdlPageLoad from './global-sdl.js';
import initSdl from './sdl.js';
import loadVendorTags from './vendor-tags.js';

/**
 * Returns true when analytics should be skipped (legal / opt-out pages).
 * @returns {boolean}
 */
export function isAnalyticsDisabled() {
  return getMetadata('analytics') === 'off';
}

/**
 * Initializes all analytics data layers and vendor tags for the current page.
 */
export default async function initAnalytics() {
  if (isAnalyticsDisabled()) return;

  window.FEATURE_FLAGS = env.featureFlags || [];

  const ctx = await buildAnalyticsContext(getMetadata);

  // Data layer objects before any MarTech consumers.
  initGoogleDataLayer(ctx);
  initNortonAnalytics(ctx);
  const clientInfoReady = initSdl(ctx);

  // Link tracking, in avast2 `defer.js` order. All three need nortonAnalytics
  // for their template tokens. inid and the campaign marker both rewrite
  // external hrefs, so their relative order decides query-parameter order;
  // global-stl is last and mutates nothing.
  initGlobalInidLink();
  initGlobalCampaignMarker();
  initGlobalStl();

  // Chained off client-info so GTM-WPC6R3K sees `client` before `screen`.
  // Deliberately not awaited: GTM picks up entries pushed either side of its own
  // bootstrap, so there is no reason to hold the vendor tags for the fetch.
  pushSdlPageLoad(clientInfoReady);

  await loadVendorTags();
}
