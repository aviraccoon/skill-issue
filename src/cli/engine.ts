import { continueToNextDay } from "../actions/time";
import {
	type ActionResult,
	type Decision,
	executeDecision,
	getAvailableDecisions,
	hasLost,
	isComplete,
} from "../core/controller";
import { initialTasks } from "../data/tasks";
import { DAYS, type Day, type GameState } from "../state";
import { createStore } from "../store";
import {
	getPersonalityFromSeed,
	getStartingEnergyFromSeed,
	getStartingMomentumFromSeed,
} from "../systems/personality";
import { nextRoll } from "../utils/random";
import type { RunStats } from "./stats";

// Re-export for consumers that import from engine.ts
export type { ActionResult, Decision };
export { executeDecision, getAvailableDecisions, hasLost, isComplete };

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
	/** Get next deterministic random value in [0, 1). */
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
 * Summary of a single day in the simulation.
 */
export interface DaySummary {
	day: Day;
	dayIndex: number;
	actions: ActionResult[];
	tasksSucceeded: string[];
	tasksFailed: string[];
	energyStart: number;
	energyEnd: number;
	momentumStart: number;
	momentumEnd: number;
	pulledAllNighter: boolean;
	friendRescueTriggered: boolean;
	friendRescueAccepted: boolean;
}

/**
 * Result of a complete simulation run.
 */
export interface SimulationResult {
	seed: number;
	personality: {
		time: string;
		social: string;
	};
	survived: boolean;
	days: DaySummary[];
	stats: RunStats;
}

/**
 * Callback for observing simulation progress.
 */
export interface SimulationObserver {
	onAction?(state: GameState, decision: Decision, result: ActionResult): void;
	onDayEnd?(state: GameState, summary: DaySummary): void;
	onWeekEnd?(result: SimulationResult): void;
}

/**
 * Creates an initial game state with a specific seed.
 */
export function createStateFromSeed(seed: number): GameState {
	return {
		day: "monday",
		dayIndex: 0,
		timeBlock: "morning",
		slotsRemaining: 3,
		weekendPointsRemaining: 8,
		tasks: structuredClone(initialTasks),
		selectedTaskId: null,
		screen: "game",
		energy: getStartingEnergyFromSeed(seed),
		momentum: getStartingMomentumFromSeed(seed),
		runSeed: seed,
		personality: getPersonalityFromSeed(seed),
		dogFailedYesterday: false,
		pushedThroughLastNight: false,
		inExtendedNight: false,
		consecutiveFailures: 0,
		friendRescueUsedToday: false,
		rollCount: 0,
		variantsUnlocked: [],
	};
}

/**
 * Runs a complete simulation with the given seed and strategy.
 */
export function simulate(
	seed: number,
	strategy: Strategy,
	observer?: SimulationObserver,
): SimulationResult {
	const initialState = createStateFromSeed(seed);
	const store = createStore(initialState);

	const days: DaySummary[] = [];
	let currentDayActions: ActionResult[] = [];
	let dayEnergyStart = initialState.energy;
	let dayMomentumStart = initialState.momentum;
	let dayFriendRescueTriggered = false;
	let dayFriendRescueAccepted = false;
	let lastDayIndex = 0;

	// Run simulation loop
	while (!isComplete(store.getState()) && !hasLost(store.getState())) {
		const state = store.getState();

		// Check if we've moved to a new day
		if (state.dayIndex !== lastDayIndex && state.screen === "game") {
			// Save previous day summary
			const prevState = {
				...state,
				dayIndex: lastDayIndex,
				day: DAYS[lastDayIndex] as Day,
			};
			const prevDaySummary = createDaySummary(
				prevState,
				currentDayActions,
				dayEnergyStart,
				dayMomentumStart,
				dayFriendRescueTriggered,
				dayFriendRescueAccepted,
			);
			days.push(prevDaySummary);
			observer?.onDayEnd?.(state, prevDaySummary);

			// Reset for new day
			currentDayActions = [];
			dayEnergyStart = state.energy;
			dayMomentumStart = state.momentum;
			dayFriendRescueTriggered = false;
			dayFriendRescueAccepted = false;
			lastDayIndex = state.dayIndex;
		}

		// Handle day summary screen - auto-continue
		if (state.screen === "daySummary") {
			continueToNextDay(store);
			continue;
		}

		// Get available decisions and context
		const availableDecisions = getAvailableDecisions(state);
		if (availableDecisions.length === 0) {
			// No decisions available - shouldn't happen, but break to avoid infinite loop
			break;
		}

		const context: DecisionContext = {
			state,
			availableDecisions,
			screen:
				state.screen === "friendRescue"
					? "friendRescue"
					: state.screen === "nightChoice"
						? "nightChoice"
						: "game",
			roll: () => nextRoll(store),
		};

		// Get and execute decision
		const decision = strategy.decide(context);
		const result = executeDecision(store, decision);
		currentDayActions.push(result);

		// Track friend rescue for day summary
		if (result.friendRescueTriggered) {
			dayFriendRescueTriggered = true;
		}
		if (decision.type === "acceptRescue") {
			dayFriendRescueAccepted = true;
		}

		observer?.onAction?.(store.getState(), decision, result);
	}

	// Finalize last day if not already done
	const finalState = store.getState();
	if (currentDayActions.length > 0 || days.length === 0) {
		const finalDaySummary = createDaySummary(
			finalState,
			currentDayActions,
			dayEnergyStart,
			dayMomentumStart,
			dayFriendRescueTriggered,
			dayFriendRescueAccepted,
		);
		days.push(finalDaySummary);
		observer?.onDayEnd?.(finalState, finalDaySummary);
	}

	const result: SimulationResult = {
		seed,
		personality: {
			time: finalState.personality.time,
			social: finalState.personality.social,
		},
		survived: !hasLost(finalState) && isComplete(finalState),
		days,
		stats: calculateRunStats(days, finalState),
	};

	observer?.onWeekEnd?.(result);

	return result;
}

