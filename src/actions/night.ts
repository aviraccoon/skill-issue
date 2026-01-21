import type { GameState } from "../state";
import type { Store } from "../store";
import { calculateExtendedNightSlots } from "../systems/allnighter";

/**
 * Result of choosing to push through the night.
 */
export interface PushThroughResult {
	/** Number of extended night slots granted based on energy. */
	slots: number;
}

/**
 * Player chooses to sleep at end of night.
 * Transitions to day summary screen.
 */
export function chooseSleep(store: Store<GameState>): void {
	store.set("screen", "daySummary");
}

/**
 * Player chooses to push through the night.
 * Enters extended night mode with slots based on current energy.
 * Returns the number of slots granted for logging/UI.
 */
export function pushThrough(store: Store<GameState>): PushThroughResult {
	const state = store.getState();
	const slots = calculateExtendedNightSlots(state.energy);

	store.set("inExtendedNight", true);
	store.set("slotsRemaining", slots);
	store.set("screen", "game");

	return { slots };
}
