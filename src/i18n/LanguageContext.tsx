import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { LANGUAGES, type Lang } from "./languages";

const STORAGE_KEY = "regnum-warlords:lang";

interface LanguageContextValue {
	lang: Lang;
	setLang: (lang: Lang) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function detectBrowserLang(): Lang {
	if (typeof navigator === "undefined") return "pt";
	const code = navigator.language?.toLowerCase() ?? "";
	if (code.startsWith("pt")) return "pt";
	if (code.startsWith("es")) return "es";
	return "en";
}

function readStoredLang(): Lang {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored && (LANGUAGES as readonly string[]).includes(stored)) return stored as Lang;
	} catch {
		// ignore
	}
	return detectBrowserLang();
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
