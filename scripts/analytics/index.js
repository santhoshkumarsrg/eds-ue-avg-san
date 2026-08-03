/**
 * Analytics orchestrator — builds data layers then loads vendor tags.
 *
 * Mirrors avast2 `head.html` + `analytics.html` load order:
 * 1. dataLayer / nortonAnalytics / sdl / sdlObj / client-info
 * 2. Target pre-hiding (if enabled)
 * 3. GTM (feature-flag gated)
 * 4. Adobe Launch
 */

import { getMetadata } from '../aem.js';
import env from '../env.js';
import buildAnalyticsContext from '../util/context.js';
import initGoogleDataLayer from './google-data-layer.js';
import initNortonAnalytics from './norton-analytics.js';
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
  initSdl(ctx);

  await loadVendorTags();
}
