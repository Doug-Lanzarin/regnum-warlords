import { useEffect, useState } from "react";
import { computeToolCounters, type ToolCounters } from "./toolCountersEngine";

export interface UseToolCountersResult extends ToolCounters {
	/** Live clock (ms since epoch), ticking every second, for countdown math. */
	now: number;
}

export function useToolCounters(): UseToolCountersResult {
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		const tick = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(tick);
	}, []);

	return { ...computeToolCounters(now), now };
}
