import { REALMS, type Realm } from "../../data/realms";
import type { WzEvent, WzStatsReport, WzStatusData } from "../../types/wz";

export interface EventSegment {
	text: string;
	/** Colors the segment by realm when set; unset/null renders as plain text. */
	realm?: Realm | null;
}

export interface HumanizedEvent {
	key: string;
	date: number;
	emoji: string;
	segments: EventSegment[];
	/** Dragon wishes render as a single red line in CoRT, realm color and all. */
	isWish?: boolean;
}

/** Strips the trailing "(n)" fort-number suffix (e.g. "Imperia Castle (1)"
 *  from `WzStatusData.forts`) — the raw event log names forts without it. */
export function cleanFortName(name: string): string {
	return name.replace(/\s*\(\d+\)$/, "");
}

function isGreatWall(name: string): boolean {
	return name.startsWith("Great Wall");
}

/** Ported from CoRT's `HumaniseEvents.humanise_events()` in wztools.js —
 *  same event shapes (fort/gem capture & recapture, relic altar/transit,
 *  dragon wishes), translated to pt-BR and returned as colorable segments
 *  instead of an HTML string. */
export function humanizeEvent(event: WzEvent, index: number): HumanizedEvent | null {
	const key = `${event.date}-${event.type}-${event.name}-${index}`;
	const owner = (event.owner || null) as Realm | null;

	if (event.type === "fort" || event.type === "gem") {
		const recovered = event.location === event.owner;
		const location = event.location as Realm;

		if (event.type === "fort" && isGreatWall(event.name)) {
			return recovered
				? {
						key,
						date: event.date,
						emoji: "🛡️",
						segments: [{ text: event.owner, realm: owner }, { text: " reconquistou a Grande Muralha" }],
					}
				: {
						key,
						date: event.date,
						emoji: "🦍",
						segments: [
							{ text: event.owner, realm: owner },
							{ text: " invadiu a Grande Muralha de " },
							{ text: event.location, realm: location },
						],
					};
		}

		const target = event.type === "fort" ? cleanFortName(event.name) : `Gema #${event.name}`;
		return {
			key,
			date: event.date,
			emoji: event.type === "gem" ? "💎" : "",
			segments: [
				{ text: event.owner, realm: owner },
				{ text: recovered ? " recuperou " : " capturou " },
				{ text: target, realm: location },
			],
		};
	}

	if (event.type === "relic") {
		const altar = event.location === "altar";
		return {
			key,
			date: event.date,
			emoji: altar ? "🏛️" : "🏃",
			segments: [
				{ text: "A relíquia " },
				{ text: event.name, realm: owner },
				{ text: altar ? " voltou para o altar" : " está em trânsito" },
			],
		};
	}

	if (event.type === "wish") {
		const location = event.location as Realm;
		return {
			key,
			date: event.date,
			emoji: "🐉",
			isWish: true,
			segments: [{ text: event.location, realm: location }, { text: " fez um pedido ao dragão!" }],
		};
	}

	return null;
}

export function computeEventLog(data: WzStatusData, limit = 100): HumanizedEvent[] {
	const events: HumanizedEvent[] = [];
	for (let i = 0; i < data.events_log.length && events.length < limit; i++) {
		const humanized = humanizeEvent(data.events_log[i], i);
		if (humanized) events.push(humanized);
	}
	return events;
}

/** Just the "wish" events (dragon wishes) from an events list, newest first.
 *  Takes a plain event array rather than `WzStatusData` because dragon
 *  wishes are rare enough to not reliably show up in the ~100-entry rolling
 *  window of `WzStatusData.events_log` — callers should pass the larger
 *  events.json dump instead (see `useEventsDump`). */
export function computeDragonWishes(events: WzEvent[], limit = 5): HumanizedEvent[] {
	const wishes: HumanizedEvent[] = [];
	for (let i = 0; i < events.length && wishes.length < limit; i++) {
		const event = events[i];
		if (event.type !== "wish") continue;
		const humanized = humanizeEvent(event, i);
		if (humanized) wishes.push(humanized);
	}
	return wishes;
}

export interface RealmActivityCount {
	realm: Realm;
	count: number;
}

/** How many forts (regular keeps and Great Walls alike) each realm has
 *  captured or recaptured within the last `windowMs` — same rationale as
 *  `computeDragonWishes` for pulling from the larger events.json dump
 *  instead of `WzStatusData.events_log`: a busy war can blow through the
 *  ~100-entry recent window in well under a day, well before it's had a
 *  chance to reflect the trailing 24h. Sorted most-active realm first. */
export function computeFortActivityByRealm(events: WzEvent[], windowMs: number, now: number): RealmActivityCount[] {
	const cutoff = now - windowMs;
	const counts: Record<Realm, number> = { Alsius: 0, Ignis: 0, Syrtis: 0 };
	for (const event of events) {
		if (event.type !== "fort") continue;
		if (event.date * 1000 < cutoff) continue;
		if (event.owner in counts) counts[event.owner as Realm] += 1;
	}
	return REALMS.map((realm) => ({ realm, count: counts[realm] })).sort((a, b) => b.count - a.count);
}

/** Same "who's most active" tally as `computeFortActivityByRealm`, but from
 *  CoRT's pre-aggregated `stats.json` report (`forts.total` = captured +
 *  recovered) instead of the raw event log — needed for windows (7/30/90
 *  days) longer than what the raw event history covers. */
export function computeFortActivityFromStats(report: WzStatsReport): RealmActivityCount[] {
	return REALMS.map((realm) => ({ realm, count: report[realm]?.forts.total ?? 0 })).sort((a, b) => b.count - a.count);
}

export interface ActivityBucket {
	/** Bucket start, unix ms. */
	time: number;
	count: number;
}

/** Fort-capture counts (all realms combined) bucketed into fixed
 *  `bucketMs`-wide slices over the trailing `windowMs` — the "how active
 *  is the war throughout the day" curve. Always returns exactly
 *  `windowMs / bucketMs` buckets, oldest first, zero-filled where nothing
 *  happened, so the line has a steady cadence regardless of how sparse the
 *  data is in any given slice. */
export function computeFortActivityTimeline(
	events: WzEvent[],
	windowMs: number,
	bucketMs: number,
	now: number,
): ActivityBucket[] {
	const bucketCount = Math.round(windowMs / bucketMs);
	const start = now - bucketCount * bucketMs;
	const buckets: ActivityBucket[] = Array.from({ length: bucketCount }, (_, i) => ({
		time: start + i * bucketMs,
		count: 0,
	}));
	for (const event of events) {
		if (event.type !== "fort") continue;
		const eventMs = event.date * 1000;
		if (eventMs < start || eventMs > now) continue;
		const idx = Math.min(bucketCount - 1, Math.floor((eventMs - start) / bucketMs));
		buckets[idx].count += 1;
	}
	return buckets;
}

/** How many times each individual fort (by its cleaned name — see
 *  `cleanFortName`) changed hands within the trailing `windowMs` — the data
 *  behind the WZ map's heat overlay ("where's the fighting concentrated
 *  right now"). Forts with no recent activity simply don't appear as keys. */
export function computeFortActivityByFortName(events: WzEvent[], windowMs: number, now: number): Record<string, number> {
	const cutoff = now - windowMs;
	const counts: Record<string, number> = {};
	for (const event of events) {
		if (event.type !== "fort") continue;
		if (event.date * 1000 < cutoff) continue;
		counts[event.name] = (counts[event.name] ?? 0) + 1;
	}
	return counts;
}
