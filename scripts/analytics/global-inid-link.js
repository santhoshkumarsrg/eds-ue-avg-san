/**
 * Declarative inid (internal id) link tracking.
 * Ports avast2 `theme/js/analytic/global-inid-link.js`.
 *
 * Blocks opt an anchor in by setting an inid template on it:
 *   data-template-inid        — compiled against window.nortonAnalytics
 *   data-custom-template-inid — compiled against nortonAnalytics plus per-scan overrides
 * The compiled value lands in `data-inid` and is then handed to the analytics
 * backend by one of three routes, chosen by link type:
 *
 * | link type          | route                                                  |
 * | ------------------ | ------------------------------------------------------ |
 * | internal, `tel:`   | written to `localStorage.inid`, read by the next page   |
 * | same-page anchor   | re-dispatched to global-stl, which sends it via `s.tl`  |
 * | external           | appended to the href as `?inid=`                        |
 *
 * The localStorage route is what `norton-analytics.js` reads on the following
 * page load, so this module is the writer for that value.
 *
 * EDS decorates blocks lazily, so a block that renders after initialization asks
 * for a rescan of its own subtree by dispatching `global::inid::setup` on itself.
 */

import {
  createTemplateParse,
  getLinkType,
  getUrlInfo,
  LINK_TYPE,
} from './analytic-helper.js';

const DEFAULT_SELECTOR = '[data-template-inid]:not([data-inid])';
const CUSTOM_SELECTOR = '[data-custom-template-inid]:not([data-inid])';

/**
 * An href still holding a `{token}` has not been resolved by its block yet
 * (the pricing block renders `{buy_link}` and swaps it once the API answers).
 * Such a link cannot be classified or rewritten, so it is left for a rescan.
 */
const UNRESOLVED_HREF = /\{[^}]*\}/;

/**
 * True when the anchor's authored href still contains a placeholder token.
 * Reads the raw attribute rather than `.href`, which percent-encodes braces.
 * @param {HTMLAnchorElement} link
 * @returns {boolean}
 */
export function hasUnresolvedHref(link) {
  return UNRESOLVED_HREF.test(link.getAttribute('href') || '');
}

/**
 * Persists the anchor's inid for the next page load.
 * @param {Event} e
 */
function storeInid(e) {
  try {
    window.localStorage.setItem('inid', e.currentTarget.dataset.inid);
  } catch {
    // localStorage may be unavailable (private mode, storage disabled)
  }
}

/**
 * Right-click handler. avast2 tests the deprecated `which === 3`; `button === 2`
 * is the standard equivalent for a real right-click.
 * @param {MouseEvent} e
 */
function onRightClick(e) {
  if (e.button === 2) storeInid(e);
}

/**
 * Same-page anchors cannot be reported by AppMeasurement's automatic link
 * tracking, so hand the click to global-stl, which sends it as a custom link.
 * @param {Event} e
 */
function onAnchorPageLeftClick(e) {
  e.currentTarget.dispatchEvent(new CustomEvent('global::stl::inid-anchor-link::click', {
    bubbles: true,
    cancelable: true,
  }));
}

/**
 * Appends `?inid=` to an external href.
 * Kept un-encoded to match avast2, which decodes the whole URL so the inid stays
 * readable in the query string.
 * @param {HTMLAnchorElement} link
 */
function appendInidToHref(link) {
  const href = new URL(link.href);
  href.searchParams.set('inid', link.dataset.inid);
  try {
    link.href = decodeURIComponent(href.toString());
  } catch {
    // malformed percent sequence somewhere in the original href
    link.href = href.toString();
  }
}

/**
 * Binds the route that matches the anchor's link type.
 * @param {HTMLAnchorElement} link
 */
export function setupLink(link) {
  if (!link.href) return;

  const linkType = getLinkType(link);

  if (linkType === LINK_TYPE.INTERNAL || linkType === LINK_TYPE.PHONE_NUMBER) {
    link.addEventListener('click', storeInid);
    link.addEventListener('contextmenu', onRightClick, false);
  } else if (linkType === LINK_TYPE.PAGE_ANCHOR) {
    link.addEventListener('click', onAnchorPageLeftClick);
    link.addEventListener('contextmenu', onRightClick, false);
  } else {
    appendInidToHref(link);
  }
}

/**
 * Compiles inid templates in a subtree and wires their routes.
 * @param {Element|Document} root subtree to scan
 * @param {string} selector template attribute selector
 * @param {'templateInid'|'customTemplateInid'} templateKey dataset key holding the template
 * @param {object} [overrideData] extra tokens for this scan
 */
function bindTemplates(root, selector, templateKey, overrideData) {
  const { nortonAnalytics } = window;
  if (!nortonAnalytics) return;

  const compile = createTemplateParse({ ...nortonAnalytics, ...overrideData });

  root.querySelectorAll(selector).forEach((link) => {
    // Leave the template attribute in place so a later rescan can retry.
    if (hasUnresolvedHref(link)) return;

    const inid = compile(link.dataset[templateKey], getUrlInfo(link.href));
    delete link.dataset[templateKey];
    if (!inid) return;
    link.dataset.inid = inid;

    try {
      setupLink(link);
    } catch {
      // one unparseable href must not stop the rest of the sweep
    }
  });
}

/**
 * Scans for `data-template-inid` anchors.
 * @param {Element} [root] subtree to scan, defaults to the whole document
 */
function scanDefaultTemplates(root) {
  bindTemplates(root || document, DEFAULT_SELECTOR, 'templateInid');
}

/**
 * Scans for `data-custom-template-inid` anchors. Requires an explicit subtree
 * because the override tokens are only meaningful per block.
 * @param {Element} root subtree to scan
 * @param {object} [overrideData] extra tokens for this scan
 */
function scanCustomTemplates(root, overrideData) {
  if (!root) return;
  bindTemplates(root, CUSTOM_SELECTOR, 'customTemplateInid', overrideData);
}

/**
 * Initializes inid link tracking and the rescan listener.
 */
export default function initGlobalInidLink() {
  try {
    scanDefaultTemplates();

    document.addEventListener('global::inid::setup', (e) => {
      const { templateType, overrideData } = e.detail || {};
      if (templateType === 'custom-template') scanCustomTemplates(e.target, overrideData);
      else scanDefaultTemplates(e.target);
    });
  } catch {
    // inid tracking must never break page decoration
  }
}
