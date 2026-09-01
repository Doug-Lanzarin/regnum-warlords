import { Link } from "react-router-dom";
import styles from "./NotFoundPage.module.css";

export function NotFoundPage() {
	return (
		<div className={`card ${styles.wrap}`}>
			<span className="badge">404</span>
			<h1>Página não encontrada</h1>
			<p>Volte para o início pelo menu acima.</p>
			<Link className="btn btn-primary" to="/">
				Ir para o início
			</Link>
		</div>
	);
}
