/**
 * Save/load system with multi-slot support for different game modes.
 * Version 4: runs.main and runs.seeded slots.
 */

import { MENU_SCREENS } from "../core/screenInfo";
import { getEventDefinition } from "../data/events";
import {
	createInitialTasks,
	type TaskCategory,
	type TaskId,
} from "../data/tasks";
import {
	createInitialRunStats,
	createInitialState,
	type Day,
	type EventId,
	type EventInstance,
	type GameMode,
	type GameState,
	type RunStats,
	type Task,
	type TimeBlock,
} from "../state";
import { mulberry32 } from "../utils/random";
import { selectEventsForSeed } from "./eventSelection";
import { createObligationTask } from "./events";
import { CURRENT_SAVE_VERSION, runMigrations } from "./migrations";
import type { Personality } from "./personality";
import { getPersonalityFromSeed } from "./personality";
import { selectTasksForSeed } from "./taskSelection";

const STORAGE_KEY = "skill-issue-save";

/**
 * Generates a deterministic seed from a UTC date.
 * Same UTC date always produces the same seed worldwide.
 * Uses mulberry32 to hash the YYYYMMDD integer into a well-distributed seed value.
 */
export function getDailySeed(date?: Date): number {
	const d = date ?? new Date();
	const dateNum =
		d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
	// Hash through mulberry32 to get a well-distributed seed
	const rng = mulberry32(dateNum);
	return (rng() * 2147483647) | 0;
}

/**
 * Gets milliseconds until next UTC midnight (when the daily seed changes).
 */
export function getMillisUntilNextDaily(now?: Date): number {
	const d = now ?? new Date();
	const nextMidnight = new Date(
		Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1),
	);
	return nextMidnight.getTime() - d.getTime();
}

/** Runtime state for a task - the only thing we persist. */
interface SavedTask {
	id: TaskId;
	failureCount: number;
	successCount?: number;
	attemptedToday: boolean;
	succeededToday: boolean;
}

/** Persisted event instance state (status + player choice + scheduling). */
interface SavedEventInstance {
	id: EventId;
	status: EventInstance["status"];
	choiceId?: string;
	scheduledDay?: number;
	obligationDay?: number;
}

/** Minimal game state for persistence - no translatable content. */
export interface SavedState {
	day: Day;
	dayIndex: number;
	timeBlock: TimeBlock;
	slotsRemaining: number;
	weekendPointsRemaining: number;
	tasks: SavedTask[];
	selectedTaskId: TaskId | null;
	screen: GameState["screen"];
	energy: number;
	momentum: number;
	runSeed: number;
	personality: Personality;
	dogFailedYesterday: boolean;
	pushedThroughLastNight: boolean;
	inExtendedNight: boolean;
	consecutiveFailures: number;
	friendRescueUsedToday: boolean;
	friendRescueChanceBonus?: number;
	rollCount: number;
	variantsUnlocked: TaskCategory[];
	phoneNotificationCount?: number;
	runStats: RunStats;
	gameMode: GameMode;
	firstAttemptAvailable?: boolean;
	events?: SavedEventInstance[];
	eventFlags?: string[];
	/** UTC month (0-indexed) and day when this daily was started. Only set for daily mode. */
	dailyDate?: { month: number; day: number };
}

/** A completed run stored in patterns history. */
export interface CompletedRun {
	seed: number;
	personality: Personality;
	stats: RunStats;
	completedAt: number;
	/** Game mode this run was played in. Used to filter progression calculations. */
	gameMode?: GameMode;
}

/** Persistent patterns data that survives across runs. */
export interface PatternsData {
	unlocked: boolean;
	history: CompletedRun[];
	hasSeenIntro?: boolean;
	hasEverAttempted?: boolean;
	hintsShown?: string[];
}

/** Save slots for different game modes. */
export interface SaveRuns {
	main: SavedState | null;
	seeded: SavedState | null;
	daily?: SavedState | null;
}

/** Top-level save structure (version 4). */
export interface SaveDataV4 {
	version: 4;
	runs: SaveRuns;
	patterns: PatternsData;
	savedAt: number;
}

/** Creates empty patterns data. */
function createEmptyPatterns(): PatternsData {
	return {
		unlocked: false,
		history: [],
	};
}

/** Creates empty save data. */
function createEmptySaveData(): SaveDataV4 {
	return {
		version: 4,
		runs: {
			main: null,
			seeded: null,
			daily: null,
		},
		patterns: createEmptyPatterns(),
		savedAt: Date.now(),
	};
}

/** Extracts only runtime state from a task for saving. */
function toSavedTask(task: Task): SavedTask {
	return {
		id: task.id,
		failureCount: task.failureCount,
		successCount: task.successCount,
		attemptedToday: task.attemptedToday,
		succeededToday: task.succeededToday,
	};
}

