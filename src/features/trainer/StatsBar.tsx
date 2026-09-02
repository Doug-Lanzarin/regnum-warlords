import { useState } from "react";
import { useT } from "../../i18n/useT";
import type { TrainerBuild, TrainerTotals } from "../../types/trainer";
import { encodeBuild } from "./shareLink";
import { PointsBar } from "./PointsBar";
import styles from "./StatsBar.module.css";

interface Props {
	build: TrainerBuild;
	totals: TrainerTotals;
	dataSource: "live" | "bundled" | null;
	onReset: () => void;
}

export function StatsBar({ build, totals, dataSource, onReset }: Props) {
	const t = useT();
	const [copied, setCopied] = useState(false);

	async function handleShare() {
		const encoded = encodeBuild(build);
		const url = `${window.location.origin}${window.location.pathname}?build=${encoded}`;
		window.history.replaceState(null, "", `?build=${encoded}`);
		try {
			await navigator.clipboard.writeText(url);
			setCopied(true);
			setTimeout(() => setCopied(false), 2500);
		} catch {
			// clipboard unavailable — the URL bar was still updated
		}
	}

	return (
		<div className={`card ${styles.wrap}`}>
			<div className={styles.points}>
				<PointsBar label={t("trainer.disciplinePoints")} spent={totals.dpointsSpent} total={totals.dpointsTotal} />
				<PointsBar label={t("trainer.powerPoints")} spent={totals.ppointsSpent} total={totals.ppointsTotal} />
			</div>

			<div className={styles.right}>
				{dataSource && (
					<span
						className={`${styles.source} ${dataSource === "live" ? styles.sourceLive : ""}`}
						title={dataSource === "live" ? t("trainer.liveDataTooltip") : t("trainer.localDataTooltip")}
					>
						<span className={styles.sourceDot} aria-hidden /> {dataSource === "live" ? t("trainer.liveData") : t("trainer.localData")}
					</span>
				)}
				<button className="btn btn-ghost" onClick={onReset}>
					{t("trainer.reset")}
				</button>
				<button className="btn btn-primary" onClick={handleShare}>
					{copied ? t("trainer.linkCopied") : t("trainer.shareBuild")}
				</button>
			</div>
		</div>
	);
}
