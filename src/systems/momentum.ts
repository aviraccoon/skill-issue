import type { PhoneOutcome } from "../data/scrollTrap";
import { nextRoll, seededVariation } from "../utils/random";

// Salt values for independent variation of each constant
const SALT_SUCCESS_BONUS = 3001;
const SALT_FAILURE_PENALTY = 3002;
const SALT_DECAY_PER_BLOCK = 3003;
const SALT_SCROLL_TRAP_SHIFT = 3004;

// Salt values for phone outcome effects
const SALT_PHONE_VOID_MOMENTUM = 3010;
const SALT_PHONE_SCROLL_HOLE_MOMENTUM = 3011;
const SALT_PHONE_ACTUAL_BREAK_MOMENTUM = 3012;
const SALT_PHONE_SOMETHING_NICE_MOMENTUM = 3013;
const SALT_PHONE_USEFUL_FIND_MOMENTUM = 3014;

/**
 * Base momentum bonus from task success.
 * Varies by seed: 5-10%.
 */
export const SUCCESS_BONUS_BASE = 0.075;
export const SUCCESS_BONUS_VARIANCE = 0.025;

/**
 * Base momentum penalty from task failure.
 * Varies by seed: 3-5%.
 */
export const FAILURE_PENALTY_BASE = 0.04;
export const FAILURE_PENALTY_VARIANCE = 0.01;

/**
 * Base momentum decay per time block.
 * Matches energy decay pattern for consistency.
 */
export const DECAY_PER_BLOCK_BASE = 0.02;
export const DECAY_PER_BLOCK_VARIANCE = 0.005;

/**
 * Scroll trap momentum penalty base range (15-20% per use).
 * Seed shifts the center of this range by +/- 2%.
 */
export const SCROLL_TRAP_MIN_BASE = 0.15;
export const SCROLL_TRAP_MAX_BASE = 0.2;
export const SCROLL_TRAP_SHIFT_VARIANCE = 0.02;

/**
 * Returns the momentum bonus for task success this run (5-10%).
 */
export function getMomentumSuccessBonus(seed: number): number {
	return seededVariation(
		seed,
		SUCCESS_BONUS_BASE,
		SUCCESS_BONUS_VARIANCE,
		SALT_SUCCESS_BONUS,
	);
}

/**
 * Returns the momentum penalty for task failure this run (3-5%).
 */
export function getMomentumFailurePenalty(seed: number): number {
	return seededVariation(
		seed,
		FAILURE_PENALTY_BASE,
		FAILURE_PENALTY_VARIANCE,
		SALT_FAILURE_PENALTY,
	);
}

/**
 * Returns the momentum decay per time block this run.
 */
export function getMomentumDecayPerBlock(seed: number): number {
	return seededVariation(
		seed,
		DECAY_PER_BLOCK_BASE,
		DECAY_PER_BLOCK_VARIANCE,
		SALT_DECAY_PER_BLOCK,
	);
}

/**
 * Returns the scroll trap momentum penalty range for this run.
 * The base range (0.15-0.20) is shifted by seed.
 * Returns [min, max] for the penalty range.
 */
export function getScrollTrapMomentumRange(seed: number): [number, number] {
	const shift = seededVariation(
		seed,
		0,
		SCROLL_TRAP_SHIFT_VARIANCE,
		SALT_SCROLL_TRAP_SHIFT,
	);
	return [SCROLL_TRAP_MIN_BASE + shift, SCROLL_TRAP_MAX_BASE + shift];
}

/** Minimal store interface for scroll trap. */
interface RollStore {
	getState(): { runSeed: number; rollCount: number };
	set(key: "rollCount", value: number): void;
}

/**
 * Calculates a deterministic scroll trap penalty within the seeded range.
 * @deprecated Use getPhoneOutcomeMomentumEffect instead for variable outcomes.
 */
export function getScrollTrapMomentumPenalty(store: RollStore): number {
	const seed = store.getState().runSeed;
	const [min, max] = getScrollTrapMomentumRange(seed);
	return min + nextRoll(store) * (max - min);
}

/** Momentum effects by phone outcome tier (all negative, but vary in severity). */
const PHONE_OUTCOME_MOMENTUM: Record<
	PhoneOutcome,
	{ base: number; variance: number; salt: number }
> = {
	void: { base: -0.175, variance: 0.025, salt: SALT_PHONE_VOID_MOMENTUM }, // -15% to -20%
	scrollHole: {
		base: -0.225,
		variance: 0.025,
		salt: SALT_PHONE_SCROLL_HOLE_MOMENTUM,
	}, // -20% to -25%
	actualBreak: {
		base: -0.125,
		variance: 0.025,
		salt: SALT_PHONE_ACTUAL_BREAK_MOMENTUM,
	}, // -10% to -15%
	somethingNice: {
		base: -0.075,
		variance: 0.025,
		salt: SALT_PHONE_SOMETHING_NICE_MOMENTUM,
	}, // -5% to -10%
	usefulFind: {
		base: -0.075,
		variance: 0.025,
		salt: SALT_PHONE_USEFUL_FIND_MOMENTUM,
	}, // -5% to -10%
};

/**
 * Returns the momentum effect for a phone outcome (always negative).
 */
export function getPhoneOutcomeMomentumEffect(
	seed: number,
	outcome: PhoneOutcome,
): number {
	const config = PHONE_OUTCOME_MOMENTUM[outcome];
	return seededVariation(seed, config.base, config.variance, config.salt);
}
