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
	it("relays wstatus.json from cort.ovh, same-origin, with a short edge cache and no stale-while-revalidate", async () => {
		const payload = { forts: [{ name: "Imperia Castle" }] };
		const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => payload });
		vi.stubGlobal("fetch", fetchMock);

		const { res, result } = mockRes();
		await handler({ method: "GET", query: { endpoint: "wstatus" } }, res);

		expect(fetchMock).toHaveBeenCalledWith("https://cort.ovh/api/var/wstatus.json", { signal: expect.any(AbortSignal) });
		// No `cache` RequestInit option on the upstream fetch — Vercel's Node
		// fetch rejected that option outright (this endpoint went from
		// working, if stale, to a flat 502 in production once it was added).
		expect(Object.keys(fetchMock.mock.calls[0][1])).toEqual(["signal"]);
		expect(result.status).toBe(200);
		expect(result.json).toEqual(payload);
		// s-maxage but no stale-while-revalidate: a short edge cache absorbs
		// repeat requests against a flaky upstream, but a failed revalidation
		// must surface as an error again rather than silently keep serving an
		// old copy forever — that silent-staleness combo (max-age=30 +
		// stale-while-revalidate=60) is what "não está atualizando
		// corretamente" turned out to be.
		expect(result.headers["Cache-Control"]).toBe("max-age=0, s-maxage=15");
	});

	it("maps 'events' and 'stats' to their own cort.ovh URLs", async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
		vi.stubGlobal("fetch", fetchMock);

		for (const [endpoint, url] of [
			["events", "https://cort.ovh/api/var/events.json"],
			["stats", "https://cort.ovh/api/var/stats.json"],
		] as const) {
			const { res } = mockRes();
			await handler({ method: "GET", query: { endpoint } }, res);
			expect(fetchMock).toHaveBeenCalledWith(url, expect.anything());
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

	it("responds 502 after 3 attempts, when cort.ovh keeps erroring", async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) });
		vi.stubGlobal("fetch", fetchMock);
		const { res, result } = mockRes();
		await handler({ method: "GET", query: { endpoint: "wstatus" } }, res);
		expect(result.status).toBe(502);
		expect(fetchMock).toHaveBeenCalledTimes(3);
	});

	it("responds 502 after 3 attempts, when the fetch itself keeps rejecting (timeout/offline)", async () => {
		const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
		vi.stubGlobal("fetch", fetchMock);
		const { res, result } = mockRes();
		await handler({ method: "GET", query: { endpoint: "wstatus" } }, res);
		expect(result.status).toBe(502);
		expect(fetchMock).toHaveBeenCalledTimes(3);
	});

	it("succeeds on the last attempt after the first two fail — this is the actual, observed ~80%-failure-rate case", async () => {
		const payload = { forts: [] };
		const fetchMock = vi
			.fn()
			.mockRejectedValueOnce(new Error("transient network blip"))
			.mockResolvedValueOnce({ ok: false, status: 502, json: async () => ({}) })
			.mockResolvedValueOnce({ ok: true, json: async () => payload });
		vi.stubGlobal("fetch", fetchMock);
		const { res, result } = mockRes();
		await handler({ method: "GET", query: { endpoint: "wstatus" } }, res);
		expect(result.status).toBe(200);
		expect(result.json).toEqual(payload);
		expect(fetchMock).toHaveBeenCalledTimes(3);
	});

	it("only accepts GET", async () => {
		const { res, result } = mockRes();
		await handler({ method: "POST", query: { endpoint: "wstatus" } }, res);
		expect(result.status).toBe(405);
		expect(result.headers.Allow).toBe("GET");
	});
});
