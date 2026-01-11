import { describe, expect, test } from "bun:test";
import type { GameState, Task } from "../state";
import { calculateSleepQuality } from "./sleep";

/** Creates a minimal task for testing. */
function makeTask(overrides: Partial<Task> = {}): Task {
	return {
		id: "test",
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

/** Creates a minimal game state for testing. */
function makeState(tasks: Task[], momentum = 0.5): GameState {
	return {
		day: "monday",
		dayIndex: 0,
		timeBlock: "morning",
		slotsRemaining: 3,
		weekendPointsRemaining: 8,
		tasks,
		selectedTaskId: null,
		screen: "game",
		energy: 0.5,
		momentum,
		runSeed: 12345,
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

	test("not eating gives energy penalty", () => {
		const tasks = [
			makeTask({ id: "cook", category: "food", succeededToday: false }),
		];
		const state = makeState(tasks);

		const result = calculateSleepQuality(state);

		expect(result.energy).toBeLessThan(0);
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

	test("failing dog walk gives momentum penalty", () => {
		const tasks = [
			makeTask({
				id: "walk-dog",
				category: "dog",
				attemptedToday: true,
				succeededToday: false,
			}),
		];
		const state = makeState(tasks);

		const result = calculateSleepQuality(state);

		expect(result.momentum).toBeLessThan(0);
	});

	test("multiple successes give momentum boost", () => {
		const tasks = [
			makeTask({ id: "task1", succeededToday: true }),
			makeTask({ id: "task2", succeededToday: true }),
			makeTask({ id: "task3", succeededToday: true }),
		];
		const state = makeState(tasks);

		const result = calculateSleepQuality(state);

		expect(result.momentum).toBeGreaterThan(0);
	});

	test("low momentum day gives penalties", () => {
		const tasks: Task[] = [];
		const state = makeState(tasks, 0.2); // low momentum

		const result = calculateSleepQuality(state);

		expect(result.energy).toBeLessThan(0);
		expect(result.momentum).toBeLessThan(0);
	});
});
