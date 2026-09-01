import { DATASET_VERSIONS } from "../../data/trainerConstants";
import type { AdvancedClass } from "../../types/trainer";
import { ClassPicker } from "./ClassPicker";
import styles from "./ClassIntro.module.css";

interface Props {
	datasetVersion: string;
	onClassChange: (clas: AdvancedClass) => void;
	onVersionChange: (version: string) => void;
}

/** Shown before a class is picked. Keeps the first screen to just this
 *  choice — the level slider, stats and discipline trees only show up once
 *  it's made, instead of a default class's full skill list loading before
 *  the user has done anything. */
export function ClassIntro({ datasetVersion, onClassChange, onVersionChange }: Props) {
	return (
		<section className={`card ${styles.wrap}`}>
			<div className={styles.top}>
				<div>
					<h1 className={styles.title}>Monte seu build</h1>
					<p className={styles.subtitle}>Escolha uma classe pra começar.</p>
				</div>
				{DATASET_VERSIONS.length > 1 && (
					<label className={styles.versionField}>
						<span>Versão dos dados</span>
						<select className="select" value={datasetVersion} onChange={(e) => onVersionChange(e.target.value)}>
							{DATASET_VERSIONS.map((v) => (
								<option key={v} value={v}>
									{v}
								</option>
							))}
						</select>
					</label>
				)}
			</div>
			<ClassPicker value={null} onChange={onClassChange} />
		</section>
	);
}
