/**
 * Client-side environment variables.
 *
 * Edge Delivery has no build step, so OS-level environment variables are not
 * available to browser code. This module is the closest equivalent: a single
 * place to declare configuration values, resolved to the current environment at
 * runtime. Import the default `env` object to read them.
 *
 * The active environment is derived from the branch in the EDS hostname
 * ({branch}--{repo}--{owner}.aem.page):
 *   - main--… / *.aem.live / *.avast.com  -> live
 *   - stage--…                            -> stage
 *   - qa--… / localhost                   -> qa  (default)
 *
 * Edit DEFAULTS for values shared across environments, and OVERRIDES.<env> for
 * anything that must differ per environment.
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
  // Mirrors Avast OSGi AnalyticsUtilImpl adobeAnalyticsAccount (non-prod).
  analyticsAccount: 'veritasdev',
};

/** Per-environment overrides (only list keys that differ from DEFAULTS). */
const OVERRIDES = {
  qa: {},
  stage: {},
  live: {
    pricingApiBase: 'https://47259-avg.adobeioruntime.net/api/v1/web/avg-app-builder/pricing',
    // Mirrors Avast OSGi AnalyticsUtilImpl adobeAnalyticsAccount (prod.publish).
    analyticsAccount: 'symanteccom',
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

const env = {
  ...DEFAULTS,
  ...OVERRIDES[envName],
  /** Active EDS environment name (`qa` | `stage` | `live`). */
  name: envName,
  /**
   * Analytics data-layer environment value.
   * Mirrors AvastAnalytics: `prod` on live/prod-publish, otherwise `dev`.
   */
  analyticsEnvironment: envName === 'live' ? 'prod' : 'dev',
};

export default env;
