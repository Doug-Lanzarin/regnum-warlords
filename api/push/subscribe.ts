import type { PushSubscription } from "@block65/webcrypto-web-push";
import type { AlertSettings } from "../../src/types/alertSettings";
import type { SubscriberRecord } from "../_push/storage";

interface VercelLikeRequest {
	method?: string;
	body?: unknown;
}

interface VercelLikeResponse {
	status(code: number): VercelLikeResponse;
	json(body: unknown): void;
	setHeader(name: string, value: string): void;
}

function isValidSubscription(value: unknown): value is PushSubscription {
	if (!value || typeof value !== "object") return false;
	const sub = value as Record<string, unknown>;
	if (typeof sub.endpoint !== "string" || !sub.endpoint) return false;
	const keys = sub.keys as Record<string, unknown> | undefined;
	return !!keys && typeof keys.p256dh === "string" && typeof keys.auth === "string";
}

function isValidSettings(value: unknown): value is AlertSettings {
	if (!value || typeof value !== "object") return false;
	const s = value as Record<string, unknown>;
	return Array.isArray(s.bossAlertMinutes);
}

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
	// TEMP DIAGNOSTIC: all 3 push endpoints (subscribe/unsubscribe/tick) are
	// crashing on Vercel with a bare FUNCTION_INVOCATION_FAILED even on a GET
	// (i.e. before any handler logic runs) — this dynamic-import + top-level
	// try/catch is here only to surface the real error message/stack in the
	// response, since there's no other way to see it remotely. Revert once
	// the actual cause is found and fixed.
	try {
		const { readSubscribers, writeSubscribers } = await import("../_push/storage");

		if (req.method !== "POST") {
			res.setHeader("Allow", "POST");
			res.status(405).json({ error: "Método não suportado." });
			return;
		}

		const body = (req.body ?? {}) as { subscription?: unknown; settings?: unknown };
		if (!isValidSubscription(body.subscription) || !isValidSettings(body.settings)) {
			res.status(400).json({ error: "Corpo inválido." });
			return;
		}
		const subscription = body.subscription;
		const settings = body.settings;

		const { subscribers, sha } = await readSubscribers();
		const withoutThisEndpoint = subscribers.filter((s) => s.subscription.endpoint !== subscription.endpoint);
		const record: SubscriberRecord = { subscription, settings, updatedAt: Date.now() };
		await writeSubscribers([...withoutThisEndpoint, record], sha, "push: adiciona/atualiza assinatura");
		res.status(200).json({ ok: true });
	} catch (err) {
		console.error("push subscribe error:", err);
		res.status(500).json({
			error: "DIAGNOSTIC",
			message: err instanceof Error ? err.message : String(err),
			stack: err instanceof Error ? err.stack : undefined,
		});
	}
}
