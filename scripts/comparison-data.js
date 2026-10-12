/**
 * Shared loader for the product comparison dataset (one DA workbook per locale).
 *
 * The workbook is a multi-sheet spreadsheet with the tabs:
 * - `features`   id | category | headline | short-description | long-description
 *                | icon | icon-mobile | platforms | notes
 * - `products`   id | name | subtitle | icon | url | platforms | type | sku
 * - `matrix`     feature | <product id> | <product id> | …   (wide format)
 * - `categories` id | title   (optional)
 * - `strings`    key | value   (optional, localized accessibility labels)
 *
 * The path may contain a `{locale}` token. When it does, the page locale and the
 * fallback locale are both loaded and merged per row by id, so a locale only has
 * to contain the rows (or cells) it translates. Requests are cached per page, so
 * several blocks sharing a workbook fetch it once.
 */

import { getMetadata } from './aem.js';
import { getLocaleFromPath } from './util/locale.js';

export const DEFAULT_DATA_PATH = '/{locale}/comparison/data';
export const DEFAULT_FALLBACK_LOCALE = 'en';

const SHEETS = ['features', 'products', 'matrix', 'categories', 'strings'];
/** Columns holding ids; lowercased so authored ids match case-insensitively. */
const ID_COLUMNS = ['id', 'feature', 'category'];
const PLATFORM_ALIASES = { windows: 'pc', win: 'pc', macos: 'mac' };

/** Cache of in-flight/resolved workbook requests, keyed by URL. */
const workbookCache = new Map();

/**
 * Lowercases the header keys (and id values) and trims every value of a sheet row.
 * @param {object} row raw sheet row
 * @returns {Record<string, string>}
 */
function normalizeRow(row) {
  const out = {};
  Object.entries(row).forEach(([key, value]) => {
    const name = key.trim().toLowerCase();
    const text = value == null ? '' : String(value).trim();
    out[name] = ID_COLUMNS.includes(name) ? text.toLowerCase() : text;
  });
  return out;
}

/**
 * Fetches one workbook. Resolves to null when it does not exist (404) so a
 * missing locale falls back silently; any other failure is reported.
 * @param {string} path workbook path without extension
 * @returns {Promise<Record<string, Record<string, string>[]>|null>}
 */
function fetchWorkbook(path) {
  const url = `${path.replace(/\.json$/, '')}.json?${SHEETS.map((s) => `sheet=${s}`).join('&')}`;
  if (!workbookCache.has(url)) {
    workbookCache.set(url, (async () => {
      const resp = await fetch(url);
      if (resp.status === 404) return null;
      if (!resp.ok) throw new Error(`Comparison data request failed (${resp.status}): ${url}`);
      const json = await resp.json();
      if (json[':type'] !== 'multi-sheet') {
        throw new Error(`Comparison data must be a multi-sheet workbook: ${url}`);
      }
      const sheets = {};
      SHEETS.forEach((name) => {
        sheets[name] = (json[name]?.data || []).map(normalizeRow);
      });
      return sheets;
    })());
  }
  return workbookCache.get(url);
}

/**
 * Merges two sheets by a key column. Primary rows win and keep their order;
 * fallback-only rows are appended. With `fillEmpty`, empty primary cells take
 * the fallback value (a locale may translate only some columns).
 * @param {Record<string, string>[]} primary
 * @param {Record<string, string>[]} fallback
 * @param {string} key
 * @param {boolean} fillEmpty
 * @returns {Record<string, string>[]}
 */
function mergeRows(primary, fallback, key, fillEmpty) {
  const fallbackById = new Map(fallback.map((row) => [row[key], row]));
  const seen = new Set();
  const merged = primary.map((row) => {
    seen.add(row[key]);
    const base = fallbackById.get(row[key]);
    if (!base || !fillEmpty) return row;
    const out = { ...base };
    Object.entries(row).forEach(([k, v]) => { if (v) out[k] = v; });
    return out;
  });
  fallback.forEach((row) => { if (!seen.has(row[key])) merged.push(row); });
  return merged;
}

/**
 * Parses a comma/space separated platform list (empty = all platforms).
 * @param {string} value
 * @returns {string[]}
 */
export function parsePlatforms(value) {
  return (value || '')
    .toLowerCase()
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((p) => PLATFORM_ALIASES[p] || p);
}

