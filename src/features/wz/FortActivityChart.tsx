import { useState } from "react";
import { REALM_COLOR } from "../../data/realms";
import type { RealmActivityCount } from "./wzEventsEngine";
import styles from "./FortActivityChart.module.css";

export type FortActivityRange = "24h" | "7d" | "30d" | "90d";

const RANGE_ORDER: FortActivityRange[] = ["24h", "7d", "30d", "90d"];

const RANGE_TAB_LABEL: Record<FortActivityRange, string> = {
	"24h": "24h",
	"7d": "Semana",
	"30d": "Mês",
	"90d": "3 meses",
};

const RANGE_PHRASE: Record<FortActivityRange, string> = {
	"24h": "nas últimas 24h",
	"7d": "na última semana",
	"30d": "no último mês",
	"90d": "nos últimos 3 meses",
};

interface Props {
	/** `null` for a range means its data hasn't loaded yet (or failed). */
	rangeData: Record<FortActivityRange, RealmActivityCount[] | null>;
}

/** Same chart, four time windows — a tab row switches which one is shown.
 *  Horizontal bar per realm, most active first, so it's obvious at a
 *  glance who's pushing hardest in the selected period. */
export function FortActivityChart({ rangeData }: Props) {
	const [range, setRange] = useState<FortActivityRange>("24h");
	const activity = rangeData[range];
	const total = activity?.reduce((sum, a) => sum + a.count, 0) ?? 0;
	const max = Math.max(...(activity ?? []).map((a) => a.count), 1);

	return (
		<section className={styles.section}>
			<div className={styles.heading}>
				<h2>Atividade dos reinos</h2>
				<span className={styles.count}>
					{activity ? `${total} fortes mudaram de mãos ${RANGE_PHRASE[range]}` : "carregando…"}
				</span>
			</div>

			<div className={styles.tabs} role="tablist" aria-label="Período">
				{RANGE_ORDER.map((r) => (
					<button
						key={r}
						type="button"
						role="tab"
						aria-selected={range === r}
						className={`${styles.tab} ${range === r ? styles.tabActive : ""}`}
						onClick={() => setRange(r)}
					>
						{RANGE_TAB_LABEL[r]}
					</button>
				))}
			</div>

			<div className={`card ${styles.card}`}>
				{!activity ? (
					<p className={styles.empty}>Carregando dados…</p>
				) : total === 0 ? (
					<p className={styles.empty}>Nenhum forte capturado {RANGE_PHRASE[range]}.</p>
				) : (
					<ul className={styles.list}>
						{activity.map(({ realm, count }, index) => (
							<li
								key={realm}
								className={styles.row}
								tabIndex={0}
								aria-label={`${realm}: ${count} forte${count === 1 ? "" : "s"} ${RANGE_PHRASE[range]}`}
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
									<span className={styles.leaderTag} title={`Reino mais ativo ${RANGE_PHRASE[range]}`} aria-hidden>
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
