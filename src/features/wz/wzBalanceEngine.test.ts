import { describe, expect, it } from "vitest";
import type { WzEvent } from "../../types/wz";
import { computeRealmBalance } from "./wzBalanceEngine";

const DAY_MS = 24 * 60 * 60 * 1000;
// Noon UTC, deliberately not midnight — every helper below places events at
// this same time-of-day on whichever UTC calendar day it targets, so a
// day-bucketing bug (off-by-one against the UTC-midnight boundary the game
// itself uses) would show up as a wrong day, not get masked by always
// testing exactly at midnight.
const NOW = Date.UTC(2024, 0, 20, 12, 0, 0);

/** A wish or fort event `daysAgo` UTC calendar days before NOW (0 = today). */
function wish(location: string, daysAgo: number): WzEvent {
	return { date: Math.floor((NOW - daysAgo * DAY_MS) / 1000), name: "", location, owner: "", type: "wish" };
}
function fort(location: string, owner: string, daysAgo: number): WzEvent {
	return { date: Math.floor((NOW - daysAgo * DAY_MS) / 1000), name: "Some Fort", location, owner, type: "fort" };
}

function balanceOf(events: WzEvent[], realm: "Alsius" | "Ignis" | "Syrtis" = "Alsius") {
	return computeRealmBalance(events, NOW).find((b) => b.realm === realm)!;
}

