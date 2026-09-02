import type { NotificationEntry } from "../../api/notificationsApi";
import { useLanguage } from "../../i18n/LanguageContext";
import { useT } from "../../i18n/useT";
import { formatDateTime, formatRelativePast } from "../../utils/time";
import styles from "./NotificationTimeline.module.css";

interface Props {
	notifications: NotificationEntry[];
	now: number;
	editable: boolean;
	busy: boolean;
	onDelete: (id: string) => void;
}

export function NotificationTimeline({ notifications, now, editable, busy, onDelete }: Props) {
	const { lang } = useLanguage();
	const t = useT();
	if (notifications.length === 0) return null;

	return (
		<ol className={styles.timeline}>
			{notifications.map((entry) => {
				const ts = new Date(entry.createdAt).getTime();
				return (
					<li key={entry.id} className={styles.item}>
						<span className={styles.dot} aria-hidden />
						<div className={`card ${styles.card}`}>
							<div className={styles.header}>
								<h3 className={styles.title}>{entry.title}</h3>
								{editable && (
									<button
										type="button"
										className={styles.deleteBtn}
										disabled={busy}
										onClick={() => onDelete(entry.id)}
										aria-label={t("notifications.removeAriaLabel", { title: entry.title })}
									>
										{t("notifications.remove")}
									</button>
								)}
							</div>
							<p className={styles.description}>{entry.description}</p>
							<time className={styles.time} dateTime={entry.createdAt} title={formatDateTime(Math.floor(ts / 1000), lang)}>
								{formatRelativePast(now - ts, lang)}
							</time>
						</div>
					</li>
				);
			})}
		</ol>
	);
}
