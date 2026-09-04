/** War status is a fast-moving PvP feed — forts change hands in minutes —
 *  so poll noticeably more often than the boss timers (which only need to
 *  catch a spawn every ~61h). 60s (not 30s): every open tab polls this
 *  twice — once here, once independently in AlertsWatcher — and cort.ovh
 *  throttling Vercel's shared IP pool after a day of continuous polling
 *  (see api/cort-proxy.ts's comment) means aggregate request volume across
 *  every visitor matters, not just this one page's freshness. */
export const WZ_REFRESH_INTERVAL_MS = 60 * 1000;

/** Trailing window for the "who's most active" fort-capture chart. */
export const FORT_ACTIVITY_WINDOW_MS = 24 * 60 * 60 * 1000;
