import { useMemo } from "react";
import { EventsLogSection } from "../features/wz/EventsLogSection";
import { FortsSection } from "../features/wz/FortsSection";
import { GemsSection } from "../features/wz/GemsSection";
import { useDragonWishes } from "../features/wz/useDragonWishes";
import { useWzStatus } from "../features/wz/useWzStatus";
import { computeFortStatuses, computeGemStatuses } from "../features/wz/wzEngine";
import { computeEventLog } from "../features/wz/wzEventsEngine";
import { WzMap } from "../features/wz/WzMap";
import styles from "./WzStatusPage.module.css";

export function WzStatusPage() {
	const { data, loading, error, now, refresh } = useWzStatus();
	const { wishes } = useDragonWishes();

	const forts = useMemo(() => (data ? computeFortStatuses(data) : []), [data]);
	const gems = useMemo(() => (data ? computeGemStatuses(data) : []), [data]);
	const events = useMemo(() => (data ? computeEventLog(data) : []), [data]);

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
			<WzMap forts={forts} />
			<FortsSection forts={forts} now={now} />
			<GemsSection gems={gems} />
			{wishes.length > 0 && (
				<EventsLogSection events={wishes} now={now} title="Pedidos ao Dragão" countLabel="pedidos recentes" />
			)}
			<EventsLogSection events={events} now={now} />
		</div>
	);
}
