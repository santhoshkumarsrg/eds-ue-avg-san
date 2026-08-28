/**
 * SDL page-load pushes: `server` + `session`, then `screen`.
 * Ports the page-load half of avast2 `theme/js/global-sdl/index.js` `init()`.
 *
 * The `screen` event is the SDL page view — GTM-WPC6R3K turns it into the
 * reported screen. Two ordering rules apply and both are enforced by the caller
 * in `index.js`:
 *
 * 1. `window.nortonAnalytics` and `window.sdlObj` must exist, since every field
 *    here is read from one of them.
 * 2. The `client` push from the client-info fetch must land before `screen`.
 *
 * The interaction events (`user.click.link`, `user.buy.products`,
 * `system.modal`, `system.error`, …) and the modal `screen` re-push are not
 * ported yet.
 */

import userAgentDetection from '../util/user-agent.js';

const SDL_VERSION = '2021-05-05/v1';
const SCREEN_CATEGORY = 'core';
/** Placeholder avast2 uses where a value is not applicable client-side. */
const NOT_APPLICABLE = '-';

/**
 * Location fields for `screen.location`.
 * @returns {object}
 */
export function getLocationParams() {
  const { location } = window;
  return {
    woParams: location.host + location.pathname,
    protocol: location.protocol.replace(':', ''),
    path: location.pathname,
    hostname: location.host,
    hash: location.hash,
    params: location.search
      ? Object.fromEntries(new URLSearchParams(location.search))
      : {},
  };
}

/**
 * `locale` as `language-country`, from the Adobe Analytics data layer.
 * @returns {string}
 */
export function getLocale() {
  const na = window.nortonAnalytics || {};
  return `${na.site_language || ''}-${na.site_country || ''}`;
}

/**
 * Screen name, preferring the value the page context already computed.
 * Falls back to `locale | path` the same way avast2 does.
 * @returns {string}
 */
export function getScreenName() {
  const fromContext = window.sdlObj?.screen?.name;
  if (fromContext) return fromContext;

  const locale = getLocale();
  const pathFromUrl = (window.location.pathname || '').replace(/^\//, '');
  return pathFromUrl ? `${locale} | ${pathFromUrl}` : locale;
}

/**
 * Client hints, when the browser supports them.
 * @returns {{ secChUa: Array, mobile: boolean|string }}
 */
function getClientHints() {
  const brands = navigator.userAgentData?.brands;
  if (!brands?.length) return { secChUa: [], mobile: NOT_APPLICABLE };
  return { secChUa: brands, mobile: navigator.userAgentData.mobile };
}

/**
 * Builds the combined `server` + `session` payload.
 * Pushed as one object with no `event` key, matching avast2.
 * @returns {object}
 */
export function buildServerSession() {
  const na = window.nortonAnalytics || {};
  const { secChUa, mobile } = getClientHints();

  return {
    server: {
      provider: 'AEM',
      platform: 'WEB',
      env: na.environment,
      dataCenter: NOT_APPLICABLE,
      sdlVersion: SDL_VERSION,
    },
    session: {
      countryCode: na.site_country,
      secChUa,
      platform: userAgentDetection.os.get().name.toLowerCase(),
      mobile,
    },
  };
}

/**
 * Builds the `screen` page-view event.
 * @returns {object}
 */
export function buildScreen() {
  const sdlObj = window.sdlObj || {};

  return {
    event: 'screen',
    screen: {
      location: { ...getLocationParams(), url: window.location.href },
      locale: getLocale(),
      screenCategory: SCREEN_CATEGORY,
      title: document.title,
      type: sdlObj.pageType,
      lineOfBusiness: sdlObj.lineOfBusiness,
      screenId: sdlObj.screenId,
      name: getScreenName(),
    },
  };
}

/**
 * Pushes `server` + `session` and then `screen` onto `window.sdl`.
 *
 * @param {Promise<void>} [clientInfoReady] resolves once the `client` push has
 *   landed (or been given up on); awaited so `client` precedes `screen`
 */
export default async function pushSdlPageLoad(clientInfoReady) {
  try {
    if (clientInfoReady) await clientInfoReady;

    window.sdl = window.sdl || [];
    window.sdl.push(buildServerSession());
    window.sdl.push(buildScreen());
  } catch {
    // A missing SDL page view must not break the rest of the page.
  }
}
