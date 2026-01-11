import { describe, expect, test } from "bun:test";
import type { GameState, Task } from "../state";
import { calculateSuccessProbability } from "./probability";

/** Creates a minimal task for testing. */
function makeTask(baseRate: number): Task {
	return {
		id: "test",
		name: "Test Task",
		category: "chores",
		baseRate,
		availableBlocks: ["morning", "afternoon", "evening", "night"],
		failureCount: 0,
		attemptedToday: false,
		succeededToday: false,
	};
}

/** Creates a minimal game state for testing. */
function makeState(overrides: Partial<GameState> = {}): GameState {
	return {
		day: "monday",
		dayIndex: 0,
		timeBlock: "morning",
		slotsRemaining: 3,
		weekendPointsRemaining: 8,
		tasks: [],
		selectedTaskId: null,
		screen: "game",
		energy: 0.5,
		momentum: 0.5,
		...overrides,
	};
}

describe("calculateSuccessProbability", () => {
	test("returns base rate when all modifiers are neutral", () => {
		const task = makeTask(0.5);
		const state = makeState({
			energy: 0.5,
			momentum: 0.5,
			timeBlock: "evening",
		});

		const probability = calculateSuccessProbability(task, state);

		// evening = 1.0x, momentum 0.5 = 1.0x, energy 0.5 = 1.0x
		expect(probability).toBeCloseTo(0.5, 2);
	});

	test("applies night bonus (2am spike)", () => {
		const task = makeTask(0.5);
		const state = makeState({ timeBlock: "night" });

		const probability = calculateSuccessProbability(task, state);

		// night = 1.25x
		expect(probability).toBeGreaterThan(0.5);
		expect(probability).toBeCloseTo(0.5 * 1.25, 2);
	});

	test("applies morning boost", () => {
		const task = makeTask(0.5);
		const state = makeState({ timeBlock: "morning" });

		const probability = calculateSuccessProbability(task, state);

		// morning = 1.1x
		expect(probability).toBeGreaterThan(0.5);
	});

	test("applies afternoon penalty", () => {
		const task = makeTask(0.5);
		const state = makeState({ timeBlock: "afternoon" });

		const probability = calculateSuccessProbability(task, state);

		// afternoon = 0.9x
		expect(probability).toBeLessThan(0.5);
	});

	test("high momentum increases probability", () => {
		const task = makeTask(0.5);
		const lowMomentum = makeState({ momentum: 0, timeBlock: "evening" });
		const highMomentum = makeState({ momentum: 1, timeBlock: "evening" });

		const lowProb = calculateSuccessProbability(task, lowMomentum);
		const highProb = calculateSuccessProbability(task, highMomentum);

		expect(highProb).toBeGreaterThan(lowProb);
	});

	test("high energy increases probability", () => {
		const task = makeTask(0.5);
		const lowEnergy = makeState({ energy: 0, timeBlock: "evening" });
		const highEnergy = makeState({ energy: 1, timeBlock: "evening" });

		const lowProb = calculateSuccessProbability(task, lowEnergy);
		const highProb = calculateSuccessProbability(task, highEnergy);

		expect(highProb).toBeGreaterThan(lowProb);
	});

	test("clamps probability to valid range", () => {
		// Very high base rate with all positive modifiers
		const task = makeTask(0.9);
		const state = makeState({
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
		const task = makeTask(0.05);
		const state = makeState({
			timeBlock: "night",
			momentum: 1,
			energy: 1,
		});

		const probability = calculateSuccessProbability(task, state);

		// Should still be relatively low
		expect(probability).toBeLessThan(0.2);
	});
});
