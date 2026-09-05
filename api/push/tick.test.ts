import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import handler, { buildMessagesFor, eventDisplayName, isAuthorized, type VercelLikeRequest, type WallVulnerableEvent } from "./tick";
import type { CategoryEvent, CategoryEvents } from "../_push/diff";
import type { BossEvent } from "../_push/boss";
import type { AlertSettings } from "../../src/types/alertSettings";

// Notifications are paused (see notificationsPaused.ts) — tick.ts's real
// handler now short-circuits before ever touching cort.ovh, which would
// make every test below about fetch-failure handling moot. Force the flag
// back to its pre-pause value just for this file (vi.mock is hoisted above
// these imports regardless of where it's written), so the fetch/parse-error
// handling this file exists to guard stays covered; the paused short-circuit
// itself has its own test in tick.paused.test.ts, against the real
// (unmocked) flag.
vi.mock("../../src/features/alerts/notificationsPaused.js", () => ({ NOTIFICATIONS_PAUSED: false }));

function settings(overrides: Partial<AlertSettings>): AlertSettings {
	return {
		myRealm: "Ignis",
		lang: "pt",
		fortCapturedAlerts: false,
		fortLostAlerts: false,
		fortRecoveredAlerts: false,
		wallCapturedAlerts: false,
		wallLostAlerts: false,
		wallRecoveredAlerts: false,
		wallVulnerableMineAlerts: false,
		wallVulnerableEnemyAlerts: false,
		gemCapturedAlerts: false,
		gemLostAlerts: false,
		gemRecoveredAlerts: false,
		bossAlertMinutes: [],
		...overrides,
	};
}

function emptyEventsByRealm(): Record<"Alsius" | "Ignis" | "Syrtis", CategoryEvents> {
	return { Alsius: {}, Ignis: {}, Syrtis: {} };
}

describe("eventDisplayName", () => {
	it("formats a fort event's raw name through formatFortLabel for the given language", () => {
		const e: CategoryEvent = { name: "Great Wall of Alsius (3)", otherRealm: "Ignis" };
		expect(eventDisplayName(e, "pt")).toBe("Muralha de Alsius");
		expect(eventDisplayName(e, "en")).toBe("Great Wall of Alsius");
		expect(eventDisplayName(e, "es")).toBe("Gran Muralla de Alsius");
	});

	it("formats a gem event from its index instead of its (empty) name field", () => {
		const e: CategoryEvent = { name: "", gemIndex: 2, otherRealm: null };
		expect(eventDisplayName(e, "pt")).toBe("Gema 3");
		expect(eventDisplayName(e, "en")).toBe("Gem 3");
	});
});

