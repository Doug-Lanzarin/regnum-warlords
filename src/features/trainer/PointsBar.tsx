import { useT } from "../../i18n/useT";
import styles from "./PointsBar.module.css";

interface Props {
	label: string;
	spent: number;
	total: number;
}

export function PointsBar({ label, spent, total }: Props) {
	const t = useT();
	const pct = total > 0 ? Math.min(100, Math.max(0, (spent / total) * 100)) : 0;
	const over = spent > total;
	return (
		<div className={styles.wrap}>
			<div className={styles.headerRow}>
				<span className={styles.label}>{label}</span>
				<span className={`${styles.value} ${over ? styles.valueDanger : ""}`}>
					{total - spent} <span className={styles.valueMuted}>{t("trainer.remaining")}</span>
				</span>
			</div>
			<div className={`progress-track ${styles.track}`}>
				<div
					className={`progress-fill ${over ? styles.fillDanger : ""}`}
					style={{ width: `${pct}%` }}
				/>
			</div>
			<div className={styles.footRow}>
				<span>
					{spent} / {total} {t("trainer.usedSuffix")}
				</span>
			</div>
		</div>
	);
}
