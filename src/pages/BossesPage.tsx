import { BossCard } from "../features/bosses/BossCard";
import { useBossTimers } from "../features/bosses/useBossTimers";
import { BOSS_ORDER } from "../data/bossConstants";
import { useT } from "../i18n/useT";
import styles from "./BossesPage.module.css";

export function BossesPage() {
	const t = useT();
	const { data, loading, error, now, refresh } = useBossTimers();

	if (loading && !data) {
		return (
			<div className={`card ${styles.centerMessage}`}>
				<span className={styles.spinner} aria-hidden />
				{t("bosses.loading")}
			</div>
		);
	}

	if (error && !data) {
		return (
			<div className={`card ${styles.centerMessage}`}>
				<span className="badge">{t("common.liveDataUnavailable")}</span>
				<h1 className={styles.errorTitle}>{t("bosses.errorTitle")}</h1>
				<p>{error}</p>
				<div className={styles.actions}>
					<button className="btn btn-primary" onClick={refresh}>
						{t("common.tryAgain")}
					</button>
					<a className="btn btn-ghost" href="https://cort.ovh/bosses.html" target="_blank" rel="noreferrer">
						{t("common.openInCort")}
					</a>
				</div>
			</div>
		);
	}

	if (!data) return null;

	const sorted = [...BOSS_ORDER].sort((a, b) => data.next_spawns[a][0] - data.next_spawns[b][0]);
	const featuredKey = sorted[0];

	return (
		<div className={styles.wrap}>
			<div className={styles.grid}>
				{sorted.map((key) => (
					<BossCard
						key={key}
						bossKey={key}
						prevSpawn={data.prev_spawns[key]}
						nextSpawns={data.next_spawns[key]}
						now={now}
						featured={key === featuredKey}
					/>
				))}
			</div>
		</div>
	);
}
