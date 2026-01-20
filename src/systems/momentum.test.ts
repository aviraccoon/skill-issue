import { describe, expect, test } from "bun:test";
import {
	DECAY_PER_BLOCK_BASE,
	DECAY_PER_BLOCK_VARIANCE,
	FAILURE_PENALTY_BASE,
	FAILURE_PENALTY_VARIANCE,
	getMomentumDecayPerBlock,
	getMomentumFailurePenalty,
	getMomentumSuccessBonus,
	getScrollTrapMomentumPenalty,
	getScrollTrapMomentumRange,
	SCROLL_TRAP_MAX_BASE,
	SCROLL_TRAP_MIN_BASE,
	SCROLL_TRAP_SHIFT_VARIANCE,
	SUCCESS_BONUS_BASE,
	SUCCESS_BONUS_VARIANCE,
} from "./momentum";

describe("seeded momentum constants", () => {
	test("success bonus varies by seed within range (5-10%)", () => {
		for (let i = 0; i < 100; i++) {
			const bonus = getMomentumSuccessBonus(i * 12345);
			expect(bonus).toBeGreaterThanOrEqual(0.05);
			expect(bonus).toBeLessThanOrEqual(0.1);
		}
	});

	test("same seed gives same success bonus", () => {
		const b1 = getMomentumSuccessBonus(42);
		const b2 = getMomentumSuccessBonus(42);
		expect(b1).toBe(b2);
	});

	test("failure penalty varies by seed within range (3-5%)", () => {
		for (let i = 0; i < 100; i++) {
			const penalty = getMomentumFailurePenalty(i * 12345);
			expect(penalty).toBeGreaterThanOrEqual(0.03);
			expect(penalty).toBeLessThanOrEqual(0.05);
		}
	});

	test("same seed gives same failure penalty", () => {
		const p1 = getMomentumFailurePenalty(42);
		const p2 = getMomentumFailurePenalty(42);
		expect(p1).toBe(p2);
	});

	test("momentum decay varies by seed within range", () => {
		const minDecay = DECAY_PER_BLOCK_BASE - DECAY_PER_BLOCK_VARIANCE;
		const maxDecay = DECAY_PER_BLOCK_BASE + DECAY_PER_BLOCK_VARIANCE;
		for (let i = 0; i < 100; i++) {
			const decay = getMomentumDecayPerBlock(i * 12345);
			expect(decay).toBeGreaterThanOrEqual(minDecay);
			expect(decay).toBeLessThanOrEqual(maxDecay);
		}
	});

	test("same seed gives same momentum decay", () => {
		const d1 = getMomentumDecayPerBlock(42);
		const d2 = getMomentumDecayPerBlock(42);
		expect(d1).toBe(d2);
	});
});

describe("scroll trap momentum", () => {
	test("range is shifted by seed within variance", () => {
		for (let i = 0; i < 100; i++) {
			const [min, max] = getScrollTrapMomentumRange(i * 12345);
			// Base range is 0.15-0.20, shift can be +/- 0.02
			expect(min).toBeGreaterThanOrEqual(
				SCROLL_TRAP_MIN_BASE - SCROLL_TRAP_SHIFT_VARIANCE,
			);
			expect(min).toBeLessThanOrEqual(
				SCROLL_TRAP_MIN_BASE + SCROLL_TRAP_SHIFT_VARIANCE,
			);
			expect(max).toBeGreaterThanOrEqual(
				SCROLL_TRAP_MAX_BASE - SCROLL_TRAP_SHIFT_VARIANCE,
			);
			expect(max).toBeLessThanOrEqual(
				SCROLL_TRAP_MAX_BASE + SCROLL_TRAP_SHIFT_VARIANCE,
			);
			// Range size should stay constant (0.05)
			expect(max - min).toBeCloseTo(
				SCROLL_TRAP_MAX_BASE - SCROLL_TRAP_MIN_BASE,
				5,
			);
		}
	});

	test("same seed gives same range", () => {
		const r1 = getScrollTrapMomentumRange(42);
		const r2 = getScrollTrapMomentumRange(42);
		expect(r1[0]).toBe(r2[0]);
		expect(r1[1]).toBe(r2[1]);
	});

	test("penalty falls within seeded range", () => {
		const seed = 42;
		const [min, max] = getScrollTrapMomentumRange(seed);
		for (let i = 0; i < 50; i++) {
			const penalty = getScrollTrapMomentumPenalty(seed);
			expect(penalty).toBeGreaterThanOrEqual(min);
			expect(penalty).toBeLessThanOrEqual(max);
		}
	});
});

describe("constants values", () => {
	test("success bonus base and variance are correct", () => {
		expect(SUCCESS_BONUS_BASE).toBe(0.075);
		expect(SUCCESS_BONUS_VARIANCE).toBe(0.025);
	});

	test("failure penalty base and variance are correct", () => {
		expect(FAILURE_PENALTY_BASE).toBe(0.04);
		expect(FAILURE_PENALTY_VARIANCE).toBe(0.01);
	});

	test("decay per block base and variance are correct", () => {
		expect(DECAY_PER_BLOCK_BASE).toBe(0.02);
		expect(DECAY_PER_BLOCK_VARIANCE).toBe(0.005);
	});

	test("scroll trap base range is correct", () => {
		expect(SCROLL_TRAP_MIN_BASE).toBe(0.15);
		expect(SCROLL_TRAP_MAX_BASE).toBe(0.2);
		expect(SCROLL_TRAP_SHIFT_VARIANCE).toBe(0.02);
	});
});
