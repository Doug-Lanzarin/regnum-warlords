import { useMemo, useState } from "react";
import { EventsLogSection } from "../features/wz/EventsLogSection";
import { FortActivityChart, type FortActivityRange } from "../features/wz/FortActivityChart";
import { FortActivityTimeline } from "../features/wz/FortActivityTimeline";
import { FortHistoryModal } from "../features/wz/FortHistoryModal";
import { FortsSection } from "../features/wz/FortsSection";
import { GemsSection } from "../features/wz/GemsSection";
import { useEventsDump } from "../features/wz/useEventsDump";
import { useWzStats } from "../features/wz/useWzStats";
import { useWzStatus } from "../features/wz/useWzStatus";
import { FORT_ACTIVITY_WINDOW_MS } from "../data/wzConstants";
import { useLanguage } from "../i18n/LanguageContext";
import { useT } from "../i18n/useT";
import { computeFortStatuses, computeGemStatuses, type FortStatus } from "../features/wz/wzEngine";
import {
	computeDragonWishes,
	computeEventLog,
	computeFortActivityByRealm,
	computeFortActivityFromStats,
	computeFortHistory,
	type RealmActivityCount,
} from "../features/wz/wzEventsEngine";
import { formatHourMinuteSecond } from "../utils/time";
import { WzMap } from "../features/wz/WzMap";
import styles from "./WzStatusPage.module.css";

export function WzStatusPage() {
	const { lang } = useLanguage();
	const t = useT();
	const { data, loading, error, now, lastUpdated, refresh } = useWzStatus();
	const { events: eventsDump } = useEventsDump();
	const { reports } = useWzStats();
	const [selectedFort, setSelectedFort] = useState<FortStatus | null>(null);

	const forts = useMemo(() => (data ? computeFortStatuses(data) : []), [data]);
	const gems = useMemo(() => (data ? computeGemStatuses(data) : []), [data]);
	const events = useMemo(() => (data ? computeEventLog(data, lang) : []), [data, lang]);
	const wishes = useMemo(() => computeDragonWishes(eventsDump, lang), [eventsDump, lang]);
	const fortActivityRanges = useMemo<Record<FortActivityRange, RealmActivityCount[] | null>>(
		() => ({
			"24h": computeFortActivityByRealm(eventsDump, FORT_ACTIVITY_WINDOW_MS, now),
			"7d": reports ? computeFortActivityFromStats(reports.sevenDay) : null,
			"30d": reports ? computeFortActivityFromStats(reports.thirtyDay) : null,
			"90d": reports ? computeFortActivityFromStats(reports.ninetyDay) : null,
		}),
		[eventsDump, now, reports],
	);
	const fortHistory = useMemo(
		() => (selectedFort ? computeFortHistory(eventsDump, selectedFort.name, lang) : []),
		[eventsDump, selectedFort, lang],
	);

	if (loading && !data) {
		return (
			<div className={`card ${styles.centerMessage}`}>
				<span className={styles.spinner} aria-hidden />
				{t("wz.loading")}
			</div>
		);
	}

	if (error && !data) {
		return (
			<div className={`card ${styles.centerMessage}`}>
				<span className="badge">{t("common.liveDataUnavailable")}</span>
				<h1 className={styles.errorTitle}>{t("wz.errorTitle")}</h1>
				<p>{error}</p>
				<div className={styles.actions}>
					<button className="btn btn-primary" onClick={refresh}>
						{t("common.tryAgain")}
					</button>
					<a className="btn btn-ghost" href="https://cort.ovh/wz.html" target="_blank" rel="noreferrer">
						{t("common.openInCort")}
					</a>
				</div>
			</div>
		);
	}

	if (!data) return null;

	return (
		<div className={styles.wrap}>
			<div className={styles.statusRow}>
				{error && <span className={styles.staleWarning}>{t("wz.staleWarning")}</span>}
				{lastUpdated && <span className={styles.updated}>{t("wz.updatedAt", { time: formatHourMinuteSecond(lastUpdated, lang) })}</span>}
			</div>
			<WzMap forts={forts} onSelectFort={setSelectedFort} />
			{selectedFort && (
				<FortHistoryModal
					fortName={selectedFort.name}
					owner={selectedFort.owner}
					now={now}
					history={fortHistory}
					onClose={() => setSelectedFort(null)}
				/>
			)}
			<FortsSection forts={forts} now={now} />
			<GemsSection gems={gems} />
			{wishes.length > 0 && (
				<EventsLogSection events={wishes} now={now} title={t("wz.dragonWishesTitle")} countLabel={t("wz.dragonWishesCountLabel")} />
			)}
			<EventsLogSection events={events} now={now} />
			<FortActivityChart rangeData={fortActivityRanges} />
			<FortActivityTimeline events={eventsDump} now={now} />
		</div>
	);
}
