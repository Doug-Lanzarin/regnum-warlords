import type { PushSubscription } from "@block65/webcrypto-web-push";
import type { Realm } from "../../src/data/realms";
import type { AlertSettings } from "../../src/types/alertSettings";
import type { WzStatusData } from "../../src/types/wz";
import { emptyCategorySets, type CategorySets } from "./diff.js";
import type { BossState } from "./boss";

export interface SubscriberRecord {
	subscription: PushSubscription;
	settings: AlertSettings;
	updatedAt: number;
}

export interface PushState {
	categories: CategorySets;
	boss: BossState;
	/** Whether each realm's wall was vulnerable as of the previous tick —
	 *  compared against the freshly-computed value each tick to fire only on
	 *  the false->true transition, same idea as `categories`. Optional so
	 *  state persisted before this field existed still parses (`tick.ts`
	 *  falls back to all-false when absent). */
	wallVulnerable?: Record<Realm, boolean>;
	lastTickAt: number | null;
}

export const DEFAULT_PUSH_STATE: PushState = {
	categories: emptyCategorySets(),
	boss: { alerted: [] },
	wallVulnerable: { Alsius: false, Ignis: false, Syrtis: false },
	lastTickAt: null,
};

/** A full copy of the last WZ status `tick.ts` managed to fetch, kept
 *  around so `api/cort-proxy.ts` has something honest to fall back to when
 *  cort.ovh is unreachable from Vercel — the client already reads
 *  `WzStatusData.generated` (cort.ovh's own timestamp, untouched by this)
 *  to tell real-time data apart from a fallback snapshot, so no separate
 *  "is this stale" flag needs to travel with it. */
export interface LiveSnapshot {
	wstatus: WzStatusData | null;
	savedAt: number | null;
}

export const DEFAULT_LIVE_SNAPSHOT: LiveSnapshot = { wstatus: null, savedAt: null };

// Same "GitHub as a database" trick `api/notifications.ts` already uses —
// no Postgres/Redis to provision, and it's one less account for whoever
// runs this fork to set up. Writes are commits, so `tick.ts` only writes
// when something actually changed (see its own comment) to avoid
// spamming the repo's history every minute.
const OWNER = "Doug-Lanzarin";
const REPO = "regnum-warlords";
const BRANCH = "main";
const SUBSCRIBERS_PATH = "content/push-subscribers.json";
const STATE_PATH = "content/push-state.json";
const SNAPSHOT_PATH = "content/live-snapshot.json";

function githubToken(): string {
	const token = process.env.NOTIFICATIONS_GITHUB_TOKEN;
	if (!token) throw new Error("NOTIFICATIONS_GITHUB_TOKEN não configurado");
	return token;
}

async function githubRequest(path: string, init?: RequestInit): Promise<Response> {
	return fetch(`https://api.github.com${path}`, {
		...init,
		headers: {
			Authorization: `Bearer ${githubToken()}`,
			Accept: "application/vnd.github+json",
			"X-GitHub-Api-Version": "2022-11-28",
			...(init?.headers ?? {}),
		},
	});
}

async function readJsonFile<T>(path: string, fallback: T): Promise<{ data: T; sha: string | null }> {
	const res = await githubRequest(`/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`);
	if (res.status === 404) return { data: fallback, sha: null };
	if (!res.ok) throw new Error(`Falha ao ler ${path} do GitHub (${res.status})`);
	const json = (await res.json()) as { content: string; sha: string };
	const raw = Buffer.from(json.content, "base64").toString("utf-8");
	const parsed = raw.trim() ? (JSON.parse(raw) as T) : fallback;
	return { data: parsed, sha: json.sha };
}

async function writeJsonFile(path: string, data: unknown, sha: string | null, message: string): Promise<void> {
	const content = Buffer.from(JSON.stringify(data, null, "\t") + "\n", "utf-8").toString("base64");
	const res = await githubRequest(`/repos/${OWNER}/${REPO}/contents/${path}`, {
		method: "PUT",
		body: JSON.stringify({ message, content, branch: BRANCH, ...(sha ? { sha } : {}) }),
	});
	if (!res.ok) {
		const body = await res.text();
		throw new Error(`Falha ao salvar ${path} no GitHub (${res.status}): ${body}`);
	}
}

export async function readSubscribers(): Promise<{ subscribers: SubscriberRecord[]; sha: string | null }> {
	const { data, sha } = await readJsonFile<SubscriberRecord[]>(SUBSCRIBERS_PATH, []);
	return { subscribers: data, sha };
}

export async function writeSubscribers(subscribers: SubscriberRecord[], sha: string | null, message: string): Promise<void> {
	await writeJsonFile(SUBSCRIBERS_PATH, subscribers, sha, message);
}

/** `sha === null` means the state file doesn't exist yet — the very first
 *  tick ever, which callers should treat as "seed the baseline, don't
 *  alert" (same idea as the Cloudflare prototype's `null` KV read). */
export async function readState(): Promise<{ state: PushState; sha: string | null }> {
	const { data, sha } = await readJsonFile<PushState>(STATE_PATH, DEFAULT_PUSH_STATE);
	return { state: data, sha };
}

export async function writeState(state: PushState, sha: string | null, message: string): Promise<void> {
	await writeJsonFile(STATE_PATH, state, sha, message);
}

export async function readLiveSnapshot(): Promise<{ snapshot: LiveSnapshot; sha: string | null }> {
	const { data, sha } = await readJsonFile<LiveSnapshot>(SNAPSHOT_PATH, DEFAULT_LIVE_SNAPSHOT);
	return { snapshot: data, sha };
}

export async function writeLiveSnapshot(snapshot: LiveSnapshot, sha: string | null, message: string): Promise<void> {
	await writeJsonFile(SNAPSHOT_PATH, snapshot, sha, message);
}
