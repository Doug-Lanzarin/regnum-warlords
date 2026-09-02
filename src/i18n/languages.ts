/** The 3 languages the app UI can be shown in, chosen via `LanguagePicker`
 *  and persisted by `LanguageContext`. Trainer spell data separately reads
 *  its own native `{en,es,de}` fields keyed by the same `en`/`es` codes
 *  (see `spellFormat.ts`) — `de` is intentionally not offered here, only
 *  PT/EN/ES as requested. */
export const LANGUAGES = ["pt", "en", "es"] as const;
export type Lang = (typeof LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<Lang, string> = {
	pt: "Português",
	en: "English",
	es: "Español",
};
