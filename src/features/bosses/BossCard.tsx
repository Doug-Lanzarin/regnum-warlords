import { useState, type CSSProperties } from "react";
import { BOSS_INFO, bossDescription, bossIconUrl, bossName } from "../../data/bossConstants";
import { useLanguage } from "../../i18n/LanguageContext";
import { useT } from "../../i18n/useT";
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
	const { lang } = useLanguage();
	const t = useT();
	const [iconFailed, setIconFailed] = useState(false);
	const nextTs = nextSpawns[0];
	const msRemaining = nextTs * 1000 - now;
	const upcoming = nextSpawns.slice(1);

	return (
		<div
			className={`card ${styles.card} ${featured ? styles.featured : ""}`}
			style={{ "--realm-color": info.color } as CSSProperties}
		>
			{featured && <span className={styles.featuredTag}>{t("bosses.featuredTag")}</span>}

			<div className={styles.header}>
				{iconFailed ? (
					<span className={styles.emblem} aria-hidden>
						{info.realm ? info.realm[0] : "⚙"}
					</span>
				) : (
					<img
						src={bossIconUrl(bossKey)}
						alt=""
						className={styles.emblem}
						loading="lazy"
						onError={() => setIconFailed(true)}
					/>
				)}
				<div className={styles.headerText}>
					<h3 className={styles.name}>{bossName(bossKey, lang)}</h3>
					{info.realm && <span className={styles.realm}>{info.realm}</span>}
				</div>
			</div>

			<div className={styles.countdown}>
				<span className={styles.countdownLabel}>{msRemaining <= 0 ? t("bosses.countdownStatus") : t("bosses.countdownReappearIn")}</span>
				<span className={styles.countdownValue}>{formatCountdown(msRemaining, lang)}</span>
			</div>

			<dl className={styles.meta}>
				<div>
					<dt>{t("bosses.lastSpawn")}</dt>
					<dd>
						{formatDateTime(prevSpawn, lang)}
						<span className={styles.relative}> ({formatRelativePast(now - prevSpawn * 1000, lang)})</span>
					</dd>
				</div>
				<div>
					<dt>{t("bosses.nextSpawn")}</dt>
					<dd>{formatDateTime(nextTs, lang)}</dd>
				</div>
			</dl>

			{upcoming.length > 0 && (
				<details className={styles.upcoming}>
					<summary>{t("bosses.moreSchedules")}</summary>
					<ul>
						{upcoming.map((ts) => (
							<li key={ts}>{formatDateTime(ts, lang)}</li>
						))}
					</ul>
				</details>
			)}

			<p className={styles.description}>{bossDescription(bossKey, lang)}</p>
		</div>
	);
}