describe("buildMessagesFor", () => {
	it("builds nothing when the subscriber has no realm chosen", () => {
		const s = settings({ myRealm: null, fortCapturedAlerts: true });
		const events = emptyEventsByRealm();
		events.Ignis.fortCaptured = [{ name: "Imperia Castle (1)", otherRealm: "Syrtis" }];
		expect(buildMessagesFor(s, events, [], [])).toEqual([]);
	});

	it("builds nothing for a category the subscriber didn't opt into", () => {
		const s = settings({ fortCapturedAlerts: false });
		const events = emptyEventsByRealm();
		events.Ignis.fortCaptured = [{ name: "Imperia Castle (1)", otherRealm: "Syrtis" }];
		expect(buildMessagesFor(s, events, [], [])).toEqual([]);
	});

	it("builds a localized 'captured' message only for the subscriber's own realm", () => {
		const s = settings({ myRealm: "Ignis", fortCapturedAlerts: true, lang: "en" });
		const events = emptyEventsByRealm();
		events.Ignis.fortCaptured = [{ name: "Imperia Castle (1)", otherRealm: "Syrtis" }];
		events.Alsius.fortCaptured = [{ name: "Some Other Fort (2)", otherRealm: "Syrtis" }];

		const messages = buildMessagesFor(s, events, [], []);
		expect(messages).toEqual([{ title: "Ignis captured Imperia Castle", body: "", url: "/" }]);
	});

	it("builds a 'lost' message with the invading realm's name", () => {
		const s = settings({ myRealm: "Syrtis", fortLostAlerts: true, lang: "pt" });
		const events = emptyEventsByRealm();
		events.Syrtis.fortLost = [{ name: "Imperia Castle (1)", otherRealm: "Ignis" }];

		expect(buildMessagesFor(s, events, [], [])).toEqual([{ title: "Syrtis perdeu Imperia Castle para Ignis", body: "", url: "/" }]);
	});

	it("builds a gem-lost message without an owner clause when the gem has no owner", () => {
		const s = settings({ myRealm: "Alsius", gemLostAlerts: true, lang: "pt" });
		const events = emptyEventsByRealm();
		events.Alsius.gemLost = [{ name: "", gemIndex: 0, otherRealm: null }];

		expect(buildMessagesFor(s, events, [], [])).toEqual([{ title: "Alsius perdeu Gema 1", body: "", url: "/" }]);
	});

	it("builds a wall message via the Great Wall translation, per subscriber language", () => {
		const s = settings({ myRealm: "Alsius", wallCapturedAlerts: true, lang: "es" });
		const events = emptyEventsByRealm();
		events.Alsius.wallCaptured = [{ name: "Great Wall of Syrtis (2)", otherRealm: "Syrtis" }];

		expect(buildMessagesFor(s, events, [], [])).toEqual([
			{ title: "Alsius capturó Gran Muralla de Syrtis", body: "", url: "/" },
		]);
	});

	it("builds a recovered message with no 'otherRealm' clause at all", () => {
		const s = settings({ myRealm: "Ignis", fortRecoveredAlerts: true, lang: "en" });
		const events = emptyEventsByRealm();
		events.Ignis.fortRecovered = [{ name: "Imperia Castle (1)", otherRealm: null }];

		expect(buildMessagesFor(s, events, [], [])).toEqual([{ title: "Ignis recovered Imperia Castle", body: "", url: "/" }]);
	});

	it("builds boss messages only for thresholds the subscriber opted into", () => {
		const s = settings({ bossAlertMinutes: [30] });
		const bossEvents: BossEvent[] = [
			{ bossKey: "daen", minutes: 60, spawnSeconds: 1_000_000 },
			{ bossKey: "daen", minutes: 30, spawnSeconds: 1_000_000 },
		];
		const messages = buildMessagesFor(s, emptyEventsByRealm(), bossEvents, []);
		expect(messages).toHaveLength(1);
		expect(messages[0].title).toBe("Daen Rha nasce em 30 min");
		expect(messages[0].url).toBe("/bosses");
	});

	it("emits one message per event when several of the same category fire in one tick", () => {
		const s = settings({ myRealm: "Ignis", fortCapturedAlerts: true, lang: "pt" });
		const events = emptyEventsByRealm();
		events.Ignis.fortCaptured = [
			{ name: "Fort A (1)", otherRealm: "Alsius" },
			{ name: "Fort B (2)", otherRealm: "Syrtis" },
		];
		expect(buildMessagesFor(s, events, [], [])).toHaveLength(2);
	});

	it("builds the defensive message when my own realm's wall becomes vulnerable", () => {
		const s = settings({ myRealm: "Syrtis", wallVulnerableMineAlerts: true, lang: "pt" });
		const wallEvents: WallVulnerableEvent[] = [{ homeRealm: "Syrtis", aggressor: "Ignis" }];
		expect(buildMessagesFor(s, emptyEventsByRealm(), [], wallEvents)).toEqual([
			{ title: "Muralha de Syrtis vulnerável — Ignis pode invadir!", body: "", url: "/" },
		]);
	});

	it("builds the offensive message when I'm the one who made another realm's wall vulnerable", () => {
		const s = settings({ myRealm: "Ignis", wallVulnerableEnemyAlerts: true, lang: "pt" });
		const wallEvents: WallVulnerableEvent[] = [{ homeRealm: "Syrtis", aggressor: "Ignis" }];
		expect(buildMessagesFor(s, emptyEventsByRealm(), [], wallEvents)).toEqual([
			{ title: "Você deixou a muralha de Syrtis vulnerável!", body: "", url: "/" },
		]);
	});

	it("stays silent on a wall-vulnerable event that's neither mine nor caused by me", () => {
		const s = settings({ myRealm: "Alsius", wallVulnerableMineAlerts: true, wallVulnerableEnemyAlerts: true });
		const wallEvents: WallVulnerableEvent[] = [{ homeRealm: "Syrtis", aggressor: "Ignis" }];
		expect(buildMessagesFor(s, emptyEventsByRealm(), [], wallEvents)).toEqual([]);
	});

	it("builds nothing for a wall-vulnerable event when the matching toggle is off", () => {
		const s = settings({ myRealm: "Syrtis", wallVulnerableMineAlerts: false });
		const wallEvents: WallVulnerableEvent[] = [{ homeRealm: "Syrtis", aggressor: "Ignis" }];
		expect(buildMessagesFor(s, emptyEventsByRealm(), [], wallEvents)).toEqual([]);
	});
});

