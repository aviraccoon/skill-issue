import { type GameState, initialState } from "../state";

const STORAGE_KEY = "skill-issue-save";
const SAVE_VERSION = 1;

interface SaveData {
	version: number;
	state: GameState;
	savedAt: number;
}

/**
 * Saves game state to localStorage.
 */
export function saveGame(state: GameState): void {
	const data: SaveData = {
		version: SAVE_VERSION,
		state,
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
 */
export function loadGame(): GameState {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return initialState;

		const data = JSON.parse(raw) as SaveData;

		// Version check - reject incompatible saves
		if (data.version !== SAVE_VERSION) {
			return initialState;
		}

		return data.state;
	} catch {
		return initialState;
	}
}

/**
 * Clears the saved game and returns to initial state.
 */
export function clearSave(): void {
	localStorage.removeItem(STORAGE_KEY);
}