describe("computeRealmBalance", () => {
	it("tier 4 with no wishes at all, and no predicted change (nothing to age out)", () => {
		const b = balanceOf([]);
		expect(b.tier).toBe(4);
		expect(b.wishCount).toBe(0);
		expect(b.predictedChangeAtMs).toBeNull();
	});

	it("tier 4 with exactly 1 wish (still 'fewer than 2') — aging it out doesn't cross a tier boundary either", () => {
		const b = balanceOf([wish("Alsius", 3)]);
		expect(b.tier).toBe(4);
		expect(b.predictedChangeAtMs).toBeNull();
	});

	it("tier 3 with exactly 2 wishes, and predicts the change to tier 4 for when the older one ages out", () => {
		const events = [wish("Alsius", 1), wish("Alsius", 9)]; // 9 = the oldest day still in a 10-day window
		const b = balanceOf(events);
		expect(b.tier).toBe(3);
		expect(b.wishCount).toBe(2);
		// The day-9 wish ages out at the next UTC midnight (1 day from "today").
		const today = Math.floor(Math.floor(NOW / 1000) / 86400);
		expect(b.predictedChangeAtMs).toBe((today + 1) * 86400 * 1000);
	});

	it("tier 0 with 3+ wishes and no realm invading hard, predicting the drop to tier 3 once the oldest wish ages out", () => {
		const events = [wish("Alsius", 1), wish("Alsius", 2), wish("Alsius", 9)];
		const b = balanceOf(events);
		expect(b.tier).toBe(0);
		expect(b.wishCount).toBe(3);
		const today = Math.floor(Math.floor(NOW / 1000) / 86400);
		expect(b.predictedChangeAtMs).toBe((today + 1) * 86400 * 1000);
	});

	it("an enemy invading 5+ times does NOT drag a fewer-than-2-wishes realm down to tier 2 — the wish-count rules are checked first and win outright", () => {
		const events = [wish("Alsius", 1), ...Array.from({ length: 7 }, (_, i) => fort("Alsius", "Ignis", i))];
		const b = balanceOf(events);
		expect(b.wishCount).toBe(1);
		expect(b.topInvader).toEqual({ realm: "Ignis", count: 7 });
		expect(b.tier).toBe(4); // not 2 — see the doc comment on tierFor for why
	});

	it("tier 2 when wishes are 3+ AND some enemy invaded 5+ times — the invasion rule intercepts before falling to tier 0", () => {
		const events = [
			wish("Alsius", 1),
			wish("Alsius", 2),
			wish("Alsius", 3),
			...Array.from({ length: 5 }, (_, i) => fort("Alsius", "Ignis", i)),
		];
		const b = balanceOf(events);
		expect(b.wishCount).toBe(3);
		expect(b.topInvader?.count).toBe(5);
		expect(b.tier).toBe(2);
	});

	it("stays tier 0 when wishes are 3+ but the top invader is one short of the trigger (4, not 5)", () => {
		const events = [
			wish("Alsius", 1),
			wish("Alsius", 2),
			wish("Alsius", 3),
			...Array.from({ length: 4 }, (_, i) => fort("Alsius", "Ignis", i)),
		];
		const b = balanceOf(events);
		expect(b.topInvader?.count).toBe(4);
		expect(b.tier).toBe(0);
	});

	it("topInvader picks whichever enemy realm invaded the most, not just whichever is checked first", () => {
		const events = [
			wish("Alsius", 1),
			wish("Alsius", 2),
			wish("Alsius", 3),
			...Array.from({ length: 2 }, (_, i) => fort("Alsius", "Ignis", i)),
			...Array.from({ length: 6 }, (_, i) => fort("Alsius", "Syrtis", i)),
		];
		const b = balanceOf(events);
		expect(b.topInvader).toEqual({ realm: "Syrtis", count: 6 });
		expect(b.tier).toBe(2);
	});

	it("predicts the drop from tier 2 back toward tier 0 once the invading realm's count ages below the trigger", () => {
		// 3 wishes spread across recent days (won't age out within the window
		// this test cares about) + exactly 5 invasions, the oldest of which is
		// 9 days back — removing it drops the invader to 4, under the trigger.
		const events = [
			wish("Alsius", 0),
			wish("Alsius", 0),
			wish("Alsius", 0),
			fort("Alsius", "Ignis", 0),
			fort("Alsius", "Ignis", 1),
			fort("Alsius", "Ignis", 2),
			fort("Alsius", "Ignis", 3),
			fort("Alsius", "Ignis", 9),
		];
		const b = balanceOf(events);
		expect(b.tier).toBe(2);
		const today = Math.floor(Math.floor(NOW / 1000) / 86400);
		expect(b.predictedChangeAtMs).toBe((today + 1) * 86400 * 1000);
	});

	it("buckets events by UTC calendar day (the window's own start boundary), not a rolling 240h window — two wishes 2 seconds apart land on opposite sides of it", () => {
		// windowStartDay's own UTC midnight — 9 calendar days before today's
		// midnight (today is Jan 20, so this is Jan 11 00:00 UTC).
		const windowStartMidnight = Date.UTC(2024, 0, 11, 0, 0, 0);
		const oneSecondBefore: WzEvent = {
			date: Math.floor(windowStartMidnight / 1000) - 1,
			name: "",
			location: "Alsius",
			owner: "",
			type: "wish",
		};
		const oneSecondAfter: WzEvent = {
			date: Math.floor(windowStartMidnight / 1000) + 1,
			name: "",
			location: "Alsius",
			owner: "",
			type: "wish",
		};
		// A rolling 240h (10-day) window measured from NOW would include both
		// (they're 2 seconds apart, both well under 240h old) — only a
		// calendar-day window whose start is pinned to this exact UTC
		// midnight excludes the earlier one.
		expect(balanceOf([oneSecondBefore]).wishCount).toBe(0);
		expect(balanceOf([oneSecondAfter]).wishCount).toBe(1);
	});

	it("only counts wishes/invasions for the realm they're about — Ignis's wishes don't count toward Alsius's balance", () => {
		const events = [wish("Ignis", 1), wish("Ignis", 2), wish("Ignis", 3)];
		const b = balanceOf(events, "Alsius");
		expect(b.wishCount).toBe(0);
		expect(b.tier).toBe(4);
	});

	it("computes all 3 realms independently in one call", () => {
		const events = [wish("Alsius", 1), wish("Alsius", 2)];
		const all = computeRealmBalance(events, NOW);
		expect(all).toHaveLength(3);
		expect(all.find((b) => b.realm === "Alsius")!.tier).toBe(3);
		expect(all.find((b) => b.realm === "Ignis")!.tier).toBe(4);
		expect(all.find((b) => b.realm === "Syrtis")!.tier).toBe(4);
	});
});
