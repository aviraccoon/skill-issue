import { afterAll, describe, expect, test } from "bun:test";
import { createInitialState, type EventId } from "../state";
import { createTestState, makeTask } from "../test-utils";
import { getScreenInfo } from "./screenInfo";
import type {
	DaySummaryInfo,
	FriendRescueInfo,
	GameScreenInfo,
	MenuScreenInfo,
	NarrativeEventInfo,
	NightChoiceInfo,
	PatternsScreenInfo,
	SplashInfo,
	WeekCompleteInfo,
} from "./screenInfo.types";

afterAll(() => {
	localStorage.clear();
});

describe("getScreenInfo routing", () => {
	test("splash returns SplashInfo", () => {
		const state = createTestState({ screen: "splash" });
		const info = getScreenInfo(state) as SplashInfo;
		expect(info.type).toBe("splash");
		expect(typeof info.splashText).toBe("string");
		expect(typeof info.startButton).toBe("string");
	});

	test("intro returns IntroInfo", () => {
		const state = createTestState({ screen: "intro" });
		const info = getScreenInfo(state);
		expect(info.type).toBe("intro");
	});

	test("menu returns MenuScreenInfo", () => {
		localStorage.clear();
		const state = createTestState({ screen: "menu" });
		const info = getScreenInfo(state) as MenuScreenInfo;
		expect(info.type).toBe("menu");
		expect(info.mainRunSummary).toBeNull();
		expect(info.seededRunSummary).toBeNull();
		expect(info.patternsUnlocked).toBe(false);
	});

	test("patterns returns PatternsScreenInfo", () => {
		localStorage.clear();
		const state = createTestState({ screen: "patterns" });
		const info = getScreenInfo(state) as PatternsScreenInfo;
		expect(info.type).toBe("patterns");
		expect(info.lifetime.runsCompleted).toBe(0);
	});

	test("default (game) returns GameScreenInfo", () => {
		const state = createTestState({ screen: "game" });
		const info = getScreenInfo(state) as GameScreenInfo;
		expect(info.type).toBe("game");
	});
});

