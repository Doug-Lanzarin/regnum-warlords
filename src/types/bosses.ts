/** The 4 entries tracked by CoRT's live bosses endpoint. "server" is the
 *  weekly server reboot, bundled into the same feed even though it isn't a
 *  boss — CoRT's own UI lists it alongside the real bosses too. */
export type BossKey = "evendim" | "daen" | "thorkul" | "server";

/** Raw shape of https://cort.ovh/api/bin/bosses/bosses.php.
 *  All timestamps are Unix seconds (UTC). Each `next_spawns` entry is the
 *  next 4 scheduled windows for that boss, soonest first. */
export interface BossSpawnData {
	prev_spawns: Record<BossKey, number>;
	next_spawns: Record<BossKey, number[]>;
	next_boss: BossKey;
	next_boss_ts: number;
}
