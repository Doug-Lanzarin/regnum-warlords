import { useMemo, useState } from "react";
import { DAMAGE_TYPES } from "../../data/armorConstants";
import { useT } from "../../i18n/useT";
import type { ArmorBuild, DamageType, ProtectionByType } from "../../types/armor";
import { simulateIncomingDamage } from "./armorEngine";
import { TYPE_LABEL_KEY } from "./ArmorPieceCard";
import { NumberField } from "./NumberField";
import styles from "./ProtectionResults.module.css";

interface Props {
	build: ArmorBuild;
	protection: ProtectionByType;
}

export function ProtectionResults({ build, protection }: Props) {
	const t = useT();
	const [simType, setSimType] = useState<DamageType>(DAMAGE_TYPES[0]);
	const [simDamage, setSimDamage] = useState(300);

	const maxProtection = Math.max(...DAMAGE_TYPES.map((type) => protection[type]), 1);

	const simResult = useMemo(() => simulateIncomingDamage(build, protection, simType, Math.max(0, simDamage)), [build, protection, simType, simDamage]);
	const resultLabel = simResult.finalLow === simResult.finalHigh ? `${simResult.finalLow}` : `${simResult.finalLow}–${simResult.finalHigh}`;
	const avgFinal = (simResult.finalLow + simResult.finalHigh) / 2;
	const reductionPct = simDamage > 0 ? Math.round((1 - avgFinal / simDamage) * 100) : 0;

	return (
		<div className={styles.grid}>
			<section className={`card ${styles.card}`}>
				<h3 className={styles.title}>{t("armor.protectionTitle")}</h3>
				<div className={styles.meters}>
					{DAMAGE_TYPES.map((type) => {
						const value = protection[type];
						const pct = Math.min(100, (value / maxProtection) * 100);
						return (
							<div key={type} className={styles.meterRow}>
								<span className={styles.meterLabel}>{t(TYPE_LABEL_KEY[type])}</span>
								<div className={`progress-track ${styles.meterTrack}`}>
									<div className="progress-fill" style={{ width: `${pct}%` }} />
								</div>
								<span className={styles.meterValue}>{Math.round(value)}</span>
							</div>
						);
					})}
				</div>
			</section>

			<section className={`card ${styles.card}`}>
				<h3 className={styles.title}>{t("armor.simulateTitle")}</h3>
				<div className={styles.simForm}>
					<label className={styles.simField}>
						<span>{t("armor.simTypeLabel")}</span>
						<select className="select" value={simType} onChange={(e) => setSimType(e.target.value as DamageType)}>
							{DAMAGE_TYPES.map((type) => (
								<option key={type} value={type}>
									{t(TYPE_LABEL_KEY[type])}
								</option>
							))}
						</select>
					</label>
					<label className={styles.simField}>
						<span>{t("armor.simDamageLabel")}</span>
						<NumberField min={0} className={styles.simDamageInput} value={simDamage} onChange={setSimDamage} />
					</label>
				</div>
				<div className={styles.simOut}>
					<div className={styles.simBig}>{resultLabel}</div>
					<div className={styles.simCaption}>
						{t("armor.simCaption", { damage: simDamage, type: t(TYPE_LABEL_KEY[simType]).toLowerCase(), pct: reductionPct })}
					</div>
				</div>
			</section>
		</div>
	);
}
