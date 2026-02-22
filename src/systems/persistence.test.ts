import { afterEach, describe, expect, test } from "bun:test";
import { createTestState } from "../test-utils";
import {
	clearAllData,
	createNewGame,
	getPatterns,
	getSavedGameSummaries,
	hasHintBeenShown,
	hasSavedGame,
	loadGame,
	markFirstAttempt,
	markHintShown,
	markIntroSeen,
	resetRun,
	saveCompletedRun,
	saveGame,
} from "./persistence";

afterEach(() => {
	localStorage.clear();
});

describe("saveGame and loadGame", () => {
	test("loadGame returns null when no save exists", () => {
		const result = loadGame("main");
		expect(result).toBeNull();
	});

	test("roundtrip preserves core state fields", () => {
		const state = createTestState({
			day: "wednesday",
			dayIndex: 2,
			timeBlock: "afternoon",
			energy: 0.7,
			momentum: 0.3,
			slotsRemaining: 2,
			rollCount: 15,
			consecutiveFailures: 2,
		});
		saveGame(state, "main");
		const loaded = loadGame("main");
		expect(loaded).not.toBeNull();
		expect(loaded?.day).toBe("wednesday");
		expect(loaded?.dayIndex).toBe(2);
		expect(loaded?.timeBlock).toBe("afternoon");
		expect(loaded?.energy).toBe(0.7);
		expect(loaded?.momentum).toBe(0.3);
		expect(loaded?.slotsRemaining).toBe(2);
		expect(loaded?.rollCount).toBe(15);
		expect(loaded?.consecutiveFailures).toBe(2);
	});

	test("roundtrip preserves task runtime state", () => {
		const state = createTestState();
		// Mark a task as attempted/failed
		const task = state.tasks.find((t) => t.id === "dishes");
		if (task) {
			task.failureCount = 3;
			task.successCount = 1;
			task.attemptedToday = true;
			task.succeededToday = false;
		}
		saveGame(state, "main");
		const loaded = loadGame("main");
		const loadedTask = loaded?.tasks.find((t) => t.id === "dishes");
		expect(loadedTask?.failureCount).toBe(3);
		expect(loadedTask?.successCount).toBe(1);
		expect(loadedTask?.attemptedToday).toBe(true);
		expect(loadedTask?.succeededToday).toBe(false);
	});

	test("separate slots for main and seeded", () => {
		const mainState = createTestState({ day: "monday", dayIndex: 0 });
		const seededState = createTestState({ day: "friday", dayIndex: 4 });
		saveGame(mainState, "main");
		saveGame(seededState, "seeded");
		const main = loadGame("main");
		const seeded = loadGame("seeded");
		expect(main?.day).toBe("monday");
		expect(seeded?.day).toBe("friday");
	});

	test("saving one slot does not affect the other", () => {
		const mainState = createTestState({ day: "monday" });
		saveGame(mainState, "main");
		const seededState = createTestState({ day: "friday" });
		saveGame(seededState, "seeded");
		// Main should still be there
		expect(loadGame("main")?.day).toBe("monday");
	});

	test("restores transient state to defaults", () => {
		const state = createTestState();
		saveGame(state, "main");
		const loaded = loadGame("main");
		// Transient visual state is not persisted
		expect(loaded?.lastPhoneOutcome).toBeNull();
		expect(loaded?.lastPhoneTime).toBe(0);
		expect(loaded?.lastTaskOutcome).toBeNull();
		expect(loaded?.lastTaskTime).toBe(0);
		expect(loaded?.eventBanner).toBeNull();
	});

	test("handles corrupted data gracefully", () => {
		localStorage.setItem("skill-issue-save", "not valid json{{{");
		const result = loadGame("main");
		expect(result).toBeNull();
	});

	test("does not restore menu screens", () => {
		const state = createTestState({ screen: "menu" });
		saveGame(state, "main");
		const loaded = loadGame("main");
		expect(loaded?.screen).toBe("game");
	});
});

describe("hasSavedGame", () => {
	test("returns false when no save exists", () => {
		expect(hasSavedGame("main")).toBe(false);
		expect(hasSavedGame("seeded")).toBe(false);
	});

	test("returns true after save", () => {
		saveGame(createTestState(), "main");
		expect(hasSavedGame("main")).toBe(true);
		expect(hasSavedGame("seeded")).toBe(false);
	});
});

