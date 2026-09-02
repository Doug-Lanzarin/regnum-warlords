import { BOSS_ORDER } from "../../src/data/bossConstants";
import type { BossKey } from "../../src/types/bosses";
import type { BossSpawnData } from "../../src/types/bosses";

export interface BossState {
	/** `${bossKey}:${spawnSeconds}:${minutes}` keys already alerted for. */
	alerted: string[];
}

export interface BossEvent {
	bossKey: BossKey;
	minutes: number;
	spawnSeconds: number;
}

/** Same 3 thresholds `AlertSettingsPanel` offers — every subscriber's
 *  `bossAlertMinutes` is a subset of this, filtered in `buildMessagesFor`. */
const THRESHOLD_MINUTES = [60, 30, 15];

/** Mirrors `AlertsWatcher`'s boss-spawn watch: for each boss's soonest
 *  scheduled spawn, checks whether "now" just crossed one of the 60/30/15
 *  minute thresholds — but keeps the "already alerted" bookkeeping in KV
 *  (`BossState`) instead of a component ref, since the Worker has no
 *  in-memory state between cron ticks. */
export function detectBossEvents(
	bossData: BossSpawnData,
	nowMs: number,
	previous: BossState,
): { next: BossState; events: BossEvent[] } {
	const alerted = new Set(previous.alerted);
	const events: BossEvent[] = [];

	for (const bossKey of BOSS_ORDER) {
		const nextSpawns = bossData.next_spawns[bossKey];
		if (!nextSpawns?.length) continue;
		const spawnSeconds = nextSpawns[0];
		const spawnMs = spawnSeconds * 1000;
		for (const minutes of THRESHOLD_MINUTES) {
			const triggerAt = spawnMs - minutes * 60_000;
			const key = `${bossKey}:${spawnSeconds}:${minutes}`;
			if (nowMs < triggerAt || nowMs >= spawnMs) continue;
			if (alerted.has(key)) continue;
			alerted.add(key);
			events.push({ bossKey, minutes, spawnSeconds });
		}
	}

	// Bound the set's growth — drop entries for spawns more than 2h in the past.
	const cutoffSeconds = nowMs / 1000 - 2 * 3600;
	const pruned = [...alerted].filter((key) => {
		const spawnSeconds = Number(key.split(":")[1]);
		return !Number.isFinite(spawnSeconds) || spawnSeconds >= cutoffSeconds;
	});

	return { next: { alerted: pruned }, events };
}
