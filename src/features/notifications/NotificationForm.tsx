import { useState } from "react";
import styles from "./NotificationForm.module.css";

interface Props {
	busy: boolean;
	onSubmit: (title: string, description: string) => Promise<boolean>;
}

export function NotificationForm({ busy, onSubmit }: Props) {
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!title.trim() || !description.trim()) return;
		const ok = await onSubmit(title.trim(), description.trim());
		if (ok) {
			setTitle("");
			setDescription("");
		}
	}

	return (
		<form className={styles.form} onSubmit={handleSubmit}>
			<label className={styles.field}>
				<span>Título</span>
				<input
					className="text-input"
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					maxLength={200}
					placeholder="Ex: Nova atualização disponível"
					required
				/>
			</label>
			<label className={styles.field}>
				<span>Descrição</span>
				<textarea
					className={`text-input ${styles.textarea}`}
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					maxLength={4000}
					rows={3}
					placeholder="Detalhes da notificação…"
					required
				/>
			</label>
			<button type="submit" className="btn btn-primary" disabled={busy}>
				{busy ? "Publicando…" : "Publicar notificação"}
			</button>
		</form>
	);
}
