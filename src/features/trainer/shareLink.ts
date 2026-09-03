import type { TrainerBuild } from "../../types/trainer";
import { decodeUrlSafeBase64ToJson, encodeJsonToUrlSafeBase64 } from "../../utils/urlSafeBase64";

interface EncodedBuild {
	v: string; // dataset version
	c: string; // class
	l: number; // level
	n: boolean; // necro gem
	d: [string, number, number[]][]; // [disciplineName, level, spellRanks]
}

export function encodeBuild(build: TrainerBuild): string {
	const payload: EncodedBuild = {
		v: build.datasetVersion,
		c: build.clas ?? "",
		l: build.level,
		n: build.necroGem,
		d: Object.entries(build.disciplines).map(([name, s]) => [name, s.level, s.spellRanks]),
	};
	return encodeJsonToUrlSafeBase64(payload);
}

export function decodeBuild(encoded: string): TrainerBuild | null {
	const payload = decodeUrlSafeBase64ToJson<EncodedBuild>(encoded);
	if (!payload) return null;
	try {
		const disciplines: TrainerBuild["disciplines"] = {};
		for (const [name, level, spellRanks] of payload.d) {
			disciplines[name] = { level, spellRanks };
		}
		return {
			datasetVersion: payload.v,
			clas: (payload.c || null) as TrainerBuild["clas"],
			level: payload.l,
			necroGem: payload.n,
			disciplines,
		};
	} catch {
		return null;
	}
}

const STORAGE_KEY = "regnum-warlords:last-build";

export function saveBuildToLocalStorage(build: TrainerBuild) {
	try {
		localStorage.setItem(STORAGE_KEY, encodeBuild(build));
	} catch {
		// storage unavailable — ignore
	}
}

export function loadBuildFromLocalStorage(): TrainerBuild | null {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		return stored ? decodeBuild(stored) : null;
	} catch {
		return null;
	}
}
