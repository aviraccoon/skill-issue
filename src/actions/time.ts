import { DAYS, type GameState, TIME_BLOCKS } from "../state";
import type { Store } from "../store";
import { calculateSleepQuality } from "../systems/sleep";
import { clamp } from "../utils/math";

/** Momentum decay per time block advance. */
const MOMENTUM_DECAY_PER_BLOCK = 0.02;

/**
 * Advances to the next time block. Resets action slots.
 * If at night, shows day summary. Applies momentum decay.
 */
export function skipTimeBlock(store: Store<GameState>) {
	const state = store.getState();

	// Decay momentum on time block advance
	store.update("momentum", (m) => Math.max(m - MOMENTUM_DECAY_PER_BLOCK, 0));

	const currentIndex = TIME_BLOCKS.indexOf(state.timeBlock);
	const nextBlock = TIME_BLOCKS[currentIndex + 1];

	if (nextBlock) {
		// Move to next time block
		store.set("timeBlock", nextBlock);
		store.set("slotsRemaining", 3);
	} else {
		// End of day - show summary
		showDaySummary(store);
	}
}

/**
 * Ends the weekend day. Called when player chooses to end their day
 * or runs out of action points.
 */
export function endWeekendDay(store: Store<GameState>) {
	showDaySummary(store);
}

/** Shows the end-of-day summary screen. */
function showDaySummary(store: Store<GameState>) {
	store.set("screen", "daySummary");
}

/**
 * Continues to the next day after viewing the summary.
 * Applies sleep quality modifiers and resets day state.
 */
export function continueToNextDay(store: Store<GameState>) {
	const state = store.getState();
	const nextDayIndex = state.dayIndex + 1;
	const nextDay = DAYS[nextDayIndex];

	if (!nextDay) {
		// Week complete
		store.set("screen", "weekComplete");
		return;
	}

	// Calculate and apply sleep quality effects
	const sleepMod = calculateSleepQuality(state);
	store.update("energy", (e) => clamp(e + sleepMod.energy, 0, 1));
	store.update("momentum", (m) => clamp(m + sleepMod.momentum, 0, 1));

	// Advance to next day
	store.set("day", nextDay);
	store.set("dayIndex", nextDayIndex);
	store.set("screen", "game");

	// Reset based on day type
	if (nextDayIndex >= 5) {
		// Weekend - 8 action points, no time blocks
		store.set("weekendPointsRemaining", 8);
	} else {
		// Weekday - morning with 3 slots
		store.set("timeBlock", "morning");
		store.set("slotsRemaining", 3);
	}

	// Reset daily flags on tasks
	store.update("tasks", (tasks) =>
		tasks.map((t) => ({
			...t,
			attemptedToday: false,
			succeededToday: false,
		})),
	);
}
