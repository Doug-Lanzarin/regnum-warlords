import { BossCard } from "../features/bosses/BossCard";
import { formatRelativePast } from "../features/bosses/countdown";
import { useBossTimers } from "../features/bosses/useBossTimers";
import { BOSS_ORDER } from "../data/bossConstants";
import styles from "./BossesPage.module.css";

export function BossesPage() {
	const { data, loading, error, now, lastUpdated, refresh } = useBossTimers();

	if (loading && !data) {
		return (
			<div className={`card ${styles.centerMessage}`}>
				<span className={styles.spinner} aria-hidden />
				Carregando horários dos chefes…
			</div>
		);
	}

	if (error && !data) {
		return (
			<div className={`card ${styles.centerMessage}`}>
				<span className="badge">Dados ao vivo indisponíveis</span>
				<h1 className={styles.errorTitle}>Não foi possível carregar os chefes</h1>
				<p>{error}</p>
				<div className={styles.actions}>
					<button className="btn btn-primary" onClick={refresh}>
						Tentar novamente
					</button>
					<a className="btn btn-ghost" href="https://cort.ovh/bosses.html" target="_blank" rel="noreferrer">
						Abrir no CoRT ↗
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
			<div className={`card ${styles.intro}`}>
				<div>
					<h1 className={styles.title}>Chefes de mundo</h1>
					<p className={styles.subtitle}>
						Contagem regressiva de respawn dos chefes de Ignis, Syrtis e Alsius — dados ao vivo do CoRT.
					</p>
				</div>
				<div className={styles.statusRow}>
					{error && <span className={styles.staleWarning}>Falha ao atualizar — mostrando o último dado obtido.</span>}
					{lastUpdated && (
						<span className={styles.updated}>Atualizado {formatRelativePast(now - lastUpdated)}</span>
					)}
					<button className="btn btn-ghost" onClick={refresh}>
						Atualizar
					</button>
				</div>
			</div>

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
