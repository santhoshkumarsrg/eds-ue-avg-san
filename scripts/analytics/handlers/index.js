/**
 * Per-block analytics handler registry.
 *
 * Each handler exports `default { mount(root, ctx) }`. A block stamps
 * `data-analytic="<name>:0"` on its root and dispatches a bubbling
 * `analytics:scan`; `wire.js` looks up `HANDLERS[name]`, calls `mount`, and flips
 * the marker to `:1`.
 *
 * The registry key matches the block folder name, so `blocks/hero/` is wired by
 * `handlers/hero.js` under the key `hero`. That one-to-one mapping is the only
 * coupling between a block and its instrumentation.
 *
 * To instrument a new block:
 *   1. Create `scripts/analytics/handlers/<name>.js` exporting `default { mount }`.
 *   2. Add it below.
 *   3. In the block's `decorate`, stamp the marker and announce. Nothing else.
 *
 * Keep this file dependency-light — it is imported by `wire.js`, which the
 * orchestrator loads on every page that has analytics enabled.
 */

import hero from './hero.js';
import pricing from './pricing.js';

export const HANDLERS = Object.freeze({
  hero,
  pricing,
});

export default HANDLERS;
