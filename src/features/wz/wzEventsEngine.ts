import { REALMS, type Realm } from "../../data/realms";
import { getFortKind } from "../../data/fortKind";
import type { Lang } from "../../i18n/languages";
import { translate } from "../../i18n/translate";
import type { WzEvent, WzStatsReport, WzStatusData } from "../../types/wz";
import type { FortStatus } from "./wzEngine";

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
 *  dragon wishes), localized via the i18n dictionary and returned as
 *  colorable segments instead of an HTML string. */
export function humanizeEvent(event: WzEvent, index: number, lang: Lang): HumanizedEvent | null {
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
						segments: [{ text: event.owner, realm: owner }, { text: translate(lang, "wz.eventGreatWallRecovered") }],
					}
				: {
						key,
						date: event.date,
						emoji: "🦍",
						segments: [
							{ text: event.owner, realm: owner },
							{ text: translate(lang, "wz.eventGreatWallInvadedPrefix") },
							{ text: event.location, realm: location },
						],
					};
		}

		const target = event.type === "fort" ? cleanFortName(event.name) : translate(lang, "wz.eventGemLabel", { name: event.name });
		return {
			key,
			date: event.date,
			emoji: event.type === "gem" ? "💎" : "",
			segments: [
				{ text: event.owner, realm: owner },
				{ text: translate(lang, recovered ? "wz.eventFortRecovered" : "wz.eventFortCaptured") },
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
				{ text: translate(lang, "wz.eventRelicPrefix") },
				{ text: event.name, realm: owner },
				{ text: translate(lang, altar ? "wz.eventRelicAltar" : "wz.eventRelicTransit") },
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
			segments: [{ text: event.location, realm: location }, { text: translate(lang, "wz.eventWishSuffix") }],
		};
	}

	return null;
}

export function computeEventLog(data: WzStatusData, lang: Lang, limit = 100): HumanizedEvent[] {
	const events: HumanizedEvent[] = [];
	for (let i = 0; i < data.events_log.length && events.length < limit; i++) {
		const humanized = humanizeEvent(data.events_log[i], i, lang);
		if (humanized) events.push(humanized);
	}
	return events;
}

/** Just the "wish" events (dragon wishes) from an events list, newest first.
 *  Takes a plain event array rather than `WzStatusData` because dragon
 *  wishes are rare enough to not reliably show up in the ~100-entry rolling
 *  window of `WzStatusData.events_log` — callers should pass the larger
 *  events.json dump instead (see `useEventsDump`). */
export function computeDragonWishes(events: WzEvent[], lang: Lang, limit = 5): HumanizedEvent[] {
	const wishes: HumanizedEvent[] = [];
	for (let i = 0; i < events.length && wishes.length < limit; i++) {
		const event = events[i];
		if (event.type !== "wish") continue;
		const humanized = humanizeEvent(event, i, lang);
		if (humanized) wishes.push(humanized);
	}
	return wishes;
}

/** Every capture/recapture of a single fort (matched by its clean name, so
 *  callers can pass either the raw `WzFort.name` — with its "(n)" map-order
 *  suffix — or an already-clean name), newest first. Meant for a per-fort
 *  drill-down (e.g. clicking that fort on the map), as opposed to
 *  `computeEventLog`'s all-forts feed. */
