import { CLASS_ARMOR_MULTIPLIER, DAMAGE_TYPES, MIN_DAMAGE_PERCENT_HIGH, MIN_DAMAGE_PERCENT_LOW, PIECE_DISTRIBUTION, QUALITY_FACTOR, QUALITY_TIERS, piecesForClass } from "../../data/armorConstants";
import type { AdvancedClass } from "../../types/trainer";
import type { ArmorBuild, ArmorPieceState, DamageSimulationResult, DamageType, ProtectionByType, QualityTier } from "../../types/armor";

const MAGIC_TYPES: DamageType[] = ["fire", "ice", "electric"];

export function isMagicDamageType(type: DamageType): boolean {
	return MAGIC_TYPES.includes(type);
}

export function emptyPieceState(): ArmorPieceState {
	const quality = {} as Record<DamageType, QualityTier>;
	for (const type of DAMAGE_TYPES) quality[type] = "n";
	return { pba: 0, bcmt: 0, quality };
}

export function createEmptyArmorBuild(clas: AdvancedClass): ArmorBuild {
	const pieces: ArmorBuild["pieces"] = {};
	for (const id of piecesForClass(clas)) pieces[id] = emptyPieceState();
	const resistanceByType = {} as Record<DamageType, number>;
	for (const type of DAMAGE_TYPES) resistanceByType[type] = 0;
	return {
		clas,
		pieces,
		armorBonusPct: 0,
		resistancePhysicalPct: 0,
		resistanceMagicPct: 0,
		resistanceByType,
		damageReductionPct: 0,
	};
}

export function nextQualityTier(current: QualityTier): QualityTier {
	const idx = QUALITY_TIERS.indexOf(current);
	return QUALITY_TIERS[(idx + 1) % QUALITY_TIERS.length];
}

/** Protection points per damage type, summed across every equipped piece
 *  then scaled once by the class's Armor Class multiplier — ported from
 *  championsofregnum.com's official formulas:
 *    contrib[type] = ceil(pba * (distribution / 100) * qualityFactor[type]) + bcmt
 *    protection[type] = sum(contrib[type]) * (1 + armorBonusPct / 100) * classMultiplier
 */
export function computeProtection(build: ArmorBuild): ProtectionByType {
	const protection = {} as ProtectionByType;
	for (const type of DAMAGE_TYPES) protection[type] = 0;

	for (const [id, state] of Object.entries(build.pieces)) {
		if (!state) continue;
		const dist = PIECE_DISTRIBUTION[id as keyof typeof PIECE_DISTRIBUTION];
		const pba = Math.max(0, state.pba);
		const bcmt = Math.max(0, state.bcmt);
		for (const type of DAMAGE_TYPES) {
			const factor = QUALITY_FACTOR[state.quality[type]];
			// A single division at the end (rather than `pba * (dist / 100) *
			// factor`) avoids floating-point drift — e.g. 100 * 0.28 * 0.5 can
			// land a hair above 14, which ceil then rounds up to 15.
			protection[type] += Math.ceil((pba * dist * factor) / 100) + bcmt;
		}
	}

	const classMult = CLASS_ARMOR_MULTIPLIER[build.clas];
	for (const type of DAMAGE_TYPES) {
		protection[type] = protection[type] * (1 + build.armorBonusPct / 100) * classMult;
	}
	return protection;
}

/** Simulates one hit of `rawDamage` in `damageType` against the build's
 *  current protection/resistances. Since only a single damage type is
 *  simulated at a time, "protection influence" (how much of the total
 *  incoming damage this type represents) is always 100% — protection
 *  subtracts directly. Mirrors the official formula's damage-reduction
 *  steps, showing the game's random 4–8% minimum-damage floor as a range
 *  instead of rolling a single value. */
export function simulateIncomingDamage(build: ArmorBuild, protection: ProtectionByType, damageType: DamageType, rawDamage: number): DamageSimulationResult {
	const generalResPct = isMagicDamageType(damageType) ? build.resistanceMagicPct : build.resistancePhysicalPct;
	const typeResPct = build.resistanceByType[damageType];

	let dmg = rawDamage - protection[damageType];
	dmg -= dmg * (generalResPct / 100);
	dmg -= dmg * (typeResPct / 100);

	const minLow = rawDamage * (MIN_DAMAGE_PERCENT_LOW / 100);
	const minHigh = rawDamage * (MIN_DAMAGE_PERCENT_HIGH / 100);
	const lowDmg = Math.max(dmg, minLow);
	const highDmg = Math.max(dmg, minHigh);

	const reductionMult = 1 - build.damageReductionPct / 100;
	const finalLow = Math.ceil(Math.min(lowDmg, highDmg) * reductionMult);
	const finalHigh = Math.ceil(Math.max(lowDmg, highDmg) * reductionMult);
	return { finalLow, finalHigh };
}
