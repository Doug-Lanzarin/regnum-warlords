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
// bin/bosses/bosses.php used to send `Access-Control-Allow-Origin: *`, so
// the Bosses page fetched it directly and didn't need this. cort.ovh has
// since stopped sending any Access-Control-Allow-Origin header on that
// endpoint at all (confirmed with the same curl -H "Origin: ..." check
// above — no header present anymore, whereas it used to send `*`), which
// broke direct browser fetches for every visitor regardless of network —
// a CORS block is enforced by the browser itself, so it isn't something a
// better connection or a different network can route around. Routed
// through here too now, for the same reason as the other three.
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
// All four try a second, independent CoRT deployment first —
// cort.go.yo.fr/CoRT is a separate self-hosted instance of the same
// open-source client (see its own js/libs/cortlibs.js), all four endpoints
// verified byte-identical in shape to cort.ovh's (stats.json in particular
// is the 4-element [header, 7d, 30d, 90d] tuple in `WzStatsDump` on both —
// an earlier version of this comment misread it as a different shape by
// only inspecting element [0], and briefly dropped the mirror as a stats
// candidate entirely on that basis; that was wrong and has been reverted).
// Trying the mirror first spreads load off cort.ovh instead of adding to
// it, which matters because cort.ovh remains unreachable from Vercel's
// network right now (same long-running issue documented above) — every
// live check against it from here times out or 5xxs, while the mirror
// answers normally. It has shown its own "works, then randomly
// 403s/resets" flakiness when polled from here too — unrelated to
// cort.ovh's — so this isn't assumed more reliable, just reachable, with
// cort.ovh as fallback.
//
// Known, temporary tradeoff: the mirror's events.json (and, consequently,
// its stats.json aggregates, computed upstream from that same event
// history) is missing 2026-09-01T17:59–2026-09-06T16:06 entirely —
// confirmed by diffing it against cort.ovh's own copy, which had that
// stretch complete (including a Syrtis dragon wish on 2026-09-04 a user
// noticed missing from the chart) at the time this was written. Vercel
// can't reach cort.ovh to get that history live, so _eventsBackfill.ts is
// a one-time, hand-fetched copy of exactly the missing window (pulled
// directly from cort.ovh from outside Vercel's network) — see
// mergeBackfill (events) and patchStatsWishes (stats.json's wishes.count/
// last, patched from the same backfilled wishes rather than re-fetched)
// below, and _eventsBackfill.ts's own doc comment (including why it's a
// plain .ts export, not a .json import). This is a frozen snapshot, not a
// live source: once 2026-09-06 rolls out of events.json's own ~10-day
// window (around 2026-09-16), it stops mattering and _eventsBackfill.ts
// plus both patch calls below can be deleted.

import { readLiveSnapshot } from "./_push/storage.js";
import backfillEvents from "./_eventsBackfill.js";
import { REALMS, type Realm } from "../src/data/realms.js";
import type { WzEvent, WzStatsDump } from "../src/types/wz";

const DAY_MS = 24 * 60 * 60 * 1000;

function isWzEvent(entry: unknown): entry is WzEvent {
	return !!entry && typeof entry === "object" && "type" in entry;
}

/** Fills in the mirror's known 2026-09-01–09-06 gap (see comment above) by
 *  merging in the hand-fetched backfill, deduped against whatever the live
 *  fetch actually returned (in case a future source ever does cover part
 *  of that window) and re-sorted newest-first, matching the convention
 *  every other events.json consumer already assumes. events.json's own
 *  leading `{generated}` header entry (no `type` field — see
 *  `WzEventsDumpEntry`) is set aside before the merge/sort and put back at
 *  the front, rather than treated as just another event. No-ops if `data`
 *  isn't the plain event array events.json is supposed to be. */
function mergeBackfill(data: unknown): unknown {
	if (!Array.isArray(data)) return data;
	const header = data.find((entry) => !isWzEvent(entry));
	const liveEvents = data.filter(isWzEvent);

	const seen = new Set<string>();
	const keyOf = (e: WzEvent) => `${e.date}-${e.type}-${e.name}-${e.location}-${e.owner}`;
	const merged: WzEvent[] = [];
	for (const entry of [...liveEvents, ...backfillEvents]) {
		const key = keyOf(entry);
		if (seen.has(key)) continue;
		seen.add(key);
		merged.push(entry);
	}
	merged.sort((a, b) => b.date - a.date);

	return header !== undefined ? [header, ...merged] : merged;
}

