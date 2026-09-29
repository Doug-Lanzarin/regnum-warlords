import { REALMS, type Realm } from "../../data/realms";
import type { WzEvent } from "../../types/wz";

const DAY_SECONDS = 24 * 60 * 60;
const WINDOW_DAYS = 10;
const INVASION_TRIGGER = 5;

export type BalanceTier = 0 | 2 | 3 | 4;

export interface RealmBalance {
	realm: Realm;
	tier: BalanceTier;
	/** Dragon wishes for this realm in the current 10-day window. */
	wishCount: number;
	/** Whichever enemy realm has invaded this realm's territory the most in
	 *  the window, and by how much — `null` if neither enemy has invaded at
	 *  all. Only relevant to the tier when it's reached `INVASION_TRIGGER`. */
	topInvader: { realm: Realm; count: number } | null;
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
 *   3. (only once wishes >= 3) some enemy realm invaded this realm's
 *      territory INVASION_TRIGGER+ times in the window → tier 2.
 *   4. Otherwise (wishes >= 3, no single enemy invaded that much) → tier 0. */
function tierFor(wishCount: number, topInvaderCount: number): BalanceTier {
	if (wishCount < 2) return 4;
	if (wishCount === 2) return 3;
	if (topInvaderCount >= INVASION_TRIGGER) return 2;
	return 0;
}

/** Per-realm "Balanço" status — how many dragon wishes were made for this
 *  realm, and whether some specific enemy has been invading it hard, over
 *  the trailing 10 days. Unlike every other "last N days" stat in this
 *  app (a rolling N*24h window), this one is bucketed by UTC calendar day
 *  (per the game's own convention: the day flips at UTC 00:00 — 21:00 in
 *  Brasília time) — the window is "today plus the 9 UTC days before it",
 *  and it only ever moves forward at each UTC midnight, not continuously.
 *  That's also what makes `predictedChangeAtMs` computable at all: with a
 *  rolling window there's no fixed moment where "the count drops," but
 *  with calendar-day buckets there is — simulates the window sliding
 *  forward one UTC day at a time (dropping the oldest bucket each step,
 *  assuming no new events) until the computed tier first differs from
 *  today's. */
export function computeRealmBalance(events: WzEvent[], now: number): RealmBalance[] {
	const nowSeconds = Math.floor(now / 1000);
	const today = Math.floor(nowSeconds / DAY_SECONDS);
	const windowStartDay = today - (WINDOW_DAYS - 1);

	return REALMS.map((realm) => {
		const wishByDay = new Map<number, number>();
		const invasionByEnemyDay = new Map<Realm, Map<number, number>>();
		for (const enemy of REALMS) if (enemy !== realm) invasionByEnemyDay.set(enemy, new Map());

		for (const event of events) {
			const day = Math.floor(event.date / DAY_SECONDS);
			if (day < windowStartDay || day > today) continue;
			if (event.type === "wish" && event.location === realm) {
				wishByDay.set(day, (wishByDay.get(day) ?? 0) + 1);
			} else if (event.type === "fort" && event.location === realm && event.owner !== realm) {
				const byDay = invasionByEnemyDay.get(event.owner as Realm);
				if (byDay) byDay.set(day, (byDay.get(day) ?? 0) + 1);
			}
		}

		const sumFrom = (byDay: Map<number, number>, fromDay: number) => {
			let sum = 0;
			for (const [day, count] of byDay) if (day >= fromDay) sum += count;
			return sum;
		};

		const topInvaderCountFrom = (fromDay: number) => {
			let best: { realm: Realm; count: number } | null = null;
			for (const [enemy, byDay] of invasionByEnemyDay) {
				const count = sumFrom(byDay, fromDay);
				if (count > 0 && (!best || count > best.count)) best = { realm: enemy, count };
			}
			return best;
		};

		const wishCount = sumFrom(wishByDay, windowStartDay);
		const topInvader = topInvaderCountFrom(windowStartDay);
		const currentTier = tierFor(wishCount, topInvader?.count ?? 0);

		let predictedChangeAtMs: number | null = null;
		for (let k = 1; k <= WINDOW_DAYS; k++) {
			const fromDay = windowStartDay + k;
			const futureWishCount = sumFrom(wishByDay, fromDay);
			const futureTopInvader = topInvaderCountFrom(fromDay);
			if (tierFor(futureWishCount, futureTopInvader?.count ?? 0) !== currentTier) {
				predictedChangeAtMs = (today + k) * DAY_SECONDS * 1000;
				break;
			}
		}

		return { realm, tier: currentTier, wishCount, topInvader, predictedChangeAtMs };
	});
}
