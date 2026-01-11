import type { GameState } from "../state";

interface SleepModifier {
	energy: number;
	momentum: number;
}

/**
 * Calculates how today's activities affect tomorrow's starting state.
 * Returns modifiers to apply to energy and momentum.
 */
export function calculateSleepQuality(state: GameState): SleepModifier {
	let energyMod = 0;
	let momentumMod = 0;

	const tasks = state.tasks;

	// Positive: ate food (any method counts)
	const ateFood = tasks.some((t) => t.category === "food" && t.succeededToday);
	if (ateFood) {
		energyMod += 0.1;
		momentumMod += 0.05;
	} else {
		// Negative: didn't eat
		energyMod -= 0.1;
	}

	// Positive: walked dog
	const walkedDog = tasks.find((t) => t.id === "walk-dog")?.succeededToday;
	if (walkedDog) {
		energyMod += 0.05;
		momentumMod += 0.05;
	} else {
		// Check if attempted but failed - extra guilt
		const attemptedWalk = tasks.find(
			(t) => t.id === "walk-dog",
		)?.attemptedToday;
		if (attemptedWalk) {
			momentumMod -= 0.1;
		}
	}

	// Positive: multiple successes (3+)
	const successCount = tasks.filter((t) => t.succeededToday).length;
	if (successCount >= 3) {
		momentumMod += 0.1;
	}

	// Negative: ended day with very low momentum (struggled all day)
	if (state.momentum < 0.3) {
		energyMod -= 0.05;
		momentumMod -= 0.05;
	}

	return { energy: energyMod, momentum: momentumMod };
}
