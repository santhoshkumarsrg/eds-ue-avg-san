// add delayed functionality here
// Note: live pricing is now loaded from the pricing block's decorate (lazy
// phase) so the price shimmer resolves sooner; see blocks/pricing/pricing.js.

import initNortonAnalytics from './analytics.js';

// Populate the analytics data layer before any delayed MarTech consumers run.
initNortonAnalytics();
