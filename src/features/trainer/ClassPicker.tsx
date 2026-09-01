import { ARCHETYPE_HUE, CLASS_LABELS } from "../../data/trainerConstants";
import type { AdvancedClass } from "../../types/trainer";
import styles from "./ClassPicker.module.css";

const GROUPS: { archetype: keyof typeof ARCHETYPE_HUE; classes: AdvancedClass[] }[] = [
	{ archetype: "Guerreiro", classes: ["knight", "barbarian"] },
	{ archetype: "Mago", classes: ["conjurer", "warlock"] },
	{ archetype: "Arqueiro", classes: ["hunter", "marksman"] },
];

interface Props {
	value: AdvancedClass | null;
	onChange: (clas: AdvancedClass) => void;
}

export function ClassPicker({ value, onChange }: Props) {
	return (
		<div className={styles.wrap} role="radiogroup" aria-label="Classe">
			{GROUPS.map((group) => (
				<div className={styles.group} key={group.archetype}>
					<span className={styles.groupLabel}>{group.archetype}</span>
					<div className={styles.options}>
						{group.classes.map((c) => {
							const selected = value === c;
							return (
								<button
									key={c}
									type="button"
									role="radio"
									aria-checked={selected}
									className={`${styles.option} ${selected ? styles.optionSelected : ""}`}
									style={{ "--hue": ARCHETYPE_HUE[group.archetype] } as React.CSSProperties}
									onClick={() => onChange(c)}
								>
									<span className={styles.dot} aria-hidden />
									{CLASS_LABELS[c]}
								</button>
							);
						})}
					</div>
				</div>
			))}
		</div>
	);
}
