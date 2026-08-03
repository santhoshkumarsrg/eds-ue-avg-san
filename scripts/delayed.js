// add delayed functionality here
// Note: live pricing is now loaded from the pricing block's decorate (lazy
// phase) so the price shimmer resolves sooner; see blocks/pricing/pricing.js.

import initAnalytics from './analytics/index.js';

// Populate analytics data layers, then load MarTech vendor tags.
initAnalytics();
