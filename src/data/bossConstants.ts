import { REALM_COLOR, type Realm } from "./realms";
import type { BossKey } from "../types/bosses";

export type { Realm };

export interface BossInfo {
	name: string;
	realm: Realm | null;
	/** Fixed identity color — intentionally NOT a theme token, so a boss
	 *  still reads as "its" realm color no matter which app theme is active. */
	color: string;
	description: string;
}

/** Display order (roughly how CoRT lists them: bosses first, then the reboot). */
export const BOSS_ORDER: BossKey[] = ["daen", "evendim", "thorkul", "server"];

export const BOSS_INFO: Record<BossKey, BossInfo> = {
	daen: {
		name: "Daen Rha",
		realm: "Ignis",
		color: REALM_COLOR.Ignis,
		description: "Chefe de mundo do reino de Ignis.",
	},
	evendim: {
		name: "Evendim",
		realm: "Syrtis",
		color: REALM_COLOR.Syrtis,
		description: "Chefe de mundo do reino de Syrtis.",
	},
	thorkul: {
		name: "Thorkul",
		realm: "Alsius",
		color: REALM_COLOR.Alsius,
		description: "Chefe de mundo do reino de Alsius.",
	},
	server: {
		name: "Reinício do servidor",
		realm: null,
		color: "#a3a7c9",
		description: "Manutenção semanal do servidor — não é um chefe, mas costuma acontecer junto com os spawns.",
	},
};

/** Re-poll the live feed every 5 minutes — spawn times don't need second-level freshness. */
export const BOSS_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

/** Portrait art ported from CoRT's `data/bosses/<key>.1.webp`. */
export function bossIconUrl(key: BossKey): string {
	return `/data/bosses/${key}.webp`;
}
