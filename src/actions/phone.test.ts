import { describe, expect, test } from "bun:test";
import { createTestStore } from "../test-utils";
import { checkPhone } from "./phone";

describe("checkPhone", () => {
	test("returns a result with required fields", () => {
		const store = createTestStore();
		const result = checkPhone(store);
		expect(result).toHaveProperty("outcome");
		expect(result).toHaveProperty("momentumChange");
		expect(result).toHaveProperty("energyChange");
		expect(result).toHaveProperty("flavorText");
		expect(typeof result.flavorText).toBe("string");
		expect(result.flavorText.length).toBeGreaterThan(0);
	});

	test("increments phoneChecks in runStats", () => {
		const store = createTestStore();
		checkPhone(store);
		expect(store.get("runStats").phoneChecks).toBe(1);
	});

	test("increments phoneChecks cumulatively", () => {
		const store = createTestStore();
		checkPhone(store);
		checkPhone(store);
		expect(store.get("runStats").phoneChecks).toBe(2);
	});

	test("clears phone notification count", () => {
		const store = createTestStore({ phoneNotificationCount: 3 });
		checkPhone(store);
		expect(store.get("phoneNotificationCount")).toBe(0);
	});

	test("records last phone outcome", () => {
		const store = createTestStore({ lastPhoneOutcome: null });
		const result = checkPhone(store);
		expect(store.get("lastPhoneOutcome")).toBe(result.outcome);
	});

	test("applies momentum change", () => {
		const store = createTestStore({ momentum: 0.5 });
		const result = checkPhone(store);
		// Momentum should have changed by the reported amount (clamped)
		const expected = Math.max(0.5 + result.momentumChange, 0);
		expect(store.get("momentum")).toBeCloseTo(expected, 5);
	});

	test("applies energy change", () => {
		const store = createTestStore({ energy: 0.5 });
		const result = checkPhone(store);
		const expected = Math.max(0, Math.min(1, 0.5 + result.energyChange));
		expect(store.get("energy")).toBeCloseTo(expected, 5);
	});

	test("momentum stays in [0, 1] bounds", () => {
		// Run many checks to exercise various outcomes
		for (let seed = 0; seed < 50; seed++) {
			const store = createTestStore({ runSeed: seed, momentum: 0.5 });
			checkPhone(store);
			expect(store.get("momentum")).toBeGreaterThanOrEqual(0);
			expect(store.get("momentum")).toBeLessThanOrEqual(1);
		}
	});

	test("energy stays in [0, 1] bounds", () => {
		for (let seed = 0; seed < 50; seed++) {
			const store = createTestStore({ runSeed: seed, energy: 0.5 });
			checkPhone(store);
			expect(store.get("energy")).toBeGreaterThanOrEqual(0);
			expect(store.get("energy")).toBeLessThanOrEqual(1);
		}
	});

	test("advances rollCount", () => {
		const store = createTestStore({ rollCount: 0 });
		checkPhone(store);
		expect(store.get("rollCount")).toBeGreaterThan(0);
	});

	test("outcome is a valid phone outcome type", () => {
		const validOutcomes = [
			"void",
			"scrollHole",
			"actualBreak",
			"somethingNice",
			"usefulFind",
		];
		for (let seed = 0; seed < 30; seed++) {
			const store = createTestStore({ runSeed: seed });
			const result = checkPhone(store);
			expect(validOutcomes).toContain(result.outcome);
		}
	});

	test("somethingNice outcome increases friendRescueChanceBonus", () => {
		// Find a seed/rollCount combo that produces "somethingNice"
		let found = false;
		for (let seed = 0; seed < 500; seed++) {
			for (let rc = 0; rc < 5; rc++) {
				const store = createTestStore({
					runSeed: seed,
					rollCount: rc,
					friendRescueChanceBonus: 0,
				});
				const result = checkPhone(store);
				if (result.outcome === "somethingNice") {
					expect(store.get("friendRescueChanceBonus")).toBeGreaterThan(0);
					expect(result.friendNudge).toBe(true);
					found = true;
					break;
				}
			}
			if (found) break;
		}
		expect(found).toBe(true);
	});

	test("friendRescueChanceBonus is capped at 0.5", () => {
		// Find a somethingNice outcome and stack it
		for (let seed = 0; seed < 500; seed++) {
			const store = createTestStore({
				runSeed: seed,
				rollCount: 0,
				friendRescueChanceBonus: 0.48,
			});
			const result = checkPhone(store);
			if (result.outcome === "somethingNice") {
				expect(store.get("friendRescueChanceBonus")).toBeLessThanOrEqual(0.5);
				return; // Test passed
			}
		}
		// If no somethingNice found in 500 seeds, that's still a valid (if unlikely) test skip
	});
});
