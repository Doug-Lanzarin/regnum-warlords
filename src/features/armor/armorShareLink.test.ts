import { describe, expect, it } from "vitest";
import { createEmptyArmorBuild } from "./armorEngine";
import { decodeArmorBuild, encodeArmorBuild } from "./armorShareLink";

describe("encodeArmorBuild / decodeArmorBuild", () => {
	it("round-trips a build with realistic values, including per-type quality and negative resistance", () => {
		const build = createEmptyArmorBuild("knight");
		build.pieces.chest!.pba = 210;
		build.pieces.chest!.bcmt = 12;
		build.pieces.chest!.quality.fire = "vg";
		build.pieces.shield!.pba = 200;
		build.armorBonusPct = 8;
		build.resistancePhysicalPct = 5;
		build.resistanceMagicPct = -10; // a cursed ring, say
		build.resistanceByType.ice = 15;
		build.damageReductionPct = 3;

		const decoded = decodeArmorBuild(encodeArmorBuild(build));
		expect(decoded).toEqual(build);
	});

	it("only round-trips the pieces the class actually has (mage: no chest/shoulders/legs/shield)", () => {
		const build = createEmptyArmorBuild("warlock");
		const decoded = decodeArmorBuild(encodeArmorBuild(build));
		expect(Object.keys(decoded!.pieces).sort()).toEqual(["bracelet", "gauntlets", "helmet", "robe"]);
	});

	it("returns null for garbage input instead of throwing", () => {
		expect(decodeArmorBuild("not-valid-base64!!!")).toBeNull();
	});
});
