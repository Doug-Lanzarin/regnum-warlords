import { useEffect } from "react";
import { formatFortLabel } from "../../data/fortKind";
import { REALM_COLOR, type Realm } from "../../data/realms";
import { useLanguage } from "../../i18n/LanguageContext";
import { useT } from "../../i18n/useT";
import { formatDateTime, formatRelativePast } from "../../utils/time";
import type { HumanizedEvent } from "./wzEventsEngine";
import styles from "./FortHistoryModal.module.css";

interface Props {
	fortName: string;
	owner: Realm;
	now: number;
	history: HumanizedEvent[];
	onClose: () => void;
}

/** Mini-histórico de um forte específico, aberto ao clicar nele no mapa —
 *  mesma renderização de linha do log geral (`EventsLogSection`), mas
 *  filtrada só pras capturas/recapturas daquele forte. */
export function FortHistoryModal({ fortName, owner, now, history, onClose }: Props) {
	const { lang } = useLanguage();
	const t = useT();

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [onClose]);

	const cleanName = formatFortLabel(fortName, lang);

	return (
		<div className={styles.backdrop} onClick={onClose}>
			<div
				className={`card ${styles.dialog}`}
				role="dialog"
				aria-modal="true"
				aria-label={t("wz.historyAriaLabel", { name: cleanName })}
				onClick={(e) => e.stopPropagation()}
			>
				<div className={styles.header}>
					<div className={styles.titleGroup}>
						<h2 className={styles.fortName}>{cleanName}</h2>
						<span className={styles.subtitle}>{t("wz.historyCaptures", { count: history.length })}</span>
					</div>
					<span className={styles.ownerBadge} style={{ "--owner-color": REALM_COLOR[owner] } as React.CSSProperties}>
						{owner}
					</span>
					<button className={styles.closeBtn} onClick={onClose} aria-label={t("wz.historyClose")}>
						✕
					</button>
				</div>

				{history.length === 0 ? (
					<p className={styles.empty}>{t("wz.historyEmpty")}</p>
				) : (
					<ul className={styles.list}>
						{history.map((event) => (
							<li key={event.key} className={styles.row}>
								<time className={styles.time} title={formatDateTime(event.date, lang)}>
									{formatRelativePast(now - event.date * 1000, lang)}
								</time>
								<span className={styles.line}>
									{event.segments.map((segment, i) => (
										<span
											key={i}
											className={segment.realm ? styles.realmText : undefined}
											style={segment.realm ? ({ "--realm-color": REALM_COLOR[segment.realm] } as React.CSSProperties) : undefined}
										>
											{segment.text}
										</span>
									))}
								</span>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
}
