import { THEMES, THEME_LABELS, useTheme } from "../theme/ThemeContext";
import styles from "./SettingsPage.module.css";

export function SettingsPage() {
	const { theme, setTheme } = useTheme();
	return (
		<section className={`card ${styles.page}`}>
			<span className="badge">Preferências</span>
			<h1>Configurações</h1>
			<p className={styles.description}>Personalize a aparência do Regnum Warlords.</p>
			<label className={styles.field}>
				<span>Tema visual</span>
				<select className="select" value={theme} onChange={(event) => setTheme(event.target.value as (typeof THEMES)[number])}>
					{THEMES.map((item) => <option key={item} value={item}>{THEME_LABELS[item]}</option>)}
				</select>
			</label>
		</section>
	);
}
