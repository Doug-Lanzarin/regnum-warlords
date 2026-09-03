import { describe, expect, it } from "vitest";
import type { Discipline, Spell, TrainerBuild, TrainerData } from "../../types/trainer";
import { canSetDisciplineLevel, computeTotalsForBuild, createEmptyBuild, isWarMasteryDiscipline, maxSpellRank } from "./trainerEngine";

/** Small hand-built fixture, shaped like the real bundled trainerdata.json
 *  (public/data/trainer/1.35.19/trainerdata.json, itself a copy of CoRT's)
 *  but trimmed to just what these tests touch: one archer base discipline
 *  and the hunter specialization list ending in its War Mastery tree,
 *  matching CoRT's `class_type_masks.hunter = 0x11` (archer base 0x10 +
 *  hunter's own 0x11). */
function discipline(name: string, singleTier = false): Discipline {
	return {
		class: "Hunter",
		display_name: { en: name },
		spells: [
			{
				name: { en: `${name} Skill` },
				description: { en: "" },
				mana: singleTier ? 0 : [10, 20, 30, 40, 50],
				type: "Active",
				cast: 1,
				gcd: "Short",
				cooldown: 0,
			},
		],
	};
}

function makeTrainerData(): TrainerData {
	return {
		version: "test",
		min_power_level: 0,
		is_translatable: false,
		accept_languages: ["en"],
		translatable_constants: {},
		// Indexed by *character* level (60 entries, index 0 = level 1) — a
		// generous ramp is enough here, these tests aren't about point costs.
		points: {
			discipline: { "80": Array.from({ length: 60 }, (_, i) => (i + 1) * 100) },
			power: { "80": Array.from({ length: 60 }, (_, i) => (i + 1) * 20) },
		},
		required: {
			level: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 37],
			points: [0, 1, 4, 7, 13, 19, 29, 39, 54, 69, 90, 111, 139, 167, 203, 239, 284, 329, 384],
			available: [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10],
			power: [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5],
		},
		class_disciplines: {
			// base archetype (0x10) — never includes a WM tree.
			"16": ["Short Bows"],
			// hunter (0x11) specialization — WM is always last, per CoRT's
			// `trainer.js` ("WM row is always the latest one").
			"17": ["Scouting", "Hunter WM"],
		},
		disciplines: {
			"Short Bows": discipline("Short Bows"),
			Scouting: discipline("Scouting"),
			"Hunter WM": discipline("Hunter WM", true),
		},
	};
}

function buildAtLevel(trainerData: TrainerData, level: number): TrainerBuild {
	return createEmptyBuild(trainerData, "hunter", level, false, "test");
}

describe("isWarMasteryDiscipline", () => {
	it("identifies the last discipline in the class's specialization group as War Mastery", () => {
		const trainerData = makeTrainerData();
		expect(isWarMasteryDiscipline(trainerData, "hunter", "Hunter WM")).toBe(true);
	});

	it("does not flag the shared base-archetype or earlier specialization disciplines", () => {
		const trainerData = makeTrainerData();
		expect(isWarMasteryDiscipline(trainerData, "hunter", "Short Bows")).toBe(false);
		expect(isWarMasteryDiscipline(trainerData, "hunter", "Scouting")).toBe(false);
	});
});

describe("canSetDisciplineLevel — War Mastery level-60 gate", () => {
	it("blocks raising War Mastery below character level 60, matching CoRT's WM-row lock", () => {
		const trainerData = makeTrainerData();
		const build = buildAtLevel(trainerData, 37); // max char level required by any *normal* discipline level
		const check = canSetDisciplineLevel(trainerData, build, "Hunter WM", 3, "en");
		expect(check.ok).toBe(false);
	});

	it("allows raising War Mastery once the character is at level 60", () => {
		const trainerData = makeTrainerData();
		const build = buildAtLevel(trainerData, 60);
		const check = canSetDisciplineLevel(trainerData, build, "Hunter WM", 3, "en");
		expect(check.ok).toBe(true);
	});

	it("still allows lowering an already-raised War Mastery discipline even if char level later drops below 60", () => {
		const trainerData = makeTrainerData();
		let build = buildAtLevel(trainerData, 60);
		build = { ...build, disciplines: { ...build.disciplines, "Hunter WM": { level: 5, spellRanks: [0] } } };
		build = { ...build, level: 37 };
		const check = canSetDisciplineLevel(trainerData, build, "Hunter WM", 3, "en");
		expect(check.ok).toBe(true);
	});

	it("does not apply the War Mastery gate to normal disciplines", () => {
		const trainerData = makeTrainerData();
		const build = buildAtLevel(trainerData, 37);
		const check = canSetDisciplineLevel(trainerData, build, "Scouting", 3, "en");
		expect(check.ok).toBe(true);
	});
});

