// Vercel serverless function — a thin same-origin relay for the handful of
// cort.ovh live endpoints a browser can't fetch directly.
//
// var/wstatus.json, var/events.json and var/stats.json all send a *fixed*
// `Access-Control-Allow-Origin: https://cort.ovh` — not our own origin, and
// not a wildcard — no matter what Origin the request carries (verified with
// curl -H "Origin: https://regnum-warlords.vercel.app", same result with no
// Origin header at all). A browser fetching them directly from
// regnum-warlords.vercel.app therefore always has the response body
// withheld by CORS, regardless of connection speed — this was surfacing as
// a generic "live data unavailable" error with no way to tell it apart from
// an actual network problem. A server isn't subject to CORS at all (same as
// `curl`), so this fetches them here and relays the JSON back same-origin,
// where the browser has nothing to block.
//
// bin/bosses/bosses.php used to be routed through here too, for the same
// CORS reason — until CoRT's own v5 rewrite removed that endpoint
// entirely (confirmed 2026-09-24: 404 from cort.ovh, connection reset from
// the mirror) and moved boss-respawn computation client-side instead (see
// src/features/bosses/bossScheduleEngine.ts). There's no "bosses" endpoint
// here anymore because there's nothing left upstream to relay.
//
// Polling the deployed endpoint directly (curl, spaced 5s apart, no
// mocking) showed the real severity: a large fraction of individual
// attempts to cort.ovh from Vercel fail outright (measured after ruling
// out payload size/slowness — every endpoint here answers curl in well
// under a second from any other network). That's not occasional noise.
//
// Timeline evidence points at this being throttling from *our own*
// cumulative request volume, not a blanket Vercel-vs-cort.ovh
// incompatibility: api/push/tick.ts polled cort.ovh cleanly, every
// ~minute, for a full day straight after this proxy first shipped —
// then abruptly stopped succeeding, with no code change on our side at
// that moment. A sustained rate-limit/anti-abuse trigger tripped by
// aggregate volume (tick.ts's own polling plus every open tab's client
// polling, all sharing Vercel's IP pool) fits that shape far better than
// a permanent block would. So the fix isn't just "retry harder" — it's
// also asking cort.ovh less often in the first place:
//  1. A couple of attempts per request (below) for the odd transient miss.
//  2. A less aggressive edge cache — Cache-Control: s-maxage=45, no
//     stale-while-revalidate. Long enough that many concurrent visitors
//     share one upstream hit instead of one each, short enough that a
//     real outage still surfaces as an honest error quickly rather than
//     silently freezing. Deliberately no stale-while-revalidate: an
//     earlier version used max-age=30 + stale-while-revalidate=60, and
//     once a revalidation attempt failed against this same flaky
//     upstream, Vercel kept quietly serving that stale copy instead of
//     ever trying again visibly — which is almost certainly what "não
//     está atualizando corretamente" was.
// See also WZ_REFRESH_INTERVAL_MS (src/data/wzConstants.ts), bumped for
// the same reason — less polling from the client side too.
//
// All four also have a second, independent CoRT deployment as a candidate —
// cort.go.yo.fr/CoRT is a separate self-hosted instance of the same
// open-source client (see its own js/libs/cortlibs.js), all four endpoints
// verified byte-identical in shape to cort.ovh's (stats.json in particular
// is the 4-element [header, 7d, 30d, 90d] tuple in `WzStatsDump` on both —
// an earlier version of this comment misread it as a different shape by
// only inspecting element [0], and briefly dropped the mirror as a stats
// candidate entirely on that basis; that was wrong and has been reverted).
// For a while this mirror was tried *first* and cort.ovh only as fallback,
// since cort.ovh was confirmed unreachable from Vercel's network while the
// mirror answered normally — see the 2026-09-10 update below for why that
// ordering (and the "first candidate to answer wins" logic generally) no
// longer holds: the mirror has its own, worse reliability problem.
//
// Known, ongoing, and *recurring* tradeoff: the mirror's events.json (and,
// consequently, its stats.json aggregates, computed upstream from that
// same event history) is missing a large chunk of real events, not just
// one dated window — first confirmed 2026-09-10 (mirror catching only
// ~14% of cort.ovh's own event count for the same window), re-confirmed
// 2026-09-21 (~50% — better, still badly incomplete), missing things as
// recent as the day before each check (an Ignis dragon wish on 09-10, a
// Syrtis one on 09-21). Confirmed both times, same day, that Vercel
// itself still can't reach cort.ovh directly either (curling the
// *deployed* proxy's events endpoint returned an entry count and per-realm
// tallies matching the mirror alone, not cort.ovh's fuller ones) — so this
// can't be fixed by preferring cort.ovh and calling it done; that exact
// swap-the-primary-source approach was tried on 2026-09-08 and reverted
// for the same reason, and still holds true two weeks later.
//
// The only source actually complete is cort.ovh fetched from *outside*
// Vercel's network (this repo's own dev sandbox, in practice) — so
// _eventsBackfill.ts and _statsBackfill.ts are hand-fetched snapshots of
// cort.ovh's events.json and stats.json, pulled the same way. events.json
// merges cleanly (mergeEventSources, below) since it's a raw list that can
// be deduped against whatever's live; stats.json can't be merged the same
// way (it's a pre-aggregated report, not a list — see the stats handling
// below), so its snapshot substitutes for the mirror's wholesale instead.
// Because both upstream sources keep moving (events.json is a rolling
// ~10-day window; stats.json's 7d/30d/90d windows roll continuously) and
// the mirror keeps falling behind rather than fully catching up, both
// snapshots go stale within a day or two and need re-fetching the same
// way — see each file's own doc comment for exactly when it was last
// taken. This is a stopgap, not a fix: the real fix is either the mirror
// recovering fully or Vercel regaining a reachable path to cort.ovh,
// neither of which this proxy controls. (stats.json's 7d window sidesteps
// this differently — see WzStatusPage.tsx, which computes it directly
// from the events dump instead of trusting stats.json at all, since 7
// days comfortably fits inside events.json's own retention and that stays
// self-correcting as long as events.json itself is accurate.)
//
// Every candidate for every endpoint is fetched *concurrently* (not
// first-success-wins) and combined below:
//  - events: union of every source that answered plus the backfill snapshot,
//    deduped and re-sorted — correct regardless of which live source(s)
//    Vercel can currently reach, and strictly no worse than before if
//    cort.ovh stays unreachable from Vercel.
//  - stats: cort.ovh's answer wins when it answers; otherwise the frozen
//    _statsBackfill.ts snapshot, not the mirror's own (see above).
//  - wstatus: cort.ovh's answer wins when it answers (it's the
//    authoritative source and the mirror has shown itself unreliable at
//    real scale), otherwise whichever candidate did answer.
// Fetching concurrently instead of sequentially also removes the old
// "second attempt only runs after the first fails" latency tax — worst
// case is now one timeout, not two stacked.

