/**
 * Shared strategy types and implementations.
 * Used by both CLI simulation and DevTools.
 */

import { CATEGORY_PRIORITIES } from "../data/tasks";
import type { GameState, Task } from "../state";
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
	screen: "game" | "nightChoice" | "friendRescue" | "narrativeEvent";
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
 * Player's perceived state based on recent outcomes.
 * This is fuzzy - they can't see actual energy/momentum.
 */
interface PerceivedState {
	/** Recent failures outweigh successes - feeling tired/frustrated */
	feelingDrained: boolean;
	/** Multiple consecutive failures - nothing seems to work */
	feelingStuck: boolean;
	/** Recent successes, no failures - in the zone */
	onARoll: boolean;
	/** How many tasks attempted today */
	attemptsToday: number;
	/** How many tasks succeeded today */
	successesToday: number;
}

/**
 * Derives perceived state from game state.
 * Player can't see energy/momentum but can feel patterns.
 */
function getPerceivedState(state: GameState): PerceivedState {
	const attemptsToday = state.tasks.filter((t) => t.attemptedToday).length;
	const successesToday = state.tasks.filter((t) => t.succeededToday).length;
	const failuresToday = attemptsToday - successesToday;

	// Feeling drained: more failures than successes, and at least 2 failures
	const feelingDrained = failuresToday > successesToday && failuresToday >= 2;

	// Feeling stuck: 2+ consecutive failures (tracked globally)
	const feelingStuck = state.consecutiveFailures >= 2;

	// On a roll: 2+ successes today and no consecutive failures
	const onARoll = successesToday >= 2 && state.consecutiveFailures === 0;

	return {
		feelingDrained,
		feelingStuck,
		onARoll,
		attemptsToday,
		successesToday,
	};
}

/** Per-block phone tracking state for the human-like strategy. */
interface PhoneTracking {
	lastActionWasPhone: boolean;
	phoneChecksThisBlock: number;
}

/**
 * Creates a human-like strategy instance with per-run state.
 *
 * Simulates a player who can't see hidden state and makes imperfect decisions.
 * Uses a "feel" model where the player develops an imperfect sense of their
 * state based on recent successes/failures. This creates realistic patterns:
 * - Succeeding players keep going
 * - Failing players sometimes check phone but don't spiral
 * - Players give up on blocks when truly struggling
 *
 * Night: Push through when feeling productive, not when drained.
 * Rescue: Guesses tier based on feel, with realistic error rates.
 *
 * Phone checking is bounded per block to prevent the death spiral where
 * early failures lead to phone → momentum loss → more failures → more phone.
 * A real person checks once, maybe twice, then does something or moves on.
 */
export function createHumanLikeStrategy(): Strategy {
	let phoneTracking: PhoneTracking = {
		lastActionWasPhone: false,
		phoneChecksThisBlock: 0,
	};
	let currentBlockKey = "";

	return {
		decide(context: DecisionContext): Decision {
			const { state, availableDecisions, screen, roll } = context;

			if (screen === "friendRescue") {
				phoneTracking.lastActionWasPhone = false;
				return pickRescueDecision(state, availableDecisions, roll);
			}

			if (screen === "nightChoice") {
				phoneTracking.lastActionWasPhone = false;
				return pickNightDecision(state, availableDecisions, roll);
			}

			if (screen === "narrativeEvent") {
				return pickEventDecision(availableDecisions, roll);
			}

			// Track block changes to reset phone counter
			const blockKey = `${state.dayIndex}-${state.timeBlock}-${state.inExtendedNight}`;
			if (blockKey !== currentBlockKey) {
				phoneTracking = {
					lastActionWasPhone: false,
					phoneChecksThisBlock: 0,
				};
				currentBlockKey = blockKey;
			}

			const decision = pickGameDecision(
				state,
				availableDecisions,
				roll,
				phoneTracking,
			);

			// Track the decision for next iteration
			if (decision.type === "checkPhone") {
				phoneTracking.lastActionWasPhone = true;
				phoneTracking.phoneChecksThisBlock++;
			} else {
				phoneTracking.lastActionWasPhone = false;
			}

			return decision;
		},
	};
}

/**
 * Picks a game screen decision using the "feel" model.
 * Decisions are influenced by perceived state, not random percentages.
 */
