import type { AdvancedClass } from "../types/trainer";

// Ported from CoRT's TrainerConstants (js/libs/cortlibs.js)
export const MIN_CHAR_LEVEL = 10;
export const MAX_CHAR_LEVEL = 60;
export const MIN_DISCIPLINE_LEVEL = 1;
export const MAX_DISCIPLINE_LEVEL = 19;
export const MIN_SPELL_RANK = 0;
export const MAX_SPELL_RANK = 5;
export const NECRO_GEM_BONUS_POWER_POINTS = 5;

// class masks are used to fetch the right discipline trees for each class.
// High nibble = base archetype (Archer/Mage/Warrior), full byte = the
// advanced class itself.
export const CLASS_TYPE_MASKS: Record<AdvancedClass, number> = {
	hunter: 0x11,
	marksman: 0x12,
	conjurer: 0x21,
	warlock: 0x22,
	barbarian: 0x41,
	knight: 0x42,
};

export const BASE_ARCHETYPE: Record<AdvancedClass, "Arqueiro" | "Mago" | "Guerreiro"> = {
	hunter: "Arqueiro",
	marksman: "Arqueiro",
	conjurer: "Mago",
	warlock: "Mago",
	barbarian: "Guerreiro",
	knight: "Guerreiro",
};

export const ARCHETYPE_HUE: Record<"Arqueiro" | "Mago" | "Guerreiro", string> = {
	Guerreiro: "var(--red)",
	Mago: "var(--purple)",
	Arqueiro: "var(--green)",
};

export const CLASS_LABELS: Record<AdvancedClass, string> = {
	knight: "Knight",
	barbarian: "Barbarian",
	conjurer: "Conjurer",
	warlock: "Warlock",
	hunter: "Hunter",
	marksman: "Marksman",
};

export const CLASSES: AdvancedClass[] = [
	"knight",
	"barbarian",
	"conjurer",
	"warlock",
	"hunter",
	"marksman",
];

// Only the current game version ships bundled for offline use. Older
// versions can still be added later by copying their trainerdata.json +
// icons into public/data/trainer/<version>/ (see README).
export const DATASET_VERSIONS = ["1.35.19"];
export const DEFAULT_DATASET_VERSION = "1.35.19";

export const LEVEL_LABEL_NECRO = "necro";
