import { describe, expect, test } from "bun:test";
import { createInitialState, type GameState } from "../state";
import { FALLBACK_HINT, getPatternHint } from "./patternHints";

function createTestState(overrides: Partial<GameState> = {}): GameState {
	return {
		...createInitialState(),
		...overrides,
	};
}

describe("getPatternHint", () => {
	test("returns night hint when at night with high momentum", () => {
		const state = createTestState({
			timeBlock: "night",
			momentum: 0.7,
		});
		const hint = getPatternHint(state);
		expect(hint).toContain("night");
	});

	test("returns creative hint when creative task has many failures", () => {
		const state = createTestState();
		// Find and update the creative task
		state.tasks = state.tasks.map((t) =>
			t.category === "creative" ? { ...t, failureCount: 5 } : t,
		);
		const hint = getPatternHint(state);
		expect(hint).toContain("creative");
	});

	test("returns low energy hint when energy is low", () => {
		const state = createTestState({
			energy: 0.2,
		});
		const hint = getPatternHint(state);
		expect(hint).toContain("wiped");
	});

	test("returns food hint when cook task has many failures", () => {
		const state = createTestState();
		state.tasks = state.tasks.map((t) =>
			t.id === "cook" ? { ...t, failureCount: 4 } : t,
		);
		const hint = getPatternHint(state);
		expect(hint).toContain("food");
	});

	test("returns high momentum hint when momentum is high", () => {
		const state = createTestState({
			momentum: 0.8,
			timeBlock: "afternoon", // Not night to avoid night hint
		});
		const hint = getPatternHint(state);
		expect(hint).toContain("roll");
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
		expect(hint).toContain("dog");
	});

	test("returns fallback when no conditions match", () => {
		const state = createTestState({
			momentum: 0.5, // Normal
			energy: 0.5, // Normal
			timeBlock: "afternoon", // Not night
		});
		// Ensure no special conditions
		state.tasks = state.tasks.map((t) => ({
			...t,
			failureCount: 0,
			succeededToday: false,
		}));
		const hint = getPatternHint(state);
		expect(hint).toBe(FALLBACK_HINT);
	});
});
