import { REALM_COLOR } from "../../data/realms";
import { FORT_MAP_POSITIONS, WZ_MAP_IMAGE, WZ_MAP_SIZE } from "../../data/wzMapConstants";
import type { FortStatus } from "./wzEngine";
import { FORT_ICON_PATHS, getFortKind } from "./wzIcons";
import styles from "./WzMap.module.css";

interface Props {
	/** In `WzStatusData.forts` order — index i matches `FORT_MAP_POSITIONS[i]`. */
	forts: FortStatus[];
}

const ICON_SIZE = 32;

/** The war zone map with the 12 forts placed on top, ported from CoRT's
 *  canvas-based `wz-map` (same base image and hand-placed coordinates),
 *  redrawn as SVG so each fort can be a hoverable, keyboard-reachable node. */
export function WzMap({ forts }: Props) {
	return (
		<div className={`card ${styles.wrap}`}>
			<svg viewBox={`0 0 ${WZ_MAP_SIZE} ${WZ_MAP_SIZE}`} className={styles.svg} role="img" aria-label="Mapa da Zona de Guerra">
				<image href={WZ_MAP_IMAGE} width={WZ_MAP_SIZE} height={WZ_MAP_SIZE} preserveAspectRatio="xMidYMid slice" />
				{forts.map((fort, i) => {
					const pos = FORT_MAP_POSITIONS[i];
					if (!pos) return null;
					const color = REALM_COLOR[fort.owner];
					const kind = getFortKind(fort.name);
					const label = fort.name.replace(/\s*\(\d+\)$/, "");
					return (
						<g key={fort.name} className={fort.captured ? styles.fortCaptured : undefined}>
							<title>
								{label} — {fort.owner}
								{fort.captured ? ` (invadido, dono original: ${fort.home})` : ""}
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
		</div>
	);
}
