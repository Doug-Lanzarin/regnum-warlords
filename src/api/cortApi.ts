// Live data client for the official CoRT API (https://cort.ovh/api).
// Used by the "live" pages (bosses, WZ status, BZ, events, stats). These
// endpoints are not needed by the Trainer (which uses bundled/static
// reference data), but are wired up here so those pages are a small step
// away from being built.
//
// Note: some networks (locked-down corporate proxies in particular) block
// cort.ovh outright. Every call here fails soft — callers should show a
// friendly "live data unavailable" state rather than crash.

import type { BossSpawnData } from "../types/bosses";
import type { WzEventsDumpEntry, WzStatsDump, WzStatusData } from "../types/wz";

const API_BASE = "https://cort.ovh/api";

async function getJSON<T>(url: string): Promise<T> {
	// no-store: these are live-status polls (the WZ page re-fetches on its
	// own schedule) — never let the browser's own heuristic HTTP cache
	// quietly serve back a previous response instead of hitting the network.
	const res = await fetch(url, { signal: AbortSignal.timeout(6000), cache: "no-store" });
	if (!res.ok) throw new Error(`CoRT API respondeu ${res.status} em ${url}`);
	return (await res.json()) as T;
}

export const cortApi = {
	battlezone: () => getJSON<unknown>(`${API_BASE}/bin/bz/bz.php`),
	// bosses.php/wstatus.json/events.json/stats.json all send either a
	// *fixed* Access-Control-Allow-Origin: https://cort.ovh (never our own
	// origin) or, on bosses.php, no CORS header at all — either way, a
	// browser fetching these directly always has the response withheld by
	// CORS regardless of connection quality. Routed through our own
	// same-origin proxy (api/cort-proxy.ts) instead, which fetches them
	// server-side (not subject to CORS) and relays the JSON back — with no
	// caching anywhere in that path, so this always reflects the current
	// live status.
	bosses: () => getJSON<BossSpawnData>("/api/cort-proxy?endpoint=bosses"),
	warzoneStatus: () => getJSON<WzStatusData>("/api/cort-proxy?endpoint=wstatus"),
	warzoneEvents: () => getJSON<WzEventsDumpEntry[]>("/api/cort-proxy?endpoint=events"),
	warStats: () => getJSON<WzStatsDump>("/api/cort-proxy?endpoint=stats"),
	maintenance: () => fetch(`${API_BASE}/var/maintenance.txt`, { signal: AbortSignal.timeout(6000) }).then((r) => (r.ok ? r.text() : "")),
	// EXPERIMENTAL — see api/wz-official.ts. Scrapes championsofregnum.com's
	// own War Status page instead of relaying cort.ovh, as a same-origin
	// alternative source for the manual toggle on the WZ page. No events
	// history, so fort "captured Xh ago" labels won't have anything to show.
	warzoneStatusOfficial: () => getJSON<WzStatusData>("/api/wz-official"),
};

export class CortApiUnavailableError extends Error {}
