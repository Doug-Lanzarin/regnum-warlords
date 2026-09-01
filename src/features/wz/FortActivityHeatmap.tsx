import { REALMS, type Realm } from "../../data/realms";
import { FORT_MAP_POSITIONS, WZ_MAP_IMAGE, WZ_MAP_SIZE } from "../../data/wzMapConstants";
import type { FortStatus } from "./wzEngine";
import { cleanFortName } from "./wzEventsEngine";
import styles from "./FortActivityHeatmap.module.css";

interface Props {
	forts: FortStatus[];
	/** Fort name (cleaned) → capture count in the last 24h. */
	activityByFort: Record<string, number>;
}

const BLOB_RADIUS = 30;
const CORE_RADIUS = 9;

/** Dark → light shade per realm, used only for this heatmap — not the
 *  app-wide `REALM_COLOR` badges. Ignis reads as red here on purpose
 *  (distinct from its usual orange badge), per how the heatmap was asked
 *  for: Ignis red, Alsius blue, Syrtis green, shaded dark (quiet) to
 *  light (busy). */
const HEAT_RAMP: Record<Realm, { dark: string; light: string }> = {
	Ignis: { dark: "#3a0e0e", light: "#ff5c4d" },
	Alsius: { dark: "#0c1f36", light: "#4fb2ff" },
	Syrtis: { dark: "#0f2a1a", light: "#4ade80" },
};

function heatColor(realm: Realm, ratio: number): string {
	const pct = Math.round(Math.min(1, Math.max(0, ratio)) * 100);
	const { dark, light } = HEAT_RAMP[realm];
	return `color-mix(in srgb, ${light} ${pct}%, ${dark})`;
}

/** A dedicated heatmap on the same base map/positions as the status map
 *  above — one soft blob per fort, shaded dark→light within its
 *  controlling realm's own color family by how many times it changed
 *  hands in the last 24h. Quiet forts stay dark; contested ones glow. */
export function FortActivityHeatmap({ forts, activityByFort }: Props) {
	const max = Math.max(1, ...Object.values(activityByFort));

	return (
		<section className={styles.section}>
			<div className={styles.header}>
				<h2>Mapa de calor</h2>
				<span className={styles.count}>fortes mais disputados nas últimas 24h, por reino</span>
			</div>

			<div className={`card ${styles.card}`}>
				<svg
					viewBox={`0 0 ${WZ_MAP_SIZE} ${WZ_MAP_SIZE}`}
					className={styles.svg}
					role="img"
					aria-label="Mapa de calor de atividade dos fortes nas últimas 24h"
				>
					<defs>
						<filter id="heatmap-blur" x="-60%" y="-60%" width="220%" height="220%">
							<feGaussianBlur stdDeviation="7" />
						</filter>
					</defs>
					<image
						href={WZ_MAP_IMAGE}
						width={WZ_MAP_SIZE}
						height={WZ_MAP_SIZE}
						preserveAspectRatio="xMidYMid slice"
						className={styles.baseImage}
					/>
					{forts.map((fort, i) => {
						const pos = FORT_MAP_POSITIONS[i];
						if (!pos) return null;
						const label = cleanFortName(fort.name);
						const count = activityByFort[label] ?? 0;
						const ratio = count > 0 ? Math.sqrt(count / max) : 0;
						const cx = pos.x + 16;
						const cy = pos.y + 16;
						const color = heatColor(fort.owner, ratio);
						return (
							<g key={fort.name}>
								<title>
									{label} — {fort.owner} · {count} ação{count === 1 ? "" : "ões"} nas últimas 24h
								</title>
								<circle cx={cx} cy={cy} r={BLOB_RADIUS} fill={color} filter="url(#heatmap-blur)" />
								<circle cx={cx} cy={cy} r={CORE_RADIUS} fill={color} className={styles.core} />
							</g>
						);
					})}
				</svg>

				<div className={styles.legend}>
					{REALMS.map((realm) => (
						<div key={realm} className={styles.legendRow}>
							<span className={styles.legendLabel}>{realm}</span>
							<span
								className={styles.legendBar}
								style={{ background: `linear-gradient(90deg, ${HEAT_RAMP[realm].dark}, ${HEAT_RAMP[realm].light})` }}
							/>
						</div>
					))}
					<div className={styles.legendScale}>
						<span>menos ativo</span>
						<span>mais ativo</span>
					</div>
				</div>
			</div>
		</section>
	);
}
