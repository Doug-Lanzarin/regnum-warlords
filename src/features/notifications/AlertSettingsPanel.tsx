import { useEffect, useState } from "react";
import { REALMS, type Realm } from "../../data/realms";
import { useAlertSettings } from "../alerts/AlertSettingsContext";
import type { BooleanAlertKey } from "../alerts/alertSettings";
import {
	getPushSubscription,
	notificationSupport,
	pushSupported,
	requestNotificationPermission,
	subscribeToPush,
	unsubscribeFromPush,
	type NotificationSupport,
} from "../alerts/notify";
import styles from "./AlertSettingsPanel.module.css";

const EVENT_ALERT_OPTIONS: { key: BooleanAlertKey; label: string }[] = [
	{ key: "fortCapturedAlerts", label: "Forte tomado" },
	{ key: "fortLostAlerts", label: "Forte perdido" },
	{ key: "wallLostAlerts", label: "Muralha perdida" },
	{ key: "wallCapturedAlerts", label: "Muralha capturada" },
	{ key: "gemLostAlerts", label: "Gem perdida" },
	{ key: "gemCapturedAlerts", label: "Gem capturada" },
];

const BOSS_ALERT_OPTIONS: { minutes: number; label: string }[] = [
	{ minutes: 60, label: "1 hora antes" },
	{ minutes: 30, label: "30 minutos antes" },
	{ minutes: 15, label: "15 minutos antes" },
];

const PERMISSION_LABEL: Record<NotificationSupport, string> = {
	granted: "Ativadas neste navegador",
	denied: "Bloqueadas — habilite nas configurações do site/navegador",
	default: "Ainda não ativadas",
	unsupported: "Não suportadas neste navegador",
};

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

/** Personal alert preferences, local to this device — lives on the public
 *  Notifications tab alongside the admin-curated timeline, but writes to
 *  `AlertSettingsContext` (localStorage) instead of the notifications API. */
export function AlertSettingsPanel() {
	const { settings, setMyRealm, setFlag, toggleBossAlertMinute } = useAlertSettings();
	const [permission, setPermission] = useState<NotificationSupport>(() => notificationSupport());
	const [pushActive, setPushActive] = useState(false);
	const [pushBusy, setPushBusy] = useState(false);

	useEffect(() => {
		getPushSubscription()
			.then((sub) => setPushActive(!!sub))
			.catch(() => setPushActive(false));
	}, []);

	async function handleEnableNotifications() {
		const result = await requestNotificationPermission();
		setPermission(result);
		if (result === "granted" && VAPID_PUBLIC_KEY && pushSupported()) {
			setPushBusy(true);
			const ok = await subscribeToPush(VAPID_PUBLIC_KEY, settings);
			setPushActive(ok);
			setPushBusy(false);
		}
	}

	async function handleDisablePush() {
		setPushBusy(true);
		await unsubscribeFromPush();
		setPushActive(false);
		setPushBusy(false);
	}

	const canOfferPush = VAPID_PUBLIC_KEY && pushSupported();

	return (
		<section className={`card ${styles.panel}`}>
			<h2 className={styles.title}>Alertas</h2>
			<p className={styles.subtitle}>
				Avisos locais neste dispositivo, sem cadastro — funcionam enquanto o app estiver aberto (aba ativa ou
				minimizada), e também com o app fechado se a notificação do navegador estiver ativada.
			</p>

			<div className={styles.permissionRow}>
				{permission !== "granted" && permission !== "unsupported" && (
					<button type="button" className="btn btn-primary" onClick={handleEnableNotifications} disabled={pushBusy}>
						Ativar notificações do navegador
					</button>
				)}
				<p className={styles.permissionStatus}>{PERMISSION_LABEL[permission]}</p>
			</div>

			{permission === "granted" && canOfferPush && (
				<div className={styles.permissionRow}>
					{pushActive ? (
						<button type="button" className="btn btn-ghost" onClick={handleDisablePush} disabled={pushBusy}>
							Desativar avisos com o app fechado
						</button>
					) : (
						<button
							type="button"
							className="btn btn-primary"
							disabled={pushBusy}
							onClick={async () => {
								setPushBusy(true);
								const ok = await subscribeToPush(VAPID_PUBLIC_KEY, settings);
								setPushActive(ok);
								setPushBusy(false);
							}}
						>
							Ativar avisos com o app fechado
						</button>
					)}
					<p className={styles.permissionStatus}>
						{pushActive ? "App fechado: você recebe avisos mesmo assim" : "App fechado: sem avisos por enquanto"}
					</p>
				</div>
			)}

			<div className={styles.group}>
				<label className={styles.groupLabel} htmlFor="my-realm-select">
					Meu reino
				</label>
				<select
					id="my-realm-select"
					className="select"
					value={settings.myRealm ?? ""}
					onChange={(e) => setMyRealm((e.target.value || null) as Realm | null)}
				>
					<option value="">Não escolhido</option>
					{REALMS.map((realm) => (
						<option key={realm} value={realm}>
							{realm}
						</option>
					))}
				</select>
			</div>

			<div className={styles.group}>
				<span className={styles.groupLabel}>
					Eventos do meu reino
					{!settings.myRealm && <span className={styles.hint}> (escolha seu reino acima)</span>}
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
							<span>{opt.label}</span>
						</label>
					))}
				</div>
			</div>

			<div className={styles.group}>
				<span className={styles.groupLabel}>Avisar antes dos épicos nascerem</span>
				<div className={styles.checkRow}>
					{BOSS_ALERT_OPTIONS.map((opt) => (
						<label key={opt.minutes} className={styles.toggleRow}>
							<input
								type="checkbox"
								checked={settings.bossAlertMinutes.includes(opt.minutes)}
								onChange={() => toggleBossAlertMinute(opt.minutes)}
							/>
							<span>{opt.label}</span>
						</label>
					))}
				</div>
			</div>
		</section>
	);
}
