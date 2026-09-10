import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "./cort-proxy";

interface MockResult {
	status: number | null;
	json: unknown;
	headers: Record<string, string>;
}

function mockRes() {
	const result: MockResult = { status: null, json: null, headers: {} };
	const res = {
		status(code: number) {
			result.status = code;
			return res;
		},
		json(body: unknown) {
			result.json = body;
		},
		setHeader(key: string, value: string) {
			result.headers[key] = value;
		},
	};
	return { res, result };
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("cort-proxy handler", () => {
	it("fetches both candidates concurrently for wstatus, with a short edge cache and no stale-while-revalidate", async () => {
		const payload = { forts: [{ name: "Imperia Castle" }] };
		const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => payload });
		vi.stubGlobal("fetch", fetchMock);

		const { res, result } = mockRes();
		await handler({ method: "GET", query: { endpoint: "wstatus" } }, res);

		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(fetchMock).toHaveBeenCalledWith("https://cort.go.yo.fr/CoRT/api/var/wstatus.json", {
			signal: expect.any(AbortSignal),
			headers: { "User-Agent": "RegnumWarlords/1.0 (+https://regnum-warlords.vercel.app)" },
		});
		expect(fetchMock).toHaveBeenCalledWith("https://cort.ovh/api/var/wstatus.json", expect.anything());
		// No `cache` RequestInit option on the upstream fetch — Vercel's Node
		// fetch rejected that option outright (this endpoint went from
		// working, if stale, to a flat 502 in production once it was added).
		expect(Object.keys(fetchMock.mock.calls[0][1]).sort()).toEqual(["headers", "signal"]);
		expect(result.status).toBe(200);
		expect(result.json).toEqual(payload);
		// s-maxage but no stale-while-revalidate: a short edge cache absorbs
		// repeat requests against a flaky upstream, but a failed revalidation
		// must surface as an error again rather than silently keep serving an
		// old copy forever — that silent-staleness combo (max-age=30 +
		// stale-while-revalidate=60) is what "não está atualizando
		// corretamente" turned out to be.
		expect(result.headers["Cache-Control"]).toBe("max-age=0, s-maxage=45");
	});

	it("prefers cort.ovh's answer over the mirror's for wstatus when both succeed", async () => {
		const mirrorPayload = { forts: [{ name: "stale mirror copy" }] };
		const cortOvhPayload = { forts: [{ name: "fresh cort.ovh copy" }] };
		const fetchMock = vi.fn(async (url: string) => {
			if (url.includes("cort.go.yo.fr")) return { ok: true, json: async () => mirrorPayload };
			return { ok: true, json: async () => cortOvhPayload };
		});
		vi.stubGlobal("fetch", fetchMock);

		const { res, result } = mockRes();
		await handler({ method: "GET", query: { endpoint: "wstatus" } }, res);

		expect(result.status).toBe(200);
		expect(result.json).toEqual(cortOvhPayload);
	});

	it("falls back to the mirror for wstatus when cort.ovh's attempt fails", async () => {
		const payload = { forts: [{ name: "Imperia Castle" }] };
		const fetchMock = vi.fn(async (url: string) => {
			if (url.includes("cort.go.yo.fr")) return { ok: true, json: async () => payload };
			return { ok: false, status: 403, json: async () => ({}) };
		});
		vi.stubGlobal("fetch", fetchMock);

		const { res, result } = mockRes();
		await handler({ method: "GET", query: { endpoint: "wstatus" } }, res);

		expect(result.status).toBe(200);
		expect(result.json).toEqual(payload);
	});

	it("maps 'events', 'stats' and 'bosses' to their own cort.go.yo.fr and cort.ovh URLs", async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [{}, {}, {}, {}] });
		vi.stubGlobal("fetch", fetchMock);

		for (const [endpoint, urls] of [
			["events", ["https://cort.go.yo.fr/CoRT/api/var/events.json", "https://cort.ovh/api/var/events.json"]],
			["stats", ["https://cort.go.yo.fr/CoRT/api/var/stats.json", "https://cort.ovh/api/var/stats.json"]],
			["bosses", ["https://cort.go.yo.fr/CoRT/api/bin/bosses/bosses.php", "https://cort.ovh/api/bin/bosses/bosses.php"]],
		] as const) {
			const { res } = mockRes();
			await handler({ method: "GET", query: { endpoint } }, res);
			for (const url of urls) expect(fetchMock).toHaveBeenCalledWith(url, expect.anything());
		}
	});

	it("falls back to the mirror for events when cort.ovh's attempt fails", async () => {
		const payload = [{ date: 1, name: "Imperia Castle", location: "Alsius", owner: "Alsius", type: "fort" }];
		const fetchMock = vi.fn(async (url: string) => {
			if (url.includes("cort.go.yo.fr")) return { ok: true, json: async () => payload };
			return { ok: false, status: 502, json: async () => ({}) };
		});
		vi.stubGlobal("fetch", fetchMock);

		const { res, result } = mockRes();
		await handler({ method: "GET", query: { endpoint: "events" } }, res);

		expect(result.status).toBe(200);
		// events also gets _eventsBackfill.ts merged in (see next
		// test) — the live entry is still in there, just no longer the
		// *whole* response.
		expect(result.json).toContainEqual(payload[0]);
	});

	it("merges the mirror's and cort.ovh's events into one deduped, newest-first union — the actual reported bug ('curva de atividade sem atividade', a dragon wish 'não está contando')", async () => {
		const mirrorLive = [
			{ generated: 500 },
			{ date: 1_000, name: "Fort Herbred", location: "Syrtis", owner: "Syrtis", type: "fort" },
		];
		// cort.ovh has everything the mirror has, plus a more recent event the
		// mirror is simply missing (the mirror falling behind, not just a
		// dated historical gap — the actual failure mode found live).
		const cortOvhLive = [
			{ generated: 999 },
			{ date: 2_000, name: "", location: "Ignis", owner: "", type: "wish" },
			{ date: 1_000, name: "Fort Herbred", location: "Syrtis", owner: "Syrtis", type: "fort" },
		];
		const fetchMock = vi.fn(async (url: string) => {
			if (url.includes("cort.go.yo.fr")) return { ok: true, json: async () => mirrorLive };
			return { ok: true, json: async () => cortOvhLive };
		});
		vi.stubGlobal("fetch", fetchMock);

		const { res, result } = mockRes();
		await handler({ method: "GET", query: { endpoint: "events" } }, res);

		expect(result.status).toBe(200);
		const body = result.json as unknown[];
		expect(body[0]).toEqual({ generated: 999 }); // freshest header wins, not folded into the date sort
		// The event both sources shared isn't duplicated...
		const sharedFort = body.filter((e) => typeof e === "object" && e !== null && (e as { date: number }).date === 1_000);
		expect(sharedFort).toHaveLength(1);
		// ...but the wish only cort.ovh had is present — this is the fix:
		// the mirror alone would have silently dropped it.
		expect(body).toContainEqual(cortOvhLive[1]);
	});

	it("collapses the same real event reported by both sources a few seconds apart into one entry (minute-rounded dedup) — observed live: a mirror wish at :07:56:02 vs cort.ovh's :07:56:00 copy of the same wish", async () => {
		// A far-future date, same shape as the live case that motivated this
		// (a wish, empty name/owner) but picked so it can't collide with any
		// real entry in _eventsBackfill.ts, which this test's assertion needs
		// to isolate from.
		const mirrorLive = [
			{ generated: 500 },
			{ date: 5_000_000_002, name: "", location: "Syrtis", owner: "", type: "wish" },
		];
		const cortOvhLive = [
			{ generated: 999 },
			{ date: 5_000_000_000, name: "", location: "Syrtis", owner: "", type: "wish" },
		];
		const fetchMock = vi.fn(async (url: string) => {
			if (url.includes("cort.go.yo.fr")) return { ok: true, json: async () => mirrorLive };
			return { ok: true, json: async () => cortOvhLive };
		});
		vi.stubGlobal("fetch", fetchMock);

		const { res, result } = mockRes();
		await handler({ method: "GET", query: { endpoint: "events" } }, res);

		const body = result.json as unknown[];
		const matches = body.filter(
			(e) => typeof e === "object" && e !== null && (e as { date: number }).date >= 5_000_000_000 && (e as { date: number }).date <= 5_000_000_002,
		);
		expect(matches).toHaveLength(1); // not double-counted as two separate wishes
	});

	it("merges _eventsBackfill.ts into 'events' responses without duplicating an overlapping live entry", async () => {
		const live = [
			{ generated: 999 },
			{ date: 5_000_000_000, name: "Fort Herbred", location: "Syrtis", owner: "Syrtis", type: "fort" },
			// Same event _eventsBackfill.ts also carries, in some
			// form — proves a live entry that happens to overlap the backfill
			// window doesn't end up duplicated in the response.
			{ date: 1788710523, name: "Fort Aggersborg", location: "Alsius", owner: "Ignis", type: "fort" },
		];
		const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => live });
		vi.stubGlobal("fetch", fetchMock);

		const { res, result } = mockRes();
		await handler({ method: "GET", query: { endpoint: "events" } }, res);

		expect(result.status).toBe(200);
		const body = result.json as unknown[];
		expect(body[0]).toEqual({ generated: 999 }); // header stays first, not folded into the date sort
		expect(body.length).toBeGreaterThan(live.length); // backfill entries actually got added
		// No duplicate of the entry both sides happened to share.
		const dup = body.filter(
			(e) =>
				typeof e === "object" &&
				e !== null &&
				"date" in e &&
				(e as { date: number }).date === 1788710523 &&
				(e as { name: string }).name === "Fort Aggersborg",
		);
		expect(dup).toHaveLength(1);
		// Newest-first: the live entry with the far-future date leads the
		// (non-header) part of the list.
		expect(body[1]).toEqual(live[1]);
	});

	it("falls back to the mirror for stats when cort.ovh's attempt fails — stats.json IS the same [header, 7d, 30d, 90d] WzStatsDump tuple on both hosts", async () => {
		const emptyRealm = () => ({
			forts: { total: 3, captured: 1, recovered: 1, most_captured: { name: "Imperia Castle", count: 1 } },
			wishes: { count: 0, last: null },
		});
		const payload = [
			{ generated: 1 },
			{ Alsius: emptyRealm(), Ignis: emptyRealm(), Syrtis: emptyRealm() },
			{ Alsius: emptyRealm(), Ignis: emptyRealm(), Syrtis: emptyRealm() },
			{ Alsius: emptyRealm(), Ignis: emptyRealm(), Syrtis: emptyRealm() },
		];
		const fetchMock = vi.fn(async (url: string) => {
			if (url.includes("cort.go.yo.fr")) return { ok: true, json: async () => payload };
			return { ok: false, status: 502, json: async () => ({}) };
		});
		vi.stubGlobal("fetch", fetchMock);

		const { res, result } = mockRes();
		await handler({ method: "GET", query: { endpoint: "stats" } }, res);

		expect(result.status).toBe(200);
		// forts and every other field pass through untouched — only wishes
		// gets patched (see the dedicated test below), and only for realms
		// _eventsBackfill.ts's wishes are actually in.
		const body = result.json as typeof payload;
		expect(body[1].Alsius.forts).toEqual(payload[1].Alsius.forts);
		expect(body[1].Ignis).toEqual(payload[1].Ignis); // Ignis has no backfilled wishes at all
	});

	it("prefers cort.ovh's stats.json over the mirror's when both succeed, and does NOT apply the backfill patch to it (would double-count)", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-09-08T12:00:00Z"));
		try {
			const realmWith = (count: number) => ({
				forts: { total: 0, captured: 0, recovered: 0, most_captured: { name: "", count: 0 } },
				wishes: { count, last: null },
			});
			// cort.ovh's own copy already has the real wish counts (it never had
			// the mirror's gap) — patching it on top would double it.
			const cortOvhPayload = [
				{ generated: 1 },
				{ Alsius: realmWith(2), Ignis: realmWith(0), Syrtis: realmWith(2) },
				{ Alsius: realmWith(2), Ignis: realmWith(0), Syrtis: realmWith(2) },
				{ Alsius: realmWith(2), Ignis: realmWith(0), Syrtis: realmWith(2) },
			];
			const mirrorPayload = [
				{ generated: 1 },
				{ Alsius: realmWith(0), Ignis: realmWith(0), Syrtis: realmWith(0) },
				{ Alsius: realmWith(0), Ignis: realmWith(0), Syrtis: realmWith(0) },
				{ Alsius: realmWith(0), Ignis: realmWith(0), Syrtis: realmWith(0) },
			];
			const fetchMock = vi.fn(async (url: string) => {
				if (url.includes("cort.go.yo.fr")) return { ok: true, json: async () => mirrorPayload };
				return { ok: true, json: async () => cortOvhPayload };
			});
			vi.stubGlobal("fetch", fetchMock);

			const { res, result } = mockRes();
			await handler({ method: "GET", query: { endpoint: "stats" } }, res);

			const body = result.json as typeof cortOvhPayload;
			for (const window of [1, 2, 3] as const) {
				expect(body[window].Syrtis.wishes.count).toBe(2); // untouched, not 4
				expect(body[window].Alsius.wishes.count).toBe(2); // untouched, not 4
			}
		} finally {
			vi.useRealTimers();
		}
	});

	it("patches the mirror's stats.json wishes count/last for 7d/30d/90d from the same backfilled wishes events.json gets — the actual reported bug ('pedidos do dragão por reino filtrado por semana' reading 0 for every realm)", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-09-08T12:00:00Z"));
		try {
			const emptyRealm = () => ({
				forts: { total: 0, captured: 0, recovered: 0, most_captured: { name: "", count: 0 } },
				wishes: { count: 0, last: null },
			});
			const payload = [
				{ generated: 1 },
				{ Alsius: emptyRealm(), Ignis: emptyRealm(), Syrtis: emptyRealm() },
				{ Alsius: emptyRealm(), Ignis: emptyRealm(), Syrtis: emptyRealm() },
				{ Alsius: emptyRealm(), Ignis: emptyRealm(), Syrtis: emptyRealm() },
			];
			const fetchMock = vi.fn(async (url: string) => {
				if (url.includes("cort.go.yo.fr")) return { ok: true, json: async () => payload };
				return { ok: false, status: 502, json: async () => ({}) };
			});
			vi.stubGlobal("fetch", fetchMock);

			const { res, result } = mockRes();
			await handler({ method: "GET", query: { endpoint: "stats" } }, res);

			// _eventsBackfill.ts carries 2 Syrtis + 2 Alsius wishes (2026-09-02,
			// -04, -05×2) + 0 Ignis — all inside every window from this pinned
			// "now" (2026-09-08).
			const body = result.json as typeof payload;
			for (const window of [1, 2, 3] as const) {
				expect(body[window].Syrtis.wishes.count).toBe(2);
				expect(body[window].Alsius.wishes.count).toBe(2);
				expect(body[window].Ignis.wishes.count).toBe(0); // untouched — no backfilled Ignis wishes
			}
		} finally {
			vi.useRealTimers();
		}
	});

	it("does NOT patch in wishes newer than the confirmed-empty gap window, even from the mirror — the mirror isn't always empty, so a newer backfilled wish risks double-counting one it already caught itself", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-09-10T12:00:00Z"));
		try {
			// _eventsBackfill.ts also carries an Ignis wish from 2026-09-09
			// (outside the confirmed gap — Ignis has zero *pre*-gap backfilled
			// wishes, so it's a clean isolated check), but the mirror's
			// stats.json here already reports 1 Ignis wish for every window —
			// simulating that the mirror did catch that one itself. If the
			// patch blindly added the backfilled 2026-09-09 Ignis wish on top,
			// this would read 2.
			const realmWith = (count: number) => ({
				forts: { total: 0, captured: 0, recovered: 0, most_captured: { name: "", count: 0 } },
				wishes: { count, last: null },
			});
			const payload = [
				{ generated: 1 },
				{ Alsius: realmWith(0), Ignis: realmWith(1), Syrtis: realmWith(0) },
				{ Alsius: realmWith(0), Ignis: realmWith(1), Syrtis: realmWith(0) },
				{ Alsius: realmWith(0), Ignis: realmWith(1), Syrtis: realmWith(0) },
			];
			const fetchMock = vi.fn(async (url: string) => {
				if (url.includes("cort.go.yo.fr")) return { ok: true, json: async () => payload };
				return { ok: false, status: 502, json: async () => ({}) };
			});
			vi.stubGlobal("fetch", fetchMock);

			const { res, result } = mockRes();
			await handler({ method: "GET", query: { endpoint: "stats" } }, res);

			const body = result.json as typeof payload;
			for (const window of [1, 2, 3] as const) {
				expect(body[window].Ignis.wishes.count).toBe(1); // untouched, not bumped to 2
			}
		} finally {
			vi.useRealTimers();
		}
	});

	it("rejects an endpoint outside the allow-list instead of proxying an arbitrary URL", async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		const { res, result } = mockRes();
		await handler({ method: "GET", query: { endpoint: "../../etc/passwd" } }, res);

		expect(fetchMock).not.toHaveBeenCalled();
		expect(result.status).toBe(400);
	});

	it("rejects a missing endpoint param", async () => {
		const { res, result } = mockRes();
		await handler({ method: "GET", query: {} }, res);
		expect(result.status).toBe(400);
	});

	it("responds 502 when both candidates error", async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) });
		vi.stubGlobal("fetch", fetchMock);
		const { res, result } = mockRes();
		await handler({ method: "GET", query: { endpoint: "wstatus" } }, res);
		expect(result.status).toBe(502);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("responds 502 when both candidate fetches reject (timeout/offline)", async () => {
		const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
		vi.stubGlobal("fetch", fetchMock);
		const { res, result } = mockRes();
		await handler({ method: "GET", query: { endpoint: "wstatus" } }, res);
		expect(result.status).toBe(502);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("succeeds when one candidate fails and the other doesn't", async () => {
		const payload = { forts: [] };
		const fetchMock = vi.fn(async (url: string) => {
			if (url.includes("cort.go.yo.fr")) return Promise.reject(new Error("transient network blip"));
			return { ok: true, json: async () => payload };
		});
		vi.stubGlobal("fetch", fetchMock);
		const { res, result } = mockRes();
		await handler({ method: "GET", query: { endpoint: "wstatus" } }, res);
		expect(result.status).toBe(200);
		expect(result.json).toEqual(payload);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("only accepts GET", async () => {
		const { res, result } = mockRes();
		await handler({ method: "POST", query: { endpoint: "wstatus" } }, res);
		expect(result.status).toBe(405);
		expect(result.headers.Allow).toBe("GET");
	});
});

describe("cort-proxy handler — wstatus fallback to the last stored snapshot", () => {
	const ORIGINAL_TOKEN = process.env.NOTIFICATIONS_GITHUB_TOKEN;

	afterEach(() => {
		if (ORIGINAL_TOKEN === undefined) delete process.env.NOTIFICATIONS_GITHUB_TOKEN;
		else process.env.NOTIFICATIONS_GITHUB_TOKEN = ORIGINAL_TOKEN;
	});

	function stubFetchWithGithubSnapshot(snapshot: unknown) {
		const fetchMock = vi.fn(async (url: string) => {
			if (url.includes("cort.ovh") || url.includes("cort.go.yo.fr")) return { ok: false, status: 502, json: async () => ({}) };
			if (url.includes("api.github.com")) {
				return {
					ok: true,
					status: 200,
					json: async () => ({ content: Buffer.from(JSON.stringify(snapshot)).toString("base64"), sha: "abc123" }),
				};
			}
			throw new Error(`unexpected fetch to ${url}`);
		});
		vi.stubGlobal("fetch", fetchMock);
		return fetchMock;
	}

	it("falls back to api/push/tick.ts's last saved snapshot (as an honest 200, not an error) once both live attempts fail", async () => {
		process.env.NOTIFICATIONS_GITHUB_TOKEN = "test-token";
		const snapshot = { wstatus: { forts: [], gems: [], generated: 111 }, savedAt: 222 };
		stubFetchWithGithubSnapshot(snapshot);

		const { res, result } = mockRes();
		await handler({ method: "GET", query: { endpoint: "wstatus" } }, res);

		expect(result.status).toBe(200);
		expect(result.json).toEqual(snapshot.wstatus);
		expect(result.headers["X-Cort-Proxy-Fallback"]).toBe("1");
	});

	it("falls through to the normal 502 when there's no snapshot saved yet (GitHub 404)", async () => {
		process.env.NOTIFICATIONS_GITHUB_TOKEN = "test-token";
		const fetchMock = vi.fn(async (url: string) => {
			if (url.includes("cort.ovh") || url.includes("cort.go.yo.fr")) return { ok: false, status: 502, json: async () => ({}) };
			if (url.includes("api.github.com")) return { ok: false, status: 404, json: async () => ({}) };
			throw new Error(`unexpected fetch to ${url}`);
		});
		vi.stubGlobal("fetch", fetchMock);

		const { res, result } = mockRes();
		await handler({ method: "GET", query: { endpoint: "wstatus" } }, res);

		expect(result.status).toBe(502);
	});

	it("never falls back to GitHub for endpoints other than wstatus (events/stats/bosses have no snapshot to fall back to), even after both live candidates fail", async () => {
		const fetchMock = vi.fn(async (url: string) => {
			if (url.includes("cort.ovh") || url.includes("cort.go.yo.fr")) return { ok: false, status: 502, json: async () => ({}) };
			throw new Error(`should never reach GitHub for a non-wstatus endpoint: ${url}`);
		});
		vi.stubGlobal("fetch", fetchMock);

		const { res, result } = mockRes();
		await handler({ method: "GET", query: { endpoint: "bosses" } }, res);

		expect(result.status).toBe(502);
	});
});
