import { AlertSettingsPanel } from "../features/notifications/AlertSettingsPanel";
import { NotificationTimeline } from "../features/notifications/NotificationTimeline";
import { useNotifications } from "../features/notifications/useNotifications";
import { useT } from "../i18n/useT";
import styles from "./NotificationsPage.module.css";

/** Public, read-only timeline, plus the personal alert settings panel
 *  (local device only — independent of the timeline's own load state, so
 *  it still renders if the notifications API is unreachable, e.g. local
 *  dev where /api/notifications doesn't exist at all). Management lives on
 *  the unlisted /warlords/gerenciamento/notificacoes page instead — nothing
 *  here hints that it exists. */
export function NotificationsPage() {
	const t = useT();
	const { notifications, loading, error, now, refresh, remove, busy } = useNotifications();

	return (
		<div className={styles.wrap}>
			<AlertSettingsPanel />

			{loading && notifications === null ? (
				<div className={`card ${styles.centerMessage}`}>
					<span className={styles.spinner} aria-hidden />
					{t("notifications.loading")}
				</div>
			) : error && notifications === null ? (
				<div className={`card ${styles.centerMessage}`}>
					<span className="badge">{t("common.unavailable")}</span>
					<h2 className={styles.errorTitle}>{t("notifications.unavailableTitle")}</h2>
					<p>{error}</p>
					<button className="btn btn-primary" onClick={refresh}>
						{t("common.tryAgain")}
					</button>
				</div>
			) : notifications !== null ? (
				<NotificationTimeline notifications={notifications} now={now} editable={false} busy={busy} onDelete={remove} />
			) : null}
		</div>
	);
}
