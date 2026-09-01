import { DATASET_VERSIONS } from "../../data/trainerConstants";
import type { AdvancedClass, TrainerBuild } from "../../types/trainer";
import { ClassSummary } from "./ClassSummary";
import { LevelControl } from "./LevelControl";
import styles from "./BuildHeader.module.css";

interface Props {
	/** `build.clas` is assumed set — rendered only once a class is chosen,
	 *  see TrainerPage/ClassIntro. */
	build: TrainerBuild;
	onClassChange: (clas: AdvancedClass) => void;
	onLevelChange: (level: number, necroGem?: boolean) => void;
	onVersionChange: (version: string) => void;
}

export function BuildHeader({ build, onClassChange, onLevelChange, onVersionChange }: Props) {
	return (
		<section className={`card ${styles.wrap}`}>
			<div className={styles.top}>
				<div>
					<h1 className={styles.title}>Seu build</h1>
					<p className={styles.subtitle}>Escolha o nível — as disciplinas se ajustam automaticamente.</p>
				</div>
				{DATASET_VERSIONS.length > 1 && (
					<label className={styles.versionField}>
						<span>Versão dos dados</span>
						<select className="select" value={build.datasetVersion} onChange={(e) => onVersionChange(e.target.value)}>
							{DATASET_VERSIONS.map((v) => (
								<option key={v} value={v}>
									{v}
								</option>
							))}
						</select>
					</label>
				)}
			</div>

			<ClassSummary value={build.clas!} onChange={onClassChange} />

			<div className={styles.levelWrap}>
				<LevelControl level={build.level} necroGem={build.necroGem} onChange={onLevelChange} />
			</div>
		</section>
	);
}
