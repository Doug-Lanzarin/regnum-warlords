import { useLanguage } from "../../i18n/LanguageContext";
import { useT } from "../../i18n/useT";
import { formatHourMinute, formatWeekday } from "../../utils/time";
import type { BzDayColumn } from "./bzScheduleEngine";
import styles from "./BzWeeklyCalendar.module.css";

interface Props {
	columns: BzDayColumn[];
}

/** A 24h strip per day (midnight to midnight, left to right) with each BZ
 *  window drawn as a segment at its real position — a "shape of the day"
 *  glance that the time-range chips below it spell out precisely. The
 *  currently-open or soonest-upcoming segment (see
 *  `computeBzWeeklySchedule`'s `isCurrent`/`isNext`) gets the accent
 *  treatment in both the strip and its chip, so the two never disagree. */
function DayTimeline({ slots }: { slots: BzDayColumn["slots"] }) {
	return (
		<div className={styles.timeline} aria-hidden>
			{slots.map((slot) => {
				const startHour = new Date(slot.beginMs).getHours();
				const endHour = new Date(slot.endMs).getHours();
				return (
					<span
						key={slot.beginMs}
						className={styles.timelineSegment}
						data-highlighted={slot.isCurrent || slot.isNext}
						style={{ left: `${(startHour / 24) * 100}%`, width: `${((endHour - startHour) / 24) * 100}%` }}
					/>
				);
			})}
		</div>
	);
}

/** One column per day (today first), each with a 24h shape strip
 *  (`DayTimeline`) plus its open windows spelled out as chips — laid out
 *  as a wrapping grid (not a horizontal scroller) so every day stays
 *  visible without a swipe/scroll interaction on any screen size, just
 *  reflowing to fewer columns per row as it narrows. */
export function BzWeeklyCalendar({ columns }: Props) {
	const { lang } = useLanguage();
	const t = useT();

	return (
		<div className={`card ${styles.card}`}>
			<div className={styles.grid}>
				{columns.map((column, i) => (
					<div key={i} className={styles.day} data-today={i === 0}>
						<div className={styles.dayHeader}>
							<span className={styles.weekday}>{formatWeekday(column.date, lang)}</span>
							{i === 0 && <span className={styles.todayTag}>{t("bz.today")}</span>}
						</div>

						<DayTimeline slots={column.slots} />

						{column.slots.length === 0 ? (
							<span className={styles.empty}>—</span>
						) : (
							<ul className={styles.slotList}>
								{column.slots.map((slot) => (
									<li key={slot.beginMs} className={styles.slot} data-highlighted={slot.isCurrent || slot.isNext}>
										<span className={styles.slotMain}>
											<span className={styles.slotDot} aria-hidden />
											<span className={styles.slotTime}>
												{formatHourMinute(slot.beginMs, lang)}–{formatHourMinute(slot.endMs, lang)}
											</span>
										</span>
										{(slot.isCurrent || slot.isNext) && (
											<span className={styles.slotTag}>{t(slot.isCurrent ? "bz.nowTag" : "bz.nextTag")}</span>
										)}
									</li>
								))}
							</ul>
						)}
					</div>
				))}
			</div>
		</div>
	);
}
