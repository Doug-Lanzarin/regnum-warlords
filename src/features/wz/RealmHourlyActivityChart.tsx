import { useMemo, useRef, useState } from "react";
import { REALMS, REALM_COLOR, type Realm } from "../../data/realms";
import { useLanguage } from "../../i18n/LanguageContext";
import { useT } from "../../i18n/useT";
import { formatHourMinute } from "../../utils/time";
import type { RealmActivityByTimeOfDay } from "./wzEventsEngine";
import styles from "./RealmHourlyActivityChart.module.css";

const VB_W = 600;
const VB_H = 220;
const PAD = { top: 14, right: 10, bottom: 26, left: 28 };
const PLOT_W = VB_W - PAD.left - PAD.right;
const PLOT_H = VB_H - PAD.top - PAD.bottom;

/** Same "round up to a friendly gridline number" helper `FortActivityTimeline`
 *  uses, just allowing 1-decimal steps too — per-day averages are often well
 *  under 1, where the integer-only steps there would round every gridline to
 *  the same 0. */
function niceMax(value: number): number {
	if (value <= 0) return 1;
	if (value <= 1) return Math.ceil(value * 10) / 10 || 0.1;
	if (value <= 5) return Math.ceil(value);
	const step = value <= 20 ? 5 : value <= 50 ? 10 : value <= 100 ? 25 : 50;
	return Math.ceil(value / step) * step;
}

/** `minuteOfDay` (0–1425) → today's Date at that local time, so the existing
 *  `formatHourMinute` (which takes a real timestamp) can label the axis
 *  without a second formatter just for this chart. */
function dateAtMinuteOfDay(minuteOfDay: number): number {
	const d = new Date();
	d.setHours(0, minuteOfDay, 0, 0);
	return d.getTime();
}

interface Props {
	points: RealmActivityByTimeOfDay[];
}

/** "When during the day is each realm usually active?" — fort captures from
 *  the trailing 7 days, averaged per day and bucketed by time-of-day (see
 *  `computeWeeklyActivityByTimeOfDay`) rather than `FortActivityTimeline`'s
 *  absolute-time curve this is based on. One realm-colored line per realm;
 *  the same realm chips double as a legend and a visibility filter. */
