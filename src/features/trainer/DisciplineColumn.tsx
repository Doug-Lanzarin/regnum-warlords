import { disciplineIconUrl } from "../../api/trainerData";
import { MAX_CHAR_LEVEL, MAX_DISCIPLINE_LEVEL, MIN_DISCIPLINE_LEVEL } from "../../data/trainerConstants";
import { useLanguage } from "../../i18n/LanguageContext";
import { useT } from "../../i18n/useT";
import type { AdvancedClass, DisciplineState, TrainerData } from "../../types/trainer";
import { charLevelRequiredFor, isSingleTierSpell, isWarMasteryDiscipline, maxSpellRank } from "./trainerEngine";
import { disciplineName as formatDisciplineName, spellName } from "./spellFormat";
import { SkillIcon } from "./SkillIcon";
import { SpellRow } from "./SpellRow";
import styles from "./DisciplineColumn.module.css";

interface Props {
	trainerData: TrainerData;
	name: string;
	clas: AdvancedClass;
	state: DisciplineState;
	isFirstDiscipline: boolean;
	charLevel: number;
	version: string;
	dataSource: "live" | "bundled";
	filter: string;
	onDisciplineLevelChange: (newLevel: number) => void;
	onSpellRankChange: (spellIndex: number, newRank: number) => void;
}

export function DisciplineColumn({
	trainerData,
	name,
	clas,
	state,
	isFirstDiscipline,
	charLevel,
	version,
	dataSource,
	filter,
	onDisciplineLevelChange,
	onSpellRankChange,
}: Props) {
	const { lang } = useLanguage();
	const t = useT();
	const discipline = trainerData.disciplines[name];
	if (!discipline) return null;

	const disciplineName = formatDisciplineName(discipline, lang);
	const spriteUrl = disciplineIconUrl(version, dataSource, name);

	const isWarMastery = isWarMasteryDiscipline(trainerData, clas, name);
	const nextLevel = Math.min(state.level + 2, MAX_DISCIPLINE_LEVEL);
	const prevLevel = Math.max(state.level - 2, MIN_DISCIPLINE_LEVEL);
	const nextRequiredLevel = charLevelRequiredFor(trainerData, nextLevel);
	// War Mastery can't be trained at all until the character is at the
	// level cap — see `isWarMasteryDiscipline`'s doc comment.
	const blockedByWarMastery = isWarMastery && charLevel !== MAX_CHAR_LEVEL;
	const canRaise = state.level < MAX_DISCIPLINE_LEVEL && nextRequiredLevel <= charLevel && !blockedByWarMastery;
	const levelPct = (state.level / MAX_DISCIPLINE_LEVEL) * 100;
	// Excludes single-tier (War Mastery) spells — unlocking those doesn't
	// spend power points, so they shouldn't count as "invested" here either.
	const pointsInvested = discipline.spells.reduce((sum, spell, idx) => {
		if (isSingleTierSpell(spell)) return sum;
		return sum + (state.spellRanks[idx] ?? 0);
	}, 0);

	const normalizedFilter = filter.trim().toLowerCase();
	const disciplineMatches = !normalizedFilter || disciplineName.toLowerCase().includes(normalizedFilter);

	const visibleSpells = discipline.spells
		.map((spell, idx) => ({ spell, idx }))
		.filter(({ spell }) => !/^undefined\d*$/.test(spell.name.en))
		.filter(({ spell }) => disciplineMatches || spellName(spell, lang).toLowerCase().includes(normalizedFilter));

	if (normalizedFilter && visibleSpells.length === 0) return null;

	return (
		<section className={`card ${styles.column}`}>
			<header className={styles.header}>
				<SkillIcon spriteUrl={spriteUrl} frame={0} size={42} className={styles.icon} />
				<div className={styles.headerText}>
					<h3 className={styles.title}>{disciplineName}</h3>
					{pointsInvested > 0 && <span className={styles.investedBadge}>{t("trainer.pointsInvested", { n: pointsInvested })}</span>}
				</div>
			</header>

			<div className={styles.levelRow}>
				<div className={styles.levelStepper}>
					<button
						type="button"
						className={styles.stepBtn}
						disabled={state.level <= MIN_DISCIPLINE_LEVEL}
						onClick={() => onDisciplineLevelChange(prevLevel)}
						aria-label={t("trainer.decreaseLevel")}
					>
						−
					</button>
					<span className={styles.levelValue}>
						{t("trainer.levelWord")} <strong>{state.level}</strong>
					</span>
					<button
						type="button"
						className={styles.stepBtn}
						disabled={!canRaise}
						onClick={() => onDisciplineLevelChange(nextLevel)}
						aria-label={t("trainer.increaseLevel")}
					>
						+
					</button>
				</div>
				<div className={`progress-track ${styles.levelTrack}`}>
					<div className="progress-fill" style={{ width: `${levelPct}%` }} />
				</div>
				{!canRaise && state.level < MAX_DISCIPLINE_LEVEL && blockedByWarMastery && (
					<span className={styles.levelHint}>{t("trainer.errWarMasteryRequiresMaxLevel", { level: MAX_CHAR_LEVEL })}</span>
				)}
				{!canRaise && state.level < MAX_DISCIPLINE_LEVEL && !blockedByWarMastery && (
					<span className={styles.levelHint}>{t("trainer.levelHint", { level: nextRequiredLevel })}</span>
				)}
			</div>

			<div className={styles.spells}>
				{visibleSpells.map(({ spell, idx }) => {
					const cap = maxSpellRank(trainerData, state.level, isFirstDiscipline && idx === 0, spell);
					return (
						<SpellRow
							key={spell.name.en + idx}
							spell={spell}
							rank={state.spellRanks[idx] ?? 0}
							maxRank={cap}
							locked={cap <= 0}
							spriteUrl={spriteUrl}
							spellIndex={idx}
							onChange={(newRank) => onSpellRankChange(idx, newRank)}
						/>
					);
				})}
			</div>
		</section>
	);
}
