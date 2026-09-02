import { useMemo, useRef, useState } from "react";
import { useLanguage } from "../../i18n/LanguageContext";
import { useT } from "../../i18n/useT";
import type { TranslationKey } from "../../i18n/translate";
import type { WzEvent } from "../../types/wz";
import { formatHourMinute } from "../../utils/time";
import { computeFortActivityTimeline } from "./wzEventsEngine";
import styles from "./FortActivityTimeline.module.css";

const WINDOW_MS = 24 * 60 * 60 * 1000;

type Granularity = 15 | 30 | 60;
const GRANULARITIES: Granularity[] = [15, 30, 60];
const GRANULARITY_LABEL_KEY: Record<Granularity, TranslationKey> = {
	15: "wz.granularity15",
	30: "wz.granularity30",
	60: "wz.granularity60",
};

const VB_W = 600;
const VB_H = 220;
const PAD = { top: 14, right: 10, bottom: 26, left: 28 };
const PLOT_W = VB_W - PAD.left - PAD.right;
const PLOT_H = VB_H - PAD.top - PAD.bottom;

/** Rounds a max value up to a "nice" gridline-friendly number (next 5, 10,
 *  25, 50... depending on magnitude) instead of an arbitrary data max. */
function niceMax(value: number): number {
	if (value <= 5) return 5;
	const step = value <= 20 ? 5 : value <= 50 ? 10 : value <= 100 ? 25 : 50;
	return Math.ceil(value / step) * step;
}

/** Line chart: fort captures (all realms) per time slice over the last 24h
 *  — how active the war has been throughout the day. A granularity tab row
 *  switches the bucket width; a crosshair on hover/touch reads out the
 *  exact time and count for the nearest bucket. */
export function FortActivityTimeline({ events, now }: { events: WzEvent[]; now: number }) {
	const { lang } = useLanguage();
	const t = useT();
	const [granularity, setGranularity] = useState<Granularity>(30);
	const [hoverIndex, setHoverIndex] = useState<number | null>(null);
	const svgRef = useRef<SVGSVGElement>(null);

	const buckets = useMemo(
		() => computeFortActivityTimeline(events, WINDOW_MS, granularity * 60 * 1000, now),
		[events, granularity, now],
	);

	const max = niceMax(Math.max(...buckets.map((b) => b.count), 0));
	const total = buckets.reduce((sum, b) => sum + b.count, 0);
	const n = buckets.length;

	const xAt = (i: number) => PAD.left + (n > 1 ? (i / (n - 1)) * PLOT_W : PLOT_W / 2);
	const yAt = (count: number) => PAD.top + (1 - count / max) * PLOT_H;
	const baseline = PAD.top + PLOT_H;

	const points = buckets.map((b, i) => [xAt(i), yAt(b.count)] as const);
	const linePath = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
	const areaPath =
		points.length > 0
			? `M${points[0][0].toFixed(1)},${baseline} ` +
				points.map(([x, y]) => `L${x.toFixed(1)},${y.toFixed(1)}`).join(" ") +
				` L${points[points.length - 1][0].toFixed(1)},${baseline} Z`
			: "";

	const yTicks = [0, Math.round(max / 2), max];
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

	const hovered = hoverIndex !== null ? buckets[hoverIndex] : null;
	const hoverX = hoverIndex !== null ? xAt(hoverIndex) : 0;
	const hoverY = hoverIndex !== null ? yAt(buckets[hoverIndex].count) : 0;

	return (
		<section className={styles.section}>
			<div className={styles.header}>
				<div className={styles.titleGroup}>
					<h2>{t("wz.timelineTitle")}</h2>
					<span className={styles.count}>{t("wz.timelineCount", { total })}</span>
				</div>

				<div className={styles.tabsGroup}>
					<span className={styles.tabsLabel} id="fort-timeline-granularity-label">
						{t("wz.timelineIntervalLabel")}
					</span>
					<div className={styles.tabs} role="tablist" aria-labelledby="fort-timeline-granularity-label">
						{GRANULARITIES.map((g) => (
							<button
								key={g}
								type="button"
								role="tab"
								aria-selected={granularity === g}
								className={`${styles.tab} ${granularity === g ? styles.tabActive : ""}`}
								onClick={() => setGranularity(g)}
							>
								{t(GRANULARITY_LABEL_KEY[g])}
							</button>
						))}
					</div>
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
						aria-label={t("wz.timelineChartAriaLabel", { total })}
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
								{tick}
							</text>
						))}

						{tickIndices.map((i, tickPos) => {
							const anchor = tickPos === 0 ? "start" : tickPos === tickIndices.length - 1 ? "end" : "middle";
							return (
								<text key={i} x={xAt(i)} y={VB_H - 6} className={styles.xLabel} textAnchor={anchor}>
									{formatHourMinute(buckets[i]?.time ?? now, lang)}
								</text>
							);
						})}

						{areaPath && <path d={areaPath} className={styles.area} />}
						{linePath && <path d={linePath} className={styles.line} />}

						{hovered && (
							<>
								<line x1={hoverX} x2={hoverX} y1={PAD.top} y2={baseline} className={styles.crosshair} />
								<circle cx={hoverX} cy={hoverY} r="4.5" className={styles.hoverDot} />
							</>
						)}
					</svg>

					{hovered && hoverIndex !== null && (
						<div
							className={styles.tooltip}
							style={{ left: `${(hoverX / VB_W) * 100}%`, top: `${(hoverY / VB_H) * 100}%` }}
						>
							<strong>{hovered.count}</strong> {t(hovered.count === 1 ? "wz.fortSingular" : "wz.fortPlural")}
							<span className={styles.tooltipTime}>{formatHourMinute(hovered.time, lang)}</span>
						</div>
					)}
				</div>
			</div>
		</section>
	);
}
