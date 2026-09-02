/** War status is a fast-moving PvP feed — forts change hands in minutes —
 *  so poll noticeably more often than the boss timers (which only need to
 *  catch a spawn every ~61h). */
export const WZ_REFRESH_INTERVAL_MS = 30 * 1000;

/** Trailing window for the "who's most active" fort-capture chart. */
export const FORT_ACTIVITY_WINDOW_MS = 24 * 60 * 60 * 1000;
