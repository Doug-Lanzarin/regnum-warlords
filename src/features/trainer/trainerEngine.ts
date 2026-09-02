import {
	CLASS_TYPE_MASKS,
	MAX_DISCIPLINE_LEVEL,
	MAX_SPELL_RANK,
	MIN_DISCIPLINE_LEVEL,
	NECRO_GEM_BONUS_POWER_POINTS,
} from "../../data/trainerConstants";
import type { Lang } from "../../i18n/languages";
import { translate } from "../../i18n/translate";
import type {
	AdvancedClass,
	DisciplineState,
	Spell,
	SpellValueEntry,
	TrainerBuild,
	TrainerData,
	TrainerTotals,
} from "../../types/trainer";

/** "80" for Archer/Warrior classes, "32" for Mage classes (Conjurer/Warlock). */
export function powerPointsKey(clas: AdvancedClass): "32" | "80" {
	return (CLASS_TYPE_MASKS[clas] & 0xf0) === 0x20 ? "32" : "80";
}

/** Ordered list of discipline names available to a class: base archetype first, then specialization. */
export function getTreeNames(trainerData: TrainerData, clas: AdvancedClass): string[] {
	const classMask = CLASS_TYPE_MASKS[clas];
	const baseMask = classMask & 0xf0;
	const base = trainerData.class_disciplines[String(baseMask)] ?? [];
	const spec = trainerData.class_disciplines[String(classMask)] ?? [];
	return [...base, ...spec];
}

/** Same disciplines as getTreeNames, split into the shared base-archetype group and the class specialization group. */
export function getTreeGroups(
	trainerData: TrainerData,
	clas: AdvancedClass,
): { general: string[]; specialization: string[] } {
	const classMask = CLASS_TYPE_MASKS[clas];
	const baseMask = classMask & 0xf0;
	const general = trainerData.class_disciplines[String(baseMask)] ?? [];
	const specialization = trainerData.class_disciplines[String(classMask)] ?? [];
	return { general, specialization };
}

export function computeTotals(
	trainerData: TrainerData,
	clas: AdvancedClass,
	level: number,
	necroGem: boolean,
): { dpointsTotal: number; ppointsTotal: number } {
	const key = powerPointsKey(clas);
	const dpointsTotal = trainerData.points.discipline[key][level - 1] ?? 0;
	const extra = necroGem ? NECRO_GEM_BONUS_POWER_POINTS : 0;
	const ppointsTotal = (trainerData.points.power[key][level - 1] ?? 0) + extra;
	return { dpointsTotal, ppointsTotal };
}

/** Discipline-point cost to move a discipline from `fromLevel` to `toLevel` (both 1-19, odd). */
export function disciplineCost(trainerData: TrainerData, fromLevel: number, toLevel: number): number {
	const req = trainerData.required.points;
	return (req[toLevel - 1] ?? 0) - (req[fromLevel - 1] ?? 0);
}

/** Highest discipline level a character of `charLevel` is allowed to reach, ignoring point cost. */
export function maxDisciplineLevelForCharLevel(trainerData: TrainerData, charLevel: number): number {
	const levels = trainerData.required.level;
	let max = MIN_DISCIPLINE_LEVEL;
	for (let i = 0; i < levels.length; i++) {
		if (levels[i] <= charLevel) max = i + 1;
	}
	if (max % 2 === 0) max -= 1;
	return Math.max(max, MIN_DISCIPLINE_LEVEL);
}

/** Character level required to reach a given discipline level. */
export function charLevelRequiredFor(trainerData: TrainerData, disciplineLevel: number): number {
	return trainerData.required.level[disciplineLevel - 1] ?? Infinity;
}

/** War Mastery ("WM") disciplines' spells don't scale with rank at all in
 *  the data — no array-valued mana/buff/debuff/damage/heal anywhere, just a
 *  single flat effect. They only need to be unlocked (rank 0→1) once the
 *  discipline is leveled up enough, not ranked with power points like every
 *  other spell in the game. */
export function isSingleTierSpell(spell: Spell): boolean {
	if (Array.isArray(spell.mana)) return false;
	const keys = ["buffs", "debuffs", "damage", "heal"] as const;
	for (const key of keys) {
		const entries = spell[key] as SpellValueEntry[] | undefined;
		if (!Array.isArray(entries)) continue;
		for (const entry of entries) {
			if (Array.isArray(entry.value)) return false;
		}
	}
	return true;
}

/** Max rank obtainable for a spell at the discipline's current level.
 *  Single-tier spells (see `isSingleTierSpell`) cap at 1 regardless of
 *  discipline level, since there's nothing beyond "unlocked" for them. */
export function maxSpellRank(
	trainerData: TrainerData,
	disciplineLevel: number,
	isFirstSpellOfTree: boolean,
	spell?: Spell,
): number {
	let m = trainerData.required.power[disciplineLevel - 1] ?? 0;
	if (disciplineLevel === MIN_DISCIPLINE_LEVEL && isFirstSpellOfTree) m += 1;
	const cap = spell && isSingleTierSpell(spell) ? 1 : MAX_SPELL_RANK;
	return Math.min(m, cap);
}

export function emptyDisciplineState(spellCount: number): DisciplineState {
	return { level: MIN_DISCIPLINE_LEVEL, spellRanks: new Array(spellCount).fill(0) };
}

export function createEmptyBuild(
	trainerData: TrainerData,
	clas: AdvancedClass,
	level: number,
	necroGem: boolean,
	datasetVersion: string,
): TrainerBuild {
	const trees = getTreeNames(trainerData, clas);
	const disciplines: Record<string, DisciplineState> = {};
	for (const name of trees) {
		const spellCount = trainerData.disciplines[name]?.spells.length ?? 0;
		disciplines[name] = emptyDisciplineState(spellCount);
	}
	return { datasetVersion, clas, level, necroGem, disciplines };
}

