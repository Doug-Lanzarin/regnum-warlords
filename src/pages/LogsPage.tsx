import { useEffect, useMemo, useState } from "react";
import { EventsLogSection } from "../features/wz/EventsLogSection";
import { useEventsDump } from "../features/wz/useEventsDump";
import { computeDragonWishes, computeEventLog } from "../features/wz/wzEventsEngine";
import { useLanguage } from "../i18n/LanguageContext";
import { useT } from "../i18n/useT";
import { formatHourMinuteSecond } from "../utils/time";
import styles from "./LogsPage.module.css";

/** Dragon wishes + the general WZ event feed — split out from the home (WZ
 *  status) page into their own tab so that page can stay focused on
 *  current state (map, forts, gems, charts) while this one is the place
 *  to scroll back through what actually happened. Own `useEventsDump()`
 *  call rather than sharing the home page's — same pattern every other
 *  independent poller in this app already follows (see `useEventsDump`'s
 *  own doc comment). */
export function LogsPage() {
	const { lang } = useLanguage();
	const t = useT();
	const { events: eventsDump, lastUpdated, refresh } = useEventsDump();

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
	const wishes = useMemo(() => computeDragonWishes(eventsDump, lang), [eventsDump, lang]);

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
		</div>
	);
}
