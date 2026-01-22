/**
 * Screen information for rendering.
 * Provides all content needed to render each screen type.
 */

import { ACTIVITIES, type Activity } from "../actions/friend";
import {
	determineTone,
	generateAllNighterNarrative,
	generateNarrative,
	getAllNighterTitle,
	getDogNote,
} from "../data/daySummary";
import type { GameState, Task, TimeBlock } from "../state";
import { isWeekend, TIME_BLOCKS } from "../state";
import { getExtendedNightDescription } from "../systems/allnighter";
import {
	type DogUrgency,
	getDogUrgency,
	URGENCY_DISPLAY,
} from "../systems/dog";
import { getEvolvedDescription } from "../systems/evolution";
import { getRandomRescueMessage, getRescueCost } from "../systems/friend";
import { getPatternHint } from "../systems/patternHints";
import { seededShuffle } from "../utils/random";
import { capitalize } from "../utils/string";
import type { Decision } from "./controller";
import { getAvailableDecisions } from "./controller";

/** Task display info for rendering. */
export interface TaskDisplay {
	id: string;
	name: string;
	evolvedName: string;
	failureCount: number;
	succeededToday: boolean;
	attemptedToday: boolean;
	weekendCost: number;
	availableBlocks: TimeBlock[];
	canAttempt: boolean;
	urgency?: { level: DogUrgency; text: string };
}

/** Game screen info. */
export interface GameScreenInfo {
	type: "game";
	day: string;
	dayCapitalized: string;
	timeBlock: TimeBlock;
	isWeekend: boolean;
	slotsRemaining: number;
	weekendPointsRemaining: number;
	inExtendedNight: boolean;
	tasks: TaskDisplay[];
	selectedTask: TaskDisplay | null;
	decisions: Decision[];
	/** Next time block label for skip button, or null if end of day. */
	nextTimeBlock: TimeBlock | null;
}

/** Night choice screen info. */
export interface NightChoiceInfo {
	type: "nightChoice";
	day: string;
	dayCapitalized: string;
	description: string;
	canPushThrough: boolean;
	decisions: Decision[];
}

/** Friend rescue screen info. */
export interface FriendRescueInfo {
	type: "friendRescue";
	message: string;
	cost: number;
	costLabel: string;
	activities: Activity[];
	decisions: Decision[];
}

/** Day summary screen info. */
export interface DaySummaryInfo {
	type: "daySummary";
	title: string;
	attemptedCount: number;
	succeededCount: number;
	narrative: string;
	dogNote: string | null;
	pulledAllNighter: boolean;
}

/** Week complete screen info. */
export interface WeekCompleteInfo {
	type: "weekComplete";
	totalSuccesses: number;
	totalFailures: number;
	narrative: string;
}

/** Union of all screen info types. */
export type ScreenInfo =
	| GameScreenInfo
	| NightChoiceInfo
	| FriendRescueInfo
	| DaySummaryInfo
	| WeekCompleteInfo;

/**
 * Gets all information needed to render the current screen.
 */
export function getScreenInfo(state: GameState): ScreenInfo {
	switch (state.screen) {
		case "nightChoice":
			return getNightChoiceInfo(state);
		case "friendRescue":
			return getFriendRescueInfo(state);
		case "daySummary":
			return getDaySummaryInfo(state);
		case "weekComplete":
			return getWeekCompleteInfo(state);
		default:
			return getGameScreenInfo(state);
	}
}

function getGameScreenInfo(state: GameState): GameScreenInfo {
	const weekend = isWeekend(state);
	const decisions = getAvailableDecisions(state);

	// Get visible tasks (all on weekends, time-block filtered on weekdays)
	let visibleTasks = weekend
		? state.tasks
		: state.tasks.filter((t) => t.availableBlocks.includes(state.timeBlock));

	// Shuffle for display variety
	visibleTasks = seededShuffle(visibleTasks, state.runSeed + state.dayIndex);

	// Build task displays
	const taskDisplays = visibleTasks.map((task) =>
		buildTaskDisplay(task, state, decisions),
	);

	// Find selected task
	const selectedTask = state.selectedTaskId
		? (taskDisplays.find((t) => t.id === state.selectedTaskId) ?? null)
		: null;

	// Calculate next time block
	const currentIndex = TIME_BLOCKS.indexOf(state.timeBlock);
	const nextTimeBlock = TIME_BLOCKS[currentIndex + 1] ?? null;

	return {
		type: "game",
		day: state.day,
		dayCapitalized: capitalize(state.day),
		timeBlock: state.timeBlock,
		isWeekend: weekend,
		slotsRemaining: state.slotsRemaining,
		weekendPointsRemaining: state.weekendPointsRemaining,
		inExtendedNight: state.inExtendedNight,
		tasks: taskDisplays,
		selectedTask,
		decisions,
		nextTimeBlock,
	};
}

