import { describe, expect, test } from "bun:test";
import { createInitialState, type GameState, type Task } from "../state";
import {
	applyEnergyChange,
	applyEnergyDecay,
	calculateFriendRescueEnergyEffect,
	calculateTaskEnergyEffect,
	ENERGY_DECAY_BASE,
	ENERGY_DECAY_VARIANCE,
	getEnergyDecayPerBlock,
	getFailureEnergyCost,
	getSaturdayWorkPenalty,
	getScrollTrapEnergyCost,
	isSocialTask,
	SATURDAY_WORK_PENALTY_BASE,
	SATURDAY_WORK_PENALTY_VARIANCE,
	SCROLL_TRAP_BASE,
	SCROLL_TRAP_VARIANCE,
} from "./energy";

function createTestState(overrides: Partial<GameState> = {}): GameState {
	return {
		...createInitialState(),
		personality: { time: "neutral", social: "neutral" },
		...overrides,
	};
}

function makeTask(overrides: Partial<Task> = {}): Task {
	return {
		id: "dishes",
		name: "Test Task",
		category: "chores",
		baseRate: 0.5,
		availableBlocks: ["morning", "afternoon", "evening", "night"],
		failureCount: 0,
		attemptedToday: false,
		succeededToday: false,
		...overrides,
	};
}

describe("seeded energy constants", () => {
	test("energy decay base is 2% with 0.5% variance", () => {
		expect(ENERGY_DECAY_BASE).toBe(0.02);
		expect(ENERGY_DECAY_VARIANCE).toBe(0.005);
	});

	test("energy decay varies by seed within range", () => {
		for (let i = 0; i < 100; i++) {
			const decay = getEnergyDecayPerBlock(i * 12345);
			expect(decay).toBeGreaterThanOrEqual(0.015);
			expect(decay).toBeLessThanOrEqual(0.025);
		}
	});

	test("same seed gives same energy decay", () => {
		const d1 = getEnergyDecayPerBlock(42);
		const d2 = getEnergyDecayPerBlock(42);
		expect(d1).toBe(d2);
	});

	test("scroll trap base is 3% with 1% variance", () => {
		expect(SCROLL_TRAP_BASE).toBe(0.03);
		expect(SCROLL_TRAP_VARIANCE).toBe(0.01);
	});

	test("scroll trap cost varies by seed within range", () => {
		for (let i = 0; i < 100; i++) {
			const cost = getScrollTrapEnergyCost(i * 12345);
			expect(cost).toBeGreaterThanOrEqual(0.02);
			expect(cost).toBeLessThanOrEqual(0.04);
		}
	});

	test("failure cost varies by seed within range", () => {
		for (let i = 0; i < 100; i++) {
			const cost = getFailureEnergyCost(i * 12345);
			expect(cost).toBeGreaterThanOrEqual(0.015);
			expect(cost).toBeLessThanOrEqual(0.025);
		}
	});
});

describe("isSocialTask", () => {
	test("returns true for social category", () => {
		const task = makeTask({ category: "social" });
		expect(isSocialTask(task)).toBe(true);
	});

	test("returns false for non-social categories", () => {
		expect(isSocialTask(makeTask({ category: "chores" }))).toBe(false);
		expect(isSocialTask(makeTask({ category: "dog" }))).toBe(false);
		expect(isSocialTask(makeTask({ category: "creative" }))).toBe(false);
	});
});

