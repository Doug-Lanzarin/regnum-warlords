import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export const THEMES = ["Dark", "Light", "OLED", "Alsius", "Ignis", "Syrtis"] as const;
export type ThemeName = (typeof THEMES)[number];

export const THEME_LABELS: Record<ThemeName, string> = {
	Dark: "Escuro (padrão)",
	Light: "Claro",
	OLED: "OLED (preto puro)",
	Alsius: "Alsius",
	Ignis: "Ignis",
	Syrtis: "Syrtis",
};

const STORAGE_KEY = "regnum-warlords:theme";

interface ThemeContextValue {
	theme: ThemeName;
	setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): ThemeName {
	// The theme picker lived in the header, which is removed for now — stay
	// on the default until it's back, regardless of what an earlier visit
	// may have stored (see AppLayout).
	return "Dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
	const [theme, setThemeState] = useState<ThemeName>(readStoredTheme);

	useEffect(() => {
		if (theme === "Dark") {
			document.documentElement.removeAttribute("data-theme");
		} else {
			document.documentElement.setAttribute("data-theme", theme);
		}
		try {
			localStorage.setItem(STORAGE_KEY, theme);
		} catch {
			// ignore
		}
	}, [theme]);

	const value = useMemo(() => ({ theme, setTheme: setThemeState }), [theme]);

	return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
	const ctx = useContext(ThemeContext);
	if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
	return ctx;
}
