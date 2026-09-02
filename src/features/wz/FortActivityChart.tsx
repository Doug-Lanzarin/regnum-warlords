import { useState } from "react";
import { REALM_COLOR } from "../../data/realms";
import { useT } from "../../i18n/useT";
import type { TranslationKey } from "../../i18n/translate";
import type { RealmActivityCount } from "./wzEventsEngine";
import styles from "./FortActivityChart.module.css";

export type FortActivityRange = "24h" | "7d" | "30d" | "90d";

const RANGE_ORDER: FortActivityRange[] = ["24h", "7d", "30d", "90d"];

const RANGE_TAB_LABEL_KEY: Record<FortActivityRange, TranslationKey> = {
	"24h": "wz.rangeTab24h",
	"7d": "wz.rangeTab7d",
	"30d": "wz.rangeTab30d",
	"90d": "wz.rangeTab90d",
};

const RANGE_PHRASE_KEY: Record<FortActivityRange, TranslationKey> = {
	"24h": "wz.rangePhrase24h",
	"7d": "wz.rangePhrase7d",
	"30d": "wz.rangePhrase30d",
	"90d": "wz.rangePhrase90d",
};

interface Props {
	/** `null` for a range means its data hasn't loaded yet (or failed). */
	rangeData: Record<FortActivityRange, RealmActivityCount[] | null>;
}

/** Same chart, four time windows — a tab row switches which one is shown.
 *  Horizontal bar per realm, most active first, so it's obvious at a
 *  glance who's pushing hardest in the selected period. */
export function FortActivityChart({ rangeData }: Props) {
	const t = useT();
	const [range, setRange] = useState<FortActivityRange>("24h");
	const activity = rangeData[range];
	const total = activity?.reduce((sum, a) => sum + a.count, 0) ?? 0;
	const max = Math.max(...(activity ?? []).map((a) => a.count), 1);
	const phrase = t(RANGE_PHRASE_KEY[range]);

	return (
		<section className={styles.section}>
			<div className={styles.header}>
				<div className={styles.titleGroup}>
					<h2>{t("wz.activityTitle")}</h2>
					<span className={styles.count}>
						{activity ? t("wz.activityCountLoaded", { total, phrase }) : t("wz.activityCountLoading")}
					</span>
				</div>

				<div className={styles.tabsGroup}>
					<span className={styles.tabsLabel} id="fort-activity-range-label">
						{t("wz.activityRangeLabel")}
					</span>
					<div className={styles.tabs} role="tablist" aria-labelledby="fort-activity-range-label">
						{RANGE_ORDER.map((r) => (
							<button
								key={r}
								type="button"
								role="tab"
								aria-selected={range === r}
								className={`${styles.tab} ${range === r ? styles.tabActive : ""}`}
								onClick={() => setRange(r)}
							>
								{t(RANGE_TAB_LABEL_KEY[r])}
							</button>
						))}
					</div>
				</div>
			</div>

			<div className={`card ${styles.card}`}>
				{!activity ? (
					<p className={styles.empty}>{t("wz.activityLoadingData")}</p>
				) : total === 0 ? (
					<p className={styles.empty}>{t("wz.activityNoneInRange", { phrase })}</p>
				) : (
					<ul className={styles.list}>
						{activity.map(({ realm, count }) => (
							<li
								key={realm}
								className={styles.row}
								tabIndex={0}
								aria-label={t("wz.activityRowAriaLabel", {
									realm,
									count,
									fortWord: t(count === 1 ? "wz.fortSingular" : "wz.fortPlural"),
									phrase,
								})}
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
							</li>
						))}
					</ul>
				)}
			</div>
		</section>
	);
}