function pickGameDecision(
	state: GameState,
	decisions: Decision[],
	roll: () => number,
	phoneTracking: PhoneTracking,
): Decision {
	const perceived = getPerceivedState(state);
	const weekend = isWeekend(state);
	const availableTasks = getAvailableTasks(state);
	const freshTasks = availableTasks.filter((t) => !t.attemptedToday);

	// Check if we can actually attempt tasks (have slots/points)
	const canAttempt = weekend
		? state.weekendPointsRemaining > 0
		: state.slotsRemaining > 0;

	// Check if we should skip/end day (give up on current block)
	if (
		shouldGiveUp(
			state,
			perceived,
			weekend,
			canAttempt ? availableTasks.length : 0,
			canAttempt ? freshTasks.length : 0,
			roll,
		)
	) {
		if (weekend) {
			const endDay = decisions.find((d) => d.type === "endDay");
			if (endDay) return endDay;
		} else {
			const skip = decisions.find((d) => d.type === "skip");
			if (skip) return skip;
		}
	}

	// Check if we should check phone (procrastination/distraction)
	if (
		canAttempt &&
		shouldCheckPhone(perceived, decisions, roll, phoneTracking)
	) {
		const phone = decisions.find((d) => d.type === "checkPhone");
		if (phone) return phone;
	}

	// Try to attempt a task (only if we have slots/points)
	if (canAttempt && availableTasks.length > 0) {
		const task = pickTask(state, availableTasks, perceived, roll);
		if (task) {
			// Check if variant is available
			const hasVariant =
				task.minimalVariant && state.variantsUnlocked.includes(task.category);

			// More likely to use variant when feeling drained (need easy win)
			const variantChance = perceived.feelingDrained ? 0.6 : 0.35;
			const useVariant = hasVariant && roll() < variantChance;

			return { type: "attempt", taskId: task.id, useVariant };
		}
	}

	// No tasks available - must skip/end
	if (weekend) {
		return (
			decisions.find((d) => d.type === "endDay") ?? (decisions[0] as Decision)
		);
	}
	return decisions.find((d) => d.type === "skip") ?? (decisions[0] as Decision);
}

/**
 * Determines if player should give up on current time block / end day.
 * Based on feeling drained/stuck, not random chance.
 */
function shouldGiveUp(
	state: GameState,
	perceived: PerceivedState,
	weekend: boolean,
	tasksAvailable: number,
	freshTasksAvailable: number,
	roll: () => number,
): boolean {
	// No tasks available - must give up
	if (tasksAvailable === 0) return true;

	// No fresh tasks left - only retries available
	// This is a strong signal to move on (80% chance to skip)
	if (freshTasksAvailable === 0) {
		// Unless we haven't tried much yet this block
		if (weekend) {
			// Weekend: give up if we've done several attempts
			if (perceived.attemptsToday >= 4) return roll() < 0.7;
		} else {
			// Weekday: used most slots, no fresh tasks -> move on
			if (state.slotsRemaining <= 1) return roll() < 0.8;
		}
	}

	// Small base chance - sometimes people just don't feel like continuing
	let giveUpChance = 0.03;

	if (weekend) {
		// Weekend: give up when tired and have done some tasks
		if (perceived.feelingDrained && perceived.attemptsToday >= 4) {
			giveUpChance += 0.2;
		}
		if (perceived.feelingStuck && perceived.feelingDrained) {
			giveUpChance += 0.25;
		}
		// Less likely to give up early in the day
		if (perceived.attemptsToday < 3) {
			giveUpChance *= 0.3;
		}
	} else {
		// Weekday: give up on block when really struggling
		if (perceived.feelingDrained && perceived.feelingStuck) {
			giveUpChance += 0.2;
		}
		// More likely to skip if few slots remain and struggling
		if (state.slotsRemaining === 1 && perceived.feelingDrained) {
			giveUpChance += 0.15;
		}
		// Very stuck (3+ consecutive failures) - strongly consider skipping
		if (state.consecutiveFailures >= 3) {
			giveUpChance += 0.25;
		}
	}

	// On a roll - very unlikely to give up
	if (perceived.onARoll) {
		giveUpChance *= 0.1;
	}

	return roll() < giveUpChance;
}

/**
 * Determines if player should check phone (procrastination).
 * Bounded per block to prevent the spiral where phone -> momentum loss ->
 * more failures -> more phone. A real person checks once, maybe twice,
 * then either does something or moves on.
 */
function shouldCheckPhone(
	perceived: PerceivedState,
	decisions: Decision[],
	roll: () => number,
	tracking: PhoneTracking,
): boolean {
	// Can't check phone if not available
	if (!decisions.some((d) => d.type === "checkPhone")) return false;

	// Never check phone back-to-back (diminishing returns - you just checked)
	if (tracking.lastActionWasPhone) return false;

	// Limit per block: max 1 normally, 2 when stuck
	const maxChecks = perceived.feelingStuck ? 2 : 1;
	if (tracking.phoneChecksThisBlock >= maxChecks) return false;

	// Base temptation exists even when doing well - phones are addictive
	let phoneChance = 0.08;

	// Feeling stuck - reach for phone when nothing works
	if (perceived.feelingStuck) {
		phoneChance += 0.15;
	}

	// Feeling drained - distraction seeking
	if (perceived.feelingDrained) {
		phoneChance += 0.08;
	}

	// On a roll - less likely to get distracted
	if (perceived.onARoll) {
		phoneChance *= 0.4;
	}

	// Cap at reasonable maximum
	phoneChance = Math.min(phoneChance, 0.3);

	return roll() < phoneChance;
}

