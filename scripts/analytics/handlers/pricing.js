/**
 * `pricing` analytics handler.
 *
 * The block stamps `data-pricing-cta="buy"` on each buy button and leaves the
 * SKU on the plan card as `data-sku` (which it already needs for the pricing API
 * lookup). This handler turns that into cart-link instrumentation: an inid
 * template naming the SKU, and an empty `data-campaign-marker` opting the anchor
 * into the campaign-marker fill.
 *
 * Only a plan with a SKU is instrumented, because only that plan has a real
 * checkout URL behind it.
 *
 * **Mounts twice.** The buy href starts life as the `{buy_link}` placeholder and
 * only becomes a real URL when the pricing API answers, so the block announces
 * again at that point. Everything here is written to tolerate the second pass:
 * an anchor that already resolved is left alone rather than re-stamped, which
 * matters most for the campaign marker — overwriting a filled marker with the
 * empty opt-in value would erase it, since the fill skips anchors it has already
 * processed.
 */

import { fillCampaignMarkers } from '../global-campaign-marker.js';
import { scanInidTemplates } from '../global-inid-link.js';
import { storeTemplate } from '../link-name.js';

/** avast2 stamps its consumer pricing cart links with this category. */
const PRODUCT_CATEGORY = 'Consumer';

/**
 * Stamps one buy button, if its plan carries a SKU.
 * @param {HTMLAnchorElement} cta
 */
function stampCartLink(cta) {
  const sku = cta.closest('.pricing-plan')?.dataset.sku;
  if (!sku) return;

  cta.dataset.role = 'cart-link';
  cta.dataset.productId = sku;
  cta.dataset.productCategory = PRODUCT_CATEGORY;

  // Empty attribute is the opt-in; the fill replaces it with the marker. Never
  // reset it, or the second mount wipes the marker written by the first.
  if (!cta.hasAttribute('data-campaign-marker')) {
    cta.setAttribute('data-campaign-marker', '');
  }
  if (!cta.dataset.inid) {
    cta.dataset.templateInid = storeTemplate(sku);
  }
}

export default {
  mount(root) {
    root.querySelectorAll('a[data-pricing-cta]').forEach(stampCartLink);

    // Both skip anchors whose href is still a `{buy_link}` placeholder, leaving
    // the stamped attributes in place for the second mount.
    scanInidTemplates(root);
    fillCampaignMarkers(root);
  },
};
