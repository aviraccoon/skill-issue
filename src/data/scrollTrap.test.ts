import { describe, expect, test } from "bun:test";
import { createInitialState } from "../state";
import { createStore } from "../store";
import {
	getAdjustedWeights,
	selectPhoneOutcome,
	tryUnlockVariantViaPhone,
} from "./scrollTrap";

describe("Phone outcome weights", () => {
	test("base weights sum to 100", () => {
		const state = createInitialState();
		// Set neutral state (high energy/momentum, not night)
		state.energy = 0.6;
		state.momentum = 0.6;
		state.timeBlock = "morning";

		const weights = getAdjustedWeights(state);
		const total = Object.values(weights).reduce((sum, w) => sum + w, 0);

		expect(total).toBe(100);
	});

	test("low energy increases scroll hole weight", () => {
		const baseState = createInitialState();
		baseState.energy = 0.6;
		baseState.momentum = 0.6;
		baseState.timeBlock = "morning";

		const lowEnergyState = { ...baseState, energy: 0.2 };

		const baseWeights = getAdjustedWeights(baseState);
		const lowEnergyWeights = getAdjustedWeights(lowEnergyState);

		expect(lowEnergyWeights.scrollHole).toBeGreaterThan(baseWeights.scrollHole);
		expect(lowEnergyWeights.actualBreak).toBeLessThan(baseWeights.actualBreak);
	});

	test("low momentum increases scroll hole weight", () => {
		const baseState = createInitialState();
		baseState.energy = 0.6;
		baseState.momentum = 0.6;
		baseState.timeBlock = "morning";

		const lowMomentumState = { ...baseState, momentum: 0.2 };

		const baseWeights = getAdjustedWeights(baseState);
		const lowMomentumWeights = getAdjustedWeights(lowMomentumState);

		expect(lowMomentumWeights.scrollHole).toBeGreaterThan(
			baseWeights.scrollHole,
		);
		expect(lowMomentumWeights.void).toBeLessThan(baseWeights.void);
	});

	test("night time increases scroll hole weight", () => {
		const baseState = createInitialState();
		baseState.energy = 0.6;
		baseState.momentum = 0.6;
		baseState.timeBlock = "morning";

		const nightState = { ...baseState, timeBlock: "night" as const };

		const baseWeights = getAdjustedWeights(baseState);
		const nightWeights = getAdjustedWeights(nightState);

		expect(nightWeights.scrollHole).toBeGreaterThan(baseWeights.scrollHole);
	});

	test("weights never go below 1", () => {
		// Create worst case scenario
		const state = createInitialState();
		state.energy = 0.1;
		state.momentum = 0.1;
		state.timeBlock = "night";

		const weights = getAdjustedWeights(state);

		for (const weight of Object.values(weights)) {
			expect(weight).toBeGreaterThanOrEqual(1);
		}
	});
});

describe("Phone outcome selection", () => {
	test("deterministic with same seed and rollCount", () => {
		const state1 = createInitialState();
		state1.runSeed = 12345;
		state1.rollCount = 0;
		const store1 = createStore(state1);

		const state2 = createInitialState();
		state2.runSeed = 12345;
		state2.rollCount = 0;
		const store2 = createStore(state2);

		const outcome1 = selectPhoneOutcome(store1);
		const outcome2 = selectPhoneOutcome(store2);

		expect(outcome1).toBe(outcome2);
	});

	test("distribution roughly matches weights over many seeds", () => {
		const counts = {
			void: 0,
			scrollHole: 0,
			actualBreak: 0,
			somethingNice: 0,
			usefulFind: 0,
		};

		// Run many simulations with different seeds
		for (let seed = 0; seed < 1000; seed++) {
			const state = createInitialState();
			state.runSeed = seed;
			state.energy = 0.5;
			state.momentum = 0.5;
			state.timeBlock = "morning";
			const store = createStore(state);

			const outcome = selectPhoneOutcome(store);
			counts[outcome]++;
		}

		// Void should be most common (~50%)
		expect(counts.void).toBeGreaterThan(400);
		expect(counts.void).toBeLessThan(600);

		// Scroll hole should be second (~20%)
		expect(counts.scrollHole).toBeGreaterThan(150);
		expect(counts.scrollHole).toBeLessThan(300);

		// Useful find should be rare (~4%)
		expect(counts.usefulFind).toBeGreaterThan(10);
		expect(counts.usefulFind).toBeLessThan(80);
	});
});

describe("Variant unlock via phone", () => {
	test("requires 2+ failures on task", () => {
		const state = createInitialState();
		const showerTask = state.tasks.find((t) => t.id === "shower");
		if (showerTask) showerTask.failureCount = 1;
		state.runSeed = 12345;

		const store = createStore(state);
		const result = tryUnlockVariantViaPhone(store);

		// With only 1 failure, should not unlock
		expect(result).toBeUndefined();
	});

	test("skips already unlocked categories", () => {
		const state = createInitialState();
		// Give shower enough failures
		const showerTask = state.tasks.find((t) => t.id === "shower");
		if (showerTask) showerTask.failureCount = 5;
		// But mark hygiene as already unlocked
		state.variantsUnlocked = ["hygiene"];
		state.runSeed = 12345;

		const store = createStore(state);

		// Run multiple times to ensure hygiene is never returned
		for (let i = 0; i < 20; i++) {
			const result = tryUnlockVariantViaPhone(store);
			if (result) {
				expect(result).not.toBe("hygiene");
			}
		}
	});

	test("can unlock with 2+ failures and eligible category", () => {
		// Find a seed that triggers unlock
		let unlocked = false;

		for (let seed = 0; seed < 100; seed++) {
			const state = createInitialState();
			const showerTask = state.tasks.find((t) => t.id === "shower");
			if (showerTask) showerTask.failureCount = 5;
			state.runSeed = seed;

			const store = createStore(state);
			const result = tryUnlockVariantViaPhone(store);

			if (result === "hygiene") {
				unlocked = true;
				break;
			}
		}

		expect(unlocked).toBe(true);
	});
});
