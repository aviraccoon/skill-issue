import { describe, expect, it } from "bun:test";
import type { TaskId } from "../data/tasks";
import { createInitialState, type GameState, type Task } from "../state";
import { getAvailableTasks } from "./controller";

/** Creates a test state with overrides. */
function createTestState(overrides: Partial<GameState> = {}): GameState {
	return { ...createInitialState(42), ...overrides };
}

/** Creates a minimal task for testing. */
function makeTask(overrides: Partial<Task> = {}): Task {
	return {
		id: "work" as TaskId,
		name: "Work",
		category: "work",
		baseRate: 0.4,
		availableBlocks: ["morning", "afternoon", "evening", "night"],
		failureCount: 0,
		attemptedToday: false,
		succeededToday: false,
		...overrides,
	};
}

describe("getAvailableTasks with obligation tasks", () => {
	it("excludes obligation tasks on wrong day", () => {
		const obligationTask = makeTask({
			id: "dentist-visit" as TaskId,
			name: "Dentist Appointment",
			availableBlocks: ["afternoon"],
			availableDay: 3, // Thursday
			isObligation: true,
		});
		const regularTask = makeTask({ id: "work" as TaskId });
		const state = createTestState({
			dayIndex: 0, // Monday
			timeBlock: "afternoon",
			tasks: [regularTask, obligationTask],
		});

		const available = getAvailableTasks(state);

		expect(available.some((t) => t.id === "work")).toBe(true);
		expect(available.some((t) => t.id === "dentist-visit")).toBe(false);
	});

	it("includes obligation tasks on correct day", () => {
		const obligationTask = makeTask({
			id: "dentist-visit" as TaskId,
			name: "Dentist Appointment",
			availableBlocks: ["afternoon"],
			availableDay: 3, // Thursday
			isObligation: true,
		});
		const state = createTestState({
			dayIndex: 3, // Thursday
			timeBlock: "afternoon",
			tasks: [obligationTask],
		});

		const available = getAvailableTasks(state);
		expect(available.some((t) => t.id === "dentist-visit")).toBe(true);
	});

	it("excludes obligation tasks on wrong block even on correct day", () => {
		const obligationTask = makeTask({
			id: "dentist-visit" as TaskId,
			name: "Dentist Appointment",
			availableBlocks: ["afternoon"],
			availableDay: 3,
			isObligation: true,
		});
		const state = createTestState({
			dayIndex: 3,
			timeBlock: "morning", // Not afternoon
			tasks: [obligationTask],
		});

		const available = getAvailableTasks(state);
		expect(available.some((t) => t.id === "dentist-visit")).toBe(false);
	});

	it("excludes obligation tasks on weekend wrong day", () => {
		const obligationTask = makeTask({
			id: "work-deadline" as TaskId,
			name: "Work Deadline",
			availableDay: 4, // Friday
			isObligation: true,
		});
		const state = createTestState({
			dayIndex: 5, // Saturday
			tasks: [obligationTask],
		});

		const available = getAvailableTasks(state);
		expect(available.some((t) => t.id === "work-deadline")).toBe(false);
	});
});
