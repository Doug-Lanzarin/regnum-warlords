import { useCallback, useEffect, useRef, useState } from "react";
import { cortApi } from "../../api/cortApi";
import { WZ_REFRESH_INTERVAL_MS } from "../../data/wzConstants";
import type { WzEvent } from "../../types/wz";

export interface UseEventsDumpResult {
	events: WzEvent[];
	loading: boolean;
}

/** CoRT's separate `events.json` dump (~10 days) — used by anything that
 *  needs more history than `wstatus.json`'s ~100-entry rolling log gives
 *  (dragon wishes, 24h fort-activity totals). Fetched once here and shared,
 *  rather than once per feature, so two features on the same page don't
 *  double the polling. Fails soft: keeps whatever it last had (or an empty
 *  list) on error, since callers treat this as supplementary data. */
export function useEventsDump(): UseEventsDumpResult {
	const [events, setEvents] = useState<WzEvent[]>([]);
	const [loading, setLoading] = useState(true);
	const requestId = useRef(0);

	const fetchData = useCallback(() => {
		const id = ++requestId.current;
		setLoading(true);
		cortApi
			.warzoneEvents()
			.then((result) => {
				if (id !== requestId.current) return;
				setEvents(result.filter((entry): entry is WzEvent => "type" in entry));
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

	return { events, loading };
}
