import type { Realm } from "./realms";

/** Map position data for each of the 12 forts.
 *  Each fort gets: [iconX, iconY, labelX, labelY]
 *  The canvas is 500x500px. Icons are 36x36. Labels are positioned nearby.
 */
export interface FortMapPosition {
	name: string;
	home: Realm;
	icon: [number, number];
	label: [number, number];
}

export const FORT_MAP_POSITIONS: FortMapPosition[] = [
	// Alsius forts (4)
	{ name: "Imperia (1)", home: "Alsius", icon: [212, 60], label: [221, 55] },
	{ name: "Aggersborg (2)", home: "Alsius", icon: [208, 175], label: [193, 195] },
	{ name: "Trelleborg (3)", home: "Alsius", icon: [120, 187], label: [105, 207] },
	{ name: "Alsius (4)", home: "Alsius", icon: [139, 140], label: [119, 165] },

	// Ignis forts (4)
	{ name: "Menirah (5)", home: "Ignis", icon: [260, 111], label: [245, 133] },
	{ name: "Samal (6)", home: "Ignis", icon: [290, 180], label: [275, 200] },
	{ name: "Shaanarid (7)", home: "Ignis", icon: [365, 220], label: [345, 245] },
	{ name: "Ignis (8)", home: "Ignis", icon: [324, 140], label: [304, 165] },

	// Syrtis forts (4)
	{ name: "Algaros (9)", home: "Syrtis", icon: [135, 230], label: [118, 250] },
	{ name: "Herbred (10)", home: "Syrtis", icon: [220, 250], label: [195, 270] },
	{ name: "Eferias (11)", home: "Syrtis", icon: [285, 360], label: [255, 385] },
	{ name: "Syrtis (12)", home: "Syrtis", icon: [183, 310], label: [153, 335] },
];

/** Map dimensions for the WZ canvas */
export const WZ_MAP_WIDTH = 500;
export const WZ_MAP_HEIGHT = 500;
export const WZ_ICON_SIZE = 36;

/** Get a fort's map position by name */
export function getFortMapPosition(fortName: string): FortMapPosition | undefined {
	return FORT_MAP_POSITIONS.find((p) => p.name === fortName);
}

/** Get all forts for a specific realm */
export function getFortsByRealm(realm: Realm): FortMapPosition[] {
	return FORT_MAP_POSITIONS.filter((p) => p.home === realm);
}
