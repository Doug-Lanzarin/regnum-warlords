import { useCallback, useEffect, useMemo, useState } from "react";
import { loadTrainerData } from "../../api/trainerData";
import { DEFAULT_DATASET_VERSION, MAX_CHAR_LEVEL } from "../../data/trainerConstants";
import { useLanguage } from "../../i18n/LanguageContext";
import { useT } from "../../i18n/useT";
import type { AdvancedClass, TrainerBuild, TrainerData } from "../../types/trainer";
import {
	canSetDisciplineLevel,
	canSetSpellRank,
	clampBuildToLevel,
	computeTotalsForBuild,
	createEmptyBuild,
	getTreeNames,
} from "./trainerEngine";
import { loadBuildFromLocalStorage, saveBuildToLocalStorage } from "./shareLink";

export interface UseTrainerBuildResult {
	trainerData: TrainerData | null;
	dataSource: "live" | "bundled" | null;
	loading: boolean;
	error: string | null;
	build: TrainerBuild | null;
	treeNames: string[];
	totals: ReturnType<typeof computeTotalsForBuild>;
	lastActionError: string | null;
	setClass: (clas: AdvancedClass) => void;
	setLevel: (level: number, necroGem?: boolean) => void;
	setDisciplineLevel: (disciplineName: string, newLevel: number) => void;
	setSpellRank: (disciplineName: string, spellIndex: number, newRank: number) => void;
	reset: () => void;
	loadBuild: (build: TrainerBuild) => void;
}

export function useTrainerBuild(initialVersion: string = DEFAULT_DATASET_VERSION): UseTrainerBuildResult {
	const { lang } = useLanguage();
	const t = useT();
	const [version, setVersion] = useState(initialVersion);
	const [trainerData, setTrainerData] = useState<TrainerData | null>(null);
	const [dataSource, setDataSource] = useState<"live" | "bundled" | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [build, setBuild] = useState<TrainerBuild | null>(null);
	const [lastActionError, setLastActionError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		setLoading(true);
		setError(null);
		loadTrainerData(version, lang)
			.then(({ data, source }) => {
				if (cancelled) return;
				setTrainerData(data);
				setDataSource(source);
				setBuild((prev) => {
					if (prev) return prev;
					const restored = loadBuildFromLocalStorage();
					// Re-clamp on load too, not just on a live level change — a
					// build saved before a rule tightened (e.g. a discipline
					// level's available-skill-slot cap) could otherwise come
					// back with a spell rank above what's now allowed.
					if (restored && restored.clas) return clampBuildToLevel(data, restored);
					return createEmptyBuild(data, "knight", 60, false, version);
				});
			})
			.catch((err: Error) => {
				if (!cancelled) setError(err.message);
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [version]);

	useEffect(() => {
		if (build) saveBuildToLocalStorage(build);
	}, [build]);

	const treeNames = useMemo(() => {
		if (!trainerData || !build?.clas) return [];
		return getTreeNames(trainerData, build.clas);
	}, [trainerData, build?.clas]);

	const totals = useMemo(() => {
		if (!trainerData || !build) {
			return { dpointsTotal: 0, dpointsSpent: 0, dpointsLeft: 0, ppointsTotal: 0, ppointsSpent: 0, ppointsLeft: 0 };
		}
		return computeTotalsForBuild(trainerData, build);
	}, [trainerData, build]);

	const setClass = useCallback(
		(clas: AdvancedClass) => {
			if (!trainerData) return;
			setBuild((prev) => createEmptyBuild(trainerData, clas, prev?.level ?? MAX_CHAR_LEVEL, prev?.necroGem ?? false, version));
			setLastActionError(null);
		},
		[trainerData, version],
	);

	const setLevel = useCallback(
		(level: number, necroGem = false) => {
			if (!trainerData) return;
			setBuild((prev) => {
				if (!prev) return prev;
				const next = clampBuildToLevel(trainerData, { ...prev, level, necroGem });
				return next;
			});
			setLastActionError(null);
		},
		[trainerData],
	);

	const setDisciplineLevel = useCallback(
		(disciplineName: string, newLevel: number) => {
			if (!trainerData) return;
			setBuild((prev) => {
				if (!prev) return prev;
				const check = canSetDisciplineLevel(trainerData, prev, disciplineName, newLevel, lang);
				if (!check.ok) {
					setLastActionError(check.reason ?? t("trainer.errInvalidAction"));
					return prev;
				}
				setLastActionError(null);
				const state = prev.disciplines[disciplineName];
				return {
					...prev,
					disciplines: { ...prev.disciplines, [disciplineName]: { ...state, level: newLevel } },
				};
			});
		},
		[trainerData, lang, t],
	);

	const setSpellRank = useCallback(
		(disciplineName: string, spellIndex: number, newRank: number) => {
			if (!trainerData) return;
			setBuild((prev) => {
				if (!prev) return prev;
				const check = canSetSpellRank(trainerData, prev, disciplineName, spellIndex, newRank, lang);
				if (!check.ok) {
					setLastActionError(check.reason ?? t("trainer.errInvalidAction"));
					return prev;
				}
				setLastActionError(null);
				const state = prev.disciplines[disciplineName];
				const spellRanks = state.spellRanks.slice();
				spellRanks[spellIndex] = newRank;
				return { ...prev, disciplines: { ...prev.disciplines, [disciplineName]: { ...state, spellRanks } } };
			});
		},
		[trainerData, lang, t],
	);

	const reset = useCallback(() => {
		if (!trainerData || !build?.clas) return;
		setBuild(createEmptyBuild(trainerData, build.clas, build.level, build.necroGem, version));
		setLastActionError(null);
	}, [trainerData, build, version]);

	const loadBuild = useCallback(
		(newBuild: TrainerBuild) => {
			setVersion(newBuild.datasetVersion);
			setBuild(newBuild);
			setLastActionError(null);
		},
		[],
	);

	return {
		trainerData,
		dataSource,
		loading,
		error,
		build,
		treeNames,
		totals,
		lastActionError,
		setClass,
		setLevel,
		setDisciplineLevel,
		setSpellRank,
		reset,
		loadBuild,
	};
}
