import { describe, expect, it } from "vitest";
import type { FortStatus } from "./wzEngine";
import {
	computeEnemyFortHoldDuration,
	computeEventLog,
	computeOwnFortRecoveryDuration,
	computeWallVulnerability,
	computeWeeklyActivityByTimeOfDay,
} from "./wzEventsEngine";
import type { WzEvent } from "../../types/wz";

const MIN = 60_000;

function fort(overrides: Partial<FortStatus> & { name: string; home: FortStatus["home"] }): FortStatus {
	return { owner: overrides.home, captured: false, since: null, ...overrides };
}

function alsiusForts(overrides: Partial<Record<"castle" | "keep1" | "keep2" | "wall", FortStatus["owner"]>> = {}): FortStatus[] {
	return [
		fort({ name: "Imperia Castle", home: "Alsius", owner: overrides.castle ?? "Alsius" }),
		fort({ name: "Fort Aggersborg", home: "Alsius", owner: overrides.keep1 ?? "Alsius" }),
		fort({ name: "Fort Trelleborg", home: "Alsius", owner: overrides.keep2 ?? "Alsius" }),
		fort({ name: "Great Wall of Alsius", home: "Alsius", owner: overrides.wall ?? "Alsius" }),
	];
}

function event(name: string, owner: string, dateSeconds: number): WzEvent {
	return { date: dateSeconds, name, location: "Alsius", owner, type: "fort" };
}

/** Same as `event()`, but with an explicit `location` (home realm) — needed
 *  wherever owner-vs-location actually matters (enemy capture vs. own-realm
 *  recapture), unlike `event()`'s fixed "Alsius" location. */
function fortEvent(name: string, location: string, owner: string, dateSeconds: number): WzEvent {
	return { date: dateSeconds, name, location, owner, type: "fort" };
}

function alsiusResult(forts: FortStatus[], events: WzEvent[], now: number) {
	return computeWallVulnerability(forts, events, now).find((w) => w.homeRealm === "Alsius")!;
}

