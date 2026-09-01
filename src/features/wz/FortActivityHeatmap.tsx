import { REALMS, type Realm } from "../../data/realms";
import { FORT_MAP_POSITIONS, WZ_MAP_IMAGE, WZ_MAP_SIZE } from "../../data/wzMapConstants";
import type { FortStatus } from "./wzEngine";
import { cleanFortName } from "./wzEventsEngine";
import styles from "./FortActivityHeatmap.module.css";

interface Props {
	forts: FortStatus[];
	/** Fort name (cleaned) → per-realm capture count in the last 24h. */
	activityByFort: Record<string, Partial<Record<Realm, number>>>;
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

type Rgb = [number, number, number];

function hexToRgb(hex: string): Rgb {
	const n = parseInt(hex.slice(1), 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
	return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** A fort is often fought over by more than one realm in a day — coloring
 *  it only by whoever holds it *right now* would hide that. This blends
 *  each contributing realm's dark/light endpoints, weighted by its share
 *  of that fort's captures, then interpolates the blend by intensity —
 *  a fort split 3 ways glows a genuine mix of all 3 realm colors. */
function blendedHeatColor(breakdown: Partial<Record<Realm, number>>, total: number, ratio: number): string {
	let dark: Rgb = [0, 0, 0];
	let light: Rgb = [0, 0, 0];
	for (const realm of REALMS) {
		const count = breakdown[realm] ?? 0;
		if (count === 0) continue;
		const weight = count / total;
		const ramp = HEAT_RAMP[realm];
		const darkRgb = hexToRgb(ramp.dark);
		const lightRgb = hexToRgb(ramp.light);
		dark = [dark[0] + darkRgb[0] * weight, dark[1] + darkRgb[1] * weight, dark[2] + darkRgb[2] * weight];
		light = [light[0] + lightRgb[0] * weight, light[1] + lightRgb[1] * weight, light[2] + lightRgb[2] * weight];
	}
	const [r, g, b] = mixRgb(dark, light, ratio);
	return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

/** A dedicated heatmap on the same base map/positions as the status map
 *  above — one soft blob per fort, shaded dark→light by how many times it
 *  changed hands in the last 24h, blended across every realm that actually
 *  captured it (not just whoever holds it now). Quiet forts stay dark;
 *  contested ones glow, mixed if more than one realm fought over them. */
export function FortActivityHeatmap({ forts, activityByFort }: Props) {
	const totals = forts.map((fort) => {
		const breakdown = activityByFort[cleanFortName(fort.name)] ?? {};
		return REALMS.reduce((sum, realm) => sum + (breakdown[realm] ?? 0), 0);
	});
	const max = Math.max(1, ...totals);

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
						const total = totals[i];
						if (!pos || total === 0) return null;
						const label = cleanFortName(fort.name);
						const breakdown = activityByFort[label] ?? {};
						const ratio = Math.sqrt(total / max);
						const cx = pos.x + 16;
						const cy = pos.y + 16;
						const color = blendedHeatColor(breakdown, total, ratio);
						const breakdownText = REALMS.filter((r) => breakdown[r]).map((r) => `${r} ${breakdown[r]}`).join(", ");
						return (
							<g key={fort.name}>
								<title>
									{label} · {total} {total === 1 ? "ação" : "ações"} nas últimas 24h ({breakdownText})
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
					<p className={styles.legendNote}>
						Fortes disputados por mais de um reino aparecem com a cor misturada — passe o dedo/mouse pra ver o
						detalhe de cada reino.
					</p>
				</div>
			</div>
		</section>
	);
}
