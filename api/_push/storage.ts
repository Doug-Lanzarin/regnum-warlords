import type { PushSubscription } from "@block65/webcrypto-web-push";
import type { AlertSettings } from "../../src/types/alertSettings";
import { emptyCategorySets, type CategorySets } from "./diff";
import type { BossState } from "./boss";

export interface SubscriberRecord {
	subscription: PushSubscription;
	settings: AlertSettings;
	updatedAt: number;
}

export interface PushState {
	categories: CategorySets;
	boss: BossState;
	lastTickAt: number | null;
}

export const DEFAULT_PUSH_STATE: PushState = { categories: emptyCategorySets(), boss: { alerted: [] }, lastTickAt: null };

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
