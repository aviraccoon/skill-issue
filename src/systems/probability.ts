import { type GameState, isWeekend, type Task, type TimeBlock } from "../state";

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

	// Apply time of day modifier
	probability *= getTimeModifier(state.timeBlock);

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
 * Returns multiplier based on time of day.
 * Night has the 2am productivity spike bonus.
 */
export function getTimeModifier(timeBlock: TimeBlock): number {
	switch (timeBlock) {
		case "morning":
			return 1.1; // Slight morning boost
		case "afternoon":
			return 0.9; // Afternoon slump
		case "evening":
			return 1.0; // Neutral
		case "night":
			return 1.25; // 2am productivity spike
	}
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
