import { AdminUnlock } from "../features/notifications/AdminUnlock";
import { NotificationForm } from "../features/notifications/NotificationForm";
import { NotificationTimeline } from "../features/notifications/NotificationTimeline";
import { useNotifications } from "../features/notifications/useNotifications";
import styles from "./NotificationsAdminPage.module.css";

/** Unlisted management page (not in any nav) — the whole point of living at
 *  /warlords/gerenciamento/notificacoes instead of behind a button on the
 *  public /notificacoes page is that regular visitors never see this exists. */
export function NotificationsAdminPage() {
	const { notifications, loading, error, now, refresh, unlocked, unlock, lock, create, remove, actionError, busy } = useNotifications();

	if (loading && notifications === null) {
		return (
			<div className={`card ${styles.centerMessage}`}>
				<span className={styles.spinner} aria-hidden />
				Carregando…
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
				<div className={styles.introTop}>
					<h1 className={styles.title}>Gerenciar notificações</h1>
					{unlocked && (
						<button className="btn btn-ghost" onClick={lock}>
							Sair
						</button>
					)}
				</div>
				{unlocked ? (
					<NotificationForm busy={busy} onSubmit={create} />
				) : (
					<AdminUnlock error={actionError} onUnlock={unlock} />
				)}
				{unlocked && actionError && <p className={styles.actionError}>{actionError}</p>}
			</div>

			<NotificationTimeline notifications={notifications} now={now} editable={unlocked} busy={busy} onDelete={remove} />
		</div>
	);
}
