import { useCallback } from "react";
import { useLanguage } from "./LanguageContext";
import { translate, type TranslationKey } from "./translate";

/** Component-facing translator, bound to the currently selected language:
 *  `const t = useT(); t("wz.fortsTitle")`. */
export function useT(): (key: TranslationKey, vars?: Record<string, string | number>) => string {
	const { lang } = useLanguage();
	return useCallback((key: TranslationKey, vars?: Record<string, string | number>) => translate(lang, key, vars), [lang]);
}
