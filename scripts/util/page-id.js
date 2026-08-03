/**
 * Deterministic pageId / screenId from the page path (UUID v5).
 * Replaces AEM jcr:uuid in EDS.
 */

/** Fixed namespace UUID for AVG EDS path → screenId (RFC 4122 UUID v5). */
const AVG_EDS_NAMESPACE = '6ba7b811-9dad-11d1-80b4-00c04fd430c8';

/**
 * Normalizes a pathname for stable id generation (lowercase, no trailing slash).
 * @param {string} pathname
 * @returns {string}
 */
export function normalizePathForId(pathname) {
  if (!pathname) return '/';
  let p = pathname.toLowerCase();
  while (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return p.startsWith('/') ? p : `/${p}`;
}

/**
 * Parses a UUID string into 16 bytes.
 * @param {string} uuid
 * @returns {Uint8Array}
 */
function uuidToBytes(uuid) {
  const hex = uuid.replace(/-/g, '');
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i += 1) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Formats 16 bytes as a UUID string.
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function bytesToUuid(bytes) {
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

/**
 * SHA-1 digest as Uint8Array (Web Crypto).
 * @param {Uint8Array} data
 * @returns {Promise<Uint8Array>}
 */
async function sha1(data) {
  return new Uint8Array(await crypto.subtle.digest('SHA-1', data));
}

/**
 * RFC 4122 UUID v5 from a name string and namespace UUID.
 * @param {string} name
 * @param {string} [namespaceUuid]
 * @returns {Promise<string>}
 */
export async function uuidV5(name, namespaceUuid = AVG_EDS_NAMESPACE) {
  const nsBytes = uuidToBytes(namespaceUuid);
  const nameBytes = new TextEncoder().encode(name);
  const joined = new Uint8Array(nsBytes.length + nameBytes.length);
  joined.set(nsBytes);
  joined.set(nameBytes, nsBytes.length);
  const hash = await sha1(joined);
  const bytes = hash.slice(0, 16);
  // version 5 + RFC 4122 variant
  bytes[6] = (bytes[6] & 0x0f) | 0x50; // eslint-disable-line no-bitwise
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // eslint-disable-line no-bitwise
  return bytesToUuid(bytes);
}

/**
 * Deterministic UUID for a page path (dataLayer.pageId / sdlObj.screenId).
 * @param {string} pathname
 * @returns {Promise<string>}
 */
export async function uuidFromPath(pathname) {
  return uuidV5(normalizePathForId(pathname));
}
