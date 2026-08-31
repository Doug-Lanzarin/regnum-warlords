import type { Realm } from "../../data/realms";
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

export interface RelicStatus {
	name: string;
	home: Realm;
	/** "altar" = safely home. "transit" = currently being carried (stolen and
	 *  on the move — interceptable). "unknown" = no recent event to go on. */
	status: "altar" | "transit" | "unknown";
	holder: Realm | null;
	since: number | null;
}

/** The `relics` field in the live snapshot only carries opaque icon
 *  filenames, not a decodable status — so status here is derived from the
 *  freshest matching entry in the event log instead (which does spell out
 *  "altar" vs "transit" and who currently holds it). */
export function computeRelicStatuses(data: WzStatusData): RelicStatus[] {
	const result: RelicStatus[] = [];
	for (const home of Object.keys(data.relics) as Realm[]) {
		for (const relicName of Object.keys(data.relics[home])) {
			const latestEvent = data.events_log.find((e) => e.type === "relic" && e.name === relicName);
			if (latestEvent) {
				result.push({
					name: relicName,
					home,
					status: latestEvent.location === "transit" ? "transit" : "altar",
					holder: (latestEvent.owner as Realm) || null,
					since: latestEvent.date,
				});
			} else {
				result.push({ name: relicName, home, status: "unknown", holder: home, since: null });
			}
		}
	}
	return result;
}
