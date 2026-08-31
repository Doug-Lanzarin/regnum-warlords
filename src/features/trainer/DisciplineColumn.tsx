import { disciplineIconUrl } from "../../api/trainerData";
import { MAX_DISCIPLINE_LEVEL, MIN_DISCIPLINE_LEVEL } from "../../data/trainerConstants";
import { DISCIPLINE_NAME_PT } from "../../data/trainerTranslationsPt";
import type { DisciplineState, TrainerData } from "../../types/trainer";
import { charLevelRequiredFor, maxSpellRank } from "./trainerEngine";
import { spellName } from "./spellFormat";
import { SpellRow } from "./SpellRow";
import styles from "./DisciplineColumn.module.css";

interface Props {
	trainerData: TrainerData;
	name: string;
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
	state,
	isFirstDiscipline,
	charLevel,
	version,
	dataSource,
	filter,
	onDisciplineLevelChange,
	onSpellRankChange,
}: Props) {
	const discipline = trainerData.disciplines[name];
	if (!discipline) return null;

	const disciplineName = DISCIPLINE_NAME_PT[discipline.display_name.en] ?? discipline.display_name.en;

	const nextLevel = Math.min(state.level + 2, MAX_DISCIPLINE_LEVEL);
	const prevLevel = Math.max(state.level - 2, MIN_DISCIPLINE_LEVEL);
	const nextRequiredLevel = charLevelRequiredFor(trainerData, nextLevel);
	const canRaise = state.level < MAX_DISCIPLINE_LEVEL && nextRequiredLevel <= charLevel;
	const levelPct = (state.level / MAX_DISCIPLINE_LEVEL) * 100;
	const pointsInvested = state.spellRanks.reduce((a, b) => a + b, 0);

	const normalizedFilter = filter.trim().toLowerCase();
	const disciplineMatches = !normalizedFilter || disciplineName.toLowerCase().includes(normalizedFilter);

	const visibleSpells = discipline.spells
		.map((spell, idx) => ({ spell, idx }))
		.filter(({ spell }) => !/^undefined\d*$/.test(spell.name.en))
		.filter(({ spell }) => disciplineMatches || spellName(spell).toLowerCase().includes(normalizedFilter));

	if (normalizedFilter && visibleSpells.length === 0) return null;

	return (
		<section className={`card ${styles.column}`}>
			<header className={styles.header}>
				<img
					src={disciplineIconUrl(version, dataSource, name)}
					alt=""
					className={styles.icon}
					loading="lazy"
					onError={(e) => {
						(e.currentTarget as HTMLImageElement).style.visibility = "hidden";
					}}
				/>
				<div className={styles.headerText}>
					<h3 className={styles.title}>{disciplineName}</h3>
					{pointsInvested > 0 && (
						<span className={styles.investedBadge}>{pointsInvested} pts investidos</span>
					)}
				</div>
			</header>

			<div className={styles.levelRow}>
				<div className={styles.levelStepper}>
					<button
						type="button"
						className={styles.stepBtn}
						disabled={state.level <= MIN_DISCIPLINE_LEVEL}
						onClick={() => onDisciplineLevelChange(prevLevel)}
						aria-label="Diminuir nível da disciplina"
					>
						−
					</button>
					<span className={styles.levelValue}>
						Nível <strong>{state.level}</strong>
					</span>
					<button
						type="button"
						className={styles.stepBtn}
						disabled={!canRaise}
						onClick={() => onDisciplineLevelChange(nextLevel)}
						aria-label="Aumentar nível da disciplina"
					>
						+
					</button>
				</div>
				<div className={`progress-track ${styles.levelTrack}`}>
					<div className="progress-fill" style={{ width: `${levelPct}%` }} />
				</div>
				{!canRaise && state.level < MAX_DISCIPLINE_LEVEL && (
					<span className={styles.levelHint}>Sobe no nível de personagem {nextRequiredLevel}</span>
				)}
			</div>

			<div className={styles.spells}>
				{visibleSpells.map(({ spell, idx }) => {
					const cap = maxSpellRank(trainerData, state.level, isFirstDiscipline && idx === 0);
					return (
						<SpellRow
							key={spell.name.en + idx}
							spell={spell}
							rank={state.spellRanks[idx] ?? 0}
							maxRank={cap}
							locked={cap <= 0}
							onChange={(newRank) => onSpellRankChange(idx, newRank)}
						/>
					);
				})}
			</div>
		</section>
	);
}
