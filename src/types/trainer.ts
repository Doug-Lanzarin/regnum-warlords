// Types describing the trainer reference data (ported from CoRT's trainerdata.json)
// and the local build state used by the Regnum Warlords trainer calculator.

export interface LangText {
	en: string;
	es?: string;
	de?: string;
	fr?: string;
	[lang: string]: string | undefined;
}

export interface SpellValueEntry {
	en: string;
	es?: string;
	de?: string;
	fr?: string;
	/** An array scales with the spell's rank (one entry per rank); a bare
	 *  string/boolean means the spell has no rank scaling at all — see
	 *  `isSingleTierSpell` in trainerEngine.ts (War Mastery disciplines). */
	value: string[] | string | boolean;
}

export interface Spell {
	name: LangText;
	description: LangText;
	/** Array = mana cost per rank; a bare number means the spell doesn't
	 *  scale with rank (see `isSingleTierSpell`). */
	mana?: number[] | number;
	type: string;
	cast: number;
	gcd: string;
	cooldown: number;
	range?: number;
	area?: number;
	duration?: number[] | number;
	buffs?: SpellValueEntry[];
	debuffs?: SpellValueEntry[];
	damage?: SpellValueEntry[];
	heal?: SpellValueEntry[];
	[extra: string]: unknown;
}

export interface Discipline {
	class: string;
	display_name: LangText;
	spells: Spell[];
}

export interface TrainerData {
	version: string;
	min_power_level: number;
	is_translatable: boolean;
	accept_languages: string[];
	translatable_constants: Record<string, unknown>;
	points: {
		discipline: Record<string, number[]>;
		power: Record<string, number[]>;
	};
	required: {
		level: number[];
		points: number[];
		available: number[];
		power: number[];
	};
	class_disciplines: Record<string, string[]>;
	disciplines: Record<string, Discipline>;
}

// The 6 "advanced" classes a character can be trained as. Each one grants
// access to its base archetype's general disciplines plus its own
// specialization disciplines (CoRT's class_type_masks).
export type AdvancedClass =
	| "hunter"
	| "marksman"
	| "conjurer"
	| "warlock"
	| "barbarian"
	| "knight";

export interface DisciplineState {
	/** Odd number from 1 to 19 */
	level: number;
	/** Rank (0-5) invested in each spell, aligned with discipline.spells index */
	spellRanks: number[];
}

export interface TrainerBuild {
	datasetVersion: string;
	clas: AdvancedClass | null;
	/** Character level, 10-60 */
	level: number;
	/** true when the level-60 Necromancer crystal bonus (+5 power points) is active */
	necroGem: boolean;
	/** keyed by discipline name */
	disciplines: Record<string, DisciplineState>;
}

export interface TrainerTotals {
	dpointsTotal: number;
	dpointsSpent: number;
	dpointsLeft: number;
	ppointsTotal: number;
	ppointsSpent: number;
	ppointsLeft: number;
}