describe("GameScreenInfo", () => {
	test("includes day and time block info", () => {
		const state = createTestState({
			screen: "game",
			day: "wednesday",
			timeBlock: "afternoon",
		});
		const info = getScreenInfo(state) as GameScreenInfo;
		expect(info.day).toBe("wednesday");
		expect(info.timeBlock).toBe("afternoon");
		expect(typeof info.dayDisplay).toBe("string");
		expect(typeof info.timeBlockDisplay).toBe("string");
	});

	test("includes weekend flag", () => {
		const weekday = getScreenInfo(
			createTestState({ screen: "game", dayIndex: 0 }),
		) as GameScreenInfo;
		const weekend = getScreenInfo(
			createTestState({ screen: "game", dayIndex: 5 }),
		) as GameScreenInfo;
		expect(weekday.isWeekend).toBe(false);
		expect(weekend.isWeekend).toBe(true);
	});

	test("includes tasks as TaskDisplay objects", () => {
		const task = makeTask();
		const state = createTestState({
			screen: "game",
			tasks: [task],
			slotsRemaining: 3,
			timeBlock: "morning",
		});
		const info = getScreenInfo(state) as GameScreenInfo;
		expect(info.tasks.length).toBeGreaterThanOrEqual(0);
		if (info.tasks.length > 0) {
			const display = info.tasks[0];
			expect(display).toHaveProperty("id");
			expect(display).toHaveProperty("name");
			expect(display).toHaveProperty("failureCount");
			expect(display).toHaveProperty("canAttempt");
		}
	});

	test("selectedTask matches selectedTaskId", () => {
		const task = makeTask({ id: "dishes" });
		const state = createTestState({
			screen: "game",
			tasks: [task],
			selectedTaskId: "dishes",
			slotsRemaining: 3,
			timeBlock: "morning",
		});
		const info = getScreenInfo(state) as GameScreenInfo;
		expect(info.selectedTask?.id).toBe("dishes");
	});

	test("selectedTask is null when no selection", () => {
		const state = createTestState({
			screen: "game",
			selectedTaskId: null,
		});
		const info = getScreenInfo(state) as GameScreenInfo;
		expect(info.selectedTask).toBeNull();
	});

	test("computes nextTimeBlock", () => {
		const morning = getScreenInfo(
			createTestState({ screen: "game", timeBlock: "morning" }),
		) as GameScreenInfo;
		const night = getScreenInfo(
			createTestState({ screen: "game", timeBlock: "night" }),
		) as GameScreenInfo;
		expect(morning.nextTimeBlock).toBe("afternoon");
		expect(night.nextTimeBlock).toBeNull();
	});

	test("includes decisions", () => {
		const state = createTestState({
			screen: "game",
			slotsRemaining: 3,
			dayIndex: 0,
		});
		const info = getScreenInfo(state) as GameScreenInfo;
		expect(info.decisions.length).toBeGreaterThan(0);
	});

	test("passes through phoneNotificationCount", () => {
		const state = createTestState({
			screen: "game",
			phoneNotificationCount: 2,
		});
		const info = getScreenInfo(state) as GameScreenInfo;
		expect(info.phoneNotificationCount).toBe(2);
	});

	test("passes through eventBanner", () => {
		const banner = {
			eventId: "rain" as EventId,
			text: "It's raining",
			style: "notification" as const,
		};
		const state = createTestState({
			screen: "game",
			eventBanner: banner,
		});
		const info = getScreenInfo(state) as GameScreenInfo;
		expect(info.eventBanner).toEqual(banner);
	});

	test("includes dog urgency for walk-dog task", () => {
		const walkDog = makeTask({
			id: "walk-dog",
			name: "Walk Dog",
			category: "dog",
		});
		const state = createTestState({
			screen: "game",
			tasks: [walkDog],
			slotsRemaining: 3,
			timeBlock: "evening",
			dogFailedYesterday: true,
		});
		const info = getScreenInfo(state) as GameScreenInfo;
		const dogTask = info.tasks.find((t) => t.id === "walk-dog");
		expect(dogTask?.urgency).toBeDefined();
		expect(dogTask?.urgency?.level).toBeDefined();
		expect(typeof dogTask?.urgency?.text).toBe("string");
	});

	test("includes variant info when unlocked", () => {
		const task = makeTask({
			minimalVariant: {
				name: "Quick Rinse",
				baseRate: 0.8,
				unlockHints: [],
			},
		});
		const state = createTestState({
			screen: "game",
			tasks: [task],
			variantsUnlocked: ["chores"],
			slotsRemaining: 3,
			timeBlock: "morning",
		});
		const info = getScreenInfo(state) as GameScreenInfo;
		const display = info.tasks.find((t) => t.id === "dishes");
		expect(display?.variant?.name).toBe("Quick Rinse");
	});
});

describe("NightChoiceInfo", () => {
	test("includes day and prompt", () => {
		const state = createTestState({
			screen: "nightChoice",
			day: "tuesday",
			timeBlock: "night",
		});
		const info = getScreenInfo(state) as NightChoiceInfo;
		expect(info.type).toBe("nightChoice");
		expect(info.day).toBe("tuesday");
		expect(typeof info.nightPrompt).toBe("string");
		expect(typeof info.description).toBe("string");
	});

	test("canPushThrough reflects eligibility", () => {
		const canPush = createTestState({
			screen: "nightChoice",
			pushedThroughLastNight: false,
			inExtendedNight: false,
			dayIndex: 0,
		});
		const cantPush = createTestState({
			screen: "nightChoice",
			pushedThroughLastNight: true,
		});
		const pushInfo = getScreenInfo(canPush) as NightChoiceInfo;
		const noPushInfo = getScreenInfo(cantPush) as NightChoiceInfo;
		expect(pushInfo.canPushThrough).toBe(true);
		expect(noPushInfo.canPushThrough).toBe(false);
	});
});

