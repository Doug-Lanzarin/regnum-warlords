import { REALM_COLOR } from "../../data/realms";
import { FORT_MAP_POSITIONS, WZ_MAP_IMAGE, WZ_MAP_SIZE } from "../../data/wzMapConstants";
import { cleanFortName } from "./wzEventsEngine";
import type { FortStatus } from "./wzEngine";
import { FORT_ICON_PATHS, getFortKind } from "./wzIcons";
import styles from "./WzMap.module.css";

interface Props {
	/** In `WzStatusData.forts` order — index i matches `FORT_MAP_POSITIONS[i]`. */
	forts: FortStatus[];
	/** Fort-name → capture count in the last 24h, for the heat overlay. Omit
	 *  (or pass `{}`) to render the map without it. */
	activityByFort?: Record<string, number>;
}

const ICON_SIZE = 32;
const HEAT_MIN_RADIUS = 20;
const HEAT_MAX_RADIUS = 52;

/** The war zone map with the 12 forts placed on top, ported from CoRT's
 *  canvas-based `wz-map` (same base image and hand-placed coordinates),
 *  redrawn as SVG so each fort can be a hoverable, keyboard-reachable node.
 *  When `activityByFort` is given, a soft glow (colored by whoever
 *  currently holds the fort) sits behind the busiest forts — a heatmap of
 *  the last 24h of fighting layered on the same map. */
export function WzMap({ forts, activityByFort }: Props) {
	const maxActivity = activityByFort ? Math.max(0, ...Object.values(activityByFort)) : 0;

	return (
		<div className={`card ${styles.wrap}`}>
			<svg viewBox={`0 0 ${WZ_MAP_SIZE} ${WZ_MAP_SIZE}`} className={styles.svg} role="img" aria-label="Mapa da Zona de Guerra">
				<defs>
					<radialGradient id="wz-heat-glow">
						<stop offset="0%" stopColor="currentColor" stopOpacity="0.55" />
						<stop offset="70%" stopColor="currentColor" stopOpacity="0.22" />
						<stop offset="100%" stopColor="currentColor" stopOpacity="0" />
					</radialGradient>
				</defs>
				<image href={WZ_MAP_IMAGE} width={WZ_MAP_SIZE} height={WZ_MAP_SIZE} preserveAspectRatio="xMidYMid slice" />

				{maxActivity > 0 &&
					forts.map((fort, i) => {
						const pos = FORT_MAP_POSITIONS[i];
						const count = activityByFort?.[cleanFortName(fort.name)] ?? 0;
						if (!pos || count === 0) return null;
						const radius = HEAT_MIN_RADIUS + (HEAT_MAX_RADIUS - HEAT_MIN_RADIUS) * Math.sqrt(count / maxActivity);
						return (
							<circle
								key={`heat-${fort.name}`}
								cx={pos.x + ICON_SIZE / 2}
								cy={pos.y + ICON_SIZE / 2}
								r={radius}
								fill="url(#wz-heat-glow)"
								className={styles.heatGlow}
								style={{ color: REALM_COLOR[fort.owner] }}
								aria-hidden
							/>
						);
					})}

				{forts.map((fort, i) => {
					const pos = FORT_MAP_POSITIONS[i];
					if (!pos) return null;
					const color = REALM_COLOR[fort.owner];
					const kind = getFortKind(fort.name);
					const label = cleanFortName(fort.name);
					const activity = activityByFort?.[label] ?? 0;
					return (
						<g key={fort.name} className={fort.captured ? styles.fortCaptured : undefined}>
							<title>
								{label} — {fort.owner}
								{fort.captured ? ` (invadido, dono original: ${fort.home})` : ""}
								{activity > 0 ? ` · ${activity} ação${activity === 1 ? "" : "ões"} nas últimas 24h` : ""}
							</title>
							{fort.captured && (
								<circle
									cx={pos.x + ICON_SIZE / 2}
									cy={pos.y + ICON_SIZE / 2}
									r={ICON_SIZE / 2 + 4}
									className={styles.captureRing}
								/>
							)}
							<svg x={pos.x} y={pos.y} width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 512 512">
								<path d={FORT_ICON_PATHS[kind]} fill={color} className={styles.fortShadow} />
							</svg>
							<text x={pos.labelX} y={pos.labelY} className={styles.fortLabel}>
								({i + 1})
							</text>
						</g>
					);
				})}
			</svg>
			{maxActivity > 0 && (
				<p className={styles.heatCaption}>
					O brilho ao redor de um forte mostra quanto ele foi disputado nas últimas 24h — cor de quem
					controla agora, tamanho pela quantidade de capturas.
				</p>
			)}
		</div>
	);
}
