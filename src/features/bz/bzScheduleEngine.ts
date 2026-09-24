import { BZ_SCHEDULE_UTC } from "../../data/bzSchedule";

const DAY_MS = 24 * 60 * 60 * 1000;

interface RawSlot {
	beginMs: number;
	endMs: number;
}

/** Converts the fixed UTC-hour weekly schedule into real timestamps for the
 *  week starting today: for each UTC weekday, picks the nearest date on or
 *  after `now` (UTC) that falls on that weekday, then applies the begin/end
 *  UTC hour. This is the same technique CoRT's own bz.js uses (build a UTC
 *  `Date`, then read its `getHours()`/`getDay()` back to get the viewer's
 *  local equivalent) — the only reliable way to convert a fixed UTC-hour
 *  schedule to local time across every timezone without a date library. */
function buildUpcomingSlots(now: Date): RawSlot[] {
	const slots: RawSlot[] = [];
	for (let utcDay = 0; utcDay < 7; utcDay++) {
		const base = new Date(now);
		base.setUTCDate(base.getUTCDate() + ((utcDay + 7 - now.getUTCDay()) % 7));
		base.setUTCHours(0, 0, 0, 0);

		const begins = BZ_SCHEDULE_UTC.schbegin[utcDay];
		const ends = BZ_SCHEDULE_UTC.schend[utcDay];
		for (let i = 0; i < begins.length; i++) {
			const begin = new Date(base);
			begin.setUTCHours(begins[i]);
			const end = new Date(base);
			end.setUTCHours(ends[i]);
			slots.push({ beginMs: begin.getTime(), endMs: end.getTime() });
		}
	}
	return slots;
}

export interface BzSlot {
	beginMs: number;
	endMs: number;
	/** BZ is open right now during this exact slot. */
	isCurrent: boolean;
	/** The single soonest slot starting within the next 24h, when nothing
	 *  is currently open — highlights "what's coming up" the same way
	 *  `isCurrent` highlights "what's happening now". Never true at the
	 *  same time as some other slot's `isCurrent`. */
	isNext: boolean;
}

export interface BzDayColumn {
	/** A real date that falls on this column's weekday, on/after today —
	 *  only meant for weekday-label formatting (`formatWeekday`). The
	 *  schedule itself is a recurring weekly pattern grouped by day-of-week,
	 *  not tied to any slot's specific calendar date — same grouping
	 *  CoRT's own bz.js uses, since "what does Monday usually look like"
	 *  is the actual question this calendar answers. */
	date: Date;
	slots: BzSlot[];
}

/** The upcoming week's BZ schedule, one column per day starting with today,
 *  each with its open/close time windows in local time — with the current
 *  (or, if BZ is closed right now, the next upcoming) slot flagged so the
 *  UI can highlight it. Always returns exactly 7 columns; a column can have
 *  0-3 slots depending on how the viewer's timezone offset shifts each UTC
 *  day's windows across local day boundaries. */
export function computeBzWeeklySchedule(now: Date): BzDayColumn[] {
	const rawSlots = buildUpcomingSlots(now);

	const byWeekday: BzSlot[][] = [[], [], [], [], [], [], []];
	for (const raw of rawSlots) {
		const weekday = new Date(raw.beginMs).getDay();
		byWeekday[weekday].push({ ...raw, isCurrent: false, isNext: false });
	}
	for (const day of byWeekday) day.sort((a, b) => a.beginMs - b.beginMs);

	const nowMs = now.getTime();
	const within24h = nowMs + DAY_MS;
	let currentFound = false;
	let nearest: BzSlot | null = null;
	for (const day of byWeekday) {
		for (const slot of day) {
			if (nowMs >= slot.beginMs && nowMs < slot.endMs) {
				slot.isCurrent = true;
				currentFound = true;
			} else if (slot.beginMs > nowMs && slot.beginMs <= within24h && (!nearest || slot.beginMs < nearest.beginMs)) {
				nearest = slot;
			}
		}
	}
	if (!currentFound && nearest) nearest.isNext = true;

	const todayWeekday = now.getDay();
	const columns: BzDayColumn[] = [];
	for (let i = 0; i < 7; i++) {
		const weekday = (todayWeekday + i) % 7;
		const date = new Date(now);
		date.setDate(date.getDate() + i);
		columns.push({ date, slots: byWeekday[weekday] });
	}
	return columns;
}

export interface BzStatus {
	isOpen: boolean;
	/** When the current window ends (if open) or the next one begins (if
	 *  closed) — `null` only if there's no slot at all within the next 24h,
	 *  which shouldn't happen given how densely BZ_SCHEDULE_UTC is packed. */
	changesAtMs: number | null;
}

/** BZ's current open/closed state and when that next changes — derived
 *  from the same highlighted schedule `computeBzWeeklySchedule` builds,
 *  so the status card and the calendar's highlighted slot can never
 *  disagree with each other. */
export function computeBzStatus(now: Date): BzStatus {
	const schedule = computeBzWeeklySchedule(now);
	for (const day of schedule) {
		for (const slot of day.slots) {
			if (slot.isCurrent) return { isOpen: true, changesAtMs: slot.endMs };
			if (slot.isNext) return { isOpen: false, changesAtMs: slot.beginMs };
		}
	}
	return { isOpen: false, changesAtMs: null };
}
