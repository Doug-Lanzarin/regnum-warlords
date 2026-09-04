import { cortApi } from "../../api/cortApi";
import { BOSS_REFRESH_INTERVAL_MS } from "../../data/bossConstants";
import type { BossSpawnData } from "../../types/bosses";

export interface BossStoreState {
	data: BossSpawnData | null;
	loading: boolean;
	hasError: boolean;
	lastUpdated: number | null;
}

let state: BossStoreState = { data: null, loading: true, hasError: false, lastUpdated: null };
const subscribers = new Set<() => void>();
let requestId = 0;
let started = false;

function setState(patch: Partial<BossStoreState>) {
	state = { ...state, ...patch };
	for (const callback of subscribers) callback();
}

function fetchData() {
	const id = ++requestId;
	setState({ loading: true });
	cortApi
		.bosses()
		.then((result) => {
			if (id !== requestId) return;
			setState({ data: result, hasError: false, lastUpdated: Date.now(), loading: false });
		})
		.catch(() => {
			if (id !== requestId) return;
			setState({ hasError: true, loading: false });
		});
}

/** Boss spawn data is shared across the whole app — `AlertsWatcher` needs it
 *  in the background (for spawn alerts) no matter which tab is open, and
 *  the Épicos page just displays whatever's already there. So this fetches
 *  and polls exactly once, module-wide, on the first subscriber ever (not
 *  once per mount) — reopening the Épicos tab reuses the already-warm data
 *  instead of re-querying cort.ovh. */
function ensureStarted() {
	if (started) return;
	started = true;
	fetchData();
	setInterval(fetchData, BOSS_REFRESH_INTERVAL_MS);
}

export const bossStore = {
	subscribe(callback: () => void) {
		ensureStarted();
		subscribers.add(callback);
		return () => subscribers.delete(callback);
	},
	getSnapshot(): BossStoreState {
		return state;
	},
	refresh: fetchData,
};
