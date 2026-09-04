import { useCallback, useEffect, useRef, useState } from "react";
import { cortApi } from "../../api/cortApi";
import { WZ_REFRESH_INTERVAL_MS } from "../../data/wzConstants";
import { useT } from "../../i18n/useT";
import type { WzStatusData } from "../../types/wz";

export interface UseOfficialWzStatusResult {
	data: WzStatusData | null;
	loading: boolean;
	error: string | null;
	lastUpdated: number | null;
	refresh: () => void;
}

/** EXPERIMENTAL — mirrors useWzStatus.ts, but against api/wz-official.ts's
 *  scraped championsofregnum.com data instead of cort.ovh, for the manual
 *  source toggle on the WZ page. Only fetches/polls while `enabled` — this
 *  is a manually-selected alternative, not the default, so it shouldn't add
 *  a background poll for everyone regardless of what they picked. */
export function useOfficialWzStatus(enabled: boolean): UseOfficialWzStatusResult {
	const t = useT();
	const [data, setData] = useState<WzStatusData | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [lastUpdated, setLastUpdated] = useState<number | null>(null);
	const requestId = useRef(0);

	const fetchData = useCallback(() => {
		const id = ++requestId.current;
		setLoading(true);
		cortApi
			.warzoneStatusOfficial()
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
		if (!enabled) return;
		fetchData();
		const poll = setInterval(fetchData, WZ_REFRESH_INTERVAL_MS);
		return () => clearInterval(poll);
	}, [enabled, fetchData]);

	return { data, loading, error, lastUpdated, refresh: fetchData };
}