export function RealmHourlyActivityChart({ points }: Props) {
	const { lang } = useLanguage();
	const t = useT();
	const [visible, setVisible] = useState<Record<Realm, boolean>>({ Alsius: true, Ignis: true, Syrtis: true });
	const [hoverIndex, setHoverIndex] = useState<number | null>(null);
	const svgRef = useRef<SVGSVGElement>(null);

	const n = points.length;
	const visibleRealms = REALMS.filter((r) => visible[r]);
	const max = useMemo(
		() => niceMax(Math.max(...points.flatMap((p) => visibleRealms.map((r) => p.activity[r])), 0)),
		[points, visibleRealms],
	);

	const xAt = (i: number) => PAD.left + (n > 1 ? (i / (n - 1)) * PLOT_W : PLOT_W / 2);
	const yAt = (value: number) => PAD.top + (1 - value / max) * PLOT_H;

	// Cheap enough (96 points × 3 realms) to just build plainly each render
	// rather than memoize — xAt/yAt aren't stable references anyway (they
	// close over `max`, which changes with the realm filter).
	const linesByRealm: Partial<Record<Realm, string>> = {};
	for (const realm of REALMS) {
		linesByRealm[realm] = points
			.map((p, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yAt(p.activity[realm]).toFixed(1)}`)
			.join(" ");
	}

	const yTicks = [0, max / 2, max];
	const tickIndices =
		n > 1 ? [0, Math.round((n - 1) * 0.25), Math.round((n - 1) * 0.5), Math.round((n - 1) * 0.75), n - 1] : [0];

	function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
		const svg = svgRef.current;
		if (!svg || n === 0) return;
		const rect = svg.getBoundingClientRect();
		const relX = ((e.clientX - rect.left) / rect.width) * VB_W;
		const ratio = (relX - PAD.left) / PLOT_W;
		const idx = Math.min(n - 1, Math.max(0, Math.round(ratio * (n - 1))));
		setHoverIndex(idx);
	}

	const hovered = hoverIndex !== null ? points[hoverIndex] : null;
	const hoverX = hoverIndex !== null ? xAt(hoverIndex) : 0;

	function toggleRealm(realm: Realm) {
		setVisible((prev) => {
			const next = { ...prev, [realm]: !prev[realm] };
			// Never let every line disappear — toggling the last visible one
			// back off would leave an unreadable empty chart with no way back
			// short of reloading.
			if (!REALMS.some((r) => next[r])) return prev;
			return next;
		});
	}

	return (
		<section className={styles.section}>
			<div className={styles.header}>
				<div className={styles.titleGroup}>
					<h2>{t("wz.hourlyActivityTitle")}</h2>
					<span className={styles.count}>{t("wz.hourlyActivitySubtitle")}</span>
				</div>

				<div className={styles.filters} role="group" aria-label={t("wz.hourlyActivityFilterLabel")}>
					{REALMS.map((realm) => (
						<button
							key={realm}
							type="button"
							aria-pressed={visible[realm]}
							className={`${styles.filterChip} ${visible[realm] ? styles.filterChipActive : ""}`}
							style={{ "--realm-color": REALM_COLOR[realm] } as React.CSSProperties}
							onClick={() => toggleRealm(realm)}
						>
							<span className={styles.filterDot} aria-hidden />
							{realm}
						</button>
					))}
				</div>
			</div>

			<div className={`card ${styles.card}`}>
				<div className={styles.chartWrap}>
					<svg
						ref={svgRef}
						className={styles.svg}
						viewBox={`0 0 ${VB_W} ${VB_H}`}
						preserveAspectRatio="none"
						role="img"
						aria-label={t("wz.hourlyActivityChartAriaLabel")}
						onPointerMove={handlePointerMove}
						onPointerLeave={() => setHoverIndex(null)}
					>
						{yTicks.map((tick) => (
							<line
								key={tick}
								x1={PAD.left}
								x2={VB_W - PAD.right}
								y1={yAt(tick)}
								y2={yAt(tick)}
								className={styles.gridline}
							/>
						))}

						{yTicks.map((tick) => (
							<text key={tick} x={PAD.left - 8} y={yAt(tick)} className={styles.yLabel} textAnchor="end" dominantBaseline="middle">
								{tick.toFixed(tick < 1 ? 1 : 0)}
							</text>
						))}

						{tickIndices.map((i, tickPos) => {
							const anchor = tickPos === 0 ? "start" : tickPos === tickIndices.length - 1 ? "end" : "middle";
							return (
								<text key={i} x={xAt(i)} y={VB_H - 6} className={styles.xLabel} textAnchor={anchor}>
									{formatHourMinute(dateAtMinuteOfDay(points[i]?.minuteOfDay ?? 0), lang)}
								</text>
							);
						})}

						{visibleRealms.map((realm) => (
							<path key={realm} d={linesByRealm[realm]} className={styles.line} style={{ stroke: REALM_COLOR[realm] }} />
						))}

						{hovered && (
							<line x1={hoverX} x2={hoverX} y1={PAD.top} y2={PAD.top + PLOT_H} className={styles.crosshair} />
						)}
						{hovered &&
							visibleRealms.map((realm) => (
								<circle
									key={realm}
									cx={hoverX}
									cy={yAt(hovered.activity[realm])}
									r="4"
									className={styles.hoverDot}
									style={{ fill: REALM_COLOR[realm] }}
								/>
							))}
					</svg>

					{hovered && hoverIndex !== null && (
						<div
							className={styles.tooltip}
							style={{ left: `${(hoverX / VB_W) * 100}%`, top: `${(PAD.top / VB_H) * 100}%` }}
						>
							<span className={styles.tooltipTime}>{formatHourMinute(dateAtMinuteOfDay(hovered.minuteOfDay), lang)}</span>
							{visibleRealms.map((realm) => (
								<span key={realm} className={styles.tooltipRow}>
									<span className={styles.tooltipDot} style={{ background: REALM_COLOR[realm] }} aria-hidden />
									{realm}: <strong>{hovered.activity[realm].toFixed(1)}</strong>
								</span>
							))}
						</div>
					)}
				</div>
			</div>
		</section>
	);
}
