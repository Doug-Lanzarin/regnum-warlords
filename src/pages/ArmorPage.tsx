import { Link } from "react-router-dom";
import { useT } from "../i18n/useT";
import { ArmorToolIcon } from "../layout/NavIcons";
import styles from "./ArmorPage.module.css";

export function ArmorPage() {
	const t = useT();
	return (
		<div className={`card ${styles.wrap}`}>
			<span className={styles.icon}>
				<ArmorToolIcon className={styles.iconSvg} />
			</span>
			<span className="badge">{t("armor.comingSoonBadge")}</span>
			<h1>{t("armor.title")}</h1>
			<p>{t("armor.comingSoonBody")}</p>
			<Link className="btn btn-primary" to="/ferramentas">
				{t("common.back")}
			</Link>
		</div>
	);
}
