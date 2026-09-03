import { useState } from "react";
import { REALM_COLOR } from "../../data/realms";
import { useT } from "../../i18n/useT";
import type { TranslationKey } from "../../i18n/translate";
import type { RealmActivityCount } from "./wzEventsEngine";
import styles from "./FortActivityChart.module.css";

export type WishActivityRange = "1d" | "3d" | "5d" | "7d" | "10d" | "30d" | "90d";

// 1d/3d/5d/10d come from the raw events dump (~10 days of history); 7d/30d/
// 90d come from CoRT's pre-aggregated stats.json instead, same split
// `FortActivityChart` uses and for the same reason — there's no API window
// for an exact 15 or 20 days, only what these two sources actually cover.
const RANGE_ORDER: WishActivityRange[] = ["1d", "3d", "5d", "7d", "10d", "30d", "90d"];

const RANGE_TAB_LABEL_KEY: Record<WishActivityRange, TranslationKey> = {
	"1d": "wz.rangeTab1d",
	"3d": "wz.rangeTab3d",
	"5d": "wz.rangeTab5d",
	"7d": "wz.rangeTab7d",
	"10d": "wz.rangeTab10d",
	"30d": "wz.rangeTab30d",
	"90d": "wz.rangeTab90d",
};

const RANGE_PHRASE_KEY: Record<WishActivityRange, TranslationKey> = {
	"1d": "wz.rangePhrase1d",
	"3d": "wz.rangePhrase3d",
	"5d": "wz.rangePhrase5d",
	"7d": "wz.rangePhrase7d",
	"10d": "wz.rangePhrase10d",
	"30d": "wz.rangePhrase30d",
	"90d": "wz.rangePhrase90d",
};

interface Props {
	/** `null` for a range means its data hasn't loaded yet (or failed). */
	rangeData: Record<WishActivityRange, RealmActivityCount[] | null>;
}

/** How many dragon wishes each realm has made, broken down by time range —
 *  same shape as `FortActivityChart`, just tallying "wish" events instead
 *  of fort captures. */
export function WishActivityChart({ rangeData }: Props) {
	const t = useT();
	const [range, setRange] = useState<WishActivityRange>("7d");
	const activity = rangeData[range];
	const total = activity?.reduce((sum, a) => sum + a.count, 0) ?? 0;
	const max = Math.max(...(activity ?? []).map((a) => a.count), 1);
	const phrase = t(RANGE_PHRASE_KEY[range]);

	return (
		<section className={styles.section}>
			<div className={styles.header}>
				<div className={styles.titleGroup}>
					<h2>{t("wz.wishActivityTitle")}</h2>
					<span className={styles.count}>
						{activity ? t("wz.wishActivityCountLoaded", { total, phrase }) : t("wz.activityCountLoading")}
					</span>
				</div>

				<div className={styles.tabsGroup}>
					<span className={styles.tabsLabel} id="wish-activity-range-label">
						{t("wz.activityRangeLabel")}
					</span>
					<div className={styles.tabs} role="tablist" aria-labelledby="wish-activity-range-label">
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
					<p className={styles.empty}>{t("wz.wishActivityNoneInRange", { phrase })}</p>
				) : (
					<ul className={styles.list}>
						{activity.map(({ realm, count }) => (
							<li
								key={realm}
								className={styles.row}
								tabIndex={0}
								aria-label={t("wz.wishActivityRowAriaLabel", {
									realm,
									count,
									wishWord: t(count === 1 ? "wz.wishSingular" : "wz.wishPlural"),
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