/**
 * Creates a day summary from collected actions.
 */
function createDaySummary(
	state: GameState,
	actions: ActionResult[],
	energyStart: number,
	momentumStart: number,
	friendRescueTriggered: boolean,
	friendRescueAccepted: boolean,
): DaySummary {
	const tasksSucceeded: string[] = [];
	const tasksFailed: string[] = [];

	for (const action of actions) {
		if (action.decision.type === "attempt") {
			if (action.succeeded) {
				tasksSucceeded.push(action.decision.taskId);
			} else {
				tasksFailed.push(action.decision.taskId);
			}
		}
	}

	return {
		day: state.day,
		dayIndex: state.dayIndex,
		actions,
		tasksSucceeded,
		tasksFailed,
		energyStart,
		energyEnd: state.energy,
		momentumStart,
		momentumEnd: state.momentum,
		pulledAllNighter: state.inExtendedNight || state.pushedThroughLastNight,
		friendRescueTriggered,
		friendRescueAccepted,
	};
}

/**
 * Calculates run statistics from day summaries.
 */
function calculateRunStats(
	days: DaySummary[],
	finalState: GameState,
): RunStats {
	let totalAttempts = 0;
	let totalSuccesses = 0;
	let totalPhoneChecks = 0;
	let totalAllNighters = 0;
	let totalFriendRescues = 0;
	let totalFriendAccepts = 0;
	let minEnergy = 1;
	let minMomentum = 1;

	const _attemptsByCategory: Record<
		string,
		{ attempts: number; successes: number }
	> = {};

	for (const day of days) {
		minEnergy = Math.min(minEnergy, day.energyEnd);
		minMomentum = Math.min(minMomentum, day.momentumEnd);

		if (day.pulledAllNighter) totalAllNighters++;
		if (day.friendRescueTriggered) totalFriendRescues++;
		if (day.friendRescueAccepted) totalFriendAccepts++;

		for (const action of day.actions) {
			if (action.decision.type === "attempt") {
				totalAttempts++;
				if (action.succeeded) totalSuccesses++;

				// Track by category (we'd need task data to do this properly)
			}
			if (action.decision.type === "checkPhone") {
				totalPhoneChecks++;
			}
		}
	}

	return {
		energy: {
			start: days[0]?.energyStart ?? finalState.energy,
			end: finalState.energy,
			min: minEnergy,
		},
		momentum: {
			start: days[0]?.momentumStart ?? finalState.momentum,
			end: finalState.momentum,
			min: minMomentum,
		},
		tasks: {
			attempted: totalAttempts,
			succeeded: totalSuccesses,
			successRate: totalAttempts > 0 ? totalSuccesses / totalAttempts : 0,
		},
		friendRescues: {
			triggered: totalFriendRescues,
			accepted: totalFriendAccepts,
		},
		allNighters: totalAllNighters,
		phoneChecks: totalPhoneChecks,
		variantsUnlocked: [...finalState.variantsUnlocked],
	};
}
