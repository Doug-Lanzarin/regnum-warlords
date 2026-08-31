/** Static layout for the WZ map overlay, ported from CoRT's wz.js
 *  (`setup_canvas()`), which hand-places each of the 12 forts on top of
 *  `base_map.png`. Index order matches `WzStatusData.forts` (and CoRT's own
 *  `wz-forts-0..11` ids): forts 0-3 are Alsius's home forts, 4-7 Ignis's,
 *  8-11 Syrtis's — same order the live API always returns them in. */

export const WZ_MAP_IMAGE = "/data/wz/base_map.png";

/** The coordinate space every position below is expressed in (CoRT drew its
 *  canvas at this same logical size before scaling for devicePixelRatio). */
export const WZ_MAP_SIZE = 500;

export interface WzMapFortPosition {
	/** Top-left corner where the 36x36 fort icon is drawn. */
	x: number;
	y: number;
	/** Where the "(n)" fort number label is drawn. */
	labelX: number;
	labelY: number;
}

export const FORT_MAP_POSITIONS: WzMapFortPosition[] = [
	{ x: 212, y: 60, labelX: 221, labelY: 55 },
	{ x: 208, y: 175, labelX: 193, labelY: 195 },
	{ x: 120, y: 187, labelX: 105, labelY: 207 },
	{ x: 139, y: 140, labelX: 119, labelY: 165 },
	{ x: 260, y: 111, labelX: 245, labelY: 133 },
	{ x: 290, y: 180, labelX: 275, labelY: 200 },
	{ x: 365, y: 220, labelX: 345, labelY: 245 },
	{ x: 324, y: 140, labelX: 304, labelY: 165 },
	{ x: 135, y: 230, labelX: 118, labelY: 250 },
	{ x: 220, y: 250, labelX: 195, labelY: 270 },
	{ x: 285, y: 360, labelX: 255, labelY: 385 },
	{ x: 183, y: 310, labelX: 153, labelY: 335 },
];
