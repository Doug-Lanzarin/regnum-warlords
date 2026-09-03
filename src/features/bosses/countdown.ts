import type { Lang } from "../../i18n/languages";
import { translate } from "../../i18n/translate";
import { formatDuration } from "../../utils/time";

export { formatDateTime, formatRelativePast } from "../../utils/time";

/** Formats a millisecond duration as a compact countdown, showing only the
 *  precision that matters at that distance (no jittery seconds ticker for
 *  something 2 days away). */
export function formatCountdown(ms: number, lang: Lang): string {
	if (ms <= 0) return translate(lang, "bosses.countdownMayHaveReappeared");
	return formatDuration(ms);
}
