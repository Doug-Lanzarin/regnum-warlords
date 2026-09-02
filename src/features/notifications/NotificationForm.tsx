import { useState } from "react";
import { useT } from "../../i18n/useT";
import styles from "./NotificationForm.module.css";

interface Props {
	busy: boolean;
	onSubmit: (title: string, description: string) => Promise<boolean>;
}

export function NotificationForm({ busy, onSubmit }: Props) {
	const t = useT();
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
				<span>{t("notificationForm.titleLabel")}</span>
				<input
					className="text-input"
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					maxLength={200}
					placeholder={t("notificationForm.titlePlaceholder")}
					required
				/>
			</label>
			<label className={styles.field}>
				<span>{t("notificationForm.descriptionLabel")}</span>
				<textarea
					className={`text-input ${styles.textarea}`}
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					maxLength={4000}
					rows={3}
					placeholder={t("notificationForm.descriptionPlaceholder")}
					required
				/>
			</label>
			<button type="submit" className="btn btn-primary" disabled={busy}>
				{busy ? t("notificationForm.publishing") : t("notificationForm.publish")}
			</button>
		</form>
	);
}
