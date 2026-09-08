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
	it("relays wstatus.json from cort.go.yo.fr first (the mirror), same-origin, with a short edge cache and no stale-while-revalidate", async () => {
		const payload = { forts: [{ name: "Imperia Castle" }] };
		const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => payload });
		vi.stubGlobal("fetch", fetchMock);

		const { res, result } = mockRes();
		await handler({ method: "GET", query: { endpoint: "wstatus" } }, res);

		expect(fetchMock).toHaveBeenCalledWith("https://cort.go.yo.fr/CoRT/api/var/wstatus.json", {
			signal: expect.any(AbortSignal),
			headers: { "User-Agent": "RegnumWarlords/1.0 (+https://regnum-warlords.vercel.app)" },
		});
		expect(fetchMock).toHaveBeenCalledTimes(1);
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

	it("falls back to cort.ovh for wstatus when cort.go.yo.fr's single attempt fails", async () => {
		const payload = { forts: [{ name: "Imperia Castle" }] };
		const fetchMock = vi.fn(async (url: string) => {
			if (url.includes("cort.go.yo.fr")) return { ok: false, status: 403, json: async () => ({}) };
			return { ok: true, json: async () => payload };
		});
		vi.stubGlobal("fetch", fetchMock);

		const { res, result } = mockRes();
		await handler({ method: "GET", query: { endpoint: "wstatus" } }, res);

		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(fetchMock).toHaveBeenNthCalledWith(1, "https://cort.go.yo.fr/CoRT/api/var/wstatus.json", expect.anything());
		expect(fetchMock).toHaveBeenNthCalledWith(2, "https://cort.ovh/api/var/wstatus.json", expect.anything());
		expect(result.status).toBe(200);
		expect(result.json).toEqual(payload);
	});

	it("maps 'events', 'stats' and 'bosses' to their own cort.go.yo.fr URLs first, falling back to cort.ovh", async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [{}, {}, {}, {}] });
		vi.stubGlobal("fetch", fetchMock);

		for (const [endpoint, primaryUrl] of [
			["events", "https://cort.go.yo.fr/CoRT/api/var/events.json"],
			["stats", "https://cort.go.yo.fr/CoRT/api/var/stats.json"],
			["bosses", "https://cort.go.yo.fr/CoRT/api/bin/bosses/bosses.php"],
		] as const) {
			const { res } = mockRes();
			await handler({ method: "GET", query: { endpoint } }, res);
			expect(fetchMock).toHaveBeenCalledWith(primaryUrl, expect.anything());
		}
	});

	it("falls back to cort.ovh for events when cort.go.yo.fr's single attempt fails", async () => {
		const payload = [{ date: 1, name: "Imperia Castle", location: "Alsius", owner: "Alsius", type: "fort" }];
		const fetchMock = vi.fn(async (url: string) => {
			if (url.includes("cort.go.yo.fr")) return { ok: false, status: 502, json: async () => ({}) };
			return { ok: true, json: async () => payload };
		});
		vi.stubGlobal("fetch", fetchMock);

		const { res, result } = mockRes();
		await handler({ method: "GET", query: { endpoint: "events" } }, res);

		expect(fetchMock).toHaveBeenNthCalledWith(1, "https://cort.go.yo.fr/CoRT/api/var/events.json", expect.anything());
		expect(fetchMock).toHaveBeenNthCalledWith(2, "https://cort.ovh/api/var/events.json", expect.anything());
		expect(result.status).toBe(200);
		// events also gets _eventsBackfill.ts merged in (see next
		// test) — the live entry is still in there, just no longer the
		// *whole* response.
		expect(result.json).toContainEqual(payload[0]);
	});

	it("merges _eventsBackfill.ts into 'events' responses, deduped and sorted newest-first", async () => {
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

	it("falls back to cort.ovh for stats when cort.go.yo.fr's single attempt fails — stats.json IS the same [header, 7d, 30d, 90d] WzStatsDump tuple on both hosts", async () => {
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
			if (url.includes("cort.go.yo.fr")) return { ok: false, status: 502, json: async () => ({}) };
			return { ok: true, json: async () => payload };
		});
		vi.stubGlobal("fetch", fetchMock);

		const { res, result } = mockRes();
		await handler({ method: "GET", query: { endpoint: "stats" } }, res);

		expect(fetchMock).toHaveBeenNthCalledWith(1, "https://cort.go.yo.fr/CoRT/api/var/stats.json", expect.anything());
		expect(fetchMock).toHaveBeenNthCalledWith(2, "https://cort.ovh/api/var/stats.json", expect.anything());
		expect(result.status).toBe(200);
		// forts and every other field pass through untouched — only wishes
		// gets patched (see the dedicated test below), and only for realms
		// _eventsBackfill.ts's wishes are actually in.
		const body = result.json as typeof payload;
		expect(body[1].Alsius.forts).toEqual(payload[1].Alsius.forts);
		expect(body[1].Ignis).toEqual(payload[1].Ignis); // Ignis has no backfilled wishes at all
	});

	it("patches stats.json's wishes count/last for 7d/30d/90d from the same backfilled wishes events.json gets — the actual reported bug ('pedidos do dragão por reino filtrado por semana' reading 0 for every realm)", async () => {
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
			const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => payload });
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

	it("responds 502 after 2 attempts, when cort.ovh keeps erroring", async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) });
		vi.stubGlobal("fetch", fetchMock);
		const { res, result } = mockRes();
		await handler({ method: "GET", query: { endpoint: "wstatus" } }, res);
		expect(result.status).toBe(502);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("responds 502 after 2 attempts, when the fetch itself keeps rejecting (timeout/offline)", async () => {
		const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
		vi.stubGlobal("fetch", fetchMock);
		const { res, result } = mockRes();
		await handler({ method: "GET", query: { endpoint: "wstatus" } }, res);
		expect(result.status).toBe(502);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("succeeds on the 2nd attempt after the first fails — this is the actual, observed high-failure-rate case", async () => {
		const payload = { forts: [] };
		const fetchMock = vi
			.fn()
			.mockRejectedValueOnce(new Error("transient network blip"))
			.mockResolvedValueOnce({ ok: true, json: async () => payload });
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

	it("falls back to api/push/tick.ts's last saved snapshot (as an honest 200, not an error) once all 3 live attempts fail", async () => {
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