describe("computeWallVulnerability", () => {
	it("is inactive when the home realm holds its own castle", () => {
		const now = Date.now();
		const result = alsiusResult(alsiusForts(), [], now);
		expect(result.aggressor).toBeNull();
		expect(result.isVulnerable).toBe(false);
	});

	it("is inactive when the invader holds the castle but no keeps", () => {
		const now = Date.now();
		const forts = alsiusForts({ castle: "Ignis" });
		const events = [event("Imperia Castle", "Ignis", (now - 20 * MIN) / 1000)];
		const result = alsiusResult(forts, events, now);
		expect(result.aggressor).toBeNull();
		expect(result.isVulnerable).toBe(false);
	});

	it("becomes vulnerable after 5 minutes of castle + both keeps", () => {
		const now = Date.now();
		const t0 = now - 6 * MIN;
		const forts = alsiusForts({ castle: "Ignis", keep1: "Ignis", keep2: "Ignis" });
		const events = [
			event("Imperia Castle", "Ignis", t0 / 1000),
			event("Fort Aggersborg", "Ignis", t0 / 1000),
			event("Fort Trelleborg", "Ignis", t0 / 1000),
		];
		const result = alsiusResult(forts, events, now);
		expect(result.aggressor).toBe("Ignis");
		expect(result.fortCount).toBe(2);
		expect(result.vulnerableAtMs).toBe(t0 + 5 * MIN);
		expect(result.isVulnerable).toBe(true);
	});

	it("is not vulnerable yet before 5 minutes of castle + both keeps", () => {
		const now = Date.now();
		const t0 = now - 3 * MIN;
		const forts = alsiusForts({ castle: "Ignis", keep1: "Ignis", keep2: "Ignis" });
		const events = [
			event("Imperia Castle", "Ignis", t0 / 1000),
			event("Fort Aggersborg", "Ignis", t0 / 1000),
			event("Fort Trelleborg", "Ignis", t0 / 1000),
		];
		const result = alsiusResult(forts, events, now);
		expect(result.vulnerableAtMs).toBe(t0 + 5 * MIN);
		expect(result.isVulnerable).toBe(false);
	});

	it("becomes vulnerable after 15 minutes of castle + a single keep", () => {
		const now = Date.now();
		const t0 = now - 20 * MIN;
		const forts = alsiusForts({ castle: "Ignis", keep1: "Ignis" });
		const events = [event("Imperia Castle", "Ignis", t0 / 1000), event("Fort Aggersborg", "Ignis", t0 / 1000)];
		const result = alsiusResult(forts, events, now);
		expect(result.fortCount).toBe(1);
		expect(result.vulnerableAtMs).toBe(t0 + 15 * MIN);
		expect(result.isVulnerable).toBe(true);
	});

	it("adds 10 minutes (switches to the 1-keep baseline) when a keep is lost mid-countdown, without resetting the start", () => {
		const now = Date.now();
		const t0 = now - 4 * MIN;
		// Ignis takes castle + both keeps at t0, then loses one keep back to
		// Alsius 2 minutes later — current state is castle + 1 keep.
		const forts = alsiusForts({ castle: "Ignis", keep1: "Ignis", keep2: "Alsius" });
		const events = [
			event("Fort Trelleborg", "Alsius", (t0 + 2 * MIN) / 1000),
			event("Imperia Castle", "Ignis", t0 / 1000),
			event("Fort Aggersborg", "Ignis", t0 / 1000),
			event("Fort Trelleborg", "Ignis", t0 / 1000),
		];
		const result = alsiusResult(forts, events, now);
		expect(result.fortCount).toBe(1);
		// Same continuousStart (t0) as the original 2-keep capture, just
		// re-targeted at the 15min baseline instead of 5min — exactly +10min
		// versus what a moment ago (at the flip) would have been left.
		expect(result.vulnerableAtMs).toBe(t0 + 15 * MIN);
	});

	it("subtracts 10 minutes (switches to the 2-keep baseline) when the other keep is taken mid-countdown, without resetting the start", () => {
		const now = Date.now();
		const t0 = now - 10 * MIN;
		// Ignis takes castle + 1 keep at t0, then takes the other keep too
		// 3 minutes later — current state is castle + both keeps.
		const forts = alsiusForts({ castle: "Ignis", keep1: "Ignis", keep2: "Ignis" });
		const events = [
			event("Fort Trelleborg", "Ignis", (t0 + 3 * MIN) / 1000),
			event("Imperia Castle", "Ignis", t0 / 1000),
			event("Fort Aggersborg", "Ignis", t0 / 1000),
		];
		const result = alsiusResult(forts, events, now);
		expect(result.fortCount).toBe(2);
		expect(result.vulnerableAtMs).toBe(t0 + 5 * MIN);
		expect(result.isVulnerable).toBe(true);
	});

	it("resets the countdown from scratch after the invader loses the castle, even if it retakes everything later", () => {
		const now = Date.now();
		const t0 = now - 4 * MIN;
		const retakeAt = now - 2 * MIN;
		const forts = alsiusForts({ castle: "Ignis", keep1: "Ignis", keep2: "Ignis" });
		const events = [
			event("Imperia Castle", "Ignis", retakeAt / 1000),
			event("Imperia Castle", "Alsius", (t0 + 1 * MIN) / 1000),
			event("Imperia Castle", "Ignis", t0 / 1000),
			event("Fort Aggersborg", "Ignis", t0 / 1000),
			event("Fort Trelleborg", "Ignis", t0 / 1000),
		];
		const result = alsiusResult(forts, events, now);
		// Must count from the retake, not the original (interrupted) capture.
		expect(result.vulnerableAtMs).toBe(retakeAt + 5 * MIN);
		expect(result.isVulnerable).toBe(false);
	});
});

