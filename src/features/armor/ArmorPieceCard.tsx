import { DAMAGE_TYPES, PIECE_DISTRIBUTION, QUALITY_TIERS } from "../../data/armorConstants";
import { useT } from "../../i18n/useT";
import type { TranslationKey } from "../../i18n/translate";
import type { ArmorPieceId, ArmorPieceState, DamageType, QualityTier } from "../../types/armor";
import styles from "./ArmorPieceCard.module.css";

export const PIECE_LABEL_KEY: Record<ArmorPieceId, TranslationKey> = {
	chest: "armor.pieceChest",
	shoulders: "armor.pieceShoulders",
	legs: "armor.pieceLegs",
	helmet: "armor.pieceHelmet",
	gauntlets: "armor.pieceGauntlets",
	robe: "armor.pieceRobe",
	shield: "armor.pieceShield",
	bracelet: "armor.pieceBracelet",
};

export const TYPE_LABEL_KEY: Record<DamageType, TranslationKey> = {
	slash: "armor.typeSlash",
	pierce: "armor.typePierce",
	blunt: "armor.typeBlunt",
	fire: "armor.typeFire",
	ice: "armor.typeIce",
	electric: "armor.typeElectric",
};

export const QUALITY_LABEL_KEY: Record<QualityTier, TranslationKey> = {
	vb: "armor.qualityVeryBad",
	b: "armor.qualityBad",
	n: "armor.qualityNormal",
	g: "armor.qualityGood",
	vg: "armor.qualityVeryGood",
};

const QUALITY_SHORT_KEY: Record<QualityTier, TranslationKey> = {
	vb: "armor.qualityVeryBadShort",
	b: "armor.qualityBadShort",
	n: "armor.qualityNormalShort",
	g: "armor.qualityGoodShort",
	vg: "armor.qualityVeryGoodShort",
};

/** Deeper tint for higher quality tiers — same idea as the pip/rank fill
 *  elsewhere in the app (e.g. SpellRow's pips), just continuous instead of
 *  discrete steps. */
function qualityShade(tier: QualityTier): string {
	const idx = QUALITY_TIERS.indexOf(tier);
	const alpha = 16 + idx * 19; // 16..92
	return `color-mix(in srgb, var(--links) ${alpha}%, var(--forms))`;
}

interface Props {
	pieceId: ArmorPieceId;
	state: ArmorPieceState;
	onFieldChange: (field: "pba" | "bcmt", value: number) => void;
	onCycleQuality: (type: DamageType) => void;
}

export function ArmorPieceCard({ pieceId, state, onFieldChange, onCycleQuality }: Props) {
	const t = useT();
	return (
		<section className={`card ${styles.card}`}>
			<header className={styles.header}>
				<span className={styles.name}>{t(PIECE_LABEL_KEY[pieceId])}</span>
				<span className={styles.dist}>{PIECE_DISTRIBUTION[pieceId]}%</span>
			</header>

			<div className={styles.numRow}>
				<label className={styles.numField}>
					<span>{t("armor.pbaLabel")}</span>
					<input type="number" min={0} value={state.pba} onChange={(e) => onFieldChange("pba", Math.max(0, Number(e.target.value)))} />
				</label>
				<label className={styles.numField}>
					<span>{t("armor.bcmtLabel")}</span>
					<input type="number" min={0} value={state.bcmt} onChange={(e) => onFieldChange("bcmt", Math.max(0, Number(e.target.value)))} />
				</label>
			</div>

			<div className={styles.qualityGrid}>
				{DAMAGE_TYPES.map((type) => {
					const tier = state.quality[type];
					return (
						<div key={type} className={styles.qCell}>
							<span className={styles.qTypeLabel}>{t(TYPE_LABEL_KEY[type]).slice(0, 3)}</span>
							<button
								type="button"
								className={styles.qBtn}
								style={{ background: qualityShade(tier) }}
								title={`${t(TYPE_LABEL_KEY[type])}: ${t(QUALITY_LABEL_KEY[tier])}`}
								onClick={() => onCycleQuality(type)}
							>
								{t(QUALITY_SHORT_KEY[tier])}
							</button>
						</div>
					);
				})}
			</div>
		</section>
	);
}
