import { seededVariation } from "../utils/random";

// Salt values for independent variation of each constant
const SALT_SUCCESS_BONUS = 3001;
const SALT_FAILURE_PENALTY = 3002;
const SALT_DECAY_PER_BLOCK = 3003;
const SALT_SCROLL_TRAP_SHIFT = 3004;

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

/**
 * Calculates a random scroll trap penalty within the seeded range.
 */
export function getScrollTrapMomentumPenalty(seed: number): number {
	const [min, max] = getScrollTrapMomentumRange(seed);
	return min + Math.random() * (max - min);
}
