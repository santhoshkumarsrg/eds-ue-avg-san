/**
 * Declarative Adobe Analytics custom link tracking (`s.tl`).
 * Ports avast2 `theme/js/analytic/global-stl.js`.
 *
 * Blocks opt an anchor in by setting a `≤token≥` link-name template on it:
 *   data-template-stl        — compiled against window.nortonAnalytics
 *   data-custom-template-stl — compiled against nortonAnalytics plus per-scan overrides
 * The compiled name is stored in `data-stl` and sent as the custom link name with
 * prop41/eVar41, which is what distinguishes a branded click from AppMeasurement's
 * automatic exit-link beacon.
 *
 * EDS decorates blocks lazily, so a block that renders after initialization asks
 * for a rescan of its own subtree by dispatching `global::stl::setup` on itself.
 */

import { createTemplateParse, getUrlInfo } from './analytic-helper.js';

const LINK_TRACK_VARS = 'prop41,eVar41';
const PROP_41 = 'avg.com';

const DEFAULT_SELECTOR = '[data-template-stl]:not([data-stl])';
const CUSTOM_SELECTOR = '[data-custom-template-stl]:not([data-stl])';

/**
 * Creates a click handler that sends a custom link beacon.
 * @param {'currentTarget'|'target'} sourceProp event property holding the anchor
 * @param {'stl'|'inid'} nameKey dataset key holding the compiled link name
 * @returns {(e: Event) => void} click handler
 */
function createClickHandler(sourceProp, nameKey) {
  return (e) => {
    const { s } = window;
    if (!s || typeof s.tl !== 'function') return;

    const elem = e[sourceProp];
    const linkName = elem?.dataset?.[nameKey];
    // A link pointing at the page it already sits on is not a navigation to report.
    if (!linkName || elem.href === window.location.href) return;

    s.linkTrackVars = LINK_TRACK_VARS;
    s.prop41 = PROP_41;
    s.eVar41 = PROP_41;
    s.tl(true, 'o', linkName);
  };
}

/**
 * Compiles link-name templates in a subtree and binds their click handlers.
 * @param {Element|Document} root subtree to scan
 * @param {string} selector template attribute selector
 * @param {'templateStl'|'customTemplateStl'} templateKey dataset key holding the template
 * @param {object} [overrideData] extra tokens for this scan
 */
function bindTemplates(root, selector, templateKey, overrideData) {
  const { nortonAnalytics } = window;
  if (!nortonAnalytics) return;

  const compile = createTemplateParse({ ...nortonAnalytics, ...overrideData });

  root.querySelectorAll(selector).forEach((link) => {
    const linkName = compile(link.dataset[templateKey], getUrlInfo(link.href));
    delete link.dataset[templateKey];
    if (!linkName) return;
    link.dataset.stl = linkName;
    link.addEventListener('click', createClickHandler('currentTarget', 'stl'));
  });
}

/**
 * Scans for `data-template-stl` anchors.
 * @param {Element} [root] subtree to scan, defaults to the whole document
 */
function scanDefaultTemplates(root) {
  bindTemplates(root || document, DEFAULT_SELECTOR, 'templateStl');
}

/**
 * Scans for `data-custom-template-stl` anchors. Requires an explicit subtree
 * because the override tokens are only meaningful per block.
 * @param {Element} root subtree to scan
 * @param {object} [overrideData] extra tokens for this scan
 */
function scanCustomTemplates(root, overrideData) {
  if (!root) return;
  bindTemplates(root, CUSTOM_SELECTOR, 'customTemplateStl', overrideData);
}

/**
 * Initializes declarative link tracking and the rescan listeners.
 */
export default function initGlobalStl() {
  try {
    scanDefaultTemplates();

    // Anchors whose link name is carried in `data-inid` are tracked by the
    // inid layer, which re-dispatches the click here.
    document.addEventListener(
      'global::stl::inid-anchor-link::click',
      createClickHandler('target', 'inid'),
    );

    document.addEventListener('global::stl::setup', (e) => {
      const { templateType, overrideData } = e.detail || {};
      if (templateType === 'custom-template') scanCustomTemplates(e.target, overrideData);
      else scanDefaultTemplates(e.target);
    });
  } catch {
    // link tracking must never break page decoration
  }
}
