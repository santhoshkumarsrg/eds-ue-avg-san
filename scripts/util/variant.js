/**
 * Variant experiment mapping (`?expid=` → pageName / contentTitle overrides).
 */

/**
 * Parses variant-mapping metadata JSON and returns the matching entry for `expid`.
 * @param {string} mappingJson
 * @param {string} expId
 * @returns {{ expIdParam?: string, pageName?: string, contentTitle?: string }|null}
 */
export default function findVariantMapping(mappingJson, expId) {
  if (!mappingJson || !expId) return null;
  try {
    const list = JSON.parse(mappingJson);
    if (!Array.isArray(list)) return null;
    return list.find((item) => item && item.expIdParam === expId) || null;
  } catch {
    return null;
  }
}
