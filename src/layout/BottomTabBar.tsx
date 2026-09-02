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

/** Fixed bottom tab bar shown only on phones (see the `desktop`-hiding media
 *  query in the CSS module) — replaces the header's nav row there so there's
 *  only one navigation surface on small screens. */
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
