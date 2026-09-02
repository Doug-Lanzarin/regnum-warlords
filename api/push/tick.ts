// Vercel serverless function — the "cron" itself lives outside Vercel
// (its Hobby-plan Cron Jobs only run once a day, too coarse for this),
// on a free external pinger like cron-job.org hitting this endpoint every
// minute with the shared secret below. See README.md's push section.

import { BOSS_INFO } from "../../src/data/bossConstants";
import type { Realm } from "../../src/data/realms";
import type { AlertSettings } from "../../src/types/alertSettings";
import type { BossSpawnData } from "../../src/types/bosses";
import { computeFortStatuses, computeGemStatuses } from "../../src/features/wz/wzEngine";
import type { WzStatusData } from "../../src/types/wz";
import { detectBossEvents, type BossEvent } from "../_push/boss";
import { diffState, type CategoryEvents } from "../_push/diff";
import { sendPush, type PushNotificationPayload } from "../_push/push";
import { readState, readSubscribers, writeState, writeSubscribers, type PushState, type SubscriberRecord } from "../_push/storage";

interface VercelLikeRequest {
	method?: string;
	headers: Record<string, string | string[] | undefined>;
	query: Record<string, string | string[] | undefined>;
}

interface VercelLikeResponse {
	status(code: number): VercelLikeResponse;
	json(body: unknown): void;
}

const WZ_STATUS_URL = "https://cort.ovh/api/var/wstatus.json";
const BOSSES_URL = "https://cort.ovh/api/bin/bosses/bosses.php";

function isAuthorized(req: VercelLikeRequest): boolean {
	const expected = process.env.PUSH_TICK_SECRET?.trim();
	if (!expected) return false;
	const auth = req.headers.authorization;
	const bearer = typeof auth === "string" && auth.startsWith("Bearer ") ? auth.slice(7).trim() : null;
	const queryToken = typeof req.query.secret === "string" ? req.query.secret.trim() : null;
	return bearer === expected || queryToken === expected;
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
		const info = BOSS_INFO[be.bossKey];
		const spawnClock = new Date(be.spawnSeconds * 1000).toLocaleTimeString("pt-BR", {
			hour: "2-digit",
			minute: "2-digit",
			timeZone: "America/Sao_Paulo",
		});
		messages.push({ title: `${info.name} nasce em ${be.minutes} min`, body: `Spawn previsto às ${spawnClock}.`, url: "/bosses" });
	}

	return messages;
}

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
	if (!isAuthorized(req)) {
		res.status(401).json({ error: "Não autorizado." });
		return;
	}

	const vapidSubject = process.env.VAPID_SUBJECT;
	const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
	const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
	if (!vapidSubject || !vapidPublicKey || !vapidPrivateKey) {
		res.status(500).json({ error: "VAPID_SUBJECT/VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY não configurados." });
		return;
	}

	try {
		const [wzRes, bossRes] = await Promise.all([fetch(WZ_STATUS_URL), fetch(BOSSES_URL)]);
		if (!wzRes.ok || !bossRes.ok) {
			console.error("push tick: cort.ovh fetch failed", wzRes.status, bossRes.status);
			res.status(502).json({ error: "cort.ovh indisponível." });
			return;
		}
		const wzData = (await wzRes.json()) as WzStatusData;
		const bossData = (await bossRes.json()) as BossSpawnData;

		const forts = computeFortStatuses(wzData);
		const gems = computeGemStatuses(wzData);

		const { state: prevState, sha: stateSha } = await readState();
		const isFirstTick = stateSha === null;
		const { next: nextCategories, eventsByRealm } = diffState(forts, gems, prevState.categories);

		const now = Date.now();
		const { next: nextBossState, events: bossEvents } = detectBossEvents(bossData, now, prevState.boss);

		const nextState: PushState = { categories: nextCategories, boss: nextBossState, lastTickAt: now };
		// Only commit when the persisted shape actually changed — every tick
		// recomputing identical sets (the common case: nothing happened this
		// minute) would otherwise be a commit a minute, forever.
		const stateChanged =
			JSON.stringify(nextState.categories) !== JSON.stringify(prevState.categories) ||
			JSON.stringify(nextState.boss) !== JSON.stringify(prevState.boss);
		if (stateChanged || isFirstTick) {
			await writeState(nextState, stateSha, "push: atualiza snapshot da WZ/épicos");
		}

		if (isFirstTick) {
			res.status(200).json({ ok: true, seeded: true });
			return;
		}

		const { subscribers, sha: subsSha } = await readSubscribers();
		if (subscribers.length === 0) {
			res.status(200).json({ ok: true, sent: 0 });
			return;
		}

		const vapid = { subject: vapidSubject, publicKey: vapidPublicKey, privateKey: vapidPrivateKey };
		const stillValid: SubscriberRecord[] = [];
		let anyExpired = false;
		let sent = 0;

		for (const sub of subscribers) {
			const messages = buildMessagesFor(sub.settings, eventsByRealm, bossEvents);
			let expired = false;
			for (const message of messages) {
				const result = await sendPush(sub.subscription, vapid, message);
				if (result.ok) sent++;
				if (result.expired) {
					expired = true;
					break;
				}
			}
			if (expired) anyExpired = true;
			else stillValid.push(sub);
		}

		if (anyExpired) {
			await writeSubscribers(stillValid, subsSha, "push: remove assinaturas expiradas");
		}

		res.status(200).json({ ok: true, sent, subscribers: subscribers.length });
	} catch (err) {
		console.error("push tick error:", err);
		res.status(500).json({ error: "Erro ao processar tick." });
	}
}
