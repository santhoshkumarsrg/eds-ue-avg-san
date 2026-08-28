/**
 * Initializes `window.sdl` / `window.sdlObj` and fetches client-info.
 * Mirrors avast2 `analytics.html` sdl block + client-info.js fetch.
 */

import env from '../env.js';

/**
 * Max time to wait for client-info before pushing `screen` without it.
 *
 * GTM-WPC6R3K wants `client` first, but losing one dimension is recoverable
 * while losing the page view is not. Off avg.com the fetch is skipped entirely,
 * so the promise is already resolved and nothing waits.
 */
export const CLIENT_INFO_TIMEOUT_MS = 1000;

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
 *
 * The endpoint answers 200 with `content-type: application/json` but sends **no**
 * `Access-Control-Allow-Origin` header, for any origin — verified against both a
 * localhost and an `aem.page` origin. avast2 gets away with the same absolute URL
 * because it is served same-origin there. So the `client` event can only ever
 * land on avg.com, and fetching elsewhere buys nothing but a console error.
 *
 * @returns {boolean}
 */
export function canFetchClientInfo() {
  if (typeof window === 'undefined') return false;
  const { hostname } = window.location;
  return hostname === 'avg.com' || hostname.endsWith('.avg.com');
}

/**
 * Fetches avg.com client-info and pushes the parsed JSON onto `window.sdl` as
 * the `client` event.
 *
 * Failures resolve rather than reject, so a blocked or slow endpoint delays
 * nothing beyond CLIENT_INFO_TIMEOUT_MS.
 *
 * @returns {Promise<void>} resolves once the push has landed or failed
 */
export function fetchClientInfo() {
  const url = env.clientInfoUrl;
  if (!url || !canFetchClientInfo()) return Promise.resolve();

  return fetch(url)
    .then((t) => t.text())
    .then((t) => {
      const e = JSON.parse(t);
      window.sdl = window.sdl || [];
      window.sdl.push(e);
    })
    .catch(() => {});
}

/**
 * Resolves when `promise` settles or the timeout elapses, whichever is first.
 * @param {Promise<void>} promise
 * @param {number} [ms]
 * @returns {Promise<void>}
 */
export function withTimeout(promise, ms = CLIENT_INFO_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((resolve) => { setTimeout(resolve, ms); }),
  ]);
}

/**
 * Initializes `window.sdl`, `window.sdlObj`, and kicks off client-info fetch.
 * @param {object} ctx analytics context from buildAnalyticsContext()
 * @returns {Promise<void>} client-info readiness, bounded by the timeout
 */
export default function initSdl(ctx) {
  window.sdl = window.sdl || [];
  window.sdlObj = buildSdlObj(ctx);
  return withTimeout(fetchClientInfo());
}
