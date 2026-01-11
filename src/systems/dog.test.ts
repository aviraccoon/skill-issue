import { describe, expect, test } from "bun:test";
import { createInitialState, type GameState } from "../state";
import {
	getDogUrgency,
	wasDogWalkAttemptedButFailed,
	wasDogWalkedToday,
} from "./dog";

/** Creates a test state with customizable properties. */
function createTestState(
	overrides: Partial<GameState> = {},
	taskOverrides: {
		walkDogSucceeded?: boolean;
		walkDogAttempted?: boolean;
	} = {},
): GameState {
	const state = createInitialState();
	const merged = { ...state, ...overrides };

	// Apply task overrides
	if (
		taskOverrides.walkDogSucceeded !== undefined ||
		taskOverrides.walkDogAttempted !== undefined
	) {
		merged.tasks = merged.tasks.map((t) => {
			if (t.id === "walk-dog") {
				return {
					...t,
					succeededToday: taskOverrides.walkDogSucceeded ?? false,
					attemptedToday:
						taskOverrides.walkDogAttempted ??
						taskOverrides.walkDogSucceeded ??
						false,
				};
			}
			return t;
		});
	}

	return merged;
}

describe("getDogUrgency", () => {
	test("returns normal in morning when dog not walked yesterday", () => {
		const state = createTestState({
			timeBlock: "morning",
			dogFailedYesterday: false,
		});
		expect(getDogUrgency(state)).toBe("normal");
	});

	test("returns waiting in afternoon", () => {
		const state = createTestState({
			timeBlock: "afternoon",
			dogFailedYesterday: false,
		});
		expect(getDogUrgency(state)).toBe("waiting");
	});

	test("returns urgent in evening", () => {
		const state = createTestState({
			timeBlock: "evening",
			dogFailedYesterday: false,
		});
		expect(getDogUrgency(state)).toBe("urgent");
	});

	test("returns critical at night", () => {
		const state = createTestState({
			timeBlock: "night",
			dogFailedYesterday: false,
		});
		expect(getDogUrgency(state)).toBe("critical");
	});

	test("returns normal when dog already walked", () => {
		const state = createTestState(
			{ timeBlock: "night", dogFailedYesterday: false },
			{ walkDogSucceeded: true },
		);
		expect(getDogUrgency(state)).toBe("normal");
	});

	test("floor urgency at waiting when dog failed yesterday", () => {
		const state = createTestState({
			timeBlock: "morning",
			dogFailedYesterday: true,
		});
		expect(getDogUrgency(state)).toBe("waiting");
	});

	test("dogFailedYesterday doesn't affect urgency after walk succeeds", () => {
		const state = createTestState(
			{ timeBlock: "morning", dogFailedYesterday: true },
			{ walkDogSucceeded: true },
		);
		expect(getDogUrgency(state)).toBe("normal");
	});

	test("returns waiting on weekends (default urgency level)", () => {
		const state = createTestState({ dayIndex: 5, dogFailedYesterday: false }); // Saturday
		expect(getDogUrgency(state)).toBe("waiting");
	});
});

describe("wasDogWalkedToday", () => {
	test("returns false when dog not walked", () => {
		const state = createTestState({}, { walkDogSucceeded: false });
		expect(wasDogWalkedToday(state)).toBe(false);
	});

	test("returns true when dog was walked", () => {
		const state = createTestState({}, { walkDogSucceeded: true });
		expect(wasDogWalkedToday(state)).toBe(true);
	});

	test("returns false when attempted but failed", () => {
		const state = createTestState(
			{},
			{ walkDogAttempted: true, walkDogSucceeded: false },
		);
		expect(wasDogWalkedToday(state)).toBe(false);
	});
});

describe("wasDogWalkAttemptedButFailed", () => {
	test("returns false when not attempted", () => {
		const state = createTestState({}, {});
		expect(wasDogWalkAttemptedButFailed(state)).toBe(false);
	});

	test("returns false when succeeded", () => {
		const state = createTestState({}, { walkDogSucceeded: true });
		expect(wasDogWalkAttemptedButFailed(state)).toBe(false);
	});

	test("returns true when attempted but failed", () => {
		const state = createTestState(
			{},
			{ walkDogAttempted: true, walkDogSucceeded: false },
		);
		expect(wasDogWalkAttemptedButFailed(state)).toBe(true);
	});
});
