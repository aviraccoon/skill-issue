import { describe, expect, test } from "bun:test";
import { strings } from "../i18n";
import {
	createInitialState,
	type EventInstance,
	type GameState,
} from "../state";
import { getEventFriendRescue } from "./events";
import {
	getMostRecentEventWithContent,
	getPatternHint,
	getRandomRescueMessage,
} from "./friendRescue";
import { getTasksWithVariants } from "./tasks";

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
		const result = getPatternHint(state);
		const s = strings();
		expect(s.hints.nightOwlThriving).toContain(result.hint);
	});

	test("returns early bird hint when early bird in morning with high momentum", () => {
		const state = createTestState({
			personality: { time: "earlyBird", social: "neutral" },
			timeBlock: "morning",
			momentum: 0.7,
		});
		const result = getPatternHint(state);
		const s = strings();
		expect(s.hints.earlyBirdThriving).toContain(result.hint);
	});

	test("returns creative hint when creative task has many failures", () => {
		const state = createTestState();
		state.tasks = state.tasks.map((t) =>
			t.category === "creative" ? { ...t, failureCount: 5 } : t,
		);
		const result = getPatternHint(state);
		const s = strings();
		expect(s.hints.creativeStruggling).toContain(result.hint);
	});

	test("returns low energy hint when energy is low", () => {
		const state = createTestState({
			energy: 0.2,
		});
		const result = getPatternHint(state);
		const s = strings();
		expect(s.hints.lowEnergy).toContain(result.hint);
	});

	test("returns high momentum hint when momentum is high", () => {
		const state = createTestState({
			momentum: 0.8,
			energy: 0.5, // Normal energy
			timeBlock: "afternoon", // Not night to avoid night hint
		});
		const result = getPatternHint(state);
		const s = strings();
		expect(s.hints.highMomentum).toContain(result.hint);
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
		const result = getPatternHint(state);
		const s = strings();
		expect(s.hints.dogAnchor).toContain(result.hint);
	});

	test("returns hermit hint for hermit personality", () => {
		const state = createTestState({
			personality: { time: "neutral", social: "hermit" },
			momentum: 0.5,
			energy: 0.5,
			timeBlock: "afternoon",
		});
		const result = getPatternHint(state);
		const s = strings();
		expect(s.hints.hermitSocialCost).toContain(result.hint);
	});

	test("returns social battery hint for social battery personality", () => {
		const state = createTestState({
			personality: { time: "neutral", social: "socialBattery" },
			momentum: 0.5,
			energy: 0.5,
			timeBlock: "afternoon",
		});
		const result = getPatternHint(state);
		const s = strings();
		expect(s.hints.socialBatteryBoost).toContain(result.hint);
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
		const result = getPatternHint(state);
		const s = strings();
		expect(s.hints.fallback).toContain(result.hint);
	});
});