describe("getSavedGameSummaries", () => {
	test("returns null summaries when no saves exist", () => {
		const summaries = getSavedGameSummaries();
		expect(summaries.main).toBeNull();
		expect(summaries.seeded).toBeNull();
	});

	test("returns summary for saved game", () => {
		saveGame(
			createTestState({
				day: "thursday",
				dayIndex: 3,
				timeBlock: "evening",
			}),
			"main",
		);
		const summaries = getSavedGameSummaries();
		expect(summaries.main).not.toBeNull();
		expect(summaries.main?.day).toBe("thursday");
		expect(summaries.main?.timeBlock).toBe("evening");
		expect(summaries.main?.completed).toBe(false);
	});

	test("marks completed when screen is weekComplete", () => {
		saveGame(createTestState({ screen: "weekComplete" }), "main");
		const summaries = getSavedGameSummaries();
		expect(summaries.main?.completed).toBe(true);
	});

	test("seeded summary includes seed", () => {
		saveGame(createTestState({ runSeed: 12345 }), "seeded");
		const summaries = getSavedGameSummaries();
		expect(summaries.seeded?.seed).toBe(12345);
	});
});

describe("resetRun", () => {
	test("clears the specified slot", () => {
		saveGame(createTestState(), "main");
		expect(hasSavedGame("main")).toBe(true);
		resetRun("main");
		expect(hasSavedGame("main")).toBe(false);
	});

	test("preserves the other slot", () => {
		saveGame(createTestState(), "main");
		saveGame(createTestState(), "seeded");
		resetRun("main");
		expect(hasSavedGame("main")).toBe(false);
		expect(hasSavedGame("seeded")).toBe(true);
	});

	test("preserves patterns data", () => {
		// Save and complete a run to create patterns data
		saveCompletedRun(createTestState(), "main");
		const patternsBefore = getPatterns();
		expect(patternsBefore.history.length).toBe(1);

		saveGame(createTestState(), "main");
		resetRun("main");
		const patternsAfter = getPatterns();
		expect(patternsAfter.history.length).toBe(1);
	});
});

describe("saveCompletedRun", () => {
	test("adds run to patterns history", () => {
		const state = createTestState();
		saveCompletedRun(state, "main");
		const patterns = getPatterns();
		expect(patterns.history.length).toBe(1);
		expect(patterns.history[0]?.seed).toBe(42);
	});

	test("unlocks patterns", () => {
		saveCompletedRun(createTestState(), "main");
		const patterns = getPatterns();
		expect(patterns.unlocked).toBe(true);
	});

	test("clears the completed run's slot", () => {
		saveGame(createTestState(), "main");
		saveCompletedRun(createTestState(), "main");
		expect(hasSavedGame("main")).toBe(false);
	});

	test("preserves personality in history", () => {
		const state = createTestState({
			personality: { time: "nightOwl", social: "hermit" },
		});
		saveCompletedRun(state, "main");
		const patterns = getPatterns();
		expect(patterns.history[0]?.personality.time).toBe("nightOwl");
		expect(patterns.history[0]?.personality.social).toBe("hermit");
	});

	test("accumulates multiple runs", () => {
		saveCompletedRun(createTestState({ runSeed: 1 }), "main");
		saveCompletedRun(createTestState({ runSeed: 2 }), "main");
		saveCompletedRun(createTestState({ runSeed: 3 }), "seeded");
		const patterns = getPatterns();
		expect(patterns.history.length).toBe(3);
	});
});

describe("createNewGame", () => {
	test("returns initial state", () => {
		const state = createNewGame(42);
		expect(state.day).toBe("monday");
		expect(state.dayIndex).toBe(0);
		expect(state.runSeed).toBe(42);
	});

	test("shows intro for new players", () => {
		const state = createNewGame();
		expect(state.screen).toBe("intro");
	});

	test("skips intro for returning players", () => {
		markIntroSeen();
		const state = createNewGame();
		expect(state.screen).toBe("game");
	});

	test("first attempt available for new players", () => {
		const state = createNewGame();
		expect(state.firstAttemptAvailable).toBe(true);
	});

	test("first attempt unavailable after marking", () => {
		markFirstAttempt();
		const state = createNewGame();
		expect(state.firstAttemptAvailable).toBe(false);
	});

	test("populates events", () => {
		const state = createNewGame(42);
		expect(state.events.length).toBeGreaterThan(0);
	});
});

