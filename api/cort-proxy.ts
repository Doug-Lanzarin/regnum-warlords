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
// bin/bosses/bosses.php already sends `Access-Control-Allow-Origin: *`, so
// the Bosses page fetches it directly and doesn't need this.
//
// Polling the deployed endpoint directly (curl, spaced 5s apart, no
// mocking) showed the real severity: ~80% of individual attempts to
// cort.ovh from Vercel fail outright (measured after ruling out payload
// size/slowness — every endpoint here answers curl in well under a
// second). That's not occasional noise, it's a Vercel↔cort.ovh
// reliability problem this proxy can reduce but can't fully hide.
//
// Two mitigations, together:
//  1. Multiple attempts per request (below), since a retry occasionally
//     lands on a working path where the previous one didn't.
//  2. A *short* edge cache — Cache-Control: s-maxage=15, no
//     stale-while-revalidate. This turns "every single client request
//     must independently beat ~80% odds" into "at least one attempt has
//     to succeed every 15s", which is a much easier bar. Deliberately no
//     stale-while-revalidate this time: an earlier version used
//     max-age=30 + stale-while-revalidate=60, and once a revalidation
//     attempt failed against this same flaky upstream, Vercel kept
//     quietly serving that stale copy instead of ever trying again
//     visibly — which is almost certainly what "não está atualizando
//     corretamente" was. max-age=0 (browsers must revalidate on every
//     request) + s-maxage=15 (Vercel's edge may reuse a fresh response
//     for up to 15s) means a real, sustained outage surfaces as an
//     honest error again instead of a silently frozen screen.

interface VercelLikeRequest {
	method?: string;
	query: Record<string, string | string[] | undefined>;
}

interface VercelLikeResponse {
	status(code: number): VercelLikeResponse;
	json(body: unknown): void;
	setHeader(name: string, value: string): void;
}

const ENDPOINTS = {
	wstatus: "https://cort.ovh/api/var/wstatus.json",
	events: "https://cort.ovh/api/var/events.json",
	stats: "https://cort.ovh/api/var/stats.json",
} as const;

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
	if (req.method !== "GET") {
		res.setHeader("Allow", "GET");
		res.status(405).json({ error: "Método não suportado." });
		return;
	}

	const endpointParam = req.query.endpoint;
	const endpoint = typeof endpointParam === "string" ? endpointParam : undefined;
	const url = endpoint && endpoint in ENDPOINTS ? ENDPOINTS[endpoint as keyof typeof ENDPOINTS] : undefined;
	if (!url) {
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
	// 3 attempts at 2.5s each (7.5s worst case) fit comfortably inside the
	// ~10s a Vercel Function gets on the Hobby plan while giving a real
	// ~80%-failure-rate upstream more than one extra shot.
	const ATTEMPTS = 3;
	for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
		try {
			const upstream = await fetch(url, { signal: AbortSignal.timeout(2500) });
			if (!upstream.ok) {
				console.error("cort-proxy: upstream error", endpoint, "attempt", attempt, upstream.status);
			} else {
				const data = await upstream.json();
				res.setHeader("Cache-Control", "max-age=0, s-maxage=15");
				res.status(200).json(data);
				return;
			}
		} catch (error) {
			console.error("cort-proxy: fetch failed", endpoint, "attempt", attempt, error);
		}
	}
	res.status(502).json({ error: "cort.ovh indisponível no momento." });
}
