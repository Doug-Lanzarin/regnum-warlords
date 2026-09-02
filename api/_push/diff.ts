import { REALMS, type Realm } from "../../src/data/realms.js";
import { getFortKind } from "../../src/data/fortKind.js";
import type { FortStatus, GemStatus } from "../../src/features/wz/wzEngine";

/** Mirrors the 9 alert categories `AlertsWatcher` tracks client-side
 *  (`src/features/alerts/AlertsWatcher.tsx`), just computed once per tick
 *  for all 3 realms instead of once per subscriber's `myRealm` — cheap
 *  since there are only 3 realms, and it lets every subscriber share the
 *  same diff instead of re-fetching/re-diffing per person. */
export interface CategorySets {
	fortLost: Record<Realm, string[]>;
	fortCaptured: Record<Realm, string[]>;
	fortRecovered: Record<Realm, string[]>;
	wallLost: Record<Realm, string[]>;
	wallCaptured: Record<Realm, string[]>;
	wallRecovered: Record<Realm, string[]>;
	gemLost: Record<Realm, number[]>;
	gemCaptured: Record<Realm, number[]>;
	gemRecovered: Record<Realm, number[]>;
}

export interface CategoryEvent {
	/** Raw fort name (still with its "(n)" suffix and, for walls, in
	 *  English — e.g. "Great Wall of Alsius (3)") — untranslated on purpose,
	 *  since subscribers can each want a different language; unset for gem
	 *  events, which use `gemIndex` instead. `tick.ts`'s message builder
	 *  applies `formatFortLabel(name, subscriberLang)` per subscriber. */
	name: string;
	/** Set only for gem events — 0-based gem index, formatted via the
	 *  `alerts.gemLabel` dictionary key per subscriber's language. */
	gemIndex?: number;
	/** For *Lost events: who took it. For *Captured events: whose territory it was. Unset for *Recovered. */
	otherRealm: Realm | null;
}

export type CategoryEvents = Partial<Record<keyof CategorySets, CategoryEvent[]>>;

function emptyByRealm<T>(): Record<Realm, T[]> {
	return { Alsius: [], Ignis: [], Syrtis: [] };
}

export function emptyCategorySets(): CategorySets {
	return {
		fortLost: emptyByRealm(),
		fortCaptured: emptyByRealm(),
		fortRecovered: emptyByRealm(),
		wallLost: emptyByRealm(),
		wallCaptured: emptyByRealm(),
		wallRecovered: emptyByRealm(),
		gemLost: emptyByRealm(),
		gemCaptured: emptyByRealm(),
		gemRecovered: emptyByRealm(),
	};
}

/** Diffs the current WZ snapshot against the previous tick's category sets
 *  (see `emptyCategorySets` — pass that in on the very first tick ever, so
 *  nothing "new" is reported for state that already existed before this
 *  started watching). Returns the recomputed sets to persist, plus the
 *  events that are new since the previous tick, grouped by realm. */
export function diffState(
	forts: FortStatus[],
	gems: GemStatus[],
	previous: CategorySets,
): { next: CategorySets; eventsByRealm: Record<Realm, CategoryEvents> } {
	const next = emptyCategorySets();
	const eventsByRealm: Record<Realm, CategoryEvents> = { Alsius: {}, Ignis: {}, Syrtis: {} };

	for (const realm of REALMS) {
		const fortLost = forts.filter((f) => f.home === realm && f.captured && getFortKind(f.name) !== "wall");
		const wallLost = forts.filter((f) => f.home === realm && f.captured && getFortKind(f.name) === "wall");
		const fortCaptured = forts.filter((f) => f.owner === realm && f.home !== realm && getFortKind(f.name) !== "wall");
		const wallCaptured = forts.filter((f) => f.owner === realm && f.home !== realm && getFortKind(f.name) === "wall");
		const fortRecovered = forts.filter((f) => f.home === realm && !f.captured && getFortKind(f.name) !== "wall");
		const wallRecovered = forts.filter((f) => f.home === realm && !f.captured && getFortKind(f.name) === "wall");
		const gemLost = gems.filter((g) => g.home === realm && g.owner !== realm);
		const gemCaptured = gems.filter((g) => g.owner === realm && g.home !== realm);
		const gemRecovered = gems.filter((g) => g.home === realm && g.owner === realm);

		next.fortLost[realm] = fortLost.map((f) => f.name);
		next.wallLost[realm] = wallLost.map((f) => f.name);
		next.fortCaptured[realm] = fortCaptured.map((f) => f.name);
		next.wallCaptured[realm] = wallCaptured.map((f) => f.name);
		next.fortRecovered[realm] = fortRecovered.map((f) => f.name);
		next.wallRecovered[realm] = wallRecovered.map((f) => f.name);
		next.gemLost[realm] = gemLost.map((g) => g.index);
		next.gemCaptured[realm] = gemCaptured.map((g) => g.index);
		next.gemRecovered[realm] = gemRecovered.map((g) => g.index);

		const prevFortLost = new Set(previous.fortLost[realm]);
		const prevWallLost = new Set(previous.wallLost[realm]);
		const prevFortCaptured = new Set(previous.fortCaptured[realm]);
		const prevWallCaptured = new Set(previous.wallCaptured[realm]);
		const prevFortRecovered = new Set(previous.fortRecovered[realm]);
		const prevWallRecovered = new Set(previous.wallRecovered[realm]);
		const prevGemLost = new Set(previous.gemLost[realm]);
		const prevGemCaptured = new Set(previous.gemCaptured[realm]);
		const prevGemRecovered = new Set(previous.gemRecovered[realm]);

		eventsByRealm[realm] = {
			fortLost: fortLost.filter((f) => !prevFortLost.has(f.name)).map((f) => ({ name: f.name, otherRealm: f.owner })),
			wallLost: wallLost.filter((f) => !prevWallLost.has(f.name)).map((f) => ({ name: f.name, otherRealm: f.owner })),
			fortCaptured: fortCaptured
				.filter((f) => !prevFortCaptured.has(f.name))
				.map((f) => ({ name: f.name, otherRealm: f.home })),
			wallCaptured: wallCaptured
				.filter((f) => !prevWallCaptured.has(f.name))
				.map((f) => ({ name: f.name, otherRealm: f.home })),
			fortRecovered: fortRecovered
				.filter((f) => !prevFortRecovered.has(f.name))
				.map((f) => ({ name: f.name, otherRealm: null })),
			wallRecovered: wallRecovered
				.filter((f) => !prevWallRecovered.has(f.name))
				.map((f) => ({ name: f.name, otherRealm: null })),
			gemLost: gemLost
				.filter((g) => !prevGemLost.has(g.index))
				.map((g) => ({ name: "", gemIndex: g.index, otherRealm: g.owner })),
			gemCaptured: gemCaptured
				.filter((g) => !prevGemCaptured.has(g.index))
				.map((g) => ({ name: "", gemIndex: g.index, otherRealm: g.home })),
			gemRecovered: gemRecovered
				.filter((g) => !prevGemRecovered.has(g.index))
				.map((g) => ({ name: "", gemIndex: g.index, otherRealm: null })),
		};
	}

	return { next, eventsByRealm };
}