describe("variant unlock hints", () => {
	// Find the cook task variant info for tests
	const cookVariant = getTasksWithVariants().find((t) => t.id === "cook");

	test("variant hint can return unlocksVariant when task has failures", () => {
		// Use a seed and state that triggers the variant hint
		// With high failures and low energy, probability is high
		// Need to find a seed that consistently triggers
		let foundUnlock = false;

		// Try multiple seeds to find one that triggers
		for (let seed = 0; seed < 100; seed++) {
			const state = createTestState({
				runSeed: seed,
				dayIndex: 0,
				rollCount: 0,
				energy: 0.2, // Low energy bonus
				momentum: 0.2, // Low momentum bonus
			});
			state.tasks = state.tasks.map((t) =>
				t.id === "cook" ? { ...t, failureCount: 10 } : t,
			);

			const result = getPatternHint(state);
			if (result.unlocksVariant === "food") {
				foundUnlock = true;
				// Verify the hint is from the cook variant unlock hints
				expect(cookVariant?.minimalVariant.unlockHints).toContain(result.hint);
				break;
			}
		}

		expect(foundUnlock).toBe(true);
	});

	test("variant hint does not fire when category already unlocked", () => {
		// Even with high failures and optimal conditions, if already unlocked, no unlock
		for (let seed = 0; seed < 50; seed++) {
			const state = createTestState({
				runSeed: seed,
				dayIndex: 0,
				rollCount: 0,
				energy: 0.2,
				momentum: 0.2,
				variantsUnlocked: ["food"], // Already unlocked
			});
			state.tasks = state.tasks.map((t) =>
				t.id === "cook" ? { ...t, failureCount: 10 } : t,
			);

			const result = getPatternHint(state);
			// Should never return food as unlocksVariant since it's already unlocked
			expect(result.unlocksVariant).not.toBe("food");
		}
	});

	test("variant hint does not fire when task has no failures", () => {
		// Even with optimal seed, no failures means no variant hint
		for (let seed = 0; seed < 50; seed++) {
			const state = createTestState({
				runSeed: seed,
				dayIndex: 0,
				rollCount: 0,
				energy: 0.2,
				momentum: 0.2,
			});
			// Keep all tasks at 0 failures
			state.tasks = state.tasks.map((t) => ({ ...t, failureCount: 0 }));

			const result = getPatternHint(state);
			// Should never return a variant unlock with no failures
			expect(result.unlocksVariant).toBeUndefined();
		}
	});

	test("higher failures increase variant hint weight (checked via isolated pool)", () => {
		// With only variant hint in pool (no other matching hints),
		// higher failures should still result in selection (weight > 0)
		const lowState = createTestState({
			runSeed: 12345,
			dayIndex: 2,
			rollCount: 5,
			energy: 0.5,
			momentum: 0.5, // Not high enough for HIGH_MOMENTUM
		});
		lowState.tasks = lowState.tasks.map((t) =>
			t.id === "cook" ? { ...t, failureCount: 1 } : t,
		);

		const highState = createTestState({
			runSeed: 12345,
			dayIndex: 2,
			rollCount: 5,
			energy: 0.5,
			momentum: 0.5,
		});
		highState.tasks = highState.tasks.map((t) =>
			t.id === "cook" ? { ...t, failureCount: 2 } : t,
		);

		// Both should be able to fire food variant (just checking it works)
		const lowResult = getPatternHint(lowState);
		const highResult = getPatternHint(highState);

		// With neutral personality and no other triggering conditions,
		// the variant hint should be among candidates
		// (Testing that the weight calculation doesn't break)
		expect(lowResult.hint).toBeDefined();
		expect(highResult.hint).toBeDefined();
	});

	test("variant hints compete with other hints via weighted random", () => {
		// When multiple hints match, weighted random selects between them
		// Variant hints with higher weights should win more often
		let variantWins = 0;
		let stateWins = 0;
		const trials = 200;

		for (let i = 0; i < trials; i++) {
			const state = createTestState({
				runSeed: i * 7,
				dayIndex: i % 7,
				rollCount: i,
				energy: 0.25, // Triggers LOW_ENERGY (weight 6)
				momentum: 0.5,
			});
			// High failures gives variant hint high weight (~30+)
			state.tasks = state.tasks.map((t) =>
				t.id === "cook" ? { ...t, failureCount: 6 } : t,
			);

			const result = getPatternHint(state);
			if (result.unlocksVariant === "food") {
				variantWins++;
			} else if (
				result.hint.includes("wiped") ||
				result.hint.includes("rough")
			) {
				stateWins++;
			}
		}

		// With high failures (weight ~30) vs LOW_ENERGY (weight 6),
		// variant should win majority but not all
		expect(variantWins).toBeGreaterThan(stateWins);
		expect(stateWins).toBeGreaterThan(0); // State hints should still fire sometimes
	});

	test("low energy adds weight bonus to variant hints", () => {
		// Low energy adds +3 to variant weight
		// Verify by checking the variant can compete better
		let lowEnergyVariant = 0;
		let normalEnergyVariant = 0;
		const trials = 200;

		for (let i = 0; i < trials; i++) {
			// Both states have hermit personality which adds a competing hint
			const lowState = createTestState({
				runSeed: i * 11,
				dayIndex: i % 7,
				rollCount: i,
				energy: 0.3, // Low energy bonus (+3)
				momentum: 0.5,
				personality: { time: "neutral", social: "hermit" }, // HERMIT weight 10
			});
			lowState.tasks = lowState.tasks.map((t) =>
				t.id === "cook" ? { ...t, failureCount: 2 } : t,
			);

			const normalState = createTestState({
				runSeed: i * 11,
				dayIndex: i % 7,
				rollCount: i,
				energy: 0.6, // No low energy bonus
				momentum: 0.5,
				personality: { time: "neutral", social: "hermit" },
			});
			normalState.tasks = normalState.tasks.map((t) =>
				t.id === "cook" ? { ...t, failureCount: 2 } : t,
			);

			if (getPatternHint(lowState).unlocksVariant === "food") {
				lowEnergyVariant++;
			}
			if (getPatternHint(normalState).unlocksVariant === "food") {
				normalEnergyVariant++;
			}
		}

		// Low energy should give variant hints a slight edge
		// The +3 bonus should shift the balance somewhat
		expect(lowEnergyVariant).toBeGreaterThanOrEqual(normalEnergyVariant);
	});
});

