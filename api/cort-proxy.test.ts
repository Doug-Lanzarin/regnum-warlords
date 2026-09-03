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
	it("relays wstatus.json from cort.ovh, same-origin, with a short cache header", async () => {
		const payload = { forts: [{ name: "Imperia Castle" }] };
		const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => payload });
		vi.stubGlobal("fetch", fetchMock);

		const { res, result } = mockRes();
		await handler({ method: "GET", query: { endpoint: "wstatus" } }, res);

		expect(fetchMock).toHaveBeenCalledWith("https://cort.ovh/api/var/wstatus.json", expect.anything());
		expect(result.status).toBe(200);
		expect(result.json).toEqual(payload);
		expect(result.headers["Cache-Control"]).toContain("max-age=30");
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

	it("responds 502 when cort.ovh itself errors", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) }),
		);
		const { res, result } = mockRes();
		await handler({ method: "GET", query: { endpoint: "wstatus" } }, res);
		expect(result.status).toBe(502);
	});

	it("responds 502 instead of throwing when the fetch itself rejects (timeout/offline)", async () => {
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
		const { res, result } = mockRes();
		await handler({ method: "GET", query: { endpoint: "wstatus" } }, res);
		expect(result.status).toBe(502);
	});

	it("only accepts GET", async () => {
		const { res, result } = mockRes();
		await handler({ method: "POST", query: { endpoint: "wstatus" } }, res);
		expect(result.status).toBe(405);
		expect(result.headers.Allow).toBe("GET");
	});
});
