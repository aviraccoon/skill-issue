/**
 * Shared test utilities for creating game state, stores, tasks,
 * and mocking browser APIs in Bun's test environment.
 */
import { createInitialState, type GameState, type Task } from "./state";
import { createStore, type Store } from "./store";
import { ACTIVITIES, type Activity } from "./systems/friend";

/** Default seed used across test files for deterministic behavior. */
export const TEST_SEED = 42;

/**
 * Creates a GameState with neutral personality and predictable modifiers.
 * Energy and momentum default to 0.5 (1.0x modifiers with neutral personality).
 * Uses seed 42 for deterministic task pools and randomness.
 */
export function createTestState(overrides: Partial<GameState> = {}): GameState {
	return {
		...createInitialState(TEST_SEED),
		energy: 0.5,
		momentum: 0.5,
		personality: { time: "neutral", social: "neutral" },
		...overrides,
	};
}

/** Creates a store initialized with test state defaults. */
export function createTestStore(
	overrides: Partial<GameState> = {},
): Store<GameState> {
	return createStore(createTestState(overrides));
}

/** Creates a minimal Task with sensible defaults and overrides. */
export function makeTask(overrides: Partial<Task> = {}): Task {
	return {
		id: "dishes",
		name: "Do Dishes",
		category: "chores",
		baseRate: 0.5,
		availableBlocks: ["morning", "afternoon", "evening", "night"],
		failureCount: 0,
		successCount: 0,
		attemptedToday: false,
		succeededToday: false,
		...overrides,
	};
}

/** Looks up a friend rescue activity by tier, throwing if not found. */
export function getActivity(tier: "low" | "medium" | "high"): Activity {
	const activity = ACTIVITIES.find((a) => a.id === tier);
	if (!activity) throw new Error(`Activity ${tier} not found`);
	return activity;
}
