import type { Realm } from "../data/realms";
import type { Lang } from "../i18n/languages";

/** Personal alert preferences — local to this device only (no account, no
 *  server), separate from the public/admin-curated notifications timeline.
 *  Fort/wall/gem each get their own captured (offense) and lost (defense)
 *  toggle since a player may only care about some of these.
 *
 *  Kept in its own DOM-free file (unlike the localStorage read/write
 *  helpers in `src/features/alerts/alertSettings.ts`, which stay
 *  client-only) so `push-worker/` — which has no DOM lib, only the
 *  Workers runtime — can import just this shape without pulling in
 *  `localStorage`-touching code it can't type-check or run. */
export interface AlertSettings {
	myRealm: Realm | null;
	/** Language for server-sent push messages (`api/push/tick.ts`) — the
	 *  client-side toast/OS notification always uses whatever's currently
	 *  selected in `LanguageContext` instead, since it renders live. */
	lang: Lang;
	fortCapturedAlerts: boolean;
	fortLostAlerts: boolean;
	/** Own fort, previously held by an invader, just came back under home control. */
	fortRecoveredAlerts: boolean;
	wallCapturedAlerts: boolean;
	wallLostAlerts: boolean;
	wallRecoveredAlerts: boolean;
	gemCapturedAlerts: boolean;
	gemLostAlerts: boolean;
	gemRecoveredAlerts: boolean;
	/** Minutes-before-spawn thresholds the user wants a heads-up for, e.g. [60, 30, 15]. */
	bossAlertMinutes: number[];
}

export type BooleanAlertKey =
	| "fortCapturedAlerts"
	| "fortLostAlerts"
	| "fortRecoveredAlerts"
	| "wallCapturedAlerts"
	| "wallLostAlerts"
	| "wallRecoveredAlerts"
	| "gemCapturedAlerts"
	| "gemLostAlerts"
	| "gemRecoveredAlerts";