describe("markIntroSeen", () => {
	test("persists intro seen flag", () => {
		markIntroSeen();
		const patterns = getPatterns();
		expect(patterns.hasSeenIntro).toBe(true);
	});
});

describe("markFirstAttempt", () => {
	test("persists first attempt flag", () => {
		markFirstAttempt();
		const patterns = getPatterns();
		expect(patterns.hasEverAttempted).toBe(true);
	});

	test("is idempotent", () => {
		markFirstAttempt();
		markFirstAttempt();
		const patterns = getPatterns();
		expect(patterns.hasEverAttempted).toBe(true);
	});
});

describe("hints", () => {
	test("hint not shown initially", () => {
		expect(hasHintBeenShown("firstTask")).toBe(false);
	});

	test("markHintShown persists", () => {
		markHintShown("firstTask");
		expect(hasHintBeenShown("firstTask")).toBe(true);
	});

	test("marking same hint twice is safe", () => {
		markHintShown("firstAttempt");
		markHintShown("firstAttempt");
		expect(hasHintBeenShown("firstAttempt")).toBe(true);
	});

	test("different hints are independent", () => {
		markHintShown("firstTask");
		expect(hasHintBeenShown("firstTask")).toBe(true);
		expect(hasHintBeenShown("firstWeekend")).toBe(false);
	});
});

describe("obligation task reconstruction on load", () => {
	/**
	 * Seed 1 in seeded mode selects vet-reminder (scheduledDay: 0, obligationDay: 1)
	 * which injects a "vet-visit" obligation task at runtime. The task is NOT in the
	 * seed-based task pool -- loadGame must reconstruct it from the event definition.
	 */
	test("reconstructs obligation task from resolved event", () => {
		const state = createTestState({
			runSeed: 1,
			gameMode: "seeded",
			events: [
				{ id: "wind", status: "resolved", scheduledDay: 2 },
				{ id: "sunset", status: "resolved", scheduledDay: 0 },
				{ id: "fridge-empty", status: "resolved", scheduledDay: 1 },
				{
					id: "vet-reminder",
					status: "resolved",
					scheduledDay: 0,
					obligationDay: 1,
				},
				{ id: "vet-missed", status: "pending", scheduledDay: 1 },
			],
		});
		// Add the obligation task to state (as it would be at runtime)
		state.tasks.push({
			id: "vet-visit",
			name: "Vet Visit",
			category: "dog",
			baseRate: 0.55,
			availableBlocks: ["morning"],
			failureCount: 2,
			successCount: 0,
			attemptedToday: true,
			succeededToday: false,
			availableDay: 1,
			sourceEvent: "vet-reminder",
			isObligation: true,
		});

		saveGame(state, "seeded");
		const loaded = loadGame("seeded");

		// The obligation task should be reconstructed
		const vetVisit = loaded?.tasks.find((t) => t.id === "vet-visit");
		expect(vetVisit).toBeDefined();
		expect(vetVisit?.isObligation).toBe(true);
		expect(vetVisit?.sourceEvent).toBe("vet-reminder");
		expect(vetVisit?.category).toBe("dog");
		expect(vetVisit?.baseRate).toBe(0.55);
		expect(vetVisit?.availableBlocks).toEqual(["morning"]);
	});

	test("restores saved runtime state on reconstructed obligation task", () => {
		const state = createTestState({
			runSeed: 1,
			gameMode: "seeded",
			events: [
				{
					id: "vet-reminder",
					status: "resolved",
					scheduledDay: 0,
					obligationDay: 1,
				},
			],
		});
		state.tasks.push({
			id: "vet-visit",
			name: "Vet Visit",
			category: "dog",
			baseRate: 0.55,
			availableBlocks: ["morning"],
			failureCount: 3,
			successCount: 1,
			attemptedToday: true,
			succeededToday: true,
			isObligation: true,
			sourceEvent: "vet-reminder",
		});

		saveGame(state, "seeded");
		const loaded = loadGame("seeded");
		const vetVisit = loaded?.tasks.find((t) => t.id === "vet-visit");

		expect(vetVisit?.failureCount).toBe(3);
		expect(vetVisit?.successCount).toBe(1);
		expect(vetVisit?.attemptedToday).toBe(true);
		expect(vetVisit?.succeededToday).toBe(true);
	});

	test("does not reconstruct obligation from non-resolved event", () => {
		const state = createTestState({
			runSeed: 1,
			gameMode: "seeded",
			events: [
				{
					id: "vet-reminder",
					status: "pending",
					scheduledDay: 0,
					obligationDay: 1,
				},
			],
		});
		saveGame(state, "seeded");
		const loaded = loadGame("seeded");
		const vetVisit = loaded?.tasks.find((t) => t.id === "vet-visit");
		expect(vetVisit).toBeUndefined();
	});

	test("does not reconstruct obligation for event without obligation definition", () => {
		// wind is a flavor event (tier 0), no obligation definition
		const state = createTestState({
			runSeed: 1,
			gameMode: "seeded",
			events: [{ id: "wind", status: "resolved", scheduledDay: 2 }],
		});
		saveGame(state, "seeded");
		const loaded = loadGame("seeded");
		// No obligation task should be created for a non-obligation event
		const obligationTasks = loaded?.tasks.filter((t) => t.isObligation) ?? [];
		expect(obligationTasks.length).toBe(0);
	});

	test("merges saved event status with fresh event list", () => {
		const state = createTestState({
			runSeed: 1,
			gameMode: "seeded",
			events: [
				{
					id: "vet-reminder",
					status: "resolved",
					scheduledDay: 0,
					obligationDay: 1,
				},
				// wind was resolved by the player
				{ id: "wind", status: "resolved", scheduledDay: 2 },
				// sunset still pending
				{ id: "sunset", status: "pending", scheduledDay: 0 },
			],
		});
		saveGame(state, "seeded");
		const loaded = loadGame("seeded");

		const vet = loaded?.events.find((e) => e.id === "vet-reminder");
		expect(vet?.status).toBe("resolved");

		const wind = loaded?.events.find((e) => e.id === "wind");
		expect(wind?.status).toBe("resolved");

		const sunset = loaded?.events.find((e) => e.id === "sunset");
		expect(sunset?.status).toBe("pending");
	});
});

