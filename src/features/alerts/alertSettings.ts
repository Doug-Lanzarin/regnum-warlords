import type { Realm } from "../../data/realms";

/** Personal alert preferences — local to this device only (no account, no
 *  server), separate from the public/admin-curated notifications timeline. */
export interface AlertSettings {
	myRealm: Realm | null;
	fortInvasionAlerts: boolean;
	/** Minutes-before-spawn thresholds the user wants a heads-up for, e.g. [60, 30, 15]. */
	bossAlertMinutes: number[];
}

const STORAGE_KEY = "rw_alert_settings";

export const DEFAULT_ALERT_SETTINGS: AlertSettings = {
	myRealm: null,
	fortInvasionAlerts: false,
	bossAlertMinutes: [],
};

export function readAlertSettings(): AlertSettings {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return DEFAULT_ALERT_SETTINGS;
		const parsed = JSON.parse(raw) as Partial<AlertSettings>;
		return {
			myRealm: parsed.myRealm ?? null,
			fortInvasionAlerts: !!parsed.fortInvasionAlerts,
			bossAlertMinutes: Array.isArray(parsed.bossAlertMinutes)
				? parsed.bossAlertMinutes.filter((n) => typeof n === "number")
				: [],
		};
	} catch {
		return DEFAULT_ALERT_SETTINGS;
	}
}

export function writeAlertSettings(settings: AlertSettings) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
	} catch {
		// localStorage unavailable (private mode, etc.) — settings just won't persist.
	}
}
