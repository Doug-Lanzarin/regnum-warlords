import { DATASET_VERSIONS } from "../../data/trainerConstants";
import { useT } from "../../i18n/useT";
import type { AdvancedClass, TrainerBuild } from "../../types/trainer";
import { ClassPicker } from "./ClassPicker";
import { LevelControl } from "./LevelControl";
import styles from "./BuildHeader.module.css";

interface Props {
	build: TrainerBuild;
	onClassChange: (clas: AdvancedClass) => void;
	onLevelChange: (level: number, necroGem?: boolean) => void;
	onVersionChange: (version: string) => void;
}

export function BuildHeader({ build, onClassChange, onLevelChange, onVersionChange }: Props) {
	const t = useT();
	return (
		<section className={`card ${styles.wrap}`}>
			<div className={styles.top}>
				<div>
					<h1 className={styles.title}>{t("trainer.title")}</h1>
					<p className={styles.subtitle}>{t("trainer.subtitle")}</p>
				</div>
				{DATASET_VERSIONS.length > 1 && (
					<label className={styles.versionField}>
						<span>{t("trainer.datasetVersion")}</span>
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

			<div className={styles.grid}>
				<ClassPicker value={build.clas} onChange={onClassChange} />
				<div className={styles.divider} aria-hidden />
				<LevelControl level={build.level} necroGem={build.necroGem} onChange={onLevelChange} />
			</div>
		</section>
	);
}
