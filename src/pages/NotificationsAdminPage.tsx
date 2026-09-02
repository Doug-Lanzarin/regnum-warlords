import { AdminUnlock } from "../features/notifications/AdminUnlock";
import { NotificationForm } from "../features/notifications/NotificationForm";
import { NotificationTimeline } from "../features/notifications/NotificationTimeline";
import { useNotifications } from "../features/notifications/useNotifications";
import { useT } from "../i18n/useT";
import styles from "./NotificationsAdminPage.module.css";

/** Unlisted management page (not in any nav) — the whole point of living at
 *  /warlords/gerenciamento/notificacoes instead of behind a button on the
 *  public /notificacoes page is that regular visitors never see this exists. */
export function NotificationsAdminPage() {
	const t = useT();
	const { notifications, loading, error, now, refresh, unlocked, unlock, lock, create, remove, actionError, busy } = useNotifications();

	if (loading && notifications === null) {
		return (
			<div className={`card ${styles.centerMessage}`}>
				<span className={styles.spinner} aria-hidden />
				{t("notificationsAdmin.loading")}
			</div>
		);
	}

	if (error && notifications === null) {
		return (
			<div className={`card ${styles.centerMessage}`}>
				<span className="badge">{t("common.unavailable")}</span>
				<h1 className={styles.errorTitle}>{t("notificationsAdmin.unavailableTitle")}</h1>
				<p>{error}</p>
				<button className="btn btn-primary" onClick={refresh}>
					{t("common.tryAgain")}
				</button>
			</div>
		);
	}

	if (notifications === null) return null;

	return (
		<div className={styles.wrap}>
			<div className={`card ${styles.intro}`}>
				<div className={styles.introTop}>
					<h1 className={styles.title}>{t("notificationsAdmin.title")}</h1>
					{unlocked && (
						<button className="btn btn-ghost" onClick={lock}>
							{t("notificationsAdmin.logout")}
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
