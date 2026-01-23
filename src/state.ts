export type TimeBlock = "morning" | "afternoon" | "evening" | "night";
export type Day =
	| "monday"
	| "tuesday"
	| "wednesday"
	| "thursday"
	| "friday"
	| "saturday"
	| "sunday";

/**
 * Evolved descriptions shown as failure count increases.
 * Arrays allow variety across playthroughs - one is picked randomly.
 * - aware (2-3 failures): self-aware acknowledgment
 * - honest (4-5 failures): more real, less pretense
 * - resigned (6+ failures): dark humor acceptance
 */
export interface TaskEvolution {
	aware: string[];
	honest: string[];
	resigned: string[];
}

import type { TaskCategory, TaskId } from "./data/tasks";
import type { Personality } from "./systems/personality";

export interface Task {
	id: TaskId;
	name: string;
	category: TaskCategory;
	baseRate: number; // 0-1, base success probability
	minimalVariant?: {
		name: string;
		baseRate: number;
		unlockHints: string[]; // friend hint messages that unlock this variant
	};
	availableBlocks: TimeBlock[]; // when this task can appear
	weekendCost?: number; // action points on weekend (default 1)
	evolution?: TaskEvolution; // evolved descriptions at higher failure counts
	energyEffect?: {
		success?: number; // energy change on success (default: 0)
		failure?: number; // energy change on failure (default: -0.02)
	};
	autoSatisfies?: string; // when this task succeeds, also mark another task as succeeded
	failureCount: number; // how many times failed this week
	attemptedToday: boolean;
	succeededToday: boolean;
}

export type Screen =
	| "game"
	| "nightChoice"
	| "daySummary"
	| "weekComplete"
	| "friendRescue";

export interface GameState {
	day: Day;
	dayIndex: number; // 0-6
	timeBlock: TimeBlock;
	slotsRemaining: number; // weekday action slots per time block
	weekendPointsRemaining: number; // weekend action points (8 total)
	tasks: Task[];
	selectedTaskId: string | null;
	screen: Screen;

	// Hidden from player
	energy: number; // 0-1, seed-based starting value (55-65%)
	momentum: number; // 0-1, seed-based starting value (45-55%)
	runSeed: number; // seed for this run, affects randomization (evolution text, etc.)
	personality: Personality; // seed-determined, affects time modifiers and energy effects

	// Dog state
	dogFailedYesterday: boolean; // true if dog wasn't walked previous day

	// All-nighter state
	pushedThroughLastNight: boolean; // true if pulled all-nighter last night (blocks consecutive)
	inExtendedNight: boolean; // true if currently in extended night from pushing through

	// Friend rescue state
	consecutiveFailures: number; // resets on success or rescue, triggers check at 3+
	friendRescueUsedToday: boolean; // limits to 1 rescue per day

	// Deterministic randomness
	rollCount: number; // increments with each random roll for reproducibility

	// Task variants (unlocked through friend hints)
	variantsUnlocked: TaskCategory[]; // categories where minimal variants are visible
}

/** Returns true if the current day is Saturday or Sunday. */
export function isWeekend(state: GameState): boolean {
	return state.dayIndex >= 5;
}

import { initialTasks } from "./data/tasks";
import {
	getPersonalityFromSeed,
	getStartingEnergyFromSeed,
	getStartingMomentumFromSeed,
} from "./systems/personality";
export { initialTasks };

/** Generates a fresh initial state with a new random seed. */
export function createInitialState(): GameState {
	const runSeed = Math.floor(Math.random() * 2147483647);
	return {
		day: "monday",
		dayIndex: 0,
		timeBlock: "morning",
		slotsRemaining: 3,
		weekendPointsRemaining: 8,
		tasks: structuredClone(initialTasks),
		selectedTaskId: null,
		screen: "game",
		energy: getStartingEnergyFromSeed(runSeed),
		momentum: getStartingMomentumFromSeed(runSeed),
		runSeed,
		personality: getPersonalityFromSeed(runSeed),
		dogFailedYesterday: false,
		pushedThroughLastNight: false,
		inExtendedNight: false,
		consecutiveFailures: 0,
		friendRescueUsedToday: false,
		rollCount: 0,
		variantsUnlocked: [],
	};
}

export const initialState: GameState = createInitialState();

export const DAYS: Day[] = [
	"monday",
	"tuesday",
	"wednesday",
	"thursday",
	"friday",
	"saturday",
	"sunday",
];

export const TIME_BLOCKS: TimeBlock[] = [
	"morning",
	"afternoon",
	"evening",
	"night",
];
