import type { ReactNode } from "react";
import { AlertsWatcher } from "../features/alerts/AlertsWatcher";
import { useT } from "../i18n/useT";
import { BottomTabBar } from "./BottomTabBar";
import { LanguagePicker } from "./LanguagePicker";
import styles from "./AppLayout.module.css";

export function AppLayout({ children }: { children: ReactNode }) {
	const t = useT();
	return (
		<div className={styles.shell}>
			<main className={`container ${styles.main}`}>{children}</main>
			<footer className={`container ${styles.footer}`}>
				<LanguagePicker />
				<p>
					{t("layout.footerPrefix")}{" "}
					<a href="https://codeberg.org/mascal/CoRT" target="_blank" rel="noreferrer">
						CoRT
					</a>{" "}
					{t("layout.footerSuffix")}
				</p>
			</footer>
			<BottomTabBar />
			<AlertsWatcher />
		</div>
	);
}
