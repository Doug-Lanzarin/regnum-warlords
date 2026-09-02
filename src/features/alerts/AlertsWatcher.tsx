import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BOSS_INFO, BOSS_ORDER } from "../../data/bossConstants";
import { REALM_COLOR } from "../../data/realms";
import { useBossTimers } from "../bosses/useBossTimers";
import { useWzStatus } from "../wz/useWzStatus";
import { computeFortStatuses } from "../wz/wzEngine";
import { useAlertSettings } from "./AlertSettingsContext";
import { AlertToastStack, type AlertToast } from "./AlertToastStack";
import { fireOsNotification } from "./notify";

let toastSeq = 0;

/** Mounted once in `AppLayout`, outside the routed pages, so it keeps
 *  watching (and can pop a toast/notification) no matter which tab the
 *  user is on — polls WZ status and boss timers itself, independent of
 *  whichever page-level instances of those hooks may also be mounted. */
export function AlertsWatcher() {
	const { settings } = useAlertSettings();
	const { data: wzData } = useWzStatus();
	const { data: bossData, now: bossNow } = useBossTimers();
	const [toasts, setToasts] = useState<AlertToast[]>([]);

	const dismissToast = useCallback((id: string) => {
		setToasts((prev) => prev.filter((t) => t.id !== id));
	}, []);

	const fireAlert = useCallback((title: string, body: string, color?: string) => {
		const id = `alert-${++toastSeq}`;
		setToasts((prev) => [...prev, { id, title, body, color }]);
		fireOsNotification(title, body, id);
	}, []);

	// -- fort invasion watch (defense: my territory falling to an invader,
	//    and offense: my realm capturing someone else's territory) --
	const forts = useMemo(() => (wzData ? computeFortStatuses(wzData) : []), [wzData]);
	const knownInvadedRef = useRef<Set<string> | null>(null);
	const knownInvadingRef = useRef<Set<string> | null>(null);

	useEffect(() => {
		// Realm changed — reseed both baselines instead of firing for state
		// that already existed before the switch.
		knownInvadedRef.current = null;
		knownInvadingRef.current = null;
	}, [settings.myRealm]);

	useEffect(() => {
		if (!settings.myRealm || forts.length === 0) return;

		if (settings.realmInvadedAlerts) {
			// Forts of my own territory currently held by an invader.
			const myForts = forts.filter((f) => f.home === settings.myRealm);
			const invadedNow = new Set(myForts.filter((f) => f.captured).map((f) => f.name));
			const known = knownInvadedRef.current;
			if (known) {
				for (const name of invadedNow) {
					if (known.has(name)) continue;
					const fort = myForts.find((f) => f.name === name);
					if (!fort) continue;
					const cleanName = fort.name.replace(/\s*\(\d+\)$/, "");
					fireAlert(
						`${cleanName} invadido!`,
						`${fort.owner} capturou ${cleanName}, território de ${settings.myRealm}.`,
						REALM_COLOR[fort.owner],
					);
				}
			}
			knownInvadedRef.current = invadedNow;
		}

		if (settings.realmInvadingAlerts) {
			// Forts outside my territory that my realm currently holds.
			const conqueredForts = forts.filter((f) => f.owner === settings.myRealm && f.home !== settings.myRealm);
			const invadingNow = new Set(conqueredForts.map((f) => f.name));
			const known = knownInvadingRef.current;
			if (known) {
				for (const name of invadingNow) {
					if (known.has(name)) continue;
					const fort = conqueredForts.find((f) => f.name === name);
					if (!fort) continue;
					const cleanName = fort.name.replace(/\s*\(\d+\)$/, "");
					fireAlert(
						`${settings.myRealm} capturou ${cleanName}!`,
						`Território de ${fort.home} agora sob controle de ${settings.myRealm}.`,
						REALM_COLOR[settings.myRealm],
					);
				}
			}
			knownInvadingRef.current = invadingNow;
		}
	}, [forts, settings.realmInvadedAlerts, settings.realmInvadingAlerts, settings.myRealm, fireAlert]);

	// -- boss spawn countdown watch --
	const alertedSpawnsRef = useRef<Set<string>>(new Set());

	useEffect(() => {
		if (!bossData || settings.bossAlertMinutes.length === 0) return;
		for (const key of BOSS_ORDER) {
			const nextSpawns = bossData.next_spawns[key];
			if (!nextSpawns?.length) continue;
			const spawnSeconds = nextSpawns[0];
			const spawnMs = spawnSeconds * 1000;
			for (const minutes of settings.bossAlertMinutes) {
				const triggerAt = spawnMs - minutes * 60_000;
				const alertKey = `${key}-${spawnSeconds}-${minutes}`;
				if (bossNow < triggerAt || bossNow >= spawnMs) continue;
				if (alertedSpawnsRef.current.has(alertKey)) continue;
				alertedSpawnsRef.current.add(alertKey);
				const info = BOSS_INFO[key];
				const spawnClock = new Date(spawnMs).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
				fireAlert(`${info.name} nasce em ${minutes} min`, `Spawn previsto às ${spawnClock}.`, info.color);
			}
		}
	}, [bossData, bossNow, settings.bossAlertMinutes, fireAlert]);

	return <AlertToastStack toasts={toasts} onDismiss={dismissToast} />;
}
