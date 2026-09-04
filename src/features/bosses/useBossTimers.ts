import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useT } from "../../i18n/useT";
import type { BossSpawnData } from "../../types/bosses";
import { bossStore } from "./bossStore";

export interface UseBossTimersResult {
	data: BossSpawnData | null;
	loading: boolean;
	/** Set whenever the most recent fetch failed. Cleared on success. Can be
	 *  true alongside non-null `data` (a background refresh failed but we
	 *  still have the last good snapshot to show). */
	error: string | null;
	/** Live clock (ms since epoch), ticking every second, for countdown math. */
	now: number;
	lastUpdated: number | null;
	refresh: () => void;
}

/**
 * Boss respawn timers are genuinely live data (unlike the Trainer's static
 * skill tables) — there's no sane "bundled" fallback to ship, a snapshot
 * would just be wrong a few hours later. So this only ever tries the live
 * CoRT feed, on a 5-minute poll, and surfaces a clear error when it's
 * unreachable (common on locked-down networks that block cort.ovh).
 *
 * The fetch/poll itself lives in `bossStore`, shared by every caller — this
 * hook just subscribes to it, so mounting the Épicos page again (or having
 * `AlertsWatcher` mounted alongside it) never triggers a redundant fetch.
 */
export function useBossTimers(): UseBossTimersResult {
	const t = useT();
	const state = useSyncExternalStore(bossStore.subscribe, bossStore.getSnapshot);
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		const tick = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(tick);
	}, []);

	const refresh = useCallback(() => bossStore.refresh(), []);

	return {
		data: state.data,
		loading: state.loading,
		error: state.hasError ? t("bosses.fetchError") : null,
		now,
		lastUpdated: state.lastUpdated,
		refresh,
	};
}
