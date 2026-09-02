import { useState } from "react";
import { useT } from "../../i18n/useT";
import styles from "./AdminUnlock.module.css";

interface Props {
	error: string | null;
	onUnlock: (password: string) => void;
	onCancel?: () => void;
}

export function AdminUnlock({ error, onUnlock, onCancel }: Props) {
	const t = useT();
	const [password, setPassword] = useState("");

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!password.trim()) return;
		onUnlock(password.trim());
	}

	return (
		<form className={styles.form} onSubmit={handleSubmit}>
			<label className={styles.field}>
				<span>{t("adminUnlock.passwordLabel")}</span>
				<input
					className="text-input"
					type="password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					placeholder="••••••••"
					autoFocus
				/>
			</label>
			{error && <p className={styles.error}>{error}</p>}
			<div className={styles.actions}>
				{onCancel && (
					<button type="button" className="btn btn-ghost" onClick={onCancel}>
						{t("adminUnlock.cancel")}
					</button>
				)}
				<button type="submit" className="btn btn-primary">
					{t("adminUnlock.enter")}
				</button>
			</div>
		</form>
	);
}
