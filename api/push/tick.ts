// Vercel serverless function — the "cron" itself lives outside Vercel
// (its Hobby-plan Cron Jobs only run once a day, too coarse for this),
// on a free external pinger like cron-job.org hitting this endpoint every
// minute with the shared secret below. See README.md's push section.

import { bossName } from "../../src/data/bossConstants.js";
import { formatFortLabel } from "../../src/data/fortKind.js";
import type { Realm } from "../../src/data/realms";
import { translate } from "../../src/i18n/translate.js";
import type { AlertSettings } from "../../src/types/alertSettings";
import type { BossSpawnData } from "../../src/types/bosses";
import { computeFortStatuses, computeGemStatuses } from "../../src/features/wz/wzEngine.js";
import { computeWallVulnerability } from "../../src/features/wz/wzEventsEngine.js";
import type { WzEvent, WzEventsDumpEntry, WzStatusData } from "../../src/types/wz";
import { detectBossEvents, type BossEvent } from "../_push/boss.js";
import { diffState, type CategoryEvent, type CategoryEvents } from "../_push/diff.js";
import { sendPush, type PushNotificationPayload } from "../_push/push.js";
import { readState, readSubscribers, writeState, writeSubscribers, type PushState, type SubscriberRecord } from "../_push/storage.js";
import { parseWarStatusPage } from "../wz-official.js";

/** A wall that just crossed from "not vulnerable" to "vulnerable" this
 *  tick — see `buildMessagesFor`'s two directions (defender vs aggressor). */
export interface WallVulnerableEvent {
	homeRealm: Realm;
	aggressor: Realm;
}

export interface VercelLikeRequest {
	method?: string;
	headers: Record<string, string | string[] | undefined>;
	query: Record<string, string | string[] | undefined>;
}

interface VercelLikeResponse {
	status(code: number): VercelLikeResponse;
	json(body: unknown): void;
	setHeader(name: string, value: string): void;
}

// Fort/gem status comes straight from championsofregnum.com now, same as
// the client (see api/wz-official.ts) — cort.ovh has no official
// alternative for bosses/events, so those two stay put.
const OFFICIAL_WZ_URL = "https://www.championsofregnum.com/index.php?l=1&sec=3";
const BOSSES_URL = "https://cort.ovh/api/bin/bosses/bosses.php";
const EVENTS_URL = "https://cort.ovh/api/var/events.json";

// Same reasoning as api/cort-proxy.ts's CORT_USER_AGENT: Node's default
// fetch() User-Agent looks exactly like the kind of thing a bot-detection
// layer flags first. Costs nothing to send something identifiable instead.
const CORT_USER_AGENT = "RegnumWarlords/1.0 (+https://regnum-warlords.vercel.app)";

export function isAuthorized(req: VercelLikeRequest): boolean {
	const expected = process.env.PUSH_TICK_SECRET?.trim();
	if (!expected) return false;
	const auth = req.headers.authorization;
	const bearer = typeof auth === "string" && auth.startsWith("Bearer ") ? auth.slice(7).trim() : null;
	const queryToken = typeof req.query.secret === "string" ? req.query.secret.trim() : null;
	return bearer === expected || queryToken === expected;
}

const LOCALE_FOR_LANG: Record<AlertSettings["lang"], string> = { pt: "pt-BR", en: "en-US", es: "es-ES" };

/** Resolves an event's display name in the subscriber's language — forts
 *  go through `formatFortLabel` (suffix-strip + Great Wall translation),
 *  gems build "{n}"-style labels from their index. See `diff.ts`'s
 *  `CategoryEvent` doc comment for why this can't be baked in earlier. */
export function eventDisplayName(e: CategoryEvent, lang: AlertSettings["lang"]): string {
	if (e.gemIndex !== undefined) return translate(lang, "alerts.gemLabel", { n: e.gemIndex + 1 });
	return formatFortLabel(e.name, lang);
}

