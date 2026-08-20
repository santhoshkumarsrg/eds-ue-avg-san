/**
 * Shared helpers for Adobe Analytics link tracking.
 * Ports avast2 `theme/js/analytic/helper.js`.
 *
 * `createTemplateParse` is reimplemented with a plain string replace instead of
 * `new Function()` so link tracking never depends on the `'unsafe-eval'` CSP
 * allowance that AppMeasurement requires.
 */

export const LINK_TYPE = {
  UNKNOWN: 1,
  EXTERNAL: 2,
  INTERNAL: 3,
  PAGE_ANCHOR: 4,
  PHONE_NUMBER: 5,
};

const TOKEN = /≤(\w+?)≥/g;

/**
 * Creates a compiler for `≤token≥` link-name templates.
 * @param {object} baseData tokens available to every template (e.g. nortonAnalytics)
 * @returns {(template: string, additionalData?: object) => string} compiler
 */
export function createTemplateParse(baseData) {
  const data = { ...baseData };
  return (template, additionalData) => {
    const params = { ...data, ...additionalData };
    return String(template ?? '').replace(TOKEN, (match, name) => {
      const value = params[name];
      return value === undefined || value === null ? '' : value;
    });
  };
}

// https://www.avg.com/en-us/products/premium-security
const RE_HTTP_LOCALE = /https?:\/\/([\w.-]*(:[0-9]+)?)\/(\w{2}-\w{2})\/([/\w-]*)*/i;
// https://support.avg.com/index — brand subdomain without a locale segment
const RE_HTTP_BRAND_SUBDOMAIN = /^(?:https?:\/\/)?((?!www\.)[\w-]+(?:\.[\w-]+)*)\.(?:avg|avast)\./i;
// https://www.avg.co.jp/products/premium-security
const RE_HTTP_PLAIN = /https?:\/\/([\w.-]*(:[0-9]+)?)\/([/\w-]*)*/i;
// /en-us/products/premium-security
const RE_PATH_LOCALE = /^(\/?[a-z]{2}-[a-z]{2})(\/[\w-]*)*/i;
// /folder/subfolder/page1
const RE_PATH_PLAIN = /(\/?[\w-]*)*/i;

const EMPTY_URL_INFO = {
  subdomain: '', pagePath: '', destinationPageName: '', anchorName: '',
};

/**
 * Removes a leading and trailing occurrence of `char` from `str`.
 * @param {string} str input
 * @param {string} char character to trim
 * @returns {string} trimmed string
 */
function trimChar(str, char) {
  if (!str || !char) return '';
  const head = str.startsWith(char) ? str.slice(char.length) : str;
  return head.endsWith(char) ? head.slice(0, -char.length) : head;
}

/**
 * Extracts the tokens a link-name template can interpolate from a URL.
 * @param {string} url absolute or root-relative URL
 * @returns {{subdomain: string|string[], pagePath: string,
 *   destinationPageName: string, anchorName: string}} url tokens
 */
export function getUrlInfo(url) {
  if (!url || typeof url !== 'string') return { ...EMPTY_URL_INFO };

  const [urlWithoutHash, anchorName = ''] = url.split('#');

  let match = RE_HTTP_LOCALE.exec(urlWithoutHash);
  if (match) {
    return {
      subdomain: match[3].toLowerCase(),
      pagePath: match[4],
      destinationPageName: (match[4] || '').split('/').pop().toLowerCase(),
      anchorName,
    };
  }

  match = RE_HTTP_BRAND_SUBDOMAIN.exec(urlWithoutHash);
  const linkHostname = urlWithoutHash.replace(/^https?:\/\//, '').split('/')[0];
  if (match && window.location.hostname !== linkHostname) {
    const parts = match[1] ? match[1].split('.').filter((part) => part && part !== 'www') : [];
    return {
      subdomain: parts,
      pagePath: '',
      destinationPageName: parts.length ? parts[parts.length - 1] : '',
      anchorName,
    };
  }

  match = RE_HTTP_PLAIN.exec(urlWithoutHash);
  if (match) {
    return {
      subdomain: (match[1] || '').split('.').pop().toLowerCase(),
      pagePath: trimChar(match[3], '/'),
      destinationPageName: (match[3] || '').split('/').pop().toLowerCase(),
      anchorName,
    };
  }

  match = RE_PATH_LOCALE.exec(urlWithoutHash);
  if (match) {
    return {
      subdomain: match[1].replace('/', '').toLowerCase(),
      pagePath: trimChar(match[0].replace(match[1], ''), '/'),
      destinationPageName: (match[2] || '').substring(1).toLowerCase(),
      anchorName,
    };
  }

  match = RE_PATH_PLAIN.exec(urlWithoutHash);
  if (match) {
    return {
      subdomain: '',
      pagePath: trimChar(match[0], '/'),
      destinationPageName: (match[1] || '').replaceAll('/', '').toLowerCase(),
      anchorName,
    };
  }

  return { ...EMPTY_URL_INFO };
}

/**
 * Classifies an anchor so callers can pick the matching tracking treatment.
 * @param {HTMLAnchorElement} linkElem the anchor to classify
 * @returns {number} one of LINK_TYPE
 */
export function getLinkType(linkElem) {
  if (!linkElem || !linkElem.href) return LINK_TYPE.UNKNOWN;

  const { href, target } = linkElem;

  if (href.indexOf(window.location.origin) === 0) {
    const stripTrailingSlash = (value) => value.split('#')[0].replace(/\/$/, '');
    const isSamePage = stripTrailingSlash(href) === stripTrailingSlash(window.location.href);
    const isPageAnchor = isSamePage
      && !!new URL(href).hash
      && (target || '').toLowerCase() !== '_blank';
    return isPageAnchor ? LINK_TYPE.PAGE_ANCHOR : LINK_TYPE.INTERNAL;
  }

  if (href.startsWith('tel:')) return LINK_TYPE.PHONE_NUMBER;

  return LINK_TYPE.EXTERNAL;
}
