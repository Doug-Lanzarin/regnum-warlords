import { useEffect, useRef, useState } from "react";
import { REALMS, type Realm } from "../../data/realms";
import { useT } from "../../i18n/useT";
import { useAlertSettings } from "../alerts/AlertSettingsContext";
import type { BooleanAlertKey } from "../alerts/alertSettings";
import { NOTIFICATIONS_PAUSED } from "../alerts/notificationsPaused";
import {
	getPushSubscription,
	notificationSupport,
	pushSupported,
	requestNotificationPermission,
	subscribeToPush,
	unsubscribeFromPush,
	type NotificationSupport,
} from "../alerts/notify";
import type { TranslationKey } from "../../i18n/translate";
import styles from "./AlertSettingsPanel.module.css";

const EVENT_ALERT_OPTIONS: { key: BooleanAlertKey; labelKey: TranslationKey }[] = [
	{ key: "fortCapturedAlerts", labelKey: "alerts.optFortCaptured" },
	{ key: "fortLostAlerts", labelKey: "alerts.optFortLost" },
	{ key: "fortRecoveredAlerts", labelKey: "alerts.optFortRecovered" },
	{ key: "wallCapturedAlerts", labelKey: "alerts.optWallCaptured" },
	{ key: "wallLostAlerts", labelKey: "alerts.optWallLost" },
	{ key: "wallRecoveredAlerts", labelKey: "alerts.optWallRecovered" },
	{ key: "wallVulnerableMineAlerts", labelKey: "alerts.optWallVulnerableMine" },
	{ key: "wallVulnerableEnemyAlerts", labelKey: "alerts.optWallVulnerableEnemy" },
	{ key: "gemCapturedAlerts", labelKey: "alerts.optGemCaptured" },
	{ key: "gemLostAlerts", labelKey: "alerts.optGemLost" },
	{ key: "gemRecoveredAlerts", labelKey: "alerts.optGemRecovered" },
];

const BOSS_ALERT_OPTIONS: { minutes: number; labelKey: TranslationKey }[] = [
	{ minutes: 60, labelKey: "alerts.boss60" },
	{ minutes: 30, labelKey: "alerts.boss30" },
	{ minutes: 15, labelKey: "alerts.boss15" },
];

const PERMISSION_LABEL_KEY: Record<NotificationSupport, TranslationKey> = {
	granted: "alerts.permissionGranted",
	denied: "alerts.permissionDenied",
	default: "alerts.permissionDefault",
	unsupported: "alerts.permissionUnsupported",
};

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

/** Personal alert preferences, local to this device — lives on the public
 *  Notifications tab alongside the admin-curated timeline, but writes to
 *  `AlertSettingsContext` (localStorage) instead of the notifications API. */
