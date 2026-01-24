import { createInitialTasks, type TaskId } from "../data/tasks";
import {
	createInitialRunStats,
	createInitialState,
	type GameState,
	type RunStats,
	type Task,
} from "../state";
import type { Personality } from "./personality";

const STORAGE_KEY = "skill-issue-save";
const SAVE_VERSION = 3; // Bumped: restructured to separate currentRun and patterns

/** Runtime state for a task - the only thing we persist. */
interface SavedTask {
	id: TaskId;
	failureCount: number;
	attemptedToday: boolean;
	succeededToday: boolean;
}

/** Minimal game state for persistence - no translatable content. */
interface SavedState {
	day: GameState["day"];
	dayIndex: number;
	timeBlock: GameState["timeBlock"];
	slotsRemaining: number;
	weekendPointsRemaining: number;
	tasks: SavedTask[];
	selectedTaskId: string | null;
	screen: GameState["screen"];
	energy: number;
	momentum: number;
	runSeed: number;
	personality: GameState["personality"];
	dogFailedYesterday: boolean;
	pushedThroughLastNight: boolean;
	inExtendedNight: boolean;
	consecutiveFailures: number;
	friendRescueUsedToday: boolean;
	friendRescueChanceBonus?: number; // Optional for backward compat with old saves
	rollCount: number;
	variantsUnlocked: GameState["variantsUnlocked"];
	runStats: RunStats;
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
}

/** Top-level save structure with separate run and patterns sections. */
interface SaveData {
	version: number;
	currentRun: SavedState | null;
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
		runStats: state.runStats,
	};
}

/** Loads existing save data or creates empty structure. */
function loadSaveData(): SaveData {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) {
			return {
				version: SAVE_VERSION,
				currentRun: null,
				patterns: createEmptyPatterns(),
				savedAt: Date.now(),
			};
		}

		const data = JSON.parse(raw) as SaveData;

		// Version check - migrate or reset as needed
		if (data.version !== SAVE_VERSION) {
			// For now, preserve nothing from old versions
			// Future: could migrate patterns data
			return {
				version: SAVE_VERSION,
				currentRun: null,
				patterns: createEmptyPatterns(),
				savedAt: Date.now(),
			};
		}

		return data;
	} catch {
		return {
			version: SAVE_VERSION,
			currentRun: null,
			patterns: createEmptyPatterns(),
			savedAt: Date.now(),
		};
	}
}

/** Saves data to localStorage. */
function writeSaveData(data: SaveData): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
	} catch {
		// Storage full or unavailable - fail silently
	}
}

/**
 * Saves game state to localStorage.
 * Preserves patterns data while updating currentRun.
 */
export function saveGame(state: GameState): void {
	const existing = loadSaveData();
	const data: SaveData = {
		version: SAVE_VERSION,
		currentRun: toSavedState(state),
		patterns: existing.patterns,
		savedAt: Date.now(),
	};
	writeSaveData(data);
}

/**
 * Loads game state from localStorage.
 * Returns initial state if no save exists or save is incompatible.
 * Reconstructs full task objects from i18n + saved runtime state.
 */
export function loadGame(): GameState {
	const data = loadSaveData();
	if (!data.currentRun) {
		return createInitialState();
	}
	return fromSavedState(data.currentRun);
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

	return {
		day: saved.day,
		dayIndex: saved.dayIndex,
		timeBlock: saved.timeBlock,
		slotsRemaining: saved.slotsRemaining,
		weekendPointsRemaining: saved.weekendPointsRemaining,
		tasks,
		selectedTaskId: saved.selectedTaskId,
		screen: saved.screen,
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
		runStats: saved.runStats ?? createInitialRunStats(),
	};
}

/**
 * Resets the current run while preserving patterns data.
 * Use this for "New Game" and "Start New Week".
 */
export function resetCurrentRun(): void {
	const existing = loadSaveData();
	const data: SaveData = {
		version: SAVE_VERSION,
		currentRun: null,
		patterns: existing.patterns,
		savedAt: Date.now(),
	};
	writeSaveData(data);
}

/**
 * Saves a completed run to patterns history.
 * Call this when a week is completed.
 */
export function saveCompletedRun(state: GameState): void {
	const existing = loadSaveData();
	const completedRun: CompletedRun = {
		seed: state.runSeed,
		personality: state.personality,
		stats: state.runStats,
		completedAt: Date.now(),
	};

	const data: SaveData = {
		version: SAVE_VERSION,
		currentRun: existing.currentRun,
		patterns: {
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
 * Clears all save data including patterns.
 * Use sparingly - this is a full reset.
 */
export function clearAllData(): void {
	localStorage.removeItem(STORAGE_KEY);
}

// Legacy export for compatibility during transition
// TODO: Remove after updating all call sites
export const clearSave = resetCurrentRun;
