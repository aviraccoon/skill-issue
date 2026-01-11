import { describe, expect, test } from "bun:test";
import { createInitialState, type GameState } from "../state";
import {
	ALL_NIGHTER_ENERGY_PENALTY,
	calculateExtendedNightSlots,
	canPushThrough,
	getExtendedNightDescription,
} from "./allnighter";

/** Creates a test state with customizable properties. */
function createTestState(overrides: Partial<GameState> = {}): GameState {
	const state = createInitialState();
	return { ...state, ...overrides };
}

describe("calculateExtendedNightSlots", () => {
	test("returns 4 slots at 100% energy", () => {
		expect(calculateExtendedNightSlots(1.0)).toBe(4);
	});

	test("returns 3 slots at 75% energy", () => {
		expect(calculateExtendedNightSlots(0.75)).toBe(3);
	});

	test("returns 2 slots at 50% energy", () => {
		expect(calculateExtendedNightSlots(0.5)).toBe(2);
	});

	test("returns 1 slot at 25% energy", () => {
		expect(calculateExtendedNightSlots(0.25)).toBe(1);
	});

	test("returns minimum 1 slot at very low energy", () => {
		expect(calculateExtendedNightSlots(0.1)).toBe(1);
		expect(calculateExtendedNightSlots(0)).toBe(1);
	});

	test("handles edge cases", () => {
		expect(calculateExtendedNightSlots(0.99)).toBe(3);
		expect(calculateExtendedNightSlots(0.5)).toBe(2);
		expect(calculateExtendedNightSlots(0.26)).toBe(1);
	});
});

describe("canPushThrough", () => {
	test("returns true on weekday night when eligible", () => {
		const state = createTestState({
			dayIndex: 0, // Monday
			timeBlock: "night",
			pushedThroughLastNight: false,
			inExtendedNight: false,
		});
		expect(canPushThrough(state)).toBe(true);
	});

	test("returns false on weekend", () => {
		const state = createTestState({
			dayIndex: 5, // Saturday
			pushedThroughLastNight: false,
			inExtendedNight: false,
		});
		expect(canPushThrough(state)).toBe(false);
	});

	test("returns false if pushed through last night", () => {
		const state = createTestState({
			dayIndex: 1, // Tuesday
			timeBlock: "night",
			pushedThroughLastNight: true,
			inExtendedNight: false,
		});
		expect(canPushThrough(state)).toBe(false);
	});

	test("returns false if already in extended night", () => {
		const state = createTestState({
			dayIndex: 0,
			timeBlock: "night",
			pushedThroughLastNight: false,
			inExtendedNight: true,
		});
		expect(canPushThrough(state)).toBe(false);
	});

	test("returns false on Friday night (next day is weekend)", () => {
		// This should still return true - Friday night all-nighter is valid
		// The consequence is waking up Saturday afternoon
		const state = createTestState({
			dayIndex: 4, // Friday
			timeBlock: "night",
			pushedThroughLastNight: false,
			inExtendedNight: false,
		});
		expect(canPushThrough(state)).toBe(true);
	});
});

describe("getExtendedNightDescription", () => {
	test("returns appropriate description for high energy", () => {
		const desc = getExtendedNightDescription(1.0);
		expect(desc).toContain("wired");
	});

	test("returns appropriate description for medium-high energy", () => {
		const desc = getExtendedNightDescription(0.75);
		expect(desc).toContain("fuel");
	});

	test("returns appropriate description for medium energy", () => {
		const desc = getExtendedNightDescription(0.5);
		expect(desc).toContain("low");
	});

	test("returns appropriate description for low energy", () => {
		const desc = getExtendedNightDescription(0.2);
		expect(desc).toContain("exhausted");
	});
});

describe("ALL_NIGHTER_ENERGY_PENALTY", () => {
	test("is a reasonable penalty value", () => {
		expect(ALL_NIGHTER_ENERGY_PENALTY).toBeGreaterThan(0);
		expect(ALL_NIGHTER_ENERGY_PENALTY).toBeLessThanOrEqual(0.5);
	});
});
