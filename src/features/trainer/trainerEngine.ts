import {
	CLASS_TYPE_MASKS,
	MAX_CHAR_LEVEL,
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

/** War Mastery's raw 10-slot spell array interleaves its 5 real skills with
 *  5 unused "undefined"/"undefinedN" placeholder entries (CoRT's
 *  `load_tree()` skips factory() calls for these via `spellpos % 2 == 1`) —
 *  they must never be treated as real, costed skills, even though their
 *  shape (scalar `mana: 0`, no buffs/debuffs/damage/heal) would otherwise
 *  satisfy isSingleTierSpell's heuristic below. */
export function isPlaceholderSpell(spell: Spell): boolean {
	return /^undefined\d*$/.test(spell.name.en);
}

/** War Mastery ("WM") disciplines' spells don't scale with rank at all in
 *  the data — no array-valued mana/buff/debuff/damage/heal anywhere, just a
 *  single flat effect. They only need to be unlocked (rank 0→1) once the
 *  discipline is leveled up enough, not ranked with power points like every
 *  other spell in the game. */
export function isSingleTierSpell(spell: Spell): boolean {
	if (isPlaceholderSpell(spell)) return false;
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
 *  Single-tier spells (see `isSingleTierSpell`) don't have the normal 1-5
 *  incremental ranks to buy into — there's a single flat effect, so once
 *  their slot is unlocked they're granted at the full `MAX_SPELL_RANK`
 *  straight away (paying for it the same as maxing a normal spell would),
 *  bypassing the level-based power-point ceiling below that gates normal
 *  spells' ranks.
 *
 *  A discipline only opens `required.available[level-1]` of its 10 spell
 *  slots at a time (1 at the lowest level, growing to all 10 by level 19,
 *  ported from CoRT's `update_tree()`: `if (i > requirements["available"]
 *  [dlvl - 1]) maxslvl = 0`) — slots beyond that are locked (rank 0)
 *  regardless of the power-point cap below, `spellIndex` (0-based) is what
 *  that's checked against. */
export function maxSpellRank(
	trainerData: TrainerData,
	disciplineLevel: number,
	isFirstSpellOfTree: boolean,
	spell: Spell | undefined,
	spellIndex: number,
): number {
	const available = trainerData.required.available[disciplineLevel - 1] ?? 0;
	if (spellIndex + 1 > available) return 0;
	if (spell && isSingleTierSpell(spell)) return MAX_SPELL_RANK;
	let m = trainerData.required.power[disciplineLevel - 1] ?? 0;
	if (disciplineLevel === MIN_DISCIPLINE_LEVEL && isFirstSpellOfTree) m += 1;
	return Math.min(m, MAX_SPELL_RANK);
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
	const trees = getTreeNames(trainerData, build.clas);
	let dpointsSpent = 0;
	let ppointsSpent = 0;
	for (const [name, state] of Object.entries(build.disciplines)) {
		dpointsSpent += disciplineCost(trainerData, MIN_DISCIPLINE_LEVEL, state.level);
		const spells = trainerData.disciplines[name]?.spells ?? [];
		const isFirst = trees[0] === name;
		state.spellRanks.forEach((rank, idx) => {
			const spell = spells[idx];
			if (spell && isSingleTierSpell(spell)) {
				// Single-tier (War Mastery) spells aren't individually ranked —
				// their cost is derived from whether the discipline level has
				// unlocked their slot, not from stored rank (see maxSpellRank).
				ppointsSpent += maxSpellRank(trainerData, state.level, isFirst && idx === 0, spell, idx);
				return;
			}
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
	if (newLevel > state.level && build.clas && build.level !== MAX_CHAR_LEVEL && isWarMasteryDiscipline(trainerData, build.clas, disciplineName)) {
		return { ok: false, reason: translate(lang, "trainer.errWarMasteryRequiresMaxLevel", { level: MAX_CHAR_LEVEL }) };
	}
	if (newLevel < state.level) {
		// lowering: make sure no spell rank would exceed the new cap
		const trees = build.clas ? getTreeNames(trainerData, build.clas) : [];
		const isFirst = trees[0] === disciplineName;
		const spells = trainerData.disciplines[disciplineName]?.spells ?? [];
		const exceedsCap = state.spellRanks.some((r, idx) => r > maxSpellRank(trainerData, newLevel, isFirst && idx === 0, spells[idx], idx));
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
	// Raising the level can auto-unlock single-tier (War Mastery) spells,
	// each costing MAX_SPELL_RANK power points the instant their slot opens
	// (see maxSpellRank) — check the resulting total, the same way a normal
	// spell rank increase already checks ppointsLeft before applying.
	const afterRaise: TrainerBuild = { ...build, disciplines: { ...build.disciplines, [disciplineName]: { ...state, level: newLevel } } };
	if (computeTotalsForBuild(trainerData, afterRaise).ppointsLeft < 0) {
		return { ok: false, reason: translate(lang, "trainer.errInsufficientPowerPoints") };
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
	const cap = maxSpellRank(trainerData, state.level, isFirstTree && spellIndex === 0, spell, spellIndex);
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

/** War Mastery is always the last tree in a class's specialization group
 *  (CoRT's `trainer.js` picks it the same way — `this.wmrow` is fixed at
 *  the final row, "7" for archers/warriors and "8" for mages — rather than
 *  matching on the discipline's name, which this mirrors for the same
 *  reason: robust to a dataset relabeling "X WM" someday). */
export function isWarMasteryDiscipline(trainerData: TrainerData, clas: AdvancedClass, name: string): boolean {
	const { specialization } = getTreeGroups(trainerData, clas);
	return specialization.length > 0 && specialization[specialization.length - 1] === name;
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
			Math.min(rank, maxSpellRank(trainerData, level, isFirst && idx === 0, spells[idx], idx)),
		);
		disciplines[name] = { level, spellRanks };
	}
	return { ...build, disciplines };
}
