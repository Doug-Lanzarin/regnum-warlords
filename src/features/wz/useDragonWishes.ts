import { useCallback, useEffect, useRef, useState } from "react";
import { cortApi } from "../../api/cortApi";
import { WZ_REFRESH_INTERVAL_MS } from "../../data/wzConstants";
import type { WzEvent } from "../../types/wz";
import { computeDragonWishes, type HumanizedEvent } from "./wzEventsEngine";

export interface UseDragonWishesResult {
	wishes: HumanizedEvent[];
	loading: boolean;
}

/** Pulls from CoRT's separate `events.json` dump (~10 days) instead of
 *  `wstatus.json`'s ~100-entry rolling log — wishes are rare enough that
 *  the last 5 are often older than that window, regardless of where they
 *  fall in it. Fails soft: on error we just keep whatever wishes we last
 *  had (or none), since this section is supplementary to the main WZ
 *  status page. */
export function useDragonWishes(): UseDragonWishesResult {
	const [wishes, setWishes] = useState<HumanizedEvent[]>([]);
	const [loading, setLoading] = useState(true);
	const requestId = useRef(0);

	const fetchData = useCallback(() => {
		const id = ++requestId.current;
		setLoading(true);
		cortApi
			.warzoneEvents()
			.then((result) => {
				if (id !== requestId.current) return;
				const events = result.filter((entry): entry is WzEvent => "type" in entry);
				setWishes(computeDragonWishes(events));
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

	return { wishes, loading };
}
