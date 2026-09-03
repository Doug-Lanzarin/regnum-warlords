import type { Lang } from "../i18n/languages";
import { translate } from "../i18n/translate";

const LOCALE: Record<Lang, string> = { pt: "pt-BR", en: "en-US", es: "es-ES" };

/** Compact "3h 20m" / "5m 30s" duration label — shows only the precision
 *  that matters at that distance (no jittery seconds ticker for something
 *  days away). Pure formatting, no "reached zero" handling — callers decide
 *  their own copy for `ms <= 0` (see `formatCountdown` in
 *  `features/bosses/countdown.ts` for a boss-specific example). */
export function formatDuration(ms: number): string {
	const totalSeconds = Math.floor(ms / 1000);
	const days = Math.floor(totalSeconds / 86400);
	const hours = Math.floor((totalSeconds % 86400) / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	if (days > 0) return `${days}d ${hours}h ${minutes}m`;
	if (hours > 0) return `${hours}h ${minutes}m`;
	if (minutes > 0) return `${minutes}m ${seconds}s`;
	return `${seconds}s`;
}

/** "há 2d 3h" style relative-past label, for "last seen"/"since" timestamps. */
export function formatRelativePast(ms: number, lang: Lang): string {
	if (ms <= 0) return translate(lang, "time.now");
	const totalSeconds = Math.floor(ms / 1000);
	const days = Math.floor(totalSeconds / 86400);
	const hours = Math.floor((totalSeconds % 86400) / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);

	if (days > 0) return translate(lang, "time.daysHoursAgo", { days, hours });
	if (hours > 0) return translate(lang, "time.hoursMinutesAgo", { hours, minutes });
	if (minutes > 0) return translate(lang, "time.minutesAgo", { minutes });
	return translate(lang, "time.fewSecondsAgo");
}

/** Full local date/time for a Unix-seconds timestamp, e.g. "seg, 31/08, 23:09". */
export function formatDateTime(unixSeconds: number, lang: Lang): string {
	const date = new Date(unixSeconds * 1000);
	const formatted = date.toLocaleString(LOCALE[lang], {
		weekday: "short",
		day: "2-digit",
		month: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});
	return formatted.replace(/\.\s*/, ", ").replace(/,\s*,/, ",");
}

/** Local time only, e.g. "23:09" — for chart axis ticks/tooltips where the
 *  date itself doesn't matter. Takes a unix-ms timestamp (unlike the
 *  unix-seconds helpers above), since that's what Date.now()-based chart
 *  math already works in. */
export function formatHourMinute(unixMs: number, lang: Lang): string {
	return new Date(unixMs).toLocaleTimeString(LOCALE[lang], { hour: "2-digit", minute: "2-digit" });
}

/** Same as `formatHourMinute` but with seconds, e.g. "23:09:42" — for a
 *  precise "last updated at" stamp rather than a chart tick. */
export function formatHourMinuteSecond(unixMs: number, lang: Lang): string {
	return new Date(unixMs).toLocaleTimeString(LOCALE[lang], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
