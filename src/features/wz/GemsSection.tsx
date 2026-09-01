import { REALMS, REALM_COLOR } from "../../data/realms";
import type { GemStatus } from "./wzEngine";
import { GemIcon, realmOrNeutralColor } from "./wzIcons";
import styles from "./GemsSection.module.css";

interface Props {
	gems: GemStatus[];
}

export function GemsSection({ gems }: Props) {
	return (
		<section className={styles.section}>
			<div className={styles.heading}>
				<h2>Gemas</h2>
				<span className={styles.count}>{gems.length} gemas</span>
			</div>
			<div className={styles.grid}>
				{REALMS.map((realm) => {
					const realmGems = gems.filter((g) => g.home === realm);
					const claimed = realmGems.filter((g) => g.owner !== null).length;
					return (
						<div key={realm} className={`card ${styles.column}`} style={{ "--realm-color": REALM_COLOR[realm] } as React.CSSProperties}>
							<div className={styles.columnHeader}>
								<span className={styles.realmDot} aria-hidden />
								<h3 className={styles.realmName}>{realm}</h3>
								<span className={styles.held}>
									{claimed}/{realmGems.length} reivindicadas
								</span>
							</div>
							<ul className={styles.list}>
								{realmGems.map((gem) => (
									<li
										key={gem.index}
										className={styles.gemDot}
										title={gem.owner ? `Gema ${gem.index + 1}: ${gem.owner}` : `Gema ${gem.index + 1}: sem dono`}
									>
										<GemIcon color={realmOrNeutralColor(gem.owner, REALM_COLOR)} />
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
