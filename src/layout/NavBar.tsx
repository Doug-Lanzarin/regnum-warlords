import { useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import { THEMES, THEME_LABELS, useTheme } from "../theme/ThemeContext";
import styles from "./NavBar.module.css";
import { usePwaInstall } from "../pwa/usePwaInstall";

const NAV_ITEMS = [
	{ to: "/", label: "Trainer", end: true },
	{ to: "/wz", label: "Status da WZ" },
	{ to: "/bosses", label: "Chefes" },
];

export function NavBar() {
	const { theme, setTheme } = useTheme();
	const { canInstall, promptInstall } = usePwaInstall();
	const headerRef = useRef<HTMLElement>(null);

	// Keep a CSS var in sync with the real (sticky) header height so other
	// sticky elements (e.g. the trainer StatsBar) can stack right below it
	// instead of relying on a guessed pixel offset that breaks when the
	// header wraps to more rows on narrow screens.
	useEffect(() => {
		const el = headerRef.current;
		if (!el) return;
		const setVar = () => {
			document.documentElement.style.setProperty("--header-height", `${el.offsetHeight}px`);
		};
		setVar();
		const observer = new ResizeObserver(setVar);
		observer.observe(el);
		return () => observer.disconnect();
	}, []);

	return (
		<header ref={headerRef} className={styles.header}>
			<div className={`container ${styles.inner}`}>
				<NavLink to="/" className={styles.brand}>
					<span className={styles.brandMark}>RW</span>
					<span className={styles.brandName}>Regnum Warlords</span>
				</NavLink>

				<nav className={styles.nav} aria-label="Navegação principal">
					{NAV_ITEMS.map((item) => (
						<NavLink
							key={item.to}
							to={item.to}
							end={item.end}
							className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`}
						>
							{item.label}
						</NavLink>
					))}
				</nav>

				<div className={styles.actions}>
					{canInstall && (
						<button className="btn btn-primary" onClick={promptInstall}>
							<span aria-hidden>⬇</span> Instalar app
						</button>
					)}
					<label className={styles.themePicker}>
						<span className="visually-hidden">Tema</span>
						<span className={styles.themeSwatch} aria-hidden style={{ background: "var(--links)" }} />
						<select
							className="select"
							value={theme}
							onChange={(e) => setTheme(e.target.value as (typeof THEMES)[number])}
						>
							{THEMES.map((t) => (
								<option key={t} value={t}>
									{THEME_LABELS[t]}
								</option>
							))}
						</select>
					</label>
				</div>
			</div>
		</header>
	);
}
