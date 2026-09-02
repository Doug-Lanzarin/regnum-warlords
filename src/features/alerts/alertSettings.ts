import type { AlertSettings } from "../../types/alertSettings";

export type { AlertSettings, BooleanAlertKey } from "../../types/alertSettings";

const STORAGE_KEY = "rw_alert_settings";

export const DEFAULT_ALERT_SETTINGS: AlertSettings = {
	myRealm: null,
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
};

export function readAlertSettings(): AlertSettings {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return DEFAULT_ALERT_SETTINGS;
		const parsed = JSON.parse(raw) as Partial<AlertSettings> & {
			fortInvasionAlerts?: boolean;
			realmInvadedAlerts?: boolean;
			realmInvadingAlerts?: boolean;
		};
		// Two earlier shapes to migrate from: the very first single toggle
		// (`fortInvasionAlerts`) and the defense/offense split
		// (`realmInvadedAlerts`/`realmInvadingAlerts`) — both covered forts
		// and walls together, so they seed both of this generation's matching
		// pairs when the more specific key isn't present yet.
		const lostFallback = parsed.realmInvadedAlerts ?? parsed.fortInvasionAlerts ?? false;
		const capturedFallback = parsed.realmInvadingAlerts ?? false;
		return {
			myRealm: parsed.myRealm ?? null,
			fortCapturedAlerts: !!(parsed.fortCapturedAlerts ?? capturedFallback),
			fortLostAlerts: !!(parsed.fortLostAlerts ?? lostFallback),
			fortRecoveredAlerts: !!parsed.fortRecoveredAlerts,
			wallCapturedAlerts: !!(parsed.wallCapturedAlerts ?? capturedFallback),
			wallLostAlerts: !!(parsed.wallLostAlerts ?? lostFallback),
			wallRecoveredAlerts: !!parsed.wallRecoveredAlerts,
			gemCapturedAlerts: !!parsed.gemCapturedAlerts,
			gemLostAlerts: !!parsed.gemLostAlerts,
			gemRecoveredAlerts: !!parsed.gemRecoveredAlerts,
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
