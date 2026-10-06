import { describe, expect, it } from "vitest";
import type { WzEvent } from "../../types/wz";
import { computeRealmBalance } from "./wzBalanceEngine";

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
// Noon UTC, deliberately NOT a midnight boundary — every test below relies
// on the engine flooring this down to EFFECTIVE_NOW (midnight the same
// day) before computing anything, so a bug that used NOW directly instead
// would show up as a wrong window, not get masked by testing exactly at
// midnight.
const NOW = Date.UTC(2024, 0, 20, 12, 0, 0);
const EFFECTIVE_NOW = Date.UTC(2024, 0, 20, 0, 0, 0);

/** A wish event for `location`, `msBeforeEffectiveNow` milliseconds before
 *  EFFECTIVE_NOW (the last UTC-midnight flip at/before NOW) — negative
 *  values place it *after* that flip (i.e. later today, but still before
 *  the raw NOW used in these tests). Timestamps are built off
 *  EFFECTIVE_NOW rather than NOW because that's what the window is
 *  actually anchored to (see wzBalanceEngine.ts's own doc comment on why:
 *  the balance is frozen between flips, not recomputed continuously). */
function wishAt(location: string, msBeforeEffectiveNow: number): WzEvent {
	return { date: Math.floor((EFFECTIVE_NOW - msBeforeEffectiveNow) / 1000), name: "", location, owner: "", type: "wish" };
}

function balanceOf(events: WzEvent[], realm: "Alsius" | "Ignis" | "Syrtis" = "Alsius") {
	return computeRealmBalance(events, NOW).find((b) => b.realm === realm)!;
}

function nextUtcMidnightAfter(ms: number): number {
	return Math.ceil(ms / DAY_MS) * DAY_MS;
}

