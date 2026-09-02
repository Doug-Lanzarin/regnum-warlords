import { REALM_COLOR } from "../../data/realms";
import { useLanguage } from "../../i18n/LanguageContext";
import { useT } from "../../i18n/useT";
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

export function EventsLogSection({ events, now, title, countLabel, emptyMessage }: Props) {
	const { lang } = useLanguage();
	const t = useT();
	const resolvedTitle = title ?? t("wz.eventsTitle");
	const resolvedCountLabel = countLabel ?? t("wz.eventsCountLabel");
	const resolvedEmptyMessage = emptyMessage ?? t("wz.eventsEmpty");
	return (
		<section className={styles.section}>
			<div className={styles.heading}>
				<h2>{resolvedTitle}</h2>
				<span className={styles.count}>
					{events.length} {resolvedCountLabel}
				</span>
			</div>
			<div className={`card ${styles.log}`}>
				{events.length === 0 ? (
					<p className={styles.empty}>{resolvedEmptyMessage}</p>
				) : (
					<ul className={styles.list}>
						{events.map((event) => (
							<li key={event.key} className={`${styles.row} ${event.isWish ? styles.rowWish : ""}`}>
								<time className={styles.time} title={formatDateTime(event.date, lang)}>
									{formatRelativePast(now - event.date * 1000, lang)}
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
