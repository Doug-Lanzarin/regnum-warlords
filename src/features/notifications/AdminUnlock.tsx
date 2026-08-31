import { useState } from "react";
import styles from "./AdminUnlock.module.css";

interface Props {
	error: string | null;
	onUnlock: (token: string) => void;
	onCancel: () => void;
}

export function AdminUnlock({ error, onUnlock, onCancel }: Props) {
	const [token, setToken] = useState("");

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!token.trim()) return;
		onUnlock(token.trim());
	}

	return (
		<form className={styles.form} onSubmit={handleSubmit}>
			<label className={styles.field}>
				<span>Token de administrador</span>
				<input
					className="text-input"
					type="password"
					value={token}
					onChange={(e) => setToken(e.target.value)}
					placeholder="••••••••"
					autoFocus
				/>
			</label>
			{error && <p className={styles.error}>{error}</p>}
			<div className={styles.actions}>
				<button type="button" className="btn btn-ghost" onClick={onCancel}>
					Cancelar
				</button>
				<button type="submit" className="btn btn-primary">
					Entrar
				</button>
			</div>
		</form>
	);
}