export function buildMessagesFor(
	settings: AlertSettings,
	eventsByRealm: Record<Realm, CategoryEvents>,
	bossEvents: BossEvent[],
	wallVulnerableEvents: WallVulnerableEvent[],
): PushNotificationPayload[] {
	const messages: PushNotificationPayload[] = [];
	const myRealm = settings.myRealm;
	const lang = settings.lang ?? "pt";

	if (myRealm) {
		const events = eventsByRealm[myRealm];
		if (settings.fortLostAlerts) {
			for (const e of events.fortLost ?? []) {
				messages.push({ title: translate(lang, "alerts.msgLost", { realm: myRealm, name: eventDisplayName(e, lang), otherRealm: e.otherRealm ?? "" }), body: "", url: "/" });
			}
		}
		if (settings.wallLostAlerts) {
			for (const e of events.wallLost ?? []) {
				messages.push({ title: translate(lang, "alerts.msgLost", { realm: myRealm, name: eventDisplayName(e, lang), otherRealm: e.otherRealm ?? "" }), body: "", url: "/" });
			}
		}
		if (settings.fortCapturedAlerts) {
			for (const e of events.fortCaptured ?? []) {
				messages.push({ title: translate(lang, "alerts.msgCaptured", { realm: myRealm, name: eventDisplayName(e, lang) }), body: "", url: "/" });
			}
		}
		if (settings.wallCapturedAlerts) {
			for (const e of events.wallCaptured ?? []) {
				messages.push({ title: translate(lang, "alerts.msgCaptured", { realm: myRealm, name: eventDisplayName(e, lang) }), body: "", url: "/" });
			}
		}
		if (settings.gemLostAlerts) {
			for (const e of events.gemLost ?? []) {
				const name = eventDisplayName(e, lang);
				const title = e.otherRealm
					? translate(lang, "alerts.msgLost", { realm: myRealm, name, otherRealm: e.otherRealm })
					: translate(lang, "alerts.msgLostNoOwner", { realm: myRealm, name });
				messages.push({ title, body: "", url: "/" });
			}
		}
		if (settings.gemCapturedAlerts) {
			for (const e of events.gemCaptured ?? []) {
				messages.push({ title: translate(lang, "alerts.msgCaptured", { realm: myRealm, name: eventDisplayName(e, lang) }), body: "", url: "/" });
			}
		}
		if (settings.fortRecoveredAlerts) {
			for (const e of events.fortRecovered ?? []) {
				messages.push({ title: translate(lang, "alerts.msgRecovered", { realm: myRealm, name: eventDisplayName(e, lang) }), body: "", url: "/" });
			}
		}
		if (settings.wallRecoveredAlerts) {
			for (const e of events.wallRecovered ?? []) {
				messages.push({ title: translate(lang, "alerts.msgRecovered", { realm: myRealm, name: eventDisplayName(e, lang) }), body: "", url: "/" });
			}
		}
		if (settings.gemRecoveredAlerts) {
			for (const e of events.gemRecovered ?? []) {
				messages.push({ title: translate(lang, "alerts.msgRecovered", { realm: myRealm, name: eventDisplayName(e, lang) }), body: "", url: "/" });
			}
		}
		for (const e of wallVulnerableEvents) {
			if (e.homeRealm === myRealm && settings.wallVulnerableMineAlerts) {
				messages.push({ title: translate(lang, "alerts.msgWallVulnerableMine", { realm: e.homeRealm, otherRealm: e.aggressor }), body: "", url: "/" });
			}
			if (e.aggressor === myRealm && settings.wallVulnerableEnemyAlerts) {
				messages.push({ title: translate(lang, "alerts.msgWallVulnerableEnemy", { realm: e.homeRealm }), body: "", url: "/" });
			}
		}
	}

	for (const be of bossEvents) {
		if (!settings.bossAlertMinutes.includes(be.minutes)) continue;
		const spawnClock = new Date(be.spawnSeconds * 1000).toLocaleTimeString(LOCALE_FOR_LANG[lang], {
			hour: "2-digit",
			minute: "2-digit",
			timeZone: "America/Sao_Paulo",
		});
		messages.push({
			title: translate(lang, "alerts.bossSpawnTitle", { boss: bossName(be.bossKey, lang), minutes: be.minutes }),
			body: translate(lang, "alerts.bossSpawnBody", { time: spawnClock }),
			url: "/bosses",
		});
	}

	return messages;
}

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
	// This tick's whole point is to reflect the live WZ/boss state on every
	// hit — a cached response (browsers, most visibly Safari/iOS, will
	// otherwise happily replay an old GET response for the exact same URL)
	// makes debugging via a manual visit misleading, showing a stale result
	// as if nothing had changed.
	res.setHeader("Cache-Control", "no-store");

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
		// Anything that can go wrong getting real WZ/boss data out of
		// cort.ovh — fetch() itself rejecting (timeout, connection reset),
		// a non-2xx status, or a 200 whose body isn't valid JSON (a WAF
		// challenge page, a truncated response) — used to either propagate
		// past the old `!res.ok` check or throw during .json() and fall
		// through to the generic catch-all below, coming back as a 500.
		// That's not just cosmetic: cron-job.org auto-disables a cron job
		// after enough consecutive failures, and a 500 reads as "our code
		// is broken" rather than "cort.ovh is unreachable right now" —
		// which is exactly what happened (see git history/README for the
		// cort.ovh-reachability context this fetch already assumes). The
		// whole fetch+parse sequence is caught here as one unit so any of
		// those failure modes becomes the same graceful 502, keeping a bad
		// run a transient failure instead of getting the cron switched off.
		let wzData: WzStatusData;
		let bossData: BossSpawnData;
		try {
			const [wzRes, bossRes] = await Promise.all([
				fetch(OFFICIAL_WZ_URL, { signal: AbortSignal.timeout(6000), headers: { "User-Agent": CORT_USER_AGENT } }),
				fetch(BOSSES_URL, { signal: AbortSignal.timeout(6000), headers: { "User-Agent": CORT_USER_AGENT } }),
			]);
			if (!wzRes.ok || !bossRes.ok) {
				throw new Error(`fetch respondeu wz=${wzRes.status} bosses=${bossRes.status}`);
			}
			wzData = parseWarStatusPage(await wzRes.text());
			if (wzData.forts.length === 0) throw new Error("parse não encontrou nenhum forte — página oficial pode ter mudado de formato");
			bossData = (await bossRes.json()) as BossSpawnData;
		} catch (err) {
			console.error("push tick: WZ/boss fetch/parse failed", err);
			res.status(502).json({ error: "Fonte de dados indisponível." });
			return;
		}
		// Wall vulnerability is the only thing that needs this ~10-day raw
		// event dump — fails soft (falls back to "no history this tick", so
		// no wall-vulnerable events fire) rather than taking down fort/gem/
		// boss alerts too if cort.ovh's events endpoint has a bad moment.
		const events = await fetch(EVENTS_URL, { signal: AbortSignal.timeout(6000), headers: { "User-Agent": CORT_USER_AGENT } })
			.then((r) => (r.ok ? (r.json() as Promise<WzEventsDumpEntry[]>) : []))
			.then((entries) => entries.filter((e): e is WzEvent => "type" in e))
			.catch(() => [] as WzEvent[]);

		const forts = computeFortStatuses(wzData);
		const gems = computeGemStatuses(wzData);

		const { state: prevState, sha: stateSha } = await readState();
		const isFirstTick = stateSha === null;
		const { next: nextCategories, eventsByRealm } = diffState(forts, gems, prevState.categories);

		const now = Date.now();

		const { next: nextBossState, events: bossEvents } = detectBossEvents(bossData, now, prevState.boss);

		const prevWallVulnerable = prevState.wallVulnerable ?? { Alsius: false, Ignis: false, Syrtis: false };
		const nextWallVulnerable: Record<Realm, boolean> = { Alsius: false, Ignis: false, Syrtis: false };
		const wallVulnerableEvents: WallVulnerableEvent[] = [];
		for (const w of computeWallVulnerability(forts, events, now)) {
			nextWallVulnerable[w.homeRealm] = w.isVulnerable;
			if (w.isVulnerable && !prevWallVulnerable[w.homeRealm] && w.aggressor) {
				wallVulnerableEvents.push({ homeRealm: w.homeRealm, aggressor: w.aggressor });
			}
		}

		const nextState: PushState = { categories: nextCategories, boss: nextBossState, wallVulnerable: nextWallVulnerable, lastTickAt: now };
		// Only commit when the persisted shape actually changed — every tick
		// recomputing identical sets (the common case: nothing happened this
		// minute) would otherwise be a commit a minute, forever.
		const stateChanged =
			JSON.stringify(nextState.categories) !== JSON.stringify(prevState.categories) ||
			JSON.stringify(nextState.boss) !== JSON.stringify(prevState.boss) ||
			JSON.stringify(nextState.wallVulnerable) !== JSON.stringify(prevWallVulnerable);
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
			const messages = buildMessagesFor(sub.settings, eventsByRealm, bossEvents, wallVulnerableEvents);
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
		// Include the actual error in the response, not just server-side logs
		// — this endpoint is Bearer-secret-protected (cron-job.org + whoever
		// checks its dashboard), and cron-job.org's own "Details" view was
		// the only way available to see what was actually throwing here
		// after two rounds of "should be fixed" that weren't.
		res.status(500).json({
			error: "Erro ao processar tick.",
			detail: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
		});
	}
}
