import type { TimeBlock } from "./data/timeBlocks";
import type { NonEmptyArray } from "./utils/random";

export { TIME_BLOCKS, type TimeBlock } from "./data/timeBlocks";
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
	aware: NonEmptyArray<string>;
	honest: NonEmptyArray<string>;
	resigned: NonEmptyArray<string>;
}

import type { DeliveryStyle } from "./data/events";
import type { PhoneOutcome } from "./data/scrollTrap";
import type { TaskCategory, TaskId } from "./data/tasks";
import type { Personality } from "./systems/personality";

/** Transient inline event banner shown on the game screen. */
export interface EventBanner {
	eventId: EventId;
	text: string;
	style: DeliveryStyle;
}

/** Event ID type - all valid event identifiers. Re-exported for use in data/events.ts. */
export type EventId =
	// Tier 0: Flavor
	| "rain"
	| "neighbors-music"
	| "nice-weather"
	| "morning-bird"
	| "car-alarm"
	| "sunset"
	| "hallway-noise"
	| "wind"
	// Tier 1: Standalone
	| "cold-apartment"
	| "surprise-package"
	| "hot-water-out"
	| "upstairs-party"
	| "found-cash"
	| "good-smell"
	| "neighbor-cookies"
	| "fridge-empty"
	| "good-song"
	| "broken-mug"
	// Tier 1: Arc - Leak
	| "leak-drip"
	| "leak-found"
	| "leak-fixed"
	| "leak-worse"
	// Tier 1: Arc - Delivery
	| "missed-delivery"
	| "delivery-deadline"
	// Tier 1: Arc - Construction
	| "construction-start"
	| "construction-weekend"
	// Tier 1: Arc - Neighbor
	| "neighbor-hello"
	| "neighbor-invite"
	// Tier 1: Arc - Power Outage
	| "power-flicker"
	| "power-out"
	| "power-back"
	// Tier 2: Obligation - Dentist
	| "dentist-reminder"
	| "dentist-missed"
	// Tier 2: Obligation - Vet
	| "vet-reminder"
	| "vet-missed"
	// Tier 2: Obligation - Work Deadline
	| "work-reminder"
	| "work-missed"
	// Tier 2: Obligation - Building Inspection
	| "inspection-notice"
	| "inspection-failed"
	// Tier 2: Opportunity
	| "rooftop-bbq"
	| "friends-birthday"
	| "nice-weather-opportunity"
	| "creative-spark"
	// Tier 2: Arc - Dog Emergency
	| "azor-sick"
	| "azor-vet-choice"
	| "azor-recovered"
	| "azor-worse"
	// Tier 2: Contextual task variant
	| "friend-visits";

/** Runtime state of an event instance during a run. */
export interface EventInstance {
	id: EventId;
	status: "pending" | "active" | "resolved";
	/** For major events: which choice the player made. */
	choiceId?: string;
	/** Day index (0-6) this event is scheduled to fire on. Assigned during selection. */
	scheduledDay?: number;
	/** Day index when obligation task appears. Set on notification events with obligations. */
	obligationDay?: number;
	/** Outcome of a modifyTask effect: set when the modified task succeeds. */
	taskModificationResult?: "succeeded" | "succeeded-variant";
}

/**
 * Statistics tracked during a run for "Your Patterns" reveal.
 */
export interface RunStats {
	/** Total task attempts and successes. */
	tasks: { attempted: number; succeeded: number };
	/** Attempts/successes per time block. */
	byTimeBlock: Record<TimeBlock, { attempted: number; succeeded: number }>;
	/** Scroll trap (Check Phone) count. */
	phoneChecks: number;
	/** All-nighter count. */
	allNighters: number;
	/** Friend rescues triggered and accepted. */
	friendRescues: { triggered: number; accepted: number };
	/** Task categories where variants were used. */
	variantsUsed: TaskCategory[];
}

/** Creates fresh run stats with all counters at zero. */
export function createInitialRunStats(): RunStats {
	return {
		tasks: { attempted: 0, succeeded: 0 },
		byTimeBlock: {
			morning: { attempted: 0, succeeded: 0 },
			afternoon: { attempted: 0, succeeded: 0 },
			evening: { attempted: 0, succeeded: 0 },
			night: { attempted: 0, succeeded: 0 },
		},
		phoneChecks: 0,
		allNighters: 0,
		friendRescues: { triggered: 0, accepted: 0 },
		variantsUsed: [],
	};
}

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
	/** If set, task only appears on this dayIndex (0-6). Used for obligation tasks. */
	availableDay?: number;
	/** Event that injected this task. Used for obligation tasks. */
	sourceEvent?: EventId;
	/** Whether this is an obligation task (exempt from daily jitter). */
	isObligation?: boolean;
	/** Event that contextually modified this task. Present = modified, revert on success. */
	contextModifiedBy?: EventId;
}