function buildTaskDisplay(
	task: Task,
	state: GameState,
	decisions: Decision[],
): TaskDisplay {
	const cost = task.weekendCost ?? 1;

	// Check if this task can be attempted
	const canAttempt = decisions.some(
		(d) => d.type === "attempt" && d.taskId === task.id,
	);

	// Build urgency info for dog
	let urgency: TaskDisplay["urgency"];
	if (task.id === "walk-dog" && !task.succeededToday) {
		const level = getDogUrgency(state);
		if (level !== "normal") {
			urgency = { level, text: URGENCY_DISPLAY[level] };
		}
	}

	return {
		id: task.id,
		name: task.name,
		evolvedName: getEvolvedDescription(task, state.runSeed),
		failureCount: task.failureCount,
		succeededToday: task.succeededToday,
		attemptedToday: task.attemptedToday,
		weekendCost: cost,
		availableBlocks: task.availableBlocks,
		canAttempt,
		urgency,
	};
}

function getNightChoiceInfo(state: GameState): NightChoiceInfo {
	const decisions = getAvailableDecisions(state);
	const canPush = decisions.some((d) => d.type === "pushThrough");

	return {
		type: "nightChoice",
		day: state.day,
		dayCapitalized: capitalize(state.day),
		description: getExtendedNightDescription(state.energy),
		canPushThrough: canPush,
		decisions,
	};
}

function getFriendRescueInfo(state: GameState): FriendRescueInfo {
	const decisions = getAvailableDecisions(state);
	const cost = getRescueCost(state);
	const weekend = isWeekend(state);

	return {
		type: "friendRescue",
		message: getRandomRescueMessage(
			state.runSeed + state.dayIndex + state.consecutiveFailures,
		),
		cost,
		costLabel: weekend ? `${cost} action points` : `${cost} action slot`,
		activities: [...ACTIVITIES],
		decisions,
	};
}

function getDaySummaryInfo(state: GameState): DaySummaryInfo {
	const attempted = state.tasks.filter((t) => t.attemptedToday);
	const succeeded = state.tasks.filter((t) => t.succeededToday);
	const pulledAllNighter = state.inExtendedNight;

	const tone = determineTone(attempted.length, succeeded.length);
	const narrative = pulledAllNighter
		? generateAllNighterNarrative(state)
		: generateNarrative(tone);

	const title = pulledAllNighter
		? getAllNighterTitle(state)
		: capitalize(state.day);

	return {
		type: "daySummary",
		title,
		attemptedCount: attempted.length,
		succeededCount: succeeded.length,
		narrative,
		dogNote: getDogNote(state),
		pulledAllNighter,
	};
}

function getWeekCompleteInfo(state: GameState): WeekCompleteInfo {
	const totalSuccesses = state.tasks.reduce(
		(sum, t) => sum + (t.succeededToday ? 1 : 0),
		0,
	);
	const totalFailures = state.tasks.reduce((sum, t) => sum + t.failureCount, 0);

	const tone = determineWeekTone(totalSuccesses, totalFailures);
	const narrative = generateWeekNarrative(tone);

	return {
		type: "weekComplete",
		totalSuccesses,
		totalFailures,
		narrative,
	};
}

type WeekTone = "survived" | "rough" | "good";

function determineWeekTone(successes: number, failures: number): WeekTone {
	const total = successes + failures;
	if (total === 0) return "rough";
	const ratio = successes / total;
	if (ratio >= 0.5) return "good";
	if (ratio >= 0.3) return "survived";
	return "rough";
}

function generateWeekNarrative(tone: WeekTone): string {
	switch (tone) {
		case "good":
			return "You made it through. The dog got walked. You ate food. Some tasks happened, some didn't. That's a week.";
		case "rough":
			return "You survived. Barely, some days. The dog still loves you. You fed yourself, even if it was delivery every time. You're still here.";
		default:
			return "A week of attempts. Some worked. Most didn't. You had that one good moment where things clicked. Normal week, really.";
	}
}

/**
 * Gets the result info after accepting a friend rescue.
 * Call after executeDecision with acceptRescue to get display info.
 */
export function getFriendRescueResultInfo(
	state: GameState,
	correctTier: boolean,
): { message: string; hint: string } {
	return {
		message: correctTier
			? "That was good. You feel better."
			: "You pushed yourself a bit too much. Still, you saw your friend.",
		hint: getPatternHint(state),
	};
}
