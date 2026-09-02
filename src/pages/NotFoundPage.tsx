import { Link } from "react-router-dom";
import { useT } from "../i18n/useT";
import styles from "./NotFoundPage.module.css";

export function NotFoundPage() {
	const t = useT();
	return (
		<div className={`card ${styles.wrap}`}>
			<span className="badge">404</span>
			<h1>{t("notFound.title")}</h1>
			<p>{t("notFound.body")}</p>
			<Link className="btn btn-primary" to="/">
				{t("notFound.goHome")}
			</Link>
		</div>
	);
}
