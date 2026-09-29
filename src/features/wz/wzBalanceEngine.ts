import { REALMS, type Realm } from "../../data/realms";
import type { WzEvent } from "../../types/wz";

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_MS = 10 * DAY_MS;
const ENEMY_WISH_TRIGGER = 5;

export type BalanceTier = 0 | 2 | 3 | 4;

export interface RealmBalance {
	realm: Realm;
	tier: BalanceTier;
	/** Dragon wishes for this realm in the trailing 240h window. */
	wishCount: number;
	/** Whichever enemy realm made the most dragon wishes (for itself) in the
	 *  window, and how many — `null` if neither enemy made any. Only
	 *  relevant to the tier once it's reached `ENEMY_WISH_TRIGGER`. */
	topEnemyWishes: { realm: Realm; count: number } | null;
	/** Timestamp (ms) of the next UTC-midnight "flip" at which today's tier
	 *  would show as changed, assuming no further events happen. `null`
	 *  when nothing currently in the window is old enough to matter — the
	 *  tier would stay the same even as the window kept aging. */
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

function pickTop(counts: Map<Realm, number>): { realm: Realm; count: number } | null {
	let best: { realm: Realm; count: number } | null = null;
	for (const [realm, count] of counts) {
		if (count > 0 && (!best || count > best.count)) best = { realm, count };
	}
	return best;
}

/** Per-realm "Balanço" status — how many dragon wishes were made for this
 *  realm, and whether some specific enemy has been wishing heavily for
 *  itself, over the trailing 10 days (240h). Like every other "last N
 *  days" stat in this app, the window is a continuous rolling one measured
 *  from each event's exact timestamp — NOT bucketed by UTC calendar day.
 *  What IS tied to the UTC calendar day (= 21:00 in Brasília time) is when
 *  a predicted tier change actually becomes visible: the game's own
 *  "system" only flips its displayed numbers once per day, at UTC
 *  midnight, so even though an event's 240h technically expires at some
 *  arbitrary time of day, the resulting tier change won't show up until
 *  the next UTC midnight at or after that exact moment.
 *  `predictedChangeAtMs` accounts for that: it finds the exact moment
 *  (walking the window's contents oldest-expiring-first) where the tier
 *  would first differ from today's, then rounds that moment *up* to the
 *  next UTC-midnight boundary. */
export function computeRealmBalance(events: WzEvent[], now: number): RealmBalance[] {
	const cutoff = now - WINDOW_MS;

	const wishesByRealm = new Map<Realm, WzEvent[]>();
	for (const realm of REALMS) wishesByRealm.set(realm, []);
	for (const event of events) {
		if (event.type !== "wish") continue;
		const list = wishesByRealm.get(event.location as Realm);
		if (!list) continue;
		const eventMs = event.date * 1000;
		if (eventMs < cutoff || eventMs > now) continue;
		list.push(event);
	}

	return REALMS.map((realm) => {
		const ownWishes = wishesByRealm.get(realm)!;
		const wishCount = ownWishes.length;

		const enemies = REALMS.filter((r) => r !== realm);
		const enemyCounts = new Map(enemies.map((enemy) => [enemy, wishesByRealm.get(enemy)!.length]));
		const topEnemyWishes = pickTop(enemyCounts);
		const currentTier = tierFor(wishCount, topEnemyWishes?.count ?? 0);

		const expiring: { expiresAtMs: number; kind: "own" | Realm }[] = [
			...ownWishes.map((e) => ({ expiresAtMs: e.date * 1000 + WINDOW_MS, kind: "own" as const })),
			...enemies.flatMap((enemy) => wishesByRealm.get(enemy)!.map((e) => ({ expiresAtMs: e.date * 1000 + WINDOW_MS, kind: enemy }))),
		].sort((a, b) => a.expiresAtMs - b.expiresAtMs);

		let simWishCount = wishCount;
		const simEnemyCounts = new Map(enemyCounts);
		let predictedChangeAtMs: number | null = null;
		for (const item of expiring) {
			if (item.kind === "own") simWishCount--;
			else simEnemyCounts.set(item.kind, (simEnemyCounts.get(item.kind) ?? 0) - 1);

			const simTier = tierFor(simWishCount, pickTop(simEnemyCounts)?.count ?? 0);
			if (simTier !== currentTier) {
				predictedChangeAtMs = Math.ceil(item.expiresAtMs / DAY_MS) * DAY_MS;
				break;
			}
		}

		return { realm, tier: currentTier, wishCount, topEnemyWishes, predictedChangeAtMs };
	});
}
