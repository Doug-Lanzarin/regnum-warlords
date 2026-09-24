import { BOSS_FIRST_RESPAWNS, BOSS_RESPAWN_DRIFT_SECONDS } from "../../data/bossConstants.js";
import type { BossKey, BossSpawnData } from "../../types/bosses";

const BASE_INTERVAL_SECONDS = 61 * 60 * 60;
const SERVER_INTERVAL_SECONDS = 7 * 24 * 60 * 60;

function intervalFor(key: BossKey): number {
	return key === "server" ? SERVER_INTERVAL_SECONDS : BASE_INTERVAL_SECONDS + (BOSS_RESPAWN_DRIFT_SECONDS[key] ?? 0);
}

/** Ported from CoRT's own `get_schedule()` (see `BOSS_FIRST_RESPAWNS`'s doc
 *  comment for where) — there's no live endpoint for this anymore on
 *  either side, so this is a pure function of the current time instead of
 *  a fetch. For each boss, walks forward from its known past respawn
 *  (`BOSS_FIRST_RESPAWNS`) in fixed-length steps to find the most recent
 *  respawn at or before `now`, then lists the next `respawns` upcoming
 *  ones from there. `next_boss`/`next_boss_ts` is whichever entry across
 *  all of them comes soonest. */
export function computeBossSpawnData(nowMs: number, respawns = 4): BossSpawnData {
	const nowSeconds = Math.floor(nowMs / 1000);
	const keys = Object.keys(BOSS_FIRST_RESPAWNS) as BossKey[];
	const prevSpawns = {} as Record<BossKey, number>;
	const nextSpawns = {} as Record<BossKey, number[]>;

	for (const key of keys) {
		const interval = intervalFor(key);
		const anchor = BOSS_FIRST_RESPAWNS[key];
		const cyclesPassed = Math.floor((nowSeconds - anchor) / interval);
		const prev = anchor + cyclesPassed * interval;
		prevSpawns[key] = prev;
		nextSpawns[key] = Array.from({ length: respawns }, (_, i) => prev + (i + 1) * interval);
	}

	let nextBoss = keys[0];
	let nextBossTs = nextSpawns[keys[0]][0];
	for (const key of keys) {
		const soonest = nextSpawns[key][0];
		if (soonest < nextBossTs) {
			nextBossTs = soonest;
			nextBoss = key;
		}
	}

	return { prev_spawns: prevSpawns, next_spawns: nextSpawns, next_boss: nextBoss, next_boss_ts: nextBossTs };
}
