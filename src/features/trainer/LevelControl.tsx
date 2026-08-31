import { MAX_CHAR_LEVEL, MIN_CHAR_LEVEL } from "../../data/trainerConstants";
import styles from "./LevelControl.module.css";

interface Props {
	level: number;
	necroGem: boolean;
	onChange: (level: number, necroGem?: boolean) => void;
}

export function LevelControl({ level, necroGem, onChange }: Props) {
	return (
		<div className={styles.wrap}>
			<div className={styles.headerRow}>
				<span className={styles.label}>Nível do personagem</span>
				<span className={styles.value}>{level}</span>
			</div>
			<input
				type="range"
				className={styles.slider}
				min={MIN_CHAR_LEVEL}
				max={MAX_CHAR_LEVEL}
				value={level}
				onChange={(e) => onChange(Number(e.target.value), necroGem && Number(e.target.value) === MAX_CHAR_LEVEL)}
				aria-label="Nível do personagem"
			/>
			<div className={styles.sliderTicks} aria-hidden>
				<span>{MIN_CHAR_LEVEL}</span>
				<span>{MAX_CHAR_LEVEL}</span>
			</div>
			<label className={`${styles.necro} ${level < MAX_CHAR_LEVEL ? styles.necroDisabled : ""}`}>
				<input
					type="checkbox"
					checked={necroGem}
					disabled={level < MAX_CHAR_LEVEL}
					onChange={(e) => onChange(MAX_CHAR_LEVEL, e.target.checked)}
				/>
				<span>Cristal Necro (+5 pontos de poder no nível 60)</span>
			</label>
		</div>
	);
}
