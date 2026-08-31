import { REALMS, REALM_COLOR } from "../../data/realms";
import { formatRelativePast } from "../../utils/time";
import type { RelicStatus } from "./wzEngine";
import styles from "./RelicsSection.module.css";

interface Props {
	relics: RelicStatus[];
	now: number;
}

export function RelicsSection({ relics, now }: Props) {
	return (
		<section className={styles.section}>
			<div className={styles.heading}>
				<h2>Relíquias</h2>
				<span className={styles.count}>{relics.length} relíquias</span>
			</div>
			<div className={styles.grid}>
				{REALMS.map((realm) => {
					const realmRelics = relics.filter((r) => r.home === realm);
					return (
						<div key={realm} className={`card ${styles.column}`} style={{ "--realm-color": REALM_COLOR[realm] } as React.CSSProperties}>
							<div className={styles.columnHeader}>
								<span className={styles.realmDot} aria-hidden />
								<h3 className={styles.realmName}>{realm}</h3>
							</div>
							<ul className={styles.list}>
								{realmRelics.map((relic) => {
									const captured = relic.status === "altar" && !!relic.holder && relic.holder !== relic.home;
									return (
										<li
											key={relic.name}
											className={`${styles.row} ${relic.status === "transit" || captured ? styles.rowTransit : ""}`}
										>
											<div className={styles.rowMain}>
												<span className={styles.relicName}>{relic.name}</span>
												<span
													className={`${styles.statusBadge} ${relic.status === "transit" || captured ? styles.statusTransit : ""}`}
												>
													{captured && "Capturada"}
													{!captured && relic.status === "altar" && "Segura no altar"}
													{relic.status === "transit" && "Em trânsito"}
													{relic.status === "unknown" && "Sem eventos recentes"}
												</span>
											</div>
											{relic.status === "transit" && relic.holder && (
												<span className={styles.holderNote}>
													Carregada por {relic.holder}
													{relic.since ? ` · ${formatRelativePast(now - relic.since * 1000)}` : ""}
												</span>
											)}
											{captured && (
												<span className={styles.holderNote}>
													Nas mãos de {relic.holder}
													{relic.since ? ` · ${formatRelativePast(now - relic.since * 1000)}` : ""}
												</span>
											)}
											{!captured && relic.status === "altar" && relic.since && (
												<span className={styles.sinceNote}>Desde {formatRelativePast(now - relic.since * 1000)}</span>
											)}
										</li>
									);
								})}
							</ul>
						</div>
					);
				})}
			</div>
		</section>
	);
}