import { readLiveSnapshot } from "./_push/storage.js";
import backfillEvents from "./_eventsBackfill.js";
import statsBackfill from "./_statsBackfill.js";
import type { WzEvent } from "../src/types/wz";

function isWzEvent(entry: unknown): entry is WzEvent {
	return !!entry && typeof entry === "object" && "type" in entry;
}

// Two independently-scraped sources record the *same* real action a
// couple of seconds apart rather than at an identical timestamp (seen
// directly: the mirror's own events.json had a dragon wish at :07:56:02
// while cort.ovh had the same wish at :07:56:00). An exact-timestamp dedup
// key would treat those as two different events and double-list it.
// Rounding to the minute a scrape happened in is coarse enough to collapse
// that, without merging two genuinely different events of the same
// type/name/location/owner — those aren't expected to repeat inside the
// same 60s window (forts in particular can't flip ownership that fast;
// see the vulnerability countdown in wzEventsEngine.ts) and even a wish
// coincidentally repeating within a minute just undercounts by one,
// nowhere near as bad as the double-count this avoids.
const dedupKeyOf = (e: WzEvent) => `${Math.round(e.date / 60)}-${e.type}-${e.name}-${e.location}-${e.owner}`;

/** Merges every source's events.json array (each already known to be an
 *  array — see `fetchAllCandidates`) with the hand-fetched backfill into
 *  one deduped, newest-first list. Safe to include a source that itself
 *  already carries part of the backfilled window (e.g. cort.ovh, when
 *  reachable, or the mirror for whatever slice it did catch): entries for
 *  the same real event collide on the dedup key (see `dedupKeyOf`) and
 *  only survive once. Each array's own leading `{generated}` header entry
 *  (no `type` field — see `WzEventsDumpEntry`) is set aside before the
 *  merge/sort; the freshest one (highest `generated`) is put back at the
 *  front, rather than any header being treated as just another event. */
