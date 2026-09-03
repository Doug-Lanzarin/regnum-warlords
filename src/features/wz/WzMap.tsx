import { formatFortLabel } from "../../data/fortKind";
import { REALM_COLOR } from "../../data/realms";
import { FORT_MAP_POSITIONS, WZ_MAP_IMAGE, WZ_MAP_SIZE } from "../../data/wzMapConstants";
import { useLanguage } from "../../i18n/LanguageContext";
import { useT } from "../../i18n/useT";
import { formatDuration } from "../../utils/time";
import type { FortStatus } from "./wzEngine";
import type { WallVulnerability } from "./wzEventsEngine";
import { FORT_ICON_PATHS, getFortKind } from "./wzIcons";
import styles from "./WzMap.module.css";

interface Props {
	/** In `WzStatusData.forts` order — index i matches `FORT_MAP_POSITIONS[i]`. */
	forts: FortStatus[];
	/** One entry per realm — see `computeWallVulnerability`. */
	wallVulnerability: WallVulnerability[];
	now: number;
	/** Called with the fort's raw name when a fort icon is clicked/activated. */
	onSelectFort?: (fort: FortStatus) => void;
}

const ICON_SIZE = 32;
/** Dark goldenrod — distinct from the map's already-bright yellow "(n)"
 *  index labels (`#eed202`), so a vulnerable wall doesn't read as the same
 *  color as that unrelated UI element. */
const WALL_VULNERABLE_COLOR = "#b8860b";

/** The war zone map with the 12 forts placed on top, ported from CoRT's
 *  canvas-based `wz-map` (same base image and hand-placed coordinates),
 *  redrawn as SVG so each fort can be a hoverable, keyboard-reachable node. */
export function WzMap({ forts, wallVulnerability, now, onSelectFort }: Props) {
	const { lang } = useLanguage();
	const t = useT();
	return (
		<div className={`card ${styles.wrap}`}>
			<svg viewBox={`0 0 ${WZ_MAP_SIZE} ${WZ_MAP_SIZE}`} className={styles.svg} role="img" aria-label={t("wz.mapAriaLabel")}>
				<image href={WZ_MAP_IMAGE} width={WZ_MAP_SIZE} height={WZ_MAP_SIZE} preserveAspectRatio="xMidYMid slice" />
				{forts.map((fort, i) => {
					const pos = FORT_MAP_POSITIONS[i];
					if (!pos) return null;
					const kind = getFortKind(fort.name);
					const vulnerability = kind === "wall" ? wallVulnerability.find((w) => w.homeRealm === fort.home) : undefined;
					const isVulnerable = !!vulnerability?.isVulnerable;
					const color = isVulnerable ? WALL_VULNERABLE_COLOR : REALM_COLOR[fort.owner];
					const label = formatFortLabel(fort.name, lang);

					let vulnerabilityTooltip = "";
					if (isVulnerable) {
						vulnerabilityTooltip = ` ${t("wz.wallVulnerableTooltip")}`;
					} else if (vulnerability?.vulnerableAtMs != null) {
						vulnerabilityTooltip = ` ${t("wz.wallVulnerableIn", { time: formatDuration(vulnerability.vulnerableAtMs - now) })}`;
					}

					return (
						<g
							key={fort.name}
							className={`${styles.fort} ${fort.captured ? styles.fortCaptured : ""} ${isVulnerable ? styles.wallVulnerable : ""}`}
							role={onSelectFort ? "button" : undefined}
							tabIndex={onSelectFort ? 0 : undefined}
							onClick={onSelectFort ? () => onSelectFort(fort) : undefined}
							onKeyDown={
								onSelectFort
									? (e) => {
											if (e.key === "Enter" || e.key === " ") {
												e.preventDefault();
												onSelectFort(fort);
											}
										}
									: undefined
							}
						>
							<title>
								{t("wz.fortTooltip", { label, owner: fort.owner })}
								{fort.captured ? t("wz.fortTooltipCapturedSuffix", { home: fort.home }) : ""}
								{vulnerabilityTooltip}
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
