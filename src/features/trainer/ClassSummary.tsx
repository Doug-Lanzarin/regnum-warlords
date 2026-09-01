import { useState } from "react";
import { ARCHETYPE_HUE, BASE_ARCHETYPE, CLASS_LABELS } from "../../data/trainerConstants";
import type { AdvancedClass } from "../../types/trainer";
import { ClassPicker } from "./ClassPicker";
import styles from "./ClassSummary.module.css";

interface Props {
	value: AdvancedClass;
	onChange: (clas: AdvancedClass) => void;
}

/** Collapsed by default to a small colored chip — the full 6-option
 *  ClassPicker (used up front, before a class is chosen) is overkill to
 *  keep on screen forever once the choice is made. "Trocar" expands it
 *  back inline for reselection. */
export function ClassSummary({ value, onChange }: Props) {
	const [open, setOpen] = useState(false);

	if (open) {
		return (
			<div className={styles.wrap}>
				<div className={styles.openHeader}>
					<span className={styles.label}>Trocar classe</span>
					<button type="button" className={styles.cancel} onClick={() => setOpen(false)}>
						Cancelar
					</button>
				</div>
				<ClassPicker
					value={value}
					onChange={(clas) => {
						onChange(clas);
						setOpen(false);
					}}
				/>
			</div>
		);
	}

	return (
		<div className={styles.wrap}>
			<span className={styles.label}>Classe</span>
			<button
				type="button"
				className={styles.chip}
				style={{ "--hue": ARCHETYPE_HUE[BASE_ARCHETYPE[value]] } as React.CSSProperties}
				onClick={() => setOpen(true)}
			>
				<span className={styles.dot} aria-hidden />
				{CLASS_LABELS[value]}
				<span className={styles.change}>Trocar</span>
			</button>
		</div>
	);
}
