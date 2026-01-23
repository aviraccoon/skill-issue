/**
 * Screen information for rendering.
 * Provides all content needed to render each screen type.
 */

import { type Activity, getLocalizedActivities } from "../actions/friend";
import {
	determineTone,
	generateAllNighterNarrative,
	generateNarrative,
	getAllNighterTitle,
	getDogNote,
} from "../data/daySummary";
import { getRandomRescueMessage } from "../data/friendRescue";
import { strings } from "../i18n";
import type { Day, GameState, Task, TimeBlock } from "../state";
import { isWeekend, TIME_BLOCKS } from "../state";
import { getExtendedNightDescription } from "../systems/allnighter";
import {
	type DogUrgency,
	getDogUrgency,
	getUrgencyDisplay,
} from "../systems/dog";
import { getEvolvedDescription } from "../systems/evolution";
import { getRescueCost } from "../systems/friend";
import { seededShuffle } from "../utils/random";
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
	/** Minimal variant info, if available and unlocked. */
	variant?: { name: string };
}

/** Game screen info. */
export interface GameScreenInfo {
	type: "game";
	/** Day key for template functions. */
	day: Day;
	/** Translated day name for display. */
	dayDisplay: string;
	timeBlock: TimeBlock;
	/** Translated time block name for display. */
	timeBlockDisplay: string;
	isWeekend: boolean;
	slotsRemaining: number;
	weekendPointsRemaining: number;
	inExtendedNight: boolean;
	tasks: TaskDisplay[];
	selectedTask: TaskDisplay | null;
	decisions: Decision[];
	/** Next time block key, or null if end of day. */
	nextTimeBlock: TimeBlock | null;
}

/** Night choice screen info. */
export interface NightChoiceInfo {
	type: "nightChoice";
	/** Day key for template functions. */
	day: Day;
	/** Translated day name for display. */
	dayDisplay: string;
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
	const s = strings();
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
		dayDisplay: s.days[state.day],
		timeBlock: state.timeBlock,
		timeBlockDisplay: s.timeBlocks[state.timeBlock],
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
			urgency = { level, text: getUrgencyDisplay(level) };
		}
	}

	// Build variant info if available and unlocked
	let variant: TaskDisplay["variant"];
	if (task.minimalVariant && state.variantsUnlocked.includes(task.category)) {
		variant = { name: task.minimalVariant.name };
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
		variant,
	};
}

function getNightChoiceInfo(state: GameState): NightChoiceInfo {
	const s = strings();
	const decisions = getAvailableDecisions(state);
	const canPush = decisions.some((d) => d.type === "pushThrough");

	return {
		type: "nightChoice",
		day: state.day,
		dayDisplay: s.days[state.day],
		description: getExtendedNightDescription(state.energy),
		canPushThrough: canPush,
		decisions,
	};
}

function getFriendRescueInfo(state: GameState): FriendRescueInfo {
	const s = strings();
	const decisions = getAvailableDecisions(state);
	const cost = getRescueCost(state);
	const weekend = isWeekend(state);

	return {
		type: "friendRescue",
		message: getRandomRescueMessage(state),
		cost,
		costLabel: weekend ? s.friend.costPoints(cost) : s.friend.costSlot(cost),
		activities: getLocalizedActivities(),
		decisions,
	};
}

function getDaySummaryInfo(state: GameState): DaySummaryInfo {
	const s = strings();
	const attempted = state.tasks.filter((t) => t.attemptedToday);
	const succeeded = state.tasks.filter((t) => t.succeededToday);
	const pulledAllNighter = state.inExtendedNight;

	const tone = determineTone(attempted.length, succeeded.length);
	const narrative = pulledAllNighter
		? generateAllNighterNarrative(state)
		: generateNarrative(tone);

	const title = pulledAllNighter
		? getAllNighterTitle(state)
		: s.days[state.day];

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
	const s = strings();
	return s.weekNarrative[tone];
}
