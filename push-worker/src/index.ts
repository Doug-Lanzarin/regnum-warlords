import type { PushSubscription, VapidKeys } from "@block65/webcrypto-web-push";
import { BOSS_INFO } from "../../src/data/bossConstants";
import type { Realm } from "../../src/data/realms";
import type { AlertSettings } from "../../src/types/alertSettings";
import type { BossKey, BossSpawnData } from "../../src/types/bosses";
import { computeFortStatuses, computeGemStatuses } from "../../src/features/wz/wzEngine";
import type { WzStatusData } from "../../src/types/wz";
import { detectBossEvents, type BossEvent } from "./boss";
import { diffState, type CategoryEvents } from "./diff";
import { emptyCategorySets, readBossState, readCategorySets, readSubscribers, writeBossState, writeCategorySets, writeSubscribers, type SubscriberRecord } from "./kv";
import { sendPush, type PushNotificationPayload } from "./push";

export interface Env {
	PUSH_KV: KVNamespace;
	VAPID_PRIVATE_KEY: string;
	VAPID_PUBLIC_KEY: string;
	VAPID_SUBJECT: string;
	ALLOWED_ORIGIN: string;
}

const WZ_STATUS_URL = "https://cort.ovh/api/var/wstatus.json";
const BOSSES_URL = "https://cort.ovh/api/bin/bosses/bosses.php";

function corsHeaders(origin: string): HeadersInit {
	return {
		"Access-Control-Allow-Origin": origin,
		"Access-Control-Allow-Methods": "POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
	};
}

function jsonResponse(body: unknown, status: number, origin: string): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
	});
}

function isValidSubscription(value: unknown): value is PushSubscription {
	if (!value || typeof value !== "object") return false;
	const sub = value as Record<string, unknown>;
	if (typeof sub.endpoint !== "string" || !sub.endpoint) return false;
	const keys = sub.keys as Record<string, unknown> | undefined;
	return !!keys && typeof keys.p256dh === "string" && typeof keys.auth === "string";
}

function isValidSettings(value: unknown): value is AlertSettings {
	if (!value || typeof value !== "object") return false;
	const s = value as Record<string, unknown>;
	return Array.isArray(s.bossAlertMinutes);
}

async function handleSubscribe(request: Request, env: Env): Promise<Response> {
	const body = (await request.json().catch(() => null)) as { subscription?: unknown; settings?: unknown } | null;
	if (!body || !isValidSubscription(body.subscription) || !isValidSettings(body.settings)) {
		return jsonResponse({ error: "Corpo inválido." }, 400, env.ALLOWED_ORIGIN);
	}
	const subscription = body.subscription;
	const settings = body.settings;

	const subs = await readSubscribers(env.PUSH_KV);
	const withoutThisEndpoint = subs.filter((s) => s.subscription.endpoint !== subscription.endpoint);
	const record: SubscriberRecord = { subscription, settings, updatedAt: Date.now() };
	await writeSubscribers(env.PUSH_KV, [...withoutThisEndpoint, record]);
	return jsonResponse({ ok: true }, 200, env.ALLOWED_ORIGIN);
}

async function handleUnsubscribe(request: Request, env: Env): Promise<Response> {
	const body = (await request.json().catch(() => null)) as { endpoint?: unknown } | null;
	if (!body || typeof body.endpoint !== "string" || !body.endpoint) {
		return jsonResponse({ error: "endpoint é obrigatório." }, 400, env.ALLOWED_ORIGIN);
	}
	const subs = await readSubscribers(env.PUSH_KV);
	await writeSubscribers(
		env.PUSH_KV,
		subs.filter((s) => s.subscription.endpoint !== body.endpoint),
	);
	return jsonResponse({ ok: true }, 200, env.ALLOWED_ORIGIN);
}

