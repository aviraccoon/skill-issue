import { type GameState, isWeekend, type Task } from "../state";
import { getPersonalityTimeModifier } from "./personality";

/**
 * Calculates the success probability for a task attempt.
 * Combines base rate with modifiers from time of day,
 * momentum, and energy (hidden from player).
 */
export function calculateSuccessProbability(
	task: Task,
	state: GameState,
): number {
	let probability = task.baseRate;

	// Apply time of day modifier (personality-aware)
	probability *= getTimeModifier(state);

	// Apply momentum modifier (-30% to +30%)
	probability *= getMomentumModifier(state.momentum);

	// Apply energy modifier (-20% to +20%)
	probability *= getEnergyModifier(state.energy);

	// Apply weekend work penalty
	probability *= getWeekendWorkModifier(task, state);

	// Clamp to valid probability range
	return Math.max(0, Math.min(1, probability));
}

/**
 * Returns multiplier based on time of day and personality.
 * Night Owls get bigger night bonus, Early Birds get morning bonus.
 * Values vary by seed - some runs have stronger 2am spikes.
 */
export function getTimeModifier(state: GameState): number {
	return getPersonalityTimeModifier(
		state.personality,
		state.timeBlock,
		state.runSeed,
	);
}

/**
 * Returns multiplier based on momentum (0-1).
 * Maps to -30% to +30% modifier.
 */
export function getMomentumModifier(momentum: number): number {
	// momentum 0 = 0.7x, momentum 0.5 = 1.0x, momentum 1 = 1.3x
	return 0.7 + momentum * 0.6;
}

/**
 * Returns multiplier based on energy (0-1).
 * Maps to -20% to +20% modifier.
 */
export function getEnergyModifier(energy: number): number {
	// energy 0 = 0.8x, energy 0.5 = 1.0x, energy 1 = 1.2x
	return 0.8 + energy * 0.4;
}

/**
 * Returns penalty multiplier for working on weekends.
 * Your brain knows you shouldn't be doing this.
 */
export function getWeekendWorkModifier(task: Task, state: GameState): number {
	if (task.category !== "work" || !isWeekend(state)) {
		return 1.0;
	}
	// 25% penalty for working on weekends
	return 0.75;
}
