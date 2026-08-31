import type { ReactNode } from "react";
import { NavBar } from "./NavBar";
import styles from "./AppLayout.module.css";

export function AppLayout({ children }: { children: ReactNode }) {
	return (
		<div className={styles.shell}>
			<NavBar />
			<main className={`container ${styles.main}`}>{children}</main>
			<footer className={`container ${styles.footer}`}>
				<p>
					Regnum Warlords é um projeto independente inspirado no{" "}
					<a href="https://codeberg.org/mascal/CoRT" target="_blank" rel="noreferrer">
						CoRT
					</a>
					, feito para a comunidade de Champions of Regnum.
				</p>
			</footer>
		</div>
	);
}
