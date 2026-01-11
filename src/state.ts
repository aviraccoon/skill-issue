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

export interface Task {
	id: string;
	name: string;
	category:
		| "hygiene"
		| "food"
		| "chores"
		| "dog"
		| "work"
		| "creative"
		| "selfcare"
		| "social";
	baseRate: number; // 0-1, base success probability
	minimalVariant?: {
		name: string;
		baseRate: number;
	};
	availableBlocks: TimeBlock[]; // when this task can appear
	weekendCost?: number; // action points on weekend (default 1)
	evolution?: TaskEvolution; // evolved descriptions at higher failure counts
	failureCount: number; // how many times failed this week
	attemptedToday: boolean;
	succeededToday: boolean;
}

export type Screen = "game" | "daySummary" | "weekComplete";

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
	energy: number; // 0-1
	momentum: number; // 0-1, starts at 0.5
	runSeed: number; // seed for this run, affects randomization (evolution text, etc.)
}

/** Returns true if the current day is Saturday or Sunday. */
export function isWeekend(state: GameState): boolean {
	return state.dayIndex >= 5;
}

import { initialTasks } from "./data/tasks";
export { initialTasks };

/** Generates a fresh initial state with a new random seed. */
export function createInitialState(): GameState {
	return {
		day: "monday",
		dayIndex: 0,
		timeBlock: "morning",
		slotsRemaining: 3,
		weekendPointsRemaining: 8,
		tasks: structuredClone(initialTasks),
		selectedTaskId: null,
		screen: "game",
		energy: 0.6,
		momentum: 0.5,
		runSeed: Math.floor(Math.random() * 2147483647),
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
