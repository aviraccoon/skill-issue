import { describe, expect, it, test } from "bun:test";
import { createTestState, createTestStore, makeTask } from "../test-utils";
import {
	executeDecision,
	getAvailableDecisions,
	getAvailableTasks,
	isComplete,
} from "./controller";

// --- getAvailableTasks (existing tests kept) ---

describe("getAvailableTasks with obligation tasks", () => {
	it("excludes obligation tasks on wrong day", () => {
		const obligationTask = makeTask({
			id: "dentist-visit",
			name: "Dentist Appointment",
			availableBlocks: ["afternoon"],
			availableDay: 3,
			isObligation: true,
		});
		const regularTask = makeTask({ id: "work" });
		const state = createTestState({
			dayIndex: 0,
			timeBlock: "afternoon",
			tasks: [regularTask, obligationTask],
		});
		const available = getAvailableTasks(state);
		expect(available.some((t) => t.id === "work")).toBe(true);
		expect(available.some((t) => t.id === "dentist-visit")).toBe(false);
	});

	it("includes obligation tasks on correct day", () => {
		const obligationTask = makeTask({
			id: "dentist-visit",
			name: "Dentist Appointment",
			availableBlocks: ["afternoon"],
			availableDay: 3,
			isObligation: true,
		});
		const state = createTestState({
			dayIndex: 3,
			timeBlock: "afternoon",
			tasks: [obligationTask],
		});
		const available = getAvailableTasks(state);
		expect(available.some((t) => t.id === "dentist-visit")).toBe(true);
	});

	it("excludes obligation tasks on wrong block even on correct day", () => {
		const obligationTask = makeTask({
			id: "dentist-visit",
			name: "Dentist Appointment",
			availableBlocks: ["afternoon"],
			availableDay: 3,
			isObligation: true,
		});
		const state = createTestState({
			dayIndex: 3,
			timeBlock: "morning",
			tasks: [obligationTask],
		});
		const available = getAvailableTasks(state);
		expect(available.some((t) => t.id === "dentist-visit")).toBe(false);
	});

	it("excludes obligation tasks on weekend wrong day", () => {
		const obligationTask = makeTask({
			id: "work-deadline",
			name: "Work Deadline",
			availableDay: 4,
			isObligation: true,
		});
		const state = createTestState({
			dayIndex: 5,
			tasks: [obligationTask],
		});
		const available = getAvailableTasks(state);
		expect(available.some((t) => t.id === "work-deadline")).toBe(false);
	});
});

// --- getAvailableDecisions ---