describe("calculateTaskEnergyEffect", () => {
	test("default success has no energy effect", () => {
		const task = makeTask();
		const state = createTestState();
		expect(calculateTaskEnergyEffect(task, true, state)).toBe(0);
	});

	test("default failure costs energy (seeded)", () => {
		const task = makeTask();
		const state = createTestState();
		const effect = calculateTaskEnergyEffect(task, false, state);
		// Failure cost varies by seed: -0.015 to -0.025
		expect(effect).toBeLessThanOrEqual(-0.015);
		expect(effect).toBeGreaterThanOrEqual(-0.025);
	});

	test("task with custom success effect uses it (seeded)", () => {
		const task = makeTask({
			id: "walk-dog",
			energyEffect: { success: 0.04 },
		});
		const state = createTestState();
		const effect = calculateTaskEnergyEffect(task, true, state);
		// Task energy effects vary +/-20%: 0.032 to 0.048
		expect(effect).toBeGreaterThanOrEqual(0.032);
		expect(effect).toBeLessThanOrEqual(0.048);
	});

	test("task with custom failure effect uses it", () => {
		const task = makeTask({
			energyEffect: { failure: -0.05 },
		});
		const state = createTestState();
		expect(calculateTaskEnergyEffect(task, false, state)).toBe(-0.05);
	});

	test("hermit gets bonus on solo task success", () => {
		const task = makeTask({ category: "chores" });
		const state = createTestState({
			personality: { time: "neutral", social: "hermit" },
		});
		// Base 0 + hermit solo bonus 0.02 = 0.02
		expect(calculateTaskEnergyEffect(task, true, state)).toBe(0.02);
	});

	test("hermit pays energy on social task success", () => {
		const task = makeTask({ category: "social" });
		const state = createTestState({
			personality: { time: "neutral", social: "hermit" },
		});
		// Base 0 + hermit social penalty -0.02 = -0.02
		expect(calculateTaskEnergyEffect(task, true, state)).toBe(-0.02);
	});

	test("socialBattery gets bonus on social task success", () => {
		const task = makeTask({ category: "social" });
		const state = createTestState({
			personality: { time: "neutral", social: "socialBattery" },
		});
		// Base 0 + socialBattery social bonus 0.03 = 0.03
		expect(calculateTaskEnergyEffect(task, true, state)).toBe(0.03);
	});
});

describe("calculateFriendRescueEnergyEffect", () => {
	test("neutral gets +10%", () => {
		const state = createTestState({
			personality: { time: "neutral", social: "neutral" },
		});
		expect(calculateFriendRescueEnergyEffect(state)).toBe(0.1);
	});

	test("socialBattery gets +12%", () => {
		const state = createTestState({
			personality: { time: "neutral", social: "socialBattery" },
		});
		expect(calculateFriendRescueEnergyEffect(state)).toBe(0.12);
	});

	test("hermit pays -3%", () => {
		const state = createTestState({
			personality: { time: "neutral", social: "hermit" },
		});
		expect(calculateFriendRescueEnergyEffect(state)).toBe(-0.03);
	});
});

describe("applyEnergyDecay", () => {
	test("reduces energy by seeded decay amount", () => {
		const seed = 12345;
		const decay = getEnergyDecayPerBlock(seed);
		expect(applyEnergyDecay(0.6, seed)).toBeCloseTo(0.6 - decay);
	});

	test("clamps to 0", () => {
		// Use seed that gives max decay (0.025) to ensure clamping
		expect(applyEnergyDecay(0.01, 12345)).toBe(0);
	});
});

describe("applyEnergyChange", () => {
	test("applies positive change", () => {
		expect(applyEnergyChange(0.5, 0.1)).toBe(0.6);
	});

	test("applies negative change", () => {
		expect(applyEnergyChange(0.5, -0.1)).toBe(0.4);
	});

	test("clamps to 0", () => {
		expect(applyEnergyChange(0.1, -0.5)).toBe(0);
	});

	test("clamps to 1", () => {
		expect(applyEnergyChange(0.9, 0.5)).toBe(1);
	});
});

describe("getSaturdayWorkPenalty", () => {
	test("varies by seed within range (8-12%)", () => {
		const minPenalty =
			SATURDAY_WORK_PENALTY_BASE - SATURDAY_WORK_PENALTY_VARIANCE;
		const maxPenalty =
			SATURDAY_WORK_PENALTY_BASE + SATURDAY_WORK_PENALTY_VARIANCE;
		for (let i = 0; i < 100; i++) {
			const penalty = getSaturdayWorkPenalty(i * 12345);
			expect(penalty).toBeGreaterThanOrEqual(minPenalty);
			expect(penalty).toBeLessThanOrEqual(maxPenalty);
		}
	});

	test("same seed gives same penalty", () => {
		const p1 = getSaturdayWorkPenalty(42);
		const p2 = getSaturdayWorkPenalty(42);
		expect(p1).toBe(p2);
	});

	test("base and variance are correct", () => {
		expect(SATURDAY_WORK_PENALTY_BASE).toBe(0.1);
		expect(SATURDAY_WORK_PENALTY_VARIANCE).toBe(0.02);
	});
});
