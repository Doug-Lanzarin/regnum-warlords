import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_ALERT_SETTINGS, readAlertSettings, writeAlertSettings } from "./alertSettings";

/** Node has no `localStorage` global by default — a small in-memory mock
 *  standing in for it, reset before every test so nothing leaks between
 *  cases (this is the "mocked" part of these notification-settings tests:
 *  no real browser storage involved). */
function mockLocalStorage(): Storage {
	const store = new Map<string, string>();
	return {
		getItem: (key: string) => store.get(key) ?? null,
		setItem: (key: string, value: string) => void store.set(key, value),
		removeItem: (key: string) => void store.delete(key),
		clear: () => store.clear(),
		key: (index: number) => Array.from(store.keys())[index] ?? null,
		get length() {
			return store.size;
		},
	};
}

beforeEach(() => {
	vi.stubGlobal("localStorage", mockLocalStorage());
});

describe("readAlertSettings", () => {
	it("returns the defaults when nothing was ever saved", () => {
		expect(readAlertSettings()).toEqual(DEFAULT_ALERT_SETTINGS);
	});

	it("round-trips whatever writeAlertSettings just wrote", () => {
		const custom = { ...DEFAULT_ALERT_SETTINGS, myRealm: "Ignis" as const, lang: "en" as const, fortCapturedAlerts: true };
		writeAlertSettings(custom);
		expect(readAlertSettings()).toEqual(custom);
	});

	it("defaults lang to 'pt' for settings saved before the i18n feature existed", () => {
		localStorage.setItem("rw_alert_settings", JSON.stringify({ myRealm: "Alsius", fortCapturedAlerts: true }));
		expect(readAlertSettings().lang).toBe("pt");
	});

	it("rejects a garbage/unknown stored lang value instead of trusting it verbatim", () => {
		localStorage.setItem("rw_alert_settings", JSON.stringify({ lang: "fr" }));
		expect(readAlertSettings().lang).toBe("pt");
	});

	it("migrates the oldest single-toggle shape (fortInvasionAlerts) into both lost pairs", () => {
		localStorage.setItem("rw_alert_settings", JSON.stringify({ myRealm: "Syrtis", fortInvasionAlerts: true }));
		const settings = readAlertSettings();
		expect(settings.fortLostAlerts).toBe(true);
		expect(settings.wallLostAlerts).toBe(true);
		// That old shape never covered "captured" (offense) — must not be invented.
		expect(settings.fortCapturedAlerts).toBe(false);
	});

	it("migrates the defense/offense-split shape (realmInvaded/realmInvading) into both pairs", () => {
		localStorage.setItem(
			"rw_alert_settings",
			JSON.stringify({ myRealm: "Syrtis", realmInvadedAlerts: true, realmInvadingAlerts: true }),
		);
		const settings = readAlertSettings();
		expect(settings.fortLostAlerts).toBe(true);
		expect(settings.wallLostAlerts).toBe(true);
		expect(settings.fortCapturedAlerts).toBe(true);
		expect(settings.wallCapturedAlerts).toBe(true);
	});

	it("prefers the current-generation key over a legacy fallback when both are present", () => {
		localStorage.setItem(
			"rw_alert_settings",
			JSON.stringify({ fortInvasionAlerts: true, fortLostAlerts: false }),
		);
		expect(readAlertSettings().fortLostAlerts).toBe(false);
	});

	it("falls back to defaults on corrupted JSON instead of throwing", () => {
		localStorage.setItem("rw_alert_settings", "{not json");
		expect(readAlertSettings()).toEqual(DEFAULT_ALERT_SETTINGS);
	});

	it("filters out non-number entries from a corrupted bossAlertMinutes array", () => {
		localStorage.setItem("rw_alert_settings", JSON.stringify({ bossAlertMinutes: [60, "30", null, 15] }));
		expect(readAlertSettings().bossAlertMinutes).toEqual([60, 15]);
	});
});