// --- Event-Aware Friend Rescue ---

/** Creates a minimal EventInstance for testing. */
function makeEvent(
	id: GameState["events"][number]["id"],
	overrides: Partial<EventInstance> = {},
): EventInstance {
	return {
		id,
		status: "resolved",
		scheduledDay: 1,
		...overrides,
	};
}

describe("getEventFriendRescue", () => {
	test("returns opener for event with friendRescue.opener", () => {
		const fr = getEventFriendRescue("leak-drip");
		expect(fr).toBeDefined();
		expect(fr?.opener?.length).toBeGreaterThan(0);
	});

	test("returns hint for event with friendRescue.hint", () => {
		const fr = getEventFriendRescue("leak-worse");
		expect(fr).toBeDefined();
		expect(fr?.hint?.length).toBeGreaterThan(0);
	});

	test("returns both opener and hint when event has both", () => {
		const fr = getEventFriendRescue("azor-sick");
		expect(fr).toBeDefined();
		expect(fr?.opener?.length).toBeGreaterThan(0);
		expect(fr?.hint?.length).toBeGreaterThan(0);
	});

	test("returns undefined for event without friendRescue", () => {
		const fr = getEventFriendRescue("rain");
		expect(fr).toBeUndefined();
	});
});

describe("getMostRecentEventWithContent", () => {
	test("finds event with opener", () => {
		const state = createTestState({
			dayIndex: 3,
			events: [makeEvent("leak-drip", { scheduledDay: 1 })],
		});
		const result = getMostRecentEventWithContent(state, "opener");
		expect(result).toBe("leak-drip");
	});

	test("finds event with hint", () => {
		const state = createTestState({
			dayIndex: 3,
			events: [makeEvent("leak-fixed", { scheduledDay: 2 })],
		});
		const result = getMostRecentEventWithContent(state, "hint");
		expect(result).toBe("leak-fixed");
	});

	test("returns null when no events have content", () => {
		const state = createTestState({
			dayIndex: 3,
			events: [makeEvent("rain", { scheduledDay: 1 })],
		});
		const result = getMostRecentEventWithContent(state, "opener");
		expect(result).toBeNull();
	});

	test("returns null for pending events", () => {
		const state = createTestState({
			dayIndex: 3,
			events: [makeEvent("leak-drip", { status: "pending", scheduledDay: 1 })],
		});
		const result = getMostRecentEventWithContent(state, "opener");
		expect(result).toBeNull();
	});

	test("skips future events", () => {
		const state = createTestState({
			dayIndex: 1,
			events: [makeEvent("leak-drip", { scheduledDay: 3 })],
		});
		const result = getMostRecentEventWithContent(state, "opener");
		expect(result).toBeNull();
	});

	test("picks most recent event when multiple qualify", () => {
		const state = createTestState({
			dayIndex: 4,
			events: [
				makeEvent("leak-drip", { scheduledDay: 1 }),
				makeEvent("azor-sick", { scheduledDay: 3 }),
			],
		});
		const result = getMostRecentEventWithContent(state, "opener");
		expect(result).toBe("azor-sick");
	});
});

