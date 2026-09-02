import type { PushSubscription } from "@block65/webcrypto-web-push";
import type { AlertSettings } from "../../src/types/alertSettings";
import { emptyCategorySets, type CategorySets } from "./diff";
import type { BossState } from "./boss";

export interface SubscriberRecord {
	subscription: PushSubscription;
	settings: AlertSettings;
	updatedAt: number;
}

// Everything lives behind a handful of single-blob keys, deliberately NOT
// one-key-per-subscriber — Workers KV's free tier caps `list()` at 1,000
// ops/day, and a 1-minute cron already burns 1,440 ticks/day on its own.
// A `get()` on one JSON blob is a *read* (100k/day budget), so the whole
// subscriber list, the WZ category snapshot, and the boss-alert bookkeeping
// each cost one read per tick no matter how many subscribers there are.
const SUBS_KEY = "subs:index";
const CATEGORIES_KEY = "state:categories";
const BOSS_KEY = "state:boss";

export async function readSubscribers(kv: KVNamespace): Promise<SubscriberRecord[]> {
	const raw = await kv.get<SubscriberRecord[]>(SUBS_KEY, "json");
	return raw ?? [];
}

export async function writeSubscribers(kv: KVNamespace, subs: SubscriberRecord[]): Promise<void> {
	await kv.put(SUBS_KEY, JSON.stringify(subs));
}

/** `null` means "no baseline yet" (first tick ever) — callers should seed
 *  and skip alerting rather than treat an empty snapshot as real data. */
export async function readCategorySets(kv: KVNamespace): Promise<CategorySets | null> {
	return kv.get<CategorySets>(CATEGORIES_KEY, "json");
}

export async function writeCategorySets(kv: KVNamespace, sets: CategorySets): Promise<void> {
	await kv.put(CATEGORIES_KEY, JSON.stringify(sets));
}

export async function readBossState(kv: KVNamespace): Promise<BossState> {
	const raw = await kv.get<BossState>(BOSS_KEY, "json");
	return raw ?? { alerted: [] };
}

export async function writeBossState(kv: KVNamespace, state: BossState): Promise<void> {
	await kv.put(BOSS_KEY, JSON.stringify(state));
}

export { emptyCategorySets };
