import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildMessagesFor, eventDisplayName, isAuthorized, type VercelLikeRequest } from "./tick";
import type { CategoryEvent, CategoryEvents } from "../_push/diff";
import type { BossEvent } from "../_push/boss";
import type { AlertSettings } from "../../src/types/alertSettings";

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
		expect(buildMessagesFor(s, events, [])).toEqual([]);
	});

	it("builds nothing for a category the subscriber didn't opt into", () => {
		const s = settings({ fortCapturedAlerts: false });
		const events = emptyEventsByRealm();
		events.Ignis.fortCaptured = [{ name: "Imperia Castle (1)", otherRealm: "Syrtis" }];
		expect(buildMessagesFor(s, events, [])).toEqual([]);
	});

	it("builds a localized 'captured' message only for the subscriber's own realm", () => {
		const s = settings({ myRealm: "Ignis", fortCapturedAlerts: true, lang: "en" });
		const events = emptyEventsByRealm();
		events.Ignis.fortCaptured = [{ name: "Imperia Castle (1)", otherRealm: "Syrtis" }];
		events.Alsius.fortCaptured = [{ name: "Some Other Fort (2)", otherRealm: "Syrtis" }];

		const messages = buildMessagesFor(s, events, []);
		expect(messages).toEqual([{ title: "Ignis captured Imperia Castle", body: "", url: "/" }]);
	});

	it("builds a 'lost' message with the invading realm's name", () => {
		const s = settings({ myRealm: "Syrtis", fortLostAlerts: true, lang: "pt" });
		const events = emptyEventsByRealm();
		events.Syrtis.fortLost = [{ name: "Imperia Castle (1)", otherRealm: "Ignis" }];

		expect(buildMessagesFor(s, events, [])).toEqual([{ title: "Syrtis perdeu Imperia Castle para Ignis", body: "", url: "/" }]);
	});

	it("builds a gem-lost message without an owner clause when the gem has no owner", () => {
		const s = settings({ myRealm: "Alsius", gemLostAlerts: true, lang: "pt" });
		const events = emptyEventsByRealm();
		events.Alsius.gemLost = [{ name: "", gemIndex: 0, otherRealm: null }];

		expect(buildMessagesFor(s, events, [])).toEqual([{ title: "Alsius perdeu Gema 1", body: "", url: "/" }]);
	});

	it("builds a wall message via the Great Wall translation, per subscriber language", () => {
		const s = settings({ myRealm: "Alsius", wallCapturedAlerts: true, lang: "es" });
		const events = emptyEventsByRealm();
		events.Alsius.wallCaptured = [{ name: "Great Wall of Syrtis (2)", otherRealm: "Syrtis" }];

		expect(buildMessagesFor(s, events, [])).toEqual([
			{ title: "Alsius capturó Gran Muralla de Syrtis", body: "", url: "/" },
		]);
	});

	it("builds a recovered message with no 'otherRealm' clause at all", () => {
		const s = settings({ myRealm: "Ignis", fortRecoveredAlerts: true, lang: "en" });
		const events = emptyEventsByRealm();
		events.Ignis.fortRecovered = [{ name: "Imperia Castle (1)", otherRealm: null }];

		expect(buildMessagesFor(s, events, [])).toEqual([{ title: "Ignis recovered Imperia Castle", body: "", url: "/" }]);
	});

	it("builds boss messages only for thresholds the subscriber opted into", () => {
		const s = settings({ bossAlertMinutes: [30] });
		const bossEvents: BossEvent[] = [
			{ bossKey: "daen", minutes: 60, spawnSeconds: 1_000_000 },
			{ bossKey: "daen", minutes: 30, spawnSeconds: 1_000_000 },
		];
		const messages = buildMessagesFor(s, emptyEventsByRealm(), bossEvents);
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
		expect(buildMessagesFor(s, events, [])).toHaveLength(2);
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
