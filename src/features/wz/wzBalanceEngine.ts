import { REALMS, type Realm } from "../../data/realms";
import type { WzEvent } from "../../types/wz";

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_MS = 10 * DAY_MS;
const ENEMY_WISH_TRIGGER = 5;

export type BalanceTier = 0 | 2 | 3 | 4;

export interface RealmBalance {
	realm: Realm;
	tier: BalanceTier;
	/** Dragon wishes for this realm in the current 10-day window, as of the
	 *  last UTC-midnight flip (see `computeRealmBalance`'s own doc comment —
	 *  this is frozen between flips, not a continuous live count). */
	wishCount: number;
	/** Whichever enemy realm made the most dragon wishes (for itself) in the
	 *  window, and how many — `null` if neither enemy made any. Only
	 *  relevant to the tier once it's reached `ENEMY_WISH_TRIGGER`. */
	topEnemyWishes: { realm: Realm; count: number } | null;
	/** Timestamp (ms) of the next UTC-midnight flip at which the tier would
	 *  show as changed, assuming no further events happen. `null` when
	 *  nothing currently in the window is old enough to matter. */
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
 *  itself, over the trailing 10 days (240h). The game's own day only rolls
 *  over once daily, at UTC 00:00 (21:00 in Brasília time) — "the balance
 *  only updates at 21:00," per how this was described — so the displayed
 *  figure is frozen as of the most recent flip, not a continuously live
 *  count: a wish made 5 minutes ago doesn't show up yet, and one that
 *  technically crossed the 240h mark 10 minutes ago hasn't dropped out
 *  yet either. Both wait for the next flip. That's why `now` is first
 *  snapped down to `effectiveNow` (the latest UTC midnight at or before
 *  it) before anything else here — the window is [effectiveNow - 240h,
 *  effectiveNow], not [now - 240h, now].
 *
 *  `predictedChangeAtMs` walks the window's contents oldest-expiring-first
 *  from that same `effectiveNow` to find the first future flip where the
 *  tier would differ from today's — always strictly after `effectiveNow`,
 *  which is itself always still in the future relative to the real `now`
 *  (since `effectiveNow <= now < effectiveNow + 24h` by construction), so
 *  "today's" frozen figure stays valid right up until that flip. */
export function computeRealmBalance(events: WzEvent[], now: number): RealmBalance[] {
	const effectiveNow = Math.floor(now / DAY_MS) * DAY_MS;
	const cutoff = effectiveNow - WINDOW_MS;

	const wishesByRealm = new Map<Realm, WzEvent[]>();
	for (const realm of REALMS) wishesByRealm.set(realm, []);
	for (const event of events) {
		if (event.type !== "wish") continue;
		const list = wishesByRealm.get(event.location as Realm);
		if (!list) continue;
		const eventMs = event.date * 1000;
		if (eventMs < cutoff || eventMs > effectiveNow) continue;
		list.push(event);
	}

	const nextFlipAfterEffectiveNow = (expiresAtMs: number): number => {
		const boundary = Math.ceil(expiresAtMs / DAY_MS) * DAY_MS;
		return boundary > effectiveNow ? boundary : effectiveNow + DAY_MS;
	};

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
				predictedChangeAtMs = nextFlipAfterEffectiveNow(item.expiresAtMs);
				break;
			}
		}

		return { realm, tier: currentTier, wishCount, topEnemyWishes, predictedChangeAtMs };
	});
}