describe("V3 migration through loadGame", () => {
	test("loads migrated V3 data", () => {
		const v3Data = {
			version: 3,
			currentRun: {
				day: "wednesday",
				dayIndex: 2,
				timeBlock: "evening",
				slotsRemaining: 1,
				weekendPointsRemaining: 0,
				tasks: [],
				selectedTaskId: null,
				screen: "game",
				energy: 0.5,
				momentum: 0.5,
				runSeed: 42,
				personality: { time: "neutral", social: "neutral" },
				dogFailedYesterday: false,
				pushedThroughLastNight: false,
				inExtendedNight: false,
				consecutiveFailures: 0,
				friendRescueUsedToday: false,
				rollCount: 0,
				variantsUnlocked: [],
				runStats: {
					tasks: { attempted: 0, succeeded: 0 },
					byTimeBlock: {
						morning: { attempted: 0, succeeded: 0 },
						afternoon: { attempted: 0, succeeded: 0 },
						evening: { attempted: 0, succeeded: 0 },
						night: { attempted: 0, succeeded: 0 },
					},
					phoneChecks: 0,
					allNighters: 0,
					friendRescues: { triggered: 0, accepted: 0 },
					variantsUsed: [],
				},
			},
			patterns: { unlocked: false, history: [] },
			savedAt: Date.now(),
		};
		localStorage.setItem("skill-issue-save", JSON.stringify(v3Data));
		const loaded = loadGame("main");
		expect(loaded).not.toBeNull();
		expect(loaded?.day).toBe("wednesday");
		expect(loaded?.timeBlock).toBe("evening");
	});
});

describe("clearAllData", () => {
	test("removes all save data", () => {
		saveGame(createTestState(), "main");
		saveCompletedRun(createTestState(), "seeded");
		markIntroSeen();
		clearAllData();
		expect(hasSavedGame("main")).toBe(false);
		expect(hasSavedGame("seeded")).toBe(false);
		expect(getPatterns().unlocked).toBe(false);
		expect(getPatterns().history.length).toBe(0);
	});
});
