import { useMemo } from "react";
import { FortsSection } from "../features/wz/FortsSection";
import { GemsSection } from "../features/wz/GemsSection";
import { RelicsSection } from "../features/wz/RelicsSection";
import { RealmSummary } from "../features/wz/RealmSummary";
import { useWzStatus } from "../features/wz/useWzStatus";
import { computeFortStatuses, computeGemStatuses, computeRealmFortCounts, computeRelicStatuses } from "../features/wz/wzEngine";
import { WzMap } from "../features/wz/WzMap";
import { formatRelativePast } from "../utils/time";
import styles from "./WzStatusPage.module.css";

export function WzStatusPage() {
	const { data, loading, error, now, lastUpdated, refresh } = useWzStatus();

	const forts = useMemo(() => (data ? computeFortStatuses(data) : []), [data]);
	const relics = useMemo(() => (data ? computeRelicStatuses(data) : []), [data]);
	const gems = useMemo(() => (data ? computeGemStatuses(data) : []), [data]);
	const fortCounts = useMemo(() => computeRealmFortCounts(forts), [forts]);

	if (loading && !data) {
		return (
			<div className={`card ${styles.centerMessage}`}>
				<span className={styles.spinner} aria-hidden />
				Carregando status da Zona de Guerra…
			</div>
		);
	}

	if (error && !data) {
		return (
			<div className={`card ${styles.centerMessage}`}>
				<span className="badge">Dados ao vivo indisponíveis</span>
				<h1 className={styles.errorTitle}>Não foi possível carregar o status da WZ</h1>
				<p>{error}</p>
				<div className={styles.actions}>
					<button className="btn btn-primary" onClick={refresh}>
						Tentar novamente
					</button>
					<a className="btn btn-ghost" href="https://cort.ovh/wz.html" target="_blank" rel="noreferrer">
						Abrir no CoRT ↗
					</a>
				</div>
			</div>
		);
	}

	if (!data) return null;

	return (
		<div className={styles.wrap}>
			<div className={`card ${styles.intro}`}>
				<div>
					<h1 className={styles.title}>Status da Zona de Guerra</h1>
					<p className={styles.subtitle}>Quem controla cada forte e onde estão as relíquias agora — dados ao vivo do CoRT.</p>
				</div>

				<RealmSummary fortCounts={fortCounts} totalForts={forts.length} />

				<div className={styles.statusRow}>
					{error && <span className={styles.staleWarning}>Falha ao atualizar — mostrando o último dado obtido.</span>}
					{lastUpdated && <span className={styles.updated}>Atualizado {formatRelativePast(now - lastUpdated)}</span>}
					<button className="btn btn-ghost" onClick={refresh}>
						Atualizar
					</button>
				</div>
			</div>

			<WzMap forts={forts} />
			<FortsSection forts={forts} now={now} />
			<GemsSection gems={gems} />
			<RelicsSection relics={relics} now={now} />
		</div>
	);
}
