import { describe, expect, it } from "vitest";
import { diffState, emptyCategorySets } from "./diff";
import type { FortStatus, GemStatus } from "../../src/features/wz/wzEngine";

function fort(overrides: Partial<FortStatus> & { name: string; home: FortStatus["home"] }): FortStatus {
	return { owner: overrides.home, captured: false, since: null, ...overrides };
}

function gem(overrides: Partial<GemStatus> & { index: number; home: GemStatus["home"] }): GemStatus {
	return { owner: overrides.home, ...overrides };
}

describe("diffState", () => {
	it("treats every held fort as a fresh event when diffed against a truly-empty baseline", () => {
		// diffState has no notion of "first tick ever" by itself — an empty
		// `previous` just means "nothing was known before", so anything
		// currently captured reads as new. The actual "don't alert on the
		// very first tick the server has ever run" guarantee lives one layer
		// up, in api/push/tick.ts's handler (`isFirstTick` short-circuits
		// before any push is sent) — this seeds the real baseline instead.
		const forts = [fort({ name: "Imperia Castle (1)", home: "Syrtis", owner: "Ignis", captured: true })];
		const { eventsByRealm } = diffState(forts, [], emptyCategorySets());
		expect(eventsByRealm.Ignis.fortCaptured).toEqual([{ name: "Imperia Castle (1)", otherRealm: "Syrtis" }]);
	});

	it("reports nothing new when re-diffed against a baseline that already reflects the same state", () => {
		const forts = [fort({ name: "Imperia Castle (1)", home: "Syrtis", owner: "Ignis", captured: true })];
		const { next: seeded } = diffState(forts, [], emptyCategorySets());

		// Same forts, same state, diffed against the just-seeded baseline —
		// this is the actual "no duplicate/stale alert" guarantee: nothing
		// changed since the last tick, so nothing should fire again.
		const { eventsByRealm } = diffState(forts, [], seeded);
		expect(eventsByRealm.Ignis.fortCaptured).toEqual([]);
		expect(eventsByRealm.Syrtis.fortLost).toEqual([]);
	});

	it("distinguishes forts from walls via getFortKind, and captured vs lost vs recovered", () => {
		const baseline = emptyCategorySets();
		const afterInvasion = [
			fort({ name: "Imperia Castle (1)", home: "Syrtis", owner: "Ignis", captured: true }),
			fort({ name: "Great Wall of Syrtis (2)", home: "Syrtis", owner: "Alsius", captured: true }),
		];
		const { next: stateAfterInvasion, eventsByRealm: invasionEvents } = diffState(afterInvasion, [], baseline);

		expect(invasionEvents.Ignis.fortCaptured).toEqual([{ name: "Imperia Castle (1)", otherRealm: "Syrtis" }]);
		expect(invasionEvents.Alsius.wallCaptured).toEqual([{ name: "Great Wall of Syrtis (2)", otherRealm: "Syrtis" }]);
		expect(invasionEvents.Syrtis.fortLost).toEqual([{ name: "Imperia Castle (1)", otherRealm: "Ignis" }]);
		expect(invasionEvents.Syrtis.wallLost).toEqual([{ name: "Great Wall of Syrtis (2)", otherRealm: "Alsius" }]);
		// A regular fort must never show up in the wall-shaped categories.
		expect(invasionEvents.Ignis.wallCaptured ?? []).toEqual([]);

		const afterRecapture = [
			fort({ name: "Imperia Castle (1)", home: "Syrtis", owner: "Syrtis", captured: false }),
			fort({ name: "Great Wall of Syrtis (2)", home: "Syrtis", owner: "Alsius", captured: true }),
		];
		const { eventsByRealm: recaptureEvents } = diffState(afterRecapture, [], stateAfterInvasion);

		expect(recaptureEvents.Syrtis.fortRecovered).toEqual([{ name: "Imperia Castle (1)", otherRealm: null }]);
		// The wall is still held by the invader — must NOT also show as recovered.
		expect(recaptureEvents.Syrtis.wallRecovered ?? []).toEqual([]);
		// Nothing changed for the wall between these two ticks — no duplicate "lost" event.
		expect(recaptureEvents.Syrtis.wallLost ?? []).toEqual([]);
	});

	it("tracks gem events by index, separately from forts", () => {
		const baseline = emptyCategorySets();
		const claimed = [gem({ index: 0, home: "Alsius", owner: "Ignis" })];
		const { next, eventsByRealm } = diffState([], claimed, baseline);

		expect(eventsByRealm.Ignis.gemCaptured).toEqual([{ name: "", gemIndex: 0, otherRealm: "Alsius" }]);
		expect(eventsByRealm.Alsius.gemLost).toEqual([{ name: "", gemIndex: 0, otherRealm: "Ignis" }]);
		// A captured gem is never simultaneously "captured" for its own home realm.
		expect(eventsByRealm.Alsius.gemCaptured ?? []).toEqual([]);

		const recovered = [gem({ index: 0, home: "Alsius", owner: "Alsius" })];
		const { eventsByRealm: recoveredEvents } = diffState([], recovered, next);
		expect(recoveredEvents.Alsius.gemRecovered).toEqual([{ name: "", gemIndex: 0, otherRealm: null }]);
	});

	it("counts an unclaimed gem (owner: null) as 'lost' for its home realm — same rule AlertsWatcher uses client-side", () => {
		// Documents existing, intentional behavior (mirrored from
		// `AlertsWatcher.tsx`'s identical `g.owner !== myRealm` filter, which
		// is also true when `owner` is null) rather than a bug: a gem that
		// isn't currently held by its home realm reads as "lost" regardless
		// of whether an enemy holds it or nobody does.
		const unclaimed = [gem({ index: 1, home: "Ignis", owner: null })];
		const { eventsByRealm } = diffState([], unclaimed, emptyCategorySets());
		expect(eventsByRealm.Ignis.gemLost).toEqual([{ name: "", gemIndex: 1, otherRealm: null }]);
	});

	it("keeps CategoryEvent.name as the raw, untranslated fort name (no Great Wall translation baked in)", () => {
		// Regression guard: this must stay raw because `api/push/tick.ts`
		// translates it per-subscriber via `formatFortLabel(name, subscriberLang)`
		// — baking a single language in here would make every subscriber see
		// whichever language happened to be diffed first, instead of their own.
		const baseline = emptyCategorySets();
		const held = [fort({ name: "Great Wall of Alsius (3)", home: "Alsius", owner: "Alsius", captured: false })];
		const { next: seeded } = diffState(held, [], baseline);

		const invaded = [fort({ name: "Great Wall of Alsius (3)", home: "Alsius", owner: "Ignis", captured: true })];
		const { eventsByRealm } = diffState(invaded, [], seeded);

		expect(eventsByRealm.Alsius.wallLost).toEqual([{ name: "Great Wall of Alsius (3)", otherRealm: "Ignis" }]);
	});
});
