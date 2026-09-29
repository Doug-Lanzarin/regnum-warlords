import { REALMS, REALM_COLOR } from "../../data/realms";
import { useLanguage } from "../../i18n/LanguageContext";
import { useT } from "../../i18n/useT";
import { formatDateTime } from "../../utils/time";
import type { RealmBalance } from "./wzBalanceEngine";
import styles from "./BalanceSection.module.css";

interface Props {
	balances: RealmBalance[];
}

/** Per-realm "Balanço" tier — see `computeRealmBalance`'s own doc comment
 *  for the rules. Same 3-column-per-realm layout `GemsSection` uses, since
 *  this is the same kind of thing: one self-contained status per realm,
 *  not a ranked comparison between them. */
export function BalanceSection({ balances }: Props) {
	const { lang } = useLanguage();
	const t = useT();
	return (
		<section className={styles.section}>
			<div className={styles.heading}>
				<h2>{t("wz.balanceTitle")}</h2>
				<span className={styles.subtitle}>{t("wz.balanceSubtitle")}</span>
			</div>
			<div className={styles.grid}>
				{REALMS.map((realm) => {
					const balance = balances.find((b) => b.realm === realm);
					if (!balance) return null;
					return (
						<div key={realm} className={`card ${styles.column}`} style={{ "--realm-color": REALM_COLOR[realm] } as React.CSSProperties}>
							<div className={styles.columnHeader}>
								<span className={styles.realmDot} aria-hidden />
								<h3 className={styles.realmName}>{realm}</h3>
							</div>

							<div className={styles.tierBox}>
								<span className={styles.tierLabel}>{t("wz.balanceTierLabel")}</span>
								<span className={styles.tierValue}>{balance.tier}</span>
							</div>

							<p className={styles.detail}>{t("wz.balanceWishCount", { count: balance.wishCount })}</p>
							{balance.tier === 2 && balance.topInvader && (
								<p className={styles.detail}>
									{t("wz.balanceTopInvader", { realm: balance.topInvader.realm, count: balance.topInvader.count })}
								</p>
							)}

							<p className={styles.predicted}>
								{balance.predictedChangeAtMs !== null
									? t("wz.balancePredictedChange", { date: formatDateTime(Math.floor(balance.predictedChangeAtMs / 1000), lang) })
									: t("wz.balanceNoChangePredicted")}
							</p>
						</div>
					);
				})}
			</div>
		</section>
	);
}
