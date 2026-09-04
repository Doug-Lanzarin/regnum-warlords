import { useMemo, useState } from "react";
import { EventsLogSection } from "../features/wz/EventsLogSection";
import { FortActivityChart, type FortActivityRange } from "../features/wz/FortActivityChart";
import { FortActivityTimeline } from "../features/wz/FortActivityTimeline";
import { FortHistoryModal } from "../features/wz/FortHistoryModal";
import { FortsSection } from "../features/wz/FortsSection";
import { GemsSection } from "../features/wz/GemsSection";
import { WishActivityChart, type WishActivityRange } from "../features/wz/WishActivityChart";
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
	computeWallVulnerability,
	computeWishActivityByRealm,
	computeWishActivityFromStats,
	type RealmActivityCount,
} from "../features/wz/wzEventsEngine";
import { formatHourMinuteSecond } from "../utils/time";
import { WzMap } from "../features/wz/WzMap";
import styles from "./WzStatusPage.module.css";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Above this age, `data.generated` (cort.ovh's own timestamp) is treated
 *  as stale even though the fetch itself succeeded — the proxy can serve a
 *  fallback snapshot (see api/cort-proxy.ts) when cort.ovh is unreachable
 *  from Vercel, and that comes back as a normal 200, so `error` alone can't
 *  tell a stale-but-successful response apart from a fresh one. Comfortably
 *  above the ~15s edge cache + normal poll interval, so this never
 *  false-positives under normal operation. */
const STALE_DATA_THRESHOLD_MS = 5 * 60 * 1000;

export function WzStatusPage() {
	const { lang } = useLanguage();
	const t = useT();
	const { data, loading, error, now, refresh } = useWzStatus();
	const { events: eventsDump } = useEventsDump();
	const { reports } = useWzStats();
	const [selectedFort, setSelectedFort] = useState<FortStatus | null>(null);

	const forts = useMemo(() => (data ? computeFortStatuses(data) : []), [data]);
	const gems = useMemo(() => (data ? computeGemStatuses(data) : []), [data]);
	const wallVulnerability = useMemo(() => computeWallVulnerability(forts, eventsDump, now), [forts, eventsDump, now]);
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
	const wishActivityRanges = useMemo<Record<WishActivityRange, RealmActivityCount[] | null>>(
		() => ({
			"1d": computeWishActivityByRealm(eventsDump, DAY_MS, now),
			"3d": computeWishActivityByRealm(eventsDump, 3 * DAY_MS, now),
			"5d": computeWishActivityByRealm(eventsDump, 5 * DAY_MS, now),
			"7d": reports ? computeWishActivityFromStats(reports.sevenDay) : null,
			"10d": computeWishActivityByRealm(eventsDump, 10 * DAY_MS, now),
			"30d": reports ? computeWishActivityFromStats(reports.thirtyDay) : null,
			"90d": reports ? computeWishActivityFromStats(reports.ninetyDay) : null,
		}),
		[eventsDump, now, reports],
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

	const generatedAt = data.generated * 1000;
	const isStale = Boolean(error) || now - generatedAt >= STALE_DATA_THRESHOLD_MS;

	return (
		<div className={styles.wrap}>
			<div className={styles.statusRow}>
				{isStale && <span className={styles.staleWarning}>{t("wz.staleWarning")}</span>}
				<span className={styles.updated}>{t("wz.updatedAt", { time: formatHourMinuteSecond(generatedAt, lang) })}</span>
			</div>
			<WzMap forts={forts} wallVulnerability={wallVulnerability} now={now} onSelectFort={setSelectedFort} />
			{selectedFort && (
				<FortHistoryModal
					fortName={selectedFort.name}
					owner={selectedFort.owner}
					now={now}
					history={fortHistory}
					onClose={() => setSelectedFort(null)}
				/>
			)}
			<FortsSection forts={forts} wallVulnerability={wallVulnerability} now={now} />
			<GemsSection gems={gems} />
			{wishes.length > 0 && (
				<EventsLogSection events={wishes} now={now} title={t("wz.dragonWishesTitle")} countLabel={t("wz.dragonWishesCountLabel")} />
			)}
			<EventsLogSection events={events} now={now} />
			<FortActivityChart rangeData={fortActivityRanges} />
			<FortActivityTimeline events={eventsDump} now={now} />
			<WishActivityChart rangeData={wishActivityRanges} />
		</div>
	);
}
