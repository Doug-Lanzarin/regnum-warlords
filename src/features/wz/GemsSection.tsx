import { REALMS, REALM_COLOR } from "../../data/realms";
import { useT } from "../../i18n/useT";
import type { GemStatus } from "./wzEngine";
import { GemIcon, realmOrNeutralColor } from "./wzIcons";
import styles from "./GemsSection.module.css";

interface Props {
	gems: GemStatus[];
}

export function GemsSection({ gems }: Props) {
	const t = useT();
	return (
		<section className={styles.section}>
			<div className={styles.heading}>
				<h2>{t("wz.gemsTitle")}</h2>
				<span className={styles.count}>{t("wz.gemsCount", { count: gems.length })}</span>
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
								<span className={styles.held}>{t("wz.gemsClaimed", { claimed, total: realmGems.length })}</span>
							</div>
							<ul className={styles.list}>
								{realmGems.map((gem) => (
									<li
										key={gem.index}
										className={styles.gemDot}
										title={
											gem.owner
												? t("wz.gemTooltipOwned", { n: gem.index + 1, owner: gem.owner })
												: t("wz.gemTooltipUnowned", { n: gem.index + 1 })
										}
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