function buildMessagesFor(
	settings: AlertSettings,
	eventsByRealm: Record<Realm, CategoryEvents>,
	bossEvents: BossEvent[],
): PushNotificationPayload[] {
	const messages: PushNotificationPayload[] = [];
	const myRealm = settings.myRealm;

	if (myRealm) {
		const events = eventsByRealm[myRealm];
		if (settings.fortLostAlerts) {
			for (const e of events.fortLost ?? []) {
				messages.push({ title: `${e.name} perdido!`, body: `${e.otherRealm} capturou ${e.name}, território de ${myRealm}.`, url: "/" });
			}
		}
		if (settings.wallLostAlerts) {
			for (const e of events.wallLost ?? []) {
				messages.push({ title: `${e.name} perdida!`, body: `${e.otherRealm} invadiu ${e.name}, território de ${myRealm}.`, url: "/" });
			}
		}
		if (settings.fortCapturedAlerts) {
			for (const e of events.fortCaptured ?? []) {
				messages.push({ title: `${myRealm} tomou ${e.name}!`, body: `Território de ${e.otherRealm} agora sob controle de ${myRealm}.`, url: "/" });
			}
		}
		if (settings.wallCapturedAlerts) {
			for (const e of events.wallCaptured ?? []) {
				messages.push({ title: `${myRealm} capturou ${e.name}!`, body: `Território de ${e.otherRealm} agora sob controle de ${myRealm}.`, url: "/" });
			}
		}
		if (settings.gemLostAlerts) {
			for (const e of events.gemLost ?? []) {
				const body = e.otherRealm ? `${e.otherRealm} tomou a gema, território de ${myRealm}.` : `A gema ficou sem dono, território de ${myRealm}.`;
				messages.push({ title: `${e.name} perdida!`, body, url: "/" });
			}
		}
		if (settings.gemCapturedAlerts) {
			for (const e of events.gemCaptured ?? []) {
				messages.push({ title: `${myRealm} capturou a ${e.name}!`, body: `Território de ${e.otherRealm} agora sob controle de ${myRealm}.`, url: "/" });
			}
		}
	}

	for (const be of bossEvents) {
		if (!settings.bossAlertMinutes.includes(be.minutes)) continue;
		const info = BOSS_INFO[be.bossKey as BossKey];
		const spawnClock = new Date(be.spawnSeconds * 1000).toLocaleTimeString("pt-BR", {
			hour: "2-digit",
			minute: "2-digit",
			timeZone: "America/Sao_Paulo",
		});
		messages.push({ title: `${info.name} nasce em ${be.minutes} min`, body: `Spawn previsto às ${spawnClock}.`, url: "/bosses" });
	}

	return messages;
}

async function runTick(env: Env): Promise<void> {
	const [wzRes, bossRes] = await Promise.all([fetch(WZ_STATUS_URL), fetch(BOSSES_URL)]);
	if (!wzRes.ok || !bossRes.ok) {
		console.error("push-worker: cort.ovh fetch failed", wzRes.status, bossRes.status);
		return;
	}
	const wzData = (await wzRes.json()) as WzStatusData;
	const bossData = (await bossRes.json()) as BossSpawnData;

	const forts = computeFortStatuses(wzData);
	const gems = computeGemStatuses(wzData);

	const storedSets = await readCategorySets(env.PUSH_KV);
	const isFirstTick = storedSets === null;
	const { next: nextSets, eventsByRealm } = diffState(forts, gems, storedSets ?? emptyCategorySets());
	await writeCategorySets(env.PUSH_KV, nextSets);

	const now = Date.now();
	const bossState = await readBossState(env.PUSH_KV);
	const { next: nextBossState, events: bossEvents } = detectBossEvents(bossData, now, bossState);
	await writeBossState(env.PUSH_KV, nextBossState);

	// First tick ever only seeds the baseline — nothing to alert on yet.
	if (isFirstTick) return;

	const subs = await readSubscribers(env.PUSH_KV);
	if (subs.length === 0) return;

	const vapid: VapidKeys = { subject: env.VAPID_SUBJECT, publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY };
	const stillValid: SubscriberRecord[] = [];
	let anyExpired = false;

	for (const sub of subs) {
		const messages = buildMessagesFor(sub.settings, eventsByRealm, bossEvents);
		let expired = false;
		for (const message of messages) {
			const result = await sendPush(sub.subscription, vapid, message);
			if (result.expired) {
				expired = true;
				break;
			}
		}
		if (expired) anyExpired = true;
		else stillValid.push(sub);
	}

	if (anyExpired) await writeSubscribers(env.PUSH_KV, stillValid);
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders(env.ALLOWED_ORIGIN) });

		const url = new URL(request.url);
		try {
			if (request.method === "POST" && url.pathname === "/subscribe") return await handleSubscribe(request, env);
			if (request.method === "POST" && url.pathname === "/unsubscribe") return await handleUnsubscribe(request, env);
		} catch (err) {
			console.error("push-worker: fetch handler error", err);
			return jsonResponse({ error: "Erro interno." }, 500, env.ALLOWED_ORIGIN);
		}
		return jsonResponse({ error: "Não encontrado." }, 404, env.ALLOWED_ORIGIN);
	},

	async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
		ctx.waitUntil(runTick(env));
	},
} satisfies ExportedHandler<Env>;
