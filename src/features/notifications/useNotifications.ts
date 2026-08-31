import { useCallback, useEffect, useState } from "react";
import { createNotification, deleteNotification, listNotifications, NotificationsApiError, type NotificationEntry } from "../../api/notificationsApi";

const ADMIN_PASSWORD_KEY = "rw_notifications_admin_password";

function readStoredPassword(): string {
	try {
		return localStorage.getItem(ADMIN_PASSWORD_KEY) ?? "";
	} catch {
		return "";
	}
}
function storePassword(password: string) {
	try {
		localStorage.setItem(ADMIN_PASSWORD_KEY, password);
	} catch {
		// localStorage unavailable (private mode, etc.) — the session just won't remember it.
	}
}
function clearStoredPassword() {
	try {
		localStorage.removeItem(ADMIN_PASSWORD_KEY);
	} catch {
		// see above
	}
}

/** Notifications are a lightweight CRUD backed by our own /api/notifications
 *  (GitHub-as-a-database, see api/notifications.ts) rather than CoRT — so
 *  this hook mirrors useWzStatus/useBossTimers' loading/error shape but adds
 *  the password-gated create/delete actions (only used by the hidden
 *  /warlords/gerenciamento/notificacoes admin page). */
export function useNotifications() {
	const [notifications, setNotifications] = useState<NotificationEntry[] | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [adminPassword, setAdminPassword] = useState<string>(() => readStoredPassword());
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
		setAdminPassword("");
		clearStoredPassword();
	}, []);

	const unlock = useCallback((password: string) => {
		setAdminPassword(password);
		storePassword(password);
		setActionError(null);
	}, []);

	const handleActionError = useCallback(
		(err: unknown, fallback: string) => {
			if (err instanceof NotificationsApiError && err.status === 401) {
				lock();
				setActionError("Senha inválida. Entre novamente.");
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
				await createNotification(title, description, adminPassword);
				refresh();
				return true;
			} catch (err) {
				handleActionError(err, "Erro ao criar notificação.");
				return false;
			} finally {
				setBusy(false);
			}
		},
		[adminPassword, refresh, handleActionError],
	);

	const remove = useCallback(
		async (id: string) => {
			setBusy(true);
			setActionError(null);
			try {
				await deleteNotification(id, adminPassword);
				refresh();
			} catch (err) {
				handleActionError(err, "Erro ao remover notificação.");
			} finally {
				setBusy(false);
			}
		},
		[adminPassword, refresh, handleActionError],
	);

	return {
		notifications,
		loading,
		error,
		now,
		refresh,
		unlocked: adminPassword !== "",
		unlock,
		lock,
		create,
		remove,
		actionError,
		busy,
	};
}