export function computeFortHistory(events: WzEvent[], fortName: string, lang: Lang, limit = 15): HumanizedEvent[] {
	const target = cleanFortName(fortName);
	const history: HumanizedEvent[] = [];
	for (let i = 0; i < events.length && history.length < limit; i++) {
		const event = events[i];
		if (event.type !== "fort" || event.name !== target) continue;
		const humanized = humanizeEvent(event, i, lang);
		if (humanized) history.push(humanized);
	}
	return history;
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

/** How many dragon wishes each realm has made within the last `windowMs` —
 *  same rolling-events-dump source and rationale as `computeFortActivityByRealm`
 *  (only reaches back ~10 days; use `computeWishActivityFromStats` for the
 *  fixed 7/30/90-day windows `stats.json` covers instead). Sorted most
 *  active realm first. */
export function computeWishActivityByRealm(events: WzEvent[], windowMs: number, now: number): RealmActivityCount[] {
	const cutoff = now - windowMs;
	const counts: Record<Realm, number> = { Alsius: 0, Ignis: 0, Syrtis: 0 };
	for (const event of events) {
		if (event.type !== "wish") continue;
		if (event.date * 1000 < cutoff) continue;
		if (event.location in counts) counts[event.location as Realm] += 1;
	}
	return REALMS.map((realm) => ({ realm, count: counts[realm] })).sort((a, b) => b.count - a.count);
}

/** Same tally as `computeWishActivityByRealm`, but from CoRT's
 *  pre-aggregated `stats.json` report (`wishes.count`) instead of the raw
 *  event log — needed for windows (7/30/90 days) longer than what the raw
 *  event history covers. */
export function computeWishActivityFromStats(report: WzStatsReport): RealmActivityCount[] {
	return REALMS.map((realm) => ({ realm, count: report[realm]?.wishes.count ?? 0 })).sort((a, b) => b.count - a.count);
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

export interface WallVulnerability {
	homeRealm: Realm;
	/** Raw (uncleaned) name of this realm's "wall" fort, for matching against `FortStatus`/`WzFort`. */
	wallName: string;
	/** The single other realm currently holding this realm's castle, if any. */
	aggressor: Realm | null;
	/** How many of this realm's 2 regular keeps `aggressor` also holds. */
	fortCount: 0 | 1 | 2;
	/** Epoch ms the wall becomes vulnerable, or `null` if `aggressor` is null. */
	vulnerableAtMs: number | null;
	isVulnerable: boolean;
}

/** Wall vulnerability takes 15 minutes with castle+1 keep, 5 minutes with
 *  castle+2 keeps. */
const WALL_VULNERABILITY_BASELINE_MS: Record<1 | 2, number> = {
	1: 15 * 60_000,
	2: 5 * 60_000,
};

/** Finds when `aggressor` started continuously holding `homeRealm`'s castle
 *  plus at least one of its 2 keeps, by walking the (newest-first) raw
 *  events dump backward from `now` and looking for the most recent point
 *  where that condition turned true and never turned false again.
 *
 *  Using a single fixed start time together with the *current* fort count
 *  (see `computeWallVulnerability`) reproduces the game's "+/-10min on
 *  every fort flip" rule exactly, without tracking deltas: e.g. losing a
 *  keep partway through a 5min (castle+2) countdown and re-deriving the
 *  target as `start + 15min` always lands exactly 10min later than
 *  whatever was left a moment before — same identity in reverse for
 *  gaining a keep — so it also can't drift across repeated flips.
 *
 *  Falls back to the oldest relevant event in the window (or `now`, if
 *  there's none at all) when the streak apparently started before the raw
 *  dump's ~10-day coverage — vanishingly unlikely in an active war, but
 *  keeps this from ever returning a bogus/undefined start. */
function findContinuousControlStartMs(aggressor: Realm, relevantNames: Set<string>, events: WzEvent[], now: number): number {
	const relevant = events.filter((e) => e.type === "fort" && relevantNames.has(e.name));
	if (relevant.length === 0) return now;

	const owners = new Map<string, Realm>();
	const conditionHolds = () => {
		let keepsHeld = 0;
		let castleHeld = false;
		for (const name of relevantNames) {
			if (owners.get(name) !== aggressor) continue;
			if (getFortKind(name) === "castle") castleHeld = true;
			else keepsHeld += 1;
		}
		return castleHeld && keepsHeld >= 1;
	};

	// Walk oldest -> newest, replaying ownership, tracking the latest
	// false->true transition that's still true once we run out of events.
	const chronological = relevant.slice().reverse();
	let candidateStartMs: number | null = null;
	for (const event of chronological) {
		const wasHolding = candidateStartMs !== null;
		owners.set(event.name, event.owner as Realm);
		const isHolding = conditionHolds();
		if (isHolding && !wasHolding) candidateStartMs = event.date * 1000;
		else if (!isHolding && wasHolding) candidateStartMs = null;
	}

	return candidateStartMs ?? chronological[0].date * 1000;
}

/** How long until each realm's wall becomes vulnerable to capture — the
 *  game grants that once a single other realm holds a realm's castle plus
 *  one or both of its regular keeps for long enough (see
 *  `findContinuousControlStartMs` for the exact rule). One entry per
 *  realm, always in `REALMS` order. */
export function computeWallVulnerability(forts: FortStatus[], events: WzEvent[], now: number): WallVulnerability[] {
	return REALMS.map((homeRealm) => {
		const homeForts = forts.filter((f) => f.home === homeRealm);
		const castle = homeForts.find((f) => getFortKind(f.name) === "castle");
		const keeps = homeForts.filter((f) => getFortKind(f.name) === "keep");
		const wall = homeForts.find((f) => getFortKind(f.name) === "wall");
		const wallName = wall?.name ?? "";
		const inactive: WallVulnerability = { homeRealm, wallName, aggressor: null, fortCount: 0, vulnerableAtMs: null, isVulnerable: false };

		if (!castle || !wall || keeps.length === 0 || castle.owner === homeRealm) return inactive;

		const aggressor = castle.owner;
		const fortCount = keeps.filter((k) => k.owner === aggressor).length;
		if (fortCount === 0) return inactive;

		const relevantNames = new Set([castle.name, ...keeps.map((k) => k.name)].map(cleanFortName));
		const startMs = findContinuousControlStartMs(aggressor, relevantNames, events, now);
		const vulnerableAtMs = startMs + WALL_VULNERABILITY_BASELINE_MS[fortCount as 1 | 2];
		return { homeRealm, wallName, aggressor, fortCount: fortCount as 1 | 2, vulnerableAtMs, isVulnerable: now >= vulnerableAtMs };
	});
}
