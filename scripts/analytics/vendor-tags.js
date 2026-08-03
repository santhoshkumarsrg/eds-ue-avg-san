/**
 * Loads dual GTM containers, Adobe Launch, and optional Target pre-hiding.
 * Mirrors avast2 `head.html` + `analytics.html` publish-mode vendor tags.
 */

import { getMetadata, loadScript } from '../aem.js';
import env from '../env.js';

/**
 * Returns true when vendor tags should load (not localhost; mirrors AEM publishMode).
 * @returns {boolean}
 */
export function isPublishLikeHost() {
  const { hostname } = window.location;
  return !(hostname.includes('localhost') || hostname === '127.0.0.1');
}

/**
 * Injects Adobe Target pre-hiding snippet (body opacity 0, 3s timeout).
 * Only when page metadata `enable-adobe-target-prehiding` is true.
 */
export function injectTargetPrehiding() {
  if (getMetadata('enable-adobe-target-prehiding') !== 'true') return;

  const css = 'body {opacity: 0 !important}';
  const timeoutMs = 3000;
  ((g, b, d, f) => {
    ((a, c, style) => {
      if (a) {
        const e = b.createElement('style');
        e.id = c;
        e.innerHTML = style;
        a.appendChild(e);
      }
    })(b.getElementsByTagName('head')[0], 'at-body-style', d);
    setTimeout(() => {
      const a = b.getElementsByTagName('head')[0];
      if (a) {
        const c = b.getElementById('at-body-style');
        if (c) a.removeChild(c);
      }
    }, f);
  })(window, document, css, timeoutMs);
}

/**
 * Injects a GTM container bound to the given data layer name.
 * @param {string} layerName `dataLayer` or `sdl`
 * @param {string} containerId
 * @param {object} [extraAttrs]
 */
export function injectGtm(layerName, containerId, extraAttrs = {}) {
  if (!containerId) return;
  (function gtm(w, d, s, l, i) {
    w[l] = w[l] || [];
    w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    const f = d.getElementsByTagName(s)[0];
    const j = d.createElement(s);
    const dl = l !== 'dataLayer' ? `&l=${l}` : '';
    j.async = true;
    j.src = `https://www.googletagmanager.com/gtm.js?id=${i}${dl}`;
    Object.entries(extraAttrs).forEach(([k, v]) => {
      if (v === true) j.setAttributeNode(d.createAttribute(k));
      else j.setAttribute(k, v);
    });
    f.parentNode.insertBefore(j, f);
  }(window, document, 'script', layerName, containerId));
}

/**
 * Loads dual GTM containers when WEBAVAST-7241 is in feature flags.
 */
export function loadGtmContainers() {
  const flags = env.featureFlags || [];
  if (!flags.includes('WEBAVAST-7241')) return;

  injectGtm('dataLayer', env.gtmDataLayerId, { 'data-ot-ignore': true });
  injectGtm('sdl', env.gtmSdlId);
}

/**
 * Loads Adobe Launch embed code.
 * @returns {Promise<void>}
 */
export async function loadAdobeLaunch() {
  const src = env.adobeLaunchUrl;
  if (!src) return;
  try {
    await loadScript(src, { async: '' });
  } catch {
    // Launch failure must not break the page.
  }
}

/**
 * Loads all publish-mode vendor tags.
 */
export default async function loadVendorTags() {
  if (!isPublishLikeHost()) return;

  injectTargetPrehiding();
  loadGtmContainers();
  await loadAdobeLaunch();
}