function mergeEventSources(dataList: unknown[]): unknown {
	const headers: { generated: number }[] = [];
	const liveEvents: WzEvent[] = [];
	for (const data of dataList) {
		if (!Array.isArray(data)) continue;
		const header = data.find((entry) => !isWzEvent(entry)) as { generated: number } | undefined;
		if (header) headers.push(header);
		liveEvents.push(...data.filter(isWzEvent));
	}

	const seen = new Set<string>();
	const merged: WzEvent[] = [];
	for (const entry of [...liveEvents, ...backfillEvents]) {
		const key = dedupKeyOf(entry);
		if (seen.has(key)) continue;
		seen.add(key);
		merged.push(entry);
	}
	merged.sort((a, b) => b.date - a.date);

	if (headers.length === 0) return merged;
	const freshestHeader = headers.reduce((a, b) => (b.generated > a.generated ? b : a));
	return [freshestHeader, ...merged];
}

interface VercelLikeRequest {
	method?: string;
	query: Record<string, string | string[] | undefined>;
}

interface VercelLikeResponse {
	status(code: number): VercelLikeResponse;
	json(body: unknown): void;
	setHeader(name: string, value: string): void;
}

// Each endpoint maps to one or more candidate URLs, all fetched
// concurrently (see `fetchAllCandidates`) and combined — see the big
// comment near the top of this file for why this is no longer
// first-success-wins.
const ENDPOINTS: Record<string, readonly string[]> = {
	wstatus: ["https://cort.go.yo.fr/CoRT/api/var/wstatus.json", "https://cort.ovh/api/var/wstatus.json"],
	events: ["https://cort.go.yo.fr/CoRT/api/var/events.json", "https://cort.ovh/api/var/events.json"],
	stats: ["https://cort.go.yo.fr/CoRT/api/var/stats.json", "https://cort.ovh/api/var/stats.json"],
};

// Node's default fetch() User-Agent (something generic like "node") is
// exactly the kind of thing a bot-detection layer flags first. A real,
// identifiable one costs nothing and might be the whole difference between
// looking like abuse traffic and looking like what this actually is: a
// small community tool making a couple of requests a minute.
const CORT_USER_AGENT = "RegnumWarlords/1.0 (+https://regnum-warlords.vercel.app)";

interface CandidateResult {
	url: string;
	data: unknown;
}

/** Fetches every candidate URL concurrently (not sequentially) — the old
 *  first-success-wins loop paid a full timeout on the first host before
 *  ever trying the second; running them in parallel means the worst case
 *  is one timeout, not the sum of both, and lets the caller combine
 *  whichever answers came back instead of only ever seeing one. Each
 *  candidate gets a single attempt (no per-URL retry): with every current
 *  endpoint listing 2 candidates, a second attempt against a host that
 *  just failed bought little over just also having tried the other host.
 *  Failures are logged and simply excluded from the result list. */
