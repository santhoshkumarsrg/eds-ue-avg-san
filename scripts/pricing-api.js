/**
 * Live pricing for the Pricing block.
 *
 * Pricing Plan cards can carry a hidden `data-sku` (the pricing API internal id)
 * and an optional `data-campaign`. When present, this module fetches the current
 * pricelist and resolves the authored `{…}` price/discount placeholder tokens.
 * Every known token is always resolved: to the formatted API value when
 * available, otherwise to a single global fallback (`X.XX`). This guarantees a
 * raw token is never left visible, even when the API is unreachable.
 *
 * Field mapping mirrors the AEM/pluto flow (PimNodeUpdaterServiceImpl +
 * PimEntitlement.formatPricingTags).
 */

const API_BASE = 'https://pricing-api.svc.int.avast.com/api/v2/pricing/pricelist';
const PLATFORM = 'web';
const DEFAULT_LOCALE = 'en-ww';
const FALLBACK = 'X.XX';

/**
 * Placeholder token name -> pricing API response field. The API's formatted
 * fields already include the currency symbol (e.g. "$7.50").
 */
const PRICE_FIELDS = {
  strike_price: 'priceFormatted',
  sale_price: 'realPriceFormatted',
  monthly_price: 'realPriceRoundedPerMonthFormatted',
  monthly_strike: 'priceRoundedPerMonthFormatted',
  future_price: 'futureRealPriceFormatted',
  future_strike: 'futurePriceFormatted',
};

/** All token names this module resolves (price fields plus the discount). */
const TOKEN_NAMES = [...Object.keys(PRICE_FIELDS), 'discount'];

/**
 * Locale for the pricing request, derived from the first URL path segment when
 * it looks like a locale (e.g. /en-ww/…). Falls back to en-ww.
 * @returns {string}
 */
function getLocale() {
  const [segment] = window.location.pathname.split('/').filter(Boolean);
  if (segment && /^[a-z]{2}-[a-z]{2}$/i.test(segment)) return segment.toLowerCase();
  return DEFAULT_LOCALE;
}

/**
 * Builds the token-name -> formatted-value map for one SKU's pricing data.
 * Returns an empty object when there is no usable data (so callers fall back).
 * @param {object|null} data pricing API entry for one internal id
 * @returns {Record<string, string>}
 */
function buildValues(data) {
  const values = {};
  if (!data || data.error) return values;
  Object.entries(PRICE_FIELDS).forEach(([name, field]) => {
    if (data[field] != null && data[field] !== '') values[name] = String(data[field]);
  });
  // {discount} prefers the percentage form, then the currency form.
  const discount = data.discountPercentFormatted || data.discountFormatted;
  if (discount) values.discount = String(discount);
  return values;
}

/**
 * Resolves every known `{token}` in a plan's text nodes: uses the API value
 * when present, otherwise the global fallback. Runs regardless of API success.
 * @param {Element} plan
 * @param {Record<string, string>} values
 */
function resolvePlan(plan, values) {
  const walker = document.createTreeWalker(plan, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    let text = node.nodeValue;
    if (!text.includes('{')) return;
    TOKEN_NAMES.forEach((name) => {
      const token = `{${name}}`;
      if (text.includes(token)) {
        const value = values[name] != null ? values[name] : FALLBACK;
        text = text.split(token).join(value);
      }
    });
    if (text !== node.nodeValue) node.nodeValue = text;
  });
}

/**
 * Fetches the pricelist for one campaign + set of SKUs.
 * @param {string} campaign
 * @param {string[]} skus
 * @param {string} locale
 * @returns {Promise<object|null>} response keyed by internal id, or null on failure
 */
async function fetchPricelist(campaign, skus, locale) {
  const params = new URLSearchParams({
    platform: PLATFORM,
    locale,
    internalIds: skus.join(','),
  });
  if (campaign) params.set('campaign', campaign);
  try {
    const resp = await fetch(`${API_BASE}?${params.toString()}`);
    if (!resp.ok) return null;
    return await resp.json();
  } catch (e) {
    // Network/CORS failure: plans resolve to the fallback value.
    return null;
  }
}

/**
 * Finds every priced plan, batches one request per campaign, and resolves the
 * placeholder tokens in place (live value or fallback).
 */
export default async function loadPricing() {
  const plans = [...document.querySelectorAll('.pricing-plan[data-sku]')];
  if (!plans.length) return;

  const locale = getLocale();

  // group plans by campaign so each campaign is a single batched request
  const byCampaign = new Map();
  plans.forEach((plan) => {
    const campaign = plan.dataset.campaign || '';
    if (!byCampaign.has(campaign)) byCampaign.set(campaign, []);
    byCampaign.get(campaign).push(plan);
  });

  await Promise.all([...byCampaign.entries()].map(async ([campaign, campaignPlans]) => {
    const skus = [...new Set(campaignPlans.map((plan) => plan.dataset.sku))];
    const pricelist = await fetchPricelist(campaign, skus, locale);
    campaignPlans.forEach((plan) => {
      const data = pricelist ? pricelist[plan.dataset.sku] : null;
      resolvePlan(plan, buildValues(data));
    });
  }));
}
