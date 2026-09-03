import { describe, expect, it } from "vitest";
import type { ArmorBuild } from "../../types/armor";
import { computeProtection, createEmptyArmorBuild, emptyPieceState, isMagicDamageType, nextQualityTier, simulateIncomingDamage } from "./armorEngine";
import { piecesForClass } from "../../data/armorConstants";

describe("piecesForClass — equipment restrictions per class", () => {
	it("gives Knight the base 5 pieces plus a shield", () => {
		expect(piecesForClass("knight")).toEqual(["chest", "shoulders", "legs", "helmet", "gauntlets", "shield"]);
	});

	it("gives Barbarian/Hunter/Marksman the base 5 pieces and nothing else — no shield, no bracelet", () => {
		for (const clas of ["barbarian", "hunter", "marksman"] as const) {
			expect(piecesForClass(clas)).toEqual(["chest", "shoulders", "legs", "helmet", "gauntlets"]);
		}
	});

	it("gives mages a robe + bracelet instead of separate chest/shoulders/legs or a shield", () => {
		for (const clas of ["conjurer", "warlock"] as const) {
			expect(piecesForClass(clas)).toEqual(["robe", "helmet", "gauntlets", "bracelet"]);
		}
	});
});

describe("createEmptyArmorBuild", () => {
	it("only populates the pieces the class is allowed to equip", () => {
		const build = createEmptyArmorBuild("conjurer");
		expect(Object.keys(build.pieces).sort()).toEqual(["bracelet", "gauntlets", "helmet", "robe"]);
	});
});

describe("nextQualityTier", () => {
	it("cycles Muito Ruim -> Ruim -> Normal -> Bom -> Muito Bom -> Muito Ruim", () => {
		expect(nextQualityTier("vb")).toBe("b");
		expect(nextQualityTier("b")).toBe("n");
		expect(nextQualityTier("n")).toBe("g");
		expect(nextQualityTier("g")).toBe("vg");
		expect(nextQualityTier("vg")).toBe("vb");
	});
});

describe("isMagicDamageType", () => {
	it("classifies fire/ice/electric as magic and the rest as physical", () => {
		expect(isMagicDamageType("fire")).toBe(true);
		expect(isMagicDamageType("ice")).toBe(true);
		expect(isMagicDamageType("electric")).toBe(true);
		expect(isMagicDamageType("slash")).toBe(false);
		expect(isMagicDamageType("pierce")).toBe(false);
		expect(isMagicDamageType("blunt")).toBe(false);
	});
});

function buildWithOnePiece(clas: ArmorBuild["clas"], pieceId: keyof ArmorBuild["pieces"], pba: number, bcmt: number): ArmorBuild {
	const build = createEmptyArmorBuild(clas);
	build.pieces[pieceId] = { ...emptyPieceState(), pba, bcmt };
	return build;
}

