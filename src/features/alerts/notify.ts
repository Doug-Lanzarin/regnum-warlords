const ICON = "/icons/icon-192.png";

export type NotificationSupport = NotificationPermission | "unsupported";

export function notificationSupport(): NotificationSupport {
	if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
	return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationSupport> {
	if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
	return Notification.requestPermission();
}

/** Fires an OS-level notification when permission is granted — silently
 *  skipped otherwise, since callers always pair this with an in-app toast
 *  (`AlertsWatcher`'s toast stack) as the guaranteed-to-work fallback. */
export function fireOsNotification(title: string, body: string, tag: string) {
	if (typeof window === "undefined" || !("Notification" in window)) return;
	if (Notification.permission !== "granted") return;
	try {
		new Notification(title, { body, tag, icon: ICON });
	} catch {
		// Some browsers throw on `new Notification` even when permission reads
		// "granted" (notably iOS Safari outside an installed PWA) — the in-app
		// toast still covers it.
	}
}