describe("computeEventLog", () => {
	it("reads from the events.json dump passed in, not a ~100-entry rolling window — the actual reported bug (the log only ever showing a few recent hours)", () => {
		// A dump deep enough that a shallow, ~100-entry-only source could never
		// have covered it — this only passes if computeEventLog is reading the
		// full array given to it, not silently re-deriving from somewhere else.
		const events: WzEvent[] = Array.from({ length: 150 }, (_, i) => event(`Fort ${i}`, "Alsius", i));
		const result = computeEventLog(events, "pt");
		expect(result).toHaveLength(100); // default limit
	});

	it("skips wish events — those get their own section via computeDragonWishes", () => {
		const events: WzEvent[] = [
			{ date: 2, name: "", location: "Syrtis", owner: "", type: "wish" },
			event("Imperia Castle", "Alsius", 1),
		];
		const result = computeEventLog(events, "pt");
		expect(result).toHaveLength(1);
		expect(result[0].segments.some((s) => s.text === "Imperia Castle")).toBe(true);
	});

	it("respects a custom limit", () => {
		const events: WzEvent[] = Array.from({ length: 10 }, (_, i) => event(`Fort ${i}`, "Alsius", i));
		expect(computeEventLog(events, "pt", 3)).toHaveLength(3);
	});
});

describe("computeWeeklyActivityByTimeOfDay", () => {
	// Local-time based, matching how the function itself interprets
	// event.date — deterministic regardless of which timezone tests run in.
	function localSeconds(daysAgo: number, hours: number, minutes: number, referenceNow: number): number {
		const ref = new Date(referenceNow);
		const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - daysAgo, hours, minutes, 0, 0);
		return Math.floor(d.getTime() / 1000);
	}

	it("returns all 96 time-of-day slots, zero-filled where nothing happened", () => {
		const now = Date.now();
		const result = computeWeeklyActivityByTimeOfDay([], now);
		expect(result).toHaveLength(96);
		expect(result[0].minuteOfDay).toBe(0);
		expect(result[95].minuteOfDay).toBe(1425);
		expect(result.every((p) => p.activity.Alsius === 0 && p.activity.Ignis === 0 && p.activity.Syrtis === 0)).toBe(true);
	});

	it("buckets a fort capture into its 15-minute time-of-day slot, averaged over 7 days", () => {
		const now = Date.now();
		// 14:07 local time, 2 days ago — falls in the 14:00–14:15 slot.
		const events = [event("Imperia Castle", "Ignis", localSeconds(2, 14, 7, now))];
		const result = computeWeeklyActivityByTimeOfDay(events, now);
		const slot = result.find((p) => p.minuteOfDay === 14 * 60)!;
		expect(slot.activity.Ignis).toBeCloseTo(1 / 7);
		expect(slot.activity.Alsius).toBe(0);
	});

	it("sums same-time-of-day captures from different days into the same slot", () => {
		const now = Date.now();
		const events = [
			event("Imperia Castle", "Syrtis", localSeconds(1, 9, 5, now)),
			event("Fort Aggersborg", "Syrtis", localSeconds(3, 9, 12, now)), // same 09:00–09:15 slot
		];
		const result = computeWeeklyActivityByTimeOfDay(events, now);
		const slot = result.find((p) => p.minuteOfDay === 9 * 60)!;
		expect(slot.activity.Syrtis).toBeCloseTo(2 / 7);
	});

	it("ignores events older than 7 days", () => {
		const now = Date.now();
		// owner "Ignis" vs the event() helper's fixed location "Alsius" —
		// enemy territory, so this only tests the age cutoff in isolation,
		// not conflated with the own-territory exclusion below.
		const events = [event("Imperia Castle", "Ignis", localSeconds(10, 12, 0, now))];
		const result = computeWeeklyActivityByTimeOfDay(events, now);
		expect(result.every((p) => p.activity.Ignis === 0)).toBe(true);
	});

	it("ignores non-fort events (gems, wishes) — this is a fort-capture activity chart, same convention as computeFortActivityByRealm", () => {
		const now = Date.now();
		const events: WzEvent[] = [
			{ date: localSeconds(1, 10, 0, now), name: "Gema", location: "Ignis", owner: "Ignis", type: "gem" },
			{ date: localSeconds(1, 10, 0, now), name: "", location: "Ignis", owner: "", type: "wish" },
		];
		const result = computeWeeklyActivityByTimeOfDay(events, now);
		expect(result.every((p) => p.activity.Ignis === 0)).toBe(true);
	});

	it("only counts captures in enemy territory, not a realm recapturing its own fort — e.g. Syrtis taking Samal (Ignis's keep) counts, Syrtis retaking Herbred (its own keep) doesn't", () => {
		const now = Date.now();
		const events: WzEvent[] = [
			// Syrtis invading Ignis's territory — should count.
			{ date: localSeconds(1, 11, 0, now), name: "Fort Samal", location: "Ignis", owner: "Syrtis", type: "fort" },
			// Syrtis recapturing its own fort — should NOT count.
			{ date: localSeconds(1, 11, 0, now), name: "Fort Herbred", location: "Syrtis", owner: "Syrtis", type: "fort" },
		];
		const result = computeWeeklyActivityByTimeOfDay(events, now);
		const slot = result.find((p) => p.minuteOfDay === 11 * 60)!;
		expect(slot.activity.Syrtis).toBeCloseTo(1 / 7);
	});
});

