// Client for our own /api/notifications serverless function (see
// api/notifications.ts) — not a CoRT endpoint. GET is public; create/delete
// require the admin token as the `x-admin-token` header.

export interface NotificationEntry {
	id: string;
	title: string;
	description: string;
	createdAt: string;
}

export class NotificationsApiError extends Error {
	status: number;
	constructor(status: number, message: string) {
		super(message);
		this.status = status;
	}
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
	const res = await fetch(`/api/notifications${path}`, init);
	if (!res.ok) {
		const body = await res.json().catch(() => null);
		throw new NotificationsApiError(res.status, body?.error || `Erro ${res.status} ao falar com o servidor.`);
	}
	try {
		return (await res.json()) as T;
	} catch {
		throw new NotificationsApiError(res.status, "Resposta inesperada do servidor.");
	}
}

export function listNotifications(): Promise<{ notifications: NotificationEntry[] }> {
	return request("");
}

export function createNotification(title: string, description: string, adminToken: string): Promise<{ notification: NotificationEntry }> {
	return request("", {
		method: "POST",
		headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
		body: JSON.stringify({ title, description }),
	});
}

export function deleteNotification(id: string, adminToken: string): Promise<{ ok: true }> {
	return request(`?id=${encodeURIComponent(id)}`, {
		method: "DELETE",
		headers: { "x-admin-token": adminToken },
	});
}
