import { describe, expect, it } from "vitest";
import { ABOBORAS_RESET_INTERVAL_MS, XIMERALD_RESET_INTERVAL_MS, computeToolCounters, nextReset } from "./toolCountersEngine";

const HOUR_MS = 60 * 60 * 1000;

describe("nextReset", () => {
	it("returns the anchor itself when `now` is before it", () => {
		const anchor = 1_000_000;
		expect(nextReset(anchor, HOUR_MS, anchor - 1)).toBe(anchor);
	});

	it("returns the anchor itself when `now` equals the anchor minus a whole interval — i.e. one full cycle before it", () => {
		const anchor = 10 * HOUR_MS;
		expect(nextReset(anchor, HOUR_MS, anchor - HOUR_MS)).toBe(anchor);
	});

	it("never returns the anchor itself when `now` is exactly at the anchor — the next reset is one interval later", () => {
		const anchor = 10 * HOUR_MS;
		expect(nextReset(anchor, HOUR_MS, anchor)).toBe(anchor + HOUR_MS);
	});

	it("is always strictly after `now`, for a `now` anywhere inside a cycle", () => {
		const anchor = 0;
		const interval = 16 * HOUR_MS;
		for (const now of [1, interval - 1, interval, interval + 1, 5 * interval + 3]) {
			expect(nextReset(anchor, interval, now)).toBeGreaterThan(now);
		}
	});

	it("walking forward in exact interval steps from `now` always lands on the same reset schedule", () => {
		const anchor = 12345;
		const interval = 23 * HOUR_MS;
		const now = anchor + 5 * interval + 1000;
		const next = nextReset(anchor, interval, now);
		expect((next - anchor) % interval).toBe(0);
	});
});

describe("computeToolCounters", () => {
	it("Abóboras' next reset is always strictly after `now` and a multiple of its 16h interval away from an aligned instant", () => {
		const now = Date.now();
		const { aboboras } = computeToolCounters(now);
		expect(aboboras.nextResetMs).toBeGreaterThan(now);
		expect(aboboras.nextResetMs % ABOBORAS_RESET_INTERVAL_MS).toBe(((Date.UTC(2026, 9, 28, 3, 0, 0) % ABOBORAS_RESET_INTERVAL_MS) + ABOBORAS_RESET_INTERVAL_MS) % ABOBORAS_RESET_INTERVAL_MS);
	});

	it("Ximerald's next reset is always strictly after `now` and a multiple of its 23h interval away from an aligned instant", () => {
		const now = Date.now();
		const { ximerald } = computeToolCounters(now);
		expect(ximerald.nextResetMs).toBeGreaterThan(now);
		expect(ximerald.nextResetMs % XIMERALD_RESET_INTERVAL_MS).toBe(((Date.UTC(2026, 9, 28, 18, 0, 0) % XIMERALD_RESET_INTERVAL_MS) + XIMERALD_RESET_INTERVAL_MS) % XIMERALD_RESET_INTERVAL_MS);
	});

	it("confirms the stated anchors: Abóboras next resets at 2026-10-28T00:00 Brasília (2026-10-28T03:00Z) when asked right before it", () => {
		const justBefore = Date.UTC(2026, 9, 28, 2, 59, 59);
		const { aboboras } = computeToolCounters(justBefore);
		expect(aboboras.nextResetMs).toBe(Date.UTC(2026, 9, 28, 3, 0, 0));
	});

	it("confirms the stated anchors: Ximerald next resets at 2026-10-28T15:00 Brasília (2026-10-28T18:00Z) when asked right before it", () => {
		const justBefore = Date.UTC(2026, 9, 28, 17, 59, 59);
		const { ximerald } = computeToolCounters(justBefore);
		expect(ximerald.nextResetMs).toBe(Date.UTC(2026, 9, 28, 18, 0, 0));
	});

	it("is a pure function of `now`", () => {
		const now = Date.now();
		expect(computeToolCounters(now)).toEqual(computeToolCounters(now));
	});
});
