/** The Battle Zone's weekly open/close schedule — a fixed, recurring set of
 *  UTC-hour windows baked directly into the game's own event calendar (not
 *  something that changes without a game update). Index 0 is Sunday, index
 *  6 is Saturday (JS `Date.getUTCDay()` convention) — `schbegin[d][i]`/
 *  `schend[d][i]` are the begin/end UTC hour (0-23) of the i-th window on
 *  UTC weekday `d`.
 *
 *  Sourced from CoRT's own bz.js bundle (`cort.ovh/js/chunks/defer_libs-*.js`,
 *  the `bz_schedule` static class field), which hardcodes the exact same
 *  values — CoRT has no live endpoint for this, it's just as much a
 *  constant there as it is here. If the game ever changes BZ's actual
 *  hours, this needs updating the same way CoRT's own bundle would. */
export const BZ_SCHEDULE_UTC: { schbegin: number[][]; schend: number[][] } = {
	schbegin: [
		[13, 18],
		[3, 13, 20],
		[13, 18],
		[13, 20],
		[3, 13, 18],
		[13, 20],
		[3, 13, 20],
	],
	schend: [
		[16, 21],
		[6, 16, 23],
		[16, 21],
		[16, 23],
		[6, 16, 21],
		[17, 23],
		[6, 16, 23],
	],
};
