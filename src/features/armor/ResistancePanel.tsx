import { DAMAGE_TYPES } from "../../data/armorConstants";
import { useT } from "../../i18n/useT";
import type { ArmorBuild, DamageType } from "../../types/armor";
import { TYPE_LABEL_KEY } from "./ArmorPieceCard";
import { NumberField } from "./NumberField";
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
					<NumberField value={build.armorBonusPct} onChange={onArmorBonusPctChange} />
				</label>
				<label className={styles.field}>
					<span>{t("armor.resPhysicalLabel")}</span>
					<NumberField value={build.resistancePhysicalPct} onChange={onResistancePhysicalPctChange} />
				</label>
				<label className={styles.field}>
					<span>{t("armor.resMagicLabel")}</span>
					<NumberField value={build.resistanceMagicPct} onChange={onResistanceMagicPctChange} />
				</label>
				<label className={styles.field}>
					<span>{t("armor.damageReductionLabel")}</span>
					<NumberField value={build.damageReductionPct} onChange={onDamageReductionPctChange} />
				</label>
			</div>

			<span className={styles.subLabel}>{t("armor.resByTypeLabel")}</span>
			<div className={styles.grid}>
				{DAMAGE_TYPES.map((type) => (
					<label key={type} className={styles.field}>
						<span>{t(TYPE_LABEL_KEY[type])}</span>
						<NumberField value={build.resistanceByType[type]} onChange={(v) => onResistanceByTypeChange(type, v)} />
					</label>
				))}
			</div>
		</section>
	);
}
