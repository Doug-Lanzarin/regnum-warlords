import { CLASS_LABELS } from "../../data/trainerConstants";
import type { AdvancedClass } from "../../types/trainer";
import styles from "./ClassPicker.module.css";

const GROUPS: { archetype: string; classes: AdvancedClass[]; hue: string }[] = [
	{ archetype: "Guerreiro", classes: ["knight", "barbarian"], hue: "var(--red)" },
	{ archetype: "Mago", classes: ["conjurer", "warlock"], hue: "var(--purple)" },
	{ archetype: "Arqueiro", classes: ["hunter", "marksman"], hue: "var(--green)" },
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
									style={{ "--hue": group.hue } as React.CSSProperties}
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
