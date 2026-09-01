import { REALM_COLOR } from "../../data/realms";
import type { RealmActivityCount } from "./wzEventsEngine";
import styles from "./FortActivityChart.module.css";

interface Props {
	activity: RealmActivityCount[];
}

/** Horizontal bar per realm, most active first — how many forts each realm
 *  captured/recaptured in the last 24h, so it's obvious at a glance who's
 *  pushing hardest right now. */
export function FortActivityChart({ activity }: Props) {
	const total = activity.reduce((sum, a) => sum + a.count, 0);
	const max = Math.max(...activity.map((a) => a.count), 1);

	return (
		<section className={styles.section}>
			<div className={styles.heading}>
				<h2>Atividade nas últimas 24h</h2>
				<span className={styles.count}>{total} fortes mudaram de mãos</span>
			</div>
			<div className={`card ${styles.card}`}>
				{total === 0 ? (
					<p className={styles.empty}>Nenhum forte capturado nas últimas 24h.</p>
				) : (
					<ul className={styles.list}>
						{activity.map(({ realm, count }, index) => (
							<li
								key={realm}
								className={styles.row}
								tabIndex={0}
								aria-label={`${realm}: ${count} forte${count === 1 ? "" : "s"} nas últimas 24h`}
							>
								<span className={styles.realmLabel}>
									<span
										className={styles.realmDot}
										style={{ "--realm-color": REALM_COLOR[realm] } as React.CSSProperties}
										aria-hidden
									/>
									{realm}
								</span>
								<div className={styles.track}>
									<div
										className={styles.bar}
										style={{ width: `${(count / max) * 100}%`, "--realm-color": REALM_COLOR[realm] } as React.CSSProperties}
									/>
								</div>
								<span className={styles.value}>{count}</span>
								{index === 0 && count > 0 && (
									<span className={styles.leaderTag} title="Reino mais ativo nas últimas 24h" aria-hidden>
										🔥
									</span>
								)}
							</li>
						))}
					</ul>
				)}
			</div>
		</section>
	);
}
