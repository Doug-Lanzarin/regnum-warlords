import { useCallback, useEffect, useMemo, useRef, type RefObject } from "react";
import { BOSS_ORDER, bossName } from "../../data/bossConstants";
import { formatFortLabel } from "../../data/fortKind";
import { useLanguage } from "../../i18n/LanguageContext";
import { useT } from "../../i18n/useT";
import { useBossTimers } from "../bosses/useBossTimers";
import { useWzStatus } from "../wz/useWzStatus";
import { computeFortStatuses, computeGemStatuses } from "../wz/wzEngine";
import { getFortKind } from "../wz/wzIcons";
import { useAlertSettings } from "./AlertSettingsContext";
import { fireOsNotification } from "./notify";

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

let alertSeq = 0;

/** Mounted once in `AppLayout`, outside the routed pages, so it keeps
 *  watching (and can fire a notification) no matter which tab the user is
 *  on — polls WZ status and boss timers itself, independent of whichever
 *  page-level instances of those hooks may also be mounted. */
export function AlertsWatcher() {
	const { settings } = useAlertSettings();
	const { lang } = useLanguage();
	const t = useT();
	const { data: wzData } = useWzStatus();
	const { data: bossData, now: bossNow } = useBossTimers();

	const fireAlert = useCallback((title: string, body: string) => {
		fireOsNotification(title, body, `alert-${++alertSeq}`);
	}, []);

	// -- fort / wall / gem watch --
	const forts = useMemo(() => (wzData ? computeFortStatuses(wzData) : []), [wzData]);
	const gems = useMemo(() => (wzData ? computeGemStatuses(wzData) : []), [wzData]);

	const fortCapturedRef = useRef<Set<string> | null>(null);
	const fortLostRef = useRef<Set<string> | null>(null);
	const fortRecoveredRef = useRef<Set<string> | null>(null);
	const wallCapturedRef = useRef<Set<string> | null>(null);
	const wallLostRef = useRef<Set<string> | null>(null);
	const wallRecoveredRef = useRef<Set<string> | null>(null);
	const gemCapturedRef = useRef<Set<string> | null>(null);
	const gemLostRef = useRef<Set<string> | null>(null);
	const gemRecoveredRef = useRef<Set<string> | null>(null);

	useEffect(() => {
		// Realm changed — reseed every baseline instead of firing for state
		// that already existed before the switch.
		fortCapturedRef.current = null;
		fortLostRef.current = null;
		fortRecoveredRef.current = null;
		wallCapturedRef.current = null;
		wallLostRef.current = null;
		wallRecoveredRef.current = null;
		gemCapturedRef.current = null;
		gemLostRef.current = null;
		gemRecoveredRef.current = null;
	}, [settings.myRealm]);

	useEffect(() => {
		const myRealm = settings.myRealm;
		if (!myRealm || forts.length === 0) return;

		if (settings.fortLostAlerts) {
			const lost = forts.filter((f) => f.home === myRealm && f.captured && getFortKind(f.name) !== "wall");
			for (const fort of newSince(lost, (f) => f.name, fortLostRef)) {
				const name = formatFortLabel(fort.name, lang);
				fireAlert(t("alerts.msgLost", { realm: myRealm, name, otherRealm: fort.owner }), "");
			}
		}
		if (settings.wallLostAlerts) {
			const lost = forts.filter((f) => f.home === myRealm && f.captured && getFortKind(f.name) === "wall");
			for (const fort of newSince(lost, (f) => f.name, wallLostRef)) {
				const name = formatFortLabel(fort.name, lang);
				fireAlert(t("alerts.msgLost", { realm: myRealm, name, otherRealm: fort.owner }), "");
			}
		}
		if (settings.fortCapturedAlerts) {
			const captured = forts.filter((f) => f.owner === myRealm && f.home !== myRealm && getFortKind(f.name) !== "wall");
			for (const fort of newSince(captured, (f) => f.name, fortCapturedRef)) {
				const name = formatFortLabel(fort.name, lang);
				fireAlert(t("alerts.msgCaptured", { realm: myRealm, name }), "");
			}
		}
		if (settings.wallCapturedAlerts) {
			const captured = forts.filter((f) => f.owner === myRealm && f.home !== myRealm && getFortKind(f.name) === "wall");
			for (const fort of newSince(captured, (f) => f.name, wallCapturedRef)) {
				const name = formatFortLabel(fort.name, lang);
				fireAlert(t("alerts.msgCaptured", { realm: myRealm, name }), "");
			}
		}
		if (settings.fortRecoveredAlerts) {
			const recovered = forts.filter((f) => f.home === myRealm && !f.captured && getFortKind(f.name) !== "wall");
			for (const fort of newSince(recovered, (f) => f.name, fortRecoveredRef)) {
				const name = formatFortLabel(fort.name, lang);
				fireAlert(t("alerts.msgRecovered", { realm: myRealm, name }), "");
			}
		}
		if (settings.wallRecoveredAlerts) {
			const recovered = forts.filter((f) => f.home === myRealm && !f.captured && getFortKind(f.name) === "wall");
			for (const fort of newSince(recovered, (f) => f.name, wallRecoveredRef)) {
				const name = formatFortLabel(fort.name, lang);
				fireAlert(t("alerts.msgRecovered", { realm: myRealm, name }), "");
			}
		}
	}, [
		forts,
		settings.myRealm,
		settings.fortLostAlerts,
		settings.wallLostAlerts,
		settings.fortCapturedAlerts,
		settings.wallCapturedAlerts,
		settings.fortRecoveredAlerts,
		settings.wallRecoveredAlerts,
		lang,
		t,
		fireAlert,
	]);

	useEffect(() => {
		const myRealm = settings.myRealm;
		if (!myRealm || gems.length === 0) return;

		if (settings.gemLostAlerts) {
			const lost = gems.filter((g) => g.home === myRealm && g.owner !== myRealm);
			for (const gem of newSince(lost, (g) => `${g.index}`, gemLostRef)) {
				const label = t("alerts.gemLabel", { n: gem.index + 1 });
				const title = gem.owner
					? t("alerts.msgLost", { realm: myRealm, name: label, otherRealm: gem.owner })
					: t("alerts.msgLostNoOwner", { realm: myRealm, name: label });
				fireAlert(title, "");
			}
		}
		if (settings.gemCapturedAlerts) {
			const captured = gems.filter((g) => g.owner === myRealm && g.home !== myRealm);
			for (const gem of newSince(captured, (g) => `${g.index}`, gemCapturedRef)) {
				const label = t("alerts.gemLabel", { n: gem.index + 1 });
				fireAlert(t("alerts.msgCaptured", { realm: myRealm, name: label }), "");
			}
		}
		if (settings.gemRecoveredAlerts) {
			const recovered = gems.filter((g) => g.home === myRealm && g.owner === myRealm);
			for (const gem of newSince(recovered, (g) => `${g.index}`, gemRecoveredRef)) {
				const label = t("alerts.gemLabel", { n: gem.index + 1 });
				fireAlert(t("alerts.msgRecovered", { realm: myRealm, name: label }), "");
			}
		}
	}, [gems, settings.myRealm, settings.gemLostAlerts, settings.gemCapturedAlerts, settings.gemRecoveredAlerts, t, fireAlert]);

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
				const spawnClock = new Date(spawnMs).toLocaleTimeString(lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US", {
					hour: "2-digit",
					minute: "2-digit",
				});
				fireAlert(
					t("alerts.bossSpawnTitle", { boss: bossName(key, lang), minutes }),
					t("alerts.bossSpawnBody", { time: spawnClock }),
				);
			}
		}
	}, [bossData, bossNow, settings.bossAlertMinutes, lang, t, fireAlert]);

	return null;
}
