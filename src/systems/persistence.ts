/**
 * Save/load system with multi-slot support for different game modes.
 * Version 4: runs.main and runs.seeded slots.
 */

import { MENU_SCREENS } from "../core/screenInfo";
import {
	createInitialTasks,
	type TaskCategory,
	type TaskId,
} from "../data/tasks";
import {
	createInitialRunStats,
	createInitialState,
	type Day,
	type GameState,
	type RunStats,
	type Task,
	type TimeBlock,
} from "../state";
import { CURRENT_SAVE_VERSION, runMigrations } from "./migrations";
import type { Personality } from "./personality";

const STORAGE_KEY = "skill-issue-save";

/** Game mode determines which save slot to use. */
export type GameMode = "main" | "seeded";

/** Runtime state for a task - the only thing we persist. */
interface SavedTask {
	id: TaskId;
	failureCount: number;
	attemptedToday: boolean;
	succeededToday: boolean;
}

/** Minimal game state for persistence - no translatable content. */
export interface SavedState {
	day: Day;
	dayIndex: number;
	timeBlock: TimeBlock;
	slotsRemaining: number;
	weekendPointsRemaining: number;
	tasks: SavedTask[];
	selectedTaskId: string | null;
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
}

/** A completed run stored in patterns history. */
export interface CompletedRun {
	seed: number;
	personality: Personality;
	stats: RunStats;
	completedAt: number;
}

/** Persistent patterns data that survives across runs. */
export interface PatternsData {
	unlocked: boolean;
	history: CompletedRun[];
	hasSeenIntro?: boolean;
	hasEverAttempted?: boolean;
}

/** Save slots for different game modes. */
export interface SaveRuns {
	main: SavedState | null;
	seeded: SavedState | null;
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
	const data: SaveDataV4 = {
		version: 4,
		runs: {
			...existing.runs,
			[mode]: toSavedState(state),
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
	return fromSavedState(saved);
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
	return state;
}

/**
 * Checks if a save exists for the specified mode.
 */
export function hasSavedGame(mode: GameMode): boolean {
	const data = loadSaveData();
	return data.runs[mode] !== null;
}

/**
 * Gets summary info about saved games for the menu.
 */
export function getSavedGameSummaries(): {
	main: { day: Day; dayIndex: number; timeBlock: TimeBlock } | null;
	seeded: {
		day: Day;
		dayIndex: number;
		timeBlock: TimeBlock;
		seed: number;
	} | null;
} {
	const data = loadSaveData();
	return {
		main: data.runs.main
			? {
					day: data.runs.main.day,
					dayIndex: data.runs.main.dayIndex,
					timeBlock: data.runs.main.timeBlock,
				}
			: null,
		seeded: data.runs.seeded
			? {
					day: data.runs.seeded.day,
					dayIndex: data.runs.seeded.dayIndex,
					timeBlock: data.runs.seeded.timeBlock,
					seed: data.runs.seeded.runSeed,
				}
			: null,
	};
}

/**
 * Reconstructs full game state from saved state.
 * Creates fresh task objects from i18n, then applies saved runtime state.
 */
function fromSavedState(saved: SavedState): GameState {
	const freshTasks = createInitialTasks();
	const savedTaskMap = new Map(saved.tasks.map((t) => [t.id, t]));

	// Merge saved runtime state into fresh tasks
	const tasks = freshTasks.map((fresh) => {
		const savedTask = savedTaskMap.get(fresh.id);
		if (!savedTask) return fresh; // New task not in save, use defaults

		return {
			...fresh,
			failureCount: savedTask.failureCount,
			attemptedToday: savedTask.attemptedToday,
			succeededToday: savedTask.succeededToday,
		};
	});

	// Menu screens shouldn't be restored - go to game instead
	const screen = MENU_SCREENS.has(saved.screen) ? "game" : saved.screen;

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
		runStats: saved.runStats ?? createInitialRunStats(),
		gameMode: saved.gameMode ?? "main", // Fallback for migrated saves
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

/**
 * Returns true if this is the player's very first task attempt ever.
 */
export function isFirstEverAttempt(): boolean {
	const patterns = loadSaveData().patterns;
	return !patterns.hasEverAttempted;
}

/**
 * Clears all save data including patterns.
 */
export function clearAllData(): void {
	localStorage.removeItem(STORAGE_KEY);
}

// Legacy exports for compatibility during transition
export const resetCurrentRun = () => resetRun("main");
export const clearSave = resetCurrentRun;
