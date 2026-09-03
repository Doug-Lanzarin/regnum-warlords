import { useState } from "react";
import { useLanguage } from "../../i18n/LanguageContext";
import { useT } from "../../i18n/useT";
import type { Spell } from "../../types/trainer";
import { isSingleTierSpell } from "./trainerEngine";
import { spellDescription, spellEffectRows, spellGcdLabel, spellName, spellScalarRows, spellTypeLabel } from "./spellFormat";
import { SkillIcon } from "./SkillIcon";
import styles from "./SpellRow.module.css";

interface Props {
	spell: Spell;
	rank: number;
	maxRank: number;
	locked: boolean;
	/** Discipline icon sprite sheet this spell's icon is cut from. */
	spriteUrl: string;
	/** This spell's frame in the sprite (its index in `discipline.spells`, 0-based). */
	spellIndex: number;
	onChange: (newRank: number) => void;
}

export function SpellRow({ spell, rank, maxRank, locked, spriteUrl, spellIndex, onChange }: Props) {
	const { lang } = useLanguage();
	const t = useT();
	const [open, setOpen] = useState(false);
	const name = spellName(spell, lang);
	const scalarRows = spellScalarRows(spell, lang);
	const effectRows = spellEffectRows(spell, lang);
	const activeCol = rank > 0 ? rank - 1 : 0;
	const singleTier = isSingleTierSpell(spell);
	// "Maxed" doesn't mean anything extra for a War Mastery skill — it's
	// either granted or not, there's no further rank to chase — so the tag
	// would just be a confusing duplicate of the free/granted state.
	const maxed = !singleTier && maxRank > 0 && rank >= maxRank;

	return (
		<div
			className={`${styles.row} ${rank > 0 ? styles.rowActive : ""} ${locked ? styles.rowLocked : ""} ${maxed ? styles.rowMaxed : ""}`}
		>
			<button
				type="button"
				className={styles.infoBtn}
				aria-expanded={open}
				aria-label={t("trainer.spellDetailsAriaLabel", { action: open ? t("trainer.hide") : t("trainer.view"), spell: name })}
				onClick={() => setOpen((o) => !o)}
			>
				<SkillIcon spriteUrl={spriteUrl} frame={spellIndex + 1} size={22} className={styles.icon} dim={rank === 0} />
				<span className={styles.chevron} aria-hidden data-open={open}>
					›
				</span>
				<span className={styles.spellName}>{name}</span>
				{singleTier && (
					<span className={styles.freeTag} title={t("trainer.freeTooltip")}>
						{t("trainer.free")}
					</span>
				)}
				{maxed && <span className={styles.maxedTag}>{t("trainer.maxed")}</span>}
			</button>

			{/* War Mastery skills have nothing to step through — they're
			    granted automatically, not chosen/ranked (see the `rank`
			    derivation in DisciplineColumn.tsx). */}
			{!singleTier && (
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
							aria-label={t("trainer.decreaseRank", { spell: name })}
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
							aria-label={t("trainer.increaseRank", { spell: name })}
						>
							+
						</button>
					</div>
				</div>
			)}

			{open && (
				<div className={styles.details}>
					<p className={styles.description}>{spellDescription(spell, lang)}</p>
					<dl className={styles.metaGrid}>
						<div>
							<dt>{t("trainer.type")}</dt>
							<dd>{spellTypeLabel(spell.type, lang)}</dd>
						</div>
						<div>
							<dt>{t("trainer.cast")}</dt>
							<dd>{spell.cast}s</dd>
						</div>
						<div>
							<dt>{t("trainer.cooldown")}</dt>
							<dd>{spell.cooldown}s</dd>
						</div>
						<div>
							<dt>{t("trainer.globalCooldown")}</dt>
							<dd>{spellGcdLabel(spell.gcd, lang)}</dd>
						</div>
						{typeof spell.range === "number" && spell.range > 0 && (
							<div>
								<dt>{t("trainer.range")}</dt>
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
