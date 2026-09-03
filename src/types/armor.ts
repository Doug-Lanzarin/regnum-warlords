// Types for the Armor Calculator — a client-side tool (no live/bundled data
// source like the Trainer has) that ports Champions of Regnum's official
// armor/resistance formulas (championsofregnum.com, "Fórmulas" section).

import type { AdvancedClass } from "./trainer";

export type DamageType = "slash" | "pierce" | "blunt" | "fire" | "ice" | "electric";

export type QualityTier = "vb" | "b" | "n" | "g" | "vg";

// The 8 possible armor slots across all classes. No single class equips all
// of them at once — see `piecesForClass` in armorConstants.ts.
export type ArmorPieceId = "chest" | "shoulders" | "legs" | "helmet" | "gauntlets" | "robe" | "shield" | "bracelet";

export interface ArmorPieceState {
	/** PBA — "Armadura: X" as shown on the item's own tooltip. */
	pba: number;
	/** BCMT — the "(+X)" bonus shown next to the PBA on the tooltip. */
	bcmt: number;
	/** Quality tier per damage type, e.g. a piece can roll "Muito Bom" against fire and "Ruim" against ice. */
	quality: Record<DamageType, QualityTier>;
}

export interface ArmorBuild {
	clas: AdvancedClass;
	/** Only the slots `piecesForClass(clas)` allows are ever populated here. */
	pieces: Partial<Record<ArmorPieceId, ArmorPieceState>>;
	armorBonusPct: number;
	resistancePhysicalPct: number;
	resistanceMagicPct: number;
	resistanceByType: Record<DamageType, number>;
	damageReductionPct: number;
}

export type ProtectionByType = Record<DamageType, number>;

export interface DamageSimulationResult {
	/** Final damage range after protection, resistances and the game's 4–8% minimum-damage floor. */
	finalLow: number;
	finalHigh: number;
}
