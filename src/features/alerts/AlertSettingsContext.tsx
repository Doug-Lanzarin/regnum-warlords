import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { Realm } from "../../data/realms";
import { readAlertSettings, writeAlertSettings, type AlertSettings } from "./alertSettings";

interface AlertSettingsContextValue {
	settings: AlertSettings;
	setMyRealm: (realm: Realm | null) => void;
	setRealmInvadedAlerts: (on: boolean) => void;
	setRealmInvadingAlerts: (on: boolean) => void;
	toggleBossAlertMinute: (minute: number) => void;
}

const AlertSettingsContext = createContext<AlertSettingsContextValue | null>(null);

/** Holds the personal alert prefs (local device only, see `alertSettings.ts`)
 *  as context rather than a plain hook, since two independent consumers need
 *  the *same* live state: `AlertsWatcher` (mounted once in AppLayout, reads
 *  it to decide what to fire) and `AlertSettingsPanel` (on the Notifications
 *  page, writes it) — a plain `useState`-per-call hook would give each its
 *  own copy, so a setting change on the page would never reach the watcher. */
export function AlertSettingsProvider({ children }: { children: ReactNode }) {
	const [settings, setSettings] = useState<AlertSettings>(() => readAlertSettings());

	const update = useCallback((patch: Partial<AlertSettings>) => {
		setSettings((prev) => {
			const next = { ...prev, ...patch };
			writeAlertSettings(next);
			return next;
		});
	}, []);

	const setMyRealm = useCallback((realm: Realm | null) => update({ myRealm: realm }), [update]);
	const setRealmInvadedAlerts = useCallback((on: boolean) => update({ realmInvadedAlerts: on }), [update]);
	const setRealmInvadingAlerts = useCallback((on: boolean) => update({ realmInvadingAlerts: on }), [update]);
	const toggleBossAlertMinute = useCallback((minute: number) => {
		setSettings((prev) => {
			const bossAlertMinutes = prev.bossAlertMinutes.includes(minute)
				? prev.bossAlertMinutes.filter((m) => m !== minute)
				: [...prev.bossAlertMinutes, minute];
			const next = { ...prev, bossAlertMinutes };
			writeAlertSettings(next);
			return next;
		});
	}, []);

	return (
		<AlertSettingsContext.Provider
			value={{ settings, setMyRealm, setRealmInvadedAlerts, setRealmInvadingAlerts, toggleBossAlertMinute }}
		>
			{children}
		</AlertSettingsContext.Provider>
	);
}

export function useAlertSettings(): AlertSettingsContextValue {
	const ctx = useContext(AlertSettingsContext);
	if (!ctx) throw new Error("useAlertSettings must be used within AlertSettingsProvider");
	return ctx;
}
