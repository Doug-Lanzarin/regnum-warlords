import { cortApi } from "../../api/cortApi";
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

/** Boss spawn data is shared across the whole app, module-wide, on the first
 *  subscriber ever (not once per mount) — reopening the Épicos tab reuses
 *  the already-warm data instead of re-querying cort.ovh. Fetches exactly
 *  once per app open, no periodic re-poll: spawn timers don't need to
 *  update mid-session, and every additional background poll is aggregate
 *  cort.ovh load that isn't this one user's to spend. `refresh()` (wired to
 *  the Épicos page's "tentar novamente" button) is still there for an
 *  explicit manual retry. */
function ensureStarted() {
	if (started) return;
	started = true;
	fetchData();
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
