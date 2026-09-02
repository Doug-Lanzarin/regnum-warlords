import { registerSW } from "virtual:pwa-register";

/** How often an already-open tab/installed app re-checks for a new SW.
 *  The browser only checks for updates on its own on a fresh navigation —
 *  an installed PWA that's just brought back to the foreground (not
 *  relaunched) can sit on an old version indefinitely without this. */
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

/** `registerType: "autoUpdate"` (vite.config.ts) means: no user-facing
 *  "update available" prompt — as soon as a new SW is found, activate it
 *  and reload automatically. `registerSW` itself only wires up *that* part;
 *  actually noticing a new SW exists in an app that's just sitting open
 *  still needs the periodic `registration.update()` calls below (a
 *  documented vite-plugin-pwa recipe, not something it does by itself). */
registerSW({
	immediate: true,
	onRegisteredSW(_swUrl, registration) {
		if (!registration) return;
		setInterval(() => {
			registration.update().catch(() => {
				// offline / cort.ovh-style network block — try again next interval
			});
		}, UPDATE_CHECK_INTERVAL_MS);
	},
});
