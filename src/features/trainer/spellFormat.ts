import type { Spell, SpellValueEntry } from "../../types/trainer";
import { EFFECT_LABEL_PT, SPELL_DESCRIPTION_PT, SPELL_NAME_PT } from "../../data/trainerTranslationsPt";

export interface SpellEffectRow {
	label: string;
	values: string[];
}

const EFFECT_KEYS = ["buffs", "debuffs", "damage", "heal"] as const;

/** Ranked spells carry an array (one value per rank); single-tier spells
 *  (see `isSingleTierSpell` in trainerEngine.ts) carry a bare string/number
 *  or a boolean flag instead — normalized here into a single-cell row so
 *  the rank-by-rank table still renders something sensible for them. */
function normalizeValues(value: string[] | string | boolean | number | number[] | undefined): string[] {
	if (Array.isArray(value)) return value.map(String);
	if (typeof value === "boolean") return value ? ["Sim"] : [];
	if (value == null) return [];
	return [String(value)];
}

export function spellEffectRows(spell: Spell): SpellEffectRow[] {
	const rows: SpellEffectRow[] = [];
	for (const key of EFFECT_KEYS) {
		const entries = spell[key] as SpellValueEntry[] | undefined;
		if (!Array.isArray(entries)) continue;
		for (const entry of entries) {
			const label = EFFECT_LABEL_PT[entry.en] ?? entry.en;
			const values = normalizeValues(entry.value);
			if (values.length > 0) rows.push({ label, values });
		}
	}
	return rows;
}

export function spellScalarRows(spell: Spell): SpellEffectRow[] {
	const rows: SpellEffectRow[] = [];
	const mana = normalizeValues(spell.mana);
	if (mana.length > 0) rows.push({ label: "Mana", values: mana });
	const duration = normalizeValues(spell.duration);
	if (duration.length > 0) rows.push({ label: "Duração (s)", values: duration });
	return rows;
}

export function spellDescription(spell: Spell): string {
	const en = spell.description?.en ?? "";
	return SPELL_DESCRIPTION_PT[en] ?? en;
}

export function spellName(spell: Spell): string {
	const en = spell.name?.en ?? "?";
	return SPELL_NAME_PT[en] ?? en;
}
