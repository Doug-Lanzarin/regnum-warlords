/** "há 2d 3h" style relative-past label, for "last seen"/"since" timestamps. */
export function formatRelativePast(ms: number): string {
	if (ms <= 0) return "agora";
	const totalSeconds = Math.floor(ms / 1000);
	const days = Math.floor(totalSeconds / 86400);
	const hours = Math.floor((totalSeconds % 86400) / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);

	if (days > 0) return `há ${days}d ${hours}h`;
	if (hours > 0) return `há ${hours}h ${minutes}m`;
	if (minutes > 0) return `há ${minutes}m`;
	return "há poucos segundos";
}

/** Full local date/time for a Unix-seconds timestamp, e.g. "seg, 31/08, 23:09". */
export function formatDateTime(unixSeconds: number): string {
	const date = new Date(unixSeconds * 1000);
	const formatted = date.toLocaleString("pt-BR", {
		weekday: "short",
		day: "2-digit",
		month: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});
	return formatted.replace(/\.\s*/, ", ").replace(/,\s*,/, ",");
}
