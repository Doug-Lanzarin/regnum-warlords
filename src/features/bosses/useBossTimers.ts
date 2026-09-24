import { useEffect, useMemo, useState } from "react";
import type { BossSpawnData } from "../../types/bosses";
import { computeBossSpawnData } from "./bossScheduleEngine";

export interface UseBossTimersResult {
	data: BossSpawnData;
	/** Live clock (ms since epoch), ticking every second, for countdown math. */
	now: number;
}

/**
 * Boss respawn timers used to be a genuinely live feed (CoRT's
 * `bosses.php`), but CoRT's own v5 rewrite removed that endpoint entirely
 * and moved the computation to run client-side instead (see
 * `bossScheduleEngine.ts`'s doc comment) — there's nothing left to fetch,
 * fail, or retry. `data` is just a pure function of `now`, recomputed on
 * every tick; the old loading/error/refresh/lastUpdated fields this hook
 * used to expose (back when it shared a module-level fetch via
 * `bossStore`) no longer mean anything and are gone.
 */
export function useBossTimers(): UseBossTimersResult {
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		const tick = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(tick);
	}, []);

	const data = useMemo(() => computeBossSpawnData(now), [now]);

	return { data, now };
}
