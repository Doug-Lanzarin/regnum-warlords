import { useEffect, useMemo, useState } from "react";
import { BzStatusCard } from "../features/bz/BzStatusCard";
import { BzWeeklyCalendar } from "../features/bz/BzWeeklyCalendar";
import { computeBzStatus, computeBzWeeklySchedule } from "../features/bz/bzScheduleEngine";
import { useT } from "../i18n/useT";
import styles from "./BzSchedulePage.module.css";

export function BzSchedulePage() {
	const t = useT();
	// BZ's schedule only moves in whole-minute steps, so there's nothing to
	// gain from a 1s tick (unlike the boss timers) — 30s keeps the
	// countdown/highlight reasonably live without waking the tab needlessly.
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		const tick = setInterval(() => setNow(Date.now()), 30_000);
		return () => clearInterval(tick);
	}, []);

	const status = useMemo(() => computeBzStatus(new Date(now)), [now]);
	const columns = useMemo(() => computeBzWeeklySchedule(new Date(now)), [now]);

	return (
		<div className={styles.wrap}>
			<div className={`card ${styles.header}`}>
				<h1 className={styles.title}>{t("bz.title")}</h1>
				<p className={styles.subtitle}>{t("bz.subtitle")}</p>
			</div>

			<BzStatusCard status={status} now={now} />
			<BzWeeklyCalendar columns={columns} />

			<p className={styles.note}>{t("bz.localHoursNote")}</p>
		</div>
	);
}
