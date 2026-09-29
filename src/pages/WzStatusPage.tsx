import { useMemo, useState } from "react";
import { FortHistoryModal } from "../features/wz/FortHistoryModal";
import { FortsSection } from "../features/wz/FortsSection";
import { GemsSection } from "../features/wz/GemsSection";
import { useEventsDump } from "../features/wz/useEventsDump";
import { useWzStatus } from "../features/wz/useWzStatus";
import { useLanguage } from "../i18n/LanguageContext";
import { useT } from "../i18n/useT";
import { computeFortStatuses, computeGemStatuses, type FortStatus } from "../features/wz/wzEngine";
import { computeFortHistory, computeWallVulnerability } from "../features/wz/wzEventsEngine";
import { formatHourMinuteSecond } from "../utils/time";
import { WzMap } from "../features/wz/WzMap";
import styles from "./WzStatusPage.module.css";

export function WzStatusPage() {
	const { lang } = useLanguage();
	const t = useT();
	const { data, loading, error, now, lastUpdated, refresh } = useWzStatus();
	const { events: eventsDump, refresh: refreshEvents } = useEventsDump();
	const [selectedFort, setSelectedFort] = useState<FortStatus | null>(null);
	// Manual "refresh now" button, rate-limited to once every 10s so a user
	// mashing it can't turn into the same kind of aggregate cort.ovh load
	// that the automatic 60s poll is already sized to avoid. `now` already
	// ticks every second (from useWzStatus), so the cooldown just compares
	// against a stored deadline instead of running its own timer.
	const [manualRefreshCooldownUntil, setManualRefreshCooldownUntil] = useState(0);
	const canManualRefresh = now >= manualRefreshCooldownUntil;
	const handleManualRefresh = () => {
		if (!canManualRefresh) return;
		refresh();
		refreshEvents();
		setManualRefreshCooldownUntil(Date.now() + 10_000);
	};

	const forts = useMemo(() => (data ? computeFortStatuses(data) : []), [data]);
	const gems = useMemo(() => (data ? computeGemStatuses(data) : []), [data]);
	const wallVulnerability = useMemo(() => computeWallVulnerability(forts, eventsDump, now), [forts, eventsDump, now]);
	const fortHistory = useMemo(
		() => (selectedFort ? computeFortHistory(eventsDump, selectedFort.name, lang) : []),
		[eventsDump, selectedFort, lang],
	);

	if (loading && !data) {
		return (
			<div className={styles.wrap}>
				<div className={`card ${styles.centerMessage}`}>
					<span className={styles.spinner} aria-hidden />
					{t("wz.loading")}
				</div>
			</div>
		);
	}

	if (error && !data) {
		return (
			<div className={styles.wrap}>
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
			</div>
		);
	}

	if (!data) return <div className={styles.wrap} />;

	return (
		<div className={styles.wrap}>
			<div className={styles.statusRow}>
				<span>{t("wz.updatedAt", { time: formatHourMinuteSecond(lastUpdated as number, lang) })}</span>
				<button type="button" className="btn btn-ghost" onClick={handleManualRefresh} disabled={!canManualRefresh}>
					{canManualRefresh ? t("wz.manualRefresh") : t("wz.manualRefreshCooldown", { seconds: Math.ceil((manualRefreshCooldownUntil - now) / 1000) })}
				</button>
			</div>
			<WzMap forts={forts} wallVulnerability={wallVulnerability} onSelectFort={setSelectedFort} />
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
		</div>
	);
}
