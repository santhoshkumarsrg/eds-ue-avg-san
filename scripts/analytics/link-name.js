/**
 * The AVG link-name taxonomy, in one place.
 *
 * Every tracked link name in this project is built here, so the shape can be
 * reviewed and changed without touching a single block or handler beyond the one
 * that needs it. Blocks never see these strings.
 *
 * Names are `≤token≥` templates, not finished strings: the compilers in
 * `global-stl.js` and `global-inid-link.js` resolve the tokens against
 * `window.nortonAnalytics` plus the link's own URL. See `analytic-helper.js` for
 * the available tokens.
 */

const PREFIX = 'avgcom';

/**
 * The standard link-name template, `avgcom-≤page_name≥_<role>_≤destinationPageName≥`.
 *
 * `role` is a stable identifier for the interaction rather than the block name
 * (`cta-link`, `promo-link`, `download-link`), so reports group by what the user
 * did rather than by which component happened to render it.
 *
 * @param {string} role interaction role
 * @param {{ withAnchor?: boolean }} [options] append `≤anchorName≥` for same-page anchors
 * @returns {string} an uncompiled template
 */
export function linkTemplate(role, { withAnchor = false } = {}) {
  const tail = withAnchor ? '_≤anchorName≥' : '';
  return `${PREFIX}-≤page_name≥_${role}_≤destinationPageName≥${tail}`;
}

/**
 * The store/cart link-name template, `avgcom-≤page_name≥_store_<sku>`.
 *
 * Cart links all point at the same checkout host, so `≤destinationPageName≥`
 * cannot tell two plans apart. The SKU is known at mount time and interpolated
 * directly.
 *
 * @param {string} sku pricing API internal id
 * @returns {string} an uncompiled template
 */
export function storeTemplate(sku) {
  return `${PREFIX}-≤page_name≥_store_${sku}`;
}
