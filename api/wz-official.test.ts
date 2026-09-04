import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import handler, { parseWarStatusPage } from "./wz-official";

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("parseWarStatusPage", () => {
	const html = readFileSync(join(import.meta.dirname, "wz-official.fixture.html"), "utf-8");

	it("extracts all 12 forts, correctly attributed to their home realm", () => {
		const data = parseWarStatusPage(html);
		expect(data.forts).toHaveLength(12);
		expect(data.forts.filter((f) => f.location === "Alsius")).toHaveLength(4);
		expect(data.forts.filter((f) => f.location === "Ignis")).toHaveLength(4);
		expect(data.forts.filter((f) => f.location === "Syrtis")).toHaveLength(4);
	});

	it("parses fort names in cort.ovh's exact format, including the Great Walls", () => {
		const data = parseWarStatusPage(html);
		const names = data.forts.map((f) => f.name);
		expect(names).toContain("Imperia Castle (1)");
		expect(names).toContain("Fort Aggersborg (2)");
		expect(names).toContain("Great Wall of Alsius (4)");
		expect(names).toContain("Great Wall of Ignis (8)");
		expect(names).toContain("Great Wall of Syrtis (12)");
	});

	it("derives fort owner from the keep_<realm>.gif icon, not just its home realm", () => {
		const data = parseWarStatusPage(html);
		// This snapshot has no forts currently captured (every icon matches its
		// home realm) — still exercises the owner/icon derivation, just with
		// owner == location. The "not just home" behavior itself (icon realm
		// wins over the block's realm) is what the code path does regardless.
		const aggersborg = data.forts.find((f) => f.name === "Fort Aggersborg (2)");
		expect(aggersborg).toEqual({ name: "Fort Aggersborg (2)", location: "Alsius", owner: "Alsius", icon: "keep_alsius.gif" });
	});

	it("derives fort owner from a synthetic captured-fort block, distinct from its home realm", () => {
		const capturedBlock = `<div class="war-status-realm"><div style="float: left;">Realm of Alsius</div></div>
			<div class="war-status-realm-buildings">
				<div class="war-status-building"><div class="war-status-bulding-icons"><img src="keep_syrtis.gif"></div><div class="war-status-bulding-name">Fort Aggersborg (2)</div></div>
			</div>`;
		const data = parseWarStatusPage(capturedBlock);
		expect(data.forts).toEqual([{ name: "Fort Aggersborg (2)", location: "Alsius", owner: "Syrtis", icon: "keep_syrtis.gif" }]);
	});

	it("produces an 18-entry gems array in Alsius/Ignis/Syrtis order, using cort.ovh's gem_N.png convention", () => {
		const data = parseWarStatusPage(html);
		expect(data.gems).toHaveLength(18);
		expect(data.gems.slice(0, 6)).toEqual(["gem_0.png", "gem_2.png", "gem_0.png", "gem_2.png", "gem_0.png", "gem_0.png"]);
		expect(data.gems.slice(6, 12)).toEqual(["gem_0.png", "gem_0.png", "gem_1.png", "gem_0.png", "gem_1.png", "gem_0.png"]);
	});

	it("parses each realm's own relic locations", () => {
		const data = parseWarStatusPage(html);
		expect(data.relics.Alsius).toEqual({ Imperia: "Imperia", Aggersborg: "Aggersborg", Trelleborg: "Trelleborg" });
	});

	it("parses the 'Latest update' line into a unix-seconds timestamp", () => {
		const data = parseWarStatusPage(html);
		// 2026-09-04 17:51:04 GMT+1 -> 16:51:04 UTC
		expect(new Date(data.generated * 1000).toISOString()).toBe("2026-09-04T16:51:04.000Z");
	});
});

describe("wz-official handler", () => {
	function mockRes() {
		const result: { status: number | null; json: unknown; headers: Record<string, string> } = { status: null, json: null, headers: {} };
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

	it("relays the parsed page as a normal 200", async () => {
		const html = readFileSync(join(import.meta.dirname, "wz-official.fixture.html"), "utf-8");
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => html }),
		);
		const { res, result } = mockRes();
		await handler({ method: "GET" }, res);
		expect(result.status).toBe(200);
		expect((result.json as { forts: unknown[] }).forts).toHaveLength(12);
	});

	it("responds 502 when the official site is unreachable", async () => {
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
		const { res, result } = mockRes();
		await handler({ method: "GET" }, res);
		expect(result.status).toBe(502);
	});

	it("responds 502 when the page's format changed enough that nothing parses", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => "<html>totally different</html>" }));
		const { res, result } = mockRes();
		await handler({ method: "GET" }, res);
		expect(result.status).toBe(502);
	});

	it("only accepts GET", async () => {
		const { res, result } = mockRes();
		await handler({ method: "POST" }, res);
		expect(result.status).toBe(405);
	});
});
