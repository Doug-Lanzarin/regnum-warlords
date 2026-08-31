import styles from "./SpellSearch.module.css";

interface Props {
	value: string;
	onChange: (value: string) => void;
}

export function SpellSearch({ value, onChange }: Props) {
	return (
		<div className={styles.wrap}>
			<span className={styles.icon} aria-hidden>
				🔍
			</span>
			<input
				type="search"
				className={styles.input}
				placeholder="Buscar habilidade ou disciplina…"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				aria-label="Buscar habilidade ou disciplina"
			/>
			{value && (
				<button type="button" className={styles.clear} onClick={() => onChange("")} aria-label="Limpar busca">
					×
				</button>
			)}
		</div>
	);
}
