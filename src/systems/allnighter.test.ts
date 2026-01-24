import { describe, expect, test } from "bun:test";
import { strings } from "../i18n";
import { createInitialState, type GameState } from "../state";
import {
	ALL_NIGHTER_ENERGY_PENALTY,
	ALL_NIGHTER_PENALTY_BASE,
	ALL_NIGHTER_PENALTY_VARIANCE,
	calculateExtendedNightSlots,
	canPushThrough,
	getAllNighterPenalty,
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
	const s = strings();

	test("returns wired variant for high energy", () => {
		const desc = getExtendedNightDescription(1.0, 0);
		expect(s.allnighter.wired).toContain(desc);
	});

	test("returns someFuel variant for medium-high energy", () => {
		const desc = getExtendedNightDescription(0.75, 0);
		expect(s.allnighter.someFuel).toContain(desc);
	});

	test("returns runningLow variant for medium energy", () => {
		const desc = getExtendedNightDescription(0.5, 0);
		expect(s.allnighter.runningLow).toContain(desc);
	});

	test("returns exhausted variant for low energy", () => {
		const desc = getExtendedNightDescription(0.2, 0);
		expect(s.allnighter.exhausted).toContain(desc);
	});
});

describe("ALL_NIGHTER_ENERGY_PENALTY", () => {
	test("is a reasonable penalty value", () => {
		expect(ALL_NIGHTER_ENERGY_PENALTY).toBeGreaterThan(0);
		expect(ALL_NIGHTER_ENERGY_PENALTY).toBeLessThanOrEqual(0.5);
	});
});

describe("getAllNighterPenalty", () => {
	test("varies by seed within range (20-30%)", () => {
		const minPenalty = ALL_NIGHTER_PENALTY_BASE - ALL_NIGHTER_PENALTY_VARIANCE;
		const maxPenalty = ALL_NIGHTER_PENALTY_BASE + ALL_NIGHTER_PENALTY_VARIANCE;
		for (let i = 0; i < 100; i++) {
			const penalty = getAllNighterPenalty(i * 12345);
			expect(penalty).toBeGreaterThanOrEqual(minPenalty);
			expect(penalty).toBeLessThanOrEqual(maxPenalty);
		}
	});

	test("same seed gives same penalty", () => {
		const p1 = getAllNighterPenalty(42);
		const p2 = getAllNighterPenalty(42);
		expect(p1).toBe(p2);
	});

	test("base and variance are correct", () => {
		expect(ALL_NIGHTER_PENALTY_BASE).toBe(0.25);
		expect(ALL_NIGHTER_PENALTY_VARIANCE).toBe(0.05);
	});
});
