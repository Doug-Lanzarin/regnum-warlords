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
