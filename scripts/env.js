/**
 * Client-side environment variables.
 *
 * Edge Delivery has no build step, so OS-level environment variables are not
 * available to browser code. This module is the closest equivalent: a single
 * place to declare configuration values, resolved to the current environment at
 * runtime. Import the default `env` object to read them.
 *
 * There are two independent axes here, and conflating them was a bug:
 *
 * 1. `name` (qa | stage | live) is derived from the branch in the EDS hostname
 *    ({branch}--{repo}--{owner}.aem.page) and drives non-analytics config such
 *    as `pricingApiBase`:
 *      - main--… / *.aem.live / *.avg.com  -> live
 *      - stage--…                          -> stage
 *      - qa--… / localhost                 -> qa  (default)
 *
 * 2. `analyticsBucket` (prod | nonprod) is derived from an exact-match
 *    PROD_HOSTS allowlist instead, so preview hosts can never report into the
 *    production Adobe Analytics suite. Branch `main` resolves to `live` above,
 *    which previously sent every aem.live preview beacon to the prod suite.
 *
 * Edit DEFAULTS for values shared across environments, OVERRIDES.<env> for
 * anything that must differ per environment, and ANALYTICS_BY_BUCKET for
 * analytics vendor config.
 */

/**
 * Values shared across every environment (also the qa defaults).
 *
 * Pricing is served by the Adobe App Builder (I/O Runtime) `pricing` action,
 * which proxies the internal pricing API. The non-prod (stage) endpoint is the
 * default and is used by both qa and stage; live overrides it with prod.
 */
const DEFAULTS = {
  pricingApiBase: 'https://47259-avg-stage.adobeioruntime.net/api/v1/web/avg-app-builder/pricing',
  pricingDefaultLocale: 'en-ww',
  gtmDataLayerId: 'GTM-PZ48F8',
  gtmSdlId: 'GTM-WPC6R3K',
  clientInfoUrl: 'https://www.avg.com/client-info.js?fetch=true',
  featureFlags: ['WEBAVAST-7241'],
};

/** Per-environment overrides (only list keys that differ from DEFAULTS). */
const OVERRIDES = {
  qa: {},
  stage: {},
  live: {
    pricingApiBase: 'https://47259-avg.adobeioruntime.net/api/v1/web/avg-app-builder/pricing',
  },
};

/**
 * Hostnames that are allowed to report into production Adobe Analytics.
 *
 * Deliberately an exact-match allowlist rather than a suffix test: no EDS
 * preview host can ever appear here, so previews and feature branches always
 * fall back to the non-prod suite. Getting this wrong in the safe direction
 * costs a missing report; getting it wrong the other way corrupts production
 * data with test traffic.
 */
const PROD_HOSTS = ['avg.com', 'www.avg.com'];

/**
 * True only on real production hosts.
 * @returns {boolean}
 */
export function isProductionHost() {
  return PROD_HOSTS.includes(window.location.hostname);
}

/**
 * Analytics vendor config, keyed by production host rather than by branch.
 *
 * Kept separate from OVERRIDES because the analytics bucket and the pricing
 * environment are independent concerns: `main--…--….aem.live` is a preview that
 * should use prod pricing but must never use the prod report suite.
 * Values mirror Avast OSGi AnalyticsUtilImpl.
 */
const ANALYTICS_BY_BUCKET = {
  prod: {
    analyticsAccount: 'symanteccom',
    adobeLaunchUrl: '//assets.adobedtm.com/b29989a14bed/ccef52b414db/launch-773db4767ac4.min.js',
  },
  nonprod: {
    analyticsAccount: 'veritasdev',
    adobeLaunchUrl: '//assets.adobedtm.com/b29989a14bed/ccef52b414db/launch-a7750c919e12-staging.min.js',
  },
};

/**
 * Resolves the current environment name from the hostname.
 * @returns {'qa'|'stage'|'live'}
 */
export function resolveEnvName() {
  const { hostname } = window.location;

  // Local dev defaults to qa.
  if (hostname.includes('localhost') || hostname === '127.0.0.1') return 'qa';

  // Production domains and the aem.live (main) delivery host.
  if (hostname.endsWith('avg.com')) return 'live';

  // EDS preview host: the branch is the first token before "--".
  const [branch] = hostname.split('--');
  if (branch === 'main') return 'live';
  if (branch === 'stage') return 'stage';
  if (branch === 'qa') return 'qa';

  // Unknown branch previews default to qa.
  return 'qa';
}

const envName = resolveEnvName();
const analyticsBucket = isProductionHost() ? 'prod' : 'nonprod';

const env = {
  ...DEFAULTS,
  ...OVERRIDES[envName],
  ...ANALYTICS_BY_BUCKET[analyticsBucket],
  /** Active EDS environment name (`qa` | `stage` | `live`). */
  name: envName,
  /** Analytics vendor bucket (`prod` | `nonprod`), derived from the hostname. */
  analyticsBucket,
  /**
   * Analytics data-layer environment value.
   * Mirrors AvastAnalytics: `prod` on production hosts, otherwise `dev`.
   */
  analyticsEnvironment: analyticsBucket === 'prod' ? 'prod' : 'dev',
};

export default env;
