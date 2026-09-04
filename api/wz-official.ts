// Vercel serverless function — an EXPERIMENTAL alternative to
// api/cort-proxy.ts's `wstatus` endpoint. Instead of relaying cort.ovh's
// wstatus.json, this scrapes championsofregnum.com's own "War Status" page
// (index.php?l=1&sec=3) directly, parses its HTML into the same
// WzStatusData shape, and serves that.
//
// Why this exists: the Vercel↔cort.ovh connectivity problem documented in
// cort-proxy.ts's own comment made a direct-from-the-source alternative
// worth prototyping. The official page has no JSON API — it's plain HTML
// with icon filenames encoding the actual data (same convention cort.ovh
// itself uses, e.g. `keep_alsius.gif`, `gem_2.png` — this project's own
// GEM_ICON_OWNER map in src/features/wz/wzEngine.ts already documents that
// mapping, ported from CoRT's Icons.get_all_icons(), and it was confirmed
// again here by downloading gem_0..3.png directly: 0 = neutral (black),
// 1 = Ignis (red), 2 = Alsius (blue), 3 = Syrtis (green)).
//
// Known gaps vs. cort.ovh's wstatus.json (documented so nobody re-derives
// this the hard way): no events_log (the page only shows current state, no
// history — fort "captured Xh ago" labels won't have anything to compute
// from), map_changed/gems_changed/relics_changed always false (nothing on
// the page signals this), and the relic parsing only reflects each realm's
// own 3 relics as shown — a relic currently stolen/in-transit to another
// realm's altar has not been verified against a real in-progress case.
//
// This is a same-origin relay for the SAME reason cort-proxy.ts is: the
// browser can't fetch championsofregnum.com directly either (no CORS
// header on this page), so this has to run server-side regardless.
//
// Status: experimental, wired up behind a manual toggle on the WZ page —
// not the default data source. Whether Vercel can reach
// championsofregnum.com reliably (the whole reason this might be worth
// finishing) hasn't been observed over time yet.

import type { Realm } from "../src/data/realms.js";
import type { WzFort, WzStatusData } from "../src/types/wz";

interface VercelLikeRequest {
	method?: string;
}

interface VercelLikeResponse {
	status(code: number): VercelLikeResponse;
	json(body: unknown): void;
	setHeader(name: string, value: string): void;
}

const OFFICIAL_URL = "https://www.championsofregnum.com/index.php?l=1&sec=3";
const USER_AGENT = "RegnumWarlords/1.0 (+https://regnum-warlords.vercel.app)";
const REALMS: Realm[] = ["Alsius", "Ignis", "Syrtis"];

function realmName(lowercase: string): Realm {
	const capitalized = lowercase.charAt(0).toUpperCase() + lowercase.slice(1);
	return (REALMS as string[]).includes(capitalized) ? (capitalized as Realm) : "Alsius";
}

function extractRealmBlocks(html: string): string[] {
	const marker = '<div class="war-status-realm">';
	const starts: number[] = [];
	for (let i = html.indexOf(marker); i !== -1; i = html.indexOf(marker, i + 1)) starts.push(i);
	return starts.map((start, i) => html.slice(start, starts[i + 1] ?? start + 6000));
}

function parseRealmBlock(block: string, realm: Realm): { gems: string[]; forts: WzFort[] } {
	const gems = [...block.matchAll(/gem_(\d)\.png/g)].slice(0, 6).map((m) => `gem_${m[1]}.png`);

	const icons = [...block.matchAll(/keep_(\w+)\.gif/g)];
	const names = [...block.matchAll(/war-status-bulding-name">([^<]+)</g)];
	const forts: WzFort[] = names.map((m, i) => {
		const iconRealm = icons[i]?.[1];
		const owner = iconRealm ? realmName(iconRealm) : realm;
		return { name: m[1].trim(), location: realm, owner, icon: `keep_${owner.toLowerCase()}.gif` };
	});

	return { gems, forts };
}

function parseRelics(block: string): Record<string, string> {
	const relics: Record<string, string> = {};
	for (const m of block.matchAll(/title="([^"]+) relic located at ([^"]+)"/g)) relics[m[1]] = m[2];
	return relics;
}

function parseGeneratedTimestamp(html: string): number {
	const m = html.match(/Latest update:\s*(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})\s*\(GMT([+-]\d+)\)/);
	if (!m) return Math.floor(Date.now() / 1000);
	const [, date, time, offset] = m;
	const sign = offset.startsWith("-") ? "-" : "+";
	const hours = String(Math.abs(Number(offset))).padStart(2, "0");
	const parsed = Date.parse(`${date}T${time}${sign}${hours}:00`);
	return Number.isNaN(parsed) ? Math.floor(Date.now() / 1000) : Math.floor(parsed / 1000);
}

export function parseWarStatusPage(html: string): WzStatusData {
	const blocks = extractRealmBlocks(html);
	const forts: WzFort[] = [];
	const gems: string[] = [];
	const relics: Record<Realm, Record<string, string>> = { Alsius: {}, Ignis: {}, Syrtis: {} };

	for (const block of blocks) {
		const realmMatch = block.match(/Realm of (\w+)</);
		if (!realmMatch) continue;
		const realm = realmName(realmMatch[1]);
		const parsed = parseRealmBlock(block, realm);
		forts.push(...parsed.forts);
		gems.push(...parsed.gems);
		relics[realm] = parseRelics(block);
	}

	return {
		forts,
		gems,
		relics,
		map_changed: false,
		gems_changed: false,
		relics_changed: false,
		events_log: [],
		generated: parseGeneratedTimestamp(html),
	};
}

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
	if (req.method !== "GET") {
		res.setHeader("Allow", "GET");
		res.status(405).json({ error: "Método não suportado." });
		return;
	}

	try {
		const upstream = await fetch(OFFICIAL_URL, { signal: AbortSignal.timeout(8000), headers: { "User-Agent": USER_AGENT } });
		if (!upstream.ok) throw new Error(`championsofregnum.com respondeu ${upstream.status}`);
		const html = await upstream.text();
		const data = parseWarStatusPage(html);
		if (data.forts.length === 0) throw new Error("parse não encontrou nenhum forte — página pode ter mudado de formato");
		res.setHeader("Cache-Control", "max-age=0, s-maxage=30");
		res.status(200).json(data);
	} catch (error) {
		console.error("wz-official: failed", error);
		res.status(502).json({ error: "Site oficial indisponível no momento." });
	}
}