/**
 * Picks which task to attempt.
 * Prefers unattempted tasks, weights by priority with noise.
 * When drained, prefers easier tasks.
 */
function pickTask(
	state: GameState,
	availableTasks: Task[],
	perceived: PerceivedState,
	roll: () => number,
): Task | undefined {
	if (availableTasks.length === 0) return undefined;

	// Separate fresh tasks (not yet attempted today)
	const freshTasks = availableTasks.filter((t) => !t.attemptedToday);

	// Strongly prefer fresh tasks (80% of the time if available)
	const preferFresh = freshTasks.length > 0 && roll() < 0.8;
	const taskPool = preferFresh ? freshTasks : availableTasks;

	// Weight tasks by priority + some noise
	const weights = taskPool.map((task) => {
		let weight = CATEGORY_PRIORITIES[task.category] ?? 50;

		// Add randomness for individual variation (+-30)
		weight += (roll() - 0.5) * 60;

		// When drained, prefer easier tasks (higher base rate)
		if (perceived.feelingDrained) {
			weight += task.baseRate * 40;
		}

		// Slight preference for tasks that haven't been attempted
		if (!task.attemptedToday) {
			weight += 15;
		}

		// Dog gets urgency boost if failed yesterday
		if (state.dogFailedYesterday && task.category === "dog") {
			weight += 50;
		}

		return { task, weight };
	});

	// Pick weighted random
	const totalWeight = weights.reduce(
		(sum, w) => sum + Math.max(w.weight, 1),
		0,
	);
	let pick = roll() * totalWeight;

	for (const { task, weight } of weights) {
		pick -= Math.max(weight, 1);
		if (pick <= 0) return task;
	}

	// Fallback to first task
	return taskPool[0];
}

/**
 * Picks a night choice decision based on perceived state.
 * Player can't see energy, so they decide based on how the day felt.
 */
function pickNightDecision(
	state: GameState,
	decisions: Decision[],
	roll: () => number,
): Decision {
	if (
		!state.pushedThroughLastNight &&
		!state.inExtendedNight &&
		!isWeekend(state)
	) {
		const perceived = getPerceivedState(state);

		// Push through when feeling productive, avoid when struggling
		let pushChance = 0.15;
		if (perceived.onARoll) pushChance = 0.4;
		if (perceived.feelingDrained) pushChance = 0.05;
		if (perceived.feelingStuck) pushChance = 0.02;

		if (roll() < pushChance) {
			const pushThrough = decisions.find((d) => d.type === "pushThrough");
			if (pushThrough) return pushThrough;
		}
	}

	return decisions.find((d) => d.type === "sleep") as Decision;
}

/**
 * Picks a friend rescue activity based on perceived state.
 * Player can't see energy, so they guess based on how they feel.
 */
function pickRescueDecision(
	state: GameState,
	decisions: Decision[],
	roll: () => number,
): Decision {
	const perceived = getPerceivedState(state);
	const r = roll();

	if (perceived.onARoll) {
		// Feeling good - lean toward high activity
		if (r < 0.5) return findRescue(decisions, "high");
		if (r < 0.85) return findRescue(decisions, "medium");
		return findRescue(decisions, "low");
	}

	if (perceived.feelingDrained) {
		// Feeling tired - lean toward low activity
		if (r < 0.1) return findRescue(decisions, "high");
		if (r < 0.35) return findRescue(decisions, "medium");
		return findRescue(decisions, "low");
	}

	// Neutral - lean medium
	if (r < 0.2) return findRescue(decisions, "high");
	if (r < 0.8) return findRescue(decisions, "medium");
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

/**
 * Picks a narrative event decision.
 * Minor events: dismiss. Major events: random choice.
 */
function pickEventDecision(
	decisions: Decision[],
	roll: () => number,
): Decision {
	// Minor event - just dismiss
	const dismiss = decisions.find((d) => d.type === "dismissEvent");
	if (dismiss) return dismiss;

	// Major event - pick a random choice
	const choices = decisions.filter((d) => d.type === "eventChoice");
	if (choices.length > 0) {
		const index = Math.floor(roll() * choices.length);
		return choices[index] ?? choices[0] ?? (decisions[0] as Decision);
	}

	return decisions[0] as Decision;
}
