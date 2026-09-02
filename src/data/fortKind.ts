import type { Lang } from "../i18n/languages";
import { translate } from "../i18n/translate";

/** The 3 fort "shapes" the game has — keep (regular fort), castle, and
 *  Great Wall — used both for icon selection (`wzIcons.tsx`) and for
 *  grouping fort/wall alerts separately (`AlertsWatcher` client-side, and
 *  `api/push/tick.ts`'s server-side watcher, which imports this file
 *  directly by relative path since it's plain TS with no React dependency). */
export type FortKind = "keep" | "castle" | "wall";

/** Same string checks CoRT's `dispatch_fort_icon()` uses to pick an icon. */
export function getFortKind(fortName: string): FortKind {
	if (fortName.includes("Castle")) return "castle";
	if (fortName.startsWith("Great Wall")) return "wall";
	return "keep";
}

/** Strips the raw feed's trailing "(n)" map-order suffix and translates
 *  "Great Wall of X" per the given language — for **display only**. Never
 *  use this to build a key for matching against raw API data (event dumps,
 *  etc. are still in English) — see `cleanFortName` in `wzEventsEngine.ts`
 *  for that, which intentionally only strips the suffix. */
export function formatFortLabel(name: string, lang: Lang): string {
	const clean = name.replace(/\s*\(\d+\)$/, "");
	const match = clean.match(/^Great Wall of (.+)$/);
	if (!match) return clean;
	return translate(lang, "fort.greatWallOf", { name: match[1] });
}