/** Converts full game state to minimal saved state. */
function toSavedState(state: GameState): SavedState {
	return {
		day: state.day,
		dayIndex: state.dayIndex,
		timeBlock: state.timeBlock,
		slotsRemaining: state.slotsRemaining,
		weekendPointsRemaining: state.weekendPointsRemaining,
		tasks: state.tasks.map(toSavedTask),
		selectedTaskId: state.selectedTaskId,
		screen: state.screen,
		energy: state.energy,
		momentum: state.momentum,
		runSeed: state.runSeed,
		personality: state.personality,
		dogFailedYesterday: state.dogFailedYesterday,
		pushedThroughLastNight: state.pushedThroughLastNight,
		inExtendedNight: state.inExtendedNight,
		consecutiveFailures: state.consecutiveFailures,
		friendRescueUsedToday: state.friendRescueUsedToday,
		friendRescueChanceBonus: state.friendRescueChanceBonus,
		rollCount: state.rollCount,
		variantsUnlocked: state.variantsUnlocked,
		phoneNotificationCount: state.phoneNotificationCount,
		runStats: state.runStats,
		gameMode: state.gameMode,
		firstAttemptAvailable: state.firstAttemptAvailable,
		events: state.events.map((e) => ({
			id: e.id,
			status: e.status,
			choiceId: e.choiceId,
			scheduledDay: e.scheduledDay,
			obligationDay: e.obligationDay,
		})),
		eventFlags: state.eventFlags,
	};
}

/** Loads existing save data, migrating if necessary. */
function loadSaveData(): SaveDataV4 {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) {
			return createEmptySaveData();
		}

		const data = JSON.parse(raw) as { version: number };

		// Already current version
		if (data.version === CURRENT_SAVE_VERSION) {
			return data as SaveDataV4;
		}

		// Try to migrate
		const migrated = runMigrations(data);
		if (migrated) {
			// Save migrated data
			writeSaveData(migrated);
			return migrated;
		}

		// Migration failed - start fresh
		return createEmptySaveData();
	} catch {
		return createEmptySaveData();
	}
}

/** Saves data to localStorage. */
function writeSaveData(data: SaveDataV4): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
	} catch {
		// Storage full or unavailable - fail silently
	}
}

/**
 * Saves game state to the specified mode's slot.
 * Preserves patterns data and other mode's slot.
 */
export function saveGame(state: GameState, mode: GameMode): void {
	const existing = loadSaveData();
	const saved = toSavedState(state);
	// For daily saves, preserve the original start date or capture it now
	if (mode === "daily") {
		const existingDaily = existing.runs.daily;
		const now = new Date();
		saved.dailyDate = existingDaily?.dailyDate ?? {
			month: now.getUTCMonth(),
			day: now.getUTCDate(),
		};
	}
	const data: SaveDataV4 = {
		version: 4,
		runs: {
			...existing.runs,
			[mode]: saved,
		},
		patterns: existing.patterns,
		savedAt: Date.now(),
	};
	writeSaveData(data);
}

/**
 * Loads game state from the specified mode's slot.
 * Returns null if no save exists for that mode.
 */
export function loadGame(mode: GameMode): GameState | null {
	const data = loadSaveData();
	const saved = data.runs[mode];
	if (!saved) {
		return null;
	}
	const state = fromSavedState(saved);
	// Merge saved event state with seed-selected canonical list
	const bypassProgression = (saved.gameMode ?? "main") !== "main";
	const freshEvents = selectEventsForSeed(
		state.runSeed,
		data.patterns,
		bypassProgression,
	);
	const savedEventMap = new Map(state.events.map((e) => [e.id, e]));
	state.events = freshEvents.map((fresh) => {
		const savedEvent = savedEventMap.get(fresh.id);
		if (!savedEvent) return fresh;
		return {
			...fresh,
			status: savedEvent.status,
			choiceId: savedEvent.choiceId,
		};
	});

	// Reconstruct obligation tasks from resolved notification events.
	// Obligation tasks are injected at runtime by activateEvent, so they
	// aren't in the seed-based task pool. We rebuild them from the event
	// definitions and merge saved task runtime state.
	const savedTaskMap = new Map(saved.tasks.map((t) => [t.id, t]));
	for (const event of state.events) {
		if (event.status !== "resolved" || event.obligationDay === undefined)
			continue;
		const definition = getEventDefinition(event.id);
		if (!definition?.obligation) continue;
		const { obligation } = definition;
		// Skip if this task already exists (shouldn't happen, but defensive)
		if (state.tasks.some((t) => t.id === obligation.taskId)) continue;
		const task = createObligationTask(
			obligation,
			event.obligationDay,
			event.id,
		);
		// Restore saved runtime state
		const savedTask = savedTaskMap.get(task.id);
		if (savedTask) {
			task.failureCount = savedTask.failureCount;
			task.successCount = savedTask.successCount ?? 0;
			task.attemptedToday = savedTask.attemptedToday;
			task.succeededToday = savedTask.succeededToday;
		}
		state.tasks.push(task);
	}

	return state;
}

