import { useCallback, useEffect, useState } from "react";
import { createNotification, deleteNotification, listNotifications, NotificationsApiError, type NotificationEntry } from "../../api/notificationsApi";

const ADMIN_TOKEN_KEY = "rw_notifications_admin_token";

function readStoredToken(): string {
	try {
		return localStorage.getItem(ADMIN_TOKEN_KEY) ?? "";
	} catch {
		return "";
	}
}
function storeToken(token: string) {
	try {
		localStorage.setItem(ADMIN_TOKEN_KEY, token);
	} catch {
		// localStorage unavailable (private mode, etc.) — the session just won't remember the token.
	}
}
function clearStoredToken() {
	try {
		localStorage.removeItem(ADMIN_TOKEN_KEY);
	} catch {
		// see above
	}
}

/** Notifications are a lightweight CRUD backed by our own /api/notifications
 *  (GitHub-as-a-database, see api/notifications.ts) rather than CoRT — so
 *  this hook mirrors useWzStatus/useBossTimers' loading/error shape but adds
 *  the admin-token-gated create/delete actions. */
export function useNotifications() {
	const [notifications, setNotifications] = useState<NotificationEntry[] | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [adminToken, setAdminToken] = useState<string>(() => readStoredToken());
	const [actionError, setActionError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		const tick = setInterval(() => setNow(Date.now()), 30_000);
		return () => clearInterval(tick);
	}, []);

	const refresh = useCallback(() => {
		setLoading(true);
		listNotifications()
			.then((res) => {
				setNotifications(res.notifications);
				setError(null);
			})
			.catch((err) => setError(err instanceof Error ? err.message : "Erro desconhecido."))
			.finally(() => setLoading(false));
	}, []);

	useEffect(() => {
		refresh();
	}, [refresh]);

	const lock = useCallback(() => {
		setAdminToken("");
		clearStoredToken();
	}, []);

	const unlock = useCallback((token: string) => {
		setAdminToken(token);
		storeToken(token);
		setActionError(null);
	}, []);

	const dismissError = useCallback(() => setActionError(null), []);

	const handleActionError = useCallback(
		(err: unknown, fallback: string) => {
			if (err instanceof NotificationsApiError && err.status === 401) {
				lock();
				setActionError("Token de administrador inválido. Entre novamente.");
			} else {
				setActionError(err instanceof Error ? err.message : fallback);
			}
		},
		[lock],
	);

	const create = useCallback(
		async (title: string, description: string) => {
			setBusy(true);
			setActionError(null);
			try {
				await createNotification(title, description, adminToken);
				refresh();
				return true;
			} catch (err) {
				handleActionError(err, "Erro ao criar notificação.");
				return false;
			} finally {
				setBusy(false);
			}
		},
		[adminToken, refresh, handleActionError],
	);

	const remove = useCallback(
		async (id: string) => {
			setBusy(true);
			setActionError(null);
			try {
				await deleteNotification(id, adminToken);
				refresh();
			} catch (err) {
				handleActionError(err, "Erro ao remover notificação.");
			} finally {
				setBusy(false);
			}
		},
		[adminToken, refresh, handleActionError],
	);

	return {
		notifications,
		loading,
		error,
		now,
		refresh,
		unlocked: adminToken !== "",
		unlock,
		lock,
		create,
		remove,
		actionError,
		dismissError,
		busy,
	};
}
