import { NavLink } from "react-router-dom";
import { BossesTabIcon, NotificationsTabIcon, TrainerTabIcon, WzTabIcon } from "./NavIcons";
import styles from "./BottomTabBar.module.css";

const TABS = [
	{ to: "/wz", label: "Status da WZ", Icon: WzTabIcon, end: false },
	{ to: "/bosses", label: "Chefes", Icon: BossesTabIcon, end: false },
	{ to: "/", label: "Trainer", Icon: TrainerTabIcon, end: true },
	{ to: "/notificacoes", label: "Notificações", Icon: NotificationsTabIcon, end: false },
];

/** Fixed bottom tab bar shown only on phones (see the `desktop`-hiding media
 *  query in the CSS module) — replaces the header's nav row there so there's
 *  only one navigation surface on small screens. */
export function BottomTabBar() {
	return (
		<nav className={styles.bar} aria-label="Navegação principal">
			{TABS.map(({ to, label, Icon, end }) => (
				<NavLink key={to} to={to} end={end} className={({ isActive }) => `${styles.tab} ${isActive ? styles.tabActive : ""}`}>
					<span className={styles.iconWrap}>
						<Icon className={styles.icon} />
					</span>
					<span className={styles.label}>{label}</span>
				</NavLink>
			))}
		</nav>
	);
}
