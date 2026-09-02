import { useEffect, useMemo, useRef, useState } from "react";
import { useTrainerBuild } from "../features/trainer/useTrainerBuild";
import { BuildHeader } from "../features/trainer/BuildHeader";
import { StatsBar } from "../features/trainer/StatsBar";
import { SpellSearch } from "../features/trainer/SpellSearch";
import { DisciplineColumn } from "../features/trainer/DisciplineColumn";
import { decodeBuild } from "../features/trainer/shareLink";
import { getTreeGroups, isFirstDiscipline } from "../features/trainer/trainerEngine";
import { CLASS_LABELS } from "../data/trainerConstants";
import { useT } from "../i18n/useT";
import styles from "./TrainerPage.module.css";

export function TrainerPage() {
	const t = useT();
	const {
		trainerData,
		dataSource,
		loading,
		error,
		build,
		totals,
		lastActionError,
		setClass,
		setLevel,
		setDisciplineLevel,
		setSpellRank,
		reset,
		loadBuild,
	} = useTrainerBuild();

	const [filter, setFilter] = useState("");
	const urlLoaded = useRef(false);

	useEffect(() => {
		if (urlLoaded.current) return;
		const params = new URLSearchParams(window.location.search);
		const encoded = params.get("build");
		if (encoded) {
			const decoded = decodeBuild(encoded);
			if (decoded) loadBuild(decoded);
		}
		urlLoaded.current = true;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const groups = useMemo(() => {
		if (!trainerData || !build?.clas) return { general: [], specialization: [] };
		return getTreeGroups(trainerData, build.clas);
	}, [trainerData, build?.clas]);

	if (loading && !trainerData) {
		return (
			<div className={`card ${styles.centerMessage}`}>
				<span className={styles.spinner} aria-hidden />
				{t("trainer.loading")}
			</div>
		);
	}

	if (error || !trainerData) {
		return (
			<div className={`card ${styles.centerMessage}`}>
				<p>{t("trainer.loadError")}</p>
				<p style={{ color: "var(--faded)" }}>{error}</p>
			</div>
		);
	}

	if (!build || !build.clas) return null;

	function handleVersionChange(version: string) {
		if (!build) return;
		loadBuild({ ...build, datasetVersion: version });
	}

	function renderGroup(title: string, names: string[]) {
		if (names.length === 0) return null;
		return (
			<section className={styles.section}>
				<div className={styles.sectionHeading}>
					<h2>{title}</h2>
					<span className={styles.sectionCount}>{t("trainer.disciplinesCount", { count: names.length })}</span>
				</div>
				<div className={styles.grid}>
					{names.map((name) => (
						<DisciplineColumn
							key={name}
							trainerData={trainerData!}
							name={name}
							state={build!.disciplines[name]}
							isFirstDiscipline={isFirstDiscipline(trainerData!, build!.clas, name)}
							charLevel={build!.level}
							version={build!.datasetVersion}
							dataSource={dataSource ?? "bundled"}
							filter={filter}
							onDisciplineLevelChange={(lvl) => setDisciplineLevel(name, lvl)}
							onSpellRankChange={(idx, rank) => setSpellRank(name, idx, rank)}
						/>
					))}
				</div>
			</section>
		);
	}

	return (
		<div className={styles.wrap}>
			<BuildHeader build={build} onClassChange={setClass} onLevelChange={setLevel} onVersionChange={handleVersionChange} />

			<StatsBar build={build} totals={totals} dataSource={dataSource} onReset={reset} />

			{lastActionError && <div className={styles.actionError} role="alert">{lastActionError}</div>}

			<div className={styles.searchRow}>
				<SpellSearch value={filter} onChange={setFilter} />
				<span className={styles.classLabel}>
					{t("trainer.buildOf", { class: CLASS_LABELS[build.clas], level: build.level })}
					{build.necroGem ? t("trainer.necroCrystalSuffix") : ""}
				</span>
			</div>

			{renderGroup(t("trainer.generalSkills"), groups.general)}
			{renderGroup(t("trainer.specialization", { class: CLASS_LABELS[build.clas] }), groups.specialization)}
		</div>
	);
}