describe("computeRealmBalance", () => {
	it("tier 4 with no wishes at all, and no predicted change (nothing to age out)", () => {
		const b = balanceOf([]);
		expect(b.tier).toBe(4);
		expect(b.wishCount).toBe(0);
		expect(b.predictedChangeAtMs).toBeNull();
	});

	it("tier 4 with exactly 1 wish (still 'fewer than 2') — aging it out doesn't cross a tier boundary either", () => {
		const b = balanceOf([wishAt("Alsius", 3 * DAY_MS)]);
		expect(b.tier).toBe(4);
		expect(b.predictedChangeAtMs).toBeNull();
	});

	it("freezes the window at the last UTC-midnight flip, not the exact current instant — a wish already past its raw 240h mark (because NOW is 12h ahead of EFFECTIVE_NOW) still counts", () => {
		// 1h shy of the window at EFFECTIVE_NOW, but NOW is noon (12h past
		// EFFECTIVE_NOW) — by raw clock time this wish is already 10d11h
		// old, well past 240h. It must still count: "the balance only
		// updates at 21:00," so today's figure was fixed as of the last
		// flip and doesn't quietly shrink before the next one.
		const b = balanceOf([wishAt("Alsius", 10 * DAY_MS - 1 * HOUR_MS)]);
		expect(b.wishCount).toBe(1);
	});

	it("counts a wish made later today (after the last flip) right away — lowering the balance doesn't wait for the next flip, only raising it does", () => {
		// 1h after EFFECTIVE_NOW (so still before the raw NOW of noon) —
		// made today, after the last flip, but it's this realm's OWN wish,
		// so it counts immediately against its own tier instead of waiting
		// for tonight's flip.
		const b = balanceOf([wishAt("Alsius", -1 * HOUR_MS)]);
		expect(b.wishCount).toBe(1);
	});

	it("does NOT count an enemy's wish made later today until the next flip — only this realm's own wishes apply live", () => {
		const events = [wishAt("Alsius", 1 * DAY_MS), wishAt("Alsius", 2 * DAY_MS), wishAt("Alsius", 3 * DAY_MS), ...Array.from({ length: 5 }, (_, i) => wishAt("Ignis", -(i + 1) * HOUR_MS))];
		const b = balanceOf(events);
		expect(b.topEnemyWishes).toBeNull();
		expect(b.tier).toBe(0); // not 2 — Ignis's wishes are all after the flip, so they don't count yet
	});

	it("exact window boundary: a wish precisely at the 10-day cutoff counts, one 1ms older doesn't", () => {
		const atCutoff = balanceOf([wishAt("Alsius", 10 * DAY_MS)]);
		const justOutside = balanceOf([wishAt("Alsius", 10 * DAY_MS + 1)]);
		expect(atCutoff.wishCount).toBe(1);
		expect(justOutside.wishCount).toBe(0);
	});

	it("tier 3 with exactly 2 wishes, predicting the change to tier 4 at the next UTC midnight after the older one's 240h expiry", () => {
		const oldWishAgeMs = 9 * DAY_MS + 5 * HOUR_MS; // still inside the 240h window
		const events = [wishAt("Alsius", 1 * DAY_MS), wishAt("Alsius", oldWishAgeMs)];
		const b = balanceOf(events);
		expect(b.tier).toBe(3);
		expect(b.wishCount).toBe(2);
		const rawExpiryMs = EFFECTIVE_NOW - oldWishAgeMs + 10 * DAY_MS;
		expect(b.predictedChangeAtMs).toBe(nextUtcMidnightAfter(rawExpiryMs));
	});

	it("tier 0 with 3+ wishes and no enemy wishing hard, predicting the drop to tier 3 once the oldest wish's 240h expires", () => {
		const oldWishAgeMs = 9 * DAY_MS;
		const events = [wishAt("Alsius", 1 * DAY_MS), wishAt("Alsius", 2 * DAY_MS), wishAt("Alsius", oldWishAgeMs)];
		const b = balanceOf(events);
		expect(b.tier).toBe(0);
		expect(b.wishCount).toBe(3);
		const rawExpiryMs = EFFECTIVE_NOW - oldWishAgeMs + 10 * DAY_MS;
		expect(b.predictedChangeAtMs).toBe(nextUtcMidnightAfter(rawExpiryMs));
	});

	it("an enemy making 5+ wishes does NOT drag a fewer-than-2-wishes realm down to tier 2 — the wish-count rules are checked first and win outright", () => {
		const events = [wishAt("Alsius", 1 * DAY_MS), ...Array.from({ length: 7 }, (_, i) => wishAt("Ignis", i * DAY_MS))];
		const b = balanceOf(events);
		expect(b.wishCount).toBe(1);
		expect(b.topEnemyWishes).toEqual({ realm: "Ignis", count: 7 });
		expect(b.tier).toBe(4); // not 2 — see the doc comment on tierFor for why
	});

	it("tier 2 when wishes are 3+ AND some enemy made 5+ of its own wishes — the enemy-wish rule intercepts before falling to tier 0", () => {
		const events = [
			wishAt("Alsius", 1 * DAY_MS),
			wishAt("Alsius", 2 * DAY_MS),
			wishAt("Alsius", 3 * DAY_MS),
			...Array.from({ length: 5 }, (_, i) => wishAt("Ignis", i * DAY_MS)),
		];
		const b = balanceOf(events);
		expect(b.wishCount).toBe(3);
		expect(b.topEnemyWishes?.count).toBe(5);
		expect(b.tier).toBe(2);
	});

	it("stays tier 0 when wishes are 3+ but the top enemy is one short of the trigger (4, not 5)", () => {
		const events = [
			wishAt("Alsius", 1 * DAY_MS),
			wishAt("Alsius", 2 * DAY_MS),
			wishAt("Alsius", 3 * DAY_MS),
			...Array.from({ length: 4 }, (_, i) => wishAt("Ignis", i * DAY_MS)),
		];
		const b = balanceOf(events);
		expect(b.topEnemyWishes?.count).toBe(4);
		expect(b.tier).toBe(0);
	});

	it("topEnemyWishes picks whichever enemy realm wished the most, not just whichever is checked first", () => {
		const events = [
			wishAt("Alsius", 1 * DAY_MS),
			wishAt("Alsius", 2 * DAY_MS),
			wishAt("Alsius", 3 * DAY_MS),
			...Array.from({ length: 2 }, (_, i) => wishAt("Ignis", i * DAY_MS)),
			...Array.from({ length: 6 }, (_, i) => wishAt("Syrtis", i * DAY_MS)),
		];
		const b = balanceOf(events);
		expect(b.topEnemyWishes).toEqual({ realm: "Syrtis", count: 6 });
		expect(b.tier).toBe(2);
	});

	it("predicts the drop from tier 2 back toward tier 0 once the wishing enemy's oldest wish ages past 240h", () => {
		const oldestAgeMs = 9 * DAY_MS + 12 * HOUR_MS;
		const events = [
			wishAt("Alsius", 1 * HOUR_MS),
			wishAt("Alsius", 2 * HOUR_MS),
			wishAt("Alsius", 3 * HOUR_MS),
			wishAt("Ignis", 0),
			wishAt("Ignis", 1 * DAY_MS),
			wishAt("Ignis", 2 * DAY_MS),
			wishAt("Ignis", 3 * DAY_MS),
			wishAt("Ignis", oldestAgeMs),
		];
		const b = balanceOf(events);
		expect(b.tier).toBe(2);
		const rawExpiryMs = EFFECTIVE_NOW - oldestAgeMs + 10 * DAY_MS;
		expect(b.predictedChangeAtMs).toBe(nextUtcMidnightAfter(rawExpiryMs));
	});

	it("predicted change is always the next UTC midnight, never today's (even when the raw expiry math would land exactly on EFFECTIVE_NOW)", () => {
		// This wish's 240h expiry is exactly EFFECTIVE_NOW (it's placed
		// exactly 10 days before EFFECTIVE_NOW) — a naive ceil-to-midnight
		// would round that *down* to today (already past), not forward.
		// The predicted change must still be tomorrow, since today's figure
		// is already fixed.
		const events = [wishAt("Alsius", 1 * DAY_MS), wishAt("Alsius", 10 * DAY_MS)];
		const b = balanceOf(events);
		expect(b.tier).toBe(3);
		expect(b.predictedChangeAtMs).toBe(EFFECTIVE_NOW + DAY_MS);
	});

	it("rounds a predicted change up to the next UTC midnight, never showing a mid-day timestamp", () => {
		const events = [wishAt("Alsius", 1 * DAY_MS), wishAt("Alsius", 9 * DAY_MS + 3 * HOUR_MS)];
		const b = balanceOf(events);
		expect(b.predictedChangeAtMs).not.toBeNull();
		expect(b.predictedChangeAtMs! % DAY_MS).toBe(0);
	});

	it("only counts wishes for the realm they're about — Ignis's wishes count toward Ignis's own wishCount, not Alsius's", () => {
		const events = [wishAt("Ignis", 1 * DAY_MS), wishAt("Ignis", 2 * DAY_MS), wishAt("Ignis", 3 * DAY_MS)];
		const b = balanceOf(events, "Alsius");
		expect(b.wishCount).toBe(0);
		expect(b.tier).toBe(4);
	});

	it("computes all 3 realms independently in one call", () => {
		const events = [wishAt("Alsius", 1 * DAY_MS), wishAt("Alsius", 2 * DAY_MS)];
		const all = computeRealmBalance(events, NOW);
		expect(all).toHaveLength(3);
		expect(all.find((b) => b.realm === "Alsius")!.tier).toBe(3);
		expect(all.find((b) => b.realm === "Ignis")!.tier).toBe(4);
		expect(all.find((b) => b.realm === "Syrtis")!.tier).toBe(4);
	});
});
