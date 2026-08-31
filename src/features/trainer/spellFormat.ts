import type { Spell, SpellValueEntry } from "../../types/trainer";
import { EFFECT_LABEL_PT, SPELL_DESCRIPTION_PT, SPELL_NAME_PT } from "../../data/trainerTranslationsPt";

export interface SpellEffectRow {
	label: string;
	values: string[];
}

const EFFECT_KEYS = ["buffs", "debuffs", "damage", "heal"] as const;

export function spellEffectRows(spell: Spell): SpellEffectRow[] {
	const rows: SpellEffectRow[] = [];
	for (const key of EFFECT_KEYS) {
		const entries = spell[key] as SpellValueEntry[] | undefined;
		if (!Array.isArray(entries)) continue;
		for (const entry of entries) {
			const label = EFFECT_LABEL_PT[entry.en] ?? entry.en;
			rows.push({ label, values: entry.value ?? [] });
		}
	}
	return rows;
}

export function spellScalarRows(spell: Spell): SpellEffectRow[] {
	const rows: SpellEffectRow[] = [];
	if (Array.isArray(spell.mana)) rows.push({ label: "Mana", values: spell.mana.map(String) });
	if (Array.isArray(spell.duration)) rows.push({ label: "Duração (s)", values: spell.duration.map(String) });
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
