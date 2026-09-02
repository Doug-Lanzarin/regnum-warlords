import { useEffect } from "react";
import styles from "./AlertToastStack.module.css";

export interface AlertToast {
	id: string;
	title: string;
	body: string;
	/** Realm/boss identity color for the left accent bar; defaults to the theme link color. */
	color?: string;
}

interface Props {
	toasts: AlertToast[];
	onDismiss: (id: string) => void;
}

const AUTO_DISMISS_MS = 8000;

/** Always-available fallback for `AlertsWatcher`'s alerts — shown regardless
 *  of whether the browser Notification permission was granted. */
export function AlertToastStack({ toasts, onDismiss }: Props) {
	if (toasts.length === 0) return null;
	return (
		<div className={styles.stack} role="region" aria-label="Alertas">
			{toasts.map((toast) => (
				<ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
			))}
		</div>
	);
}

function ToastItem({ toast, onDismiss }: { toast: AlertToast; onDismiss: (id: string) => void }) {
	useEffect(() => {
		const timer = setTimeout(() => onDismiss(toast.id), AUTO_DISMISS_MS);
		return () => clearTimeout(timer);
	}, [toast.id, onDismiss]);

	return (
		<div className={`card ${styles.toast}`} style={toast.color ? ({ "--toast-accent": toast.color } as React.CSSProperties) : undefined}>
			<div className={styles.body}>
				<strong className={styles.title}>{toast.title}</strong>
				<p className={styles.text}>{toast.body}</p>
			</div>
			<button className={styles.close} onClick={() => onDismiss(toast.id)} aria-label="Fechar aviso">
				✕
			</button>
		</div>
	);
}
