import { NavLink } from "react-router-dom";
import styles from "./BottomNav.module.css";

const ITEMS = [
	{ to: "/wz", label: "War status", icon: "war" },
	{ to: "/bosses", label: "Chefes", icon: "boss" },
	{ to: "/", label: "Treinador", icon: "trainer", end: true },
	{ to: "/configuracoes", label: "Configurações", icon: "settings" },
];

export function BottomNav() {
	return (
		<nav className={styles.nav} aria-label="Navegação mobile">
			{ITEMS.map((item) => (
				<NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ""}`}>
					<span className={`${styles.icon} ${styles[item.icon]}`} aria-hidden="true" />
					<span>{item.label}</span>
				</NavLink>
			))}
		</nav>
	);
}
