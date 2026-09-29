import { describe, expect, it } from "vitest";
import type { WzEvent } from "../../types/wz";
import { computeRealmBalance } from "./wzBalanceEngine";

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const NOW = Date.UTC(2024, 0, 20, 12, 0, 0); // noon UTC

/** A wish event for `location`, `msAgo` milliseconds before NOW. */
function wish(location: string, msAgo: number): WzEvent {
	return { date: Math.floor((NOW - msAgo) / 1000), name: "", location, owner: "", type: "wish" };
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
		const b = balanceOf([wish("Alsius", 3 * DAY_MS)]);
		expect(b.tier).toBe(4);
		expect(b.predictedChangeAtMs).toBeNull();
	});

	it("tier 3 with exactly 2 wishes, predicting the change to tier 4 at the next UTC midnight after the older one's 240h expiry", () => {
		const oldWishAgeMs = 9 * DAY_MS + 5 * HOUR_MS; // still inside the 240h window
		const events = [wish("Alsius", 1 * DAY_MS), wish("Alsius", oldWishAgeMs)];
		const b = balanceOf(events);
		expect(b.tier).toBe(3);
		expect(b.wishCount).toBe(2);
		const rawExpiryMs = NOW - oldWishAgeMs + 10 * DAY_MS;
		expect(b.predictedChangeAtMs).toBe(nextUtcMidnightAfter(rawExpiryMs));
	});

	it("tier 0 with 3+ wishes and no enemy wishing hard, predicting the drop to tier 3 once the oldest wish's 240h expires", () => {
		const oldWishAgeMs = 9 * DAY_MS;
		const events = [wish("Alsius", 1 * DAY_MS), wish("Alsius", 2 * DAY_MS), wish("Alsius", oldWishAgeMs)];
		const b = balanceOf(events);
		expect(b.tier).toBe(0);
		expect(b.wishCount).toBe(3);
		const rawExpiryMs = NOW - oldWishAgeMs + 10 * DAY_MS;
		expect(b.predictedChangeAtMs).toBe(nextUtcMidnightAfter(rawExpiryMs));
	});

	it("an enemy making 5+ wishes does NOT drag a fewer-than-2-wishes realm down to tier 2 — the wish-count rules are checked first and win outright", () => {
		const events = [wish("Alsius", 1 * DAY_MS), ...Array.from({ length: 7 }, (_, i) => wish("Ignis", i * DAY_MS))];
		const b = balanceOf(events);
		expect(b.wishCount).toBe(1);
		expect(b.topEnemyWishes).toEqual({ realm: "Ignis", count: 7 });
		expect(b.tier).toBe(4); // not 2 — see the doc comment on tierFor for why
	});

	it("tier 2 when wishes are 3+ AND some enemy made 5+ of its own wishes — the enemy-wish rule intercepts before falling to tier 0", () => {
		const events = [
			wish("Alsius", 1 * DAY_MS),
			wish("Alsius", 2 * DAY_MS),
			wish("Alsius", 3 * DAY_MS),
			...Array.from({ length: 5 }, (_, i) => wish("Ignis", i * DAY_MS)),
		];
		const b = balanceOf(events);
		expect(b.wishCount).toBe(3);
		expect(b.topEnemyWishes?.count).toBe(5);
		expect(b.tier).toBe(2);
	});

	it("stays tier 0 when wishes are 3+ but the top enemy is one short of the trigger (4, not 5)", () => {
		const events = [
			wish("Alsius", 1 * DAY_MS),
			wish("Alsius", 2 * DAY_MS),
			wish("Alsius", 3 * DAY_MS),
			...Array.from({ length: 4 }, (_, i) => wish("Ignis", i * DAY_MS)),
		];
		const b = balanceOf(events);
		expect(b.topEnemyWishes?.count).toBe(4);
		expect(b.tier).toBe(0);
	});

	it("topEnemyWishes picks whichever enemy realm wished the most, not just whichever is checked first", () => {
		const events = [
			wish("Alsius", 1 * DAY_MS),
			wish("Alsius", 2 * DAY_MS),
			wish("Alsius", 3 * DAY_MS),
			...Array.from({ length: 2 }, (_, i) => wish("Ignis", i * DAY_MS)),
			...Array.from({ length: 6 }, (_, i) => wish("Syrtis", i * DAY_MS)),
		];
		const b = balanceOf(events);
		expect(b.topEnemyWishes).toEqual({ realm: "Syrtis", count: 6 });
		expect(b.tier).toBe(2);
	});

	it("predicts the drop from tier 2 back toward tier 0 once the wishing enemy's oldest wish ages past 240h", () => {
		const oldestAgeMs = 9 * DAY_MS + 12 * HOUR_MS;
		const events = [
			wish("Alsius", 1 * HOUR_MS),
			wish("Alsius", 2 * HOUR_MS),
			wish("Alsius", 3 * HOUR_MS),
			wish("Ignis", 0),
			wish("Ignis", 1 * DAY_MS),
			wish("Ignis", 2 * DAY_MS),
			wish("Ignis", 3 * DAY_MS),
			wish("Ignis", oldestAgeMs),
		];
		const b = balanceOf(events);
		expect(b.tier).toBe(2);
		const rawExpiryMs = NOW - oldestAgeMs + 10 * DAY_MS;
		expect(b.predictedChangeAtMs).toBe(nextUtcMidnightAfter(rawExpiryMs));
	});

	it("rounds a predicted change up to the next UTC midnight, never showing a mid-day timestamp", () => {
		// A wish whose exact 240h expiry lands mid-afternoon shouldn't predict
		// a mid-afternoon change — the observable tier only ever flips at a
		// UTC day boundary (21:00 in Brasília time), per the game's own
		// day-reset convention.
		const events = [wish("Alsius", 1 * DAY_MS), wish("Alsius", 9 * DAY_MS + 3 * HOUR_MS)];
		const b = balanceOf(events);
		expect(b.predictedChangeAtMs).not.toBeNull();
		expect(b.predictedChangeAtMs! % DAY_MS).toBe(0);
	});

	it("uses an exact rolling 240h window, not a calendar-day one — a wish 239h59m old still counts, one at 240h01m doesn't", () => {
		const justInside = balanceOf([wish("Alsius", 10 * DAY_MS - 60_000)]);
		const justOutside = balanceOf([wish("Alsius", 10 * DAY_MS + 60_000)]);
		expect(justInside.wishCount).toBe(1);
		expect(justOutside.wishCount).toBe(0);
	});

	it("only counts wishes for the realm they're about — Ignis's wishes count toward Ignis's own wishCount, not Alsius's", () => {
		const events = [wish("Ignis", 1 * DAY_MS), wish("Ignis", 2 * DAY_MS), wish("Ignis", 3 * DAY_MS)];
		const b = balanceOf(events, "Alsius");
		expect(b.wishCount).toBe(0);
		expect(b.tier).toBe(4);
	});

	it("computes all 3 realms independently in one call", () => {
		const events = [wish("Alsius", 1 * DAY_MS), wish("Alsius", 2 * DAY_MS)];
		const all = computeRealmBalance(events, NOW);
		expect(all).toHaveLength(3);
		expect(all.find((b) => b.realm === "Alsius")!.tier).toBe(3);
		expect(all.find((b) => b.realm === "Ignis")!.tier).toBe(4);
		expect(all.find((b) => b.realm === "Syrtis")!.tier).toBe(4);
	});
});
