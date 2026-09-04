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
// Deliberately no Cache-Control here (an earlier version cached this for
// 30s at the edge with a 60s stale-while-revalidate window — the WZ status
// stopped refreshing correctly for the user after that). This is a live
// war-status feed the client already polls on its own schedule
// (WZ_REFRESH_INTERVAL_MS); every request should hit cort.ovh fresh rather
// than risk Vercel's edge (or an intermediate cache) serving a stale copy
// for longer than intended.

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
	// the way a browser's does. The freshness that was for is already
	// guaranteed by the response's own Cache-Control: no-store below.
	//
	// One retry: every endpoint here responds in well under a second when
	// reachable at all (measured directly with curl), so a failure isn't
	// about payload size — it's the odd genuinely-flaky round trip between
	// Vercel and cort.ovh. A short per-attempt timeout (4s, not the 8s a
	// single attempt used before) keeps two attempts comfortably inside the
	// ~10s a Vercel Function gets on the Hobby plan.
	for (let attempt = 1; attempt <= 2; attempt++) {
		try {
			const upstream = await fetch(url, { signal: AbortSignal.timeout(4000) });
			if (!upstream.ok) {
				console.error("cort-proxy: upstream error", endpoint, "attempt", attempt, upstream.status);
			} else {
				const data = await upstream.json();
				res.setHeader("Cache-Control", "no-store");
				res.status(200).json(data);
				return;
			}
		} catch (error) {
			console.error("cort-proxy: fetch failed", endpoint, "attempt", attempt, error);
		}
	}
	res.status(502).json({ error: "cort.ovh indisponível no momento." });
}
