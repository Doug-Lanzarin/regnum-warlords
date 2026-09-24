import { useT } from "../../i18n/useT";
import { formatDuration } from "../../utils/time";
import type { BzStatus } from "./bzScheduleEngine";
import styles from "./BzStatusCard.module.css";

interface Props {
	status: BzStatus;
	now: number;
}

/** "Is BZ open right now" status, with a live countdown to the next
 *  transition — same open/closed-badge-plus-countdown shape as
 *  `BossCard`'s timer, just for a single always-on-or-off zone instead of
 *  N independent boss timers. */
export function BzStatusCard({ status, now }: Props) {
	const t = useT();
	const remainingMs = status.changesAtMs === null ? null : status.changesAtMs - now;

	return (
		<div className={`card ${styles.card}`} data-open={status.isOpen}>
			<div className={styles.dot} aria-hidden />
			<div className={styles.text}>
				<span className={styles.status}>{t(status.isOpen ? "bz.statusOpen" : "bz.statusClosed")}</span>
				{remainingMs !== null && (
					<span className={styles.countdown}>
						{t(status.isOpen ? "bz.endsIn" : "bz.opensIn", { duration: formatDuration(Math.max(0, remainingMs)) })}
					</span>
				)}
			</div>
		</div>
	);
}