describe("getAvailableDecisions", () => {
	describe("game screen (weekday)", () => {
		test("includes attempt decisions for available tasks", () => {
			const task = makeTask();
			const state = createTestState({
				screen: "game",
				dayIndex: 0,
				timeBlock: "morning",
				slotsRemaining: 3,
				tasks: [task],
			});
			const decisions = getAvailableDecisions(state);
			expect(decisions.some((d) => d.type === "attempt")).toBe(true);
		});

		test("includes skip decision", () => {
			const state = createTestState({
				screen: "game",
				dayIndex: 0,
				slotsRemaining: 3,
			});
			const decisions = getAvailableDecisions(state);
			expect(decisions.some((d) => d.type === "skip")).toBe(true);
		});

		test("includes checkPhone when slots available", () => {
			const state = createTestState({
				screen: "game",
				dayIndex: 0,
				slotsRemaining: 1,
			});
			const decisions = getAvailableDecisions(state);
			expect(decisions.some((d) => d.type === "checkPhone")).toBe(true);
		});

		test("excludes attempt and checkPhone when no slots", () => {
			const state = createTestState({
				screen: "game",
				dayIndex: 0,
				slotsRemaining: 0,
				tasks: [makeTask()],
			});
			const decisions = getAvailableDecisions(state);
			expect(decisions.some((d) => d.type === "attempt")).toBe(false);
			expect(decisions.some((d) => d.type === "checkPhone")).toBe(false);
			// Skip still available
			expect(decisions.some((d) => d.type === "skip")).toBe(true);
		});
	});

	describe("game screen (weekend)", () => {
		test("includes endDay decision", () => {
			const state = createTestState({
				screen: "game",
				dayIndex: 5,
				weekendPointsRemaining: 8,
			});
			const decisions = getAvailableDecisions(state);
			expect(decisions.some((d) => d.type === "endDay")).toBe(true);
		});

		test("includes attempt when points available", () => {
			const task = makeTask();
			const state = createTestState({
				screen: "game",
				dayIndex: 5,
				weekendPointsRemaining: 8,
				tasks: [task],
			});
			const decisions = getAvailableDecisions(state);
			expect(decisions.some((d) => d.type === "attempt")).toBe(true);
		});

		test("excludes attempt for tasks exceeding remaining points", () => {
			const expensiveTask = makeTask({ weekendCost: 5 });
			const state = createTestState({
				screen: "game",
				dayIndex: 5,
				weekendPointsRemaining: 3,
				tasks: [expensiveTask],
			});
			const decisions = getAvailableDecisions(state);
			expect(decisions.some((d) => d.type === "attempt")).toBe(false);
		});

		test("excludes attempt and checkPhone when no points", () => {
			const state = createTestState({
				screen: "game",
				dayIndex: 5,
				weekendPointsRemaining: 0,
			});
			const decisions = getAvailableDecisions(state);
			expect(decisions.some((d) => d.type === "attempt")).toBe(false);
			expect(decisions.some((d) => d.type === "checkPhone")).toBe(false);
			// endDay still available
			expect(decisions.some((d) => d.type === "endDay")).toBe(true);
		});
	});

	describe("friendRescue screen", () => {
		test("includes accept for each activity tier", () => {
			const state = createTestState({ screen: "friendRescue" });
			const decisions = getAvailableDecisions(state);
			const accepts = decisions.filter((d) => d.type === "acceptRescue");
			expect(accepts.length).toBe(3); // low, medium, high
		});

		test("includes decline", () => {
			const state = createTestState({ screen: "friendRescue" });
			const decisions = getAvailableDecisions(state);
			expect(decisions.some((d) => d.type === "declineRescue")).toBe(true);
		});

		test("does not include game decisions", () => {
			const state = createTestState({ screen: "friendRescue" });
			const decisions = getAvailableDecisions(state);
			expect(decisions.some((d) => d.type === "attempt")).toBe(false);
			expect(decisions.some((d) => d.type === "skip")).toBe(false);
		});
	});

	describe("nightChoice screen", () => {
		test("includes sleep", () => {
			const state = createTestState({ screen: "nightChoice" });
			const decisions = getAvailableDecisions(state);
			expect(decisions.some((d) => d.type === "sleep")).toBe(true);
		});

		test("includes pushThrough when eligible", () => {
			const state = createTestState({
				screen: "nightChoice",
				pushedThroughLastNight: false,
				inExtendedNight: false,
				dayIndex: 0,
			});
			const decisions = getAvailableDecisions(state);
			expect(decisions.some((d) => d.type === "pushThrough")).toBe(true);
		});

		test("excludes pushThrough when not eligible", () => {
			const state = createTestState({
				screen: "nightChoice",
				pushedThroughLastNight: true, // Already pushed through
			});
			const decisions = getAvailableDecisions(state);
			expect(decisions.some((d) => d.type === "pushThrough")).toBe(false);
		});
	});

	describe("narrativeEvent screen", () => {
		test("includes dismissEvent for minor events", () => {
			const state = createTestState({
				screen: "narrativeEvent",
				activeEventId: "rain", // Tier 0, no choices
			});
			const decisions = getAvailableDecisions(state);
			expect(decisions.some((d) => d.type === "dismissEvent")).toBe(true);
		});

		test("includes eventChoice for major events", () => {
			const state = createTestState({
				screen: "narrativeEvent",
				activeEventId: "leak-found", // Major event with choices (call, towel)
			});
			const decisions = getAvailableDecisions(state);
			const choices = decisions.filter((d) => d.type === "eventChoice");
			expect(choices.length).toBe(2);
		});
	});
});

// --- executeDecision ---

