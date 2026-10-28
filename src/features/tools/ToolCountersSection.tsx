import type { CSSProperties } from "react";
import { useLanguage } from "../../i18n/LanguageContext";
import { useT } from "../../i18n/useT";
import { formatDateTime, formatDuration } from "../../utils/time";
import { useToolCounters } from "./useToolCounters";
import styles from "./ToolCountersSection.module.css";

// Fixed identity colors, not theme tokens — same reasoning as BOSS_INFO's
// own `color` field (bossConstants.ts): Xymerald should read as "blue" and
// Abóboras as "orange" (pumpkin) no matter which app theme is active.
// `--blue` exists as a theme token already; orange doesn't, so it's a
// literal hex instead.
const XYMERALD_COLOR = "var(--blue)";
const ABOBORAS_COLOR = "#ff9f40";

// The reset schedule itself is defined in Brasília time (toolCountersEngine.ts's
// anchors), so the exact date/time shown here is pinned to that timezone for
// every viewer, not whatever timezone their own browser happens to be in —
// otherwise "reseta às 00:00" would show a different hour to someone outside
// Brasília, even though the underlying instant is identical.
const BRASILIA_TIME_ZONE = "America/Sao_Paulo";

export function ToolCountersSection() {
	const t = useT();
	const { lang } = useLanguage();
	const { aboboras, xymerald, now } = useToolCounters();

	return (
		<div className={styles.grid}>
			<div className={`card ${styles.card}`} style={{ "--counter-color": XYMERALD_COLOR } as CSSProperties}>
				<span className={styles.name}>{t("tools.countersXymerald")}</span>
				<div className={styles.countdown}>
					<span className={styles.label}>{t("tools.countersResetIn")}</span>
					<span className={styles.value}>{formatDuration(xymerald.nextResetMs - now)}</span>
					<span className={styles.resetAt}>{formatDateTime(Math.floor(xymerald.nextResetMs / 1000), lang, BRASILIA_TIME_ZONE)}</span>
				</div>
			</div>
			<div className={`card ${styles.card}`} style={{ "--counter-color": ABOBORAS_COLOR } as CSSProperties}>
				<span className={styles.name}>{t("tools.countersAboboras")}</span>
				<div className={styles.countdown}>
					<span className={styles.label}>{t("tools.countersResetIn")}</span>
					<span className={styles.value}>{formatDuration(aboboras.nextResetMs - now)}</span>
					<span className={styles.resetAt}>{formatDateTime(Math.floor(aboboras.nextResetMs / 1000), lang, BRASILIA_TIME_ZONE)}</span>
				</div>
			</div>
		</div>
	);
}
