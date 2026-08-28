/**
 * Campaign marker for cart / store links.
 * Ports avast2 `theme/js/analytic/global-campaign-marker.js`.
 *
 * Marker format, six `~`-separated segments:
 *
 *   XXX~ll-cc~yyyyy~abTest~testVersion~trSrc
 *
 * | segment | meaning                                                          |
 * | ------- | ---------------------------------------------------------------- |
 * | XXX     | site code — `WDS`, or `SMBW-WDS` for SMB products                 |
 * | ll-cc   | content locale                                                    |
 * | yyyyy   | destination page name                                             |
 * | abTest  | AB test ticket number, supplied per scan                          |
 * | version | test version; also where a button location is written             |
 * | trSrc   | traffic source — always empty here, see below                     |
 *
 * A block opts an element in with an empty `data-campaign-marker` attribute; the
 * compiled marker replaces it and is also appended to the href as
 * `campaignMarker` (or `x-campaignMarker` for SMB).
 *
 * Two deliberate differences from avast2:
 *
 * - `trSrc` is always empty. avast2 reads the `__trSrc` cookie via
 *   `aUtil.cookie.get`, and that cookie is not set on EDS.
 * - SMB detection keys only on `data-product-category="SMB"`. avast2 also tests
 *   for a `.c-smbpb` pricebox ancestor, a class this project does not have.
 *
 * The RTE download-link backfills (`addCategory`, the `.is-rtf` selectors) are
 * not ported: they exist to repair content authored before avast2's download
 * component set these attributes itself, and no such content exists here.
 */

import { getUrlInfo } from './analytic-helper.js';
import { hasUnresolvedHref } from './global-inid-link.js';

const SITE_CODE = 'WDS';
const SMB_SITE_CODE = 'SMBW-WDS';
/** Segment index that carries the test version, and the button location. */
const LOCATION_SEGMENT = 4;
const SEGMENT_COUNT = 5;

const SELECTOR = '[data-campaign-marker]:not([data-custom-marker]):not([data-cm-processed])';

/**
 * Returns the marker segments individually, so a caller assembling a custom
 * marker (an AB test script, say) can reuse the parts.
 * @param {boolean} [isSMB] whether the link points at an SMB product
 * @param {string} [abTest] AB test identifier for the abTest segment
 * @returns {object}
 */
export function getCampaignMarkerParts(isSMB = false, abTest = '') {
  const { site_country: country, site_language: language } = window.nortonAnalytics || {};
  const { destinationPageName } = getUrlInfo(window.location.href);

  return {
    siteCode: isSMB ? SMB_SITE_CODE : SITE_CODE,
    languageCountryCode: country && language ? `${language}-${country}` : (language || country || ''),
    destinationPageName,
    abTest,
    testVersion: '',
    trSrc: '',
  };
}

/**
 * Builds the marker string.
 * @param {boolean} [isSMB]
 * @param {string} [abTest]
 * @returns {string}
 */
export function generateCampaignMarkerStr(isSMB = false, abTest = '') {
  const parts = getCampaignMarkerParts(isSMB, abTest);
  return [
    parts.siteCode,
    parts.languageCountryCode,
    parts.destinationPageName,
    parts.abTest,
    parts.testVersion,
    parts.trSrc,
  ].join('~');
}

/**
 * Writes a button location into the marker's location segment, both in the
 * dataset and in the href query parameter.
 * @param {HTMLElement} button
 * @param {string} location
 */
export function buttonLocationToCampaignMarker(button, location) {
  if (!button || !location) return;

  const setSegment = (marker) => {
    const segments = marker.split('~');
    while (segments.length < SEGMENT_COUNT) segments.push('');
    segments[LOCATION_SEGMENT] = location;
    return segments.join('~');
  };

  if (button.dataset.campaignMarker) {
    button.dataset.campaignMarker = setSegment(button.dataset.campaignMarker);
  }

  if (!button.hasAttribute('href')) return;

  const url = new URL(button.href);
  const currentMarker = url.searchParams.get('campaignMarker');
  if (!currentMarker) return;
  url.searchParams.set('campaignMarker', setSegment(currentMarker));
  button.href = url.toString();
}

/**
 * Fills the campaign marker on every opted-in element in a subtree.
 *
 * Safe to re-run: processed elements are stamped `data-cm-processed` and skipped,
 * so a rescan after lazily resolved hrefs (or dynamically added content) does not
 * double-append.
 *
 * @param {Element|Document} [scope] subtree to process, defaults to the document
 * @param {{ abTest?: string, buttonLocation?: string }} [options]
 */
export function fillCampaignMarkers(scope, options = {}) {
  if (!window.nortonAnalytics) return;

  (scope || document).querySelectorAll(SELECTOR).forEach((elem) => {
    // Leave the attribute unprocessed so a rescan can retry once the block has
    // resolved the real href.
    if (hasUnresolvedHref(elem)) return;
    // A "#" href is the pricing block's fallback for a failed lookup. Appending
    // a marker to it would turn an inert button into a same-page navigation.
    if (elem.getAttribute('href') === '#') return;

    const isSMB = elem.dataset.productCategory === 'SMB';
    const marker = generateCampaignMarkerStr(isSMB, options.abTest);
    elem.dataset.campaignMarker = marker;

    if (elem.hasAttribute('href')) {
      try {
        const url = new URL(elem.href);
        url.searchParams.set(isSMB ? 'x-campaignMarker' : 'campaignMarker', marker);
        elem.href = url.toString();
      } catch {
        // not a resolvable URL; the dataset marker is still set
      }
    }

    if (options.buttonLocation) {
      buttonLocationToCampaignMarker(elem, options.buttonLocation);
    }

    elem.dataset.cmProcessed = 'true';
  });
}

/**
 * Initializes campaign markers and the rescan listener.
 *
 * The rescan event has no avast2 counterpart — avast2 calls `init(scope)`
 * directly, and its own source notes that an event trigger would be preferable.
 * EDS needs one because blocks decorate lazily.
 */
export default function initGlobalCampaignMarker() {
  try {
    fillCampaignMarkers();

    document.addEventListener('global::campaign-marker::setup', (e) => {
      fillCampaignMarkers(e.target, e.detail || {});
    });
  } catch {
    // campaign markers must never break page decoration
  }
}

// Exposed for client-side AB test scripts that assemble a custom marker or
// re-run the fill over content they injected, matching avast2.
if (typeof window !== 'undefined') {
  window.globalCampaignMarker = {
    getCampaignMarkerParts,
    generateCampaignMarkerStr,
    buttonLocationToCampaignMarker,
    init: fillCampaignMarkers,
  };
}
