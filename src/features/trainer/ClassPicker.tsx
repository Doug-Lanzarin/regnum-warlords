import { CLASS_LABELS } from "../../data/trainerConstants";
import { useT } from "../../i18n/useT";
import type { TranslationKey } from "../../i18n/translate";
import type { AdvancedClass } from "../../types/trainer";
import styles from "./ClassPicker.module.css";

const GROUPS: { archetypeKey: TranslationKey; classes: AdvancedClass[]; hue: string }[] = [
	{ archetypeKey: "trainer.archetypeWarrior", classes: ["knight", "barbarian"], hue: "var(--red)" },
	{ archetypeKey: "trainer.archetypeMage", classes: ["conjurer", "warlock"], hue: "var(--purple)" },
	{ archetypeKey: "trainer.archetypeArcher", classes: ["hunter", "marksman"], hue: "var(--green)" },
];

interface Props {
	value: AdvancedClass | null;
	onChange: (clas: AdvancedClass) => void;
}

export function ClassPicker({ value, onChange }: Props) {
	const t = useT();
	return (
		<div className={styles.wrap} role="radiogroup" aria-label={t("trainer.classAriaLabel")}>
			{GROUPS.map((group) => (
				<div className={styles.group} key={group.archetypeKey}>
					<span className={styles.groupLabel}>{t(group.archetypeKey)}</span>
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
