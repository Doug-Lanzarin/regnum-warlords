import type { ReactNode } from "react";
import { AlertsWatcher } from "../features/alerts/AlertsWatcher";
import { BottomTabBar } from "./BottomTabBar";
import styles from "./AppLayout.module.css";

export function AppLayout({ children }: { children: ReactNode }) {
	return (
		<div className={styles.shell}>
			<main className={`container ${styles.main}`}>{children}</main>
			<footer className={`container ${styles.footer}`}>
				<p>
					Desenvolvido por Douglas Lanzarin - Fork do projeto{" "}
					<a href="https://codeberg.org/mascal/CoRT" target="_blank" rel="noreferrer">
						CoRT
					</a>
				</p>
			</footer>
			<BottomTabBar />
			<AlertsWatcher />
		</div>
	);
}
