import type { GameState } from "../state";
import { seededVariation } from "../utils/random";

/** Salt for sleep recovery floor derivation (avoids correlation with other seeded values). */
const SLEEP_FLOOR_SALT = 7701;

interface SleepModifier {
	energy: number;
	momentum: number;
}

/**
 * Calculates how today's activities affect tomorrow's starting state.
 * Returns modifiers to apply to energy and momentum.
 *
 * Activity-dependent: eating, dog walks, and momentum affect recovery.
 * A seed-varied minimum floor prevents total energy lockout -- bad days
 * can still be bad, but sleep always provides some baseline recovery.
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

	// Minimum recovery floors: seed-varied, prevent permanent zero lockout.
	// Sleep always restores something -- you did rest, even if the day was bad.
	// Both floors range 1-5% (center 3%, variance 2%). The day-to-day volatility
	// difference between energy and momentum is already in the per-attempt effects;
	// the overnight floor is about preventing lockout, not tuning swing.
	const energyFloor = seededVariation(
		state.runSeed,
		0.03,
		0.02,
		SLEEP_FLOOR_SALT,
	);
	const momentumFloor = seededVariation(
		state.runSeed,
		0.03,
		0.02,
		SLEEP_FLOOR_SALT + 1,
	);
	energyMod = Math.max(energyMod, energyFloor);
	momentumMod = Math.max(momentumMod, momentumFloor);

	return { energy: energyMod, momentum: momentumMod };
}
