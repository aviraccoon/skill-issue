import { describe, expect, test } from "bun:test";
import type { GameState } from "../state";
import { createTestStore, makeTask } from "../test-utils";
import { attemptTask, selectTask } from "./tasks";

describe("selectTask", () => {
	test("sets selectedTaskId in store", () => {
		const store = createTestStore();
		selectTask(store, "dishes");
		expect(store.get("selectedTaskId")).toBe("dishes");
	});

	test("can change selection", () => {
		const store = createTestStore();
		selectTask(store, "dishes");
		selectTask(store, "work");
		expect(store.get("selectedTaskId")).toBe("work");
	});
});

describe("attemptTask", () => {
	describe("guard conditions", () => {
		test("returns undefined for nonexistent task", () => {
			const store = createTestStore({ tasks: [makeTask()] });
			const result = attemptTask(store, "nonexistent");
			expect(result).toBeUndefined();
		});

		test("returns undefined for task that already succeeded today", () => {
			const task = makeTask({ succeededToday: true });
			const store = createTestStore({ tasks: [task] });
			const result = attemptTask(store, "dishes");
			expect(result).toBeUndefined();
		});

		test("returns undefined when no slots remaining (weekday)", () => {
			const store = createTestStore({
				tasks: [makeTask()],
				slotsRemaining: 0,
				dayIndex: 0, // Monday
			});
			const result = attemptTask(store, "dishes");
			expect(result).toBeUndefined();
		});

		test("returns undefined when no weekend points remaining", () => {
			const store = createTestStore({
				tasks: [makeTask()],
				dayIndex: 5, // Saturday
				weekendPointsRemaining: 0,
			});
			const result = attemptTask(store, "dishes");
			expect(result).toBeUndefined();
		});

		test("returns undefined when weekend points less than cost", () => {
			const task = makeTask({ weekendCost: 3 });
			const store = createTestStore({
				tasks: [task],
				dayIndex: 5,
				weekendPointsRemaining: 2,
			});
			const result = attemptTask(store, "dishes");
			expect(result).toBeUndefined();
		});

		test("does not mutate state when returning undefined", () => {
			const store = createTestStore({
				tasks: [makeTask()],
				slotsRemaining: 0,
			});
			const stateBefore = store.getState();
			attemptTask(store, "dishes");
			expect(store.getState()).toEqual(stateBefore);
		});
	});

	describe("first attempt guarantee", () => {
		test("always succeeds when firstAttemptAvailable is true", () => {
			const store = createTestStore({
				tasks: [makeTask({ baseRate: 0.01 })], // Very low rate
				firstAttemptAvailable: true,
				slotsRemaining: 3,
			});
			const result = attemptTask(store, "dishes");
			expect(result?.succeeded).toBe(true);
			expect(result?.probability).toBe(1);
		});

		test("clears firstAttemptAvailable after use", () => {
			const store = createTestStore({
				tasks: [makeTask()],
				firstAttemptAvailable: true,
				slotsRemaining: 3,
			});
			attemptTask(store, "dishes");
			expect(store.get("firstAttemptAvailable")).toBe(false);
		});
	});

	describe("on success", () => {
		// Use firstAttemptAvailable for guaranteed success
		function successStore(overrides: Partial<GameState> = {}) {
			return createTestStore({
				tasks: [makeTask()],
				firstAttemptAvailable: true,
				slotsRemaining: 3,
				momentum: 0.5,
				energy: 0.5,
				consecutiveFailures: 2,
				...overrides,
			});
		}

		test("returns succeeded: true", () => {
			const result = attemptTask(successStore(), "dishes");
			expect(result?.succeeded).toBe(true);
		});

		test("marks task as succeededToday and attemptedToday", () => {
			const store = successStore();
			attemptTask(store, "dishes");
			const task = store.get("tasks").find((t) => t.id === "dishes");
			expect(task?.succeededToday).toBe(true);
			expect(task?.attemptedToday).toBe(true);
		});

		test("increments task successCount", () => {
			const store = successStore();
			attemptTask(store, "dishes");
			const task = store.get("tasks").find((t) => t.id === "dishes");
			expect(task?.successCount).toBe(1);
		});

		test("does not increment failureCount", () => {
			const store = successStore();
			attemptTask(store, "dishes");
			const task = store.get("tasks").find((t) => t.id === "dishes");
			expect(task?.failureCount).toBe(0);
		});

		test("increases momentum", () => {
			const store = successStore();
			const before = store.get("momentum");
			attemptTask(store, "dishes");
			expect(store.get("momentum")).toBeGreaterThan(before);
		});

		test("resets consecutiveFailures to 0", () => {
			const store = successStore({ consecutiveFailures: 5 });
			attemptTask(store, "dishes");
			expect(store.get("consecutiveFailures")).toBe(0);
		});

		test("consumes a slot on weekday", () => {
			const store = successStore({ slotsRemaining: 3 });
			attemptTask(store, "dishes");
			expect(store.get("slotsRemaining")).toBe(2);
		});

		test("increments runStats.tasks.attempted and succeeded", () => {
			const store = successStore();
			attemptTask(store, "dishes");
			const stats = store.get("runStats");
			expect(stats.tasks.attempted).toBe(1);
			expect(stats.tasks.succeeded).toBe(1);
		});

		test("updates byTimeBlock stats on weekday", () => {
			const store = successStore({ timeBlock: "evening" });
			attemptTask(store, "dishes");
			const stats = store.get("runStats");
			expect(stats.byTimeBlock.evening.attempted).toBe(1);
			expect(stats.byTimeBlock.evening.succeeded).toBe(1);
		});

		test("skips byTimeBlock stats on weekend", () => {
			const store = successStore({
				dayIndex: 5,
				weekendPointsRemaining: 8,
			});
			attemptTask(store, "dishes");
			const stats = store.get("runStats");
			// Weekend doesn't update byTimeBlock
			expect(stats.byTimeBlock.evening.attempted).toBe(0);
		});

		test("updates byDay stats", () => {
			const store = successStore({ dayIndex: 2 });
			attemptTask(store, "dishes");
			const stats = store.get("runStats");
			expect(stats.byDay?.[2]?.attempted).toBe(1);
			expect(stats.byDay?.[2]?.succeeded).toBe(1);
		});
	});

	describe("on failure", () => {
		// Use baseRate: 0 for guaranteed failure
		function failStore(overrides: Partial<GameState> = {}) {
			return createTestStore({
				tasks: [makeTask({ baseRate: 0 })],
				slotsRemaining: 3,
				momentum: 0.5,
				energy: 0.5,
				consecutiveFailures: 0,
				...overrides,
			});
		}

		test("returns succeeded: false", () => {
			const result = attemptTask(failStore(), "dishes");
			expect(result?.succeeded).toBe(false);
		});

		test("marks task as attemptedToday but not succeededToday", () => {
			const store = failStore();
			attemptTask(store, "dishes");
			const task = store.get("tasks").find((t) => t.id === "dishes");
			expect(task?.attemptedToday).toBe(true);
			expect(task?.succeededToday).toBe(false);
		});

		test("increments failureCount", () => {
			const store = failStore();
			attemptTask(store, "dishes");
			const task = store.get("tasks").find((t) => t.id === "dishes");
			expect(task?.failureCount).toBe(1);
		});

		test("does not increment successCount", () => {
			const store = failStore();
			attemptTask(store, "dishes");
			const task = store.get("tasks").find((t) => t.id === "dishes");
			expect(task?.successCount).toBe(0);
		});

		test("decreases momentum", () => {
			const store = failStore();
			const before = store.get("momentum");
			attemptTask(store, "dishes");
			expect(store.get("momentum")).toBeLessThan(before);
		});

		test("increments consecutiveFailures", () => {
			const store = failStore({ consecutiveFailures: 1 });
			attemptTask(store, "dishes");
			expect(store.get("consecutiveFailures")).toBe(2);
		});

		test("consumes a slot on weekday", () => {
			const store = failStore({ slotsRemaining: 3 });
			attemptTask(store, "dishes");
			expect(store.get("slotsRemaining")).toBe(2);
		});

		test("increments runStats.tasks.attempted but not succeeded", () => {
			const store = failStore();
			attemptTask(store, "dishes");
			const stats = store.get("runStats");
			expect(stats.tasks.attempted).toBe(1);
			expect(stats.tasks.succeeded).toBe(0);
		});
	});

	describe("linked tasks (autoSatisfies)", () => {
		test("marks linked task as succeeded on success", () => {
			const walkDog = makeTask({
				id: "walk-dog",
				name: "Walk Dog",
				autoSatisfies: "go-outside",
			});
			const goOutside = makeTask({
				id: "go-outside",
				name: "Go Outside",
			});
			const store = createTestStore({
				tasks: [walkDog, goOutside],
				firstAttemptAvailable: true,
				slotsRemaining: 3,
			});
			attemptTask(store, "walk-dog");
			const linked = store.get("tasks").find((t) => t.id === "go-outside");
			expect(linked?.succeededToday).toBe(true);
		});

		test("does not mark linked task on failure", () => {
			const walkDog = makeTask({
				id: "walk-dog",
				name: "Walk Dog",
				baseRate: 0,
				autoSatisfies: "go-outside",
			});
			const goOutside = makeTask({
				id: "go-outside",
				name: "Go Outside",
			});
			const store = createTestStore({
				tasks: [walkDog, goOutside],
				slotsRemaining: 3,
			});
			attemptTask(store, "walk-dog");
			const linked = store.get("tasks").find((t) => t.id === "go-outside");
			expect(linked?.succeededToday).toBe(false);
		});
	});

	describe("weekend behavior", () => {
		test("consumes weekend points instead of slots", () => {
			const store = createTestStore({
				tasks: [makeTask()],
				firstAttemptAvailable: true,
				dayIndex: 5, // Saturday
				weekendPointsRemaining: 8,
				slotsRemaining: 3,
			});
			attemptTask(store, "dishes");
			expect(store.get("weekendPointsRemaining")).toBe(7);
			expect(store.get("slotsRemaining")).toBe(3); // Unchanged
		});

		test("respects weekendCost for multi-cost tasks", () => {
			const task = makeTask({ weekendCost: 3 });
			const store = createTestStore({
				tasks: [task],
				firstAttemptAvailable: true,
				dayIndex: 5,
				weekendPointsRemaining: 8,
			});
			attemptTask(store, "dishes");
			expect(store.get("weekendPointsRemaining")).toBe(5);
		});

		test("applies Saturday work penalty on work task success", () => {
			const workTask = makeTask({
				id: "work",
				category: "work",
			});
			const store = createTestStore({
				tasks: [workTask],
				firstAttemptAvailable: true,
				dayIndex: 5, // Saturday
				day: "saturday",
				weekendPointsRemaining: 8,
				energy: 0.8,
			});
			const energyBefore = store.get("energy");
			attemptTask(store, "work");
			// Energy should decrease from the penalty (on top of normal task energy effect)
			expect(store.get("energy")).toBeLessThan(energyBefore);
		});
	});

	describe("variant usage", () => {
		test("uses variant baseRate when useVariant is true", () => {
			const task = makeTask({
				baseRate: 0, // Would always fail
				minimalVariant: {
					name: "Quick Rinse",
					baseRate: 1.0, // Would always succeed
					unlockHints: ["Try the quick version"],
				},
			});
			const store = createTestStore({
				tasks: [task],
				slotsRemaining: 3,
			});
			// With variant baseRate of 1.0, probability is very high
			const result = attemptTask(store, "dishes", undefined, true);
			expect(result?.succeeded).toBe(true);
		});

		test("tracks variant usage in runStats", () => {
			const task = makeTask({
				minimalVariant: {
					name: "Quick Rinse",
					baseRate: 1.0,
					unlockHints: [],
				},
			});
			const store = createTestStore({
				tasks: [task],
				firstAttemptAvailable: true,
				slotsRemaining: 3,
			});
			attemptTask(store, "dishes", undefined, true);
			expect(store.get("runStats").variantsUsed).toContain("chores");
		});

		test("does not track variant when not using variant", () => {
			const store = createTestStore({
				tasks: [makeTask()],
				firstAttemptAvailable: true,
				slotsRemaining: 3,
			});
			attemptTask(store, "dishes");
			expect(store.get("runStats").variantsUsed).toEqual([]);
		});
	});

	describe("callbacks", () => {
		test("calls onAttemptStart before result", () => {
			const calls: string[] = [];
			const store = createTestStore({
				tasks: [makeTask()],
				firstAttemptAvailable: true,
				slotsRemaining: 3,
			});
			attemptTask(store, "dishes", {
				onAttemptStart: (id) => calls.push(`start:${id}`),
				onAttemptComplete: (id, ok) => calls.push(`complete:${id}:${ok}`),
			});
			expect(calls).toEqual(["start:dishes", "complete:dishes:true"]);
		});

		test("calls onFailure on failed attempt", () => {
			let failureCalled = false;
			const store = createTestStore({
				tasks: [makeTask({ baseRate: 0 })],
				slotsRemaining: 3,
			});
			attemptTask(store, "dishes", {
				onFailure: () => {
					failureCalled = true;
				},
			});
			expect(failureCalled).toBe(true);
		});

		test("does not call onFailure on success", () => {
			let failureCalled = false;
			const store = createTestStore({
				tasks: [makeTask()],
				firstAttemptAvailable: true,
				slotsRemaining: 3,
			});
			attemptTask(store, "dishes", {
				onFailure: () => {
					failureCalled = true;
				},
			});
			expect(failureCalled).toBe(false);
		});
	});

	describe("energy effects", () => {
		test("applies energy change on failure", () => {
			const store = createTestStore({
				tasks: [makeTask({ baseRate: 0 })],
				slotsRemaining: 3,
				energy: 0.5,
			});
			const before = store.get("energy");
			attemptTask(store, "dishes");
			// Default failure energy cost applies
			expect(store.get("energy")).not.toBe(before);
		});

		test("applies custom energy effect on success", () => {
			const task = makeTask({
				energyEffect: { success: 0.1, failure: -0.1 },
			});
			const store = createTestStore({
				tasks: [task],
				firstAttemptAvailable: true,
				slotsRemaining: 3,
				energy: 0.5,
			});
			attemptTask(store, "dishes");
			// Should have gained energy from success effect
			expect(store.get("energy")).toBeGreaterThan(0.5);
		});
	});

	describe("momentum bounds", () => {
		test("momentum does not exceed 1 on success", () => {
			const store = createTestStore({
				tasks: [makeTask()],
				firstAttemptAvailable: true,
				slotsRemaining: 3,
				momentum: 0.99,
			});
			attemptTask(store, "dishes");
			expect(store.get("momentum")).toBeLessThanOrEqual(1);
		});

		test("momentum does not go below 0 on failure", () => {
			const store = createTestStore({
				tasks: [makeTask({ baseRate: 0 })],
				slotsRemaining: 3,
				momentum: 0.01,
			});
			attemptTask(store, "dishes");
			expect(store.get("momentum")).toBeGreaterThanOrEqual(0);
		});
	});

	describe("rollCount advancement", () => {
		test("advances rollCount on attempt", () => {
			const store = createTestStore({
				tasks: [makeTask()],
				firstAttemptAvailable: true,
				slotsRemaining: 3,
				rollCount: 0,
			});
			attemptTask(store, "dishes");
			expect(store.get("rollCount")).toBeGreaterThan(0);
		});

		test("advances rollCount more on failure (phone notification roll)", () => {
			const store = createTestStore({
				tasks: [makeTask({ baseRate: 0 })],
				slotsRemaining: 3,
				rollCount: 0,
			});
			attemptTask(store, "dishes");
			// At minimum: 1 for task roll + 1 for phone notification roll
			expect(store.get("rollCount")).toBeGreaterThanOrEqual(2);
		});
	});
});
