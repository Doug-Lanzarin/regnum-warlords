import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import type { Realm } from "../data/realms";
import { useAlertSettings } from "../features/alerts/AlertSettingsContext";

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

interface ThemeContextValue {
	theme: ThemeName;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Alsius/Ignis get their own tinted palette so the app visually matches
 *  "your" realm; Syrtis (and no realm picked yet) keeps today's default
 *  look rather than switching to the brighter dedicated Syrtis palette. */
function themeForRealm(realm: Realm | null): ThemeName {
	if (realm === "Alsius") return "Alsius";
	if (realm === "Ignis") return "Ignis";
	return "Dark";
}

/** The color palette follows the realm chosen in Notifications settings
 *  (`AlertSettings.myRealm`) — no manual picker, it just tracks that
 *  choice live. */
export function ThemeProvider({ children }: { children: ReactNode }) {
	const { settings } = useAlertSettings();
	const theme = themeForRealm(settings.myRealm);

	useEffect(() => {
		if (theme === "Dark") {
			document.documentElement.removeAttribute("data-theme");
		} else {
			document.documentElement.setAttribute("data-theme", theme);
		}
	}, [theme]);

	const value = useMemo(() => ({ theme }), [theme]);

	return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
	const ctx = useContext(ThemeContext);
	if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
	return ctx;
}
