/**
 * Run scoring: fun, frustration, and engagement metrics.
 *
 * Derived from simulation data analysis (500+ seeds). These scores capture
 * how a run "feels" based on measurable gameplay patterns. The weights
 * come from correlation analysis against hand-classified run quality.
 *
 * Key insight: day-to-day variance (rollercoaster) is the strongest
 * predictor of fun (r=0.607). Recovery arcs are second (r=0.518).
 * Too much success is boring; the game needs failure to be interesting.
 */

import type { EventInstance, Task } from "../state";
import type { DaySummary } from "./engine";

/** Computed scores for a simulation run (0-1 scale). */
export interface RunScores {
	/** How enjoyable/interesting the run feels. */
	fun: number;
	/** How punishing/hopeless the run feels. */
	frustration: number;
	/** Combined metric: fun with enough tension to stay interesting. */
	engagement: number;
}

/** Returns the task description evolution tier for a given failure count. */
function getEvolutionTier(failureCount: number): number {
	if (failureCount >= 6) return 3; // resigned
	if (failureCount >= 4) return 2; // honest
	if (failureCount >= 2) return 1; // aware
	return 0; // neutral
}

/**
 * Calculates fun, frustration, and engagement scores from run data.
 *
 * Scores are 0-1 where higher = more of that quality.
 * A "good" run has high fun, moderate frustration, and high engagement.
 * A "tense" run (the game's sweet spot) has high fun AND high frustration.
 */
export function calculateScores(
	days: DaySummary[],
	finalTasks: Task[],
	events: EventInstance[],
	energyMin: number,
): RunScores {
	// --- Raw signals ---

	const { longestSuccess, longestFailure } = analyzeStreaks(days);
	const { dayRateVariance, recoveryDays, crashDays } = analyzeDayShapes(days);
	const uniqueSucceeded = countUniqueSuccesses(days);
	const totalTasks = finalTasks.length;
	const tasksAtTier2Plus = finalTasks.filter(
		(t) => getEvolutionTier(t.failureCount) >= 2,
	).length;

	let totalAttempts = 0;
	let totalSuccesses = 0;
	let allNighters = 0;
	let friendRescues = 0;

	for (const day of days) {
		if (day.pulledAllNighter) allNighters++;
		if (day.friendRescueTriggered) friendRescues++;

		for (const action of day.actions) {
			if (action.decision.type === "attempt") {
				totalAttempts++;
				if (action.succeeded) totalSuccesses++;
			}
		}
	}

	const successRate = totalAttempts > 0 ? totalSuccesses / totalAttempts : 0;
	const eventChoices = events.filter(
		(e) => e.status === "resolved" && e.choiceId,
	).length;
	const dramaticMoments = friendRescues + allNighters + eventChoices;

	// --- Fun score ---
	// Peaks at ~40% success rate (the game's sweet spot).
	// High variety, rollercoaster days, recovery arcs, and dramatic moments.

	const sweetSpotRate = 1 - Math.abs(successRate - 0.4) * 2.5;
	const varietyScore =
		totalTasks > 0 ? Math.min(uniqueSucceeded / totalTasks, 1) : 0;
	const rollercoasterScore = Math.min(dayRateVariance * 20, 1);
	const recoveryScore = days.length > 0 ? recoveryDays / days.length : 0;
	const streakFun = Math.min(longestSuccess / 4, 1);
	const dramaScore = Math.min(dramaticMoments / 5, 1);

	const fun =
		sweetSpotRate * 0.25 +
		varietyScore * 0.2 +
		rollercoasterScore * 0.15 +
		recoveryScore * 0.15 +
		streakFun * 0.1 +
		dramaScore * 0.15;

	// --- Frustration score ---
	// Long failure streaks, very low success rate, energy crashes,
	// visible evidence of repeated failure, and crash days.

	const failStreakFrustration = Math.min(longestFailure / 6, 1);
	const lowRateFrustration = Math.max(0, 1 - successRate * 3);
	const energyCrash = energyMin < 0.05 ? 1 : energyMin < 0.15 ? 0.5 : 0;
	const evolutionFrustration = Math.min(tasksAtTier2Plus / 6, 1);
	const crashFrustration = days.length > 0 ? crashDays / days.length : 0;

	const frustration =
		failStreakFrustration * 0.3 +
		lowRateFrustration * 0.25 +
		energyCrash * 0.15 +
		evolutionFrustration * 0.15 +
		crashFrustration * 0.15;

	// --- Engagement score ---
	// Some frustration is engaging (tension); too much is miserable.
	// Fun is the primary driver, capped frustration adds spice.

	const engagement = fun * 0.6 + Math.min(frustration, 0.5) * 0.4;

	return { fun, frustration, engagement };
}

/**
 * Analyzes success/failure streaks across all days.
 */
function analyzeStreaks(days: DaySummary[]): {
	longestSuccess: number;
	longestFailure: number;
} {
	let longestSuccess = 0;
	let longestFailure = 0;
	let currentSuccess = 0;
	let currentFailure = 0;

	for (const day of days) {
		for (const action of day.actions) {
			if (action.decision.type === "attempt") {
				if (action.succeeded) {
					currentSuccess++;
					currentFailure = 0;
					longestSuccess = Math.max(longestSuccess, currentSuccess);
				} else {
					currentFailure++;
					currentSuccess = 0;
					longestFailure = Math.max(longestFailure, currentFailure);
				}
			}
		}
	}

	return { longestSuccess, longestFailure };
}

/**
 * Analyzes day-level success rate patterns.
 */
function analyzeDayShapes(days: DaySummary[]): {
	dayRateVariance: number;
	recoveryDays: number;
	crashDays: number;
} {
	const dayRates = days.map((d) => {
		const attempts = d.tasksSucceeded.length + d.tasksFailed.length;
		return attempts > 0 ? d.tasksSucceeded.length / attempts : 0;
	});

	const avgRate =
		dayRates.length > 0
			? dayRates.reduce((s, v) => s + v, 0) / dayRates.length
			: 0;
	const dayRateVariance =
		dayRates.length > 0
			? dayRates.reduce((s, v) => s + (v - avgRate) ** 2, 0) / dayRates.length
			: 0;

	let recoveryDays = 0;
	let crashDays = 0;
	for (const day of days) {
		const mDelta = day.momentumEnd - day.momentumStart;
		if (mDelta > 0.1) recoveryDays++;
		if (mDelta < -0.15) crashDays++;
	}

	return { dayRateVariance, recoveryDays, crashDays };
}

/**
 * Counts unique tasks that succeeded at least once across all days.
 */
function countUniqueSuccesses(days: DaySummary[]): number {
	const succeeded = new Set<string>();
	for (const day of days) {
		for (const taskId of day.tasksSucceeded) {
			succeeded.add(taskId);
		}
	}
	return succeeded.size;
}