async function fetchAllCandidates(urls: readonly string[]): Promise<CandidateResult[]> {
	const settled = await Promise.allSettled(
		urls.map(async (url) => {
			// No `cache` option on these fetches — the already-working
			// api/push/tick.ts fetches this same cort.ovh JSON with a bare
			// fetch(url), no options at all. Adding cache: "no-store" on top of
			// AbortSignal.timeout (a prior version of this file) is the one
			// thing that differed from that proven pattern, and lines up with
			// this endpoint going from working (if stale) to a flat 502 in
			// production — Vercel's Node fetch most likely doesn't accept that
			// RequestInit option the way a browser's does.
			const upstream = await fetch(url, { signal: AbortSignal.timeout(2500), headers: { "User-Agent": CORT_USER_AGENT } });
			if (!upstream.ok) throw new Error(`upstream respondeu ${upstream.status}`);
			return { url, data: await upstream.json() };
		}),
	);

	const results: CandidateResult[] = [];
	settled.forEach((outcome, i) => {
		if (outcome.status === "fulfilled") results.push(outcome.value);
		else console.error("cort-proxy: fetch failed", urls[i], outcome.reason);
	});
	return results;
}

/** cort.ovh's answer wins when it answered — see the top-of-file comment
 *  for why the mirror is no longer trusted just for having responded.
 *  Falls back to whichever candidate did answer otherwise. */
function preferCortOvh(results: CandidateResult[]): CandidateResult | undefined {
	return results.find((r) => r.url.includes("cort.ovh")) ?? results[0];
}

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
	if (req.method !== "GET") {
		res.setHeader("Allow", "GET");
		res.status(405).json({ error: "Método não suportado." });
		return;
	}

	const endpointParam = req.query.endpoint;
	const endpoint = typeof endpointParam === "string" ? endpointParam : undefined;
	const urls = endpoint && endpoint in ENDPOINTS ? ENDPOINTS[endpoint] : undefined;
	if (!urls) {
		res.status(400).json({ error: `endpoint deve ser um de: ${Object.keys(ENDPOINTS).join(", ")}.` });
		return;
	}

	const results = await fetchAllCandidates(urls);
	if (results.length > 0) {
		res.setHeader("Cache-Control", "max-age=0, s-maxage=45");
		let responseData: unknown;
		if (endpoint === "events") {
			responseData = mergeEventSources(results.map((r) => r.data));
		} else if (endpoint === "stats") {
			const preferred = preferCortOvh(results)!;
			// cort.ovh's own live copy is always accurate — pass it straight
			// through. Otherwise we're stuck with the mirror's, which is
			// computed server-side from its own incomplete event history and
			// undercounts forts.total/wishes.count the same way its events.json
			// does. There's no per-field way to correct a pre-aggregated report
			// (unlike events.json's per-event dedup), so the frozen
			// _statsBackfill.ts snapshot substitutes for the whole thing — a
			// stale-but-accurate answer beats a live-but-wrong one. See
			// _statsBackfill.ts's own doc comment for when it was last refreshed.
			responseData = preferred.url.includes("cort.ovh") ? preferred.data : statsBackfill;
		} else {
			responseData = preferCortOvh(results)!.data;
		}
		res.status(200).json(responseData);
		return;
	}

	// Every live attempt failed. For wstatus specifically, `api/push/tick.ts`
	// keeps a periodically-refreshed full copy of the last one that worked
	// (`content/live-snapshot.json`) — falling back to that beats a hard
	// error, since `WzStatusData.generated` (cort.ovh's own timestamp,
	// untouched here) already tells the client exactly how old it is rather
	// than pretending it's current. Best-effort: if this itself fails (or
	// there's no snapshot yet), fall through to the same 502 as before.
	if (endpoint === "wstatus") {
		try {
			const { snapshot } = await readLiveSnapshot();
			if (snapshot.wstatus) {
				res.setHeader("Cache-Control", "max-age=0, s-maxage=45");
				res.setHeader("X-Cort-Proxy-Fallback", "1");
				res.status(200).json(snapshot.wstatus);
				return;
			}
		} catch (error) {
			console.error("cort-proxy: fallback snapshot read failed", endpoint, error);
		}
	}

	res.status(502).json({ error: "cort.ovh indisponível no momento." });
}
