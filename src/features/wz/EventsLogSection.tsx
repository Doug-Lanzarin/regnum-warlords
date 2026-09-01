import { REALM_COLOR } from "../../data/realms";
import { formatDateTime, formatRelativePast } from "../../utils/time";
import type { HumanizedEvent } from "./wzEventsEngine";
import styles from "./EventsLogSection.module.css";

interface Props {
	events: HumanizedEvent[];
	now: number;
	title?: string;
	countLabel?: string;
	emptyMessage?: string;
}

export function EventsLogSection({
	events,
	now,
	title = "Eventos da WZ",
	countLabel = "eventos recentes",
	emptyMessage = "Nenhum evento recente.",
}: Props) {
	return (
		<section className={styles.section}>
			<div className={styles.heading}>
				<h2>{title}</h2>
				<span className={styles.count}>
					{events.length} {countLabel}
				</span>
			</div>
			<div className={`card ${styles.log}`}>
				{events.length === 0 ? (
					<p className={styles.empty}>{emptyMessage}</p>
				) : (
					<ul className={styles.list}>
						{events.map((event) => (
							<li key={event.key} className={`${styles.row} ${event.isWish ? styles.rowWish : ""}`}>
								<time className={styles.time} title={formatDateTime(event.date)}>
									{formatRelativePast(now - event.date * 1000)}
								</time>
								<span className={styles.line}>
									{event.emoji && <span aria-hidden>{event.emoji} </span>}
									{event.segments.map((segment, i) => (
										<span
											key={i}
											className={segment.realm ? styles.realmText : undefined}
											style={segment.realm ? ({ "--realm-color": REALM_COLOR[segment.realm] } as React.CSSProperties) : undefined}
										>
											{segment.text}
										</span>
									))}
								</span>
							</li>
						))}
					</ul>
				)}
			</div>
		</section>
	);
}
