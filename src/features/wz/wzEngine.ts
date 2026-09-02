import { REALMS, type Realm } from "../../data/realms.js";
import type { WzStatusData } from "../../types/wz";

export interface FortStatus {
	name: string;
	home: Realm;
	owner: Realm;
	captured: boolean;
	/** Unix seconds of the most recent event that changed this fort's owner, if any. */
	since: number | null;
}

/** One entry per fort, enriched with a "captured" flag (owner !== home realm)
 *  and a "since" timestamp pulled from the event log (newest-first, so the
 *  first match for a given fort name is its latest change). */
export function computeFortStatuses(data: WzStatusData): FortStatus[] {
	return data.forts.map((fort) => {
		const latestEvent = data.events_log.find((e) => e.type === "fort" && e.name === fort.name);
		return {
			name: fort.name,
			home: fort.location,
			owner: fort.owner,
			captured: fort.owner !== fort.location,
			since: latestEvent ? latestEvent.date : null,
		};
	});
}

/** How many of the 12 forts each realm currently holds — the quickest read
 *  on "who's winning the war" right now. */
export function computeRealmFortCounts(forts: FortStatus[]): Record<Realm, number> {
	const counts: Record<Realm, number> = { Alsius: 0, Ignis: 0, Syrtis: 0 };
	for (const f of forts) counts[f.owner] += 1;
	return counts;
}

export interface GemStatus {
	index: number;
	home: Realm;
	/** null = unclaimed ("gem_0.png" in the raw feed). */
	owner: Realm | null;
}

/** Map from the raw feed's opaque `gem_N.png` icon filenames to who currently
 *  holds that gem, ported from CoRT's `Icons.get_all_icons()` (gem_0 =
 *  neutral, gem_1 = Ignis, gem_2 = Alsius, gem_3 = Syrtis). */
const GEM_ICON_OWNER: Record<string, Realm | null> = {
	"gem_0.png": null,
	"gem_1.png": "Ignis",
	"gem_2.png": "Alsius",
	"gem_3.png": "Syrtis",
};

/** `data.gems` is a flat 18-entry array: 6 gems per realm, grouped in realm
 *  order (0-5 Alsius's home gems, 6-11 Ignis's, 12-17 Syrtis's) — same
 *  layout as CoRT's `wz-gems-0..17` ids. */
export function computeGemStatuses(data: WzStatusData): GemStatus[] {
	const perRealm = Math.ceil(data.gems.length / REALMS.length) || 6;
	return data.gems.map((icon, index) => ({
		index,
		home: REALMS[Math.floor(index / perRealm)] ?? REALMS[REALMS.length - 1],
		owner: GEM_ICON_OWNER[icon] ?? null,
	}));
}
