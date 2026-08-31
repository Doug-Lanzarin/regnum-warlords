import { randomUUID } from "node:crypto";

// Vercel serverless function — no dedicated backend/database. Notifications
// are stored as JSON committed straight into this repo (content/notifications.json)
// via the GitHub Contents API, so every write is a real git commit and every
// read always reflects the latest commit on the branch (no redeploy needed
// to see a change — only the client's own polling/refresh interval).
//
// Required env vars (set in the Vercel project, never exposed to the client):
//   NOTIFICATIONS_GITHUB_TOKEN  — a GitHub token with Contents: Read and
//                                 write access on this repo only.
//   NOTIFICATIONS_ADMIN_TOKEN   — any secret string of your choosing; the
//                                 client must send it back as the
//                                 `x-admin-token` header to create/delete.
//
// GET is public (anyone visiting the site can read the list). POST/DELETE
// require the admin token, so random visitors can't write.

interface VercelLikeRequest {
	method?: string;
	headers: Record<string, string | string[] | undefined>;
	query: Record<string, string | string[] | undefined>;
	body?: unknown;
}

interface VercelLikeResponse {
	status(code: number): VercelLikeResponse;
	json(body: unknown): void;
	setHeader(name: string, value: string): void;
}

interface NotificationEntry {
	id: string;
	title: string;
	description: string;
	createdAt: string;
}

const OWNER = "Doug-Lanzarin";
const REPO = "regnum-warlords";
const FILE_PATH = "content/notifications.json";
const BRANCH = "main";
const MAX_TITLE_LEN = 200;
const MAX_DESCRIPTION_LEN = 4000;

function githubToken(): string {
	const token = process.env.NOTIFICATIONS_GITHUB_TOKEN;
	if (!token) throw new Error("NOTIFICATIONS_GITHUB_TOKEN não configurado");
	return token;
}

async function githubRequest(path: string, init?: RequestInit): Promise<Response> {
	return fetch(`https://api.github.com${path}`, {
		...init,
		headers: {
			Authorization: `Bearer ${githubToken()}`,
			Accept: "application/vnd.github+json",
			"X-GitHub-Api-Version": "2022-11-28",
			...(init?.headers ?? {}),
		},
	});
}

async function readNotifications(): Promise<{ notifications: NotificationEntry[]; sha: string | null }> {
	const res = await githubRequest(`/repos/${OWNER}/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`);
	if (res.status === 404) return { notifications: [], sha: null };
	if (!res.ok) throw new Error(`Falha ao ler do GitHub (${res.status})`);
	const data = (await res.json()) as { content: string; sha: string };
	const raw = Buffer.from(data.content, "base64").toString("utf-8");
	const parsed = raw.trim() ? (JSON.parse(raw) as NotificationEntry[]) : [];
	return { notifications: parsed, sha: data.sha };
}

async function writeNotifications(notifications: NotificationEntry[], sha: string | null, message: string): Promise<void> {
	const content = Buffer.from(JSON.stringify(notifications, null, "\t") + "\n", "utf-8").toString("base64");
	const res = await githubRequest(`/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`, {
		method: "PUT",
		body: JSON.stringify({ message, content, branch: BRANCH, ...(sha ? { sha } : {}) }),
	});
	if (!res.ok) {
		const body = await res.text();
		throw new Error(`Falha ao salvar no GitHub (${res.status}): ${body}`);
	}
}

function isAuthorized(req: VercelLikeRequest): boolean {
	const expected = process.env.NOTIFICATIONS_ADMIN_TOKEN;
	if (!expected) return false;
	const provided = req.headers["x-admin-token"];
	return typeof provided === "string" && provided === expected;
}

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
	try {
		if (req.method === "GET") {
			const { notifications } = await readNotifications();
			notifications.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
			res.status(200).json({ notifications });
			return;
		}

		if (!isAuthorized(req)) {
			res.status(401).json({ error: "Token de administrador inválido ou ausente." });
			return;
		}

		if (req.method === "POST") {
			const body = (req.body ?? {}) as { title?: unknown; description?: unknown };
			const title = typeof body.title === "string" ? body.title.trim() : "";
			const description = typeof body.description === "string" ? body.description.trim() : "";
			if (!title || !description) {
				res.status(400).json({ error: "title e description são obrigatórios." });
				return;
			}
			const entry: NotificationEntry = {
				id: randomUUID(),
				title: title.slice(0, MAX_TITLE_LEN),
				description: description.slice(0, MAX_DESCRIPTION_LEN),
				createdAt: new Date().toISOString(),
			};
			const { notifications, sha } = await readNotifications();
			const updated = [entry, ...notifications];
			await writeNotifications(updated, sha, `notificações: adiciona "${entry.title}"`);
			res.status(201).json({ notification: entry });
			return;
		}

		if (req.method === "DELETE") {
			const idParam = req.query.id ?? (req.body as { id?: unknown } | undefined)?.id;
			const id = typeof idParam === "string" ? idParam : Array.isArray(idParam) ? idParam[0] : undefined;
			if (!id) {
				res.status(400).json({ error: "id é obrigatório." });
				return;
			}
			const { notifications, sha } = await readNotifications();
			const updated = notifications.filter((n) => n.id !== id);
			if (updated.length === notifications.length) {
				res.status(404).json({ error: "Notificação não encontrada." });
				return;
			}
			await writeNotifications(updated, sha, `notificações: remove ${id}`);
			res.status(200).json({ ok: true });
			return;
		}

		res.setHeader("Allow", "GET, POST, DELETE");
		res.status(405).json({ error: "Método não suportado." });
	} catch (error) {
		console.error("notifications api error:", error);
		res.status(500).json({ error: error instanceof Error ? error.message : "Erro interno." });
	}
}
