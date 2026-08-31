import { REALM_COLOR, type Realm } from "../../data/realms";
import { FORT_MAP_POSITIONS, WZ_MAP_HEIGHT, WZ_MAP_WIDTH } from "../../data/wzMapCoordinates";
import type { FortStatus, RelicStatus } from "./wzEngine";
import styles from "./WzMap.module.css";

interface Props {
	forts: FortStatus[];
	relics: RelicStatus[];
	gems: string[];
}

const GEM_POSITIONS: Record<Realm, [number, number]> = {
	Alsius: [88, 92],
	Ignis: [387, 286],
	Syrtis: [92, 350],
};

const RELIC_POSITIONS: Record<Realm, [number, number]> = {
	Alsius: [238, 82],
	Ignis: [405, 190],
	Syrtis: [245, 405],
};

function markerColor(realm: Realm) {
	return REALM_COLOR[realm];
}

export function WzMap({ forts, relics, gems }: Props) {
	return (
		<section className={`card ${styles.section}`} aria-labelledby="wz-map-title">
			<div className={styles.header}>
				<div>
					<h2 id="wz-map-title">Mapa da Zona de Guerra</h2>
					<p>Fortes, gems e relíquias em tempo real</p>
				</div>
				<div className={styles.legend} aria-label="Legenda do mapa">
					<span><i className={styles.legendFort} /> Forte</span>
					<span><i className={styles.legendGem} /> Gem</span>
					<span><i className={styles.legendRelic} /> Relíquia</span>
				</div>
			</div>
			<div className={styles.mapFrame}>
				<div className={styles.map} style={{ aspectRatio: `${WZ_MAP_WIDTH} / ${WZ_MAP_HEIGHT}` }}>
					<img className={styles.baseMap} src="/data/warstatus/base_map.2.png" alt="Mapa da Zona de Guerra de Champions of Regnum" />
					{FORT_MAP_POSITIONS.map((position, index) => {
						const fort = forts.find((item) => item.name === position.name);
						const owner = fort?.owner ?? position.home;
						return (
							<div
								key={position.name}
								className={`${styles.fortMarker} ${fort?.captured ? styles.captured : ""}`}
								style={{ left: `${(position.icon[0] / WZ_MAP_WIDTH) * 100}%`, top: `${(position.icon[1] / WZ_MAP_HEIGHT) * 100}%`, "--marker-color": markerColor(owner) } as React.CSSProperties}
								title={`${position.name}: ${owner}`}
								aria-label={`${position.name}, controlado por ${owner}`}
							>
									<span className={styles.fortIcon} aria-hidden>{index + 1}</span>
									<span className={styles.fortLabel}>{position.name.replace(/\s*\(\d+\)$/, "")}</span>
							</div>
						);
					})}
					{gems.map((gem, index) => {
						const realm = (Object.keys(GEM_POSITIONS) as Realm[])[index % 3];
						const [x, y] = GEM_POSITIONS[realm];
						return <span key={`gem-${gem}-${index}`} className={styles.gemMarker} style={{ left: `${(x / WZ_MAP_WIDTH) * 100}%`, top: `${(y / WZ_MAP_HEIGHT) * 100}%`, "--marker-color": markerColor(realm) } as React.CSSProperties} title={`Gem de ${realm}`} aria-label={`Gem de ${realm}`} />;
					})}
					{relics.map((relic) => {
						const realm = relic.holder ?? relic.home;
						const [x, y] = RELIC_POSITIONS[realm];
						return <span key={`relic-${relic.name}`} className={`${styles.relicMarker} ${relic.status === "transit" ? styles.transit : ""}`} style={{ left: `${(x / WZ_MAP_WIDTH) * 100}%`, top: `${(y / WZ_MAP_HEIGHT) * 100}%`, "--marker-color": markerColor(realm) } as React.CSSProperties} title={`${relic.name}: ${relic.status === "transit" ? "em trânsito" : "no altar"}`} aria-label={`Relíquia ${relic.name}`} />;
					})}
				</div>
			</div>
		</section>
	);
}