describe("computeProtection", () => {
	it("computes a single piece's contribution: ceil(pba * dist% * qualityFactor) + bcmt, then class multiplier", () => {
		// legs = 20% distribution, "normal" quality = 0.5 factor (the default).
		// 100 * 0.20 * 0.5 = 10 -> ceil = 10, + bcmt 0 = 10; barbarian mult = 1.40 -> 14.
		const build = buildWithOnePiece("barbarian", "legs", 100, 0);
		const protection = computeProtection(build);
		expect(protection.slash).toBe(14);
		// every damage type defaults to "normal" quality, so all 6 match.
		expect(protection.fire).toBe(14);
	});

	it("adds BCMT after the ceil, before the class multiplier", () => {
		// 10 (as above) + bcmt 5 = 15; * 1.40 = 21.
		const build = buildWithOnePiece("barbarian", "legs", 100, 5);
		expect(computeProtection(build).slash).toBe(21);
	});

	it("applies armorBonusPct proportionally before the class multiplier", () => {
		// 10 * 1.5 (50% bonus) = 15; * 1.40 = 21.
		const build = buildWithOnePiece("barbarian", "legs", 100, 0);
		build.armorBonusPct = 50;
		expect(computeProtection(build).slash).toBe(21);
	});

	it("differs by class multiplier alone when the raw setup is identical", () => {
		// same 10 raw protection point, different classes' multipliers.
		const knight = buildWithOnePiece("knight", "legs", 100, 0);
		const hunter = buildWithOnePiece("hunter", "legs", 100, 0);
		expect(computeProtection(knight).slash).toBe(14); // 10 * 1.40
		expect(computeProtection(hunter).slash).toBe(13); // 10 * 1.30
	});

	it("sums contributions across multiple equipped pieces", () => {
		const build = createEmptyArmorBuild("knight");
		build.pieces.legs = { ...emptyPieceState(), pba: 100, bcmt: 0 }; // 20% * 0.5 -> 10 raw
		build.pieces.chest = { ...emptyPieceState(), pba: 100, bcmt: 0 }; // 28% * 0.5 -> 14 raw
		// (10 + 14) * 1.40 = 33.6
		expect(computeProtection(build).slash).toBeCloseTo(33.6, 9);
	});

	it("lets quality vary independently per damage type on the same piece", () => {
		const build = buildWithOnePiece("barbarian", "legs", 100, 0);
		build.pieces.legs!.quality.fire = "vg"; // 0.8 factor: 100*0.20*0.8=16 -> ceil 16 -> *1.4=22.4
		const protection = computeProtection(build);
		expect(protection.slash).toBe(14); // untouched, still "normal"
		expect(protection.fire).toBeCloseTo(22.4);
	});
});

describe("simulateIncomingDamage", () => {
	function baseBuild(): ArmorBuild {
		return createEmptyArmorBuild("knight");
	}

	it("subtracts protection directly from a single damage type's raw hit", () => {
		const build = baseBuild();
		const protection = { slash: 50, pierce: 0, blunt: 0, fire: 0, ice: 0, electric: 0 };
		// 200 - 50 = 150; well above the 4-8% floor (8-16), so no clamping.
		const result = simulateIncomingDamage(build, protection, "slash", 200);
		expect(result.finalLow).toBe(150);
		expect(result.finalHigh).toBe(150);
	});

	it("never lets damage drop below the 4-8% floor of the raw hit", () => {
		const build = baseBuild();
		const protection = { slash: 195, pierce: 0, blunt: 0, fire: 0, ice: 0, electric: 0 };
		// 200 - 195 = 5, below both the 4% (8) and 8% (16) floors.
		const result = simulateIncomingDamage(build, protection, "slash", 200);
		expect(result.finalLow).toBe(8);
		expect(result.finalHigh).toBe(16);
	});

	it("applies general and per-type resistance sequentially, not additively", () => {
		const build = baseBuild();
		build.resistancePhysicalPct = 10;
		build.resistanceByType.slash = 20;
		const protection = { slash: 0, pierce: 0, blunt: 0, fire: 0, ice: 0, electric: 0 };
		// 100 -> -10% general = 90 -> -20% type = 72; well above the floor.
		const result = simulateIncomingDamage(build, protection, "slash", 100);
		expect(result.finalLow).toBe(72);
		expect(result.finalHigh).toBe(72);
	});

	it("uses magic resistance (not physical) for fire/ice/electric hits", () => {
		const build = baseBuild();
		build.resistancePhysicalPct = 50; // must NOT apply to a magic hit
		build.resistanceMagicPct = 10;
		const protection = { slash: 0, pierce: 0, blunt: 0, fire: 0, ice: 0, electric: 0 };
		const result = simulateIncomingDamage(build, protection, "fire", 100);
		expect(result.finalLow).toBe(90);
		expect(result.finalHigh).toBe(90);
	});

	it("applies damageReductionPct last, on top of the resistance-reduced damage", () => {
		const build = baseBuild();
		build.resistancePhysicalPct = 10;
		build.resistanceByType.slash = 20;
		build.damageReductionPct = 25;
		const protection = { slash: 0, pierce: 0, blunt: 0, fire: 0, ice: 0, electric: 0 };
		// 72 (as above) * 0.75 = 54.
		const result = simulateIncomingDamage(build, protection, "slash", 100);
		expect(result.finalLow).toBe(54);
		expect(result.finalHigh).toBe(54);
	});
});
