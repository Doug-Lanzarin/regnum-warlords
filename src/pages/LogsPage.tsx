import { useEffect, useMemo, useState } from "react";
import { EventsLogSection } from "../features/wz/EventsLogSection";
import { FortActivityChart, type FortActivityRange } from "../features/wz/FortActivityChart";
import { FortActivityTimeline } from "../features/wz/FortActivityTimeline";
import { RealmDurationChart } from "../features/wz/RealmDurationChart";
import { RealmHourlyActivityChart } from "../features/wz/RealmHourlyActivityChart";
import { WishActivityChart, type WishActivityRange } from "../features/wz/WishActivityChart";
import { useEventsDump } from "../features/wz/useEventsDump";
import { useWzStats } from "../features/wz/useWzStats";
import { FORT_ACTIVITY_WINDOW_MS } from "../data/wzConstants";
import { useLanguage } from "../i18n/LanguageContext";
import { useT } from "../i18n/useT";
import {
	computeDragonWishes,
	computeEnemyFortHoldDuration,
	computeEventLog,
	computeFortActivityByRealm,
	computeFortActivityFromStats,
	computeOwnFortRecoveryDuration,
	computeWeeklyActivityByTimeOfDay,
	computeWishActivityByRealm,
	computeWishActivityFromStats,
	type RealmActivityCount,
} from "../features/wz/wzEventsEngine";
import { formatHourMinuteSecond } from "../utils/time";
import styles from "./LogsPage.module.css";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Dragon wishes, the general WZ event feed, and every activity/duration
 *  chart derived from that same event history — everything below the home
 *  (WZ status) page's Gems section, split out into its own tab so that
 *  page can stay focused on current state (map, forts, gems) while this
 *  one is the place for history and stats. Own `useEventsDump()`/
 *  `useWzStats()` calls rather than sharing the home page's — same
 *  pattern every other independent poller in this app already follows
 *  (see `useEventsDump`'s own doc comment). */
export function LogsPage() {
	const { lang } = useLanguage();
	const t = useT();
	const { events: eventsDump, lastUpdated, refresh } = useEventsDump();
	const { reports } = useWzStats();

	// 1s tick (not a slower one) because the manual-refresh cooldown below
	// needs to actually count down smoothly — same as the WZ status page's
	// own `now`, for the same reason.
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		const tick = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(tick);
	}, []);

	// Same rate-limit rationale as the WZ status page's own manual refresh —
	// see its doc comment.
	const [manualRefreshCooldownUntil, setManualRefreshCooldownUntil] = useState(0);
	const canManualRefresh = now >= manualRefreshCooldownUntil;
	const handleManualRefresh = () => {
		if (!canManualRefresh) return;
		refresh();
		setManualRefreshCooldownUntil(Date.now() + 10_000);
	};

	const events = useMemo(() => computeEventLog(eventsDump, lang), [eventsDump, lang]);
	// events.json only covers ~10 days, and dragon wishes are rare enough
	// that even a generous limit here rarely gets hit — but the default of
	// 5 was cutting the list short well before that, with nothing left to
	// scroll through in the card's own 420px scroll area.
	const wishes = useMemo(() => computeDragonWishes(eventsDump, lang, 50), [eventsDump, lang]);
	const fortActivityRanges = useMemo<Record<FortActivityRange, RealmActivityCount[] | null>>(
		() => ({
			"24h": computeFortActivityByRealm(eventsDump, FORT_ACTIVITY_WINDOW_MS, now),
			// 7d comes straight from the events dump, not stats.json's own 7d
			// report — events.json's ~10-day retention comfortably covers it,
			// and this way it stays accurate on its own even when stats.json's
			// upstream source (the mirror, most of the time — see
			// api/cort-proxy.ts) is undercounting.
			"7d": computeFortActivityByRealm(eventsDump, 7 * DAY_MS, now),
			"30d": reports ? computeFortActivityFromStats(reports.thirtyDay) : null,
			"90d": reports ? computeFortActivityFromStats(reports.ninetyDay) : null,
		}),
		[eventsDump, now, reports],
	);
	const wishActivityRanges = useMemo<Record<WishActivityRange, RealmActivityCount[] | null>>(
		() => ({
			"1d": computeWishActivityByRealm(eventsDump, DAY_MS, now),
			"3d": computeWishActivityByRealm(eventsDump, 3 * DAY_MS, now),
			"5d": computeWishActivityByRealm(eventsDump, 5 * DAY_MS, now),
			// Same reasoning as fortActivityRanges' "7d" above.
			"7d": computeWishActivityByRealm(eventsDump, 7 * DAY_MS, now),
			"10d": computeWishActivityByRealm(eventsDump, 10 * DAY_MS, now),
			"30d": reports ? computeWishActivityFromStats(reports.thirtyDay) : null,
			"90d": reports ? computeWishActivityFromStats(reports.ninetyDay) : null,
		}),
		[eventsDump, now, reports],
	);
	const hourlyActivity = useMemo(() => computeWeeklyActivityByTimeOfDay(eventsDump, now), [eventsDump, now]);
	const holdDuration = useMemo(() => computeEnemyFortHoldDuration(eventsDump, 7 * DAY_MS, now), [eventsDump, now]);
	const recoveryDuration = useMemo(() => computeOwnFortRecoveryDuration(eventsDump, 7 * DAY_MS, now), [eventsDump, now]);

	const holdSampleLabel = (n: number) => t(n === 1 ? "wz.holdDurationSampleSingular" : "wz.holdDurationSamplePlural", { n });
	const recoverySampleLabel = (n: number) => t(n === 1 ? "wz.recoveryDurationSampleSingular" : "wz.recoveryDurationSamplePlural", { n });

	return (
		<div className={styles.wrap}>
			<div className={`card ${styles.header}`}>
				<div>
					<h1 className={styles.title}>{t("logs.title")}</h1>
					<p className={styles.subtitle}>{t("logs.subtitle")}</p>
				</div>
				<div className={styles.statusRow}>
					{lastUpdated !== null && <span>{t("wz.updatedAt", { time: formatHourMinuteSecond(lastUpdated, lang) })}</span>}
					<button type="button" className="btn btn-ghost" onClick={handleManualRefresh} disabled={!canManualRefresh}>
						{canManualRefresh ? t("wz.manualRefresh") : t("wz.manualRefreshCooldown", { seconds: Math.ceil((manualRefreshCooldownUntil - now) / 1000) })}
					</button>
				</div>
			</div>

			{wishes.length > 0 && (
				<EventsLogSection events={wishes} now={now} title={t("wz.dragonWishesTitle")} countLabel={t("wz.dragonWishesCountLabel")} />
			)}
			<EventsLogSection events={events} now={now} />

			<div className={styles.timelineGrid}>
				<FortActivityTimeline events={eventsDump} now={now} />
				<RealmHourlyActivityChart points={hourlyActivity} />
			</div>

			<div className={styles.chartsGrid}>
				<FortActivityChart rangeData={fortActivityRanges} />
				<RealmDurationChart
					title={t("wz.durationTitle")}
					tabsLabel={t("wz.durationTabsLabel")}
					views={[
						{
							key: "hold",
							tabLabel: t("wz.durationTabHold"),
							subtitle: t("wz.holdDurationSubtitle"),
							data: holdDuration,
							emptyMessage: t("wz.holdDurationEmpty"),
							sortDirection: "desc",
							sampleLabel: holdSampleLabel,
							rowAriaLabel: (realm, duration, samples) => t("wz.holdDurationRowAriaLabel", { realm, duration, samples: holdSampleLabel(samples) }),
						},
						{
							key: "recovery",
							tabLabel: t("wz.durationTabRecovery"),
							subtitle: t("wz.recoveryDurationSubtitle"),
							data: recoveryDuration,
							emptyMessage: t("wz.recoveryDurationEmpty"),
							sortDirection: "asc",
							sampleLabel: recoverySampleLabel,
							rowAriaLabel: (realm, duration, samples) =>
								t("wz.recoveryDurationRowAriaLabel", { realm, duration, samples: recoverySampleLabel(samples) }),
						},
					]}
				/>
				<WishActivityChart rangeData={wishActivityRanges} />
			</div>
		</div>
	);
}
