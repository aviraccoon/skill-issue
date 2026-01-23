import { createInitialTasks, type TaskId } from "../data/tasks";
import { createInitialState, type GameState, type Task } from "../state";

const STORAGE_KEY = "skill-issue-save";
const SAVE_VERSION = 2; // Bumped: now saves only task runtime state, not full objects

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
	rollCount: number;
	variantsUnlocked: GameState["variantsUnlocked"];
}

interface SaveData {
	version: number;
	state: SavedState;
	savedAt: number;
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
		rollCount: state.rollCount,
		variantsUnlocked: state.variantsUnlocked,
	};
}

/**
 * Saves game state to localStorage.
 * Only persists task runtime state (id, failureCount, etc.), not translatable content.
 */
export function saveGame(state: GameState): void {
	const data: SaveData = {
		version: SAVE_VERSION,
		state: toSavedState(state),
		savedAt: Date.now(),
	};
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
	} catch {
		// Storage full or unavailable - fail silently
	}
}

/**
 * Loads game state from localStorage.
 * Returns initial state if no save exists or save is incompatible.
 * Reconstructs full task objects from i18n + saved runtime state.
 */
export function loadGame(): GameState {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return createInitialState();

		const data = JSON.parse(raw) as SaveData;

		// Version check - reject incompatible saves
		if (data.version !== SAVE_VERSION) {
			return createInitialState();
		}

		return fromSavedState(data.state);
	} catch {
		return createInitialState();
	}
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
		rollCount: saved.rollCount,
		variantsUnlocked: saved.variantsUnlocked,
	};
}

/**
 * Clears the saved game and returns to initial state.
 */
export function clearSave(): void {
	localStorage.removeItem(STORAGE_KEY);
}
