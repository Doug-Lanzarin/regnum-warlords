import type { AlertSettings } from "../../types/alertSettings";

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

export function pushSupported(): boolean {
	return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

/** VAPID public keys arrive base64url-encoded; `PushManager.subscribe`
 *  wants the raw bytes as a Uint8Array. */
function urlBase64ToUint8Array(base64Url: string): Uint8Array {
	const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
	const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
	const raw = atob(base64);
	return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
	if (!pushSupported()) return null;
	const registration = await navigator.serviceWorker.ready;
	return registration.pushManager.getSubscription();
}

async function postToPushApi(path: string, body: unknown): Promise<void> {
	const res = await fetch(path, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	if (!res.ok) throw new Error(`${path} respondeu ${res.status}`);
}

/** Subscribes this browser to push and registers it (+ the current alert
 *  settings) with the server so `api/push/tick.ts` knows what to check for
 *  it. Requires Notification permission to already be granted — most
 *  browsers refuse `pushManager.subscribe()` otherwise. */
export async function subscribeToPush(vapidPublicKey: string, settings: AlertSettings): Promise<boolean> {
	if (!pushSupported() || Notification.permission !== "granted") return false;
	try {
		const registration = await navigator.serviceWorker.ready;
		let subscription = await registration.pushManager.getSubscription();
		if (!subscription) {
			subscription = await registration.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
			});
		}
		await postToPushApi("/api/push/subscribe", { subscription: subscription.toJSON(), settings });
		return true;
	} catch (err) {
		console.error("subscribeToPush failed", err);
		return false;
	}
}

/** Re-sends the current settings for an already-active subscription — call
 *  whenever `AlertSettings` changes so the server-side tick stays in sync.
 *  No-ops quietly if there's no active subscription yet. */
export async function syncPushSettings(settings: AlertSettings): Promise<void> {
	const subscription = await getPushSubscription().catch(() => null);
	if (!subscription) return;
	try {
		await postToPushApi("/api/push/subscribe", { subscription: subscription.toJSON(), settings });
	} catch (err) {
		console.error("syncPushSettings failed", err);
	}
}

export async function unsubscribeFromPush(): Promise<void> {
	const subscription = await getPushSubscription().catch(() => null);
	if (!subscription) return;
	const endpoint = subscription.endpoint;
	await subscription.unsubscribe().catch(() => undefined);
	try {
		await postToPushApi("/api/push/unsubscribe", { endpoint });
	} catch (err) {
		console.error("unsubscribeFromPush failed", err);
	}
}
