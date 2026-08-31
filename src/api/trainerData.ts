import type { TrainerData } from "../types/trainer";

const LIVE_BASE = "https://cort.ovh/data/trainer";
const LOCAL_BASE = "/data/trainer";

const cache = new Map<string, { data: TrainerData; source: "live" | "bundled" }>();

/**
 * Loads trainer reference data (skill trees, costs, spell text) for a given
 * dataset version. This is static game-balance data that changes only on
 * game patches, so we try the live CoRT copy first (in case a patch shipped
 * more recently than our bundle) and silently fall back to the copy bundled
 * in /public/data when the network is unavailable or blocked (common on
 * locked-down corporate networks).
 */
export async function loadTrainerData(version: string): Promise<{ data: TrainerData; source: "live" | "bundled" }> {
	const cached = cache.get(version);
	if (cached) return cached;

	try {
		const res = await fetch(`${LIVE_BASE}/${version}/trainerdata.json`, {
			signal: AbortSignal.timeout(4000),
		});
		if (res.ok) {
			const data = (await res.json()) as TrainerData;
			const result = { data, source: "live" as const };
			cache.set(version, result);
			return result;
		}
	} catch {
		// network blocked / offline / CORS — fall through to bundled copy
	}

	const res = await fetch(`${LOCAL_BASE}/${version}/trainerdata.json`);
	if (!res.ok) throw new Error(`Não foi possível carregar os dados do trainer (versão ${version}).`);
	const data = (await res.json()) as TrainerData;
	const result = { data, source: "bundled" as const };
	cache.set(version, result);
	return result;
}

export function disciplineIconUrl(version: string, source: "live" | "bundled", disciplineName: string): string {
	const base = source === "live" ? LIVE_BASE : LOCAL_BASE;
	return `${base}/${version}/icons/${disciplineName.replace(/ /g, "")}.webp`;
}
