import type { CSSProperties } from "react";
import { BOSS_INFO } from "../../data/bossConstants";
import type { BossKey } from "../../types/bosses";
import { formatCountdown, formatDateTime, formatRelativePast } from "./countdown";
import styles from "./BossCard.module.css";

interface Props {
	bossKey: BossKey;
	prevSpawn: number;
	nextSpawns: number[];
	now: number;
	featured: boolean;
}

export function BossCard({ bossKey, prevSpawn, nextSpawns, now, featured }: Props) {
	const info = BOSS_INFO[bossKey];
	const nextTs = nextSpawns[0];
	const msRemaining = nextTs * 1000 - now;
	const upcoming = nextSpawns.slice(1);

	return (
		<div
			className={`card ${styles.card} ${featured ? styles.featured : ""}`}
			style={{ "--realm-color": info.color } as CSSProperties}
		>
			{featured && <span className={styles.featuredTag}>Próximo a reaparecer</span>}

			<div className={styles.header}>
				<span className={styles.emblem} aria-hidden>
					{info.realm ? info.realm[0] : "⚙"}
				</span>
				<div className={styles.headerText}>
					<h3 className={styles.name}>{info.name}</h3>
					{info.realm && <span className={styles.realm}>{info.realm}</span>}
				</div>
			</div>

			<div className={styles.countdown}>
				<span className={styles.countdownLabel}>{msRemaining <= 0 ? "Status" : "Reaparece em"}</span>
				<span className={styles.countdownValue}>{formatCountdown(msRemaining)}</span>
			</div>

			<dl className={styles.meta}>
				<div>
					<dt>Último spawn</dt>
					<dd>
						{formatDateTime(prevSpawn)}
						<span className={styles.relative}> ({formatRelativePast(now - prevSpawn * 1000)})</span>
					</dd>
				</div>
				<div>
					<dt>Próximo horário</dt>
					<dd>{formatDateTime(nextTs)}</dd>
				</div>
			</dl>

			{upcoming.length > 0 && (
				<details className={styles.upcoming}>
					<summary>Ver mais horários</summary>
					<ul>
						{upcoming.map((ts) => (
							<li key={ts}>{formatDateTime(ts)}</li>
						))}
					</ul>
				</details>
			)}

			<p className={styles.description}>{info.description}</p>
		</div>
	);
}
