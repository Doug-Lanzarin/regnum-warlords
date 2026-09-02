import { registerSW } from "virtual:pwa-register";

/** Fallback for a tab/installed app that stays in the foreground for a long
 *  stretch without ever backgrounding — the visibility-based check below
 *  covers the far more common case (reopening/refocusing the app). */
const UPDATE_CHECK_INTERVAL_MS = 15 * 60 * 1000;

/** `registerType: "autoUpdate"` (vite.config.ts) means: no user-facing
 *  "update available" prompt — as soon as a new SW is found, activate it
 *  and reload automatically. `registerSW` itself only wires up *that* part;
 *  actually noticing a new SW exists in an app that's just sitting open
 *  still needs explicit `registration.update()` calls (a documented
 *  vite-plugin-pwa recipe, not something it does by itself) — the browser
 *  only checks on its own on a fresh navigation, which an already-open tab
 *  or a reopened *installed* PWA (brought back to the foreground, not
 *  relaunched) never does. */
registerSW({
	immediate: true,
	onRegisteredSW(_swUrl, registration) {
		if (!registration) return;

		const check = () => {
			registration.update().catch(() => {
				// offline / cort.ovh-style network block — try again next check
			});
		};

		// Covers "reopened the app"/"switched back to this tab" on most
		// browsers — same pattern as the visibilitychange re-check in
		// useNotifications.ts.
		document.addEventListener("visibilitychange", () => {
			if (document.visibilityState === "visible") check();
		});

		// Safari/WebKit (notably iOS, in both a plain tab and an installed
		// "Add to Home Screen" app) very often restores a backgrounded page
		// from its back/forward cache instead of re-running any JS —
		// `visibilitychange` isn't reliable there, but a bfcache restore
		// always fires `pageshow` with `persisted: true`, so that's the
		// trigger that actually works on iOS.
		window.addEventListener("pageshow", (event) => {
			if (event.persisted) check();
		});

		setInterval(check, UPDATE_CHECK_INTERVAL_MS);
	},
});
