import { useMemo, useState } from "react";
import { ClassPicker } from "../features/trainer/ClassPicker";
import { ArmorPieceCard } from "../features/armor/ArmorPieceCard";
import { ResistancePanel } from "../features/armor/ResistancePanel";
import { ProtectionResults } from "../features/armor/ProtectionResults";
import { useArmorBuild } from "../features/armor/useArmorBuild";
import { computeProtection } from "../features/armor/armorEngine";
import { encodeArmorBuild } from "../features/armor/armorShareLink";
import { useT } from "../i18n/useT";
import styles from "./ArmorPage.module.css";

export function ArmorPage() {
	const t = useT();
	const {
		build,
		setClass,
		setPieceField,
		cycleQuality,
		setArmorBonusPct,
		setResistancePhysicalPct,
		setResistanceMagicPct,
		setResistanceByType,
		setDamageReductionPct,
		reset,
	} = useArmorBuild();
	const [copied, setCopied] = useState(false);

	const protection = useMemo(() => computeProtection(build), [build]);
	const pieceIds = Object.keys(build.pieces) as (keyof typeof build.pieces)[];

	async function handleShare() {
		const encoded = encodeArmorBuild(build);
		const url = `${window.location.origin}${window.location.pathname}?armor=${encoded}`;
		window.history.replaceState(null, "", `?armor=${encoded}`);
		try {
			await navigator.clipboard.writeText(url);
			setCopied(true);
			setTimeout(() => setCopied(false), 2500);
		} catch {
			// clipboard unavailable — the URL bar was still updated
		}
	}

	return (
		<div className={styles.wrap}>
			<div className={`card ${styles.header}`}>
				<div>
					<h1 className={styles.title}>{t("armor.title")}</h1>
					<p className={styles.subtitle}>{t("armor.subtitle")}</p>
				</div>
				<div className={styles.headerActions}>
					<button className="btn btn-ghost" onClick={reset}>
						{t("trainer.reset")}
					</button>
					<button className="btn btn-primary" onClick={handleShare}>
						{copied ? t("trainer.linkCopied") : t("trainer.shareBuild")}
					</button>
				</div>
			</div>

			<div className={`card ${styles.classCard}`}>
				<ClassPicker value={build.clas} onChange={setClass} />
			</div>

			<div className={styles.pieceGrid}>
				{pieceIds.map((pieceId) => (
					<ArmorPieceCard
						key={pieceId}
						pieceId={pieceId}
						state={build.pieces[pieceId]!}
						onFieldChange={(field, value) => setPieceField(pieceId, field, value)}
						onCycleQuality={(type) => cycleQuality(pieceId, type)}
					/>
				))}
			</div>

			<ResistancePanel
				build={build}
				onArmorBonusPctChange={setArmorBonusPct}
				onResistancePhysicalPctChange={setResistancePhysicalPct}
				onResistanceMagicPctChange={setResistanceMagicPct}
				onResistanceByTypeChange={setResistanceByType}
				onDamageReductionPctChange={setDamageReductionPct}
			/>

			<ProtectionResults build={build} protection={protection} />
		</div>
	);
}
