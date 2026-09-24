import { describe, expect, it } from "vitest";
import { computeBzStatus, computeBzWeeklySchedule } from "./bzScheduleEngine";

const HOUR = 60 * 60 * 1000;

// This suite treats "local time" as UTC throughout — true in the
// environment these tests actually run in (verified: `new
// Date().getTimezoneOffset() === 0`), which is what lets a fixed UTC
// instant like `WEDNESDAY_14_UTC` below double as a meaningful assertion
// about the *converted* schedule, not just a tautological check of
// whatever the code happens to compute. BZ_SCHEDULE_UTC's Wednesday (UTC
// weekday 3) windows are [13,16) and [20,23).
const WEDNESDAY_MIDNIGHT_UTC = Date.UTC(2024, 0, 10); // confirmed UTC weekday 3

function at(hourUtc: number): Date {
	return new Date(WEDNESDAY_MIDNIGHT_UTC + hourUtc * HOUR);
}

describe("computeBzWeeklySchedule", () => {
	it("always returns exactly 7 columns, starting with today", () => {
		const now = at(14);
		const columns = computeBzWeeklySchedule(now);
		expect(columns).toHaveLength(7);
		expect(columns[0].date.getDay()).toBe(now.getDay());
	});

	it("flags the currently-open slot as isCurrent when `now` falls inside a BZ window", () => {
		const now = at(14); // Wednesday 14:00 — inside [13,16)
		const columns = computeBzWeeklySchedule(now);
		const wednesday = columns.find((c) => c.date.getDay() === now.getDay())!;
		const active = wednesday.slots.filter((s) => s.isCurrent);
		expect(active).toHaveLength(1);
		expect(new Date(active[0].beginMs).getHours()).toBe(13);
		expect(new Date(active[0].endMs).getHours()).toBe(16);
		expect(active[0].isNext).toBe(false);
	});

	it("flags the nearest upcoming slot as isNext when BZ is currently closed", () => {
		const now = at(17); // Wednesday 17:00 — between [13,16) and [20,23)
		const columns = computeBzWeeklySchedule(now);
		const allSlots = columns.flatMap((c) => c.slots);
		expect(allSlots.some((s) => s.isCurrent)).toBe(false);
		const next = allSlots.filter((s) => s.isNext);
		expect(next).toHaveLength(1);
		expect(new Date(next[0].beginMs).getHours()).toBe(20);
	});

	it("never has more than one slot flagged at a time across the whole week", () => {
		const now = at(17);
		const columns = computeBzWeeklySchedule(now);
		const flagged = columns.flatMap((c) => c.slots).filter((s) => s.isCurrent || s.isNext);
		expect(flagged).toHaveLength(1);
	});
});

describe("computeBzStatus", () => {
	it("reports open, with changesAtMs at the current slot's end", () => {
		const now = at(14);
		const status = computeBzStatus(now);
		expect(status.isOpen).toBe(true);
		expect(status.changesAtMs).not.toBeNull();
		expect(new Date(status.changesAtMs!).getHours()).toBe(16);
	});

	it("reports closed, with changesAtMs at the next slot's start", () => {
		const now = at(17);
		const status = computeBzStatus(now);
		expect(status.isOpen).toBe(false);
		expect(status.changesAtMs).not.toBeNull();
		expect(new Date(status.changesAtMs!).getHours()).toBe(20);
	});

	it("agrees with computeBzWeeklySchedule's own highlighted slot — never contradicts the calendar", () => {
		const now = at(2); // Wednesday 02:00 — closed, next is today's 13:00 window
		const status = computeBzStatus(now);
		const columns = computeBzWeeklySchedule(now);
		const highlighted = columns.flatMap((c) => c.slots).find((s) => s.isCurrent || s.isNext)!;
		expect(status.changesAtMs).toBe(status.isOpen ? highlighted.endMs : highlighted.beginMs);
	});
});