/**
 * Creates initial state for a new game.
 * Shows intro screen for brand new players.
 */
export function createNewGame(
	seed?: number,
	mode: GameMode = "main",
): GameState {
	const data = loadSaveData();
	const state = createInitialState(seed, mode);
	// Show intro screen for brand new players
	if (!data.patterns.hasSeenIntro) {
		state.screen = "intro";
	}
	// First-attempt guarantee for brand new players
	if (!data.patterns.hasEverAttempted) {
		state.firstAttemptAvailable = true;
	}
	// Select narrative events for this run
	const bypassProgression = mode !== "main";
	state.events = selectEventsForSeed(
		state.runSeed,
		data.patterns,
		bypassProgression,
	);
	return state;
}

/**
 * Checks if a save exists for the specified mode.
 */
export function hasSavedGame(mode: GameMode): boolean {
	const data = loadSaveData();
	return data.runs[mode] !== null;
}

/** Summary of a saved run for menu display. */
export interface SavedRunSummary {
	day: Day;
	dayIndex: number;
	timeBlock: TimeBlock;
	completed: boolean;
}

/** Summary of a seeded run (includes seed number). */
export interface SeededRunSummary extends SavedRunSummary {
	seed: number;
}

/** Summary of a daily run (includes seed number and whether a new daily is available). */
export interface DailyRunSummary extends SavedRunSummary {
	seed: number;
	newDailyAvailable: boolean;
	/** UTC month (0-indexed) and day the daily was started. */
	dailyDate?: { month: number; day: number };
}

/**
 * Gets summary info about saved games for the menu.
 */
export function getSavedGameSummaries(): {
	main: SavedRunSummary | null;
	seeded: SeededRunSummary | null;
	daily: DailyRunSummary | null;
} {
	const data = loadSaveData();
	const dailySave = data.runs.daily;
	return {
		main: data.runs.main
			? {
					day: data.runs.main.day,
					dayIndex: data.runs.main.dayIndex,
					timeBlock: data.runs.main.timeBlock,
					completed: data.runs.main.screen === "weekComplete",
				}
			: null,
		seeded: data.runs.seeded
			? {
					day: data.runs.seeded.day,
					dayIndex: data.runs.seeded.dayIndex,
					timeBlock: data.runs.seeded.timeBlock,
					seed: data.runs.seeded.runSeed,
					completed: data.runs.seeded.screen === "weekComplete",
				}
			: null,
		daily: dailySave
			? {
					day: dailySave.day,
					dayIndex: dailySave.dayIndex,
					timeBlock: dailySave.timeBlock,
					seed: dailySave.runSeed,
					completed: dailySave.screen === "weekComplete",
					newDailyAvailable: dailySave.runSeed !== getDailySeed(),
					dailyDate: dailySave.dailyDate,
				}
			: null,
	};
}

/**
 * Reconstructs full game state from saved state.
 * Rebuilds task pool from seed, then applies saved runtime state.
 */