describe("isAuthorized", () => {
	const ORIGINAL_SECRET = process.env.PUSH_TICK_SECRET;

	beforeAll(() => {
		process.env.PUSH_TICK_SECRET = "s3cr3t";
	});

	afterAll(() => {
		process.env.PUSH_TICK_SECRET = ORIGINAL_SECRET;
	});

	function req(overrides: Partial<VercelLikeRequest>): VercelLikeRequest {
		return { headers: {}, query: {}, ...overrides };
	}

	it("accepts a matching Bearer token", () => {
		expect(isAuthorized(req({ headers: { authorization: "Bearer s3cr3t" } }))).toBe(true);
	});

	it("accepts a matching ?secret= query param", () => {
		expect(isAuthorized(req({ query: { secret: "s3cr3t" } }))).toBe(true);
	});

	it("rejects a wrong or missing secret", () => {
		expect(isAuthorized(req({ headers: { authorization: "Bearer nope" } }))).toBe(false);
		expect(isAuthorized(req({}))).toBe(false);
	});
});

describe("tick handler — cort.ovh fetch failures", () => {
	const ORIGINAL_ENV = {
		PUSH_TICK_SECRET: process.env.PUSH_TICK_SECRET,
		VAPID_SUBJECT: process.env.VAPID_SUBJECT,
		VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY,
		VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
	};

	beforeAll(() => {
		process.env.PUSH_TICK_SECRET = "s3cr3t";
		process.env.VAPID_SUBJECT = "mailto:test@example.com";
		process.env.VAPID_PUBLIC_KEY = "pub";
		process.env.VAPID_PRIVATE_KEY = "priv";
	});

	afterAll(() => {
		for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
			if (value === undefined) delete process.env[key];
			else process.env[key] = value;
		}
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	function mockRes() {
		const result: { status: number | null; json: unknown } = { status: null, json: null };
		const res = {
			status(code: number) {
				result.status = code;
				return res;
			},
			json(body: unknown) {
				result.json = body;
			},
			setHeader() {},
		};
		return { res, result };
	}

	// This is the actual bug that got the cron auto-disabled by cron-job.org:
	// a genuine network failure (not just a non-2xx status) made fetch()
	// itself reject, which used to fall through to the generic catch-all and
	// come back as a 500 — read by cron-job.org as "this endpoint is broken"
	// rather than "cort.ovh is unreachable right now", so it switched the
	// cron off after enough of these in a row.
	it("returns a graceful 502 — not a 500 — when the cort.ovh fetch itself rejects (timeout/connection reset)", async () => {
		const fetchMock = vi.fn().mockRejectedValue(new Error("network reset"));
		vi.stubGlobal("fetch", fetchMock);

		const { res, result } = mockRes();
		await handler({ method: "GET", headers: { authorization: "Bearer s3cr3t" }, query: {} }, res);

		expect(result.status).toBe(502);
	});

	it("still returns a graceful 502 when cort.ovh responds with a bad HTTP status (not rejected, just unhealthy)", async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) });
		vi.stubGlobal("fetch", fetchMock);

		const { res, result } = mockRes();
		await handler({ method: "GET", headers: { authorization: "Bearer s3cr3t" }, query: {} }, res);

		expect(result.status).toBe(502);
	});

	// The gap the first fix missed: a 200 whose body isn't valid JSON (a WAF
	// challenge page, a truncated response) makes .json() itself throw —
	// that's outside a fetch()-only try/catch, so it still fell through to
	// the generic catch-all and came back as a 500 even after the first fix.
	it("returns a graceful 502 — not a 500 — when cort.ovh answers 200 with a body that isn't valid JSON", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => {
				throw new SyntaxError("Unexpected token < in JSON at position 0");
			},
		});
		vi.stubGlobal("fetch", fetchMock);

		const { res, result } = mockRes();
		await handler({ method: "GET", headers: { authorization: "Bearer s3cr3t" }, query: {} }, res);

		expect(result.status).toBe(502);
	});
});
