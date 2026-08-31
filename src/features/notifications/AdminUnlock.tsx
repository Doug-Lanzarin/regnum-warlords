import { useState } from "react";
import styles from "./AdminUnlock.module.css";

interface Props {
	error: string | null;
	onUnlock: (password: string) => void;
	onCancel?: () => void;
}

export function AdminUnlock({ error, onUnlock, onCancel }: Props) {
	const [password, setPassword] = useState("");

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!password.trim()) return;
		onUnlock(password.trim());
	}

	return (
		<form className={styles.form} onSubmit={handleSubmit}>
			<label className={styles.field}>
				<span>Senha de gerenciamento</span>
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
						Cancelar
					</button>
				)}
				<button type="submit" className="btn btn-primary">
					Entrar
				</button>
			</div>
		</form>
	);
}
