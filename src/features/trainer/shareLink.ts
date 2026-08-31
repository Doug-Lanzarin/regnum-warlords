import type { TrainerBuild } from "../../types/trainer";

// Compact, URL-safe encoding of a build for sharing/saving. Not
// byte-compatible with CoRT's own link format (that one is tied to its
// legacy lz-string compression) — this is a fresh, simpler scheme for
// Regnum Warlords.
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
	const json = JSON.stringify(payload);
	return btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16))));
}

export function decodeBuild(encoded: string): TrainerBuild | null {
	try {
		const json = decodeURIComponent(
			atob(encoded)
				.split("")
				.map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
				.join(""),
		);
		const payload = JSON.parse(json) as EncodedBuild;
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
