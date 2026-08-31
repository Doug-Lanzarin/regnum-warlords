import { useState } from "react";
import { SPELL_GCD_PT, SPELL_TYPE_PT } from "../../data/trainerTranslationsPt";
import type { Spell } from "../../types/trainer";
import { spellDescription, spellEffectRows, spellName, spellScalarRows } from "./spellFormat";
import styles from "./SpellRow.module.css";

interface Props {
	spell: Spell;
	rank: number;
	maxRank: number;
	locked: boolean;
	onChange: (newRank: number) => void;
}

export function SpellRow({ spell, rank, maxRank, locked, onChange }: Props) {
	const [open, setOpen] = useState(false);
	const scalarRows = spellScalarRows(spell);
	const effectRows = spellEffectRows(spell);
	const activeCol = rank > 0 ? rank - 1 : 0;
	const maxed = maxRank > 0 && rank >= maxRank;

	return (
		<div
			className={`${styles.row} ${rank > 0 ? styles.rowActive : ""} ${locked ? styles.rowLocked : ""} ${maxed ? styles.rowMaxed : ""}`}
		>
			<button
				type="button"
				className={styles.infoBtn}
				aria-expanded={open}
				aria-label={`${open ? "Ocultar" : "Ver"} detalhes de ${spellName(spell)}`}
				onClick={() => setOpen((o) => !o)}
			>
				<span className={styles.chevron} aria-hidden data-open={open}>
					›
				</span>
				<span className={styles.spellName}>{spellName(spell)}</span>
				{maxed && <span className={styles.maxedTag}>máx</span>}
			</button>

			<div className={styles.controlLine}>
				<div className={styles.pips} aria-hidden>
					{Array.from({ length: Math.max(maxRank, 1) }).map((_, i) => (
						<span key={i} className={`${styles.pip} ${i < rank ? styles.pipFilled : ""}`} />
					))}
				</div>

				<div className={styles.stepper}>
					<button
						type="button"
						className={styles.stepBtn}
						disabled={locked || rank <= 0}
						onClick={() => onChange(rank - 1)}
						aria-label={`Diminuir rank de ${spellName(spell)}`}
					>
						−
					</button>
					<span className={styles.rankValue}>
						{rank}/{maxRank}
					</span>
					<button
						type="button"
						className={styles.stepBtn}
						disabled={locked || rank >= maxRank}
						onClick={() => onChange(rank + 1)}
						aria-label={`Aumentar rank de ${spellName(spell)}`}
					>
						+
					</button>
				</div>
			</div>

			{open && (
				<div className={styles.details}>
					<p className={styles.description}>{spellDescription(spell)}</p>
					<dl className={styles.metaGrid}>
						<div>
							<dt>Tipo</dt>
							<dd>{SPELL_TYPE_PT[spell.type] ?? spell.type}</dd>
						</div>
						<div>
							<dt>Invocação</dt>
							<dd>{spell.cast}s</dd>
						</div>
						<div>
							<dt>Recarga</dt>
							<dd>{spell.cooldown}s</dd>
						</div>
						<div>
							<dt>Recarga global</dt>
							<dd>{SPELL_GCD_PT[spell.gcd] ?? spell.gcd}</dd>
						</div>
						{typeof spell.range === "number" && spell.range > 0 && (
							<div>
								<dt>Alcance</dt>
								<dd>{spell.range}</dd>
							</div>
						)}
					</dl>

					{(scalarRows.length > 0 || effectRows.length > 0) && (
						<div className={styles.tableWrap}>
							<table className={styles.table}>
								<thead>
									<tr>
										<th></th>
										{Array.from({ length: maxRank || 1 }).map((_, i) => (
											<th key={i} className={i === activeCol && rank > 0 ? styles.activeCol : ""}>
												{i + 1}
											</th>
										))}
									</tr>
								</thead>
								<tbody>
									{[...scalarRows, ...effectRows].map((row) => (
										<tr key={row.label}>
											<th scope="row">{row.label}</th>
											{Array.from({ length: maxRank || 1 }).map((_, i) => (
												<td key={i} className={i === activeCol && rank > 0 ? styles.activeCol : ""}>
													{row.values[i] ?? "—"}
												</td>
											))}
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
