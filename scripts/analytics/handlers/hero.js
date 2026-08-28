/**
 * `hero` analytics handler.
 *
 * The block stamps `data-hero-link-type="<role>"` on each CTA anchor — a
 * semantic role that says what the link *is*, not how it is tracked — and this
 * handler decides everything else.
 *
 * Which channel a CTA gets depends on whether it navigates:
 *
 * - **Same-page anchors** get an STL template only. They cannot carry an inid
 *   (no navigation happens, so there is nothing to carry it to), and giving them
 *   both templates would report the click twice: STL fires from its own click
 *   handler, and the inid layer re-dispatches anchor clicks into a second `s.tl`.
 * - **Everything else** gets both. STL sends the branded beacon, while inid
 *   persists to `localStorage` for internal links or rides the query string for
 *   external ones — different channels, one beacon.
 */

import { scanStlTemplates } from '../global-stl.js';
import { scanInidTemplates } from '../global-inid-link.js';
import { linkTemplate } from '../link-name.js';

/**
 * Stamps the link-name templates for one CTA.
 * @param {HTMLAnchorElement} link
 */
function stampCta(link) {
  const role = link.dataset.heroLinkType;
  if (!role) return;

  const isPageAnchor = (link.getAttribute('href') || '').includes('#');

  if (!link.dataset.stl) {
    link.dataset.templateStl = linkTemplate(role, { withAnchor: isPageAnchor });
  }
  if (!isPageAnchor && !link.dataset.inid) {
    link.dataset.templateInid = linkTemplate(role);
  }
}

export default {
  mount(root) {
    root.querySelectorAll('a[data-hero-link-type]').forEach(stampCta);

    // inid before stl, matching the orchestrator: inid may rewrite an external
    // href, and stl reads the final href when it decides whether the link points
    // at the current page.
    scanInidTemplates(root);
    scanStlTemplates(root);
  },
};
