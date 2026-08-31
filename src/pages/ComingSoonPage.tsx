import styles from "./ComingSoonPage.module.css";

export function ComingSoonPage({ title, description }: { title: string; description: string }) {
	return (
		<div className={`card ${styles.wrap}`}>
			<span className="badge">Em construção</span>
			<h1>{title}</h1>
			<p>{description}</p>
			<p className={styles.hint}>
				A navegação e a base do app já estão prontas para esta página — o Trainer foi a primeira
				funcionalidade portada do CoRT. As demais entram nas próximas iterações.
			</p>
		</div>
	);
}
