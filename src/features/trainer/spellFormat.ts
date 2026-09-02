import type { Discipline, Spell, SpellValueEntry } from "../../types/trainer";
import { DISCIPLINE_NAME_PT, EFFECT_LABEL_PT, SPELL_DESCRIPTION_PT, SPELL_NAME_PT } from "../../data/trainerTranslationsPt";
import type { Lang } from "../../i18n/languages";
import { translate, type TranslationKey } from "../../i18n/translate";

export interface SpellEffectRow {
	label: string;
	values: string[];
}

const EFFECT_KEYS = ["buffs", "debuffs", "damage", "heal"] as const;

/** Ranked spells carry an array (one value per rank); single-tier spells
 *  (see `isSingleTierSpell` in trainerEngine.ts) carry a bare string/number
 *  or a boolean flag instead — normalized here into a single-cell row so
 *  the rank-by-rank table still renders something sensible for them. */
function normalizeValues(value: string[] | string | boolean | number | number[] | undefined, lang: Lang): string[] {
	if (Array.isArray(value)) return value.map(String);
	if (typeof value === "boolean") return value ? [translate(lang, "trainer.yes")] : [];
	if (value == null) return [];
	return [String(value)];
}

/** CoRT's data ships English/Spanish/German natively (`{en,es,de}`); for
 *  `en`/`es` we read the field directly, falling back to `.en` if the game
 *  data happens to be missing that language for a given entry. Portuguese
 *  isn't in the upstream data at all, so it goes through the hand-built
 *  `trainerTranslationsPt.ts` dictionary instead, exactly as before. */
export function spellEffectRows(spell: Spell, lang: Lang): SpellEffectRow[] {
	const rows: SpellEffectRow[] = [];
	for (const key of EFFECT_KEYS) {
		const entries = spell[key] as SpellValueEntry[] | undefined;
		if (!Array.isArray(entries)) continue;
		for (const entry of entries) {
			const label = lang === "pt" ? (EFFECT_LABEL_PT[entry.en] ?? entry.en) : (entry[lang] ?? entry.en);
			const values = normalizeValues(entry.value, lang);
			if (values.length > 0) rows.push({ label, values });
		}
	}
	return rows;
}

export function spellScalarRows(spell: Spell, lang: Lang): SpellEffectRow[] {
	const rows: SpellEffectRow[] = [];
	const mana = normalizeValues(spell.mana, lang);
	if (mana.length > 0) rows.push({ label: translate(lang, "trainer.mana"), values: mana });
	const duration = normalizeValues(spell.duration, lang);
	if (duration.length > 0) rows.push({ label: translate(lang, "trainer.duration"), values: duration });
	return rows;
}

export function spellDescription(spell: Spell, lang: Lang): string {
	const en = spell.description?.en ?? "";
	if (lang === "pt") return SPELL_DESCRIPTION_PT[en] ?? en;
	return spell.description?.[lang] || en;
}

export function spellName(spell: Spell, lang: Lang): string {
	const en = spell.name?.en ?? "?";
	if (lang === "pt") return SPELL_NAME_PT[en] ?? en;
	return spell.name?.[lang] || en;
}

export function disciplineName(discipline: Discipline, lang: Lang): string {
	const en = discipline.display_name?.en ?? "?";
	if (lang === "pt") return DISCIPLINE_NAME_PT[en] ?? en;
	return discipline.display_name?.[lang] || en;
}

// `spell.type`/`spell.gcd` are plain string codes (not `{en,es,de}` objects
// like name/description) — a small closed set, so each language's label
// lives directly in the i18n dictionary instead of a separate PT-only file.
const SPELL_TYPE_KEY: Record<string, TranslationKey> = {
	Direct: "trainer.typeDirect",
	Constant: "trainer.typeConstant",
	Aura: "trainer.typeAura",
	Activable: "trainer.typeActivable",
	Passive: "trainer.typePassive",
};

const SPELL_GCD_KEY: Record<string, TranslationKey> = {
	"Very Short": "trainer.gcdVeryShort",
	Short: "trainer.gcdShort",
	Normal: "trainer.gcdNormal",
	Long: "trainer.gcdLong",
	"Very Long": "trainer.gcdVeryLong",
};

export function spellTypeLabel(type: string, lang: Lang): string {
	const key = SPELL_TYPE_KEY[type];
	return key ? translate(lang, key) : type;
}

export function spellGcdLabel(gcd: string, lang: Lang): string {
	const key = SPELL_GCD_KEY[gcd];
	return key ? translate(lang, key) : gcd;
}
