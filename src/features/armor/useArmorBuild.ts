import { useCallback, useEffect, useState } from "react";
import type { AdvancedClass } from "../../types/trainer";
import type { ArmorBuild, ArmorPieceId, DamageType } from "../../types/armor";
import { createEmptyArmorBuild, nextQualityTier } from "./armorEngine";
import { decodeArmorBuild, loadArmorBuildFromLocalStorage, saveArmorBuildToLocalStorage } from "./armorShareLink";

const DEFAULT_CLASS: AdvancedClass = "knight";

function initialBuild(): ArmorBuild {
	const params = new URLSearchParams(window.location.search);
	const encoded = params.get("armor");
	if (encoded) {
		const decoded = decodeArmorBuild(encoded);
		if (decoded) return decoded;
	}
	return loadArmorBuildFromLocalStorage() ?? createEmptyArmorBuild(DEFAULT_CLASS);
}

export interface UseArmorBuildResult {
	build: ArmorBuild;
	setClass: (clas: AdvancedClass) => void;
	setPieceField: (pieceId: ArmorPieceId, field: "pba" | "bcmt", value: number) => void;
	cycleQuality: (pieceId: ArmorPieceId, type: DamageType) => void;
	setArmorBonusPct: (value: number) => void;
	setResistancePhysicalPct: (value: number) => void;
	setResistanceMagicPct: (value: number) => void;
	setResistanceByType: (type: DamageType, value: number) => void;
	setDamageReductionPct: (value: number) => void;
	reset: () => void;
	loadBuild: (build: ArmorBuild) => void;
}

export function useArmorBuild(): UseArmorBuildResult {
	const [build, setBuild] = useState<ArmorBuild>(initialBuild);

	useEffect(() => {
		saveArmorBuildToLocalStorage(build);
	}, [build]);

	const setClass = useCallback((clas: AdvancedClass) => {
		setBuild(createEmptyArmorBuild(clas));
	}, []);

	const setPieceField = useCallback((pieceId: ArmorPieceId, field: "pba" | "bcmt", value: number) => {
		setBuild((prev) => {
			const piece = prev.pieces[pieceId];
			if (!piece) return prev;
			return { ...prev, pieces: { ...prev.pieces, [pieceId]: { ...piece, [field]: value } } };
		});
	}, []);

	const cycleQuality = useCallback((pieceId: ArmorPieceId, type: DamageType) => {
		setBuild((prev) => {
			const piece = prev.pieces[pieceId];
			if (!piece) return prev;
			const quality = { ...piece.quality, [type]: nextQualityTier(piece.quality[type]) };
			return { ...prev, pieces: { ...prev.pieces, [pieceId]: { ...piece, quality } } };
		});
	}, []);

	const setArmorBonusPct = useCallback((value: number) => setBuild((prev) => ({ ...prev, armorBonusPct: value })), []);
	const setResistancePhysicalPct = useCallback((value: number) => setBuild((prev) => ({ ...prev, resistancePhysicalPct: value })), []);
	const setResistanceMagicPct = useCallback((value: number) => setBuild((prev) => ({ ...prev, resistanceMagicPct: value })), []);
	const setResistanceByType = useCallback(
		(type: DamageType, value: number) => setBuild((prev) => ({ ...prev, resistanceByType: { ...prev.resistanceByType, [type]: value } })),
		[],
	);
	const setDamageReductionPct = useCallback((value: number) => setBuild((prev) => ({ ...prev, damageReductionPct: value })), []);

	const reset = useCallback(() => setBuild((prev) => createEmptyArmorBuild(prev.clas)), []);

	const loadBuild = useCallback((newBuild: ArmorBuild) => setBuild(newBuild), []);

	return {
		build,
		setClass,
		setPieceField,
		cycleQuality,
		setArmorBonusPct,
		setResistancePhysicalPct,
		setResistanceMagicPct,
		setResistanceByType,
		setDamageReductionPct,
		reset,
		loadBuild,
	};
}
