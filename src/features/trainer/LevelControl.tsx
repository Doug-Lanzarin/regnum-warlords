import { MAX_CHAR_LEVEL, MIN_CHAR_LEVEL } from "../../data/trainerConstants";
import { useT } from "../../i18n/useT";
import styles from "./LevelControl.module.css";

interface Props {
	level: number;
	necroGem: boolean;
	onChange: (level: number, necroGem?: boolean) => void;
}

export function LevelControl({ level, necroGem, onChange }: Props) {
	const t = useT();
	return (
		<div className={styles.wrap}>
			<div className={styles.headerRow}>
				<span className={styles.label}>{t("trainer.levelLabel")}</span>
				<span className={styles.value}>{level}</span>
			</div>
			<input
				type="range"
				className={styles.slider}
				min={MIN_CHAR_LEVEL}
				max={MAX_CHAR_LEVEL}
				value={level}
				onChange={(e) => onChange(Number(e.target.value), necroGem && Number(e.target.value) === MAX_CHAR_LEVEL)}
				aria-label={t("trainer.levelLabel")}
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
				<span>{t("trainer.necroGemLabel")}</span>
			</label>
		</div>
	);
}
