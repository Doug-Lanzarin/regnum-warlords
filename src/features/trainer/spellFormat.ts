import type { Spell, SpellValueEntry } from "../../types/trainer";

export interface SpellEffectRow {
	label: string;
	values: string[];
}

const EFFECT_KEYS = ["buffs", "debuffs", "damage", "heal"] as const;

export function spellEffectRows(spell: Spell, lang: string = "en"): SpellEffectRow[] {
	const rows: SpellEffectRow[] = [];
	for (const key of EFFECT_KEYS) {
		const entries = spell[key] as SpellValueEntry[] | undefined;
		if (!Array.isArray(entries)) continue;
		for (const entry of entries) {
			const record = entry as unknown as Record<string, string | string[] | undefined>;
			const label = (record[lang] as string | undefined) ?? entry.en ?? key;
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

export function spellDescription(spell: Spell, lang: string = "en"): string {
	return spell.description?.[lang] ?? spell.description?.en ?? "";
}

export function spellName(spell: Spell, lang: string = "en"): string {
	return spell.name?.[lang] ?? spell.name?.en ?? "?";
}
