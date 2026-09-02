import { LANGUAGES, LANGUAGE_LABELS } from "../i18n/languages";
import { useLanguage } from "../i18n/LanguageContext";
import { useT } from "../i18n/useT";
import styles from "./LanguagePicker.module.css";

/** Global language switcher — lives in the footer (`AppLayout`), the app's
 *  only "settings" surface outside routed pages now that the header (which
 *  used to host the theme picker) is gone, see `BottomTabBar.module.css`. */
export function LanguagePicker() {
	const { lang, setLang } = useLanguage();
	const t = useT();
	return (
		<label className={styles.wrap}>
			<span className={styles.label}>{t("layout.languageLabel")}</span>
			<select className={`select ${styles.select}`} value={lang} onChange={(e) => setLang(e.target.value as typeof lang)}>
				{LANGUAGES.map((code) => (
					<option key={code} value={code}>
						{LANGUAGE_LABELS[code]}
					</option>
				))}
			</select>
		</label>
	);
}
