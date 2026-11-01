const HOUR_MS = 60 * 60 * 1000;

export const XYMERALD_RESET_INTERVAL_MS = 23 * HOUR_MS;

// One confirmed reset instant, in Brasília time (UTC-3, fixed — no DST
// there since 2019). Any other real reset instant would work equally well
// as the anchor, since `nextReset` just walks the cycle forward/backward
// from it in fixed steps — this isn't a special moment, just the one given
// when this was set up.
const XYMERALD_RESET_ANCHOR_MS = Date.UTC(2026, 9, 28, 18, 0, 0); // 2026-10-28T15:00:00-03:00

/** Smallest reset instant strictly after `now`, walking forward from
 *  `anchorMs` (a known past-or-future reset) in fixed `intervalMs` steps —
 *  same idiom `computeBossSpawnData` (bossScheduleEngine.ts) uses for boss
 *  respawns. Since the interval doesn't evenly divide 24h, this does NOT
 *  land on the same wall-clock time every cycle (e.g. a 16h interval
 *  anchored at 00:00 drifts to 16:00, then 08:00, before landing back on
 *  00:00 two days later) — that drift is real and intentional, not a bug. */
export function nextReset(anchorMs: number, intervalMs: number, now: number): number {
	const cyclesPassed = Math.floor((now - anchorMs) / intervalMs);
	return anchorMs + (cyclesPassed + 1) * intervalMs;
}

export interface ToolCounters {
	xymerald: { nextResetMs: number };
}

export function computeToolCounters(now: number): ToolCounters {
	return {
		xymerald: { nextResetMs: nextReset(XYMERALD_RESET_ANCHOR_MS, XYMERALD_RESET_INTERVAL_MS, now) },
	};
}
