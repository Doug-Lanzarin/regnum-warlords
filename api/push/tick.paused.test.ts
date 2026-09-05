import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import handler from "./tick";

// Separate file from tick.test.ts on purpose: that file mocks
// notificationsPaused.ts back to `false` so it can keep exercising the
// fetch-failure handling underneath. This one runs against the real,
// unmocked flag — so it only stays meaningful (and fails loudly) once
// someone flips NOTIFICATIONS_PAUSED back to false without updating this
// test to match.
describe("tick handler — paused (real notificationsPaused.ts flag)", () => {
	beforeAll(() => {
		process.env.PUSH_TICK_SECRET = "s3cr3t";
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("returns a clean 200 without touching fetch at all, while notifications are paused", async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		const result: { status: number | null; json: unknown } = { status: null, json: null };
		const res = {
			status(code: number) {
				result.status = code;
				return res;
			},
			json(body: unknown) {
				result.json = body;
			},
			setHeader() {},
		};

		await handler({ method: "GET", headers: { authorization: "Bearer s3cr3t" }, query: {} }, res);

		expect(fetchMock).not.toHaveBeenCalled();
		expect(result.status).toBe(200);
		expect(result.json).toEqual({ ok: true, paused: true });
	});
});
