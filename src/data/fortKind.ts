/** The 3 fort "shapes" the game has — keep (regular fort), castle, and
 *  Great Wall — used both for icon selection (`wzIcons.tsx`) and for
 *  grouping fort/wall alerts separately (`AlertsWatcher` client-side, and
 *  the `push-worker` server-side watcher, which imports this file directly
 *  by relative path since it's plain TS with no React dependency). */
export type FortKind = "keep" | "castle" | "wall";

/** Same string checks CoRT's `dispatch_fort_icon()` uses to pick an icon. */
export function getFortKind(fortName: string): FortKind {
	if (fortName.includes("Castle")) return "castle";
	if (fortName.startsWith("Great Wall")) return "wall";
	return "keep";
}
