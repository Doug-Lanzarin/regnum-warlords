import { formatFortLabel } from "../../data/fortKind";
import { REALMS, REALM_COLOR, type Realm } from "../../data/realms";
import { useLanguage } from "../../i18n/LanguageContext";
import { useT } from "../../i18n/useT";
import { formatRelativePast } from "../../utils/time";
import type { FortStatus } from "./wzEngine";
import styles from "./FortsSection.module.css";

interface Props {
	forts: FortStatus[];
	now: number;
}

export function FortsSection({ forts, now }: Props) {
	const { lang } = useLanguage();
	const t = useT();
	return (
		<section className={styles.section}>
			<div className={styles.heading}>
				<h2>{t("wz.fortsTitle")}</h2>
				<span className={styles.count}>{t("wz.fortsCount", { count: forts.length })}</span>
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
								<span className={styles.held}>{t("wz.fortsHeld", { held, total: realmForts.length })}</span>
							</div>
							<ul className={styles.list}>
								{realmForts.map((fort) => (
									<li key={fort.name} className={`${styles.row} ${fort.captured ? styles.rowCaptured : ""}`}>
										<div className={styles.rowMain}>
											<span className={styles.fortName}>{formatFortLabel(fort.name, lang)}</span>
											<span
												className={styles.ownerBadge}
												style={{ "--owner-color": REALM_COLOR[fort.owner as Realm] } as React.CSSProperties}
											>
												{fort.owner}
											</span>
										</div>
										{fort.captured && (
											<span className={styles.capturedNote}>
												{t("wz.fortInvadedNote")}
												{fort.since ? ` ${formatRelativePast(now - fort.since * 1000, lang)}` : ""}
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