/** stats.json's per-realm `wishes.count`/`wishes.last` (7d/30d/90d) are
 *  computed upstream from the same event history events.json has — so the
 *  mirror's 2026-09-01–09-06 gap undercounts these too, most visibly on
 *  "7d" (the whole gap sits inside a 7-day window right now, zeroing every
 *  realm's count out entirely — the reported bug). Rather than an extra
 *  live fetch to recompute this from scratch, patches in just the known 4
 *  backfilled wishes: adds however many of them fall within each window
 *  (relative to request time) to that window's count, and bumps `last`
 *  forward if a backfilled one is more recent than what the live source
 *  reported. No-ops on anything that isn't the [header, 7d, 30d, 90d]
 *  shape stats.json is supposed to be. */
function patchStatsWishes(data: unknown): unknown {
	if (!Array.isArray(data) || data.length !== 4) return data;
	const [header, ...reports] = data as WzStatsDump;
	const backfilledWishes = backfillEvents.filter((e) => e.type === "wish");
	const now = Date.now();

	const patchedReports = reports.map((report, i) => {
		const windowMs = [7, 30, 90][i] * DAY_MS;
		const cutoff = now - windowMs;
		const patched = { ...report };
		for (const realm of REALMS) {
			const inWindow = backfilledWishes.filter((w) => w.location === realm && w.date * 1000 >= cutoff);
			if (inWindow.length === 0) continue;
			const realmReport = patched[realm];
			const newestBackfilled = Math.max(...inWindow.map((w) => w.date));
			patched[realm] = {
				...realmReport,
				wishes: {
					count: (realmReport?.wishes?.count ?? 0) + inWindow.length,
					last: Math.max(realmReport?.wishes?.last ?? 0, newestBackfilled),
				},
			};
		}
		return patched;
	});

	return [header, ...patchedReports];
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

// Each endpoint maps to one or more candidate URLs, tried in order.
// cort.ovh was briefly tried first again on 2026-09-08 to test whether
// Vercel's network could reach it again — confirmed still no: the live
// response matched the mirror's known-incomplete data (774 events/4
// wishes) instead of cort.ovh's own copy (1541 events/8 wishes for the
// same window, checked directly). Reverted back to the mirror first so
// requests don't pay for a cort.ovh attempt that reliably fails.
const ENDPOINTS: Record<string, readonly string[]> = {
	wstatus: ["https://cort.go.yo.fr/CoRT/api/var/wstatus.json", "https://cort.ovh/api/var/wstatus.json"],
	events: ["https://cort.go.yo.fr/CoRT/api/var/events.json", "https://cort.ovh/api/var/events.json"],
	stats: ["https://cort.go.yo.fr/CoRT/api/var/stats.json", "https://cort.ovh/api/var/stats.json"],
	bosses: ["https://cort.go.yo.fr/CoRT/api/bin/bosses/bosses.php", "https://cort.ovh/api/bin/bosses/bosses.php"],
};

// Node's default fetch() User-Agent (something generic like "node") is
// exactly the kind of thing a bot-detection layer flags first. A real,
// identifiable one costs nothing and might be the whole difference between
// looking like abuse traffic and looking like what this actually is: a
// small community tool making a couple of requests a minute.
const CORT_USER_AGENT = "RegnumWarlords/1.0 (+https://regnum-warlords.vercel.app)";

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

	// No `cache` option on these fetches — the already-working
	// api/push/tick.ts fetches this same cort.ovh JSON with a bare
	// fetch(url), no options at all. Adding cache: "no-store" on top of
	// AbortSignal.timeout (a prior version of this file) is the one thing
	// that differed from that proven pattern, and lines up with this
	// endpoint going from working (if stale) to a flat 502 in production —
	// Vercel's Node fetch most likely doesn't accept that RequestInit option
	// the way a browser's does.
	//
	// 2 attempts at 2.5s each (5s worst case) — cut down from 3 once the
	// failures looked like throttling from our own request volume rather
	// than pure bad luck: retrying harder just adds to the volume that
	// (likely) triggered this in the first place. When an endpoint has more
	// than one candidate URL (wstatus), the 2-attempt budget is spent one
	// per host instead of twice on the same one — better odds against a
	// single host's own flakiness than repeating the exact same request.
	const ATTEMPTS = 2;
	const attemptUrls = urls.length > 1 ? urls : Array(ATTEMPTS).fill(urls[0]);
	for (const url of attemptUrls) {
		try {
			const upstream = await fetch(url, { signal: AbortSignal.timeout(2500), headers: { "User-Agent": CORT_USER_AGENT } });
			if (!upstream.ok) {
				console.error("cort-proxy: upstream error", endpoint, url, upstream.status);
			} else {
				const data = await upstream.json();
				res.setHeader("Cache-Control", "max-age=0, s-maxage=45");
				let responseData = data;
				if (endpoint === "events") responseData = mergeBackfill(data);
				else if (endpoint === "stats") responseData = patchStatsWishes(data);
				res.status(200).json(responseData);
				return;
			}
		} catch (error) {
			console.error("cort-proxy: fetch failed", endpoint, url, error);
		}
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
