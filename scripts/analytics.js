/**
 * Backward-compatible re-exports for the analytics modules under `scripts/analytics/`.
 * Prefer importing from `./analytics/index.js` or the specific module.
 */

export { buildNortonAnalytics, default as initNortonAnalytics } from './analytics/norton-analytics.js';
export { default as initAnalytics } from './analytics/index.js';
