import { useCallback, useEffect, useRef, useState } from "react";
import { cortApi } from "../../api/cortApi";
import { WZ_REFRESH_INTERVAL_MS } from "../../data/wzConstants";
import { useT } from "../../i18n/useT";
import type { WzStatusData } from "../../types/wz";

export interface UseWzStatusResult {
	data: WzStatusData | null;
	loading: boolean;
	error: string | null;
	now: number;
	lastUpdated: number | null;
	refresh: () => void;
}

/** Same shape as useBossTimers: live-only, polled, fails soft with a clear
 *  error while keeping the last good snapshot on screen if we had one. */
export function useWzStatus(): UseWzStatusResult {
	const t = useT();
	const [data, setData] = useState<WzStatusData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [lastUpdated, setLastUpdated] = useState<number | null>(null);
	const [now, setNow] = useState(() => Date.now());
	const requestId = useRef(0);

	const fetchData = useCallback(() => {
		const id = ++requestId.current;
		setLoading(true);
		cortApi
			.warzoneStatus()
			.then((result) => {
				if (id !== requestId.current) return;
				setData(result);
				setError(null);
				setLastUpdated(Date.now());
			})
			.catch(() => {
				if (id !== requestId.current) return;
				setError(t("wz.fetchError"));
			})
			.finally(() => {
				if (id === requestId.current) setLoading(false);
			});
	}, [t]);

	useEffect(() => {
		fetchData();
		const poll = setInterval(fetchData, WZ_REFRESH_INTERVAL_MS);
		return () => clearInterval(poll);
	}, [fetchData]);

	useEffect(() => {
		const tick = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(tick);
	}, []);

	return { data, loading, error, now, lastUpdated, refresh: fetchData };
}
