/** The 3 playable realms, shared by every CoRT feature that's realm-aware
 *  (Trainer themes, Bosses, WZ status, etc). Kept as one source of truth so
 *  a realm always reads as the same color everywhere in the app. */
export type Realm = "Alsius" | "Ignis" | "Syrtis";

export const REALMS: Realm[] = ["Alsius", "Ignis", "Syrtis"];

/** Fixed identity colors — intentionally NOT theme tokens, so a realm badge
 *  reads correctly no matter which app theme (Dark/Light/Alsius/...) is active. */
export const REALM_COLOR: Record<Realm, string> = {
	Alsius: "#7cb8f0",
	Ignis: "#ff8a50",
	Syrtis: "#6fd67f",
};
