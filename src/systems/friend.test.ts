import { describe, expect, test } from "bun:test";
import { getRandomRescueMessage } from "../data/friendRescue";
import { strings } from "../i18n";
import { createInitialState, type GameState } from "../state";
import { createStore } from "../store";
import {
	ACTIVITIES,
	CORRECT_TIER_MOMENTUM,
	canAffordRescue,
	FRIEND_RESCUE_CHANCE_BASE,
	FRIEND_RESCUE_CHANCE_VARIANCE,
	FRIEND_RESCUE_COST_WEEKDAY,
	FRIEND_RESCUE_COST_WEEKEND,
	FRIEND_RESCUE_THRESHOLD,
	getActivityEffects,
	getFriendRescueChance,
	getRescueCost,
	isCorrectTier,
	shouldTriggerFriendRescue,
	WRONG_TIER_ENERGY_PENALTY,
	WRONG_TIER_MOMENTUM,
} from "./friend";

function createTestState(overrides: Partial<GameState> = {}): GameState {
	return {
		...createInitialState(),
		...overrides,
	};
}

function createTestStore(overrides: Partial<GameState> = {}) {
	return createStore(createTestState(overrides));
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
		const store = createTestStore({
			consecutiveFailures: 5,
			friendRescueUsedToday: true,
			slotsRemaining: 3,
		});
		expect(shouldTriggerFriendRescue(store)).toBe(false);
	});

	test("does not trigger if cannot afford", () => {
		const store = createTestStore({
			consecutiveFailures: 5,
			friendRescueUsedToday: false,
			slotsRemaining: 0,
		});
		expect(shouldTriggerFriendRescue(store)).toBe(false);
	});

	test("threshold constant is 3", () => {
		expect(FRIEND_RESCUE_THRESHOLD).toBe(3);
	});

	test("base chance constant is 40%", () => {
		expect(FRIEND_RESCUE_CHANCE_BASE).toBe(0.4);
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

	test("correct tier with neutral personality gives +10% energy", () => {
		const state = createTestState({
			energy: 0.5,
			personality: { time: "neutral", social: "neutral" },
		});
		const effects = getActivityEffects(getActivity("low"), state);
		expect(effects.momentum).toBe(CORRECT_TIER_MOMENTUM);
		expect(effects.energy).toBe(0.1); // Neutral social = +10%
	});

	test("correct tier with socialBattery gives +12% energy", () => {
		const state = createTestState({
			energy: 0.5,
			personality: { time: "neutral", social: "socialBattery" },
		});
		const effects = getActivityEffects(getActivity("low"), state);
		expect(effects.momentum).toBe(CORRECT_TIER_MOMENTUM);
		expect(effects.energy).toBe(0.12); // Social Battery = +12%
	});

	test("correct tier with hermit costs -3% energy", () => {
		const state = createTestState({
			energy: 0.5,
			personality: { time: "neutral", social: "hermit" },
		});
		const effects = getActivityEffects(getActivity("low"), state);
		expect(effects.momentum).toBe(CORRECT_TIER_MOMENTUM);
		expect(effects.energy).toBe(-0.03); // Hermit = -3%
	});

	test("wrong tier gives reduced momentum", () => {
		const state = createTestState({
			energy: 0.3,
			personality: { time: "neutral", social: "neutral" },
		});
		const effects = getActivityEffects(getActivity("high"), state);
		expect(effects.momentum).toBe(WRONG_TIER_MOMENTUM);
	});

	test("wrong tier with neutral personality gives base - penalty energy", () => {
		const state = createTestState({
			energy: 0.3,
			personality: { time: "neutral", social: "neutral" },
		});
		const effects = getActivityEffects(getActivity("high"), state);
		// Neutral base +10% minus wrong tier penalty -8% = +2%
		expect(effects.energy).toBeCloseTo(0.1 - WRONG_TIER_ENERGY_PENALTY);
	});

	test("wrong tier with hermit stacks penalties", () => {
		const state = createTestState({
			energy: 0.3,
			personality: { time: "neutral", social: "hermit" },
		});
		const effects = getActivityEffects(getActivity("high"), state);
		// Hermit base -3% minus wrong tier penalty -8% = -11%
		expect(effects.energy).toBeCloseTo(-0.03 - WRONG_TIER_ENERGY_PENALTY);
	});
});

describe("getRandomRescueMessage", () => {
	test("returns a message from the list", () => {
		const state = createTestState({ runSeed: 12345 });
		const message = getRandomRescueMessage(state);
		const s = strings();
		expect(s.friend.rescueMessages).toContain(message);
	});

	test("same seed gives same message", () => {
		const state = createTestState({ runSeed: 42 });
		const msg1 = getRandomRescueMessage(state);
		const msg2 = getRandomRescueMessage(state);
		expect(msg1).toBe(msg2);
	});

	test("different seeds can give different messages", () => {
		const messages = new Set<string>();
		for (let i = 0; i < 100; i++) {
			const state = createTestState({ runSeed: i });
			messages.add(getRandomRescueMessage(state));
		}
		// Should hit at least a few different messages
		expect(messages.size).toBeGreaterThan(1);
	});
});

describe("getFriendRescueChance", () => {
	test("varies by seed within range (35-45%)", () => {
		const minChance = FRIEND_RESCUE_CHANCE_BASE - FRIEND_RESCUE_CHANCE_VARIANCE;
		const maxChance = FRIEND_RESCUE_CHANCE_BASE + FRIEND_RESCUE_CHANCE_VARIANCE;
		for (let i = 0; i < 100; i++) {
			const chance = getFriendRescueChance(i * 12345);
			expect(chance).toBeGreaterThanOrEqual(minChance);
			expect(chance).toBeLessThanOrEqual(maxChance);
		}
	});

	test("same seed gives same chance", () => {
		const c1 = getFriendRescueChance(42);
		const c2 = getFriendRescueChance(42);
		expect(c1).toBe(c2);
	});

	test("base and variance are correct", () => {
		expect(FRIEND_RESCUE_CHANCE_BASE).toBe(0.4);
		expect(FRIEND_RESCUE_CHANCE_VARIANCE).toBe(0.05);
	});
});
