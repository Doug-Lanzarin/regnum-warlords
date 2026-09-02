import type { Lang } from "./languages";
import pt from "./dictionaries/pt.js";
import en from "./dictionaries/en.js";
import es from "./dictionaries/es.js";
import type { TranslationKey } from "./dictionaries/pt";

export type { TranslationKey };

const DICTIONARIES: Record<Lang, Record<TranslationKey, string>> = { pt, en, es };

/** Plain-data translator — no React dependency, so it can be imported by
 *  pure TS modules too (`utils/time.ts`, `features/trainer/spellFormat.ts`,
 *  and the Vercel push handlers under `api/`, which already import other
 *  pure `src/` modules by relative path, e.g. `src/data/fortKind.ts`).
 *  Interpolates `{name}`-style placeholders from `vars`. */
export function translate(lang: Lang, key: TranslationKey, vars?: Record<string, string | number>): string {
	const template = DICTIONARIES[lang][key];
	if (!vars) return template;
	return template.replace(/\{(\w+)\}/g, (match, name: string) => {
		const value = vars[name];
		return value === undefined ? match : String(value);
	});
}