const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

describe("computeEnemyFortHoldDuration", () => {
	it("measures the time between an enemy capture and the fort's next event as the hold duration", () => {
		const now = Date.now();
		const t0 = now - 5 * HOUR;
		const events = [
			fortEvent("Fort Samal", "Ignis", "Syrtis", t0 / 1000), // Syrtis invades Ignis's fort
			fortEvent("Fort Samal", "Ignis", "Ignis", (t0 + 2 * HOUR) / 1000), // Ignis takes it back 2h later
		];
		const result = computeEnemyFortHoldDuration(events, WEEK, now);
		const syrtis = result.find((r) => r.realm === "Syrtis")!;
		expect(syrtis.avgMs).toBe(2 * HOUR);
		expect(syrtis.samples).toBe(1);
	});

	it("treats a still-held enemy fort as ongoing, using `now` as its end", () => {
		const now = Date.now();
		const events = [fortEvent("Fort Samal", "Ignis", "Syrtis", (now - 3 * HOUR) / 1000)];
		const result = computeEnemyFortHoldDuration(events, WEEK, now);
		const syrtis = result.find((r) => r.realm === "Syrtis")!;
		expect(syrtis.avgMs).toBe(3 * HOUR);
		expect(syrtis.samples).toBe(1);
	});

	it("excludes a realm recapturing its own territory — only enemy-territory captures count", () => {
		const now = Date.now();
		const events = [fortEvent("Fort Herbred", "Syrtis", "Syrtis", (now - 3 * HOUR) / 1000)];
		const result = computeEnemyFortHoldDuration(events, WEEK, now);
		const syrtis = result.find((r) => r.realm === "Syrtis")!;
		expect(syrtis.avgMs).toBeNull();
		expect(syrtis.samples).toBe(0);
	});

	it("excludes captures outside the trailing window", () => {
		const now = Date.now();
		const events = [fortEvent("Fort Samal", "Ignis", "Syrtis", (now - 10 * DAY) / 1000)];
		const result = computeEnemyFortHoldDuration(events, WEEK, now);
		const syrtis = result.find((r) => r.realm === "Syrtis")!;
		expect(syrtis.avgMs).toBeNull();
	});

	it("averages across multiple captures by the same realm", () => {
		const now = Date.now();
		const events = [
			fortEvent("Fort Samal", "Ignis", "Syrtis", (now - 5 * HOUR) / 1000),
			fortEvent("Fort Samal", "Ignis", "Ignis", (now - 4 * HOUR) / 1000), // 1h hold
			fortEvent("Fort Algaros", "Ignis", "Syrtis", (now - 3 * HOUR) / 1000),
			fortEvent("Fort Algaros", "Ignis", "Ignis", now / 1000), // 3h hold
		];
		const result = computeEnemyFortHoldDuration(events, WEEK, now);
		const syrtis = result.find((r) => r.realm === "Syrtis")!;
		expect(syrtis.avgMs).toBe(2 * HOUR);
		expect(syrtis.samples).toBe(2);
	});
});

