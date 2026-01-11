import { describe, expect, test } from "bun:test";
import { createInitialState, type GameState } from "../state";
import {
	ACTIVITIES,
	CORRECT_TIER_EFFECTS,
	canAffordRescue,
	FRIEND_RESCUE_CHANCE,
	FRIEND_RESCUE_COST_WEEKDAY,
	FRIEND_RESCUE_COST_WEEKEND,
	FRIEND_RESCUE_THRESHOLD,
	getActivityEffects,
	getRandomRescueMessage,
	getRescueCost,
	isCorrectTier,
	RESCUE_MESSAGES,
	shouldTriggerFriendRescue,
	WRONG_TIER_EFFECTS,
} from "./friend";

function createTestState(overrides: Partial<GameState> = {}): GameState {
	return {
		...createInitialState(),
		...overrides,
	};
}

describe("friend rescue trigger", () => {
	test("does not trigger below threshold", () => {
		const state = createTestState({
			consecutiveFailures: 2,
			friendRescueUsedToday: false,
			slotsRemaining: 3,
		});
		// Even with 100% chance, shouldn't trigger below threshold
		expect(state.consecutiveFailures).toBeLessThan(FRIEND_RESCUE_THRESHOLD);
	});

	test("does not trigger if already used today", () => {
		const state = createTestState({
			consecutiveFailures: 5,
			friendRescueUsedToday: true,
			slotsRemaining: 3,
		});
		expect(shouldTriggerFriendRescue(state)).toBe(false);
	});

	test("does not trigger if cannot afford", () => {
		const state = createTestState({
			consecutiveFailures: 5,
			friendRescueUsedToday: false,
			slotsRemaining: 0,
		});
		expect(shouldTriggerFriendRescue(state)).toBe(false);
	});

	test("threshold constant is 3", () => {
		expect(FRIEND_RESCUE_THRESHOLD).toBe(3);
	});

	test("chance constant is 40%", () => {
		expect(FRIEND_RESCUE_CHANCE).toBe(0.4);
	});
});

describe("canAffordRescue", () => {
	test("returns true on weekday with slots", () => {
		const state = createTestState({
			dayIndex: 0, // Monday
			slotsRemaining: 1,
		});
		expect(canAffordRescue(state)).toBe(true);
	});

	test("returns false on weekday without slots", () => {
		const state = createTestState({
			dayIndex: 0, // Monday
			slotsRemaining: 0,
		});
		expect(canAffordRescue(state)).toBe(false);
	});

	test("returns true on weekend with enough points", () => {
		const state = createTestState({
			dayIndex: 5, // Saturday
			weekendPointsRemaining: 2,
		});
		expect(canAffordRescue(state)).toBe(true);
	});

	test("returns false on weekend without enough points", () => {
		const state = createTestState({
			dayIndex: 5, // Saturday
			weekendPointsRemaining: 1,
		});
		expect(canAffordRescue(state)).toBe(false);
	});
});

describe("getRescueCost", () => {
	test("returns 1 on weekday", () => {
		const state = createTestState({ dayIndex: 0 });
		expect(getRescueCost(state)).toBe(FRIEND_RESCUE_COST_WEEKDAY);
		expect(getRescueCost(state)).toBe(1);
	});

	test("returns 2 on weekend", () => {
		const state = createTestState({ dayIndex: 5 });
		expect(getRescueCost(state)).toBe(FRIEND_RESCUE_COST_WEEKEND);
		expect(getRescueCost(state)).toBe(2);
	});
});

describe("activity tiers", () => {
	test("low tier has threshold 0.2", () => {
		const low = ACTIVITIES.find((a) => a.id === "low");
		expect(low?.energyThreshold).toBe(0.2);
	});

	test("medium tier has threshold 0.45", () => {
		const medium = ACTIVITIES.find((a) => a.id === "medium");
		expect(medium?.energyThreshold).toBe(0.45);
	});

	test("high tier has threshold 0.7", () => {
		const high = ACTIVITIES.find((a) => a.id === "high");
		expect(high?.energyThreshold).toBe(0.7);
	});
});

describe("isCorrectTier", () => {
	function getActivity(id: string) {
		const activity = ACTIVITIES.find((a) => a.id === id);
		if (!activity) throw new Error(`Activity ${id} not found`);
		return activity;
	}

	test("low tier correct at 0.2 energy", () => {
		expect(isCorrectTier(getActivity("low"), 0.2)).toBe(true);
	});

	test("low tier correct at high energy", () => {
		expect(isCorrectTier(getActivity("low"), 0.8)).toBe(true);
	});

	test("low tier incorrect below threshold", () => {
		expect(isCorrectTier(getActivity("low"), 0.1)).toBe(false);
	});

	test("medium tier correct at 0.45 energy", () => {
		expect(isCorrectTier(getActivity("medium"), 0.45)).toBe(true);
	});

	test("medium tier incorrect at 0.3 energy", () => {
		expect(isCorrectTier(getActivity("medium"), 0.3)).toBe(false);
	});

	test("high tier correct at 0.7 energy", () => {
		expect(isCorrectTier(getActivity("high"), 0.7)).toBe(true);
	});

	test("high tier incorrect at 0.6 energy", () => {
		expect(isCorrectTier(getActivity("high"), 0.6)).toBe(false);
	});
});

describe("getActivityEffects", () => {
	function getActivity(id: string) {
		const activity = ACTIVITIES.find((a) => a.id === id);
		if (!activity) throw new Error(`Activity ${id} not found`);
		return activity;
	}

	test("correct tier gives positive effects", () => {
		const effects = getActivityEffects(getActivity("low"), 0.5);
		expect(effects).toEqual(CORRECT_TIER_EFFECTS);
		expect(effects.momentum).toBe(0.1);
		expect(effects.energy).toBe(0.1);
	});

	test("wrong tier gives reduced/negative effects", () => {
		const effects = getActivityEffects(getActivity("high"), 0.3);
		expect(effects).toEqual(WRONG_TIER_EFFECTS);
		expect(effects.momentum).toBe(0.03);
		expect(effects.energy).toBe(-0.08);
	});
});

describe("getRandomRescueMessage", () => {
	test("returns a message from the list", () => {
		const message = getRandomRescueMessage(12345);
		expect(RESCUE_MESSAGES).toContain(message);
	});

	test("same seed gives same message", () => {
		const msg1 = getRandomRescueMessage(42);
		const msg2 = getRandomRescueMessage(42);
		expect(msg1).toBe(msg2);
	});

	test("different seeds can give different messages", () => {
		const messages = new Set<string>();
		for (let i = 0; i < 100; i++) {
			messages.add(getRandomRescueMessage(i));
		}
		// Should hit at least a few different messages
		expect(messages.size).toBeGreaterThan(1);
	});
});
