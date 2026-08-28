/**
 * Wire machinery: turns `data-analytic="<name>:0"` markers into instrumented
 * components by invoking the handler registered for that name, then flipping the
 * marker to `:1`.
 *
 * This is the seam that keeps analytics taxonomy out of block code. A block
 * announces itself and nothing more:
 *
 *   block.setAttribute('data-analytic', 'hero:0');
 *   block.dispatchEvent(new CustomEvent('analytics:scan', { bubbles: true }));
 *
 * Everything else — which anchors are tracked, what their link names look like,
 * which delivery channel each one uses — lives in
 * `scripts/analytics/handlers/<name>.js`.
 *
 * Ported from the same mechanism in the lifelock-ue project.
 */

import { HANDLERS } from './handlers/index.js';

const PENDING_SELECTOR = '[data-analytic$=":0"]';

/**
 * Reads the handler name out of a marker, discarding the `:0` / `:1` state.
 * @param {Element} el
 * @returns {string}
 */
function parseMarker(el) {
  const raw = el.getAttribute('data-analytic') || '';
  const colon = raw.indexOf(':');
  return colon >= 0 ? raw.slice(0, colon) : raw;
}

/**
 * Mounts every pending handler under `root`.
 *
 * Idempotent: a mounted marker reads `:1` and the pending selector never matches
 * it again, so repeat scans are free. A block whose DOM changes later can opt
 * back in by resetting its marker to `:0` and announcing again.
 *
 * @param {Element|Document} [root] subtree to scan, defaults to the whole document
 * @param {object} [ctx] shared page context, forwarded to each handler
 */
export function scan(root, ctx) {
  const scope = root && root.querySelectorAll ? root : document;

  // querySelectorAll matches descendants only, but a block stamps the marker on
  // its own root and announces from that same element — so the scope element
  // itself has to be tested, or a block's own marker is never found.
  const pending = [...scope.querySelectorAll(PENDING_SELECTOR)];
  if (scope.matches?.(PENDING_SELECTOR)) pending.unshift(scope);
  if (!pending.length) return;

  pending.forEach((el) => {
    const name = parseMarker(el);
    const handler = HANDLERS[name];
    if (!handler || typeof handler.mount !== 'function') {
      // A block announced a name with no handler behind it — a wiring mistake
      // that is otherwise completely silent.
      // eslint-disable-next-line no-console
      console.warn(`no analytics handler registered for "${name}"`);
    } else {
      try {
        handler.mount(el, ctx);
      } catch (e) {
        // One broken handler must not stop the rest of the sweep, and must
        // never break the page.
        // eslint-disable-next-line no-console
        console.error(`analytics handler "${name}" failed`, e);
      }
    }
    el.setAttribute('data-analytic', `${name}:1`);
  });
}

/**
 * Listens for `analytics:scan` on `document` and scans the announcing subtree.
 *
 * Blocks decorate in the lazy phase while analytics initializes in the delayed
 * phase, so most announcements happen before this listener exists. Those are not
 * lost: the marker is still `:0`, and the initial `scan(document)` sweep picks
 * them up. The listener covers everything that announces afterwards.
 *
 * @param {object} [ctx] shared page context, forwarded to each handler
 */
export function installScanListener(ctx) {
  document.addEventListener('analytics:scan', (e) => {
    const target = e.target && e.target.querySelectorAll ? e.target : document;
    scan(target, ctx);
  });
}
