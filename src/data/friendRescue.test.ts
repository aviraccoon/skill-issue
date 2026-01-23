import { describe, expect, test } from "bun:test";
import { createInitialState, type GameState } from "../state";
import {
	COOKING_STRUGGLING,
	CREATIVE_STRUGGLING,
	DOG_ANCHOR,
	EARLY_BIRD_THRIVING,
	FALLBACK_HINTS,
	getPatternHint,
	HERMIT_SOCIAL_COST,
	HIGH_MOMENTUM,
	LOW_ENERGY,
	NIGHT_OWL_THRIVING,
	SOCIAL_BATTERY_BOOST,
} from "./friendRescue";

/**
 * Creates a test state with neutral personality by default.
 * This prevents personality-specific hints from interfering with other tests.
 */
function createTestState(overrides: Partial<GameState> = {}): GameState {
	const base = createInitialState();
	return {
		...base,
		// Default to neutral personality to avoid personality hints interfering
		personality: { time: "neutral", social: "neutral" },
		consecutiveFailures: 0,
		...overrides,
	};
}

describe("getPatternHint", () => {
	test("returns night owl hint when night owl at night with high momentum", () => {
		const state = createTestState({
			personality: { time: "nightOwl", social: "neutral" },
			timeBlock: "night",
			momentum: 0.7,
		});
		const hint = getPatternHint(state);
		expect(NIGHT_OWL_THRIVING.messages).toContain(hint);
	});

	test("returns early bird hint when early bird in morning with high momentum", () => {
		const state = createTestState({
			personality: { time: "earlyBird", social: "neutral" },
			timeBlock: "morning",
			momentum: 0.7,
		});
		const hint = getPatternHint(state);
		expect(EARLY_BIRD_THRIVING.messages).toContain(hint);
	});

	test("returns creative hint when creative task has many failures", () => {
		const state = createTestState();
		state.tasks = state.tasks.map((t) =>
			t.category === "creative" ? { ...t, failureCount: 5 } : t,
		);
		const hint = getPatternHint(state);
		expect(CREATIVE_STRUGGLING.messages).toContain(hint);
	});

	test("returns low energy hint when energy is low", () => {
		const state = createTestState({
			energy: 0.2,
		});
		const hint = getPatternHint(state);
		expect(LOW_ENERGY.messages).toContain(hint);
	});

	test("returns food hint when cook task has many failures", () => {
		const state = createTestState({
			energy: 0.5, // Normal energy to avoid low energy hint
		});
		state.tasks = state.tasks.map((t) =>
			t.id === "cook" ? { ...t, failureCount: 4 } : t,
		);
		const hint = getPatternHint(state);
		expect(COOKING_STRUGGLING.messages).toContain(hint);
	});

	test("returns high momentum hint when momentum is high", () => {
		const state = createTestState({
			momentum: 0.8,
			energy: 0.5, // Normal energy
			timeBlock: "afternoon", // Not night to avoid night hint
		});
		const hint = getPatternHint(state);
		expect(HIGH_MOMENTUM.messages).toContain(hint);
	});

	test("returns dog hint when dog was walked today", () => {
		const state = createTestState({
			momentum: 0.5, // Normal momentum
			energy: 0.5, // Normal energy
			timeBlock: "afternoon",
		});
		state.tasks = state.tasks.map((t) =>
			t.id === "walk-dog" ? { ...t, succeededToday: true } : t,
		);
		const hint = getPatternHint(state);
		expect(DOG_ANCHOR.messages).toContain(hint);
	});

	test("returns hermit hint for hermit personality", () => {
		const state = createTestState({
			personality: { time: "neutral", social: "hermit" },
			momentum: 0.5,
			energy: 0.5,
			timeBlock: "afternoon",
		});
		const hint = getPatternHint(state);
		expect(HERMIT_SOCIAL_COST.messages).toContain(hint);
	});

	test("returns social battery hint for social battery personality", () => {
		const state = createTestState({
			personality: { time: "neutral", social: "socialBattery" },
			momentum: 0.5,
			energy: 0.5,
			timeBlock: "afternoon",
		});
		const hint = getPatternHint(state);
		expect(SOCIAL_BATTERY_BOOST.messages).toContain(hint);
	});

	test("returns fallback when no conditions match", () => {
		const state = createTestState({
			momentum: 0.5, // Normal
			energy: 0.5, // Normal
			timeBlock: "afternoon", // Not night
			consecutiveFailures: 0, // No general struggle
		});
		// Ensure no special conditions
		state.tasks = state.tasks.map((t) => ({
			...t,
			failureCount: 0,
			succeededToday: false,
		}));
		const hint = getPatternHint(state);
		expect(FALLBACK_HINTS).toContain(hint);
	});
});
