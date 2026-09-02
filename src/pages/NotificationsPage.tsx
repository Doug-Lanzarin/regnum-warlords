import { AlertSettingsPanel } from "../features/notifications/AlertSettingsPanel";
import { NotificationTimeline } from "../features/notifications/NotificationTimeline";
import { useNotifications } from "../features/notifications/useNotifications";
import styles from "./NotificationsPage.module.css";

/** Public, read-only timeline, plus the personal alert settings panel
 *  (local device only — independent of the timeline's own load state, so
 *  it still renders if the notifications API is unreachable, e.g. local
 *  dev where /api/notifications doesn't exist at all). Management lives on
 *  the unlisted /warlords/gerenciamento/notificacoes page instead — nothing
 *  here hints that it exists. */
export function NotificationsPage() {
	const { notifications, loading, error, now, refresh, remove, busy } = useNotifications();

	return (
		<div className={styles.wrap}>
			<AlertSettingsPanel />

			{loading && notifications === null ? (
				<div className={`card ${styles.centerMessage}`}>
					<span className={styles.spinner} aria-hidden />
					Carregando notificações…
				</div>
			) : error && notifications === null ? (
				<div className={`card ${styles.centerMessage}`}>
					<span className="badge">Indisponível</span>
					<h2 className={styles.errorTitle}>Não foi possível carregar os avisos</h2>
					<p>{error}</p>
					<button className="btn btn-primary" onClick={refresh}>
						Tentar novamente
					</button>
				</div>
			) : notifications !== null ? (
				<NotificationTimeline notifications={notifications} now={now} editable={false} busy={busy} onDelete={remove} />
			) : null}
		</div>
	);
}
