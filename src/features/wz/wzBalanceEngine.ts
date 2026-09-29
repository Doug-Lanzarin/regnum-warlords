import { REALMS, type Realm } from "../../data/realms";
import type { WzEvent } from "../../types/wz";

const DAY_SECONDS = 24 * 60 * 60;
const WINDOW_DAYS = 10;
const ENEMY_WISH_TRIGGER = 5;

export type BalanceTier = 0 | 2 | 3 | 4;

export interface RealmBalance {
	realm: Realm;
	tier: BalanceTier;
	/** Dragon wishes for this realm in the current 10-day window. */
	wishCount: number;
	/** Whichever enemy realm made the most dragon wishes (for itself) in the
	 *  window, and how many — `null` if neither enemy made any. Only
	 *  relevant to the tier once it's reached `ENEMY_WISH_TRIGGER`. */
	topEnemyWishes: { realm: Realm; count: number } | null;
	/** UTC-midnight timestamp (ms) of the next point at which today's tier
	 *  would change, assuming no further events happen — i.e. purely from
	 *  the oldest day(s) in the window aging out. `null` when nothing in
	 *  the window is old enough to matter (the tier would stay the same
	 *  even if the window emptied out entirely — e.g. already the default
	 *  tier with too little history to shift it). */
	predictedChangeAtMs: number | null;
}

/** Balance rules, checked in this exact order (first match wins) — see
 *  computeRealmBalance's own doc comment for why this specific precedence,
 *  not a "worse of two independent conditions" scheme:
 *   1. Fewer than 2 dragon wishes for this realm in the window → tier 4.
 *   2. Exactly 2 wishes → tier 3.
 *   3. (only once wishes >= 3) some enemy realm made ENEMY_WISH_TRIGGER+ of
 *      its own dragon wishes in the window → tier 2.
 *   4. Otherwise (wishes >= 3, no single enemy wished that much) → tier 0. */
function tierFor(wishCount: number, topEnemyWishCount: number): BalanceTier {
	if (wishCount < 2) return 4;
	if (wishCount === 2) return 3;
	if (topEnemyWishCount >= ENEMY_WISH_TRIGGER) return 2;
	return 0;
}

/** Per-realm "Balanço" status — how many dragon wishes were made for this
 *  realm, and whether some specific enemy has been wishing heavily for
 *  itself, over the trailing 10 days. Unlike every other "last N days" stat
 *  in this app (a rolling N*24h window), this one is bucketed by UTC
 *  calendar day (per the game's own convention: the day flips at UTC
 *  00:00 — 21:00 in Brasília time) — the window is "today plus the 9 UTC
 *  days before it", and it only ever moves forward at each UTC midnight,
 *  not continuously. That's also what makes `predictedChangeAtMs`
 *  computable at all: with a rolling window there's no fixed moment where
 *  "the count drops," but with calendar-day buckets there is — simulates
 *  the window sliding forward one UTC day at a time (dropping the oldest
 *  bucket each step, assuming no new events) until the computed tier first
 *  differs from today's. */
export function computeRealmBalance(events: WzEvent[], now: number): RealmBalance[] {
	const nowSeconds = Math.floor(now / 1000);
	const today = Math.floor(nowSeconds / DAY_SECONDS);
	const windowStartDay = today - (WINDOW_DAYS - 1);

	const wishByDayByRealm = new Map<Realm, Map<number, number>>();
	for (const realm of REALMS) wishByDayByRealm.set(realm, new Map());

	for (const event of events) {
		if (event.type !== "wish") continue;
		const byDay = wishByDayByRealm.get(event.location as Realm);
		if (!byDay) continue;
		const day = Math.floor(event.date / DAY_SECONDS);
		if (day < windowStartDay || day > today) continue;
		byDay.set(day, (byDay.get(day) ?? 0) + 1);
	}

	const sumFrom = (byDay: Map<number, number>, fromDay: number) => {
		let sum = 0;
		for (const [day, count] of byDay) if (day >= fromDay) sum += count;
		return sum;
	};

	const topEnemyWishesFrom = (realm: Realm, fromDay: number) => {
		let best: { realm: Realm; count: number } | null = null;
		for (const enemy of REALMS) {
			if (enemy === realm) continue;
			const count = sumFrom(wishByDayByRealm.get(enemy)!, fromDay);
			if (count > 0 && (!best || count > best.count)) best = { realm: enemy, count };
		}
		return best;
	};

	return REALMS.map((realm) => {
		const byDay = wishByDayByRealm.get(realm)!;
		const wishCount = sumFrom(byDay, windowStartDay);
		const topEnemyWishes = topEnemyWishesFrom(realm, windowStartDay);
		const currentTier = tierFor(wishCount, topEnemyWishes?.count ?? 0);

		let predictedChangeAtMs: number | null = null;
		for (let k = 1; k <= WINDOW_DAYS; k++) {
			const fromDay = windowStartDay + k;
			const futureWishCount = sumFrom(byDay, fromDay);
			const futureTopEnemyWishes = topEnemyWishesFrom(realm, fromDay);
			if (tierFor(futureWishCount, futureTopEnemyWishes?.count ?? 0) !== currentTier) {
				predictedChangeAtMs = (today + k) * DAY_SECONDS * 1000;
				break;
			}
		}

		return { realm, tier: currentTier, wishCount, topEnemyWishes, predictedChangeAtMs };
	});
}
