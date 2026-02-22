import { describe, expect, test } from "bun:test";
import { SLOTS_PER_BLOCK, WEEKEND_TOTAL_POINTS } from "../data/timeBlocks";
import { createTestStore, makeTask } from "../test-utils";
import {
	continueToNextDay,
	endWeekendDay,
	showDaySummary,
	skipTimeBlock,
} from "./time";

describe("skipTimeBlock", () => {
	test("advances from morning to afternoon", () => {
		const store = createTestStore({ timeBlock: "morning" });
		skipTimeBlock(store);
		expect(store.get("timeBlock")).toBe("afternoon");
	});

	test("advances from afternoon to evening", () => {
		const store = createTestStore({ timeBlock: "afternoon" });
		skipTimeBlock(store);
		expect(store.get("timeBlock")).toBe("evening");
	});

	test("advances from evening to night", () => {
		const store = createTestStore({ timeBlock: "evening" });
		skipTimeBlock(store);
		expect(store.get("timeBlock")).toBe("night");
	});

	test("resets slotsRemaining on time block advance", () => {
		const store = createTestStore({
			timeBlock: "morning",
			slotsRemaining: 0,
		});
		skipTimeBlock(store);
		expect(store.get("slotsRemaining")).toBe(SLOTS_PER_BLOCK);
	});

	test("clears selectedTaskId on time block advance", () => {
		const store = createTestStore({
			timeBlock: "morning",
			selectedTaskId: "dishes",
		});
		skipTimeBlock(store);
		expect(store.get("selectedTaskId")).toBeNull();
	});

	test("decays momentum on advance", () => {
		const store = createTestStore({
			timeBlock: "morning",
			momentum: 0.5,
		});
		skipTimeBlock(store);
		expect(store.get("momentum")).toBeLessThan(0.5);
	});

	test("decays energy on advance", () => {
		const store = createTestStore({
			timeBlock: "morning",
			energy: 0.5,
		});
		skipTimeBlock(store);
		expect(store.get("energy")).toBeLessThan(0.5);
	});

	test("momentum does not go below 0", () => {
		const store = createTestStore({
			timeBlock: "morning",
			momentum: 0.001,
		});
		skipTimeBlock(store);
		expect(store.get("momentum")).toBeGreaterThanOrEqual(0);
	});

	test("energy does not go below 0", () => {
		const store = createTestStore({
			timeBlock: "morning",
			energy: 0.001,
		});
		skipTimeBlock(store);
		expect(store.get("energy")).toBeGreaterThanOrEqual(0);
	});

	test("shows day summary at end of night", () => {
		const store = createTestStore({
			timeBlock: "night",
			// Disable pushThrough eligibility so it goes straight to summary
			pushedThroughLastNight: true,
		});
		skipTimeBlock(store);
		expect(store.get("screen")).toBe("daySummary");
	});
});

describe("endWeekendDay", () => {
	test("triggers day summary flow", () => {
		const store = createTestStore({
			dayIndex: 5,
			// Disable pushThrough eligibility
			pushedThroughLastNight: true,
		});
		endWeekendDay(store);
		expect(store.get("screen")).toBe("daySummary");
	});
});

describe("showDaySummary", () => {
	test("tracks dog walk status", () => {
		// Dog not walked (no walk-dog task succeeded)
		const store = createTestStore({
			// Disable pushThrough by using extended night or previous push
			pushedThroughLastNight: true,
			timeBlock: "night",
		});
		showDaySummary(store);
		expect(store.get("dogFailedYesterday")).toBe(true);
	});

	test("tracks dog walked when walk-dog succeeded", () => {
		const store = createTestStore({
			tasks: [
				makeTask({
					id: "walk-dog",
					name: "Walk Dog",
					category: "dog",
					successCount: 1,
					attemptedToday: true,
					succeededToday: true,
				}),
			],
			pushedThroughLastNight: true,
			timeBlock: "night",
		});
		showDaySummary(store);
		expect(store.get("dogFailedYesterday")).toBe(false);
	});

	test("shows nightChoice when eligible to push through at night", () => {
		const store = createTestStore({
			timeBlock: "night",
			inExtendedNight: false,
			pushedThroughLastNight: false, // Can push through
			energy: 0.5, // Has energy
			dayIndex: 0, // Weekday
		});
		showDaySummary(store);
		expect(store.get("screen")).toBe("nightChoice");
	});

	test("goes to daySummary when already pushed through", () => {
		const store = createTestStore({
			timeBlock: "night",
			inExtendedNight: false,
			pushedThroughLastNight: true, // Already pushed through last night
		});
		showDaySummary(store);
		expect(store.get("screen")).toBe("daySummary");
	});
});

