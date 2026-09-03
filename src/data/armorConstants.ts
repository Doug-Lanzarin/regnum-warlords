import type { AdvancedClass } from "../types/trainer";
import type { ArmorPieceId, DamageType, QualityTier } from "../types/armor";

// Ported from championsofregnum.com's official formulas page ("Fórmulas" —
// index.php?sec=2&subsec=12), section "Armadura y Resistencias".

export const DAMAGE_TYPES: DamageType[] = ["slash", "pierce", "blunt", "fire", "ice", "electric"];

export const QUALITY_TIERS: QualityTier[] = ["vb", "b", "n", "g", "vg"];

export const QUALITY_FACTOR: Record<QualityTier, number> = {
	vb: 0.2,
	b: 0.35,
	n: 0.5,
	g: 0.65,
	vg: 0.8,
};

/** Armor Class multiplier, applied once to a class's total summed protection. */
export const CLASS_ARMOR_MULTIPLIER: Record<AdvancedClass, number> = {
	knight: 1.4,
	barbarian: 1.4,
	marksman: 1.35,
	hunter: 1.3,
	conjurer: 1.2,
	warlock: 1.2,
};

/** % of a piece's own PBA (Pontos Base de Armadura) that counts toward protection. */
export const PIECE_DISTRIBUTION: Record<ArmorPieceId, number> = {
	chest: 28,
	shoulders: 16,
	legs: 20,
	helmet: 24,
	gauntlets: 12,
	robe: 64,
	shield: 25,
	bracelet: 20,
};

/** Which armor slots a class can equip at all — verified against the
 *  official manual ("Personagem" page: warriors/archers wear separate iron
 *  or leather pieces, mages wear one combined robe) and the Regnum Online
 *  Wiki (shield is Knight-only — Barbarian's free hand holds a weapon
 *  instead; bracelet is mage-only). Not a free choice: switching class
 *  changes which slots even exist. */
export function piecesForClass(clas: AdvancedClass): ArmorPieceId[] {
	if (clas === "conjurer" || clas === "warlock") return ["robe", "helmet", "gauntlets", "bracelet"];
	const base: ArmorPieceId[] = ["chest", "shoulders", "legs", "helmet", "gauntlets"];
	return clas === "knight" ? [...base, "shield"] : base;
}

/** Damage reduction never drops below this range of the raw hit, whatever
 *  the protection/resistance total — the game rolls a random point in
 *  [4, 8) each hit; the calculator shows the full range instead of rolling. */
export const MIN_DAMAGE_PERCENT_LOW = 4;
export const MIN_DAMAGE_PERCENT_HIGH = 8;
