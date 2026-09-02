import { describe, expect, it } from "vitest";
import { detectBossEvents, type BossState } from "./boss";
import type { BossSpawnData } from "../../src/types/bosses";

const EMPTY_STATE: BossState = { alerted: [] };

// Other bosses parked 30 days out so their own threshold windows never
// accidentally overlap with whatever "now" a test picks for daen — the 3
// thresholds are nested (15min ⊂ 30min ⊂ 60min window), so any test that
// wants to isolate a single boss/threshold needs the others held far away.
const FAR_FUTURE_OFFSET = 30 * 86400;

function bossData(daenSpawnSeconds: number): BossSpawnData {
	return {
		prev_spawns: { daen: 0, evendim: 0, thorkul: 0, server: 0 },
		next_spawns: {
			daen: [daenSpawnSeconds],
			evendim: [daenSpawnSeconds + FAR_FUTURE_OFFSET],
			thorkul: [daenSpawnSeconds + FAR_FUTURE_OFFSET],
			server: [daenSpawnSeconds + FAR_FUTURE_OFFSET],
		},
		next_boss: "daen",
		next_boss_ts: daenSpawnSeconds,
	};
}

describe("detectBossEvents", () => {
	it("fires the 60-minute threshold once 'now' enters its window", () => {
		const spawnSeconds = 1_000_000;
		const data = bossData(spawnSeconds);
		const now = spawnSeconds * 1000 - 45 * 60_000; // 45 min out — inside the 60min window, outside 30/15

		const { events } = detectBossEvents(data, now, EMPTY_STATE);
		expect(events).toEqual([{ bossKey: "daen", minutes: 60, spawnSeconds }]);
	});

	it("does not fire before the 60-minute window opens, or once the spawn has already passed", () => {
		const spawnSeconds = 1_000_000;
		const data = bossData(spawnSeconds);
		const spawnMs = spawnSeconds * 1000;

		const tooEarly = detectBossEvents(data, spawnMs - 90 * 60_000, EMPTY_STATE);
		expect(tooEarly.events).toEqual([]);

		// Realistically all 3 thresholds would already be alerted by the time
		// the spawn itself passes (the cron ticks every minute) — seed that
		// state instead of an empty one, since an empty baseline this close
		// to spawn would otherwise report every threshold as newly crossed.
		const allAlerted: BossState = { alerted: [60, 30, 15].map((m) => `daen:${spawnSeconds}:${m}`) };
		const alreadySpawned = detectBossEvents(data, spawnMs + 1000, allAlerted);
		expect(alreadySpawned.events).toEqual([]);
	});

	it("fires each threshold exactly once as 'now' advances tick by tick, never repeating one already alerted", () => {
		const spawnSeconds = 1_000_000;
		const data = bossData(spawnSeconds);
		const spawnMs = spawnSeconds * 1000;

		// Tick 1: 45 min out — only the 60min window is open.
		const tick1 = detectBossEvents(data, spawnMs - 45 * 60_000, EMPTY_STATE);
		expect(tick1.events).toEqual([{ bossKey: "daen", minutes: 60, spawnSeconds }]);

		// Tick 2: same instant polled again (simulates the cron re-running) —
		// 60 is already in `alerted`, so it must not fire a second time.
		const tick2 = detectBossEvents(data, spawnMs - 45 * 60_000, tick1.next);
		expect(tick2.events).toEqual([]);

		// Tick 3: 20 min out — now inside the 30min window too. 60 stays
		// suppressed (already alerted); 30 is new.
		const tick3 = detectBossEvents(data, spawnMs - 20 * 60_000, tick2.next);
		expect(tick3.events).toEqual([{ bossKey: "daen", minutes: 30, spawnSeconds }]);

		// Tick 4: 10 min out — now inside the 15min window too. Only 15 is new.
		const tick4 = detectBossEvents(data, spawnMs - 10 * 60_000, tick3.next);
		expect(tick4.events).toEqual([{ bossKey: "daen", minutes: 15, spawnSeconds }]);
	});

	it("can report pending thresholds for two different bosses in the same tick", () => {
		const daenSpawnSeconds = 1_000_000;
		const evendimSpawnSeconds = daenSpawnSeconds + 15 * 60; // 15 minutes after daen
		const data: BossSpawnData = {
			prev_spawns: { daen: 0, evendim: 0, thorkul: 0, server: 0 },
			next_spawns: {
				daen: [daenSpawnSeconds],
				evendim: [evendimSpawnSeconds],
				thorkul: [daenSpawnSeconds + FAR_FUTURE_OFFSET],
				server: [daenSpawnSeconds + FAR_FUTURE_OFFSET],
			},
			next_boss: "daen",
			next_boss_ts: daenSpawnSeconds,
		};
		// 15 minutes before daen spawns == 30 minutes before evendim spawns.
		// Pre-seed daen's 60/30 (already alerted earlier) and evendim's 60,
		// so only daen's 15min and evendim's 30min are still pending here.
		const state: BossState = {
			alerted: [`daen:${daenSpawnSeconds}:60`, `daen:${daenSpawnSeconds}:30`, `evendim:${evendimSpawnSeconds}:60`],
		};
		const now = daenSpawnSeconds * 1000 - 15 * 60_000;

		const { events } = detectBossEvents(data, now, state);
		expect(events).toEqual(
			expect.arrayContaining([
				{ bossKey: "daen", minutes: 15, spawnSeconds: daenSpawnSeconds },
				{ bossKey: "evendim", minutes: 30, spawnSeconds: evendimSpawnSeconds },
			]),
		);
		expect(events).toHaveLength(2);
	});

	it("prunes alerted entries older than 2 hours so the persisted set doesn't grow forever", () => {
		const oldSpawnSeconds = 1_000_000;
		const staleState: BossState = { alerted: [`daen:${oldSpawnSeconds}:60`] };

		// "Now" is 3 hours past that old spawn — well outside the 2h retention window.
		const farFutureNow = (oldSpawnSeconds + 3 * 3600) * 1000;
		const unrelatedData = bossData(oldSpawnSeconds + FAR_FUTURE_OFFSET);

		const { next } = detectBossEvents(unrelatedData, farFutureNow, staleState);
		expect(next.alerted).not.toContain(`daen:${oldSpawnSeconds}:60`);
	});
});
