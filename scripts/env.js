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

/** Values shared across every environment (also the qa defaults). */
const DEFAULTS = {
  pricingApiBase: 'https://pricing-api.svc.int.avast.com/api/v2/pricing/',
  consumerPriceList: 'pricelist',
  pricingPlatform: 'web',
  pricingDefaultLocale: 'en-ww',
};

/** Per-environment overrides (only list keys that differ from DEFAULTS). */
const OVERRIDES = {
  qa: {},
  stage: {
    pricingApiBase: 'https://stage-pricing-api.svc.int.avast.com/api/v2/pricing/',
  },
  live: {
    pricingApiBase: 'https://www.avast.com/api/v2/pricing/',
  },
};

/**
 * Resolves the current environment name from the hostname.
 * @returns {'qa'|'stage'|'live'}
 */
function resolveEnvName() {
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

const env = { ...DEFAULTS, ...OVERRIDES[resolveEnvName()] };

export default env;