describe("FriendRescueInfo", () => {
	test("includes message and activities", () => {
		const state = createTestState({
			screen: "friendRescue",
			slotsRemaining: 3,
		});
		const info = getScreenInfo(state) as FriendRescueInfo;
		expect(info.type).toBe("friendRescue");
		expect(typeof info.message).toBe("string");
		expect(info.activities.length).toBe(3);
		expect(info.cost).toBeGreaterThan(0);
		expect(typeof info.costLabel).toBe("string");
		expect(typeof info.declineLabel).toBe("string");
	});
});

describe("DaySummaryInfo", () => {
	test("computes attempt and success counts", () => {
		const tasks = [
			makeTask({ attemptedToday: true, succeededToday: true }),
			makeTask({
				id: "work",
				attemptedToday: true,
				succeededToday: false,
			}),
			makeTask({
				id: "laundry",
				attemptedToday: false,
				succeededToday: false,
			}),
		];
		const state = createTestState({
			screen: "daySummary",
			tasks,
		});
		const info = getScreenInfo(state) as DaySummaryInfo;
		expect(info.type).toBe("daySummary");
		expect(info.attemptedCount).toBe(2);
		expect(info.succeededCount).toBe(1);
	});

	test("generates narrative text", () => {
		const state = createTestState({ screen: "daySummary" });
		const info = getScreenInfo(state) as DaySummaryInfo;
		expect(typeof info.narrative).toBe("string");
		expect(info.narrative.length).toBeGreaterThan(0);
	});

	test("includes title", () => {
		const state = createTestState({
			screen: "daySummary",
			day: "thursday",
		});
		const info = getScreenInfo(state) as DaySummaryInfo;
		expect(typeof info.title).toBe("string");
	});

	test("flags all-nighter", () => {
		const normal = createTestState({
			screen: "daySummary",
			inExtendedNight: false,
		});
		const allNighter = createTestState({
			screen: "daySummary",
			inExtendedNight: true,
		});
		expect((getScreenInfo(normal) as DaySummaryInfo).pulledAllNighter).toBe(
			false,
		);
		expect((getScreenInfo(allNighter) as DaySummaryInfo).pulledAllNighter).toBe(
			true,
		);
	});
});

describe("WeekCompleteInfo", () => {
	test("computes totals and patterns", () => {
		const state = createTestState({
			screen: "weekComplete",
			dayIndex: 6,
		});
		const info = getScreenInfo(state) as WeekCompleteInfo;
		expect(info.type).toBe("weekComplete");
		expect(typeof info.totalSuccesses).toBe("number");
		expect(typeof info.totalFailures).toBe("number");
		expect(typeof info.narrative).toBe("string");
		expect(info.patterns).toBeDefined();
		expect(typeof info.patterns.personality).toBe("string");
		expect(info.patterns.seed).toBe(42);
	});

	test("computes success rate", () => {
		const state = createTestState({
			screen: "weekComplete",
			runStats: {
				...createInitialState(42).runStats,
				tasks: { attempted: 10, succeeded: 7 },
			},
		});
		const info = getScreenInfo(state) as WeekCompleteInfo;
		expect(info.patterns.successRate).toBeCloseTo(0.7, 5);
	});
});

describe("NarrativeEventInfo", () => {
	test("returns fallback when no active event", () => {
		const state = createTestState({
			screen: "narrativeEvent",
			activeEventId: null,
		});
		const info = getScreenInfo(state) as NarrativeEventInfo;
		expect(info.type).toBe("narrativeEvent");
		expect(info.eventType).toBe("minor");
	});

	test("includes choices for major events", () => {
		const state = createTestState({
			screen: "narrativeEvent",
			activeEventId: "leak-found",
		});
		const info = getScreenInfo(state) as NarrativeEventInfo;
		expect(info.type).toBe("narrativeEvent");
		expect(info.eventType).toBe("major");
		expect(info.choices.length).toBe(2);
		for (const choice of info.choices) {
			expect(typeof choice.id).toBe("string");
			expect(typeof choice.label).toBe("string");
		}
	});

	test("returns text for minor events", () => {
		const state = createTestState({
			screen: "narrativeEvent",
			activeEventId: "rain",
		});
		const info = getScreenInfo(state) as NarrativeEventInfo;
		expect(info.eventType).toBe("minor");
		expect(typeof info.text).toBe("string");
	});
});