describe("computeOwnFortRecoveryDuration", () => {
	it("measures time from loss to recovery by the fort's own home realm", () => {
		const now = Date.now();
		const t0 = now - 5 * HOUR;
		const events = [
			fortEvent("Fort Herbred", "Syrtis", "Ignis", t0 / 1000), // Ignis takes Syrtis's fort
			fortEvent("Fort Herbred", "Syrtis", "Syrtis", (t0 + 90 * MIN) / 1000), // Syrtis retakes 90min later
		];
		const result = computeOwnFortRecoveryDuration(events, WEEK, now);
		const syrtis = result.find((r) => r.realm === "Syrtis")!;
		expect(syrtis.avgMs).toBe(90 * MIN);
		expect(syrtis.samples).toBe(1);
	});

	it("excludes an unresolved loss — not yet recaptured, so there's no recovery time to measure", () => {
		const now = Date.now();
		const events = [fortEvent("Fort Herbred", "Syrtis", "Ignis", (now - 3 * HOUR) / 1000)];
		const result = computeOwnFortRecoveryDuration(events, WEEK, now);
		const syrtis = result.find((r) => r.realm === "Syrtis")!;
		expect(syrtis.avgMs).toBeNull();
		expect(syrtis.samples).toBe(0);
	});

	it("filters by when the recovery completed, not when the loss happened — a loss outside the window still counts if it was recovered inside it", () => {
		const now = Date.now();
		const events = [
			fortEvent("Fort Herbred", "Syrtis", "Ignis", (now - 10 * DAY) / 1000), // lost outside the 7d window
			fortEvent("Fort Herbred", "Syrtis", "Syrtis", (now - 1 * DAY) / 1000), // recovered inside it
		];
		const result = computeOwnFortRecoveryDuration(events, WEEK, now);
		const syrtis = result.find((r) => r.realm === "Syrtis")!;
		expect(syrtis.samples).toBe(1);
		expect(syrtis.avgMs).toBe(9 * DAY);
	});

	it("only pairs a loss with the very next event — a third realm reclaiming it later doesn't get attributed as the original owner's recovery", () => {
		const now = Date.now();
		const t0 = now - 3 * HOUR;
		const events = [
			fortEvent("Fort Herbred", "Syrtis", "Ignis", t0 / 1000), // Ignis takes Syrtis's fort
			fortEvent("Fort Herbred", "Syrtis", "Alsius", (t0 + 1 * HOUR) / 1000), // Alsius takes it from Ignis
			fortEvent("Fort Herbred", "Syrtis", "Syrtis", (t0 + 2 * HOUR) / 1000), // Syrtis finally retakes
		];
		const result = computeOwnFortRecoveryDuration(events, WEEK, now);
		const syrtis = result.find((r) => r.realm === "Syrtis")!;
		// Only the Alsius→Syrtis leg counts as "recovered" (1h), not the full
		// Ignis→Syrtis span (2h) — the fort was never lost-then-immediately-
		// recovered by Syrtis in one step.
		expect(syrtis.samples).toBe(1);
		expect(syrtis.avgMs).toBe(1 * HOUR);
	});
});
