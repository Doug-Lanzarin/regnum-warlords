import { NotificationTimeline } from "../features/notifications/NotificationTimeline";
import { useNotifications } from "../features/notifications/useNotifications";
import styles from "./NotificationsPage.module.css";

/** Public, read-only timeline. Management lives on the unlisted
 *  /warlords/gerenciamento/notificacoes page instead — nothing here hints
 *  that it exists. */
export function NotificationsPage() {
	const { notifications, loading, error, now, refresh, remove, busy } = useNotifications();

	if (loading && notifications === null) {
		return (
			<div className={`card ${styles.centerMessage}`}>
				<span className={styles.spinner} aria-hidden />
				Carregando notificações…
			</div>
		);
	}

	if (error && notifications === null) {
		return (
			<div className={`card ${styles.centerMessage}`}>
				<span className="badge">Indisponível</span>
				<h1 className={styles.errorTitle}>Não foi possível carregar as notificações</h1>
				<p>{error}</p>
				<button className="btn btn-primary" onClick={refresh}>
					Tentar novamente
				</button>
			</div>
		);
	}

	if (notifications === null) return null;

	return (
		<div className={styles.wrap}>
			<div className={`card ${styles.intro}`}>
				<h1 className={styles.title}>Avisos Warlords</h1>
			</div>

			<NotificationTimeline notifications={notifications} now={now} editable={false} busy={busy} onDelete={remove} />
		</div>
	);
}
