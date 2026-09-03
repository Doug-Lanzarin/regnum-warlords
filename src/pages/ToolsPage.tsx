import { Link } from "react-router-dom";
import { useT } from "../i18n/useT";
import { ArmorToolIcon, TrainerTabIcon } from "../layout/NavIcons";
import styles from "./ToolsPage.module.css";

export function ToolsPage() {
	const t = useT();
	return (
		<div className={styles.wrap}>
			<div>
				<h1 className={styles.title}>{t("tools.title")}</h1>
				<p className={styles.subtitle}>{t("tools.subtitle")}</p>
			</div>

			<div className={styles.grid}>
				<Link to="/trainer" className={`card ${styles.tile}`}>
					<span className={styles.tileIcon}>
						<TrainerTabIcon className={styles.tileIconSvg} />
					</span>
					<span className={styles.tileTitle}>{t("nav.trainer")}</span>
					<span className={styles.tileDesc}>{t("tools.trainerDesc")}</span>
				</Link>

				<Link to="/armadura" className={`card ${styles.tile}`}>
					<span className={styles.tileIcon}>
						<ArmorToolIcon className={styles.tileIconSvg} />
					</span>
					<span className={styles.tileTitle}>{t("tools.armorLabel")}</span>
					<span className={styles.tileDesc}>{t("tools.armorDesc")}</span>
				</Link>
			</div>
		</div>
	);
}
