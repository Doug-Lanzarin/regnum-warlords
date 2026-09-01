import { useCallback, useEffect, useRef, useState } from "react";
import { cortApi } from "../../api/cortApi";
import { WZ_REFRESH_INTERVAL_MS } from "../../data/wzConstants";
import type { WzStatsReport } from "../../types/wz";

export interface WzStatsReports {
	sevenDay: WzStatsReport;
	thirtyDay: WzStatsReport;
	ninetyDay: WzStatsReport;
}

export interface UseWzStatsResult {
	reports: WzStatsReports | null;
	loading: boolean;
}

/** CoRT's pre-aggregated `stats.json` — the 7/30/90-day reports behind the
 *  fort-activity chart's longer time ranges, which the raw event log
 *  (`events.json`, only ~10 days deep) can't reach. Fails soft: keeps the
 *  last good reports (or null before the first successful fetch) on error,
 *  same as `useEventsDump`. */
export function useWzStats(): UseWzStatsResult {
	const [reports, setReports] = useState<WzStatsReports | null>(null);
	const [loading, setLoading] = useState(true);
	const requestId = useRef(0);

	const fetchData = useCallback(() => {
		const id = ++requestId.current;
		setLoading(true);
		cortApi
			.warStats()
			.then(([, sevenDay, thirtyDay, ninetyDay]) => {
				if (id !== requestId.current) return;
				setReports({ sevenDay, thirtyDay, ninetyDay });
			})
			.catch(() => {
				// fails soft — see doc comment above
			})
			.finally(() => {
				if (id === requestId.current) setLoading(false);
			});
	}, []);

	useEffect(() => {
		fetchData();
		const poll = setInterval(fetchData, WZ_REFRESH_INTERVAL_MS);
		return () => clearInterval(poll);
	}, [fetchData]);

	return { reports, loading };
}
