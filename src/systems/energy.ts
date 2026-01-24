import type { PhoneOutcome } from "../data/scrollTrap";
import type { GameState, Task } from "../state";
import { seededVariation } from "../utils/random";
import {
	getFriendRescueEnergyEffect,
	getSocialSuccessEnergyEffect,
	getSoloSuccessEnergyEffect,
} from "./personality";

// Salt values for independent variation of each constant
const SALT_ENERGY_DECAY = 1001;
const SALT_SCROLL_TRAP = 1002;
const SALT_FAILURE_COST = 1003;
const SALT_TASK_ENERGY_BASE = 2000; // Task effects use SALT_TASK_ENERGY_BASE + taskId hash
const SALT_SATURDAY_WORK = 1004;

// Salt values for phone outcome effects
const SALT_PHONE_VOID_ENERGY = 1010;
const SALT_PHONE_SCROLL_HOLE_ENERGY = 1011;
const SALT_PHONE_ACTUAL_BREAK_ENERGY = 1012;
const SALT_PHONE_SOMETHING_NICE_ENERGY = 1013;
const SALT_PHONE_USEFUL_FIND_ENERGY = 1014;

/**
 * Base energy lost per time block from natural decay.
 * Actual value varies by seed: 0.015 to 0.025 (some weeks drain faster).
 */
export const ENERGY_DECAY_BASE = 0.02;
export const ENERGY_DECAY_VARIANCE = 0.005;

/**
 * Base energy lost from scroll trap (Check Phone).
 * Actual value varies by seed: 0.02 to 0.04 (scrolling hits harder some runs).
 */
export const SCROLL_TRAP_BASE = 0.03;
export const SCROLL_TRAP_VARIANCE = 0.01;

/**
 * Base energy cost for task failure.
 * Actual value varies by seed: 0.015 to 0.025 (bad days hit harder).
 */
export const FAILURE_COST_BASE = 0.02;
export const FAILURE_COST_VARIANCE = 0.005;

/**
 * Base energy penalty for working on Saturday (drains Sunday's energy).
 * Varies by seed: 8-12%.
 */
export const SATURDAY_WORK_PENALTY_BASE = 0.1;
export const SATURDAY_WORK_PENALTY_VARIANCE = 0.02;

/**
 * Returns the energy decay per block for this run.
 */
export function getEnergyDecayPerBlock(seed: number): number {
	return seededVariation(
		seed,
		ENERGY_DECAY_BASE,
		ENERGY_DECAY_VARIANCE,
		SALT_ENERGY_DECAY,
	);
}

/**
 * Returns the scroll trap energy cost for this run.
 * @deprecated Use getPhoneOutcomeEnergyEffect instead for variable outcomes.
 */
export function getScrollTrapEnergyCost(seed: number): number {
	return seededVariation(
		seed,
		SCROLL_TRAP_BASE,
		SCROLL_TRAP_VARIANCE,
		SALT_SCROLL_TRAP,
	);
}

/** Energy effects by phone outcome tier (can be positive for good outcomes). */
const PHONE_OUTCOME_ENERGY: Record<
	PhoneOutcome,
	{ base: number; variance: number; salt: number }
> = {
	void: { base: -0.04, variance: 0.01, salt: SALT_PHONE_VOID_ENERGY }, // -3% to -5%
	scrollHole: {
		base: -0.06,
		variance: 0.01,
		salt: SALT_PHONE_SCROLL_HOLE_ENERGY,
	}, // -5% to -7%
	actualBreak: {
		base: 0.02,
		variance: 0.01,
		salt: SALT_PHONE_ACTUAL_BREAK_ENERGY,
	}, // +1% to +3%
	somethingNice: {
		base: 0.03,
		variance: 0.01,
		salt: SALT_PHONE_SOMETHING_NICE_ENERGY,
	}, // +2% to +4%
	usefulFind: {
		base: 0.015,
		variance: 0.005,
		salt: SALT_PHONE_USEFUL_FIND_ENERGY,
	}, // +1% to +2%
};

