import { describe, expect, it } from "vitest";
import { LANGUAGES } from "./languages";
import { translate } from "./translate";

describe("translate", () => {
	it("returns each language's own text for the same key", () => {
		expect(translate("pt", "nav.wz")).toBe("Warzone");
		expect(translate("en", "notFound.title")).toBe("Page not found");
		expect(translate("es", "notFound.title")).toBe("Página no encontrada");
	});

	it("interpolates {var}-style placeholders from the vars object", () => {
		expect(translate("pt", "alerts.msgCaptured", { realm: "Ignis", name: "Imperia Castle" })).toBe(
			"Ignis capturou Imperia Castle",
		);
		expect(translate("en", "alerts.msgLost", { realm: "Ignis", name: "Imperia Castle", otherRealm: "Alsius" })).toBe(
			"Ignis lost Imperia Castle to Alsius",
		);
	});

	it("leaves an unmatched {placeholder} untouched instead of throwing", () => {
		// vars intentionally missing "days"/"hours" for this key.
		expect(translate("pt", "time.daysHoursAgo", {})).toBe("há {days}d {hours}h");
	});

	it("every language dictionary resolves every key used in the notification templates", () => {
		const keysUsedByNotifications = [
			"alerts.msgLost",
			"alerts.msgLostNoOwner",
			"alerts.msgCaptured",
			"alerts.msgRecovered",
			"alerts.gemLabel",
			"alerts.bossSpawnTitle",
			"alerts.bossSpawnBody",
			"fort.greatWallOf",
		] as const;
		for (const lang of LANGUAGES) {
			for (const key of keysUsedByNotifications) {
				expect(translate(lang, key, { realm: "x", name: "x", otherRealm: "x", n: 1, boss: "x", minutes: 1, time: "x" })).toEqual(
					expect.any(String),
				);
			}
		}
	});
});
