import { DAMAGE_TYPES } from "../../data/armorConstants";
import { useT } from "../../i18n/useT";
import type { ArmorBuild, DamageType } from "../../types/armor";
import { TYPE_LABEL_KEY } from "./ArmorPieceCard";
import styles from "./ResistancePanel.module.css";

interface Props {
	build: ArmorBuild;
	onArmorBonusPctChange: (value: number) => void;
	onResistancePhysicalPctChange: (value: number) => void;
	onResistanceMagicPctChange: (value: number) => void;
	onResistanceByTypeChange: (type: DamageType, value: number) => void;
	onDamageReductionPctChange: (value: number) => void;
}

export function ResistancePanel({
	build,
	onArmorBonusPctChange,
	onResistancePhysicalPctChange,
	onResistanceMagicPctChange,
	onResistanceByTypeChange,
	onDamageReductionPctChange,
}: Props) {
	const t = useT();
	return (
		<section className={`card ${styles.card}`}>
			<h3 className={styles.title}>{t("armor.bonusesTitle")}</h3>

			<div className={styles.grid}>
				<label className={styles.field}>
					<span>{t("armor.armorBonusLabel")}</span>
					<input type="number" value={build.armorBonusPct} onChange={(e) => onArmorBonusPctChange(Number(e.target.value))} />
				</label>
				<label className={styles.field}>
					<span>{t("armor.resPhysicalLabel")}</span>
					<input type="number" value={build.resistancePhysicalPct} onChange={(e) => onResistancePhysicalPctChange(Number(e.target.value))} />
				</label>
				<label className={styles.field}>
					<span>{t("armor.resMagicLabel")}</span>
					<input type="number" value={build.resistanceMagicPct} onChange={(e) => onResistanceMagicPctChange(Number(e.target.value))} />
				</label>
				<label className={styles.field}>
					<span>{t("armor.damageReductionLabel")}</span>
					<input type="number" value={build.damageReductionPct} onChange={(e) => onDamageReductionPctChange(Number(e.target.value))} />
				</label>
			</div>

			<span className={styles.subLabel}>{t("armor.resByTypeLabel")}</span>
			<div className={styles.grid}>
				{DAMAGE_TYPES.map((type) => (
					<label key={type} className={styles.field}>
						<span>{t(TYPE_LABEL_KEY[type])}</span>
						<input type="number" value={build.resistanceByType[type]} onChange={(e) => onResistanceByTypeChange(type, Number(e.target.value))} />
					</label>
				))}
			</div>
		</section>
	);
}
