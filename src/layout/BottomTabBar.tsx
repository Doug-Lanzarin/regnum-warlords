import { NavLink } from "react-router-dom";
import { useT } from "../i18n/useT";
import type { TranslationKey } from "../i18n/translate";
import { BossesTabIcon, NotificationsTabIcon, TrainerTabIcon, WzTabIcon } from "./NavIcons";
import styles from "./BottomTabBar.module.css";

const TABS: { to: string; labelKey: TranslationKey; Icon: typeof WzTabIcon; end: boolean }[] = [
	{ to: "/", labelKey: "nav.wz", Icon: WzTabIcon, end: true },
	{ to: "/bosses", labelKey: "nav.bosses", Icon: BossesTabIcon, end: false },
	{ to: "/trainer", labelKey: "nav.trainer", Icon: TrainerTabIcon, end: false },
	{ to: "/notificacoes", labelKey: "nav.notifications", Icon: NotificationsTabIcon, end: false },
];

/** The app's only navigation surface (the header was removed) — docked to
 *  the bottom edge on phones exactly as a native app's tab bar would; on
 *  tablet/desktop widths it becomes a fixed bar at the top instead (see the
 *  `min-width: 641px` block in the CSS module), which reads more like a
 *  normal desktop nav than a floating mobile-style pill would. */
export function BottomTabBar() {
	const t = useT();
	return (
		<nav className={styles.bar} aria-label={t("nav.ariaLabel")}>
			{TABS.map(({ to, labelKey, Icon, end }) => (
				<NavLink key={to} to={to} end={end} className={({ isActive }) => `${styles.tab} ${isActive ? styles.tabActive : ""}`}>
					<span className={styles.iconWrap}>
						<Icon className={styles.icon} />
					</span>
					<span className={styles.label}>{t(labelKey)}</span>
				</NavLink>
			))}
		</nav>
	);
}
