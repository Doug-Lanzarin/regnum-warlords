import { describe, expect, it } from "vitest";
import type { FortStatus } from "./wzEngine";
import { computeWallVulnerability } from "./wzEventsEngine";
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