export type Screen =
	| "splash"
	| "menu"
	| "intro"
	| "game"
	| "nightChoice"
	| "daySummary"
	| "weekComplete"
	| "friendRescue"
	| "narrativeEvent"
	| "patterns";

/** Game mode determines which save slot to use. */
export type GameMode = "main" | "seeded";

export interface GameState {
	day: Day;
	dayIndex: number; // 0-6
	timeBlock: TimeBlock;
	slotsRemaining: number; // weekday action slots per time block
	weekendPointsRemaining: number; // weekend action points (8 total)
	tasks: Task[];
	selectedTaskId: TaskId | null;
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
	friendRescueChanceBonus: number; // bonus from "Something Nice" phone outcome, resets daily

	// Deterministic randomness
	rollCount: number; // increments with each random roll for reproducibility

	// Task variants (unlocked through friend hints)
	variantsUnlocked: TaskCategory[]; // categories where minimal variants are visible

	// Phone notification state (for scroll trap discoverability)
	phoneNotificationCount: number; // 0 = no dot, 1+ = dot visible (higher = more urgent animation)

	// Last phone outcome (for dog reactions, transient visual state)
	lastPhoneOutcome: PhoneOutcome | null;
	lastPhoneTime: number; // timestamp from performance.now()

	// Last task outcome (for dog reactions, transient visual state)
	lastTaskOutcome: "success" | "failure" | null;
	lastTaskTime: number; // timestamp from performance.now()

	// Run statistics (for "Your Patterns" reveal)
	runStats: RunStats;

	// Active game mode (determines which save slot to use)
	gameMode: GameMode;

	// First-attempt tutorial guarantee (set by persistence layer for new players)
	firstAttemptAvailable: boolean;

	// Narrative events (seed-determined, checked at transition points)
	events: EventInstance[]; // events selected for this run, with status
	eventFlags: string[]; // flags set by event choices (for consequence chains)
	activeEventId: EventId | null; // event currently being displayed (major events only)

	// Inline event banner (minor events, transient, not persisted)
	eventBanner: EventBanner | null;
}

/** Returns true if the current day is Saturday or Sunday. */
export function isWeekend(state: GameState): boolean {
	return state.dayIndex >= 5;
}

import { createInitialTasks } from "./data/tasks";
import { SLOTS_PER_BLOCK } from "./data/timeBlocks";
import {
	getPersonalityFromSeed,
	getStartingEnergyFromSeed,
	getStartingMomentumFromSeed,
} from "./systems/personality";
import { selectTasksForSeed } from "./systems/taskSelection";

/** Generates a fresh initial state. Uses provided seed or generates random one. */
export function createInitialState(
	seed?: number,
	mode: GameMode = "main",
): GameState {
	const runSeed = seed ?? Math.floor(Math.random() * 2147483647);
	const personality = getPersonalityFromSeed(runSeed);
	const taskIds = selectTasksForSeed(runSeed, personality);
	return {
		day: "monday",
		dayIndex: 0,
		timeBlock: "morning",
		slotsRemaining: SLOTS_PER_BLOCK,
		weekendPointsRemaining: 8,
		tasks: createInitialTasks(taskIds, personality.time, runSeed),
		selectedTaskId: null,
		screen: "game",
		energy: getStartingEnergyFromSeed(runSeed),
		momentum: getStartingMomentumFromSeed(runSeed),
		runSeed,
		personality,
		dogFailedYesterday: false,
		pushedThroughLastNight: false,
		inExtendedNight: false,
		consecutiveFailures: 0,
		friendRescueUsedToday: false,
		friendRescueChanceBonus: 0,
		rollCount: 0,
		variantsUnlocked: [],
		phoneNotificationCount: 0,
		lastPhoneOutcome: null,
		lastPhoneTime: 0,
		lastTaskOutcome: null,
		lastTaskTime: 0,
		runStats: createInitialRunStats(),
		gameMode: mode,
		firstAttemptAvailable: false,
		events: [], // populated by event selection system
		eventFlags: [],
		activeEventId: null,
		eventBanner: null,
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
