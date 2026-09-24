import { useLanguage } from "../../i18n/LanguageContext";
import { useT } from "../../i18n/useT";
import { formatHourMinute, formatWeekday } from "../../utils/time";
import type { BzDayColumn } from "./bzScheduleEngine";
import styles from "./BzWeeklyCalendar.module.css";

interface Props {
	columns: BzDayColumn[];
}

/** One column per day (today first), each listing its open windows as
 *  chips — the currently-open or soonest-upcoming one visually picked out
 *  (see `computeBzWeeklySchedule`'s `isCurrent`/`isNext`), so "when is BZ
 *  open this week" and "what's the very next window" both read off the
 *  same calendar instead of needing a separate summary. Horizontally
 *  scrollable rather than shrinking columns on narrow screens — a day's
 *  hours need to stay legible, not get squeezed. */
export function BzWeeklyCalendar({ columns }: Props) {
	const { lang } = useLanguage();
	const t = useT();

	return (
		<div className={`card ${styles.card}`}>
			<div className={styles.scroller}>
				{columns.map((column, i) => (
					<div key={i} className={styles.day}>
						<div className={styles.dayHeader}>
							<span className={styles.weekday}>{formatWeekday(column.date, lang)}</span>
							{i === 0 && <span className={styles.todayTag}>{t("bz.today")}</span>}
						</div>
						{column.slots.length === 0 ? (
							<span className={styles.empty}>—</span>
						) : (
							<ul className={styles.slotList}>
								{column.slots.map((slot) => (
									<li key={slot.beginMs} className={styles.slot} data-highlighted={slot.isCurrent || slot.isNext}>
										{formatHourMinute(slot.beginMs, lang)}–{formatHourMinute(slot.endMs, lang)}
										{slot.isCurrent && <span className={styles.slotTag}>{t("bz.nowTag")}</span>}
										{slot.isNext && <span className={styles.slotTag}>{t("bz.nextTag")}</span>}
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
