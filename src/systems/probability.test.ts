import { describe, expect, test } from "bun:test";
import { createTestState, makeTask } from "../test-utils";
import { calculateSuccessProbability } from "./probability";

describe("calculateSuccessProbability", () => {
	test("returns base rate when all modifiers are neutral", () => {
		const task = makeTask();
		const state = createTestState({
			energy: 0.5,
			momentum: 0.5,
			timeBlock: "evening",
		});

		const probability = calculateSuccessProbability(task, state);

		// evening = 1.0x, momentum 0.5 = 1.0x, energy 0.5 = 1.0x
		expect(probability).toBeCloseTo(0.5, 2);
	});

	test("applies night bonus (2am spike)", () => {
		const task = makeTask();
		const state = createTestState({ timeBlock: "night" });

		const probability = calculateSuccessProbability(task, state);

		// neutral night bonus varies by seed: 1.20 to 1.30
		expect(probability).toBeGreaterThanOrEqual(0.5 * 1.2);
		expect(probability).toBeLessThanOrEqual(0.5 * 1.3);
	});

	test("applies morning boost", () => {
		const task = makeTask();
		const state = createTestState({ timeBlock: "morning" });

		const probability = calculateSuccessProbability(task, state);

		// morning = 1.1x
		expect(probability).toBeGreaterThan(0.5);
	});

	test("applies afternoon penalty", () => {
		const task = makeTask();
		const state = createTestState({ timeBlock: "afternoon" });

		const probability = calculateSuccessProbability(task, state);

		// afternoon = 0.9x
		expect(probability).toBeLessThan(0.5);
	});

	test("high momentum increases probability", () => {
		const task = makeTask();
		const lowMomentum = createTestState({ momentum: 0, timeBlock: "evening" });
		const highMomentum = createTestState({ momentum: 1, timeBlock: "evening" });

		const lowProb = calculateSuccessProbability(task, lowMomentum);
		const highProb = calculateSuccessProbability(task, highMomentum);

		expect(highProb).toBeGreaterThan(lowProb);
	});

	test("high energy increases probability", () => {
		const task = makeTask();
		const lowEnergy = createTestState({ energy: 0, timeBlock: "evening" });
		const highEnergy = createTestState({ energy: 1, timeBlock: "evening" });

		const lowProb = calculateSuccessProbability(task, lowEnergy);
		const highProb = calculateSuccessProbability(task, highEnergy);

		expect(highProb).toBeGreaterThan(lowProb);
	});

	test("clamps probability to valid range", () => {
		// Very high base rate with all positive modifiers
		const task = makeTask({ baseRate: 0.9 });
		const state = createTestState({
			timeBlock: "night",
			momentum: 1,
			energy: 1,
		});

		const probability = calculateSuccessProbability(task, state);

		expect(probability).toBeLessThanOrEqual(1);
		expect(probability).toBeGreaterThanOrEqual(0);
	});

	test("aspirational tasks remain difficult", () => {
		// Even with all bonuses, a 5% base rate task should be hard
		const task = makeTask({ baseRate: 0.05 });
		const state = createTestState({
			timeBlock: "night",
			momentum: 1,
			energy: 1,
		});

		const probability = calculateSuccessProbability(task, state);

		// Should still be relatively low
		expect(probability).toBeLessThan(0.2);
	});
});
