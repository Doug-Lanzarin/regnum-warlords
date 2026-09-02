import { readSubscribers, writeSubscribers } from "../_push/storage";

interface VercelLikeRequest {
	method?: string;
	body?: unknown;
}

interface VercelLikeResponse {
	status(code: number): VercelLikeResponse;
	json(body: unknown): void;
	setHeader(name: string, value: string): void;
}

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
	if (req.method !== "POST") {
		res.setHeader("Allow", "POST");
		res.status(405).json({ error: "Método não suportado." });
		return;
	}

	const body = (req.body ?? {}) as { endpoint?: unknown };
	if (typeof body.endpoint !== "string" || !body.endpoint) {
		res.status(400).json({ error: "endpoint é obrigatório." });
		return;
	}

	try {
		const { subscribers, sha } = await readSubscribers();
		const updated = subscribers.filter((s) => s.subscription.endpoint !== body.endpoint);
		if (updated.length !== subscribers.length) {
			await writeSubscribers(updated, sha, "push: remove assinatura");
		}
		res.status(200).json({ ok: true });
	} catch (err) {
		console.error("push unsubscribe error:", err);
		res.status(500).json({ error: "Não foi possível remover a assinatura." });
	}
}
