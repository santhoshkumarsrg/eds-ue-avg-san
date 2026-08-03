/**
 * Initializes `window.sdl` / `window.sdlObj` and fetches client-info.
 * Mirrors avast2 `analytics.html` sdl block + client-info.js fetch.
 */

import env from '../env.js';

/**
 * Builds the sdlObj payload for the current page.
 * @param {object} ctx analytics context from buildAnalyticsContext()
 * @returns {object}
 */
export function buildSdlObj(ctx) {
  return {
    pageType: ctx.pageType,
    lineOfBusiness: ctx.lineOfBusiness,
    screenId: ctx.pageId,
    screen: {
      name: ctx.screenName,
    },
  };
}

/**
 * True when client-info can be fetched without a cross-origin CORS failure.
 * Production avg.com is same-origin; localhost / *.aem.page / *.aem.live are not.
 * @returns {boolean}
 */
export function canFetchClientInfo() {
  if (typeof window === 'undefined') return false;
  const { hostname } = window.location;
  return hostname === 'avg.com' || hostname.endsWith('.avg.com');
}

/**
 * Fetches avg.com client-info and pushes the parsed JSON onto `window.sdl`.
 * Skipped off avg.com to avoid CORS console errors (localhost / EDS preview).
 * Fire-and-forget; failures are swallowed (same as avast2).
 */
export function fetchClientInfo() {
  const url = env.clientInfoUrl;
  if (!url || !canFetchClientInfo()) return;
  fetch(url)
    .then((t) => t.text())
    .then((t) => {
      const e = JSON.parse(t);
      window.sdl = window.sdl || [];
      window.sdl.push(e);
    })
    .catch(() => {});
}

/**
 * Initializes `window.sdl`, `window.sdlObj`, and kicks off client-info fetch.
 * @param {object} ctx analytics context from buildAnalyticsContext()
 */
export default function initSdl(ctx) {
  window.sdl = window.sdl || [];
  window.sdlObj = buildSdlObj(ctx);
  fetchClientInfo();
}
