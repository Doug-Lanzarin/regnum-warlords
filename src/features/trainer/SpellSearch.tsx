import { useT } from "../../i18n/useT";
import styles from "./SpellSearch.module.css";

interface Props {
	value: string;
	onChange: (value: string) => void;
}

export function SpellSearch({ value, onChange }: Props) {
	const t = useT();
	return (
		<div className={styles.wrap}>
			<span className={styles.icon} aria-hidden>
				🔍
			</span>
			<input
				type="search"
				className={styles.input}
				placeholder={t("trainer.searchPlaceholder")}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				aria-label={t("trainer.searchAriaLabel")}
			/>
			{value && (
				<button type="button" className={styles.clear} onClick={() => onChange("")} aria-label={t("trainer.searchClear")}>
					×
				</button>
			)}
		</div>
	);
}
