import type { WzEvent } from "../src/types/wz";

// cort.ovh's own events.json only keeps a rolling ~10 days — plenty for
// the game's own "last 10 days" rules (Balanço, wall vulnerability), but
// it means anything older is gone from *their* side forever, not just
// outside whatever window we happen to be computing. This accumulator
// (written by api/push/tick.ts, which already polls events.json every
// ~minute for wall-vulnerability purposes, and read back by
// api/cort-proxy.ts to merge into every "events" response) keeps our own
// copy growing past that, so a 10-day rule still works correctly days
// after cort.ovh itself has forgotten the event it depends on, and so a
// temporary cort.ovh gap doesn't silently erase something we'd already
// seen.
export const EVENTS_HISTORY_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

/** Same rounding-to-the-minute key api/cort-proxy.ts's mergeEventSources
 *  already used for combining multiple live sources — reused here so the
 *  accumulated history and the live merge treat "the same real event" the
 *  same way (two sources scraping the same action a couple seconds apart
 *  land on the same key; two genuinely different events of the same type/
 *  name/location/owner inside the same 60s window are vanishingly rare —
 *  see mergeEventSources's own doc comment for the full reasoning). */
export function dedupKeyOf(e: WzEvent): string {
	return `${Math.round(e.date / 60)}-${e.type}-${e.name}-${e.location}-${e.owner}`;
}

/** Merges `incoming` into `existing`, deduped and sorted newest-first,
 *  dropping anything older than `retentionMs` relative to `now`. Pure —
 *  callers decide whether the result differs enough from `existing` to
 *  bother persisting it (see api/push/tick.ts). */
export function mergeIntoHistory(existing: WzEvent[], incoming: WzEvent[], now: number, retentionMs = EVENTS_HISTORY_RETENTION_MS): WzEvent[] {
	const cutoff = now - retentionMs;
	const seen = new Set<string>();
	const merged: WzEvent[] = [];
	for (const entry of [...existing, ...incoming]) {
		if (entry.date * 1000 < cutoff) continue;
		const key = dedupKeyOf(entry);
		if (seen.has(key)) continue;
		seen.add(key);
		merged.push(entry);
	}
	merged.sort((a, b) => b.date - a.date);
	return merged;
}