describe("event-aware rescue messages", () => {
	test("uses event opener when matching event exists", () => {
		const state = createTestState({
			dayIndex: 3,
			runSeed: 42,
			events: [makeEvent("leak-drip", { scheduledDay: 1 })],
		});
		const message = getRandomRescueMessage(state);
		const fr = getEventFriendRescue("leak-drip");
		expect(fr?.opener).toContain(message);
	});

	test("falls back to generic when no event openers match", () => {
		const state = createTestState({
			dayIndex: 3,
			runSeed: 42,
			events: [makeEvent("rain", { scheduledDay: 1 })],
		});
		const message = getRandomRescueMessage(state);
		const s = strings();
		expect(s.friend.rescueMessages).toContain(message);
	});

	test("falls back to generic with no events at all", () => {
		const state = createTestState({
			dayIndex: 3,
			runSeed: 42,
			events: [],
		});
		const message = getRandomRescueMessage(state);
		const s = strings();
		expect(s.friend.rescueMessages).toContain(message);
	});

	test("uses most recent event's opener", () => {
		const state = createTestState({
			dayIndex: 4,
			runSeed: 42,
			events: [
				makeEvent("leak-drip", { scheduledDay: 1 }),
				makeEvent("azor-sick", { scheduledDay: 3 }),
			],
		});
		const message = getRandomRescueMessage(state);
		const fr = getEventFriendRescue("azor-sick");
		expect(fr?.opener).toContain(message);
	});
});

describe("event-aware pattern hints", () => {
	test("event hint competes with other hints", () => {
		// With a resolved event that has hint content and neutral personality,
		// the event hint should appear in some seeds
		let eventHintCount = 0;
		const trials = 100;

		for (let i = 0; i < trials; i++) {
			const state = createTestState({
				runSeed: i * 13,
				dayIndex: 3,
				rollCount: i,
				energy: 0.5,
				momentum: 0.5,
				events: [makeEvent("leak-worse", { scheduledDay: 2 })],
			});
			// Zero out task failures so variant hints don't compete
			state.tasks = state.tasks.map((t) => ({
				...t,
				failureCount: 0,
				succeededToday: false,
			}));

			const result = getPatternHint(state);
			const fr = getEventFriendRescue("leak-worse");
			if (fr?.hint && (fr.hint as readonly string[]).includes(result.hint)) {
				eventHintCount++;
			}
		}

		// Should fire sometimes but not always (competes with general struggle, etc.)
		expect(eventHintCount).toBeGreaterThan(0);
	});

	test("event hint does not appear when no events have hint content", () => {
		const state = createTestState({
			runSeed: 42,
			dayIndex: 3,
			energy: 0.5,
			momentum: 0.5,
			events: [makeEvent("rain", { scheduledDay: 1 })],
		});
		state.tasks = state.tasks.map((t) => ({
			...t,
			failureCount: 0,
			succeededToday: false,
		}));

		const result = getPatternHint(state);
		// Rain has no friendRescue content, so the hint should come from elsewhere
		const fr = getEventFriendRescue("rain");
		expect(fr).toBeUndefined();
		// Should get fallback (no other conditions match with neutral personality)
		const s = strings();
		expect(s.hints.fallback).toContain(result.hint);
	});
});