describe("executeDecision", () => {
	test("returns ActionResult with energy/momentum tracking", () => {
		const store = createTestStore({
			screen: "game",
			dayIndex: 0,
			slotsRemaining: 3,
			timeBlock: "morning",
		});
		const result = executeDecision(store, { type: "skip" });
		expect(result.decision.type).toBe("skip");
		expect(typeof result.energyBefore).toBe("number");
		expect(typeof result.energyAfter).toBe("number");
		expect(typeof result.momentumBefore).toBe("number");
		expect(typeof result.momentumAfter).toBe("number");
	});

	test("clears eventBanner on any decision", () => {
		const store = createTestStore({
			screen: "game",
			timeBlock: "morning",
			slotsRemaining: 3,
			eventBanner: {
				eventId: "rain",
				text: "It's raining",
				style: "notification",
			},
		});
		executeDecision(store, { type: "skip" });
		expect(store.get("eventBanner")).toBeNull();
	});

	test("attempt routes to attemptTask", () => {
		const store = createTestStore({
			screen: "game",
			tasks: [makeTask()],
			firstAttemptAvailable: true,
			slotsRemaining: 3,
		});
		const result = executeDecision(store, {
			type: "attempt",
			taskId: "dishes",
		});
		expect(result.succeeded).toBe(true);
		expect(result.probability).toBe(1);
	});

	test("skip routes to skipTimeBlock", () => {
		const store = createTestStore({
			screen: "game",
			timeBlock: "morning",
		});
		executeDecision(store, { type: "skip" });
		expect(store.get("timeBlock")).toBe("afternoon");
	});

	test("checkPhone routes to phone action", () => {
		const store = createTestStore({
			screen: "game",
			slotsRemaining: 3,
		});
		const result = executeDecision(store, { type: "checkPhone" });
		expect(result.phoneOutcome).toBeDefined();
		expect(result.scrollTrapText).toBeDefined();
	});

	test("endDay routes to endWeekendDay", () => {
		const store = createTestStore({
			screen: "game",
			dayIndex: 5,
			pushedThroughLastNight: true,
		});
		executeDecision(store, { type: "endDay" });
		expect(store.get("screen")).toBe("daySummary");
	});

	test("sleep routes to chooseSleep", () => {
		const store = createTestStore({
			screen: "nightChoice",
			timeBlock: "night",
		});
		executeDecision(store, { type: "sleep" });
		expect(store.get("screen")).toBe("daySummary");
	});

	test("pushThrough routes to pushThrough action", () => {
		const store = createTestStore({
			screen: "nightChoice",
			timeBlock: "night",
			energy: 0.5,
		});
		executeDecision(store, { type: "pushThrough" });
		expect(store.get("inExtendedNight")).toBe(true);
		expect(store.get("screen")).toBe("game");
	});

	test("acceptRescue applies effects and returns to game", () => {
		const store = createTestStore({
			screen: "friendRescue",
			consecutiveFailures: 3,
			slotsRemaining: 3,
		});
		const result = executeDecision(store, {
			type: "acceptRescue",
			activity: "low",
		});
		expect(store.get("screen")).toBe("game");
		expect(result.rescueHint).toBeDefined();
		expect(typeof result.rescueCorrect).toBe("boolean");
	});

	test("declineRescue returns to game", () => {
		const store = createTestStore({
			screen: "friendRescue",
			consecutiveFailures: 3,
		});
		executeDecision(store, { type: "declineRescue" });
		expect(store.get("screen")).toBe("game");
		expect(store.get("consecutiveFailures")).toBe(0);
	});
});

// --- isComplete ---

describe("isComplete", () => {
	test("returns true for weekComplete screen", () => {
		const state = createTestState({ screen: "weekComplete" });
		expect(isComplete(state)).toBe(true);
	});

	test("returns false for game screen", () => {
		const state = createTestState({ screen: "game" });
		expect(isComplete(state)).toBe(false);
	});

	test("returns false for daySummary", () => {
		const state = createTestState({ screen: "daySummary" });
		expect(isComplete(state)).toBe(false);
	});
});
