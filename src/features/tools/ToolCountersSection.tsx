import { useT } from "../../i18n/useT";
import { formatDuration } from "../../utils/time";
import { useToolCounters } from "./useToolCounters";
import styles from "./ToolCountersSection.module.css";

export function ToolCountersSection() {
	const t = useT();
	const { aboboras, ximerald, now } = useToolCounters();

	return (
		<div className={styles.grid}>
			<div className={`card ${styles.card}`}>
				<span className={styles.name}>{t("tools.countersXimerald")}</span>
				<span className={styles.label}>{t("tools.countersResetIn")}</span>
				<span className={styles.value}>{formatDuration(ximerald.nextResetMs - now)}</span>
			</div>
			<div className={`card ${styles.card}`}>
				<span className={styles.name}>{t("tools.countersAboboras")}</span>
				<span className={styles.label}>{t("tools.countersResetIn")}</span>
				<span className={styles.value}>{formatDuration(aboboras.nextResetMs - now)}</span>
			</div>
		</div>
	);
}
