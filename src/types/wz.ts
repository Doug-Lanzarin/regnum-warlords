import type { Realm } from "../data/realms";

/** One of the 12 keeps (4 per realm). `location` is the realm whose
 *  territory the fort sits in (its "home"); `owner` is whoever currently
 *  controls it — they differ when the fort has been captured by an
 *  invading realm. */
export interface WzFort {
	name: string;
	location: Realm;
	owner: Realm;
	icon: string;
}

/** A line from CoRT's rolling war event log, newest first. Used both to
 *  derive "current status" for forts (last time it changed hands) and to
 *  render the events log on the WZ Status page. */
export interface WzEvent {
	date: number; // unix seconds
	name: string;
	/** Realm name for fort/gem events; "altar" | "transit" for relic events. */
	location: string;
	/** Realm name, or "" for the occasional non-realm ("wish") event. */
	owner: string;
	type: "fort" | "relic" | "gem" | "wish";
}

/** Raw shape of https://cort.ovh/api/var/wstatus.json */
export interface WzStatusData {
	forts: WzFort[];
	gems: string[];
	relics: Record<Realm, Record<string, string>>;
	map_changed: boolean;
	gems_changed: boolean;
	relics_changed: boolean;
	events_log: WzEvent[];
	generated: string;
}

/** Raw shape of https://cort.ovh/api/var/events.json — a much longer rolling
 *  dump (~10 days) than `WzStatusData.events_log`'s ~100 most recent
 *  entries. Its first element is a `{ generated }` timestamp header, not an
 *  event. */
export type WzEventsDumpEntry = WzEvent | { generated: number };

export interface WzStatsForts {
	total: number;
	captured: number;
	recovered: number;
	most_captured: { name: string; count: number };
}

/** One realm's pre-aggregated stats for a report window. Only `forts` is
 *  typed in full — that's all this app currently reads. */
export interface WzStatsRealmReport {
	forts: WzStatsForts;
	[extra: string]: unknown;
}

export type WzStatsReport = Record<Realm, WzStatsRealmReport>;

/** Raw shape of https://cort.ovh/api/var/stats.json — `[0]` is a metadata
 *  header (`generated`, hourly activity series, ...), `[1]`/`[2]`/`[3]` are
 *  pre-aggregated per-realm reports for the last 7/30/90 days respectively
 *  (CoRT's own `report_days = [7, 30, 90]` in wstats.js). Unlike
 *  `events.json`'s raw log, this covers windows the raw event history
 *  doesn't reach (30/90 days), since it's computed server-side. */
export type WzStatsDump = [{ generated: number; [extra: string]: unknown }, WzStatsReport, WzStatsReport, WzStatsReport];