describe("maxSpellRank — available slot gate", () => {
	// Real trainerdata.json interleaves War Mastery's actual skills with
	// placeholder "undefined" spells (raw indices 1, 3, 5 here mirror that:
	// CoRT's own update_tree() walks all 10 raw slot positions, placeholders
	// included, so unlocking N slots doesn't unlock N *real* skills).
	const spell: Spell = { name: { en: "s" }, description: { en: "" }, mana: 0, type: "Passive", cast: 0, gcd: "Short", cooldown: 0 };
	const trainerData = makeTrainerData();

	it("locks a slot whose index is beyond the discipline level's available count", () => {
		// level 1 -> available[0] = 1, so only raw slot index 0 is open.
		expect(maxSpellRank(trainerData, 1, false, spell, 0)).toBeGreaterThan(0);
		expect(maxSpellRank(trainerData, 1, false, spell, 1)).toBe(0);
	});

	it("opens later slots as the discipline level (and its available count) rises", () => {
		// level 7 -> available[6] = 4: slots 0-3 open, slot 4 still locked.
		expect(maxSpellRank(trainerData, 7, false, spell, 3)).toBeGreaterThan(0);
		expect(maxSpellRank(trainerData, 7, false, spell, 4)).toBe(0);
	});

	it("applies the same slot gate to single-tier (War Mastery) spells, but grants MAX_SPELL_RANK once unlocked instead of ranking incrementally", () => {
		const singleTier: Spell = { ...spell, mana: 0 };
		expect(maxSpellRank(trainerData, 1, false, singleTier, 1)).toBe(0);
		expect(maxSpellRank(trainerData, 3, false, singleTier, 1)).toBe(5);
	});
});

describe("computeTotalsForBuild — War Mastery costs power points", () => {
	it("charges MAX_SPELL_RANK power points for an unlocked single-tier spell, not 0", () => {
		const trainerData = makeTrainerData();
		const build = buildAtLevel(trainerData, 60);
		// "Hunter WM" (level 1, available[0]=1) already has its one real
		// skill (raw index 0) unlocked from the start.
		const totals = computeTotalsForBuild(trainerData, build);
		expect(totals.ppointsSpent).toBe(5);
	});

	it("charges nothing for a single-tier spell whose slot isn't unlocked yet", () => {
		const trainerData = makeTrainerData();
		// A discipline whose single-tier skill sits at raw index 1 needs
		// available >= 2 (discipline level 3) before it's granted — raw
		// index 0 is an ordinary (non-single-tier) spell, untouched (rank 0
		// by default), so it can't contribute any cost of its own here.
		trainerData.disciplines["Hunter WM"] = {
			class: "Hunter",
			display_name: { en: "Hunter WM" },
			spells: [
				{ name: { en: "filler" }, description: { en: "" }, mana: [10, 20, 30, 40, 50], type: "Active", cast: 1, gcd: "Short", cooldown: 0 },
				{ name: { en: "Real Skill" }, description: { en: "" }, mana: 0, type: "Passive", cast: 0, gcd: "Short", cooldown: 0 },
			],
		};
		const build = buildAtLevel(trainerData, 60);
		expect(computeTotalsForBuild(trainerData, build).ppointsSpent).toBe(0);
	});
});

describe("computeTotalsForBuild — placeholder War Mastery slots are never charged", () => {
	it("does not charge power points for an 'undefined' placeholder slot even once its raw index is unlocked", () => {
		const trainerData = makeTrainerData();
		// Mirrors the real trainerdata.json shape: raw index 0 is an unused
		// placeholder (shares the single-tier shape — scalar mana: 0, no
		// buffs/debuffs/damage/heal — but must never be treated as a real,
		// costed skill), the real single-tier skill sits at raw index 1.
		trainerData.disciplines["Hunter WM"] = {
			class: "Hunter",
			display_name: { en: "Hunter WM" },
			spells: [
				{ name: { en: "undefined" }, description: { en: "" }, mana: 0, type: "Passive", cast: 0, gcd: "Short", cooldown: 0 },
				{ name: { en: "Real Skill" }, description: { en: "" }, mana: 0, type: "Passive", cast: 0, gcd: "Short", cooldown: 0 },
			],
		};
		const build = buildAtLevel(trainerData, 60);
		// level 1 -> available[0] = 1: only raw index 0 (the placeholder) is
		// "unlocked" — the real skill at raw index 1 stays locked, and the
		// placeholder itself must contribute nothing.
		expect(computeTotalsForBuild(trainerData, build).ppointsSpent).toBe(0);
	});
});

describe("canSetDisciplineLevel — power points gate on auto-unlocked War Mastery skills", () => {
	function makeLowPowerTrainerData(): TrainerData {
		const trainerData = makeTrainerData();
		// Barely enough power points for one 5-point skill, nowhere near two.
		trainerData.points.power["80"] = Array.from({ length: 60 }, () => 5);
		return trainerData;
	}

	it("blocks raising the discipline level when it would auto-unlock more War Mastery skills than there are power points left", () => {
		const trainerData = makeLowPowerTrainerData();
		trainerData.disciplines["Hunter WM"] = {
			class: "Hunter",
			display_name: { en: "Hunter WM" },
			spells: [
				{ name: { en: "First" }, description: { en: "" }, mana: 0, type: "Passive", cast: 0, gcd: "Short", cooldown: 0 },
				{ name: { en: "filler" }, description: { en: "" }, mana: 0, type: "Passive", cast: 0, gcd: "Short", cooldown: 0 },
				{ name: { en: "Second" }, description: { en: "" }, mana: 0, type: "Passive", cast: 0, gcd: "Short", cooldown: 0 },
			],
		};
		const build = buildAtLevel(trainerData, 60);
		// level 1->3 raises available from 1 to 2, granting the 2nd skill
		// (raw index 2) on top of the 1st (raw index 0) already active —
		// 10 power points needed, only 5 available.
		const check = canSetDisciplineLevel(trainerData, build, "Hunter WM", 3, "en");
		expect(check.ok).toBe(false);
	});
});