/**
 * Returns the energy effect for a phone outcome.
 * Can be positive (actualBreak, somethingNice, usefulFind) or negative (void, scrollHole).
 */
export function getPhoneOutcomeEnergyEffect(
	seed: number,
	outcome: PhoneOutcome,
): number {
	const config = PHONE_OUTCOME_ENERGY[outcome];
	return seededVariation(seed, config.base, config.variance, config.salt);
}

/**
 * Returns the failure energy cost for this run.
 */
export function getFailureEnergyCost(seed: number): number {
	return seededVariation(
		seed,
		FAILURE_COST_BASE,
		FAILURE_COST_VARIANCE,
		SALT_FAILURE_COST,
	);
}

/**
 * Returns the Saturday work penalty for this run (8-12%).
 */
export function getSaturdayWorkPenalty(seed: number): number {
	return seededVariation(
		seed,
		SATURDAY_WORK_PENALTY_BASE,
		SATURDAY_WORK_PENALTY_VARIANCE,
		SALT_SATURDAY_WORK,
	);
}

/**
 * Categories considered "social" for personality modifiers.
 */
const SOCIAL_CATEGORIES = new Set(["social"]);

/**
 * Returns true if task is social (affected by social personality axis).
 */
export function isSocialTask(task: Task): boolean {
	return SOCIAL_CATEGORIES.has(task.category);
}

/**
 * Variance applied to task energy effects (+/- 20% of base).
 */
const TASK_ENERGY_VARIANCE_FACTOR = 0.2;

/**
 * Returns a task-specific salt for seeded variation.
 */
function getTaskSalt(taskId: string): number {
	let hash = 0;
	for (let i = 0; i < taskId.length; i++) {
		hash = (hash << 5) - hash + taskId.charCodeAt(i);
		hash |= 0;
	}
	return SALT_TASK_ENERGY_BASE + Math.abs(hash);
}

/**
 * Calculates energy change from a task attempt.
 * Considers task-specific effects (with seed variation) and personality modifiers.
 */
export function calculateTaskEnergyEffect(
	task: Task,
	succeeded: boolean,
	state: GameState,
): number {
	let effect = 0;

	if (succeeded) {
		// Base success effect from task definition (default: 0)
		const baseEffect = task.energyEffect?.success ?? 0;

		// Apply seed-based variation if there's a non-zero effect
		if (baseEffect !== 0) {
			const variance = Math.abs(baseEffect) * TASK_ENERGY_VARIANCE_FACTOR;
			const salt = getTaskSalt(task.id);
			effect += seededVariation(state.runSeed, baseEffect, variance, salt);
		}

		// Personality modifiers for success
		if (isSocialTask(task)) {
			effect += getSocialSuccessEnergyEffect(state.personality);
		} else {
			effect += getSoloSuccessEnergyEffect(state.personality);
		}
	} else {
		// Failure effect: use task-specific if defined, otherwise seeded default
		if (task.energyEffect?.failure !== undefined) {
			effect += task.energyEffect.failure;
		} else {
			effect += -getFailureEnergyCost(state.runSeed);
		}
	}

	return effect;
}

/**
 * Calculates energy change from friend rescue.
 * Heavily personality-dependent.
 */
export function calculateFriendRescueEnergyEffect(state: GameState): number {
	return getFriendRescueEnergyEffect(state.personality);
}

/**
 * Applies energy decay for a time block transition.
 * Returns new energy value (clamped).
 */
export function applyEnergyDecay(currentEnergy: number, seed: number): number {
	return Math.max(0, currentEnergy - getEnergyDecayPerBlock(seed));
}

/**
 * Applies energy change and clamps to valid range [0, 1].
 */
export function applyEnergyChange(
	currentEnergy: number,
	change: number,
): number {
	return Math.max(0, Math.min(1, currentEnergy + change));
}
