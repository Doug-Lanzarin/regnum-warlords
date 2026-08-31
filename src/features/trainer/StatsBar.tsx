import { useState } from "react";
import type { TrainerBuild, TrainerTotals } from "../../types/trainer";
import { encodeBuild } from "./shareLink";
import { PointsBar } from "./PointsBar";
import styles from "./StatsBar.module.css";

interface Props {
	build: TrainerBuild;
	totals: TrainerTotals;
	dataSource: "live" | "bundled" | null;
	onReset: () => void;
}

export function StatsBar({ build, totals, dataSource, onReset }: Props) {
	const [copied, setCopied] = useState(false);

	async function handleShare() {
		const encoded = encodeBuild(build);
		const url = `${window.location.origin}${window.location.pathname}?build=${encoded}`;
		window.history.replaceState(null, "", `?build=${encoded}`);
		try {
			await navigator.clipboard.writeText(url);
			setCopied(true);
			setTimeout(() => setCopied(false), 2500);
		} catch {
			// clipboard unavailable — the URL bar was still updated
		}
	}

	return (
		<div className={`card ${styles.wrap}`}>
			<div className={styles.points}>
				<PointsBar label="Pontos de disciplina" spent={totals.dpointsSpent} total={totals.dpointsTotal} />
				<PointsBar label="Pontos de poder" spent={totals.ppointsSpent} total={totals.ppointsTotal} />
			</div>

			<div className={styles.right}>
				{dataSource && (
					<span
						className={`${styles.source} ${dataSource === "live" ? styles.sourceLive : ""}`}
						title={dataSource === "live" ? "Dados carregados agora de cort.ovh" : "Dados locais (rede indisponível ou cort.ovh bloqueado)"}
					>
						<span className={styles.sourceDot} aria-hidden /> {dataSource === "live" ? "Dados ao vivo" : "Dados locais"}
					</span>
				)}
				<button className="btn btn-ghost" onClick={onReset}>
					Reiniciar
				</button>
				<button className="btn btn-primary" onClick={handleShare}>
					{copied ? "Link copiado ✓" : "Compartilhar build"}
				</button>
			</div>
		</div>
	);
}
