import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { BOSS_INFO, BOSS_ORDER } from "../../data/bossConstants";
import { REALM_COLOR } from "../../data/realms";
import { useBossTimers } from "../bosses/useBossTimers";
import { useWzStatus } from "../wz/useWzStatus";
import { computeFortStatuses, computeGemStatuses } from "../wz/wzEngine";
import { getFortKind } from "../wz/wzIcons";
import { useAlertSettings } from "./AlertSettingsContext";
import { AlertToastStack, type AlertToast } from "./AlertToastStack";
import { fireOsNotification } from "./notify";

let toastSeq = 0;

const cleanFortLabel = (name: string) => name.replace(/\s*\(\d+\)$/, "");

/** Diffs `items` against the previous call's snapshot (keyed by `keyOf`),
 *  returning the ones that are new since then, and reseeds the ref either
 *  way. `null` in the ref means "no baseline yet" (first run after mount or
 *  a realm switch), which always yields no results — so a toggle only
 *  starts alerting from the point it's turned on, never for state that
 *  already existed. */
function newSince<T>(items: T[], keyOf: (item: T) => string, ref: RefObject<Set<string> | null>): T[] {
	const currentKeys = new Set(items.map(keyOf));
	const known = ref.current;
	ref.current = currentKeys;
	return known ? items.filter((item) => !known.has(keyOf(item))) : [];
}

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

	// -- fort / wall / gem watch --
	const forts = useMemo(() => (wzData ? computeFortStatuses(wzData) : []), [wzData]);
	const gems = useMemo(() => (wzData ? computeGemStatuses(wzData) : []), [wzData]);

	const fortCapturedRef = useRef<Set<string> | null>(null);
	const fortLostRef = useRef<Set<string> | null>(null);
	const wallCapturedRef = useRef<Set<string> | null>(null);
	const wallLostRef = useRef<Set<string> | null>(null);
	const gemCapturedRef = useRef<Set<string> | null>(null);
	const gemLostRef = useRef<Set<string> | null>(null);

	useEffect(() => {
		// Realm changed — reseed every baseline instead of firing for state
		// that already existed before the switch.
		fortCapturedRef.current = null;
		fortLostRef.current = null;
		wallCapturedRef.current = null;
		wallLostRef.current = null;
		gemCapturedRef.current = null;
		gemLostRef.current = null;
	}, [settings.myRealm]);

	useEffect(() => {
		const myRealm = settings.myRealm;
		if (!myRealm || forts.length === 0) return;

		if (settings.fortLostAlerts) {
			const lost = forts.filter((f) => f.home === myRealm && f.captured && getFortKind(f.name) !== "wall");
			for (const fort of newSince(lost, (f) => f.name, fortLostRef)) {
				const name = cleanFortLabel(fort.name);
				fireAlert(`${name} perdido!`, `${fort.owner} capturou ${name}, território de ${myRealm}.`, REALM_COLOR[fort.owner]);
			}
		}
		if (settings.wallLostAlerts) {
			const lost = forts.filter((f) => f.home === myRealm && f.captured && getFortKind(f.name) === "wall");
			for (const fort of newSince(lost, (f) => f.name, wallLostRef)) {
				const name = cleanFortLabel(fort.name);
				fireAlert(`${name} perdida!`, `${fort.owner} invadiu ${name}, território de ${myRealm}.`, REALM_COLOR[fort.owner]);
			}
		}
		if (settings.fortCapturedAlerts) {
			const captured = forts.filter((f) => f.owner === myRealm && f.home !== myRealm && getFortKind(f.name) !== "wall");
			for (const fort of newSince(captured, (f) => f.name, fortCapturedRef)) {
				const name = cleanFortLabel(fort.name);
				fireAlert(`${myRealm} tomou ${name}!`, `Território de ${fort.home} agora sob controle de ${myRealm}.`, REALM_COLOR[myRealm]);
			}
		}
		if (settings.wallCapturedAlerts) {
			const captured = forts.filter((f) => f.owner === myRealm && f.home !== myRealm && getFortKind(f.name) === "wall");
			for (const fort of newSince(captured, (f) => f.name, wallCapturedRef)) {
				const name = cleanFortLabel(fort.name);
				fireAlert(`${myRealm} capturou ${name}!`, `Território de ${fort.home} agora sob controle de ${myRealm}.`, REALM_COLOR[myRealm]);
			}
		}
	}, [forts, settings.myRealm, settings.fortLostAlerts, settings.wallLostAlerts, settings.fortCapturedAlerts, settings.wallCapturedAlerts, fireAlert]);

	useEffect(() => {
		const myRealm = settings.myRealm;
		if (!myRealm || gems.length === 0) return;

		if (settings.gemLostAlerts) {
			const lost = gems.filter((g) => g.home === myRealm && g.owner !== myRealm);
			for (const gem of newSince(lost, (g) => `${g.index}`, gemLostRef)) {
				const label = `Gema ${gem.index + 1}`;
				fireAlert(
					`${label} perdida!`,
					gem.owner ? `${gem.owner} tomou a gema, território de ${myRealm}.` : `A gema ficou sem dono, território de ${myRealm}.`,
					gem.owner ? REALM_COLOR[gem.owner] : undefined,
				);
			}
		}
		if (settings.gemCapturedAlerts) {
			const captured = gems.filter((g) => g.owner === myRealm && g.home !== myRealm);
			for (const gem of newSince(captured, (g) => `${g.index}`, gemCapturedRef)) {
				const label = `Gema ${gem.index + 1}`;
				fireAlert(`${myRealm} capturou a ${label}!`, `Território de ${gem.home} agora sob controle de ${myRealm}.`, REALM_COLOR[myRealm]);
			}
		}
	}, [gems, settings.myRealm, settings.gemLostAlerts, settings.gemCapturedAlerts, fireAlert]);

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