export function computeTotalsForBuild(trainerData: TrainerData, build: TrainerBuild): TrainerTotals {
	if (!build.clas) {
		return { dpointsTotal: 0, dpointsSpent: 0, dpointsLeft: 0, ppointsTotal: 0, ppointsSpent: 0, ppointsLeft: 0 };
	}
	const { dpointsTotal, ppointsTotal } = computeTotals(trainerData, build.clas, build.level, build.necroGem);
	let dpointsSpent = 0;
	let ppointsSpent = 0;
	for (const [name, state] of Object.entries(build.disciplines)) {
		dpointsSpent += disciplineCost(trainerData, MIN_DISCIPLINE_LEVEL, state.level);
		const spells = trainerData.disciplines[name]?.spells ?? [];
		state.spellRanks.forEach((rank, idx) => {
			const spell = spells[idx];
			if (spell && isSingleTierSpell(spell)) return; // unlocking is free — see isSingleTierSpell
			ppointsSpent += rank;
		});
	}
	return {
		dpointsTotal,
		dpointsSpent,
		dpointsLeft: dpointsTotal - dpointsSpent,
		ppointsTotal,
		ppointsSpent,
		ppointsLeft: ppointsTotal - ppointsSpent,
	};
}

export interface DisciplineChangeCheck {
	ok: boolean;
	reason?: string;
}

export function canSetDisciplineLevel(
	trainerData: TrainerData,
	build: TrainerBuild,
	disciplineName: string,
	newLevel: number,
	lang: Lang,
): DisciplineChangeCheck {
	if (newLevel < MIN_DISCIPLINE_LEVEL || newLevel > MAX_DISCIPLINE_LEVEL) {
		return { ok: false, reason: translate(lang, "trainer.errOutOfRangePermitted") };
	}
	if (charLevelRequiredFor(trainerData, newLevel) > build.level) {
		return { ok: false, reason: translate(lang, "trainer.errRequiresCharLevel", { level: charLevelRequiredFor(trainerData, newLevel) }) };
	}
	const state = build.disciplines[disciplineName];
	if (!state) return { ok: false, reason: translate(lang, "trainer.errInvalidDiscipline") };
	if (newLevel < state.level) {
		// lowering: make sure no spell rank would exceed the new cap
		const trees = build.clas ? getTreeNames(trainerData, build.clas) : [];
		const isFirst = trees[0] === disciplineName;
		const spells = trainerData.disciplines[disciplineName]?.spells ?? [];
		const exceedsCap = state.spellRanks.some((r, idx) => r > maxSpellRank(trainerData, newLevel, isFirst && idx === 0, spells[idx]));
		if (exceedsCap) {
			return { ok: false, reason: translate(lang, "trainer.errLowerSkillsFirst") };
		}
		return { ok: true };
	}
	const cost = disciplineCost(trainerData, state.level, newLevel);
	const totals = computeTotalsForBuild(trainerData, build);
	if (cost > totals.dpointsLeft) {
		return { ok: false, reason: translate(lang, "trainer.errInsufficientDisciplinePoints") };
	}
	return { ok: true };
}

export function canSetSpellRank(
	trainerData: TrainerData,
	build: TrainerBuild,
	disciplineName: string,
	spellIndex: number,
	newRank: number,
	lang: Lang,
): DisciplineChangeCheck {
	const state = build.disciplines[disciplineName];
	if (!state) return { ok: false, reason: translate(lang, "trainer.errInvalidDiscipline") };
	if (newRank < 0) return { ok: false, reason: translate(lang, "trainer.errOutOfRange") };
	const trees = build.clas ? getTreeNames(trainerData, build.clas) : [];
	const isFirstTree = trees[0] === disciplineName;
	const spell = trainerData.disciplines[disciplineName]?.spells[spellIndex];
	const cap = maxSpellRank(trainerData, state.level, isFirstTree && spellIndex === 0, spell);
	if (newRank > cap) {
		return { ok: false, reason: translate(lang, "trainer.errMaxRank", { cap }) };
	}
	const current = state.spellRanks[spellIndex] ?? 0;
	const diff = newRank - current;
	if (diff > 0 && !(spell && isSingleTierSpell(spell))) {
		const totals = computeTotalsForBuild(trainerData, build);
		if (diff > totals.ppointsLeft) {
			return { ok: false, reason: translate(lang, "trainer.errInsufficientPowerPoints") };
		}
	}
	return { ok: true };
}

export function firstDisciplineName(trainerData: TrainerData, clas: AdvancedClass): string | undefined {
	return getTreeNames(trainerData, clas)[0];
}

export function isFirstDiscipline(trainerData: TrainerData, clas: AdvancedClass | null, name: string): boolean {
	if (!clas) return false;
	return firstDisciplineName(trainerData, clas) === name;
}

export function clampBuildToLevel(trainerData: TrainerData, build: TrainerBuild): TrainerBuild {
	const trees = build.clas ? getTreeNames(trainerData, build.clas) : [];
	const disciplines: Record<string, DisciplineState> = {};
	for (const [name, state] of Object.entries(build.disciplines)) {
		const maxAllowed = maxDisciplineLevelForCharLevel(trainerData, build.level);
		const level = Math.min(state.level, maxAllowed);
		const isFirst = trees[0] === name;
		const spells = trainerData.disciplines[name]?.spells ?? [];
		const spellRanks = state.spellRanks.map((rank, idx) =>
			Math.min(rank, maxSpellRank(trainerData, level, isFirst && idx === 0, spells[idx])),
		);
		disciplines[name] = { level, spellRanks };
	}
	return { ...build, disciplines };
}
