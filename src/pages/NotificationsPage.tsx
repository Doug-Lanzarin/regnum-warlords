import { useState } from "react";
import { AdminUnlock } from "../features/notifications/AdminUnlock";
import { NotificationForm } from "../features/notifications/NotificationForm";
import { NotificationTimeline } from "../features/notifications/NotificationTimeline";
import { useNotifications } from "../features/notifications/useNotifications";
import styles from "./NotificationsPage.module.css";

export function NotificationsPage() {
	const { notifications, loading, error, now, refresh, unlocked, unlock, lock, create, remove, actionError, dismissError, busy } = useNotifications();
	const [showUnlock, setShowUnlock] = useState(false);
	// A failed create/delete can knock unlocked back to false (wrong/expired
	// token) — keep the form (and its error) visible instead of silently
	// collapsing back to the "Gerenciar" link with no explanation.
	const showUnlockForm = !unlocked && (showUnlock || actionError !== null);

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
				<div className={styles.introTop}>
					<div>
						<h1 className={styles.title}>Notificações</h1>
						<p className={styles.subtitle}>Novidades e avisos sobre o Regnum Warlords.</p>
					</div>
					{unlocked ? (
						<button className="btn btn-ghost" onClick={lock}>
							Sair do modo de gerenciamento
						</button>
					) : (
						!showUnlockForm && (
							<button className={styles.manageLink} onClick={() => setShowUnlock(true)}>
								Gerenciar
							</button>
						)
					)}
				</div>

				{showUnlockForm && (
					<AdminUnlock
						error={actionError}
						onUnlock={(token) => {
							unlock(token);
							setShowUnlock(false);
						}}
						onCancel={() => {
							setShowUnlock(false);
							dismissError();
						}}
					/>
				)}

				{unlocked && (
					<>
						<NotificationForm busy={busy} onSubmit={create} />
						{actionError && <p className={styles.actionError}>{actionError}</p>}
					</>
				)}
			</div>

			<NotificationTimeline notifications={notifications} now={now} editable={unlocked} busy={busy} onDelete={remove} />
		</div>
	);
}
