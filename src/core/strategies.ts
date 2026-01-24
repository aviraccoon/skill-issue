/**
 * Shared strategy types and implementations.
 * Used by both CLI simulation and DevTools.
 */

import type { GameState } from "../state";
import { isWeekend } from "../state";
import type { Decision } from "./controller";
import { getAvailableTasks } from "./controller";

/**
 * Context for decision making.
 */
export interface DecisionContext {
	/** Current game state. */
	state: GameState;
	/** Available decisions at this point. */
	availableDecisions: Decision[];
	/** Which screen is active. */
	screen: "game" | "nightChoice" | "friendRescue";
	/** Get next random value in [0, 1). May be deterministic or not. */
	roll: () => number;
}

/**
 * Strategy interface for automated decision making.
 */
export interface Strategy {
	/** Returns the decision to make given current context. */
	decide(context: DecisionContext): Decision;
}

/**
 * Human-like strategy with realistic uncertainty.
 * Simulates a player who can't see hidden state and makes imperfect decisions.
 *
 * Game screen: 20% phone, 60% task (40% variant when available), 20% skip
 * Night: 30% push through if energy >50% and able
 * Rescue: Guesses tier based on energy feel, with realistic error rates
 */
export const humanLikeStrategy: Strategy = {
	decide(context: DecisionContext): Decision {
		const { state, availableDecisions, screen, roll } = context;

		if (screen === "friendRescue") {
			return pickRescueDecision(state, availableDecisions, roll);
		}

		if (screen === "nightChoice") {
			return pickNightDecision(state, availableDecisions, roll);
		}

		return pickGameDecision(state, availableDecisions, roll);
	},
};

/**
 * Picks a game screen decision.
 * 20% phone, 60% task attempt, 20% skip/end day.
 */
function pickGameDecision(
	state: GameState,
	decisions: Decision[],
	roll: () => number,
): Decision {
	const r = roll();

	// 20% chance to check phone if available
	if (r < 0.2) {
		const phoneDecision = decisions.find((d) => d.type === "checkPhone");
		if (phoneDecision) return phoneDecision;
	}

	// 60% chance to attempt a random task
	if (r < 0.8) {
		const availableTasks = getAvailableTasks(state);
		if (availableTasks.length > 0) {
			const task = availableTasks[Math.floor(roll() * availableTasks.length)];
			if (task) {
				// Check if variant is available and decide whether to use it
				const hasVariant =
					task.minimalVariant && state.variantsUnlocked.includes(task.category);

				// 40% chance to use variant when available
				const useVariant = hasVariant && roll() < 0.4;

				return { type: "attempt", taskId: task.id, useVariant };
			}
		}
	}

	// 20% skip (weekday) or end day (weekend)
	if (isWeekend(state)) {
		const endDay = decisions.find((d) => d.type === "endDay");
		if (endDay) return endDay;
	} else {
		const skip = decisions.find((d) => d.type === "skip");
		if (skip) return skip;
	}

	// Fallback to first available decision
	return decisions[0] as Decision;
}

/**
 * Picks a night choice decision.
 * 30% chance to push through if energy is decent (>50%) and able.
 */
function pickNightDecision(
	state: GameState,
	decisions: Decision[],
	roll: () => number,
): Decision {
	// Push through sometimes if energy is decent
	if (
		state.energy > 0.5 &&
		!state.pushedThroughLastNight &&
		!state.inExtendedNight &&
		!isWeekend(state) &&
		roll() < 0.3
	) {
		const pushThrough = decisions.find((d) => d.type === "pushThrough");
		if (pushThrough) return pushThrough;
	}
	return decisions.find((d) => d.type === "sleep") as Decision;
}

/**
 * Picks a friend rescue activity with realistic uncertainty.
 * Player can't see energy, so they're guessing based on feel.
 * Tends toward correct tier but can misjudge.
 */
function pickRescueDecision(
	state: GameState,
	decisions: Decision[],
	roll: () => number,
): Decision {
	// Activity thresholds: low (0.2), medium (0.45), high (0.7)
	// Player has a rough sense but doesn't know exactly
	const r = roll();

	if (state.energy >= 0.7) {
		// High energy: usually pick high, sometimes medium
		if (r < 0.7) return findRescue(decisions, "high");
		if (r < 0.95) return findRescue(decisions, "medium");
		return findRescue(decisions, "low");
	}

	if (state.energy >= 0.45) {
		// Medium energy: usually pick medium, might misjudge either way
		if (r < 0.2) return findRescue(decisions, "high");
		if (r < 0.85) return findRescue(decisions, "medium");
		return findRescue(decisions, "low");
	}

	if (state.energy >= 0.2) {
		// Low energy: usually pick low, might overestimate
		if (r < 0.1) return findRescue(decisions, "high");
		if (r < 0.35) return findRescue(decisions, "medium");
		return findRescue(decisions, "low");
	}

	// Critically low: mostly pick low, small chance of overestimating
	if (r < 0.15) return findRescue(decisions, "medium");
	return findRescue(decisions, "low");
}

/** Finds a rescue decision by activity tier. */
function findRescue(
	decisions: Decision[],
	activity: "low" | "medium" | "high",
): Decision {
	return (
		decisions.find(
			(d) => d.type === "acceptRescue" && d.activity === activity,
		) ?? (decisions[0] as Decision)
	);
}
