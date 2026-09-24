import { REALM_COLOR, type Realm } from "./realms.js";
import type { BossKey } from "../types/bosses";
import type { Lang } from "../i18n/languages";
import { translate } from "../i18n/translate.js";

export type { Realm };

export interface BossInfo {
	name: string;
	realm: Realm | null;
	/** Fixed identity color — intentionally NOT a theme token, so a boss
	 *  still reads as "its" realm color no matter which app theme is active. */
	color: string;
}

/** Display order (roughly how CoRT lists them: bosses first, then the reboot). */
export const BOSS_ORDER: BossKey[] = ["daen", "evendim", "thorkul", "server"];

/** Boss respawns aren't a live feed at all — CoRT's own bosses.php was
 *  removed in its v5 rewrite (confirmed 2026-09-24: 404 from cort.ovh, and
 *  the mirror's copy resets the connection), replaced with this exact
 *  computation running client-side in CoRT's own bundle
 *  (`cort.ovh/js/chunks/defer_libs-*.js`, class `B`/`get_schedule()`).
 *  These two constants are its `first_respawns`/`respawns_drift` — a known
 *  past respawn for each boss, plus a small per-boss offset added to the
 *  ~61h base interval so three bosses on the same base cadence don't всегда
 *  always land on the exact same schedule. `computeBossSpawnData`
 *  (`bossScheduleEngine.ts`) walks forward from these the same way CoRT's
 *  own code does — see that file for the interval math. Static, not
 *  fetched: if the game's actual respawn cadence or these specific anchors
 *  ever change, this needs updating the same way CoRT's own bundle would. */
export const BOSS_FIRST_RESPAWNS: Record<BossKey, number> = {
	thorkul: 1768146754,
	evendim: 1768416250,
	daen: 1768672935,
	server: 1762336800 + 50 * 60,
};

/** Extra seconds added to the ~61h base interval — only the 3 real bosses
 *  have one; the weekly server reboot uses a flat 7-day interval instead
 *  (see `computeBossSpawnData`). */
export const BOSS_RESPAWN_DRIFT_SECONDS: Partial<Record<BossKey, number>> = {
	thorkul: 4,
	evendim: 7,
	daen: 5,
};

export const BOSS_INFO: Record<BossKey, BossInfo> = {
	daen: { name: "Daen Rha", realm: "Ignis", color: REALM_COLOR.Ignis },
	evendim: { name: "Evendim", realm: "Syrtis", color: REALM_COLOR.Syrtis },
	thorkul: { name: "Thorkul", realm: "Alsius", color: REALM_COLOR.Alsius },
	server: { name: "", realm: null, color: "#a3a7c9" },
};

/** Bosses' own names (Daen Rha/Evendim/Thorkul) are proper nouns, kept as-is
 *  in every language — only the "server restart" entry (not a real boss)
 *  has a translatable name. */
export function bossName(key: BossKey, lang: Lang): string {
	if (key === "server") return translate(lang, "bosses.nameServer");
	return BOSS_INFO[key].name;
}

export function bossDescription(key: BossKey, lang: Lang): string {
	if (key === "server") return translate(lang, "bosses.descServer");
	return translate(lang, "bosses.descRealmBoss", { realm: BOSS_INFO[key].realm ?? "" });
}

/** Portrait art ported from CoRT's `data/bosses/<key>.1.webp`. */
export function bossIconUrl(key: BossKey): string {
	return `/data/bosses/${key}.webp`;
}
