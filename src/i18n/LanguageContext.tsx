import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { LANGUAGES, type Lang } from "./languages";

const STORAGE_KEY = "regnum-warlords:lang";

interface LanguageContextValue {
	lang: Lang;
	setLang: (lang: Lang) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

/** Defaults to Portuguese — the app's original and primary audience —
 *  rather than detecting the browser's language, so an existing user never
 *  gets unexpectedly switched to another language just because their OS
 *  locale isn't `pt*`. Only an explicit pick via `LanguagePicker` changes it. */
function readStoredLang(): Lang {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored && (LANGUAGES as readonly string[]).includes(stored)) return stored as Lang;
	} catch {
		// ignore
	}
	return "pt";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
	const [lang, setLangState] = useState<Lang>(readStoredLang);

	useEffect(() => {
		document.documentElement.lang = lang;
		try {
			localStorage.setItem(STORAGE_KEY, lang);
		} catch {
			// ignore
		}
	}, [lang]);

	const value = useMemo(() => ({ lang, setLang: setLangState }), [lang]);

	return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
	const ctx = useContext(LanguageContext);
	if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
	return ctx;
}
