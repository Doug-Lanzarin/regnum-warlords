import { useCallback, useEffect, useState } from "react";
import { createNotification, deleteNotification, listNotifications, NotificationsApiError, type NotificationEntry } from "../../api/notificationsApi";
import { useT } from "../../i18n/useT";

const ADMIN_PASSWORD_KEY = "rw_notifications_admin_password";
/** Keeps the timeline current while the page (installed PWA or a regular
 *  tab) is actually open and visible — skipped while backgrounded so an
 *  installed app sitting behind another app doesn't keep polling for nothing. */
const REFRESH_INTERVAL_MS = 30_000;

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
	const t = useT();
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
			.catch((err) => setError(err instanceof Error ? err.message : t("notifications.unknownError")))
			.finally(() => setLoading(false));
	}, [t]);

	useEffect(() => {
		refresh();
	}, [refresh]);

	useEffect(() => {
		const tick = setInterval(() => {
			if (document.visibilityState === "visible") refresh();
		}, REFRESH_INTERVAL_MS);

		// Also catch up immediately when the page comes back to the
		// foreground (e.g. reopening an installed PWA) instead of waiting
		// out the rest of the interval.
		function onVisibilityChange() {
			if (document.visibilityState === "visible") refresh();
		}
		document.addEventListener("visibilitychange", onVisibilityChange);

		return () => {
			clearInterval(tick);
			document.removeEventListener("visibilitychange", onVisibilityChange);
		};
	}, [refresh]);

	const lock = useCallback(() => {
		setAdminPassword("");
		clearStoredPassword();
	}, []);

	const handleActionError = useCallback(
		(err: unknown, fallback: string) => {
			if (err instanceof NotificationsApiError && err.status === 401) {
				lock();
				setActionError(t("notifications.invalidPassword"));
			} else {
				setActionError(err instanceof Error ? err.message : fallback);
			}
		},
		[lock, t],
	);

	const unlock = useCallback((password: string) => {
		setAdminPassword(password);
		storePassword(password);
		setActionError(null);
	}, []);

	const create = useCallback(
		async (title: string, description: string) => {
			setBusy(true);
			setActionError(null);
			try {
				await createNotification(title, description, adminPassword);
				refresh();
				return true;
			} catch (err) {
				handleActionError(err, t("notifications.createError"));
				return false;
			} finally {
				setBusy(false);
			}
		},
		[adminPassword, refresh, handleActionError, t],
	);

	const remove = useCallback(
		async (id: string) => {
			setBusy(true);
			setActionError(null);
			try {
				await deleteNotification(id, adminPassword);
				refresh();
			} catch (err) {
				handleActionError(err, t("notifications.deleteError"));
			} finally {
				setBusy(false);
			}
		},
		[adminPassword, refresh, handleActionError, t],
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
