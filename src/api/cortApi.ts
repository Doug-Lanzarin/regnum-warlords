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
	const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
	if (!res.ok) throw new Error(`CoRT API respondeu ${res.status} em ${url}`);
	return (await res.json()) as T;
}

export const cortApi = {
	// bosses.php sends Access-Control-Allow-Origin: * — fetchable directly.
	bosses: () => getJSON<BossSpawnData>(`${API_BASE}/bin/bosses/bosses.php`),
	battlezone: () => getJSON<unknown>(`${API_BASE}/bin/bz/bz.php`),
	// wstatus.json/events.json/stats.json send a *fixed*
	// Access-Control-Allow-Origin: https://cort.ovh — never our own origin,
	// so a browser fetching these directly always has the response withheld
	// by CORS regardless of connection quality. Routed through our own
	// same-origin proxy (api/cort-proxy.ts) instead, which fetches them
	// server-side (not subject to CORS) and relays the JSON back.
	warzoneStatus: () => getJSON<WzStatusData>("/api/cort-proxy?endpoint=wstatus"),
	warzoneEvents: () => getJSON<WzEventsDumpEntry[]>("/api/cort-proxy?endpoint=events"),
	warStats: () => getJSON<WzStatsDump>("/api/cort-proxy?endpoint=stats"),
	maintenance: () => fetch(`${API_BASE}/var/maintenance.txt`, { signal: AbortSignal.timeout(6000) }).then((r) => (r.ok ? r.text() : "")),
};

export class CortApiUnavailableError extends Error {}
