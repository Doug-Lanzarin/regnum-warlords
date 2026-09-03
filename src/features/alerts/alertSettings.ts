import type { AlertSettings } from "../../types/alertSettings";
import { LANGUAGES } from "../../i18n/languages";

export type { AlertSettings, BooleanAlertKey } from "../../types/alertSettings";

const STORAGE_KEY = "rw_alert_settings";

export const DEFAULT_ALERT_SETTINGS: AlertSettings = {
	myRealm: null,
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
			lang: (LANGUAGES as readonly string[]).includes(parsed.lang ?? "") ? (parsed.lang as AlertSettings["lang"]) : "pt",
			fortCapturedAlerts: !!(parsed.fortCapturedAlerts ?? capturedFallback),
			fortLostAlerts: !!(parsed.fortLostAlerts ?? lostFallback),
			fortRecoveredAlerts: !!parsed.fortRecoveredAlerts,
			wallCapturedAlerts: !!(parsed.wallCapturedAlerts ?? capturedFallback),
			wallLostAlerts: !!(parsed.wallLostAlerts ?? lostFallback),
			wallRecoveredAlerts: !!parsed.wallRecoveredAlerts,
			wallVulnerableMineAlerts: !!parsed.wallVulnerableMineAlerts,
			wallVulnerableEnemyAlerts: !!parsed.wallVulnerableEnemyAlerts,
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
