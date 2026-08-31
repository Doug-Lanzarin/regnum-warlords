import { REALMS, REALM_COLOR, type Realm } from "../../data/realms";
import { formatRelativePast } from "../../utils/time";
import type { FortStatus } from "./wzEngine";
import styles from "./FortsSection.module.css";

interface Props {
	forts: FortStatus[];
	now: number;
}

export function FortsSection({ forts, now }: Props) {
	return (
		<section className={styles.section}>
			<div className={styles.heading}>
				<h2>Fortes</h2>
				<span className={styles.count}>{forts.length} fortes</span>
			</div>
			<div className={styles.grid}>
				{REALMS.map((realm) => {
					const realmForts = forts.filter((f) => f.home === realm);
					const held = realmForts.filter((f) => f.owner === realm).length;
					return (
						<div key={realm} className={`card ${styles.column}`} style={{ "--realm-color": REALM_COLOR[realm] } as React.CSSProperties}>
							<div className={styles.columnHeader}>
								<span className={styles.realmDot} aria-hidden />
								<h3 className={styles.realmName}>{realm}</h3>
								<span className={styles.held}>
									{held}/{realmForts.length} sob controle
								</span>
							</div>
							<ul className={styles.list}>
								{realmForts.map((fort) => (
									<li key={fort.name} className={`${styles.row} ${fort.captured ? styles.rowCaptured : ""}`}>
										<div className={styles.rowMain}>
											<span className={styles.fortName}>{fort.name.replace(/\s*\(\d+\)$/, "")}</span>
											<span
												className={styles.ownerBadge}
												style={{ "--owner-color": REALM_COLOR[fort.owner as Realm] } as React.CSSProperties}
											>
												{fort.owner}
											</span>
										</div>
										{fort.captured && (
											<span className={styles.capturedNote}>
												Invadido{fort.since ? ` ${formatRelativePast(now - fort.since * 1000)}` : ""}
											</span>
										)}
									</li>
								))}
							</ul>
						</div>
					);
				})}
			</div>
		</section>
	);
}
