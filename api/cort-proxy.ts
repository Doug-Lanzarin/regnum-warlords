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
// wstatus specifically now tries a second, independent CoRT deployment
// first — cort.go.yo.fr/CoRT is a separate self-hosted instance of the
// same open-source client (see its own js/libs/cortlibs.js), serving the
// byte-identical wstatus.json shape, just not cort.ovh itself. Trying it
// first spreads load off cort.ovh instead of adding to it, and gives a
// second independent host to fall back to before ever touching the stale
// snapshot below. It has shown its own "works, then randomly 403s/resets"
// flakiness when polled from here — unrelated to cort.ovh's — so this
// isn't assumed more reliable, just an independent second chance.

import { readLiveSnapshot } from "./_push/storage.js";

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
const ENDPOINTS: Record<string, readonly string[]> = {
	wstatus: ["https://cort.go.yo.fr/CoRT/api/var/wstatus.json", "https://cort.ovh/api/var/wstatus.json"],
	events: ["https://cort.ovh/api/var/events.json"],
	stats: ["https://cort.ovh/api/var/stats.json"],
	bosses: ["https://cort.ovh/api/bin/bosses/bosses.php"],
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
				res.status(200).json(data);
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
