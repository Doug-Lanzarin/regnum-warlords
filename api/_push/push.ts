import { buildPushPayload, type PushSubscription, type VapidKeys } from "@block65/webcrypto-web-push";

export interface PushNotificationPayload {
	title: string;
	body: string;
	/** Path to open on notification click (see `src/sw.ts`'s `notificationclick` handler). */
	url: string;
	// Index signature so this satisfies `@block65/webcrypto-web-push`'s
	// `Jsonifiable` constraint on `PushMessage.data` — every field here is
	// already a plain string, so this doesn't widen what's actually sent.
	[key: string]: string;
}

export interface SendPushResult {
	ok: boolean;
	/** True when the push service says the subscription is gone (404/410) —
	 *  the caller should drop it from the subscriber list. */
	expired: boolean;
}

export async function sendPush(
	subscription: PushSubscription,
	vapid: VapidKeys,
	payload: PushNotificationPayload,
): Promise<SendPushResult> {
	try {
		const message = { data: payload, options: { ttl: 300, urgency: "high" as const } };
		const requestInit = await buildPushPayload(message, subscription, vapid);
		const res = await fetch(subscription.endpoint, requestInit);
		if (res.status === 404 || res.status === 410) return { ok: false, expired: true };
		return { ok: res.ok, expired: false };
	} catch (err) {
		console.error("push: send failed", err);
		return { ok: false, expired: false };
	}
}
