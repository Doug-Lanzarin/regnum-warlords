import { useState } from "react";
import { REALMS, type Realm } from "../../data/realms";
import { useAlertSettings } from "../alerts/AlertSettingsContext";
import { notificationSupport, requestNotificationPermission, type NotificationSupport } from "../alerts/notify";
import styles from "./AlertSettingsPanel.module.css";

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

/** Personal alert preferences, local to this device — lives on the public
 *  Notifications tab alongside the admin-curated timeline, but writes to
 *  `AlertSettingsContext` (localStorage) instead of the notifications API. */
export function AlertSettingsPanel() {
	const { settings, setMyRealm, setFortInvasionAlerts, toggleBossAlertMinute } = useAlertSettings();
	const [permission, setPermission] = useState<NotificationSupport>(() => notificationSupport());

	async function handleEnableNotifications() {
		setPermission(await requestNotificationPermission());
	}

	return (
		<section className={`card ${styles.panel}`}>
			<h2 className={styles.title}>Alertas</h2>
			<p className={styles.subtitle}>
				Avisos locais neste dispositivo, sem cadastro — funcionam enquanto o app estiver aberto (aba ativa ou
				minimizada).
			</p>

			<div className={styles.permissionRow}>
				{permission !== "granted" && permission !== "unsupported" && (
					<button type="button" className="btn btn-primary" onClick={handleEnableNotifications}>
						Ativar notificações do navegador
					</button>
				)}
				<p className={styles.permissionStatus}>{PERMISSION_LABEL[permission]}</p>
			</div>

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

			<label className={styles.toggleRow}>
				<input
					type="checkbox"
					checked={settings.fortInvasionAlerts}
					disabled={!settings.myRealm}
					onChange={(e) => setFortInvasionAlerts(e.target.checked)}
				/>
				<span>
					Avisar quando um forte do meu reino for invadido
					{!settings.myRealm && <span className={styles.hint}> (escolha seu reino acima)</span>}
				</span>
			</label>

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
