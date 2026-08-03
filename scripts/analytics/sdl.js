/**
 * Initializes `window.sdl` / `window.sdlObj` and fetches client-info.
 * Mirrors avast2 `analytics.html` sdl block + client-info.js fetch.
 */

import { getMetadata } from '../aem.js';
import env from '../env.js';
import { buildAnalyticsContext } from './utils.js';

/**
 * Builds the sdlObj payload for the current page.
 * @param {ReturnType<typeof buildAnalyticsContext>} [ctx]
 * @returns {object}
 */
export function buildSdlObj(ctx = buildAnalyticsContext(getMetadata)) {
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
 * Fetches avg.com client-info and pushes the parsed JSON onto `window.sdl`.
 * Fire-and-forget; failures are swallowed (same as avast2).
 */
export function fetchClientInfo() {
  const url = env.clientInfoUrl;
  if (!url) return;
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
 * @param {ReturnType<typeof buildAnalyticsContext>} [ctx]
 */
export default function initSdl(ctx = buildAnalyticsContext(getMetadata)) {
  window.sdl = window.sdl || [];
  window.sdlObj = buildSdlObj(ctx);
  fetchClientInfo();
}
