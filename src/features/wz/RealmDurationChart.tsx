import { REALM_COLOR, type Realm } from "../../data/realms";
import { formatDuration } from "../../utils/time";
import type { RealmDurationStat } from "./wzEventsEngine";
import styles from "./RealmDurationChart.module.css";

interface Props {
	icon: string;
	title: string;
	subtitle: string;
	data: RealmDurationStat[];
	emptyMessage: string;
	/** "desc" ranks the realm with the *highest* average first (used for
	 *  hold duration — holding longer is the stronger showing); "asc" ranks
	 *  the *lowest* first (used for recovery duration — recovering faster
	 *  is the stronger showing). A realm with no data (`avgMs: null`)
	 *  always sorts last regardless of direction. */
	sortDirection: "asc" | "desc";
	sampleLabel: (samples: number) => string;
	rowAriaLabel: (realm: Realm, formattedDuration: string, samples: number) => string;
}

/** Ranked horizontal bar per realm, same visual language as
 *  `FortActivityChart` (realm dot, colored track, value on the right) —
 *  but the value is a duration (via `formatDuration`) instead of a plain
 *  count, and there's no range-tab row since both callers use a fixed
 *  7-day window. Shared by `computeEnemyFortHoldDuration` and
 *  `computeOwnFortRecoveryDuration`'s charts, which differ only in their
 *  data, copy and sort direction. */
export function RealmDurationChart({ icon, title, subtitle, data, emptyMessage, sortDirection, sampleLabel, rowAriaLabel }: Props) {
	const withData = data.filter((d) => d.avgMs !== null);
	const max = Math.max(...withData.map((d) => d.avgMs as number), 1);
	const hasAnyData = withData.length > 0;

	const sorted = [...data].sort((a, b) => {
		if (a.avgMs === null && b.avgMs === null) return 0;
		if (a.avgMs === null) return 1;
		if (b.avgMs === null) return -1;
		return sortDirection === "desc" ? b.avgMs - a.avgMs : a.avgMs - b.avgMs;
	});

	return (
		<section className={styles.section}>
			<div className={styles.header}>
				<div className={styles.titleGroup}>
					<h2>
						<span aria-hidden>{icon}</span> {title}
					</h2>
					<span className={styles.subtitle}>{subtitle}</span>
				</div>
			</div>

			<div className={`card ${styles.card}`}>
				{!hasAnyData ? (
					<p className={styles.empty}>{emptyMessage}</p>
				) : (
					<ul className={styles.list}>
						{sorted.map(({ realm, avgMs, samples }) => {
							const formatted = avgMs === null ? null : formatDuration(avgMs);
							return (
								<li
									key={realm}
									className={styles.row}
									tabIndex={0}
									aria-label={formatted ? rowAriaLabel(realm, formatted, samples) : `${realm}: ${emptyMessage}`}
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
										{avgMs !== null && (
											<div
												className={styles.bar}
												style={{ width: `${(avgMs / max) * 100}%`, "--realm-color": REALM_COLOR[realm] } as React.CSSProperties}
											/>
										)}
									</div>
									<span className={styles.valueGroup}>
										{formatted ? (
											<>
												<span className={styles.value}>{formatted}</span>
												<span className={styles.samples}>{sampleLabel(samples)}</span>
											</>
										) : (
											<span className={styles.noData}>—</span>
										)}
									</span>
								</li>
							);
						})}
					</ul>
				)}
			</div>
		</section>
	);
}
