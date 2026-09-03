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

	try {
		const upstream = await fetch(url, { signal: AbortSignal.timeout(8000) });
		if (!upstream.ok) {
			console.error("cort-proxy: upstream error", endpoint, upstream.status);
			res.status(502).json({ error: "cort.ovh indisponível no momento." });
			return;
		}
		const data = await upstream.json();
		// A short edge cache — around the same cadence the client itself
		// already polls at — so a burst of visitors doesn't become a burst of
		// upstream calls to cort.ovh.
		res.setHeader("Cache-Control", "public, max-age=30, s-maxage=30, stale-while-revalidate=60");
		res.status(200).json(data);
	} catch (error) {
		console.error("cort-proxy: fetch failed", endpoint, error);
		res.status(502).json({ error: "cort.ovh indisponível no momento." });
	}
}