function fromSavedState(saved: SavedState): GameState {
	const personality =
		saved.personality ?? getPersonalityFromSeed(saved.runSeed);
	const taskIds = selectTasksForSeed(saved.runSeed, personality);
	const freshTasks = createInitialTasks(
		taskIds,
		personality.time,
		saved.runSeed,
	);
	const savedTaskMap = new Map(saved.tasks.map((t) => [t.id, t]));

	// Merge saved runtime state into fresh tasks
	const tasks = freshTasks.map((fresh) => {
		const savedTask = savedTaskMap.get(fresh.id);
		if (!savedTask) return fresh; // New task not in save, use defaults

		return {
			...fresh,
			failureCount: savedTask.failureCount,
			successCount: savedTask.successCount ?? 0,
			attemptedToday: savedTask.attemptedToday,
			succeededToday: savedTask.succeededToday,
		};
	});

	// Menu screens shouldn't be restored - go to game instead
	const screen = MENU_SCREENS.has(saved.screen) ? "game" : saved.screen;

	// Restore event state
	const events: EventInstance[] = (saved.events ?? []).map((e) => ({
		id: e.id,
		status: e.status,
		choiceId: e.choiceId,
		scheduledDay: e.scheduledDay,
		obligationDay: e.obligationDay,
	}));

	// Derive activeEventId from the events array
	const activeEvent = events.find((e) => e.status === "active");
	const activeEventId = activeEvent?.id ?? null;

	return {
		day: saved.day,
		dayIndex: saved.dayIndex,
		timeBlock: saved.timeBlock,
		slotsRemaining: saved.slotsRemaining,
		weekendPointsRemaining: saved.weekendPointsRemaining,
		tasks,
		selectedTaskId: saved.selectedTaskId,
		screen,
		energy: saved.energy,
		momentum: saved.momentum,
		runSeed: saved.runSeed,
		personality: saved.personality,
		dogFailedYesterday: saved.dogFailedYesterday,
		pushedThroughLastNight: saved.pushedThroughLastNight,
		inExtendedNight: saved.inExtendedNight,
		consecutiveFailures: saved.consecutiveFailures,
		friendRescueUsedToday: saved.friendRescueUsedToday,
		friendRescueChanceBonus: saved.friendRescueChanceBonus ?? 0,
		rollCount: saved.rollCount,
		variantsUnlocked: saved.variantsUnlocked,
		phoneNotificationCount: saved.phoneNotificationCount ?? 0,
		lastPhoneOutcome: null, // Transient visual state, not persisted
		lastPhoneTime: 0,
		lastTaskOutcome: null, // Transient visual state, not persisted
		lastTaskTime: 0,
		runStats: saved.runStats ?? createInitialRunStats(),
		gameMode: saved.gameMode ?? "main", // Fallback for migrated saves
		firstAttemptAvailable: saved.firstAttemptAvailable ?? false,
		events, // Saved state merged with seed selection in loadGame
		eventFlags: saved.eventFlags ?? [],
		activeEventId,
		eventBanner: null, // Transient, not persisted
		eventBlockedTasks: [], // Transient, not persisted
		dogIsAway: false, // Transient, not persisted
	};
}

/**
 * Resets the specified mode's save slot while preserving patterns data.
 */
export function resetRun(mode: GameMode): void {
	const existing = loadSaveData();
	const data: SaveDataV4 = {
		version: 4,
		runs: {
			...existing.runs,
			[mode]: null,
		},
		patterns: existing.patterns,
		savedAt: Date.now(),
	};
	writeSaveData(data);
}

/**
 * Saves a completed run to patterns history and clears the mode's slot.
 */
export function saveCompletedRun(state: GameState, mode: GameMode): void {
	const existing = loadSaveData();
	const completedRun: CompletedRun = {
		seed: state.runSeed,
		personality: state.personality,
		stats: state.runStats,
		completedAt: Date.now(),
		gameMode: mode,
	};

	const data: SaveDataV4 = {
		version: 4,
		runs: {
			...existing.runs,
			[mode]: null, // Clear the completed run's slot
		},
		patterns: {
			...existing.patterns,
			unlocked: true,
			history: [...existing.patterns.history, completedRun],
		},
		savedAt: Date.now(),
	};
	writeSaveData(data);
}

/**
 * Gets patterns data (for displaying historical stats).
 */
export function getPatterns(): PatternsData {
	return loadSaveData().patterns;
}

/**
 * Marks the intro as seen.
 */
export function markIntroSeen(): void {
	const existing = loadSaveData();
	const data: SaveDataV4 = {
		...existing,
		patterns: {
			...existing.patterns,
			hasSeenIntro: true,
		},
		savedAt: Date.now(),
	};
	writeSaveData(data);
}

/**
 * Marks that the player has attempted at least one task.
 */
export function markFirstAttempt(): void {
	const existing = loadSaveData();
	if (existing.patterns.hasEverAttempted) return;
	const data: SaveDataV4 = {
		...existing,
		patterns: {
			...existing.patterns,
			hasEverAttempted: true,
		},
		savedAt: Date.now(),
	};
	writeSaveData(data);
}

/** Contextual hint IDs shown once during gameplay. */
export type HintId = "firstTask" | "firstAttempt" | "firstWeekend";

/** Checks whether a contextual hint has been shown. */
export function hasHintBeenShown(hintId: HintId): boolean {
	return loadSaveData().patterns.hintsShown?.includes(hintId) ?? false;
}

/** Marks a contextual hint as shown. */
export function markHintShown(hintId: HintId): void {
	const existing = loadSaveData();
	const shown = existing.patterns.hintsShown ?? [];
	if (shown.includes(hintId)) return;
	const data: SaveDataV4 = {
		...existing,
		patterns: {
			...existing.patterns,
			hintsShown: [...shown, hintId],
		},
		savedAt: Date.now(),
	};
	writeSaveData(data);
}

/**
 * Clears all save data including patterns.
 */
export function clearAllData(): void {
	localStorage.removeItem(STORAGE_KEY);
}
