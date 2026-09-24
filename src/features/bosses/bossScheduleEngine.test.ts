import { describe, expect, it } from "vitest";
import { BOSS_FIRST_RESPAWNS } from "../../data/bossConstants";
import { computeBossSpawnData } from "./bossScheduleEngine";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

describe("computeBossSpawnData", () => {
	it("returns all 4 boss keys with the requested number of upcoming spawns each", () => {
		const data = computeBossSpawnData(Date.now(), 4);
		for (const key of ["daen", "evendim", "thorkul", "server"] as const) {
			expect(data.next_spawns[key]).toHaveLength(4);
			expect(typeof data.prev_spawns[key]).toBe("number");
		}
	});

	it("every next spawn is strictly after `now`, and every prev spawn at or before it", () => {
		const now = Date.now();
		const data = computeBossSpawnData(now);
		const nowSeconds = Math.floor(now / 1000);
		for (const key of ["daen", "evendim", "thorkul", "server"] as const) {
			expect(data.prev_spawns[key]).toBeLessThanOrEqual(nowSeconds);
			for (const ts of data.next_spawns[key]) expect(ts).toBeGreaterThan(nowSeconds);
		}
	});

	it("each boss's own spawns are evenly spaced by its fixed interval", () => {
		const data = computeBossSpawnData(Date.now(), 3);
		// thorkul/evendim/daen: 61h + a small per-boss drift; server: flat 7 days.
		const expectedIntervals: Record<string, number> = {
			thorkul: 61 * 3600 + 4,
			evendim: 61 * 3600 + 7,
			daen: 61 * 3600 + 5,
			server: 7 * 24 * 3600,
		};
		for (const [key, interval] of Object.entries(expectedIntervals)) {
			const spawns = [data.prev_spawns[key as "thorkul"], ...data.next_spawns[key as "thorkul"]];
			for (let i = 1; i < spawns.length; i++) expect(spawns[i] - spawns[i - 1]).toBe(interval);
		}
	});

	it("exactly reproduces a known respawn at its own anchor timestamp — the anchors are real past respawns, not arbitrary", () => {
		// At the instant of thorkul's own first_respawns anchor, that must be
		// its most recent ("prev") spawn — zero cycles have passed yet.
		const anchorMs = BOSS_FIRST_RESPAWNS.thorkul * 1000;
		const data = computeBossSpawnData(anchorMs);
		expect(data.prev_spawns.thorkul).toBe(BOSS_FIRST_RESPAWNS.thorkul);
	});

	it("next_boss/next_boss_ts point at whichever boss has the soonest upcoming spawn", () => {
		const now = Date.now();
		const data = computeBossSpawnData(now);
		const soonestPerBoss = (["daen", "evendim", "thorkul", "server"] as const).map((key) => ({
			key,
			ts: data.next_spawns[key][0],
		}));
		const expected = soonestPerBoss.reduce((a, b) => (b.ts < a.ts ? b : a));
		expect(data.next_boss).toBe(expected.key);
		expect(data.next_boss_ts).toBe(expected.ts);
	});

	it("is a pure function of `now` — same input always produces the same schedule", () => {
		const now = Date.now();
		expect(computeBossSpawnData(now)).toEqual(computeBossSpawnData(now));
	});

	it("advancing `now` by exactly one interval shifts a boss's prev spawn forward by exactly that interval", () => {
		const now = Date.now();
		const before = computeBossSpawnData(now);
		const after = computeBossSpawnData(now + 61 * HOUR + 4000); // thorkul's own interval, in ms
		expect(after.prev_spawns.thorkul).toBe(before.prev_spawns.thorkul + 61 * 3600 + 4);
	});

	it("server reboot uses a flat 7-day interval regardless of the boss drift constants", () => {
		const now = Date.now();
		const before = computeBossSpawnData(now);
		const after = computeBossSpawnData(now + 7 * DAY);
		expect(after.prev_spawns.server).toBe(before.prev_spawns.server + 7 * 24 * 3600);
	});
});
