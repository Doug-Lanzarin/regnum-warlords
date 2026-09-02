import type { Realm } from "../../data/realms";

/** Personal alert preferences — local to this device only (no account, no
 *  server), separate from the public/admin-curated notifications timeline.
 *  Fort/wall/gem each get their own captured (offense) and lost (defense)
 *  toggle since a player may only care about some of these. */
export interface AlertSettings {
	myRealm: Realm | null;
	fortCapturedAlerts: boolean;
	fortLostAlerts: boolean;
	wallCapturedAlerts: boolean;
	wallLostAlerts: boolean;
	gemCapturedAlerts: boolean;
	gemLostAlerts: boolean;
	/** Minutes-before-spawn thresholds the user wants a heads-up for, e.g. [60, 30, 15]. */
	bossAlertMinutes: number[];
}

export type BooleanAlertKey =
	| "fortCapturedAlerts"
	| "fortLostAlerts"
	| "wallCapturedAlerts"
	| "wallLostAlerts"
	| "gemCapturedAlerts"
	| "gemLostAlerts";

const STORAGE_KEY = "rw_alert_settings";

export const DEFAULT_ALERT_SETTINGS: AlertSettings = {
	myRealm: null,
	fortCapturedAlerts: false,
	fortLostAlerts: false,
	wallCapturedAlerts: false,
	wallLostAlerts: false,
	gemCapturedAlerts: false,
	gemLostAlerts: false,
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
			wallCapturedAlerts: !!(parsed.wallCapturedAlerts ?? capturedFallback),
			wallLostAlerts: !!(parsed.wallLostAlerts ?? lostFallback),
			gemCapturedAlerts: !!parsed.gemCapturedAlerts,
			gemLostAlerts: !!parsed.gemLostAlerts,
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
