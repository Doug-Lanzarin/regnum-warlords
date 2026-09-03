import { DAMAGE_TYPES } from "../../data/armorConstants";
import type { ArmorBuild, ArmorPieceId, DamageType, QualityTier } from "../../types/armor";
import { decodeUrlSafeBase64ToJson, encodeJsonToUrlSafeBase64 } from "../../utils/urlSafeBase64";

// [pieceId, pba, bcmt, qualityByType] — qualityByType follows DAMAGE_TYPES' order.
type EncodedPiece = [string, number, number, QualityTier[]];

interface EncodedArmorBuild {
	c: string; // class
	p: EncodedPiece[];
	ab: number; // armorBonusPct
	rp: number; // resistancePhysicalPct
	rm: number; // resistanceMagicPct
	rt: number[]; // resistanceByType, DAMAGE_TYPES order
	dr: number; // damageReductionPct
}

export function encodeArmorBuild(build: ArmorBuild): string {
	const payload: EncodedArmorBuild = {
		c: build.clas,
		p: Object.entries(build.pieces)
			.filter((entry): entry is [string, NonNullable<(typeof entry)[1]>] => entry[1] != null)
			.map(([id, state]) => [id, state.pba, state.bcmt, DAMAGE_TYPES.map((t) => state.quality[t])]),
		ab: build.armorBonusPct,
		rp: build.resistancePhysicalPct,
		rm: build.resistanceMagicPct,
		rt: DAMAGE_TYPES.map((t) => build.resistanceByType[t]),
		dr: build.damageReductionPct,
	};
	return encodeJsonToUrlSafeBase64(payload);
}

export function decodeArmorBuild(encoded: string): ArmorBuild | null {
	const payload = decodeUrlSafeBase64ToJson<EncodedArmorBuild>(encoded);
	if (!payload) return null;
	try {
		const pieces: ArmorBuild["pieces"] = {};
		for (const [id, pba, bcmt, qualityByType] of payload.p) {
			const quality = {} as Record<DamageType, QualityTier>;
			DAMAGE_TYPES.forEach((t, idx) => (quality[t] = qualityByType[idx]));
			pieces[id as ArmorPieceId] = { pba, bcmt, quality };
		}
		const resistanceByType = {} as Record<DamageType, number>;
		DAMAGE_TYPES.forEach((t, idx) => (resistanceByType[t] = payload.rt[idx] ?? 0));
		return {
			clas: payload.c as ArmorBuild["clas"],
			pieces,
			armorBonusPct: payload.ab,
			resistancePhysicalPct: payload.rp,
			resistanceMagicPct: payload.rm,
			resistanceByType,
			damageReductionPct: payload.dr,
		};
	} catch {
		return null;
	}
}

const STORAGE_KEY = "regnum-warlords:last-armor-build";

export function saveArmorBuildToLocalStorage(build: ArmorBuild) {
	try {
		localStorage.setItem(STORAGE_KEY, encodeArmorBuild(build));
	} catch {
		// storage unavailable — ignore
	}
}

export function loadArmorBuildFromLocalStorage(): ArmorBuild | null {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		return stored ? decodeArmorBuild(stored) : null;
	} catch {
		return null;
	}
}
