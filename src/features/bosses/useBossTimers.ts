import { useCallback, useEffect, useRef, useState } from "react";
import { cortApi } from "../../api/cortApi";
import { BOSS_REFRESH_INTERVAL_MS } from "../../data/bossConstants";
import type { BossSpawnData } from "../../types/bosses";

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
 */
export function useBossTimers(): UseBossTimersResult {
	const [data, setData] = useState<BossSpawnData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [lastUpdated, setLastUpdated] = useState<number | null>(null);
	const [now, setNow] = useState(() => Date.now());
	const requestId = useRef(0);

	const fetchData = useCallback(() => {
		const id = ++requestId.current;
		setLoading(true);
		cortApi
			.bosses()
			.then((result) => {
				if (id !== requestId.current) return;
				setData(result);
				setError(null);
				setLastUpdated(Date.now());
			})
			.catch(() => {
				if (id !== requestId.current) return;
				setError(
					"Não foi possível carregar os horários dos chefes. Isso costuma acontecer quando a rede bloqueia o acesso a cort.ovh.",
				);
			})
			.finally(() => {
				if (id === requestId.current) setLoading(false);
			});
	}, []);

	useEffect(() => {
		fetchData();
		const poll = setInterval(fetchData, BOSS_REFRESH_INTERVAL_MS);
		return () => clearInterval(poll);
	}, [fetchData]);

	useEffect(() => {
		const tick = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(tick);
	}, []);

	return { data, loading, error, now, lastUpdated, refresh: fetchData };
}
