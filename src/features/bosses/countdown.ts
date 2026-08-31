export { formatDateTime, formatRelativePast } from "../../utils/time";

/** Formats a millisecond duration as a compact countdown, showing only the
 *  precision that matters at that distance (no jittery seconds ticker for
 *  something 2 days away). */
export function formatCountdown(ms: number): string {
	if (ms <= 0) return "Pode já ter reaparecido";
	const totalSeconds = Math.floor(ms / 1000);
	const days = Math.floor(totalSeconds / 86400);
	const hours = Math.floor((totalSeconds % 86400) / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	if (days > 0) return `${days}d ${hours}h ${minutes}m`;
	if (hours > 0) return `${hours}h ${minutes}m`;
	if (minutes > 0) return `${minutes}m ${seconds}s`;
	return `${seconds}s`;
}