export function AlertSettingsPanel() {
	const t = useT();
	const { settings, setMyRealm, setFlag, toggleBossAlertMinute } = useAlertSettings();
	const [permission, setPermission] = useState<NotificationSupport>(() => notificationSupport());
	const [pushActive, setPushActive] = useState(false);
	const [pushBusy, setPushBusy] = useState(false);

	// Guards against the initial subscription check (below) resolving *after*
	// a manual enable/disable click and clobbering its result back — both are
	// independent async operations touching the same `pushActive` state, and
	// with no ordering guarantee the slower one used to win regardless of
	// which was actually more recent (e.g. click "enable" right after mount,
	// subscribeToPush finishes first and sets pushActive=true, then the
	// mount-time check — which started before the subscription existed —
	// finally resolves and flips it back to false; only a remount, which
	// re-runs this check against the now-real state, would "fix" it). Same
	// `requestId`-ref pattern already used for this in useWzStatus.ts/
	// useBossTimers.ts, just guarding two different async sources instead of
	// repeated calls to the same one.
	const pushCheckId = useRef(0);

	useEffect(() => {
		const id = ++pushCheckId.current;
		getPushSubscription()
			.then((sub) => {
				if (id === pushCheckId.current) setPushActive(!!sub);
			})
			.catch(() => {
				if (id === pushCheckId.current) setPushActive(false);
			});
	}, []);

	async function handleEnableNotifications() {
		const result = await requestNotificationPermission();
		setPermission(result);
		if (result === "granted" && VAPID_PUBLIC_KEY && pushSupported()) {
			setPushBusy(true);
			const id = ++pushCheckId.current;
			const ok = await subscribeToPush(VAPID_PUBLIC_KEY, settings);
			if (id === pushCheckId.current) setPushActive(ok);
			setPushBusy(false);
		}
	}

	async function handleDisablePush() {
		setPushBusy(true);
		const id = ++pushCheckId.current;
		await unsubscribeFromPush();
		if (id === pushCheckId.current) setPushActive(false);
		setPushBusy(false);
	}

	const canOfferPush = VAPID_PUBLIC_KEY && pushSupported();

	if (NOTIFICATIONS_PAUSED) {
		return (
			<section className={`card ${styles.panel}`}>
				<h2 className={styles.title}>{t("alerts.panelTitle")}</h2>
				<p className={styles.subtitle}>{t("alerts.pausedNotice")}</p>
			</section>
		);
	}

	return (
		<section className={`card ${styles.panel}`}>
			<h2 className={styles.title}>{t("alerts.panelTitle")}</h2>
			<p className={styles.subtitle}>{t("alerts.panelSubtitle")}</p>

			<div className={styles.permissionRow}>
				{permission !== "granted" && permission !== "unsupported" && (
					<button type="button" className="btn btn-primary" onClick={handleEnableNotifications} disabled={pushBusy}>
						{t("alerts.enableBrowserNotifications")}
					</button>
				)}
				<p className={styles.permissionStatus}>{t(PERMISSION_LABEL_KEY[permission])}</p>
			</div>

			{permission === "granted" && canOfferPush && (
				<div className={styles.permissionRow}>
					{pushActive ? (
						<button type="button" className="btn btn-ghost" onClick={handleDisablePush} disabled={pushBusy}>
							{t("alerts.disablePushClosed")}
						</button>
					) : (
						<button
							type="button"
							className="btn btn-primary"
							disabled={pushBusy}
							onClick={async () => {
								setPushBusy(true);
								const id = ++pushCheckId.current;
								const ok = await subscribeToPush(VAPID_PUBLIC_KEY, settings);
								if (id === pushCheckId.current) setPushActive(ok);
								setPushBusy(false);
							}}
						>
							{t("alerts.enablePushClosed")}
						</button>
					)}
					<p className={styles.permissionStatus}>{pushActive ? t("alerts.pushActiveStatus") : t("alerts.pushInactiveStatus")}</p>
				</div>
			)}

			<div className={styles.group}>
				<label className={styles.groupLabel} htmlFor="my-realm-select">
					{t("alerts.myRealmLabel")}
				</label>
				<select
					id="my-realm-select"
					className="select"
					value={settings.myRealm ?? ""}
					onChange={(e) => setMyRealm((e.target.value || null) as Realm | null)}
				>
					<option value="">{t("alerts.notChosen")}</option>
					{REALMS.map((realm) => (
						<option key={realm} value={realm}>
							{realm}
						</option>
					))}
				</select>
			</div>

			<div className={styles.group}>
				<span className={styles.groupLabel}>
					{t("alerts.myRealmEventsLabel")}
					{!settings.myRealm && <span className={styles.hint}>{t("alerts.chooseRealmHint")}</span>}
				</span>
				<div className={styles.checkRow}>
					{EVENT_ALERT_OPTIONS.map((opt) => (
						<label key={opt.key} className={styles.toggleRow}>
							<input
								type="checkbox"
								checked={settings[opt.key]}
								disabled={!settings.myRealm}
								onChange={(e) => setFlag(opt.key, e.target.checked)}
							/>
							<span>{t(opt.labelKey)}</span>
						</label>
					))}
				</div>
			</div>

			<div className={styles.group}>
				<span className={styles.groupLabel}>{t("alerts.bossWarnLabel")}</span>
				<div className={styles.checkRow}>
					{BOSS_ALERT_OPTIONS.map((opt) => (
						<label key={opt.minutes} className={styles.toggleRow}>
							<input
								type="checkbox"
								checked={settings.bossAlertMinutes.includes(opt.minutes)}
								onChange={() => toggleBossAlertMinute(opt.minutes)}
							/>
							<span>{t(opt.labelKey)}</span>
						</label>
					))}
				</div>
			</div>
		</section>
	);
}