/**
 * Parses a matrix cell.
 * blank / `no` → none (✗); `yes` → check; `yes: <text>` → check-text;
 * `partial: <text>` → partial; `text: <text>` → text.
 * @param {string} value
 * @returns {{ type: string, text?: string, invalid?: boolean }} type is one of
 *   none | check | check-text | partial | text
 */
export function parseCell(value) {
  const raw = (value || '').trim();
  if (!raw || /^no$/i.test(raw)) return { type: 'none' };
  if (/^yes$/i.test(raw)) return { type: 'check' };
  const match = raw.match(/^(yes|partial|text)\s*:\s*([\s\S]+)$/i);
  if (match) {
    const kind = match[1].toLowerCase();
    const type = { yes: 'check-text', partial: 'partial', text: 'text' }[kind];
    return { type, text: match[2].trim() };
  }
  return { type: 'none', invalid: true };
}

/**
 * Builds lookup structures from merged sheets and reports data problems.
 * @param {Record<string, Record<string, string>[]>} sheets
 * @returns {object}
 */
function index(sheets) {
  const warnings = [];
  const toMap = (rows, key, label) => {
    const map = new Map();
    rows.forEach((row) => {
      const id = row[key];
      if (!id) return;
      if (map.has(id)) warnings.push(`Duplicate ${label} id "${id}" in the data sheet.`);
      else map.set(id, row);
    });
    return map;
  };

  const features = toMap(sheets.features, 'id', 'feature');
  features.forEach((feature) => { feature.platformList = parsePlatforms(feature.platforms); });
  const products = toMap(sheets.products, 'id', 'product');
  products.forEach((product) => {
    product.platformList = parsePlatforms(product.platforms);
    product.type = (product.type || 'product').toLowerCase();
  });
  const categories = new Map(sheets.categories
    .filter((c) => c.id)
    .map((c) => [c.id, c.title || c.id]));
  const matrix = new Map(sheets.matrix
    .filter((row) => row.feature)
    .map((row) => [row.feature, row]));
  const strings = Object.fromEntries(sheets.strings
    .filter((s) => s.key)
    .map((s) => [s.key, s.value]));

  return {
    features, products, categories, matrix, strings, warnings,
  };
}

/**
 * Resolves the workbook path for the current page.
 * @param {string} [override] path authored on the block
 * @returns {string}
 */
export function getDataPath(override) {
  return (override || getMetadata('comparison-data') || DEFAULT_DATA_PATH).trim();
}

/**
 * Loads (and caches) the comparison dataset.
 * @param {object} [opts]
 * @param {string} [opts.path] workbook path, may contain `{locale}`
 * @param {string} [opts.locale] page locale (defaults to the URL locale prefix)
 * @param {string} [opts.fallbackLocale] locale used for missing rows
 * @returns {Promise<{
 *   features: Map<string, object>, products: Map<string, object>,
 *   categories: Map<string, string>, matrix: Map<string, object>,
 *   strings: Record<string, string>, warnings: string[]
 * }>}
 */
export default async function loadComparisonData(opts = {}) {
  const path = getDataPath(opts.path);
  const locale = opts.locale ?? getLocaleFromPath(window.location.pathname);
  const fallbackLocale = opts.fallbackLocale
    || getMetadata('comparison-fallback-locale')
    || DEFAULT_FALLBACK_LOCALE;

  if (!path.includes('{locale}')) {
    const sheets = await fetchWorkbook(path);
    if (!sheets) throw new Error(`Comparison data not found: ${path}`);
    return index(sheets);
  }

  const fallbackPath = path.replaceAll('{locale}', fallbackLocale);
  const localePath = locale && locale !== fallbackLocale ? path.replaceAll('{locale}', locale) : '';
  const [primary, fallback] = await Promise.all([
    localePath ? fetchWorkbook(localePath) : null,
    fetchWorkbook(fallbackPath),
  ]);
  if (!primary && !fallback) {
    throw new Error(`Comparison data not found: ${localePath || fallbackPath}`);
  }
  if (!primary || !fallback) return index(primary || fallback);

  return index({
    features: mergeRows(primary.features, fallback.features, 'id', true),
    products: mergeRows(primary.products, fallback.products, 'id', true),
    categories: mergeRows(primary.categories, fallback.categories, 'id', true),
    strings: mergeRows(primary.strings, fallback.strings, 'key', true),
    // matrix rows are replaced whole: an empty cell is meaningful (✗)
    matrix: mergeRows(primary.matrix, fallback.matrix, 'feature', false),
  });
}
