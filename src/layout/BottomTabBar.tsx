import { NavLink, useLocation } from "react-router-dom";
import { useT } from "../i18n/useT";
import type { TranslationKey } from "../i18n/translate";
import { BossesTabIcon, ToolsTabIcon, WzTabIcon } from "./NavIcons";
import styles from "./BottomTabBar.module.css";

// The Notificações tab is pulled for now (notifications feature itself is
// paused, see src/features/alerts/notificationsPaused.ts) — /notificacoes
// still exists and works for anyone with a direct link, just not linked
// from here. Re-add a `{ to: "/notificacoes", ... }` entry to bring the tab
// back once notifications are unpaused.
const TABS: { to: string; labelKey: TranslationKey; Icon: typeof WzTabIcon; end: boolean; alsoActiveOn?: string[] }[] = [
	{ to: "/", labelKey: "nav.wz", Icon: WzTabIcon, end: true },
	{ to: "/bosses", labelKey: "nav.bosses", Icon: BossesTabIcon, end: false },
	// The Trainer and Armor Calculator pages live under this hub — highlight
	// the tab while inside either of them too, not just on /ferramentas.
	{ to: "/ferramentas", labelKey: "nav.tools", Icon: ToolsTabIcon, end: false, alsoActiveOn: ["/trainer", "/armadura"] },
];

/** The app's only navigation surface (the header was removed) — docked to
 *  the bottom edge on phones exactly as a native app's tab bar would; on
 *  tablet/desktop widths it becomes a fixed bar at the top instead (see the
 *  `min-width: 641px` block in the CSS module), which reads more like a
 *  normal desktop nav than a floating mobile-style pill would. */
export function BottomTabBar() {
	const t = useT();
	const { pathname } = useLocation();
	return (
		<nav className={styles.bar} aria-label={t("nav.ariaLabel")}>
			{TABS.map(({ to, labelKey, Icon, end, alsoActiveOn }) => {
				const forcedActive = alsoActiveOn?.some((p) => pathname.startsWith(p)) ?? false;
				return (
					<NavLink
						key={to}
						to={to}
						end={end}
						className={({ isActive }) => `${styles.tab} ${isActive || forcedActive ? styles.tabActive : ""}`}
					>
						<span className={styles.iconWrap}>
							<Icon className={styles.icon} />
						</span>
						<span className={styles.label}>{t(labelKey)}</span>
					</NavLink>
				);
			})}
		</nav>
	);
}
