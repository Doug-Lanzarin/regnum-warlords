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
	bosses: () => getJSON<BossSpawnData>(`${API_BASE}/bin/bosses/bosses.php`),
	battlezone: () => getJSON<unknown>(`${API_BASE}/bin/bz/bz.php`),
	warzoneStatus: () => getJSON<WzStatusData>(`${API_BASE}/var/wstatus.json`),
	warzoneEvents: () => getJSON<WzEventsDumpEntry[]>(`${API_BASE}/var/events.json`),
	warStats: () => getJSON<WzStatsDump>(`${API_BASE}/var/stats.json`),
	maintenance: () => fetch(`${API_BASE}/var/maintenance.txt`, { signal: AbortSignal.timeout(6000) }).then((r) => (r.ok ? r.text() : "")),
};

export class CortApiUnavailableError extends Error {}
