/** Single switch pausing the whole notifications feature (toasts while the
 *  app is open, real push while it's closed, and the server-side polling
 *  that drives both) — flip to `false` to bring it all back at once.
 *  Paused after the combined load of the app's own polling plus a home
 *  relay experiment caused a real cort.ovh outage; see git history for
 *  context. Read by AppLayout (skips mounting AlertsWatcher),
 *  AlertSettingsPanel (shows a "paused" notice instead of the real panel)
 *  and api/push/tick.ts (no-ops before touching cort.ovh or sending push). */
export const NOTIFICATIONS_PAUSED = true;
