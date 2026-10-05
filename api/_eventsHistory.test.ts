import { describe, expect, it } from "vitest";
import { dedupKeyOf, mergeIntoHistory } from "./_eventsHistory";
import type { WzEvent } from "../src/types/wz";

const DAY_S = 24 * 60 * 60;
// A realistic "now", minute-aligned so every test below can reason about
// exact minute boundaries without an awkward 1970-epoch offset tripping up
// the retention math.
const NOW_S = Math.floor(Date.UTC(2024, 5, 15, 12, 0, 0) / 1000 / 60) * 60;
const NOW_MS = NOW_S * 1000;

function wish(location: string, dateSeconds: number): WzEvent {
	return { date: dateSeconds, name: "", location, owner: "", type: "wish" };
}

describe("dedupKeyOf", () => {
	it("rounds to the minute a scrape happened in, so two sources recording the same real event a couple seconds apart collide", () => {
		const a = wish("Syrtis", NOW_S);
		const b = wish("Syrtis", NOW_S + 20); // 20s later, same minute once rounded
		expect(dedupKeyOf(a)).toBe(dedupKeyOf(b));
	});

	it("does not collide across different minutes, types, names, locations, or owners", () => {
		const base = wish("Syrtis", NOW_S);
		expect(dedupKeyOf(base)).not.toBe(dedupKeyOf(wish("Syrtis", NOW_S + 61)));
		expect(dedupKeyOf(base)).not.toBe(dedupKeyOf(wish("Alsius", NOW_S)));
		expect(dedupKeyOf(base)).not.toBe(dedupKeyOf({ ...base, type: "fort", name: "Imperia Castle" }));
	});
});

describe("mergeIntoHistory", () => {
	it("unions existing and incoming with no overlap", () => {
		const existing = [wish("Alsius", NOW_S - 1 * DAY_S)];
		const incoming = [wish("Ignis", NOW_S - 2 * DAY_S)];
		const merged = mergeIntoHistory(existing, incoming, NOW_MS);
		expect(merged).toHaveLength(2);
	});

	it("dedupes an event present in both existing and incoming (the common case: nothing changed since last tick)", () => {
		const shared = wish("Syrtis", NOW_S - 1 * DAY_S);
		const merged = mergeIntoHistory([shared], [shared], NOW_MS);
		expect(merged).toHaveLength(1);
	});

	it("dedupes the same real event reported a few seconds apart, same as the live merge does", () => {
		const existing = [wish("Syrtis", NOW_S - 1 * DAY_S)];
		const incoming = [wish("Syrtis", NOW_S - 1 * DAY_S + 20)]; // 20s later, same minute
		const merged = mergeIntoHistory(existing, incoming, NOW_MS);
		expect(merged).toHaveLength(1);
	});

	it("sorts the merged result newest-first", () => {
		const merged = mergeIntoHistory(
			[wish("Alsius", NOW_S - 5 * DAY_S)],
			[wish("Ignis", NOW_S - 1 * DAY_S), wish("Syrtis", NOW_S - 3 * DAY_S)],
			NOW_MS,
		);
		expect(merged.map((e) => e.date)).toEqual([NOW_S - 1 * DAY_S, NOW_S - 3 * DAY_S, NOW_S - 5 * DAY_S]);
	});

	it("drops anything older than the retention window, existing entries included — this is what keeps the file from growing forever", () => {
		const retentionMs = 90 * DAY_S * 1000;
		const withinWindow = wish("Alsius", NOW_S - 89 * DAY_S);
		const justOutside = wish("Alsius", NOW_S - 91 * DAY_S);
		const merged = mergeIntoHistory([withinWindow, justOutside], [], NOW_MS, retentionMs);
		expect(merged).toEqual([withinWindow]);
	});

	it("defaults to a 90-day retention window when none is passed", () => {
		const tooOld = wish("Alsius", NOW_S - 91 * DAY_S);
		const merged = mergeIntoHistory([tooOld], [], NOW_MS);
		expect(merged).toHaveLength(0);
	});
});
