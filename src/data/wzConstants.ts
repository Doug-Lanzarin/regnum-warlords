/** Fort/gem status now comes from championsofregnum.com directly (see
 *  api/wz-official.ts) rather than cort.ovh, so it isn't subject to the
 *  same shared-IP-pool throttling — polled every 10s, per-request, since
 *  the official page is meant to handle regular player traffic and this
 *  is the freshness the feature is explicitly built around. */
export const WZ_OFFICIAL_REFRESH_INTERVAL_MS = 10 * 1000;

/** events.json/stats.json still come from cort.ovh, which *is* subject to
 *  that throttling (see api/cort-proxy.ts's comment) — every open tab
 *  polls these independently, so aggregate request volume across every
 *  visitor matters, not just one page's freshness. Kept conservative. */
export const WZ_REFRESH_INTERVAL_MS = 60 * 1000;

/** Trailing window for the "who's most active" fort-capture chart. */
export const FORT_ACTIVITY_WINDOW_MS = 24 * 60 * 60 * 1000;
