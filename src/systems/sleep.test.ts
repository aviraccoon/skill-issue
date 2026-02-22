import { describe, expect, test } from "bun:test";
import { createInitialState, type GameState, type Task } from "../state";
import { calculateSleepQuality } from "./sleep";

/** Creates a minimal task for testing. */
function makeTask(overrides: Partial<Task> = {}): Task {
	return {
		id: "dishes",
		name: "Test Task",
		category: "chores",
		baseRate: 0.5,
		availableBlocks: ["morning", "afternoon", "evening", "night"],
		failureCount: 0,
		successCount: 0,
		attemptedToday: false,
		succeededToday: false,
		...overrides,
	};
}

/** Creates a game state for testing with sensible defaults. */
function makeState(tasks: Task[], momentum = 0.5): GameState {
	return {
		...createInitialState(),
		tasks,
		momentum,
	};
}

describe("calculateSleepQuality", () => {
	test("eating food gives energy and momentum boost", () => {
		const tasks = [
			makeTask({ id: "cook", category: "food", succeededToday: true }),
		];
		const state = makeState(tasks);

		const result = calculateSleepQuality(state);

		expect(result.energy).toBeGreaterThan(0);
		expect(result.momentum).toBeGreaterThan(0);
	});

	test("not eating hits the recovery floor instead of going negative", () => {
		const tasks = [
			makeTask({ id: "cook", category: "food", succeededToday: false }),
		];
		const state = makeState(tasks);

		const result = calculateSleepQuality(state);

		// Without floor this would be -0.1. Floor clamps to seed-varied minimum.
		expect(result.energy).toBeGreaterThanOrEqual(0);
		expect(result.energy).toBeLessThan(0.1);
	});

	test("walking dog gives boost", () => {
		const tasks = [
			// Need to eat to avoid energy penalty
			makeTask({ id: "cook", category: "food", succeededToday: true }),
			makeTask({ id: "walk-dog", category: "dog", succeededToday: true }),
		];
		const state = makeState(tasks);

		const result = calculateSleepQuality(state);

		// +0.1 from food + 0.05 from dog = 0.15
		expect(result.energy).toBeGreaterThan(0.1);
		// +0.05 from food + 0.05 from dog = 0.1
		expect(result.momentum).toBeGreaterThan(0);
	});

	test("failing dog walk gives less momentum than succeeding", () => {
		const failedWalk = [
			makeTask({
				id: "walk-dog",
				category: "dog",
				attemptedToday: true,
				succeededToday: false,
			}),
		];
		const failState = makeState(failedWalk);
		const failResult = calculateSleepQuality(failState);

		const succeededWalk = [
			makeTask({
				id: "walk-dog",
				category: "dog",
				attemptedToday: true,
				succeededToday: true,
			}),
		];
		const successState = makeState(succeededWalk);
		const successResult = calculateSleepQuality(successState);

		// Failed walk should give less momentum than succeeded walk
		expect(failResult.momentum).toBeLessThan(successResult.momentum);
	});

	test("multiple successes give momentum boost", () => {
		const tasks = [
			makeTask({ id: "dishes", succeededToday: true }),
			makeTask({ id: "shower", succeededToday: true }),
			makeTask({ id: "work", succeededToday: true }),
		];
		const state = makeState(tasks);

		const result = calculateSleepQuality(state);

		expect(result.momentum).toBeGreaterThan(0);
	});

	test("low momentum day hits floors for both energy and momentum", () => {
		const tasks: Task[] = [];
		const state = makeState(tasks, 0.2); // low momentum

		const result = calculateSleepQuality(state);

		// Both would be deeply negative without floors, clamped to seed-varied minimums
		expect(result.energy).toBeGreaterThanOrEqual(0);
		expect(result.energy).toBeLessThan(0.1);
		expect(result.momentum).toBeGreaterThanOrEqual(0);
		expect(result.momentum).toBeLessThan(0.05);
	});
});