describe("continueToNextDay", () => {
	test("advances day from monday to tuesday", () => {
		const store = createTestStore({
			day: "monday",
			dayIndex: 0,
			screen: "daySummary",
		});
		continueToNextDay(store);
		expect(store.get("day")).toBe("tuesday");
		expect(store.get("dayIndex")).toBe(1);
	});

	test("shows weekComplete at end of sunday", () => {
		const store = createTestStore({
			day: "sunday",
			dayIndex: 6,
			screen: "daySummary",
		});
		continueToNextDay(store);
		expect(store.get("screen")).toBe("weekComplete");
	});

	test("sets screen to game on normal day advance", () => {
		const store = createTestStore({
			dayIndex: 0,
			screen: "daySummary",
		});
		continueToNextDay(store);
		expect(store.get("screen")).toBe("game");
	});

	test("resets to morning time block on normal weekday", () => {
		const store = createTestStore({
			dayIndex: 0,
			inExtendedNight: false,
		});
		continueToNextDay(store);
		expect(store.get("timeBlock")).toBe("morning");
		expect(store.get("slotsRemaining")).toBe(SLOTS_PER_BLOCK);
	});

	test("starts at afternoon after all-nighter", () => {
		const store = createTestStore({
			dayIndex: 0,
			inExtendedNight: true,
		});
		continueToNextDay(store);
		expect(store.get("timeBlock")).toBe("afternoon");
	});

	test("sets weekend points on saturday", () => {
		const store = createTestStore({
			dayIndex: 4, // Friday -> Saturday
		});
		continueToNextDay(store);
		expect(store.get("weekendPointsRemaining")).toBe(WEEKEND_TOTAL_POINTS);
	});

	test("applies sleep quality modifier to energy", () => {
		// With no food eaten and no successes, sleep quality subtracts energy
		const badDayStore = createTestStore({
			dayIndex: 0,
			energy: 0.5,
			inExtendedNight: false,
		});
		continueToNextDay(badDayStore);
		// No food = -0.1 energy mod. 0.5 + (-0.1) = 0.4
		expect(badDayStore.get("energy")).toBeLessThan(0.5);

		// With food eaten and dog walked, sleep quality adds energy
		const succeeded = {
			successCount: 1,
			attemptedToday: true,
			succeededToday: true,
		} as const;
		const goodDayStore = createTestStore({
			dayIndex: 0,
			energy: 0.3,
			inExtendedNight: false,
			tasks: [
				makeTask({ id: "cook", category: "food", ...succeeded }),
				makeTask({ id: "walk-dog", category: "dog", ...succeeded }),
				makeTask({ ...succeeded }),
			],
		});
		continueToNextDay(goodDayStore);
		// Food +0.1, dog walk +0.05 = +0.15. 0.3 + 0.15 = 0.45
		expect(goodDayStore.get("energy")).toBeGreaterThan(0.3);
	});

	test("applies all-nighter penalty to energy", () => {
		// After an all-nighter, energy should drop further
		const normalStore = createTestStore({
			dayIndex: 0,
			energy: 0.5,
			inExtendedNight: false,
		});
		const allnighterStore = createTestStore({
			dayIndex: 0,
			energy: 0.5,
			inExtendedNight: true,
		});
		continueToNextDay(normalStore);
		continueToNextDay(allnighterStore);
		// All-nighter should result in lower energy than normal sleep
		expect(allnighterStore.get("energy")).toBeLessThan(
			normalStore.get("energy"),
		);
	});

	test("resets daily flags on tasks", () => {
		const store = createTestStore({
			dayIndex: 0,
			tasks: [
				makeTask({
					failureCount: 2,
					successCount: 1,
					attemptedToday: true,
					succeededToday: true,
				}),
			],
		});
		continueToNextDay(store);
		const updatedTask = store.get("tasks").find((t) => t.id === "dishes");
		expect(updatedTask?.attemptedToday).toBe(false);
		expect(updatedTask?.succeededToday).toBe(false);
		// Weekly counts preserved
		expect(updatedTask?.failureCount).toBe(2);
		expect(updatedTask?.successCount).toBe(1);
	});

	test("resets friend rescue state", () => {
		const store = createTestStore({
			dayIndex: 0,
			friendRescueUsedToday: true,
			friendRescueChanceBonus: 0.3,
		});
		continueToNextDay(store);
		expect(store.get("friendRescueUsedToday")).toBe(false);
		expect(store.get("friendRescueChanceBonus")).toBe(0);
	});

	test("clears selected task", () => {
		const store = createTestStore({
			dayIndex: 0,
			selectedTaskId: "dishes",
		});
		continueToNextDay(store);
		expect(store.get("selectedTaskId")).toBeNull();
	});

	test("records pushedThroughLastNight from current state", () => {
		const store = createTestStore({
			dayIndex: 0,
			inExtendedNight: true,
		});
		continueToNextDay(store);
		expect(store.get("pushedThroughLastNight")).toBe(true);
		expect(store.get("inExtendedNight")).toBe(false);
	});

	test("clears pushedThroughLastNight when no all-nighter", () => {
		const store = createTestStore({
			dayIndex: 0,
			inExtendedNight: false,
			pushedThroughLastNight: true,
		});
		continueToNextDay(store);
		expect(store.get("pushedThroughLastNight")).toBe(false);
	});
});
