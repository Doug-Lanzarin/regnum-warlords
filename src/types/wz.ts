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

/** A line from CoRT's rolling war event log, newest first. Used here only
 *  to derive "current status" for forts/relics (last time it changed hands) —
 *  the full history feed itself belongs to the separate "Eventos da WZ" page. */
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
